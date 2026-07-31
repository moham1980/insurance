# Reporting Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: reporting-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. KPI و Governance

### ۱.۱ عدم KPI کارگزاری اختصاصی
- **اندپوینت**: `GET /reporting/kpis/ready`، `GET /reporting/kpis/financial`  
- **اشکال**: KPI‌های مالی شامل `totalPremium`، `totalClaims`، `lossRatio`، `combinedRatio` است اما KPI‌های حیاتی کارگزاری مانند broker persistency rate، broker retention rate، commission-to-premium ratio، broker loss ratio وجود ندارند.

### ۱.۲ عدم KPI به تفکیک کارگزار
- **اشکال**: KPI‌ها در سطح tenant گزارش می‌شوند. هیچ فیلتری بر اساس `brokerOrganizationId` یا `agentId` وجود ندارد. یک کارگزار باید KPI‌های خود را به صورت ایزوله ببیند.

### ۱.۳ عدم governance policy برای KPI کارگزاری
- **اندپوینت**: `GET /reporting/kpis/governance`  
- **اشکال**: governance policies فقط برای `customer_satisfaction_rate`، `financial_solvency_ratio`، `market_share_percent` تعریف شده‌اند. هیچ governance policy برای KPI‌های کارگزاری وجود ندارد.

---

## ۲. Dashboard

### ۲.۱ عدم broker dashboard
- **اندپوینت**: `GET /reporting/dashboard/executive`  
- **اشکال**: فقط executive dashboard وجود دارد. هیچ broker-specific dashboard ای برای نمایش عملکرد کارگزار (policies، claims، commissions، persistency) وجود ندارد.

### ۲.۲ عدم real-time dashboard
- **اشکال**: dashboard از snapshot data تغذیه می‌شود. هیچ real-time یا near-real-time dashboard ای وجود ندارد.

---

## ۳. Policy و Payment Reporting

### ۳.۱ عدم فیلتر بر اساس سازمان
- **اندپوینت**: `GET /reporting/policies`، `GET /reporting/payments`  
- **اشکال**: هیچ فیلتری بر اساس `brokerOrganizationId` یا `carrierOrganizationId` پشتیبانی نمی‌شود. یک کارگزار باید فقط policies و payments مربوط به خود را ببیند.

### ۳.۲ عدم گزارش commission
- **اشکال**: هیچ اندپوینتی برای گزارش commission به تفکیک کارگزار وجود ندارد. billing-service گزارش settlements دارد اما reporting-service آن را پوشش نمی‌دهد.

### ۳.۳ تکرار با billing-service reports
- **اشکال**: billing-service اندپوینت‌های `GET /reports/collections`، `GET /reports/settlements`، `GET /reports/outstanding-invoices` دارد. reporting-service نیز payments listing دارد. این تکرار باعث می‌شود دو منبع داده مختلف برای گزارش‌گیری وجود داشته باشد.

---

## ۴. Sales Partner و AML

### ۴.۱ عدم sales partner performance report
- **اندپوینت**: `GET /reporting/sales-partners`  
- **اشکال**: فقط لیست و detail sales partner قابل دسترسی است. هیچ performance report (production volume، persistency، loss ratio per partner) وجود ندارد.

### ۴.۲ عدم AML report به تفکیک کارگزار
- **اندپوینت**: `GET /reporting/aml-transactions`  
- **اشکال**: AML transactions لیست می‌شوند اما هیچ فیلتری بر اساس `brokerOrganizationId` وجود ندارد. در کارگزاری، AML monitoring باید به ازای هر کارگزار جداگانه انجام شود.

---

## ۵. External System

### ۵.۱ عدم external system برای broker reporting
- **اندپوینت**: `POST /reporting/external-systems`  
- **اشکال**: external system connections پشتیبانی می‌شوند اما هیچ predefined connector برای ارسال گزارش به کارگزاران (مثل API یا scheduled email) وجود ندارد.

### ۵.۲ عدم data export با access control
- **اشکال**: sync to external system انجام می‌شود اما هیچ access control ای برای محدود کردن داده‌های قابل export به ازای هر external system وجود ندارد.

---

## ۶. Underwriting و Claims Reporting

### ۶.۱ عدم underwriting report به تفکیک کارگزار
- **اندپوینت**: `GET /reporting/underwriting-requests`  
- **اشکال**: هیچ فیلتری بر اساس `brokerOrganizationId` وجود ندارد.

### ۶.۲ عدم claims report به تفکیک کارگزار
- **اندپوینت**: `GET /reporting/claims/payments`  
- **اشکال**: claims payments لیست می‌شوند اما هیچ فیلتری بر اساس `brokerOrganizationId` وجود ندارد. کارگزار باید بتواند claims payments مربوط به خود را ببیند.

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ عدم دسترسی broker-portal-bff به reporting
- **اشکال**: `broker-portal-bff` فقط `GET /broker/reports/broker-transactions` را expose می‌کند. دسترسی به KPI‌ها، dashboard و سایر گزارش‌ها از طریق BFF ممکن نیست.

### ۷.۲ عدم AbacGuard
- **اشکال**: reporting-service از `AbacGuard` استفاده نمی‌کند (فقط `JwtAuthGuard`، `TenantGuard`، `PermissionsGuard`). این باعث می‌شود attribute-based access control اعمال نشود و یک کاربر بتواند داده‌های خارج از scope خود را ببیند.

### ۷.۳ عدم یکپارچه‌سازی با sales-network-service KPI
- **اشکال**: sales-network-service KPIهای مستقل دارد (`GET /partners/:partnerId/kpis`) و reporting-service نیز KPI مستقل دارد. این دو باید هماهنگ شوند.
