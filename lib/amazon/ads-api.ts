import "server-only";

/**
 * Amazon Advertising API client for creating Sponsored Brands campaigns directly
 * (the "Upload to Amazon" path of the Sponsored Brands Upload tool). This is a
 * port of LaLaGreen/n8n "Campaign Creation" — see
 * Sponsored_Brands_WPCBWH_Campaign.ipynb — from Python into TS.
 *
 * It is deliberately kept separate from lib/amazon/sp-api.ts: the Ads API is a
 * different host, uses its own LWA credentials + refresh token (advertising
 * scope), and every request carries an Amazon-Advertising-API-Scope header set
 * to a per-marketplace profile id. The token-cache / retry patterns mirror
 * sp-api.ts but can't be shared because the credentials differ.
 *
 * Endpoints and creative schemas were verified against the live Sponsored Brands
 * 4-0 OpenAPI spec (media type application/vnd.sbadresource.v4+json etc.).
 */

const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
// North America region — serves US, CA and MX profiles.
const ADS_API_HOST = "https://advertising-api.amazon.com";
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503]);

/** Marketplaces this tool can upload to. */
const UPLOADABLE_COUNTRIES = ["US", "CA"] as const;
export type AdsCountry = (typeof UPLOADABLE_COUNTRIES)[number];

export function isUploadableCountry(country: string): country is AdsCountry {
  return (UPLOADABLE_COUNTRIES as readonly string[]).includes(country);
}

interface AdsProfile {
  profileId: number;
  countryCode?: string;
  accountInfo?: { type?: string; name?: string };
}

let profilesCache: AdsProfile[] | null = null;

/** Lists the advertising profiles on this Ads account (cached for the process). */
async function listProfiles(): Promise<AdsProfile[]> {
  if (profilesCache) return profilesCache;
  const accessToken = await getAccessToken();
  const res = await fetch(`${ADS_API_HOST}/v2/profiles`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Amazon-Advertising-API-ClientId": process.env.ADS_CLIENT_ID!,
    },
  });
  if (!res.ok) throw new Error(`Failed to list advertising profiles (${res.status})`);
  profilesCache = (await res.json()) as AdsProfile[];
  return profilesCache;
}

/**
 * Resolves the advertising profile id for a marketplace. Fetches it live from
 * /v2/profiles (matching on countryCode, preferring a seller account), so no
 * profile id has to be configured by hand. An optional ADS_PROFILE_ID_<CC> env
 * var overrides the lookup if you ever need to pin a specific profile.
 * profileId fits safely in a JS number (< 2^53) but the Scope header wants a string.
 */
export async function getProfileId(country: string): Promise<string> {
  if (!isUploadableCountry(country)) {
    throw new Error(
      `Direct upload is only supported for ${UPLOADABLE_COUNTRIES.join(" and ")} — ${country} is not configured.`
    );
  }
  const override = process.env[`ADS_PROFILE_ID_${country}`];
  if (override) return override;

  const matches = (await listProfiles()).filter((p) => p.countryCode === country);
  if (!matches.length) {
    throw new Error(
      `No ${country} advertising profile found on this Ads account. Check the account's marketplace access, or set ADS_PROFILE_ID_${country}.`
    );
  }
  const seller = matches.find((p) => p.accountInfo?.type === "seller");
  return String((seller ?? matches[0]).profileId);
}

let tokenCache: { accessToken: string; expiresAt: number } | null = null;
let refreshInFlight: Promise<string> | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) return tokenCache.accessToken;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const res = await fetch(LWA_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.ADS_REFRESH_TOKEN!,
        client_id: process.env.ADS_CLIENT_ID!,
        client_secret: process.env.ADS_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) throw new Error(`Amazon Ads token refresh failed (${res.status})`);
    const json = await res.json();
    tokenCache = { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return tokenCache.accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function adsHeaders(
  accessToken: string,
  profileId: string,
  media: { contentType: string; accept: string }
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Amazon-Advertising-API-ClientId": process.env.ADS_CLIENT_ID!,
    "Amazon-Advertising-API-Scope": profileId,
    "Content-Type": media.contentType,
    Accept: media.accept,
  };
}

/**
 * POSTs to the Ads API with retry on transient statuses. Returns the parsed JSON
 * body. On a non-retryable error it throws with the API's own message so the
 * caller can surface exactly why a campaign failed.
 */
