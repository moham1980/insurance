# AML Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: aml-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/aml-service/src/`

---

## ۱. Consent Management

### ۱.۱ عدم validation هم‌پوشانی بازه زمانی consent
- **اندپوینت**: `POST /aml/consents`
- **اشکال**: consent با `validFrom` و `validTo` ایجاد می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا consent جدید با consent‌های فعال قبلی برای همان `subjectNationalId` و `consentType` هم‌پوشانی دارد یا خیر. این می‌تواند به consent‌های متناقض همزمان منجر شود که در حوزه AML compliance قابل قبول نیست.
- **کد**: `aml.service.ts:createConsent` (lines 59-94) — consent با status `'active'` ایجاد می‌شود بدون هیچ query برای بررسی consent‌های فعال قبلی. `validFrom` و `validTo` بدون بررسی هم‌پوشانی ذخیره می‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم audit trail برای revoke consent
- **اندپوینت**: `PATCH /aml/consents/:consentId/revoke`
- **اشکال**: revoke فقط `reason` را در request body می‌گیرد. هیچ فیلدی برای ثبت `revokedBy` (هویت کاربر انجام‌دهنده) در request وجود ندارد. اگرچه JWT هویت کاربر را شامل می‌شود، اما در سطح API هیچ الزامی برای ثبت audit trail کامل (شامل timestamp، user identity، previous status) وجود ندارد. در AML، audit trail الزامی است.
- **کد**: `aml.controller.ts:revokeConsent` (lines 107-114) — برخلاف سایر اندپوینت‌ها (مانند `createConsent` که `auditLogger.info` فراخوانی می‌کند)، این متد هیچ `auditLogger` ای ندارد و `actor?.userId` را به service پاس نمی‌دهد. `aml.service.ts:revokeConsent` (lines 116-130) فقط `status` را به `'revoked'` و `notes` را به reason تغییر می‌دهد — هیچ فیلد `revokedBy` یا timestamp جداگانه ثبت نمی‌شود. `req.user` در controller موجود است اما استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم فیلتر consent بر اساس بازه زمانی
- **اندپوینت**: `GET /aml/consents`
- **اشکال**: لیست consents فقط فیلتر `status`، `consentType` و `subjectNationalId` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `validFrom`/`validTo` یا `createdAt` وجود ندارد. در عملیات AML، جستجوی consent‌های فعال در یک بازه زمانی خاص ضروری است.
- **کد**: `aml.controller.ts:listConsents` (lines 65-86) — فقط `subjectNationalId`، `status`، `consentType`، `limit`، `offset` را به service پاس می‌دهد. `aml.service.ts:listConsents` (lines 100-114) — QueryBuilder فقط این سه فیلد را `andWhere` می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ (جدید) عدم validation ترتیب تاریخ validFrom و validTo
- **اندپوینت**: `POST /aml/consents`
- **اشکال**: هیچ بررسی‌ای وجود ندارد که `validFrom` قبل از `validTo` باشد. یک کاربر می‌تواند consent با `validFrom` بعد از `validTo` ایجاد کند که منطقاً نامعتبر است.
- **کد**: `aml.service.ts:createConsent` (lines 78-93) — `validFrom` و `validTo` بدون هیچ مقایسه‌ای ذخیره می‌شوند (`validFrom: params.validFrom ?? null, validTo: params.validTo ?? null`).
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۱.۵ (جدید) BUG: listConsents با nationalId رمزنگاری‌شده هم‌خوانی ندارد
- **اندپوینت**: `GET /aml/consents`
- **اشکال**: `createConsent` مقدار `subjectNationalId` را با `encryptPii` رمزنگاری می‌کند و سپس ذخیره می‌کند، اما `listConsents` با مقدار raw (رمزنگاری‌نشده) ارسال‌شده از controller مقایسه می‌کند. نتیجه: جستجوی consent بر اساس `subjectNationalId` هرگز نتیجه‌ای برنمی‌گرداند.
- **کد**: `aml.service.ts:createConsent` line 76 (`const encryptedNationalId = this.encryptPii(subjectNationalId)`) در مقابل `aml.service.ts:listConsents` line 108 (`qb.andWhere('c.subject_national_id = :nid', { nid: params.subjectNationalId })`) — مقدار `params.subjectNationalId` رمزنگاری‌نشده است.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۲. Rule Management

