import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'UP',
    message: 'API health: OK',
    timestamp: Date.now(),
  });
}
