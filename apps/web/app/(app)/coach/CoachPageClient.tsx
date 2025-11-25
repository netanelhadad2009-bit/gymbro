"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StickyHeader from "@/components/ui/StickyHeader";
import { CoachSummary } from "@/components/coach/CoachSummary";
import { UpcomingSession } from "@/components/coach/UpcomingSession";
import { Tasks } from "@/components/coach/Tasks";
import { Checkins } from "@/components/coach/Checkins";
import { MessagePreview } from "@/components/coach/MessagePreview";
import { Resources } from "@/components/coach/Resources";
import { AddCheckinSheet, type CheckinData } from "@/components/coach/AddCheckinSheet";
import { BookSessionSheet, type SessionData } from "@/components/coach/BookSessionSheet";
import type {
  Coach,
  CoachAssignment,
  CoachSession,
  CoachTaskWithCompletion,
  Checkin,
  CoachMessage,
} from "@/lib/schemas/coach";

type Props = {
  assignment: CoachAssignment;
  coach: Coach;
  responseTime: string;
  upcomingSession: CoachSession | null;
  tasks: CoachTaskWithCompletion[];
  checkins: Checkin[];
  messages: CoachMessage[];
};

export function CoachPageClient({
  assignment,
  coach,
  responseTime,
  upcomingSession,
  tasks: initialTasks,
  checkins: initialCheckins,
  messages,
}: Props) {
  const router = useRouter();
  const [showCheckinSheet, setShowCheckinSheet] = useState(false);
  const [showBookingSheet, setShowBookingSheet] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [checkins, setCheckins] = useState(initialCheckins);

  // Handle task toggle
  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    const response = await fetch(`/api/coach/tasks/${taskId}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: null }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to toggle task");
    }

    // Update local state
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completion: isCompleted
                ? {
                    id: "temp",
                    task_id: taskId,
                    user_id: assignment.user_id,
                    completed_at: new Date().toISOString(),
                    note: null,
                    created_at: new Date().toISOString(),
                  }
                : null,
            }
          : task
      )
    );

    // Log analytics
    if (process.env.NEXT_PUBLIC_LOG_UI === "1") {
      console.log("[Analytics] coach_task_complete", { taskId, isCompleted });
    }
  };

  // Handle checkin submission
  const handleCheckinSubmit = async (data: CheckinData) => {
    const response = await fetch("/api/coach/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create check-in");
    }

    const result = await response.json();

    // Update local state (optimistic)
    setCheckins((prev) => [result.data, ...prev]);

    // Log analytics
    if (process.env.NEXT_PUBLIC_LOG_UI === "1") {
      console.log("[Analytics] coach_checkin_create", { checkInId: result.data.id });
    }
  };

  // Handle session booking
  const handleSessionSubmit = async (data: SessionData) => {
    const response = await fetch("/api/coach/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to book session");
    }

    const result = await response.json();

    // Refresh page to show new session
    router.refresh();

    // Log analytics
    if (process.env.NEXT_PUBLIC_LOG_UI === "1") {
      console.log("[Analytics] coach_session_create", { sessionId: result.data.id });
    }
  };

  // Log page view
  if (process.env.NEXT_PUBLIC_LOG_UI === "1") {
    console.log("[Analytics] coach_view", { coachId: coach.id });
  }

  return (
    <>
      {/* Sticky shell layout: grid with 3 rows */}
      <div
        className="h-[100dvh] grid grid-rows-[auto_1fr_auto] bg-[#0D0E0F] overscroll-contain"
        dir="rtl"
      >
        {/* Top sticky header */}
        <StickyHeader
          title="המאמן האישי"
          leftSlot={
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
              aria-label="חזור"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          }
        />

        {/* Middle scrollable area */}
        <div className="overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 space-y-4 pb-6">
            {/* Coach Summary */}
            <CoachSummary
              coach={coach}
              responseTime={responseTime}
              onSendMessage={() => router.push("/coach/chat")}
            />

            {/* Upcoming Session */}
            <UpcomingSession
              session={upcomingSession}
              onBookSession={() => setShowBookingSheet(true)}
            />

            {/* Tasks */}
            <Tasks tasks={tasks} onToggle={handleToggleTask} />

            {/* Check-ins */}
            <Checkins checkins={checkins} onAddCheckin={() => setShowCheckinSheet(true)} />

            {/* Messages Preview */}
            <MessagePreview assignmentId={assignment.id} initialMessages={messages} />

            {/* Resources (empty for now - can be populated later) */}
            <Resources resources={[]} />
          </div>
        </div>

        {/* Bottom sticky action bar */}
        <div className="border-t border-neutral-800 bg-[#0D0E0F] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="flex gap-2">
            {/* Chat - primary */}
            <button
              onClick={() => router.push("/coach/chat")}
              className="flex-1 px-4 py-3 bg-[#E2F163] text-black font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              צ'אט
            </button>

            {/* Book Session - outline */}
            <button
              onClick={() => setShowBookingSheet(true)}
              className="px-4 py-3 bg-transparent border-2 border-neutral-700 text-white font-medium rounded-xl hover:border-neutral-600 active:translate-y-1 active:brightness-90 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              הזמן
            </button>

            {/* Check-in - ghost */}
            <button
              onClick={() => setShowCheckinSheet(true)}
              className="px-4 py-3 bg-transparent text-neutral-300 font-medium rounded-xl hover:bg-neutral-800 active:translate-y-1 active:brightness-90 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              צ'ק-אין
            </button>
          </div>
        </div>
      </div>

      {/* Sheets */}
      <AddCheckinSheet
        isOpen={showCheckinSheet}
        onClose={() => setShowCheckinSheet(false)}
        onSubmit={handleCheckinSubmit}
        assignmentId={assignment.id}
      />

      <BookSessionSheet
        isOpen={showBookingSheet}
        onClose={() => setShowBookingSheet(false)}
        onSubmit={handleSessionSubmit}
        assignmentId={assignment.id}
      />
    </>
  );
}
