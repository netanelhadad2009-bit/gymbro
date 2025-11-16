import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessageSchema } from "@/lib/schemas/chat";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/send
 * Send a message (text and/or attachment)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = sendMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify user is member of thread
    const { data: thread, error: threadError } = await supabase
      .from("coach_threads")
      .select("user_id, coach_id")
      .eq("id", data.thread_id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    if (thread.user_id !== user.id && thread.coach_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Determine sender role
    const senderRole = thread.user_id === user.id ? "user" : "coach";

    // Handle attachment upload if present
    let attachmentUrl: string | null = null;
    let attachmentType: string | null = null;

    if (data.attachment) {
      try {
        // Decode base64 and upload to Supabase Storage
        const { name, type, bytes } = data.attachment;
        const buffer = Buffer.from(bytes, "base64");

        // Generate unique filename
        const ext = name.split(".").pop() || "bin";
        const filename = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-uploads")
          .upload(filename, buffer, {
            contentType: getContentType(type, ext),
            upsert: false,
          });

        if (uploadError) {
          console.error("[POST /api/chat/send] Upload error:", uploadError);
          return NextResponse.json(
            { error: "Failed to upload attachment" },
            { status: 500 }
          );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("chat-uploads")
          .getPublicUrl(filename);

        attachmentUrl = urlData.publicUrl;
        attachmentType = type;
      } catch (uploadErr) {
        console.error("[POST /api/chat/send] Attachment error:", uploadErr);
        return NextResponse.json(
          { error: "Failed to process attachment" },
          { status: 500 }
        );
      }
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from("coach_chat_messages")
      .insert({
        thread_id: data.thread_id,
        sender_id: user.id,
        sender_role: senderRole,
        body: data.body || null,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/chat/send] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { message },
    });
  } catch (error) {
    console.error("[POST /api/chat/send] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to get content type
function getContentType(type: string, ext: string): string {
  if (type === "image") {
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };
    return mimeTypes[ext.toLowerCase()] || "image/jpeg";
  }

  if (type === "audio") {
    const mimeTypes: Record<string, string> = {
      m4a: "audio/mp4",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    };
    return mimeTypes[ext.toLowerCase()] || "audio/mp4";
  }

  return "application/octet-stream";
}
