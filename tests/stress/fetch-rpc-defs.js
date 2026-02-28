import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in .env');
  process.exit(1);
}

const restBase = new URL('/rest/v1', SUPABASE_URL).toString().replace(/\/$/, '');

(async () => {
  try {
    const url = new URL(`${restBase}/rpc_function_defs`);
    url.searchParams.set('select', 'schema,name,definition');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
        Accept: 'application/json',
      },
    });
    const txt = await res.text();
    console.log('HTTP', res.status);
    try { console.log(JSON.stringify(JSON.parse(txt), null, 2)); }
    catch (e) { console.log(txt); }
  } catch (err) {
    console.error('Request error:', err);
    process.exit(1);
  }
})();
