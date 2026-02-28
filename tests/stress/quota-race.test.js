/**
 * Supabase Quota Race Condition — Stress Test (Dual Asil Pool)
 *
 * Çalıştırma:
 *   node tests/stress/quota-race.test.js
 *   node tests/stress/quota-race.test.js --users=200
 *   node tests/stress/quota-race.test.js --users=500 --wave=50
 *   node tests/stress/quota-race.test.js --users=200 --returning=100
 *
 * Amaç:
 *   Birden fazla kullanıcı (varsayılan 200) aynı anda son kalan kontenjanlar
 *   için başvurursa, advisory lock mekanizmasının çift rezervasyonu önleyip
 *   önlemediğini test eder.
 *
 *   DUAL ASİL HAVUZ:
 *     - attended_before=true  → 400 kişilik "geri dönen üye" asil havuzu
 *     - attended_before=false → 300 kişilik "yeni üye" asil havuzu
 *     - Havuz doluysa → yedek
 *
 * Gereksinimler:
 *   - VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri (.env)
 *   - Supabase projesinde test verileri (cf_whitelist'te test TC'leri)
 *
 * NOT: Bu script gerçek veritabanını kullanır. Test sonrasında oluşan verileri
 *      temizlemek için cleanup fonksiyonu çağrılır.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ .env dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY gerekli.');
  console.error('   Bu test gerçek Supabase bağlantısı gerektirir.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────
// CLI Argümanları & Test Konfigürasyonu
// ─────────────────────────────────────────────────
function parseArg(name, defaultVal) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? parseInt(arg.split('=')[1], 10) : defaultVal;
}

const CONCURRENT_USERS = parseArg('users', 200);
const WAVE_SIZE = parseArg('wave', 50);
const RETURNING_COUNT = parseArg('returning', Math.floor(CONCURRENT_USERS / 2));
const NEW_COUNT = CONCURRENT_USERS - RETURNING_COUNT;
const TEST_TC_PREFIX = '99900';

/**
 * Algoritmik olarak geçerli bir TC numarası üretir.
 * İlk 9 haneyi alır, 10. ve 11. haneyi algoritma ile hesaplar.
 */
function generateValidTC(seed) {
  const base = String(TEST_TC_PREFIX) + String(seed).padStart(4, '0');
  const d = base.split('').map(Number);

  while (d.length < 9) d.push(0);
  d.length = 9;

  const sum13579 = d[0] + d[2] + d[4] + d[6] + d[8];
  const sum2468 = d[1] + d[3] + d[5] + d[7];
  const digit10 = ((sum13579 * 7 - sum2468) % 10 + 10) % 10;
  d.push(digit10);

  const digit11 = d.reduce((a, b) => a + b, 0) % 10;
  d.push(digit11);

  return d.join('');
}

// ─────────────────────────────────────────────────
// Yardımcı: Dalga (wave) bazlı eşzamanlı istek yönetimi
// ─────────────────────────────────────────────────

async function runInWaves(items, fn, waveSize) {
  const results = [];
  for (let i = 0; i < items.length; i += waveSize) {
    const wave = items.slice(i, i + waveSize);
    const waveNum = Math.floor(i / waveSize) + 1;
    const totalWaves = Math.ceil(items.length / waveSize);
    process.stdout.write(`   Dalga ${waveNum}/${totalWaves} (${wave.length} istek)...`);
    const waveStart = Date.now();
    const waveResults = await Promise.all(wave.map(fn));
    const waveMs = Date.now() - waveStart;
    process.stdout.write(` ${waveMs}ms\n`);
    results.push(...waveResults);
  }
  return results;
}

/** Latency dizisinden p50, p95, p99 hesaplar */
function percentiles(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const p = (pct) => sorted[Math.min(Math.floor(sorted.length * pct), sorted.length - 1)];
  return { min: sorted[0], p50: p(0.5), p95: p(0.95), p99: p(0.99), max: sorted[sorted.length - 1] };
}

// ─────────────────────────────────────────────────
// Admin Auth & Whitelist Seeding
// ─────────────────────────────────────────────────

const ADMIN_EMAIL = process.env.STRESS_ADMIN_EMAIL || 'dpg@talpa.org';
const ADMIN_PASSWORD = process.env.STRESS_ADMIN_PASSWORD || 'Talpa.123';

async function signInAsAdmin() {
  console.log('🔑 Admin oturumu açılıyor...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error) {
    console.error(`   ❌ Admin giriş başarısız: ${error.message}`);
    return false;
  }
  console.log(`   ✅ Admin oturumu açıldı (${ADMIN_EMAIL})\n`);
  return true;
}

async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Whitelist'e test TC'lerini ekler.
 * İlk RETURNING_COUNT TC → attended_before=true
 * Geri kalan → attended_before=false
 */
