import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  try {
    const store = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (key) => store.get(key)?.value,
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error("[API] /api/auth/session error:", error);
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: !!session,
      userId: session?.user?.id || null,
    });
  } catch (error) {
    console.error("[API] /api/auth/session exception:", error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
