/**
 * Stage Persistence - Save/load stages to/from database
 *
 * Handles idempotent stage creation and updates
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BuiltStage } from './builder';

export interface SavedStage {
  id: string;
  user_id: string;
  stage_index: number;
  code: string;
  title_he: string;
  subtitle_he?: string;
  color_hex: string;
  is_unlocked: boolean;
  is_completed: boolean;
  unlocked_at?: string; // Timestamp when stage was unlocked (for filtering task progress)
  created_at: string;
  updated_at: string;
}

export interface SavedTask {
  id: string;
  user_stage_id: string;
  order_index: number;
  key_code: string;
  title_he: string;
  desc_he?: string;
  points: number;
  condition_json: any;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Save user stages to database (idempotent)
 * If stages already exist for user, returns existing stages
 */
export async function saveUserStages(
  supabase: SupabaseClient,
  userId: string,
  stages: BuiltStage[]
): Promise<{ created: number; existing: boolean }> {
  // Check if stages already exist for user
  const { data: existingStages, error: checkError } = await supabase
    .from('user_stages')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (checkError) {
    console.error('[PersistStages] Error checking existing stages:', checkError);
    throw new Error(`Failed to check existing stages: ${checkError.message}`);
  }

  if (existingStages && existingStages.length > 0) {
    console.log('[PersistStages] Stages already exist for user:', userId.substring(0, 8));
    return { created: 0, existing: true };
  }

  // Insert stages
  let createdCount = 0;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageIndex = i + 1;

    // Insert stage
    const isFirstStage = stageIndex === 1;
    const { data: insertedStage, error: stageError } = await supabase
      .from('user_stages')
      .insert({
        user_id: userId,
        stage_index: stageIndex,
        code: stage.code,
        title_he: stage.title_he,
        subtitle_he: stage.subtitle_he,
        color_hex: stage.color_hex,
        is_unlocked: isFirstStage, // Only first stage (stageIndex 1) starts unlocked
        is_completed: false,
        unlocked_at: isFirstStage ? new Date().toISOString() : null, // Set unlocked_at for first stage
      })
      .select()
      .single();

    if (stageError) {
      console.error('[PersistStages] Error inserting stage:', stageError);
      throw new Error(`Failed to insert stage: ${stageError.message}`);
    }

    if (!insertedStage) {
      throw new Error('Failed to get inserted stage ID');
    }

    // Insert tasks for this stage
    for (let j = 0; j < stage.tasks.length; j++) {
      const task = stage.tasks[j];

      const { error: taskError } = await supabase
        .from('user_stage_tasks')
        .insert({
          user_stage_id: insertedStage.id,
          order_index: j,
          key_code: task.key_code,
          title_he: task.title_he,
          desc_he: task.desc_he,
          points: task.points || 10,
          condition_json: task.condition_json,
          is_completed: false,
        });

      if (taskError) {
        console.error('[PersistStages] Error inserting task:', taskError);
        throw new Error(`Failed to insert task: ${taskError.message}`);
      }
    }

    createdCount++;
  }

  console.log('[PersistStages] Created stages for user:', {
    userId: userId.substring(0, 8),
    count: createdCount,
  });

  return { created: createdCount, existing: false };
}

/**
 * Get user stages with tasks
 */
export async function getUserStages(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<SavedStage & { tasks: SavedTask[] }>> {
  // Get stages
  const { data: stages, error: stagesError } = await supabase
    .from('user_stages')
    .select('*')
    .eq('user_id', userId)
    .order('stage_index', { ascending: true });

  if (stagesError) {
    console.error('[PersistStages] Error fetching stages:', stagesError);
    throw new Error(`Failed to fetch stages: ${stagesError.message}`);
  }

  if (!stages || stages.length === 0) {
    return [];
  }

  // Get tasks for all stages
  const stageIds = stages.map(s => s.id);
  const { data: tasks, error: tasksError } = await supabase
    .from('user_stage_tasks')
    .select('*')
    .in('user_stage_id', stageIds)
    .order('order_index', { ascending: true });

  if (tasksError) {
    console.error('[PersistStages] Error fetching tasks:', tasksError);
    throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  }

  // Group tasks by stage
  const tasksByStage = new Map<string, SavedTask[]>();
  tasks?.forEach(task => {
    if (!tasksByStage.has(task.user_stage_id)) {
      tasksByStage.set(task.user_stage_id, []);
    }
    tasksByStage.get(task.user_stage_id)!.push(task);
  });

  // Combine stages with tasks
  return stages.map(stage => ({
    ...stage,
    tasks: tasksByStage.get(stage.id) || [],
  }));
}

/**
 * Mark task as completed
 */
export async function completeTask(
  supabase: SupabaseClient,
  userId: string,
  stageId: string,
  taskId: string
): Promise<{ success: boolean; unlockedNext: boolean; stageCompleted: boolean }> {
  // Verify task belongs to user's stage
  const { data: task, error: taskError } = await supabase
    .from('user_stage_tasks')
    .select('*, user_stages!inner(user_id, id, stage_index)')
    .eq('id', taskId)
    .eq('user_stage_id', stageId)
    .single();

  if (taskError || !task) {
    console.error('[PersistStages] Task not found or access denied');
    throw new Error('Task not found or access denied');
  }

  if ((task.user_stages as any).user_id !== userId) {
    throw new Error('Unauthorized: task does not belong to user');
  }

  // Mark task as completed
  const { error: updateError } = await supabase
    .from('user_stage_tasks')
    .update({ is_completed: true })
    .eq('id', taskId);

  if (updateError) {
    console.error('[PersistStages] Error updating task:', updateError);
    throw new Error(`Failed to complete task: ${updateError.message}`);
  }

  // Check if all tasks in stage are completed
  const { data: allTasks } = await supabase
    .from('user_stage_tasks')
    .select('is_completed')
    .eq('user_stage_id', stageId);

  const allCompleted = allTasks?.every(t => t.is_completed) || false;
  let unlockedNext = false;

  if (allCompleted) {
    // Mark stage as completed
    await supabase
      .from('user_stages')
      .update({ is_completed: true })
      .eq('id', stageId);

    // Unlock next stage
    const currentStageIndex = (task.user_stages as any).stage_index;
    const { data: nextStage } = await supabase
      .from('user_stages')
      .select('id')
      .eq('user_id', userId)
      .eq('stage_index', currentStageIndex + 1)
      .single();

    if (nextStage) {
      await supabase
        .from('user_stages')
        .update({
          is_unlocked: true,
          unlocked_at: new Date().toISOString(), // Record when stage was unlocked
        })
        .eq('id', nextStage.id);

      unlockedNext = true;
    }
  }

  return {
    success: true,
    unlockedNext,
    stageCompleted: allCompleted,
  };
}

/**
 * Get active stage (first unlocked, incomplete stage)
 */
export async function getActiveStage(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedStage | null> {
  const { data, error } = await supabase
    .from('user_stages')
    .select('*')
    .eq('user_id', userId)
    .eq('is_unlocked', true)
    .eq('is_completed', false)
    .order('stage_index', { ascending: true })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[PersistStages] Error fetching active stage:', error);
    return null;
  }

  return data || null;
}
