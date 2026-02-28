import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.STRESS_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.STRESS_ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('.env eksik VITE_SUPABASE_*');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

(async () => {
  try {
    console.log('Attempting signInWithPassword...');
    const res = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    console.log('Sign-in result:', JSON.stringify(res, null, 2));

    if (res.error) {
      console.error('Sign-in error (message):', res.error.message);
      console.error('Sign-in error (full):', res.error);
    } else {
      console.log('Signed in. Now querying get_ticket_stats RPC as sanity check.');
      const rpc = await supabase.rpc('get_ticket_stats');
      console.log('RPC result:', JSON.stringify(rpc, null, 2));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
})();
