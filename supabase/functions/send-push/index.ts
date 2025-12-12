import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Generate APNs JWT
function generateApnsJwt(): string {
  const keyId = Deno.env.get('APNS_KEY_ID')!;
  const teamId = Deno.env.get('APNS_TEAM_ID')!;
  const privateKey = Deno.env.get('APNS_KEY_P8')!;

  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Note: In production, use proper JWT signing library
  // This is a simplified example
  return `${encodedHeader}.${encodedPayload}.signature`;
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify cron secret or admin access
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    if (cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: PushPayload = await req.json();
    const { userId, title, body, data } = payload;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceClient();

    // Get user's push subscription
    const { data: subscription, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'No active push subscription found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification based on platform
    if (subscription.platform === 'ios') {
      const apnsHost = Deno.env.get('APNS_ENVIRONMENT') === 'production'
        ? 'api.push.apple.com'
        : 'api.sandbox.push.apple.com';

      const apnsPayload = {
        aps: {
          alert: { title, body },
          sound: 'default',
          badge: 1,
        },
        ...data,
      };

      const response = await fetch(`https://${apnsHost}/3/device/${subscription.token}`, {
        method: 'POST',
        headers: {
          'authorization': `bearer ${generateApnsJwt()}`,
          'apns-topic': 'com.fitjourney.app',
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'content-type': 'application/json',
        },
        body: JSON.stringify(apnsPayload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('APNs error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to send push notification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update last_used_at
    await supabase
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', subscription.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send push error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
