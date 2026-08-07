# Customer 360 Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: customer-360-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/customer-360-service/src/`

---

## ۱. Customer Profile و Single Customer View

### ۱.۱ ~~نبود نشانه‌ای از data freshness~~
- **اندپوینت**: `GET /customer-360/:customerId`
- ~~**اشکال**: پاسخ شامل `policies`، `claims` و `payments` است اما هیچ فیلدی برای `lastSyncedAt` یا `dataAsOf` وجود ندارد. اپراتور و کلاینت نمی‌دانند داده‌ها چقدر به‌روز هستند.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `customer-360.service.ts:getCustomer360Profile()` (خطوط ۷۴-۸۲): `metadata` شامل `lastSyncedAt: new Date()` (خط ۷۶)، `dataFreshness: 'near_real_time'` (خط ۷۷)، `completeness` (خط ۷۸)، `confidence` (خط ۷۹) و `errors` (failed sources، خط ۸۲) است. `models/Customer360Profile.ts` (خطوط ۲۵۴-۲۶۰): `ProfileMetadata` interface شامل `dataSource`, `lastSyncedAt`, `dataFreshness`, `completeness`, `confidence`.

### ۱.۲ نبود pagination در policies، claims و payments
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: در پاسخ، `policies`، `claims` و `payments` به‌صورت آرایه‌های باز (`[]`) تعریف شده‌اند. هیچ محدودیتی برای تعداد آیتم‌ها وجود ندارد. یک customer با ۱۰۰ بیمه‌نامه و ۵۰ claim می‌تواند پاسخ بسیار بزرگی تولید کند. باید pagination یا حداقل limit (مثل top 10 با `totalCount`) وجود داشته باشد.
- **کد**: `customer-360.service.ts:getCustomer360Profile()` (خطوط ۴۲-۵۵): `Promise.allSettled` داده‌ها از سرویس‌های downstream fetch می‌کند. `getPolicies()` (خطوط ۱۳۶-۱۵۱): `response.data?.data || []` — تمام policies بدون limit برمی‌گردد. `getClaims()` (خطوط ۱۵۶-۱۷۱) و `getPayments()` (خطوط ۱۷۶-۱۹۱) — همانند. هیچ `limit` یا `offset` parameter به downstream services پاس نمی‌شود. `customer-360.controller.ts:getCustomerProfile()` (خطوط ۱۸-۴۱) — هیچ query param برای pagination.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ نبود فیلتر و sort در sub-resource‌ها
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: هیچ query param‌ای برای فیلتر کردن `policies` (مثل فقط active)، `claims` (مثل فقط open) یا `payments` (مثل فقط overdue) وجود ندارد. کلاینت باید تمام داده‌ها را دریافت و سمت کلاینت فیلتر کند. همچنین هیچ sort order‌ای (مثل `sortBy=createdAt&sortOrder=desc`) تعریف نشده است.
- **کد**: `customer-360.controller.ts:getCustomerProfile()` (خطوط ۱۸-۴۱) — هیچ query param‌ای جز `customerId` (path param) پذیرفته نمی‌شود. `customer-360.service.ts:getPolicies()` (خط ۱۴۱): `params: { customerId }` — فقط `customerId` به downstream پاس می‌شود، هیچ فیلتر یا sort اضافی.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ نبود customer search و lookup
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: این endpoint فقط با `customerId` کار می‌کند. هیچ endpoint ای برای search بر اساس `nationalId`، `phoneNumber`، `email` یا `name` وجود ندارد. اپراتور باید ابتدا از party-kyc-service برای پیدا کردن customerId استفاده کند و سپس به customer-360 مراجعه کند. یک `GET /customer-360/search?q=...` یا `GET /customer-360/lookup?nationalId=...` باید وجود داشته باشد.
- **کد**: `customer-360.controller.ts` — هیچ search endpoint‌ای تعریف نشده است. **نکته مهم**: `customer-360.service.ts:searchCustomers()` (خطوط ۵۹۱-۶۷۱) پیاده‌سازی شده است و از `nationalId`, `phone`, `email`, `policyNumber` برای search استفاده می‌کند، اما **هیچ controller endpoint‌ای این متد را فراخوانی نمی‌کند** — این یک dead method است.
- **وضعیت**: ✅ تأیید شد (با یادداشت: متد `searchCustomers` در service پیاده‌سازی شده اما expose نشده)

