"use client";

import { useState } from "react";
import { savePreset as savePresetAction, deletePreset as deletePresetAction } from "@/lib/actions/bulk-campaign";
import { extractAssetId } from "@/lib/xlsx/assetId";
import ProductBlock, { Block, Preset, newBlock, Asset, Theme, Brand } from "./product-block";

function toLines(text: string) {
  return text.split("\n").map((k) => k.trim()).filter(Boolean);
}

function spreadBids(min: number, max: number, n: number): number[] {
  if (n <= 1) return [Number(min.toFixed(2))];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = min + ((max - min) * i) / (n - 1);
    out.push(Number(v.toFixed(2)));
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [a[i], a[r]] = [a[r], a[i]];
  }
  return a;
}

function distributeKeywords(
  all: string[],
  n: number,
  perCampaign: number,
  mode: "sequential" | "random"
): string[][] {
  if (!all.length) return Array.from({ length: n }, () => []);
  const k = perCampaign > 0 ? Math.min(perCampaign, all.length) : all.length;
  const result: string[][] = [];
  if (mode === "random") {
    for (let i = 0; i < n; i++) result.push(shuffle(all).slice(0, k));
    return result;
  }
  let p = 0;
  for (let i = 0; i < n; i++) {
    const slice: string[] = [];
    for (let c = 0; c < k; c++) {
      slice.push(all[p % all.length]);
      p++;
    }
    result.push(slice);
  }
  return result;
}

function buildName(
  template: string,
  vars: { n: number; bid: number; kw: number; asin: string; date: string }
): string {
  const t = (template || "").trim() || "Campaign {n}";
  return t
    .replaceAll("{n}", String(vars.n))
    .replaceAll("{bid}", vars.bid.toFixed(2))
    .replaceAll("{kw}", String(vars.kw))
    .replaceAll("{asin}", vars.asin)
    .replaceAll("{date}", vars.date);
}

