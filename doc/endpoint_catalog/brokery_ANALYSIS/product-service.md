# Product Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: product-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Visibility و Offerings

### ۱.۱ عدم فیلتر visibility بر اساس Distribution Agreement
- **اندپوینت**: `GET /api/v1/distributors/:distributorOrganizationId/visible-products`  
- **اشکال**: این اندپوینت visible products را بر اساس `distributorOrganizationId` برمی‌گرداند اما هیچ فیلتری بر اساس `agreementId` یا وضعیت فعال قرارداد اعمال نمی‌کند. اگر قرارداد کارگزار با یک بیمه‌گر لغو شده باشد، محصولات آن بیمه‌گر همچنان برای کارگزار visible باقی می‌مانند.

### ۱.۲ عدم version-level visibility
- **اشکال**: visibility در سطح product ایجاد می‌شود (`POST /api/v1/products/:productId/visibility`) اما طرح کارگزاری نیازمند visibility در سطح product version است. یک کارگزار ممکن است فقط به نسخه خاصی از محصول دسترسی داشته باشد.

### ۱.۳ عدم bulk visibility management
- **اشکال**: visibility فقط به صورت یکی‌یکی برای هر product ایجاد می‌شود. برای کارگزاران بزرگ با دسترسی به ده‌ها محصول، عدم وجود bulk create/update visibility یک نقص عملکردی است.

---

## ۲. Broker Offerings

### ۲.۱ عدم commission rate متغیر بر اساس فاکتورها
- **اندپوینت**: `POST /api/v1/broker-offerings`  
- **اشکال**: commission rate به صورت یک عدد ثابت در offering تعریف می‌شود. طرح کارگزاری نیازمند commission rate متغیر بر اساس فاکتورهایی مانند volume، product line، یا customer segment است. هیچ اندپوینتی برای تعریف commission tiers وجود ندارد.

### ۲.۲ عدم ارتباط offering با Distribution Agreement
- **اشکال**: broker offerings مستقل از Distribution Agreement ایجاد می‌شوند. باید offering فقط در صورت وجود قرارداد فعال بین broker و carrier قابل ایجاد باشد اما هیچ validation ای این کار را انجام نمی‌دهد.

### ۲.۳ عدم customer-facing offering با pricing
- **اندپوینت**: `GET /api/v1/customers/offerings`  
- **اشکال**: این اندپوینت offerings را برمی‌گرداند اما pricing و quote را شامل نمی‌شود. مشتری باید بتواند قیمت نهایی را با توجه به offering کارگزار ببیند.

---

## ۳. Versioning و Clone

### ۳.۱ عدم migration خودکار visibility هنگام clone
- **اندپوینت**: `POST /api/v1/products/:productId/versions/:version/clone`  
- **اشکال**: وقتی یک version کلون می‌شود، visibilityهای نسخه اصلی به نسخه جدید منتقل نمی‌شوند. این باعث می‌شود بعد از clone، کارگزاران دسترسی به نسخه جدید نداشته باشند مگر اینکه visibility به صورت دستی مجدد ایجاد شود.

### ۳.۲ عدم retirement notification
- **اندپوینت**: `POST /api/v1/products/:productId/versions/:version/retire`  
- **اشکال**: وقتی یک version retire می‌شود، هیچ notification یا event به broker-portal-bff یا channel-workspace-bff ارسال نمی‌شود. کارگزاران ممکن است همچنان به نسخه retired پیشنهاد دهند.

---

## ۴. Quote Engine

### ۴.۱ عدم پشتیبانی multi-carrier quote
- **اندپوینت**: `POST /product/quote`  
- **اشکال**: quote engine فقط یک محصول را quote می‌کند. طرح کارگزاری نیازمند این است که یک submission به چند بیمه‌گر به طور همزمان ارسال شود و quoteهای مقایسه‌ای دریافت شود. این قابلیت در product-service وجود ندارد و فقط در submission-placement-service قرار دارد، اما یکپارچه‌سازی بین این دو سرویس تعریف نشده است.

### ۴.۲ عدم اعمال broker-specific discount/surcharge
- **اشکال**: pricing rules شامل discount و surcharge هستند اما هیچ مکانیزمی برای اعمال discount اختصاصی کارگزار (بر اساس حجم یا قرارداد) وجود ندارد.

---

## ۵. ذینفعان و مصرف‌کنندگان

### ۵.۱ عدم استفاده customer-portal از offerings
- **اشکال**: `customer-portal-service` هیچ اندپوینتی برای نمایش product offerings به مشتری ندارد. مشتری باید بتواند محصولات قابل ارائه توسط کارگزار خود را ببیند.

### ۵.۲ عدم یکپارچه‌سازی با submission-placement-service
- **اشکال**: submission-placement-service هنگام ایجاد submission به `productId` و `productVersion` نیاز دارد اما هیچ validation ای برای بررسی فعال بودن visibility محصول برای سازمان کارگزار در زمان ایجاد submission انجام نمی‌دهد.

