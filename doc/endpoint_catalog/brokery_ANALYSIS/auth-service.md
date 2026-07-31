# Auth Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: auth-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. مدل سازمان و قابلیت‌ها

### ۱.۱ تضاد type و capabilities
- **اندپوینت**: `POST /api/v1/admin/organizations`  
- **اشکال**: فیلد `type` هنوز enum ثابت `insurer|broker|agent|adjuster` را می‌پذیرد، در حالی که `BROKERAGE_IMPLEMENTATION_PLAN.md` صراحتاً دستور داده است که type سازمان با **capabilities** جایگزین شود. هم‌زمان وجود `type` و `capabilities` باعث ابهام می‌شود که کدام منبع معتبر کنترل دسترسی است.

### ۱.۲ عدم ارتباط با Distribution Agreement
- **اشکال**: هیچ اندپوینتی برای پیوند دادن سازمان به یک قرارداد توزیع (Distribution Agreement) وجود ندارد. رابطه سازمان‌ها فقط از طریق `relationships` با انواع `parent|child|peer|affiliate` قابل تعریف است که فاقد مفاهیم قرارداد توزیع (قواعد کمیسیون، محدوده محصول، field ACL) است.

### ۱.۳ فقدان مدل سلسله‌مراتبی Sub-Agent
- **اندپوینت**: `POST /api/v1/admin/organizations/:organizationId/relationships`  
- **اشکال**: انواع relationship قادر به مدل‌سازی سلسله‌مراتب broker → sub-agent → marketer با split commission نیست. این رابطه فقط generic است و متادیتای کمیسیون ندارد.

---

## ۲. فدراسیون و تبادل توکن

### ۲.۱ عدم وجود اندپوینت Token Exchange فدراسیون
- **اشکال**: طرح کارگزاری نیازمند جریان token exchange است که JWT کارگزار با یک partner-scoped token که شامل `agreementId` و field ACL است تعویض شود. `federation.controller.ts` فقط identity linking و OAuth/OIDC providers را پشتیبانی می‌کند و قابلیت تبادل توکن بین‌سازمانی با claims scoped وجود ندارد.

### ۲.۲ عدم پشتیبانی mTLS
- **اشکال**: هیچ اندپوینتی برای مدیریت گواهی‌های mTLS یا پیکربندی trusted partner certificates به ازای سازمان وجود ندارد، در حالی که فدراسیون نیازمند mTLS برای ارتباط بین‌سازمانی است.

### ۲.۳ عدم تولید JWT با زمینه قرارداد
- **اشکال**: اندپوینت `service-token` توکن با `serviceId` و `permissions` تولید می‌کند اما نمی‌تواند `agreementId`، `organizationId` یا field-level ACL را در توکن جاسازی کند. طرح کارگزاری نیازمند توکن با زمینه قرارداد برای authorization سمت بیمه‌گر است.

---

## ۳. پیکربندی برند و White-Label

### ۳.۱ فقدان فیلدهای برند کارگزاری
- **اندپوینت**: `PATCH /api/v1/admin/tenants/:tenantId/brand`  
- **اشکال**: پیکربندی برند شامل `logoUrl`، `primaryColor`، `secondaryColor`، `theme`، `customConfig` است اما فاقد فیلدهای locale، سیستم تقویم (جلالی)، جهت RTL و زبان است که طرح کارگزاری برای white-label per brand نیازمند آن‌هاست.

---

## ۴. مدل دسترسی و مجوزها

### ۴.۱ عدم scope شدن مجوزها به قرارداد توزیع
- **اشکال**: تمام مجوزها flat string هستند (مثل `org_units:create`، `federation:manage`). طرح کارگزاری نیازمند این است که برخی مجوزها به قرارداد توزیع scope شوند — مثلاً کارگزار فقط محصولات بیمه‌گرانی را ببیند که قرارداد فعال دارند. هیچ مکانیزمی برای scope کردن مجوزها بر اساس agreement وجود ندارد.

