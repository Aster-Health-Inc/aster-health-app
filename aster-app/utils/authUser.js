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

/**
 * Resolve the canonical user id used for shared tables (periods, predictions, etc).
 * Falls back to the auth id if the RPC cannot resolve/create the canonical id.
 */
export const getCanonicalUserId = async (user) => {
  if (!user?.id) {
    throw new Error('Missing auth user');
  }

  try {
    const { data: canonicalId, error } = await supabase.rpc('get_or_create_public_user', {
      p_auth_id: user.id,
      p_email: user.email ?? null,
    });

    if (error) {
      console.log('getCanonicalUserId rpc error; falling back to auth id', error?.message);
      return user.id;
    }

    if (!canonicalId) {
      console.log('getCanonicalUserId returned null; falling back to auth id');
      return user.id;
    }

    return canonicalId;
  } catch (err) {
    console.log('getCanonicalUserId failed; falling back to auth id', err?.message);
    return user.id;
  }
};
