# Submission-Placement Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: submission-placement-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Submission

### ۱.۱ عدم ارتباط با Product Visibility
- **اندپوینت**: `POST /api/v1/submissions`  
- **اشکال**: submission با `productId` و `productVersion` ایجاد می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا محصول برای سازمان کارگزار visible است یا خیر. یک کارگزار می‌تواند submission برای محصولی ایجاد کند که به آن دسترسی ندارد.

### ۱.۲ عدم ذخیره brokerOrganizationId
- **اشکال**: request body شامل `productId`، `lineOfBusiness`، `exposure`، `effectiveFrom`، `effectiveTo` است اما هیچ `brokerOrganizationId` یا `distributorOrganizationId` وجود ندارد. submission نمی‌تواند به یک کارگزار خاص نسبت داده شود.

### ۱.۳ عدم فیلتر لیست بر اساس سازمان
- **اندپوینت**: `GET /api/v1/submissions`  
- **اشکال**: فیلتر فقط `status` و `productId` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `brokerOrganizationId` یا `agentId` وجود ندارد. یک کارگزار نمی‌تواند submissions خود را به صورت ایزوله ببیند.

---

## ۲. RFQ و Quote Comparison

### ۲.۱ عدم ارسال خودکار به چند carrier
- **اندپوینت**: `POST /api/v1/submissions/:submissionId/quotes/request`  
- **اشکال**: RFQ به یک carrier ارسال می‌شود. طرح کارگزاری نیازمند این است که یک RFQ به طور همزمان به چند بیمه‌گر ارسال شود و quoteهای مقایسه‌ای دریافت شود. هیچ اندپوینتی برای bulk RFQ به چند carrier وجود ندارد.

### ۲.۲ عدم carrier selection criteria
- **اشکال**: در request body هیچ فیلدی برای carrier selection criteria (مثل best price، best coverage، fastest response) وجود ندارد. کارگزار باید بتواند معیارهای انتخاب را تعریف کند.

### ۲.۳ عدم quote expiry management
- **اندپوینت**: `GET /api/v1/submissions/:submissionId/quotes`  
- **اشکال**: quoteها فیلد `validUntil` دارند اما هیچ مکانیزمی برای auto-expire quoteهای منقضی شده وجود ندارد. کارگزار ممکن است quote منقضی شده را select کند.

---

## ۳. Placement

### ۳.۱ عدم validation قرارداد توزیع هنگام bind
- **اندپوینت**: `POST /api/v1/placements/:placementId/bind`  
- **اشکال**: هنگام bind، هیچ validation ای بررسی نمی‌کند که قرارداد توزیع بین کارگزار و بیمه‌گر انتخاب شده فعال است یا خیر.

### ۳.۲ عدم rollback/compensating action
- **اشکال**: طرح کارگزاری saga و compensating actions را برای placement تعریف می‌کند. اگر bind در سمت بیمه‌گر fail شود، هیچ اندپوینتی برای compensating action (مثل cancel submission یا notify broker) وجود ندارد. فقط `retry` و `cancel` وجود دارد.

### ۳.۳ عدم partial bind
- **اشکال**: placement فقط به صورت کامل bind می‌شود. در کارگزاری، partial bind (بخشی از risk به یک carrier و بخشی به carrier دیگر) یک نیاز رایج است اما پشتیبانی نمی‌شود.

---

## ۴. Carrier Connector

### ۴.۱ عدم connector برای carrierهای غیر-Sanhab
- **اشکال**: connector types شامل `sanhab`، `manual`، `api` است اما هیچ connector آماده‌ای برای carrierهای غیرایرانی یا carrierهای با API اختصاصی وجود ندارد.

### ۴.۲ عدم credential management امن
- **اندپوینت**: `POST /api/v1/carrier-connectors`  
- **اشکال**: connector config شامل `credentials` است اما هیچ مکانیزمی برای encrypt کردن credentials یا استفاده از secret manager وجود ندارد.

### ۴.۳ عدم health check proactive
- **اندپوینت**: `GET /api/v1/carrier-connectors/:carrierOrganizationId/health`  
- **اشکال**: health check فقط on-demand انجام می‌شود. هیچ مکانیزم proactive monitoring یا alerting برای connector health وجود ندارد.

---

## ۵. ذینفعان و مصرف‌کنندگان

### ۵.۱ عدم دسترسی broker-portal-bff به placement operations
- **اشکال**: `broker-portal-bff` فقط `POST /broker/placements` را expose می‌کند اما retry، cancel و get placement details از طریق BFF قابل دسترسی نیست.

### ۵.۲ عدم یکپارچه‌سازی با policy-service
- **اشکال**: بعد از bind، policy-service باید به طور خودکار policy ایجاد کند اما هیچ مکانیزم sync یا event-driven integration بین submission-placement-service و policy-service تعریف نشده است.

### ۵.۳ عدم notification به customer-portal
- **اشکال**: وقتی submission ایجاد یا quote دریافت می‌شود، `customer-portal-service` باید مطلع شود اما هیچ مسیری برای این notification وجود ندارد.

### ۵.۴ عدم استفاده channel-workspace-bff از comparison
- **اشکال**: `channel-workspace-bff` اندپوینت comparison را expose نمی‌کند. کارگزار از طریق channel workspace نمی‌تواند quoteهای مختلف را مقایسه کند.
