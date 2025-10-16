import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Mock API] /ai/commit received:', body);

    // Return mock success response
    return NextResponse.json({
      ok: true,
      id: `program_${Date.now()}`,
      message: 'Program saved successfully'
    });
  } catch (error) {
    console.error('[Mock API] /ai/commit error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to save program' },
      { status: 500 }
    );
  }
}