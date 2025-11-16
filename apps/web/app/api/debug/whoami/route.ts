import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json({
        userId: null,
        error: error.message
      }, { status: 401 });
    }

    return NextResponse.json({
      userId: user?.id ?? null,
      email: user?.email ?? null,
      authenticated: !!user
    });
  } catch (error: any) {
    return NextResponse.json({
      userId: null,
      error: error.message
    }, { status: 500 });
  }
}
