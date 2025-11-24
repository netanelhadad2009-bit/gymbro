"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { subscribeMessagesForUser } from "@/lib/realtime";
import { useAuth } from "@/contexts/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import StickyHeader from "@/components/ui/StickyHeader";
import { UserProfile, profileToSummaryString, hasCompleteProfile } from "@/lib/profile/types";
import Link from "next/link";
import CoachEmptyState from "@/components/coach/CoachEmptyState";
import { useCoachHeaderOffset } from "@/hooks/useCoachHeaderOffset";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  profile_snapshot?: UserProfile | null;
};

export default function CoachPage() {
  const { user, session } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const lastInsertTsRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef<boolean>(false);
  const lastSendTimestampRef = useRef<number>(0);
  const lastSentMessageRef = useRef<string>("");

  // Lock header height to prevent layout shifts
  useCoachHeaderOffset();

  // Scroll to bottom only if user is already near bottom (prevents layout jumps)
  useEffect(() => {
    const el = document.getElementById('coach-messages');
    if (!el) return;

    // Check if user is near the bottom (within 24px)
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;

    if (nearBottom && messagesEndRef.current) {
      // Use 'instant' to avoid smooth animation causing reflows
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 44; // minimum height to match send button (44px)
      const lineHeight = 20; // reduced line height
      const maxHeight = lineHeight * 3 + 24; // 3 lines max + padding
      textareaRef.current.style.height = Math.max(minHeight, Math.min(scrollHeight, maxHeight)) + "px";
    }
  }, [input]);

  // Get user id once
  useEffect(() => {
    const s = supabase.auth.onAuthStateChange(async (_evt, session) => {
      setUserId(session?.user?.id ?? null);
    });
    // also try immediate
    supabase.auth.getSession().then(r => setUserId(r.data.session?.user?.id ?? null));
    return () => s.data.subscription.unsubscribe();
  }, []);

  // Helper: set + dedupe + sort
  const mergeInsert = (rows: Msg[] | Msg) => {
    console.log("[mergeInsert] called with:", Array.isArray(rows) ? rows.length : 1, "messages");
    setMessages(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      const add = Array.isArray(rows) ? rows : [rows];

      for (const r of add) {
        console.log("[mergeInsert] adding:", r.id, r.role, r.content?.substring(0, 30));

        // If this is a real message (not temp ID), check for optimistic duplicates
        if (!r.id.startsWith('temp-')) {
          // Remove any temp messages with the same content and role within 10 seconds
          const rTime = new Date(r.created_at).getTime();
          for (const [id, existing] of map.entries()) {
            if (
              id.startsWith('temp-') &&
              existing.role === r.role &&
              existing.content === r.content &&
              Math.abs(new Date(existing.created_at).getTime() - rTime) < 10000
            ) {
              console.log("[mergeInsert] removing optimistic duplicate:", id);
              map.delete(id);
            }
          }
        }

        map.set(r.id, r as Msg);
      }

      const arr = Array.from(map.values()).sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      console.log("[mergeInsert] final count:", arr.length);
      return arr;
    });
  };

  // Initial fetch when userId available
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setFetchError(null);
      setLoading(true);
      console.log("[Chat] initial fetch…");
      const res = await fetch("/api/coach/messages");
      const json = await res.json();
      if (!json.ok) {
        setFetchError(json.error || "Failed to load messages");
        console.error("[Chat] fetch error:", json);
        setLoading(false);
        return;
      }
      mergeInsert(json.messages as Msg[]);
      console.log("[Chat] fetched:", json.messages?.length ?? 0);
      setLoading(false);
    })();
  }, [userId]);

  // Realtime subscription after initial fetch
  useEffect(() => {
    if (!userId) return;
    console.log("[Chat] subscribing realtime for", userId);
    const off = subscribeMessagesForUser(userId, (row) => {
      console.log("[Chat] realtime callback received:", row.id, row.role);
      mergeInsert(row as Msg);
      lastInsertTsRef.current = Date.now();
    });

    // Fallback: if no realtime insert within 8s after a send, force one refresh
    const t = setInterval(async () => {
      const elapsed = Date.now() - lastInsertTsRef.current;
      if (elapsed > 8000) {
        console.log("[Chat] fallback refetch (no realtime for 8s)");
        // Opportunistic small refresh
        const res = await fetch("/api/coach/messages");
        const json = await res.json();
        if (json?.ok) {
          console.log("[Chat] fallback fetched:", json.messages?.length);
          mergeInsert(json.messages as Msg[]);
        }
      }
    }, 8000);

    return () => { off(); clearInterval(t); };
  }, [userId]);

  // Fetch profile (runs once after userId is set)
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("[AI Coach] Profile fetch error:", profileError);
        }

        // Get user metadata as fallback
        const { data: { user: authUser } } = await supabase.auth.getUser();

        // Merge profile data and metadata
        const merged = {
          ...authUser?.user_metadata,
          ...profileData,
        };

        // Set profile (simplified normalization)
        setProfile({
          age: merged.age || null,
          gender: merged.gender || null,
          height_cm: merged.height_cm || merged.height || null,
          weight_kg: merged.weight_kg || merged.weight || null,
          target_weight_kg: merged.target_weight_kg || merged.target_weight || null,
          bmi: merged.bmi || null,
          goal: merged.goal || null,
          diet: merged.diet_type || merged.diet || null,
          activityLevel: merged.activity_level || null,
          workout_days_per_week: merged.workout_days_per_week || merged.workout_days || null,
          frequency: merged.frequency || null,
          experience: merged.experience || null,
          injuries: merged.injuries || merged.limitations || null,
        });
      } catch (error) {
        console.error("[AI Coach] Profile fetch error:", error);
      }
    })();
  }, [userId]);

  // Warm the coach context cache (optional optimization)
  useEffect(() => {
    if (!userId) return;
    // Pre-fetch context to warm the server-side cache
    fetch("/api/coach/context").catch(() => {
      // Silently fail - this is just a cache warmer
    });
  }, [userId]);

  // Core send function - can be called with any text (internal function, callers manage ref)
  async function sendUserMessage(messageText: string) {
    if (!messageText.trim() || !session) {
      console.log("[sendUserMessage] blocked:", {
        isEmpty: !messageText.trim(),
        noSession: !session
      });
      return;
    }

    console.log("[sendUserMessage] starting send:", new Date().toISOString());

    const userMessage = messageText.trim();

    // Optimistic UI: add user message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Msg = {
      id: tempId,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };

    mergeInsert(optimisticMessage);
    lastInsertTsRef.current = Date.now();

    try {
      const response = await fetch("/api/coach/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const json = await response.json();

      // Check for API errors with detailed info
      if (!response.ok || !json.ok) {
        const errorMsg = json?.error ? json.error : "שגיאה לא ידועה";
        const errorCode = json?.code ? ` (${json.code})` : "";
        const errorStage = json?.stage ? `\nשלב: ${json.stage}` : "";

        console.error("[AI Coach] API error:", {
          stage: json?.stage,
          code: json?.code,
          error: json?.error,
          details: json?.details,
        });

        throw new Error(`${errorMsg}${errorCode}${errorStage}`);
      }

      // Optimistically insert assistant's message immediately (don't wait for Realtime)
      // The API returns the full message object - use it for instant rendering
      if (json.assistantMessage) {
        console.log("[AI Coach] Optimistically rendering assistant message");
        mergeInsert(json.assistantMessage as Msg);
        lastInsertTsRef.current = Date.now();
      }

      // Note: Realtime will eventually deliver the same message, but mergeInsert
      // will deduplicate it automatically (see lines 88-102)
    } catch (error: any) {
      console.error("[AI Coach] Send error:", error);
      alert("שגיאה בשליחת ההודעה:\n" + error.message);

      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }

    console.log("[sendUserMessage] completed");
  }

  async function sendMessage(source: string = "unknown") {
    const messageText = input.trim();
    const now = Date.now();

    // Guard #1: Empty input check
    if (!messageText) {
      console.log("[sendMessage] blocked: empty input");
      return;
    }

    // Guard #2: Deduplication - same message within 500ms window
    if (
      messageText === lastSentMessageRef.current &&
      now - lastSendTimestampRef.current < 500
    ) {
      console.log("[sendMessage] blocked: duplicate within 500ms (from", source + ")");
      return;
    }

    // Guard #3: Already sending check
    if (isSendingRef.current) {
      console.log("[sendMessage] blocked: already sending (from", source + ")");
      return;
    }

    console.log("[sendMessage] triggered from:", source);

    // Update deduplication tracking
    lastSendTimestampRef.current = now;
    lastSentMessageRef.current = messageText;

    // Set ref immediately to block any subsequent calls
    isSendingRef.current = true;
    setSending(true);

    // Clear input immediately
    setInput("");

    try {
      await sendUserMessage(messageText);
    } finally {
      // Reset in finally block to ensure it's always cleared
      isSendingRef.current = false;
      setSending(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      console.log("[handleKeyDown] Enter pressed");
      sendMessage("Enter key");
    }
  };

  const handleSuggestion = async (text: string) => {
    // Quick reply: immediately send without filling input
    if (isSendingRef.current) {
      console.log("[handleSuggestion] blocked: already sending");
      return;
    }

    console.log("[handleSuggestion] sending quick reply:", text.substring(0, 30));

    isSendingRef.current = true;
    setSending(true);

    try {
      await sendUserMessage(text);
    } finally {
      isSendingRef.current = false;
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#0D0E0F]">
        <p className="text-white">טוען...</p>
      </div>
    );
  }

  const isProfileComplete = profile ? hasCompleteProfile(profile) : false;
  const profileSummary = profile ? profileToSummaryString(profile) : "";

  return (
    <div id="coach-root" data-coach-screen className="min-h-svh flex flex-col bg-[#0D0E0F]" dir="rtl">
      {/* Header */}
      <StickyHeader title="המאמן האישי שלי" />

      {/* Profile Pill - Hidden for clean chat view */}
      {false && profile && (
        <div className="px-4 pt-2 pb-3 border-b border-neutral-800">
          <Link
            href="/profile"
            className="flex items-center justify-between bg-[#1A1B1C] border border-neutral-800 rounded-xl px-4 py-3 active:translate-y-1 active:brightness-90 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {profile?.gender === "male" ? "♂" : profile?.gender === "female" ? "♀" : "👤"}
              </div>
              <div>
                {profileSummary ? (
                  <p className="text-sm text-white font-medium">{profileSummary}</p>
                ) : (
                  <p className="text-sm text-neutral-400">אין נתונים בפרופיל</p>
                )}
                {!isProfileComplete && (
                  <p className="text-xs text-yellow-400 mt-0.5">⚠️ פרופיל לא שלם - לחץ להשלמה</p>
                )}
              </div>
            </div>
            <svg
              className="w-5 h-5 text-neutral-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {fetchError && (
        <div className="mx-4 mt-3 mb-2 p-3 bg-red-500/10 border border-red-500/50 rounded-xl">
          <div className="flex items-start gap-2">
            <div className="text-red-500 text-lg">⚠️</div>
            <div className="flex-1">
              <p className="text-sm text-red-400 font-medium mb-1">שגיאה בטעינת הצ'אט</p>
              <p className="text-xs text-red-300/80">{fetchError}</p>
            </div>
            <button
              onClick={async () => {
                setFetchError(null);
                setLoading(true);
                const res = await fetch("/api/coach/messages");
                const json = await res.json();
                if (!json.ok) {
                  setFetchError(json.error || "Failed to load messages");
                } else {
                  mergeInsert(json.messages as Msg[]);
                }
                setLoading(false);
              }}
              className="text-xs text-red-300 underline"
            >
              נסה שוב
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        id="coach-messages"
        className="flex-1 overflow-y-auto px-4 space-y-3 bg-[#0D0E0F]"
        style={{
          paddingTop: 'calc(var(--coach-top-offset, 110px) + 12px)',
          paddingBottom: '176px'
        }}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2F163]" />
          </div>
        ) : messages.length === 0 ? (
          <CoachEmptyState onSuggestion={handleSuggestion} />
        ) : (
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] min-w-0 px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-[#E2F163] text-black"
                      : "bg-[#1A1B1C] text-white border border-neutral-800"
                  }`}
                >
                  <p className="text-sm leading-[1.6] whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </motion.div>
            ))}
            {/* Typing indicator */}
            {sending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-[#1A1B1C] border border-neutral-800 px-4 py-3 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer with integrated spacer - Fixed above bottom nav */}
      <div
        className="fixed left-0 right-0 pt-2 px-4 pb-4 mb-0"
        style={{
          bottom: '80px',
          background: '#0D0E0F',
        }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-neutral-900 rounded-xl px-5 py-0 text-white placeholder:text-neutral-500 outline-none resize-none"
            placeholder="כתוב הודעה למאמן..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={sending}
            style={{
              height: '44px',
              maxHeight: '84px',
              lineHeight: '20px',
              paddingTop: '12px',
              paddingBottom: '12px',
            }}
          />
          <button
            type="button"
            onClick={() => sendMessage("Send button")}
            disabled={!input.trim() || sending}
            className="bg-[#E2F163] text-black px-6 h-[44px] rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform flex-shrink-0"
          >
            {sending ? "..." : "שלח"}
          </button>
        </div>

        {/* Spacer integrated into composer */}
        <div
          className="w-full h-4"
          style={{
            background: '#0D0E0F',
            opacity: 1,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        />
      </div>
    </div>
  );
}
