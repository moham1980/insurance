# Catalog BFF — تحلیل نقایص اندپوینت‌ها

**سرویس**: catalog-bff  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/catalog-bff/src/`

---

## ۱. Product Endpoints

### ۱.۱ ~~عدم فیلتر بر اساس tenant و organization در لیست products~~
- **اندپوینت**: `GET /api/v1/catalog/products`
- ~~**اشکال**: لیست products فقط فیلتر `lineOfBusiness` و `status` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `tenantId` یا `insurerOrganizationId` وجود ندارد.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `catalog.service.ts:91-105` — تابع `listProducts` ابتدا `requireTenant(user)` را فراخوانی می‌کند (خط ۹۲) و `tenantId` را از JWT استخراج می‌کند. سپس در URL به downstream آن را اضافه می‌کند: `tenantId=${encodeURIComponent(tenantId)}` (خط ۱۰۰). همچنین `ownerOrganizationId` به‌عنوان query param اختیاری پشتیبانی می‌شود (خط ۹۴: `query.ownerOrganizationId`). با این حال، فیلتر tenant به downstream delegate شده و BFF خودش هیچ فیلتری روی response اعمال نمی‌کند.

### ۱.۲ عدم تفکیک broker-facing vs customer-facing products
- **اندپوینت**: `GET /api/v1/catalog/products`
- **اشکال**: این endpoint هم برای broker و هم برای customer قابل دسترسی است اما هیچ تفکیکی در response وجود ندارد. broker نیاز به اطلاعات فنی (rate tables، commission structure، underwriting rules) دارد در حالی که customer فقط نیاز به اطلاعات نمایشی (name، description، price range) دارد. ارسال داده فنی به customer باعث سردرگمی و افشای اطلاعات تجاری حساس می‌شود.
- **کد**: `catalog.controller.ts:27-33` — `listProducts` فقط `query` را به `catalogService.listProducts` پاس می‌دهد؛ `catalog.service.ts:91-105` — هیچ role-based projection روی response اعمال نمی‌شود؛ `toUser` در `catalog.controller.ts:5-14` نقش‌ها (`roles`) و `capabilities` را استخراج می‌کند اما در service برای فیلتر کردن response استفاده نمی‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم projection و field selection
- **اندپوینت**: `GET /api/v1/catalog/products`، `GET /api/v1/catalog/products/:productId`
- **اشکال**: هیچ مکانیزمی برای field projection (select فیلدهای خاص) وجود ندارد. response همیشه تمام فیلدها را برمی‌گرداند. این برای موبایل و frontend‌های سبک باعث over-fetching و افزایش latency می‌شود.
- **کد**: `catalog.service.ts:91-105` و `107-117` — هیچ پارامتر `fields` یا projection در query پشتیبانی نمی‌شود؛ response به‌صورت `res?.data ?? res` مستقیماً pass-through می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم pagination metadata
- **اندپوینت**: `GET /api/v1/catalog/products`
- **اشکال**: `limit` و `offset` پشتیبانی می‌شود اما BFF هیچ `total` count یا `hasMore` flag به response اضافه نمی‌کند. BFF response را به‌صورت pass-through برمی‌گرداند و metadata pagination اضافه نمی‌کند.
- **کد**: `catalog.service.ts:93` — `normalizePaging` فقط `limit` و `offset` را normalize می‌کند (limit max 200، offset min 0)؛ `catalog.service.ts:102` — `const data = res?.data ?? res` بدون اضافه کردن pagination metadata.
- **وضعیت**: ✅ تأیید شد (BFF metadata اضافه نمی‌کند؛ وجود metadata در downstream وابسته به product-service است)

### ۱.۵ ~~عدم caching برای product details~~
- **اندپوینت**: `GET /api/v1/catalog/products/:productId`
- ~~**اشکال**: product details به ندرت تغییر می‌کنند اما هیچ caching mechanism ای در BFF تعریف نشده است.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `catalog.service.ts:28-53` — یک in-memory cache با TTL پیاده‌سازی شده است. `getProduct` (خط ۱۰۹): `const cacheKey = 'product:${productId}'` و `getCached`/`setCached` برای ذخیره و بازیابی. `listProducts` نیز cache دارد (خط ۹۷-۱۰۳). TTL قابل پیکربندی با `CATALOG_CACHE_TTL_MS` (پیش‌فرض ۶۰۰۰۰ms). متد `invalidateCache` (خط ۴۵-۵۳) برای invalidation دستی وجود دارد. **نکته**: این cache per-instance و in-memory است و بین چند instance هماهنگ نیست (نقص ۱.۶ را ببینید).

### ۱.۶ (جدید) cache توزیع‌نشده و عدم invalidation رویدادمحور
- **اندپوینت**: `GET /api/v1/catalog/products`، `GET /api/v1/catalog/products/:productId`، `GET /api/v1/catalog/offerings/:offeringId/comparison-hint`
- **اشکال**: cache به‌صورت in-memory و per-instance پیاده‌سازی شده (`Map<string, {data, expiresAt}>`). اگر چند instance از BFF اجرا شود، هر کدام cache جداگانه‌ای دارند و invalidation یک instance روی دیگری اثر نمی‌گذارد. همچنین هیچ event-driven invalidation وجود ندارد — متد `invalidateCache` وجود دارد اما هیچ event handler آن را فراخوانی نمی‌کند.
- **کد**: `catalog.service.ts:29` — `private cache = new Map<string, { data: any; expiresAt: number }>()`؛ `catalog.service.ts:45-53` — `invalidateCache` تعریف شده اما هیچ pub/sub یا event listener آن را صدا نمی‌زند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۲. Distributor Visible Products

### ۲.۱ عدم validation distributorOrganizationId با identity کاربر
- **اندپوینت**: `GET /api/v1/catalog/distributors/:distributorOrganizationId/visible-products`
- **اشکال**: `distributorOrganizationId` در path param ارسال می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا کاربر احراز هویت شده به این organization تعلق دارد یا خیر. یک کاربر می‌تواند با ارسال `distributorOrganizationId` متعلق به سازمان دیگر، products قابل دسترسی آن سازمان را ببیند (IDOR vulnerability).
- **کد**: `catalog.controller.ts:44-55` — `distributorOrganizationId` از `@Param` گرفته می‌شود و مستقیماً به service پاس می‌شود؛ `catalog.service.ts:119-127` — `listDistributorVisibleProducts` فقط `requireTenant(user)` را صدا می‌زند (خط ۱۲۰) اما هیچ مقایسه‌ای بین `user.organizationId` و `distributorOrganizationId` انجام نمی‌دهد. `user.organizationId` در `toUser` (خط ۹) استخراج می‌شود اما در service استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم فیلتر بر اساس distribution agreement status
- **اندپوینت**: `GET /api/v1/catalog/distributors/:distributorOrganizationId/visible-products`
- **اشکال**: visible products باید بر اساس distribution agreement فعال فیلتر شوند. BFF پارامتر `agreementId` را به downstream پاس می‌دهد اما هیچ فیلتری بر اساس status agreement در سطح BFF اعمال نمی‌کند. این مسئولیت downstream است اما BFF نیز می‌تواند defense-in-depth ارائه دهد.
- **کد**: `catalog.service.ts:123` — `query.agreementId` به URL اضافه می‌شود اما هیچ فیلتر status در BFF وجود ندارد.
- **وضعیت**: ✅ تأیید شد (با یادداشت: فیلتر status مسئولیت مشترک BFF و downstream است)

### ۲.۳ عدم نمایش commission rate و terms
- **اندپوینت**: `GET /api/v1/catalog/distributors/:distributorOrganizationId/visible-products`
- **اشکال**: BFF response را به‌صورت pass-through از product-service برمی‌گرداند و هیچ enrichment برای commission rate یا terms اضافه نمی‌کند. کارگزار قبل از انتخاب product باید بداند commission چقدر است. (نکته: در `getOfferingComparisonHint` commissionTiers نمایش داده می‌شود اما در visible-products خیر.)
- **کد**: `catalog.service.ts:126` — `return res?.data ?? res` بدون enrichment؛ در مقابل `getOfferingComparisonHint` (خط ۱۷۷) `commissionTiers` را در hint شامل می‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Offering Endpoints

### ۳.۱ عدم تفکیک broker offerings vs customer offerings در query
- **اندپوینت**: `GET /api/v1/catalog/offerings`، `GET /api/v1/catalog/customer-offerings`
- **اشکال**: دو endpoint جداگانه برای broker offerings و customer offerings وجود دارد اما هر دو از همان `JwtAuthGuard` استفاده می‌کنند و هیچ role-based check ای وجود ندارد. اگر یک customer به `/offerings` (broker endpoint) دسترسی پیدا کند، داده‌های فنی broker را می‌بیند.
- **کد**: `catalog.controller.ts:23` — `@UseGuards(JwtAuthGuard)` در سطح controller برای تمام endpoints؛ `catalog.controller.ts:57-63` — `listBrokerOfferings` و `catalog.controller.ts:78-84` — `listCustomerOfferings` هر دو فقط `JwtAuthGuard` دارند؛ هیچ RolesGuard یا permission check وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ ~~عدم فیلتر بر اساس distributor در offerings~~
- **اندپوینت**: `GET /api/v1/catalog/offerings`
- ~~**اشکال**: offerings فقط فیلتر `lineOfBusiness` و `insurerId` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `distributorOrganizationId` یا `brokerOrganizationId` وجود ندارد.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `catalog.service.ts:132` — `listBrokerOfferings` پارامتر `brokerOrganizationId` را پشتیبانی می‌کند: `query.brokerOrganizationId ? '&brokerOrganizationId=...'`. همچنین `status` (خط ۱۳۴) با پیش‌فرض `active` پشتیبانی می‌شود. با این حال، `distributorOrganizationId` به‌طور خاص پشتیبانی نمی‌شود و هیچ فیلتر خودکار بر اساس organization کاربر احراز‌شده وجود ندارد (پارامتر اختیاری است و اگر ارسال نشود، تمام offerings برمی‌گردد).

### ۳.۳ عدم comparison hint با multiple offerings
- **اندپوینت**: `GET /api/v1/catalog/offerings/:offeringId/comparison-hint`
- **اشکال**: comparison hint فقط برای یک offering واحد قابل دریافت است. در عمل، کارگزار نیاز به مقایسه چند offering به‌طور همزمان دارد. باید endpoint‌ای برای `POST /api/v1/catalog/offerings/compare` با لیست offeringId‌ها وجود داشته باشد.
- **کد**: `catalog.controller.ts:65-76` — `@Get('/offerings/:offeringId/comparison-hint')` فقط یک `offeringId` را از path param می‌گیرد؛ هیچ bulk comparison endpoint ای وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم نمایش pricing و coverage details در offerings
- **اندپوینت**: `GET /api/v1/catalog/offerings`
- **اشکال**: BFF response را به‌صورت pass-through از product-service برمی‌گرداند و هیچ enrichment برای pricing، coverage limits، deductibles و terms اضافه نمی‌کند. یک offering بدون اطلاعات قیمت و پوشش برای کارگزار بی‌فایده است.
- **کد**: `catalog.service.ts:136-137` — `const res = await this.get(url, user.authorization); return res?.data ?? res` — pass-through بدون enrichment.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Distribution Agreement Eligibility

### ۴.۱ عدم لیست distribution agreements
- **اندپوینت**: `GET /api/v1/catalog/distribution-agreements/:agreementId/eligibility`
- **اشکال**: فقط eligibility یک agreement خاص قابل بررسی است. هیچ اندپوینتی برای لیست کردن تمام distribution agreement‌های فعال برای یک distributor وجود ندارد.
- **کد**: `catalog.controller.ts:86-97` — تنها endpoint مرتبط `getAgreementEligibility` است که یک `agreementId` خاص را بررسی می‌کند؛ هیچ list endpoint برای agreements وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم eligibility check پیش از quote
- **اندپوینت**: `GET /api/v1/catalog/distribution-agreements/:agreementId/eligibility`
- **اشکال**: eligibility check به‌صورت pull-based است. هیچ مکانیزمی در BFF وجود ندارد که هنگام quote یا issue، به‌طور خودکار eligibility را بررسی کند. این مسئولیت سرویس‌های downstream (مثل submission-placement-service) است.
- **کد**: `catalog.service.ts:152-158` — `getAgreementEligibility` فقط یک GET request به downstream می‌فرستد؛ هیچ hook یا middleware برای enforcement وجود ندارد.
- **وضعیت**: ✅ تأیید شد (مسئولیت مشترک با downstream)

### ۴.۳ عدم نمایش reasons در eligibility failure
- **اندپوینت**: `GET /api/v1/catalog/distribution-agreements/:agreementId/eligibility`
- **اشکال**: BFF response را به‌صورت pass-through برمی‌گرداند و اگر `eligible: false` باشد، هیچ reason یا توضیحی اضافه نمی‌کند. وجود reasons در downstream وابسته به sales-network-service است.
- **کد**: `catalog.service.ts:157` — `return res?.data ?? res` — pass-through بدون enrichment.
- **وضعیت**: ✅ تأیید شد (BFF reasons اضافه نمی‌کند؛ وابسته به downstream)

---

## ۵. امنیت و RBAC

### ۵.۱ عدم RBAC در سطح endpoint
- **اندپوینت**: تمام endpoints
- **اشکال**: تمام endpoints فقط `JwtAuthGuard` دارند و هیچ role-based یا permission-based check وجود ندارد. یک customer می‌تواند به `/api/v1/catalog/offerings` (broker endpoint) دسترسی پیدا کند. باید هر endpoint با permission خاص محافظت شود.
- **کد**: `catalog.controller.ts:23` — `@UseGuards(JwtAuthGuard)` در سطح controller؛ `jwt-auth.guard.ts:28-72` — `JwtAuthGuard` فقط JWT را verify می‌کند و `request.user` را set می‌کند، هیچ بررسی role یا permission انجام نمی‌دهد. `toUser` در `catalog.controller.ts:5-14` نقش‌ها را استخراج می‌کند اما در هیچ endpoint ای استفاده نمی‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ ~~عدم tenant isolation در BFF~~
- **اندپوینت**: تمام endpoints
- ~~**اشکال**: BFF فقط JWT را validate می‌کند اما مشخص نیست که tenantId از token استخراج و به downstream forward می‌شود یا خیر.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `catalog.service.ts:11-15` — تابع `requireTenant` در تمام متدهای service فراخوانی می‌شود (خطوط ۹۲، ۱۰۸، ۱۲۰، ۱۳۰، ۱۴۱، ۱۵۳، ۱۶۱) و `tenantId` را از JWT استخراج می‌کند. `catalog.service.ts:100` — `tenantId` به URL downstream اضافه می‌شود. `catalog.controller.ts:5-14` — `toUser` تابع `tenantId` را از `req.user` استخراج می‌کند. **نکته**: tenantId به‌صورت query param به downstream پاس می‌شود، نه به‌صورت header (نقص ۵.۴).

### ۵.۳ عدم rate limiting در BFF
- **اندپوینت**: تمام endpoints
- **اشکال**: هیچ rate limiting ای در سطح BFF تعریف نشده است. اگر api-gateway rate limit را bypass کند، BFF بدون محافظت است.
- **کد**: `main.ts:7` — `new FastifyAdapter()` بدون هیچ rate-limit plugin؛ هیچ `@fastify/rate-limit` ثبت نشده است.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ (جدید) عدم forward کردن X-Correlation-Id و X-Tenant-Id به downstream
- **اندپوینت**: تمام endpoints
- **اشکال**: متدهای `get` و `post` در CatalogService فقط `authorization` و `content-type` را به downstream forward می‌کنند. `X-Correlation-Id` و `X-Tenant-Id` به downstream ارسال نمی‌شوند. این باعث می‌شود downstream نتواند request را trace کند یا tenant را از header استخراج کند (tenant فقط به‌صورت query param ارسال می‌شود).
- **کد**: `catalog.service.ts:55-69` — متد `get`: فقط `authorization` و `content-type` در headers؛ `catalog.service.ts:71-85` — متد `post`: فقط `authorization` و `content-type`. `correlationId` در controller استخراج می‌شود (خط ۱۷-۲۰) اما به service پاس داده نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۵.۵ (جدید) مقدار پیش‌فرض ناامن برای JWT_SECRET
- **اندپوینت**: تمام endpoints (JWT verification)
- **اشکال**: اگر `JWT_SECRET` تنظیم نشده باشد، از مقدار پیش‌فرض `'default-secret-change-in-production'` استفاده می‌شود. این مقدار در کد سورس موجود است و هر کسی می‌تواند توکن HS256 معتبر جعل کند.
- **کد**: `jwt-auth.guard.ts:14` — `this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';`
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۵.۶ (جدید) عدم validation issuer و audience در fallback HS256
- **اندپوینت**: تمام endpoints (JWT verification)
- **اشکال**: در مسیر RS256، issuer و audience validate می‌شوند (خط ۴۷-۴۹). اما در fallback HS256 (خط ۶۱)، فقط `algorithms: ['HS256']` بررسی می‌شود و issuer و audience validate نمی‌شوند. این یعنی یک توکن HS256 صادر شده توسط هر سرویسی (با همان secret) قابل قبول است.
- **کد**: `jwt-auth.guard.ts:61` — `jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] })` — برخلاف RS256 که `{ issuer: this.issuer, audience: this.audience, algorithms: ['RS256'] }` دارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۵.۷ (جدید) نشت متن خطای downstream در response
- **اندپوینت**: تمام endpoints
- **اشکال**: متدهای `get` و `post` در صورت خطای upstream، متن خام response را در `BadRequestException` قرار می‌دهند که ممکن است اطلاعات داخلی downstream (stack trace، مسیر فایل، جزئیات دیتابیس) را به client افشا کند.
- **کد**: `catalog.service.ts:65-66` — `const text = await res.text(); throw new BadRequestException({ success: false, error: { code: 'UPSTREAM_ERROR', message: text } })`؛ مشابه در `post` (خط ۸۱-۸۲).
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۶. بهینه‌سازی و یکپارچه‌سازی

