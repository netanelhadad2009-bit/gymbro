"use server";

import { createClient } from "@/lib/supabase/server";
import * as fs from "fs";
import * as path from "path";

// Type definitions
type StageTemplate = {
  key: string;
  title_he: string;
  subtitle_he: string;
  xp: number;
  order: number;
  lockedCopy_he: string;
  conditions: any;
  tasks: string[];
};

type TaskTemplate = {
  key: string;
  type: string;
  title_he: string;
  desc_he: string;
  xp: number;
  cta: string;
  ctaRoute: string;
  check: string;
};

type PlanSummary = {
  userId: string;
  avatarKey: string;
  chapters: Array<{
    id: string;
    title: string;
    subtitle: string;
    position: number;
    xp: number;
  }>;
  taskCount: number;
};

/**
 * Load stage templates from JSON
 */
function loadStageTemplates(): Record<string, StageTemplate[]> {
  const templatesPath = path.join(process.cwd(), "../../configs/journey/STAGE_TEMPLATES.json");
  const data = fs.readFileSync(templatesPath, "utf-8");
  return JSON.parse(data);
}

/**
 * Load task templates from JSON
 */
function loadTaskTemplates(): Record<string, TaskTemplate> {
  const templatesPath = path.join(process.cwd(), "../../configs/journey/TASK_TEMPLATES.json");
  const data = fs.readFileSync(templatesPath, "utf-8");
  const parsed = JSON.parse(data);

  // Convert array to keyed object
  const tasksMap: Record<string, TaskTemplate> = {};
  for (const task of parsed.tasks) {
    tasksMap[task.key] = task;
  }
  return tasksMap;
}

/**
 * Pick 3-5 stages for an avatar key
 */
function pickStages(avatarKey: string): StageTemplate[] {
  const allTemplates = loadStageTemplates();

  // Get stages for this avatar
  let stages = allTemplates[avatarKey];

  // Fallback to rookie-cut if avatar not found
  if (!stages) {
    console.warn(`[PlanBootstrap] No stages found for avatar "${avatarKey}", using rookie-cut`);
    stages = allTemplates["rookie-cut"];
  }

  // Clamp to 3-5 stages
  const min = 3;
  const max = 5;

  if (stages.length < min) {
    console.warn(`[PlanBootstrap] Avatar "${avatarKey}" has < ${min} stages, using all ${stages.length}`);
    return stages;
  }

  if (stages.length > max) {
    console.log(`[PlanBootstrap] Avatar "${avatarKey}" has ${stages.length} stages, clamping to ${max}`);
    return stages.slice(0, max);
  }

  return stages;
}

/**
 * Remove legacy demo chapters (global seed chapters)
 */
async function removeLegacyDemo() {
  const supabase = await createClient();

  // Delete global seed chapters (marked with source='seed' in metadata)
  const { error } = await supabase
    .from("journey_chapters")
    .delete()
    .contains("metadata", { source: "seed" });

  if (error) {
    console.error("[PlanBootstrap] Error removing legacy demos:", error);
    throw new Error("Failed to remove legacy chapters");
  }

  console.log("[PlanBootstrap] Removed legacy demo chapters");
}

/**
 * Create chapters and nodes (tasks) for avatar-based journey
 */