### ۵.۳ عدم export با فیلتر سازمان
- **اندپوینت**: `GET /product/export`  
- **اشکال**: export snapshot تمام محصولات را export می‌کند. هیچ فیلتری بر اساس organization یا visibility وجود ندارد. یک کارگزار نباید بتواند snapshot کامل محصولات بیمه‌گر را دریافت کند.

---

## ۶. اشکالات اضافی کشف‌شده در طول پیاده‌سازی

### ۶.۱ URL اشتباه در channel-workspace-bff
- **اندپوینت**: `listOfferings` و `listBrokerOfferings` در `channel-workspace-bff`
- **اشکال**: این متدها به `policyUrl` (سرویس بیمه‌نامه) درخواست می‌فرستادند به جای `productUrl` (سرویس محصول). این باعث می‌شد offerings از سرویس اشتباه دریافت شوند.
- **رفع**: اضافه شد `productUrl` و هر دو متد به استفاده از آن اصلاح شدند.

### ۶.۲ عدم status=active در listOfferings در broker-portal-bff
- **اشکال**: `broker-portal-bff` در متد `listOfferings` پارامتر `status=active` ارسال نمی‌کرد که باعث می‌شد offerings غیرفعال نیز بازگردانده شوند.
- **رفع**: پارامتر `status=active` به درخواست اضافه شد.

---

## وضعیت رفع اشکالات

| شماره | اشکال | وضعیت |
|-------|-------|-------|
| ۱.۱ | فیلتر visibility بر اساس agreement | ✅ رفع شد — اضافه شد فیلتر `agreementId` و بررسی وضعیت فعال قرارداد |
| ۱.۲ | version-level visibility | ✅ رفع شد — پشتیبانی از `productVersion` و `productVersionId` در ایجاد visibility |
| ۱.۳ | bulk visibility management | ✅ رفع شد — اضافه شد `POST /api/v1/products/visibility/bulk` |
| ۲.۱ | commission tiers | ✅ رفع شد — اضافه شد ستون `commission_tiers` در entity و `PUT /broker-offerings/:id/commission-tiers` |
| ۲.۲ | اعتبارسنجی agreement فعال | ✅ رفع شد — بررسی وضعیت، تاریخ اعتبار، و تطابق broker در `createBrokerProductOffering` |
| ۲.۳ | customer offerings با pricing | ✅ رفع شد — محاسبه quote برای هر محصول در `listCustomerOfferings` |
| ۳.۱ | migration خودکار visibility در clone | ✅ رفع شد — کپی visibilityهای نسخه مبدأ به نسخه کلون‌شده |
| ۳.۲ | retirement notification | ✅ رفع شد — فیلتر `status=active` در BFFها + event از قبل منتشر می‌شد |
| ۴.۱ | multi-carrier quote | ✅ رفع شد — اضافه شد `POST /product/quote/compare` و `computeMultiQuote` |
| ۴.۲ | broker-specific discount/surcharge | ✅ رفع شد — پشتیبانی `brokerAdjustments` در QuoteEngine |
| ۵.۱ | offerings در customer-portal | ✅ رفع شد — اضافه شد `GET /customer-portal/offerings` |
| ۵.۲ | visibility validation در submission | ✅ رفع شد — اضافه شد `checkProductVisibility` در `ProductServiceClient` |
| ۵.۳ | export با فیلتر سازمان | ✅ رفع شد — اضافه شد پارامتر `organizationId` در export |
| ۶.۱ | URL اشتباه در channel-workspace-bff | ✅ رفع شد — استفاده از `productUrl` به جای `policyUrl` |
| ۶.۲ | status=active در broker-portal-bff | ✅ رفع شد |
| ۶.۳ | پورت اشتباه product-service در channel-workspace-bff | ✅ رفع شد — از 18050 به 18018 |
| ۶.۴ | پورت اشتباه product-service در catalog-bff | ✅ رفع شد — از 3012 به 18018 |
| ۶.۵ | پورت اشتباه product-service در customer-portal-service | ✅ رفع شد — از 18040 به 18018 |
| ۶.۶ | پورت اشتباه product-service در submission-placement client registry | ✅ رفع شد — از 3018 به 18018 |
| ۶.۷ | پورت اشتباه product-service در docker-compose برای submission-placement | ✅ رفع شد — از 18005 به 18018 |
| ۶.۸ | عدم وجود PRODUCT_SERVICE_URL در docker-compose برای customer-portal-service | ✅ رفع شد — اضافه شد env var و dependency |
| ۶.۹ | عدم پاس agreementId در catalog-bff listDistributorVisibleProducts | ✅ رفع شد |
| ۶.۱۰ | عدم status=active در catalog-bff listBrokerOfferings | ✅ رفع شد — پیش‌فرض status=active |
| ۶.۱۱ | عدم پاس currency/region در catalog-bff listCustomerOfferings | ✅ رفع شد |
| ۶.۱۲ | عدم شامل کردن commissionTiers در catalog-bff getOfferingComparisonHint | ✅ رفع شد |
| ۶.۱۳ | عدم pagination/status در channel-workspace-bff listBrokerOfferings | ✅ رفع شد — اضافه شد params و status=active پیش‌فرض |