### ۱.۵ نبود تفکیک داده‌های حساس (PII)
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: پاسخ شامل `nationalId`، `dateOfBirth`، `phoneNumber` و `email` است. همه اینها PII هستند. هیچ مکانیزمی برای mask کردن یا redact کردن فیلدهای حساس بر اساس نقش کاربر وجود ندارد. یک کاربر با دسترسی محدود نباید `nationalId` را به‌صورت کامل ببیند. `AbacGuard` ذکر شده اما هیچ attribute-based policy‌ای برای PII masking تعریف نشده است.
- **کد**: `abac.guard.ts` (خط ۱۵): `if (method === 'GET') return true;` — **تمام GET request‌ها برای هر کاربر authenticated مجاز هستند**. هیچ PII masking یا field-level redaction وجود ندارد. `customer-360.service.ts:getCustomer360Profile()` (خطوط ۸۴-۱۰۰): `nationalId: profile.nationalId` — مستقیماً در پاسخ قرار می‌گیرد. `models/Customer360Profile.ts` (خط ۸): `nationalId: string` — در interface، بدون هیچ masking annotation.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Portfolio Summary

### ۲.۱ نبود time range در portfolio
- **اندپوینت**: `GET /customer-360/:customerId/portfolio`
- **اشکال**: portfolio summary شامل `totalPolicies`، `activePolicies`، `totalPremium`، `totalClaims`، `openClaims`، `totalPaid` و `outstandingBalance` است. هیچ پارامتر `from`/`to` یا `asOfDate` وجود ندارد. این اعداد فقط snapshot فعلی هستند. اپراتور نمی‌تواند portfolio را برای یک بازه زمانی (مثل "۳ سال گذشته") ببیند.
- **کد**: `customer-360.controller.ts:getPortfolioSummary()` (خطوط ۴۳-۵۸) — هیچ query param‌ای جز `customerId` پذیرفته نمی‌شود. `customer-360.service.ts:getPortfolioSummary()` (خطوط ۳۹۱-۴۴۴) — هیچ time range parameter‌ای نمی‌پذیرد. `getCustomer360Profile()` فراخوانی می‌کند و تمام داده‌ها را aggregate می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ نبود breakdown زمانی در portfolio
- **اندپوینت**: `GET /customer-360/:customerId/portfolio`
- **اشکال**: `policiesByProduct` و `claimsByStatus` به‌صورت breakdown آماری وجود دارند اما هیچ breakdown زمانی (مثل `policiesByYear` یا `premiumByMonth`) وجود ندارد. برای تحلیل trend customer، این داده‌ها حیاتی هستند.
- **کد**: `customer-360.service.ts:getPortfolioSummary()` (خطوط ۴۲۳-۴۴۴) — پاسخ شامل `totalPolicies`, `activePolicies`, `totalPremium`, `totalCoverage`, `totalClaims`, `openClaims`, `totalClaimAmount`, `paidClaims`, `outstandingClaims`, `totalPayments`, `netPosition`, `assets`, `riskMetrics` است. **نکته**: کاتالوگ اندپوینت `policiesByProduct` و `claimsByStatus` را مستند کرده اما این فیلدها در کد وجود ندارند! به‌جای آن `assets` و `riskMetrics` وجود دارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ نبود caching در portfolio
- **اندپوینت**: `GET /customer-360/:customerId/portfolio`
- **اشکال**: portfolio summary احتمالاً نیاز به aggregate کردن داده‌ها از چند سرویس دارد. اگر این محاسبه در هر درخواست انجام شود، می‌تواند کند باشد. هیچ اشاره‌ای به caching (با `Cache-Control` یا `ETag`) وجود ندارد. در یک سیستم با هزاران customer، caching portfolio برای کاهش بار ضروری است.
- **کد**: `customer-360.service.ts:getPortfolioSummary()` (خط ۳۹۲): `const profile = await this.getCustomer360Profile(customerId, authToken)` — در هر فراخوانی، `getCustomer360Profile` تمام داده‌ها از downstream services fetch می‌کند (۱۲ parallel HTTP call در خطوط ۴۲-۵۵). هیچ Redis cache، in-memory cache یا HTTP Cache-Control header وجود ندارد. `app.module.ts` — هیچ cache provider یا interceptor تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ نبود cross-customer comparison
- **اندپوینت**: `GET /customer-360/:customerId/portfolio`
- **اشکال**: portfolio فقط برای یک customer است. هیچ endpoint ای برای مقایسه portfolio یک customer با میانگین segment یا customer‌های مشابه وجود ندارد. در sales و retention analytics، این مقایسه برای شناسایی customer‌های at-risk حیاتی است.
- **کد**: `customer-360.controller.ts` — هیچ comparison یا benchmark endpoint‌ای وجود ندارد. `customer-360.service.ts` — هیچ متدی برای cross-customer analysis تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Consent Management

