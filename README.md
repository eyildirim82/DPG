# TALPA DPG 2026

TALPA Dünya Pilotlar Günü 2026 etkinliği için geliştirilmiş, başvuru toplama ve yönetim odaklı bir React + Supabase uygulamasıdır.

## Hızlı Başlangıç

### Gereksinimler
- Node.js 20
- npm 10+
- Supabase projesi (URL + anon/publishable key)

### Kurulum
```bash
npm install
```

### Ortam Değişkenleri
Proje kökünde `.env` dosyası oluşturun:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ENABLE_APPLICATION_COUNTDOWN=true
```

### Çalıştırma
```bash
npm run dev
```

### Build
```bash
npm run build
npm run preview
```

## Test Komutları

### Unit/Integration (Vitest)
```bash
npm run test
npm run test:coverage
npm run test:integration
```

### E2E (Playwright)
```bash
npm run test:e2e
npm run test:e2e:headed
```

### Stres / Güvenlik
```bash
npm run test:stress
npm run test:security
```

## Route Özeti
- `/`: Public landing + başvuru
- `/apply`: Devre dışı (bilinçli redirect)
- `/admin/login`: Supabase Auth giriş
- `/admin/*`: Korumalı yönetim ekranları

## Mimari ve Devir Dokümanları
- Active vs Archive özeti için: [Handover Index](docs/handover/00-index.md)

- [Yazılım Devir Dokümanı](docs/handover/DEVIR_DOKUMANTASYONU.md)
- [Handover Index (Active vs Archive)](docs/handover/00-index.md)
- [Mimari ve Klasör Yapısı](docs/handover/01-architecture-and-folder-structure.md)
- [ADR ve AI Mantık İncelemesi](docs/handover/02-adr-and-ai-logic-review.md)
- [API ve Veri Modeli](docs/handover/03-api-and-data-model.md)
- [Test ve Deployment Rehberi](docs/handover/04-test-and-deployment-guide.md)
- [Check-in + OTP Canlı Geçiş Planı](docs/handover/05-checkin-otp-rollout-plan.md)
- [Check-in + Seatmap Durum ve Sonraki Adımlar](docs/handover/10-checkin-seatmap-status-and-next-steps.md)
- [Canlı Geçiş Operasyon Checklisti (Tek Sayfa)](docs/handover/11-live-cutover-operational-checklist.md)
- [Check-in Test Rehberi (Lokal + Test Sunucusu)](docs/handover/12-checkin-test-guide-local-and-uat.md)
- [Seatmap Decommission Jira Backlog](docs/handover/13-jira-backlog-seatmap-decommission-and-people-preferences.md)
- [Seatmap Decommission Jira CSV (Team-managed)](docs/handover/14-jira-import-team-managed-seatmap-decommission-and-people-preferences.csv)

## Teknoloji Yığını
- Frontend: React 18, Vite, Tailwind CSS
- Form/Validation: React Hook Form, Zod
- Backend: Supabase (PostgreSQL, RPC, RLS, Edge Functions)
- Test: Vitest, Playwright
