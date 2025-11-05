import { useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';

import { supabase } from '../lib/supabase';

export const useOnboardingGuard = (navigation) => {
  useEffect(() => {
    let isMounted = true;

    const redirectIfLocked = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user?.id) return;

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.log('[warn] onboarding guard profile error:', profileError);
          return;
        }

        if (!isMounted) return;

        if (profile?.onboarding_completed) {
          navigation?.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            }),
          );
        }
      } catch (error) {
        console.log('[warn] onboarding guard error:', error);
      }
    };

    const unsubscribe = navigation?.addListener?.('focus', redirectIfLocked);

    redirectIfLocked();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [navigation]);
};