### ۳.۱ نبود consent history و audit trail
- **اندپوینت**: `GET /customer-360/:customerId/consents`، `POST /customer-360/:customerId/consents`
- **اشکال**: consent list فقط consent‌های فعلی را نشان می‌دهد. هیچ تاریخچه‌ای از تغییرات consent (مثل "granted در تاریخ X، revoked در تاریخ Y، re-granted در تاریخ Z") وجود ندارد. در compliance audit، این تاریخچه حیاتی است. consent revocation فقط `revokedAt` و `reason` را ذخیره می‌کند اما history کامل تغییرات غایب است.
- **کد**: `consent/consent-db.store.ts:list()` (خطوط ۲۳-۲۹): تمام consent record‌ها برای یک `customerId` برمی‌گردد (ordered by `createdAt DESC`). `add()` (خطوط ۴۸-۷۱): هر بار یک **new record** ایجاد می‌شود (با `randomUUID()`). `revoke()` (خطوط ۷۳-۸۷): موجود record را update می‌کند (`status = 'revoked'`, `revokedAt = new Date()`). پس اگر consent grant، revoke، re-grant شود، دو record وجود خواهد داشت: یکی revoked و یکی granted. این یک تاریخچه نسبی است اما هیچ dedicated audit trail endpoint یا separate audit table وجود ندارد. `entities/ConsentRecordEntity.ts` (خطوط ۴۶-۴۷): `actorUserId` ذخیره می‌شود اما هیچ audit log برای تغییرات نیست.
- **وضعیت**: ✅ تأیید شد (با یادداشت: consent records به‌صورت نسبی history ایجاد می‌کنند اما dedicated audit trail غایب است)

### ۳.۲ نبود consent update (فقط grant و revoke)
- **اندپوینت**: `POST /customer-360/:customerId/consents`، `POST /customer-360/:customerId/consents/:consentId/revoke`
- **اشکال**: consent فقط grant (create) و revoke می‌شود. هیچ endpoint ای برای update consent (مثل تغییر `expiresAt` یا `source` بدون revoke و re-grant) وجود ندارد. اگر consent نیاز به تمدید داشته باشد، باید revoke و دوباره grant شود که باعث gap در consent history می‌شود.
- **کد**: `customer-360.controller.ts` — فقط `@Post(':customerId/consents')` (خط ۷۴) و `@Post(':customerId/consents/:consentId/revoke')` (خط ۱۰۳) وجود دارند. هیچ `@Put(':customerId/consents/:consentId')` تعریف نشده است. `consent/consent-db.store.ts` — فقط `add()` و `revoke()` متدها وجود دارند، هیچ `update()` متدی.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ نبود consent expiration notification
- **اندپوینت**: `POST /customer-360/:customerId/consents`
- **اشکال**: consent فیلد `expiresAt` دارد اما هیچ مکانیزمی برای notification قبل از انقضای consent وجود ندارد. در یک سیستم با compliance requirements، customer باید قبل از انقضای consent مطلع شود تا بتواند آن را تمدید کند. این یکپارچه‌سازی با notification-service غایب است.
- **کد**: `consent/consent-db.store.ts:withEffectiveStatus()` (خطوط ۸۹-۹۵): اگر `expiresAt` گذشته باشد، status به `expired` تغییر می‌یابد — اما این فقط در زمان read اتفاق می‌افتد. هیچ cron job یا scheduler برای بررسی منظم consent‌های در حال انقضا و ارسال notification وجود ندارد. `main.ts` — هیچ cron job یا scheduled task تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ نبود bulk consent check
- **اندپوینت**: `GET /customer-360/:customerId/consents/check`
- **اشکال**: consent check فقط برای یک `purpose` در یک `customerId` کار می‌کند. هیچ endpoint ای برای bulk check (مثلاً "برای این لیست از customer‌ها، آیا consent برای purpose X فعال است؟") وجود ندارد. در federation projection که نیاز به بررسی consent برای هزاران customer دارد، این قابلیت حیاتی است.
- **کد**: `consent/consent-check.service.ts:checkMultiplePurposes()` (خطوط ۵۵-۶۰): برای یک `customerId` با چند `purpose` کار می‌کند — اما نه برای چند `customerId`. `customer-360.controller.ts:checkConsent()` (خطوط ۱۲۳-۱۳۷): فقط یک `customerId` و یک `purpose`. هیچ bulk endpoint‌ای وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ پذیرش consent status از سمت کلاینت
- **اندپوینت**: `POST /customer-360/:customerId/consents`
- **اشکال**: در request body، `status` می‌تواند `granted|denied` باشد و default آن `granted` است. این فیلد باید از سمت سرور بر اساس عملیات (مثلاً اگر customer در پورتال deny می‌کند) set شود، نه از سمت کلاینت API. یک کلاینت مخرب می‌تواند consent را به‌صورت `granted` ثبت کند حتی اگر customer آن را deny کرده باشد.
- **کد**: `customer-360.controller.ts:recordConsent()` (خط ۷۷): `body: { purpose: string; status?: 'granted' | 'denied'; ... }` — `status` از سمت کلاینت پذیرفته می‌شود. `customer-360.service.ts:recordConsent()` (خط ۴۶۵): `status: params.status ?? 'granted'` — اگر کلاینت `status` نفرستد، `granted` پیش‌فرض است. هیچ validation‌ای بررسی نمی‌کند که آیا کلاینت مجاز به set کردن `status` است یا خیر.
- **وضعیت**: ✅ تأیید شد

