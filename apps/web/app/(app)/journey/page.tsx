"use client";

import { useState, useMemo } from "react";
import { JourneyCanvas } from "./JourneyCanvas";
import { StageSheet } from "./StageSheet";
import { generateJourneyPath, calculateNodePositions } from "@/lib/path";
import type { Stage, UserStage, UserMetrics } from "@/lib/stageEngine";
import { colors } from "@/lib/tokens";
import { he } from "@/lib/i18n/he";

// Mock data for demonstration - 8 stages matching reference image
const MOCK_STAGES: Stage[] = [
  {
    code: "foundation",
    order_index: 0,
    title_he: "בסיס",
    summary_he: "להיכנס לקצב: 3 אימונים בשבוע ו־2 שקילות",
    type: "mixed",
    requirements: {
      logic: "AND",
      rules: [
        { metric: "workouts_per_week", gte: 3, window_days: 7 },
        { metric: "weigh_ins", gte: 2, window_days: 7 },
      ],
    },
    xp_reward: 80,
    icon: "💪",
    bg_color: colors.success,
  },
  {
    code: "daily_discipline",
    order_index: 1,
    title_he: "משמעת יומית",
    summary_he: "תיעוד תזונה יומי",
    type: "habit",
    requirements: {
      logic: "OR",
      rules: [
        { metric: "nutrition_adherence_pct", gte: 70, window_days: 7 },
        { metric: "protein_avg_g", gte: 110, window_days: 7 },
      ],
    },
    xp_reward: 100,
    icon: "📝",
    bg_color: colors.success,
  },
  {
    code: "volume_jump",
    order_index: 2,
    title_he: "קפיצת מדרגה",
    summary_he: "להגיע ל־4 אימונים בשבוע",
    type: "workout",
    requirements: {
      logic: "AND",
      rules: [{ metric: "workouts_per_week", gte: 4, window_days: 7 }],
    },
    xp_reward: 120,
    icon: "🏋️",
    bg_color: colors.success,
  },
  {
    code: "upper_iron",
    order_index: 3,
    title_he: "ברזל עליון",
    summary_he: "שיפור כוח פלג גוף עליון",
    type: "workout",
    requirements: {
      logic: "AND",
      rules: [{ metric: "upper_body_workouts", gte: 2, window_days: 7 }],
    },
    xp_reward: 140,
    icon: "💪",
    bg_color: colors.danger,
  },
  {
    code: "nutrition_lock",
    order_index: 4,
    title_he: "שומרים על תזונה",
    summary_he: "עמידה ב־80% תפריט",
    type: "nutrition",
    requirements: {
      logic: "AND",
      rules: [
        { metric: "nutrition_adherence_pct", gte: 80, window_days: 14 },
        { metric: "weigh_ins", gte: 2, window_days: 7 },
      ],
    },
    xp_reward: 160,
    icon: "🥗",
    bg_color: colors.danger,
  },
  {
    code: "smart_endurance",
    order_index: 5,
    title_he: "סיבולת חכמה",
    summary_he: "קרדיו + כוח",
    type: "workout",
    requirements: {
      logic: "AND",
      rules: [
        { metric: "workouts_per_week", gte: 5, window_days: 7 },
      ],
    },
    xp_reward: 180,
    icon: "🏃",
    bg_color: colors.danger,
  },
  {
    code: "iron_mindset",
    order_index: 6,
    title_he: "מיינדסט ברזל",
    summary_he: "עקביות 30 יום",
    type: "habit",
    requirements: {
      logic: "AND",
      rules: [
        { metric: "workouts_per_week", gte: 4, window_days: 30 },
      ],
    },
    xp_reward: 200,
    icon: "🧠",
    bg_color: colors.danger,
  },
  {
    code: "boss_stage",
    order_index: 7,
    title_he: "שלב הבוס",
    summary_he: "מטרה אישית",
    type: "mixed",
    requirements: {
      logic: "AND",
      rules: [
        { metric: "workouts_per_week", gte: 5, window_days: 7 },
        { metric: "nutrition_adherence_pct", gte: 90, window_days: 30 },
      ],
    },
    xp_reward: 250,
    icon: "👑",
    bg_color: colors.warning,
  },
];

const MOCK_USER_STAGES: UserStage[] = MOCK_STAGES.map((stage, idx) => ({
  id: `user-stage-${idx}`,
  user_id: "mock-user",
  stage_code: stage.code,
  status: idx <= 2 ? "completed" : idx === 3 ? "in_progress" : "locked",
  progress: idx === 3 ? 0.65 : idx <= 2 ? 1 : 0,
  xp_current: idx === 3 ? 90 : idx <= 2 ? stage.xp_reward : 0,
  xp_total: stage.xp_reward,
  position: idx,
}));

const MOCK_METRICS: UserMetrics = {
  workouts_per_week: 3,
  nutrition_adherence_pct: 65,
  weigh_ins: 2,
  protein_avg_g: 95,
  upper_body_workouts: 1,
};

