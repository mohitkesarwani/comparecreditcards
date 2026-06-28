import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Supabase config missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
  );
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
  console.warn(
    '[supabase] No service-role key found. Inserts will fail unless RLS on credit_cards allows the anon role to write.'
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

export default supabase;
