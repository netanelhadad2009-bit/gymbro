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

    const systemPrompt = `You are an expert nutritionist creating personalized meal plans.
You communicate in Hebrew and use Israeli foods and measurements.

Create a structured meal plan based on the user's profile.
Return JSON with this structure:
{
  "plan_name": "string",
  "daily_calories": number,
  "macros": {
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number
  },
  "meals": [
    {
      "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
      "name": "string",
      "ingredients": [
        {
          "name": "string",
          "amount": "string",
          "calories": number,
          "protein": number
        }
      ],
      "total_calories": number,
      "instructions": "string"
    }
  ]
}`;

    const userPrompt = `Create a daily meal plan for:
- Goal: ${profile.goal || 'general health'}
- Weight: ${profile.weight || 70} kg
- Height: ${profile.height || 170} cm
- Activity level: ${profile.activity_level || 'moderate'}
- Dietary restrictions: ${preferences?.restrictions?.join(', ') || 'none'}
- Meals per day: ${preferences?.mealsPerDay || 4}`;

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
        JSON.stringify({ error: 'Failed to parse meal plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const plan = JSON.parse(jsonMatch[0]);

    // Store plan in database
    const serviceClient = createServiceClient();
    const { data: savedPlan, error: saveError } = await serviceClient
      .from('plan_sessions')
      .insert({
        user_id: user.id,
        type: 'nutrition',
        data: plan,
        status: 'active',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save plan error:', saveError);
    }

    return new Response(
      JSON.stringify({ plan, id: savedPlan?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Generate nutrition error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
