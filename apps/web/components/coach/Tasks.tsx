"use client";

import { useState, useOptimistic } from "react";
import { motion } from "framer-motion";
import type { CoachTaskWithCompletion } from "@/lib/schemas/coach";

type Props = {
  tasks: CoachTaskWithCompletion[];
  onToggle: (taskId: string, isCompleted: boolean) => Promise<void>;
};

type FilterRange = "today" | "week";

export function Tasks({ tasks, onToggle }: Props) {
  const [filter, setFilter] = useState<FilterRange>("week");

  // Ensure tasks is always an array
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Optimistic UI for task completions
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    safeTasks,
    (state, { taskId, isCompleted }: { taskId: string; isCompleted: boolean }) => {
      // Ensure state is an array before mapping
      if (!Array.isArray(state)) {
        console.warn("[Tasks] useOptimistic state is not an array:", state);
        return [];
      }
      return state.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            completion: isCompleted ? { id: 'temp', task_id: taskId, user_id: '', completed_at: new Date().toISOString(), note: null, created_at: new Date().toISOString() } : null,
          };
        }
        return task;
      });
    }
  );

  // Filter tasks by date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredTasks = optimisticTasks.filter(task => {
    if (!task.due_date) return true; // Include tasks without due date

    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    if (filter === "today") {
      return dueDate.getTime() === today.getTime();
    } else {
      // Week - next 7 days
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return dueDate >= today && dueDate < weekEnd;
    }
  });

  const handleToggle = async (task: CoachTaskWithCompletion) => {
    const isCurrentlyCompleted = !!task.completion;
    const newCompletedState = !isCurrentlyCompleted;

    // Optimistic update
    setOptimisticTasks({ taskId: task.id, isCompleted: newCompletedState });

    try {
      await onToggle(task.id, newCompletedState);
    } catch (error) {
      // Revert on error
      console.error("Failed to toggle task:", error);
      setOptimisticTasks({ taskId: task.id, isCompleted: isCurrentlyCompleted });
    }
  };

  if (safeTasks.length === 0) {
    return (
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 text-center" dir="rtl">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-500/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white mb-1">אין משימות</h3>
        <p className="text-sm text-neutral-400">המאמן שלך עדיין לא הוסיף משימות</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4" dir="rtl">
      {/* Header with filter */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">משימות מהמאמן</h3>

        {/* Filter buttons */}
        <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
          <button
            onClick={() => setFilter("today")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === "today"
                ? "bg-[#E2F163] text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            היום
          </button>
          <button
            onClick={() => setFilter("week")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === "week"
                ? "bg-[#E2F163] text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            השבוע
          </button>
        </div>
      </div>

      {/* Tasks list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 py-4">
            אין משימות ב{filter === "today" ? "יום" : "שבוע"} הזה
          </p>
        ) : (
          filteredTasks.map((task, index) => {
            const isCompleted = !!task.completion;
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDate && dueDate < today && !isCompleted;

            return (
              <motion.button
                key={task.id}
                onClick={() => handleToggle(task)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`w-full text-right p-3 rounded-xl border transition-all active:translate-y-1 active:brightness-90 ${
                  isCompleted
                    ? "bg-green-500/10 border-green-500/30"
                    : isOverdue
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-neutral-800 border-neutral-700 hover:border-neutral-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${
                    isCompleted
                      ? "bg-green-500 border-green-500"
                      : isOverdue
                      ? "border-red-500"
                      : "border-neutral-500"
                  }`}>
                    {isCompleted && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${
                      isCompleted ? "text-neutral-400 line-through" : "text-white"
                    }`}>
                      {task.title}
                    </div>

                    {task.description && (
                      <div className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
                        {task.description}
                      </div>
                    )}

                    {/* Due date */}
                    {dueDate && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        isOverdue ? "text-red-400" : "text-neutral-500"
                      }`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {dueDate.toLocaleDateString("he-IL", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
