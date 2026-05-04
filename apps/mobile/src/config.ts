declare const process: {
  env: Record<string, string | undefined>;
};

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://wbsmzbpndohahbutywew.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
