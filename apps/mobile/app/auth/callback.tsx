/**
 * OAuth Callback Handler
 * Handles deep link callbacks from OAuth providers (Google, Apple)
 * URL format: fitjourney://auth/callback#access_token=...&refresh_token=...
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      console.log('[AuthCallback] Processing OAuth callback...');
      console.log('[AuthCallback] URL params:', params);

      // Extract tokens from URL hash/query parameters
      // Supabase sends tokens in the URL hash: #access_token=...&refresh_token=...
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;
      const error = params.error as string;
      const errorDescription = params.error_description as string;

      if (error) {
        console.error('[AuthCallback] OAuth error:', error, errorDescription);
        router.replace('/(auth)/login');
        return;
      }

      if (!accessToken) {
        console.error('[AuthCallback] No access token received');
        router.replace('/(auth)/login');
        return;
      }

      console.log('[AuthCallback] Setting session...');

      // Set the session in Supabase
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (sessionError) {
        console.error('[AuthCallback] Session error:', sessionError);
        router.replace('/(auth)/login');
        return;
      }

      console.log('[AuthCallback] Session set successfully, redirecting...');

      // Redirect to home screen
      router.replace('/(app)');
    } catch (error) {
      console.error('[AuthCallback] Error processing callback:', error);
      router.replace('/(auth)/login');
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#10b981" />
      <Text className="mt-4 text-foreground">Completing sign in...</Text>
    </View>
  );
}
