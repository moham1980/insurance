# Insurer Operations BFF — تحلیل نقایص اندپوینت‌ها

**سرویس**: insurer-operations-bff  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/insurer-operations-bff/src/`

---

## ۱. Product و Rate Table Endpoints

### ۱.۱ عدم فیلتر بر اساس insurer organization در لیست products
- **اندپوینت**: `GET /insurer/products`
- **اشکال**: لیست products فقط `limit` و `offset` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `insurerOrganizationId`، `lineOfBusiness` یا `status` وجود ندارد. در یک محیط multi-insurer، یک بیمه‌گر فقط باید products خود را ببیند.
- **کد**: `insurer.controller.ts:19-23` — `listProducts` فقط `@Query('limit')` و `@Query('offset')` را می‌گیرد؛ `insurer-bff.service.ts:25-33` — `listProducts` فقط `limit` و `offset` را به downstream پاس می‌دهد: `this.http.get(${this.policyUrl}/api/v1/products, { params: query })`.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم CRUD برای products
- **اندپوینت**: `GET /insurer/products`
- **اشکال**: فقط list products پشتیبانی می‌شود. هیچ endpoint‌ای برای create، update، activate یا deactivate کردن product وجود ندارد.
- **کد**: `insurer.controller.ts:19-23` — تنها `@Get('products')` وجود دارد؛ هیچ `@Post`، `@Put` یا `@Patch` برای products تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم detail و versioning برای rate tables
- **اندپوینت**: `GET /insurer/rate-tables`
- **اشکال**: فقط لیست rate tables پشتیبانی می‌شود. هیچ endpoint‌ای برای get detail، create، update یا version bump کردن rate table وجود ندارد.
- **کد**: `insurer.controller.ts:25-29` — تنها `@Get('rate-tables')`؛ `insurer-bff.service.ts:35-40` — `listRateTables` فقط یک GET به downstream می‌فرستد.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم فیلتر بر اساس productId در rate tables
- **اندپوینت**: `GET /insurer/rate-tables`
- **اشکال**: هیچ فیلتری بر اساس `productId` یا `effectiveDate` پشتیبانی نمی‌شود.
- **کد**: `insurer.controller.ts:25-29` — `listRateTables` هیچ `@Query` نمی‌گیرد؛ `insurer-bff.service.ts:35-40` — `this.http.get(${this.policyUrl}/api/v1/rate-tables, ...)` بدون params.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Distribution Agreement Endpoints

### ۲.۱ عدم detail و CRUD برای distribution agreements
- **اندپوینت**: `GET /insurer/distribution-agreements`
- **اشکال**: فقط لیست distribution agreements پشتیبانی می‌شود. هیچ endpoint‌ای برای get detail، create، update، suspend یا terminate agreement وجود ندارد.
- **کد**: `insurer.controller.ts:33-37` — تنها `@Get('distribution-agreements')`؛ هیچ POST/PUT/DELETE تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم فیلتر بر اساس status و partner
- **اندپوینت**: `GET /insurer/distribution-agreements`
- **اشکال**: هیچ فیلتری (status، partnerId، effectiveDate) پشتیبانی نمی‌شود.
- **کد**: `insurer.controller.ts:33-37` — `listDistributionAgreements` هیچ `@Query` نمی‌گیرد؛ `insurer-bff.service.ts:44-49` — `this.http.get(${this.policyUrl}/api/v1/distribution-agreements, ...)` بدون params.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم نمایش commission terms و coverage scope
- **اندپوینت**: `GET /insurer/distribution-agreements`
- **اشکال**: BFF response را به‌صورت pass-through برمی‌گرداند و هیچ enrichment برای commission rate، coverage scope یا territory اضافه نمی‌کند.
- **کد**: `insurer-bff.service.ts:44-49` — `return data` بدون enrichment.
- **وضعیت**: ✅ تأیید شد

---

## ۳. RFQ Endpoints

### ۳.۱ عدم فیلتر در لیست RFQs
- **اندپوینت**: `GET /insurer/rfqs`
- **اشکال**: لیست RFQs هیچ فیلتری (status، brokerId، lineOfBusiness، بازه زمانی) را پشتیبانی نمی‌کند.
- **کد**: `insurer.controller.ts:41-45` — `listRfqs` هیچ `@Query` نمی‌گیرد؛ `insurer-bff.service.ts:53-58` — `this.http.get(${this.policyUrl}/api/v1/rfqs, ...)` بدون params.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم pagination در لیست RFQs
- **اندپوینت**: `GET /insurer/rfqs`
- **اشکال**: هیچ پارامتر `limit` یا `offset` در لیست RFQs پشتیبانی نمی‌شود (برخلاف products و claims که pagination دارند).
- **کد**: `insurer.controller.ts:41-45` — `listRfqs` برخلاف `listProducts` (خط ۲۰) و `listClaims` (خط ۵۶) هیچ `@Query('limit')` یا `@Query('offset')` نمی‌گیرد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم RFQ detail و submission context
- **اندپوینت**: `GET /insurer/rfqs`
- **اشکال**: هیچ endpoint‌ای برای get detail RFQ وجود ندارد. بیمه‌گر برای process کردن RFQ نیاز به جزئیات کامل دارد.
- **کد**: `insurer.controller.ts:41-45` — تنها `@Get('rfqs')` (list)؛ هیچ `@Get('rfqs/:rfqId')` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم reject و request-more-info در RFQ
- **اندپوینت**: `POST /insurer/rfqs/:rfqId/process`
- **اشکال**: فقط process (create quote) پشتیبانی می‌شود. هیچ endpoint‌ای برای reject کردن RFQ یا request کردن اطلاعات بیشتر وجود ندارد.
- **کد**: `insurer.controller.ts:47-51` — تنها `@Post('rfqs/:rfqId/process')`؛ هیچ `@Post('rfqs/:rfqId/reject')` یا `@Post('rfqs/:rfqId/request-info')` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ عدم validation quoteAmount و currency
- **اندپوینت**: `POST /insurer/rfqs/:rfqId/process`
- **اشکال**: `body` به‌صورت `any` دریافت و مستقیماً به downstream forward می‌شود. هیچ validation روی quoteAmount یا currency در BFF وجود ندارد.
- **کد**: `insurer.controller.ts:48` — `@Body() body: any` بدون validation؛ `insurer-bff.service.ts:60-65` — `this.http.post(${this.policyUrl}/api/v1/rfqs/${rfqId}/process, body, ...)` — body به‌صورت raw forward.
- **وضعیت**: ✅ تأیید شد

### ۳.۶ عدم multi-quote و comparison
- **اندپوینت**: `POST /insurer/rfqs/:rfqId/process`
- **اشکال**: فقط یک quote per RFQ قابل ایجاد است. هیچ مکانیزم multi-quote پشتیبانی نمی‌شود.
- **کد**: `insurer.controller.ts:47-51` — تنها یک process endpoint؛ هیچ مکانیزم options یا multi-quote.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Claims Endpoints

### ۴.۱ عدم فیلتر در لیست claims
- **اندپوینت**: `GET /insurer/claims`
- **اشکال**: لیست claims فقط `limit` و `offset` را پشتیبانی می‌کند. هیچ فیلتری (status، policyId، brokerId، incidentDate، assignee) وجود ندارد.
- **کد**: `insurer.controller.ts:55-59` — `listClaims` فقط `@Query('limit')` و `@Query('offset')`؛ `insurer-bff.service.ts:69-77` — `this.http.get(${this.claimUrl}/api/v1/claims, { params: query })` با فقط limit و offset.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم claim detail و documents
- **اندپوینت**: `GET /insurer/claims`
- **اشکال**: هیچ endpoint‌ای برای get claim detail وجود ندارد. بیمه‌گر برای مدیریت claim نیاز به جزئیات کامل دارد.
- **کد**: `insurer.controller.ts:55-59` — تنها `@Get('claims')` (list)؛ هیچ `@Get('claims/:claimId')` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم approve/reject/settle claim
- **اندپوینت**: `POST /insurer/claims/:claimId/assign-loss-adjuster`
- **اشکال**: فقط assign loss adjuster پشتیبانی می‌شود. هیچ endpoint‌ای برای approve، reject، set reserve یا settle کردن claim وجود ندارد.
- **کد**: `insurer.controller.ts:61-65` — تنها `@Post('claims/:claimId/assign-loss-adjuster')`؛ هیچ approve/reject/settle endpoint.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ عدم validation lossAdjusterId
- **اندپوینت**: `POST /insurer/claims/:claimId/assign-loss-adjuster`
- **اشکال**: `lossAdjusterId` در request body ارسال می‌شود و بدون validation به downstream forward می‌شود. هیچ بررسی اینکه آیا adjuster فعال و مجاز است یا خیر.
- **کد**: `insurer.controller.ts:62` — `@Body() body: { lossAdjusterId: string }` بدون validation؛ `insurer-bff.service.ts:79-84` — `this.http.post(${this.claimUrl}/api/v1/claims/${claimId}/assign-loss-adjuster, body, ...)` — body به‌صورت raw forward.
- **وضعیت**: ✅ تأیید شد

### ۴.۵ عدم unassign یا reassign loss adjuster
- **اندپوینت**: `POST /insurer/claims/:claimId/assign-loss-adjuster`
- **اشکال**: فقط assign پشتیبانی می‌شود. هیچ endpoint‌ای برای unassign یا reassign وجود ندارد.
- **کد**: `insurer.controller.ts:61-65` — تنها assign endpoint؛ هیچ unassign یا reassign.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Settlement Endpoints

### ۵.۱ عدم pagination و فیلتر در لیست settlements
- **اندپوینت**: `GET /insurer/settlements`
- **اشکال**: لیست settlements هیچ pagination یا فیلتری را پشتیبانی نمی‌کند.
- **کد**: `insurer.controller.ts:69-73` — `listSettlements` هیچ `@Query` نمی‌گیرد؛ `insurer-bff.service.ts:88-93` — `this.http.get(${this.billingUrl}/api/v1/settlements, ...)` بدون params.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم settlement detail و approve/reject
- **اندپوینت**: `GET /insurer/settlements`
- **اشکال**: فقط لیست settlements پشتیبانی می‌شود. هیچ endpoint‌ای برای get detail، approve، reject یا initiate payment وجود ندارد.
- **کد**: `insurer.controller.ts:69-73` — تنها `@Get('settlements')`؛ هیچ detail یا action endpoint.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم نمایش breakdown و reserve
- **اندپوینت**: `GET /insurer/settlements`
- **اشکال**: BFF response را به‌صورت pass-through برمی‌گرداند و هیچ enrichment برای breakdown یا reserve اضافه نمی‌کند.
- **کد**: `insurer-bff.service.ts:88-93` — `return data` بدون enrichment.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Broker Performance و Regulatory Reports

### ۶.۱ عدم فیلتر زمانی در broker performance
- **اندپوینت**: `GET /insurer/broker-performance`
- **اشکال**: هیچ فیلتر بازه زمانی (from/to) یا period پشتیبانی نمی‌شود.
- **کد**: `insurer.controller.ts:77-81` — `listBrokerPerformance` هیچ `@Query` نمی‌گیرد؛ `insurer-bff.service.ts:95-100` — `this.http.get(${this.billingUrl}/api/v1/broker-performance, ...)` بدون params.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم pagination در broker performance
- **اندپوینت**: `GET /insurer/broker-performance`
- **اشکال**: هیچ pagination پشتیبانی نمی‌شود.
- **کد**: `insurer.controller.ts:77-81` — هیچ `@Query('limit')` یا `@Query('offset')`.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم detail و drill-down در broker performance
- **اندپوینت**: `GET /insurer/broker-performance`
- **اشکال**: هیچ endpoint‌ای برای drill-down به جزئیات وجود ندارد.
- **کد**: `insurer.controller.ts:77-81` — تنها aggregate list endpoint.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم generate و download در regulatory reports
- **اندپوینت**: `GET /insurer/regulatory-reports`
- **اشکال**: فقط لیست reports پشتیبانی می‌شود. هیچ endpoint‌ای برای generate، download یا submit report وجود ندارد.
- **کد**: `insurer.controller.ts:85-89` — تنها `@Get('regulatory-reports')`؛ هیچ generate یا download endpoint.
- **وضعیت**: ✅ تأیید شد

### ۶.۵ عدم فیلتر در regulatory reports
- **اندپوینت**: `GET /insurer/regulatory-reports`
- **اشکال**: هیچ فیلتری (reportType، period، status) پشتیبانی نمی‌شود.
- **کد**: `insurer.controller.ts:85-89` — `listRegulatoryReports` هیچ `@Query` نمی‌گیرد؛ `insurer-bff.service.ts:104-109` — `this.http.get(${this.policyUrl}/api/v1/regulatory-reports, ...)` بدون params.
- **وضعیت**: ✅ تأیید شد

---

## ۷. امنیت و RBAC

### ۷.۱ عدم local auth guard و RBAC
- **اندپوینت**: تمام endpoints (به جز /health)
- **اشکال**: BFF هیچ local auth guard ندارد. تابع `extractToken` فقط وجود `Bearer ` prefix را بررسی می‌کند و token را بدون verify به downstream forward می‌کند. هیچ `@UseGuards` در controller وجود ندارد. اگر Authorization header نباشد، `extractToken` رشته خالی برمی‌گرداند و downstream با Authorization خالی فراخوانی می‌شود.
- **کد**: `insurer.controller.ts:4-7` — `extractToken`: `return auth.startsWith('Bearer ') ? auth : '';` — هیچ jwt.verify؛ `insurer.controller.ts:9` — `@Controller('insurer')` بدون `@UseGuards`؛ تمام متدها فقط `extractToken(req)` را صدا می‌زنند.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم RBAC و Separation of Duties
- **اندپوینت**: تمام endpoints
- **اشکال**: هیچ role-based access control ای تعریف نشده است. یک کاربر بیمه‌گر با هر نقشی می‌تواند به تمام endpoints دسترسی داشته باشد.
- **کد**: `insurer.controller.ts:9` — `@Controller('insurer')` بدون هیچ RolesGuard یا permission check.
- **وضعیت**: ✅ تأیید شد

### ۷.۳ عدم tenant و insurer organization isolation
- **اندپوینت**: تمام endpoints
- **اشکال**: هیچ tenant یا organization isolation در BFF وجود ندارد. هیچ `insurerOrganizationId` از token استخراج و به downstream forward نمی‌شود.
- **کد**: `insurer.controller.ts:4-7` — `extractToken` فقط Authorization header را برمی‌گرداند؛ هیچ tenantId یا organizationId extraction؛ `insurer-bff.service.ts:15-21` — `authHeaders` فقط Authorization و Content-Type و x-correlation-id را forward می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۷.۴ عدم rate limiting در BFF
- **اندپوینت**: تمام endpoints
- **اشکال**: هیچ rate limiting ای در BFF تعریف نشده است.
- **کد**: `main.ts:5-7` — `NestFactory.create(AppModule)` بدون هیچ rate-limit plugin یا middleware.
- **وضعیت**: ✅ تأیید شد

### ۷.۵ (جدید) CORS کاملاً باز با credentials
- **اندپوینت**: تمام endpoints
- **اشکال**: CORS به‌صورت `origin: true, credentials: true` پیکربندی شده است که تمام originها را با credentials اجازه می‌دهد. هر سایت می‌تواند درخواست‌های authenticated به BFF بفرستد.
- **کد**: `main.ts:7` — `app.enableCors({ origin: true, credentials: true });`
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۶ (جدید) عدم encodeURIComponent در پارامترهای path
- **اندپوینت**: `POST /insurer/rfqs/:rfqId/process`، `POST /insurer/claims/:claimId/assign-loss-adjuster`
- **اشکال**: پارامترهای path مستقیماً در URL قرار داده می‌شوند بدون `encodeURIComponent` که می‌تواند باعث path traversal یا URL injection شود.
- **کد**: `insurer-bff.service.ts:62` — `${this.policyUrl}/api/v1/rfqs/${rfqId}`؛ `insurer-bff.service.ts:81` — `${this.claimUrl}/api/v1/claims/${claimId}` — هیچکدام encodeURIComponent استفاده نمی‌کنند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۷ (جدید) عدم forward کردن X-Correlation-Id به downstream
- **اندپوینت**: تمام endpoints
- **اشکال**: تابع `authHeaders` به‌جای forward کردن `X-Correlation-Id` ورودی، یک correlation ID جدید تولید می‌کند. این باعث قطع trace بین BFF و downstream می‌شود.
- **کد**: `insurer-bff.service.ts:15-21` — `'x-correlation-id': ${Date.now()}-${Math.random().toString(36).substr(2, 9)}` — همیشه جدید؛ `insurer.controller.ts:13-15` — `cid` از incoming header استخراج می‌شود اما به `authHeaders` پاس داده نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۸ (جدید) مقادیر پیش‌فرض نادرست برای URL سرویس‌های downstream
- **اندپوینت**: تمام endpoints
- **اشکال**: مقادیر پیش‌فرض URL برای downstream services نادرست هستند: `policyUrl` پیش‌فرض `http://localhost:18010` (orchestrator-service) به‌جای policy-service (18007)؛ `claimUrl` پیش‌فرض `http://localhost:18020` (monitoring-service) به‌جای claims-service (18002)؛ `billingUrl` پیش‌فرض `http://localhost:18030` (copilot-service) به‌جای billing-service (18004). اگر متغیرهای محیطی تنظیم نشوند، BFF به سرویس‌های اشتباه متصل می‌شود.
- **کد**: `insurer-bff.service.ts:9` — `policyUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18010'`؛ `insurer-bff.service.ts:10` — `claimUrl = process.env.CLAIM_SERVICE_URL || 'http://localhost:18020'`؛ `insurer-bff.service.ts:11` — `billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18030'`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۸. بهینه‌سازی و یکپارچه‌سازی

