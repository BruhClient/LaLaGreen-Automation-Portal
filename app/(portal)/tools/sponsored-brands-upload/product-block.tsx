"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Brand = { id: string; name: string; country: string };
export type Asset = { id: string; brand_id: string; label: string; asset_id: string };
export type Theme = {
  id: string;
  brand_id: string | null;
  name: string;
  keywords: string;
  negative_keywords: string;
};

// One fully independent product box: brand + name/date + ASIN(s) + video +
// keywords + spread. A saved product / preset stores exactly one of these.
export type Block = {
  id: string;
  brandId: string;
  adFormat: "video" | "productCollection";
  campaignName: string;
  startDate: string;
  asins: string[];
  landingPageMode: "default" | "url";
  landingPageUrl: string;
  videoSource: "saved" | "manual";
  videoAssetId: string;
  manualVideoAssetId: string;
  keywordSource: "theme" | "manual";
  keywordThemeId: string;
  manualKeywords: string;
  manualNegatives: string;
  numCampaigns: string;
  keywordsPerCampaign: string;
  keywordMode: "sequential" | "random";
  bidMode: "fixed" | "range";
  bidFixed: string;
  bidMin: string;
  bidMax: string;
  budgetMode: "auto" | "fixed";
  budgetValue: string;
  matchExact: boolean;
  matchPhrase: boolean;
  matchBroad: boolean;
};

export type Preset = { id: string; sku: string; config: Block };

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

let blockSeq = 0;
export function newBlock(brandId = ""): Block {
  blockSeq += 1;
  return {
    id: `blk_${Date.now()}_${blockSeq}`,
    brandId,
    adFormat: "video",
    campaignName: "",
    startDate: new Date().toISOString().slice(0, 10),
    asins: [""],
    landingPageMode: "default",
    landingPageUrl: "",
    videoSource: "saved",
    videoAssetId: "",
    manualVideoAssetId: "",
    keywordSource: "theme",
    keywordThemeId: "",
    manualKeywords: "",
    manualNegatives: "",
    numCampaigns: "10",
    keywordsPerCampaign: "10",
    keywordMode: "sequential",
    bidMode: "fixed",
    bidFixed: "0.37",
    bidMin: "0.33",
    bidMax: "0.71",
    budgetMode: "auto",
    budgetValue: "10",
    matchExact: true,
    matchPhrase: true,
    matchBroad: true,
  };
}

function toLines(text: string) {
  return text
    .split("\n")
    .map((k) => k.trim())
    .filter(Boolean);
}

/** Small heading for a subsection inside the product form. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h4>
  );
}

/**
 * One group of related fields. Flat and minimal — no card, just a title and
 * its fields. Each section carries a hairline top divider (except the first),
 * so the form reads as a single clean column.
 */
