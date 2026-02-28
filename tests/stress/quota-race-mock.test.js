/**
 * Quota Race Condition — Mock-Based Stress Test (Vitest)
 *
 * Çalıştırma:
 *   npx vitest run tests/stress/quota-race-mock.test.js
 *   veya: npm run test:stress:mock
 *
 * Amaç:
 *   Gerçek veritabanı KULLANMADAN, quota düşme mantığının race condition
 *   senaryolarında doğru çalışıp çalışmadığını simüle eder.
 *
 *   Advisory lock mekanizmasını JavaScript'te bir mutex ile taklit ederek,
 *   eşzamanlı check_and_lock_slot + submit_application çağrılarının
 *   quota'yı aşıp aşmadığını test eder.
 *
 * Kapsam:
 *   - Son 1 kontenjan için 50+ eşzamanlı başvuru → sadece 1 başarılı
 *   - Dual asil pool taşma kontrolü
 *   - Lock süresi dolmuş başvurular tekrar slota girer
 *   - Misafirli başvuru (ticket_count=2) quota kontrolü
 *   - Toplam kapasite limiti
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// In-Memory Quota Engine — Supabase RPC mantığını simüle eder
// ═══════════════════════════════════════════════════════════════

class QuotaEngine {
  constructor({
    totalCapacity = 1500,
    asilReturningCapacity = 400,
    asilNewCapacity = 300,
  } = {}) {
    this.totalCapacity = totalCapacity;
    this.asilReturningCapacity = asilReturningCapacity;
    this.asilNewCapacity = asilNewCapacity;
    this.submissions = new Map(); // tc_no → { status, ticket_type, ticket_count, attended_before, soft_lock_until }
    this.whitelist = new Map();   // tc_no → { attended_before }
    this._lockPromise = Promise.resolve(); // Advisory lock simülasyonu (mutex)
  }

  addToWhitelist(tcNo, attendedBefore = false) {
    this.whitelist.set(tcNo, { attended_before: attendedBefore });
  }

  /** Advisory lock simülasyonu — sıralı erişim garanti eder */
  async _withAdvisoryLock(fn) {
    let release;
    const waitForLock = new Promise((resolve) => { release = resolve; });
    const prevLock = this._lockPromise;
    this._lockPromise = waitForLock;
    await prevLock;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  _getActiveSubmissions(excludeTc = null) {
    const now = Date.now();
    const active = [];
    for (const [tc, sub] of this.submissions) {
      if (tc === excludeTc) continue;
      if (['rejected', 'cancelled', 'expired'].includes(sub.status)) continue;
      if (sub.status === 'locked' && sub.soft_lock_until <= now) continue;
      active.push({ tc, ...sub });
    }
    return active;
  }

  _getTotalReserved(excludeTc = null) {
    return this._getActiveSubmissions(excludeTc)
      .reduce((sum, s) => sum + s.ticket_count, 0);
  }

  _getPoolReserved(attendedBefore, excludeTc = null) {
    return this._getActiveSubmissions(excludeTc)
      .filter((s) => s.attended_before === attendedBefore && s.ticket_type === 'asil')
      .reduce((sum, s) => sum + s.ticket_count, 0);
  }

  /** check_and_lock_slot RPC simülasyonu */
  async checkAndLockSlot(tcNo) {
    return this._withAdvisoryLock(async () => {
      // Whitelist kontrolü
      const wl = this.whitelist.get(tcNo);
      if (!wl) {
        return { success: false, error_type: 'not_found' };
      }

      // Mevcut başvuru kontrolü
      const existing = this.submissions.get(tcNo);
      if (existing) {
        if (['pending', 'approved', 'asil', 'yedek'].includes(existing.status)) {
          return { success: true, status: existing.status };
        }
        if (existing.status === 'locked' && existing.soft_lock_until > Date.now()) {
          return { success: true, status: 'locked', ticket_type: existing.ticket_type, remaining_seconds: 600 };
        }
      }

      // Toplam kota kontrolü
      const totalReserved = this._getTotalReserved();
      if (totalReserved + 1 > this.totalCapacity) {
        return { success: false, error_type: 'quota_full' };
      }

      // Dual asil pool — ticket type belirleme
      const attendedBefore = wl.attended_before;
      const poolCapacity = attendedBefore
        ? this.asilReturningCapacity
        : this.asilNewCapacity;
      const poolReserved = this._getPoolReserved(attendedBefore);
      const ticketType = (poolReserved + 1 <= poolCapacity) ? 'asil' : 'yedek';

      // Lock oluştur (10 dakika)
      this.submissions.set(tcNo, {
        status: 'locked',
        ticket_type: ticketType,
        ticket_count: 1,
        attended_before: attendedBefore,
        soft_lock_until: Date.now() + 10 * 60 * 1000,
      });

      return { success: true, status: 'locked', ticket_type: ticketType, remaining_seconds: 600 };
    });
  }

  /** submit_application RPC simülasyonu */
  async submitApplication(tcNo, bringGuest = false) {
    return this._withAdvisoryLock(async () => {
      const wl = this.whitelist.get(tcNo);
      const ticketCount = bringGuest ? 2 : 1;

      // Toplam kota
      const totalReserved = this._getTotalReserved(tcNo);
      if (totalReserved + ticketCount > this.totalCapacity) {
        return { success: false, error: 'quota_full' };
      }

      // Dual asil pool
      const attendedBefore = wl?.attended_before ?? false;
      const poolCapacity = attendedBefore
        ? this.asilReturningCapacity
        : this.asilNewCapacity;
      const poolReserved = this._getPoolReserved(attendedBefore, tcNo);
      const ticketType = (poolReserved + ticketCount <= poolCapacity) ? 'asil' : 'yedek';

      this.submissions.set(tcNo, {
        status: 'pending',
        ticket_type: ticketType,
        ticket_count: ticketCount,
        attended_before: attendedBefore,
        soft_lock_until: null,
      });

      return { success: true, ticket_type: ticketType };
    });
  }

  /** cancel_application RPC simülasyonu */
  async cancelApplication(tcNo) {
    return this._withAdvisoryLock(async () => {
      const sub = this.submissions.get(tcNo);
      if (sub) {
        sub.status = 'cancelled';
      }
      return { success: true };
    });
  }

  getStats() {
    const active = this._getActiveSubmissions();
    const totalReserved = active.reduce((s, a) => s + a.ticket_count, 0);
    const asilReturning = active.filter((a) => a.attended_before && a.ticket_type === 'asil')
      .reduce((s, a) => s + a.ticket_count, 0);
    const asilNew = active.filter((a) => !a.attended_before && a.ticket_type === 'asil')
      .reduce((s, a) => s + a.ticket_count, 0);
    return { totalReserved, asilReturning, asilNew };
  }
}