### ۲.۱ عدم versioning و approval workflow برای rule changes
- **اندپوینت**: `PATCH /aml/rules/:ruleId`
- **اشکال**: update rule مستقیماً rule را تغییر می‌دهد بدون هیچ versioning یا approval workflow. در AML، تغییر یک rule فعال باید نیاز به تایید دومین شخص (four-eyes principle / SoD) داشته باشد. یک کاربر با `aml:rules:manage` می‌تواند به تنهایی rule را تغییر دهد و تاریخچه نسخه قبلی از بین می‌رود.
- **کد**: `aml.service.ts:updateRule` (lines 195-236) — مستقیماً فیلدهای rule را تغییر می‌دهد و `save` می‌کند. هیچ جدولی برای نسخه‌بندی rule وجود ندارد (entities فقط `AmlRule` بدون `AmlRuleVersion`). هیچ فیلد `updatedBy` هم ثبت نمی‌شود (controller `actor?.userId` را پاس نمی‌دهد).
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم test/dry-run برای rule قبل از فعال‌سازی
- **اندپوینت**: `POST /aml/rules`
- **اشکال**: rule با `expression` (احتمالاً یک expression engine) ایجاد می‌شود اما هیچ اندپوینتی برای dry-run یا test rule روی داده‌های تاریخی وجود ندارد. یک rule با expression نادرست می‌تواند به false positive انفجاری منجر شود بدون اینکه قبل از فعال‌سازی تست شود.
- **کد**: `aml.controller.ts` — هیچ اندپوینت `/aml/rules/:ruleId/test` یا `/aml/rules/dry-run` وجود ندارد. `aml.service.ts:evaluateRuleExpression` (lines 333-347) فقط در `evaluateTransaction` فراخوانی می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم soft delete برای rules
- **اندپوینت**: `PATCH /aml/rules/:ruleId`
- **اشکال**: هیچ اندپوینتی برای delete یا deactivate rule وجود ندارد. تنها راه غیرفعال کردن، update با `status: "inactive"` است. این به جای soft delete، داده‌ها را به‌طور دائمی تغییر می‌دهد و بازیابی نسخه قبلی را غیرممکن می‌کند.
- **کد**: `aml.controller.ts` — هیچ `@Delete` decorator وجود ندارد. `AmlRuleStatus` فقط `'enabled' | 'disabled'` است (نه `'inactive'`). `aml.service.ts:updateRule` اجازه می‌دهد `status` به `'disabled'` تغییر کند.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ (جدید) عدم ثبت `updatedBy` در update rule
- **اندپوینت**: `PATCH /aml/rules/:ruleId`
- **اشکال**: `updateRule` در controller هیچ `actor?.userId` را به service پاس نمی‌دهد و service نیز هیچ فیلد `updatedBy` را ثبت نمی‌کند. در نتیجه نمی‌توان مشخص کرد چه کسی rule را تغییر داده است.
- **کد**: `aml.controller.ts:updateRule` (lines 179-194) — `req` دریافت نمی‌شود (`@Req()` وجود ندارد) و `actor?.userId` پاس داده نمی‌شود. `aml.service.ts:updateRule` (lines 195-236) — پارامتر `updatedBy` وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۲.۵ (جدید) امنیتی بحرانی: expression engine با `new Function` معادل `eval`
- **اندپوینت**: `POST /aml/rules`، `POST /aml/transactions/evaluate`
- **اشکال**: `evaluateRuleExpression` از `new Function('ctx', ...)` با expression کاربر استفاده می‌کند که معادل `eval` است و امکان تزریق کد دلخواه (RCE) را فراهم می‌کند. یک rule با expression مخرب می‌تواند کد JavaScript دلخواه روی سرور اجرا کند (دسترسی به filesystem، env vars، network).
- **کد**: `aml.service.ts:evaluateRuleExpression` (lines 333-347) — `const safeEval = new Function('ctx', \`... return ${expression};\`)`. expression مستقیماً از `AmlRule.expression` (فیلد text در DB) خوانده می‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۳. Alert Management و Case Investigation