---

## ۴. یکپارچه‌سازی و Data Aggregation

### ۴.۱ نبود مشخص بودن منبع داده‌ها (data lineage)
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: در کاتالوگ، `Downstream Services` شامل policy-service، claims-service و billing-service است. اما مشخص نیست این داده‌ها چگونه aggregate می‌شوند: آیا از طریق sync API call است؟ event-driven projection؟ read model؟ اگر یک سرویس down باشد، چه اتفاقی می‌افتد؟ آیا داده‌های آن سرویس stale نمایش داده می‌شود یا خطا برگردانده می‌شود؟ این ambiguity در production می‌تواند به داده‌های ناقص و گمراه‌کننده منجر شود.
- **کد**: `customer-360.service.ts:getCustomer360Profile()` (خطوط ۴۲-۵۵): از `Promise.allSettled()` برای fetch موازی از ۱۲ منبع استفاده می‌کند (profile, policies, claims, payments, complaints, amlStatus, kycStatus, journey, relationships, riskProfile, preferences, consent). `metadata.dataSource = 'aggregated'` (خط ۷۵) و `metadata.errors` (خط ۸۲) failed sources را لیست می‌کند. اما مشخص نیست هر آیتم در `policies` یا `claims` از کدام سرویس آمده — هیچ per-item source tag وجود ندارد.
- **وضعیت**: ✅ تأیید شد (با یادداشت: metadata شامل failed sources است اما per-item lineage غایب)

### ۴.۲ ~~نبود fallback و graceful degradation~~
- **اندپوینت**: `GET /customer-360/:customerId`
- ~~**اشکال**: اگر policy-service down باشد و customer-360 نتواند policies را fetch کند، کل endpoint خطا می‌دهد یا بخش policies خالی برمی‌گرداند؟ باید مکانیزم graceful degradation وجود داشته باشد: بخش‌هایی که قابل fetch هستند نمایش داده شوند و بخش‌های unavailable با indicator "temporarily unavailable" علامت‌گذاری شوند.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `customer-360.service.ts:getCustomer360Profile()` (خط ۴۲): `Promise.allSettled()` — اگر یک سرویس fail شود، rejected نمی‌کند. (خطوط ۵۷-۶۸): هر نتیجه `rejected` به default value (empty array یا null) تبدیل می‌شود. (خطوط ۷۰-۷۲): `failedSources` لیست می‌شود. (خط ۸۲): `(metadata as any).errors = failedSources.length > 0 ? failedSources : undefined` — failed sources در metadata نمایش داده می‌شوند. هر fetch method (مثل `getPolicies` خط ۱۴۹, `getClaims` خط ۱۶۹) در صورت خطا `[]` برمی‌گرداند.

### ۴.۳ نبود event subscription برای real-time update
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: مشخص نیست customer-360-service به event‌های policy-service، claims-service و billing-service subscribe شده است یا در هر درخواست داده‌ها را fetch می‌کند. اگر event-driven است، باید در پاسخ نشان داده شود که داده‌ها از read model به‌روز هستند. اگر fetch-on-demand است، latency بالا خواهد بود. هیچ endpoint‌ای برای trigger کردن sync دستی (مثل `POST /customer-360/:customerId/sync`) وجود ندارد.
- **کد**: `customer-360.service.ts` — تمام داده‌ها از طریق **sync HTTP API calls** fetch می‌شوند (fetch-on-demand). هیچ Kafka consumer یا event subscription برای real-time update وجود ندارد. `main.ts` (خطوط ۱۶-۳۱): Kafka فقط برای OutboxWorker (publish) پیکربندی شده، نه consumer. هیچ `POST /customer-360/:customerId/sync` endpoint‌ای وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ ~~نبود PII aggregation governance~~
- **اندپوینت**: `GET /customer-360/:customerId`، `GET /customer-360/:customerId/portfolio`
- ~~**اشکال**: این سرویس PII را از چند سرویس aggregate می‌کند. طبق `FEDERATION_AI_CONSTRAINTS.md`، cross-tenant PII نباید بدون consent منتقل شود. اما مشخص نیست customer-360-service قبل از نمایش داده‌ها، consent را بررسی می‌کند یا خیر.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `customer-360.service.ts:getCustomer360Profile()` (خط ۳۷): `await this.consentCheck.assertConsent(customerId, ConsentCheckService.PURPOSE_CUSTOMER_360)` — قبل از هر aggregation، consent check انجام می‌شود. `consent/consent-check.service.ts:assertConsent()` (خطوط ۲۵-۴۱): اگر consent granted نباشد، `ForbiddenException` با code `CONSENT_REQUIRED` پرتاب می‌کند. `getPortfolioSummary()` (خط ۳۹۲) نیز `getCustomer360Profile()` را فراخوانی می‌کند که consent check را شامل است.