async function upsertChaptersAndTasks(
  userId: string,
  avatarKey: string,
  stages: StageTemplate[]
): Promise<{ chapterIds: string[]; taskCount: number }> {
  const supabase = await createClient();
  const taskTemplates = loadTaskTemplates();

  const chapterIds: string[] = [];
  let totalTaskCount = 0;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    // Generate a slug from the title
    const slug = stage.key || stage.title_he.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Insert global chapter definition with avatar metadata
    const { data: chapter, error: chapterError } = await supabase
      .from("journey_chapters")
      .insert({
        title: stage.title_he,
        subtitle: stage.subtitle_he,
        description: stage.lockedCopy_he,
        slug: slug,
        order_index: i,
        metadata: {
          source: "avatar",
          avatar_key: avatarKey,
          stage_key: stage.key,
          template_order: stage.order,
          created_for_user: userId, // Track which user triggered this chapter creation
        },
      })
      .select("id")
      .single();

    if (chapterError) {
      console.error("[PlanBootstrap] Error inserting chapter:", chapterError);
      throw new Error(`Failed to insert chapter: ${stage.key}`);
    }

    chapterIds.push(chapter.id);
    console.log(`[PlanBootstrap] Created chapter "${stage.title_he}" (${chapter.id.substring(0, 8)})`);

    // Insert nodes (tasks) for this chapter
    const nodeInserts = [];

    for (let j = 0; j < stage.tasks.length; j++) {
      const taskKey = stage.tasks[j];
      const taskTemplate = taskTemplates[taskKey];

      if (!taskTemplate) {
        console.warn(`[PlanBootstrap] Task template "${taskKey}" not found, skipping`);
        continue;
      }

      // Only allow approved task types
      const allowedTypes = ["meal_log", "protein_target", "calorie_window", "weigh_in", "streak_days", "habit_check", "edu_read"];
      if (!allowedTypes.includes(taskTemplate.type)) {
        console.warn(`[PlanBootstrap] Task type "${taskTemplate.type}" not allowed, skipping task "${taskKey}"`);
        continue;
      }

      nodeInserts.push({
        chapter_id: chapter.id,
        type: taskTemplate.type,
        title: taskTemplate.title_he,
        description: taskTemplate.desc_he,
        order_index: j,
        points_reward: taskTemplate.xp,
        cta_route: taskTemplate.ctaRoute,
        icon: getIconForTaskType(taskTemplate.type),
        primary_task: taskTemplate.check,
        conditions_json: {
          check: taskTemplate.check,
          primary: taskTemplate.check,
        },
        metadata: {
          task_key: taskKey,
          cta_text: taskTemplate.cta,
        },
      });
    }

    if (nodeInserts.length > 0) {
      const { error: nodesError } = await supabase
        .from("journey_nodes")
        .insert(nodeInserts);

      if (nodesError) {
        console.error("[PlanBootstrap] Error inserting nodes:", nodesError);
        throw new Error(`Failed to insert nodes for chapter: ${stage.key}`);
      }

      totalTaskCount += nodeInserts.length;
      console.log(`[PlanBootstrap] Created ${nodeInserts.length} nodes for chapter "${stage.title_he}"`);
    }
  }

  return { chapterIds, taskCount: totalTaskCount };
}

/**
 * Get icon emoji for task type
 */
function getIconForTaskType(type: string): string {
  const iconMap: Record<string, string> = {
    meal_log: "🍽️",
    protein_target: "🥩",
    calorie_window: "🎯",
    weigh_in: "⚖️",
    streak_days: "🔥",
    habit_check: "✅",
    edu_read: "📚",
  };
  return iconMap[type] || "📝";
}

/**
 * Main function: Build personalized plan for user based on avatar
 */
export async function buildPlanForAvatar(userId: string, avatarKey: string): Promise<PlanSummary> {
  console.log(`[PlanBootstrap] Building plan for user ${userId.substring(0, 8)} with avatar "${avatarKey}"`);

  // 1. Pick stages
  const stages = pickStages(avatarKey);
  console.log(`[PlanBootstrap] Selected ${stages.length} stages for avatar "${avatarKey}"`);

  // 2. Remove legacy demos
  await removeLegacyDemo();

  // 3. Upsert chapters and tasks
  const { chapterIds, taskCount } = await upsertChaptersAndTasks(userId, avatarKey, stages);

  // 4. Build summary
  const summary: PlanSummary = {
    userId,
    avatarKey,
    chapters: stages.map((s, i) => ({
      id: chapterIds[i],
      title: s.title_he,
      subtitle: s.subtitle_he,
      position: i + 1,
      xp: s.xp,
    })),
    taskCount,
  };

  console.log(`[PlanBootstrap] ✅ Plan created: ${stages.length} chapters, ${taskCount} tasks`);

  return summary;
}

/**
 * Check if there are already avatar-sourced chapters in the system
 */
export async function hasExistingPlan(): Promise<boolean> {
  const supabase = await createClient();

  // Check if there are any chapters with source='avatar' in metadata
  const { data, error } = await supabase
    .from("journey_chapters")
    .select("id")
    .contains("metadata", { source: "avatar" })
    .limit(1);

  if (error) {
    console.error("[PlanBootstrap] Error checking existing plan:", error);
    return false;
  }

  return data && data.length > 0;
}
