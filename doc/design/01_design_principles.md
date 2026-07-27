# 01 — اصول طراحی (Design Principles)

> این اصول روی هر سه اپ (Customer / Agent / Back-Office) حاکم هستند.

---

## ۱. اصول کلان

| # | اصل | توضیح عملی |
|---|-----|-------------|
| P1 | **Trust-First** | شفافیت داده، وضعیت هر اقدام، نمایش consent، امضا/مهر دیجیتال |
| P2 | **Calm & Focused** | حذف نویز بصری، whitespace کافی، hierarchy واضح، یک CTA غالب |
| P3 | **Accessibility-First** | WCAG 3.0+، RTL، کنتراست ≥ 4.5:1، keyboard-operable |
| P4 | **Adaptive & Personal** | UI و content بر اساس نقش/مرحله زندگی/رفتار تطبیق یابد |
| P5 | **Conversational & Intent-Led** | کاربر نیت را بگوید، AI فرم/گردش‌کار بسازد |
| P6 | **Minimal Cognitive Load** | یک کار در هر صفحه، Progressive Disclosure، راهنماهای درون‌خط |
| P7 | **Mobile-First & One-Hand** | bottom-navigation، gesture، thumb-reachable primary CTA |
| P8 | **Data as Decision Input** | به‌جای داشبورد گزارش‌محور، next-best-action و alert-first |
| P9 | **Modular & Consistent** | Design System یکسان + tokens مشترک بین سه اپ |
| P10 | **Private by Default** | حداقل داده، رمزنگاری، دسترسی role-based شفاف به کاربر |

---

## ۲. اصول تفکیک‌شده بر اساس اپ

### Customer Portal (B2C/B2B)
- **ساده بگو، سریع انجام بده.** خرید/تمدید/خسارت در ≤۳ step
- **صدای کاربر مضطرب در FNOL.** UI آرام، فونت بزرگ‌تر، tone همدلانه
- **Embedded & Contextual.** پرداخت/امضا/آپلود مدارک درون‌صفحه، نه popup جدید

### Agent Portal
- **سرعت ورود داده.** میانبر کیبورد، autocomplete، bulk actions
- **Context + Co-pilot.** AI پیشنهاد بدهد، نماینده تایید کند (human-in-the-loop)
- **Dense but Scannable.** چگالی اطلاعات بالا بدون ازدحام

### Back-Office (web-ui)
- **Workbench Model.** صفحه کاری یکپارچه به‌جای jump بین tab
- **Auditability.** هر اقدام audit trail + diff viewer
- **Policy of Least Surprise.** RBAC شفاف، disabled به‌جای 403

---

## ۳. Anti-Patterns ممنوع

| ❌ نباید | ✅ جایگزین |
|---------|-----------|
| Modal داخل Modal | Wizard با step-indicator |
| رنگ به‌تنهایی برای error | رنگ + آیکون + متن |
| Hover-only interactions | Focus + Click معادل |
| Infinite scroll در لیست‌های مالی | Pagination + Filter |
| رمز عبور + CAPTCHA پیچیده | OTP / Passkey / Biometric |
| Jargon بیمه‌ای بدون tooltip | اصطلاح + توضیح درون‌خط |
| Dark-pattern (pre-checked opt-in) | consent صریح و قابل‌لغو |

---

## ۴. North-Star Metrics

| Metric | هدف ۲۰۲۶ |
|--------|-----------|
| Task Success Rate (خرید/تمدید) | ≥ 92% |
| FNOL Completion Time (موبایل) | ≤ 3 min |
| Lighthouse Performance | ≥ 90 همه اپ‌ها |
| Lighthouse Accessibility | ≥ 95 همه اپ‌ها |
| WCAG Conformance | AA در فاز ۱، AAA هدفگذاری فاز ۲ |
| NPS مشتری | ≥ 45 |
| Agent Time-to-Quote | کاهش ۴۰٪ |
