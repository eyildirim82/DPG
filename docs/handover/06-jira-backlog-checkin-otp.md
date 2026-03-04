# Jira Backlog — Check-in + E-posta OTP

Bu doküman, [05-checkin-otp-rollout-plan.md](05-checkin-otp-rollout-plan.md) temel alınarak doğrudan Jira'ya girilebilir iş kırılımı sunar.

## 1) Planlama Çerçevesi

- Sprint süresi: 2 hafta
- Önerilen toplam: 3 sprint
- Story point ölçeği: Fibonacci (1, 2, 3, 5, 8)
- Öncelik: P0 (kritik), P1 (yüksek), P2 (orta)

## Tanımlar
- **DoR (Definition of Ready):** Story bağımlılıkları net, acceptance criteria yazılı, test yaklaşımı belirli.
- **DoD (Definition of Done):** Kod + test + dokümantasyon + staging doğrulaması tamam.

---

## 2) Epic Listesi

## EPIC-CHK-01 — Runtime Flags ve Güvenli Route Geçişi
Amaç: Başvuru açık/kapalı durumuna göre public ekranı güvenli şekilde yöneten altyapı.

## EPIC-CHK-02 — OTP Backend (Supabase RPC + RLS)
Amaç: TC bazlı e-posta OTP üretme/doğrulama ve kısa ömürlü check-in session yönetimi.

## EPIC-CHK-03 — OTP E-posta Gönderimi (Edge Function)
Amaç: OTP kodunun güvenli ve izlenebilir şekilde e-posta ile gönderilmesi.

## EPIC-CHK-04 — Check-in Frontend Akışı
Amaç: TC giriş, OTP doğrulama, başvuru özeti ve 3 aksiyon ekranları.

## EPIC-CHK-05 — Test, Cutover ve Rollback Operasyonu
Amaç: Regresyonu engelleyen test seti ve canlı geçiş runbook'u.

---

## 3) Sprint Bazlı Backlog

## Sprint 1 — Backend Temel (Öneri: 26-32 SP)

### Story: CHK-101 (P0, 5 SP)
**Başlık:** Runtime flag modeli oluştur

Acceptance Criteria:
- `applications_closed`, `checkin_enabled`, `otp_enabled`, `checkin_actions_enabled` flagleri DB'de tanımlı.
- Varsayılan değerler mevcut akışı bozmayacak şekilde `false`.
- Flag okuma için tek bir RPC/yardımcı katman mevcut.

Tasklar:
- Migration: flag kolonları veya `cf_runtime_flags` tablosu.
- Seed/default değerler.
- Admin panel entegrasyonu için API hazırlığı (UI sonra).

---

### Story: CHK-102 (P0, 8 SP)
**Başlık:** OTP request/verify veri modeli ve RPC iskeleti

Acceptance Criteria:
- `cf_checkin_otp_requests` ve `cf_checkin_sessions` tabloları eklendi.
- `request_checkin_otp` ve `verify_checkin_otp` RPC imzaları çalışıyor.
- OTP plain-text saklanmıyor, yalnız hash tutuluyor.

Tasklar:
- Migration (tablolar + indexler).
- RPC fonksiyonlarının ilk sürümü.
- Hata kod sözlüğü (`error_type`) standardizasyonu.

---

### Story: CHK-103 (P0, 5 SP)
**Başlık:** OTP güvenlik kuralları (TTL, attempt, cooldown)

Acceptance Criteria:
- OTP TTL (örn. 5 dk) enforce ediliyor.
- Max deneme (örn. 5) sonrası kod geçersizleşiyor.
- Cooldown çalışıyor, tekrar istek flood'u engelleniyor.

Tasklar:
- TTL/attempt/cooldown logic.
- Replay koruması (consume once).
- Audit log alanları.

---

### Story: CHK-104 (P0, 5 SP)
**Başlık:** RLS ve direct erişim kısıtları

Acceptance Criteria:
- OTP tablolarında direct select/insert/update client'tan engelli.
- Sadece SECURITY DEFINER RPC path'i açık.
- Policy testleri geçiyor.