export default function JourneyPage() {
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [showProMode, setShowProMode] = useState(false);

  // Responsive canvas dimensions for mobile
  const canvasWidth = typeof window !== 'undefined' && window.innerWidth < 640
    ? Math.min(window.innerWidth - 40, 380)
    : 600;
  const canvasHeight = typeof window !== 'undefined' && window.innerWidth < 640
    ? 1800
    : 1400;

  // Generate path and node positions
  const pathD = useMemo(
    () => generateJourneyPath(canvasWidth, canvasHeight, MOCK_STAGES.length),
    [canvasWidth, canvasHeight]
  );

  const nodePositions = useMemo(
    () => calculateNodePositions(pathD, MOCK_STAGES.length),
    [pathD]
  );

  const handleNodeClick = (stage: Stage) => {
    setSelectedStage(stage);
  };

  const handleCloseSheet = () => {
    setSelectedStage(null);
  };

  const selectedUserStage = selectedStage
    ? MOCK_USER_STAGES.find((us) => us.stage_code === selectedStage.code) || null
    : null;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.bg }}
      dir="rtl"
    >
      {/* Header */}
      <div className="header-safe border-b" style={{
        backgroundColor: colors.surface,
        borderColor: colors.outline
      }}>
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
                {he.journey.title}
              </h1>
              <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>
                {he.journey.subtitle}
              </p>
            </div>
            <button
              onClick={() => setShowProMode(!showProMode)}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: showProMode ? colors.accent : colors.surfaceElevated,
                color: showProMode ? colors.bg : colors.text,
              }}
            >
              {showProMode ? "🎮 מצב משחק" : "📊 מצב מקצועי"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {showProMode ? (
        // Pro Mode - Simple dashboard view
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_STAGES.map((stage, idx) => {
              const userStage = MOCK_USER_STAGES[idx];
              return (
                <div
                  key={stage.code}
                  className="cursor-pointer rounded-xl border p-4 transition-transform hover:scale-105"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.outline,
                  }}
                  onClick={() => setSelectedStage(stage)}
                >
                  <div className="mb-2 text-3xl">{stage.icon}</div>
                  <h3 className="font-bold" style={{ color: colors.text }}>
                    {stage.title_he}
                  </h3>
                  <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                    {stage.summary_he}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div
                      className="h-2 flex-1 rounded-full overflow-hidden"
                      style={{ backgroundColor: colors.surfaceElevated }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${userStage.progress * 100}%`,
                          backgroundColor: colors.accent,
                        }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: colors.textMuted }}>
                      {Math.round(userStage.progress * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Game Mode - Journey canvas (Mobile optimized)
        <div className="relative mx-auto py-4 sm:py-8 px-2 sm:px-4" style={{ maxWidth: canvasWidth + 60 }}>
          {/* Green border frame matching reference image */}
          <div
            className="relative rounded-xl sm:rounded-2xl p-2 sm:p-4"
            style={{
              border: "3px solid #6fe3a1",
              background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(111, 227, 161, 0.1)",
            }}
          >
            {/* Hebrew text labels - "שלב הבסיס" and "שלב הפרי" - Responsive positioning */}
            <div className="absolute right-2 sm:left-8 top-[60%] sm:top-1/2 transform -translate-y-1/2 z-10">
              <div
                className="text-lg sm:text-2xl font-black tracking-wide"
                style={{
                  color: "#6fe3a1",
                  textShadow: "0 2px 8px rgba(111, 227, 161, 0.6), 0 0 20px rgba(111, 227, 161, 0.3)",
                  writingMode: "horizontal-tb",
                }}
              >
                שלב הבסיס
              </div>
            </div>

            <div className="absolute right-2 sm:left-8 top-[30%] sm:top-1/4 transform -translate-y-1/2 z-10">
              <div
                className="text-lg sm:text-2xl font-black tracking-wide"
                style={{
                  color: "#d32f2f",
                  textShadow: "0 2px 8px rgba(211, 47, 47, 0.6), 0 0 20px rgba(211, 47, 47, 0.3)",
                  writingMode: "horizontal-tb",
                }}
              >
                שלב הפרי
              </div>
            </div>

            {/* Mobile hint - Swipe to scroll */}
            <div className="mb-2 text-center sm:hidden">
              <p className="text-xs" style={{ color: colors.textMuted }}>
                👆 גרור כדי לנוע במפה
              </p>
            </div>

            {/* Desktop hint */}
            <div className="mb-2 text-center hidden sm:block">
              <p className="text-xs" style={{ color: colors.textMuted }}>
                {he.hints.panzoom}
              </p>
            </div>

            {/* Journey Canvas */}
            <JourneyCanvas
              stages={MOCK_STAGES}
              userStages={MOCK_USER_STAGES}
              pathD={pathD}
              nodePositions={nodePositions}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              onNodeClick={handleNodeClick}
            />
          </div>
        </div>
      )}

      {/* Stage Sheet Modal */}
      {selectedStage && selectedUserStage && (
        <StageSheet
          stage={selectedStage}
          userStage={selectedUserStage}
          metrics={MOCK_METRICS}
          onClose={handleCloseSheet}
          onStart={() => {
            console.log("Start stage:", selectedStage.code);
            handleCloseSheet();
          }}
          onLogWorkout={() => {
            console.log("Log workout for stage:", selectedStage.code);
            handleCloseSheet();
          }}
          onLogMeal={() => {
            console.log("Log meal for stage:", selectedStage.code);
            handleCloseSheet();
          }}
        />
      )}
    </div>
  );
}
