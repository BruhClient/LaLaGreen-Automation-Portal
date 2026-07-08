import type { LucideIcon } from "lucide-react";
import { Tag, Wallet } from "lucide-react";

export interface AutomationProject {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

interface ProjectInput {
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

function defineProject(input: ProjectInput): AutomationProject {
  const id = slugify(input.name);
  return { ...input, id, href: input.href ?? `/automations/${id}` };
}

/**
 * Add a new automation as a named `defineProject(...)` export below,
 * then include it in the `projects` array (sidebar and dashboard read
 * from that list, so they stay in sync automatically). Finally, create
 * app/(portal)/automations/<id>/page.tsx yourself: render <PageHeader>
 * with this project's data, then add whatever custom controls/content
 * you want below it. See the existing pages for the pattern.
 */
export const ppcTopUp = defineProject({
  name: "PPC Top Up",
  description: "Amazon Sponsored Products daily budget cap schedule",
  icon: Wallet,
});

export const priceChangePlans = defineProject({
  name: "Price Change Plans",
  description: "Plan gradual Amazon sales price changes, executed step-by-step by n8n",
  icon: Tag,
});

export const projects: AutomationProject[] = [ppcTopUp, priceChangePlans];