Tasklar:
- RLS policy migrationları.
- Security test scriptleri.

---

### Story: CHK-105 (P1, 3 SP)
**Başlık:** OTP e-posta template ve log altyapısı

Acceptance Criteria:
- `otp_checkin` şablonu ekli.
- Gönderim logları takip edilebilir.
- Hata durumunda kullanıcı akışı güvenli mesajla döner.

Tasklar:
- Template ekleme.
- Log mapleme.

---

## Sprint 2 — Frontend + E2E (Öneri: 28-34 SP)

### Story: CHK-201 (P0, 8 SP)
**Başlık:** Public route switch (başvuru vs check-in)

Acceptance Criteria:
- `applications_closed=false` iken mevcut başvuru ekranı birebir çalışır.
- `applications_closed=true` + `checkin_enabled=true` iken check-in ekranı açılır.
- Flag tutarsızlığında güvenli fallback ekranı görünür.

Tasklar:
- Route gate komponenti.
- Flag fetch/cache yönetimi.
- Regresyon smoke test.

---

### Story: CHK-202 (P0, 8 SP)
**Başlık:** Check-in adım 1-2 (TC girişi + OTP doğrulama)

Acceptance Criteria:
- Kullanıcı TC ile OTP isteyebilir.
- Maskelenmiş e-posta gösterilir.
- OTP doğrulama ekranında kalan süre ve resend cooldown görünür.

Tasklar:
- `request_checkin_otp` entegrasyonu.
- `verify_checkin_otp` entegrasyonu.
- Hata mesaj mapleme (invalid/expired/rate-limit).

---

### Story: CHK-203 (P0, 8 SP)
**Başlık:** Check-in adım 3 (özet + aksiyonlar)

Acceptance Criteria:
- OTP doğrulanan kullanıcı başvuru özeti ve bilet tipini görür.
- Üç aksiyon görünür ve çalışır:
  - Check-in yap ve Masa Seçimine devam et
  - Düzenle
  - İptal et

Tasklar:
- Özet ekranı.
- Aksiyon RPC entegrasyonu.
- Başarı/hata UI durumları.

---

### Story: CHK-204 (P1, 5 SP)
**Başlık:** Session token yaşam döngüsü ve güvenli state yönetimi

Acceptance Criteria:
- Session token kısa ömürlü ve replay'e dayanıklı.
- LocalStorage'a yazılmadan geçici state'te tutulur.
- Token expire senaryosunda kullanıcı yeniden OTP adımına döner.

Tasklar:
- Token memory-state yönetimi.
- Expire handler.

---

### Story: CHK-205 (P0, 5 SP)
**Başlık:** E2E senaryoları (check-in)

Acceptance Criteria:
- Happy path + invalid OTP + expired OTP + cancel + edit + continue senaryoları geçer.
- Mevcut başvuru akışı smoke regresyonu geçer.

Tasklar:
- Playwright testleri.
- CI'da smoke ve full e2e ayrımı.

---

## Sprint 3 — Pilot, Cutover, Stabilizasyon (Öneri: 20-24 SP)

### Story: CHK-301 (P0, 5 SP)
**Başlık:** Internal pilot guard

Acceptance Criteria:
- OTP/check-in yalnız internal whitelist için açılabilir.
- Pilot kullanıcıları dışında sistem etkilenmez.

Tasklar:
- RPC içi allowlist guard.
- Pilot test checklist.

---

### Story: CHK-302 (P0, 5 SP)
**Başlık:** Cutover runbook ve görev paylaşımı

Acceptance Criteria:
- T-1, T-0, T+1h, T+24h adımları yazılı.
- Sorumlular (FE/BE/Ops) ve karar ağacı net.

Tasklar:
- Operasyon runbook.
- On-call iletişim akışı.

---

### Story: CHK-303 (P0, 5 SP)
**Başlık:** Rollback ve kill-switch testi

Acceptance Criteria:
- `applications_closed=false` ile hızlı geri dönüş test edildi.
- `otp_enabled=false` ve `checkin_enabled=false` adımları doğrulandı.
- Geri alma süresi 5 dk altında ölçüldü.

