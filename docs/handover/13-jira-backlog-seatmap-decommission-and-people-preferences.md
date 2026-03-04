# Jira Backlog — Seatmap Decommission + Kişi Tercih Listesi Geçişi

> **ARŞİV / COMPLETED (2026-03-04):** Bu backlog planı tarihsel kayıttır; geçiş maddeleri uygulanmıştır. Aktif operasyon ve test referansı için [12-checkin-test-guide-local-and-uat.md](12-checkin-test-guide-local-and-uat.md) ve [15-legacy-seatmap-archive-note.md](15-legacy-seatmap-archive-note.md) kullanılmalıdır.

Bu doküman, masa seçimi sistemini kontrollü şekilde kaldırıp yerine "oturmak istediği kişiler" modeline geçiş için Jira'ya doğrudan girilebilir iş kırılımı sunar.

## 1) Planlama Çerçevesi

- Sprint süresi: 2 hafta
- Önerilen toplam: 3 sprint
- Story point ölçeği: Fibonacci (1, 2, 3, 5, 8)
- Öncelik: P0 (kritik), P1 (yüksek), P2 (orta)

## 2) Epic Listesi

## EPIC-PREF-01 — Veri Modeli ve RPC Geçişi
Amaç: Seatmap bağımlılığını bozmadan kişi tercih listesi veri modelini eklemek ve check-in RPC'lerini geçişe hazır hale getirmek.

## EPIC-PREF-02 — Frontend Akış Geçişi
Amaç: Check-in ekranını masa seçimi yerine kişi tercih listesi seçim UI'ına çevirmek.

## EPIC-PREF-03 — Decommission ve Operasyon
Amaç: Seatmap sistemini kontrollü kapatmak, eski kodu temizlemek, test ve runbook güncellemek.

---

## 3) Sprint Bazlı Backlog

## Sprint 1 — Additive Geçiş Altyapısı (Öneri: 24-30 SP)

### Story: PREF-101 (P0, 8 SP)
**Başlık:** Kişi tercih veri modeli ekle (additive)

Acceptance Criteria:
- Kişi tercihlerini saklayan yeni alan/tablo eklendi (ör. `preferred_people`).
- Mevcut seatmap verisiyle çakışmıyor.
- Eski akış bozulmadan migration uygulanabiliyor.

Tasklar:
- Migration: yeni alan/tablo + index.
- Geriye dönük default/backfill kuralı.
- Veri sözleşmesi dokümantasyonu.

---

### Story: PREF-102 (P0, 8 SP)
**Başlık:** `checkin_confirm_and_continue` kişi tercihi payload desteği

Acceptance Criteria:
- RPC, masa bilgisi olmadan kişi tercih payload'ını kabul eder.
- Seatmap'e bağlı `table_full` zorunluluğu yeni akışta aranmaz.
- İstek/yanıt kontratı net ve test edilebilir.

Tasklar:
- RPC güncellemesi (backward compatible).
- Validation ve allowlist kuralları.
- Integration test.

---

### Story: PREF-103 (P1, 5 SP)
**Başlık:** Geçiş feature flag ve fallback planı

Acceptance Criteria:
- Yeni UI akışı flag ile açılıp kapanabilir.
- Geçiş sırasında eski akışa dönüş senaryosu çalışır.

Tasklar:
- `people_preference_enabled` benzeri flag.
- Admin panel toggle.
- Cutover notları.

---

### Story: PREF-104 (P1, 3 SP)
**Başlık:** Seatmap bağımlılık envanteri ve deprecation etiketi

Acceptance Criteria:
- Seatmap bağımlı dosya/fonksiyon listesi çıkarıldı.
- Hangi release'te kaldırılacağı netleştirildi.

Tasklar:
- Kod envanteri.
- Dokümana deprecation notu.

---

## Sprint 2 — UI Geçişi ve Doğrulama (Öneri: 26-32 SP)

### Story: PREF-201 (P0, 8 SP)
**Başlık:** Check-in UI: kişi tercih listesi seçimi