### ۶.۱ عدم bulk fetch برای products و offerings
- **اندپوینت**: `GET /api/v1/catalog/products`، `GET /api/v1/catalog/offerings`
- **اشکال**: هیچ bulk endpoint‌ای برای fetch کردن چند product یا offering با یک request وجود ندارد. اگر frontend نیاز به نمایش 20 product داشته باشد، باید 20 request جداگانه به `GET /products/:productId` بفرستد که باعث N+1 problem می‌شود.
- **کد**: `catalog.controller.ts:35-42` — `getProduct` فقط یک `productId` را می‌گیرد؛ هیچ `POST /products/batch` یا `GET /products?ids=...` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم search و full-text query
- **اندپوینت**: `GET /api/v1/catalog/products`
- **اشکال**: هیچ پارامتر `search` یا `q` برای جستجوی full-text در products وجود ندارد. کارگزار فقط می‌تواند با فیلتر `lineOfBusiness` فیلتر کند.
- **کد**: `catalog.service.ts:91-105` — `listProducts` فقط `lineOfBusiness`، `status`، `ownerOrganizationId` را پشتیبانی می‌کند؛ هیچ پارامتر `search` یا `q` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم یکپارچه‌سازی با product-service برای versioned products
- **اشکال**: BFF با product-service یکپارچه است اما در `listProducts` و `getProduct` هیچ awareness از product versioning ندارد. (نکته: `listDistributorVisibleProducts` پارامتر `productVersion` را پشتیبانی می‌کند اما سایر endpoints خیر.)
- **کد**: `catalog.service.ts:122` — `listDistributorVisibleProducts` پارامتر `productVersion` را پشتیبانی می‌کند؛ `catalog.service.ts:91-105` و `107-117` — `listProducts` و `getProduct` هیچ پارامتر version ندارند.
- **وضعیت**: ✅ تأیید شد (با یادداشت: distributor endpoint نسخه را پشتیبانی می‌کند)