Tasklar:
- Dry-run rollback.
- Ölçüm raporu.

---

### Story: CHK-304 (P1, 5 SP)
**Başlık:** Canlı metrik ve alarm seti

Acceptance Criteria:
- OTP send fail rate alarmı.
- OTP verify fail spike alarmı.
- Check-in completion rate paneli.

Tasklar:
- Dashboard/panel.
- Alert threshold tanımı.

---

### Story: CHK-305 (P1, 3 SP)
**Başlık:** Post-release değerlendirme

Acceptance Criteria:
- İlk 24 saat olay raporu hazırlanır.
- İyileştirme backlog'u açılır.

Tasklar:
- Postmortem template.
- İyileştirme ticketları.

---

## 4) Bağımlılık Haritası

- CHK-101 -> CHK-201
- CHK-102 -> CHK-202
- CHK-103 -> CHK-202/203
- CHK-104 -> CHK-205/303
- CHK-105 -> CHK-202
- CHK-201/202 -> CHK-203
- CHK-205 -> CHK-301/302
- CHK-301/302 -> CHK-303 -> CHK-304

## Kritik Yol
`CHK-102 -> CHK-103 -> CHK-202 -> CHK-203 -> CHK-205 -> CHK-302 -> CHK-303`

---

## 5) Jira Alan Şablonu (Öneri)

Her story için aşağıdaki alanlar doldurulmalı:
- Summary
- Description
- Acceptance Criteria
- Priority (P0/P1/P2)
- Story Points
- Dependencies (issue link)
- Test Notes
- Rollback Notes

Önerilen label seti:
- `checkin`
- `otp`
- `supabase`
- `migration`
- `e2e`
- `rollout`

---

## 6) Global Definition of Done

Bir story `Done` sayılmadan önce:
- Kod review tamamlandı.
- İlgili unit/integration/e2e testleri geçti.
- Feature flag varsayılanı canlı güvenli durumda.
- Dokümantasyon güncellendi.
- Rollback notu issue içine yazıldı.

## 7) Uygulama Notu

Canlı riski nedeniyle tüm check-in story'leri **incremental + flag kontrollü** merge edilmelidir. Tek parça büyük release yapılmamalıdır.

## 8) Jira CSV Import Dosyası

Doğrudan import için hazırlanmış örnek dosya:
- [07-jira-import-checkin-otp.csv](07-jira-import-checkin-otp.csv)

Jira proje tipine göre optimize edilmiş dosyalar:
- Company-managed: [08-jira-import-company-managed-checkin-otp.csv](08-jira-import-company-managed-checkin-otp.csv)
- Team-managed: [09-jira-import-team-managed-checkin-otp.csv](09-jira-import-team-managed-checkin-otp.csv)

## 9) Jira Import Hızlı Rehber

## Company-managed proje için
1. Jira'da CSV import ekranını aç.
2. [08-jira-import-company-managed-checkin-otp.csv](08-jira-import-company-managed-checkin-otp.csv) dosyasını seç.
3. Alan eşlemede şunları doğrula:
  - `Issue Id` -> External issue id
  - `Parent Id` -> Parent
  - `Epic Name` -> Epic Name
  - `Epic Link` -> Epic Link
  - `Story point estimate` -> Story Points (instance alan adı farklı olabilir)
4. Ön izleme sonrası importu çalıştır.

## Team-managed proje için
1. CSV import ekranını aç.
2. [09-jira-import-team-managed-checkin-otp.csv](09-jira-import-team-managed-checkin-otp.csv) dosyasını seç.
3. Alan eşlemede şunları doğrula:
  - `Issue Id` -> External issue id
  - `Parent Id` -> Parent
  - `Story point estimate` -> Story Points/Estimate
4. Team-managed'da `Epic Link` kullanılmadığı için hiyerarşi `Parent Id` ile kurulur.

## Not
- Jira instance'ına göre Story Point alan adı `Story point estimate`, `Story Points` veya özel alan olabilir.
- İlk importu staging/sandbox projede test etmek önerilir.
