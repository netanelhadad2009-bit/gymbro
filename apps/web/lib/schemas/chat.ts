import { z } from "zod";

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type ChatThread = {
  id: string;
  assignment_id: string;
  user_id: string;
  coach_id: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: "user" | "coach";
  body: string | null;
  attachment_url: string | null;
  attachment_type: "image" | "audio" | "file" | null;
  delivered_at: string | null;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
};

export type ChatPresence = {
  thread_id: string;
  user_id: string;
  role: "user" | "coach";
  typing: boolean;
  last_seen: string;
};

// ============================================================================
// CLIENT-SIDE TYPES
// ============================================================================

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "error";

export type ClientMessage = ChatMessage & {
  status?: MessageStatus;
  error?: string;
  optimistic?: boolean;
};

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const sendMessageSchema = z.object({
  thread_id: z.string().uuid(),
  body: z.string().min(1).max(10000).optional(),
  attachment: z
    .object({
      name: z.string(),
      type: z.enum(["image", "audio", "file"]),
      bytes: z.string(), // base64
    })
    .optional(),
}).refine(
  (data) => data.body || data.attachment,
  { message: "Either body or attachment must be provided" }
);

export const markReadSchema = z.object({
  thread_id: z.string().uuid(),
  message_ids: z.array(z.string().uuid()).min(1),
});

export const presenceSchema = z.object({
  thread_id: z.string().uuid(),
  typing: z.boolean(),
});

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export type GetThreadResponse = {
  thread: ChatThread;
  messages: ChatMessage[];
  hasMore: boolean;
};

export type SendMessageResponse = {
  message: ChatMessage;
};

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type PresenceInput = z.infer<typeof presenceSchema>;
