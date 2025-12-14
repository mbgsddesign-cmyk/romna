import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Gracefully handle missing env vars during build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client only if vars are present (prevents build-time crash)
let supabaseInstance: SupabaseClient | null = null;

export const supabase: SupabaseClient = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing env vars - using placeholder client');
    // Return a placeholder that will fail gracefully at runtime
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
})();

export function createServerClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createServerClient should only be called on the server.');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase server credentials');
  }

  return createClient(url, serviceRoleKey);
}

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== '');
}
