# Partner Gateway — تحلیل نقایص اندپوینت‌ها

**سرویس**: partner-gateway  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/partner-gateway/src/`

---

## ۱. Partner Registration و Management

### ۱.۱ عدم احراز هویت در partner registration
- **اندپوینت**: `POST /partner-gateway/partners`
- **اشکال**: این endpoint public است و هیچ احراز هویتی ندارد. هر کسی می‌تواند یک partner جدید ثبت کند. در یک سیستم federation، ثبت partner باید توسط admin یا tenant owner تایید شود.
- **کد**: `partner-gateway.controller.ts:24-29` — `@Post('partners')` بدون `@UseGuards`؛ `partner-gateway.service.ts:33-60` — `registerPartner` مستقیماً partner را با `status: 'active'` در دیتابیس ذخیره می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم validation tenantId در registration
- **اندپوینت**: `POST /partner-gateway/partners`
- **اشکال**: `tenantId` در request body توسط client ارسال می‌شود و هیچ validation ای بررسی نمی‌کند که آیا این tenant وجود دارد یا آیا client مجاز به ثبت partner در این tenant است یا خیر.
- **کد**: `partner-gateway.service.ts:33-60` — `registerPartner(dto)` مستقیماً `dto.tenantId` را در entity ذخیره می‌کند (خط ۴۳: `tenantId: dto.tenantId`)؛ هیچ tenant existence check یا authorization check.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم approval workflow در partner registration
- **اندپوینت**: `POST /partner-gateway/partners`
- **اشکال**: partner بلافاصله با `status: active` ایجاد می‌شود. هیچ approval workflow یا pending state وجود ندارد.
- **کد**: `partner-gateway.service.ts:52` — `status: 'active'` به‌صورت hardcoded در `registerPartner`؛ `entities/PartnerRegistration.ts:4` — `PartnerStatus = 'active' | 'suspended' | 'revoked'` — هیچ وضعیت `pending` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم احراز هویت در partner management endpoints
- **اندپوینت**: `GET /partner-gateway/partners`، `GET /partner-gateway/partners/:partnerId`، `PUT /partner-gateway/partners/:partnerId`، `POST /partner-gateway/partners/:partnerId/revoke`، `POST /partner-gateway/partners/:partnerId/suspend`، `POST /partner-gateway/partners/:partnerId/activate`
- **اشکال**: تمام این endpoints public هستند و هیچ احراز هویتی ندارند. هر کسی می‌تواند لیست partner‌ها را ببیند، آن‌ها را update، revoke، suspend یا activate کند.
- **کد**: `partner-gateway.controller.ts:31-81` — هیچکدام از این endpoints `@UseGuards` ندارند؛ تنها `token-exchange` (خط ۱۳۸) `@UseGuards(FederationSignatureGuard)` دارد. `listPartners` (خط ۳۲) فقط `x-tenant-id` header را الزامی می‌کند (خط ۳۵) اما هیچ auth check ای انجام نمی‌دهد.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ عدم validation ownership در update و revoke
- **اندپوینت**: `PUT /partner-gateway/partners/:partnerId`، `POST /partner-gateway/partners/:partnerId/revoke`، `POST /partner-gateway/partners/:partnerId/suspend`
- **اشکال**: `partnerId` در path ارسال می‌شود و هیچ validation ای بررسی نمی‌کند که آیا فراخوانی‌کننده مجاز به مدیریت این partner است یا خیر.
- **کد**: `partner-gateway.controller.ts:47-81` — `updatePartner`، `revokePartner`، `suspendPartner`، `activatePartner` همگی فقط `partnerId` را از path می‌گیرند و مستقیماً به service پاس می‌دهند؛ `partner-gateway.service.ts:76-108` — هیچ ownership یا authorization check در service.
- **وضعیت**: ✅ تأیید شد

### ۱.۶ عدم pagination در لیست partners
- **اندپوینت**: `GET /partner-gateway/partners`
- **اشکال**: لیست partners هیچ pagination را پشتیبانی نمی‌کند.
- **کد**: `partner-gateway.service.ts:72-74` — `listPartners` فقط `this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' } })` را اجرا می‌کند؛ هیچ `skip` یا `take`.
- **وضعیت**: ✅ تأیید شد

