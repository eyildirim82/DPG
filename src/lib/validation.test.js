/**
 * TC Kimlik No Doğrulama — Unit Tests
 *
 * Çalıştırma:
 *   npx vitest run src/lib/validation.test.js
 *   veya tüm testler: npm test
 *
 * Kapsam:
 *   - isValidTCKimlikNo() fonksiyonu: geçerli / geçersiz / edge-case
 *   - applicationFormSchema (Zod): tam form validasyonu
 */

import { describe, it, expect } from 'vitest';
import {
  isValidTCKimlikNo,
  applicationFormSchema,
  FLEET_OPTIONS,
  AIRLINE_OPTIONS,
  AGE_GROUP_OPTIONS,
  formatPhoneNumber,
} from './validation';

// ─────────────────────────────────────────────────────────────
// 1. isValidTCKimlikNo — Pure Function Tests
// ─────────────────────────────────────────────────────────────
describe('isValidTCKimlikNo', () => {
  // === Happy Path ===
  describe('geçerli TC numaraları', () => {
    // Atatürk'ün bilinen public TC numarası (resmi kaynak)
    it('bilinen geçerli bir TC numarasını kabul eder (10000000146)', () => {
      expect(isValidTCKimlikNo('10000000146')).toBe(true);
    });

    it('algoritmik olarak geçerli TC numaralarını kabul eder', () => {
      // Bu numaralar TC algoritmasını doğru geçer
      const validTCs = [
        '10000000146',
        '11111111110',
        '12345678950',
        '29012428930',
        '55555555550',
      ];
      validTCs.forEach((tc) => {
        expect(isValidTCKimlikNo(tc)).toBe(true);
      });
    });

    it('boşluk içeren (trim edilebilir) geçerli TC kabul eder', () => {
      // Fonksiyon içinde \D strip var, ama başında-sonunda boşluk olabilir
      expect(isValidTCKimlikNo(' 10000000146 ')).toBe(true);
    });
  });

  // === Unhappy Path — Format Hataları ===
  describe('format hataları', () => {
    it('null değer false döndürür', () => {
      expect(isValidTCKimlikNo(null)).toBe(false);
    });

    it('undefined değer false döndürür', () => {
      expect(isValidTCKimlikNo(undefined)).toBe(false);
    });

    it('boş string false döndürür', () => {
      expect(isValidTCKimlikNo('')).toBe(false);
    });

    it('sayısal olmayan (number) tip false döndürür', () => {
      expect(isValidTCKimlikNo(10000000146)).toBe(false);
    });

    it('10 haneli kısa numara false döndürür', () => {
      expect(isValidTCKimlikNo('1234567890')).toBe(false);
    });

    it('12 haneli uzun numara false döndürür', () => {
      expect(isValidTCKimlikNo('123456789012')).toBe(false);
    });

    it('0 ile başlayan numara false döndürür', () => {
      expect(isValidTCKimlikNo('01234567890')).toBe(false);
    });

    it('harf içeren string false döndürür (rakam dışı karakter)', () => {
      // \D strip edildiğinden 11+ karakter olsa bile kalan haneler 11 olmayabilir
      expect(isValidTCKimlikNo('1234567ABC1')).toBe(false);
    });

    it('tamamen harf/karakter olan string false döndürür', () => {
      expect(isValidTCKimlikNo('ABCDEFGHIJK')).toBe(false);
    });

    it('özel karakterler içeren string false döndürür', () => {
      expect(isValidTCKimlikNo('!@#$%^&*()+=')).toBe(false);
    });
  });

  // === Unhappy Path — Algoritma Hataları ===
  describe('algoritma ihlalleri', () => {
    it('11 hane ama 10. hane yanlış — false döndürür', () => {
      // 10000000146 geçerli → son 2 haneyi değiştir
      expect(isValidTCKimlikNo('10000000156')).toBe(false);
    });

    it('11 hane ama 11. hane yanlış — false döndürür', () => {
      // 10000000146 geçerli → sadece 11. haneyi değiştir
      expect(isValidTCKimlikNo('10000000140')).toBe(false);
    });

    it('tüm haneler aynı (00000000000) — 0 ile başladığı için false', () => {
      expect(isValidTCKimlikNo('00000000000')).toBe(false);
    });

    it('11111111112 — 11. hane yanlış, false döndürür', () => {
      expect(isValidTCKimlikNo('11111111112')).toBe(false);
    });

    it('99999999999 — algoritma kontrolü geçmez, false döndürür', () => {
      // Son 2 hane algoritma uyumsuz
      expect(isValidTCKimlikNo('99999999999')).toBe(false);
    });
  });

  // === Edge Cases ===
  describe('edge cases', () => {
    it('tire ile ayrılmış TC — rakamlar doğruysa geçer (format stripping)', () => {
      // Fonksiyon \D karakterleri siler: "100-0000-0146" → "10000000146"
      expect(isValidTCKimlikNo('100-0000-0146')).toBe(true);
    });

    it('çok uzun string — rakam sayısı 11 değilse false', () => {
      expect(isValidTCKimlikNo('10000000146999')).toBe(false);
    });

    it('sadece boşluklardan oluşan string — false döndürür', () => {
      expect(isValidTCKimlikNo('           ')).toBe(false);
    });

    it('tek rakam — false döndürür', () => {
      expect(isValidTCKimlikNo('1')).toBe(false);
    });

    it('boolean true — false döndürür (tip kontrolü)', () => {
      expect(isValidTCKimlikNo(true)).toBe(false);
    });

    it('object — false döndürür (tip kontrolü)', () => {
      expect(isValidTCKimlikNo({})).toBe(false);
    });

    it('array — false döndürür (tip kontrolü)', () => {
      expect(isValidTCKimlikNo([])).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 2. applicationFormSchema — Zod Schema Tests
// ─────────────────────────────────────────────────────────────
describe('applicationFormSchema', () => {
  const validFormData = {
    tcNo: '10000000146',
    name: 'Ahmet Yılmaz',
    airline: 'THY',
    airlineOther: '',
    fleet: 'B737',
    fleetOther: '',
    email: 'ahmet@example.com',
    phone: '532 123 45 67',
    ageGroup: '36-44',
    bringGuest: false,
    guestName: '',
    kvkkApproval: true,
    paymentApproval: true,
  };

  describe('geçerli form verisi', () => {
    it('tüm alanlar doğru doldurulduğunda başarılı olur', () => {
      const result = applicationFormSchema.safeParse(validFormData);
      expect(result.success).toBe(true);
    });

    it('misafir ile birlikte geçerli form', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        bringGuest: true,
        guestName: 'Mehmet Özkan',
      });
      expect(result.success).toBe(true);
    });

    it('"Diğer" seçildiğinde airlineOther doldurulmuşsa geçerli', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        airline: 'Diğer',
        airlineOther: 'Atlas Global',
      });
      expect(result.success).toBe(true);
    });

    it('"Diğer" seçildiğinde fleetOther doldurulmuşsa geçerli', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        fleet: 'Diğer',
        fleetOther: 'CRJ-900',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('zorunlu alan eksiklikleri', () => {
    it('tcNo boşsa hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        tcNo: '',
      });
      expect(result.success).toBe(false);
      const tcErrors = result.error.issues.filter((i) => i.path.includes('tcNo'));
      expect(tcErrors.length).toBeGreaterThan(0);
    });

    it('name boşsa hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('sadece ad (tek kelime) girilirse hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        name: 'Ahmet',
      });
      expect(result.success).toBe(false);
    });

    it('email boşsa hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        email: '',
      });
      expect(result.success).toBe(false);
    });

    it('geçersiz email formatı hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('phone 10 haneden kısa olursa hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        phone: '532 12',
      });
      expect(result.success).toBe(false);
    });

    it('5 ile başlamayan 10 haneli numara reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        phone: '312 123 45 67',
      });
      expect(result.success).toBe(false);
    });

    it('airline seçilmemişse hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        airline: '',
      });
      expect(result.success).toBe(false);
    });

    it('fleet seçilmemişse hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        fleet: '',
      });
      expect(result.success).toBe(false);
    });

    it('ageGroup seçilmemişse hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        ageGroup: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('koşullu validasyonlar', () => {
    it('bringGuest=true ama guestName boşsa hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        bringGuest: true,
        guestName: '',
      });
      expect(result.success).toBe(false);
      const guestErrors = result.error.issues.filter((i) => i.path.includes('guestName'));
      expect(guestErrors.length).toBeGreaterThan(0);
    });

    it('airline="Diğer" ama airlineOther boşsa hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        airline: 'Diğer',
        airlineOther: '',
      });
      expect(result.success).toBe(false);
      const otherErrors = result.error.issues.filter((i) => i.path.includes('airlineOther'));
      expect(otherErrors.length).toBeGreaterThan(0);
    });

    it('fleet="Diğer" ama fleetOther boşsa hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        fleet: 'Diğer',
        fleetOther: '',
      });
      expect(result.success).toBe(false);
      const otherErrors = result.error.issues.filter((i) => i.path.includes('fleetOther'));
      expect(otherErrors.length).toBeGreaterThan(0);
    });
  });

  describe('KVKK ve ödeme onayları', () => {
    it('kvkkApproval=false hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        kvkkApproval: false,
      });
      expect(result.success).toBe(false);
    });

    it('paymentApproval=false hata verir', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        paymentApproval: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TC Kimlik No schema doğrulaması', () => {
    it('geçersiz TC algoritması — schema reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        tcNo: '12345678901', // Algoritmik olarak geçersiz
      });
      expect(result.success).toBe(false);
    });

    it('10 haneli TC — schema reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        tcNo: '1234567890',
      });
      expect(result.success).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 3. Data Sabitleri
