# Customer Portal BFF — تحلیل نقایص اندپوینت‌ها

**سرویس**: customer-portal-bff  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/customer-portal-bff/src/`

---

## ۱. OTP و احراز هویت

### ۱.۱ عدم rate limiting در OTP initiate
- **اندپوینت**: `POST /otp/initiate`
- **اشکال**: این endpoint public است و فقط `phoneNumber` دریافت می‌کند. هیچ rate limiting یا throttle ای در سطح BFF تعریف نشده است. یک مهاجم می‌تواند با فراخوانی مکرر این endpoint، به شماره موبایل قربانی SMS bombing کند.
- **کد**: `customer.controller.ts:24-28` — `@Post('otp/initiate')` بدون هیچ Guard یا middleware؛ `main.ts:5-7` — هیچ rate-limit plugin ای ثبت نشده است. **نکته**: در کد فعلی، `initiateOtp` یک stub است و OTP واقعی ارسال نمی‌کند (نقص ۱.۵ را ببینید)، اما اگر پیاده‌سازی شود، بدون rate limiting خواهد بود.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم validation فرمت شماره موبایل
- **اندپوینت**: `POST /otp/initiate`
- **اشکال**: request body فقط `phoneNumber: string` را می‌پذیرد بدون validation فرمت (E.164، طول، کد کشور). هیچ ValidationPipe یا DTO با class-validator استفاده نشده است.
- **کد**: `customer.controller.ts:25` — `@Body() body: { phoneNumber: string }` بدون هیچ validation؛ `customer-bff.service.ts:29-33` — `initiateOtp(phoneNumber: string)` بدون بررسی فرمت.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم OTP brute-force protection در verify
- **اندپوینت**: `POST /otp/verify`
- **اشکال**: verify endpoint `reference` و `code` دریافت می‌کند و مستقیماً به auth-service `/login` فرستانه می‌شود. هیچ lockout در سطح BFF وجود ندارد. brute-force protection (در صورت وجود) به auth-service واگذار شده است.
- **کد**: `customer.controller.ts:30-34` — `@Post('otp/verify')` بدون Guard؛ `customer-bff.service.ts:35-45` — `verifyOtp` مستقیماً `this.http.post(${this.authUrl}/login, { username: reference, password: code })` را فراخوانی می‌کند بدون هیچ lockout یا attempt counting.
- **وضعیت**: ✅ تأیید شد (BFF هیچ protectionی ندارد؛ وابسته به auth-service)

### ۱.۴ عدم tenant validation در OTP verify
- **اندپوینت**: `POST /otp/verify`
- **اشکال**: `tenantId` در request body دریافت می‌شود اما در service کاملاً نادیده گرفته می‌شود و به auth-service ارسال نمی‌شود. این یعنی tenant از سمت client تعیین می‌شود اما هیچ استفاده‌ای نمی‌شود — پارامتر مرده است.
- **کد**: `customer.controller.ts:31` — `@Body() body: { reference: string; code: string; tenantId: string }`؛ `customer-bff.service.ts:35-45` — `verifyOtp(reference, code, tenantId)` اما `tenantId` در بدنه تابع استفاده نمی‌شود؛ `this.http.post(${this.authUrl}/login, { username: reference, password: code })` — tenantId ارسال نمی‌شود.
- **وضعیت**: ✅ تأیید شد (با یادداشت: tenantId نه‌تنها validate نمی‌شود، بلکه کلاً استفاده نمی‌شود)

### ۱.۵ (جدید) initiateOtp یک stub است و OTP واقعی ارسال نمی‌کند
- **اندپوینت**: `POST /otp/initiate`
- **اشکال**: تابع `initiateOtp` هیچ سرویسی را فراخوانی نمی‌کند و OTP واقعی ارسال نمی‌کند. به‌جای آن، شماره موبایل را به‌عنوان `reference` برمی‌گرداند. این یعنی `reference` قابل پیش‌بینی است (همان شماره موبایل) و یک مهاجم می‌تواند بدون نیاز به دریافت OTP، مستقیماً `verifyOtp` را با reference معروف فراخوانی کند.
- **کد**: `customer-bff.service.ts:29-33` — `return { reference: phoneNumber, sent: true };` — هیچ fetch یا http call به notification-service یا auth-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۲. Session Management

### ۲.۱ عدم session refresh / token rotation
- **اندپوینت**: `GET /session`، `POST /session/revoke`
- **اشکال**: session فقط get و revoke می‌شود. هیچ endpoint‌ای برای refresh یا rotate کردن session token وجود ندارد.
- **کد**: `customer.controller.ts:38-51` — فقط `getSession` و `revokeSession` وجود دارد؛ هیچ `POST /session/refresh` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم session expiry در response
- **اندپوینت**: `GET /session`
- **اشکال**: BFF response را به‌صورت pass-through از auth-service برمی‌گرداند و هیچ expiry یا issuedAt اضافه نمی‌کند. وجود این فیلدها وابسته به auth-service است.
- **کد**: `customer-bff.service.ts:49-56` — `getSession` فقط `data` را از `authUrl/auth/session` برمی‌گرداند (`return data`) بدون enrichment.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم concurrent session limit
- **اندپوینت**: `POST /otp/verify` (ایجاد session)
- **اشکال**: هیچ محدودیتی برای تعداد session‌های فعال یک customer در سطح BFF وجود ندارد. این مسئولیت auth-service است.
- **کد**: `customer-bff.service.ts:35-45` — `verifyOtp` فقط auth-service `/login` را فراخوانی می‌کند؛ هیچ session tracking یا limit در BFF وجود ندارد.
- **وضعیت**: ✅ تأیید شد (مسئولیت مشترک با auth-service)

### ۲.۴ احراز هویت ضعیف (Simple JWT validation)
- **اندپوینت**: تمام endpoints (به جز OTP و brand-config)
- **اشکال**: BFF هیچ JWT validation انجام نمی‌دهد. تابع `extractToken` فقط وجود header `Authorization: Bearer ...` را بررسی می‌کند و token را بدون verify کردن به downstream forward می‌کند. هیچ `@UseGuards` در controller وجود ندارد. اگر token خالی باشد (Authorization header نباشد)، `extractToken` رشته خالی برمی‌گرداند و downstream با Authorization خالی فراخوانی می‌شود.
- **کد**: `customer.controller.ts:8-12` — `extractToken`: `if (auth.startsWith('Bearer ')) return auth; return '';` — هیچ jwt.verify یا signature check وجود ندارد؛ `customer.controller.ts:14` — `@Controller()` بدون `@UseGuards`؛ تمام متدها فقط `extractToken(req)` را صدا می‌زنند.
- **وضعیت**: ✅ تأیید شد (بدتر از توصیف کاتالوگ — هیچ validation ای وجود ندارد، حتی وجود token تضمین نمی‌شود)

### ۲.۵ (جدید) revokeSession یک stub است و session واقعاً invalidate نمی‌شود
- **اندپوینت**: `POST /session/revoke`
- **اشکال**: تابع `revokeSession` در controller هیچ سرویسی را فراخوانی نمی‌کند و فقط `{ revoked: true }` برمی‌گرداند. session در auth-side واقعاً invalidate نمی‌شود و token تا انقضای طبیعی خود معتبر می‌ماند.
- **کد**: `customer.controller.ts:46-51` — `return { success: true, data: { revoked: true }, correlationId: cid };` — هیچ call به auth-service یا session store وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۳. Policy Endpoints

### ۳.۱ عدم pagination در لیست policies
- **اندپوینت**: `GET /policies`
- **اشکال**: لیست policies هیچ پارامتر `limit`، `offset` یا `cursor` را پشتیبانی نمی‌کند. BFF بدون هیچ query param به policy-service فراخوانی می‌کند.
- **کد**: `customer.controller.ts:55-61` — `listPolicies` هیچ `@Query` نمی‌گیرد؛ `customer-bff.service.ts:60-67` — `this.http.get(${this.policyUrl}/policies, ...)` بدون query params.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم فیلتر در لیست policies
- **اندپوینت**: `GET /policies`
- **اشکال**: هیچ فیلتری (status، lineOfBusiness، بازه زمانی) پشتیبانی نمی‌شود.
- **کد**: `customer.controller.ts:55-61` — هیچ `@Query` parameter؛ `customer-bff.service.ts:60-67` — URL بدون query params.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم validation ownership در policy detail
- **اندپوینت**: `GET /policies/:policyId`
- **اشکال**: `policyId` در path param ارسال می‌شود و BFF هیچ ownership validation انجام نمی‌دهد. فقط token را به downstream forward می‌کند. اگر downstream ABAC کافی نداشته باشد، IDOR رخ می‌دهد.
- **کد**: `customer.controller.ts:63-69` — `getPolicy` فقط `extractToken(req)` و `policyId` را به service پاس می‌دهد؛ `customer-bff.service.ts:69-76` — `this.http.get(${this.policyUrl}/policies/${policyId}, ...)` — هیچ customerId یا ownership check در BFF.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم محدودیت endorsementType در endorsement request
- **اندپوینت**: `POST /policies/:policyId/endorsement`
- **اشکال**: `endorsementType` در request body به‌صورت `string` آزاد ارسال می‌شود. هیچ enum یا allowlist در BFF وجود ندارد. `body` مستقیماً به downstream forward می‌شود.
- **کد**: `customer.controller.ts:71-82` — `@Body() body: any` بدون validation؛ `customer-bff.service.ts:78-85` — `this.http.post(${this.policyUrl}/policies/${policyId}/endorsement, body, ...)` — body به‌صورت raw forward می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ عدم نمایش endorsement status و history
- **اندپوینت**: `POST /policies/:policyId/endorsement`
- **اشکال**: endorsement ایجاد می‌شود و `endorsementId` و `status: pending` برمی‌گردد اما هیچ اندپوینتی برای بررسی status endorsement یا لیست endorsement‌های قبلی وجود ندارد.
- **کد**: `customer.controller.ts:71-82` — تنها `POST` برای endorsement وجود دارد؛ هیچ `GET /policies/:policyId/endorsements` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۳.۶ عدم امکان cancel policy
- **اشکال**: endpoint‌ای برای cancel کردن policy توسط customer وجود ندارد.
- **کد**: `customer.controller.ts:53-95` — فقط `listPolicies`، `getPolicy`، `endorsePolicy`، `scheduleRenewal` وجود دارد؛ هیچ `POST /policies/:policyId/cancel` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Claim Endpoints

### ۴.۱ عدم pagination در لیست claims
- **اندپوینت**: `GET /claims`
- **اشکال**: لیست claims هیچ pagination را پشتیبانی نمی‌کند.
- **کد**: `customer.controller.ts:99-105` — `listClaims` هیچ `@Query` نمی‌گیرد؛ `customer-bff.service.ts:98-105` — `this.http.get(${this.claimUrl}/claims, ...)` بدون query params.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم validation ownership در claim detail
- **اندپوینت**: `GET /claims/:claimId`
- **اشکال**: `claimId` در path ارسال می‌شود و BFF ownership را بررسی نمی‌کند.
- **کد**: `customer.controller.ts:107-113` — `getClaim` فقط token و `claimId` را پاس می‌دهد؛ `customer-bff.service.ts:107-114` — `this.http.get(${this.claimUrl}/claims/${claimId}, ...)` — هیچ ownership check.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم upload documents در FNOL
- **اندپوینت**: `POST /fnol`
- **اشکال**: request body شامل `documents: []` است اما هیچ endpoint‌ای برای upload document قبل از FNOL وجود ندارد. BFF body را مستقیماً به claims-service forward می‌کند.
- **کد**: `customer.controller.ts:115-121` — `@Post('fnol')` با `@Body() body: any`؛ `customer-bff.service.ts:116-123` — `this.http.post(${this.claimUrl}/claims/fnol, body, ...)` — body به‌صورت raw forward می‌شود؛ هیچ upload endpoint در controller وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ عدم claim status tracking real-time
- **اندپوینت**: `GET /claims/:claimId`
- **اشکال**: claim status فقط با polling قابل دریافت است. هیچ WebSocket یا SSE وجود ندارد.
- **کد**: `customer.controller.ts:107-113` — فقط `GET` endpoint؛ `main.ts:5` — `NestFactory.create(AppModule)` بدون WebSocket adapter.
- **وضعیت**: ✅ تأیید شد

### ۴.۵ عدم امکان add documents پس از FNOL
- **اشکال**: پس از submit FNOL، هیچ اندپوینتی برای add کردن documents اضافی به claim وجود ندارد.
- **کد**: `customer.controller.ts:97-121` — فقط `listClaims`، `getClaim`، `submitFnol` وجود دارد؛ هیچ `POST /claims/:claimId/documents` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Payment Endpoints

### ۵.۱ عدم pagination در لیست payments
- **اندپوینت**: `GET /payments`
- **اشکال**: لیست payments هیچ pagination را پشتیبانی نمی‌کند.
- **کد**: `customer.controller.ts:125-131` — `listPayments` بدون `@Query`؛ `customer-bff.service.ts:127-134` — `this.http.get(${this.billingUrl}/payments, ...)` بدون query params.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم فیلتر در لیست payments
- **اندپوینت**: `GET /payments`
- **اشکال**: هیچ فیلتری (status، بازه زمانی، policyId) پشتیبانی نمی‌شود.
- **کد**: `customer.controller.ts:125-131` — هیچ query parameter؛ `customer-bff.service.ts:127-134` — URL بدون فیلتر.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم امکان پرداخت آنلاین
- **اندپوینت**: `GET /payments`، `GET /payments/:paymentId`
- **اشکال**: فقط لیست و detail payment پشتیبانی می‌شود. هیچ endpoint‌ای برای پرداخت آنلاین یا setup auto-debit وجود ندارد.
- **کد**: `customer.controller.ts:123-139` — فقط `GET /payments` و `GET /payments/:paymentId`؛ هیچ `POST /payments/:paymentId/pay` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ عدم نمایش breakdown و receipt
- **اندپوینت**: `GET /payments/:paymentId`
- **اشکال**: BFF response را به‌صورت pass-through از billing-service برمی‌گرداند. هیچ enrichment برای breakdown یا receipt اضافه نمی‌کند.
- **کد**: `customer-bff.service.ts:136-143` — `return data` بدون enrichment.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Complaint Endpoints

### ۶.۱ عدم pagination در لیست complaints
- **اندپوینت**: `GET /complaints`
- **اشکال**: لیست complaints pagination پشتیبانی نمی‌کند.
- **کد**: `customer.controller.ts:143-149` — `listComplaints` بدون `@Query`؛ `customer-bff.service.ts:147-154` — `this.http.get(${this.complaintsUrl}/complaints, ...)` بدون query params.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم امکان reply یا add evidence به complaint
- **اندپوینت**: `POST /complaints`
- **اشکال**: complaint ایجاد می‌شود اما هیچ اندپوینتی برای reply یا add evidence وجود ندارد.
- **کد**: `customer.controller.ts:141-157` — فقط `GET /complaints` و `POST /complaints`؛ هیچ `POST /complaints/:complaintId/reply` یا `POST /complaints/:complaintId/evidence` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم نمایش complaint history و timeline
- **اندپوینت**: `GET /complaints`
- **اشکال**: BFF response را به‌صورت pass-through برمی‌گرداند. هیچ timeline یا history enrichment انجام نمی‌شود.
- **کد**: `customer-bff.service.ts:147-154` — `return data` بدون enrichment.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم validation category در complaint
- **اندپوینت**: `POST /complaints`
- **اشکال**: `category` به‌صورت `string` آزاد ارسال می‌شود. هیچ enum یا allowlist در BFF وجود ندارد.
- **کد**: `customer.controller.ts:151-157` — `@Body() body: any` بدون validation؛ `customer-bff.service.ts:156-163` — `this.http.post(${this.complaintsUrl}/complaints, body, ...)` — body به‌صورت raw forward.
- **وضعیت**: ✅ تأیید شد

---

## ۷. Brand Config و Consent

### ۷.۱ عدم caching در brand config
- **اندپوینت**: `GET /brand-config/:brandKey`
- **اشکال**: brand config public است و به ندرت تغییر می‌کند اما هیچ caching ای تعریف نشده است.
- **کد**: `customer.controller.ts:161-165` — `getBrandConfig` بدون cache؛ `customer-bff.service.ts:167-172` — `this.http.get(${this.authUrl}/brand-configs/${brandKey})` در هر فراخوانی.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم validation brandKey در brand config
- **اندپوینت**: `GET /brand-config/:brandKey`
- **اشکال**: `brandKey` در path ارسال می‌شود و endpoint public است. هیچ validation یا allowlist وجود ندارد.
- **کد**: `customer.controller.ts:161-165` — `@Get('brand-config/:brandKey')` بدون Guard یا validation؛ `customer-bff.service.ts:167-172` — `brandKey` مستقیماً در URL استفاده می‌شود (`${this.authUrl}/brand-configs/${brandKey}`) — در ضمن `encodeURIComponent` هم استفاده نشده است که امکان path injection ایجاد می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۷.۳ عدم pagination در لیست consents
- **اندپوینت**: `GET /consent`
- **اشکال**: لیست consents pagination پشتیبانی نمی‌کند.
- **کد**: `customer.controller.ts:169-179` — `listConsents` بدون `@Query`؛ `customer-bff.service.ts:189-196` — `this.http.get(${this.customer360Url}/customer-360/${customerId}/consents, ...)` بدون pagination params.
- **وضعیت**: ✅ تأیید شد

### ۷.۴ عدم audit trail در consent grant/revoke
- **اندپوینت**: `POST /consent/grant`، `POST /consent/revoke`
- **اشکال**: consent grant و revoke به customer-360-service forward می‌شود. audit trail وابسته به downstream است. BFF هیچ audit log محلی ثبت نمی‌کند.
- **کد**: `customer.controller.ts:181-225` — `grantConsent` و `revokeConsent` فقط به downstream forward می‌کنند؛ هیچ Logger یا audit recording در BFF.
- **وضعیت**: ✅ تأیید شد

---

## ۸. ذینفعان و مصرف‌کنندگان

### ۸.۱ عدم یکپارچه‌سازی با catalog-bff برای product display
- **اشکال**: BFF با هیچ catalog-bff یا product-service یکپارچه نیست. مشتری نمی‌تواند محصولات را ببیند یا quote بزند.
- **کد**: `customer-bff.service.ts:9-15` — downstream services شامل: `authUrl`، `policyUrl`، `claimUrl`، `billingUrl`، `notificationUrl`، `complaintsUrl`، `customer360Url` — هیچ `catalogUrl` یا `productUrl` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۸.۲ ~~عدم یکپارچه‌سازی با policy-service برای endorsement workflow~~
- ~~**اشکال**: endorsement request به customer-portal-service فرستاده می‌شود اما policy-service باید endorsement را process کند.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: `customer-bff.service.ts:78-85` — `endorsePolicy` مستقیماً به `this.policyUrl` (policy-service) فرستاده می‌شود: `this.http.post(${this.policyUrl}/policies/${policyId}/endorsement, body, ...)`؛ `customer-bff.service.ts:10` — `policyUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18007'`. BFF مستقیم با policy-service یکپارچه است و endorsement به آن فرستاده می‌شود.

