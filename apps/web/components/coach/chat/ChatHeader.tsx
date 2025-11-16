"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { ChatPresence } from "@/lib/schemas/chat";

type Props = {
  coachName: string;
  coachAvatar: string | null;
  threadId: string;
  onBack: () => void;
};

export function ChatHeader({ coachName, coachAvatar, threadId, onBack }: Props) {
  const [presence, setPresence] = useState<ChatPresence | null>(null);

  useEffect(() => {
    // Subscribe to coach presence
    const channel = supabase
      .channel(`presence:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "coach_presence",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const pres = payload.new as ChatPresence;
          if (pres.role === "coach") {
            setPresence(pres);
          }
        }
      )
      .subscribe();

    // Fetch initial presence
    supabase
      .from("coach_presence")
      .select("*")
      .eq("thread_id", threadId)
      .eq("role", "coach")
      .single()
      .then(({ data }) => {
        if (data) setPresence(data as ChatPresence);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const getPresenceText = () => {
    if (!presence) return "";

    const lastSeen = new Date(presence.last_seen);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastSeen.getTime()) / 1000;

    if (presence.typing && diffSeconds < 3) {
      return "…מקליד/ה";
    }

    if (diffSeconds < 60) {
      return "מקוון עכשיו";
    }

    return "";
  };

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 pt-[env(safe-area-inset-top)] sticky top-0 z-10">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Back button */}
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 flex-shrink-0"
          aria-label="חזור"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Coach info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {coachAvatar ? (
            <img
              src={coachAvatar}
              alt={coachName}
              className="w-10 h-10 rounded-full object-cover border-2 border-neutral-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
              {coachName.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold truncate">{coachName}</div>
            {getPresenceText() && (
              <div className="text-xs text-green-400">{getPresenceText()}</div>
            )}
          </div>
        </div>

        {/* Menu */}
        <button
          onClick={() => alert("תפריט יהיה זמין בקרוב")}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-800"
        >
          <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
