# Check-in + Seatmap Durum Raporu ve Sonraki Adımlar

> **ARŞİV / NOT-IN-USE (2026-03-04):** Bu doküman seatmap döneminin tarihsel kaydıdır. Aktif üretim akışı kişi tercih listesi modelidir (`preferred_people`).
>
> Güncel referanslar:
> - [03-api-and-data-model.md](03-api-and-data-model.md)
> - [04-test-and-deployment-guide.md](04-test-and-deployment-guide.md)
> - [12-checkin-test-guide-local-and-uat.md](12-checkin-test-guide-local-and-uat.md)
> - [15-legacy-seatmap-archive-note.md](15-legacy-seatmap-archive-note.md)

Tarih: 2026-03-03

Bu doküman, canlıya geçiş öncesi ve sonrası operasyonlarda ekiplerin tek kaynaktan mevcut durumu görebilmesi için hazırlanmıştır.

## 1) Tamamlananlar (Done)

## Check-in ve OTP
- Public route, runtime flag'lere göre başvuru/check-in arasında güvenli geçiş yapar.
- TC + e-posta OTP akışı aktif: OTP isteme, doğrulama, kısa ömürlü oturum.
- OTP gönderimi Supabase e-posta hattı üzerinden çalışır.
- Check-in aksiyonları eklendi:
  - Check-in yapıp masa seçimine devam et
  - Düzenle
  - İptal et

## Seatmap ve Masa Seçimi
- SVG kaynaklı otomatik masa çıkarımı yerine üretim güvenli manuel hotspot yaklaşımı uygulandı.
- `M01`–`M83` masa konumları kalibre edildi ve üretim datasına işlendi.
- Debug/korelasyon araçları üretim kodundan temizlendi.
- Mobil kullanım için zoom/scroll ve seçili masa görünürlüğü iyileştirildi.

## Doluluk ve Kapasite
- Seçilen masa için oturan kişi popup'ı (isim görünümü) eklendi.
- Dolu masa seçimini engelleyen backend guard eklendi (`table_full`).
- Masa kapasitesi artık admin ayarından yönetilebilir hale getirildi:
  - Admin UI: `table_capacity` alanı
  - Backend: `cf_quota_settings.table_capacity` bazlı dinamik kontrol

## 2) Son Eklenen Migrationlar

- `20260302143000_add_runtime_flags_for_checkin.sql`
- `20260302152000_add_checkin_otp_tables_and_rpcs.sql`
- `20260302162000_add_private_issue_checkin_otp_function.sql`
- `20260302174000_add_checkin_action_rpcs.sql`
- `20260303120000_add_get_checkin_table_occupants.sql`
- `20260303123000_add_checkin_table_capacity_guard.sql`
- `20260303131000_table_capacity_admin_setting.sql`

## 3) Mevcut Operasyonel Akış

1. Admin `cf_quota_settings` üzerinden feature flag ve `table_capacity` değerini yönetir.
2. Public kullanıcı TC girer, OTP alır ve doğrular.
3. Check-in aksiyonu seçilir, masa tercihinde doluluk kontrolü RPC seviyesinde uygulanır.
4. Uygun masa seçimiyle check-in tamamlanır.

## 4) Kısa Vadeli Yapılacaklar (Next)

## P0 (Canlıya Geçiş Öncesi)
- Prod ortamında son migrationların sıralı uygulanması.
- Admin panelden `table_capacity` için başlangıç değerinin doğrulanması.
- OTP teslimat oranı ve hata logları için 30 dakikalık canlı gözlem planı.
- Check-in happy-path + yanlış OTP + dolu masa smoke testlerinin prod benzeri ortamda tekrar koşulması.

## P1 (Canlı Sonrası İlk 24 Saat)
- Check-in completion, OTP failure ve `table_full` metriklerinin izlenmesi.
- Support runbook: kullanıcı “masa dolu” geri bildirimleri için hızlı yönlendirme metni.
- Audit/email log günlük kontrolü.

## P2 (İyileştirme)
- Seatmap kapsamı genişleyecekse yeni hotspot batch süreci dokümante edilmesi.
- Check-in ve seatmap için otomatik E2E smoke setinin CI pipeline'a eklenmesi.

## 5) Riskler ve Mitigasyon

- Risk: Yanlış kapasite değeri nedeniyle gereksiz masa kilidi.
  - Mitigasyon: Admin değişikliği sonrası anlık doğrulama + örnek masa kontrolü.
- Risk: OTP teslim gecikmeleri.
  - Mitigasyon: `otp_enabled` kill switch + fallback bilgilendirme.
- Risk: Yoğun anda eşzamanlı masa seçim yarışı.
  - Mitigasyon: UI uyarısına ek olarak RPC seviyesinde zorunlu doluluk kontrolü.

## 6) Hızlı Kontrol Listesi

- [ ] Son migrationlar uygulandı.
- [ ] `cf_quota_settings` satırında `table_capacity` doğru.
- [ ] `applications_closed`, `checkin_enabled`, `otp_enabled`, `checkin_actions_enabled` değerleri cutover planına uygun.
- [ ] Public check-in akışı canlı test edildi.
- [ ] Dolu masa seçimi engeli doğrulandı.
