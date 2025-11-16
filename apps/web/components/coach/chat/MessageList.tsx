"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { ClientMessage } from "@/lib/schemas/chat";

type Props = {
  messages: ClientMessage[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: (id: string) => void;
};

export function MessageList({ messages, loading, hasMore, onLoadMore, onRetry }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;

    const currentDate = new Date(messages[index].created_at).toDateString();
    const prevDate = new Date(messages[index - 1].created_at).toDateString();

    return currentDate !== prevDate;
  };

  const getStatusIcon = (msg: ClientMessage) => {
    if (msg.status === "error") {
      return (
        <button onClick={() => onRetry(msg.id)} className="text-red-400 hover:text-red-300">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </button>
      );
    }

    if (msg.status === "sending") {
      return <div className="w-3 h-3 rounded-full border-2 border-neutral-600 border-t-transparent animate-spin" />;
    }

    if (msg.status === "read") {
      return <span className="text-blue-400 text-xs">✓✓</span>;
    }

    if (msg.status === "delivered") {
      return <span className="text-neutral-500 text-xs">✓✓</span>;
    }

    return <span className="text-neutral-600 text-xs">✓</span>;
  };

  return (
    <div
      ref={scrollRef}
      className="px-4 py-2 bg-black">
      {/* Load more trigger */}
      {hasMore && !loading && (
        <button
          onClick={onLoadMore}
          className="w-full py-2 text-sm text-neutral-400 hover:text-white"
        >
          טען הודעות נוספות
        </button>
      )}

      {loading && messages.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E2F163]" />
        </div>
      )}

      {/* Messages */}
      <div className="space-y-2">
        {messages.map((msg, index) => {
          const isMe = msg.sender_role === "user";
          const showDate = shouldShowDateSeparator(index);

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDate && (
                <div className="flex justify-center my-4">
                  <span className="bg-neutral-800 px-3 py-1 rounded-full text-xs text-neutral-400">
                    {getDateSeparator(msg.created_at)}
                  </span>
                </div>
              )}

              {/* Message bubble */}
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
                  {/* Attachment */}
                  {msg.attachment_url && msg.attachment_type === "image" && (
                    <img
                      src={msg.attachment_url}
                      alt="attachment"
                      className="rounded-lg mb-2 max-w-full"
                    />
                  )}

                  {/* Body */}
                  {msg.body && (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  )}

                  {/* Time + Status */}
                  <div className={`flex items-center gap-1 mt-1 justify-end text-xs ${isMe ? "text-black/60" : "text-neutral-400"}`}>
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && getStatusIcon(msg)}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {messages.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="w-16 h-16 mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-neutral-400 text-sm">התחל/י שיחה עם המאמן</p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
