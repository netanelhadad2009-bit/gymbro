"use client";

import type { Checkin } from "@/lib/schemas/coach";

type Props = {
  checkins: Checkin[];
  onAddCheckin: () => void;
};

export function Checkins({ checkins, onAddCheckin }: Props) {
  // Ensure checkins is always an array
  const safeCheckins = Array.isArray(checkins) ? checkins : [];
  const latestCheckin = safeCheckins[0];

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">צ'ק-אין אחרון</h3>
        <button
          onClick={onAddCheckin}
          className="px-3 py-1.5 bg-[#E2F163] text-black text-xs font-semibold rounded-lg hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all"
        >
          + צ'ק-אין חדש
        </button>
      </div>

      {/* Content */}
      {!latestCheckin ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-neutral-400">עדיין לא ביצעת צ'ק-אין</p>
          <p className="text-xs text-neutral-500 mt-1">שתף את ההתקדמות שלך עם המאמן</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Weight */}
            {latestCheckin.weight_kg && (
              <div className="bg-neutral-800 rounded-xl p-3">
                <div className="text-xs text-neutral-400 mb-1">משקל</div>
                <div className="text-lg font-semibold text-white">{latestCheckin.weight_kg} ק"ג</div>
              </div>
            )}

            {/* Mood */}
            {latestCheckin.mood !== null && (
              <div className="bg-neutral-800 rounded-xl p-3">
                <div className="text-xs text-neutral-400 mb-1">מצב רוח</div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full ${
                        i <= (latestCheckin.mood || 0) ? "bg-yellow-400" : "bg-neutral-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Energy */}
            {latestCheckin.energy !== null && (
              <div className="bg-neutral-800 rounded-xl p-3">
                <div className="text-xs text-neutral-400 mb-1">אנרגיה</div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full ${
                        i <= (latestCheckin.energy || 0) ? "bg-green-400" : "bg-neutral-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Date */}
            <div className="bg-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-400 mb-1">תאריך</div>
              <div className="text-sm font-medium text-white">
                {new Date(latestCheckin.date).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "short",
                })}
              </div>
            </div>
          </div>

          {/* Note */}
          {latestCheckin.note && (
            <div className="bg-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-400 mb-1">הערה</div>
              <p className="text-sm text-neutral-200 line-clamp-3">{latestCheckin.note}</p>
            </div>
          )}

          {/* Photos */}
          {latestCheckin.photos && Array.isArray(latestCheckin.photos) && latestCheckin.photos.length > 0 && (
            <div>
              <div className="text-xs text-neutral-400 mb-2">תמונות</div>
              <div className="grid grid-cols-3 gap-2">
                {latestCheckin.photos.slice(0, 3).map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo}
                    alt={`Check-in photo ${idx + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-neutral-700"
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
