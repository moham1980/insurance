# Notification Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: notification-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/notification-service/src/`

---

## ۱. ارسال Notification

### ۱.۱ عدم validation recipient بر اساس channel
- **اندپوینت**: `POST /notifications`
- **اشکال**: در request body، `channel` می‌تواند `sms|email|push` باشد و `recipient` یک رشته آزاد است. هیچ validation ای بررسی نمی‌کند که آیا `recipient` با `channel` مطابقت دارد (مثلاً برای `channel: sms` باید شماره موبایل معتبر باشد و برای `channel: email` باید ایمیل معتبر باشد). ارسال notification با recipient نامعتبر باعث waste of resource و retry بی‌نتیجه می‌شود.
- **کد**: `notification.controller.ts:send()` (خطوط ۴۵-۷۲) — `body.recipient: string` بدون هیچ regex یا format validation. `notification.service.ts:sendNotification()` (خطوط ۱۳۸-۱۴۴) — `params.recipient` مستقیماً در `NotificationLog` ذخیره می‌شود. `entities/NotificationLog.ts` (خط ۵۹): `@Column({ type: 'varchar', length: 255 }) recipient: string;` — هیچ constraint ای روی فرمت.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ نبود idempotency key
- **اندپوینت**: `POST /notifications`
- **اشکال**: هیچ فیلد `idempotencyKey` در request body وجود ندارد. در صورت retry شبکه، یک notification می‌تواند دو بار ارسال شود. در notification‌های حساس (مثل OTP یا payment confirmation)، ارسال duplicate باعث سردرگمی کاربر و مشکلات امنیتی می‌شود.
- **کد**: `notification.controller.ts:send()` (خطوط ۵۱-۵۹) — body type شامل `userId`، `correlationId`، `channel`، `type`، `recipient`، `message`، `metadata` است. هیچ `idempotencyKey` وجود ندارد. `notification.service.ts` نیز هیچ idempotency check انجام نمی‌دهد.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ نبود scheduling و delayed delivery
- **اندپوینت**: `POST /notifications`
- **اشکال**: هیچ فیلد `scheduledAt` در request body `POST /notifications` وجود دارد (فقط در `POST /notifications/bulk`) اما در ارسال تکی پشتیبانی نمی‌شود. اپراتورها نمی‌توانند یک notification را برای زمان آینده (مثل reminder ۲۴ ساعت قبل از انقضای بیمه‌نامه) زمان‌بندی کنند.
- **کد**: `notification.controller.ts:send()` (خطوط ۵۱-۵۹) — هیچ `scheduledAt` در body type. `notification.controller.ts:sendBulk()` (خطوط ۴۳۰-۴۳۸) — `scheduledAt?: Date` در body type وجود دارد. `notification.service.ts:sendBulkNotifications()` (خطوط ۵۳۰-۵۳۳): `if (!params.scheduledAt) { this.scheduleProcess(log.id); }` — اگر scheduledAt تنظیم شده باشد، process نمی‌شود (ولی هیچ cron job ای برای پردازش بعدی scheduled notification‌ها وجود ندارد!).
- **وضعیت**: ✅ تأیید شد

### ۱.۴ نبود priority و urgency
- **اندپوینت**: `POST /notifications`
- **اشکال**: هیچ فیلدی برای `priority` یا `urgency` وجود ندارد. در یک سیستم با حجم بالا، notification‌های critical (مثل fraud alert) باید اولویت بالاتری نسبت به notification‌های اطلاع‌رسانی عمومی داشته باشند. بدون priority، همه notification‌ها در یک صف پردازش می‌شوند و critical alert‌ها ممکن است تأخیر داشته باشند.
- **کد**: `notification.controller.ts:send()` (خطوط ۵۱-۵۹) — هیچ `priority` در body type. `entities/NotificationLog.ts` — هیچ فیلد `priority` در entity.
- **وضعیت**: ✅ تأیید شد

---

## ۲. OTP Management

