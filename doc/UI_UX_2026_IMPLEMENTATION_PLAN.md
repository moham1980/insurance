# برنامه اجرایی ارتقای UI/UX سامانه بیمه — انطباق ۱۰۰٪ با ترندهای ۲۰۲۶

> **نسخه:** ۱.۰ — ۱۴۰۵/۰۳/۰۶  
> **مبنا:** `doc/UI_UX_Research_2026.md` + ۲۷ سند طراحی `doc/design/*.md` + وضعیت فعلی کد  
> **هدف:** تطبیق کامل سامانه با ۲۰+ ترند UI/UX مدرن؛ تحویل تدریجی در ۷ فاز  
> **مدت:** ۱۰ ماه (با تیم متوسط: ۲ Frontend، ۱ Designer، ۱ QA، ۰.۵ Backend، ۰.۲۵ DevOps)  
> **فرمت:** هر فاز شامل (الزامات → طراحی → کد → تست → انتشار)

---

## فهرست مطالب

1. [وضعیت فعلی (Baseline)](#baseline)
2. [هدف نهایی (Target State)](#target)
3. [تحلیل شکاف (Gap Analysis)](#gap)
4. [نقشه معماری فنی](#architecture)
5. [فاز ۰: Foundation (۲ هفته)](#phase0)
6. [فاز ۱: Quick Wins مشترک (۴ هفته)](#phase1)
7. [فاز ۲: Customer Portal Core (۸ هفته)](#phase2)
8. [فاز ۳: FNOL Mobile + AI Chatbot (۶ هفته)](#phase3)
9. [فاز ۴: Agent Portal (۶ هفته)](#phase4)
10. [فاز ۵: Back-Office Workbenches (۱۰ هفته)](#phase5)
11. [فاز ۶: Advanced Features (۸ هفته)](#phase6)
12. [فاز ۷: Polish & Scale (۴ هفته)](#phase7)
13. [زیرساخت مشترک (Design System / CI/CD / Testing)](#infra)
14. [تیم، تخمین‌ها، ریسک‌ها](#team)
15. [پیوست: نگاشت ترندهای ۲۰۲۶ به فازها](#appendix)

---

## ۱. وضعیت فعلی (Baseline) <a id="baseline"></a>

### ۱.۱ اپ‌های موجود

| اپ | مسیر | Stack | مخاطب | وضعیت UI/UX |
|----|------|-------|--------|-------------|
| **web-ui** | `services/web-ui` | Next.js + Tailwind | کارمند (Claims, UW, Admin, …) | بدون Design System، login با username/password، بدون Dark Mode toggle، sidebar سنتی، فاقد workbench |
| **customer-portal-ui** | `services/customer-portal-ui` | Next.js + Tailwind | مشتری B2C/B2B | OTP ورودی، responsive پایه، فاقد Bottom Nav، فاقد AI Chatbot، mock data زیاد |
| **agent-portal-ui** | `services/agent-portal-ui` | Next.js + Tailwind | نماینده فروش | صفحات پراکنده، فاقد Quote Wizard، فاقد Commission Tracker |
| **admin-ui** | `apps/admin-ui` | Minimal React | Admin/SRE | UI بسیار ابتدایی |

### ۱.۲ نقاط قوت موجود

- **RTL Engineering:** پشتیبانی از direction=rtl در CSS (`globals.css`)  
- **Keyboard Navigation:** `focus-visible` با outline آبی  
- **Mobile Media Queries:** کلاس‌های `.mobile-*` در `globals.css`  
- **Skeleton Loader:** `@keyframes skeleton-loading`  
- **Flat/Minimal Aesthetic:** استفاده از Tailwind + whitespace + rounded corners  
- **Basic OTP Flow:** در `customer-portal-ui/src/app/page.tsx`  
- **RBAC Shell:** `AppShell` در `web-ui` با enterprise permission system  

### ۱.۳ آمار کیفی فعلی (تخمینی)

| معیار | web-ui | customer-portal-ui | agent-portal-ui |
|-------|--------|--------------------|-----------------|
| انطباق با ترندهای ۲۰۲۶ | ~۱۵٪ | ~۱۲٪ | ~۸٪ |
| Lighthouse Performance | ~۶۰ | ~۵۵ | ~۵۰ |
| Lighthouse Accessibility | ~۶۵ | ~۵۵ | ~۵۰ |
| WCAG Conformance | — | — | — |
| Mobile-First | Partial | Partial | None |
| Dark Mode | Media-query خام | None | None |
| Design System | None | None | None |

---

## ۲. هدف نهایی (Target State) <a id="target"></a>

### ۲.۱ چشم‌انداز ۱۰ ماه آینده

```
┌─────────────────────────────────────────────────────────────┐
│  Customer Portal (B2C)          Agent Portal         Back-Office    │
│  ┌──────────────┐              ┌──────────────┐    ┌──────────────┐ │
│  │ PWA Mobile   │              │ Workbench    │    │ Workbench    │ │
│  │ • Bottom Nav │              │ • Cmd+K      │    │ • Nav Rail   │ │
│  │ • Passkey    │              │ • Copilot AI │    │ • Copilot AI │ │
│  │ • AI Chatbot │              │ • Quote Wiz  │    │ • Claims Q   │ │
│  │ • FNOL AR    │              │ • Commission │    │ • UW Station │ │
│  │ • NBA Dash   │              │ • Gamification    │ • Fraud Cnsl │ │
│  └──────────────┘              └──────────────┘    └──────────────┘ │
│                                                                     │
│  Shared: Design System (Radix+shadcn) │ Dark/Light/System│ WCAG 3.0+ │
└─────────────────────────────────────────────────────────────┘
```

### ۲.۲ معیارهای موفقیت (North-Star Metrics)

| معیار | هدف | ابزار اندازه‌گیری |
|-------|-----|------------------|
| Task Success Rate (خرید/تمدید) | ≥ ۹۲٪ | Playwright E2E + Mixpanel |
| FNOL Completion Time (موبایل) | ≤ ۳ دقیقه | Analytics |
| FNOL Completion Rate | ≥ ۸۸٪ | Analytics |
| Lighthouse Performance | ≥ ۹۰ همه اپ‌ها | Lighthouse CI |
| Lighthouse Accessibility | ≥ ۹۵ همه اپ‌ها | Lighthouse CI |
| WCAG Conformance | AA فاز ۱، AAA هدف فاز ۷ | axe-core + manual audit |
| NPS مشتری | ≥ ۴۵ | Survey |
| Agent Time-to-Quote | کاهش ۴۰٪ | Analytics |
| Passkey Adoption | ≥ ۴۰٪ در ۶ ماه | Backend metrics |
| AI Chatbot Resolution | ≥ ۶۰٪ | Backend metrics |
| Dark Mode Usage | ≥ ۳۰٪ کاربران | Analytics |
| Mobile Bounce Rate | ↓ ۱۵٪ | Analytics |

### ۲.۳ لیست کامل ترندهای هدف (از سند UI_UX_Research_2026)

| # | ترند | اولویت | اپ‌های هدف |
|---|------|--------|------------|
| ۱ | AI Chatbots (خسارت/پشتیبانی) | P0 | Customer |
| ۲ | Passwordless Login (Passkey/Biometric/OTP) | P0 | همه |
| ۳ | Dark Mode (Smart + Toggle) | P0 | همه |
| ۴ | Bottom Navigation (موبایل) | P0 | Customer + Agent |
| ۵ | Accessibility-First (WCAG 3.0+) | P0 | همه |
| ۶ | AI Personalization / Adaptive UI | P1 | همه |
| ۷ | Privacy-Centric UX (Consent) | P1 | همه |
| ۸ | Micro-Interactions / Motion | P1 | همه |
| ۹ | Minimalist Functional UI | P1 | همه |
| ۱۰ | Data-Driven UX (A/B, Heatmap) | P1 | همه |
| ۱۱ | Modular Design System | P1 | همه |
| ۱۲ | Voice UI | P2 | Customer + Agent + Back-Office |
| ۱۳ | Context-Aware Personalization | P2 | Customer + Agent |
| ۱۴ | PWA + Offline | P0 | Customer |
| ۱۵ | FNOL Wizard + Camera/OCR | P0 | Customer |
| ۱۶ | Real-time Collaboration | P2 | Back-Office |
| ۱۷ | Emotion-Aware UX | P3 | Customer |
| ۱۸ | 3D/AR Visualization | P3 | Customer (FNOL) |
| ۱۹ | Glassmorphism (Premium dashboards) | P2 | Back-Office |
| ۲۰ | Video-Led Motion | P2 | همه |

---

## ۳. تحلیل شکاف (Gap Analysis) <a id="gap"></a>

### ۳.۱ شکاف‌های ساختاری

| شکاف | شدت | توضیح |
|------|-----|-------|
| بدون `packages/design-system` | بحرانی | هر اپ style خصوصی دارد؛ تکثیر کد و drift طراحی |
| بدون Design Tokens | بحرانی | رنگ‌ها و فاصله‌ها hard-code شده؛ Dark Mode غیرممکن |
| بدون shadcn/ui / Radix | بحرانی | کامپوننت‌ها از صفر نوشته شده؛ accessibility ناقص |
| بدون Storybook | بالا | بازبینی بصری و document sharing وجود ندارد |
| بدون Theme Provider | بالا | Dark Mode فقط media-query؛ بدون toggle |
| بدون PWA | بالا | customer-portal-ui اپلیکیشن وب نیست؛ offline ندارد |
| Login سنتی در web-ui | بحرانی | username/password در عصر Passkey |
| فاقد Bottom Navigation | بالا | Mobile UX ناقص |
| فاقد AI Chatbot UI | بالا | copilot-service وجود دارد ولی UI ندارد |
| فاقد Command Palette | متوسط | Agent و Back-Office فاقد quick navigation |
| فاقد Workbench Pattern | بالا | Back-Office پرش بین صفحات؛ Claims/UW ندارند split view |
| فاقد Data Viz | متوسط | هیچ نمودار تعاملی یا chart library |
| فاقد Voice UI | متوسط | هیچ Speech Recognition یا TTS |
| فاقد A/B Testing | پایین | هیچ framework برای تست UX |

### ۳.۲ شکاف‌های فنی (Backend Dependency)

| شکاف | وابسته به | وضعیت Backend |
|------|-----------|---------------|
| Passkey / WebAuthn | auth-service + IAM | نیاز به endpoint `/auth/webauthn/*` |
| AI Chatbot | knowledge-layer-service + copilot-service | سرویس‌ها وجود دارند ولی API آماده نیست |
| AI Personalization | recommendation-service | سرویس طرح دارد ولی پیاده‌سازی نشده |
| Real-time Notif | notification-service | سرویس وجود دارد ولی Web Push/SMS واقعی نیست |
| Payment Gateway | payments-service + billing-service | درگاه واقعی متصل نیست |
| Document OCR | document-ai-service | OCR وجود دارد ولی integration UI ندارد |
| Voice STT | model-switchboard-service یا STT خارجی | پیاده‌سازی نشده |
| Offline Sync | claims-service + background sync | queue و conflict resolution ندارد |

---

## ۴. نقشه معماری فنی <a id="architecture"></a>

### ۴.۱ Monorepo Structure (تغییر یافته)

```
insurance/
├── apps/
│   └── admin-ui/                    ← موجود (کمینه)
├── packages/                        ← ← ← جدید
│   ├── design-system/               ← Design Tokens + shadcn + Primitives
│   │   ├── tokens/                  ← color.json, typography.json, …
│   │   ├── components/              ← Button, Input, Dialog, …
│   │   ├── themes/                  ← light.css, dark.css, high-contrast.css
│   │   ├── tailwind-preset.ts
│   │   └── storybook/               ← .stories.tsx + a11y addon
│   ├── ui-utils/                    ← cn(), formatCurrency(), formatPersianDate()
│   ├── api-client/                  ← generated OpenAPI clients
│   ├── i18n/                        ← fa.json (messages مشترک)
│   └── date-jalali/                 ← wrapper date-fns-jalali
├── services/
│   ├── web-ui/                      ← Back-Office (Next.js App Router)
│   ├── customer-portal-ui/          ← Customer Portal (Next.js App Router)
│   ├── agent-portal-ui/             ← Agent Portal (Next.js App Router)
│   ├── [backend services unchanged]
│   └── …
├── doc/
│   ├── UI_UX_Research_2026.md
│   ├── design/
│   │   ├── 01_design_principles.md
│   │   ├── … (all 27 docs)
│   │   └── 92_quality_gates.md
│   └── UI_UX_2026_IMPLEMENTATION_PLAN.md   ← ← ← این سند
└── tooling/
    ├── lighthouserc.yml
    ├── .size-limit.json
    └── turbo.json                     ← Turborepo pipeline
```

### ۴.۲ Core Tech Stack

| لایه | انتخاب | نسخه |
|------|--------|------|
| Framework | Next.js | 14+ (App Router) |
| Runtime | React | 18+ |
| Language | TypeScript | 5.x strict |
| Package Manager | Bun | مطابق پروژه فعلی |
| Monorepo | Turborepo | برای caching + pipeline |
| Styling | Tailwind CSS | 3.4+ با `darkMode: 'class'` |
| Components | Radix Primitives + shadcn/ui | آخرین stable |
| Icons | lucide-react | 0.400+ |
| State (Server) | TanStack Query | 5+ |
| State (Client) | Zustand | 4+ |
| Forms | react-hook-form + zod | ۷ / ۳ |
| Animation | framer-motion | 11+ |
| Charts | ECharts + echarts-for-react | ۵ / ۳ |
| Maps | Leaflet + react-leaflet | ۴+ |
| Jalali Date | date-fns-jalali | ۳+ |
| PWA | next-pwa + Workbox | ۵+ |
| Auth | @simplewebauthn/browser | ۱۰+ |
| Testing | Vitest + Testing Library + Playwright | آخرین |
| A11y | axe-core + pa11y-ci | آخرین |
| Storybook | Storybook 8 + Chromatic | ۸+ |

### ۴.۳ Design System Architecture

```
Figma Tokens → style-dictionary → CSS vars + Tailwind config
                                     │
                                     ▼
                           packages/design-system
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
    services/web-ui          services/customer-portal-ui   services/agent-portal-ui
    (Back-Office)              (Customer)                    (Agent)
           │                         │                         │
           ▼                         ▼                         ▼
    ThemeProvider            ThemeProvider               ThemeProvider
    (dark default)           (system default)            (system default)
```

### ۴.۴ Auth Architecture (Passwordless)

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  Frontend   │────►│  auth-service   │────►│  IAM / Keycloak     │
│             │     │  (backend)      │     │  (SSO for staff)    │
└─────────────┘     └─────────────────┘     └─────────────────────┘
       │                     │
       │ WebAuthn            │ OTP/SMS
       ▼                     ▼
┌─────────────┐     ┌─────────────────┐
│ Passkey     │     │  notification-  │
│ (device)    │     │  service (SMS)  │
└─────────────┘     └─────────────────┘
```

### ۴.۵ AI Chatbot Architecture

```
┌─────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│  Chat UI    │────►│  knowledge-layer-service │────►│  LLM Gateway    │
│  (Customer) │     │  (RAG + Retrieval)         │     │  (OpenAI/Local) │
└─────────────┘     └──────────────────────────┘     └─────────────────┘
       │                     │
       │ SSE streaming       │ document-ai
       ▼                     ▼
┌─────────────┐     ┌──────────────────────────┐
│  workflow-  │     │  PII Redaction + Filter │
│  engine     │     │  (server-side)            │
└─────────────┘     └──────────────────────────┘
```

---

## ۵. فاز ۰: Foundation (۲ هفته) <a id="phase0"></a>

> **هدف:** زیرساخت طراحی بدون تغییر UI ظاهری. این فاز زیربنای همه فازهای بعدی است.

### ۵.۱ Milestone

**Deliverable:** PR قابل merge که هر سه اپ از `@insurance/design-system` استفاده کنند (UI یکسان با قبل، zero regression).

### ۵.۲ وظایف جزئی

#### ۵.۲.۱ Monorepo Restructuring

- [ ] ایجاد `packages/design-system/`
  - [ ] `package.json` با `name: "@insurance/design-system"`
  - [ ] `tsconfig.json` با composite project
  - [ ] `tsup` یا `bun build` برای build watch
  - [ ] exports: `"./tailwind-preset"`, `"./components/*"`, `"./themes/*"`
- [ ] ایجاد `packages/ui-utils/`
  - [ ] `cn.ts` (clsx + tailwind-merge)
  - [ ] `formatCurrency.ts` (`Intl.NumberFormat('fa-IR')`)
  - [ ] `formatPersianDate.ts` (date-fns-jalali wrapper)
  - [ ] `useMediaQuery.ts`
  - [ ] `useReducedMotion.ts`
- [ ] ایجاد `packages/api-client/`
  - [ ] اسکریپت generate از OpenAPI specs
  - [ ] typed fetch wrapper با error handling
- [ ] پیکربندی Turborepo
  - [ ] `turbo.json` با pipeline `build`, `test`, `lint`, `typecheck`
  - [ ] `dependsOn` بین packages

#### ۵.۲.۲ Design Tokens

- [ ] ایجاد `packages/design-system/tokens/color.json`
  - semantic tokens: bg-base, bg-subtle, bg-raised, text-primary, text-muted, brand-primary, success, warning, danger, info, border
  - هر token مقادیر light و dark
- [ ] ایجاد `packages/design-system/tokens/typography.json`
  - Vazirmatn Variable (preload در HTML)
  - type scale: display, h1, h2, h3, body, body-sm, caption, number-lg
- [ ] ایجاد `packages/design-system/tokens/spacing.json`
  - 4-pt grid: 0, 1(4px), 2(8px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 12(48px), 16(64px)
- [ ] ایجاد `packages/design-system/tokens/radius.json`
  - sm: 6px, md: 10px, lg: 16px, pill: 999px
- [ ] ایجاد `packages/design-system/tokens/shadow.json`
  - 3 سطح shadow
- [ ] ایجاد `packages/design-system/tokens/motion.json`
  - fast: 120ms, base: 200ms, slow: 320ms, stagger: 40ms
  - ease functions: standard, emphasized, exit

#### ۵.۲.۳ Tailwind Preset

- [ ] `tailwind-preset.ts` با extend:
  - colors: ارجاع به CSS vars (نه hard-code)
  - spacing: ارجاع به tokens
  - borderRadius: ارجاع به tokens
  - boxShadow: ارجاع به tokens
  - fontFamily: Vazirmatn, Inter
  - screens: 360px (mobile-first breakpoint)
- [ ] darkMode: `'class'` (mandatory)
- [ ] plugin for RTL logical properties

#### ۵.۲.۴ Theme Files

- [ ] `packages/design-system/themes/light.css`
  - تعریف CSS custom properties برای همه tokens در light
- [ ] `packages/design-system/themes/dark.css`
  - مقادیر dark mode
  - bg-base: #0B1020, text-primary: #E6EAF2
  - هیچ سیاه مطلق (#000) استفاده نشود
- [ ] `packages/design-system/themes/high-contrast.css`
  - برای WCAG AAA فاز ۷

#### ۵.۲.۵ ۱۰ Primitive Components

| # | کامپوننت | منبع | ویژگی‌های خاص |
|---|----------|------|---------------|
| ۱ | Button | shadcn Button | variants: primary, secondary, ghost, danger, link; sizes: sm, md, lg; isLoading, fullWidth; cva |
| ۲ | Input | shadcn Input | with label, error, hint; floating label; RTL-native |
| ۳ | Card | shadcn Card | elevations: 1, 2, 3; padding variants |
| ۴ | Dialog | Radix Dialog | RTL animation; focus trap; Escape close |
| ۵ | Toast | Radix Toast | RTL slide; swipe dismiss; auto-dismiss |
| ۶ | Tabs | Radix Tabs | vertical support; RTL indicator animation |
| ۷ | DropdownMenu | Radix DropdownMenu | RTL submenu; keyboard nav |
| ۸ | Popover | Radix Popover | RTL placement; arrow |
| ۹ | Tooltip | Radix Tooltip | RTL; delay 150ms; always with text |
| ۱۰ | Skeleton | shadcn Skeleton | shimmer animation; height matching real content |

#### ۵.۲.۶ ادغام در اپ‌های موجود

- [ ] `services/web-ui`: `tailwind.config.ts` → `presets: [designSystemPreset]`
- [ ] `services/customer-portal-ui`:同上
- [ ] `services/agent-portal-ui`:同上
- [ ] هر اپ `import '@insurance/design-system/themes/light.css'` در layout
- [ ] جایگزینی تمام `className="bg-white"` با `className="bg-bg-base"` (gradual)

#### ۵.۲.۷ Storybook

- [ ] نصب Storybook 8 در `packages/design-system/`
- [ ] Addon: a11y, RTL toggle, dark mode toggle
- [ ] Chromatic project setup برای visual regression
- [ ] ۱۰ story برای primitives + controls برای variant/size/state

#### ۵.۲.۸ CI/CD Foundation

- [ ] GitHub Actions workflow: `design-system.yml`
  - install → typecheck → lint → build design-system → test
- [ ] Lighthouse CI setup (`.lighthouserc.yml`)
- [ ] `size-limit` config برای bundle budget

### ۵.۳ معیارهای خروجی فاز ۰

- [ ] هر سه اپ build موفق با preset جدید
- [ ] Storybook با ۱۰ primitive قابل مشاهده
- [ ] Zero visual regression در Lighthouse CI
- [ ] `tsc --noEmit` ۰ error

### ۵.۴ Backend Dependency

- **هیچ** — این فاز فقط frontend است.

---

## ۶. فاز ۱: Quick Wins مشترک (۴ هفته) <a id="phase1"></a>

> **هدف:** سریع‌ترین بهبودها با بالاترین تأثیر در هر سه اپ. هر ویژگی feature-flagged.

### ۶.۱ Milestone

**Deliverable:** هر سه اپ دارای Dark Mode toggle، Bottom Navigation (موبایل)، Accessibility improvements، Micro-interactions، و OTP بهبودیافته باشند.

### ۶.۲ وظایف جزئی

#### ۶.۲.۱ Dark Mode کامل (سند ۲۴)

**Customer Portal + Agent Portal:**
- [ ] `ThemeProvider` در root layout
  - state: `'light' | 'dark' | 'system'`
  - localStorage persistence
  - `matchMedia('(prefers-color-scheme: dark)')` listener
- [ ] No-FOUC inline script در `<head>`
  - قبل از render، `document.documentElement.classList.add('dark')` اگر لازم
- [ ] Toggle Control در Header
  - radio group: خورشید (light) / ماه (dark) / خودکار (system)
  - `aria-label="حالت ظاهر"`
  - `transition: background-color 200ms, color 200ms`
  - `prefers-reduced-motion` خاموش
- [ ] تعریف `dark:` utilities در Tailwind برای همه کامپوننت‌ها
- [ ] تست تصاویر: illustration‌ها نسخه dark داشته باشند
- [ ] تست charts: palette مخصوص dark

**Back-Office (web-ui):**
- [ ] Dark Mode به‌عنوان **default** (کارمندان ساعات طولانی)
- [ ] Light available در toggle
- [ ] Focus ring روشن‌تر در dark (`#60a5fa`)

#### ۶.۲.۲ Accessibility Pass (سند ۰۴)

- [ ] `<html lang="fa" dir="rtl">` در همه layoutها
- [ ] Landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- [ ] Skip-link: "پرش به محتوای اصلی" (absolute positioned, visible on focus)
- [ ] `aria-live="polite"` برای toast notifications
- [ ] Placeholder جایگزین label **نیست** — همه inputها label واضح
- [ ] Error states: `aria-invalid="true"` + `aria-describedby` به error message
- [ ] Logical properties: `margin-inline-start` به‌جای `ml-*` (جایگزینی تدریجی)
- [ ] آیکون‌های جهت‌دار (chevron) در RTL flip می‌شوند
- [ ] `aria-label` کامل برای آیکون‌های standalone
- [ ] تست دستی با NVDA روی Windows

**Contrast Fixes:**
- [ ] بررسی همه text colors با APCA/contrast checker
- [ ] متن عادی ≥ ۴.۵:1 با پس‌زمینه
- [ ] متن بزرگ ≥ ۳:۱
- [ ] Focus ring ≥ ۳:۱

#### ۶.۲.۳ Bottom Navigation (موبایل) (سند ۱۰، ۱۱)

**Customer Portal:**
- [ ] کامپوننت `BottomNav` در `packages/design-system/components/navigation/`
- [ ] ۴ تب: خانه / بیمه‌نامه‌ها / خسارات / پروفایل
- [ ] FAB مرکزی: "ثبت خسارت" (برجسته، primary color)
- [ ] تا `md` نمایش داده شود؛ desktop hide
- [ ] Active state: آیکون filled + label bold + indicator بالا
- [ ] Swipe gestures: pull-to-refresh در لیست‌ها
- [ ] Haptic feedback روی tap (`navigator.vibrate(10)`)

**Agent Portal:**
- [ ] ۴ تب: داشبورد / مشتریان / پیش‌فاکتورها / کمیسیون
- [ ] FAB مرکزی: "پیش‌فاکتور جدید"

#### ۶.۲.۴ Micro-Interactions پایه (سند ۲۵)

- [ ] Button: hover lighten ۴٪ (۱۲۰ms)، active scale(0.98) (۸۰ms)
- [ ] Input: focus border transition + label float (۲۰۰ms)
- [ ] Input error: shake animation (۲۰۰ms، reduced-motion safe)
- [ ] Toggle/Switch: spring animation (framer-motion)
- [ ] Toast: slide from top + fade (۳۲۰ms)، swipe to dismiss
- [ ] Page transition: fade + slight slide (۲۰۰ms)
- [ ] List items: stagger ۴۰ms per item on mount
- [ ] Skeleton: shimmer ملایم
- [ ] `@media (prefers-reduced-motion: reduce)` در همه animations
- [ ] Motion tokens در CSS: `--motion-fast`, `--motion-base`, `--motion-slow`

#### ۶.۲.۵ Passwordless Login (سند ۲۰) — فاز اولیه

**Customer Portal:**
- [ ] بهبود صفحه OTP موجود
  - OTP input: ۶ رقم، auto-focus sequential، `inputmode="numeric"`
  - Web OTP API: `<input autocomplete="one-time-code">`
  - SMS format: `کد ورود: ۱۲۳۴۵۶ @domain.ir #۱۲۳۴۵۶`
  - Timer resend (۶۰ ثانیه)
  - Back button: تغییر شماره
- [ ] حذف فیلد رمز عبور از customer-portal-ui

**web-ui (Staff):**
- [ ] نگهداری username/password فعلاً (Keycloak SSO)
- [ ] اضافه کردن MFA prompt (TOTP)
- [ ] پیاده‌سازی WebAuthn/Passkey در فاز ۲

**Security:**
- [ ] Rate limit: ۵ OTP / ۱۵ دقیقه / IP + شماره
- [ ] Account lockout: ۱۰ تلاش ناموفق → ۳۰ دقیقه
- [ ] Anomaly detection: تغییر ناگهانی IP/device → OTP اجباری

#### ۶.۲.۶ PWA Foundation (سند ۱۱)

- [ ] `manifest.json` در `customer-portal-ui/public/`
  - name: "بیمه من"
  - display: standalone
  - dir: rtl, lang: fa
  - icons: ۱۹۲px, ۵۱۲px, maskable
  - shortcuts: ثبت خسارت، بیمه‌نامه‌ها، پرداخت
- [ ] `next-pwa` setup با Workbox
  - HTML routes: NetworkFirst (ttl 5m)
  - Static assets: CacheFirst immutable
  - API GET: StaleWhileRevalidate
  - API POST: NetworkOnly + background sync
- [ ] Service Worker registration
- [ ] Install prompt UX: بعد از ۲ بازدید معنادار
- [ ] Offline page: "شما آفلاین هستید"

### ۶.۳ معیارهای خروجی فاز ۱

- [ ] Lighthouse A11y ≥ ۹۰ در هر سه اپ
- [ ] Dark Mode toggle کارا در هر سه اپ
- [ ] Bottom Navigation قابل استفاده در موبایل Customer + Agent
- [ ] OTP auto-read در Android
- [ ] Mobile bounce rate ↓ ۱۵٪ (تخمین از Analytics)

### ۶.۴ Backend Dependency

| ویژگی | نیاز Backend | وضعیت |
|-------|--------------|-------|
| OTP SMS | notification-service (real SMS gateway) | P0 — نیاز به اتصال واقعی |
| Web OTP API | فقط frontend | بدون وابستگی |
| PWA SW | بدون وابستگی | — |
| Dark Mode | بدون وابستگی | — |

---

## ۷. فاز ۲: Customer Portal Core (۸ هفته) <a id="phase2"></a>

> **هدف:** بازطراحی کامل Customer Portal به پرتال مدرن با Dashboard شخصی‌سازی‌شده، Passwordless کامل، و Policy Management.

### ۷.۱ Milestone

**Deliverable:** Customer Portal با Shell جدید، Dashboard NBA، PolicyCard، Passkey، Profile+Consent.

### ۷.۲ وظایف جزئی

#### ۷.۲.۱ Shell جدید (سند ۱۰)

- [ ] `AppHeader`:
  - Logo + Brand Name
  - Search bar (`/` shortcut)
  - Notification bell (badge red dot)
  - Profile dropdown (avatar + name)
  - Theme toggle (خوشید/ماه/خودکار)
- [ ] `MobileBottomNav`: همان فاز ۱ + FAB مرکزی
- [ ] `Toaster`: موقعیت top-right (RTL adjusted)
- [ ] `AIAssistantLauncher`: FAB پایین-راست (در RTL پایین-چپ بصری)
  - آیکون message circle
  - pulsating dot وقتی پیام جدید

#### ۷.۲.۲ Dashboard با NBA (سند ۲۳)

**Hero Card (Next Best Action):**
- [ ] کارت بزرگ بالا با رنگ accent
- [ ] داده از recommendation-service (یا mock در صورت عدم آمادگی)
- [ ] سناریوها:
  - "بیمه بدنه شما تا ۷ روز دیگر منقضی می‌شود — تمدید"
  - "گواهی عدم خسارت شما صادر شد — دانلود"
  - "خسارت ۱۲۳ تایید شد — پرداخت ظرف ۴۸h"
- [ ] CTA button واضح در کارت
- [ ] dismiss با swipe (موبایل) یا X (دسکتاپ)

**Stats Grid (۴ KPI Cards):**
- [ ] بیمه‌نامه‌های فعال (تعداد + sparkline trend)
- [ ] خسارات باز (تعداد + وضعیت آخرین)
- [ ] پرداخت سررسید (مبلغ + تاریخ)
- [ ] امتیاز ایمنی (عدد + badge)
- [ ] هر کارت: `DataCard` component با hover lift effect

**Policies Carousel:**
- [ ] `PolicyCard` component (سند ۰۵)
  - آیکون بیمه + عنوان + شماره + تاریخ انقضا
  - Status badge + Premium amount
  - Actions: دانلود PDF / تمدید / خسارت
  - density: comfortable | compact
- [ ] Carousel/swipeable در موبایل
- [ ] Grid در دسکتاپ

**Recent Activity Timeline:**
- [ ] `Timeline` component
  - ۱۰ آیتم آخر
  - آیکون + عنوان + تاریخ + وضعیت
  - clickable → detail page

**Educational Tips Strip:**
- [ ] tips based on portfolio:
  - اگر فقط خودرو → safe-driving tips
  - اگر health → wellness tips
- [ ] dismiss individual tip

**Personalization:**
- [ ] زمان روز: صبح → سررسیدها، شب → خلاصه
- [ ] Life-stage from sanhab: جوان → پیشنهاد عمر، مسن → health

#### ۷.۲.۳ Policy Detail Page

- [ ] Tabs: Overview | Coverage | Documents | Payments | History
- [ ] **CoverageMatrix**: ماتریس پوشش‌ها
  - هر سطر: نوع پوشش + آیکون + توضیح tooltip
  - وضعیت: covered / not-covered / optional
- [ ] **Action Bar Sticky پایین** (موبایل):
  - تمدید / اصلاح / دانلود PDF / ثبت خسارت
- [ ] Sidebar: Agent اختصاصی + دکمه تماس/چت

#### ۷.۲.۴ Payment Flow + Receipt

- [ ] Payment list با filter (بازه/نوع/وضعیت)
- [ ] KPI: کل پرداختی، سررسید بعدی
- [ ] درگاه پرداخت داخل iframe امن + fallback صفحه کامل
- [ ] دانلود رسید PDF
- [ ] ارسال رسید از طریق email/SMS/Share API

#### ۷.۲.۵ Passkey / WebAuthn (سند ۲۰)

- [ ] پس از اولین login موفق OTP: bottom-sheet prompt
  - "ورود سریع‌تر دفعه بعد؟"
  - دکمه "فعال کردن FaceID/اثر انگشت"
  - امکان رد کردن → یادآوری بعد از ۳ login
- [ ] Client: `@simplewebauthn/browser`
  - `navigator.credentials.create({ publicKey })`
  - `navigator.credentials.get({ publicKey })`
- [ ] Backend endpoints (نیاز به auth-service):
  - `POST /auth/webauthn/register-options`
  - `POST /auth/webauthn/register`
  - `POST /auth/webauthn/authenticate-options`
  - `POST /auth/webauthn/authenticate`
- [ ] Profile → Security: مدیریت passkeyها (لیست + حذف)
- [ ] Consent: "اثر بیومتریک روی دستگاه شما می‌ماند و برای ما ارسال نمی‌شود"
- [ ] Audit log هر ساخت/حذف credential
- [ ] Fallback: اگر Passkey ناموفق → OTP SMS

#### ۷.۲.۶ Profile + Consent (Privacy-Centric) (سند ۲۰)

- [ ] `/profile`:
  - اطلاعات شخصی (قابل ویرایش)
  - Avatar upload
  - آدرس‌ها (چند آدرس)
- [ ] `/profile/security`:
  - Passkey management
  - Device list (logout from all)
  - 2FA toggle
- [ ] `/profile/consent`:
  - صفحات consent شفاف
  - لیست داده‌های جمع‌آوری‌شده
  - toggle‌های فعال/غیرفعال برای هر نوع داده
  - تاریخچه consent (audit trail)
  - لینک حذف account (GDPR-style)
- [ ] `/profile/notifications`:
  - granular notification settings
  - push / sms / email / in-app
  - هر کانال on/off برای هر نوع پیام

#### ۷.۲.۷ Feature Flags

- [ ] استفاده از `feature-flags-service` موجود
- [ ] هر feature جدید flag-guarded:
  - `customer-dashboard-v2`
  - `passkey-auth`
  - `nba-card`
  - `policy-coverage-matrix`

### ۷.۳ معیارهای خروجی فاز ۲

- [ ] Task success rate (خرید/تمدید) ≥ ۸۵٪
- [ ] Passkey adoption ≥ ۲۰٪
- [ ] Lighthouse Performance ≥ ۸۵
- [ ] Lighthouse Accessibility ≥ ۹۵

### ۷.۴ Backend Dependency

| ویژگی | نیاز Backend | وضعیت | اقدام |
|-------|--------------|-------|-------|
| recommendation-service | endpoint `/recommendations/nba` | طرح دارد، پیاده‌سازی نشده | **همزمان شروع شود** |
| WebAuthn endpoints | auth-service + DB table `user_credentials` | نیاز به توسعه | **P0 backend** |
| Payment gateway | payments-service | mock در حال حاضر | **P1 backend** |
| Notification SMS | notification-service (real gateway) | نیاز به اتصال واقعی | **P0 backend** |

---

## ۸. فاز ۳: FNOL Mobile + AI Chatbot (۶ هفته) <a id="phase3"></a>

> **هدف:** بحرانی‌ترین UX بیمه — اعلام خسارت — با Camera، OCR، Offline، و AI Chatbot پشتیبانی.

### ۸.۱ Milestone

**Deliverable:** FNOL Wizard کامل با Camera+OCR، Offline draft، Background Sync، و AI Chatbot در Customer Portal.

### ۸.۲ وظایف جزئی

#### ۸.۲.۱ FNOL Wizard (سند ۲۲)

**Step 0 — Safety Check:**
- [ ] صفحه اول فقط دو دکمه بزرگ:
  - "من در امنیت هستم، ادامه" (primary, بزرگ)
  - "به کمک نیاز دارم" → تماس فوری با اورژانس/امداد بیمه
- [ ] Tone همدلانه: "حالتان خوبه؟ قبل از هر چیز، ایمنی شما مهم است."

**Step 1 — انتخاب بیمه‌نامه:**
- [ ] Cards بزرگ؛ اگر فقط یکی → preselect هوشمند
- [ ] Policy number نمایش داده شود

**Step 2 — نوع حادثه:**
- [ ] Chips بزرگ با آیکون: تصادف، آتش‌سوزی، سرقت، خسارت بدنی، سایر
- [ ] Voice input: "بگویید چه اتفاقی افتاد" → AI تشخیص نوع

**Step 3 — زمان و مکان:**
- [ ] Time: default = الان (قابل تغییر)
- [ ] Location:
  - دکمه "محل فعلی" با Geolocation API
  - Map (Leaflet + OpenStreetMap)
  - Reverse-geocode برای آدرس متنی

**Step 4 — مدارک (Camera + OCR):**
- [ ] Camera Capture تمام‌صفحه
  - Overlay راهنما: "پلاک خودرو را در کادر قرار دهید"
  - ۴ عکس پیش‌فرض: پلاک، خسارت کلی، خسارت نزدیک، زاویه متفاوت
  - Auto-capture با countdown (۳ ثانیه)
- [ ] OCR پلاک:
  - `tesseract.js` (client-side) یا call به `document-ai-service`
  - تطبیق با شماره بیمه‌نامه
  - اگر mismatch → هشدار ملایم
- [ ] Image compression client-side (MozJPEG / WebP quality 70)
  - Max ۲MB per image
- [ ] Video: ۱۰s max (optional)

**Step 5 — شرح حادثه:**
- [ ] Voice-to-text (Web Speech API)
  - Push-to-talk button بزرگ
  - Interim transcript با رنگ muted
  - Final با رنگ primary
- [ ] AI summary preview: "تصادف در ولیعصر ساعت ۸ صبح با پراید"
- [ ] Textarea برای ویرایش

**Step 6 — Review & Sign:**
- [ ] خلاصه همه داده‌ها
- [ ] `SignaturePad` component (canvas-based، امضای دستی)
- [ ] Submit → success screen

**Progress & Recovery:**
- [ ] Progress bar: "۳ از ۶" همیشه نمایش
- [ ] Autosave aggressive: هر ۲ ثانیه draft به IndexedDB
- [ ] Recovery link: اگر اپ بسته شد، دقیقاً همان step ادامه
- [ ] Bottom sheet: "ثبت خسارت دیگر" / "بازگشت به داشبورد"

**Post-submit:**
- [ ] Success screen: کد پیگیری بزرگ + Confetti (reduced-motion safe)
- [ ] Timeline: "۱. دریافت شد ✓ | ۲. بررسی اولیه (تا ۲۴h) | ۳. کارشناس | ۴. پرداخت"
- [ ] Push Notification فعال شود
- [ ] Share API: اشتراک کد پیگیری

#### ۸.۲.۲ Offline Resilience (سند ۱۱)

- [ ] IndexedDB با `dexie` یا `idb-keyval`
- [ ] Schema: drafts (FNOL form data + images blob)
- [ ] Background Sync API:
  - اگر offline → submit صف می‌شود
  - هنگام بازگشت آنلاین → submit خودکار + toast notif
- [ ] UI badge: "۳ عکس در انتظار ارسال"
- [ ] Retry exponential backoff (۲s, ۴s, ۸s, ...)

#### ۸.۲.۳ AI Chatbot (سند ۲۱)

**Chat UI:**
- [ ] Launcher: FAB پایین-راست (RTL adjusted)
- [ ] Panel: drawer از راست ۴۰۰px (دسکتاپ) / full-screen (موبایل)
- [ ] Header: آواتار bot + نام + دکمه "صحبت با کارشناس"
- [ ] Messages:
  - Bot: bubble رنگ `bg-subtle` + آواتار
  - User: bubble `bg-brand-primary` + `text-brand-on`
  - System: وسط، متن muted
  - Quick-replies: chips کلیک‌پذیر زیر پیام bot
- [ ] Typing indicator: سه نقطه bouncing
- [ ] Timestamp + read status

**Streaming:**
- [ ] SSE یا WebSocket به `copilot-service`
- [ ] Partial tokens → typewriter effect
- [ ] Abort controller برای cancel

**Capabilities:**
- [ ] FAQ: بیمه‌نامه، تمدید، پوشش
- [ ] **Conversational FNOL:**
  - Bot: "سلام. چه اتفاقی افتاده؟"
  - User: "تصادف خودرو"
  - Bot: "متأسفم. کدام بیمه‌نامه؟" [chips: بدنه ۱۲۳ / ثالث ۴۵۶]
  - ...
  - Bot: "خلاصه خسارت آماده است. تأیید می‌کنید؟"
- [ ] پیگیری وضعیت خسارت/پرداخت
- [ ] Explain policy: "چه چیزی تحت پوشش است؟"
- [ ] Handoff به انسان:
  - اگر bot ۲ بار نفهمید → "ارتباط با کارشناس" پیشنهاد
  - context کامل (تاریخچه چت + metadata) ارسال
  - Live-agent UI: مشابه chatbot ولی با human badge

**PII Protection:**
- [ ] Redact قبل از ارسال به LLM
- [ ] Consent banner: "برای بهبود پاسخ، این گفتگو ذخیره می‌شود. [رد]"

**Offline Mode:**
- [ ] اگر LLM قطع → پاسخ از knowledge-base قبلی
- [ ] Queue پیام کاربر، retry پس‌زمینه

#### ۸.۲.۴ Push Notifications (Web Push)

- [ ] Web Push API + VAPID
- [ ] Consent UX: بعد از اولین interaction معنادار (نه onboarding)
- [ ] `/profile/notifications` برای مدیریت granular
- [ ] Use cases:
  - یادآوری تمدید (۳۰/۱۵/۷/۱ روز قبل)
  - تغییر وضعیت خسارت
  - پیام از کارشناس
  - سررسید پرداخت

### ۸.۳ معیارهای خروجی فاز ۳

- [ ] FNOL completion time ≤ ۳ دقیقه
- [ ] FNOL completion rate ≥ ۸۸٪
- [ ] Chatbot resolution rate ≥ ۶۰٪
- [ ] OCR accuracy (پلاک) ≥ ۹۷٪
- [ ] Drop-off per step ≤ ۵٪
- [ ] NPS پس از FNOL ≥ ۵۰

### ۸.۴ Backend Dependency

| ویژگی | نیاز Backend | وضعیت | اقدام |
|-------|--------------|-------|-------|
| document-ai-service OCR | `/api/document-ai/extract` (plate ID) | سرویس وجود دارد | UI integration |
| copilot-service chat | SSE/WebSocket endpoint | سرویس وجود دارد | API contract |
| knowledge-layer-service | RAG endpoint | سرویس وجود دارد | API contract |
| Web Push | VAPID keys + push endpoint | نیاز به setup | **P1 backend** |
| Background Sync queue | claims-service queue | نیاز به توسعه | **P1 backend** |

---

## ۹. فاز ۴: Agent Portal (۶ هفته) <a id="phase4"></a>

> **هدف:** تبدیل Agent Portal به workbench حرفه‌ای با Quote Wizard، AI Copilot، Commission Tracker، و Gamification.

### ۹.۱ Milestone

**Deliverable:** Agent Portal با Workbench shell، Quote Wizard V2، Commission Tracker، و Customer 360°.

### ۹.۲ وظایف جزئی

#### ۹.۲.۱ Workbench Shell (سند ۱۲)

- [ ] **Command Palette (Ctrl+K)**
  - جستجوی عمیق: مشتری، بیمه‌نامه، اکشن
  - fuzzy search
  - recent items
  - keyboard nav: ↑↓ Enter Esc
- [ ] **Sidebar**
  - Nav items: Dashboard, Quotes, Policies, Customers, Commissions, Leaderboard, Learn, Inbox
  - Collapsible
  - Badge برای unread items
- [ ] **AI Copilot Panel سمت چپ** (RTL)
  - ۳۶۰px width
  - collapsible
  - Context-aware: خودکار entity فعلی را می‌داند
  - Action chips: "اعمال به فرم"، "ارسال"، "ذخیره note"
- [ ] **Bottom StatusBar**
  - "ذخیره شد • ۴ ثانیه قبل"
  - Online/offline indicator
  - Shortcuts help (`?`)

#### ۹.۲.۲ Dashboard جدید

**KPI Row:**
- [ ] درآمد ماه (vs. هدف) — progress bar
- [ ] Leadهای جدید
- [ ] Quote‌های در انتظار
- [ ] رتبه داخلی (gamification)

**Workload:**
- [ ] Today's Plan: لیست مشتریان برای follow-up (AI rank شده)
- [ ] Hot Leads: conversion score بالا
- [ ] Expiring Policies: بیمه‌نامه‌های مشتریان در حال انقضا

**Quick Actions FAB:**
- [ ] New Quote / Lookup Customer / Scan Card

#### ۹.۲.۳ Quote Wizard V2 با AI Copilot (سند ۱۲)

**Steps:**
- [ ] **Step 1 — مشتری:**
  - شماره ملی → sanhab lookup → پر شدن خودکار
  - OCR کارت ملی (camera)
- [ ] **Step 2 — نوع بیمه:**
  - Chips بزرگ + AI recommend بر اساس پروفایل
- [ ] **Step 3 — فرم پویا:**
  - بسته به نوع بیمه
  - Validation inline + AI نکات ریسک
- [ ] **Step 4 — پوشش‌ها:**
  - Matrix قابل مقایسه (Basic/Standard/Premium)
  - Toggle هر پوشش → price update real-time
- [ ] **Step 5 — قیمت:**
  - نمایش تفکیکی
  - Explainability: "چرا این قیمت؟" → عوامل (age, vehicle type, history)
- [ ] **Step 6 — ارسال:**
  - چاپ / ایمیل / SMS / PDF / امضای دیجیتال

**AI Copilot در Wizard:**
- [ ] Cross-sell suggestion: "این مشتری ۳ خودرو دارد؛ بیمه بدنه را هم پیشنهاد دهید؟"
- [ ] Risk warning: "سابقه خسارت بالا — franchise را فعال کنید"
- [ ] Draft text for customer: "این‌طور توضیح دهید..."
- [ ] Human-in-the-loop: نماینده تایید می‌کند

#### ۹.۲.۴ Commission Tracker + Gamification

- [ ] KPI Cards: درآمد ماه / سهم از هدف / رتبه داخلی
- [ ] نمودار Trend (ECharts)
- [ ] لیست تراکنش‌های کارمزد
- [ ] **Gamification:**
  - Progress bar رسیدن به tier بعدی
  - Badges: "فروشنده برتر ماه"، "کارشناس خسارت"
  - Leaderboard: رتبه‌بندی داخلی (بدون نمایش مبلغ دقیق دیگران)

#### ۹.۲.۵ Customer 360° View

- [ ] `/customers/[id]`:
  - Header: نام + کد ملی + sanhab verified badge
  - Tabs: Overview | Policies | Claims | Payments | History | Notes
  - Overview:
    - پورتفولیو summary
    - Life stage indicator
    - Risk score
    - Next Best Action برای این مشتری
  - Timeline: همه interactions
  - Notes: comment thread

#### ۹.۲.۶ Dense Tables (سند ۱۲)

- [ ] Row height: ۴۰px (compact) / ۴۸px (comfortable)
- [ ] Sticky header + sticky first column
- [ ] Virtualization با TanStack Virtual (> ۱۰۰ row)
- [ ] Inline actions: hover/focus reveal
- [ ] Bulk select + bulk bar پایین
- [ ] Column chooser (persisted در profile)
- [ ] Export: CSV / XLSX / PDF

#### ۹.۲.۷ Keyboard Shortcuts (سند ۰۴)

- [ ] `Ctrl+N`: New Quote
- [ ] `Ctrl+S`: Save Draft
- [ ] `Ctrl+K`: Command Palette
- [ ] `G + D`: Dashboard
- [ ] `G + Q`: Quotes
- [ ] `G + C`: Customers
- [ ] `?`: Help overlay
- [ ] Help overlay: جدول میانبرها + قابل جستجو

### ۹.۳ معیارهای خروجی فاز ۴

- [ ] Time-to-Quote کاهش ۴۰٪
- [ ] Agent NPS ≥ ۴۰
- [ ] Quote error rate ↓ (validation inline)

### ۹.۴ Backend Dependency

| ویژگی | نیاز Backend | وضعیت |
|-------|--------------|-------|
| sanhab lookup | party-kyc-service | موجود |
| product pricing | product-service | موجود |
| commission data | sales-network-service | موجود |
| AI Copilot API | copilot-service | موجود ولی آماده نیست |

---

## ۱۰. فاز ۵: Back-Office Workbenches (۱۰ هفته) <a id="phase5"></a>

> **هدف:** بازطراحی web-ui به Role-Based Workbench با Claims/UW/Fraud/Admin consoles.

### ۱۰.۱ Milestone

**Deliverable:** Back-Office با Workspace switcher، Claims Workbench، UW Workstation، Fraud Console، و Admin Governance.

### ۱۰.۲ وظایف جزئی

#### ۱۰.۲.۱ Role-Based Workspace (سند ۱۳)

- [ ] **Workspace Switcher** در top bar
  - Dropdown: Claim Adjuster | Underwriter | Fraud Analyst | Collections | Loss Adjuster | Admin
  - Default workspace = primary role
- [ ] هر workspace:
  - Nav rail آیکون-only ۶۰px (hover → expand ۲۴۰px)
  - Side tools (AI copilot, notes, attachments) — collapsible
  - Queue → Detail → Action در یک صفحه (split view)
  - Audit/Status bar پایین

#### ۱۰.۲.۲ Claims Workbench (نمونه کامل)

**Layout (RTL):**
- [ ] **چپ:** Queue با filter pills (NEW / IN_REVIEW / ESCALATED / PAID)
  - Virtualized list
  - Keyboard `J/K` برای up/down
  - Enter → باز کردن detail
- [ ] **وسط:** Claim Detail
  - Tabs: Overview | Documents | Timeline | Financial | Chat
  - Diff viewer برای تغییرات
- [ ] **راست:** AI Copilot
  - Summary خودکار از document‌ها
  - پیش‌بینی مبلغ قابل پرداخت با range
  - Red-flag تقلب + لینک fraud-service

**Micro-interactions:**
- [ ] Keyboard `A` = Approve / `R` = Reject با confirm dialog
- [ ] Optimistic updates: UI بلافاصله state جدید → rollback با shake اگر fail

#### ۱۰.۲.۳ Underwriting Workstation

- [ ] Risk Scorecard با explainability
  - کدام عامل چقدر اثر دارد (bar chart)
- [ ] Rule Engine Explorer
  - کدام rule اعمال شده + کدام failed
  - دلایل rejection
- [ ] Override Log
  - اگر override → دلیل اجباری + audit
- [ ] Compare mode: ۲ سناریو کنار هم

#### ۱۰.۲.۴ Fraud Console

- [ ] Heatmap risk by region/province
- [ ] Alert feed: top 5 alerts امروز
- [ ] Case detail: timeline + evidence + ML score
- [ ] Action: escalate / clear / investigate

#### ۱۰.۲.۵ Admin / Governance (سند ۱۳)

- [ ] **RBAC Matrix UI:**
  - Grid: roles × permissions
  - Toggle editable
  - Approval workflow برای تغییرات
- [ ] **Feature Flags Console:**
  - لیست flags
  - Rollout درصدی (slider ۰-۱۰۰٪)
  - Segment targeting
  - Audit log تغییرات
- [ ] **Audit Explorer:**
  - جستجو: user, entity, time, action
  - Filter pills
  - Diff viewer
  - Export CSV/PDF
- [ ] **Health Monitor:**
  - Services status (green/yellow/red)
  - Kafka DLQ depth
  - API p95 latency
  - Active Users
  - Error rate chart (real-time SSE)

#### ۱۰.۲.۶ Dark Mode پیش‌فرض

- [ ] Back-Office default = dark
- [ ] Light toggle available
- [ ] Chart palettes مخصوص dark
- [ ] Elevation با border subtle (نه drop-shadow)

#### ۱۰.۲.۷ Density Options

- [ ] Compact (row ۳۲px) / Comfortable (row ۴۰px) / Spacious (row ۴۸px)
- [ ] Persisted در profile

#### ۱۰.۲.۸ Real-time Collaboration (فاز اولیه)

- [ ] نمایش آواتار کاربرانی که در حال دیدن همان Claim هستند
- [ ] Lock optimistic: اگر کسی در حال ویرایش → به بقیه اطلاع
- [ ] Comment thread روی فیلدها

### ۱۰.۳ معیارهای خروجی فاز ۵

- [ ] Claim processing time ↓ ۳۰٪
- [ ] User satisfaction کارشناس ↑ (survey)
- [ ] RBAC changes با approval workflow (نه manual DB edit)

### ۱۰.۴ Backend Dependency

| ویژگی | نیاز Backend | وضعیت |
|-------|--------------|-------|
| SSE real-time updates | monitoring-service / WS | نیاز به enhance |
| Audit Explorer API | audit-log service | موجود |
| Feature Flags API | feature-flags-service | موجود |

---

## ۱۱. فاز ۶: Advanced Features (۸ هفته) <a id="phase6"></a>

> **هدف:** Voice UI، Real-time Collaboration کامل، Data Viz، Personalization Engine، و Emotion-Aware UX.

### ۱۱.۱ Milestone

**Deliverable:** Voice UI در FNOL و Agent، Collaboration کامل، Charts پیشرفته، و Personalization.

### ۱۱.۲ وظایف جزئی

#### ۱۱.۲.۱ Voice UI (سند ۲۶)

**FNOL (Customer):**
- [ ] Push-to-talk mic FAB در Step 5 (Description)
- [ ] Pulsing mic animation حین listening
- [ ] Interim transcript با رنگ muted
- [ ] Final با رنگ primary
- [ ] Confirmation: "درست است؟ [تایید] [اصلاح]"
- [ ] Privacy modal اولین استفاده

**Agent Portal:**
- [ ] Voice commands:
  - "quote جدید" → navigation
  - "جستجو مشتری [نام]" → search
  - "ذخیره و بعدی" → action
- [ ] Intent classifier: rule-based یا LLM-based

**Global:**
- [ ] "برگرد" / "لغو" / "کمک"
- [ ] Fallback: اگر permission denied → text input

**Tech:**
- [ ] Client: Web Speech API (`SpeechRecognition`, lang='fa-IR')
- [ ] Fallback: server-side STT (Azure/Google)
- [ ] PII redact قبل از log

#### ۱۱.۲.۲ Real-time Collaboration کامل (Back-Office)

- [ ] Presence: آواتار + نام کاربر در حال مشاهده
- [ ] Cursor tracking (مثل Google Docs) — اختیاری
- [ ] Comment thread روی هر فیلد:
  - Add comment → mention (@username)
  - Resolve / reply
  - Notification
- [ ] Activity feed: "X تغییر Y را در Z داد"
- [ ] WebSocket یا SSE

#### ۱۱.۲.۳ Data Viz پیشرفته (سند ۲۷)

- [ ] **Charts:**
  - Line: premium monthly
  - Bar: claims per status
  - Stacked Bar: premium breakdown
  - Area: cumulative claims
  - Sparkline: KPI trends
  - Gauge: target achievement
  - Treemap: portfolio distribution
  - Sankey: claims flow (filed → paid)
  - Heatmap: risk by region
  - Map (Choropleth): pricing by province (Leaflet)
- [ ] **Interactions:**
  - Hover tooltip (۱۵۰ms delay، فارسی formatted)
  - Click drill-down → drawer
  - Zoom/Brush روی time-series
  - Legend toggle
- [ ] **Accessibility:**
  - `role="img"` + `aria-label`
  - `<details><summary>View as table</summary>`
  - Keyboard nav روی datapoints
- [ ] **Export:** PNG (watermark) / CSV / PDF

#### ۱۱.۲.۴ Personalization Engine

- [ ] **Signals:**
  - نقش (IAM)
  - پورتفولیو (policy-service)
  - تاریخچه فعالیت (audit-log)
  - Life stage (KYC/sanhab)
  - Location (geo)
  - Time (client)
- [ ] **Rules:**
  - صبح → shortcuts مولدیت
  - شب → رابط آرام + خلاصه روز
  - اگر فقط خودرو → tips رانندگی
  - جوان → پیشنهاد عمر
- [ ] **Widget System:**
  - Drag/resize (react-grid-layout)
  - Persist layout در profile
  - Default layout per role
- [ ] **Consent:**
  - toggle "شخصی‌سازی داشبورد" on/off
  - "چرا این پیشنهاد؟" لینک روی NBA

#### ۱۱.۲.۵ Emotion-Aware UX (pilot)

- [ ] Stress detection:
  - تعداد back/forward زیاد
  - خطای تایپ زیاد
  - زمانی که روی فرم می‌ماند
- [ ] Response:
  - Tone بهتر: "اشکالی ندارد، آرام پیش برویم"
  - پیشنهاد call-me-back
  - AI copilot active help
  - UI simplification (hide secondary actions)

#### ۱۱.۲.۶ Glassmorphism (Premium dashboards)

- [ ] Back-Office admin dashboards
- [ ] `backdrop-blur` + `bg-white/10` + border subtle
- [ ] فقط در dark mode
- [ ] Performance check: GPU compositing

### ۱۱.۳ معیارهای خروجی فاز ۶

- [ ] Voice usage ≥ ۱۵٪ از FNOL‌ها
- [ ] Dashboard widget customization rate ≥ ۳۰٪
- [ ] Real-time collaboration active users ≥ ۵۰٪ Back-Office

### ۱۱.۴ Backend Dependency

| ویژگی | نیاز Backend | وضعیت |
|-------|--------------|-------|
| STT service | model-switchboard یا Azure STT | نیاز به setup |
| WebSocket infra | موجود (SSE) | enhance |
| Personalization API | recommendation-service | طرح دارد |

---

## ۱۲. فاز ۷: Polish & Scale (۴ هفته) <a id="phase7"></a>

> **هدف:** WCAG 3.0 APCA، Capacitor wrapper، Performance tightening، Visual regression coverage، و Docs.

### ۱۲.۱ Milestone

**Deliverable:** سامانه polish شده با AAA accessibility، native wrapper، performance ≥ ۹۰، و docs کامل.

### ۱۲.۲ وظایف جزئی

#### ۱۲.۲.۱ WCAG 3.0 APCA Migration

- [ ] جایگزینی contrast ratio با APCA
- [ ] Text weight consideration در کنتراست
- [ ] High-contrast theme (`high-contrast.css`)
- [ ] Manual audit با screen reader (NVDA, VoiceOver, TalkBack)
- [ ] Color-blind simulation
- [ ] Low-vision testing (zoom ۲۰۰٪)

#### ۱۲.۲.۲ Capacitor Wrapper (Native)

- [ ] Capacitor ۶ + Next.js export
- [ ] Plugins:
  - Camera (native performance)
  - Geolocation
  - Push Notifications (FCM/APNS)
  - Biometric (Face ID / Fingerprint)
  - SplashScreen
- [ ] Build به `.apk` / `.ipa` از CI
- [ ] Store submission (اختیاری)

#### ۱۲.۲.۳ Performance Budget Tightening

- [ ] Bundle size: main < ۱۷۰KB gz, per route < ۸۰KB
- [ ] LCP < ۲.۰s, INP < ۲۰۰ms, CLS < ۰.۰۵
- [ ] Image: AVIF + responsive srcset
- [ ] Font: subset فقط فارسی + latin lnum
- [ ] Code splitting: route-level + component lazy load
- [ ] `next/font` با Vazirmatn محلی

#### ۱۲.۲.۴ Visual Regression Coverage ≥ ۹۰٪

- [ ] Chromatic snapshots برای همه Storybook stories
- [ ] Playwright `toHaveScreenshot()` برای critical pages
- [ ] RTL + Dark mode snapshots
- [ ] Mobile ۳۶۰px snapshots

#### ۱۲.۲.۵ Docs + Playground

- [ ] Design System docs (Docusaurus یا Storybook docs)
- [ ] Component usage examples
- [ ] Migration guides (per version)
- [ ] Playground: stackblitz / codesandbox template

### ۱۲.۳ معیارهای خروجی فاز ۷

- [ ] Lighthouse Performance ≥ ۹۰ (همه اپ‌ها)
- [ ] Lighthouse Accessibility ≥ ۹۵ (همه اپ‌ها)
- [ ] WCAG 3.0 APCA pass
- [ ] Visual regression coverage ≥ ۹۰٪
- [ ] Docs کامل + playground قابل استفاده

---

## ۱۳. زیرساخت مشترک (Design System / CI/CD / Testing) <a id="infra"></a>

### ۱۳.۱ Design System Maintenance

**Token Pipeline:**
```
Figma Token Plugin → tokens/*.json → style-dictionary →
  CSS vars + Tailwind config + Dart theme (future)
```

**Versioning:**
- semver داخلی (`@insurance/design-system`)
- `changesets` برای changelog
- Breaking change → migration guide + codemod

**Review:**
- هر تغییر token = PR + review از Design Lead + Frontend Lead
- Chromatic diff check

### ۱۳.۲ CI/CD Pipeline

```
install → typecheck → lint → unit test → build →
visual regression (Chromatic) → a11y test (axe) →
e2e smoke (Playwright) → deploy preview →
Lighthouse CI → size-limit → merge
```

**GitHub Actions:**
- `.github/workflows/frontend.yml`
- `.github/workflows/design-system.yml`
- `.github/workflows/visual-regression.yml`

**Quality Gates:**
| Gate | Threshold |
|------|-----------|
| TypeCheck | ۰ error |
| ESLint + jsx-a11y | ۰ error |
| Vitest coverage | ≥ ۸۰٪ |
| axe-core | ۰ violation |
| Lighthouse Perf | ≥ ۸۵ |
| Lighthouse A11y | ≥ ۹۵ |
| Bundle size | per budget |

### ۱۳.۳ Testing Strategy

**Pyramid:**
- Unit (۳۵٪): Vitest — pure functions, hooks, reducers
- Component (۴۰٪): Testing Library + Storybook play — هر variant/state
- Integration (۲۰٪): API + UI combo
- E2E (۵٪): Playwright — critical flows cross-browser

**E2E Critical Flows:**

Customer:
- Login (OTP + Passkey)
- Dashboard load + NBA interaction
- Policy view + download PDF
- FNOL wizard کامل (mock camera)
- Payment flow (mock gateway)
- Profile update

Agent:
- Login SSO
- Quote Wizard کامل
- Customer lookup
- Commission view

Back-Office:
- Login
- Claim queue → detail → approve
- UW decision flow
- Audit search

### ۱۳.۴ Feature Flagging

**استراتژی:**
- هر feature جدید flag-guarded
- Rollout: ۵٪ → ۲۵٪ → ۱۰۰٪
- Canary بر اساس user segment / role

**Flags (نمونه):**
- `ui-v2-foundation`
- `dark-mode-toggle`
- `passkey-auth`
- `customer-dashboard-nba`
- `fnol-wizard-v2`
- `ai-chatbot`
- `agent-workbench`
- `backoffice-claims-workbench`

---

## ۱۴. تیم، تخمین‌ها، و ریسک‌ها <a id="team"></a>

### ۱۴.۱ ساختار تیم پیشنهادی

| نقش | تعداد | مسئولیت |
|-----|-------|---------|
| Frontend Lead | ۱ | معماری، code review، performance |
| Frontend Developer | ۱ | اجرای فازها، components |
| UI/UX Designer | ۱ | Figma tokens، visual design، review |
| QA Engineer | ۱ | E2E، a11y test، visual regression |
| Backend Developer (allocation ۵۰٪) | ۰.۵ | API‌های مورد نیاز frontend |
| DevOps (allocation ۲۵٪) | ۰.۲۵ | CI/CD، Storybook deploy، PWA |

### ۱۴.۲ جدول زمان‌بندی (Gantt-Style)

| فاز | شروع | طول | پایان | همپوشانی |
|-----|------|------|-------|----------|
| ۰ Foundation | M0 | ۰.۵ ماه | M0.۵ | — |
| ۱ Quick Wins | M0.۵ | ۱ ماه | M1.۵ | — |
| ۲ Customer Portal | M1.۵ | ۲ ماه | M3.۵ | با فاز ۳ |
| ۳ FNOL + Chatbot | M2.۵ | ۱.۵ ماه | M4 | — |
| ۴ Agent Portal | M4 | ۱.۵ ماه | M5.۵ | — |
| ۵ Back-Office | M5.۵ | ۲.۵ ماه | M8 | با فاز ۶ |
| ۶ Advanced | M7 | ۲ ماه | M9 | — |
| ۷ Polish | M9 | ۱ ماه | M10 | — |

**کل: ~۱۰ ماه**

### ۱۴.۳ ریسک‌ها و کاهش

| ریسک | شدت | احتمال | کاهش |
|------|-----|--------|------|
| Big Design System drift بین اپ‌ها | بالا | متوسط | Single source package + enforce در CI + Chromatic |
| Performance regression بعد از AI chatbot | بالا | بالا | Lazy load + code split + budget gating + bundle analyzer |
| Accessibility backtracking | بالا | بالا | axe در CI + manual audit هر فاز + a11y champion |
| Backend API delays | بالا | متوسط | mock contracts + parallel development + API-first swagger |
| Rollout بدون feature-flag | بالا | بالا | الزامی در definition-of-done + flag checklist |
| Designer turnover | متوسط | کم | Design tokens document + component docs |
| Browser support old devices | متوسط | بالا | browserslist config + progressive enhancement |
| WebAuthn adoption low | متوسط | بالا | fallback OTP + education + incentives |

### ۱۴.۴ Definition of Done (per feature)

- [ ] طراحی در Figma reviewed
- [ ] Component در Storybook با stories
- [ ] Unit tests coverage ≥ ۸۰٪
- [ ] Component tests با Testing Library
- [ ] Playwright E2E happy path
- [ ] axe-core pass
- [ ] Lighthouse بدون regression
- [ ] Visual regression snapshot approved
- [ ] RTL + Dark mode visual check
- [ ] Mobile ۳۶۰px visual check
- [ ] Keyboard-only navigation test
- [ ] Feature flag set up
- [ ] Observability event/metric افزوده
- [ ] Docs / Changeset
- [ ] PR review (Design + Code + QA)

---

## ۱۵. پیوست: نگاشت ترندهای ۲۰۲۶ به فازها <a id="appendix"></a>

| ترند (سند UI_UX_Research_2026) | فاز پیاده‌سازی | سند طراحی | اپ |
|-------------------------------|----------------|-----------|-----|
| AI Chatbots (خسارت/پشتیبانی) | ۳ | ۲۱ | Customer |
| Passwordless Login (Passkey/Biometric) | ۲ (WebAuthn) + ۷ (Capacitor native) | ۲۰ | همه |
| Dark Mode | ۱ + ۲ | ۲۴ | همه |
| Bottom Navigation (موبایل) | ۱ | ۱۰، ۱۱ | Customer + Agent |
| Accessibility-First (WCAG 3.0+) | ۰-۱ (foundation) + ۷ (APCA) | ۰۴ | همه |
| Smart Dark Mode | ۱ | ۲۴ | همه |
| AI Personalization | ۲ (NBA) + ۶ (engine) | ۲۳ | همه |
| Privacy-Centric UX | ۲ | ۲۰ | Customer |
| Micro-Interactions | ۱ | ۲۵ | همه |
| Minimalist Functional UI | ۰-۱ (tokens) + تدریجی | ۰۱، ۰۳ | همه |
| Data-Driven UX | ۶ | ۲۷ | Back-Office |
| Modular Design System | ۰ | ۰۲، ۰۵ | همه |
| Voice UI | ۶ | ۲۶ | Customer + Agent + Back-Office |
| Context-Aware Personalization | ۶ | ۲۳ | Customer + Agent |
| Emotion-Aware UX | ۶ (pilot) | ۲۲ | Customer |
| 3D/AR (FNOL Camera) | ۳ | ۲۲ | Customer |
| AR Guided Capture | ۶ (phase ۲ AR) | ۲۲ | Customer |
| Glassmorphism | ۶ | ۲۵ | Back-Office |
| Neumorphism | — | — | اختیاری / نادیده |
| Asymmetric Layouts | — | — | اختیاری / نادیده |
| PWA + Offline | ۱ + ۳ | ۱۱ | Customer |
| Real-time Collaboration | ۵ + ۶ | ۱۳ | Back-Office |
| Video-Led Motion | ۶ | — | همه |

---

## ۱۶. چک‌لیست شروع فوری (Next Actions)

برای شروع **امروز**:

1. [ ] **تأیید این سند** توسط Product Owner + Tech Lead
2. [ ] **تخصیص تیم:** ۲ FE + ۱ Designer + ۱ QA + ۰.۵ BE
3. [ ] **Branch:** `feat/ui-ux-2026-foundation`
4. [ ] **ایجاد `packages/design-system/`** — فاز ۰ شروع
5. [ ] **Figma Token Plugin** — Designer آماده tokens
6. [ ] **Backend sync meeting** — WebAuthn API + recommendation-service
7. [ ] **Setup:** Storybook Chromatic + Lighthouse CI + Turborepo
8. [ ] **Feature Flags:** `ui-v2-foundation = false` در همه envها

---

> **نکته پایانی:** این برنامه بر اساس ۲۷ سند طراحی موجود (`doc/design/*.md`) و وضعیت فعلی کد (`services/*-ui`) تهیه شده. هر فاز مستقل و feature-flagged است. تغییرات در scope یا timeline باید در این سند مستند و نسخه‌گذاری شود.
