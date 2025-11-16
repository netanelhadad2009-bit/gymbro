import { NextResponse } from "next/server";
import {
  getTargetWeightKg,
  getDeadlinePlus4Months,
} from "@/lib/onboarding/resultsData";

export async function GET() {
  try {
    const [targetKg, deadline] = await Promise.all([
      getTargetWeightKg(),
      getDeadlinePlus4Months(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        targetKg,
        deadline,
      },
    });
  } catch (error) {
    console.error("[ResultsMeta API] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to fetch results metadata",
      },
      { status: 500 }
    );
  }
}