### ۸.۱ عدم caching برای products و rate tables
- **اندپوینت**: `GET /insurer/products`، `GET /insurer/rate-tables`
- **اشکال**: هیچ caching ای تعریف نشده است. هر request به downstream فرستاده می‌شود.
- **کد**: `insurer-bff.service.ts:25-40` — هیچ cache mechanism در service یا controller.
- **وضعیت**: ✅ تأیید شد

### ۸.۲ عدم bulk operations
- **اشکال**: هیچ bulk endpoint‌ای برای approve کردن چند claim یا process کردن چند RFQ وجود ندارد.
- **کد**: `insurer.controller.ts` — تمام endpoints single-resource هستند.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ عدم async processing برای report generation
- **اندپوینت**: `GET /insurer/regulatory-reports`
- **اشکال**: هیچ مکانیزم async‌ای تعریف نشده است. اگر report بزرگ باشد، request timeout می‌شود.
- **کد**: `insurer-bff.service.ts:104-109` — `listRegulatoryReports` یک synchronous GET request؛ هیچ job submission یا polling mechanism.
- **وضعیت**: ✅ تأیید شد

### ۸.۴ ~~عدم یکپارچه‌سازی با sales-network-service برای commission data~~
- ~~**اشکال**: broker performance از sales-network-service fetch می‌شود اما commission data فقط aggregate را نشان می‌دهد.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: `insurer-bff.service.ts:95-100` — `listBrokerPerformance` از `billingUrl` (billing-service) fetch می‌کند: `this.http.get(${this.billingUrl}/api/v1/broker-performance, ...)`، نه از sales-network-service. با این حال، نقص اصلی (عدم نمایش commission details و drill-down) همچنان معتبر است.

