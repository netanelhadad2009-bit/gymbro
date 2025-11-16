import { supabase } from '@/lib/supabase';
import { type ResolvedAvatar, type Avatar, getAvatarById } from './resolveAvatar';

/**
 * User avatar assignment with full details
 */
export interface UserAvatar extends ResolvedAvatar {
  assignedAt?: string;
  updatedAt?: string;
  details?: Avatar | null;
}

/**
 * Get the current user's avatar assignment
 * If no avatar is assigned, the API will resolve and assign one automatically
 *
 * @returns UserAvatar or null if user is not authenticated
 */
export async function getUserAvatar(): Promise<UserAvatar | null> {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('No active session');
      return null;
    }

    // Call API to get/resolve avatar
    const response = await fetch('/api/avatar', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user avatar:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data as UserAvatar;
  } catch (error) {
    console.error('Error fetching user avatar:', error);
    return null;
  }
}

/**
 * Force recomputation of user's avatar based on current profile data
 * Useful after onboarding completion or profile updates
 *
 * @returns Newly assigned UserAvatar or null on error
 */
export async function bootstrapUserAvatar(): Promise<UserAvatar | null> {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('No active session');
      return null;
    }

    // Call API to recompute and assign avatar
    const response = await fetch('/api/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to bootstrap user avatar:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data as UserAvatar;
  } catch (error) {
    console.error('Error bootstrapping user avatar:', error);
    return null;
  }
}

/**
 * Get avatar assignment from Supabase directly (no API call)
 * Returns null if no avatar is assigned yet
 *
 * @param userId - User ID (defaults to current authenticated user)
 * @returns UserAvatar or null
 */
export async function getUserAvatarDirect(userId?: string): Promise<UserAvatar | null> {
  try {
    // Get user ID if not provided
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      targetUserId = user.id;
    }

    // Query unified avatars table
    const { data, error } = await supabase
      .from('avatars')
      .select('avatar_id, confidence, matched_rules, reasons, created_at, updated_at')
      .eq('user_id', targetUserId)
      .single();

    if (error || !data) {
      return null;
    }

    // Get avatar details from JSON taxonomy
    const avatarDetails = getAvatarById(data.avatar_id);

    return {
      avatarId: data.avatar_id,
      confidence: data.confidence,
      matchedRules: data.matched_rules as string[],
      reasons: data.reasons as string[],
      assignedAt: data.created_at,
      updatedAt: data.updated_at,
      details: avatarDetails,
    };
  } catch (error) {
    console.error('Error fetching user avatar directly:', error);
    return null;
  }
}

/**
 * Check if user has an avatar assigned
 *
 * @returns true if avatar is assigned, false otherwise
 */
export async function hasUserAvatar(): Promise<boolean> {
  const avatar = await getUserAvatarDirect();
  return avatar !== null;
}

/**
 * Get all available avatars from catalog
 *
 * @returns Array of all avatar definitions
 */
export async function getAllAvatarsFromCatalog(): Promise<Avatar[]> {
  try {
    const { data, error } = await supabase
      .from('avatar_catalog')
      .select('id, title, spec')
      .order('id');

    if (error) {
      console.error('Failed to fetch avatar catalog:', error);
      return [];
    }

    // Transform data to Avatar format
    return data.map(row => ({
      id: row.id,
      title: row.title,
      ...(row.spec as any), // spec contains all other avatar fields
    })) as Avatar[];
  } catch (error) {
    console.error('Error fetching avatar catalog:', error);
    return [];
  }
}

/**
 * Get specific avatar details from catalog
 *
 * @param avatarId - Avatar ID
 * @returns Avatar details or null if not found
 */
export async function getAvatarFromCatalog(avatarId: string): Promise<Avatar | null> {
  try {
    const { data, error } = await supabase
      .from('avatar_catalog')
      .select('id, title, spec')
      .eq('id', avatarId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      ...(data.spec as any),
    } as Avatar;
  } catch (error) {
    console.error('Error fetching avatar from catalog:', error);
    return null;
  }
}
