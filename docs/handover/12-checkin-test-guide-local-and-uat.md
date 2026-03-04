# Check-in Test Rehberi (Lokal + Test Sunucusu)

Tarih: 2026-03-04

Bu rehber, Check-in ekranını hem geliştirici lokalinde hem de müşterinin test sunucusunda test etmek için hazırlanmıştır.

## 1) Lokal Test (Senin için)

## A) Otomatik E2E Smoke (Mock'lu, hızlı)

Amaç: Backend bağımsız olarak UI akışının kırılmadığını hızlı doğrulamak.

Komut:

```bash
npm run test:e2e:checkin
```

Notlar:
- Bu testte runtime flag, OTP ve check-in RPC çağrıları mock'lanır.
- Dev server Playwright tarafından otomatik ayağa kaldırılır.
- Lokal E2E koşusunda `VITE_E2E_FORCE_CHECKIN=true` ile check-in ekranı deterministik açılır (sadece test amaçlı).
- Senaryolar:
  - OTP -> doğrulama -> kişi tercihi ekleme -> check-in tamamla
  - Kişi tercihi eklenmeden check-in butonu pasif

## B) Gerçek Entegrasyon Smoke (Mock'suz, manuel)

1. `npm run dev`
2. Admin panelden şu ayarları aç:
   - `applications_closed=true`
   - `checkin_enabled=true`
   - `otp_enabled=true`
  - (Opsiyonel test) `otp_bypass_enabled=true`
   - `checkin_actions_enabled=true`
3. Public `/` ekranında Check-in formunu aç.
4. Geçerli TC ile OTP iste ve e-postadan kodu gir.
5. En az bir kişi tercihi ekle ve check-in tamamla.

OTP bypass açıkken adım 4 için alternatif:
- Check-in ekranında `OTP'siz Devam Et (Test)` butonu ile doğrudan aksiyon ekranına geç.

## 2) Test Sunucusunda Müşteri UAT

## A) Otomatik Smoke (Uzak URL'e karşı)

PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://<test-server-url>"
npm run test:e2e:checkin
```

CMD:

```cmd
set PLAYWRIGHT_BASE_URL=https://<test-server-url>
npm run test:e2e:checkin
```

Bash:

```bash
PLAYWRIGHT_BASE_URL=https://<test-server-url> npm run test:e2e:checkin
```

Not:
- `PLAYWRIGHT_BASE_URL` set edilince Playwright lokal `npm run dev` başlatmaz.
- Test doğrudan test sunucusuna gider.

## B) Müşteri Manuel UAT Matrisi

1. Check-in ekranı açılıyor mu (`/` üzerinde başvuru yerine check-in)?
2. OTP gönderim mesajı ve maskeli e-posta görünüyor mu?
3. Yanlış OTP'de güvenli hata mesajı geliyor mu?
4. Doğru OTP sonrası kullanıcı özeti (isim/bilet tipi/durum) görünüyor mu?
5. Kişi ekleme alanı çalışıyor mu (ekle/sil)?
6. Kişi eklenmeden check-in butonu pasif mi?
7. Kişi listesi ile check-in başarıyla tamamlanıyor mu?
8. Geri bildirim metinleri anlaşılır ve tutarlı mı?

## 3) Test Verisi Önerisi

- En az 2 TC hazır tut:
  - TC-A: normal check-in için
  - TC-B: alternatif kişi tercih listesi senaryosu için
- Erişilebilir test e-posta hesapları kullan (OTP doğrulaması için).

## 4) Sorun Çıkarsa Hızlı Teşhis

- Check-in ekranı gelmiyorsa: runtime flagleri kontrol et (`applications_closed` + `checkin_enabled`).
- OTP gelmiyorsa: `otp_enabled`, SMTP/Edge log ve spam klasörü kontrol et.
- Kişi tercihleri kaydedilmiyorsa: `checkin_confirm_and_continue` RPC'nin `invalid_preferences` hatası verip vermediğini kontrol et.

## 5) İlgili Dokümanlar

- [11-live-cutover-operational-checklist.md](11-live-cutover-operational-checklist.md)
- [10-checkin-seatmap-status-and-next-steps.md](10-checkin-seatmap-status-and-next-steps.md)
- [05-checkin-otp-rollout-plan.md](05-checkin-otp-rollout-plan.md)
