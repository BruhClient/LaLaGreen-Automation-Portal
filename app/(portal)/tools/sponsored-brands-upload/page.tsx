"use client";

import { useEffect, useState, useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
  listProducts,
  type Brand,
  type VideoAsset,
  type KeywordTheme,
  type Preset as ActionPreset,
  type CampaignProduct,
} from "@/lib/actions/bulk-campaign";
import GenerateForm from "./generate-form";
import type { Preset } from "./product-block";

const COUNTRIES = ["US", "CA", "MX", "AU", "EU", "UK", "JP"];
const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";
const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

type WizardStep = "library" | "build";
const STEPS: { key: WizardStep; label: string }[] = [
  { key: "library", label: "Library" },
  { key: "build", label: "Build Ads" },
];

export default function BulkCampaignUploadPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [themes, setThemes] = useState<KeywordTheme[]>([]);
  const [presets, setPresets] = useState<ActionPreset[]>([]);
  const [products, setProducts] = useState<CampaignProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>("library");
  const [, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const [b, a, t, p, pr] = await Promise.all([
        listBrands(),
        listVideoAssets(),
        listKeywordThemes(),
        listPresets(),
        listProducts(),
      ]);
      const err = b.error ?? a.error ?? t.error ?? p.error ?? pr.error;
      if (err) setError(err);
      else {
        setBrands(b.data ?? []);
        setAssets(a.data ?? []);
        setThemes(t.data ?? []);
        setPresets(p.data ?? []);
        setProducts(pr.data ?? []);
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

  const libraryCount = brands.length + assets.length + themes.length;

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
            <Tabs value={step} onValueChange={(v) => setStep(v as WizardStep)}>
              <TabsList>
                {STEPS.map((s) => (
                  <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
                    {s.label}
                    {s.key === "library" && libraryCount > 0 && (
                      <Badge variant="secondary">{libraryCount}</Badge>
                    )}
                    {s.key === "build" && products.length > 0 && (
                      <Badge variant="secondary">{products.length}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Library content — GenerateForm stays mounted below so its
                in-progress product config survives switching tabs. */}
            <div className={step === "library" ? "space-y-6" : "hidden"}>
              <BrandsSection brands={brands} onChanged={reload} />
              <AssetsSection brands={brands} assets={assets} onChanged={reload} />
              <KeywordGarageSection brands={brands} themes={themes} onChanged={reload} />
            </div>

            <div className={step === "library" ? "hidden" : ""}>
              <Card>
                <CardHeader>
                  <CardTitle>Build Ads</CardTitle>
                  <CardDescription>
                    Configure one or more ads, then Review &amp; generate to download the bulk
                    file or upload straight to Amazon.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GenerateForm
                    brands={brands}
                    assets={assets}
                    themes={themes}
                    presets={presetsForForm}
                    products={products}
                    onPresetsChanged={reload}
                    onProductsChanged={reload}
                  />
                </CardContent>
              </Card>
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
  const [brandLogoAssetId, setBrandLogoAssetId] = useState("");
  const [storePageUrl, setStorePageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Brand | null>(null);

  function openAdd() {
    setEditing(null);
    setName("");
    setCountry("US");
    setBrandEntityId("");
    setBrandName("");
    setBrandLogoAssetId("");
    setStorePageUrl("");
    setFormError(null);
    setOpen(true);
  }

  function openEdit(b: Brand) {
    setEditing(b);
    setName(b.name);
    setCountry(b.country);
    setBrandEntityId(b.brand_entity_id);
    setBrandName(b.brand_name);
    setBrandLogoAssetId(b.brand_logo_asset_id ?? "");
    setStorePageUrl(b.store_page_url ?? "");
    setFormError(null);
    setOpen(true);
  }

  async function handleSave() {
    setBusy(true);
    setFormError(null);
    const cleanLogo = extractAssetId(brandLogoAssetId);
    const { error } = editing
      ? await updateBrand(editing.id, {
          name,
          country,
          brandEntityId,
          brandName,
          brandLogoAssetId: cleanLogo,
          storePageUrl,
        })
      : await createBrand({
          name,
          country,
          brandEntityId,
          brandName,
          brandLogoAssetId: cleanLogo,
          storePageUrl,
        });
    setBusy(false);
    if (error) {
      setFormError(error);
      return;
    }
    setOpen(false);
    onChanged();
  }

  async function handleDelete(b: Brand) {
    await deleteBrand(b.id);
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="grid-cols-1! sm:grid-cols-[1fr_auto]!">
        <CardTitle>Brand Profiles</CardTitle>
        <CardDescription>Amazon brand entity used to fill in bulk campaign rows</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={openAdd}>
            + Add Brand
          </Button>
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
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{b.name}</span>
                  <Badge variant="outline">{b.country}</Badge>
                  <span className="truncate text-muted-foreground">{b.brand_name}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="xs" onClick={() => openEdit(b)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setPendingDelete(b)}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
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
              <label className={labelClass}>Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <select className={selectClass} value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Brand Entity ID</label>
              <Input value={brandEntityId} onChange={(e) => setBrandEntityId(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Brand Name</label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Brand Logo Asset ID (optional)</label>
              <Input
                className="font-mono text-xs"
                placeholder="amzn1.assetlibrary.asset1.XXXXX"
                value={brandLogoAssetId}
                onChange={(e) => setBrandLogoAssetId(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Used on Product Collection ads when uploading directly to Amazon.
              </p>
            </div>
            <div>
              <label className={labelClass}>Store Page URL (optional)</label>
              <Input
                placeholder="https://www.amazon.com/stores/page/…"
                value={storePageUrl}
                onChange={(e) => setStorePageUrl(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Brand Store landing page for Product Collection ads. Leave blank to link to the ASINs.
              </p>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DeleteConfirm
        item={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(b) => handleDelete(b)}
        title="Delete brand profile?"
        describe={(b) => (
          <>
            This deletes <span className="font-medium text-foreground">{b.name}</span> and all of its
            video assets.
          </>
        )}
      />
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
  const [pendingDelete, setPendingDelete] = useState<VideoAsset | null>(null);

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
          <Button
            variant="outline"
            size="sm"
            onClick={openAdd}
            disabled={brands.length === 0}
            title={brands.length === 0 ? "Add a Brand Profile first" : undefined}
          >
            + Add Asset
          </Button>
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
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{a.label}</span>
                  <Badge variant="outline">{brandName(a.brand_id)}</Badge>
                  <span className="truncate font-mono text-xs text-muted-foreground">{a.asset_id}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="xs" onClick={() => openEdit(a)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setPendingDelete(a)}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
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
                <label className={labelClass}>Brand Profile</label>
                <select className={selectClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Asset ID or URL</label>
              <Input
                className="font-mono text-xs"
                placeholder="amzn1.assetlibrary.asset1.XXXXX"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DeleteConfirm
        item={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(a) => handleDelete(a)}
        title="Delete video asset?"
        describe={(a) => (
          <>
            This deletes the video asset <span className="font-medium text-foreground">{a.label}</span>.
          </>
        )}
      />
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
  const [pendingDelete, setPendingDelete] = useState<KeywordTheme | null>(null);

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
          <Button variant="outline" size="sm" onClick={openAdd}>
            + Add Theme
          </Button>
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
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{t.name}</span>
                  <Badge variant="outline">{brandName(t.brand_id)}</Badge>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="xs" onClick={() => openEdit(t)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => handleDuplicate(t)}>
                    Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setPendingDelete(t)}
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
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
              <label className={labelClass}>Brand Profile (optional)</label>
              <select className={selectClass} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">All brands</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.country})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Keywords (one per line)</label>
              <Textarea
                className="min-h-[120px] font-mono text-xs"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Negative keywords (optional, one per line)</label>
              <Textarea
                className="min-h-[70px] font-mono text-xs"
                value={negativeKeywords}
                onChange={(e) => setNegativeKeywords(e.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DeleteConfirm
        item={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(t) => handleDelete(t)}
        title="Delete keyword theme?"
        describe={(t) => (
          <>
            This deletes the keyword theme <span className="font-medium text-foreground">{t.name}</span>.
          </>
        )}
      />
    </Card>
  );
}

/** Shared destructive-confirm dialog for the Library sections. */
function DeleteConfirm<T>({
  item,
  onCancel,
  onConfirm,
  title,
  describe,
}: {
  item: T | null;
  onCancel: () => void;
  onConfirm: (item: T) => void;
  title: string;
  describe: (item: T) => React.ReactNode;
}) {
  return (
    <AlertDialog open={item !== null} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{item !== null ? describe(item) : null}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (item !== null) onConfirm(item);
              onCancel();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
