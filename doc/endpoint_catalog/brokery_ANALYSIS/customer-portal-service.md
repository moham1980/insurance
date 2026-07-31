# Customer Portal Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: customer-portal-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. احراز هویت OTP

### ۱.۱ عدم rate limiting روی OTP
- **اندپوینت**: `POST /customer-portal/otp/initiate`  
- **اشکال**: این اندپوینت public است و هیچ rate limiting ای در مستندات ذکر نشده است. یک مهاجم می‌تواند به طور نامحدود OTP request ارسال کند و باعث SMS bombing شود.

### ۱.۲ عدم OTP attempt limit
- **اندپوینت**: `POST /customer-portal/otp/verify`  
- **اشکال**: هیچ محدودیتی برای تعداد تلاش اشتباه OTP ذکر نشده است. یک مهاجم می‌تواند به طور نامحدود OTPهای مختلف را امتحان کند.

### ۱.۳ عدم session security
- **اندپوینت**: `GET /customer-portal/session/:sessionId`، `POST /customer-portal/session/:sessionId/revoke`  
- **اشکال**: session endpoints public هستند. هر کسی با sessionId می‌تواند اطلاعات session را ببیند یا revoke کند. این یک خطر امنیتی حیاتی است.

---

## ۲. Policy Operations

### ۲.۱ عدم فیلتر بر اساس broker
- **اندپوینت**: `GET /customer-portal/policies`  
- **اشکال**: policies لیست می‌شوند اما هیچ فیلتری بر اساس `brokerOrganizationId` وجود ندارد. مشتری نباید ببیند چه کارگزاری بیمه‌نامه را صادر کرده است اگر قرارداد محرمانه است.

### ۲.۲ عدم endorsement با broker approval
- **اندپوینت**: `POST /customer-portal/policies/:policyId/endorsement`  
- **اشکال**: مشتری endorsement request ایجاد می‌کند اما هیچ مکانیزمی برای broker approval وجود ندارد. endorsement باید توسط کارگزار تایید شود قبل از اعمال.

### ۲.۳ عدم renewal quote comparison
- **اندپوینت**: `POST /customer-portal/policies/:policyId/renewal`  
- **اشکال**: renewal request ایجاد می‌شود اما هیچ مکانیزمی برای مقایسه quoteهای renewal از carrierهای مختلف وجود ندارد.

---

## ۳. Claim Operations

### ۳.۱ عدم FNOL با broker context
- **اندپوینت**: `POST /customer-portal/claims/fnol`  
- **اشکال**: FNOL توسط مشتری ثبت می‌شود اما هیچ `brokerOrganizationId` در request وجود ندارد. claim باید به کارگزار مربوطه assign شود.

### ۳.۲ عدم claim status real-time
- **اندپوینت**: `GET /customer-portal/claims/:claimId/status`  
- **اشکال**: status claim برگردانده می‌شود اما مشخص نیست این داده real-time است یا cached.

### ۳.۳ عدم claim document download
- **اندپوینت**: `POST /customer-portal/claims/:claimId/documents`  
- **اشکال**: document upload پشتیبانی می‌شود اما هیچ اندپوینتی برای download یا view documents وجود ندارد.

---

## ۴. Payment و Complaint

### ۴.۱ عدم payment initiation
- **اندپوینت**: `GET /customer-portal/payments`  
- **اشکال**: فقط لیست payments پشتیبانی می‌شود. مشتری نمی‌تواند payment جدید initiate کند یا installment پرداخت کند.

### ۴.۲ عدم complaint creation
- **اندپوینت**: `GET /customer-portal/complaints`  
- **اشکال**: فقط لیست complaints پشتیبانی می‌شود. مشتری نمی‌تواند complaint جدید ثبت کند.

### ۴.۳ عدم complaint tracking
- **اشکال**: هیچ اندپوینتی برای tracking status complaint یا add response به complaint وجود ندارد.

---

## ۵. Advocacy

### ۵.۱ عدم advocacy case creation
- **اندپوینت**: `GET /customer-portal/claims/:claimId/advocacy`  
- **اشکال**: فقط مشاهده advocacy پشتیبانی می‌شود. مشتری نمی‌تواند advocacy case جدید باز کند.

### ۵.۲ عدم communication با adjuster
- **اندپوینت**: `POST /customer-portal/claims/:claimId/advocacy/:caseId/communications`  
- **اشکال**: communication اضافه می‌شود اما فقط با advocacy case است. هیچ مسیری برای ارتباط مستقیم با adjuster وجود ندارد.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم یکپارچه‌سازی با broker-portal
- **اشکال**: وقتی مشتری FNOL ثبت می‌کند، `broker-portal-bff` باید مطلع شود اما هیچ مکانیزم notification وجود ندارد.

### ۶.۲ عدم نمایش broker information
- **اشکال**: `customer-portal-service` هیچ اندپوینتی برای نمایش اطلاعات کارگزار مشتری (نام، تماس، آدرس) ندارد. مشتری باید بداند کارگزار خود کیست.

### ۶.۳ عدم product offering display
- **اشکال**: `product-service` اندپوینت `GET /api/v1/customers/offerings` دارد اما `customer-portal-service` آن را expose نمی‌کند. مشتری نمی‌تواند محصولات قابل ارائه توسط کارگزار خود را ببیند.

### ۶.۴ عدم sync با collections-service
- **اشکال**: مشتری فقط لیست payments را می‌بیند اما جزئیات installment، due dates و late fees از `collections-service` قابل دسترسی نیست.