### ۲.۱ ~~نبود rate limiting در send OTP~~
- **اندپوینت**: `POST /notifications/otp`
- ~~**اشکال**: هیچ rate limiting ای برای ارسال OTP تعریف نشده است. یک مهاجم می‌تواند هزاران OTP به یک شماره ارسال کند و باعث SMS bombing و هزینه بالا شود.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `notification.service.ts:checkOtpRateLimit()` (خطوط ۵۶-۷۰) با استفاده از Redis rate limiting پیاده‌سازی شده. `OTP_MAX_PER_WINDOW` (پیش‌فرض ۵) و `OTP_WINDOW_MS` (پیش‌فرض ۳۰۰۰۰۰ms = ۵ دقیقه) از environment variable قابل تنظیم. `sendOtp()` (خط ۱۵۲) ابتدا `checkOtpRateLimit` را فراخوانی می‌کند و اگر محدودیت تجاوز کرده باشد `BadRequestException` پرتاب می‌کند.

### ۲.۲ نبود OTP expiry در پاسخ
- **اندپوینت**: `POST /notifications/otp`
- **اشکال**: پاسخ فقط `reference` را برمی‌گرداند. هیچ اطلاعاتی درباره مدت اعتبار OTP (مثلاً ۵ دقیقه) یا حداکثر تعداد تلاش verify وجود ندارد. کلاینت نمی‌داند OTP تا کی معتبر است و باید به‌صورت hardcode این مقدار را در نظر بگیرد.
- **کد**: `notification.controller.ts:sendOtp()` (خط ۱۰۰): `data: { reference: result.reference }` — فقط reference. `notification.service.ts` (خط ۳۱): `otpTtlSeconds = 300` (۵ دقیقه) و (خط ۱۷۶): `otpMaxAttempts = 5` — این مقادیر در کد هستند اما در پاسخ برگردانده نمی‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ ~~نبود max retry در verify OTP~~
- **اندپوینت**: `POST /notifications/otp/verify`
- ~~**اشکال**: هیچ محدودیتی برای تعداد تلاش verify وجود ندارد. یک مهاجم می‌تواند به‌صورت brute force تمام کدهای ممکن را امتحان کند.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `notification.service.ts:verifyOtp()` (خطوط ۱۷۹-۲۰۸) — max attempts پیاده‌سازی شده. `otpMaxAttempts` (پیش‌فرض ۵، line 176) و `otpLockoutSeconds` (پیش‌فرض ۹۰۰s = ۱۵ دقیقه، line 177). اگر تعداد تلاش‌های ناموفق به `otpMaxAttempts` برسد، `ForbiddenException` با پیام lockout پرتاب می‌شود. شمارش تلاش‌ها در Redis با key `otp_attempts:{tenantId}:{reference}` ذخیره می‌شود.

### ۲.۴ ~~نبود OTP resend با cooldown~~
- **اندپوینت**: `POST /notifications/otp`
- ~~**اشکال**: هیچ مکانیزمی برای resend OTP با cooldown وجود ندارد.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد (جزئی)**: `checkOtpRateLimit` (خطوط ۵۶-۷۰) به‌عنوان cooldown عمل می‌کند — حداکثر `OTP_MAX_PER_WINDOW` (پیش‌فرض ۵) OTP در `OTP_WINDOW_MS` (پیش‌فرض ۵ دقیقه). **اما نقص باقی‌مانده**: OTP قبلی با send جدید explicitly باطل نمی‌شود. هر OTP جدید در Redis با reference جدید (log.id) ذخیره می‌شود و OTP قبلی با reference قدیمی پس از TTL (۳۰۰ ثانیه) منقضی می‌شود، اما تا آن زمان هر دو reference معتبر هستند.

---

## ۳. Template Management