### ۱.۷ عدم فیلتر در لیست partners
- **اندپوینت**: `GET /partner-gateway/partners`
- **اشکال**: لیست partners فقط بر اساس `X-Tenant-Id` header فیلتر می‌شود. هیچ فیلتری بر اساس `relationshipType` یا `status` وجود ندارد.
- **کد**: `partner-gateway.controller.ts:32-38` — `listPartners` فقط `tenantId` را از header می‌گیرد؛ `partner-gateway.service.ts:72-74` — فقط `where: { tenantId }`؛ `entities/PartnerRegistration.ts:27-28` — `relationshipType` و `status` فیلد موجود هستند اما برای فیلتر استفاده نمی‌شوند.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Certificate Management

### ۲.۱ عدم احراز هویت در certificate endpoints
- **اندپوینت**: `POST /partner-gateway/partners/:partnerId/certificates`، `GET /partner-gateway/partners/:partnerId/certificates`، `POST /partner-gateway/partners/:partnerId/certificates/:certId/rotate`، `GET /partner-gateway/certificates/expiring`
- **اشکال**: تمام certificate endpoints public هستند. هر کسی می‌تواند certificate آپلود، لیست یا rotate کند.
- **کد**: `partner-gateway.controller.ts:83-135` — هیچکدام از این endpoints `@UseGuards` ندارند.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم validation publicCertPem
- **اندپوینت**: `POST /partner-gateway/partners/:partnerId/certificates`
- **اشکال**: `publicCertPem` به‌صورت string ارسال می‌شود و بدون parse یا validation در دیتابیس ذخیره می‌شود. هیچ بررسی اینکه آیا certificate معتبر (parseable، valid format) است یا خیر.
- **کد**: `partner-gateway.controller.ts:86-99` — `body.publicCertPem` مستقیماً به `certService.registerCertificate` پاس می‌شود؛ `certificate.service.ts:26-39` — `registerCertificate` مستقیماً `dto.publicCertPem` را در entity ذخیره می‌کند؛ هیچ `crypto.createPublicKey` یا `X509Certificate` parse.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم validation cert ownership
- **اندپوینت**: `POST /partner-gateway/partners/:partnerId/certificates`
- **اشکال**: هیچ validation ای بررسی نمی‌کند که آیا certificate واقعاً متعلق به این partner است یا خیر.
- **کد**: `partner-gateway.controller.ts:83-100` — `partnerId` از path param گرفته می‌شود و مستقیماً در cert entity ذخیره می‌شود؛ هیچ بررسی اینکه آیا certSubject با `partner.mTlsCertSubject` مطابقت دارد یا خیر.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم revoke و delete certificate
- **اندپوینت**: `POST /partner-gateway/partners/:partnerId/certificates/:certId/rotate`
- **اشکال**: در controller فقط rotate endpoint وجود دارد. **نکته**: در `CertificateService` متد `revokeCertificate` (خط ۷۳-۷۸) پیاده‌سازی شده اما هیچ controller endpoint آن را expose نمی‌کند.
- **کد**: `partner-gateway.controller.ts:109-127` — تنها `rotate` endpoint؛ `certificate.service.ts:73-78` — `revokeCertificate(certId)` وجود دارد اما از هیچ controller فراخوانی نمی‌شود.
- **وضعیت**: ✅ تأیید شد (با یادداشت: متد revoke در service وجود دارد اما endpoint آن تعریف نشده است)

### ۲.۵ عدم pagination در لیست certificates
- **اندپوینت**: `GET /partner-gateway/partners/:partnerId/certificates`
- **اشکال**: لیست certificates pagination پشتیبانی نمی‌کند.
- **کد**: `certificate.service.ts:41-43` — `listCertificates` فقط `this.repo.find({ where: { partnerId }, order: { createdAt: 'DESC' } })`؛ هیچ `skip` یا `take`.
- **وضعیت**: ✅ تأیید شد