export default function GenerateForm({
  step,
  brands,
  assets,
  themes,
  presets,
  onPresetsChanged,
}: {
  step: "build" | "generate";
  brands: Brand[];
  assets: Asset[];
  themes: Theme[];
  presets: Preset[];
  onPresetsChanged: () => void;
}) {
  const firstBrandId = brands[0]?.id ?? "";
  const [blocks, setBlocks] = useState<Block[]>([newBlock(firstBrandId)]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [presetBusy, setPresetBusy] = useState(false);

  function updateBlock(i: number, b: Block) {
    setBlocks(blocks.map((x, j) => (j === i ? b : x)));
  }
  function removeBlock(i: number) {
    setBlocks(blocks.filter((_, j) => j !== i));
  }

  async function savePreset(sku: string, block: Block) {
    if (!sku) {
      setError("Enter a SKU name to save.");
      return;
    }
    setError(null);
    setPresetBusy(true);
    const { error: e } = await savePresetAction(sku, block as unknown as Record<string, unknown>);
    setPresetBusy(false);
    if (e) {
      setError(e);
      return;
    }
    onPresetsChanged();
  }

  async function deletePreset(p: Preset) {
    if (!confirm(`Delete saved setting "${p.sku}"?`)) return;
    setPresetBusy(true);
    await deletePresetAction(p.id);
    setPresetBusy(false);
    onPresetsChanged();
  }

  const totalCampaigns = blocks.reduce((sum, b) => {
    const n = Math.max(1, parseInt(b.numCampaigns || "1", 10) || 1);
    if (b.adFormat === "productCollection") return sum + n;
    const asinCount = Math.max(1, b.asins.map((a) => a.trim()).filter(Boolean).length);
    return sum + n * asinCount;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const seen = new Map<string, number>();
    const payload: unknown[] = [];

    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      const label = `Product ${bi + 1}`;

      if (!block.brandId) {
        setError(`${label}: choose a Brand Profile.`);
        return;
      }

      const matchTypes = [
        block.matchExact && "exact",
        block.matchPhrase && "phrase",
        block.matchBroad && "broad",
      ].filter(Boolean) as ("exact" | "phrase" | "broad")[];
      if (!matchTypes.length) {
        setError(`${label}: select at least one match type.`);
        return;
      }

      const cleanAsins = block.asins.map((a) => a.trim()).filter(Boolean);
      if (!cleanAsins.length) {
        setError(`${label}: enter at least one ASIN.`);
        return;
      }
      if (block.adFormat === "productCollection" && (cleanAsins.length < 3 || cleanAsins.length > 10)) {
        setError(`${label}: Product Collection needs 3-10 ASINs (has ${cleanAsins.length}).`);
        return;
      }

      let videoAssetId = "";
      if (block.adFormat === "video") {
        videoAssetId =
          block.videoSource === "manual"
            ? extractAssetId(block.manualVideoAssetId)
            : block.videoAssetId;
        if (!videoAssetId) {
          setError(`${label}: select or enter a video asset.`);
          return;
        }
      }

      const selectedTheme = themes.find((t) => t.id === block.keywordThemeId);
      if (block.keywordSource === "theme" && !selectedTheme) {
        setError(`${label}: select a keyword theme.`);
        return;
      }
      const kwList =
        block.keywordSource === "manual"
          ? toLines(block.manualKeywords)
          : selectedTheme
          ? toLines(selectedTheme.keywords)
          : [];
      const negatives =
        block.keywordSource === "manual"
          ? toLines(block.manualNegatives)
          : selectedTheme
          ? toLines(selectedTheme.negative_keywords)
          : [];
      if (!kwList.length) {
        setError(`${label}: add at least one keyword.`);
        return;
      }

      const n = Math.max(1, parseInt(block.numCampaigns || "1", 10) || 1);
      const perCamp = Math.max(0, parseInt(block.keywordsPerCampaign || "0", 10) || 0);
      const bids =
        block.bidMode === "fixed"
          ? Array.from({ length: n }, () => Number(parseFloat(block.bidFixed || "0").toFixed(2)))
          : spreadBids(parseFloat(block.bidMin || "0"), parseFloat(block.bidMax || "0"), n);
      const dist = distributeKeywords(kwList, n, perCamp, block.keywordMode);
      const kwPerName = perCamp > 0 ? perCamp : kwList.length;
      const budgetOverride =
        block.budgetMode === "fixed" ? Number(parseFloat(block.budgetValue || "0")) : undefined;

      if (block.adFormat === "productCollection") {
        // One creative (the whole ASIN collection) shared across all n campaigns in this block.
        for (let i = 0; i < n; i++) {
          let name = buildName(block.campaignName, {
            n: i + 1,
            bid: bids[i],
            kw: kwPerName,
            asin: cleanAsins[0],
            date: block.startDate,
          });
          const c = (seen.get(name) ?? 0) + 1;
          seen.set(name, c);
          if (c > 1) name = `${name} ${c}`;
          payload.push({
            brandId: block.brandId,
            campaignName: name,
            adFormat: "productCollection",
            asins: cleanAsins,
            bid: bids[i],
            budget: budgetOverride,
            startDate: block.startDate,
            keywords: dist[i],
            negativeKeywords: negatives,
            matchTypes,
          });
        }
      } else {
        for (const asinValue of cleanAsins) {
          for (let i = 0; i < n; i++) {
            let name = buildName(block.campaignName, {
              n: i + 1,
              bid: bids[i],
              kw: kwPerName,
              asin: asinValue,
              date: block.startDate,
            });
            const c = (seen.get(name) ?? 0) + 1;
            seen.set(name, c);
            if (c > 1) name = `${name} ${c}`;
            payload.push({
              brandId: block.brandId,
              campaignName: name,
              adFormat: "video",
              asin: asinValue,
              bid: bids[i],
              budget: budgetOverride,
              startDate: block.startDate,
              videoAssetId,
              keywords: dist[i],
              negativeKeywords: negatives,
              matchTypes,
            });
          }
        }
      }
    }

    if (!payload.length) {
      setError("Nothing to generate.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tools/sponsored-brands-upload/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const custom = fileName.trim().replace(/\.xlsx$/i, "").replace(/[\\/:*?"<>|]/g, "-");
      a.download = custom ? `${custom}.xlsx` : `Sponsored_Brands_Bulk_${payload.length}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (!brands.length) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Add a Brand Profile above before generating a bulk file.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm">
      {step === "build" && (
        <>
          {blocks.map((b, i) => (
            <ProductBlock
              key={b.id}
              block={b}
              index={i}
              total={blocks.length}
              brands={brands}
              assets={assets}
              themes={themes}
              presets={presets}
              presetBusy={presetBusy}
              onChange={(nb) => updateBlock(i, nb)}
              onRemove={() => removeBlock(i)}
              onSavePreset={savePreset}
              onDeletePreset={deletePreset}
            />
          ))}

          <button
            type="button"
            onClick={() => setBlocks([...blocks, newBlock(firstBrandId)])}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            + Add product
          </button>
        </>
      )}

      {step === "generate" && (
        <>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Will create <b className="text-foreground">{totalCampaigns}</b> campaign
            {totalCampaigns > 1 ? "s" : ""} across {blocks.length} product
            {blocks.length > 1 ? "s" : ""} in one file.
          </div>

          <div className="rounded-lg border border-border p-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              File name (optional)
            </label>
            <input
              placeholder={`Default: Sponsored_Brands_Bulk_${totalCampaigns}.xlsx`}
              className="w-full max-w-md rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to use the default. &quot;.xlsx&quot; is added automatically.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Bulk File"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
