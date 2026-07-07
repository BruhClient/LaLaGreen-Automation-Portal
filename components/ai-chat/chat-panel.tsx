"use client";

import { useRef, useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { sendAiChatMessage } from "@/lib/actions";
import type { ChatMessage } from "@/lib/ai/chat-provider";

const markdownComponents = {
  p: ({ className, ...props }: React.ComponentProps<"p">) => (
    <p className={cn("mb-3 last:mb-0", className)} {...props} />
  ),
  ul: ({ className, ...props }: React.ComponentProps<"ul">) => (
    <ul className={cn("mb-3 list-disc space-y-1 pl-5 last:mb-0", className)} {...props} />
  ),
  ol: ({ className, ...props }: React.ComponentProps<"ol">) => (
    <ol className={cn("mb-3 list-decimal space-y-1 pl-5 last:mb-0", className)} {...props} />
  ),
  a: ({ className, ...props }: React.ComponentProps<"a">) => (
    <a className={cn("text-primary underline underline-offset-2", className)} target="_blank" rel="noreferrer" {...props} />
  ),
  code: ({ className, ...props }: React.ComponentProps<"code">) => (
    <code className={cn("rounded bg-muted px-1 py-0.5 text-[13px]", className)} {...props} />
  ),
  pre: ({ className, ...props }: React.ComponentProps<"pre">) => (
    <pre className={cn("mb-3 overflow-x-auto rounded-lg bg-muted p-3 text-[13px] last:mb-0", className)} {...props} />
  ),
};

function Composer({
  value,
  onChange,
  onKeyDown,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-end gap-2 rounded-3xl border border-border bg-background p-2.5 shadow-sm">
      <Textarea
        name="message"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask a question..."
        className="max-h-40 min-h-9 resize-none border-none bg-transparent px-1.5 py-1 shadow-none focus-visible:ring-0"
        disabled={disabled}
      />
      <Button
        size="icon"
        className="shrink-0 rounded-full"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
      >
        <ArrowUp />
      </Button>
    </div>
  );
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);
    scrollToBottom();

    const { data, error: sendError } = await sendAiChatMessage(nextMessages);
    setLoading(false);

    if (sendError || !data) {
      setError(sendError ?? "Something went wrong");
      return;
    }

    setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    scrollToBottom();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Sparkles className="size-7 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground">How can I help you today?</p>
        </div>
        <div className="w-full max-w-2xl">
          <Composer
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            disabled={loading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
          {messages.map((message, i) =>
            message.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[75%] rounded-3xl bg-muted px-4 py-2.5 text-[15px] whitespace-pre-wrap text-foreground">
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="size-3.5 text-primary" />
                </div>
                <div className="flex-1 pt-0.5 text-[15px] leading-relaxed text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            )
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="size-3.5 text-primary" />
              </div>
              <div className={cn("flex items-center gap-1 pt-2.5")}>
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-2 w-2 rounded-full" />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mx-auto w-full max-w-2xl px-4 text-sm text-destructive">{error}</p>
      )}

      <div className="px-4 pb-4">
        <div className="mx-auto w-full max-w-2xl">
          <Composer
            value={input}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={handleSend}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
