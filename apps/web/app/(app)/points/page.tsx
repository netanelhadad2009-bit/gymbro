/**
 * Points Page - Comprehensive points breakdown and timeline
 *
 * Shows total points, per-stage breakdown, and event feed
 * Supports filtering by stage and infinite scroll
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Trophy, Info, Check, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StagePointsRow } from '@/components/points/StagePointsRow';
import { PointsFeedItem } from '@/components/points/PointsFeedItem';
import { usePointsSummary, usePointsFeed } from '@/lib/points/usePoints';
import { StageFilterSheet } from '@/components/points/StageFilterSheet';

export default function PointsPage() {
  const router = useRouter();
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showStageFilter, setShowStageFilter] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    summary,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = usePointsSummary();

  const {
    feed,
    isLoading: isFeedLoading,
    isLoadingMore,
    error: feedError,
    loadMore,
    hasMore,
  } = usePointsFeed({
    stageId: selectedStageId || undefined,
    limit: 20,
  });

  // Infinite scroll observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const handleStageFilter = (stageId: string | null) => {
    setSelectedStageId(stageId);
  };

  const handleOpenStageFilter = () => {
    setShowStageFilter(true);
  };

  const accentColor = '#E2F163';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0e0f12] to-[#1a1b20]" dir="rtl">
      {/* Header */}
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/journey')}
          className="w-10 h-10 rounded-full bg-white/5 backdrop-blur flex items-center justify-center hover:bg-white/10 transition"
          aria-label="חזור"
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </button>

        <h1 className="text-2xl font-extrabold text-white">הנקודות שלי</h1>

        <button
          onClick={() => setShowInfo(true)}
          className="w-10 h-10 rounded-full bg-white/5 backdrop-blur flex items-center justify-center hover:bg-white/10 transition"
          aria-label="מידע"
        >
          <Info className="w-5 h-5 text-white" />
        </button>
      </header>

      <main className="px-4 pb-32">
        <div className="max-w-md mx-auto space-y-8">
        {/* Total Points Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          {isSummaryLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-zinc-800 animate-pulse" />
              <div className="w-32 h-8 rounded bg-zinc-800 animate-pulse" />
            </div>
          ) : summaryError ? (
            <div className="text-zinc-400">
              <p>שגיאה בטעינת הנקודות</p>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-4"
                style={{
                  backgroundColor: `${accentColor}10`,
                  border: `3px solid ${accentColor}30`,
                  boxShadow: `0 0 40px ${accentColor}20`,
                }}
              >
                <Trophy className="w-16 h-16" style={{ opacity: 0.8 }} />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-5xl font-bold mb-2"
                style={{ color: accentColor }}
              >
                {summary?.total || 0}
              </motion.h2>
              <p className="text-zinc-400 text-lg">נקודות סך הכל</p>
            </>
          )}
        </motion.div>

        {/* By Stage Section */}
        {summary && summary.byStage && summary.byStage.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-xl font-bold text-right">
                לפי שלבים
              </h3>
              <button
                onClick={handleOpenStageFilter}
                className="px-4 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/80 transition-colors flex items-center gap-2"
              >
                <span className="text-sm font-semibold text-white">סנן</span>
                <Filter className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="space-y-3">
              {summary.byStage.map((stage, index) => (
                <StagePointsRow
                  key={stage.stageId}
                  stageTitle={stage.stageTitle}
                  points={stage.points}
                  completedTasks={stage.completedTasks}
                  onPress={() => handleStageFilter(stage.stageId)}
                  index={index}
                  accentColor={
                    selectedStageId === stage.stageId
                      ? accentColor
                      : '#71717a'
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Filter Indicator */}
        {selectedStageId && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800"
            dir="rtl"
          >
            <span className="text-sm text-zinc-400">
              מציג נקודות עבור:{' '}
              <span className="text-white font-semibold">
                {summary?.byStage.find((s) => s.stageId === selectedStageId)
                  ?.stageTitle}
              </span>
            </span>
            <button
              onClick={() => setSelectedStageId(null)}
              className="text-xs font-semibold px-3 py-1 rounded-full hover:bg-zinc-800 transition-colors"
              style={{ color: accentColor }}
            >
              הסר סינון
            </button>
          </motion.div>
        )}

        {/* Feed Section */}
        <section>
          <h3 className="text-white text-xl font-bold mb-4 text-right">
            היסטוריית נקודות
          </h3>

          {isFeedLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-zinc-900/30 animate-pulse"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-800 rounded w-3/4" />
                      <div className="h-3 bg-zinc-800 rounded w-1/2" />
                      <div className="h-3 bg-zinc-800 rounded w-1/3" />
                    </div>
                    <div className="w-16 h-8 bg-zinc-800 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : feedError ? (
            <div className="text-center py-8 text-zinc-400">
              <p>שגיאה בטעינת ההיסטוריה</p>
            </div>
          ) : feed.items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8" style={{ opacity: 0.3 }} />
              </div>
              <h4 className="text-white font-bold text-lg mb-2">
                {selectedStageId ? 'אין נקודות בשלב זה' : 'אין נקודות עדיין'}
              </h4>
              <p className="text-zinc-400 text-sm">
                {selectedStageId
                  ? 'נסה להסיר את הסינון או לבחור שלב אחר'
                  : 'השלם משימות כדי לצבור נקודות'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {feed.items.map((item, index) => (
                  <PointsFeedItem
                    key={item.id}
                    points={item.points}
                    taskTitle={item.taskTitle}
                    stageTitle={item.stageTitle}
                    createdAt={item.createdAt}
                    index={index}
                  />
                ))}
              </AnimatePresence>

              {/* Load more trigger */}
              <div ref={observerTarget} className="py-4">
                {isLoadingMore && (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                  </div>
                )}
              </div>

              {!hasMore && feed.items.length > 0 && (
                <p className="text-center text-sm text-zinc-500 py-4">
                  זה הכל! אין עוד נקודות להציג
                </p>
              )}
            </div>
          )}
        </section>
        </div>
      </main>

      {/* Info Sheet */}
      <AnimatePresence>
        {showInfo && (
          <InfoSheet onClose={() => setShowInfo(false)} />
        )}
      </AnimatePresence>

      {/* Stage Filter Sheet */}
      <StageFilterSheet
        isOpen={showStageFilter}
        onClose={() => setShowStageFilter(false)}
        stages={summary?.byStage || []}
        selectedStageId={selectedStageId}
        onSelectStage={handleStageFilter}
        accentColor={accentColor}
      />
    </div>
  );
}