### ۸.۳ عدم notification به customer هنگام status change
- **اشکال**: هیچ event-driven notification برای status change در BFF وجود ندارد. customer باید polling کند.
- **کد**: `customer-bff.service.ts:13` — `notificationUrl` تعریف شده اما هیچ event listener یا webhook در BFF وجود ندارد؛ `main.ts` هیچ Kafka consumer یا event handler ثبت نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۸.۴ عدم دسترسی broker/agent به customer data در صورت نمایندگی
- **اشکال**: هیچ اندپوینتی برای delegated access وجود ندارد.
- **کد**: `customer.controller.ts:14` — `@Controller()` بدون هیچ role-based یا delegation check؛ تمام endpoints فقط token را forward می‌کنند.
- **وضعیت**: ✅ تأیید شد

### ۸.۵ ~~عدم یکپارچه‌سازی با billing-service برای payment~~
- ~~**اشکال**: payments از customer-portal-service fetch می‌شوند اما billing-service owner پرداخت‌ها است.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: `customer-bff.service.ts:12` — `billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18004'`؛ `customer-bff.service.ts:127-143` — `listPayments` و `getPayment` مستقیماً به billing-service فرستاده می‌شوند: `this.http.get(${this.billingUrl}/payments, ...)` و `this.http.get(${this.billingUrl}/payments/${paymentId}, ...)`. BFF مستقیم با billing-service یکپارچه است.