function Section({
  title,
  aside,
  children,
  first,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section
      className={
        first
          ? "flex flex-col gap-4 pb-6"
          : "flex flex-col gap-4 border-t border-border py-6"
      }
    >
      <div className="flex items-center justify-between">
        <SectionTitle>{title}</SectionTitle>
        {aside}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/**
 * The product editing form — rendered inside the build dialog. It edits a
 * single draft `Block` via `onChange`; the caller persists it on Save.
 */
export default function ProductBlock({
  block,
  brands,
  assets,
  themes,
  presets,
  presetBusy,
  onChange,
  onSavePreset,
  onDeletePreset,
}: {
  block: Block;
  brands: Brand[];
  assets: Asset[];
  themes: Theme[];
  presets: Preset[];
  presetBusy: boolean;
  onChange: (b: Block) => void;
  onSavePreset: (sku: string, block: Block) => void;
  onDeletePreset: (p: Preset) => void;
}) {
  const set = (patch: Partial<Block>) => onChange({ ...block, ...patch });

  const [skuSearch, setSkuSearch] = useState("");
  const [skuName, setSkuName] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Preset | null>(null);

  // A saved draft can point at a brand that was later deleted in the Library.
  const brandMissing = !!block.brandId && !brands.some((b) => b.id === block.brandId);

  const brandAssets = assets.filter((a) => a.brand_id === block.brandId);
  const brandThemes = themes.filter(
    (t) => t.brand_id === null || t.brand_id === block.brandId
  );

  const filteredPresets = skuSearch.trim()
    ? presets.filter((p) => p.sku.toLowerCase().includes(skuSearch.trim().toLowerCase()))
    : presets;

  const selectedTheme = themes.find((t) => t.id === block.keywordThemeId);
  const kwCount =
    block.keywordSource === "manual"
      ? toLines(block.manualKeywords).length
      : selectedTheme
      ? toLines(selectedTheme.keywords).length
      : 0;

  const asinCount = block.asins.map((a) => a.trim()).filter(Boolean).length;
  const collectionCountOk =
    block.adFormat !== "productCollection" || (asinCount >= 3 && asinCount <= 10);

  function loadPreset(p: Preset) {
    // Keep this box's id; fill from saved setting on top of defaults so older
    // presets that are missing newer fields still load cleanly.
    onChange({ ...newBlock(block.brandId), ...p.config, id: block.id });
    setSkuName(p.sku);
  }

  return (
    <>
      <div className="flex flex-col">
        {/* ── Creative ─────────────────────────────────────────── */}
        <Section title="Creative" first>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <Label className={labelClass}>Brand Profile</Label>
              <select
                className={selectClass}
                value={brandMissing ? "" : block.brandId}
                onChange={(e) => set({ brandId: e.target.value })}
              >
                <option value="">Select brand</option>
                {brandMissing && (
                  <option value={block.brandId} disabled>
                    ⚠ (deleted) — choose a brand
                  </option>
                )}
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.country})
                  </option>
                ))}
              </select>
              {brandMissing && (
                <p className="mt-1 text-xs text-destructive">
                  This ad&apos;s brand profile was deleted. Pick another to continue.
                </p>
              )}
            </div>
            <div>
              <Label className={labelClass}>Ad format</Label>
              <SegmentedControl
                value={block.adFormat}
                onValueChange={(v) => set({ adFormat: v })}
                options={[
                  { value: "video", label: "Video" },
                  { value: "productCollection", label: "Product Collection" },
                ]}
              />
            </div>
          </div>

          {/* ASINs */}
          <div>
            {block.adFormat === "productCollection" ? (
              <>
                <Label className={labelClass}>Products in this collection</Label>
                <p className="mb-2 text-xs text-muted-foreground">
                  3–10 ASINs — Amazon auto-generates the creative from these listings.
                </p>
              </>
            ) : (
              <Label className={labelClass}>ASIN{block.asins.length > 1 ? "s" : ""}</Label>
            )}
            <div className="flex flex-col gap-2">
              {block.asins.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`ASIN ${i + 1}`}
                    value={a}
                    onChange={(e) =>
                      set({ asins: block.asins.map((v, j) => (j === i ? e.target.value : v)) })
                    }
                  />
                  {block.asins.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => set({ asins: block.asins.filter((_, j) => j !== i) })}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      title="Remove this ASIN"
                      aria-label="Remove this ASIN"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => set({ asins: [...block.asins, ""] })}
              className="mt-1 h-auto px-0"
            >
              + Add ASIN
            </Button>
            {block.adFormat === "productCollection" && !collectionCountOk && (
              <p className="mt-1 text-xs text-destructive">
                {asinCount} ASIN{asinCount === 1 ? "" : "s"} entered — Product Collection needs 3–10.
              </p>
            )}
          </div>

          {/* Landing page */}
          {block.adFormat === "productCollection" && (
            <div>
              <Label className={labelClass}>Landing page</Label>
              <SegmentedControl
                className="mb-2"
                value={block.landingPageMode}
                onValueChange={(v) => set({ landingPageMode: v })}
                options={[
                  { value: "default", label: "Product list" },
                  { value: "url", label: "Custom URL" },
                ]}
              />
              {block.landingPageMode === "url" ? (
                <>
                  <Input
                    placeholder="https://www.amazon.com/stores/page/…"
                    value={block.landingPageUrl}
                    onChange={(e) => set({ landingPageUrl: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Overrides the brand&apos;s Store Page URL for this ad only.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Uses the brand&apos;s Store Page URL if one is set, otherwise links to the ASINs above.
                </p>
              )}
            </div>
          )}

          {/* Video asset */}
          {block.adFormat === "video" && (
            <div>
              <Label className={labelClass}>Video asset</Label>
              <SegmentedControl
                className="mb-2"
                value={block.videoSource}
                onValueChange={(v) => set({ videoSource: v })}
                options={[
                  { value: "saved", label: "From Video Assets" },
                  { value: "manual", label: "Type manually" },
                ]}
              />
              {block.videoSource === "saved" ? (
                <select
                  className={selectClass}
                  value={block.videoAssetId}
                  onChange={(e) => set({ videoAssetId: e.target.value })}
                >
                  <option value="">Select video asset</option>
                  {brandAssets.map((a) => (
                    <option key={a.id} value={a.asset_id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  className="font-mono text-sm"
                  placeholder="amzn1.assetlibrary.asset1.XXXXXXXXXXXXXXXXXXXX"
                  value={block.manualVideoAssetId}
                  onChange={(e) => set({ manualVideoAssetId: e.target.value })}
                />
              )}
            </div>
          )}
        </Section>

        {/* ── Naming ───────────────────────────────────────────── */}
        <Section title="Naming">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-[1fr_auto]">
            <div>
              <Label className={labelClass}>Campaign name template</Label>
              <Input
                placeholder="e.g. Sponsor Brand xxx Bid {bid}"
                value={block.campaignName}
                onChange={(e) => set({ campaignName: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tokens: <code className="rounded bg-muted px-1">{"{bid}"}</code> bid,{" "}
                <code className="rounded bg-muted px-1">{"{n}"}</code> campaign #,{" "}
                <code className="rounded bg-muted px-1">{"{kw}"}</code> keywords,{" "}
                <code className="rounded bg-muted px-1">{"{asin}"}</code>,{" "}
                <code className="rounded bg-muted px-1">{"{date}"}</code>.
              </p>
            </div>
            <div>
              <Label className={labelClass}>Start date</Label>
              <Input
                type="date"
                className="w-[12rem]"
                value={block.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </div>
          </div>
        </Section>

        {/* ── Keywords ─────────────────────────────────────────── */}
        <Section
          title="Keywords"
          aside={kwCount > 0 ? <Badge variant="outline">{kwCount} keywords</Badge> : null}
        >
          <div>
            <SegmentedControl
              className="mb-2"
              value={block.keywordSource}
              onValueChange={(v) => set({ keywordSource: v })}
              options={[
                { value: "theme", label: "From Keyword Garage" },
                { value: "manual", label: "Type manually" },
              ]}
            />
            {block.keywordSource === "theme" ? (
              <>
                {brandThemes.length ? (
                  <select
                    className={selectClass}
                    value={block.keywordThemeId}
                    onChange={(e) => set({ keywordThemeId: e.target.value })}
                  >
                    <option value="">Select a keyword theme</option>
                    {brandThemes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.brand_id === null ? " (all brands)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No themes for this brand yet — create one in the Keyword Garage.
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Keywords (one per line)
                  </span>
                  <Textarea
                    className="min-h-[120px] font-mono text-sm"
                    placeholder={"outdoor wall planter\nvertical garden\nhanging plant holder"}
                    value={block.manualKeywords}
                    onChange={(e) => set({ manualKeywords: e.target.value })}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Negative keywords (optional, one per line)
                  </span>
                  <Textarea
                    className="min-h-[70px] font-mono text-sm"
                    placeholder={"cheap\nused"}
                    value={block.manualNegatives}
                    onChange={(e) => set({ manualNegatives: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Campaign spread ──────────────────────────────────── */}
        <Section title="Campaign spread">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <Label className={labelClass}>Number of campaigns</Label>
              <Input
                type="number"
                min={1}
                value={block.numCampaigns}
                onChange={(e) => set({ numCampaigns: e.target.value })}
              />
            </div>
            <div>
              <Label className={labelClass}>Keywords per campaign</Label>
              <Input
                type="number"
                min={0}
                placeholder="All"
                value={block.keywordsPerCampaign}
                onChange={(e) => set({ keywordsPerCampaign: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">0 or blank = all keywords each.</p>
            </div>
          </div>

          <div>
            <Label className={labelClass}>Distribute keywords</Label>
            <SegmentedControl
              value={block.keywordMode}
              onValueChange={(v) => set({ keywordMode: v })}
              options={[
                { value: "sequential", label: "Sequential (1–10, 11–20, … wraps)" },
                { value: "random", label: "Random" },
              ]}
            />
          </div>
        </Section>

        {/* ── Bidding & budget ─────────────────────────────────── */}
        <Section title="Bidding & budget">
          <div>
            <Label className={labelClass}>Bid</Label>
            <SegmentedControl
              value={block.bidMode}
              onValueChange={(v) => set({ bidMode: v })}
              options={[
                { value: "fixed", label: "Fixed" },
                { value: "range", label: "Range" },
              ]}
            />
            <p className="mt-1 mb-2 text-xs text-muted-foreground">
              {block.bidMode === "range"
                ? "Bids spread evenly from min to max across campaigns."
                : "Every campaign uses the same bid."}
            </p>
            {block.bidMode === "fixed" ? (
              <Input
                type="number"
                step="0.01"
                className="max-w-[10rem]"
                value={block.bidFixed}
                onChange={(e) => set({ bidFixed: e.target.value })}
              />
            ) : (
              <div className="flex items-end gap-4">
                <div className="max-w-[8rem]">
                  <span className="mb-1 block text-xs text-muted-foreground">Min ($)</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={block.bidMin}
                    onChange={(e) => set({ bidMin: e.target.value })}
                  />
                </div>
                <div className="max-w-[8rem]">
                  <span className="mb-1 block text-xs text-muted-foreground">Max ($)</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={block.bidMax}
                    onChange={(e) => set({ bidMax: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className={labelClass}>Daily budget</Label>
            <SegmentedControl
              className="mb-2"
              value={block.budgetMode}
              onValueChange={(v) => set({ budgetMode: v })}
              options={[
                { value: "auto", label: "Auto (from bid, min $2)" },
                { value: "fixed", label: "Fixed amount" },
              ]}
            />
            {block.budgetMode === "fixed" && (
              <div className="max-w-[10rem]">
                <span className="mb-1 block text-xs text-muted-foreground">Daily budget ($)</span>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={block.budgetValue}
                  onChange={(e) => set({ budgetValue: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <Label className={labelClass}>Match types</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={block.matchExact}
                  onCheckedChange={(v) => set({ matchExact: v === true })}
                />
                Exact
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={block.matchPhrase}
                  onCheckedChange={(v) => set({ matchPhrase: v === true })}
                />
                Phrase
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={block.matchBroad}
                  onCheckedChange={(v) => set({ matchBroad: v === true })}
                />
                Broad
              </label>
            </div>
          </div>
        </Section>

        {/* ── Saved settings (apply only to this box) ──────────── */}
        <div className="border-t border-border py-6">
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setShowSaved((v) => !v)}
              className="flex w-full items-center justify-between p-4 text-sm font-medium"
            >
              <span>Saved settings (by SKU)</span>
              <span className="text-xs text-muted-foreground">
                {showSaved ? "Hide ▲" : "Show ▼"}
              </span>
            </button>

            {showSaved && (
              <div className="flex flex-col gap-2 border-t border-border p-4">
              <Input
                placeholder="Search SKU (e.g. WPCT24)"
                className="max-w-md"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
              />
              {presets.length > 0 && (
                <div className="flex max-h-40 flex-col gap-2 overflow-auto">
                  {filteredPresets.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5"
                    >
                      <span className="font-mono text-sm">{p.sku}</span>
                      <span className="flex gap-1">
                        <Button variant="ghost" size="xs" onClick={() => loadPreset(p)}>
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setPendingDelete(p)}
                          disabled={presetBusy}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </span>
                    </div>
                  ))}
                  {!filteredPresets.length && (
                    <p className="text-sm text-muted-foreground">
                      No SKUs match &quot;{skuSearch}&quot;.
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="max-w-xs flex-1">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Save this box as SKU
                  </span>
                  <Input
                    placeholder="e.g. WPCT24x4-0221"
                    value={skuName}
                    onChange={(e) => setSkuName(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSavePreset(skuName.trim(), block)}
                  disabled={presetBusy}
                >
                  {presetBusy ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved setting?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the saved setting{" "}
              <span className="font-mono font-medium text-foreground">{pendingDelete?.sku}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) onDeletePreset(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