### ۲.۶ عدم tenant filter در expiring certificates
- **اندپوینت**: `GET /partner-gateway/certificates/expiring`
- **اشکال**: این endpoint public است و هیچ tenant filter‌ای ندارد. هر کسی می‌تواند تمام certificate‌های در حال انقضای تمام tenant‌ها را ببیند.
- **کد**: `partner-gateway.controller.ts:129-135` — `getExpiringCertificates` هیچ tenant filter نمی‌گیرد؛ `certificate.service.ts:80-87` — `getExpiringCertificates(daysAhead)` فقط بر اساس `status: 'active'` و `expiresAt` فیلتر می‌کند، بدون tenant.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Token Exchange

### ۳.۱ عدم validation audience در token-exchange
- **اندپوینت**: `POST /partner-gateway/token-exchange`
- **اشکال**: `scope` بر اساس `partner.allowedScopes` validate می‌شود (خط ۴۱-۴۳)، اما `audience` بدون validation بر اساس `partner.allowedApis` به downstream forward می‌شود. یک partner می‌تواند audience غیرمجاز درخواست کند.
- **کد**: `token-exchange-proxy.service.ts:41-43` — `if (partner.allowedScopes.length > 0 && !partner.allowedScopes.includes(req.scope))` — فقط scope بررسی می‌شود؛ `token-exchange-proxy.service.ts:49-56` — `audience: req.audience` بدون validation به partner's IdP forward می‌شود.
- **وضعیت**: ✅ تأیید شد (با اصلاح: scope validate می‌شود اما audience خیر)

### ۳.۲ ~~عدم token lifetime و refresh token~~
- **اندپوینت**: `POST /partner-gateway/token-exchange`
- ~~**اشکال**: response شامل `expiresIn: 3600` (یکپارچه) است. هیچ مکانیزم refresh token وجود ندارد.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `token-exchange-proxy.service.ts:77-82` — `expiresIn: tokens.expires_in` از response واقعی partner's IdP گرفته می‌شود، نه hardcoded 3600. با این حال، **نقص refresh token همچنان معتبر است** — هیچ مکانیزم refresh token در gateway پیاده‌سازی نشده است.

### ۳.۳ عدم configurable token lifetime
- **اندپوینت**: `POST /partner-gateway/token-exchange`
- **اشکال**: `expiresIn` از response partner's IdP گرفته می‌شود و در gateway قابل پیکربندی نیست. partner‌های مختلف نمی‌توانند lifetime متفاوتی داشته باشند.
- **کد**: `token-exchange-proxy.service.ts:80` — `expiresIn: tokens.expires_in` — مستقیماً از upstream response؛ هیچ per-partner override یا config.
- **وضعیت**: ✅ تأیید شد (با اصلاح: hardcoded نیست، از upstream می‌آید، اما قابل پیکربندی نیست)

### ۳.۴ عدم token introspection و revocation
- **اشکال**: هیچ endpoint‌ای برای introspect یا revoke کردن token قبل از expiry وجود ندارد.
- **کد**: `partner-gateway.controller.ts` — هیچ `POST /token/introspect` یا `POST /token/revoke`؛ `partner-auth.service.ts:47-84` — `authenticateByToken` وجود دارد اما از هیچ endpoint فراخوانی نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ عدم audit log در token-exchange
- **اندپوینت**: `POST /partner-gateway/token-exchange`
- **اشکال**: token-exchange یک عملیات امنیتی حساس است اما هیچ audit log ثبتی نمی‌شود. فقط خطاها log می‌شوند.
- **کد**: `token-exchange-proxy.service.ts:33-83` — `exchangeToken` هیچ `logger.info` یا audit recording برای successful exchanges ندارد؛ فقط `logger.error` در خط ۶۶ برای failures.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Access Validation

