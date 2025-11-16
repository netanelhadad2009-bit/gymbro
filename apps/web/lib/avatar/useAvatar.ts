/**
 * React hook for accessing user avatar and traits
 */

import { useState, useEffect } from 'react';
import { getUserAvatarDirect, type UserAvatar } from './client';

export function useAvatar() {
  const [avatar, setAvatar] = useState<UserAvatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAvatar() {
      try {
        setLoading(true);
        const data = await getUserAvatarDirect();

        if (mounted) {
          setAvatar(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load avatar');
          setAvatar(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchAvatar();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    avatar,
    loading,
    error,
    // Convenient accessors
    avatarId: avatar?.avatarId,
    details: avatar?.details,
    colorToken: avatar?.details?.color_token,
    kpiFocus: avatar?.details?.kpi_focus || [],
    toneOfVoice: avatar?.details?.tone_of_voice,
    title: avatar?.details?.title,
    tagline: avatar?.details?.tagline,
    badge: avatar?.details?.profile_badge,
  };
}