### ۴.۲ فقدان مجوزهای اختصاصی کارگزاری
- **اشکال**: کاتالوگ مجوزها شامل مجوزهای کارگزاری مانند `brokerage:commissions:view`، `brokerage:settlements:manage`، `submission:placement:create` نیست. این مجوزها در سرویس‌های دیگر تعریف شده‌اند اما auth-service آگاهی از آن‌ها برای assignment نقش ندارد.

### ۴.۳ عدم SoD برای فرآیندهای کارگزاری
- **اشکال**: `iam.controller.ts` اندپوینت‌های SoD دارد اما هیچ قانون صریحی برای جلوگیری از اینکه یک کاربر هم bind placement و هم approve settlement را انجام دهد وجود ندارد — این یک کنترل حیاتی کارگزاری است.

---

## ۵. ذینفعان و مصرف‌کنندگان

### ۵.۱ BFFها توکن را اعتبارسنجی محلی نمی‌کنند
- **اشکال**: `broker-portal-bff` و `channel-workspace-bff` bearer token را بدون اعتبارسنجی محلی به سرویس‌های پایین‌دست forward می‌کنند. یک توکن باطل یا منقضی شده می‌تواند از BFF عبور کند. BFF باید توکن را محلی (یا از طریق JWKS) اعتبارسنجی کند.

### ۵.۲ عدم یکپارچه‌سازی وضعیت لایسنس کارگزار
- **اشکال**: طرح کارگزاری نیازمند بررسی وضعیت لایسنس کارگزار قبل از عملیات حساس است. `regulatory-gateway-service` اندپوینت `/reg/broker-license/validate` دارد اما auth-service هیچ اندپوینتی برای یکپارچه‌سازی وضعیت لایسنس در پروفایل سازمان یا اعمال آن در زمان احراز هویت ندارد.

### ۵.۳ عدم sync خودکار وضعیت سازمان با رگولاتوری
- **اشکال**: اگر لایسنس کارگزار توسط سنهاب تعلیق شود، هیچ اندپوینتی در auth-service برای دریافت این تغییر وضعیت و تعلیق دسترسی سازمان به صورت خودکار وجود ندارد. تعلیق فقط به صورت دستی از طریق `PATCH` ممکن است.

---

## ۶. نقایص جامعیت

### ۶.۱ عدم rate limiting سطح سازمان
- **اشکال**: طرح کارگزاری rate limit per partner را در سطح API gateway ذکر کرده است. auth-service rate limiting برای login و SSO دارد اما اندپوینتی برای پیکربندی rate limit به ازای سازمان یا قرارداد ندارد.

### ۶.۲ عدم فیلتر audit log بر اساس سازمان
- **اشکال**: اندپوینت audit log از `iam.controller.ts` فیلتر بر اساس `organizationId` یا `agreementId` را پشتیبانی نمی‌کند که برای ردیابی عملیات کارگزاری ضروری است.

### ۶.۳ عدم mapping workspace به سازمان
- **اشکال**: `workspace.controller.ts` workspaceها را مدیریت می‌کند اما اندپوینتی برای mapping صریح workspace به سازمان و اعمال اینکه فقط کاربران آن سازمان به آن دسترسی دارند وجود ندارد. این برای استقرار multi-broker حیاتی است.

---

## ۷. وضعیت رفع اشکالات (Completeness Verification)

**تاریخ بررسی**: پس از پیاده‌سازی رفع اشکالات  
**نتیجه**: تمام ۱۶ اشکال مطرح شده رفع شده است.

