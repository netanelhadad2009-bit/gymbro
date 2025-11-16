import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ChatMessage, ClientMessage, MessageStatus, ChatThread } from "@/lib/schemas/chat";

export function useChat(threadId: string | null) {
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!threadId) {
      setLoading(false);
      return;
    }

    loadInitialMessages();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [threadId]);

  const loadInitialMessages = async () => {
    if (!threadId) return;

    setLoading(true);
    try {
      const response = await fetch("/api/chat/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to load thread");
      }

      const result = await response.json();
      setMessages(result.data.messages);
      setHasMore(result.data.hasMore);

      // Subscribe to realtime updates
      subscribeToMessages();
    } catch (error) {
      console.error("[useChat] Load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!threadId || channelRef.current) return;

    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coach_chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          handleRealtimeMessage(newMessage);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coach_chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          updateMessage(updatedMessage);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleRealtimeMessage = (message: ChatMessage) => {
    setMessages((prev) => {
      // Check if this is an echo of our optimistic message
      const optimisticIndex = prev.findIndex(
        (m) => m.optimistic && m.body === message.body
      );

      if (optimisticIndex !== -1) {
        // Replace optimistic with real message
        const updated = [...prev];
        updated[optimisticIndex] = {
          ...message,
          status: "delivered",
        };
        return updated;
      }

      // New message from partner - add to end
      const newMsg: ClientMessage = {
        ...message,
        status: "delivered",
      };

      // Auto-mark as read if we're viewing the chat
      if (document.visibilityState === "visible") {
        markAsRead([message.id]);
      }

      return [...prev, newMsg];
    });
  };

  const updateMessage = (message: ChatMessage) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...message,
              status: message.read_at
                ? "read"
                : message.delivered_at
                ? "delivered"
                : "sent",
            }
          : m
      )
    );
  };

  const send = useCallback(
    async (text?: string, attachment?: { name: string; type: "image" | "audio" | "file"; bytes: string }) => {
      if (!threadId || (!text && !attachment)) return;

      const optimisticId = crypto.randomUUID();
      const optimisticMessage: ClientMessage = {
        id: optimisticId,
        thread_id: threadId,
        sender_id: "me", // Placeholder
        sender_role: "user",
        body: text || null,
        attachment_url: attachment ? "uploading..." : null,
        attachment_type: attachment?.type || null,
        delivered_at: null,
        read_at: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        status: "sending",
        optimistic: true,
      };

      // Add optimistically
      setMessages((prev) => [...prev, optimisticMessage]);
      setSending(true);

      try {
        const response = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: threadId,
            body: text,
            attachment,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const result = await response.json();

        // The real message will come via Realtime
        // Just update status to sent
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId ? { ...m, status: "sent" as MessageStatus } : m
          )
        );
      } catch (error) {
        console.error("[useChat] Send error:", error);
        // Mark as error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId
              ? { ...m, status: "error" as MessageStatus, error: "Failed to send" }
              : m
          )
        );
      } finally {
        setSending(false);
      }
    },
    [threadId]
  );

  const loadMore = useCallback(async () => {
    if (!threadId || !hasMore || loading) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/chat/thread?thread_id=${threadId}&before=${oldestMessage.created_at}&limit=40`
      );

      if (!response.ok) {
        throw new Error("Failed to load more messages");
      }

      const result = await response.json();
      setMessages((prev) => [...result.data.messages, ...prev]);
      setHasMore(result.data.hasMore);
    } catch (error) {
      console.error("[useChat] Load more error:", error);
    } finally {
      setLoading(false);
    }
  }, [threadId, messages, hasMore, loading]);

  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!threadId || messageIds.length === 0) return;

      try {
        await fetch("/api/chat/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: threadId,
            message_ids: messageIds,
          }),
        });
      } catch (error) {
        console.error("[useChat] Mark read error:", error);
      }
    },
    [threadId]
  );

  const setTyping = useCallback(
    async (typing: boolean) => {
      if (!threadId) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      try {
        await fetch("/api/chat/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: threadId,
            typing,
          }),
        });

        // Auto-stop typing after 3 seconds
        if (typing) {
          typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
          }, 3000);
        }
      } catch (error) {
        console.error("[useChat] Set typing error:", error);
      }
    },
    [threadId]
  );

  const retry = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      // Remove error message and resend
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      send(message.body || undefined);
    },
    [messages, send]
  );

  return {
    messages,
    loading,
    hasMore,
    sending,
    send,
    loadMore,
    markAsRead,
    setTyping,
    retry,
  };
}
