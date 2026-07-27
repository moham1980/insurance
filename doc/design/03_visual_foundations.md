# 03 — Typography, Color & Iconography

---

## ۱. Typography Guidelines

### انتخاب فونت
- **فارسی:** `Vazirmatn Variable` با weight دینامیک 100–900
- **لاتین/عدد:** `Inter Variable`
- **Monospace:** `JetBrains Mono` برای کد/شماره بیمه‌نامه

### بارگذاری
```html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/Vazirmatn-Variable.woff2">
```
`font-display: swap;` و hosting محلی (بدون Google Fonts برای privacy).

### قواعد تایپوگرافی
- **عنوان:** حداکثر ۲ سطح در یک صفحه
- **Line-length:** 50–75 کاراکتر برای متن توضیحی
- **عدد مالی:** همیشه `tabular-nums` + راست‌چین
- **نقل قول/اصطلاح بیمه:** italic ممنوع در فارسی؛ به‌جایش رنگ muted یا background subtle

---

## ۲. Color System — جزئیات

### Brand Palette
- **Primary (Trust Blue):** `#1E5BFF` — اصلی‌ترین CTA
- **Secondary (Calm Teal):** `#0EA5A4` — وضعیت فعال، بیمه سلامت
- **Accent (Warm Amber):** `#F59E0B` — پاداش، gamification

### Status Palette
- هر وضعیت یک **جفت** رنگ دارد: `bg-soft` + `fg-strong`
- مثال: `--status-claim-pending`: bg `#FEF3C7` / fg `#92400E`

### Domain-Specific Hints
| دامنه | رنگ پیشنهادی | دلیل |
|------|--------------|------|
| Life/Health | سبز ملایم | نزدیکی به سلامت |
| Auto/Motor | آبی | اعتماد/حمل‌ونقل |
| Property | خاکی/قهوه‌ای | ثبات |
| Travel | فیروزه‌ای | حرکت/سفر |

**قاعده:** رنگ domain فقط به‌عنوان accent/border؛ primary CTA همیشه brand-primary.

---

## ۳. Iconography

### کتابخانه پایه
- **lucide-react** (منبع باز، قابل tree-shake)
- **آیکون‌های بومی بیمه:** ست اختصاصی SVG در `packages/design-system/icons/ir/`

### لیست Icon‌های اختصاصی بیمه (پیشنهاد اولیه)
- `policy-document`, `claim-file`, `premium-pay`, `reinsurance`, `underwriting`, `fnol-car`, `fnol-home`, `agent-handshake`, `fraud-alert`, `sanhab-verify`

### قواعد
- اندازه‌های رسمی: `16 / 20 / 24 / 32`
- stroke-width ثابت: `1.75`
- هر آیکون باید **aria-label** یا `aria-hidden="true"` (اگر تزئینی است) داشته باشد
- ممنوعیت rasterization — فقط SVG

---

## ۴. Imagery & Illustration

- سبک واحد: flat + soft gradient (هماهنگ با ترند ۲۰۲۶)
- تصاویر انسانی: متنوع (جنسیت، سن، پوشش) — دوری از stereotype
- **Dark-mode variant** برای هر illustration
- حداکثر weight: 80KB، فرمت AVIF/WebP

---

## ۵. Data Viz Palette (برای سند 27 بازگردید)

8 رنگ قابل تمایز روی light و dark، عبور از color-blind checker:
```
#1E5BFF #0EA5A4 #F59E0B #DC2626 #8B5CF6 #EC4899 #10B981 #64748B
```
هیچ‌گاه «فقط رنگ» برای افتراق سری‌ها؛ همیشه رنگ + الگو (stroke/dot).
