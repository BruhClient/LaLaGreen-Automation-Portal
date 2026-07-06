"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ppcTopUp } from "@/lib/projects";
import { getDailyCapConfig, type CountryConfig } from "@/lib/actions/ppc-daily-cap";
import { listManualTopUps } from "@/lib/actions/ppc-manual-topups";
import { computeProjectedRows, currentSlotSgt } from "@/lib/ppc-daily-cap-constants";

const chartConfig = {
  runningTotal: { label: "Cumulative cap ($)", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

export default function PpcTopUpCharts() {
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [amountsByCountry, setAmountsByCountry] = useState<Record<string, Record<string, number>>>({});
  const [topupsByCountry, setTopupsByCountry] = useState<Record<string, { target_date: string; slot_time: string; amount: number }[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [{ data: config }, { data: topups }] = await Promise.all([
        getDailyCapConfig(),
        listManualTopUps(),
      ]);

      if (config) {
        setCountries(config.countries);
        const amounts: Record<string, Record<string, number>> = {};
        for (const row of config.schedule) {
          amounts[row.country_code] ??= {};
          amounts[row.country_code][row.slot_time] = row.amount;
        }
        setAmountsByCountry(amounts);
      }

      if (topups) {
        const byCountry: Record<string, { target_date: string; slot_time: string; amount: number }[]> = {};
        for (const t of topups) {
          if (t.status === "cancelled") continue;
          byCountry[t.country_code] ??= [];
          byCountry[t.country_code].push(t);
        }
        setTopupsByCountry(byCountry);
      }

      setIsLoading(false);
    });
  }, []);

  const enabledCountries = useMemo(() => countries.filter((c) => c.enabled), [countries]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (enabledCountries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {enabledCountries.map((country) => {
        const rows = [
          ...computeProjectedRows(
            amountsByCountry[country.country_code] ?? {},
            country.reset_time,
            topupsByCountry[country.country_code] ?? [],
            0
          ),
        ].sort((a, b) => a.slot.localeCompare(b.slot));

        return (
          <Card key={country.country_code}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{country.country_code}</CardTitle>
              <Link
                href={ppcTopUp.href}
                className="text-xs font-medium text-primary hover:underline"
              >
                View →
              </Link>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-32 w-full">
                <LineChart data={rows}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="slot" tickLine={false} axisLine={false} interval={35} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    x={currentSlotSgt()}
                    stroke="var(--color-destructive)"
                    strokeDasharray="4 4"
                  />
                  <Line
                    dataKey="runningTotal"
                    type="monotone"
                    stroke="var(--color-runningTotal)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
