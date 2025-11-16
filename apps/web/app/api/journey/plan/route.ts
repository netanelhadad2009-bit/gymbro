import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { buildJourneyFromPersona, derivePersonaFromMetadata, type Persona } from '@/lib/journey/builder';
import { normalizePersona } from '@/lib/persona/normalize';

const LOG_PREFIX = '[JourneyAPI]';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

/**
 * GET /api/journey/plan
 *
 * Generates a personalized journey plan based on user's persona.
 *
 * Persona Source Priority:
 * 1. public.avatars table (if exists and has row for user)
 * 2. Fallback to user metadata + profile
 *
 * ALWAYS returns a persona-specific journey, never fails on missing avatar.
 *
 * Returns:
 *   { ok: true, plan: { chapters, nodes }, persona, persona_source }
 *
 * Errors:
 *   401: Not authenticated
 *   500: Server error
 */
export async function GET() {
  let personaSource: 'avatar' | 'metadata_fallback' = 'metadata_fallback';

  try {
    console.log(`${LOG_PREFIX} GET request received`);

    // Create Supabase server client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component context
            }
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(`${LOG_PREFIX} Authentication failed:`, authError);
      return NextResponse.json(
        { ok: false, error: 'unauthorized', message: 'Not authenticated' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.log(`${LOG_PREFIX} user:`, user.id);

    // Try to fetch avatar from new schema (individual columns)
    let persona: Persona | null = null;
    const { data: avatar, error: avatarError } = await supabase
      .from('avatars')
      .select('user_id, gender, goal, diet, frequency, experience, updated_at')
      .eq('user_id', user.id)
      .single();

    if (avatar && !avatarError) {
      // Avatar exists - use it with normalization for consistency
      console.log(`${LOG_PREFIX} avatar fetch:`, { found: true, updated_at: avatar.updated_at });

      persona = normalizePersona({
        gender: avatar.gender,
        goal: avatar.goal,
        diet: avatar.diet,
        frequency: avatar.frequency,
        experience: avatar.experience,
      });
      personaSource = 'avatar';

      console.log(`${LOG_PREFIX} persona_source: 'avatar'`);
      console.log(`${LOG_PREFIX} normalized persona:`, {
        gender: persona.gender,
        goal: persona.goal,
        diet: persona.diet,
        frequency: persona.frequency,
        experience: persona.experience,
      });
    } else {
      // No avatar or error - fall back to metadata
      if (avatarError) {
        console.log(`${LOG_PREFIX} avatar fetch:`, {
          found: false,
          error: {
            code: avatarError.code,
            message: avatarError.message,
          },
        });

        // Handle specific error codes
        if (avatarError.code === 'PGRST116') {
          // No rows returned from .single() - this is normal for new users
          console.warn(`${LOG_PREFIX} No avatar found for user ${user.id}; using metadata fallback`);
        } else if (avatarError.code === 'PGRST205') {
          console.error(`${LOG_PREFIX} avatars table missing (PGRST205); check migrations!`);
        } else {
          console.error(`${LOG_PREFIX} Avatar fetch error:`, {
            code: avatarError.code,
            message: avatarError.message,
            details: avatarError.details,
            hint: avatarError.hint,
          });
        }
      } else {
        console.log(`${LOG_PREFIX} avatar fetch:`, { found: false });
        console.warn(`${LOG_PREFIX} No avatar found for user ${user.id}; using metadata fallback`);
      }

      // Fallback: derive persona from user metadata or profile
      let metadata = user.user_metadata || {};

      // Try to get from profiles table if metadata is empty
      if (!metadata.gender && !metadata.goal) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gender, goal, goals, diet, training_frequency_actual, experience')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && !profileError) {
          metadata = {
            ...metadata,
            gender: profile.gender,
            goal: profile.goal,
            goals: profile.goals,
            diet: profile.diet,
            training_frequency_actual: profile.training_frequency_actual,
            experience: profile.experience,
          };
        }
      }

      persona = derivePersonaFromMetadata(metadata);
      personaSource = 'metadata_fallback';

      console.log(`${LOG_PREFIX} persona_source: 'metadata'`);
      console.log(`${LOG_PREFIX} derived persona from metadata:`, {
        gender: persona.gender,
        goal: persona.goal,
        diet: persona.diet,
        frequency: persona.frequency,
        experience: persona.experience,
      });
    }

    // Build journey plan from persona
    const plan = buildJourneyFromPersona(persona);

    console.log(`${LOG_PREFIX} journey built:`, {
      user: user.id.substring(0, 8),
      persona_source: personaSource,
      persona: `${persona.gender}/${persona.goal}/${persona.diet}/${persona.frequency}/${persona.experience}`,
      chapters: plan.chapters.length,
      chapterTitles: plan.chapters.map(c => c.name),
      chapterIds: plan.chapters.map(c => c.id),
      nodes: plan.nodes.length,
      nodeTypes: [...new Set(plan.nodes.map(n => n.type))],
    });

    return NextResponse.json(
      {
        ok: true,
        plan,
        persona,
        persona_source: personaSource,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Error:`, {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'server_error',
        message: error?.message || 'Internal server error',
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