### ۶.۴ عدم ETag / conditional GET
- **اندپوینت**: `GET /api/v1/catalog/products`، `GET /api/v1/catalog/products/:productId`
- **اشکال**: هیچ ETag یا `Last-Modified` header‌ای پشتیبانی نمی‌شود. اگر داده تغییر نکرده باشد، همچنان response کامل ارسال می‌شود.
- **کد**: `catalog.controller.ts:27-42` — هیچ `@Header('ETag')` یا handling `If-None-Match` وجود ندارد؛ `catalog.service.ts` هیچ ETag generation انجام نمی‌دهد.
- **وضعیت**: ✅ تأیید شد

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ عدم تفکیک دسترسی broker-portal-bff
- **اشکال**: `broker-portal-bff` به catalog-bff متصل است اما BFF هیچ consumer-specific ACL تعریف نمی‌کند. تمام consumers با همان JwtAuthGuard دسترسی یکسان دارند.
- **کد**: `catalog.controller.ts:23` — `@UseGuards(JwtAuthGuard)` در سطح controller، بدون هیچ consumer identification یا ACL.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم دسترسی customer-portal-bff به customer-offerings
- **اشکال**: `customer-portal-bff` برای نمایش products به مشتری باید به `/api/v1/catalog/customer-offerings` دسترسی داشته باشد اما در کاتالوگ customer-portal-bff هیچ ارجاعی به catalog-bff وجود ندارد. این نشان می‌دهد یکپارچه‌سازی بین customer-portal-bff و catalog-bff تعریف نشده است.
- **کد**: `catalog.controller.ts:78-84` — endpoint `/customer-offerings` وجود دارد اما هیچ restriction یا consumer identification برای اطمینان از اینکه فقط customer-portal-bff آن را فراخوانی می‌کند، وجود ندارد.
- **وضعیت**: ✅ تأیید شد (از منظر catalog-bff قابل تأیید است که endpoint بدون consumer ACL است)

