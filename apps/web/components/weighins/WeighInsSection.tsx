"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { getRecentWeighIns, subscribeWeighIns, type WeighIn } from "@/lib/weighins/queries";
import { AddWeighInModal } from "./AddWeighInModal";
import { formatDate } from "@/lib/progress/format";

export function WeighInsSection() {
  const { user } = useAuth();
  const router = useRouter();
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Fetch weigh-ins
  const fetchWeighIns = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getRecentWeighIns(supabase, user.id, 7);
      setWeighIns(data);
    } catch (error) {
      console.error("[WeighInsSection] Fetch error:", error);
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

  if (loading) {
    return (
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 animate-pulse">
        <div className="h-6 w-32 bg-neutral-800 rounded mb-4" />
        <div className="h-20 bg-neutral-800 rounded" />
      </div>
    );
  }

  const hasData = weighIns.length > 0;
  const previewData = weighIns.slice(0, 3);

  return (
    <>
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
        {/* Header */}
        <h3 className="text-lg font-bold text-white mb-4">שקילות</h3>

        {hasData ? (
          <>
            {/* Mini sparkline (simplified) */}
            <div className="mb-4 h-16 flex items-end gap-1">
              {weighIns.slice(0, 7).reverse().map((w, idx) => {
                const weights = weighIns.slice(0, 7).map((x) => x.weight_kg);
                const min = Math.min(...weights);
                const max = Math.max(...weights);
                const range = max - min || 1;
                const height = ((w.weight_kg - min) / range) * 100;

                return (
                  <div
                    key={idx}
                    className="flex-1 bg-[#E2F163] rounded-t"
                    style={{ height: `${Math.max(height, 10)}%` }}
                  />
                );
              })}
            </div>

            {/* Preview list */}
            <div className="space-y-2 mb-4">
              {previewData.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
                >
                  <span className="text-sm text-neutral-400">
                    {formatDate(w.date)}
                  </span>
                  <span className="text-base font-semibold text-white">
                    {w.weight_kg.toFixed(1)} ק״ג
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="flex-1 py-2.5 px-4 bg-[#E2F163] text-black rounded-xl font-medium text-sm active:opacity-90"
              >
                הוסף שקילה
              </button>
              <button
                onClick={() => router.push("/weigh-ins")}
                className="flex-1 py-2.5 px-4 bg-neutral-800 text-white rounded-xl font-medium text-sm active:opacity-90"
              >
                לכל השקילות
              </button>
            </div>
          </>
        ) : (
          // Empty state
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-neutral-800 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8 text-neutral-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
                />
              </svg>
            </div>
            <p className="text-neutral-400 mb-4 text-sm">אין נתוני שקילה</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-block py-2.5 px-6 bg-[#E2F163] text-black rounded-xl font-medium text-sm active:opacity-90"
            >
              הוסף שקילה
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {user?.id && (
        <AddWeighInModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          userId={user.id}
          onSuccess={() => {
            console.log("[WeighInsSection] Weigh-in added successfully");
          }}
        />
      )}
    </>
  );
}
