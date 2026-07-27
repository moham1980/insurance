# 11 — PWA موبایل مشتری

> اپ موبایل با **PWA** پیاده می‌شود (بدون نیاز به Store اول)؛ در فاز آینده Capacitor/React Native wrapper.

---

## ۱. چرا PWA؟

- بدون وابستگی به Store ایران
- Install مستقیم از Safari/Chrome
- Push Notification (Web Push + FCM در Android)
- Offline برای PolicyList و FNOL draft
- مسیر ارتقا به Native با Capacitor آسان

---

## ۲. Manifest و Icons

```json
{
  "name": "بیمه من",
  "short_name": "بیمه من",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0B1020",
  "theme_color": "#1E5BFF",
  "dir": "rtl",
  "lang": "fa",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable.png", "sizes": "512x512", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "ثبت خسارت", "url": "/claims/new", "icons": [...] },
    { "name": "بیمه‌نامه‌ها", "url": "/policies" },
    { "name": "پرداخت", "url": "/payments/new" }
  ]
}
```

---

## ۳. Service Worker Strategy

| منبع | استراتژی |
|------|----------|
| HTML routes | `NetworkFirst` (ttl 5m) |
| Static assets (`/\_next/static`) | `CacheFirst` immutable |
| API `GET /policies` | `StaleWhileRevalidate` |
| API `GET /profile` | `StaleWhileRevalidate` |
| API `POST/*` | `NetworkOnly` + background sync |
| Images | `CacheFirst` با max-age 30d |

**ابزار:** `next-pwa` با `workbox` config سفارشی.

---

## ۴. Offline Capabilities

- **PolicyList offline:** آخرین lookup cache می‌شود + badge «آفلاین»
- **FNOL Draft:** IndexedDB (via `dexie`) — اگر offline بمانیم، submit صف می‌شود
- **Background Sync API:** هنگام بازگشت آنلاین، submit خودکار + notif به کاربر

---

## ۵. Push Notifications

### کاربردها
- یادآوری تمدید (۳۰/۱۵/۷/۱ روز قبل)
- تغییر وضعیت خسارت
- پیام از کارشناس
- سررسید پرداخت
- توصیه‌های safe-driving/health

### پیاده‌سازی
- Web Push API + VAPID
- Consent UX: **بعد** از اولین interaction معنادار (نه onboarding اول)
- UI: صفحه `/profile/notifications` برای مدیریت granular

---

## ۶. One-Hand Mobile UX

- **Bottom Nav** با ۴ تب + FAB مرکزی (ثبت خسارت)
- **Thumb Zone:** Primary actions در ۳۴٪ پایینی صفحه
- **Swipe Gestures:**
  - راست→چپ روی PolicyCard = مشاهده جزئیات (LTR چپ→راست)
  - pull-to-refresh در لیست‌ها
  - swipe-to-dismiss در notifications
- **Bottom Sheets** به‌جای Modal‌ها (Radix Drawer/Vaul)

---

## ۷. Device Capabilities

| Capability | کاربرد |
|-----------|--------|
| Camera | عکس FNOL + OCR شناسنامه/کارت ملی |
| Geolocation | محل حادثه |
| Biometric (WebAuthn/Passkey) | ورود |
| Share API | اشتراک رسید/بیمه‌نامه |
| Contacts | شماره تماس اضطراری |
| Vibration | bازخورد در OTP/FNOL |
| File System Access | آپلود چندفایل PDF |

---

## ۸. Performance (Mobile)

| متریک | هدف روی 4G Galaxy A20 |
|-------|-----------------------|
| LCP | < 2.5s |
| TTI | < 3.5s |
| JS initial | < 130KB gz |
| Images | lazy + AVIF |
| Font | subset فقط فارسی + latin lnum |

---

## ۹. Capacitor Wrapper (فاز ۲)

در صورت نیاز به Native:
- Capacitor (Ionic) + همین Next.js export
- Plugin‌های لازم: Camera, Geolocation, PushNotifications, Biometric, SplashScreen
- build به `.apk` / `.ipa` از CI

---

## ۱۰. Install UX

- Install banner فقط بعد از ۲ بازدید معنادار
- Instructional sheet: "چگونه نصب کنم؟" (iOS نیاز به step-by-step دارد)
- Fallback برای browser‌های قدیمی: بنر «با Chrome باز کنید»