### ۳.۱ نبود template versioning
- **اندپوینت**: `POST /notifications/sms/templates`، `POST /notifications/email/templates`
- **اشکال**: template فقط create و update می‌شود. هیچ versioning ای وجود ندارد. وقتی یک template تغییر می‌کند، نسخه قبلی از بین می‌رود و نمی‌توان audit trail تغییرات را ردیابی کرد. در یک سیستم enterprise، template باید versioned باشد تا در صورت مشکل، rollback به نسخه قبلی ممکن باشد.
- **کد**: `entities/SmsTemplate.ts` و `entities/EmailTemplate.ts` — هیچ فیلد `version` در entity‌ها وجود ندارد. `updateSmsTemplate` و `updateEmailTemplate` در service مستقیماً `Object.assign(template, params)` و `save` می‌کنند.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ نبود endpoint برای delete template
- **اندپوینت**: `POST /notifications/sms/templates/:id` (update)، `GET /notifications/sms/templates`
- **اشکال**: هیچ `DELETE` endpoint ای برای حذف template وجود ندارد. template‌های منسوخ به‌صورت دائمی باقی می‌مانند. اگر یک template در حال استفاده باشد، حذف آن باید prevented شود اما حداقل باید soft delete یا archive پشتیبانی شود.
- **کد**: `notification.controller.ts` — هیچ `@Delete` برای template‌ها وجود ندارد. (توجه: `@Delete` برای credentials در خط ۶۳۲ وجود دارد اما برای template‌ها نه.)
- **وضعیت**: ✅ تأیید شد

### ۳.۳ نبود template preview
- **اندپوینت**: `POST /notifications/sms/templates`، `POST /notifications/email/templates`
- **اشکال**: هیچ endpoint ای برای preview کردن template با متغیرهای نمونه وجود ندارد. اپراتور باید template را ذخیره کند و سپس یک notification تستی ارسال کند تا نتیجه را ببیند. یک `POST /notifications/sms/templates/preview` با `variables` و `language` باید وجود داشته باشد تا بدون ارسال واقعی، محتوای نهایی template نمایش داده شود.
- **کد**: هیچ endpoint preview در controller وجود ندارد. `renderTemplate` (خطوط ۵۳۹-۵۴۷) در service یک متد private است که فقط در `processNotification` فراخوانی می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ استفاده از POST برای update به جای PUT/PATCH
- **اندپوینت**: `POST /notifications/sms/templates/:id`، `POST /notifications/email/templates/:id`
- **اشکال**: برای update template از `POST` استفاده شده است. استاندارد REST ایجاب می‌کند برای update از `PUT` (کل resource) یا `PATCH` (بخشی از resource) استفاده شود. استفاده از `POST` برای update غیراستاندارد است و می‌تواند باعث سردرگمی در طراحی API client شود.
- **کد**: `notification.controller.ts` (خط ۲۶۱): `@Post('sms/templates/:id')` و (خط ۳۶۰): `@Post('email/templates/:id')` — هر دو از `@Post` برای update استفاده می‌کنند.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ نبود template approval workflow
- **اندپوینت**: `POST /notifications/sms/templates`، `POST /notifications/email/templates`
- **اشکال**: template به‌محض create شدن فعال است. هیچ approval workflow ای وجود ندارد. در یک سیستم با compliance requirements، template‌های SMS/Email باید قبل از فعال‌سازی توسط یک نفر دیگر review و approve شوند. نبود SoD در template management باعث می‌شود یک نفر بتواند template جعلی ایجاد و استفاده کند.
- **کد**: `notification.service.ts:createEmailTemplate()` (خط ۶۲۱): `isActive: true` — template بلافاصله فعال است. `createSmsTemplate` نیز همین رفتار را دارد. هیچ فیلد `status` (draft/pending/approved) یا `approvedBy` در entity وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Delivery و Retry

### ۴.۱ ~~نبود retry policy قابل پیکربندی~~
- **اندپوینت**: `POST /notifications/:id/retry`
- ~~**اشکال**: retry فقط به‌صورت دستی از طریق endpoint انجام می‌شود. هیچ retry policy خودکار (مثل retry after 30s، 2m، 10m با exponential backoff) تعریف نشده است.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `notification.service.ts:processNotification()` (خطوط ۳۴۷-۳۵۱): auto-retry با exponential backoff پیاده‌سازی شده. `const delay = this.retryDelayMs * Math.pow(2, log.retryCount);` — `retryDelayMs` پیش‌فرض ۵۰۰۰ms (خط ۳۰)، `maxRetries` پیش‌فرض ۳ (خط ۲۹). **اما نقص باقی‌مانده**: این مقادیر از environment variable قابل تنظیم نیستند (hardcoded در constructor) و per-notification قابل پیکربندی نیستند.