// ─────────────────────────────────────────────────────────────
describe('Validation sabitleri', () => {
  it('FLEET_OPTIONS en az 3 seçenek içerir', () => {
    expect(FLEET_OPTIONS.length).toBeGreaterThanOrEqual(3);
    expect(FLEET_OPTIONS.every((o) => o.value && o.label)).toBe(true);
  });

  it('AIRLINE_OPTIONS en az 5 seçenek içerir', () => {
    expect(AIRLINE_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('AGE_GROUP_OPTIONS tüm yaş aralıklarını kapsar', () => {
    const values = AGE_GROUP_OPTIONS.map((o) => o.value);
    expect(values).toContain('18-25');
    expect(values).toContain('65+');
  });

  it('FLEET_OPTIONS "Diğer" seçeneği içerir', () => {
    expect(FLEET_OPTIONS.find((o) => o.value === 'Diğer')).toBeDefined();
  });

  it('AIRLINE_OPTIONS "Diğer" seçeneği içerir', () => {
    expect(AIRLINE_OPTIONS.find((o) => o.value === 'Diğer')).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// 4. Güvenlik & Edge-Case Testleri (Ek)
// ─────────────────────────────────────────────────────────────
describe('isValidTCKimlikNo — Güvenlik & İleri Edge Cases', () => {
  describe('SQL/XSS enjeksiyon denemeleri', () => {
    it('SQL injection string false döndürür', () => {
      expect(isValidTCKimlikNo("' OR 1=1 --")).toBe(false);
    });

    it('SQL DROP TABLE denemesi false döndürür', () => {
      expect(isValidTCKimlikNo("'; DROP TABLE users;--")).toBe(false);
    });

    it('XSS script tag false döndürür', () => {
      expect(isValidTCKimlikNo('<script>alert("XSS")</script>')).toBe(false);
    });

    it('HTML entity encoded string false döndürür', () => {
      expect(isValidTCKimlikNo('&#49;&#48;&#48;&#48;&#48;&#48;&#48;&#48;&#49;&#52;&#54;')).toBe(false);
    });
  });

  describe('unicode & özel karakter denemeleri', () => {
    it('Türkçe karakterler içeren string false döndürür', () => {
      expect(isValidTCKimlikNo('1234567890ş')).toBe(false);
    });

    it('emoji içeren string false döndürür', () => {
      expect(isValidTCKimlikNo('12345🚀67890')).toBe(false);
    });

    it('zero-width space içeren geçerli rakamlar — strip sonrası geçerli olur', () => {
      // Zero-width space (\u200B) \D tarafından strip edilir → geçerli TC kalır
      expect(isValidTCKimlikNo('1000\u200B0000146')).toBe(true);
    });

    it('fullwidth rakamlar (Japonca) false döndürür', () => {
      // ０１２３４... fullwidth digits → \D olarak strip edilir, 11 hane kalmaz
      expect(isValidTCKimlikNo('１０００００００１４６')).toBe(false);
    });

    it('Arapça rakamlar false döndürür', () => {
      // ١٢٣٤٥٦٧٨٩٠١ — Arabic-Indic digits
      expect(isValidTCKimlikNo('١٢٣٤٥٦٧٨٩٠١')).toBe(false);
    });
  });

  describe('sınır değer testleri', () => {
    it('en küçük geçerli TC (10000000000 civarı) — algoritmik kontrol', () => {
      // 10000000000 → digit10 ve digit11 hesaplayalım
      // d(0..8) = [1,0,0,0,0,0,0,0,0]
      // sum13579 = 1+0+0+0+0 = 1; sum2468 = 0+0+0+0 = 0
      // digit10 = (1*7 - 0) % 10 = 7 → d[9] olmalı 7
      // Dolayısıyla 10000000070 olabilir
      const d = [1, 0, 0, 0, 0, 0, 0, 0, 0];
      const digit10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
      d.push(digit10 < 0 ? digit10 + 10 : digit10);
      const digit11 = d.reduce((a, b) => a + b, 0) % 10;
      d.push(digit11);
      const tc = d.join('');
      expect(isValidTCKimlikNo(tc)).toBe(true);
    });

    it('tüm haneler 1 (11111111110) — geçerli olabilir mi kontrol', () => {
      expect(isValidTCKimlikNo('11111111110')).toBe(true);
    });

    it('99999999990 — algoritma kontrol', () => {
      // Hesaplama:
      const d = [9, 9, 9, 9, 9, 9, 9, 9, 9];
      const sum13579 = 9 * 5; // 45
      const sum2468 = 9 * 4;  // 36
      const digit10 = ((45 * 7 - 36) % 10 + 10) % 10; // (315-36)%10 = 279%10 = 9
      d.push(digit10);
      const digit11 = d.reduce((a, b) => a + b, 0) % 10; // 90%10 = 0
      d.push(digit11);
      const tc = d.join('');
      expect(tc).toBe('99999999990');
      expect(isValidTCKimlikNo(tc)).toBe(true);
    });

    it('çok büyük sayı string (100+ karakter) false döndürür', () => {
      expect(isValidTCKimlikNo('1'.repeat(100))).toBe(false);
    });

    it('boş whitespace array false döndürür', () => {
      expect(isValidTCKimlikNo('\t\n\r ')).toBe(false);
    });
  });

  describe('performans — toplu doğrulama', () => {
    it('1000 TC doğrulaması 100ms altında tamamlanır', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        isValidTCKimlikNo('10000000146');
        isValidTCKimlikNo('12345678901');
        isValidTCKimlikNo('invalid');
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 5. applicationFormSchema — İleri Validasyon Senaryoları
// ─────────────────────────────────────────────────────────────
describe('applicationFormSchema — İleri Senaryolar', () => {
  const validFormData = {
    tcNo: '10000000146',
    name: 'Ahmet Yılmaz',
    airline: 'THY',
    airlineOther: '',
    fleet: 'B737',
    fleetOther: '',
    email: 'ahmet@example.com',
    phone: '532 123 45 67',
    ageGroup: '36-44',
    bringGuest: false,
    guestName: '',
    kvkkApproval: true,
    paymentApproval: true,
  };

  describe('telefon numarası edge cases', () => {
    it('formatlanmış 5XX XXX XX XX kabul eder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        phone: '532 123 45 67',
      });
      expect(result.success).toBe(true);
    });

    it('boşluksuz 10 haneli 5 ile başlayan kabul eder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        phone: '5321234567',
      });
      expect(result.success).toBe(true);
    });

    it('sadece 5 rakam içeren telefon reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        phone: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('5 ile başlamayan numara reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        phone: '312 456 78 90',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('email edge cases', () => {
    it('Türkçe karakterli domain reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        email: 'ahmet@şirket.com',
      });
      expect(result.success).toBe(false);
    });

    it('birden fazla @ içeren email reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        email: 'ahmet@@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('geçerli subdomain email kabul eder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        email: 'pilot@mail.thy.com.tr',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('isim validasyonu edge cases', () => {
    it('3 kelimeli isim (ad + ikinci ad + soyad) kabul eder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        name: 'Ahmet Ali Yılmaz',
      });
      expect(result.success).toBe(true);
    });

    it('sadece boşluk ve tab karakterleri reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        name: '   \t  ',
      });
      expect(result.success).toBe(false);
    });

    it('Türkçe özel karakterli isim kabul eder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        name: 'Gökçe Şahin Çelik',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('bringGuest edge cases', () => {
    it('misafir adı sadece boşluksa reddeder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        bringGuest: true,
        guestName: '   ',
      });
      expect(result.success).toBe(false);
    });

    it('bringGuest=false, guestName dolu — yine de kabul eder', () => {
      const result = applicationFormSchema.safeParse({
        ...validFormData,
        bringGuest: false,
        guestName: 'Mehmet Demir',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('tüm seçenekler ile form', () => {
    it('her havayolu seçeneği ile geçerli form kabul edilir', () => {
      const airlines = ['THY', 'PGS', 'AJET', 'SUNEXP', 'MNG'];
      airlines.forEach((airline) => {
        const result = applicationFormSchema.safeParse({
          ...validFormData,
          airline,
        });
        expect(result.success).toBe(true);
      });
    });

    it('her yaş grubu ile geçerli form kabul edilir', () => {
      const groups = ['18-25', '26-35', '36-44', '45-55', '56-65', '65+'];
      groups.forEach((ageGroup) => {
        const result = applicationFormSchema.safeParse({
          ...validFormData,
          ageGroup,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 6. formatPhoneNumber — Telefon Numarası Formatlama
// ─────────────────────────────────────────────────────────────
describe('formatPhoneNumber', () => {
  it('boş string boş döner', () => {
    expect(formatPhoneNumber('')).toBe('');
  });

  it('null/undefined boş döner', () => {
    expect(formatPhoneNumber(null)).toBe('');
    expect(formatPhoneNumber(undefined)).toBe('');
  });

  it('10 haneli numarayı 5XX XXX XX XX formatına çevirir', () => {
    expect(formatPhoneNumber('5321234567')).toBe('532 123 45 67');
  });

  it('başındaki 0 otomatik silinir ve formatlanır', () => {
    expect(formatPhoneNumber('05321234567')).toBe('532 123 45 67');
  });

  it('+90 prefix otomatik silinir ve formatlanır', () => {
    expect(formatPhoneNumber('+905321234567')).toBe('532 123 45 67');
  });

  it('90 prefix otomatik silinir ve formatlanır', () => {
    expect(formatPhoneNumber('905321234567')).toBe('532 123 45 67');
  });

  it('parantez, tire, boşluk temizlenir ve formatlanır', () => {
    expect(formatPhoneNumber('(0532) 123-45-67')).toBe('532 123 45 67');
  });

  it('eksik numaratik giriş kısmen formatlanır (3 hane)', () => {
    expect(formatPhoneNumber('532')).toBe('532');
  });

  it('eksik numaratik giriş kısmen formatlanır (6 hane)', () => {
    expect(formatPhoneNumber('532123')).toBe('532 123');
  });

  it('eksik numaratik giriş kısmen formatlanır (8 hane)', () => {
    expect(formatPhoneNumber('53212345')).toBe('532 123 45');
  });

  it('10 haneden fazla girilirse kesilir', () => {
    expect(formatPhoneNumber('53212345678999')).toBe('532 123 45 67');
  });

  it('sadece rakam olmayan karakterler boş döner', () => {
    expect(formatPhoneNumber('abc')).toBe('');
  });

  it('zaten formatlanmış değer tekrar formatlanır (idempotent)', () => {
    expect(formatPhoneNumber('532 123 45 67')).toBe('532 123 45 67');
  });
});