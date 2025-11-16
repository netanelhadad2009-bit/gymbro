import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getWeightSeries, getDailyNutrition, getKpis } from "@/lib/progress/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_RANGES = ["7d", "14d", "30d", "90d"] as const;
type Range = typeof VALID_RANGES[number];

function parseDays(range: string): number {
  switch (range) {
    case "7d":
      return 7;
    case "14d":
      return 14;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 30;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { range: string } }
) {
  const startTime = Date.now();

  try {
    const range = params.range;

    if (!VALID_RANGES.includes(range as Range)) {
      return NextResponse.json(
        { ok: false, error: "Invalid range. Must be one of: 7d, 14d, 30d, 90d" },
        { status: 400 }
      );
    }

    // Auth
    const supabase = supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.error("[Progress API] Unauthorized:", userErr);
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const days = parseDays(range);

    if (process.env.LOG_PROGRESS === "1") {
      console.log(`[Progress API] Fetching ${range} (${days}d) for user:`, user.id.slice(0, 8));
    }

    // Fetch data in parallel
    const [kpis, weight, nutrition] = await Promise.all([
      getKpis(supabase, user.id),
      getWeightSeries(supabase, user.id, days),
      getDailyNutrition(supabase, user.id, days),
    ]);

    const latency = Date.now() - startTime;

    if (process.env.LOG_PROGRESS === "1") {
      console.log(`[Progress API] ✓ Completed in ${latency}ms:`, {
        kpis: !!kpis,
        weightPoints: weight.length,
        nutritionDays: nutrition.length,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        kpis,
        weight,
        nutrition,
        latencyMs: latency,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
          "X-Latency-Ms": latency.toString(),
        },
      }
    );
  } catch (error: any) {
    const latency = Date.now() - startTime;
    console.error("[Progress API] Error:", error?.message || error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Internal server error",
        latencyMs: latency,
      },
      { status: 500 }
    );
  }
}