### ۳.۱ نبود case investigation workflow کامل
- **اندپوینت**: `PATCH /aml/alerts/:alertId/status`
- **اشکال**: alert فقط status و notes را update می‌کند. هیچ case investigation workflow وجود ندارد — یعنی هیچ اندپوینتی برای ایجاد investigation case، اضافه کردن evidence، ثبت findings، یا link کردن alert‌های مرتبط به یک case واحد. در AML، alertها باید به case‌های تحقیقاتی group شوند و workflow تحقیقاتی داشته باشند.
- **کد**: `aml.controller.ts` — هیچ اندپوینتی برای case management وجود ندارد. entities فقط `AmlAlert` و `AmlAlertDecision` هستند (هیچ `AmlCase` یا `AmlEvidence` entity وجود ندارد).
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم alert escalation chain
- **اندپوینت**: `PATCH /aml/alerts/:alertId/assign`
- **اشکال**: assign فقط alert را به یک کاربر اختصاص می‌دهد. هیچ مکانیزم escalation خودکار بر اساس severity یا SLA breach وجود ندارد. یک alert با severity بالا که در مدت زمان مشخصی assign یا resolve نشود، باید به‌طور خودکار به سطح بالاتر escalate شود اما این منطق در API تعریف نشده است.
- **کد**: `aml.service.ts:assignAlert` (lines 445-454) — فقط `assignedTo` را set می‌کند. `AmlAlert` entity دارای فیلد `escalatedAt` (line 75) است اما هیچ منطق خودکاری برای set کردن آن وجود ندارد. `isValidAlertTransition` (lines 369-379) اجازه transition به `'escalated'` را می‌دهد اما فقط از طریق manual status update.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ نبود false positive/negative management
- **اندپوینت**: `PATCH /aml/alerts/:alertId/status`
- **اشکال**: status update فقط `status` و `notes` را می‌گیرد. هیچ فیلد structured برای ثبت `disposition` (true positive، false positive، false negative) وجود ندارد. در AML، ردیابی false positive rate برای بهینه‌سازی rules و کاهش alert fatigue ضروری است. بدون این داده، نمی‌توان کیفیت rules را ارزیابی کرد.
- **کد**: `aml.service.ts:updateAlertStatus` (lines 456-495) — یک `AmlAlertDecision` با `fromStatus`، `toStatus`، `notes`، `snapshot`، `decidedBy` ایجاد می‌کند (audit trail وضعیت وجود دارد) اما هیچ فیلد `disposition` در `AmlAlertDecision` entity (lines 1-30) وجود ندارد. `AmlAlert` entity نیز فیلد `resolution` (line 81) دارد اما آن فقط text است و disposition structured نیست.
- **وضعیت**: ✅ تأیید شد (audit trail وضعیت via `AmlAlertDecision` وجود دارد، اما disposition structured نیست)

