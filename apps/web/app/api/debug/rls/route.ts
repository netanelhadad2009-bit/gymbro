import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireDevelopment, requireAuth, handleApiError } from '@/lib/api/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * RLS Diagnostic Endpoint (DEV ONLY)
 *
 * Tests ai_messages table RLS policies:
 * 1. Confirms RLS is enabled
 * 2. Lists all policies and validates auth.uid() enforcement
 * 3. Runs impersonation test (counts only)
 * 4. Tests live insert/select for current user
 *
 * Usage:
 *   GET http://localhost:3000/api/debug/rls
 *   or: pnpm doctor:rls
 */

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
    const { user: currentUser, supabase: userClient } = auth;

    const admin = createAdminClient();

    console.log('[RLS Diagnostic] Current user:', currentUser?.id);

    // 1) RLS status
    const { data: rlsStatus, error: rlsErr } = await admin
      .from('v_ai_messages_rls_status')
      .select('*')
      .single();

    if (rlsErr) {
      console.error('[RLS Diagnostic] Failed to fetch RLS status:', rlsErr);
    }

    // 2) Policies
    const { data: policies, error: polErr } = await admin
      .from('v_ai_messages_policies')
      .select('*');

    if (polErr) {
      console.error('[RLS Diagnostic] Failed to fetch policies:', polErr);
    }

    // 3) Impersonation test: use current user id
    const targetUserId = currentUser.id;

    console.log('[RLS Diagnostic] Running impersonation test for user:', targetUserId);

    const { data: impResult, error: impErr } = await admin
      .rpc('debug_ai_messages_impersonation', { _user_id: targetUserId });

    if (impErr) {
      console.error('[RLS Diagnostic] Impersonation test failed:', impErr);
    }

    // 4) Live app test for the current user (insert+select self)
    let liveInsert: any = null;
    let liveSelect: any = null;
    let liveErr: any = null;

    console.log('[RLS Diagnostic] Running live app test...');

    const payload = {
      user_id: currentUser.id,
      role: 'user' as const,
      content: '__diagnostic__',
      profile_snapshot: {},
    };

    // Test INSERT
    const ins = await userClient
      .from('ai_messages')
      .insert(payload)
      .select('id')
      .single();

    if (ins.error) {
      console.error('[RLS Diagnostic] Insert failed:', ins.error);
      liveErr = { stage: 'insert', ...ins.error };
    } else {
      liveInsert = ins.data;
      console.log('[RLS Diagnostic] Insert successful:', ins.data.id);
    }

    // Test SELECT
    const sel = await userClient
      .from('ai_messages')
      .select('id, role, content, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (sel.error) {
      console.error('[RLS Diagnostic] Select failed:', sel.error);
      liveErr = liveErr || { stage: 'select', ...sel.error };
    } else {
      liveSelect = sel.data;
      console.log('[RLS Diagnostic] Select successful, rows:', sel.data.length);
    }

    // Build response
    const response = {
      ok: true,
      timestamp: new Date().toISOString(),
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
      },
      rlsStatus: {
        data: rlsStatus,
        error: rlsErr,
      },
      policies: {
        data: policies,
        count: policies?.length ?? 0,
        error: polErr,
      },
      impersonation: {
        user_id: targetUserId,
        seen_count: Array.isArray(impResult) ? impResult[0]?.seen_count ?? null : null,
        error: impErr ?? null,
      },
      liveAppTest: {
        insertId: liveInsert?.id ?? null,
        recentRows: liveSelect ?? null,
        rowCount: liveSelect?.length ?? 0,
        error: liveErr,
      },
    };

    console.log('[RLS Diagnostic] Test completed successfully');

    return NextResponse.json(response);
  } catch (e: any) {
    console.error('[RLS Diagnostic] Unexpected error:', e);
    return handleApiError(e, 'RLS-Diagnostic');
  }
}
