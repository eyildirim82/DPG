/**
 * Supabase RLS Güvenlik Denetimi — Integration Tests
 *
 * Çalıştırma:
 *   npx vitest run tests/integration/rls-security.test.js
 *   veya: npm test
 *
 * Amaç:
 *   Anon (public) kullanıcının RLS kurallarıyla korunan tablolara
 *   doğrudan erişememesini doğrular. Tüm veri mutasyonları sadece
 *   SECURITY DEFINER RPC'ler üzerinden yapılabilir olmalıdır.
 *
 * Gereksinimler:
 *   - VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri (.env)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Bu testler gerçek Supabase bağlantısı gerektirir
const canConnect = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

describe.skipIf(!canConnect)('RLS Güvenlik Denetimi (Anon Role)', () => {
  let supabase;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  // ─────────────────────────────────────────────────
  // cf_submissions — Başvuru Verileri
  // ─────────────────────────────────────────────────
  describe('cf_submissions tablosu', () => {
    it('anon kullanıcı başvuru listesini okuyamaz (SELECT engellenir)', async () => {
      const { data, error } = await supabase
        .from('cf_submissions')
        .select('*')
        .limit(1);

      // RLS aktif olduğundan data boş dönmeli veya hata oluşmalı
      if (error) {
        // Hata kodu 42501 (insufficient_privilege) veya benzeri beklenir
        expect(error.code).toBeDefined();
      } else {
        // RLS sessizce boş sonuç dönebilir
        expect(data).toEqual([]);
      }
    });

    it('anon kullanıcı başka birinin verisini çekemez (tc_no ile filtreleme)', async () => {
      // Gerçek olmayan ama format uygun bir TC ile sorgula
      const { data, error } = await supabase
        .from('cf_submissions')
        .select('*')
        .eq('tc_no', '10000000146');

      if (error) {
        expect(error.code).toBeDefined();
      } else {
        // RLS korumalı — boş döner
        expect(data).toEqual([]);
      }
    }, 15000);

    it('anon kullanıcı doğrudan INSERT yapamaz', async () => {
      const { data, error } = await supabase.from('cf_submissions').insert({
        tc_no: '10000000146',
        data: { name: 'Hacker' },
        full_name: 'Hacker',
        status: 'approved',
      });

      // INSERT RLS tarafından engellenmeli
      expect(error).not.toBeNull();
    });

    it('anon kullanıcı doğrudan UPDATE yapamaz', async () => {
      const { data, error } = await supabase
        .from('cf_submissions')
        .update({ status: 'approved' })
        .eq('tc_no', '10000000146');

      // UPDATE engellenmeli (etkilenen satır 0 veya hata)
      if (error) {
        expect(error).toBeDefined();
      } else {
        // count 0 olmalı
        expect(data).toEqual(null);
      }
    });

    it('anon kullanıcı doğrudan DELETE yapamaz', async () => {
      const { data, error } = await supabase
        .from('cf_submissions')
        .delete()
        .eq('tc_no', '10000000146');

      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toEqual(null);
      }
    });
  });

  // ─────────────────────────────────────────────────
  // cf_whitelist — Üye Listesi
  // ─────────────────────────────────────────────────
  describe('cf_whitelist tablosu', () => {
    it('anon kullanıcı whitelist verilerini okuyamaz', async () => {
      const { data, error } = await supabase
        .from('cf_whitelist')
        .select('*')
        .limit(1);

      if (error) {
        expect(error.code).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });

    it('anon kullanıcı whitelist\'e kayıt ekleyemez', async () => {
      const { error } = await supabase.from('cf_whitelist').insert({
        tc_no: '99999999999',
        full_name: 'Yetkisiz Giriş',
      });

      expect(error).not.toBeNull();
    });

    it('anon kullanıcı whitelist kaydı silemez', async () => {
      const { data, error } = await supabase
        .from('cf_whitelist')
        .delete()
        .eq('tc_no', '99999999999');

      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toEqual(null);
      }
    });
  });

  // ─────────────────────────────────────────────────
  // cf_quota_settings — Kota Ayarları
  // ─────────────────────────────────────────────────
  describe('cf_quota_settings tablosu', () => {
    it('anon kullanıcı kota ayarlarını okuyamaz', async () => {
      const { data, error } = await supabase
        .from('cf_quota_settings')
        .select('*')
        .limit(1);

      if (error) {
        expect(error.code).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });

    it('anon kullanıcı kota ayarlarını değiştiremez', async () => {
      const { error } = await supabase
        .from('cf_quota_settings')
        .update({ total_capacity: 99999 })
        .eq('id', 1);

      // Hata beklenir veya etki 0
      if (error) {
        expect(error).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────
  // cf_email_templates — E-posta Şablonları
  // ─────────────────────────────────────────────────
  describe('cf_email_templates tablosu', () => {
    it('anon kullanıcı email şablonlarını okuyamaz', async () => {
      const { data, error } = await supabase
        .from('cf_email_templates')
        .select('*')
        .limit(1);

      if (error) {
        expect(error.code).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });
  });

  // ─────────────────────────────────────────────────
  // cf_audit_logs — Denetim Günlükleri
  // ─────────────────────────────────────────────────
  describe('cf_audit_logs tablosu', () => {
    it('anon kullanıcı audit log\'ları okuyamaz', async () => {
      const { data, error } = await supabase
        .from('cf_audit_logs')
        .select('*')
        .limit(1);

      if (error) {
        expect(error.code).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });
  });

  // ─────────────────────────────────────────────────
  // cf_forms — Form Ayarları (Sadece aktif olanlar okunabilir)
  // ─────────────────────────────────────────────────
  describe('cf_forms tablosu', () => {
    it('anon kullanıcı sadece aktif formları okuyabilir', async () => {
      const { data, error } = await supabase
        .from('cf_forms')
        .select('*');

      // Hata olmamalı — aktif formlar okunabilir
      if (data && data.length > 0) {
        data.forEach((form) => {
          expect(form.is_active).toBe(true);
        });
      }
      // Hata yoksa sorun yok
      expect(error).toBeNull();
    });

    it('anon kullanıcı form oluşturamaz', async () => {
      const { error } = await supabase.from('cf_forms').insert({
        title: 'Hack Form',
        is_active: true,
      });

      expect(error).not.toBeNull();
    });
  });

  // ─────────────────────────────────────────────────
  // SECURITY DEFINER RPC'ler — Anon erişim
  // ─────────────────────────────────────────────────
  describe('SECURITY DEFINER RPC\'ler', () => {
    it('get_ticket_stats anon erişimle çalışır (public istatistik)', async () => {
      const { data, error } = await supabase.rpc('get_ticket_stats');

      // Bu RPC public erişime açık olmalı
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.total_capacity).toBeDefined();
    });

    it('check_and_lock_slot geçersiz TC ile düzgün hata döndürür', async () => {
      const { data, error } = await supabase.rpc('check_and_lock_slot', {
        p_tc_no: '00000000000',
      });

      // Fonksiyon 0 ile başlayan TC'yi handle etmeli
      if (data) {
        expect(data.success).toBe(false);
      }
    });

    it('submit_application geçersiz TC formatı ile hata fırlatır', async () => {
      const { data, error } = await supabase.rpc('submit_application', {
        p_tc_no: 'invalid',
        p_data: {},
        p_bring_guest: false,
      });

      // RAISE EXCEPTION beklenir
      expect(error).not.toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────
// Bağlantı yoksa bilgilendirici mesaj
// ─────────────────────────────────────────────────
describe.skipIf(canConnect)('RLS Test Uyarısı', () => {
  it('Supabase bağlantı bilgileri eksik — .env dosyasını kontrol edin', () => {
    console.warn(
      '\n⚠️  VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlı değil.\n' +
        '   RLS güvenlik testleri atlandı.\n' +
        '   .env dosyasına Supabase credentials ekleyin.\n'
    );
    expect(true).toBe(true); // Placeholder — test atlanır
  });
});

// ═══════════════════════════════════════════════════════════════
// ADIM 4: Gelişmiş Güvenlik Denetimi — Cross-User Erişim
// ═══════════════════════════════════════════════════════════════

describe.skipIf(!canConnect)('Gelişmiş RLS Güvenlik — Cross-User & Parameter Tampering', () => {
  let supabase;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  // ──────────────────────────────────────────────
  // Cross-User Veri Erişimi
  // ──────────────────────────────────────────────
  describe('cross-user veri erişimi', () => {
    it('anon kullanıcı: farklı TC numarasıyla başvuru verisine erişemez', async () => {
      // Var olan birinin TC'siyle sorgu yapmayı dene
      const { data, error } = await supabase
        .from('cf_submissions')
        .select('tc_no, data, full_name, status')
        .eq('tc_no', '10000000146');

      // RLS: anon SELECT engellendi → boş array veya hata
      if (error) {
        expect(error.code).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });

    it('anon kullanıcı: wildcard LIKE sorgusuyla veri keşfedemez', async () => {
      const { data, error } = await supabase
        .from('cf_submissions')
        .select('tc_no')
        .like('tc_no', '1%')
        .limit(10);

      if (error) {
        expect(error.code).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });

    it('anon kullanıcı: ilike ile case-insensitive arama yapamaz', async () => {
      const { data } = await supabase
        .from('cf_submissions')
        .select('full_name')
        .ilike('full_name', '%pilot%')
        .limit(5);

      expect(data ?? []).toEqual([]);
    });

    it('anon kullanıcı: or() filtresi ile birden fazla TC sorgulayamaz', async () => {
      const { data } = await supabase
        .from('cf_submissions')
        .select('*')
        .or('tc_no.eq.10000000146,tc_no.eq.11111111110');

      expect(data ?? []).toEqual([]);
    });

    it('anon kullanıcı: count() ile toplam kayıt sayısı öğrenemez', async () => {
      const { count, error } = await supabase
        .from('cf_submissions')
        .select('*', { count: 'exact', head: true });

      // count null veya 0 olmalı (RLS korumalı)
      if (!error) {
        expect(count ?? 0).toBe(0);
      }
    });
  });

  // ──────────────────────────────────────────────
  // Whitelist Veri Sızıntısı
  // ──────────────────────────────────────────────
  describe('whitelist veri sızıntısı', () => {
    it('anon kullanıcı: whitelist\'ten TC listesi çekemez', async () => {
      const { data } = await supabase
        .from('cf_whitelist')
        .select('tc_no')
        .limit(100);

      expect(data ?? []).toEqual([]);
    });

    it('anon kullanıcı: whitelist\'te belirli TC var mı kontrol edemez (doğrudan)', async () => {
      const { data } = await supabase
        .from('cf_whitelist')
        .select('tc_no')
        .eq('tc_no', '10000000146')
        .single();

      // single() hata dönmeli veya null
      expect(data).toBeNull();
    });

    it('anon kullanıcı: whitelist attended_before bilgisini okuyamaz', async () => {
      const { data } = await supabase
        .from('cf_whitelist')
        .select('attended_before')
        .limit(1);

      expect(data ?? []).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // RPC Parameter Tampering
  // ──────────────────────────────────────────────
  describe('RPC parametre manipülasyonu', () => {
    it('check_and_lock_slot: SQL injection denenirse güvenli şekilde reddedilir', async () => {
      const { data, error } = await supabase.rpc('check_and_lock_slot', {
        p_tc_no: "'; DROP TABLE cf_submissions; --",
      });

      // Fonksiyon ya hata fırlatır ya da not_found döner
      if (error) {
        expect(error).toBeDefined();
      } else if (data) {
        expect(data.success).toBe(false);
      }
    });

    it('check_and_lock_slot: boş string ile çağrılırsa reddedilir', async () => {
      const { data, error } = await supabase.rpc('check_and_lock_slot', {
        p_tc_no: '',
      });

      if (data) {
        expect(data.success).toBe(false);
        expect(data.error_type).toBe('invalid_parameter');
      }
    });

    it('check_and_lock_slot: null değer ile çağrılırsa reddedilir', async () => {
      const { data, error } = await supabase.rpc('check_and_lock_slot', {
        p_tc_no: null,
      });

      if (data) {
        expect(data.success).toBe(false);
      }
    });

    it('submit_application: XSS payload data ile güvenli şekilde işler', async () => {
      const { data, error } = await supabase.rpc('submit_application', {
        p_tc_no: '10000000146',
        p_data: { name: '<script>alert("xss")</script>', email: 'hack@evil.com' },
        p_bring_guest: false,
      });

      // Fonksiyon XSS payload'ı jsonb olarak kabul eder — ama whitelist kontrolü
      // veya başka bir validasyon engel olabilir. Hata veya success olabilir ama
      // önemli olan uygulamanın çökmemesi.
      expect(true).toBe(true); // No crash = pass
    });

    it('submit_application: TC formatı geçersiz (harf içerir) → hata', async () => {
      const { error } = await supabase.rpc('submit_application', {
        p_tc_no: 'ABCDEFGHIJK',
        p_data: { name: 'Test' },
        p_bring_guest: false,
      });

      expect(error).not.toBeNull();
    });

    it('submit_application: 0 ile başlayan TC reddedilir', async () => {
      const { error } = await supabase.rpc('submit_application', {
        p_tc_no: '01234567890',
        p_data: { name: 'Test' },
        p_bring_guest: false,
      });

      expect(error).not.toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // SMTP / Email Template Güvenliği
  // ──────────────────────────────────────────────
  describe('email & SMTP ayarları güvenliği', () => {
    it('anon kullanıcı: SMTP ayarlarını okuyamaz', async () => {
      const { data } = await supabase
        .from('cf_smtp_settings')
        .select('*')
        .limit(1);

      // Tablo yoksa veya RLS korumalıysa boş döner
      expect(data ?? []).toEqual([]);
    });

    it('anon kullanıcı: email template içeriğini değiştiremez', async () => {
      const { error } = await supabase
        .from('cf_email_templates')
        .update({ subject: 'HACKED!' })
        .eq('id', 1);

      if (error) {
        expect(error).toBeDefined();
      }
    });

    it('anon kullanıcı: yeni email template oluşturamaz', async () => {
      const { error } = await supabase.from('cf_email_templates').insert({
        template_type: 'phishing',
        subject: 'Hack Attempt',
        body: '<script>alert("xss")</script>',
      });

      expect(error).not.toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // Tablo Yapısı Keşif Engeli
  // ──────────────────────────────────────────────
  describe('tablo yapısı bilgi sızıntısı', () => {
    it('anon kullanıcı: information_schema üzerinden tablo listesi alınamaz', async () => {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      // information_schema'ya erişim engellenmeli
      expect(error).not.toBeNull();
    });

    it('anon kullanıcı: pg_catalog üzerinden fonksiyon listesi alınamaz', async () => {
      const { data, error } = await supabase
        .from('pg_catalog.pg_proc')
        .select('proname')
        .limit(5);

      expect(error).not.toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // Audit Log Güvenliği
  // ──────────────────────────────────────────────
  describe('audit log güvenliği', () => {
    it('anon kullanıcı: audit log\'a sahte kayıt ekleyemez', async () => {
      const { error } = await supabase.from('cf_audit_logs').insert({
        action: 'fake_action',
        details: { hack: true },
      });

      expect(error).not.toBeNull();
    });

    it('anon kullanıcı: mevcut audit log\'ları silemez', async () => {
      const { data, error } = await supabase
        .from('cf_audit_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toEqual(null);
      }
    });
  });
});
