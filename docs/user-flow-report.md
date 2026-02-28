# DPG 2026 — Başvurucu Kullanıcı Akışı ve İş Mantığı Raporu

---

## 1. Üst Düzey Genel Bakış

```mermaid
flowchart TD
    A([Kullanıcı siteye girer]) --> B{Kota doldu mu?}
    B -- Evet --> Z1[Kota dolu mesajı gösterilir\nForm erişilemez]
    B -- Hayır --> C[Adım 1: TC Kimlik Doğrulama]
    C --> D{Doğrulama sonucu}
    D -- Üye değil --> E1[Hata: TALPA üyesi değilsiniz]
    D -- Borçlu --> E2[Hata: Aidat borcunuz var]
    D -- Kota doldu --> E3[Hata: Kota dolmuştur]
    D -- Zaten kayıtlı --> E4[Hata: Başvuru mevcut]
    D -- Başarılı: LOCKED --> F[Adım 2: Başvuru Formu\n⏱ 10 dk geri sayım başlar]
    F --> G{Süre doldu mu?}
    G -- Evet --> C
    G -- Hayır --> H[Form tamamlanır ve gönderilir]
    H --> I{submit_application sonucu}
    I -- Kota aşıldı --> E3
    I -- Başarılı --> J[E-posta bildirimleri gönderilir\nKullanıcı + Admin]
    J --> K[Başvuru tamamlandı\nAsil veya Yedek listede]
```

---

## 2. Adım Adım Kullanıcı Akışı

### Adım 1 — TC Kimlik Doğrulama (`check_and_lock_slot`)

#### Frontend Kontrolleri (istemci tarafı)

- 11 rakam olmalı; rakam dışı karakter kabul edilmez
- Resmi Türk TC Kimlik algoritması (`isValidTCKimlikNo`):
  - Basamak 10 = `(1+3+5+7+9. rakamlar × 7 − 2+4+6+8. rakamlar) % 10`
  - Basamak 11 = tüm 10 rakam toplamı % 10

#### RPC Kontrolleri (sunucu tarafı — sıralı, transaction içinde)

| Adım | Sorgu | Başarısızlıkta |
|------|-------|----------------|
| 1 | Aktif form var mı? (`cf_forms.is_active = true`) | `form_not_found` |
| 2 | Dinamik kota okunur (`cf_quota_settings`) | Varsayılan: 1500 / 400 / 300 |
| 3 | Whitelist kontrolü (`cf_whitelist.tc_no = ?`) | `not_found` |
| 4 | Borç kontrolü (`cf_whitelist.is_debtor = true`) | `debtor` |
| 5 | **Advisory Lock** alınır (`dpg_quota_lock`) | — |
| 6 | Mevcut başvuru kontrolü (`cf_submissions`) | Zaten kayıtlı |
| 7 | Toplam kota kontrolü | `quota_full` |
| 8 | Bilet türü belirlenir | → `asil` / `yedek` |
| 9 | `cf_submissions` satırı oluşturulur/güncellenir | — |

**Başarı durumunda dönen veri:**
```json
{
  "success": true,
  "status": "locked",
  "ticket_type": "asil | yedek",
  "lock_expires_at": "<UTC timestamp>",
  "remaining_seconds": 600,
  "is_attended_before": true | false
}
```

---

### Adım 2 — Başvuru Formu (`submit_application`)

```mermaid
flowchart LR
    subgraph Form Alanları
        F1[tcNo - hidden]
        F2[name - Ad Soyad ≥2 kelime]
        F3[airline - Havayolu seçimi]
        F3B[airlineOther - Diğer ise zorunlu]
        F4[fleet - Filo seçimi]
        F4B[fleetOther - Diğer ise zorunlu]
        F5[ageGroup - Yaş aralığı]
        F6[email - E-posta]
        F7[phone - 5XX XXX XX XX]
        F8[bringGuest - Misafir var mı?]
        F8B[guestName - Misafir adı zorunlu]
        F9[kvkkApproval - true zorunlu]
        F10[paymentApproval - true zorunlu]
    end
    F3 -- airline=Diğer --> F3B
    F4 -- fleet=Diğer --> F4B
    F8 -- bringGuest=true --> F8B
```