### ۳.۴ عدم link بین alert و source transaction
- **اندپوینت**: `POST /aml/alerts`
- **اشکال**: alert با `subjectNationalId` و `ruleId` ایجاد می‌شود اما هیچ `transactionId` یا `referenceType`/`referenceId` برای link کردن alert به تراکنش منبع وجود ندارد. این باعث می‌شود ردیابی alert به تراکنش اصلی غیرممکن شود.
- **کد**: `aml.controller.ts:createAlert` (lines 196-221) — body شامل `title`، `subjectNationalId`، `ruleId`، `severity`، `details` است. `aml.service.ts:createAlert` (lines 381-416) — این فیلدها را ذخیره می‌کند. توجه: `AmlAlert` entity دارای `referenceType`/`referenceId` (lines 54-58) است و `evaluateTransaction` (lines 273-298) این فیلدها را set می‌کند، اما `POST /aml/alerts` دستی این فیلدها را در request body نمی‌پذیرد.
- **وضعیت**: ✅ تأیید شد (برای `POST /aml/alerts` دستی؛ `evaluateTransaction` این مشکل را ندارد)

### ۳.۵ (جدید) BUG: listAlerts با nationalId رمزنگاری‌شده هم‌خوانی ندارد
- **اندپوینت**: `GET /aml/alerts`
- **اشکال**: مشابه ۱.۵ — `createAlert` مقدار `subjectNationalId` را رمزنگاری می‌کند اما `listAlerts` با مقدار raw مقایسه می‌کند. جستجوی alert بر اساس `subjectNationalId` هرگز نتیجه‌ای برنمی‌گرداند.
- **کد**: `aml.service.ts:createAlert` line 397 (`this.encryptPii(params.subjectNationalId)`) در مقابل `aml.service.ts:listAlerts` line 435 (`qb.andWhere('a.subject_national_id = :nid', { nid: params.subjectNationalId })`).
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۴. Transaction Evaluation

### ۴.۱ عدم bulk evaluation
- **اندپوینت**: `POST /aml/transactions/evaluate`
- **اشکال**: فقط یک تراکنش در هر request ارزیابی می‌شود. برای پردازش حجم بالای تراکنش‌ها (مثلاً end-of-day batch)، هیچ bulk evaluation endpoint وجود ندارد. این باعث می‌شود پردازش N تراکنش نیازمند N request باشد که ناکارآمد است.
- **کد**: `aml.controller.ts:evaluateTransaction` (lines 320-370) — body شامل یک `partyId`، `partyName`، `transactionType`، `amount` است. `aml.service.ts:evaluateTransaction` (lines 238-331) — یک تراکنش پردازش می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم async evaluation برای تراکنش‌های با حجم بالا
- **اندپوینت**: `POST /aml/transactions/evaluate`
- **اشکال**: evaluation به‌صورت synchronous انجام می‌شود. برای تراکنش‌های پیچیده با multiple rules و external source queries، response time می‌تواند طولانی باشد. هیچ مکانیزم async (job-based) برای evaluation وجود ندارد.
- **کد**: `aml.service.ts:evaluateTransaction` (lines 238-331) — تمام rules به‌صورت synchronous در یک حلقه ارزیابی می‌شوند (`for (const rule of enabledRules)`). توجه: `TransactionConsumer` (transaction.consumer.ts) به‌صورت async از Kafka تراکنش‌ها را مصرف می‌کند، اما خود evaluation در هر message همچنان synchronous است.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ ~~عدم threshold configuration قابل پیکربندی~~
- **اندپوینت**: `POST /aml/transactions/evaluate`
- ~~**اشکال**: response شامل `riskScore` و `requiresInvestigation` است اما threshold برای `requiresInvestigation` در سمت server hardcoded است. هیچ اندپوینتی برای پیکربندی threshold بر اساس `transactionType` یا `severity` وجود ندارد.~~
- **کد**: `aml.service.ts:evaluateTransaction` (lines 238-331) — response واقعی `{ alerts, riskLevel, riskScore }` است، نه `requiresInvestigation`. `riskLevel` توسط `determineOverallRiskLevel` (lines 354-361) بر اساس severity rules تعیین می‌شود. `calculateRiskScore` (lines 349-352) مقادیر hardcoded دارد: `{ low: 25, medium: 50, high: 75, critical: 100 }`.
- **وضعیت**: ~~رد شد~~ — **رد شد**: فیلد `requiresInvestigation` در کد وجود ندارد (response شامل `alerts`، `riskLevel`، `riskScore` است). اما نکته مرتبط: مقادیر risk score در `calculateRiskScore` hardcoded هستند و قابل پیکربندی نیستند (نقص جداگانه در ۴.۴).

