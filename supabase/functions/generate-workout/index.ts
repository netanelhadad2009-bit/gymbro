import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, createServiceClient } from '../_shared/supabase.ts';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.25.0';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
});

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createSupabaseClient(req);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { profile, preferences } = await req.json();

    // Get exercises from database for reference
    const serviceClient = createServiceClient();
    const { data: exercises } = await serviceClient
      .from('exercises')
      .select('id, name, name_he, muscle_group, equipment, difficulty')
      .limit(200);

    const systemPrompt = `You are an expert fitness coach creating personalized workout programs.
You communicate in Hebrew.

Available exercises in database (use these exact names):
${exercises?.map(e => `- ${e.name_he || e.name} (${e.muscle_group}, ${e.equipment})`).join('\n').slice(0, 3000)}

Create a structured workout program based on the user's profile.
Return JSON with this structure:
{
  "program_name": "string",
  "duration_weeks": number,
  "workouts_per_week": number,
  "workouts": [
    {
      "day": number,
      "name": "string",
      "exercises": [
        {
          "name": "string",
          "sets": number,
          "reps": "string",
          "rest_seconds": number,
          "notes": "string"
        }
      ]
    }
  ]
}`;

    const userPrompt = `Create a workout program for:
- Goal: ${profile.goal || 'general fitness'}
- Experience: ${profile.experience || 'beginner'}
- Available equipment: ${profile.equipment || 'full gym'}
- Days per week: ${preferences?.daysPerWeek || 3}
- Session duration: ${preferences?.sessionDuration || 45} minutes`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse workout program' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const program = JSON.parse(jsonMatch[0]);

    // Store program in database
    const { data: savedProgram, error: saveError } = await serviceClient
      .from('programs')
      .insert({
        user_id: user.id,
        name: program.program_name,
        duration_weeks: program.duration_weeks,
        workouts_per_week: program.workouts_per_week,
        raw_data: program,
        status: 'active',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save program error:', saveError);
    }

    return new Response(
      JSON.stringify({ program, id: savedProgram?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Generate workout error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