---

## ۵. امنیت و دسترسی

### ۵.۱ نبود PermissionsGuard
- **اندپوینت**: تمام اندپوینت‌های `/customer-360/*`
- **اشکال**: برخلاف اکثر سرویس‌های دیگر که `JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard` دارند، customer-360-service فقط `JwtAuthGuard + AbacGuard + TenantGuard` استفاده می‌کند. نبود `PermissionsGuard` یعنی هیچ RBAC check ای انجام نمی‌شود. هر کاربر authenticated می‌تواند به تمام اندپوینت‌ها دسترسی داشته باشد مگر اینکه ABAC آن را محدود کند. این نقض اصل defense in depth است.
- **کد**: `customer-360.controller.ts` (خط ۸): `@UseGuards(JwtAuthGuard, AbacGuard, TenantGuard)` — سه guard. `app.module.ts` (خط ۳۸): `providers: [AbacGuard, TenantGuard, Customer360Service, ..., JwtAuthGuard]` — هیچ `PermissionsGuard` در providers نیست. هیچ `permissions.ts` یا `permissions.guard.ts` فایلی در سرویس وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ نبود rate limiting
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: این endpoint داده‌های حساس (PII) را برمی‌گرداند. هیچ rate limiting ای وجود ندارد. یک مهاجم با token معتبر می‌تواند هزاران customerId را به‌صورت متوالی امتحان کند و داده‌های PII زیادی استخراج کند (enumeration attack).
- **کد**: `customer-360.controller.ts` — هیچ rate limiting middleware یا guard. `main.ts` — هیچ rate-limit plugin برای Fastify. `app.module.ts` — هیچ throttle provider.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ نبود audit log برای دسترسی به PII
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: هیچ اشاره‌ای به audit logging برای دسترسی به customer 360 profile وجود ندارد. در یک سیستم با compliance requirements (مثل GDPR)، هر دسترسی به PII باید با شناسه کاربر، timestamp و purpose ثبت شود. این audit trail کاملاً غایب است.
- **کد**: `customer-360.controller.ts:getCustomerProfile()` (خطوط ۱۸-۴۱) — هیچ audit log نوشته نمی‌شود. `customer-360.service.ts:getCustomer360Profile()` (خط ۳۴): `this.logger.log(...)` — فقط application log، نه structured audit trail. هیچ `actorUserId` یا `accessPurpose` در log ذخیره نمی‌شود. هیچ audit table یا outbox event برای PII access وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم یکپارچه‌سازی با federation-service برای consent enforcement
- **اشکال**: طبق `FEDERATION_AI_CONSTRAINTS.md`، `FederationConsentService.enforceConsentBeforeProjection()` قبل از projection اجرا می‌شود. customer-360-service consent management دارد اما مشخص نیست federation-service چگونه از آن استفاده می‌کند. هیچ API ای برای federation-service جهت query کردن consent از customer-360-service تعریف نشده است.
- **کد**: `customer-360.controller.ts:checkConsent()` (خطوط ۱۲۳-۱۳۷): `GET /customer-360/:customerId/consents/check?purpose=...` — این endpoint می‌تواند توسط federation-service استفاده شود. `consent/consent-check.service.ts` — `assertConsent()` و `hasConsent()` متدها برای internal use هستند. اما هیچ documentation یا explicit integration با federation-service در کد وجود ندارد. هیچ Kafka event برای consent changes به federation-service ارسال نمی‌شود (فقط `ConsentGranted` و `ConsentRevoked` events منتشر می‌شوند).
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم دسترسی customer-portal به 360 view
- **اشکال**: customer-portal-service باید به customer 360 view دسترسی داشته باشد تا customer بتواند profile و portfolio خود را ببیند. اما `GET /customer-360/:customerId` با JWT کاربر نهایی فراخوانی می‌شود و مشخص نیست آیا customer می‌تواند فقط داده‌های خود را ببیند یا داده‌های دیگران را هم. هیچ validation ای بررسی نمی‌کند که `customerId` با identity توکن مطابقت دارد.
- **کد**: `customer-360.controller.ts:getCustomerProfile()` (خطوط ۱۸-۴۱): `@Param('customerId') customerId: string` — از path param گرفته می‌شود. `req.user` در دسترس است اما هیچ validation‌ای بررسی نمی‌کند که `customerId` با `req.user.userId` یا `req.user.sub` مطابقت دارد. `abac.guard.ts` (خط ۱۵): `if (method === 'GET') return true;` — هر کاربر authenticated می‌تواند هر customerId را query کند.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم دسترسی agent-portal به customer 360
- **اشکال**: agent-portal-service لیست customers را دارد (`GET /agent-portal/agent/:agentId/customers`) اما هیچ link‌ای به customer-360 برای مشاهده 360 view وجود ندارد. agent باید بتواند portfolio و consent customer را ببیند اما این یکپارچه‌سازی تعریف نشده است.
- **کد**: هیچ integration با agent-portal در کد customer-360-service وجود ندارد. هیچ endpoint برای agent-specific access تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم یکپارچه‌سازی با notification-service برای consent expiry
- **اشکال**: consent فیلد `expiresAt` دارد اما هیچ مکانیزمی برای ارسال notification قبل از انقضا وجود ندارد. customer-360-service باید با notification-service یکپارچه شود تا قبل از انقضای consent، customer را مطلع کند. این یکپارچه‌سازی غایب است.
- **کد**: `consent/consent-db.store.ts:withEffectiveStatus()` (خطوط ۸۹-۹۵): status را به `expired` تغییر می‌دهد اگر `expiresAt` گذشته باشد، اما این فقط در زمان read. هیچ cron job برای بررسی منظم انقضا و ارسال notification وجود ندارد. `main.ts` — هیچ scheduler. هیچ call به notification-service.
- **وضعیت**: ✅ تأیید شد

