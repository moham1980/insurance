# 02 — Design System و Design Tokens

> سیستم طراحی یکپارچه و token-driven؛ قابل مصرف در هر سه اپ Next.js (web-ui, customer-portal-ui, agent-portal-ui).

---

## ۱. معماری Design System

```
packages/
└─ design-system/
   ├─ tokens/               # Design Tokens (JSON → CSS vars)
   │  ├─ color.json
   │  ├─ typography.json
   │  ├─ spacing.json
   │  ├─ radius.json
   │  ├─ shadow.json
   │  └─ motion.json
   ├─ tailwind-preset.ts    # Tailwind preset مشترک
   ├─ components/           # کامپوننت‌های React (shadcn + custom)
   ├─ icons/                # آیکون‌ها (lucide + Persian set)
   └─ themes/
      ├─ light.css
      ├─ dark.css
      └─ high-contrast.css
```

**مصرف در هر اپ:**

```ts
// next.config.js (each app)
transpilePackages: ['@insurance/design-system']

// tailwind.config.ts
import preset from '@insurance/design-system/tailwind-preset';
export default { presets: [preset], content: [...] };
```

---

## ۲. Color Tokens

### Semantic (نه خام)

| Token | نقش | Light | Dark |
|-------|-----|-------|------|
| `--color-bg-base` | پس‌زمینه اصلی | `#FFFFFF` | `#0B1020` |
| `--color-bg-subtle` | کارت/سطح ۲ | `#F7F8FA` | `#141A2E` |
| `--color-bg-raised` | مودال/Popover | `#FFFFFF` | `#1B2238` |
| `--color-border` | مرز پیش‌فرض | `#E5E7EB` | `#2A3350` |
| `--color-text-primary` | متن اصلی | `#0F172A` | `#E6EAF2` |
| `--color-text-muted` | متن ثانویه | `#475569` | `#9BA3B4` |
| `--color-brand-primary` | رنگ برند | `#1E5BFF` | `#5C85FF` |
| `--color-brand-on` | متن روی brand | `#FFFFFF` | `#0B1020` |
| `--color-success` | موفقیت | `#0E9F6E` | `#34D399` |
| `--color-warning` | هشدار | `#D97706` | `#FBBF24` |
| `--color-danger` | خطا | `#DC2626` | `#F87171` |
| `--color-info` | اطلاع | `#0284C7` | `#38BDF8` |

**قاعده:** در JSX **هرگز** از مقادیر خام hex استفاده نکنید؛ فقط token.

### کنتراست اجباری
- متن روی `bg-base` ≥ 4.5:1
- متن روی `brand-primary` ≥ 4.5:1
- FocusRing ≥ 3:1 با پس‌زمینه مجاور

---

## ۳. Typography Tokens

### فونت فارسی
- **Primary:** Vazirmatn (Variable)
- **Fallback:** `system-ui, -apple-system, "Segoe UI"`
- **Numeric:** قفل روی Latin digits برای داده‌های مالی (با CSS `font-feature-settings: 'lnum'`)

### Type Scale

| Token | Size/Line | کاربرد |
|-------|-----------|--------|
| `--fs-display` | 32/40 | صفحه‌های onboarding |
| `--fs-h1` | 24/32 | عنوان صفحه |
| `--fs-h2` | 20/28 | عنوان بخش |
| `--fs-h3` | 18/26 | عنوان کارت |
| `--fs-body` | 16/24 | متن اصلی |
| `--fs-body-sm` | 14/20 | توضیحات |
| `--fs-caption` | 12/16 | caption/label |
| `--fs-number-lg` | 28/36 | KPI |

---

## ۴. Spacing (4-pt grid)

`--space-0: 0` · `1: 4px` · `2: 8px` · `3: 12px` · `4: 16px` · `5: 20px` · `6: 24px` · `8: 32px` · `10: 40px` · `12: 48px` · `16: 64px`

---

## ۵. Radius / Shadow / Motion

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
--radius-pill: 999px;

--shadow-1: 0 1px 2px rgb(0 0 0 / .06);
--shadow-2: 0 4px 12px rgb(0 0 0 / .08);
--shadow-3: 0 12px 32px rgb(0 0 0 / .12);

--motion-fast: 120ms;
--motion-base: 200ms;
--motion-slow: 320ms;
--ease-standard: cubic-bezier(.2,.8,.2,1);
--ease-emphasized: cubic-bezier(.2,0,0,1);
```

**قاعده Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
```

---

## ۶. Theming & Dark Mode

- استراتژی: `class="dark"` روی `<html>` + CSS vars
- تشخیص خودکار: `prefers-color-scheme` اما override کاربر در localStorage
- حالت `high-contrast` برای accessibility (WCAG AAA)

---

## ۷. Token Pipeline

1. ویرایش JSON → اجرای `style-dictionary` → تولید CSS vars + Tailwind config + Dart theme (آینده اپ موبایل native)
2. تست بصری خودکار با **Chromatic/Playwright visual** در CI
3. تغییر token = PR + review از Design + Frontend Lead