#### 10 Dakika Geri Sayım Mekanizması

- `lock_expires_at` mutlak UTC zamanı olarak saklanır (drift olmaz)
- Her 500ms'de bir kalan süre yeniden hesaplanır: `lockExpiresAt.getTime() - Date.now()`
- Süre dolduğunda kullanıcı **Adım 1'e** geri atılır, `cf_submissions.status = 'locked'` satırı geçersiz kalır

#### `submit_application` RPC sırası

1. TC formatı tekrar doğrulanır
2. `ticket_count = bringGuest ? 2 : 1`
3. Aktif form kontrolü
4. Dinamik kota okunur
5. Whitelist'te `attended_before` değeri alınır
6. Advisory Lock (`dpg_quota_lock`) alınır
7. Mevcut başvuru kontrolü
8. Toplam kota kontrolü (`total_reserved + ticket_count > total_capacity`)
9. Bilet türü belirlenir (çift havuz mantığı)
10. `cf_submissions` tablosuna `INSERT … ON CONFLICT (tc_no) DO UPDATE`

---

## 3. Kota ve Bilet Türü İş Mantığı (Çift Havuz)

```mermaid
flowchart TD
    START([Başvuru geldi]) --> TQ{Toplam kota\ntotal_reserved + ticket_count\n> total_capacity?}
    TQ -- Evet --> FULL[Kota doldu — HATA]
    TQ -- Hayır --> AB{attended_before\n= true?}

    AB -- Evet\nGeri dönen üye --> RET_POOL{Geri dönen havuzu\ndolu mu?\nreturning_reserved\n≥ asil_returning_capacity\ndefault 400}
    RET_POOL -- Hayır --> ASIL1[ticket_type = 'asil']
    RET_POOL -- Evet --> YEDEK1[ticket_type = 'yedek']

    AB -- Hayır\nYeni üye --> NEW_POOL{Yeni üye havuzu\ndolu mu?\nnew_reserved\n≥ asil_new_capacity\ndefault 300}
    NEW_POOL -- Hayır --> ASIL2[ticket_type = 'asil']
    NEW_POOL -- Evet --> YEDEK2[ticket_type = 'yedek']
```

### Kapasite Tablosu (`cf_quota_settings`)

| Alan | Varsayılan | Açıklama |
|------|-----------|----------|
| `total_capacity` | 1500 | Toplam bilet kapasitesi |
| `asil_returning_capacity` | 400 | Önceki etkinliğe katılanlar için asil kontenjan |
| `asil_new_capacity` | 300 | Yeni katılımcılar için asil kontenjan |
| Asil toplam | 700 | 400 + 300 |
| Yedek | 800 | 1500 − 700 |

---

## 4. Başvuru Durum (Status) Makine Diyagramı

```mermaid
stateDiagram-v2
    [*] --> locked : check_and_lock_slot başarılı\n(10 dk soft lock)
    locked --> expired : 10 dk doldu\n(slot serbest bırakılır)
    locked --> pending : submit_application başarılı
    locked --> cancelled : Kullanıcı vazgeçti\n(cancel_token ile)
    pending --> approved : Admin onayladı
    pending --> rejected : Admin reddetti
    approved --> cancelled : Admin iptal etti
    expired --> [*] : Slot tekrar kullanılabilir
    cancelled --> [*]
    rejected --> [*]
```

---

## 5. E-Posta Bildirimleri

Başvuru başarıyla tamamlandıktan sonra **arka planda** (hata akışı bloklamamaz) iki e-posta tetiklenir:

| Alıcı | `email_type` | İçerik |
|-------|-------------|--------|
| Kullanıcı | `application_received` | Bilet türü (Asil/Yedek), yedek sıra numarası |
| Admin (`dpg@talpa.org`) | `admin_new_application` | Tam başvuru özeti |

---

## 6. Eşzamanlılık (Concurrency) Koruması

```mermaid
sequenceDiagram
    participant U1 as Kullanıcı 1
    participant U2 as Kullanıcı 2
    participant DB as PostgreSQL

    U1->>DB: check_and_lock_slot(tc_1)
    U2->>DB: check_and_lock_slot(tc_2)
    Note over DB: pg_advisory_xact_lock('dpg_quota_lock')\nAynı anda yalnızca biri devam eder
    DB-->>U1: locked, ticket_type=asil (599. slot)
    DB-->>U2: locked, ticket_type=asil (700. slot)
    U1->>DB: submit_application(tc_1)
    U2->>DB: submit_application(tc_2)
    Note over DB: pg_advisory_xact_lock('dpg_quota_lock')\nAynı kilit — sıralı çalışır
    DB-->>U1: pending, asil
    DB-->>U2: pending, yedek (asil havuzu doldu)
```

- `check_and_lock_slot` ve `submit_application` her ikisi de aynı `hashtext('dpg_quota_lock')` anahtarını kullanır
- Bu sayede TC doğrulama ve form gönderimi arasında kota kaynağı yarışı (race condition) oluşmaz

---

## 7. Hata Senaryoları ve Kullanıcı Mesajları

| `error_type` | Kim tarafından döner | Kullanıcıya gösterilen |
|-------------|---------------------|----------------------|
| `not_found` | `check_and_lock_slot` | "TALPA üyesi değilsiniz" + üyelik bağlantısı |
| `debtor` | `check_and_lock_slot` | "Aidat borcunuz var" + ödeme bağlantısı |
| `quota_full` | Her iki RPC | "Asil ve yedek kotalar dolmuştur" |
| `already_submitted` (pending/approved) | `check_and_lock_slot` | "Bu TC ile daha önce başvuru yapılmıştır" |
| `locked` (aktif kilit) | `check_and_lock_slot` | Devam eden oturum bilgisi, kalan süre |
| Lock süresi doldu | Frontend timer | "Süreniz doldu, lütfen TC'nizi tekrar giriniz" → Adım 1 |
| Kota aşımı (`submit_application` sırasında) | `submit_application` | "Kota dolmuştur" |
| Ağ / bilinmeyen hata | any | "Sistem hatası, lütfen tekrar deneyin" |

---

## 8. Kota İzleme (Frontend)

- Sayfa yüklendiğinde `get_ticket_stats()` RPC çağrılır
- **Her 10 saniyede** tekrar çağrılarak kota durumu canlı güncellenir
- `total_reserved >= total_capacity` olduğunda form tamamen devre dışı kalır, sadece "kota dolu" mesajı gösterilir

---

## 9. Teknik Özet Tablosu

| Katman | Teknoloji / Bileşen |
|--------|---------------------|
| Frontend state | `useApplicationForm` hook (React, 3 adım) |
| Form validasyonu | Zod schema (`applicationFormSchema`) |
| RPC: slot kilitleme | `check_and_lock_slot` (PostgreSQL, SECURITY DEFINER) |
| RPC: form gönderme | `submit_application` (PostgreSQL, SECURITY DEFINER) |
| RPC: kota okuma | `get_ticket_stats` (dinamik, `cf_quota_settings`) |
| Concurrency koruması | `pg_advisory_xact_lock(hashtext('dpg_quota_lock'))` |
| Kota havuzu sistemi | Çift havuz: geri dönen (400) + yeni (300) |
| Soft lock süresi | 10 dakika (`soft_lock_until`) |
| E-posta bildirimleri | Supabase Edge Function `send-bulk-email` (arka plan) |
| Auth | Supabase Auth — yalnızca admin; form public |
