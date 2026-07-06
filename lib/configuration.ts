import type { LucideIcon } from "lucide-react";
import { ListChecks } from "lucide-react";

export interface ConfigurationItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

interface ConfigurationItemInput {
  name: string;
  description: string;
  icon: LucideIcon;
  href?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function defineConfigurationItem(input: ConfigurationItemInput): ConfigurationItem {
  const id = slugify(input.name);
  return { ...input, id, href: input.href ?? `/configuration/${id}` };
}

/**
 * Add a new configuration item as a named `defineConfigurationItem(...)` export below,
 * then include it in the `configurationItems` array (sidebar reads from that list, so
 * it stays in sync automatically). Finally, create app/(portal)/configuration/<id>/page.tsx
 * yourself: render <PageHeader> with this item's data, then add whatever custom
 * controls/content you want below it. See the existing automation pages for the pattern.
 */
export const masterList = defineConfigurationItem({
  name: "Master List",
  description: "Manage the SKUs included in the master list report",
  icon: ListChecks,
});

export const configurationItems: ConfigurationItem[] = [masterList];
