import type Anthropic from "@anthropic-ai/sdk";
import { getStaffDirectory } from "@/lib/actions/staff";
import { projects } from "@/lib/projects";
import { tools as portalTools } from "@/lib/tools";

/**
 * Read-only tools exposed to the AI assistant. No mutating actions
 * (create/delete/reset password, etc.) are exposed here on purpose —
 * the assistant can inform staff, not act on their behalf.
 */
export const chatToolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_staff_directory",
    description:
      "Get the list of LaLaGreen staff accounts (username and role: admin or user). Use this to answer questions like who works here or who the admins are.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_automations",
    description:
      "List the automation projects available in the portal, with their names and descriptions.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_tools",
    description:
      "List the standalone tools available in the portal (distinct from automations), with their names and descriptions.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

export async function runChatTool(name: string): Promise<unknown> {
  switch (name) {
    case "get_staff_directory": {
      const { data, error } = await getStaffDirectory();
      if (error) return { error };
      return data;
    }
    case "list_automations":
      return projects.map(({ name, description }) => ({ name, description }));
    case "list_tools":
      return portalTools.map(({ name, description }) => ({ name, description }));
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
