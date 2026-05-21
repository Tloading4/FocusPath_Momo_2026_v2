import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured =
  supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');

if (!isConfigured) {
  console.warn('Supabase not configured — advanced features disabled.');
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