async function adsPost<T>(
  path: string,
  profileId: string,
  media: { contentType: string; accept: string },
  body: unknown
): Promise<T> {
  const url = `${ADS_API_HOST}${path}`;
  let lastError: Error = new Error(`Ads API ${path} failed`);

  for (let attempt = 0; attempt < 3; attempt++) {
    const accessToken = await getAccessToken();
    const res = await fetch(url, {
      method: "POST",
      headers: adsHeaders(accessToken, profileId, media),
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json() as Promise<T>;

    const text = await res.text().catch(() => "");
    lastError = new Error(`Ads API ${path} failed (${res.status})${text ? `: ${text}` : ""}`);
    if (!RETRYABLE_STATUSES.has(res.status)) throw lastError;
    await sleep(1000 * 2 ** attempt);
  }
  throw lastError;
}

// Sponsored Brands responses share the shape { <resource>: { success: [...], error: [...] } }.
interface SbBatchResponse<TSuccess> {
  [resource: string]: { success?: TSuccess[]; error?: unknown[] } | undefined;
}

/** Pulls the single created entity out of a batch response, or throws the API error. */
function firstResult<TSuccess>(res: SbBatchResponse<TSuccess>, resource: string): TSuccess {
  const bucket = res[resource];
  const success = bucket?.success ?? [];
  if (success.length > 0) return success[0];
  const errors = bucket?.error ?? [];
  throw new Error(
    errors.length ? `Amazon rejected the ${resource}: ${JSON.stringify(errors[0])}` : `No ${resource} created`
  );
}

const CAMPAIGN_MEDIA = {
  contentType: "application/vnd.sbCampaignResource.v4+json",
  accept: "application/vnd.sbCampaignResource.v4+json",
};
const AD_GROUP_MEDIA = {
  contentType: "application/vnd.sbAdGroupResource.v4+json",
  accept: "application/vnd.sbAdGroupResource.v4+json",
};
const AD_MEDIA = {
  contentType: "application/vnd.sbadresource.v4+json",
  accept: "application/vnd.sbadresource.v4+json",
};
const KEYWORD_MEDIA = {
  contentType: "application/json",
  accept: "application/vnd.sbkeywordresponse.v3+json",
};

export async function createSbCampaign(
  profileId: string,
  input: { name: string; budget: number; startDate: string; brandEntityId: string }
): Promise<string> {
  const res = await adsPost<SbBatchResponse<{ campaignId: string }>>(
    "/sb/v4/campaigns",
    profileId,
    CAMPAIGN_MEDIA,
    {
      campaigns: [
        {
          name: input.name,
          budgetType: "DAILY",
          budget: input.budget,
          startDate: input.startDate, // YYYY-MM-DD
          state: "ENABLED",
          brandEntityId: input.brandEntityId,
        },
      ],
    }
  );
  return firstResult(res, "campaigns").campaignId;
}

export async function createSbAdGroup(
  profileId: string,
  input: { name: string; campaignId: string; bid: number }
): Promise<string> {
  const res = await adsPost<SbBatchResponse<{ adGroupId: string }>>(
    "/sb/v4/adGroups",
    profileId,
    AD_GROUP_MEDIA,
    {
      adGroups: [
        { name: input.name, campaignId: input.campaignId, state: "ENABLED", bid: input.bid },
      ],
    }
  );
  return firstResult(res, "adGroups").adGroupId;
}

export async function createSbManualCollectionAd(
  profileId: string,
  input: {
    name: string;
    adGroupId: string;
    asins: string[];
    brandName: string;
    brandLogoAssetId?: string | null;
    storePageUrl?: string | null;
  }
): Promise<void> {
  const creative: Record<string, unknown> = {
    asins: input.asins,
    brandName: input.brandName,
  };
  if (input.brandLogoAssetId) creative.brandLogoAssetID = input.brandLogoAssetId;
  // A STORE landing page and the asins list are mutually exclusive per the spec;
  // only send a landingPage when we actually have a store URL, otherwise Amazon
  // builds a PRODUCT_LIST from the asins.
  if (input.storePageUrl) creative.landingPage = { pageType: "STORE", url: input.storePageUrl };

  const res = await adsPost<SbBatchResponse<{ adId: string }>>(
    "/sb/v4/ads/manualCollection",
    profileId,
    AD_MEDIA,
    { ads: [{ name: input.name, adGroupId: input.adGroupId, state: "ENABLED", creative }] }
  );
  firstResult(res, "ads");
}

export async function createSbVideoAd(
  profileId: string,
  input: { name: string; adGroupId: string; asin: string; videoAssetId: string }
): Promise<void> {
  const res = await adsPost<SbBatchResponse<{ adId: string }>>(
    "/sb/v4/ads/video",
    profileId,
    AD_MEDIA,
    {
      ads: [
        {
          name: input.name,
          adGroupId: input.adGroupId,
          state: "ENABLED",
          creative: { asins: [input.asin], videoAssetIds: [input.videoAssetId] },
        },
      ],
    }
  );
  firstResult(res, "ads");
}

/**
 * Creates the campaign's keywords. Keyword CRUD never moved to /sb/v4 — it stays
 * on the unversioned /sb/keywords path (verified against the SB 3-0 spec).
 */
export async function createSbKeywords(
  profileId: string,
  input: {
    campaignId: string;
    adGroupId: string;
    keywords: string[];
    matchTypes: string[];
    bid: number;
  }
): Promise<void> {
  const body: Record<string, unknown>[] = [];
  for (const kw of input.keywords) {
    for (const matchType of input.matchTypes) {
      body.push({
        campaignId: Number(input.campaignId),
        adGroupId: Number(input.adGroupId),
        keywordText: kw,
        matchType, // exact | phrase | broad (lowercase per the live spec)
        bid: input.bid,
      });
    }
  }
  if (!body.length) return;
  await adsPost("/sb/keywords", profileId, KEYWORD_MEDIA, body);
}

/** Best-effort negative keywords (exact match). A failure here does not fail the campaign. */
export async function createSbNegativeKeywords(
  profileId: string,
  input: { campaignId: string; adGroupId: string; keywords: string[] }
): Promise<void> {
  const body = input.keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .map((keywordText) => ({
      campaignId: Number(input.campaignId),
      adGroupId: Number(input.adGroupId),
      keywordText,
      matchType: "negativeExact",
    }));
  if (!body.length) return;
  await adsPost("/sb/negativeKeywords", profileId, KEYWORD_MEDIA, body);
}

// --- Orchestrator ------------------------------------------------------------

/** A single campaign to create, already resolved against its brand profile. */
export type UploadCampaign = {
  campaignName: string;
  bid: number;
  budget: number;
  startDate: string; // YYYY-MM-DD
  keywords: string[];
  negativeKeywords: string[];
  matchTypes: string[];
  brandEntityId: string;
  brandName: string;
  brandLogoAssetId?: string | null;
  storePageUrl?: string | null;
} & (
  | { adFormat: "video"; asin: string; videoAssetId: string }
  | { adFormat: "productCollection"; asins: string[] }
);

export type UploadResult = {
  campaignName: string;
  ok: boolean;
  campaignId?: string;
  error?: string;
};

/**
 * Runs the full SB v4 create sequence for one campaign, in the required order:
 * campaign -> ad group -> ad (before keywords) -> keywords -> negatives. Returns
 * a per-campaign result rather than throwing, so a batch can report partial
 * success. The tool's "productCollection" maps to the Ads API's manualCollection
 * ad type (the API's own productCollection ad type is deprecated).
 */
export async function uploadSbCampaign(
  profileId: string,
  c: UploadCampaign
): Promise<UploadResult> {
  let campaignId: string | undefined;
  try {
    campaignId = await createSbCampaign(profileId, {
      name: c.campaignName,
      budget: c.budget,
      startDate: c.startDate,
      brandEntityId: c.brandEntityId,
    });

    const adGroupId = await createSbAdGroup(profileId, {
      name: `${c.campaignName} - Ad Group`,
      campaignId,
      bid: c.bid,
    });

    if (c.adFormat === "video") {
      await createSbVideoAd(profileId, {
        name: `${c.campaignName} - Ad`,
        adGroupId,
        asin: c.asin,
        videoAssetId: c.videoAssetId,
      });
    } else {
      await createSbManualCollectionAd(profileId, {
        name: `${c.campaignName} - Ad`,
        adGroupId,
        asins: c.asins,
        brandName: c.brandName,
        brandLogoAssetId: c.brandLogoAssetId,
        storePageUrl: c.storePageUrl,
      });
    }

    await createSbKeywords(profileId, {
      campaignId,
      adGroupId,
      keywords: c.keywords,
      matchTypes: c.matchTypes,
      bid: c.bid,
    });

    if (c.negativeKeywords.length) {
      try {
        await createSbNegativeKeywords(profileId, {
          campaignId,
          adGroupId,
          keywords: c.negativeKeywords,
        });
      } catch {
        // Negatives are best-effort — the campaign itself is already live.
      }
    }

    return { campaignName: c.campaignName, ok: true, campaignId };
  } catch (err) {
    return {
      campaignName: c.campaignName,
      ok: false,
      campaignId,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}
