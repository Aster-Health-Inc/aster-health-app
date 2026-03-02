import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "feature_flags_cache_v1";
const FeatureFlagsContext = createContext({ flags: {}, loading: true, refresh: async () => {} });

const envBool = (val, fallback=false) => {
  if (val === undefined || val === null) return fallback;
  const s = String(val).toLowerCase();
  if (["1","true","yes","on"].includes(s)) return true;
  if (["0","false","no","off"].includes(s)) return false;
  return fallback;
};

// Build-time defaults (Expo reads EXPO_PUBLIC_* at runtime too)
const DEFAULT_FLAGS = {
  chatbot: envBool(process.env.EXPO_PUBLIC_ENABLE_CHATBOT, false),
};

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      // 1) Try cache first
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setFlags((f) => ({ ...f, ...parsed }));
      }

      // 2) Fetch runtime overrides from Supabase (optional table)
      const { data, error } = await supabase
        .from("feature_flags")
        .select("key, value")
        .in("key", ["chatbot"]);

      if (!error && Array.isArray(data)) {
        const runtime = {};
        for (const row of data) {
          // value expected as boolean or string "true"/"false"
          runtime[row.key] = typeof row.value === "boolean" ? row.value : envBool(row.value, flags[row.key]);
        }
        if (Object.keys(runtime).length) {
          setFlags((f) => ({ ...f, ...runtime }));
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(runtime));
        }
      }
    } catch (e) {
      // swallow errors; fall back to defaults/cache
      // console.warn("Feature flags refresh error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({ flags, loading, refresh, platform: Platform.OS }), [flags, loading]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export const useFeatureFlags = () => useContext(FeatureFlagsContext);