### ۴.۴ (جدید) عدم قابل پیکربندی بودن مقادیر risk score
- **اندپوینت**: `POST /aml/transactions/evaluate`
- **اشکال**: مقادیر risk score برای هر severity level در کد hardcoded هستند (`low: 25, medium: 50, high: 75, critical: 100`) و قابل پیکربندی از طریق API نیستند.
- **کد**: `aml.service.ts:calculateRiskScore` (lines 349-352) — `const scores = { low: 25, medium: 50, high: 75, critical: 100 }`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۴.۵ (جدید) عدم validation که amount مثبت است
- **اندپوینت**: `POST /aml/transactions/evaluate`
- **اشکال**: controller فقط بررسی می‌کند که `typeof body?.amount !== 'number'` اما بررسی نمی‌کند که amount مثبت باشد. یک تراکنش با amount منفی می‌تواند ارزیابی شود.
- **کد**: `aml.controller.ts:evaluateTransaction` (lines 339-345) — `typeof body?.amount !== 'number'` بدون بررسی `body.amount > 0`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۵. External Data Sources

### ۵.۱ عدم masking و encryption برای connectionConfig
- **اندپوینت**: `POST /aml/external-sources`، `PUT /aml/external-sources/:sourceId`، `GET /aml/external-sources/:sourceId`
- **اشکال**: `connectionConfig` به‌عنوان object ارسال می‌شود که احتمالاً شامل credentials (API keys، passwords) است. هیچ اشاره‌ای به masking یا encryption این داده‌ها در response وجود ندارد. `GET /aml/external-sources/:sourceId` ممکن است credentials را در clear text برگرداند.
- **کد**: `aml.service.ts:createExternalDataSource` (lines 552-580) — `connectionConfig: params.connectionConfig` مستقیماً در jsonb ذخیره می‌شود. `getExternalDataSource` (lines 606-608) — مستقیماً entity را برمی‌گرداند. `PiiMaskingMiddleware` (pii-masking.middleware.ts) — `connectionConfig` در `PII_FIELDS` set نیست (فقط `nationalId`، `mobile`، `contactPhone` و ...). در `syncExternalDataSource` (line 654) و `queryExternalDataSource` (line 722)، `config.apiKey` مستقیماً از connectionConfig خوانده و در header استفاده می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم rate limiting برای query
- **اندپوینت**: `POST /aml/external-sources/:sourceId/query`
- **اشکال**: query external source با `nationalId` و `name` انجام می‌شود اما هیچ rate limiting یا quota management وجود ندارد. یک کاربر می‌تواند به‌طور مکرر query کند و منبع خارجی را به rate limit یا ban برساند.
- **کد**: `aml.controller.ts:queryExternalDataSource` (lines 589-621) — هیچ throttle یا rate limit middleware وجود ندارد. `aml.service.ts:queryExternalDataSource` (lines 701-753) — هیچ شمارش‌ای از query‌ها نگه نمی‌دارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم audit log برای external source queries
- **اندپوینت**: `POST /aml/external-sources/:sourceId/query`
- **اشکال**: query یک منبع خارجی با `nationalId` یک عملیات حساس AML است. هیچ الزامی برای ثبت audit log (چه کسی، چه زمانی، چه nationalId را query کرد) در API تعریف نشده است. این برای compliance audit ضروری است.
- **کد**: `aml.controller.ts:queryExternalDataSource` (lines 589-621) — `auditLogger.info('aml.external_sources.query.request', { correlationId, action: 'aml:view', sourceId })` فراخوانی می‌کند، اما `actorUserId` و `nationalId` (پارامتر حساس query) در audit log ثبت نمی‌شوند. `@Req()` دریافت نمی‌شود.
- **وضعیت**: ✅ تأیید شد (audit log وجود دارد اما ناقص است — `actorUserId` و `nationalId` ثبت نمی‌شوند)

