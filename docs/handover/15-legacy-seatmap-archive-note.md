# Legacy Seatmap Arşiv Notu

Tarih: 2026-03-04
Durum: **ARŞİV / NOT-IN-USE**

Bu not, seatmap tabanlı check-in dönemine ait dosyaların tarihsel referans olarak tutulduğunu, ancak aktif operasyon akışında kullanılmadığını belirtir.

## Kapsam

Aşağıdaki başlıklar tarihsel kayıttır:
- Seatmap/hotspot tabanlı kullanıcı akışı
- `get_checkin_table_occupants` aktif kullanım senaryosu
- `table_capacity` ile canlı masa yönetimi anlatımları
- `table_full` odaklı test ve runbook senaryoları

## Güncel Aktif Model

- Check-in tamamlamada kişi tercih listesi (`preferred_people`) kullanılır.
- `checkin_confirm_and_continue` RPC, kişi listesi modelini zorunlu tutar.
- `get_checkin_table_occupants` RPC'si hard cleanup ile kaldırılmıştır.

## Referans

- Uygulanan migration: `20260304113000_deprecate_seatmap_rpcs_and_enforce_people_preferences.sql`
- Teknik borç kapanış migrationı: `20260304130000_drop_legacy_table_capacity_column.sql`
- Hard cleanup migrationı: `20260304133000_drop_legacy_get_checkin_table_occupants_rpc.sql`
- Güncel dokümanlar:
  - [03-api-and-data-model.md](03-api-and-data-model.md)
  - [04-test-and-deployment-guide.md](04-test-and-deployment-guide.md)
  - [12-checkin-test-guide-local-and-uat.md](12-checkin-test-guide-local-and-uat.md)