### ۸.۶ (جدید) CORS کاملاً باز با credentials
- **اندپوینت**: تمام endpoints
- **اشکال**: CORS به‌صورت `origin: true, credentials: true` پیکربندی شده است که تمام originها را با credentials اجازه می‌دهد. این یک vulnerability امنیتی است — هر سایت می‌تواند درخواست‌های authenticated به BFF بفرستد.
- **کد**: `main.ts:7` — `app.enableCors({ origin: true, credentials: true });`
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۸.۷ (جدید) عدم forward کردن X-Correlation-Id به downstream
- **اندپوینت**: تمام endpoints
- **اشکال**: تابع `authHeaders` به‌جای forward کردن `X-Correlation-Id` ورودی، یک correlation ID جدید تولید می‌کند. این باعث می‌شود trace بین BFF و downstream قطع شود و debugging و distributed tracing دشوار شود.
- **کد**: `customer-bff.service.ts:19-25` — `authHeaders`: `'x-correlation-id': ${Date.now()}-${Math.random().toString(36).substr(2, 9)}` — همیشه جدید تولید می‌شود؛ `customer.controller.ts:18-20` — `correlationId` از incoming header استخراج می‌شود اما به `authHeaders` پاس داده نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۸.۸ (جدید) عدم encodeURIComponent در پارامترهای path
- **اندپوینت**: `GET /policies/:policyId`، `GET /claims/:claimId`، `GET /payments/:paymentId`، `GET /brand-config/:brandKey`
- **اشکال**: پارامترهای path مستقیماً در URL قرار داده می‌شوند بدون `encodeURIComponent`. این می‌تواند باعث path traversal یا URL injection شود (مثلاً `policyId = ../../admin/users`).
- **کد**: `customer-bff.service.ts:71` — `${this.policyUrl}/policies/${policyId}`؛ `customer-bff.service.ts:109` — `${this.claimUrl}/claims/${claimId}`؛ `customer-bff.service.ts:138` — `${this.billingUrl}/payments/${paymentId}`؛ `customer-bff.service.ts:169` — `${this.authUrl}/brand-configs/${brandKey}` — هیچکدام `encodeURIComponent` استفاده نمی‌کنند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