### ۴.۲ نبود channel failover
- **اندپوینت**: `POST /notifications`
- **اشکال**: اگر ارسال SMS fail شود، هیچ مکانیزم failover خودکار به channel جایگزین (مثل email) وجود ندارد. در `GET /notifications/health/providers` یک `fallbackSms` (Twilio) تعریف شده اما failover بین channel‌ها (مثلاً SMS → email) پشتیبانی نمی‌شود. در یک سیستم enterprise، اگر SMS provider down باشد، notification باید به‌طور خودکار از طریق email ارسال شود.
- **کد**: `notification.service.ts:processNotification()` (خطوط ۲۲۸-۲۶۱) — SMS provider fallback پیاده‌سازی شده: `if (!result.success && this.fallbackSmsProvider) { result = await this.fallbackSmsProvider.sendSms(...) }`. اما این فقط بین دو SMS provider است (primary → fallback)، نه بین channel‌ها (SMS → email).
- **وضعیت**: ✅ تأیید شد

### ۴.۳ نبود delivery guarantee mechanism
- **اندپوینت**: `POST /notifications`، `POST /notifications/delivery-callback`
- **اشکال**: هیچ مکانیزم at-least-once یا exactly-once delivery تعریف نشده است. delivery callback از provider دریافت می‌شود اما اگر callback از دست برود (مثلاً network failure)، notification در status `sent` باقی می‌ماند و هرگز `delivered` نمی‌شود. هیچ مکانیزم reconciliation با provider برای بررسی وضعیت delivery وجود ندارد.
- **کد**: `notification.service.ts:handleDeliveryCallback()` (خطوط ۴۴۱-۴۹۷) — callback فقط به‌صورت push از provider دریافت می‌شود. هیچ polling یا reconciliation mechanism برای بررسی وضعیت delivery از provider وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ پذیرش tenantId از سمت کلاینت در delivery callback
- **اندپوینت**: `POST /notifications/delivery-callback`، `POST /notifications/webhooks/delivery`
- **اشکال**: در request body delivery callback، `tenantId` از سمت provider ارسال می‌شود. این باید از notification record استخراج شود، نه از body. یک provider مخرب یا compromised می‌تواند `tenantId` جعلی ارسال کند و status notification tenant دیگر را تغییر دهد.
- **کد**: `notification.controller.ts:deliveryCallback()` (خطوط ۱۷۰-۱۹۸) — `body.tenantId` به service پاس می‌شود. `notification.service.ts:handleDeliveryCallback()` (خطوط ۴۴۹-۴۵۰): `if (params.tenantId) where.tenantId = params.tenantId;` — اگر tenantId از body ارسال شود، در query استفاده می‌شود. اگر ارسال نشود، notification بدون tenant filter پیدا می‌شود که خطرناک‌تر است. **نکته**: `CallbackAuthGuard` (خطوط ۱-۴۵) با API key و optional HMAC authentication کار می‌کند که تا حدی امنیت را تضمین می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۴.۵ نبود dead letter queue برای notification‌های failed
- **اندپوینت**: `POST /notifications/retry-all-failed`
- **اشکال**: `retry-all-failed` تمام notification‌های failed را retry می‌کند اما اگر notification بعد از maxRetries همچنان fail شود، در چه وضعی قرار می‌گیرد؟ هیچ DLQ (Dead Letter Queue) ای تعریف نشده است. notification‌های permanently failed باید به DLQ منتقل شوند تا اپراتورها بتوانند آنها را بررسی و manually resolve کنند.
- **کد**: `notification.service.ts:processNotification()` (خطوط ۳۱۲-۳۱۶): `if (log.retryCount < this.maxRetries) { log.status = RETRYING } else { log.status = FAILED }` — پس از maxRetries، notification در status `FAILED` باقی می‌ماند. هیچ DLQ یا separate table برای permanently failed notification‌ها وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Bulk و Push

