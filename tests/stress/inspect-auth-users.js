import { config } from 'dotenv';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const EMAIL = process.argv[2] || process.env.INSPECT_EMAIL || null;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in .env');
  process.exit(1);
}

const restBase = new URL('/rest/v1', SUPABASE_URL).toString().replace(/\/$/, '');

async function getColumns() {
  const url = new URL(`${restBase}/information_schema.columns`);
  url.searchParams.set('table_schema', 'eq.auth');
  url.searchParams.set('table_name', 'eq.users');
  url.searchParams.set('select', 'column_name,is_nullable,data_type');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      Accept: 'application/json',
    },
  });
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (e) { throw new Error(`Columns response parse failed: ${txt}`); }
}

async function getUsers() {
  const url = new URL(`${restBase}/auth.users`);
  const select = 'id,email,confirmation_token';
  url.searchParams.set('select', select);
  if (EMAIL) url.searchParams.set('email', `eq.${EMAIL}`);
  else url.searchParams.set('limit', '100');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      Accept: 'application/json',
    },
  });

  const txt = await res.text();
  try { return { status: res.status, body: JSON.parse(txt) }; } catch (e) { return { status: res.status, body: txt }; }
}

(async () => {
  try {
    console.log('Fetching columns metadata...');
    const cols = await getColumns();
    console.log(JSON.stringify(cols, null, 2));

    console.log('Fetching users...');
    const users = await getUsers();
    console.log('HTTP', users.status);
    if (typeof users.body === 'string') console.log(users.body);
    else console.log(JSON.stringify(users.body, null, 2));

    // Save backup
    const outPath = resolve(__dirname, './auth_users_backup.json');
    await fs.writeFile(outPath, JSON.stringify(users.body, null, 2));
    console.log('Backup written to', outPath);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
