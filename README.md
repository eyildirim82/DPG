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
- [Yazılım Devir Dokümanı](docs/handover/DEVIR_DOKUMANTASYONU.md)
- [Mimari ve Klasör Yapısı](docs/handover/01-architecture-and-folder-structure.md)
- [ADR ve AI Mantık İncelemesi](docs/handover/02-adr-and-ai-logic-review.md)
- [API ve Veri Modeli](docs/handover/03-api-and-data-model.md)
- [Test ve Deployment Rehberi](docs/handover/04-test-and-deployment-guide.md)

## Teknoloji Yığını
- Frontend: React 18, Vite, Tailwind CSS
- Form/Validation: React Hook Form, Zod
- Backend: Supabase (PostgreSQL, RPC, RLS, Edge Functions)
- Test: Vitest, Playwright
