# 26 — Voice UI

> Voice نه جایگزین UI بلکه **مکمل**. برای سناریوهای hand-busy / stress / accessibility.

---

## ۱. سناریوهای اولویت‌دار

| سناریو | اپ | کاربرد |
|--------|-----|--------|
| FNOL در حین رانندگی (pulled over) | Customer Mobile | voice-to-text برای توضیحات |
| جستجوی سریع | همه | "جستجوی بیمه‌نامه ۱۲۳" |
| Agent: input سریع | Agent Portal | "مشتری: علی محمدی، کد ملی ۰۰۱۱" |
| Accessibility | همه | کاربران بصری‌ناتوان |

---

## ۲. فناوری

### Client-side
- **Web Speech API** (رایگان، محدود در Safari)
  ```js
  const rec = new SpeechRecognition();
  rec.lang = 'fa-IR';
  rec.continuous = false;
  rec.interimResults = true;
  ```
- Fallback: **Google STT / Azure STT** (سرور-side) برای accuracy بالاتر

### Server-side (ترجیح‌داده برای دقت فارسی)
- gRPC/REST به STT service
- Streaming برای latency کم
- Redact PII قبل از log

---

## ۳. UX Guidelines

### Activation
- Push-to-talk (مایکروفون FAB)
- **نه** always-listening (privacy)
- Permission request با توضیح دلیل

### Feedback
- حین listening: pulsing mic با ring animated
- حین processing: spinner
- نمایش **interim transcript** به‌محض تولید (با رنگ muted)
- Final transcript با رنگ primary

### Confirmation
- بعد از تشخیص: نمایش متن + "درست است؟ [تایید] [اصلاح]"
- **هرگز** اکشن مخرب (delete, submit) فقط با voice بدون تایید

---

## ۴. Voice Commands (Dictionary)

### Customer
- "ثبت خسارت"
- "بیمه‌نامه‌های من"
- "پرداخت بعدی کی است؟"
- "تماس با کارشناس"

### Agent
- "quote جدید"
- "جستجو مشتری [نام]"
- "ذخیره و بعدی"
- "کلاس بعدی"

### Global
- "برگرد"
- "لغو"
- "کمک"

پیاده‌سازی: intent classifier روی LLM یا rule-based برای set کوچک.

---

## ۵. Voice در FNOL (ویژه)

کاربر مضطرب است → voice طبیعی‌تر از تایپ:

```
Step 5 (Description):
  [🎤 Push-to-talk]
  "بگویید چه اتفاقی افتاد"
  
User talks 30s...
  
Interim: "داشتم می‌رفتم سمت کار که یه ماشین..."
Final:   "در خیابان ولیعصر، حدود ساعت ۸ صبح، یک پراید از چپ..."

AI Summary preview: "تصادف در ولیعصر ساعت ۸ صبح با پراید"
  [ویرایش] [تایید]
```

---

## ۶. Multimodal

کاربر می‌تواند ترکیب کند:
- voice برای توضیحات + tap برای انتخاب chip
- swipe بعد از تایید voice → صفحه بعد
- typing همیشه در دسترس

---

## ۷. Privacy & Transparency

- اول استفاده: مودال "صدای شما به سرور ما ارسال می‌شود و پس از پردازش حذف می‌شود. [قبول] [فقط local]"
- Setting: turn off entirely
- On-device mode برای کاربران حساس (کیفیت پایین‌تر)
- Audio log فقط با consent + retention ۳۰ روز

---

## ۸. Accessibility

- اعلام وضعیت با `aria-live`:
  - "در حال گوش دادن"
  - "شناسایی شد: [متن]"
- جایگزین برای کاربران screen-reader که نمی‌خواهند voice استفاده کنند → textarea بزرگ

---

## ۹. Fallback

- اگر permission denied → text input
- اگر STT fail → متن خطا دوستانه + switch به تایپ
- اگر offline → disable voice button با tooltip

---

## ۱۰. Metrics

- STT accuracy (WER — Word Error Rate) روی فارسی هدف < 12%
- Voice session completion rate
- user satisfaction با voice flow vs text
- زمان صرفه‌جویی (voice vs keyboard)

---

## ۱۱. Roadmap

- **فاز ۱:** Push-to-talk در FNOL description + search
- **فاز ۲:** Voice commands در Agent Portal
- **فاز ۳:** Voice assistant جامع (مشابه Siri) با intent classification
- **فاز ۴:** Voice در IVR (تماس تلفنی → STT → route)
