# Policy Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: policy-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Quote و Issue

### ۱.۱ عدم ارتباط Quote با Submission/Placement
- **اندپوینت**: `POST /policies/quote`  
- **اشکال**: quote مستقل از submission ایجاد می‌شود. `request body` شامل `productId`، `partyId`، `coverages`، `deductibles` است اما هیچ `submissionId` یا `placementId` وجود ندارد. در طرح کارگزاری، quote باید در context یک submission و placement باشد. این باعث می‌شود policy-service و submission-placement-service به صورت جداگانه عمل کنند و هماهنگی از دست برود.

### ۱.۲ عدم فیلتر بر اساس broker organization
- **اندپوینت**: `GET /policies` (list)  
- **اشکال**: لیست بیمه‌نامه‌ها فیلتر بر اساس `brokerOrganizationId` یا `distributionOrganizationId` را پشتیبانی نمی‌کند. یک کارگزار فقط باید بیمه‌نامه‌های خود را ببیند.

### ۱.۳ عدم validation قرارداد توزیع هنگام issue
- **اندپوینت**: `POST /policies/:policyId/issue`  
- **اشکال**: هنگام صدور بیمه‌نامه، هیچ validation ای بررسی نمی‌کند که آیا قرارداد توزیع بین کارگزار و بیمه‌گر فعال است یا خیر. بیمه‌نامه می‌تواند بدون قرارداد فعال صادر شود.

---

## ۲. Sanhab Integration

### ۲.۱ تکرار با regulatory-gateway-service
- **اندپوینت**: `POST /policies/:policyId/sanhab/inquiry`، `POST /policies/sanhab/sms-inquiry`  
- **اشکال**: policy-service اندپوینت‌های Sanhab inquiry مستقل دارد در حالی که `regulatory-gateway-service` نیز اندپوینت‌های مشابه (`/reg/sanhab/inquiry`، `/reg/sanhab/sms/initiate`) دارد. این تکرار باعث می‌شود دو مسیر مختلف برای همان عملیات وجود داشته باشد که می‌تواند به ناهماهنگی داده منجر شود.

### ۲.۲ عدم استفاده از regulatory-gateway-service
- **اشکال**: policy-service به جای استفاده از regulatory-gateway-service به عنوان gateway مرکزی، مستقیماً با Sanhab ارتباط برقرار می‌کند. این برخلاف معماری طراحی شده است که regulatory-gateway-service به عنوان single point of integration با Sanhab عمل کند.

---

## ۳. Endorsement و Renewal

### ۳.۱ عدم endorsement کارگزاری
- **اندپوینت**: `POST /policies/:policyId/endorse`  
- **اشکال**: endorsement فقط شامل تغییرات بیمه‌نامه است. هیچ اندپوینتی برای endorsement تغییر کارگزار (broker change) وجود ندارد. در عملیات کارگزاری، انتقال بیمه‌نامه از یک کارگزار به کارگزار دیگر یک عملیات رایج است.

### ۳.۲ عدم renewal با commission update
- **اندپوینت**: `POST /policies/:policyId/renew`  
- **اشکال**: renewal بیمه‌نامه را تمدید می‌کند اما هیچ مکانیزمی برای update commission rate در زمان renewal وجود ندارد. اگر قرارداد توزیع تغییر کرده باشد، commission باید در renewal به‌روز شود.

### ۳.۳ عدم auto-renewal با consent کارگزار
- **اندپوینت**: `POST /policies/:policyId/auto-renew`  
- **اشکال**: auto-renewal بدون اعمال consent یا notification کارگزار انجام می‌شود. کارگزار باید از auto-renewal مطلع شود و بتواند آن را reject کند.

---

## ۴. P3 Policy Controller

### ۴.۱ عدم تفکیک دسترسی broker vs insurer
- **اندپوینت**: `GET /api/v1/p3/policies/:policyId`  
- **اشکال**: P3 policy endpoints از همان permission `policy:view` استفاده می‌کنند. هیچ تفکیکی بین دسترسی کارگزار (که باید داده محدود ببیند) و بیمه‌گر (که باید داده کامل ببیند) وجود ندارد.

### ۴.۲ عدم patch با field-level ACL
- **اندپوینت**: `PATCH /api/v1/p3/policies/:policyId`  
- **اشکال**: patch تمام فیلدها را اجازه می‌دهد. طرح کارگزاری نیازمند field-level ACL است که کارگزار فقط بتواند فیلدهای مجاز را تغییر دهد.

---

## ۵. Projection و Unique Code

### ۵.۱ عدم projection از carrier به broker
- **اندپوینت**: `POST /api/v1/policies/projections`  
- **اشکال**: projection برای ثبت policy از سیستم خارجی است اما هیچ مکانیزمی برای projection از carrier به broker وجود ندارد. در فدراسیون، بیمه‌گر باید policy را به broker projection کند.

### ۵.۲ عدم گزارش unique code به کارگزار
- **اندپوینت**: `GET /api/v1/reports/policies-without-unique-code`  
- **اشکال**: این گزارش فقط در سطح tenant قابل دسترسی است. کارگزار باید بتواند بیمه‌نامه‌های خود بدون unique code را ببیند اما فیلتر organization پشتیبانی نمی‌شود.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم دسترسی broker-portal-bff به policy endpoints
- **اشکال**: `broker-portal-bff` هیچ endpoint برای دسترسی به policy details یا endorsement ندارد. کارگزار از طریق BFF نمی‌تواند جزئیات بیمه‌نامه را ببیند یا endorsement درخواست دهد.

### ۶.۲ عدم sync policy status با sales-network-service
- **اشکال**: وقتی بیمه‌نامه صادر، cancel یا lapse می‌شود، sales-network-service باید به طور خودکار ledger و commission را به‌روز کند اما هیچ مکانیزم sync وجود ندارد.

### ۶.۳ عدم notification به customer-portal
- **اشکال**: وقتی بیمه‌نامه issue یا endorse می‌شود، `customer-portal-service` باید مطلع شود اما هیچ event یا notification ای ارسال نمی‌شود.