### ۶.۵ عدم یکپارچه‌سازی با reporting-service
- **اشکال**: طبق `CAPABILITY_REGISTRY.md`، قابلیت `PRT-04 Customer 360 View` به `reporting-service` نسبت داده شده با وضعیت "Skeleton" و شکاف "view یکپارچه نداریم". اما customer-360-service به‌صورت مستقل وجود دارد. این تضاد نشان می‌دهد یا دو سرویس موازی هستند یا customer-360-service جایگزین reporting-service شده است. عدم شفافیت در ownership باعث مشکلات نگهداری می‌شود.
- **کد**: هیچ integration با reporting-service در کد وجود ندارد. هیچ Kafka event برای reporting (مثل customer profile changes) منتشر نمی‌شود. فقط `ConsentGranted` و `ConsentRevoked` events منتشر می‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۶.۶ نبود endpoint برای customer merge/dedup
- **اشکال**: در یک سیستم با حجم بالا، ممکن است یک customer در چند tenant یا با چند ID ثبت شده باشد. هیچ endpoint‌ای برای merge کردن customer‌های تکراری یا dedup وجود ندارد. این قابلیت برای حفظ یکپارچگی single customer view حیاتی است اما کاملاً غایب است.
- **کد**: `customer-360.controller.ts` و `customer-360.service.ts` — هیچ merge یا dedup متدی تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۷. نقایص جدید کشف‌شده در بررسی عمیق

