"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CoachMessage } from "@/lib/schemas/coach";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Props = {
  assignmentId: string;
  initialMessages: CoachMessage[];
};

export function MessagePreview({ assignmentId, initialMessages }: Props) {
  const router = useRouter();
  // Ensure initialMessages is always an array
  const safeInitialMessages = Array.isArray(initialMessages) ? initialMessages : [];
  const [messages, setMessages] = useState<CoachMessage[]>(safeInitialMessages);

  // Subscribe to realtime updates
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      channel = supabase
        .channel(`coach_messages:${assignmentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "coach_messages",
            filter: `assignment_id=eq.${assignmentId}`,
          },
          (payload) => {
            const newMessage = payload.new as CoachMessage;
            setMessages((prev) => [newMessage, ...prev].slice(0, 3));
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [assignmentId]);

  if (messages.length === 0) {
    return (
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 text-center" dir="rtl">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white mb-1">אין הודעות</h3>
        <p className="text-sm text-neutral-400">התחל שיחה עם המאמן שלך</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">הודעות אחרונות</h3>
        <button
          onClick={() => router.push("/coach/chat")}
          className="text-xs text-[#E2F163] hover:text-[#d4e350] font-medium transition-colors"
        >
          צפה בכל ההודעות
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.map((message) => {
          const isFromCoach = message.sender === "coach";
          const time = new Date(message.created_at).toLocaleTimeString("he-IL", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={message.id}
              className={`flex gap-2 ${isFromCoach ? "justify-start" : "justify-end"}`}
            >
              {isFromCoach && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  M
                </div>
              )}

              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isFromCoach
                    ? "bg-neutral-800 border border-neutral-700"
                    : "bg-[#E2F163] text-black"
                }`}
              >
                <p className={`text-sm ${isFromCoach ? "text-white" : "text-black"}`}>
                  {message.content}
                </p>
                <div
                  className={`text-xs mt-1 ${
                    isFromCoach ? "text-neutral-500" : "text-black/60"
                  }`}
                >
                  {time}
                </div>
              </div>

              {!isFromCoach && (
                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  A
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Open full chat button */}
      <button
        onClick={() => router.push("/coach/chat")}
        className="w-full mt-4 py-2.5 bg-neutral-800 border border-neutral-700 text-white text-sm font-medium rounded-xl hover:bg-neutral-750 active:translate-y-1 active:brightness-90 transition-all"
      >
        פתח צ'אט מלא
      </button>
    </div>
  );
}
