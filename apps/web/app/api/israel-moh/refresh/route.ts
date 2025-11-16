/**
 * Israeli MoH Dataset Refresh Endpoint
 * POST /api/israel-moh/refresh
 *
 * Fetches latest nutrition data from data.gov.il and updates local cache
 * Protected endpoint - only for admin/cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchIsraelMoHDataset } from '@/lib/clients/israelMoH';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[IsraelMoH API] Refresh request received');

  try {
    // Optional: Add authentication/authorization here
    // For now, allow in development, or check for admin token
    const isDev = process.env.NODE_ENV === 'development';
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ISRAEL_MOH_REFRESH_TOKEN; // Optional admin token

    // If token is configured, verify it
    if (!isDev && expectedToken) {
      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        console.warn('[IsraelMoH API] Unauthorized refresh attempt');
        return NextResponse.json(
          { ok: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Trigger dataset refresh
    console.log('[IsraelMoH API] Starting dataset refresh...');
    const updatedCount = await fetchIsraelMoHDataset();

    console.log(`[IsraelMoH API] Refresh complete: ${updatedCount} products updated`);

    return NextResponse.json({
      ok: true,
      updatedCount,
      timestamp: new Date().toISOString(),
      message: `Successfully refreshed ${updatedCount} Israeli products`,
    });
  } catch (error: any) {
    console.error('[IsraelMoH API] Refresh failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Dataset refresh failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support GET for testing/status check
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/israel-moh/refresh',
    method: 'POST',
    description: 'Refresh Israeli MoH nutrition dataset from data.gov.il',
    authentication: 'Optional Bearer token (ISRAEL_MOH_REFRESH_TOKEN)',
  });
}
