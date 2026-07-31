# Claims Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: claims-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Claim Registration

### ۱.۱ عدم validation broker organization
- **اندپوینت**: `POST /claims`  
- **اشکال**: request body شامل `brokerOrganizationId`، `distributionOrganizationId`، `carrierOrganizationId` است اما هیچ validation ای بررسی نمی‌کند که آیا این سازمان‌ها قرارداد توزیع فعال دارند یا خیر. claim می‌تواند برای یک کارگزار بدون قرارداد ثبت شود.

### ۱.۲ عدم FNOL از طریق broker-portal
- **اندپوینت**: `POST /claims/fnol`  
- **اشکال**: FNOL endpoint وجود دارد اما `broker-portal-bff` هیچ اندپوینتی برای FNOL expose نمی‌کند. کارگزار نمی‌تواند به طور مستقیم FNOL ثبت کند.

### ۱.۳ عدم duplicate claim detection
- **اشکال**: هیچ مکانیزمی برای تشخیص claim تکراری (بر اساس policyId و lossDate) وجود ندارد. idempotency فقط از طریق `X-Idempotency-Key` کار می‌کند که client-driven است.

---

## ۲. Claim Lifecycle

### ۲.۱ عدم broker visibility روی claim status
- **اندپوینت**: `GET /claims/:claimId`  
- **اشکال**: claim فقط با permission `claims:view` قابل دسترسی است. هیچ تفکیکی بین دسترسی کارگزار (که باید اطلاعات محدود ببیند) و بیمه‌گر (که باید اطلاعات کامل ببیند) وجود ندارد.

### ۲.۲ عدم broker notification هنگام status change
- **اشکال**: وقتی claim از یک status به status دیگر تغییر می‌کند (مثلاً approve یا reject)، هیچ notification به کارگزار ارسال نمی‌شود. کارگزار باید از تغییرات status مطلع شود.

### ۲.۳ عدم claim assignment به broker
- **اشکال**: هیچ اندپوینتی برای assign کردن یک claim به یک کارگزار خاص وجود ندارد. `representativePartyId` در request body وجود دارد اما assignment صریح به سازمان کارگزار پشتیبانی نمی‌شود.

---

## ۳. Advocacy

### ۳.۱ عدم تفکیک advocacy case بین broker و customer
- **اندپوینت**: `POST /claims/:claimId/advocacy-cases`  
- **اشکال**: advocacy case ایجاد می‌شود اما مشخص نیست چه کسی case را باز می‌کند — کارگزار یا مشتری. در طرح کارگزاری، کارگزار به عنوان advocate مشتری عمل می‌کند و باید case را از طرف مشتری باز کند.

### ۳.۲ عدم escalation به carrier
- **اندپوینت**: `POST /advocacy-cases/:caseId/escalate`  
- **اشکال**: escalation فقط در سطح داخلی انجام می‌شود. هیچ مکانیزمی برای escalate به carrier یا نهاد رگولاتوری وجود ندارد.

### ۳.۳ عدم advocacy SLA tracking
- **اشکال**: هیچ SLA tracking روی advocacy cases وجود ندارد. طرح کارگزاری نیازمند SLA برای پاسخگویی کارگزار به مشتری در context claim است.

---

## ۴. Adjuster Referral

### ۴.۱ عدم adjuster pool management
- **اندپوینت**: `POST /claims/:claimId/adjuster-referrals`  
- **اشکال**: referral ایجاد می‌شود اما هیچ اندپوینتی برای مدیریت adjuster pool (لیست adjusterهای تایید شده با تخصص و منطقه) وجود ندارد.

### ۴.۲ عدم adjuster conflict of interest check
- **اشکال**: `CONFLICT_OF_INTEREST` error code وجود دارد اما هیچ مکانیزم proactive برای بررسی conflict of interest قبل از assign کردن adjuster وجود ندارد.

---

## ۵. Recovery و Projection

### ۵.۱ عدم recovery از sub-agent
- **اندپوینت**: `POST /claims/:claimId/recovery` (از advocacy controller)  
- **اشکال**: recovery فقط از یک `responsiblePartyId` انجام می‌شود. در کارگزاری، recovery ممکن است نیاز به split بین چندین party (broker، sub-agent، carrier) داشته باشد.

### ۵.۲ عدم projection sync با policy-service
- **اندپوینت**: `POST /claims/:claimId/projections`  
- **اشکال**: claim projection ایجاد می‌شود اما هیچ sync با `policy-service` projections وجود ندارد. داده‌های claim باید در policy projection منعکس شوند.

---

## ۶. Documents

### ۶.۱ عدم document access control بر اساس سازمان
- **اندپوینت**: `GET /claims/:claimId/documents`  
- **اشکال**: documents با `claims:document:view` قابل دسترسی هستند اما هیچ فیلتری بر اساس organization اعمال نمی‌شود. یک کارگزار ممکن است به مستندات حساس بیمه‌گر دسترسی پیدا کند.

### ۶.۲ عدم virus scan result notification
- **اشکال**: document attach کردن response شامل `virusScanStatus` و `piiScanStatus` است اما هیچ endpoint ای برای دریافت نتیجه scan بعد از تکمیل وجود ندارد.

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ عدم دسترسی broker-portal-bff به claim operations
- **اشکال**: `broker-portal-bff` فقط `GET /broker/claims` و `GET /broker/claims/:claimId` و `POST /broker/claims/:claimId/communications` را expose می‌کند. assess، approve، reject و advocacy operations از طریق BFF قابل دسترسی نیست.

### ۷.۲ عدم sync claim status با sales-network-service
- **اشکال**: وقتی claim pay می‌شود، sales-network-service باید ledger را به‌روز کند اما هیچ مکانیزم sync وجود ندارد.

### ۷.۳ عدم استفاده customer-portal از advocacy endpoints
- **اشکال**: `customer-portal-service` فقط `GET /customer-portal/claims/:claimId/advocacy` و `POST /customer-portal/claims/:claimId/advocacy/:caseId/communications` را دارد. مشتری نمی‌تواند advocacy case جدید باز کند یا escalate کند.