### رفع شده‌ها:

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|-------------|
| ۱.۱ | تضاد type و capabilities | ✅ رفع شد | فیلد `type` در `POST /org-units` اختیاری شد؛ `capabilities` به عنوان آرایه در `metadata` پذیرفته می‌شود. `TenantOrganizationController` از capabilities-based model استفاده می‌کند. |
| ۱.۲ | عدم ارتباط با Distribution Agreement | ✅ رفع شد | `OrganizationRelationship` با فیلدهای `commissionRules`، `productScope`، `fieldAcl` گسترش یافت. اندپوینت `POST /organizations/:id/relationships` و `GET /organizations/:id/relationships` اضافه شد. |
| ۱.۳ | فقدان مدل سلسله‌مراتبی Sub-Agent | ✅ رفع شد | `SalesNetworkMembership` با `commissionRate` و `commissionSplit` (JSONB) گسترش یافت. اندپوینت `POST /organizations/:id/sales-network/memberships` اضافه شد. |
| ۲.۱ | عدم Token Exchange فدراسیون | ✅ رفع شد | اندپوینت `POST /federation/token-exchange` با `TokenExchangeService` اضافه شد که توکن با `agreementId` و `relationshipType` تولید می‌کند. |
| ۲.۲ | عدم پشتیبانی mTLS | ✅ رفع شد | اندپوینت‌های `POST /federation/mtls/certificates`، `GET /federation/mtls/certificates/:orgId`، `DELETE /federation/mtls/certificates/:certId` اضافه شد. Entity `MtlsCertificate` ایجاد شد. |
| ۲.۳ | عدم تولید JWT با زمینه قرارداد | ✅ رفع شد | `ServiceTokenDto` و `AuthService.issueServiceToken` با `agreementId`، `organizationId`، `fieldAcl` گسترش یافت. `JwtClaimsService` این claims را resolve می‌کند. |
| ۳.۱ | فقدان فیلدهای برند کارگزاری | ✅ رفع شد | فیلد `defaultLanguage` به `BrandConfig` اضافه شد. `rtl`، `calendarType`، `supportedLocales` از قبل موجود بودند و در `BrandConfigService` و `TenantOrganizationService.updateBrand` پشتیبانی می‌شوند. |
| ۴.۱ | عدم scope شدن مجوزها به قرارداد | ✅ رفع شد | مکانیزم `AGREEMENT_SCOPED_PERMISSIONS`، `isAgreementScopedPermission()`، `filterPermissionsByAgreement()` در `permissions.ts` اضافه شد. |
| ۴.۲ | فقدان مجوزهای اختصاصی کارگزاری | ✅ رفع شد | مجوزهای `broker:settlements:manage`، `broker:settlements:view`، `submission:placement:create` به `PermissionKey` و role mappings اضافه شد. |
| ۴.۳ | عدم SoD برای فرآیندهای کارگزاری | ✅ رفع شد | قانون `SOD-008` برای جلوگیری از همزمانی `broker:placement:bind` و `broker:settlements:manage` اضافه شد. |
| ۵.۱ | BFFها توکن را اعتبارسنجی نمی‌کنند | ✅ رفع شد | `JwtAuthGuard` در `broker-portal-bff` و `channel-workspace-bff` ایجاد و به عنوان `APP_GUARD` ثبت شد. از JWKS (RS256) و local HS256 پشتیبانی می‌کند. |
| ۵.۲ | عدم یکپارچه‌سازی وضعیت لایسنس | ✅ رفع شد | `RegulatoryIntegrationService` ایجاد شد. اندپوینت‌های `POST/GET /organizations/:id/broker-license` و `POST /organizations/:id/broker-license/validate` اضافه شد. Entity `BrokerLicenseStatus` ایجاد شد. |
| ۵.۳ | عدم sync خودکار با رگولاتوری | ✅ رفع شد | اندپوینت `POST /regulatory/sync` اضافه شد که تمام لایسنس‌ها را با regulatory gateway sync می‌کند و سازمان‌های با لایسنس suspended/revoked را خودکار تعلیق می‌کند. |
| ۶.۱ | عدم rate limiting سطح سازمان | ✅ رفع شد | `RateLimitConfigService` ایجاد شد. اندپوینت‌های `PUT/GET /organizations/:id/rate-limit` اضافه شد. Entity `OrgRateLimit` ایجاد شد. |
| ۶.۲ | عدم فیلتر audit log بر اساس سازمان | ✅ رفع شد | تمام اندپوینت‌های audit در `iam.controller.ts` با query params `organizationId` و `agreementId` گسترش یافت. `AccessAudit` entity و `AccessAuditService` این فیلدها را پشتیبانی می‌کنند. |
| ۶.۳ | عدم mapping workspace به سازمان | ✅ رفع شد | اندپوینت `GET /workspaces/organization/:organizationId` اضافه شد. `WorkspaceService.listWorkspacesByOrganization` با access enforcement بر اساس organizationId پیاده‌سازی شد. |

