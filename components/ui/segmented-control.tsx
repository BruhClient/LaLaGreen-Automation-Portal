"use client";

import * as React from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
};

/**
 * A controlled segmented toggle for mutually-exclusive choices — a styled
 * replacement for native radio groups. Built on the base-ui Tabs primitive so
 * it matches the rest of the design system (and gets keyboard nav for free).
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  listClassName,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  className?: string;
  listClassName?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      className={className}
    >
      <TabsList className={cn("h-auto flex-wrap", listClassName)}>
        {options.map((o) => (
          <TabsTrigger
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            className="px-3 py-1"
          >
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
