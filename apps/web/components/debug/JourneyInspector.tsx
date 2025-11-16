"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Node = {
  id: string;
  chapter_id: string;
  chapter_name: string;
  chapter_slug: string;
  title: string;
  description?: string;
  type: string;
  order_index: number;
  points_reward?: number;
  conditions_json?: any;
  cta_route?: string;
  state: "LOCKED" | "ACTIVE" | "COMPLETED";
  progress_json?: any;
  completed_at?: string | null;
};

type Chapter = {
  chapter_id: string;
  chapter_name: string;
  chapter_slug: string;
  chapter_state: string;
  completed_nodes: number;
  total_nodes: number;
  order_index: number;
};

type Avatar = {
  avatar_key: string;
  confidence?: number;
  matched_rules?: string[];
  reasons?: string[];
  assigned_at?: string;
};

type Badge = {
  id: string;
  badge_key: string;
  earned_at: string;
};

type InspectorData = {
  userId: string;
  avatar: Avatar | null;
  chapters: Chapter[];
  nodes: Node[];
  totalPoints: number;
  totalBadges: number;
  badges: Badge[];
  meta: {
    at: string;
    nodeCount: number;
    chapterCount: number;
  };
};

export default function JourneyInspector({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<InspectorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/debug/journey")
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.warn("[Inspector] fetch failed", e);
        setLoading(false);
      });
  }, []);

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journey_plan_${data.userId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const badgeColor = (s: string) =>
    s === "COMPLETED" ? "bg-emerald-500/20 text-emerald-300" :
    s === "ACTIVE"    ? "bg-yellow-400/20 text-yellow-200" :
                       "bg-white/10 text-white/60";

  // Group nodes by chapter
  const nodesByChapter = data?.nodes.reduce((acc, node) => {
    if (!acc[node.chapter_id]) {
      acc[node.chapter_id] = [];
    }
    acc[node.chapter_id].push(node);
    return acc;
  }, {} as Record<string, Node[]>) || {};

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed inset-x-0 bottom-0 z-[80] mx-auto max-w-xl rounded-t-3xl border-t border-x border-white/10 bg-[#111]/95 backdrop-blur-xl p-5 overflow-y-auto max-h-[75vh]"
        style={{ direction: "ltr" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Journey Plan Inspector</h3>
          <div className="flex gap-2">
            <button
              onClick={exportJson}
              disabled={!data}
              className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export JSON
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm hover:bg-white/15"
            >
              Close
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-white/60 text-sm">Loading…</div>
        ) : !data ? (
          <div className="text-red-400 text-sm">Failed to load journey data</div>
        ) : (
          <div className="space-y-5">
            {/* Avatar Section */}
            <section className="rounded-2xl border border-white/10 p-4">
              <div className="text-white/60 text-xs mb-1">Avatar</div>
              <div className="flex items-center justify-between">
                <div className="text-white font-medium">{data.avatar?.avatar_key ?? "—"}</div>
                <div className="text-white/50 text-xs truncate max-w-[180px]" title={data.userId}>
                  {data.userId.substring(0, 8)}...
                </div>
              </div>
              {data.avatar?.confidence && (
                <div className="mt-1 text-white/60 text-xs">
                  Confidence: <span className="text-white/90">{(data.avatar.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
              {data.avatar?.reasons?.length ? (
                <ul className="mt-2 text-white/70 text-xs list-disc pl-5 space-y-1">
                  {data.avatar.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              ) : null}
            </section>

            {/* Progress Summary */}
            <section className="rounded-2xl border border-white/10 p-4">
              <div className="text-white/60 text-xs mb-2">Progress Summary</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="px-2 py-1 rounded-lg bg-white/5">
                  <div className="text-white/50 text-xs">Points</div>
                  <div className="text-white font-semibold">{data.totalPoints}</div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-white/5">
                  <div className="text-white/50 text-xs">Badges</div>
                  <div className="text-white font-semibold">{data.totalBadges}</div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-white/5">
                  <div className="text-white/50 text-xs">Chapters</div>
                  <div className="text-white font-semibold">{data.meta.chapterCount}</div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-white/5">
                  <div className="text-white/50 text-xs">Nodes</div>
                  <div className="text-white font-semibold">{data.meta.nodeCount}</div>
                </div>
              </div>
              {data.badges.length > 0 && (
                <div className="mt-3">
                  <div className="text-white/50 text-xs mb-1">Earned Badges:</div>
                  <div className="flex flex-wrap gap-1">
                    {data.badges.map(b => (
                      <span key={b.id} className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                        {b.badge_key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Chapters & Nodes */}
            <section className="rounded-2xl border border-white/10 p-2">
              <div className="text-white/60 text-xs px-2 py-1 mb-1">Chapters & Nodes</div>
              {data.chapters.map((chapter) => {
                const chapterNodes = nodesByChapter[chapter.chapter_id] || [];
                return (
                  <div key={chapter.chapter_id} className="rounded-xl p-3 mb-2 hover:bg-white/5">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">
                        {chapter.chapter_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-xs">
                          {chapter.completed_nodes}/{chapter.total_nodes}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${badgeColor(chapter.chapter_state)}`}>
                          {chapter.chapter_state}
                        </span>
                      </div>
                    </div>

                    {/* Nodes in this chapter */}
                    {chapterNodes.length > 0 && (
                      <div className="mt-2 grid gap-1">
                        {chapterNodes.map(node => (
                          <div
                            key={node.id}
                            className="flex items-start justify-between rounded-lg bg-white/[0.03] p-2 text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-white/90 text-sm">{node.title}</div>
                              <div className="text-white/50 text-xs">
                                {node.type}
                                {node.description && ` • ${node.description}`}
                              </div>
                              {node.conditions_json && (
                                <details className="mt-1">
                                  <summary className="text-white/40 text-[11px] cursor-pointer hover:text-white/60">
                                    Conditions
                                  </summary>
                                  <pre className="mt-1 text-[10px] leading-snug text-white/50 whitespace-pre-wrap overflow-x-auto">
                                    {JSON.stringify(node.conditions_json, null, 2)}
                                  </pre>
                                </details>
                              )}
                              {node.progress_json && Object.keys(node.progress_json).length > 0 && (
                                <details className="mt-1">
                                  <summary className="text-white/40 text-[11px] cursor-pointer hover:text-white/60">
                                    Progress
                                  </summary>
                                  <pre className="mt-1 text-[10px] leading-snug text-white/50 whitespace-pre-wrap overflow-x-auto">
                                    {JSON.stringify(node.progress_json, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                            <div className="text-right ml-2 flex-shrink-0">
                              <div className={`px-2 py-0.5 rounded-full text-xs inline-block ${badgeColor(node.state)}`}>
                                {node.state}
                              </div>
                              {node.cta_route && (
                                <div className="text-white/50 text-[11px] mt-1">{node.cta_route}</div>
                              )}
                              {node.points_reward && (
                                <div className="text-white/60 text-[11px] mt-1">XP {node.points_reward}</div>
                              )}
                              {node.completed_at && (
                                <div className="text-emerald-400/60 text-[10px] mt-1">
                                  ✓ {new Date(node.completed_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Meta Info */}
            <div className="text-white/40 text-[10px] text-center">
              Last updated: {new Date(data.meta.at).toLocaleString()}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
