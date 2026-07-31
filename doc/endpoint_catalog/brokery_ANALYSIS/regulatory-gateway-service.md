# Regulatory Gateway Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: regulatory-gateway-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Broker License Validation

### ۱.۱ عدم validation با متادیتای کامل
- **اندپوینت**: `POST /reg/broker-license/validate`  
- **اشکال**: این اندپوینت فقط یک endpoint دارد و هیچ جزئیات request/response در کاتالوگ مستند نشده است. مشخص نیست چه فیلدهایی برای validation ارسال می‌شود (کد ملی، شماره لایسنس، نوع لایسنس) و چه response ای برمی‌گردد.

### ۱.۲ عدم batch validation
- **اشکال**: فقط validation یکی‌یکی پشتیبانی می‌شود. در عملیات کارگزاری با تعداد زیادی broker/sub-agent، نیاز به batch validation وجود دارد.

### ۱.۳ عدم webhook برای license status change
- **اشکال**: هیچ webhook endpoint ای برای دریافت تغییر وضعیت لایسنس از سنهاب به صورت push وجود ندارد. فقط pull-based inquiry پشتیبانی می‌شود.

### ۱.۴ عدم sync با auth-service
- **اشکال**: وقتی لایسنس کارگزار validate می‌شود یا تغییر وضعیت می‌دهد، هیچ sync خودکار با `auth-service` برای به‌روزرسانی وضعیت سازمان وجود ندارد.

---

## ۲. Sanhab Integration

### ۲.۱ تکرار با policy-service
- **اندپوینت**: `POST /reg/sanhab/inquiry`  
- **اشکال**: `policy-service` نیز اندپوینت‌های Sanhab inquiry مستقل دارد (`POST /policies/:policyId/sanhab/inquiry`). این تکرار باعث می‌شود دو مسیر مختلف برای همان عملیات وجود داشته باشد. regulatory-gateway-service باید single source of truth برای Sanhab باشد.

### ۲.۲ عدم webhook signature validation
- **اندپوینت**: `POST /reg/sanhab/webhook`  
- **اشکال**: این اندپوینت public است و هیچ signature validation یا IP whitelist ای در مستندات ذکر نشده است. این یک خطر امنیتی حیاتی است — هر کسی می‌تواند webhook جعلی ارسال کند.

### ۲.۳ عدم retry policy قابل پیکربندی
- **اندپوینت**: `POST /reg/sanhab/simulate`  
- **اشکال**: simulate endpoint با `regulatory:retry` permission کار می‌کند اما هیچ retry policy قابل پیکربندی (max retries، backoff strategy) وجود ندارد.

---

## ۳. Warehouse Fire Inquiry

### ۳.۱ عدم cache برای نتایج inquiry
- **اندپوینت**: `POST /reg/warehouse-fire/inquire`  
- **اشکال**: هر inquiry مستقیم به سنهاب ارسال می‌شود. هیچ caching mechanism ای برای نتایج inquiryهای قبلی وجود ندارد که باعث بار اضافی روی سنهاب و latency بالا می‌شود.

### ۳.۲ عدم inquiry history
- **اشکال**: هیچ اندپوینتی برای دریافت تاریخچه inquiryهای warehouse fire یک کارگزار یا انبار خاص وجود ندارد.

---

## ۴. SMS Inquiry

### ۴.۱ عدم SMS reply validation
- **اندپوینت**: `POST /reg/sanhab/sms/reply`  
- **اشکال**: این اندپوینت public است و هیچ validation ای روی sender phone number یا SMS content انجام نمی‌شود. هر کسی می‌تواند SMS reply جعلی ارسال کند.

### ۴.۲ عدم OTP integration
- **اشکال**: SMS inquiry از SMS provider استفاده می‌کند اما هیچ یکپارچه‌سازی با OTP service برای احراز هویت فرستنده SMS وجود ندارد.

---

## ۵. Circuit Breaker

### ۵.۱ عدم alerting
- **اندپوینت**: `GET /reg/sanhab/circuit-breaker`  
- **اشکال**: circuit breaker status قابل query است اما هیچ alerting mechanism ای برای notify کردن اپراتورها هنگام open شدن circuit وجود ندارد.

### ۵.۲ عدم circuit breaker per inquiry type
- **اشکال**: یک circuit breaker برای کل Sanhab وجود دارد. باید circuit breaker به ازای هر inquiry type (warehouse fire، SMS، broker license) جداگانه باشد.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم استفاده policy-service از regulatory-gateway
- **اشکال**: `policy-service` به جای استفاده از regulatory-gateway-service به عنوان gateway مرکزی، مستقیماً با Sanhab ارتباط برقرار می‌کند. این برخلاف معماری طراحی شده است.

### ۶.۲ عدم دسترسی broker-portal-bff به broker license
- **اشکال**: `broker-portal-bff` هیچ اندپوینتی برای بررسی وضعیت لایسنس کارگزار expose نمی‌کند. کارگزار باید بتواند وضعیت لایسنس خود را ببیند.

### ۶.۳ عدم یکپارچه‌سازی با auth-service برای license expiry
- **اشکال**: regulatory-gateway-service وضعیت لایسنس را validate می‌کند اما هیچ مکانیزمی برای notify کردن auth-service هنگام expiry یا suspension لایسنس وجود ندارد.
