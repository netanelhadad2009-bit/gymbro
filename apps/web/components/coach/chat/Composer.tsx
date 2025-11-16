"use client";

import { useState, useRef, useEffect } from "react";
import { isCoachComposerEnabled } from "@/lib/flags/coach";

type Props = {
  onSend: (text?: string, attachment?: { name: string; type: "image" | "audio" | "file"; bytes: string }) => void;
  onTyping: (typing: boolean) => void;
  disabled: boolean;
};

export function Composer({ onSend, onTyping, disabled }: Props) {
  // Feature flag guard: return null if composer is disabled
  if (!isCoachComposerEnabled()) return null;
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 96) + "px";
    }
  }, [text]);

  // Handle typing indicator
  useEffect(() => {
    if (text.length > 0) {
      onTyping(true);
    } else {
      onTyping(false);
    }
  }, [text, onTyping]);

  const handleSend = () => {
    if (!text.trim() || disabled) return;

    onSend(text.trim());
    setText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = reader.result as string;
        const base64 = bytes.split(",")[1];

        const type = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("audio/")
          ? "audio"
          : "file";

        onSend(undefined, {
          name: file.name,
          type,
          bytes: base64,
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File upload error:", error);
      alert("שגיאה בהעלאת הקובץ");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div
      className="fixed inset-x-0 z-40 w-full bg-black composer"
      data-role="composer"
      style={{
        bottom: 0,
        paddingBottom: '80px',
        backgroundColor: '#000',
        margin: 0,
        border: 0,
        boxShadow: 'none',
      }}
    >
      <div className="px-4 py-3" style={{ margin: 0 }}>
        <div className="flex items-end gap-2" style={{ margin: 0 }}>
        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors flex-shrink-0 disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-4 h-4 rounded-full border-2 border-neutral-600 border-t-transparent animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text input */}
        <div className="flex-1 bg-neutral-800 rounded-2xl px-4 py-2 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="כתוב/י הודעה…"
            disabled={disabled}
            className="flex-1 bg-transparent text-white placeholder:text-neutral-500 resize-none outline-none max-h-24 disabled:opacity-50"
            rows={1}
          />

          {/* Send button */}
          {text.trim() && (
            <button
              onClick={handleSend}
              disabled={disabled}
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
  );
}