### ۴.۱ عدم احراز هویت در validate-access
- **اندپوینت**: `POST /partner-gateway/validate-access`
- **اشکال**: این endpoint public است. هر کسی می‌تواند با ارسال `certSubject` و `requestedApi`، access را validate کند (information disclosure).
- **کد**: `partner-gateway.controller.ts:160-168` — `@Post('validate-access')` بدون `@UseGuards`.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم validation بر اساس certificate به‌جای certSubject
- **اندپوینت**: `POST /partner-gateway/validate-access`
- **اشکال**: access validation بر اساس `certSubject` (string) انجام می‌شود نه بر اساس certificate واقعی یا signature. certSubject قابل spoof است.
- **کد**: `partner-gateway.service.ts:110-136` — `validateAccess(certSubject, requestedApi, requestedScope)` از `getPartnerByCertSubject(certSubject)` استفاده می‌کند (خط ۱۱۵)؛ `partner-gateway.service.ts:68-70` — `getPartnerByCertSubject` فقط بر اساس string match در دیتابیس جستجو می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم caching در access validation
- **اندپوینت**: `POST /partner-gateway/validate-access`
- **اشکال**: هیچ caching ای در access validation وجود ندارد. هر فراخوانی به query در دیتابیس منجر می‌شود.
- **کد**: `partner-gateway.service.ts:110-136` — `validateAccess` مستقیماً `getPartnerByCertSubject` را فراخوانی می‌کند که یک DB query است؛ هیچ cache layer.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Replay Protection و Federation Security

### ۵.۱ ~~عدم nonce persistence و cleanup~~
- **اندپوینت**: `POST /partner-gateway/token-exchange`
- ~~**اشکال**: replay protection با nonce انجام می‌شود اما مشخص نیست nonce‌ها چقدر ذخیره می‌شوند و چه زمانی cleanup می‌شوند.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `replay-protection.service.ts:8` — `NONCE_TTL_MINUTES = 5` (TTL ۵ دقیقه)؛ `replay-protection.service.ts:39-40` — هر nonce با `expiresAt` در دیتابیس ذخیره می‌شود؛ `replay-protection.service.ts:108-118` — متد `cleanupExpired` برای پاکسازی nonce‌های منقضی وجود دارد. **نکته**: متد `cleanupExpired` در هیچ `@Cron` یا `setInterval` فراخوانی نمی‌شود، پس cleanup به‌طور خودکار انجام نمی‌گردد مگر اینکه از جای دیگری trigger شود.

### ۵.۲ عدم nonce در سایر endpoints
- **اندپوینت**: تمام endpoints (به جز token-exchange)
- **اشکال**: nonce-based replay protection فقط در token-exchange اعمال می‌شود. سایر endpoints بدون replay protection هستند.
- **کد**: `partner-gateway.controller.ts:138` — تنها `tokenExchange` دارای `@UseGuards(FederationSignatureGuard)` است؛ تمام endpoints دیگر بدون guard.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ ~~عدم mutual TLS~~
- **اندپوینت**: تمام endpoints
- ~~**اشکال**: federation signature validation فقط در token-exchange وجود دارد. سایر endpoints هیچ transport-level security فراتر از HTTPS ندارند.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `app.module.ts:14-15` — `MtlsConfigService` و `CertRotationService` در module ثبت شده‌اند؛ `tls/mtls-config.ts` و `tls/cert-rotation.service.ts` فایل‌های mTLS configuration وجود دارند. با این حال، هیچ mTLS guard در سطح endpoint اعمال نشده است — mTLS احتمالاً در سطح Fastify server پیکربندی می‌شود. **نقص partial**: mTLS در سطح transport ممکن است فعال باشد اما در سطح endpoint enforce نمی‌شود.

### ۵.۴ عدم IP allowlisting برای partner
- **اشکال**: هیچ مکانیزمی برای IP allowlisting per-partner وجود ندارد.
- **کد**: `entities/PartnerRegistration.ts` — هیچ فیلد `allowedIpRanges` یا مشابه در entity وجود ندارد؛ `partner-gateway.controller.ts` — هیچ IP check در controller یا guard.
- **وضعیت**: ✅ تأیید شد

