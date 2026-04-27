import type { ChatMessage } from "./ChatContext";

export function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="text-xs">
        <div
          className="mb-1 text-[10px] tracking-widest"
          style={{ color: "var(--color-amber)" }}
        >
          OPERATOR
        </div>
        <div
          className="border-l-2 pl-2 whitespace-pre-wrap text-zinc-200"
          style={{
            borderLeftColor:
              "color-mix(in oklab, var(--color-amber) 30%, transparent)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="text-xs">
      <div
        className="mb-1 text-[10px] tracking-widest"
        style={{ color: "var(--color-cyan)" }}
      >
        COACH
      </div>
      <div
        className="border-l-2 pl-2 whitespace-pre-wrap leading-relaxed text-zinc-300"
        style={{
          borderLeftColor:
            "color-mix(in oklab, var(--color-cyan) 30%, transparent)",
        }}
      >
        {message.content}
      </div>
    </div>
  );
}