### ۷.۳ ~~عدم یکپارچه‌سازی با submission-placement-service برای offering context~~
- ~~**اشکال**: offerings از submission-placement-service fetch می‌شوند اما BFF هیچ context از submission جاری را به offering request اضافه نمی‌کند.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: `catalog.service.ts:25-26` — offerings از `productServiceUrl` (پیش‌فرض `http://localhost:18018`) fetch می‌شوند، نه از submission-placement-service. `getAgreementEligibility` از `salesNetworkServiceUrl` (پیش‌فرض `http://localhost:3022`) استفاده می‌کند. کاتالوگ قدیمی به‌اشتباه submission-placement-service را به‌عنوان downstream برای offerings ذکر کرده بود. با این حال، نقص اصلی (عدم افزودن submission context به offering request) همچنان معتبر است زیرا BFF هیچ context از submission جاری به downstream اضافه نمی‌کند.

### ۷.۴ عدم notification به BFF هنگام تغییر product یا agreement
- **اشکال**: وقتی یک product در product-service غیرفعال می‌شود یا یک distribution agreement منقضی می‌شود، هیچ event یا webhook‌ای به catalog-bff ارسال نمی‌شود. BFF ممکن است داده stale را cache کرده و به کارگزار نمایش دهد. متد `invalidateCache` وجود دارد اما هیچ event handler آن را فراخوانی نمی‌کند.
- **کد**: `catalog.service.ts:45-53` — `invalidateCache` تعریف شده اما هیچ Kafka consumer یا event listener در `main.ts` یا `app.module.ts` ثبت نشده است.
- **وضعیت**: ✅ تأیید شد
