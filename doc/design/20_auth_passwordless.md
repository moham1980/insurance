# 20 — احراز هویت Passwordless + Biometric

---

## ۱. اهداف

- حذف کامل فیلد رمز عبور در Customer Portal
- Biometric (Face ID / Fingerprint) روی موبایل و device‌های پشتیبان
- Passkey (WebAuthn) روی وب
- سازگاری با backend (سند `doc/IAM_INTEGRATION_GUIDE.md`)
- OTP کمکی و بدون شکست امنیتی

---

## ۲. جریان‌ها (Flows)

### 2.1 First-time Login (Customer)
```
[ورود شماره موبایل] → [sanhab match] → [ارسال OTP SMS] →
[تایید OTP] → [ایجاد session] → [Prompt ساخت Passkey] →
[دوره بعد: FaceID/Passkey]
```

### 2.2 Returning Login
```
[مرورگر شناخته] → [WebAuthn challenge] → [FaceID/Fingerprint] → [session]
  ├─ موفق  → خانه
  └─ ناموفق → fallback OTP
```

### 2.3 Agent/Employee
- SSO (Keycloak) → MFA اجباری (OTP یا TOTP) → session
- Device trust: پس از ۳ login موفق از یک device، prompt Passkey

---

## ۳. UX Screens

### Sign-in (Customer)
- یک فیلد: موبایل (placeholder: `۰۹۱۲ xxx xxxx`)
- **Button:** «ادامه» (primary, full-width روی موبایل)
- زیر دکمه: «ورود با Passkey» (اگر قبلاً ساخته)
- لینک کوچک: «ورود با کد ملی (برای نمایندگان قانونی)»

### OTP Screen
- فیلد ۵ رقمی با auto-focus و **auto-read SMS** (Web OTP API)
- Timer resend (۶۰ ثانیه)
- «تغییر شماره» لینک

### Passkey Onboarding
- پس از اولین login موفق: bottom-sheet
- «ورود سریع‌تر دفعه بعد؟» → دکمه «فعال کردن FaceID/اثر انگشت»
- امکان رد کردن → یادآوری بعد از ۳ login

---

## ۴. پیاده‌سازی فنی

### WebAuthn
```ts
// Client
const publicKey = await fetch('/api/auth/webauthn/register-options').then(r => r.json());
const credential = await navigator.credentials.create({ publicKey });
await fetch('/api/auth/webauthn/register', {
  method: 'POST',
  body: JSON.stringify(credential)
});
```

### Libraries
- `@simplewebauthn/browser` + `@simplewebauthn/server`
- `next-auth` یا `auth.js` به‌عنوان wrapper
- backend: IAM service موجود + یک جدول `user_credentials`

### Web OTP API (SMS auto-read)
```html
<input type="text" autocomplete="one-time-code" inputmode="numeric">
```
+ SMS باید با متن ویژه (پایان: `@domain.ir #OTP`) ارسال شود.

---

## ۵. امنیت

- Rate limit: ۵ OTP / ۱۵ دقیقه / IP + شماره
- Account lockout بعد از ۱۰ تلاش ناموفق (۳۰ دقیقه)
- Session: JWT + refresh token (HttpOnly + SameSite=Lax + Secure)
- Anomaly detection (تغییر ناگهانی IP/device)
- Logout روی همه device‌ها در تغییر passkey

---

## ۶. Fallback Matrix

| سناریو | Fallback |
|--------|----------|
| Passkey ناموفق | OTP SMS |
| SMS نرسید | صدای IVR (call me) |
| Biometric در iOS Safari (private) | OTP |
| Screen-reader کاربر | OTP با announcement واضح |
| Device بدون biometric | Passkey with PIN |

---

## ۷. Consent & Privacy

- Screen وقتی biometric ذخیره می‌شود: «اثر بیومتریک روی دستگاه شما می‌ماند و برای ما ارسال نمی‌شود»
- لینک حذف passkey در `/profile/security`
- Audit log هر ساخت/حذف credential

---

## ۸. Accessibility Considerations

- Label‌های واضح («ورود با اثر انگشت»)
- `aria-live` برای پیام موفقیت/شکست
- امکان ورود با کیبورد (Tab → Enter)
- OTP input هر کاراکتر یک `<input>` نیست؛ یک input با `maxlength=5` → بهتر با screen-reader

---

## ۹. Metrics

- نرخ موفقیت login
- زمان تا login (هدف: < 4s)
- نرخ adoption Passkey (هدف: ۴۰٪ در ۶ ماه)
- نرخ fallback به OTP
- نرخ failure → root-cause
