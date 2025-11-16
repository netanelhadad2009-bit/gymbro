"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoachChat } from "@/hooks/useCoachChat";
import type { AssignedCoach } from "@/lib/coach/getCoachForUser";

type Props = {
  coach: AssignedCoach;
  clientId: string;
};

export function ChatView({ coach, clientId }: Props) {
  const chat = useCoachChat(coach.id, clientId);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure messages is always an array
  const safeMessages = Array.isArray(chat.messages) ? chat.messages : [];

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [safeMessages.length]);

  const handleSend = () => {
    if (!text.trim() || chat.sending) return;
    chat.send(text.trim());
    setText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await chat.uploadImage(file);
      if (url) {
        chat.send(undefined, url);
      } else {
        alert("שגיאה בהעלאת התמונה");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const getFormattedTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;

    const currentDate = new Date(safeMessages[index].created_at).toDateString();
    const prevDate = new Date(safeMessages[index - 1].created_at).toDateString();

    return currentDate !== prevDate;
  };

  const getDateSeparator = (date: string) => {
    const msgDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const msgDateNorm = new Date(msgDate);
    msgDateNorm.setHours(0, 0, 0, 0);

    if (msgDateNorm.getTime() === today.getTime()) {
      return "היום";
    } else if (msgDateNorm.getTime() === yesterday.getTime()) {
      return "אתמול";
    } else {
      return msgDate.toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  };

  return (
    <>
      <div className="h-[100dvh] grid grid-rows-[auto_1fr_auto] bg-[#0A0A0A]" dir="rtl">
        {/* Header */}
        <div className="bg-neutral-900 border-b border-neutral-800 pt-[env(safe-area-inset-top)] sticky top-0 z-10">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => window.history.back()}
              className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 flex-shrink-0"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              {coach.avatar_url ? (
                <img
                  src={coach.avatar_url}
                  alt={coach.display_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-neutral-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {coach.display_name.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold truncate">{coach.display_name}</div>
                <div className="text-xs text-green-400">מקוון עכשיו</div>
              </div>
            </div>

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

        {/* Messages */}
        <div ref={scrollRef} className="overflow-y-auto overscroll-contain px-4 py-2">
          {chat.loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2F163]" />
            </div>
          )}

          {!chat.loading && safeMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-neutral-400 text-sm">התחל/י שיחה עם המאמן</p>
            </div>
          )}

          <div className="space-y-2">
            {safeMessages.map((msg, index) => {
              const isMe = msg.sender_role === "client";
              const showDate = shouldShowDateSeparator(index);

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="bg-neutral-800 px-3 py-1 rounded-full text-xs text-neutral-400">
                        {getDateSeparator(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isMe
                          ? "bg-gradient-to-r from-[#E2F163] to-[#d4e350] text-black rounded-br-sm"
                          : "bg-neutral-800 text-white rounded-bl-sm"
                      }`}
                    >
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="attachment"
                          onClick={() => setFullScreenImage(msg.image_url)}
                          className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      )}

                      {msg.body && (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      )}

                      <div
                        className={`flex items-center gap-1 mt-1 justify-end text-xs ${
                          isMe ? "text-black/60" : "text-neutral-400"
                        }`}
                      >
                        <span>{getFormattedTime(msg.created_at)}</span>
                        {isMe && !msg.optimistic && (
                          <span className={msg.read_at ? "text-blue-400" : "text-black/60"}>
                            ✓✓
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="bg-neutral-900 border-t border-neutral-800 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sticky bottom-0">
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || chat.sending}
              className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-4 h-4 rounded-full border-2 border-neutral-600 border-t-transparent animate-spin" />
              ) : (
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <div className="flex-1 bg-neutral-800 rounded-2xl px-4 py-2 flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="כתוב/י הודעה…"
                disabled={chat.sending}
                className="flex-1 bg-transparent text-white placeholder:text-neutral-500 resize-none outline-none max-h-24 disabled:opacity-50"
                rows={1}
                style={{
                  height: "auto",
                  minHeight: "24px",
                  maxHeight: "96px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 96) + "px";
                }}
              />

              {text.trim() && (
                <button
                  onClick={handleSend}
                  disabled={chat.sending}
                  className="w-8 h-8 rounded-full bg-[#E2F163] flex items-center justify-center hover:bg-[#d4e350] transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 text-black rotate-180" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen image viewer */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullScreenImage(null)}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4"
          >
            <img
              src={fullScreenImage}
              alt="Full screen"
              className="max-w-full max-h-full object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
