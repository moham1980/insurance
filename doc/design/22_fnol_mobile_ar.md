# 22 — FNOL موبایل با Camera / AR / Voice

> First Notice of Loss (اعلام خسارت) بحرانی‌ترین UX در بیمه است. کاربر اغلب مضطرب است.

---

## ۱. اصول UX اختصاصی FNOL

- **فونت و دکمه بزرگ‌تر از حالت عادی** (کاربر مضطرب، فشار روحی)
- **Tone همدلانه:** «حالتان خوبه؟ قبل از هر چیز، ایمنی شما مهم است.»
- **Progress visible** همیشه (مثلاً «۳ از ۶»)
- **Autosave aggressive** (هر ۲ ثانیه draft می‌رود)
- **Recovery Link:** اگر اپ بسته شد، دقیقاً همان step ادامه
- **Calm palette:** آبی ملایم به‌جای قرمز هشدار

---

## ۲. Wizard Steps (Mobile-First)

### Step 0 — Safety Check
- صفحه اول فقط دو دکمه بزرگ:
  - «من در امنیت هستم، ادامه» (primary)
  - «به کمک نیاز دارم» → تماس فوری با اورژانس/امداد بیمه

### Step 1 — انتخاب بیمه‌نامه
- Cards بزرگ؛ اگر فقط یکی مرتبط → preselect هوشمند (اولویت بالا)

### Step 2 — نوع حادثه
- Chips بزرگ با آیکون: تصادف، آتش‌سوزی، سرقت، خسارت بدنی، ...
- Voice input: «بگویید چه اتفاقی افتاد» → AI تشخیص نوع

### Step 3 — زمان و مکان
- Time: default = alan (قابل تغییر)
- Location:
  - دکمه «محل فعلی» با Geolocation
  - Map (Leaflet + OpenStreetMap سازگار با ایران)
  - Reverse-geocode برای آدرس متنی

### Step 4 — مدارک (Camera + AR)

#### Camera Capture
- تمام‌صفحه
- Overlay راهنما: «پلاک خودرو را در کادر قرار دهید»
- ۴ عکس پیش‌فرض لازم: پلاک، خسارت کلی، خسارت نزدیک، زاویه متفاوت
- بعد از capture: OCR روی پلاک + تطبیق با بیمه‌نامه

#### OCR + ML
- پلاک → اعتبارسنجی با شماره بیمه‌نامه
- کارت ملی / شناسنامه → fill فرم خودکار
- اگر mismatch → هشدار ملایم

#### AR Guided Capture (فاز ۲)
- AR.js یا WebXR (پشتیبانی محدود)
- Overlay دستورالعمل‌های ۳D: «از این زاویه عکس بگیرید»
- برای phase اول، Camera با overlay ۲D کافی است

### Step 5 — شرح حادثه
- Voice-to-text (فارسی) با Web Speech API یا Google STT
- AI summarize و suggest (سند 21)
- کاربر ویرایش کند قبل از تایید

### Step 6 — Review & Sign
- خلاصه همه داده‌ها
- SignaturePad component (امضای دستی روی صفحه)
- Submit → اگر offline، در صف با Background Sync

---

## ۳. Offline Resilience

- IndexedDB Draft (Dexie)
- Upload صف-شده در Service Worker (Background Sync API)
- UI badge: «۳ عکس در انتظار ارسال»
- Retry exponential backoff

---

## ۴. Performance

- Lazy-load camera libraries (فقط در Step 4)
- Image compression client-side (MozJPEG / WebP quality 70)
- Max upload 2MB per image
- Video: 10s max

---

## ۵. Accessibility در FNOL

- Voice-first برای کاربران بصری‌ناتوان
- Text alternatives برای هر مرحله
- شماره تماس پشتیبانی در هر صفحه (sticky)

---

## ۶. Stress Detection (فاز ۳)

اگر کاربر اشاراتی از استرس نشان داد (مثلاً چند بار back/forward، خطای زیاد تایپ):
- tone به‌تر: «اشکالی ندارد، آرام پیش برویم»
- پیشنهاد call-me-back
- AI copilot به‌کمک می‌آید

---

## ۷. Post-submit Experience

- Screen موفقیت با کد پیگیری بزرگ
- Timeline آینده: «۱. دریافت شد ✓ | ۲. بررسی اولیه (تا ۲۴h) | ۳. کارشناس | ۴. پرداخت»
- Push Notification فعال شود برای updates
- دکمه «اشتراک کد پیگیری» (Share API)

---

## ۸. Metrics

| KPI | هدف |
|-----|-----|
| FNOL completion rate | ≥ 88% |
| Avg completion time | ≤ 3 min |
| OCR accuracy (پلاک) | ≥ 97% |
| Drop-off per step | ≤ 5% |
| NPS (پس از FNOL) | ≥ 50 |