### ۵.۱ نبود bulk notification با template
- **اندپوینت**: `POST /notifications/bulk`
- **اشکال**: bulk notification فقط `message` (متن خام) را پشتیبانی می‌کند، نه template. نمی‌توان یک template را به لیستی از recipients ارسال کرد. این محدودیت باعث می‌شود برای ارسال bulk با template، کلاینت باید به‌صورت متوالی `POST /notifications/sms/send-template` را برای هر recipient فراخوانی کند.
- **کد**: `notification.controller.ts:sendBulk()` (خطوط ۴۳۰-۴۳۸) — body شامل `channel`، `type`، `recipients`، `message`، `scheduledAt`، `metadata`، `userId` است. هیچ `templateId` یا `templateType` وجود ندارد. `sendBulkNotifications()` در service (خطوط ۴۹۹-۵۳۷) فقط `message` خام را پردازش می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ نبود chunk و progress tracking در bulk
- **اندپوینت**: `POST /notifications/bulk`
- **اشکال**: bulk notification تمام recipients را در یک درخواست دریافت می‌کند و پاسخ فوری برمی‌گرداند. هیچ مکانیزم chunk (تقسیم به batch‌های کوچک) یا progress tracking وجود ندارد. برای ۱۰۰۰۰ recipient، این می‌تواند timeout ایجاد کند. باید یک async job ایجاد شود و status از طریق `GET /notifications/bulk/:jobId/status` قابل ردیابی باشد.
- **کد**: `notification.service.ts:sendBulkNotifications()` (خطوط ۵۱۲-۵۲۸) — تمام recipients در یک transaction ایجاد می‌شوند: `for (const recipient of params.recipients) { const log = await this.createNotificationLog(manager, ...) }`. هیچ chunk یا batch processing وجود ندارد. `batchId` برگردانده می‌شود اما هیچ endpointی برای query status با batchId وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ نبود push subscription management
- **اندپوینت**: `POST /notifications/push`
- **اشکال**: push notification با subscription object ارسال می‌شود اما هیچ endpoint ای برای ذخیره، مدیریت یا حذف subscription وجود ندارد. هر بار کلاینت باید subscription را در request body ارسال کند. subscription‌ها باید سمت سرور ذخیره و بر اساس userId مدیریت شوند.
- **کد**: `notification.controller.ts:sendPush()` (خطوط ۴۷۹-۵۱۳) — `body.subscription` شامل `endpoint`، `keys.p256dh`، `keys.auth` است. هیچ endpoint برای ذخیره/لیست/حذف subscription وجود ندارد. `push-channel.ts` subscription‌ها را در حافظه نگه می‌دارد.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Credential Vault

