# Payments Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: payments-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Payment Lifecycle

### ۱.۱ عدم ارتباط با policy یا claim
- **اندپوینت**: `POST /payments/prepare`  
- **اشکال**: request body شامل `claimId` است اما هیچ `policyId` یا `brokerOrganizationId` وجود ندارد. payment فقط به claim متصل است. در کارگزاری، payment می‌تواند برای premium، commission settlement یا refund باشد.

### ۱.۲ عدم broker context
- **اشکال**: هیچ فیلدی برای `brokerOrganizationId` یا `carrierOrganizationId` در payment request وجود ندارد. payment نمی‌تواند به یک کارگزار خاص نسبت داده شود.

### ۱.۳ عدم payment type区分
- **اشکال**: payment type شامل `transfer`، `card_to_card`، `bill_payment` است اما `commission_settlement`، `premium_payment`، `refund` وجود ندارند. در کارگزاری، نوع payment باید تفکیک شود.

---

## ۲. Gateway Integration

### ۲.۱ عدم multi-gateway support
- **اندپوینت**: `POST /payments/:paymentIntentId/gateway/initiate`  
- **اشکال**: فقط یک gateway initiate می‌شود. در کارگزاری، ممکن است نیاز به routing به gatewayهای مختلف (بانک‌های مختلف) باشد.

### ۲.۲ عدم gateway callback با broker context
- **اندپوینت**: `POST /payments/gateway/callback`  
- **اشکال**: callback پرداخت را به‌روز می‌کند اما هیچ notification به کارگزار ارسال نمی‌شود. کارگزار باید از وضعیت پرداخت مطلع شود.

---

## ۳. Reconciliation و Dispute

### ۳.۱ عدم reconciliation با billing-service
- **اندپوینت**: `POST /payments/reconcile`  
- **اشکال**: reconciliation در payments-service مستقل از `billing-service` انجام می‌شود. billing-service نیز reconciliation خود را دارد. این دو باید هماهنگ باشند.

### ۳.۲ عدم dispute escalation
- **اندپوینت**: `POST /payments/:paymentId/dispute`  
- **اشکال**: dispute ایجاد می‌شود اما هیچ مکانیزم escalation به carrier یا نهاد بالاتر وجود ندارد.

### ۳.۳ عدم dispute resolution endpoint
- **اشکال**: dispute status شامل `open`، `under_review`، `resolved`، `closed` است اما هیچ اندپوینتی برای resolve یا close کردن dispute وجود ندارد.

---

## ۴. Refund

### ۴.۱ عدم refund به broker
- **اندپوینت**: `POST /payments/:paymentId/refund`  
- **اشکال**: refund به payment intent انجام می‌شود اما هیچ مکانیزمی برای refund به حساب کارگزار (در صورت لغو بیمه‌نامه توسط مشتری) وجود ندارد.

### ۴.۲ عدم partial refund
- **اشکال**: refund فقط به صورت کامل انجام می‌شود. در کارگزاری، partial refund (مثلاً در صورت cancellation mid-term) رایج است.

---

## ۵. ذینفعان و مصرف‌کنندگان

### ۵.۱ عدم دسترسی broker-portal-bff به payments
- **اشکال**: `broker-portal-bff` هیچ اندپوینتی برای payments expose نمی‌کند. کارگزار نمی‌تواند وضعیت پرداخت‌های مربوط به خود را ببیند.

### ۵.۲ تکرار با billing-service
- **اشکال**: `billing-service` اندپوینت‌های payment gateway مستقل دارد (`/billing/payments/initiate`، `/billing/payments/verify`). payments-service نیز gateway integration مستقل دارد. این تکرار باعث می‌شود دو مسیر پرداخت مختلف وجود داشته باشد و reconciliation پیچیده شود.

### ۵.۳ عدم دسترسی customer-portal به payment details
- **اشکال**: `customer-portal-service` فقط `GET /customer-portal/payments` را دارد که لیست پرداخت‌ها را نشان می‌دهد. هیچ جزئیات payment intent یا gateway status قابل دسترسی نیست.

### ۵.۴ عدم sync با collections-service
- **اشکال**: `collections-service` gateway payment مستقل دارد (`/collections/installments/:installmentId/gateway/initiate`). payments-service نیز gateway دارد. این تکرار باعث می‌شود دو مسیر مختلف برای همان عملیات وجود داشته باشد.
