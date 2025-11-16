"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@/hooks/useChat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";

type Props = {
  coachName: string;
  coachAvatar: string | null;
};

export function ChatScreen({ coachName, coachAvatar }: Props) {
  const router = useRouter();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(true);

  const chat = useChat(threadId);

  // Runtime guard: force-remove any composer elements
  useEffect(() => {
    const root = document.getElementById('coach-root');
    if (!root) return;

    const kill = () => {
      const selectors = [
        '[data-role="composer"]',
        '.composer',
        '[data-spacer="composer"]',
        '.composer-spacer',
        '[placeholder*="כתוב הודעה"]',
        'button[aria-label="שלח"]',
        'button[data-send]',
        'button[data-role="send"]',
        '[data-testid="composer"]',
        '[data-component="composer"]',
        'form[data-role="composer-form"]',
      ];
      const nodes = root.querySelectorAll(selectors.join(','));
      if (nodes.length) {
        nodes.forEach(n => n.remove());
        // Also remove empty parents that only served spacing
        root.querySelectorAll('[data-spacer="composer"], .composer-spacer').forEach(n => n.remove());
        console.debug('[Coach] Composer elements were force-removed at runtime:', nodes.length);
      }
    };

    // Initial sweep
    kill();

    // Observe mutations in case something injects later
    const mo = new MutationObserver(() => kill());
    mo.observe(root, { childList: true, subtree: true });

    return () => mo.disconnect();
  }, []);

  // Initialize thread
  useEffect(() => {
    initializeThread();
  }, []);

  const initializeThread = async () => {
    try {
      const response = await fetch("/api/chat/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to initialize thread");
      }

      const result = await response.json();
      setThreadId(result.data.thread.id);
    } catch (error) {
      console.error("[ChatScreen] Init error:", error);
    } finally {
      setLoadingThread(false);
    }
  };

  if (loadingThread) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2F163]" />
      </div>
    );
  }

  if (!threadId) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <p className="text-white mb-4">שגיאה בטעינת הצ'אט</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-[#E2F163] text-black font-semibold rounded-xl"
          >
            חזור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="coach-root"
      className="flex flex-col min-h-dvh bg-black"
      dir="rtl"
      data-coach-root
      data-coach-screen
    >
      {/* Header */}
      <ChatHeader
        coachName={coachName}
        coachAvatar={coachAvatar}
        threadId={threadId}
        onBack={() => router.back()}
      />

      {/* Messages - flex-1 to fill space, no bottom padding (no composer) */}
      <div className="flex-1 overflow-y-auto bg-black pb-24">
        <MessageList
          messages={chat.messages}
          loading={chat.loading}
          hasMore={chat.hasMore}
          onLoadMore={chat.loadMore}
          onRetry={chat.retry}
        />
      </div>
    </div>
  );
}
