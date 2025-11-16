import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveAvatar, getAvatarById, type OnboardingAnswers } from '@/lib/avatar/resolveAvatar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/avatar
 * Returns user's assigned avatar, or resolves and assigns one if missing
 */
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has an avatar assigned
    const { data: existingAvatar, error: fetchError } = await supabase
      .from('avatars')
      .select('avatar_id, confidence, matched_rules, reasons, created_at, updated_at')
      .eq('user_id', user.id)
      .single();

    if (existingAvatar && !fetchError) {
      // Avatar exists, return it with full details
      const avatarDetails = getAvatarById(existingAvatar.avatar_id);
      return NextResponse.json({
        avatarId: existingAvatar.avatar_id,
        confidence: existingAvatar.confidence,
        matchedRules: existingAvatar.matched_rules,
        reasons: existingAvatar.reasons,
        assignedAt: existingAvatar.created_at,
        updatedAt: existingAvatar.updated_at,
        details: avatarDetails,
      });
    }

    // No avatar assigned yet, resolve one based on profile/onboarding data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Build OnboardingAnswers from profile
    const answers: OnboardingAnswers = {
      goal: profile.goal || undefined,
      experience: profile.experience || undefined,
      frequency: profile.training_frequency_actual || profile.frequency || undefined,
      activity: profile.activity || undefined,
      diet: profile.diet || undefined,
      height_cm: profile.height_cm || undefined,
      weight_kg: profile.weight_kg || undefined,
      bmi: profile.bmi || undefined,
      gender: profile.gender || undefined,
      birthdate: profile.birthdate || undefined,
    };

    // Resolve avatar
    const resolved = resolveAvatar(answers);

    // Save to database (insert into unified avatars table)
    const { error: insertError } = await supabase
      .from('avatars')
      .insert({
        user_id: user.id,
        avatar_id: resolved.avatarId,
        confidence: resolved.confidence,
        matched_rules: resolved.matchedRules,
        reasons: resolved.reasons,
        // Include placeholder persona fields (these should be filled from profile)
        gender: answers.gender || 'male',
        goal: answers.goal || 'maintain',
        diet: answers.diet || 'balanced',
        frequency: answers.frequency || 'medium',
        experience: answers.experience || 'beginner',
      });

    if (insertError) {
      console.error('Failed to save avatar assignment:', insertError);
      // Return resolved avatar anyway, even if save fails
    }

    // Get avatar details
    const avatarDetails = getAvatarById(resolved.avatarId);

    return NextResponse.json({
      avatarId: resolved.avatarId,
      confidence: resolved.confidence,
      matchedRules: resolved.matchedRules,
      reasons: resolved.reasons,
      assignedAt: new Date().toISOString(),
      details: avatarDetails,
    });
  } catch (error) {
    console.error('Error in GET /api/avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/avatar/bootstrap
 * Recomputes and updates user's avatar assignment based on current profile data
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with service role for upsert
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Build OnboardingAnswers from profile
    const answers: OnboardingAnswers = {
      goal: profile.goal || undefined,
      experience: profile.experience || undefined,
      frequency: profile.training_frequency_actual || profile.frequency || undefined,
      activity: profile.activity || undefined,
      diet: profile.diet || undefined,
      height_cm: profile.height_cm || undefined,
      weight_kg: profile.weight_kg || undefined,
      bmi: profile.bmi || undefined,
      gender: profile.gender || undefined,
      birthdate: profile.birthdate || undefined,
    };

    // Resolve avatar
    const resolved = resolveAvatar(answers);

    // Upsert to unified avatars table (update if exists, insert if not)
    const { error: upsertError } = await supabaseAdmin
      .from('avatars')
      .upsert(
        {
          user_id: user.id,
          avatar_id: resolved.avatarId,
          confidence: resolved.confidence,
          matched_rules: resolved.matchedRules,
          reasons: resolved.reasons,
          // Update persona fields from profile
          gender: answers.gender || 'male',
          goal: answers.goal || 'maintain',
          diet: answers.diet || 'balanced',
          frequency: answers.frequency || 'medium',
          experience: answers.experience || 'beginner',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      console.error('Failed to upsert avatar assignment:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save avatar assignment' },
        { status: 500 }
      );
    }

    // Get avatar details
    const avatarDetails = getAvatarById(resolved.avatarId);

    return NextResponse.json({
      success: true,
      avatarId: resolved.avatarId,
      confidence: resolved.confidence,
      matchedRules: resolved.matchedRules,
      reasons: resolved.reasons,
      details: avatarDetails,
    });
  } catch (error) {
    console.error('Error in POST /api/avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
