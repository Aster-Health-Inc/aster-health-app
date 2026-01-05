import { supabase } from '../lib/supabase';

export const ensureUserRecord = async (user) => {
  if (!user?.id) return;
  try {
    await supabase
      .from('users')
      .upsert(
        { id: user.id, email: user.email ?? null },
        { onConflict: 'id' },
      );
  } catch (err) {
    console.log('ensureUserRecord failed', err);
  }
};

export const getVerifiedUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user) return user;

  if (error) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) return null;
    return refreshData?.user ?? refreshData?.session?.user ?? null;
  }

  return null;
};

/**
 * Resolve the canonical user id used for shared tables (periods, predictions, etc).
 *
 * SIMPLIFIED: Always return auth user ID to avoid RLS policy conflicts.
 * This ensures compatibility with RLS policies that only allow users to insert their own auth ID.
 */
export const getCanonicalUserId = async (user) => {
  if (!user?.id) {
    throw new Error('Missing auth user');
  }

  // Always use auth user ID - simpler and avoids RLS policy issues
  return user.id;
};
