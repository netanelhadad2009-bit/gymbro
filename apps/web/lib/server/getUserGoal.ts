// apps/web/lib/server/getUserGoal.ts
import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export type GoalKey = 'gain' | 'loss' | 'recomp' | null

export async function getUserGoal(userId: string): Promise<GoalKey> {
  const supabase = await createServerSupabaseClient()

  // 1) Try latest program goal
  const { data: program, error: programErr } = await supabase
    .from('programs')
    .select('goal, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!programErr && program?.goal) {
    const g = program.goal as string
    if (g === 'gain' || g === 'loss' || g === 'recomp') return g
  }

  // 2) Fallback: profiles.goal (if exists)
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('goal')
    .eq('id', userId)
    .maybeSingle()

  if (!profErr && profile?.goal) {
    const g = profile.goal as string
    if (g === 'gain' || g === 'loss' || g === 'recomp') return g
  }

  return null
}