### ۷.۱ متدهای service تعریف‌شده اما expose‌نشده (dead code)
- **اندپوینت**: N/A (missing endpoints)
- **اشکال**: سه متد در `Customer360Service` پیاده‌سازی شده‌اند اما هیچ controller endpoint‌ای آن‌ها را فراخوانی نمی‌کند: `searchCustomers()`، `getCustomerJourneyTimeline()` و `getCustomerSummary()`. این متدها قابلیت‌های مفیدی دارند اما به‌صورت dead code باقی مانده‌اند.
- **کد**: `customer-360.service.ts:searchCustomers()` (خطوط ۵۹۱-۶۷۱) — search بر اساس `nationalId`, `phone`, `email`, `policyNumber`. `getCustomerJourneyTimeline()` (خطوط ۶۷۶-۶۸۸) — journey با time range filter. `getCustomerSummary()` (خطوط ۶۹۳-۷۰۹) — lightweight summary. `customer-360.controller.ts` — هیچ‌کدام از این متدها در controller فراخوانی نمی‌شوند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۲ PortfolioAggregatorService ثبت شده اما استفاده نمی‌شود
- **اندپوینت**: `GET /customer-360/:customerId/portfolio`
- **اشکال**: `PortfolioAggregatorService` در `app.module.ts` به‌عنوان provider ثبت شده و export شده، اما هیچ controller یا service‌ای از آن استفاده نمی‌کند. `getPortfolioSummary()` در `Customer360Service` به‌جای استفاده از `PortfolioAggregatorService`، خودش aggregation را انجام می‌دهد. این یک dead service است.
- **کد**: `app.module.ts` (خط ۱۲): `import { PortfolioAggregatorService }` و (خط ۳۸): `providers: [..., PortfolioAggregatorService, ...]` و (خط ۳۹): `exports: [..., PortfolioAggregatorService]`. `consent/portfolio-aggregator.service.ts:aggregatePortfolio()` (خطوط ۲۸-۸۶) — متد کامل با consent check و partial failure handling. اما `customer-360.controller.ts:getPortfolioSummary()` (خط ۵۳): `this.customer360Service.getPortfolioSummary(customerId, authToken)` — از `Customer360Service` استفاده می‌کند، نه `PortfolioAggregatorService`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۳ double-fetch داده‌های downstream در getJourney
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: `getJourney()` به‌صورت جداگانه `getPolicies()`، `getClaims()` و `getPayments()` را فراخوانی می‌کند، در حالی که این داده‌ها قبلاً در `getCustomer360Profile()` fetch شده‌اند. این یعنی ۳ HTTP call اضافی به downstream services در هر درخواست.
- **کد**: `customer-360.service.ts:getCustomer360Profile()` (خطوط ۴۲-۵۵): `Promise.allSettled` شامل `getJourney(customerId, authHeaders)` (خط ۵۰) و `getPolicies(customerId, authHeaders)` (خط ۴۳). `getJourney()` (خطوط ۲۵۴-۳۲۲): در خط ۲۶۰ `getPolicies()` را دوباره فراخوانی می‌کند، در خط ۲۸۱ `getClaims()` و در خط ۳۰۲ `getPayments()`. این یعنی policies، claims و payments هر کدام **دو بار** fetch می‌شوند.
- **وضعیت**: ✅ تأیید شد (نقص جدید — عملکردی)

### ۷.۴ عدم تطابق پاسخ portfolio با کاتالوگ اندپوینت
- **اندپوینت**: `GET /customer-360/:customerId/portfolio`
- **اشکال**: کاتالوگ اندپوینت پاسخ portfolio را با فیلدهای `totalPaid`, `outstandingBalance`, `policiesByProduct`, `claimsByStatus` مستند کرده است، اما کد واقعی فیلدهای متفاوتی برمی‌گرداند: `totalCoverage`, `totalClaimAmount`, `paidClaims`, `outstandingClaims`, `totalPayments`, `netPosition`, `assets`, `riskMetrics`. عدم تطابق کامل بین کاتالوگ و کد.
- **کد**: کاتالوگ `doc/endpoint_catalog/customer-360-service.md` (خطوط ۷۷-۸۷): `totalPaid`, `outstandingBalance`, `policiesByProduct`, `claimsByStatus`. `customer-360.service.ts:getPortfolioSummary()` (خطوط ۴۲۳-۴۴۴): `totalCoverage`, `totalClaimAmount`, `paidClaims`, `outstandingClaims`, `totalPayments`, `netPosition`, `assets: { vehicles, properties, lifeSumAssured }`, `riskMetrics: { overallRiskScore, riskCategory, amlStatus, kycStatus }`.
- **وضعیت**: ✅ تأیید شد (نقص جدید — مستندات)

### ۷.۵ عدم تطابق پاسخ profile با کاتالوگ اندپوینت
- **اندپوینت**: `GET /customer-360/:customerId`
- **اشکال**: کاتالوگ پاسخ profile را با فیلدهای `tenantId`, `contact: { phoneNumber, email, address }` مستند کرده، اما کد واقعی ساختار متفاوتی دارد: `nationalId` در سطح root، `profile` شامل `firstName`, `lastName`, `dateOfBirth`, `primaryPhone`, `email` و فیلدهای اضافی مثل `complaints`, `amlStatus`, `kycStatus`, `journey`, `relationships`, `riskProfile`, `preferences`, `consent`, `metadata` که در کاتالوگ ذکر نشده‌اند.
- **کد**: کاتالوگ (خطوط ۳۵-۵۴): `tenantId`, `contact: { phoneNumber, email, address }`, `policies`, `claims`, `payments`. `customer-360.service.ts:getCustomer360Profile()` (خطوط ۸۴-۱۰۰): `nationalId`, `profile`, `policies`, `claims`, `payments`, `complaints`, `amlStatus`, `kycStatus`, `journey`, `relationships`, `riskProfile`, `preferences`, `consent`, `metadata`. `models/Customer360Profile.ts` (خطوط ۶-۲۲): interface شامل ۱۳ فیلد.
- **وضعیت**: ✅ تأیید شد (نقص جدید — مستندات)

