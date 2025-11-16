import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Message = {
  id: string;
  coach_id: string;
  client_id: string;
  sender_role: "coach" | "client";
  body: string | null;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
  optimistic?: boolean;
};

export function useCoachChat(coachId: string, clientId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load initial messages
  useEffect(() => {
    loadMessages();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [coachId, clientId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coach_messages")
        .select("*")
        .eq("coach_id", coachId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("[useCoachChat] Load error:", error);
        return;
      }

      setMessages(data || []);

      // Subscribe to realtime updates
      subscribeToMessages();

      // Mark unread messages as read
      markUnreadAsRead(data || []);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (channelRef.current) return;

    const channel = supabase
      .channel(`coach-chat:${coachId}:${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coach_messages",
          filter: `coach_id=eq.${coachId},client_id=eq.${clientId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          handleNewMessage(newMessage);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coach_messages",
          filter: `coach_id=eq.${coachId},client_id=eq.${clientId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          updateMessage(updatedMessage);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleNewMessage = (message: Message) => {
    setMessages((prev) => {
      // Check if this is our optimistic message being confirmed
      const optimisticIndex = prev.findIndex(
        (m) => m.optimistic && m.body === message.body
      );

      if (optimisticIndex !== -1) {
        // Replace optimistic with real
        const updated = [...prev];
        updated[optimisticIndex] = message;
        return updated;
      }

      // New message from coach - append
      const result = [...prev, message];

      // Auto-mark as read if from coach
      if (message.sender_role === "coach" && document.visibilityState === "visible") {
        markAsRead(message.id);
      }

      return result;
    });
  };

  const updateMessage = (message: Message) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? message : m))
    );
  };

  const send = useCallback(
    async (body?: string, imageUrl?: string) => {
      if ((!body && !imageUrl) || sending) return;

      const optimisticId = crypto.randomUUID();
      const optimisticMessage: Message = {
        id: optimisticId,
        coach_id: coachId,
        client_id: clientId,
        sender_role: "client",
        body: body || null,
        image_url: imageUrl || null,
        created_at: new Date().toISOString(),
        read_at: null,
        optimistic: true,
      };

      // Add optimistically
      setMessages((prev) => [...prev, optimisticMessage]);
      setSending(true);

      try {
        const { data, error } = await supabase
          .from("coach_messages")
          .insert({
            coach_id: coachId,
            client_id: clientId,
            sender_role: "client",
            body: body || null,
            image_url: imageUrl || null,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Real message will come via Realtime
      } catch (error) {
        console.error("[useCoachChat] Send error:", error);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        alert("שגיאה בשליחת ההודעה");
      } finally {
        setSending(false);
      }
    },
    [coachId, clientId, sending]
  );

  const markAsRead = async (messageId: string) => {
    try {
      await fetch("/api/coach/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_id: coachId,
          client_id: clientId,
          up_to_message_id: messageId,
        }),
      });
    } catch (error) {
      console.error("[useCoachChat] Mark read error:", error);
    }
  };

  const markUnreadAsRead = (msgs: Message[]) => {
    const unread = msgs.filter(
      (m) => m.sender_role === "coach" && !m.read_at
    );

    if (unread.length > 0 && document.visibilityState === "visible") {
      const lastUnread = unread[unread.length - 1];
      markAsRead(lastUnread.id);
    }
  };

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${clientId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("coach-chat-media")
          .upload(filename, file, {
            upsert: false,
          });

        if (uploadError) {
          console.error("[uploadImage] Error:", uploadError);
          return null;
        }

        const { data } = supabase.storage
          .from("coach-chat-media")
          .getPublicUrl(filename);

        return data.publicUrl;
      } catch (error) {
        console.error("[uploadImage] Error:", error);
        return null;
      }
    },
    [clientId]
  );

  return {
    messages,
    loading,
    sending,
    send,
    uploadImage,
  };
}