Acceptance Criteria:
- Masa picker tamamen kaldırılır veya pasifleştirilir.
- Kullanıcı kişi arayıp tercih listesine ekleyebilir/silebilir.
- Kaydet akışı yeni RPC payload'ına bağlanır.

Tasklar:
- `CheckinForm` refactor.
- Yeni seçim bileşeni.
- Hata/başarı mesajları.

---

### Story: PREF-202 (P0, 5 SP)
**Başlık:** Admin ekranlarında seatmap kapasite alanını pasifleştir

Acceptance Criteria:
- `table_capacity` UI'da ya gizli ya da "deprecated" olarak işaretli.
- Operasyonel kafa karışıklığı yaratmıyor.

Tasklar:
- `QuotaSettings` güncellemesi.
- Bilgilendirme metni.

---

### Story: PREF-203 (P0, 8 SP)
**Başlık:** E2E + integration test setini yeni akışa taşı

Acceptance Criteria:
- Check-in e2e testleri kişi tercih akışını kapsar.
- Seatmap testleri kaldırılır veya arşivlenir.
- Negatif senaryolar: boş tercih, invalid payload, oturum süresi.

Tasklar:
- Playwright test güncellemesi.
- RPC integration test güncellemesi.

---

### Story: PREF-204 (P1, 3 SP)
**Başlık:** UAT script ve müşteri test rehberi güncelle

Acceptance Criteria:
- Lokal ve test sunucusu rehberinde seatmap yerine kişi tercih adımları var.
- Müşteri kabul kriterleri güncellendi.

Tasklar:
- Doküman güncelleme.
- UAT checklist revizyonu.

---

## Sprint 3 — Hard Cleanup ve Stabilizasyon (Öneri: 20-24 SP)

### Story: PREF-301 (P0, 5 SP)
**Başlık:** Seatmap frontend kodunu kaldır

Acceptance Criteria:
- `TableLayoutPicker` ve hotspot datası kullanım dışı.
- Build/test temiz.

Tasklar:
- Bileşen/asset temizliği.
- Import kullanım kontrolü.

---

### Story: PREF-302 (P0, 8 SP)
**Başlık:** Seatmap backend artefaktlarını kaldırma migrationı

Acceptance Criteria:
- Kullanılmayan table RPC/fonksiyonları kaldırılır veya no-op yapılır.
- `table_capacity` gereksizse kaldırma planı uygulanır.
- DDL değişiklikleri rollback notu ile gelir.

Tasklar:
- Decommission migration.
- Rollback migration.
- Güvenlik/advisor kontrolü.

---

### Story: PREF-303 (P1, 3 SP)
**Başlık:** Post-cutover gözlem ve raporlama

Acceptance Criteria:
- 24 saatlik hata/başarı metrik özeti çıkarıldı.
- Yeni akışta kritik incident yok.

Tasklar:
- Log ve metrik değerlendirmesi.
- Kapanış raporu.

---

### Story: PREF-304 (P1, 3 SP)
**Başlık:** Dokümantasyon son temizlik

Acceptance Criteria:
- Handover ve operasyon dokümanlarında seatmap referansları güncellendi.
- Eski/yanıltıcı anlatımlar kaldırıldı.

Tasklar:
- Handover güncellemeleri.
- README link kontrolü.

---

## 4) Bağımlılık Haritası

- PREF-101 -> PREF-102 -> PREF-201
- PREF-103 -> PREF-201
- PREF-201 -> PREF-203 -> PREF-301
- PREF-301 -> PREF-302
- PREF-302 -> PREF-303 -> PREF-304

## Kritik Yol
`PREF-101 -> PREF-102 -> PREF-201 -> PREF-203 -> PREF-301 -> PREF-302`

---

## 5) Jira CSV Import Dosyası

Team-managed import için hazır dosya:
- [14-jira-import-team-managed-seatmap-decommission-and-people-preferences.csv](14-jira-import-team-managed-seatmap-decommission-and-people-preferences.csv)