### ۵.۴ (جدید) عدم endpoint برای delete external data source
- **اندپوینت**: (نبود)
- **اشکال**: `deleteExternalDataSource` در service وجود دارد اما هیچ controller endpoint ای برای آن تعریف نشده است. یک منبع داده خارجی غیرفعال نمی‌تواند از طریق API حذف شود.
- **کد**: `aml.service.ts:deleteExternalDataSource` (lines 624-631) — متد وجود دارد. `aml.controller.ts` — هیچ `@Delete('/aml/external-sources/:sourceId')` وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۶. Reports و Regulatory Reporting

### ۶.۱ عدم async report generation
- **اندپوینت**: `POST /aml/reports/official`
- **اشکال**: report generation به‌صورت synchronous انجام می‌شود و `fileUrl` در response برمی‌گردد. برای گزارش‌های بزرگ (مثلاً annual_summary)، این می‌تواند timeout ایجاد کند. باید به‌صورت async با job tracking باشد.
- **کد**: `aml.controller.ts:generateOfficialReport` (lines 623-699) — synchronous. `aml.service.ts:generateOfficialReport` (lines 756-861) — تمام داده‌ها در همان request جمع‌آوری و برمی‌گردد. توجه: response واقعی شامل `reportData` است، نه `fileUrl` (کاتالوگ `fileUrl` را ذکر کرده اما کد `reportData` برمی‌گرداند).
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم report history و download
- **اندپوینت**: `POST /aml/reports/official`
- **اشکال**: report تولید می‌شود و `fileUrl` برمی‌گردد اما هیچ اندپوینتی برای list گزارش‌های قبلی، download مجدد، یا delete گزارش‌های قدیمی وجود ندارد. گزارش‌های رسمی AML باید برای مدت قانونی قابل دسترسی باشند.
- **کد**: `aml.service.ts:generateOfficialReport` (lines 756-861) — report در memory تولید و برمی‌گردد، در DB ذخیره نمی‌شود. هیچ `AmlReport` entity وجود ندارد. هیچ `GET /aml/reports` یا `GET /aml/reports/:reportId` endpoint نیست.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم regulatory submission tracking
- **اندپوینت**: `POST /aml/reports/official`
- **اشکال**: report تولید می‌شود اما هیچ مکانیزمی برای tracking وضعیت submission به نهاد نظارتی (sent، accepted، rejected، needs revision) وجود ندارد. در AML، گزارش‌های رسمی باید submission status و acknowledgement از نهاد نظارتی ثبت کنند.
- **کد**: `aml.service.ts:generateOfficialReport` — هیچ فیلد submission status یا ارجاع به regulatory-gateway-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ (جدید) گزارش currency_transaction یک stub خالی است
- **اندپوینت**: `POST /aml/reports/official`
- **اشکال**: وقتی `reportType` برابر `currency_transaction` است، گزارش هیچ داده واقعی تولید نمی‌کند — `currencyTransactions: []` و `totalTransactions: 0` hardcoded برمی‌گردد. این گزارش در عمل بی‌فایده است.
- **کد**: `aml.service.ts:generateOfficialReport` (lines 820-828) — `reportData.currencyTransactions = []; reportData.summary = { totalTransactions: 0, totalAmount: 0, currency: 'IRR' }`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۷. Dashboard و Export

