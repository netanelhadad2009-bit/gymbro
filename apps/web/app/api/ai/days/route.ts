import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Mock API] /ai/days received:', body);

    // Return mock response with calculated days
    return NextResponse.json({
      ok: true,
      days: 90, // Default 90 days program
    });
  } catch (error) {
    console.error('[Mock API] /ai/days error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to calculate days' },
      { status: 500 }
    );
  }
}