async function seedWhitelist(testUsers) {
  console.log('🌱 Whitelist\'e test TC\'leri ekleniyor...');
  console.log(`   Geri dönen: ${RETURNING_COUNT}  |  Yeni üye: ${NEW_COUNT}`);

  const rows = testUsers.map((u) => ({
    tc_no: u.tc,
    attended_before: u.attended_before,
  }));

  let insertedCount = 0;
  let failedCount = 0;
  await runInWaves(
    rows,
    async (row) => {
      const { error } = await supabase.from('cf_whitelist').upsert(row, { onConflict: 'tc_no' });
      if (error) failedCount++;
      else insertedCount++;
    },
    WAVE_SIZE
  );

  if (failedCount > 0 && insertedCount === 0) {
    console.log(`   ⚠️  Whitelist insert başarısız (${failedCount} hata).`);
    return false;
  }
  console.log(`   ✅ ${insertedCount} test TC\'si whitelist\'e eklendi.\n`);
  return true;
}

async function cleanWhitelist(testUsers) {
  await runInWaves(
    testUsers,
    (u) => supabase.from('cf_whitelist').delete().eq('tc_no', u.tc).then(() => {}, () => {}),
    WAVE_SIZE
  );
}

async function simulateRaceCondition() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Dual Asil Pool — Quota Race Condition Stress Test');
  console.log(`  Kullanıcı: ${CONCURRENT_USERS} (Geri dönen: ${RETURNING_COUNT}, Yeni: ${NEW_COUNT})`);
  console.log(`  Dalga boyutu: ${WAVE_SIZE}`);
  console.log('  Asil Havuzları: Geri dönen=400, Yeni=300');
  console.log('═══════════════════════════════════════════════════════\n');

  // 0. Admin giriş
  const adminOk = await signInAsAdmin();
  if (!adminOk) {
    console.log('   ⚠️  Admin giriş başarısız — whitelist seeding yapılamayacak.\n');
  }

  // 0.1 Test kullanıcıları oluştur
  const testUsers = Array.from({ length: CONCURRENT_USERS }, (_, i) => ({
    tc: generateValidTC(i + 1),
    attended_before: i < RETURNING_COUNT, // İlk RETURNING_COUNT tanesi geri dönen
  }));

  // 0.2 Whitelist seed
  const seeded = await seedWhitelist(testUsers);
  if (!seeded) {
    console.log('\n   ⚠️  Whitelist seed başarısız — test sadece "not_found" dönecektir.');
    console.log('   Test yine de devam ediyor (RPC davranışını gözlemlemek için)...\n');
  }

  // 0.3 Admin oturumunu kapat — anon olarak devam
  await signOut();
  console.log('🔓 Admin oturumu kapatıldı — bundan sonra anon olarak devam ediliyor.\n');

  // 1. Mevcut kota durumu
  console.log('📊 Mevcut kota durumu kontrol ediliyor...');
  const { data: stats, error: statsErr } = await supabase.rpc('get_ticket_stats');
  if (statsErr) {
    console.error('❌ get_ticket_stats hatası:', statsErr.message);
    return;
  }
  console.log('   Toplam kapasite:', stats.total_capacity);
  console.log('   Toplam rezerv:', stats.total_reserved);
  console.log('   Kalan:', stats.total_capacity - stats.total_reserved);
  console.log('   Asil havuzları:');
  console.log(`     Geri dönen: ${stats.asil_returning_reserved}/${stats.asil_returning_capacity}`);
  console.log(`     Yeni üye:   ${stats.asil_new_reserved}/${stats.asil_new_capacity}`);
  console.log();

  // 2. Kullanıcıları karıştır — gerçek dünyayı simüle et
  const shuffled = [...testUsers].sort(() => Math.random() - 0.5);
  console.log(`🧪 ${CONCURRENT_USERS} kullanıcı simüle ediliyor (${RETURNING_COUNT} geri dönen, ${NEW_COUNT} yeni)...`);
  console.log();

  // 3. check_and_lock_slot çağrıları
  console.log('🔒 check_and_lock_slot çağrıları başlatılıyor...');
  const lockLatencies = [];
  const lockStartTime = Date.now();

  const lockResults = await runInWaves(
    shuffled,
    (u) => {
      const t0 = Date.now();
      return supabase
        .rpc('check_and_lock_slot', { p_tc_no: u.tc })
        .then(({ data, error }) => {
          lockLatencies.push(Date.now() - t0);
          return {
            tc: u.tc,
            tcMask: u.tc.slice(0, 5) + '***',
            attended_before: u.attended_before,
            success: !error && data?.success,
            status: data?.status,
            ticket_type: data?.ticket_type,
            error_type: data?.error_type || error?.message,
          };
        });
    },
    WAVE_SIZE
  );

  const lockDuration = Date.now() - lockStartTime;
  const lockStats = percentiles(lockLatencies);
  console.log(`   Toplam süre: ${lockDuration}ms`);
  console.log(`   Latency  → min: ${lockStats.min}ms | p50: ${lockStats.p50}ms | p95: ${lockStats.p95}ms | p99: ${lockStats.p99}ms | max: ${lockStats.max}ms\n`);

  const successful = lockResults.filter((r) => r.success);
  const failed = lockResults.filter((r) => !r.success);

  console.log('📋 Lock Sonuçları:');
  console.log(`   ✅ Başarılı slot kilitleme: ${successful.length}`);
  console.log(`   ❌ Reddedilen: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\n   Red sebepleri:');
    const reasons = {};
    failed.forEach((r) => {
      const reason = r.error_type || 'bilinmeyen';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });
    Object.entries(reasons).forEach(([reason, count]) => {
      console.log(`     - ${reason}: ${count}`);
    });
  }

  // Lock aşaması — dual pool dağılımı
  const lockReturningAsil = successful.filter((r) => r.attended_before && r.ticket_type === 'asil').length;
  const lockReturningYedek = successful.filter((r) => r.attended_before && r.ticket_type === 'yedek').length;
  const lockNewAsil = successful.filter((r) => !r.attended_before && r.ticket_type === 'asil').length;
  const lockNewYedek = successful.filter((r) => !r.attended_before && r.ticket_type === 'yedek').length;

  console.log('\n   🏊 Dual Asil Havuz Dağılımı (Lock):');
  console.log(`     Geri dönen → Asil: ${lockReturningAsil}  Yedek: ${lockReturningYedek}  (havuz kapasitesi: 400)`);
  console.log(`     Yeni üye   → Asil: ${lockNewAsil}  Yedek: ${lockNewYedek}  (havuz kapasitesi: 300)`);

  // 4. submit_application çağrıları
  if (successful.length > 0) {
    console.log(`\n📝 ${successful.length} başarılı lock için submit_application çağrıları...`);
    const submitLatencies = [];
    const submitStartTime = Date.now();

    const submitResults = await runInWaves(
      successful,
      (r) => {
        const t0 = Date.now();
        return supabase
          .rpc('submit_application', {
            p_tc_no: r.tc,
            p_data: {
              name: `Test Kullanıcı ${r.tc.slice(-4)}`,
              airline: 'THY',
              fleet: 'B737',
              email: `test_${r.tc.slice(-4)}@example.com`,
              phone: '05321234567',
              ageGroup: '36-44',
            },
            p_bring_guest: false,
          })
          .then(({ data, error }) => {
            submitLatencies.push(Date.now() - t0);
            return {
              tc: r.tc,
              tcMask: r.tcMask,
              attended_before: r.attended_before,
              success: !error && data?.success,
              ticket_type: data?.ticket_type,
              error: error?.message,
            };
          });
      },
      WAVE_SIZE
    );

    const submitDuration = Date.now() - submitStartTime;
    const subStats = percentiles(submitLatencies);

    const submitSuccess = submitResults.filter((r) => r.success);
    const submitFail = submitResults.filter((r) => !r.success);

    console.log(`   Toplam süre: ${submitDuration}ms`);
    console.log(`   Latency  → min: ${subStats.min}ms | p50: ${subStats.p50}ms | p95: ${subStats.p95}ms | p99: ${subStats.p99}ms | max: ${subStats.max}ms`);
    console.log(`   ✅ Başarılı başvuru: ${submitSuccess.length}`);
    console.log(`   ❌ Reddedilen: ${submitFail.length}`);

    if (submitFail.length > 0) {
      console.log('\n   Submit hataları (ilk 10):');
      submitFail.slice(0, 10).forEach((r) => console.log(`     - ${r.tcMask} (${r.attended_before ? 'geri dönen' : 'yeni'}): ${r.error}`));
      if (submitFail.length > 10) console.log(`     ... +${submitFail.length - 10} daha`);
    }

    // Submit — dual pool dağılımı
    const subReturningAsil = submitSuccess.filter((r) => r.attended_before && r.ticket_type === 'asil').length;
    const subReturningYedek = submitSuccess.filter((r) => r.attended_before && r.ticket_type === 'yedek').length;
    const subNewAsil = submitSuccess.filter((r) => !r.attended_before && r.ticket_type === 'asil').length;
    const subNewYedek = submitSuccess.filter((r) => !r.attended_before && r.ticket_type === 'yedek').length;

    console.log('\n   🏊 Dual Asil Havuz Dağılımı (Submit):');
    console.log(`     Geri dönen → Asil: ${subReturningAsil}  Yedek: ${subReturningYedek}  (havuz kapasitesi: 400)`);
    console.log(`     Yeni üye   → Asil: ${subNewAsil}  Yedek: ${subNewYedek}  (havuz kapasitesi: 300)`);

    // DOĞRULAMA: Havuz taşması kontrolü
    const returningOverflow = subReturningAsil > (stats.asil_returning_capacity || 400);
    const newOverflow = subNewAsil > (stats.asil_new_capacity || 300);

    if (returningOverflow) {
      console.log(`\n   🚨 HATA: Geri dönen asil havuzu taştı! ${subReturningAsil} > ${stats.asil_returning_capacity}`);
    }
    if (newOverflow) {
      console.log(`\n   🚨 HATA: Yeni üye asil havuzu taştı! ${subNewAsil} > ${stats.asil_new_capacity}`);
    }
  }

  // 5. Son kota durumu
  console.log('\n📊 Test sonrası kota durumu:');
  const { data: statsAfter } = await supabase.rpc('get_ticket_stats');
  if (statsAfter) {
    console.log('   Toplam rezerv:', statsAfter.total_reserved);
    console.log('   Kalan:', statsAfter.total_capacity - statsAfter.total_reserved);
    console.log('   Asil havuzları:');
    console.log(`     Geri dönen: ${statsAfter.asil_returning_reserved}/${statsAfter.asil_returning_capacity}`);
    console.log(`     Yeni üye:   ${statsAfter.asil_new_reserved}/${statsAfter.asil_new_capacity}`);
    const netChange = statsAfter.total_reserved - stats.total_reserved;
    console.log(`   Bu test sırasında artan: +${netChange}`);
  }

  // 6. Temizlik
  console.log('\n🧹 Test verileri temizleniyor...');
  const cleanupStart = Date.now();
  await runInWaves(
    testUsers,
    (u) => supabase.rpc('cancel_application', { p_tc_no: u.tc }).then(() => {}, () => {}),
    WAVE_SIZE
  );
  console.log(`   Temizlik tamamlandı (${Date.now() - cleanupStart}ms).\n`);

  // 6b. Whitelist temizliği
  if (seeded) {
    await signInAsAdmin();
    console.log('🧹 Whitelist test verileri temizleniyor...');
    const wlCleanStart = Date.now();
    await cleanWhitelist(testUsers);
    console.log(`   Whitelist temizlendi (${Date.now() - wlCleanStart}ms).\n`);
  }

  // 7. Temizlik sonrası kota doğrulama
  const { data: statsClean } = await supabase.rpc('get_ticket_stats');
  const quotaRestoredOk = statsClean && statsClean.total_reserved === stats.total_reserved;

  // 8. Sonuç raporu
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SONUÇ RAPORU — Dual Asil Havuz');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Eşzamanlı kullanıcı        : ${CONCURRENT_USERS}`);
  console.log(`  Geri dönen / Yeni           : ${RETURNING_COUNT} / ${NEW_COUNT}`);
  console.log(`  Dalga boyutu               : ${WAVE_SIZE}`);
  console.log(`  Advisory lock              : pg_advisory_xact_lock(hashtext('dpg_quota_lock'))`);
  console.log(`  Lock aşaması toplam süre   : ${lockDuration}ms`);
  console.log(`  Lock latency p50/p95/p99   : ${lockStats.p50}/${lockStats.p95}/${lockStats.p99} ms`);
  console.log();
  console.log(`  Geri dönen asil havuzu     : ${lockReturningAsil} / ${stats.asil_returning_capacity || 400} kapasite`);
  console.log(`  Yeni üye asil havuzu       : ${lockNewAsil} / ${stats.asil_new_capacity || 300} kapasite`);

  if (lockReturningAsil <= (stats.asil_returning_capacity || 400)) {
    console.log('  ✅ Geri dönen asil havuzu taşmadı.');
  } else {
    console.log('  ⚠️  Geri dönen asil havuzu TAŞTI — advisory lock mekanizmasını inceleyin.');
  }

  if (lockNewAsil <= (stats.asil_new_capacity || 300)) {
    console.log('  ✅ Yeni üye asil havuzu taşmadı.');
  } else {
    console.log('  ⚠️  Yeni üye asil havuzu TAŞTI — advisory lock mekanizmasını inceleyin.');
  }

  if (quotaRestoredOk) {
    console.log('  ✅ Temizlik sonrası kota eski haline döndü.');
  } else {
    console.log(`  ⚠️  Temizlik sonrası kota eşleşmedi (önce: ${stats.total_reserved}, şimdi: ${statsClean?.total_reserved})`);
  }

  console.log();

  await signOut();
}

// ─────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────
simulateRaceCondition().catch((err) => {
  console.error('Test çalıştırılırken hata:', err);
  process.exit(1);
});
