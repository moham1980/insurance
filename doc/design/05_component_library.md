# 05 — Component Library

> Stack: **Radix Primitives + shadcn/ui + Tailwind** + کامپوننت‌های اختصاصی بیمه

---

## ۱. فلسفه

- **Headless + Themed:** منطق ازRadix، ظاهر از tokens
- **Composable:** کامپوننت‌های کوچک قابل ترکیب (نه یک `<InsuranceCard>` جامع)
- **RTL-native:** همه کامپوننت‌ها پیش‌فرض RTL-aware
- **Server-Component-friendly:** حداقل `use client` (فقط interactive ها)

---

## ۲. ساختار پوشه

```
packages/design-system/components/
├─ primitives/          # شِل روی Radix
│  ├─ Button.tsx
│  ├─ Dialog.tsx
│  ├─ DropdownMenu.tsx
│  ├─ Tooltip.tsx
│  ├─ Tabs.tsx
│  ├─ Popover.tsx
│  ├─ Toast.tsx
│  └─ ...
├─ forms/
│  ├─ Input.tsx
│  ├─ Textarea.tsx
│  ├─ Select.tsx
│  ├─ DatePicker.tsx  (Jalali)
│  ├─ NumberInput.tsx (currency)
│  ├─ OtpInput.tsx
│  ├─ FileUpload.tsx
│  └─ FormField.tsx    (label+error+hint)
├─ data-display/
│  ├─ Table.tsx         (virtualized)
│  ├─ DataCard.tsx
│  ├─ Stat.tsx
│  ├─ Badge.tsx
│  ├─ Timeline.tsx
│  └─ Empty.tsx
├─ feedback/
│  ├─ Alert.tsx
│  ├─ Skeleton.tsx
│  ├─ ProgressBar.tsx
│  └─ Spinner.tsx
├─ navigation/
│  ├─ Navbar.tsx
│  ├─ BottomNav.tsx     (mobile)
│  ├─ Sidebar.tsx
│  ├─ Breadcrumb.tsx
│  └─ StepIndicator.tsx
└─ domain/              # اختصاصی بیمه
   ├─ PolicyCard.tsx
   ├─ ClaimStatusBadge.tsx
   ├─ PremiumBreakdown.tsx
   ├─ CoverageMatrix.tsx
   ├─ FnolWizard.tsx
   ├─ IdDocumentScanner.tsx
   └─ SignaturePad.tsx
```

---

## ۳. استاندارد API کامپوننت

### مثال Button
```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  asChild?: boolean; // Radix Slot
} & ButtonHTMLAttributes<HTMLButtonElement>;
```

**قواعد:**
- `isLoading` → spinner + `aria-busy="true"` + disabled
- `asChild` برای link wrapping
- کلاس‌ها با `cva` (class-variance-authority)
- هر variant تست visual regression

---

## ۴. Design-to-Code Mapping

| Figma Token | CSS Var | Tailwind Utility |
|-------------|---------|-------------------|
| Color/Brand/Primary | `--color-brand-primary` | `bg-brand-primary` |
| Space/4 | `--space-4` | `p-4` (=16px) |
| Radius/MD | `--radius-md` | `rounded-md` |
| Shadow/2 | `--shadow-2` | `shadow-2` |

---

## ۵. Storybook / Playroom

- هر کامپوننت = یک فایل `.stories.tsx`
- کنترل‌های واجب: variant, size, state (default/hover/focus/disabled/loading)
- **A11y addon** و **RTL toggle** اجباری
- Chromatic برای visual regression

---

## ۶. کامپوننت‌های دامنه‌محور (نمونه)

### PolicyCard
```
┌──────────────────────────────────┐
│ [icon] بیمه بدنه خودرو          │
│ شماره: IR-1404-00123             │
│ اعتبار تا: ۱۴۰۵/۰۷/۱۰            │
│ ──────────────────────────────── │
│ [Status: فعال]  [Premium: ۲.۴M] │
│ [دانلود PDF] [تمدید] [خسارت]     │
└──────────────────────────────────┘
```
API:
```tsx
<PolicyCard
  policy={policy}
  onRenew={}
  onFileClaim={}
  actions={['download','renew','claim']}
  density="comfortable|compact"
/>
```

### ClaimStatusBadge
- وضعیت‌ها: `draft | submitted | under-review | approved | rejected | paid`
- هر وضعیت یک pair رنگ semantic + آیکون
- `aria-label` کامل («وضعیت خسارت: در حال بررسی»)

---

## ۷. Versioning

- semver داخلی برای package
- Changelog خودکار با `changesets`
- breaking change → نیاز به migration guide + codemod
