"use server";

import { getSession } from "@/lib/session";
import { generateAssistantReply, type ChatMessage } from "@/lib/ai/chat-provider";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;

export async function sendAiChatMessage(messages: ChatMessage[]) {
  const session = await getSession();
  if (!session) return { data: null, error: "Unauthorized" };

  if (!Array.isArray(messages) || messages.length === 0) {
    return { data: null, error: "No message provided" };
  }
  if (messages.length > MAX_MESSAGES) {
    return { data: null, error: "Conversation is too long — start a new chat" };
  }
  if (messages.some((m) => typeof m.content !== "string" || m.content.length > MAX_MESSAGE_LENGTH)) {
    return { data: null, error: "Message is too long" };
  }

  try {
    const reply = await generateAssistantReply(messages);
    return { data: { reply }, error: null };
  } catch {
    return { data: null, error: "The assistant is unavailable right now — try again shortly" };
  }
}
