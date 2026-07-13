"use client";

import { useState } from "react";
import {
  savePreset as savePresetAction,
  deletePreset as deletePresetAction,
  saveProduct as saveProductAction,
  deleteProduct as deleteProductAction,
  type CampaignProduct,
} from "@/lib/actions/bulk-campaign";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
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
import ProductBlock, { Block, Preset, newBlock, Asset, Theme, Brand } from "./product-block";
import { buildCampaigns, campaignCountForBlock, summarizeBlock, blockIssues } from "./build";

type UploadResponse = {
  created: number;
  failed: number;
  results: { campaignName: string; ok: boolean; campaignId?: string; error?: string }[];
};

const UPLOADABLE_COUNTRIES = ["US", "CA"];

export default function GenerateForm({
  brands,
  assets,
  themes,
  presets,
  products,
  onPresetsChanged,
  onProductsChanged,
}: {
  brands: Brand[];
  assets: Asset[];
  themes: Theme[];
  presets: Preset[];
  products: CampaignProduct[];
  onPresetsChanged: () => void;
  onProductsChanged: () => void;
}) {
  const firstBrandId = brands[0]?.id ?? "";
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [presetBusy, setPresetBusy] = useState(false);

  // The Confirm → review/generate dialog.
  const [showGenerate, setShowGenerate] = useState(false);

  // Direct upload state.
  const [uploading, setUploading] = useState(false);
  const [confirmUpload, setConfirmUpload] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResponse | null>(null);

  // Build dialog state — a null draft means the dialog is closed.
  const [draft, setDraft] = useState<Block | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<CampaignProduct | null>(null);
  const [removing, setRemoving] = useState(false);

  const blocks = products.map((p) => p.config as Block);
  const totalCampaigns = blocks.reduce((sum, b) => sum + campaignCountForBlock(b), 0);

  // Which marketplaces the configured ads target. A batch must be a single
  // marketplace, and only US/CA can be pushed straight to the Ads API.
  const usedCountries = [
    ...new Set(
      blocks
        .map((b) => brands.find((br) => br.id === b.brandId)?.country)
        .filter((c): c is string => Boolean(c))
    ),
  ];
  const singleCountry = usedCountries.length === 1 ? usedCountries[0] : null;
  const canUpload = singleCountry !== null && UPLOADABLE_COUNTRIES.includes(singleCountry);
  const uploadDisabledReason =
    usedCountries.length > 1
      ? `Mixed marketplaces (${usedCountries.join(", ")}) — a direct upload targets one marketplace at a time.`
      : singleCountry && !canUpload
      ? `Direct upload is only available for US and CA. This batch is ${singleCountry} — use the bulk file instead.`
      : null;

  function openAdd() {
    setProductError(null);
    setEditingId(null);
    setDraft(newBlock(firstBrandId));
  }

  function openEdit(p: CampaignProduct) {
    setProductError(null);
    setEditingId(p.id);
    setDraft(structuredClone(p.config) as Block);
  }

  async function saveDraft() {
    if (!draft) return;
    setSavingProduct(true);
    setProductError(null);
    const { error: e } = await saveProductAction(draft as unknown as Record<string, unknown>, editingId);
    setSavingProduct(false);
    if (e) {
      setProductError(e);
      return;
    }
    setDraft(null);
    setEditingId(null);
    onProductsChanged();
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    setRemoving(true);
    await deleteProductAction(pendingRemove.id);
    setRemoving(false);
    setPendingRemove(null);
    onProductsChanged();
  }

  async function savePreset(sku: string, block: Block) {
    if (!sku) {
      setProductError("Enter a SKU name to save.");
      return;
    }
    setProductError(null);
    setPresetBusy(true);
    const { error: e } = await savePresetAction(sku, block as unknown as Record<string, unknown>);
    setPresetBusy(false);
    if (e) {
      setProductError(e);
      return;
    }
    onPresetsChanged();
  }

  async function deletePreset(p: Preset) {
    setPresetBusy(true);
    await deletePresetAction(p.id);
    setPresetBusy(false);
    onPresetsChanged();
  }

  // What the download/upload will contain — also the source of the dialog's
  // preview and its first validation error (including deleted-asset references).
  const preview = buildCampaigns(blocks, themes, brands, assets);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { payload, error: buildError } = buildCampaigns(blocks, themes, brands, assets);
    if (buildError) {
      setError(buildError);
      return;
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

  // Push the same campaigns straight to Amazon via the Ads API. Uses the exact
  // payload buildCampaigns produces, so it stays identical to the bulk file.
  async function handleUpload() {
    setConfirmUpload(false);
    setError(null);
    setUploadResults(null);

    const { payload, error: buildError } = buildCampaigns(blocks, themes, brands, assets);
    if (buildError) {
      setError(buildError);
      return;
    }
    if (!payload.length) {
      setError("Nothing to upload.");
      return;
    }

    setUploading(true);
    try {
      const res = await fetch("/api/tools/sponsored-brands-upload/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaigns: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      setUploadResults(data as UploadResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!brands.length) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Add a Brand Profile in the Library tab before building ads.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No ads yet. Add an ad to include it in the bulk file.
          </p>
          <Button className="mt-3" onClick={openAdd}>
            + Add ad
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {products.map((p, i) => {
              const s = summarizeBlock(p.config as Block, brands, themes);
              const issues = blockIssues(p.config as Block, brands, assets, themes);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 font-medium">Ad {i + 1}</span>
                    <Badge variant="secondary">{s.formatLabel}</Badge>
                    <span className="truncate text-muted-foreground">
                      {s.brandName} · {s.asinCount} ASIN{s.asinCount === 1 ? "" : "s"} ·{" "}
                      {s.campaignCount} campaign{s.campaignCount === 1 ? "" : "s"} ·{" "}
                      {s.keywordCount} kw
                    </span>
                    {issues.length > 0 && (
                      <Badge variant="destructive" className="shrink-0">
                        ⚠ Needs attention: {issues.join(", ")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="xs" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setPendingRemove(p)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={openAdd}>
              + Add ad
            </Button>
            <Button onClick={() => setShowGenerate(true)} disabled={!products.length}>
              Review &amp; generate →
            </Button>
          </div>
        </>
      )}

      {/* Confirm → review & generate dialog */}
      <Dialog open={showGenerate} onOpenChange={(o) => !o && setShowGenerate(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review &amp; generate</DialogTitle>
            <DialogDescription>
              This is exactly what will be created. Download the bulk file or upload it
              straight to Amazon.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Will create
              <Badge>{totalCampaigns}</Badge>
              campaign{totalCampaigns === 1 ? "" : "s"} across
              <Badge variant="secondary">{products.length}</Badge>
              ad{products.length === 1 ? "" : "s"} in one file.
            </div>

            {/* Live preview — identical to what the download will contain. */}
            {preview.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {preview.error}
              </div>
            ) : (
              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Showing {Math.min(preview.payload.length, 15)} of {preview.payload.length}
                  </span>
                </div>
                {preview.payload.length > 0 ? (
                  <ul className="max-h-72 divide-y divide-border overflow-auto">
                    {preview.payload.slice(0, 15).map((c, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium" title={c.campaignName}>
                          {c.campaignName}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Badge variant="outline">${c.bid.toFixed(2)}</Badge>
                          <Badge variant="outline">{c.keywords.length} kw</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No ads yet — add one first.
                  </p>
                )}
                {preview.payload.length > 15 && (
                  <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                    + {preview.payload.length - 15} more…
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-border p-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                File name (optional)
              </label>
              <Input
                placeholder={`Default: Sponsored_Brands_Bulk_${totalCampaigns}.xlsx`}
                className="max-w-md"
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

            {uploadDisabledReason && (
              <p className="text-xs text-muted-foreground">{uploadDisabledReason}</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleSubmit}
              disabled={loading || uploading || !products.length || preview.error !== null}
            >
              {loading ? "Generating..." : "Download bulk file"}
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmUpload(true)}
              disabled={
                loading || uploading || !products.length || preview.error !== null || !canUpload
              }
              title={uploadDisabledReason ?? undefined}
            >
              {uploading ? "Uploading to Amazon…" : "Upload to Amazon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Build / edit ad side sheet */}
      <Sheet open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <SheetContent
          side="right"
          className="w-full"
          style={{ maxWidth: "44rem" }}
        >
          <SheetHeader className="border-b border-border px-6 py-6">
            <SheetTitle>{editingId ? "Edit ad" : "Add ad"}</SheetTitle>
            <SheetDescription>Configure this ad, then save it to the list.</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-2">
            {draft && (
              <ProductBlock
                block={draft}
                brands={brands}
                assets={assets}
                themes={themes}
                presets={presets}
                presetBusy={presetBusy}
                onChange={setDraft}
                onSavePreset={savePreset}
                onDeletePreset={deletePreset}
              />
            )}
            {productError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {productError}
              </p>
            )}
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-6 py-4">
            <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
            <Button onClick={saveDraft} disabled={savingProduct}>
              {savingProduct ? "Saving…" : "Save ad"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Remove ad confirm */}
      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(o) => !o && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove ad?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the ad from the bulk file. Saved SKU presets are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmRemove} disabled={removing}>
              {removing ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload confirm */}
      <AlertDialog open={confirmUpload} onOpenChange={(o) => !o && setConfirmUpload(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upload {totalCampaigns} campaign{totalCampaigns === 1 ? "" : "s"} to Amazon?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates live, <span className="font-medium text-foreground">enabled</span>{" "}
              Sponsored Brands campaigns in the{" "}
              <span className="font-medium text-foreground">{singleCountry}</span> marketplace via
              the Amazon Ads API. This can&apos;t be undone from here — you&apos;d pause or archive
              them in Amazon. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpload}>Upload to Amazon</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload results */}
      <Dialog open={uploadResults !== null} onOpenChange={(o) => !o && setUploadResults(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload results</DialogTitle>
            <DialogDescription>
              {uploadResults?.created ?? 0} created · {uploadResults?.failed ?? 0} failed
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex gap-2">
              <Badge>{uploadResults?.created ?? 0} created</Badge>
              {(uploadResults?.failed ?? 0) > 0 && (
                <Badge variant="destructive">{uploadResults?.failed} failed</Badge>
              )}
            </div>
            <ul className="mt-3 max-h-80 divide-y divide-border overflow-auto rounded-lg border border-border">
              {uploadResults?.results.map((r, i) => (
                <li key={i} className="px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium" title={r.campaignName}>
                      {r.campaignName}
                    </span>
                    <Badge variant={r.ok ? "secondary" : "destructive"}>
                      {r.ok ? "Created" : "Failed"}
                    </Badge>
                  </div>
                  {r.ok && r.campaignId && (
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">#{r.campaignId}</p>
                  )}
                  {!r.ok && r.campaignId && (
                    <p className="mt-0.5 text-xs text-destructive">
                      ⚠ Campaign #{r.campaignId} was created but left incomplete — archive it in
                      Amazon Ads console.
                    </p>
                  )}
                  {!r.ok && r.error && (
                    <p className="mt-0.5 text-xs text-destructive break-words">{r.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <DialogClose render={<Button />}>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
