/**
 * GameMap - 3D Vertical Path Game Map
 *
 * Scrollable 3D path with parallax effects and space texture background
 */

"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles } from "lucide-react";
import { GameNode } from "./GameNode";
import { EnergyPath } from "./EnergyPath";
import { NodeModal } from "./NodeModal";
import { KpiStrip } from "./KpiStrip";
import { XPCounter } from "./XPCounter";
import type { JourneyNode } from "@/lib/journey/queries";
import { useNodeActions } from "@/lib/journey/client";

interface GameMapProps {
  nodes: JourneyNode[];
  chapters: Array<{
    id: string | number;
    title: string;
    description?: string;
  }>;
  userPoints: number;
  onRefresh: () => void;
}

export function GameMap({ nodes, chapters, userPoints, onRefresh }: GameMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);
  const [nodePositions, setNodePositions] = useState<Array<{ y: number; direction: string }>>([]);

  const { scrollYProgress } = useScroll({
    container: containerRef,
    offset: ["start start", "end end"]
  });

  const { completeNode } = useNodeActions();

  // Calculate node positions with zigzag pattern
  useEffect(() => {
    const positions = nodes.map((_, index) => {
      const baseY = index * 180; // Spacing between nodes
      const direction = index % 3 === 0 ? "left" : index % 3 === 1 ? "right" : "straight";
      return { y: baseY, direction };
    });
    setNodePositions(positions);
  }, [nodes]);

  // Parallax transformations for background elements
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const handleNodeClick = (node: JourneyNode) => {
    if (node.progress.state !== "LOCKED") {
      setSelectedNode(node);
    }
  };

  const handleCloseCard = () => {
    setSelectedNode(null);
  };

  const handleComplete = async (nodeId: string) => {
    await completeNode(nodeId);
    setSelectedNode(null);
    onRefresh();
  };

  // Group nodes by chapter - filter out undefined/null nodes and handle type coercion
  const nodesByChapter = chapters.map(chapter => ({
    chapter,
    nodes: nodes.filter(node => {
      if (!node) return false;
      if (!node.chapter_id) {
        console.warn('[GameMap] Node missing chapter_id:', node.id || 'unknown');
        return false;
      }
      return String(node.chapter_id) === String(chapter.id);
    })
  }));

  return (
    <div className="fixed inset-0 bg-[#0e0f12] overflow-hidden" dir="rtl">
      {/* Space texture background with parallax */}
      <motion.div
        className="absolute inset-0"
        style={{ y: backgroundY }}
      >
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0f12] via-[#1a1b20] to-[#0e0f12]" />

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
            backgroundSize: "256px 256px"
          }}
        />

        {/* Animated stars */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3
            }}
          />
        ))}
      </motion.div>

      {/* Grid overlay with parallax */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: gridY }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(226, 241, 99, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(226, 241, 99, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px"
          }}
        />
      </motion.div>

      {/* Fixed header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-[#0e0f12] via-[#0e0f12] to-transparent">
        <div className="px-6 pt-16 pb-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#E2F163]" />
              מסע הכושר שלי
            </h1>
            <XPCounter points={userPoints} />
          </motion.div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="absolute top-32 left-0 right-0 z-20 px-6 pt-2">
        <KpiStrip />
      </div>

      {/* Scrollable map container */}
      <div
        ref={containerRef}
        className="absolute inset-0 top-56 overflow-y-auto overflow-x-hidden pb-32"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <div ref={mapRef} className="relative px-12 pt-8" style={{ minHeight: "100dvh" }}>
          {/* Render chapters with their nodes */}
          {nodesByChapter.map(({ chapter, nodes: chapterNodes }, chapterIndex) => {
            const chapterStartIndex = nodes.findIndex(n => n.chapter_id === chapter.id);

            return (
              <div key={chapter.id} className="relative mb-16">
                {/* Chapter header */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: chapterIndex * 0.2 }}
                  className="mb-12 text-center"
                >
                  <div className="inline-block px-6 py-3 rounded-2xl bg-gradient-to-r from-neutral-900/80 to-neutral-800/60 border border-neutral-700/50 backdrop-blur-md">
                    <h2 className="text-xl font-bold text-white mb-1">{chapter.title}</h2>
                    {chapter.description && (
                      <p className="text-sm text-neutral-400">{chapter.description}</p>
                    )}
                  </div>
                </motion.div>

                {/* Nodes and paths for this chapter */}
                {chapterNodes.map((node, nodeIndex) => {
                  const globalIndex = chapterStartIndex + nodeIndex;
                  const position = nodePositions[globalIndex];
                  const nextPosition = nodePositions[globalIndex + 1];

                  if (!position) return null;

                  return (
                    <div key={node.id} className="relative">
                      {/* Energy path to next node */}
                      {nextPosition && globalIndex < nodes.length - 1 && (
                        <EnergyPath
                          startY={position.y + 90}
                          endY={nextPosition.y}
                          isActive={node.progress.state === "COMPLETED" &&
                                   nodes[globalIndex + 1].progress.state === "ACTIVE"}
                          isCompleted={node.progress.state === "COMPLETED"}
                          index={globalIndex}
                          direction={position.direction as "left" | "right" | "straight"}
                        />
                      )}

                      {/* Node */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{ top: position.y }}
                      >
                        <GameNode
                          node={node}
                          index={globalIndex}
                          onNodeClick={handleNodeClick}
                          scrollProgress={scrollYProgress}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Add extra space at the bottom */}
          <div style={{ height: "200px" }} />
        </div>
      </div>

      {/* Node detail modal */}
      <NodeModal
        node={selectedNode}
        isOpen={!!selectedNode}
        onClose={handleCloseCard}
        onCompleteNode={handleComplete}
        onRefresh={onRefresh}
      />
    </div>
  );
}