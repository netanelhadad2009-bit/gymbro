"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { getRecentWeighIns, deleteWeighIn, subscribeWeighIns, type WeighIn } from "@/lib/weighins/queries";
import { AddWeighInModal } from "@/components/weighins/AddWeighInModal";
import StickyHeader from "@/components/ui/StickyHeader";
import { formatKg, formatDelta } from "@/lib/progress/format";

export default function WeighInsPage() {
  const { user } = useAuth();
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Fetch all weigh-ins (up to 100)
  const fetchWeighIns = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getRecentWeighIns(supabase, user.id, 100);
      setWeighIns(data);
    } catch (error) {
      console.error("[WeighIns] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user?.id) {
      fetchWeighIns();
    }
  }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeWeighIns(supabase, user.id, {
      onInsert: () => fetchWeighIns(),
      onUpdate: () => fetchWeighIns(),
      onDelete: () => fetchWeighIns(),
    });

    return unsubscribe;
  }, [user?.id]);

  // Calculate KPIs
  const latestWeight = weighIns.length > 0 ? weighIns[0].weight_kg : null;

  const weights7d = weighIns.slice(0, 7).map((w) => w.weight_kg);
  const avg7d = weights7d.length > 0 ? weights7d.reduce((a, b) => a + b, 0) / weights7d.length : null;

  const weights30d = weighIns.slice(0, 30).map((w) => w.weight_kg);
  const delta30d =
    weights30d.length >= 2
      ? weights30d[0] - weights30d[weights30d.length - 1]
      : null;

  const trend = delta30d !== null ? (delta30d > 0.2 ? "↑" : delta30d < -0.2 ? "↓" : "→") : null;

  // Delete handler
  const handleDelete = async (id: string, weight: number) => {
    if (!confirm(`האם למחוק שקילה של ${weight.toFixed(1)} ק"ג?`)) return;

    try {
      const result = await deleteWeighIn(supabase, id);
      if (!result.ok) {
        alert(result.error || "שגיאה במחיקה");
      }
    } catch (error: any) {
      console.error("[WeighIns] Delete error:", error);
      alert(error.message || "שגיאה במחיקה");
    }
  };

  const hasData = weighIns.length > 0;

  return (
    <>
      <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-[#0D0E0F]" dir="rtl">
        <StickyHeader
          title="שקילות"
          rightSlot={
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-[#E2F163] text-black rounded-lg font-medium text-sm active:opacity-90"
              aria-label="הוסף שקילה"
            >
              הוסף שקילה
            </button>
          }
        />

        <main className="main-offset text-white pb-24 px-4">
          {/* Loading */}
          {loading && (
            <div className="space-y-4 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-neutral-900/80 border border-neutral-800 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasData && (
            <div className="flex flex-col items-center justify-center py-16 text-center mt-6">
              <div className="w-20 h-20 mb-6 flex items-center justify-center bg-neutral-900/80 border border-neutral-800 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-10 h-10 text-neutral-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">אין שקילות</h2>
              <p className="text-neutral-400 mb-6 max-w-xs">
                התחל לעקוב אחר המשקל שלך כדי לראות את ההתקדמות
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-[#E2F163] text-black rounded-xl font-semibold active:opacity-90"
              >
                הוסף שקילה
              </button>
            </div>
          )}

          {/* Data view */}
          {!loading && hasData && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-3 mb-6 mt-6">
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
                  <div className="text-xs text-neutral-400 mb-1">משקל אחרון</div>
                  <div className="text-lg font-bold text-white">{formatKg(latestWeight)}</div>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
                  <div className="text-xs text-neutral-400 mb-1">ממוצע 7 ימים</div>
                  <div className="text-lg font-bold text-white">{formatKg(avg7d)}</div>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
                  <div className="text-xs text-neutral-400 mb-1">מגמה 30 ימים</div>
                  <div className="text-lg font-bold text-white">
                    {trend} {delta30d !== null ? formatDelta(delta30d) : "-"}
                  </div>
                </div>
              </div>

              {/* List */}
              <div className="space-y-3">
                {weighIns.map((w) => {
                  const date = new Date(w.date);
                  const dateStr = date.toLocaleDateString("he-IL", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });
                  const timeStr = date.toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={w.id}
                      className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="text-sm text-neutral-400">{dateStr}</div>
                        <div className="text-xs text-neutral-500">{timeStr}</div>
                        {w.notes && (
                          <div className="text-xs text-neutral-400 mt-1 italic">{w.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-white">{w.weight_kg.toFixed(1)} ק״ג</span>
                        <button
                          onClick={() => handleDelete(w.id, w.weight_kg)}
                          className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg active:opacity-90"
                          aria-label="מחק"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Add Modal */}
      {user?.id && (
        <AddWeighInModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          userId={user.id}
        />
      )}
    </>
  );
}
