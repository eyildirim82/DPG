import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const PREFIX = process.env.TEST_TC_PREFIX || '99900';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in .env');
  process.exit(1);
}

const restBase = new URL('/rest/v1', SUPABASE_URL).toString().replace(/\/$/, '');

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return text; }
}

(async () => {
  try {
    const likePattern = encodeURIComponent(`${PREFIX}%`);
    const submissionsCountUrl = `${restBase}/cf_submissions?select=count` + `&tc_no=like.${likePattern}`;
    const wlCountUrl = `${restBase}/cf_whitelist?select=count` + `&tc_no=like.${likePattern}`;

    const headers = {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      Accept: 'application/json',
    };

    console.log('Counting matching submissions and whitelist rows...');
    const subsBefore = await fetchJson(submissionsCountUrl, { headers });
    const wlBefore = await fetchJson(wlCountUrl, { headers });
    console.log('Submissions matching:', subsBefore);
    console.log('Whitelist matching:', wlBefore);

    if (Array.isArray(subsBefore) && subsBefore.length && parseInt(subsBefore[0].count,10) === 0 && Array.isArray(wlBefore) && wlBefore.length && parseInt(wlBefore[0].count,10) === 0) {
      console.log('No test rows found to delete. Exiting.');
      return;
    }

    // Delete submissions
    console.log('Deleting submissions...');
    const delSubsUrl = `${restBase}/cf_submissions?tc_no=like.${likePattern}`;
    const delSubsRes = await fetch(delSubsUrl, { method: 'DELETE', headers });
    console.log('Submissions DELETE HTTP', delSubsRes.status);
    const delSubsTxt = await delSubsRes.text();
    console.log(delSubsTxt);

    // Delete whitelist
    console.log('Deleting whitelist entries...');
    const delWlUrl = `${restBase}/cf_whitelist?tc_no=like.${likePattern}`;
    const delWlRes = await fetch(delWlUrl, { method: 'DELETE', headers });
    console.log('Whitelist DELETE HTTP', delWlRes.status);
    const delWlTxt = await delWlRes.text();
    console.log(delWlTxt);

    // Counts after
    const subsAfter = await fetchJson(submissionsCountUrl, { headers });
    const wlAfter = await fetchJson(wlCountUrl, { headers });
    console.log('After - Submissions matching:', subsAfter);
    console.log('After - Whitelist matching:', wlAfter);

    console.log('Service-role cleanup complete.');
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
})();
