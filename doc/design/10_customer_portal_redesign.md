# 10 — ارتقای Customer Portal (وب)

> **هدف:** `services/customer-portal-ui` به یک پرتال مشتری-محور با AI، Passwordless، و Self-Service کامل ارتقا یابد.

مرجع موجود: `doc/CUSTOMER_PORTAL_PRD.md`

---

## ۱. IA (Information Architecture)

```
/                          → Landing / Login
/dashboard                 → Overview (همه بیمه‌نامه‌ها، اعلان‌ها، NBA)
/policies                  → لیست بیمه‌نامه‌ها
/policies/[id]             → جزئیات + تمدید/اصلاح
/claims                    → لیست خسارات
/claims/new                → FNOL Wizard (با AI)
/claims/[id]               → Detail + Chat + Documents
/payments                  → تاریخچه + پرداخت آنلاین
/payments/new              → درگاه پرداخت
/profile                   → اطلاعات شخصی + تنظیمات
/profile/security          → passkey, device, 2FA
/profile/consent           → مدیریت رضایت داده
/support                   → تیکت/چت/FAQ
/support/chat              → Live chat با AI + human
```

---

## ۲. Screens و توصیف جزئیات

### 2.1 Login
- ورود با موبایل + OTP → پیشنهاد Passkey → در ورودهای بعدی Biometric/Passkey
- بدون فیلد رمز عبور (مطابق سند 20)
- Captcha فقط در rate-limit trigger
- **Principle:** "Privacy-Centric + Passwordless"

### 2.2 Dashboard (Personalized)
بلوک‌های بالا به پایین، با اولویت **Alert-First**:

1. **Hero Card (Next Best Action):** یک پیشنهاد هوشمند بر اساس AI — مثال: «بیمه بدنه شما تا ۷ روز دیگر منقضی می‌شود» + دکمه تمدید
2. **Stats Grid (۴ عدد KPI):** بیمه‌نامه فعال / خسارات باز / پرداخت سررسید / امتیاز رفتار ایمن
3. **Policies Carousel:** PolicyCard (سند 05)
4. **Recent Activity Timeline**
5. **Educational Tips Strip:** نکات safe-driving/healthy-living بر اساس پورتفولیو کاربر

**Layout:** 12-column grid، تا `md` تبدیل به single column.

### 2.3 Policy Detail
- Tab: Overview | Coverage | Documents | Payments | History
- **CoverageMatrix** component: ماتریس پوشش‌ها با آیکون و tooltip توضیح
- **Action bar sticky پایین:** تمدید / اصلاح / دانلود PDF / ثبت خسارت
- Sidebar: Agent اختصاصی + دکمه تماس/چت

### 2.4 FNOL Wizard (خسارت جدید)
(سند 22 جزئیات موبایل)
- Step 1: انتخاب بیمه‌نامه (preselect بر اساس پیش‌بینی AI)
- Step 2: نوع حادثه (chips بزرگ + voice input)
- Step 3: زمان/مکان (map + geolocation)
- Step 4: عکس/ویدیو + OCR خودکار پلاک/کارت
- Step 5: توضیحات (AI suggest از voice-to-text)
- Step 6: Review + امضای دیجیتال + Submit
- **UX Rules:** Autosave در هر step؛ امکان ادامه از موبایل → وب

### 2.5 Payments
- لیست با filter بازه/نوع/وضعیت
- KPI: کل پرداختی، سررسید بعدی
- درگاه پرداخت داخل iframe امن + fallback صفحه کامل
- دانلود رسید PDF + ارسال ایمیل/SMS

### 2.6 Support Chat (AI + Human)
- سند 21 جزئیات
- مدل: AI اول پاسخ می‌دهد → escalate به انسان با context کامل

---

## ۳. Layout Shell

```tsx
<html lang="fa" dir="rtl">
  <body>
    <AppHeader />     {/* logo + search + notif + profile */}
    <main className="mx-auto max-w-[1200px] px-4 py-6">
      {children}
    </main>
    <MobileBottomNav /> {/* تا md فقط */}
    <Toaster />
    <AIAssistantLauncher /> {/* FAB floating */}
  </body>
</html>
```

---

## ۴. Mobile-First / PWA

- Breakpoint اصلی: **360px**
- Bottom nav با ۴ تب: خانه / بیمه‌نامه‌ها / خسارات / پروفایل
- دکمه FAB مرکزی: «ثبت خسارت» (برجسته)
- Install prompt PWA + offline cache برای PolicyList و profile

جزئیات PWA در سند 11.

---

## ۵. وابستگی‌های Frontend جدید

```json
{
  "@radix-ui/react-*": "latest",
  "class-variance-authority": "^0.7",
  "lucide-react": "^0.x",
  "zod": "^3",
  "react-hook-form": "^7",
  "@tanstack/react-query": "^5",
  "@tanstack/react-virtual": "^3",
  "framer-motion": "^11",
  "date-fns-jalali": "^3",
  "next-pwa": "^5",
  "@hookform/resolvers": "^3"
}
```

---

## ۶. Performance Budget

| متریک | هدف |
|-------|-----|
| LCP | < 2.0s |
| INP | < 200ms |
| CLS | < 0.05 |
| JS initial | < 170KB gz |
| Image | AVIF + responsive |

**روش‌ها:**
- Server Components پیش‌فرض
- Route-level code splitting
- `next/font` با Vazirmatn از host محلی
- Image optimization با `next/image`
- Prefetch هوشمند برای لینک‌های hover-شده

---

## ۷. Migration Plan از وضعیت فعلی

1. **Foundation:** جذب `@insurance/design-system` + tokens (بدون تغییر UI)
2. **Shell Redesign:** Header + MobileBottomNav + Theme toggle
3. **Auth Passwordless:** سند 20
4. **Dashboard Redesign** با NBA card
5. **Policy/Claim/Payment** بازطراحی تدریجی
6. **AI Chatbot** (سند 21)
7. **FNOL AR/Voice** (سند 22)

هر فاز = PR قابل merge مستقل + feature-flag.
