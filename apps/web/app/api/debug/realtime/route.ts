import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { createBrowserClient } from "@supabase/ssr";
import { requireDevelopment, requireAuth, handleApiError } from "@/lib/api/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Block in production
  const devGuard = requireDevelopment(request);
  if (devGuard) {
    return devGuard;
  }

  const startTime = Date.now();
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
  };

  try {
    // Require authentication even in dev
    const auth = await requireAuth();
    if (!auth.success) {
      diagnostics.errors.push("Not authenticated - cannot test realtime");
      return NextResponse.json({ ok: false, ...diagnostics }, { status: 401 });
    }
    const { user, supabase } = auth;
    
    diagnostics.checks.auth = {
      authenticated: true,
      userId: user.id.substring(0, 8) + "...",
      error: null,
    };

    // 2. Check if ai_messages table has RLS SELECT policy
    const { data: messages, error: selectErr } = await supabase
      .from("ai_messages")
      .select("id, role, created_at")
      .eq("user_id", user.id)
      .limit(1);

    diagnostics.checks.rls_select = {
      canSelect: !selectErr,
      messageCount: messages?.length || 0,
      error: selectErr?.message || null,
    };

    if (selectErr) {
      diagnostics.errors.push(`RLS SELECT blocked: ${selectErr.message}`);
    }

    // 3. Check publication
    const { data: pubTables, error: pubErr } = await supabase
      .from("pg_publication_tables")
      .select("*")
      .eq("pubname", "supabase_realtime")
      .eq("tablename", "ai_messages");

    diagnostics.checks.publication = {
      inRealtime: (pubTables?.length || 0) > 0,
      error: pubErr?.message || null,
    };

    if ((pubTables?.length || 0) === 0) {
      diagnostics.errors.push("ai_messages NOT in supabase_realtime publication!");
    }

    // 4. Test client-side realtime connection (simulated)
    const clientUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const clientKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    diagnostics.checks.clientConfig = {
      hasUrl: !!clientUrl,
      hasAnonKey: !!clientKey,
      urlPreview: clientUrl?.substring(0, 30) + "...",
    };

    // 5. Insert test message and check if it's visible
    const testContent = `[Realtime Test ${Date.now()}]`;
    const { data: testMsg, error: insertErr } = await supabase
      .from("ai_messages")
      .insert({
        user_id: user.id,
        role: "user",
        content: testContent,
      })
      .select()
      .single();

    diagnostics.checks.insert = {
      success: !insertErr,
      messageId: testMsg?.id?.substring(0, 8) + "..." || null,
      error: insertErr?.message || null,
    };

    if (insertErr) {
      diagnostics.errors.push(`Insert failed: ${insertErr.message}`);
    }

    // 6. Check if message is immediately readable
    if (testMsg) {
      const { data: readBack, error: readErr } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("id", testMsg.id)
        .single();

      diagnostics.checks.readAfterInsert = {
        success: !readErr,
        found: !!readBack,
        error: readErr?.message || null,
      };

      // Clean up test message
      await supabase.from("ai_messages").delete().eq("id", testMsg.id);
    }

    // 7. Summary
    const latencyMs = Date.now() - startTime;
    const allChecks = Object.values(diagnostics.checks).every((check: any) => 
      check.success !== false && !check.error
    );

    return NextResponse.json({
      ok: allChecks && diagnostics.errors.length === 0,
      latencyMs,
      ...diagnostics,
      recommendations: generateRecommendations(diagnostics),
    });

  } catch (error: any) {
    diagnostics.errors.push(`Unexpected error: ${error.message}`);
    return NextResponse.json({
      ok: false,
      latencyMs: Date.now() - startTime,
      ...diagnostics,
      error: error.message,
    }, { status: 500 });
  }
}

function generateRecommendations(diagnostics: any): string[] {
  const recommendations: string[] = [];

  if (!diagnostics.checks.auth?.authenticated) {
    recommendations.push("Log in to test realtime properly");
  }

  if (!diagnostics.checks.rls_select?.canSelect) {
    recommendations.push("Fix RLS SELECT policy on ai_messages table");
  }

  if (!diagnostics.checks.publication?.inRealtime) {
    recommendations.push("Run: ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;");
  }

  if (diagnostics.checks.insert && !diagnostics.checks.insert.success) {
    recommendations.push("Fix INSERT permissions on ai_messages");
  }

  if (recommendations.length === 0) {
    recommendations.push("All server checks pass. If realtime still doesn't work, check browser console for WebSocket errors.");
  }

  return recommendations;
}
