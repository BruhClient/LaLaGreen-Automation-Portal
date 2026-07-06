"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { masterList } from "@/lib/configuration";
import {
  listSkus,
  addSkus,
  deleteSku,
  parseSkuExcel,
  type Sku,
  type DetectedSkuSheet,
} from "@/lib/actions/sku-list";

const inputClass =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const primaryBtn =
  "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

export default function MasterListPage() {
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  async function refresh() {
    const { data, error } = await listSkus();
    if (error) setError(error);
    else {
      setSkus(data ?? []);
      setError(null);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(sku: Sku) {
    if (!confirm(`Remove "${sku.sku}" from the master list?`)) return;
    await deleteSku(sku.id);
    refresh();
  }

  const filtered = (skus ?? []).filter((s) => s.sku.includes(search.trim().toUpperCase()));

  return (
    <>
      <PageHeader icon={masterList.icon} title={masterList.name} description={masterList.description} />
      <div className="p-6 md:p-8">
        <Card>
          <CardHeader className="grid-cols-1! sm:grid-cols-[1fr_auto]!">
            <CardTitle>SKUs</CardTitle>
            <CardDescription>
              {skus ? `${skus.length} SKU${skus.length === 1 ? "" : "s"} in the master list` : "Loading…"}
            </CardDescription>
            <CardAction className="flex gap-2">
              <button onClick={() => setImportOpen(true)} className={secondaryBtn}>
                Import from Excel
              </button>
              <button onClick={() => setAddOpen(true)} className={primaryBtn}>
                + Add SKUs
              </button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

            {skus === null ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : skus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No SKUs yet — add some manually or import an Excel file.</p>
            ) : (
              <>
                <input
                  className={`${inputClass} mb-3`}
                  placeholder="Filter SKUs…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="space-y-2">
                  {filtered.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="font-mono">{s.sku}</span>
                      <button onClick={() => handleDelete(s)} className="text-destructive hover:underline">
                        Remove
                      </button>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-sm text-muted-foreground">No SKUs match &quot;{search}&quot;.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AddSkusSheet open={addOpen} onOpenChange={setAddOpen} onApplied={refresh} />
      <ImportSkusSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        existingSkus={(skus ?? []).map((s) => s.sku)}
        onApplied={refresh}
      />
    </>
  );
}

function AddSkusSheet({
  open,
  onOpenChange,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setText("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleAdd() {
    const skus = text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (skus.length === 0) {
      setError("Enter at least one SKU");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await addSkus(skus);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    handleOpenChange(false);
    onApplied();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Add SKUs</SheetTitle>
          <SheetDescription>One per line, or separated by commas.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4">
          <textarea
            className={`${inputClass} min-h-40 font-mono`}
            placeholder={"SKU-0001\nSKU-0002"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <button onClick={handleAdd} disabled={busy} className={primaryBtn}>
            {busy ? "Adding…" : "Add"}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ImportSkusSheet({
  open,
  onOpenChange,
  existingSkus,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkus: string[];
  onApplied: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [extractedSkus, setExtractedSkus] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [detected, setDetected] = useState<DetectedSkuSheet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const existingSet = new Set(existingSkus);

  function reset() {
    setIsDragging(false);
    setExtractedSkus(null);
    setSelected(new Set());
    setWarnings([]);
    setDetected(null);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleFile(file: File) {
    setError(null);
    setWarnings([]);
    setExtractedSkus(null);
    setDetected(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const { data, error } = await parseSkuExcel(formData);
      if (error) setError(error);
      else if (data) {
        setExtractedSkus(data.skus);
        setSelected(new Set(data.skus));
        setWarnings(data.warnings);
        setDetected(data.detected);
      }
    });
  }

  function toggle(sku: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function handleApply() {
    if (selected.size === 0) return;
    startTransition(async () => {
      const { error } = await addSkus([...selected]);
      if (error) {
        setError(error);
        return;
      }
      handleOpenChange(false);
      onApplied();
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Use AI — Import SKUs</SheetTitle>
          <SheetDescription>
            Drop an Excel file and Claude will locate the SKU column, even if the sheet isn&apos;t formatted consistently.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
          {!extractedSkus && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center text-sm transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-input"
              }`}
            >
              <p className="text-muted-foreground">Drag an Excel file here, or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className={primaryBtn}
              >
                Browse
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              {isPending && <p className="text-xs text-muted-foreground">Analyzing with Claude…</p>}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              {warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          {detected && detected.length > 0 && (
            <div className="space-y-1 rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              {detected.map((d) => (
                <p key={d.sheetName}>
                  <span className="font-medium text-foreground">{d.sheetName}</span>: found{" "}
                  {d.rowsFound} SKU{d.rowsFound === 1 ? "" : "s"} in column &quot;{d.skuColumnLabel}&quot;
                  {d.source === "ai" ? " (Claude-detected)" : ""}
                </p>
              ))}
            </div>
          )}

          {extractedSkus && extractedSkus.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {selected.size} of {extractedSkus.length} selected — uncheck any that shouldn&apos;t be added
              </p>
              <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {extractedSkus.map((sku) => (
                  <label
                    key={sku}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Checkbox checked={selected.has(sku)} onCheckedChange={() => toggle(sku)} />
                    <span className="flex-1 truncate font-mono">{sku}</span>
                    {existingSet.has(sku) && (
                      <span className="text-xs text-muted-foreground">already in list</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row flex-wrap justify-end gap-2">
          {extractedSkus && (
            <button onClick={reset} disabled={isPending} className={secondaryBtn}>
              Start Over
            </button>
          )}
          <button
            onClick={handleApply}
            disabled={!extractedSkus || selected.size === 0 || isPending}
            className={primaryBtn}
          >
            {isPending ? "Applying…" : `Add ${selected.size || ""} SKU${selected.size === 1 ? "" : "s"}`}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
