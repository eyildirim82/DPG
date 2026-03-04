# Canlı Geçiş Operasyon Checklisti (Tek Sayfa)

Tarih: 2026-03-04
Kapsam: Başvuru ekranından Check-in + OTP + kişi tercih listesi akışına canlı ve güvenli geçiş.

## 1) T-24 Saat Hazırlık

- [ ] Son migration seti doğrulandı:
  - `20260302143000_add_runtime_flags_for_checkin.sql`
  - `20260302152000_add_checkin_otp_tables_and_rpcs.sql`
  - `20260302162000_add_private_issue_checkin_otp_function.sql`
  - `20260302174000_add_checkin_action_rpcs.sql`
  - `20260304113000_deprecate_seatmap_rpcs_and_enforce_people_preferences.sql`
  - `20260304130000_drop_legacy_table_capacity_column.sql`
  - `20260304133000_drop_legacy_get_checkin_table_occupants_rpc.sql`
- [ ] Rollback karar sorumluları ve iletişim kanalı netleştirildi.
- [ ] SMTP/OTP teslimatının çalıştığı staging/prod-benzeri ortamda doğrulandı.
- [ ] En az 1 smoke testi başarıyla geçti (OTP + kişi ekle + check-in).

## 2) T-2 Saat Preflight

- [ ] Admin giriş ve kritik sayfalar erişilebilir.
- [ ] Eski public akış halen çalışır durumda (`applications_closed=false`).
- [ ] Son frontend build artefact'ı hazır ve deploy adımı beklemede.
- [ ] İzlenecek metrikler/ekranlar açık:
  - OTP hata oranı
  - Check-in completion oranı
  - `invalid_preferences` dönüş yoğunluğu

## 3) T0 Cutover Sırası

Adımlar sırayla uygulanır, her adım sonrası 1-2 dakikalık hızlı doğrulama yapılır.

1. [ ] Gerekliyse migrationları kronolojik sırada uygula.
2. [ ] Frontend canlı deployunu tamamla.
3. [ ] Flag geçişini uygula:
   - `applications_closed=true`
   - `checkin_enabled=true`
   - `otp_enabled=true`
   - `checkin_actions_enabled=true`
4. [ ] Smoke-1: Geçerli TC ile OTP iste/doğrula.
5. [ ] Smoke-2: Kişi tercihi ekleme/silme etkileşimini doğrula.
6. [ ] Smoke-3: Kişi listesi ile check-in tamamla.
7. [ ] Smoke-4: Kişi eklemeden submit'in engellendiğini doğrula.

## 4) T+30 Dakika Stabilizasyon

- [ ] OTP başarı/başarısızlık oranı normal aralıkta.
- [ ] Kritik JS/RPC hatası artışı yok.
- [ ] Kişi tercihi akışı kaynaklı destek bildirimi anormal değil.
- [ ] En az 1 gerçek kullanıcı akışı başarıyla tamamlandı.

## 5) Acil Geri Alma (Rollback)

Önce hızlı feature rollback, sonra teknik müdahale:

1. [ ] `applications_closed=false` (public başvuru ekranına dön).
2. [ ] `otp_enabled=false` (OTP akışını kapat).
3. [ ] `checkin_enabled=false` (check-in'i tamamen durdur).
4. [ ] Gerekirse `checkin_actions_enabled=false`.
5. [ ] Olay kaydı + kök neden analizi başlat.

## 6) Operasyonel Default Değerler

- OTP TTL: 5 dk.
- OTP cooldown: 60 sn.
- Check-in session TTL: 15 dk.

## 7) Kapanış (T+24 Saat)

- [ ] Audit ve email log post-check tamamlandı.
- [ ] Kullanıcı geri bildirimleri sınıflandırıldı (OTP, kişi tercihi, performans).
- [ ] Bir sonraki iyileştirme backlog maddeleri açıldı.
