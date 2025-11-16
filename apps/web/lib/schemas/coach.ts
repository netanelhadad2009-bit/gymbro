import { z } from "zod";

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type Coach = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  credentials: string | null;
  rating: number | null;
  languages: string[];
  tz: string;
  created_at: string;
  updated_at: string;
};

export type CoachAssignment = {
  id: string;
  user_id: string;
  coach_id: string;
  status: "active" | "pending" | "ended";
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CoachMessage = {
  id: string;
  assignment_id: string;
  sender: "user" | "coach";
  content: string;
  attachments: any[];
  created_at: string;
};

export type CoachTask = {
  id: string;
  assignment_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_by: "coach" | "system";
  created_at: string;
  updated_at: string;
};

export type CoachTaskCompletion = {
  id: string;
  task_id: string;
  user_id: string;
  completed_at: string;
  note: string | null;
  created_at: string;
};

export type CoachSession = {
  id: string;
  assignment_id: string;
  start_t: string;
  end_t: string;
  kind: "video" | "in_person" | "gym";
  meet_url: string | null;
  location: string | null;
  status: "scheduled" | "completed" | "canceled";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Checkin = {
  id: string;
  assignment_id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  mood: number | null;
  energy: number | null;
  note: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
};

// ============================================================================
// EXTENDED TYPES (with relations)
// ============================================================================

export type CoachTaskWithCompletion = CoachTask & {
  completion: CoachTaskCompletion | null;
};

export type CoachAssignmentWithCoach = CoachAssignment & {
  coach: Coach;
};

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const createCheckinSchema = z.object({
  assignment_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: z.number().min(0).max(500).optional(),
  mood: z.number().int().min(0).max(5).optional(),
  energy: z.number().int().min(0).max(5).optional(),
  note: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).max(3).optional(),
});

export const createSessionSchema = z.object({
  assignment_id: z.string().uuid(),
  start_t: z.string().datetime(),
  end_t: z.string().datetime(),
  kind: z.enum(["video", "in_person", "gym"]),
  meet_url: z.string().url().optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const sendMessageSchema = z.object({
  assignment_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  attachments: z.array(z.any()).optional(),
});

export const toggleTaskSchema = z.object({
  task_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export type GetCoachProfileResponse = {
  coach: Coach;
  assignment: CoachAssignment;
  responseTime: string; // e.g., "בד\"כ בתוך 4 שעות"
};

export type GetUpcomingSessionResponse = {
  session: CoachSession | null;
};

export type GetTasksResponse = {
  tasks: CoachTaskWithCompletion[];
};

export type GetCheckinsResponse = {
  checkins: Checkin[];
};

export type GetMessagesResponse = {
  messages: CoachMessage[];
};

export type CreateCheckinInput = z.infer<typeof createCheckinSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ToggleTaskInput = z.infer<typeof toggleTaskSchema>;
