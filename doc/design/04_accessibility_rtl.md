# 04 — Accessibility و RTL

> هدف: **WCAG 2.2 AA** در فاز ۱ (الزامی) — **WCAG 3.0 APCA** در فاز ۲.

---

## ۱. استانداردها و چک‌لیست

### Perceivable
- [ ] کنتراست متن عادی ≥ 4.5:1 / متن بزرگ ≥ 3:1
- [ ] FocusRing ≥ 3:1 و حداقل 2px عرض
- [ ] رنگ تنها حامل معنا نباشد (رنگ + متن + آیکون)
- [ ] تصاویر `alt` معنادار؛ تزئینی‌ها `alt=""`
- [ ] ویدیوها caption فارسی + transcript

### Operable
- [ ] تمام تعاملات با **کیبورد** ممکن است (Tab/Shift+Tab/Enter/Space/Esc)
- [ ] ترتیب فوکوس منطقی (RTL → از راست به چپ)
- [ ] Skip-link: "پرش به محتوای اصلی"
- [ ] بدون keyboard-trap
- [ ] منطقه کلیک ≥ 44×44px (موبایل)

### Understandable
- [ ] `<html lang="fa" dir="rtl">`
- [ ] Label واضح برای هر input + error message کنار فیلد
- [ ] Placeholder جایگزین label **نیست**
- [ ] اصطلاحات بیمه‌ای با `<abbr title="...">` یا tooltip

### Robust
- [ ] ARIA صحیح (نه زیاده‌روی)
- [ ] Landmarks: `<header> <nav> <main> <aside> <footer>`
- [ ] `aria-live="polite"` برای notif و toast
- [ ] role صحیح برای custom components

---

## ۲. RTL Engineering

### HTML / CSS
```html
<html lang="fa" dir="rtl">
```
- استفاده از **logical properties**: `margin-inline-start`, `padding-inline-end`, `inset-inline`
- ممنوعیت `left/right` در layout (مگر برای چیدمان مشخص LTR مثل داده لاتین)
- Tailwind: plugin `tailwindcss-rtl` یا preset خودی با `start-*/end-*`

### آیکون‌های جهت‌دار
- `chevron-left/right` در RTL flip می‌شود (مثلاً back button)
- آیکون‌های محتوایی (play, camera, search) flip **نمی‌شوند**
- قاعده: `[dir="rtl"] .icon-directional { transform: scaleX(-1); }`

### اعداد
- اعداد مالی/تاریخ میلادی **Latin**
- تاریخ‌های جلالی با `Intl.DateTimeFormat('fa-IR-u-ca-persian')`
- یک util مرکزی: `formatCurrency(value, 'IRR')` و `formatPersianDate(date)`

---

## ۳. Keyboard Shortcuts استاندارد

| اپ | میانبر | عمل |
|----|--------|------|
| همه | `/` | focus بر search |
| همه | `?` | نمایش help overlay |
| همه | `Esc` | بستن modal/drawer |
| Agent | `Ctrl+N` | quote جدید |
| Agent | `Ctrl+S` | save draft |
| Back-Office | `G + C` | go to Claims |
| Back-Office | `G + P` | go to Policies |

میانبرها باید در Help overlay قابل مشاهده باشند.

---

## ۴. Screen Reader Testing

**ابزارها:** NVDA (Windows) + VoiceOver (macOS/iOS) + TalkBack (Android)

**سناریوهای اجباری برای تست:**
1. Login با OTP کامل با screen-reader
2. ثبت FNOL موبایل فقط با VoiceOver
3. پر کردن فرم quote در Agent Portal با NVDA
4. navigation بک‌آفیس در حالت keyboard-only

---

## ۵. Inclusive Content

- تن صدا: **همدل، ساده، بدون jargon**
- اعداد بزرگ: جداسازی سه‌رقمی فارسی `۱٬۲۵۰٬۰۰۰ ریال`
- پیام خطا: «چه اتفاقی افتاد + چه کنم؟» به‌جای کد خطا
- Loading states همیشه با متن: «در حال بارگذاری بیمه‌نامه‌ها...»

---

## ۶. ابزارهای خودکار در CI

- `@axe-core/playwright` — هر E2E test
- `eslint-plugin-jsx-a11y` — در pre-commit
- `pa11y-ci` — crawl روی staging
- Lighthouse CI — threshold accessibility ≥ 95

---

## ۷. WCAG 3.0 APCA (فاز ۲)

تفاوت: به‌جای contrast ratio ساده، APCA رنگ متن را بر اساس weight فونت محاسبه می‌کند. برای فاز ۲ migration plan جداگانه تهیه می‌شود.
