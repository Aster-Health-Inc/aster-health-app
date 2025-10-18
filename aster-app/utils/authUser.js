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