// ═══════════════════════════════════════════════════════════════
// Yardımcı: Algoritmik geçerli TC üreteci
// ═══════════════════════════════════════════════════════════════
function generateValidTC(seed) {
  const base = '99900' + String(seed).padStart(4, '0');
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

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

describe('Quota Race Condition — Mock Simülasyonu', () => {
  let engine;

  // ──────────────────────────────────────────────
  // Senaryo 1: Son 1 kontenjan için 50 eşzamanlı başvuru
  // ──────────────────────────────────────────────
  describe('son 1 kontenjan yarışı', () => {
    beforeEach(() => {
      engine = new QuotaEngine({ totalCapacity: 1, asilReturningCapacity: 1, asilNewCapacity: 1 });
    });

    it('50 kullanıcı aynı anda başvurur → sadece 1 başarılı lock', async () => {
      const users = Array.from({ length: 50 }, (_, i) => generateValidTC(i + 1));
      users.forEach((tc) => engine.addToWhitelist(tc, false));

      const results = await Promise.all(
        users.map((tc) => engine.checkAndLockSlot(tc))
      );

      const successful = results.filter((r) => r.success && r.status === 'locked');
      const quotaFull = results.filter((r) => !r.success && r.error_type === 'quota_full');

      expect(successful.length).toBe(1);
      expect(quotaFull.length).toBe(49);
    });

    it('kapasite 1, submit sonrası ikinci başvuru reddedilir', async () => {
      const tc1 = generateValidTC(1);
      const tc2 = generateValidTC(2);
      engine.addToWhitelist(tc1, false);
      engine.addToWhitelist(tc2, false);

      const lock1 = await engine.checkAndLockSlot(tc1);
      expect(lock1.success).toBe(true);

      const submit1 = await engine.submitApplication(tc1, false);
      expect(submit1.success).toBe(true);

      const lock2 = await engine.checkAndLockSlot(tc2);
      expect(lock2.success).toBe(false);
      expect(lock2.error_type).toBe('quota_full');
    });
  });

  // ──────────────────────────────────────────────
  // Senaryo 2: Dual Asil Pool taşma kontrolü
  // ──────────────────────────────────────────────
  describe('dual asil pool — taşma kontrolü', () => {
    beforeEach(() => {
      engine = new QuotaEngine({
        totalCapacity: 100,
        asilReturningCapacity: 3,
        asilNewCapacity: 2,
      });
    });

    it('geri dönen havuzu (3) dolduktan sonra yedek atanır', async () => {
      const users = Array.from({ length: 5 }, (_, i) => generateValidTC(i + 100));
      users.forEach((tc) => engine.addToWhitelist(tc, true)); // Hepsi geri dönen

      const results = [];
      for (const tc of users) {
        const r = await engine.checkAndLockSlot(tc);
        results.push(r);
      }

      const asil = results.filter((r) => r.success && r.ticket_type === 'asil');
      const yedek = results.filter((r) => r.success && r.ticket_type === 'yedek');

      expect(asil.length).toBe(3);  // Havuz kapasitesi = 3
      expect(yedek.length).toBe(2); // Kalan 2 kişi yedek
    });

    it('yeni üye havuzu (2) dolduktan sonra yedek atanır', async () => {
      const users = Array.from({ length: 5 }, (_, i) => generateValidTC(i + 200));
      users.forEach((tc) => engine.addToWhitelist(tc, false)); // Hepsi yeni

      const results = [];
      for (const tc of users) {
        const r = await engine.checkAndLockSlot(tc);
        results.push(r);
      }

      const asil = results.filter((r) => r.success && r.ticket_type === 'asil');
      const yedek = results.filter((r) => r.success && r.ticket_type === 'yedek');

      expect(asil.length).toBe(2);  // Havuz kapasitesi = 2
      expect(yedek.length).toBe(3); // Kalan 3 kişi yedek
    });

    it('iki havuz birbirinden bağımsız çalışır', async () => {
      const returningUsers = Array.from({ length: 3 }, (_, i) => generateValidTC(i + 300));
      const newUsers = Array.from({ length: 2 }, (_, i) => generateValidTC(i + 400));
      returningUsers.forEach((tc) => engine.addToWhitelist(tc, true));
      newUsers.forEach((tc) => engine.addToWhitelist(tc, false));

      // Geri dönen havuzunu doldur
      for (const tc of returningUsers) {
        const r = await engine.checkAndLockSlot(tc);
        expect(r.ticket_type).toBe('asil');
      }

      // Yeni havuz hâlâ müsait
      for (const tc of newUsers) {
        const r = await engine.checkAndLockSlot(tc);
        expect(r.ticket_type).toBe('asil');
      }
    });

    it('eşzamanlı dual pool — 20 geri dönen + 20 yeni aynı anda', async () => {
      const returning = Array.from({ length: 20 }, (_, i) => generateValidTC(i + 500));
      const newMembers = Array.from({ length: 20 }, (_, i) => generateValidTC(i + 600));
      returning.forEach((tc) => engine.addToWhitelist(tc, true));
      newMembers.forEach((tc) => engine.addToWhitelist(tc, false));

      // Karıştır ve eşzamanlı gönder
      const allUsers = [...returning, ...newMembers].sort(() => Math.random() - 0.5);
      const results = await Promise.all(
        allUsers.map((tc) => engine.checkAndLockSlot(tc))
      );

      const returningAsil = results.filter((r) => {
        const wl = engine.whitelist.get(allUsers[results.indexOf(r)]);
        return r.success && r.ticket_type === 'asil' && wl?.attended_before;
      });

      const stats = engine.getStats();
      expect(stats.asilReturning).toBeLessThanOrEqual(3);
      expect(stats.asilNew).toBeLessThanOrEqual(2);
      expect(stats.totalReserved).toBe(40); // Hepsi slot alır (toplam kapasite=100)
    });
  });

  // ──────────────────────────────────────────────
  // Senaryo 3: Lock süresi dolmuş başvurular
  // ──────────────────────────────────────────────
  describe('lock timeout — süresi dolan slotlar', () => {
    beforeEach(() => {
      engine = new QuotaEngine({ totalCapacity: 1, asilReturningCapacity: 1, asilNewCapacity: 1 });
    });

    it('lock süresi dolan slot tekrar kullanılabilir', async () => {
      const tc1 = generateValidTC(700);
      const tc2 = generateValidTC(701);
      engine.addToWhitelist(tc1, false);
      engine.addToWhitelist(tc2, false);

      // tc1 lock alır
      const lock1 = await engine.checkAndLockSlot(tc1);
      expect(lock1.success).toBe(true);

      // tc2 kota dolu
      const lock2Before = await engine.checkAndLockSlot(tc2);
      expect(lock2Before.error_type).toBe('quota_full');

      // tc1 lock süresini expire et (simüle)
      const sub = engine.submissions.get(tc1);
      sub.soft_lock_until = Date.now() - 1000; // Süresi geçti

      // tc2 artık slot alabilir
      const lock2After = await engine.checkAndLockSlot(tc2);
      expect(lock2After.success).toBe(true);
      expect(lock2After.status).toBe('locked');
    });
  });

  // ──────────────────────────────────────────────
  // Senaryo 4: Misafirli başvuru (ticket_count=2)
  // ──────────────────────────────────────────────
  describe('misafirli başvuru — ticket_count=2', () => {
    beforeEach(() => {
      engine = new QuotaEngine({ totalCapacity: 3, asilReturningCapacity: 3, asilNewCapacity: 3 });
    });

    it('misafirli başvuru 2 kontenjan harcar', async () => {
      const tc1 = generateValidTC(800);
      engine.addToWhitelist(tc1, false);

      await engine.checkAndLockSlot(tc1);
      const submit = await engine.submitApplication(tc1, true); // bringGuest=true

      expect(submit.success).toBe(true);
      const stats = engine.getStats();
      expect(stats.totalReserved).toBe(2);
    });

    it('kalan 1 slot, misafirli (2 kişilik) başvuru reddedilir', async () => {
      const tc1 = generateValidTC(810);
      const tc2 = generateValidTC(811);
      engine.addToWhitelist(tc1, false);
      engine.addToWhitelist(tc2, false);

      // tc1 tek kişi submit
      await engine.checkAndLockSlot(tc1);
      await engine.submitApplication(tc1, false); // 1 slot kullandı

      // tc2 misafirli submit — 2 slot lazım ama 2 kalan var (3-1=2)
      await engine.checkAndLockSlot(tc2);
      const submit2 = await engine.submitApplication(tc2, true); // 2 slot ister
      expect(submit2.success).toBe(true);

      // tc3 artık kota dolu
      const tc3 = generateValidTC(812);
      engine.addToWhitelist(tc3, false);
      const lock3 = await engine.checkAndLockSlot(tc3);
      expect(lock3.error_type).toBe('quota_full');
    });

    it('kapasite=3, 2 misafirli başvuru → ikincisi reddedilir', async () => {
      const tc1 = generateValidTC(820);
      const tc2 = generateValidTC(821);
      engine.addToWhitelist(tc1, false);
      engine.addToWhitelist(tc2, false);

      // tc1 misafirli = 2 kişi
      await engine.checkAndLockSlot(tc1);
      const submit1 = await engine.submitApplication(tc1, true);
      expect(submit1.success).toBe(true);

      // tc2 misafirli = 2 kişi → toplam 4 > 3 kapasite
      await engine.checkAndLockSlot(tc2);
      const submit2 = await engine.submitApplication(tc2, true);
      expect(submit2.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // Senaryo 5: İptal sonrası slot geri açılır
  // ──────────────────────────────────────────────
  describe('iptal sonrası slot geri açılması', () => {
    it('iptal edilen slot başka kullanıcıya verilir', async () => {
      engine = new QuotaEngine({ totalCapacity: 1, asilReturningCapacity: 1, asilNewCapacity: 1 });

      const tc1 = generateValidTC(900);
      const tc2 = generateValidTC(901);
      engine.addToWhitelist(tc1, false);
      engine.addToWhitelist(tc2, false);

      // tc1 başvursun
      await engine.checkAndLockSlot(tc1);
      await engine.submitApplication(tc1, false);

      // tc2 kota dolu
      const lock2 = await engine.checkAndLockSlot(tc2);
      expect(lock2.error_type).toBe('quota_full');

      // tc1 iptal
      await engine.cancelApplication(tc1);

      // tc2 artık slot alabilir
      const lock2After = await engine.checkAndLockSlot(tc2);
      expect(lock2After.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // Senaryo 6: Whitelist'te olmayan TC
  // ──────────────────────────────────────────────
  describe('whitelist kontrolü', () => {
    beforeEach(() => {
      engine = new QuotaEngine({ totalCapacity: 100 });
    });

    it('whitelist\'te olmayan TC reddedilir', async () => {
      const result = await engine.checkAndLockSlot('99999999999');
      expect(result.success).toBe(false);
      expect(result.error_type).toBe('not_found');
    });

    it('zaten başvurmuş TC tekrar lock yapamaz (pending)', async () => {
      const tc = generateValidTC(950);
      engine.addToWhitelist(tc, false);

      await engine.checkAndLockSlot(tc);
      await engine.submitApplication(tc, false);

      const result = await engine.checkAndLockSlot(tc);
      expect(result.status).toBe('pending');
    });
  });

  // ──────────────────────────────────────────────
  // Senaryo 7: Büyük ölçekli eşzamanlı yarış
  // ──────────────────────────────────────────────
  describe('büyük ölçekli yarış — 200 kullanıcı, 10 slot', () => {
    it('200 eşzamanlı istek → en fazla 10 başarılı lock', async () => {
      engine = new QuotaEngine({ totalCapacity: 10, asilReturningCapacity: 5, asilNewCapacity: 5 });

      const users = Array.from({ length: 200 }, (_, i) => generateValidTC(i + 1000));
      users.forEach((tc, i) => engine.addToWhitelist(tc, i < 100)); // 100 geri dönen, 100 yeni

      const results = await Promise.all(
        users.map((tc) => engine.checkAndLockSlot(tc))
      );

      const successCount = results.filter((r) => r.success && r.status === 'locked').length;
      expect(successCount).toBe(10);

      const stats = engine.getStats();
      expect(stats.totalReserved).toBe(10);
      expect(stats.asilReturning).toBeLessThanOrEqual(5);
      expect(stats.asilNew).toBeLessThanOrEqual(5);
    });
  });
});