### ۷.۱ عدم dashboard filtering
- **اندپوینت**: `GET /aml/dashboard`
- **اشکال**: dashboard هیچ query param پشتیبانی نمی‌کند. هیچ فیلتری بر اساس بازه زمانی، severity، یا status وجود ندارد. dashboard فقط یک snapshot کلی نشان می‌دهد که برای تحلیل‌های تخصصی AML کافی نیست.
- **کد**: `aml.controller.ts:dashboard` (lines 88-105) — هیچ `@Query` پارامتری دریافت نمی‌کند. `aml.service.ts:getDashboard` (lines 497-527) — فقط `now: Date` دریافت می‌کند و aggregate counts برمی‌گرداند (totalsByStatus، totalsBySeverity، openUnassigned) بدون هیچ فیلتر زمانی.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم pagination در export
- **اندپوینت**: `GET /aml/export`
- **اشکال**: export با limit‌های جداگانه برای consents، rules و alerts (default: 200) انجام می‌شود اما هیچ cursor یا pagination mechanism وجود ندارد. اگر تعداد records از limit بیشتر باشد، داده‌های باقی‌مانده قابل دسترسی نیست.
- **کد**: `aml.controller.ts:exportSnapshot` (lines 290-318) — `consentsLimit`، `rulesLimit`، `alertsLimit` با default 200. `aml.service.ts:exportSnapshot` (lines 529-549) — `clampInt` با max 2000، `take` بدون cursor. هیچ `offset` یا `cursor` پارامتری وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۸. ذینفعان و مصرف‌کنندگان

### ۸.۱ ~~عدم یکپارچه‌سازی با claims-service برای AML screening~~
- ~~**اشکال**: `POST /aml/transactions/evaluate` به‌صورت manual فراخوانی می‌شود. هیچ یکپارچه‌سازی خودکار با claims-service یا payments-service وجود ندارد که تراکنش‌های بزرگ را به‌طور خودکار برای AML screening ارسال کند. این باعث می‌شود تراکنش‌های مشکوک بدون screening از دست برود.~~
- **کد**: `transaction.consumer.ts` (lines 1-298) — `TransactionConsumer` به topics زیر subscribe می‌کند: `insurance.payment.completed`، `insurance.policy.issued`، `insurance.claim.registered`، `insurance.claim.paid`، `insurance.collection.received`. هر message به‌طور خودکار `amlService.evaluateTransaction` را فراخوانی می‌کند (line 233). Idempotency با `ConsumedEvent` check (lines 122-128) و DLQ برای خطاها (lines 283-287) پیاده‌سازی شده است.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `TransactionConsumer` در `transaction.consumer.ts` به‌طور خودکار تراکنش‌های claims، payments، policies و collections را از Kafka مصرف و ارزیابی می‌کند.

### ۸.۲ عدم یکپارچه‌سازی با regulatory-gateway-service
- **اشکال**: `POST /aml/reports/official` گزارش تولید می‌کند اما مشخص نیست این گزارش چگونه به نهاد نظارتی ارسال می‌شود. aml-service باید از regulatory-gateway-service به عنوان gateway ارسال استفاده کند اما هیچ اشاره‌ای به این یکپارچه‌سازی در endpoint‌ها وجود ندارد.
- **کد**: `aml.service.ts:generateOfficialReport` (lines 756-861) — هیچ فراخوانی به regulatory-gateway-service یا publish event برای ارسال گزارش وجود ندارد. گزارش فقط در memory تولید و برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ ~~عدم یکپارچه‌سازی با notification-service برای alert notification~~
- ~~**اشکال**: وقتی alert با severity بالا ایجاد می‌شود، هیچ مکانیزمی برای notification خودکار به compliance officer از طریق notification-service وجود ندارد. alert فقط در سیستم ثبت می‌شود و کاربر باید به‌صورت manual dashboard را چک کند.~~
- **کد**: `aml.service.ts:evaluateTransaction` (lines 302-323) — `OutboxPublisher` event `insurance.aml.alert.created` را publish می‌کند. `transaction.consumer.ts` (lines 244-270) — برای risk high/critical نیز `insurance.aml.alert.created` را publish می‌کند. notification-service می‌تواند این event را مصرف کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event‌های `insurance.aml.alert.created` از طریق Outbox publish می‌شوند که notification-service می‌تواند مصرف کند. توجه: یکپارچه‌سازی مستقیم (synchronous) وجود ندارد، اما مکانیزم event-driven برای notification فراهم است.