/* Info Sheet Component */
function InfoSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[119] bg-black/40 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[120] rounded-t-3xl bg-[#1a1b20] border-t border-white/10 p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
        dir="rtl"
      >
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />

        <h2 className="text-2xl font-bold text-white mb-4">איך עובד מערך הנקודות?</h2>

        <div className="space-y-4 text-white/80 leading-relaxed">
          <p>צבור נקודות על ידי השלמת משימות במסע שלך:</p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#E2F163] flex-shrink-0 mt-0.5" />
              <span>כל משימה מעניקה נקודות בהתאם לרמת הקושי שלה</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#E2F163] flex-shrink-0 mt-0.5" />
              <span>צפה בפילוח נקודות לפי שלבים</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#E2F163] flex-shrink-0 mt-0.5" />
              <span>עקוב אחר היסטוריית הנקודות בציר הזמן</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-[#E2F163] flex-shrink-0 mt-0.5" />
              <span>סנן לפי שלב ספציפי על ידי לחיצה על השלב</span>
            </li>
          </ul>

          <div className="p-4 rounded-xl bg-[#E2F163]/10 border border-[#E2F163]/20">
            <p className="text-[#E2F163] text-sm font-semibold">
              טיפ: משימות מאתגרות יותר שוות יותר נקודות!
            </p>
          </div>

          <p className="text-sm">הנקודות שלך מייצגות את ההתקדמות וההתמדה שלך במסע הכושר.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-xl bg-[#E2F163] text-black font-bold hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all"
        >
          הבנתי
        </button>
      </motion.div>
    </>
  );
}
