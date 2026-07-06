"use client";

import { useEffect, useState, useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { bulkCampaignUpload } from "@/lib/tools";
import { extractAssetId } from "@/lib/xlsx/assetId";
import {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  listVideoAssets,
  createVideoAsset,
  updateVideoAsset,
  deleteVideoAsset,
  listKeywordThemes,
  createKeywordTheme,
  updateKeywordTheme,
  deleteKeywordTheme,
  duplicateKeywordTheme,
  listPresets,
  type Brand,
  type VideoAsset,
  type KeywordTheme,
  type Preset as ActionPreset,
} from "@/lib/actions/bulk-campaign";
import GenerateForm from "./generate-form";
import type { Preset } from "./product-block";

const COUNTRIES = ["US", "CA", "MX", "AU", "EU", "UK", "JP"];
const inputClass =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const primaryBtn =
  "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

type WizardStep = "library" | "build" | "generate";
const STEPS: { key: WizardStep; label: string }[] = [
  { key: "library", label: "1. Library" },
  { key: "build", label: "2. Build Products" },
  { key: "generate", label: "3. Generate" },
];

export default function BulkCampaignUploadPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [themes, setThemes] = useState<KeywordTheme[]>([]);
  const [presets, setPresets] = useState<ActionPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>("library");
  const [, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const [b, a, t, p] = await Promise.all([
        listBrands(),
        listVideoAssets(),
        listKeywordThemes(),
        listPresets(),
      ]);
      const err = b.error ?? a.error ?? t.error ?? p.error;
      if (err) setError(err);
      else {
        setBrands(b.data ?? []);
        setAssets(a.data ?? []);
        setThemes(t.data ?? []);
        setPresets(p.data ?? []);
        setError(null);
      }
      setIsLoading(false);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  const presetsForForm: Preset[] = presets.map((p) => ({
    id: p.id,
    sku: p.sku,
    config: p.config as never,
  }));

  return (
    <>
      <PageHeader
        icon={bulkCampaignUpload.icon}
        title={bulkCampaignUpload.name}
        description={bulkCampaignUpload.description}
      />

      <div className="space-y-6 px-6 pb-6 md:px-8 md:pb-8">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <Card>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {STEPS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStep(s.key)}
                  className={
                    step === s.key
                      ? `${primaryBtn} disabled:opacity-100`
                      : secondaryBtn
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className={step === "library" ? "space-y-6" : "hidden"}>
              <BrandsSection brands={brands} onChanged={reload} />
              <AssetsSection brands={brands} assets={assets} onChanged={reload} />
              <KeywordGarageSection brands={brands} themes={themes} onChanged={reload} />
            </div>

            <div className={step === "library" ? "hidden" : ""}>
              <Card>
                <CardHeader>
                  <CardTitle>{step === "build" ? "Build Products" : "Generate"}</CardTitle>
                  <CardDescription>
                    {step === "build"
                      ? "Configure one or more products to include in this bulk upload."
                      : "Review the campaign count, name the file, and generate."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GenerateForm
                    step={step === "build" ? "build" : "generate"}
                    brands={brands}
                    assets={assets}
                    themes={themes}
                    presets={presetsForForm}
                    onPresetsChanged={reload}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                disabled={step === "library"}
                onClick={() => setStep(step === "generate" ? "build" : "library")}
                className={secondaryBtn}
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={step === "generate"}
                onClick={() => setStep(step === "library" ? "build" : "generate")}
                className={primaryBtn}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function BrandsSection({ brands, onChanged }: { brands: Brand[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("US");
  const [brandEntityId, setBrandEntityId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setName("");
    setCountry("US");
    setBrandEntityId("");
    setBrandName("");
    setFormError(null);
    setOpen(true);
  }

  function openEdit(b: Brand) {
    setEditing(b);
    setName(b.name);
    setCountry(b.country);
    setBrandEntityId(b.brand_entity_id);
    setBrandName(b.brand_name);
    setFormError(null);
    setOpen(true);
  }

  async function handleSave() {
    setBusy(true);
    setFormError(null);
    const { error } = editing
      ? await updateBrand(editing.id, { name, country, brandEntityId, brandName })
      : await createBrand({ name, country, brandEntityId, brandName });
    setBusy(false);
    if (error) {
      setFormError(error);
      return;
    }
    setOpen(false);
    onChanged();
  }

  async function handleDelete(b: Brand) {
    if (!confirm(`Delete brand profile "${b.name}"? This also removes its video assets.`)) return;
    await deleteBrand(b.id);
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="grid-cols-1! sm:grid-cols-[1fr_auto]!">
        <CardTitle>Brand Profiles</CardTitle>
        <CardDescription>Amazon brand entity used to fill in bulk campaign rows</CardDescription>
        <CardAction>
          <button onClick={openAdd} className={secondaryBtn}>
            + Add Brand
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">No brand profiles yet.</p>
        ) : (
          <div className="space-y-2">
            {brands.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{b.name}</span>{" "}
                  <span className="text-muted-foreground">
                    ({b.country}) · {b.brand_name}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(b)} className="text-foreground hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(b)}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Brand Profile" : "Add Brand Profile"}</SheetTitle>
            <SheetDescription>Used to fill Brand Entity ID / Brand name in generated rows.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Country</label>
              <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Brand Entity ID
              </label>
              <input
                className={inputClass}
                value={brandEntityId}
                onChange={(e) => setBrandEntityId(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Brand Name</label>
              <input
                className={inputClass}
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <button onClick={handleSave} disabled={busy} className={primaryBtn}>
              {busy ? "Saving…" : "Save"}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function AssetsSection({
  brands,
  assets,
  onChanged,
}: {
  brands: Brand[];
  assets: VideoAsset[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VideoAsset | null>(null);
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [assetId, setAssetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setBrandId(brands[0]?.id ?? "");
    setLabel("");
    setAssetId("");
    setFormError(null);
    setOpen(true);
  }

  function openEdit(a: VideoAsset) {
    setEditing(a);
    setBrandId(a.brand_id);
    setLabel(a.label);
    setAssetId(a.asset_id);
    setFormError(null);
    setOpen(true);
  }

  async function handleSave() {
    setBusy(true);
    setFormError(null);
    const cleanAssetId = extractAssetId(assetId);
    const { error } = editing
      ? await updateVideoAsset(editing.id, { label, assetId: cleanAssetId })
      : await createVideoAsset({ brandId, label, assetId: cleanAssetId });
    setBusy(false);
    if (error) {
      setFormError(error);
      return;
    }
    setOpen(false);
    onChanged();
  }

  async function handleDelete(a: VideoAsset) {
    if (!confirm(`Delete video asset "${a.label}"?`)) return;
    await deleteVideoAsset(a.id);
    onChanged();
  }

  function brandName(id: string) {
    return brands.find((b) => b.id === id)?.name ?? "Unknown brand";
  }

  return (
    <Card>
      <CardHeader className="grid-cols-1! sm:grid-cols-[1fr_auto]!">
        <CardTitle>Video Assets</CardTitle>
        <CardDescription>Amazon creative asset IDs, per brand</CardDescription>
        <CardAction>
          <button
            onClick={openAdd}
            disabled={brands.length === 0}
            className={secondaryBtn}
            title={brands.length === 0 ? "Add a Brand Profile first" : undefined}
          >
            + Add Asset
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No video assets yet.</p>
        ) : (
          <div className="space-y-2">
            {assets.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{a.label}</span>{" "}
                  <span className="text-muted-foreground">
                    ({brandName(a.brand_id)}) · <span className="font-mono text-xs">{a.asset_id}</span>
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(a)} className="text-foreground hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Video Asset" : "Add Video Asset"}</SheetTitle>
            <SheetDescription>Paste a creative asset URL or a bare asset ID.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4">
            {!editing && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Brand Profile
                </label>
                <select className={inputClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Label</label>
              <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Asset ID or URL
              </label>
              <input
                className={`${inputClass} font-mono text-xs`}
                placeholder="amzn1.assetlibrary.asset1.XXXXX"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <button onClick={handleSave} disabled={busy} className={primaryBtn}>
              {busy ? "Saving…" : "Save"}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function KeywordGarageSection({
  brands,
  themes,
  onChanged,
}: {
  brands: Brand[];
  themes: KeywordTheme[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KeywordTheme | null>(null);
  const [brandId, setBrandId] = useState<string>("");
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [negativeKeywords, setNegativeKeywords] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setBrandId("");
    setName("");
    setKeywords("");
    setNegativeKeywords("");
    setFormError(null);
    setOpen(true);
  }

  function openEdit(t: KeywordTheme) {
    setEditing(t);
    setBrandId(t.brand_id ?? "");
    setName(t.name);
    setKeywords(t.keywords);
    setNegativeKeywords(t.negative_keywords);
    setFormError(null);
    setOpen(true);
  }

  async function handleSave() {
    setBusy(true);
    setFormError(null);
    const { error } = editing
      ? await updateKeywordTheme(editing.id, {
          brandId: brandId || null,
          name,
          keywords,
          negativeKeywords,
        })
      : await createKeywordTheme({ brandId: brandId || null, name, keywords, negativeKeywords });
    setBusy(false);
    if (error) {
      setFormError(error);
      return;
    }
    setOpen(false);
    onChanged();
  }

  async function handleDelete(t: KeywordTheme) {
    if (!confirm(`Delete keyword theme "${t.name}"?`)) return;
    await deleteKeywordTheme(t.id);
    onChanged();
  }

  async function handleDuplicate(t: KeywordTheme) {
    await duplicateKeywordTheme(t.id);
    onChanged();
  }

  function brandName(id: string | null) {
    if (id === null) return "All brands";
    return brands.find((b) => b.id === id)?.name ?? "Unknown brand";
  }

  return (
    <Card>
      <CardHeader className="grid-cols-1! sm:grid-cols-[1fr_auto]!">
        <CardTitle>Keyword Garage</CardTitle>
        <CardDescription>Reusable keyword and negative-keyword sets</CardDescription>
        <CardAction>
          <button onClick={openAdd} className={secondaryBtn}>
            + Add Theme
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {themes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keyword themes yet.</p>
        ) : (
          <div className="space-y-2">
            {themes.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{t.name}</span>{" "}
                  <span className="text-muted-foreground">({brandName(t.brand_id)})</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(t)} className="text-foreground hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(t)}
                    className="text-foreground hover:underline"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Keyword Theme" : "Add Keyword Theme"}</SheetTitle>
            <SheetDescription>
              Leave Brand Profile unset to make this theme available to all brands.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Brand Profile (optional)
              </label>
              <select className={inputClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.country})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Keywords (one per line)
              </label>
              <textarea
                className={`${inputClass} min-h-[120px] font-mono text-xs`}
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Negative keywords (optional, one per line)
              </label>
              <textarea
                className={`${inputClass} min-h-[70px] font-mono text-xs`}
                value={negativeKeywords}
                onChange={(e) => setNegativeKeywords(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <button onClick={handleSave} disabled={busy} className={primaryBtn}>
              {busy ? "Saving…" : "Save"}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
