"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
// keywords + spread. A saved setting stores exactly one of these.
export type Block = {
  id: string;
  brandId: string;
  adFormat: "video" | "productCollection";
  campaignName: string;
  startDate: string;
  asins: string[];
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

const inputClass =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

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
  return text.split("\n").map((k) => k.trim()).filter(Boolean);
}

export default function ProductBlock({
  block,
  index,
  total,
  brands,
  assets,
  themes,
  presets,
  presetBusy,
  onChange,
  onRemove,
  onSavePreset,
  onDeletePreset,
}: {
  block: Block;
  index: number;
  total: number;
  brands: Brand[];
  assets: Asset[];
  themes: Theme[];
  presets: Preset[];
  presetBusy: boolean;
  onChange: (b: Block) => void;
  onRemove: () => void;
  onSavePreset: (sku: string, block: Block) => void;
  onDeletePreset: (p: Preset) => void;
}) {
  const set = (patch: Partial<Block>) => onChange({ ...block, ...patch });

  const [skuSearch, setSkuSearch] = useState("");
  const [skuName, setSkuName] = useState("");
  const [showSaved, setShowSaved] = useState(false);

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

  function loadPreset(p: Preset) {
    // Keep this box's id; fill from saved setting on top of defaults so older
    // presets that are missing newer fields still load cleanly.
    onChange({ ...newBlock(block.brandId), ...p.config, id: block.id });
    setSkuName(p.sku);
  }

  return (
    <Card>
      <CardHeader className="grid-cols-1! flex-row items-center justify-between">
        <CardTitle>Product {index + 1}</CardTitle>
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-destructive"
          >
            Remove
          </button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Brand Profile */}
        <div>
          <Label className={labelClass}>Brand Profile</Label>
          <select
            className={`${inputClass} max-w-md`}
            value={block.brandId}
            onChange={(e) => set({ brandId: e.target.value })}
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.country})
              </option>
            ))}
          </select>
        </div>

        {/* Ad format */}
        <div>
          <Label className={labelClass}>Ad format</Label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`adFormat-${block.id}`}
                checked={block.adFormat === "video"}
                onChange={() => set({ adFormat: "video" })}
              />
              Video
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`adFormat-${block.id}`}
                checked={block.adFormat === "productCollection"}
                onChange={() => set({ adFormat: "productCollection" })}
              />
              Product Collection
            </label>
          </div>
        </div>

        {/* Saved settings (apply only to this box) */}
        <div className="space-y-2 rounded-lg border border-border p-3">
          <button
            type="button"
            onClick={() => setShowSaved((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium"
          >
            <span>Saved settings (by SKU)</span>
            <span className="text-muted-foreground">{showSaved ? "Hide ▲" : "Show ▼"}</span>
          </button>

          {showSaved && (
            <>
              <input
                placeholder="Search SKU (e.g. WPCT24)"
                className={`${inputClass} max-w-md`}
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
              />
              {presets.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-auto">
                  {filteredPresets.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                    >
                      <span className="font-mono text-sm">{p.sku}</span>
                      <span className="flex gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => loadPreset(p)}
                          className="text-foreground hover:underline"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePreset(p)}
                          disabled={presetBusy}
                          className="text-destructive hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
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
                  <input
                    placeholder="e.g. WPCT24x4-0221"
                    className={inputClass}
                    value={skuName}
                    onChange={(e) => setSkuName(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onSavePreset(skuName.trim(), block)}
                  disabled={presetBusy}
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {presetBusy ? "Saving…" : "Save settings"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Campaign name template */}
        <div>
          <Label className={labelClass}>Campaign name template</Label>
          <input
            placeholder="e.g. Sponsor Brand xxx Bid {bid}"
            className={inputClass}
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

        {/* Start date */}
        <div>
          <Label className={labelClass}>Start date</Label>
          <input
            type="date"
            className={`${inputClass} max-w-[12rem]`}
            value={block.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
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
          <div className="space-y-2">
            {block.asins.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  placeholder={`ASIN ${i + 1}`}
                  className={inputClass}
                  value={a}
                  onChange={(e) =>
                    set({ asins: block.asins.map((v, j) => (j === i ? e.target.value : v)) })
                  }
                />
                {block.asins.length > 1 && (
                  <button
                    type="button"
                    onClick={() => set({ asins: block.asins.filter((_, j) => j !== i) })}
                    className="shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-destructive"
                    title="Remove this ASIN"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set({ asins: [...block.asins, ""] })}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            + Add ASIN
          </button>
          {block.adFormat === "productCollection" &&
            (() => {
              const count = block.asins.map((a) => a.trim()).filter(Boolean).length;
              return count < 3 || count > 10 ? (
                <p className="mt-1 text-xs text-destructive">
                  {count} ASIN{count === 1 ? "" : "s"} entered — Product Collection needs 3–10.
                </p>
              ) : null;
            })()}
        </div>

        {/* Video asset */}
        {block.adFormat === "video" && (
          <div>
            <Label className={labelClass}>Video asset</Label>
            <div className="mb-2 flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`videoSource-${block.id}`}
                  checked={block.videoSource === "saved"}
                  onChange={() => set({ videoSource: "saved" })}
                />
                From Video Assets
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`videoSource-${block.id}`}
                  checked={block.videoSource === "manual"}
                  onChange={() => set({ videoSource: "manual" })}
                />
                Type manually
              </label>
            </div>
            {block.videoSource === "saved" ? (
              <select
                className={inputClass}
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
              <input
                className={`${inputClass} font-mono text-sm`}
                placeholder="amzn1.assetlibrary.asset1.XXXXXXXXXXXXXXXXXXXX"
                value={block.manualVideoAssetId}
                onChange={(e) => set({ manualVideoAssetId: e.target.value })}
              />
            )}
          </div>
        )}

        {/* Keywords */}
        <div>
          <Label className={labelClass}>Keywords</Label>
          <div className="mb-2 flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`kwSource-${block.id}`}
                checked={block.keywordSource === "theme"}
                onChange={() => set({ keywordSource: "theme" })}
              />
              From Keyword Garage
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`kwSource-${block.id}`}
                checked={block.keywordSource === "manual"}
                onChange={() => set({ keywordSource: "manual" })}
              />
              Type manually
            </label>
          </div>
          {block.keywordSource === "theme" ? (
            <>
              {brandThemes.length ? (
                <select
                  className={inputClass}
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
              {selectedTheme && (
                <p className="mt-1 text-xs text-muted-foreground">{kwCount} keywords in this theme.</p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">
                  Keywords (one per line)
                </span>
                <textarea
                  className={`${inputClass} min-h-[120px] font-mono text-sm`}
                  placeholder={"outdoor wall planter\nvertical garden\nhanging plant holder"}
                  value={block.manualKeywords}
                  onChange={(e) => set({ manualKeywords: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">{kwCount} keywords entered.</p>
              </div>
              <div>
                <span className="mb-1 block text-xs text-muted-foreground">
                  Negative keywords (optional, one per line)
                </span>
                <textarea
                  className={`${inputClass} min-h-[70px] font-mono text-sm`}
                  placeholder={"cheap\nused"}
                  value={block.manualNegatives}
                  onChange={(e) => set({ manualNegatives: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Spread */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className={labelClass}>Number of campaigns</Label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={block.numCampaigns}
              onChange={(e) => set({ numCampaigns: e.target.value })}
            />
          </div>
          <div>
            <Label className={labelClass}>Keywords per campaign</Label>
            <input
              type="number"
              min={0}
              placeholder="All"
              className={inputClass}
              value={block.keywordsPerCampaign}
              onChange={(e) => set({ keywordsPerCampaign: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted-foreground">0 or blank = all keywords each.</p>
          </div>
        </div>

        <div>
          <Label className={labelClass}>Distribute keywords</Label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`kwMode-${block.id}`}
                checked={block.keywordMode === "sequential"}
                onChange={() => set({ keywordMode: "sequential" })}
              />
              Sequential (1–10, 11–20, … wraps)
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`kwMode-${block.id}`}
                checked={block.keywordMode === "random"}
                onChange={() => set({ keywordMode: "random" })}
              />
              Random
            </label>
          </div>
        </div>

        <div>
          <Label className={labelClass}>Bid</Label>
          <div className="mb-2 flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`bidMode-${block.id}`}
                checked={block.bidMode === "fixed"}
                onChange={() => set({ bidMode: "fixed" })}
              />
              Fixed
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`bidMode-${block.id}`}
                checked={block.bidMode === "range"}
                onChange={() => set({ bidMode: "range" })}
              />
              Range (spread across campaigns)
            </label>
          </div>
          {block.bidMode === "fixed" ? (
            <input
              type="number"
              step="0.01"
              className={`${inputClass} max-w-[10rem]`}
              value={block.bidFixed}
              onChange={(e) => set({ bidFixed: e.target.value })}
            />
          ) : (
            <div className="flex items-end gap-3">
              <div className="max-w-[8rem]">
                <span className="mb-1 block text-xs text-muted-foreground">Min ($)</span>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={block.bidMin}
                  onChange={(e) => set({ bidMin: e.target.value })}
                />
              </div>
              <div className="max-w-[8rem]">
                <span className="mb-1 block text-xs text-muted-foreground">Max ($)</span>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={block.bidMax}
                  onChange={(e) => set({ bidMax: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <Label className={labelClass}>Daily budget</Label>
          <div className="mb-2 flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`budgetMode-${block.id}`}
                checked={block.budgetMode === "auto"}
                onChange={() => set({ budgetMode: "auto" })}
              />
              Auto (from bid, min $2)
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`budgetMode-${block.id}`}
                checked={block.budgetMode === "fixed"}
                onChange={() => set({ budgetMode: "fixed" })}
              />
              Fixed amount
            </label>
          </div>
          {block.budgetMode === "fixed" && (
            <div className="max-w-[10rem]">
              <span className="mb-1 block text-xs text-muted-foreground">Daily budget ($)</span>
              <input
                type="number"
                step="0.01"
                min="1"
                className={inputClass}
                value={block.budgetValue}
                onChange={(e) => set({ budgetValue: e.target.value })}
              />
            </div>
          )}
        </div>

        <div>
          <Label className={labelClass}>Match types</Label>
          <div className="flex gap-4">
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
      </CardContent>
    </Card>
  );
}
