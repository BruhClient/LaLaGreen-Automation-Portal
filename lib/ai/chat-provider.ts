import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { chatToolDefinitions, runChatTool } from "@/lib/ai/tools";

/**
 * All Anthropic-specific logic is isolated in this file. If the backing
 * assistant is swapped out later (e.g. for a Hermes agent), this is the
 * one module that needs to change — callers only see generateAssistantReply.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are the AI assistant embedded in the LaLaGreen Automation Portal, an internal tool for LaLaGreen staff. You help staff with questions about the business and about the portal itself (available automations and tools, staff directory). Use the provided tools when a question depends on live portal data rather than general knowledge. Be concise and direct — staff are using you for quick answers during work, not long conversations.`;

const MAX_TOOL_ITERATIONS = 5;

export async function generateAssistantReply(history: ChatMessage[]): Promise<string> {
  const anthropic = new Anthropic();
  const messages: MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: chatToolDefinitions,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults = await Promise.all(
      response.content
        .filter((block) => block.type === "tool_use")
        .map(async (block) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify(await runChatTool(block.name)),
        }))
    );

    messages.push({ role: "user", content: toolResults });
  }

  return "Sorry, I wasn't able to finish that request — try rephrasing your question.";
}