---

## ۹. ذینفعان و مصرف‌کنندگان

### ۹.۱ عدم یکپارچه‌سازی با partner-gateway برای federation
- **اشکال**: هیچ ارجاعی به partner-gateway در downstream services وجود ندارد. بیمه‌گران federation نمی‌توانند از طریق این BFF عمل کنند.
- **کد**: `insurer-bff.service.ts:9-11` — فقط `policyUrl`، `claimUrl`، `billingUrl` تعریف شده‌اند؛ هیچ `partnerGatewayUrl` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۹.۲ ~~عدم یکپارچه‌سازی با regulatory-gateway-service~~
- ~~**اشکال**: regulatory reports باید از طریق regulatory-gateway-service به Sanhab ارسال شوند اما BFF فقط با reporting-service یکپارچه است.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: `insurer-bff.service.ts:104-109` — `listRegulatoryReports` از `policyUrl` (policy-service) fetch می‌کند: `this.http.get(${this.policyUrl}/api/v1/regulatory-reports, ...)`، نه از reporting-service. با این حال، نقص اصلی (عدم یکپارچه‌سازی با regulatory-gateway-service) همچنان معتبر است زیرا BFF به policy-service متصل است نه regulatory-gateway-service.

### ۹.۳ عدم notification به broker هنگام RFQ response
- **اشکال**: هیچ event یا notification‌ای از BFF به broker ارسال نمی‌شود.
- **کد**: `insurer-bff.service.ts:60-65` — `processRfq` فقط یک POST به downstream می‌فرستد؛ هیچ event publish یا notification.
- **وضعیت**: ✅ تأیید شد

### ۹.۴ عدم دسترسی broker-portal-bff به broker performance
- **اشکال**: هیچ endpoint مشترک یا delegated access‌ای تعریف نشده است.
- **کد**: `insurer.controller.ts:77-81` — `listBrokerPerformance` فقط با insurer token کار می‌کند؛ هیچ broker-facing endpoint.
- **وضعیت**: ✅ تأیید شد

### ۹.۵ عدم یکپارچه‌سازی با claims-service برای claim lifecycle
- **اشکال**: BFF به‌صورت blind proxy عمل می‌کند و `assign-loss-adjuster` را به claims-service forward می‌کند بدون mapping یا validation. مشخص نیست آیا claims-service این endpoint را پشتیبانی می‌کند.
- **کد**: `insurer-bff.service.ts:79-84` — `this.http.post(${this.claimUrl}/api/v1/claims/${claimId}/assign-loss-adjuster, body, ...)` — blind proxy بدون mapping یا error handling خاص.
- **وضعیت**: ✅ تأیید شد