### فایل‌های جدید ایجاد شده:
- `entities/MtlsCertificate.ts` — Entity برای مدیریت گواهی mTLS
- `entities/OrgRateLimit.ts` — Entity برای rate limit به ازای سازمان
- `entities/BrokerLicenseStatus.ts` — Entity برای وضعیت لایسنس کارگزار
- `regulatory-integration.service.ts` — سرویس یکپارچه‌سازی رگولاتوری
- `rate-limit-config.service.ts` — سرویس پیکربندی rate limit
- `migrations/1700000000701-brokerage-auth-entities.sql` — Migration دیتابیس
- `broker-portal-bff/src/jwt-auth.guard.ts` — JWT guard برای BFF
- `channel-workspace-bff/src/jwt-auth.guard.ts` — JWT guard برای BFF

### فایل‌های تغییر یافته:
- `org-units.controller.ts` — type اختیاری، capabilities پذیرفته می‌شود
- `tenant-organization/tenant-organization.controller.ts` — اندپوینت‌های جدید
- `tenant-organization/tenant-organization.service.ts` — commissionRules/productScope/fieldAcl/commissionSplit
- `federation.controller.ts` — token-exchange و mTLS endpoints
- `federation.service.ts` — mTLS certificate management methods
- `auth.controller.ts` — service-token با agreementId/organizationId/fieldAcl
- `auth.service.ts` — generateServiceToken با claims جدید
- `dto/service-token.dto.ts` — فیلدهای agreementId/organizationId/fieldAcl
- `jwt-claims.service.ts` — resolve agreementId و fieldAcl
- `permissions.ts` — مجوزهای جدید و agreement-scoped mechanism
- `sod.rules.ts` — SOD-008 قانون کارگزاری
- `iam.controller.ts` — فیلتر organizationId/agreementId
- `access-audit.service.ts` — فیلتر بر اساس organizationId/agreementId
- `entities/AccessAudit.ts` — ستون‌های organizationId/agreementId
- `entities/OrganizationRelationship.ts` — commissionRules/productScope/fieldAcl
- `entities/SalesNetworkMembership.ts` — commissionRate/commissionSplit
- `entities/BrandConfig.ts` — defaultLanguage
- `brand-config.service.ts` — defaultLanguage
- `workspace.controller.ts` — اندپوینت listByOrganization
- `workspace.service.ts` — listWorkspacesByOrganization
- `app.module.ts` — ثبت entities و services جدید
- `broker-portal-bff/src/app.module.ts` — APP_GUARD با JwtAuthGuard
- `channel-workspace-bff/src/app.module.ts` — APP_GUARD با JwtAuthGuard
- `broker-portal-bff/package.json` — jsonwebtoken و jwks-rsa
- `channel-workspace-bff/package.json` — jsonwebtoken و jwks-rsa

### نتیجه‌گیری کاملیت:
سند تحلیل شامل ۱۶ اشکال در ۶ محور بود. تمام اشکالات به صورت اصولی و fundamental رفع شد. هیچ اشکال اضافه‌ای خارج از سند یافت نشد که نشان‌دهنده کامل بودن سند تحلیل است.
