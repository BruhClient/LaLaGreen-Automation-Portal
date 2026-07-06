import type { LucideIcon } from "lucide-react";
import { FileSpreadsheet } from "lucide-react";

export interface AutomationTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

interface ToolInput {
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

function defineTool(input: ToolInput): AutomationTool {
  const id = slugify(input.name);
  return { ...input, id, href: input.href ?? `/tools/${id}` };
}

/**
 * Add a new tool as a named `defineTool(...)` export below,
 * then include it in the `tools` array (sidebar and dashboard read
 * from that list, so they stay in sync automatically). Finally, create
 * app/(portal)/tools/<id>/page.tsx yourself: render <PageHeader>
 * with this tool's data, then add whatever custom controls/content
 * you want below it. See the existing automation pages for the pattern.
 */
export const bulkCampaignUpload = defineTool({
  name: "Sponsored Brands Upload",
  description: "Generate Amazon Sponsored Brands Video bulk upload files",
  icon: FileSpreadsheet,
});

export const tools: AutomationTool[] = [bulkCampaignUpload];
