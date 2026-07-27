# Customer Portal UI

پرتال مشتری بیمه - یک رابط کاربری مدرن با پشتیبانی از RTL و طراحی mobile-first.

## ویژگی‌ها

- **احراز هویت OTP**: ورود امن با کد یکبار مصرف ارسال شده به موبایل
- **داشبورد جامع**: مشاهده بیمه‌نامه‌ها، خسارات، پرداخت‌ها و شکایات
- **ثبت گزارش خسارت (FNOL)**: فرم کامل برای ثبت گزارش خسارت با آپلود مستندات
- **طراحی RTL**: پشتیبانی کامل از زبان فارسی و راست‌چین
- **Mobile-first**: طراحی ریسپانسیو بهینه برای موبایل و دسکتاپ
- **پشتیبانی از تم Dark**: قابلیت تغییر تم

## پیش‌نیازها

- Node.js 18 یا بالاتر
- npm یا yarn

## نصب و اجرا

1. **نصب وابستگی‌ها**:
```bash
npm install
```

2. **تنظیم متغیرهای محیطی**:
```bash
cp .env.example .env.local
```

فایل `.env.local` را ویرایش کرده و API Gateway URL را تنظیم کنید:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. **اجرای در حالت توسعه**:
```bash
npm run dev
```

4. **ساخت برای تولید**:
```bash
npm run build
npm start
```

## ساختار پروژه

```
src/
├── app/
│   ├── dashboard/     # داشبورد با تب‌های مختلف
│   ├── fnol/          # فرم ثبت گزارش خسارت
│   ├── globals.css    # استایل‌های جهانی
│   ├── layout.tsx     # لایوت اصلی با RTL
│   └── page.tsx       # صفحه ورود با OTP
└── lib/
    └── api.ts         # کلاینت API
```

## API Integration

این UI با سرویس `customer-portal-service` از طریق API Gateway ارتباط برقرار می‌کند:

- `/portal/otp/initiate` - درخواست ارسال کد OTP
- `/portal/otp/verify` - تأیید کد OTP و دریافت JWT
- `/portal/session` - دریافت اطلاعات جلسه
- `/portal/policies` - لیست بیمه‌نامه‌ها
- `/portal/claims` - لیست خسارات
- `/portal/payments` - لیست پرداخت‌ها
- `/portal/complaints` - لیست شکایات
- `/portal/fnol` - ثبت گزارش خسارت

## تکنولوژی‌های استفاده شده

- **Next.js 14**: فریمورک React با App Router
- **TypeScript**: نوع‌دهی ایستا
- **Tailwind CSS**: استایل‌دهی utility-first
- **Axios**: کلاینت HTTP
- **Lucide React**: آیکون‌ها
- **React Hook Form**: مدیریت فرم‌ها

## لایسنس

© ۱۴۰۵ شرکت بیمه - تمامی حقوق محفوظ است