### ۶.۱ نبود credential activation/deactivation
- **اندپوینت**: `POST /notifications/credentials`، `POST /notifications/credentials/:credentialId/rotate`
- **اشکال**: credential فقط set، rotate و delete می‌شود. هیچ endpoint ای برای activate/deactivate credential بدون حذف آن وجود ندارد. در `GET /notifications/credentials` فیلد `isActive` وجود دارد اما هیچ endpoint ای برای تغییر آن تعریف نشده است.
- **کد**: `notification.controller.ts` — endpoints: `GET credentials` (list)، `POST credentials` (set)، `POST credentials/:credentialId/rotate`، `DELETE credentials/:credentialId`. هیچ `PATCH credentials/:credentialId/activate` یا `PATCH credentials/:credentialId/deactivate` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ نبود credential test/validation
- **اندپوینت**: `POST /notifications/credentials`
- **اشکال**: وقتی یک credential set می‌شود، هیچ validation ای بررسی نمی‌کند که آیا credential معتبر است یا خیر. باید یک `POST /notifications/credentials/:credentialId/test` وجود داشته باشد که یک request تستی به provider ارسال کند و validity credential را تأیید کند.
- **کد**: `credential-vault.service.ts` — هیچ متد test یا validate وجود ندارد. credential فقط ذخیره می‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ عدم یکپارچه‌سازی با monitoring-service برای alert notification
- **اشکال**: monitoring-service alert تولید می‌کند اما هیچ مکانیزمی برای routing این alert‌ها به notification-service تعریف نشده است. notification-service باید endpoint‌هایی برای دریافت alert از monitoring-service و ارسال به اپراتورها داشته باشد اما این یکپارچه‌سازی غایب است.
- **کد**: هیچ import یا reference به monitoring-service در `services/notification-service/src/` وجود ندارد. هیچ Kafka consumer برای alert topic‌ها تعریف نشده.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم یکپارچه‌سازی با orchestrator-service برای workflow notification
- **اشکال**: orchestrator-service که workflow‌ها را مدیریت می‌کند، در مراحل مختلف workflow نیاز به ارسال notification دارد (مثل "claim submitted"، "approval required"). هیچ endpoint خاصی برای workflow notification تعریف نشده است و orchestrator باید از `POST /notifications` عمومی استفاده کند.
- **کد**: هیچ endpoint خاصی برای workflow در controller وجود ندارد. `NotificationType` enum (خطوط ۱۷-۳۴) شامل type‌هایی مثل `CLAIM_SUBMITTED`، `CLAIM_APPROVED`، `POLICY_ISSUED` است که می‌تواند توسط orchestrator استفاده شود اما هیچ endpoint مخصوص workflow وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۷.۳ عدم تفکیک دسترسی بین tenant‌ها در credential management
- **اشکال**: credential vault با `notification:credentials:manage` مدیریت می‌شود اما هیچ tenant-level isolation ای در credential management تعریف نشده است. یک اپراتور tenant A نباید بتواند credential tenant B را ببیند یا تغییر دهد. `TenantGuard` ذکر شده اما مشخص نیست credential‌ها به‌درستی tenant-scoped هستند.
- **کد**: `notification.controller.ts:listCredentials()` (خط ۵۵۵): `this.credentialVault.listCredentials(req.tenantId!, provider)` — tenant-scoped. `setCredential()` (خط ۵۷۸): `tenantId: req.tenantId!` — tenant-scoped. **اما** `deleteCredential()` (خطوط ۶۳۲-۶۴۱): `this.credentialVault.deleteCredential(credentialId)` — **بدون tenantId check!** هر tenant می‌تواند credential هر tenant دیگر را حذف کند.
- **وضعیت**: ✅ تأیید شد

### ۷.۴ عدم دسترسی customer-portal به notification history
- **اشکال**: customer-portal-service باید بتواند تاریخچه notification‌های customer را نمایش دهد اما `GET /notifications` فقط `userId` را فیلتر می‌کند. هیچ BFF endpoint ای برای customer-portal برای دسترسی امن به notification history تعریف نشده است.
- **کد**: `notification.controller.ts:list()` (خطوط ۱۳۶-۱۶۸) — `@Query('userId')` برای فیلتر. `permissions.ts` (خطوط ۳۹-۴۳): نقش `customer_service` فقط `notification:send`، `notification:view`، `notification:list` دارد. هیچ نقش `customer` تعریف نشده.
- **وضعیت**: ✅ تأیید شد

### ۷.۵ نبود preference management برای کاربران
- **اشکال**: هیچ endpoint ای برای مدیریت ترجیحات notification (notification preferences) کاربر وجود ندارد. کاربر باید بتواند انتخاب کند کدام channel را برای کدام type notification ترجیح می‌دهد (مثلاً "claim update را فقط email بفرست، نه SMS"). این قابلیت در یک سیستم enterprise ضروری است اما کاملاً غایب است.
- **کد**: هیچ entity، endpoint یا logic برای notification preferences در کل سرویس وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۸. نقص‌های جدید یافت‌شده در کد

### ۸.۱ عدم tenant isolation در deleteCredential
- **اندپوینت**: `DELETE /notifications/credentials/:credentialId`
- **اشکال**: `deleteCredential` endpoint هیچ tenantId check انجام نمی‌دهد. هر کاربر با permission `notification:credentials:manage` می‌تواند credential هر tenant دیگری را حذف کند.
- **کد**: `notification.controller.ts:deleteCredential()` (خطوط ۶۳۲-۶۴۱): `const deleted = await this.credentialVault.deleteCredential(credentialId);` — فقط `credentialId` پاس می‌شود، بدون `req.tenantId`. در مقایسه، `listCredentials` (خط ۵۵۵) و `setCredential` (خط ۵۷۸) هر دو `req.tenantId!` استفاده می‌کنند.
- **وضعیت**: ✅ تأیید شد (نقص جدید — بحرانی)

