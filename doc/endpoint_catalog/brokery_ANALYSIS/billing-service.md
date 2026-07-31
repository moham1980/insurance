# Billing Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: billing-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Brokerage Settlement

### ۱.۱ عدم SoD بین calculate و approve
- **اندپوینت**: `POST /brokerage/commissions/calculate`، `POST /brokerage/settlements/batches/:batchId/approve`  
- **اشکال**: هر دو عملیات از `billing:settlements:manage` استفاده می‌کنند. هیچ SoD ای بین کاربری که commission calculate می‌کند و کاربری که settlement approve می‌کند اعمال نمی‌شود. این یک کنترل حیاتی مالی است.

### ۱.۲ عدم settlement به چند حساب بانکی
- **اندپوینت**: `POST /brokerage/settlements/batches/:batchId/confirm`  
- **اشکال**: settlement به یک حساب بانکی انجام می‌شود. در کارگزاری، یک settlement batch ممکن است نیاز به پرداخت به چند کارگزار با حساب‌های بانکی مختلف داشته باشد.

### ۱.۳ عدم partial settlement
- **اشکال**: settlement batch فقط به صورت کامل confirm و pay می‌شود. هیچ مکانیزمی برای partial settlement (پرداخت بخشی از batch) وجود ندارد.

---

## ۲. Commission

### ۲.۱ عدم commission split بین سطوح سلسله‌مراتبی
- **اندپوینت**: `POST /brokerage/commissions/calculate`  
- **اشکال**: commission فقط به یک policy و یک broker تعلق می‌گیرد. هیچ مکانیزمی برای split commission بین broker و sub-agent و marketer وجود ندارد.

### ۲.۲ عدم commission reconciliation با sales-network-service
- **اشکال**: commission در billing-service محاسبه و post می‌شود اما هیچ sync با ledger `sales-network-service` وجود ندارد. این می‌تواند باعث مغایرت بین دو سرویس شود.

### ۲.۳ عدم commission adjustment
- **اشکال**: هیچ اندپوینتی برای manual commission adjustment (در صورت خطا یا توافق خاص) وجود ندارد. فقط calculate و post انجام می‌شود.

---

## ۳. Escrow

### ۳.۱ عدم escrow برای multi-carrier
- **اندپوینت**: `GET /brokerage/escrow/holdings`  
- **اشکال**: escrow holdings فقط در سطح tenant قابل query هستند. در کارگزاری چند‌بیمه‌گری، escrow باید به ازای هر carrier جداگانه مدیریت شود.

### ۳.۲ عدم auto-release با conditions
- **اندپوینت**: `POST /brokerage/escrow/auto-release`  
- **اشکال**: auto-release بدون تعریف conditions قابل تنظیم انجام می‌شود. باید بتوان conditions (مثل تایید بیمه‌گر، گذشت زمان خاص، یا صدور بیمه‌نامه) تعریف کرد.

### ۳.۳ عدم escrow interest calculation
- **اشکال**: هیچ مکانیزمی برای محاسبه بهره روی escrow holdings وجود ندارد که در برخی قراردادهای کارگزاری الزامی است.

---

## ۴. Refunds و Clawbacks

### ۴.۱ عدم clawback از sub-agent
- **اندپوینت**: `POST /brokerage/clawbacks/apply`  
- **اشکال**: clawback فقط در سطح policy اعمال می‌شود. اگر کمیسیون به sub-agent نیز پرداخت شده باشد، clawback باید به صورت سلسله‌مراتبی از تمام ذینفعان بازپس گرفته شود اما این پشتیبانی نمی‌شود.

### ۴.۲ عدم refund notification به customer
- **اشکال**: وقتی refund ایجاد و send می‌شود، هیچ notification به `customer-portal-service` ارسال نمی‌شود. مشتری باید از وضعیت refund مطلع شود.

### ۴.۳ عدم clawback time limit
- **اشکال**: هیچ محدودیت زمانی برای clawback تعریف نشده است. باید یک time window (مثلاً ۹۰ روز از صدور) برای clawback وجود داشته باشد.

---

## ۵. Reports

### ۵.۱ عدم گزارش کارگزاری به تفکیک کارگزار
- **اندپوینت**: `GET /reports/collections`، `GET /reports/settlements`  
- **اشکال**: گزارش‌ها فیلتر `organizationId` را پشتیبانی می‌کنند اما این فیلد اختیاری است و هیچ enforcement ای وجود ندارد. یک کارگزار باید فقط گزارش‌های خود را ببیند.

### ۵.۲ عدم گزارش commission aging
- **اشکال**: هیچ گزارشی برای commission aging (کمیسیون‌های معوق و مدت زمان معوقی) وجود ندارد.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم دسترسی broker-portal-bff به settlement details
- **اشکال**: `broker-portal-bff` فقط `GET /broker/commissions` را expose می‌کند اما settlement batch details، escrow holdings و refund status از طریق BFF قابل دسترسی نیست.

### ۶.۲ عدم یکپارچه‌سازی با payments-service
- **اشکال**: billing-service payment gateway مستقل دارد (`/billing/payments/initiate`) در حالی که `payments-service` نیز payment lifecycle مستقل دارد. این تکرار باعث می‌شود دو مسیر پرداخت مختلف وجود داشته باشد.

### ۶.۳ عدم sync با reporting-service
- **اشکال**: billing-service گزارش‌های مستقل دارد اما `reporting-service` نیز اندپوینت‌های payments listing دارد. داده‌ها باید از یک منبع واحد گزارش‌گیری شوند.
