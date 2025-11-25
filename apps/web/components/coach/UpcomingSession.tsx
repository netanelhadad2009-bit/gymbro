"use client";

import { useRouter } from "next/navigation";
import type { CoachSession } from "@/lib/schemas/coach";

type Props = {
  session: CoachSession | null;
  onBookSession: () => void;
};

export function UpcomingSession({ session, onBookSession }: Props) {
  const router = useRouter();

  // Empty state - no upcoming session
  if (!session) {
    return (
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 text-center" dir="rtl">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white mb-1">אין אימונים מתוכננים</h3>
        <p className="text-sm text-neutral-400 mb-4">קבע אימון עם המאמן שלך</p>
        <button
          onClick={onBookSession}
          className="px-6 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 active:translate-y-1 active:brightness-90 transition-all"
        >
          קבע אימון
        </button>
      </div>
    );
  }

  // Parse session times
  const startDate = new Date(session.start_t);
  const endDate = new Date(session.end_t);
  const now = new Date();
  const isToday = startDate.toDateString() === now.toDateString();
  const isSoon = startDate.getTime() - now.getTime() < 60 * 60 * 1000; // Within 1 hour

  // Format date and time
  const dateStr = isToday ? "היום" : startDate.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const timeStr = `${startDate.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endDate.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  // Session type icon and label
  const sessionTypes = {
    video: { icon: "📹", label: "וידאו", color: "text-blue-400", bgColor: "bg-blue-500/10" },
    in_person: { icon: "🏃", label: "פנים אל פנים", color: "text-green-400", bgColor: "bg-green-500/10" },
    gym: { icon: "💪", label: "חדר כושר", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  };

  const sessionType = sessionTypes[session.kind];

  // Handle action button click
  const handleAction = () => {
    if (session.kind === "video" && session.meet_url) {
      window.open(session.meet_url, "_blank");
    } else if (session.kind === "in_person" && session.location) {
      // Open in maps
      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(session.location)}`;
      window.open(mapsUrl, "_blank");
    } else if (session.kind === "gym" && session.location) {
      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(session.location)}`;
      window.open(mapsUrl, "_blank");
    }
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-white">אימון קרוב</h3>
          {isSoon && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              מתחיל בקרוב
            </span>
          )}
        </div>

        <div className={`px-2.5 py-1 rounded-full ${sessionType.bgColor} flex items-center gap-1.5`}>
          <span className="text-base">{sessionType.icon}</span>
          <span className={`text-xs font-medium ${sessionType.color}`}>{sessionType.label}</span>
        </div>
      </div>

      {/* Date and time */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-neutral-300">
          <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">{dateStr}</span>
        </div>

        <div className="flex items-center gap-2 text-neutral-300">
          <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{timeStr}</span>
        </div>

        {/* Location or meet URL */}
        {session.location && (
          <div className="flex items-center gap-2 text-neutral-300">
            <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm line-clamp-1">{session.location}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {session.kind === "video" && session.meet_url && (
          <button
            onClick={handleAction}
            className="flex-1 px-4 py-2.5 bg-[#E2F163] text-black text-sm font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all"
          >
            הצטרף לשיחה
          </button>
        )}

        {(session.kind === "in_person" || session.kind === "gym") && session.location && (
          <button
            onClick={handleAction}
            className="flex-1 px-4 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 active:translate-y-1 active:brightness-90 transition-all"
          >
            נווט למיקום
          </button>
        )}
      </div>
    </div>
  );
}
