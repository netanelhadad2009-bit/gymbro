/**
 * StageSwitcher - Chapter selection component for Journey
 *
 * Always renders as a bottom sheet (Drawer) with:
 * - Light overlay (20% black + blur, not full dark)
 * - Above tab bar (z-[120])
 * - Respects safe-area bottom
 * - Max height with scrolling
 * - Swipe-down and tap-outside to close
 */

"use client";

import { useState } from "react";
import { MapPinned, ChevronDown, Lock, CheckCircle2, Flame } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";

export interface ChapterStatus {
  chapter_id: string;
  chapter_slug: string;
  chapter_name: string;
  order_index: number;
  completed_nodes: number;
  total_nodes: number;
  chapter_state: "LOCKED" | "ACTIVE" | "COMPLETED";
}

interface StageSwitcherProps {
  chapters: ChapterStatus[];
  currentChapterId: string | null;
  onSelect: (chapterId: string) => void;
}

export function StageSwitcher({ chapters, currentChapterId, onSelect }: StageSwitcherProps) {
  const [open, setOpen] = useState(false);

  // Defensive: Ensure chapters is always an array
  const safeChapters = Array.isArray(chapters) ? chapters : [];
  const currentChapter = safeChapters.find(c => c.chapter_id === currentChapterId);

  const handleSelect = (chapterId: string) => {
    onSelect?.(chapterId);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* Trigger Button */}
      <DrawerTrigger asChild>
        <button
          aria-label="בחר שלב"
          className="rounded-full px-4 py-2 bg-card/70 backdrop-blur border border-border hover:bg-card text-foreground flex items-center gap-2 transition-colors"
          disabled={safeChapters.length === 0}
        >
          <MapPinned className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm">
            {currentChapter?.chapter_name || (safeChapters.length === 0 ? "טוען..." : "בחר שלב")}
          </span>
          <ChevronDown
            className={[
              "w-3 h-3 opacity-70 transition-transform",
              open ? "rotate-180" : ""
            ].join(" ")}
          />
        </button>
      </DrawerTrigger>

      <DrawerPortal>
        {/* Light Overlay - 20% black with slight blur */}
        <DrawerOverlay className="fixed inset-0 z-[119] bg-black/20 backdrop-blur-sm" />

        {/* Bottom Sheet Content */}
        <DrawerContent
          className="fixed inset-x-0 bottom-0 z-[120] rounded-t-3xl border border-border bg-card shadow-2xl max-h-[72vh] overflow-hidden"
          dir="rtl"
        >
        {/* Header - Always Visible */}
        <DrawerHeader className="text-right px-5 pt-4 pb-3 border-b border-border/60">
          <DrawerTitle className="text-lg font-bold">בחר שלב</DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground mt-1">
            ניתן לעיין בכל השלבים. שלבים נעולים יופיעו כמשימות נעולות.
          </DrawerDescription>
        </DrawerHeader>

        {/* Scrollable List with Safe-Area + Tab Bar Padding */}
        <div className="overflow-y-auto px-2 pb-[calc(env(safe-area-inset-bottom)+80px)]">
          {safeChapters.length === 0 ? (
            // Empty State
            <div className="px-4 py-6 text-center">
              <MapPinned className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">אין שלבים להצגה כרגע.</p>
            </div>
          ) : (
            // Chapter List
            <ul className="divide-y divide-border">
              {safeChapters.map((chapter) => {
                const isCurrent = chapter.chapter_id === currentChapterId;
                const locked = chapter.chapter_state === "LOCKED";
                const completed = chapter.chapter_state === "COMPLETED";
                const active = chapter.chapter_state === "ACTIVE";

                return (
                  <li key={chapter.chapter_id}>
                    <button
                      className={[
                        "w-full text-right px-4 py-3 flex items-center justify-between gap-3",
                        "transition-colors rounded-lg",
                        isCurrent ? "bg-primary/10" : "hover:bg-muted/40",
                      ].filter(Boolean).join(" ")}
                      onClick={() => handleSelect(chapter.chapter_id)}
                    >
                      {/* Left: Icon + Text */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* State Icon */}
                        <div className={[
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          completed && "bg-emerald-500/20",
                          active && "bg-primary/20",
                          locked && "bg-muted",
                        ].filter(Boolean).join(" ")}>
                          {completed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {active && <Flame className="w-4 h-4 text-primary" />}
                          {locked && <Lock className="w-4 h-4 text-muted-foreground" />}
                        </div>

                        {/* Chapter Info */}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className={[
                            "font-medium text-sm truncate",
                            locked ? "text-muted-foreground" : ""
                          ].filter(Boolean).join(" ")}>
                            {chapter.chapter_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {chapter.completed_nodes}/{chapter.total_nodes} משימות
                          </span>
                        </div>
                      </div>

                      {/* Right: Badges */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isCurrent && <Badge>נבחר</Badge>}
                        {!isCurrent && completed && <Badge variant="success">הושלם</Badge>}
                        {!isCurrent && active && <Badge>פעיל</Badge>}
                        {!isCurrent && locked && <Badge variant="secondary">נעול</Badge>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