### ۵.۵ (جدید) RateLimitService تعریف شده اما استفاده نمی‌شود
- **اندپوینت**: تمام endpoints
- **اشکال**: `RateLimitService` در `app.module.ts` ثبت شده (خط ۴۸) اما در هیچ controller یا guard فراخوانی نمی‌شود. متد `checkRateLimit(partnerId)` وجود دارد اما هیچ endpoint آن را صدا نمی‌زند. partner‌های با `rateLimitRps` تنظیم شده در دیتابیس، عملاً rate limit اعمال نمی‌شود.
- **کد**: `rate-limit.service.ts:26-57` — `checkRateLimit` تعریف شده؛ `app.module.ts:48` — `RateLimitService` در providers؛ اما `partner-gateway.controller.ts` و `federation-signature.guard.ts` هیچ ارجاعی به `RateLimitService` ندارند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۵.۶ (جدید) JWT decode بدون signature verification در authenticateByToken
- **اندپوینت**: `POST /partner-gateway/validate-access` (و هر جایی که `authenticateByToken` استفاده شود)
- **اشکال**: متد `authenticateByToken` در `PartnerAuthService` JWT را فقط base64 decode می‌کند بدون signature verification. این یعنی یک مهاجم می‌تواند JWT جعلی با payload دلخواه بسازد و آن را به‌عنوان token معتبر عبور دهد.
- **کد**: `partner-auth.service.ts:117-126` — `decodeJwt`: `const payload = Buffer.from(parts[1], 'base64').toString('utf-8'); return JSON.parse(payload);` — فقط decode، هیچ `jwt.verify` یا signature check.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۶. بهینه‌سازی و طراحی

### ۶.۱ عدم bulk partner operations
- **اشکال**: هیچ bulk endpoint‌ای برای suspend یا revoke کردن چند partner به‌طور همزمان وجود ندارد.
- **کد**: `partner-gateway.controller.ts` — تمام endpoints single-resource هستند.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم webhook برای partner status change
- **اشکال**: وقتی یک partner suspend یا revoke می‌شود، هیچ webhook یا event‌ای به downstream services ارسال نمی‌شود.
- **کد**: `partner-gateway.service.ts:88-108` — `revokePartner` و `suspendPartner` فقط status را در دیتابیس تغییر می‌دهند؛ هیچ event publish یا notification. `app.module.ts:33` — `OutboxEvent` در entities موجود است اما در این عملیات استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ ~~عدم health check per-partner~~
- ~~**اشکال**: health check فقط برای خود partner-gateway وجود دارد. هیچ مکانیزمی برای بررسی سلامت connectivity هر partner وجود ندارد.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `monitoring/partner-health-check.service.ts:1-113` — `PartnerHealthCheckService` با `OnModuleInit` پیاده‌سازی شده که هر ۵ دقیقه health check اجرا می‌کند (خط ۲۹: `setInterval(() => this.runHealthChecks(), 5 * 60 * 1000)`). health check شامل بررسی certificate expiry و partner status است. **نکته**: `knownTenants` لیست به‌طور پیش‌فرض خالی است و `registerTenant` (خط ۳۲-۳۶) از هیچ جایی فراخوانی نمی‌شود، پس health check اجرا می‌شود ولی tenant‌ی برای بررسی ندارد.

### ۶.۴ عدم pagination در expiring certificates
- **اندپوینت**: `GET /partner-gateway/certificates/expiring`
- **اشکال**: لیست certificate‌های در حال انقضا pagination پشتیبانی نمی‌کند.
- **کد**: `certificate.service.ts:80-87` — `getExpiringCertificates` فقط `this.repo.find({ where: { status: 'active', expiresAt: LessThan(threshold) }, order: { expiresAt: 'ASC' } })`؛ هیچ pagination.
- **وضعیت**: ✅ تأیید شد