### ۸.۴ عدم دسترسی claims-readmodel-service به AML alerts
- **اشکال**: claims-readmodel-service فقط claims، fraud cases و complaints را projection می‌کند. AML alertها در read model وجود ندارند. این باعث می‌شود query‌های cross-domain (مثلاً claims با AML alert فعال) غیرممکن شود.
- **کد**: aml-service event `insurance.aml.alert.created` را publish می‌کند (aml.service.ts lines 302-323)، اما این نقص در claims-readmodel-service است که باید این event را projection کند (نقص در سرویس مقصد، نه aml-service).
- **وضعیت**: ✅ تأیید شد (نقص در claims-readmodel-service)

### ۸.۵ عدم SoD بین rule creator و rule approver
- **اشکال**: permission `aml:rules:manage` هم برای create و هم برای update rule استفاده می‌شود. هیچ تفکیکی بین نقش rule creator و rule approver وجود ندارد. در AML، Separation of Duties الزامی است — کسی که rule را ایجاد می‌کند نباید همان کسی باشد که آن را تایید می‌کند.
- **کد**: `permissions.ts` (lines 1-82) — `aml:rules:manage` یک permission واحد است. `insurer_admin`، `aml_officer` و `head_office_ops` همگی این permission را دارند. هیچ `aml:rules:approve` جداگانه وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۹. نقص‌های امنیتی و زیرساختی (جدید)

### ۹.۱ (جدید) عدم tenant isolation در query‌ها
- **اندپوینت**: همه اندپوینت‌ها (به جز `/health`)
- **اشکال**: controller‌ها `tenantId` را از `req.user` استخراج می‌کنند اما به service پاس نمی‌دهند. service‌ها هیچ فیلتری بر اساس `tenantId` اعمال نمی‌کنند. نتیجه: داده‌های همه tenant‌ها قابل دسترسی هستند و tenant isolation نقض می‌شود.
- **کد**: `aml.controller.ts:createConsent` (lines 31-53) — `const tenantId = req?.user?.tenantId` استخراج می‌شود اما به `createConsent` پاس داده نمی‌شود. `aml.service.ts:createConsent` (lines 59-94) — هیچ پارامتر `tenantId` وجود ندارد. entities (`AmlConsent`، `AmlRule`، `AmlAlert`) هیچ ستون `tenant_id` ندارند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۹.۲ (جدید) کلید رمزنگاری PII دارای default hardcoded
- **اندپوینت**: `POST /aml/consents`، `POST /aml/alerts`
- **اشکال**: `encryptPii` از `process.env.FIELD_ENCRYPTION_KEY || 'default-encryption-key-32b'` استفاده می‌کند. اگر env var تنظیم نشده باشد، یک کلید hardcoded استفاده می‌شود که امنیت رمزنگاری PII را کاملاً نقض می‌کند.
- **کد**: `aml.service.ts:encryptPii` (lines 37-45) — `const key = process.env.FIELD_ENCRYPTION_KEY || 'default-encryption-key-32b'`. همین pattern در `decryptPii` (lines 47-57).
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۹.۳ (جدید) AbacGuard بیش از حد permissive برای GET
- **اندپوینت**: همه اندپوینت‌های GET
- **اشکال**: `AbacGuard` برای همه درخواست‌های GET از هر کاربر authenticated شده `true` برمی‌گرداند، بدون بررسی نقش. اگرچه `PermissionsGuard` جداگانه permission را بررسی می‌کند، AbacGuard به‌عنوان یک لایه دفاعی اضافی عمل نمی‌کند.
- **کد**: `abac.guard.ts` (lines 1-28) — `if (method === 'GET') return true` (line 15). برای non-GET، فقط `roles.length > 0` بررسی می‌شود (line 26).
- **وضعیت**: ✅ تأیید شد (نقص جدید)
