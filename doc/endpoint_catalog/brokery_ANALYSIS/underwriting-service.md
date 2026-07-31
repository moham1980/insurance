# Underwriting Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: underwriting-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Underwriting Request

### ۱.۱ عدم ارتباط با placement
- **اندپوینت**: `POST /underwriting/requests`  
- **اشکال**: underwriting request با `policyId` ایجاد می‌شود اما هیچ `placementId` یا `submissionId` وجود ندارد. در طرح کارگزاری، underwriting باید در context یک placement انجام شود. این باعث می‌شود underwriting مستقل از فرآیند کارگزاری عمل کند.

### ۱.۲ عدم broker context در request
- **اشکال**: request body شامل `policyId`، `reasonCode`، `input`، `dueDate` است اما هیچ `brokerOrganizationId` یا `carrierOrganizationId` وجود ندارد. underwriting نمی‌تواند به یک کارگزار خاص نسبت داده شود.

### ۱.۳ عدم فیلتر لیست بر اساس سازمان
- **اندپوینت**: `GET /underwriting/requests`  
- **اشکال**: فیلتر فقط `status` و `policyId` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `brokerOrganizationId` یا `carrierOrganizationId` وجود ندارد.

---

## ۲. Decision Workflow

### ۲.۱ عدم broker notification
- **اندپوینت**: `POST /underwriting/requests/:underwritingRequestId/decide`  
- **اشکال**: وقتی decision صادر می‌شود، هیچ notification به کارگزار ارسال نمی‌شود. کارگزار باید از نتیجه underwriting مطلع شود تا بتواند به مشتری اطلاع دهد.

### ۲.۲ عدم broker appeal
- **اشکال**: هیچ اندپوینتی برای appeal underwriting decision توسط کارگزار وجود ندارد. فقط `escalate` وجود دارد که داخلی است.

### ۲.۳ عدم conditional approval
- **اشکال**: decision فقط accept یا reject است. طرح کارگزاری نیازمند conditional approval (تایید با شرط، مثل تایید با افزایش premium یا کاهش sum insured) است.

---

## ۳. SLA و Escalation

### ۳.۱ عدم SLA per carrier
- **اندپوینت**: `GET /underwriting/sla/breaches`، `GET /underwriting/sla/metrics`  
- **اشکال**: SLA در سطح کلی پایش می‌شود. هیچ SLA به ازای carrier یا به ازای broker تعریف نمی‌شود. طرح کارگزاری نیازمند SLA متفاوت به ازای هر بیمه‌گر است.

### ۳.۲ عدم escalation به carrier
- **اندپوینت**: `POST /underwriting/requests/:underwritingRequestId/escalate`  
- **اشکال**: escalation فقط داخلی است. هیچ مکانیزمی برای escalate به carrier یا نهاد بالاتر وجود ندارد.

---

## ۴. Risk Assessment و Appetite Matrix

### ۴.۱ عدم risk assessment با broker data
- **اندپوینت**: `POST /underwriting/requests/:id/assess-risk`  
- **اشکال**: risk assessment بر اساس `policyId` انجام می‌شود اما داده‌های کارگزاری (تاریخچه claims کارگزار، loss ratio، volume) در risk assessment لحاظ نمی‌شود.

### ۴.۲ عدم appetite matrix per broker
- **اندپوینت**: `POST /underwriting/appetite-rules/evaluate`  
- **اشکال**: appetite rules بر اساس `lineOfBusiness`، `productId`، `riskLevel`، `sumInsured`، `premium` ارزیابی می‌شوند. هیچ فاکتور کارگزاری (broker rating، broker volume) در appetite matrix وجود ندارد.

### ۴.۳ عدم versioning appetite rules
- **اشکال**: appetite rules به صورت یکی‌یکی ایجاد و update می‌شوند اما هیچ versioning ای وجود ندارد. تغییر یک rule باید با حفظ تاریخچه و rollback capability انجام شود.

---

## ۵. احراز هویت و امنیت

### ۵.۱ استفاده از EcosystemJwtGuard به جای JwtAuthGuard
- **اشکال**: underwriting-service از `EcosystemJwtGuard` استفاده می‌کند در حالی که سایر سرویس‌های کارگزاری از `JwtAuthGuard` استفاده می‌کنند. این عدم یکپارچگی می‌تواند باعث مشکلات token validation شود.

### ۵.۲ عدم AbacGuard
- **اشکال**: underwriting-service از `AbacGuard` استفاده نمی‌کند در حالی که اکثر سرویس‌های دیگر آن را دارند. این باعث می‌شود attribute-based access control اعمال نشود.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم دسترسی broker-portal-bff به underwriting
- **اشکال**: `broker-portal-bff` هیچ اندپوینتی برای underwriting expose نمی‌کند. کارگزار نمی‌تواند وضعیت underwriting را ببیند.

### ۶.۲ عدم یکپارچه‌سازی با policy-service
- **اشکال**: `policy-service` اندپوینت `POST /policies/:policyId/underwriting/decision` دارد که مستقل از underwriting-service عمل می‌کند. این تکرار باعث می‌شود دو مسیر مختلف برای underwriting decision وجود داشته باشد.

### ۶.۳ عدم sync با reporting-service
- **اشکال**: `reporting-service` اندپوینت `GET /reporting/underwriting-requests` دارد که مستقل از underwriting-service عمل می‌کند. داده‌ها باید از یک منبع واحد گزارش‌گیری شوند.