### ۶.۵ (جدید) عدم encodeURIComponent در پارامترهای path
- **اندپوینت**: `GET /partner-gateway/partners/:partnerId`، `PUT /partner-gateway/partners/:partnerId`، `POST /partner-gateway/partners/:partnerId/certificates/:certId/rotate` و سایر endpoints با path params
- **اشکال**: پارامترهای path مستقیماً در service layer استفاده می‌شوند بدون `encodeURIComponent`. اگرچه TypeORM از parameterized queries استفاده می‌کند و خطر SQL injection کم است، اما در URL construction ممکن است مشکل ایجاد کند.
- **کد**: `partner-gateway.service.ts:63` — `this.repo.findOne({ where: { partnerId } })` — parameterized؛ `certificate.service.ts:50` — `this.repo.findOne({ where: { certId: oldCertId } })` — parameterized. **نکته**: در این سرویس برخلاف BFF‌ها، پارامترها در URL قرار نمی‌گیرند بلکه در DB query استفاده می‌شوند، پس خطر path traversal وجود ندارد.
- **وضعیت**: ~~رد شد~~ — **رد شد**: پارامترهای path در این سرویس از طریق TypeORM parameterized queries استفاده می‌شوند، نه در URL construction. خطر path traversal وجود ندارد.

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ عدم یکپارچه‌سازی با api-gateway برای token validation
- **اشکال**: partner-gateway در `SERVICE_ROUTES` در api-gateway تعریف نشده است. partner‌ها نمی‌توانند از طریق api-gateway به API‌ها دسترسی پیدا کنند.
- **کد**: `api-gateway/src/gateway.config.ts:59-98` — `SERVICE_ROUTES` هیچ مسیری برای `partner-gateway` ندارد.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم یکپارچه‌سازی با auth-service برای token issuance
- **اشکال**: token-exchange به `partner.tokenExchangeEndpoint` (partner's IdP) فرستاده می‌شود، نه به auth-service. token از partner's IdP صادر می‌شود و downstream services باید دو نوع token را validate کنند.
- **کد**: `token-exchange-proxy.service.ts:58` — `fetch(partner.tokenExchangeEndpoint, ...)` — به partner's IdP، نه auth-service؛ `partner-auth.service.ts:47-84` — `authenticateByToken` JWT را decode می‌کند (بدون signature verification — نقص ۵.۶) و `partner_id` یا `agreement_id` را استخراج می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۷.۳ عدم یکپارچه‌سازی با insurer-operations-bff و broker-portal-bff
- **اشکال**: هیچ BFF‌ای به partner-gateway متصل نیست. هیچ endpoint‌ای برای این یکپارچه‌سازی تعریف نشده است.
- **کد**: `partner-gateway.controller.ts` — هیچ endpoint برای BFF integration؛ `app.module.ts` — هیچ outbound integration با BFF‌ها.
- **وضعیت**: ✅ تأیید شد

### ۷.۴ عدم notification به admin هنگام partner registration
- **اشکال**: وقتی یک partner جدید ثبت می‌شود، هیچ notification‌ای به admin tenant ارسال نمی‌شود.
- **کد**: `partner-gateway.service.ts:33-60` — `registerPartner` فقط در دیتابیس ذخیره می‌کند؛ هیچ event publish یا notification. `OutboxEvent` در entities موجود است اما در `registerPartner` استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۷.۵ عدم یکپارچه‌سازی با notification-service برای certificate expiry
- **اشکال**: endpoint `/certificates/expiring` وجود دارد و `checkAndMarkExpired` در `CertificateService` پیاده‌سازی شده، اما هیچ cron job یا scheduler آن را فراخوانی نمی‌کند و هیچ notification‌ای به partner ارسال نمی‌شود.
- **کد**: `certificate.service.ts:89-100` — `checkAndMarkExpired` تعریف شده اما هیچ `@Cron` یا `setInterval` آن را صدا نمی‌زند؛ `app.module.ts` — هیچ `ScheduleModule` ثبت نشده است.
- **وضعیت**: ✅ تأیید شد
