"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatContextValue = {
  chat: ChatMessage[];
  setChat: Dispatch<SetStateAction<ChatMessage[]>>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Lifts coach chat state above both the inline DASH-tab CoachPanel and
 * the overlay CoachDrawer so the conversation persists across tab
 * switches within a single session.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState<ChatMessage[]>([]);
  return (
    <ChatContext.Provider value={{ chat, setChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}
