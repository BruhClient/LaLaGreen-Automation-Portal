"use client";

import { useEffect, useState, useTransition } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { pricingUpdate } from "@/lib/tools";
import { listSkus, type Sku } from "@/lib/actions/sku-list";
import { fetchSkuPricing } from "@/lib/actions/pricing-update";
import type { PricingResult, MarketplaceCode } from "@/lib/amazon/sp-api";

const inputClass =
  "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const primaryBtn =
  "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";

function formatPrice(amount: number | null) {
  return amount === null ? "—" : `$${amount.toFixed(2)}`;
}

export default function PricingUpdatePage() {
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marketplace, setMarketplace] = useState<MarketplaceCode>("US");
  const [results, setResults] = useState<PricingResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listSkus().then(({ data, error }) => {
      if (error) setError(error);
      else setSkus(data ?? []);
    });
  }, []);

  const filtered = (skus ?? []).filter((s) => s.sku.includes(search.trim().toUpperCase()));

  function toggle(sku: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => new Set([...prev, ...filtered.map((s) => s.sku)]));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleGetPricing() {
    setError(null);
    startTransition(async () => {
      const { data, error } = await fetchSkuPricing([...selected], marketplace);
      if (error) {
        setError(error);
        setResults(null);
      } else {
        setResults(data);
      }
    });
  }

  return (
    <>
      <PageHeader icon={pricingUpdate.icon} title={pricingUpdate.name} description={pricingUpdate.description} />
      <div className="space-y-6 p-6 md:p-8">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="grid-cols-1! sm:grid-cols-[1fr_auto]!">
            <CardTitle>Select SKUs</CardTitle>
            <CardDescription>
              {skus ? `${skus.length} SKU${skus.length === 1 ? "" : "s"} in the master list` : "Loading…"}
            </CardDescription>
            <CardAction className="flex flex-wrap items-center gap-2">
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value as MarketplaceCode)}
                className={inputClass}
              >
                <option value="US">US</option>
                <option value="CA">Canada</option>
              </select>
              <button onClick={handleGetPricing} disabled={selected.size === 0 || isPending} className={primaryBtn}>
                {isPending ? "Fetching…" : `Get Pricing (${selected.size})`}
              </button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {skus === null ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : skus.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No SKUs in the master list yet — add some under Configuration → Master List.
              </p>
            ) : (
              <>
                <input
                  className={`${inputClass} mb-3`}
                  placeholder="Filter SKUs…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {selected.size} selected
                    {selected.size > 50 ? " — large batches may take a while to fetch" : ""}
                  </span>
                  <span className="flex gap-3">
                    <button onClick={selectAllFiltered} className="hover:underline">
                      Select all filtered
                    </button>
                    <button onClick={clearSelection} className="hover:underline">
                      Clear
                    </button>
                  </span>
                </div>
                <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {filtered.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <Checkbox checked={selected.has(s.sku)} onCheckedChange={() => toggle(s.sku)} />
                      <span className="font-mono">{s.sku}</span>
                    </label>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">No SKUs match &quot;{search}&quot;.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {results.length} SKU{results.length === 1 ? "" : "s"} — {marketplace} marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">SKU</th>
                    <th className="py-2 pr-4 font-medium">List Price</th>
                    <th className="py-2 pr-4 font-medium">Sales Price</th>
                    <th className="py-2 pr-4 font-medium">Featured Price</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.sku} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 font-mono">{r.sku}</td>
                      <td className="py-2 pr-4">{formatPrice(r.listPrice)}</td>
                      <td className="py-2 pr-4">{formatPrice(r.salesPrice)}</td>
                      <td className="py-2 pr-4">{formatPrice(r.featuredPrice)}</td>
                      <td className="py-2 text-destructive">{r.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