### ۷.۶ عدم tenantId filtering در consent operations
- **اندپوینت**: `GET /customer-360/:customerId/consents`، `POST /customer-360/:customerId/consents`، `POST /customer-360/:customerId/consents/:consentId/revoke`، `GET /customer-360/:customerId/consents/check`
- **اشکال**: عملیات consent هیچ tenantId filtering انجام نمی‌دهد. `listConsents()` و `checkConsent()` فقط بر اساس `customerId` فیلتر می‌کنند، بدون `tenantId`. یک کاربر از tenant A می‌تواند consent‌های customer در tenant B را ببیند یا تغییر دهد.
- **کد**: `customer-360.controller.ts:listConsents()` (خط ۶۷): `this.customer360Service.listConsents(customerId)` — فقط `customerId`. `consent/consent-db.store.ts:list()` (خطوط ۲۳-۲۹): `where: { customerId }` — فقط `customerId`. `check()` (خطوط ۳۱-۴۶): `where: { customerId, purpose }` — فقط `customerId` و `purpose`. `revoke()` (خطوط ۷۳-۸۷): `where: { consentId, customerId }` — فقط `consentId` و `customerId`. هیچ `tenantId` در query‌ها استفاده نمی‌شود. `entities/ConsentRecordEntity.ts` (خط ۵۰): `tenantId` فیلد وجود دارد اما در query‌ها استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید — امنیتی)

### ۷.۷ AbacGuard تمام GET request‌ها را بدون بررسی مجاز می‌کند
- **اندپوینت**: تمام `GET /customer-360/*`
- **اشکال**: `AbacGuard` برای تمام GET request‌ها بدون هیچ بررسی `return true` می‌کند. این یعنی هر کاربر authenticated می‌تواند profile هر customer را ببیند، بدون هیچ attribute-based check.
- **کد**: `abac.guard.ts` (خط ۱۵): `if (method === 'GET') return true;` — تمام GET request‌ها مجاز. (خطوط ۱۸-۲۶): برای state-changing operations، فقط admin roles یا هر کاربر با role چک می‌شود — اما این هم بسیار permissive است.
- **وضعیت**: ✅ تأیید شد (نقص جدید — امنیتی)

### ۷.۸ outbox event در transaction جداگانه از consent write
- **اندپوینت**: `POST /customer-360/:customerId/consents`، `POST /customer-360/:customerId/consents/:consentId/revoke`
- **اشکال**: در `recordConsent()`، consent ابتدا ذخیره می‌شود و سپس outbox event در یک transaction جداگانه منتشر می‌شود. اگر transaction دوم fail شود، consent ذخیره شده اما event گم می‌شود. این نقض اصل transactional outbox است.
- **کد**: `customer-360.service.ts:recordConsent()` (خط ۴۷۴): `const saved = await this.consentDbStore.add(record)` — consent ذخیره می‌شود (بدون transaction صریح). سپس (خطوط ۴۷۸-۵۰۱): `await this.dataSource.transaction(async (manager) => { const outbox = new OutboxPublisher(manager); await outbox.publish(...) })` — outbox event در یک **transaction جداگانه**. `revokeConsent()` (خطوط ۵۰۸-۵۳۸) — همانند: `consentDbStore.revoke()` (خط ۵۰۹) سپس outbox transaction (خطوط ۵۱۳-۵۳۳).
- **وضعیت**: ✅ تأیید شد (نقص جدید — transactional consistency)

### ۷.۹ نبود validation برای customerId و consentId format
- **اندپوینت**: تمام اندپوینت‌های `/customer-360/:customerId/*`
- **اشکال**: هیچ validation‌ای برای فرمت `customerId` یا `consentId` وجود ندارد. این پارامترها به‌صورت رشته آزاد پذیرفته می‌شوند و مستقیماً به database query یا downstream HTTP call پاس می‌شوند.
- **کد**: `customer-360.controller.ts` — تمام `@Param('customerId') customerId: string` بدون هیچ validation annotation یا pipe. `customer-360.service.ts:getCustomer360Profile()` (خط ۱۱۰): `this.httpService.get(\`${partyKycUrl}/parties/${customerId}\`)` — `customerId` مستقیماً در URL استفاده می‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۱۰ consent check در `checkConsent` endpoint از tenantId استفاده نمی‌کند
- **اندپوینت**: `GET /customer-360/:customerId/consents/check`
- **اشکال**: `checkConsent` endpoint هیچ tenantId validation انجام نمی‌دهد. یک کاربر می‌تواند consent status هر customer در هر tenant را بررسی کند.
- **کد**: `customer-360.controller.ts:checkConsent()` (خطوط ۱۲۳-۱۳۷): `this.customer360Service.checkConsent(customerId, purpose)` — فقط `customerId` و `purpose`. هیچ `tenantId` از `req.user` استخراج یا استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید — امنیتی)
