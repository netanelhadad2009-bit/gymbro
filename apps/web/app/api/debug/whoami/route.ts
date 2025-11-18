import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireDevelopment, requireAuth } from "@/lib/api/security";

export async function GET(request: NextRequest) {
  // Block in production
  const devGuard = requireDevelopment(request);
  if (devGuard) {
    return devGuard;
  }

  try {
    // Require authentication even in dev
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user } = auth;

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      authenticated: true,
      debug: true,
      environment: process.env.NODE_ENV
    });
  } catch (error: any) {
    return NextResponse.json({
      userId: null,
      error: error.message
    }, { status: 500 });
  }
}
