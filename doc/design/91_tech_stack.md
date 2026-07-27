# 91 — Tech Stack و Dependencies

> انتخاب فناوری برای ارتقای سه اپ + packages مشترک

---

## ۱. Monorepo Layout (پیشنهادی)

پروژه فعلی monorepo با `services/*` و `apps/*` است. پیشنهاد افزودن:

```
packages/
├─ design-system/        ← اشتراک سه اپ
├─ ui-utils/             ← utilهای React
├─ api-client/           ← generated clients (openapi)
├─ i18n/                 ← پیام‌های فارسی مشترک
└─ date-jalali/          ← wrapper date-fns-jalali
```

Tooling: **Turborepo** یا **Nx** (بر اساس ترجیح تیم). Bun به‌عنوان PM (طبق `bun.lock`).

---

## ۲. Core Frontend Stack

| لایه | انتخاب | دلیل |
|------|--------|------|
| Framework | **Next.js 14+** (App Router) | SSR/RSC، streaming، perf |
| Runtime | **React 18+** | Server Components |
| Language | **TypeScript 5.x strict** | type-safe |
| Styling | **Tailwind CSS 3.4+** + CSS vars | utility + token-driven |
| Components | **Radix Primitives + shadcn/ui** | headless + accessible |
| Icons | **lucide-react** + custom SVG | سبک، tree-shakable |
| State (client) | **Zustand** + **TanStack Query** | ساده، powerful |
| Forms | **react-hook-form + zod** | performant + validated |
| Animations | **framer-motion** + CSS | layout + gesture |
| Charts | **ECharts** + **echarts-for-react** | RTL، perf |
| Maps | **Leaflet** یا **NeshanMap** | بومی |
| Date (Jalali) | **date-fns-jalali** | immutable |
| i18n | **next-intl** یا `react-intl` | RTL support |
| PWA | **next-pwa** + Workbox | SW strategies |
| Testing | **Vitest + Playwright + Testing Library** | سریع |
| A11y | **axe-core + pa11y** | خودکار |

---

## ۳. AI / Copilot Stack

| نیاز | انتخاب |
|------|--------|
| LLM gateway | internal API به `knowledge-layer-service` |
| Streaming | Server-Sent Events |
| Voice STT | Web Speech API → Azure/Google STT fallback |
| Document OCR | Tesseract.js (client) + document-ai service (server) |
| Embeddings | متمرکز در knowledge-layer-service |
| PII redaction | regex + NER server-side قبل از LLM |

---

## ۴. Auth / Security Stack

- **Auth.js (next-auth)** یا wrapper روی IAM موجود
- **@simplewebauthn** برای Passkeys
- **Web OTP API** برای SMS auto-read
- **Argon2** برای hash (اگر نیاز به backup password)
- **CSP strict** + Trusted Types
- **Subresource Integrity** روی CDN

---

## ۵. Observability Stack

- **Sentry** (web) برای error tracking
- **OpenTelemetry** web SDK → Jaeger backend موجود
- **web-vitals** + custom endpoint
- **LogRocket** (اختیاری، با privacy mask برای PII)

---

## ۶. Dependencies اضافه‌شدنی به customer-portal-ui

```jsonc
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1",
    "@radix-ui/react-popover": "^1",
    "@radix-ui/react-toast": "^1",
    "@radix-ui/react-tabs": "^1",
    "@radix-ui/react-dropdown-menu": "^2",
    "@tanstack/react-query": "^5",
    "@tanstack/react-virtual": "^3",
    "zustand": "^4",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "zod": "^3",
    "framer-motion": "^11",
    "lucide-react": "^0.400",
    "date-fns-jalali": "^3",
    "next-pwa": "^5",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "echarts": "^5",
    "echarts-for-react": "^3",
    "@simplewebauthn/browser": "^10",
    "idb-keyval": "^6"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4",
    "@playwright/test": "^1",
    "vitest": "^1",
    "@testing-library/react": "^15",
    "eslint-plugin-jsx-a11y": "^6",
    "tailwindcss-rtl": "^0.9"
  }
}
```

---

## ۷. Browser Support

- **Chrome/Edge:** ۲ نسخه آخر
- **Firefox:** ۲ نسخه آخر
- **Safari:** ۱۶+
- **Mobile:** Android 8+ (Chrome 100+), iOS 15+

Polyfills: فقط اگر لازم (از `next/dynamic` و browserslist استفاده)

---

## ۸. Build / DX

- **ESLint** + **Prettier** + **lint-staged**
- **husky** pre-commit: lint + typecheck + unit
- **commitlint** (conventional commits)
- **changesets** برای versioning packages
- **Storybook 8** + Chromatic برای visual regression

---

## ۹. CI Pipeline

```
install → typecheck → lint → unit test → build →
visual regression → a11y test → e2e smoke → deploy preview
```

هر PR باید همه را سبز عبور دهد. مستندات `doc/DEPLOY_RUNBOOK.md` به‌روزرسانی شود.

---

## ۱۰. Security Dependencies

- `npm audit` در CI (fail on high)
- Dependabot فعال
- SBOM (CycloneDX) برای هر build
- Subresource allowlist در CSP
