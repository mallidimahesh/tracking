import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured =
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseKey.includes('public-anon-key');

if (!isConfigured) {
  console.log('[System] Running with Local/AWS Serverless state (Supabase not configured or placeholder).');
} else {
  console.log(`[System] Supabase client initialized targeting: ${supabaseUrl}`);
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;