### ۸.۲ عدم پردازش scheduled notification‌ها پس از restart
- **اندپوینت**: `POST /notifications/bulk` (با `scheduledAt`)
- **اشکال**: `sendBulkNotifications` اگر `scheduledAt` تنظیم شده باشد، `scheduleProcess` فراخوانی نمی‌کند (خط ۵۳۱). اما هیچ cron job یا worker ای برای پردازش notification‌های scheduled وجود ندارد. اگر سرویس restart شود، notification‌های scheduled هرگز پردازش نمی‌شوند.
- **کد**: `notification.service.ts:sendBulkNotifications()` (خطوط ۵۳۰-۵۳۳): `if (!params.scheduledAt) { this.scheduleProcess(log.id); }` — اگر scheduledAt باشد، هیچ کاری انجام نمی‌شود. هیچ scheduler یا cron job در `onModuleInit` برای پردازش notification‌های scheduled وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۸.۳ استفاده از setTimeout برای retry — عدم persistence در restart
- **اندپوینت**: `POST /notifications`، `POST /notifications/:id/retry`
- **اشکال**: retry از طریق `setTimeout` برنامه‌ریزی می‌شود. اگر سرویس در حین انتظار retry restart شود، retry از دست می‌رود و notification در status `RETRYING` باقی می‌ماند بدون اینکه هرگز پردازش شود.
- **کد**: `notification.service.ts:scheduleProcess()` (خطوط ۹۹-۱۰۵): `setTimeout(() => { this.processNotification(logId).catch(...) }, delayMs)` — درون‌حافظه‌ای، با restart از بین می‌رود. هیچ recovery mechanism برای notification‌های در status `RETRYING` پس از restart وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۸.۴ عدم وجود AbacGuard در سرویس
- **اندپوینت**: همه اندپوینت‌های state-changing
- **اشکال**: برخلاف سایر سرویس‌ها (feature-flags، monitoring)، notification-service از `AbacGuard` استفاده نمی‌کند. فقط `JwtAuthGuard + PermissionsGuard + TenantGuard` اعمال می‌شود. این یعنی هر کاربر authenticated با permission مناسب می‌تواند عملیات state-changing انجام دهد بدون هیچ role-based restriction اضافی.
- **کد**: `notification.controller.ts` — تمام endpoints از `@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)` استفاده می‌کنند. هیچ `AbacGuard` در `app.module.ts` providers وجود ندارد. فایل `abac.guard.ts` وجود دارد اما در هیچ controller استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۸.۵ عدم وجود endpoint در کاتالوگ: templates/seed-defaults
- **اندپوینت**: `POST /notifications/templates/seed-defaults`
- **اشکال**: این endpoint در controller وجود دارد (خطوط ۴۷۰-۴۷۶) اما در کاتالوگ اندپوینت ذکر نشده. این endpoint template‌های پیش‌فرض را برای tenant ایجاد می‌کند.
- **کد**: `notification.controller.ts:seedDefaultTemplates()` (خطوط ۴۷۰-۴۷۶): `@Post('templates/seed-defaults')` با permission `notification:templates:manage`. `notification.service.ts:seedDefaultTemplates()` template‌های پیش‌فرض SMS و email را ایجاد می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۸.۶ عدم وجود endpoint در کاتالوگ: payment-notification.service
- **اندپوینت**: N/A (internal service)
- **اشکال**: `payment-notification.service.ts` در سرویس وجود دارد که احتمالاً برای پردازش notification‌های پرداخت استفاده می‌شود، اما نه در کاتالوگ ذکر شده و نه در controller به‌صورت مستقیم expose می‌شود.
- **کد**: `payment-notification.service.ts` و `templates/payment-email-template.ts` و `templates/payment-sms-template.ts` وجود دارند اما در `app.module.ts` به‌عنوان provider ثبت نشده‌اند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
