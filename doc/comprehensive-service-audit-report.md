# Comprehensive Service Audit Report — Insurance AI Platform

**تاریخ شروع:** 2026-07-01  
**تعداد کل سرویس‌ها:** 40  
**ممیزی‌کننده:** Cascade AI Assistant  
**پلتفرم:** TypeScript + NestJS + TypeORM + PostgreSQL + Kafka + Redis + Bun  

---

## روش‌شناسی ممیزی

هر سرویس بر اساس معیارهای زیر بررسی می‌شود:

### ۱. وضعیت منطق پیاده‌سازی
- آیا منطق پیاده‌سازی صحیح و کامل است؟
- آیا سرویس مطابق با اهداف سامانه بیمه‌ای ایران طراحی شده؟
- آیا واقعی و عملکردی است یا شامل بخش‌های mock و نمایشی؟
- کیفیت کد و رعایت اصول مهندسی نرم‌افزار
- پوشش فرایندهای بیمه‌ای (صدور، ادعا، پرداخت، باسابقه، اتکایی و...)

### ۲. وضعیت پایگاه‌داده و وابستگی‌های خارجی
- نوع و پیکربندی پایگاه‌داده (PostgreSQL، schema اختصاصی)
- مهاجرت‌های TypeORM
- اتصال به Kafka، Redis، و سرویس‌های خارجی (سنhab، درگاه پرداخت، OTP/SMS)
- مدیریت Connection Pool

### ۳. وضعیت امنیتی
- پیکربندی JWT و OAuth2
- کنترل دسترسی مبتنی بر نقش (RBAC) و صفات (ABAC)
- رمزنگاری و محافظت از داده‌های حساس (PII)
- مطابقت با استانداردهای enterprise و الزامات ایران (سامانه جامع اطلاعات، حریم خصوصی)
- اعتبارسنجی ورودی‌ها و محافظت در برابر تزریق

### ۴. وضعیت ادغام با سامانه
- تعامل با سرویس‌های مرتبط
- انتشار/مصرف رویدادهای Kafka
- الگوی Outbox
- مدیریت خطا در ارتباطات بین‌سرویسی
- Forwarding توکن JWT
- هماهنگی با API Gateway

---

## خلاصه اجرایی (به‌روزرسانی می‌شود)

| شاخص | مقدار |
|------|--------|
| کل سرویس‌ها | 40 |
| بررسی‌شده | 0 |
| سالم | 0 |
| دارای اشکال | 0 |
| بحرانی | 0 |

---

## گزارش تفصیلی سرویس‌ها

---

### ۱. auth-service

**پورت:** 18001  
**مسیر پایه:** `/` (بدون prefix مشترک؛ endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** Kafka (optional), Redis (optional for sessions), bcrypt, jsonwebtoken, jwks-rsa, @node-saml/node-saml

#### ۱.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- کنترلر غنی با endpoint‌های ثبت‌نام (`/register`)، ورود (`/login`)، پروفایل (`/me`)، مدیریت کاربران (`/users`)، نقش‌ها (`/roles/catalog`)، تخصیص نقش (`/users/:userId/roles`)، تخصیص واحد سازمانی (`/users/:userId/org-unit`)، service-to-service token (`/service-token`)
- سیستم نقش‌های بیمه‌ای کامل و تخصصی ایران: `insurer_admin`, `head_office_ops`, `underwriter`, `claims_handler`, `loss_adjuster`, `fraud_analyst`, `reinsurance_ops`, `agency_owner`, `broker_owner`, `compliance_aml` و غیره (۲۱ نقش)
- نقشه مجوزهای (permissions) دقیق و بیمه‌محور: `policy:quote`, `policy:underwriting_decide`, `claims:register`, `claims:assess`, `fraud:triage`, `aml:review`, `reinsurance:manage_program` و غیره (۴۲ مجوز)
- سلسله‌مراتب نقش‌ها با وراثت (`role-hierarchy.ts`) — `insurer_admin` از همه ارث می‌برد، `branch_manager` از `branch_staff` و غیره
- قوانین تفکیک وظایف (SoD) برای جلوگیری از تضاد منافع: underwriter و claims_handler، risk_manager و fraud_analyst، finance و collections و غیره (۷ قانون)
- ABAC (Attribute-Based Access Control) با ۱۰ قانون پیش‌فرض شامل ایزوله‌سازی واحد سازمانی، مالکیت منبع، محدودیت ساعات کاری، SoD در تأیید ادعا/پرداخت/صدور
- ABAC policies قابل مدیریت از DB با cache و fallback به قوانین hardcoded
- Session management پیشرفته با refresh token rotation، تشخیص reuse، محدودیت session همزمان، پشتیبانی از Redis و DB
- SSO با OIDC و SAML (پشتیبانی از Azure AD, Okta, Keycloak)
- Federation service برای اتصال به Identity Provider‌های خارجی
- Audit logging ساختاریافته با correlationId و tenantId
- AccessAudit با گزارش‌گیری آماری (deny rate، top denied resources/users)
- Org Unit management با subtree authorization (مدیر只能 به زیرمجموعه خود دسترسی دارد)
- اعتبارسنجی duplicate user قبل از ایجاد
- bcrypt برای hash پسورد (rounds=10)
- Service token برای احراز هویت بین سرویس‌ها

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| AUTH-001 | بحرانی | `JWT_SECRET` پیش‌فرض `your-super-secret-jwt-key-change-in-production` در docker-compose — اگر متغیر محیطی تنظیم نشود، کل سامانه با کلید ضعیف کار می‌کند |
| AUTH-002 | بحرانی | `SERVICE_TOKEN_ISSUER_KEY` پیش‌فرض `change-me-in-dev` — کلید احراز هویت بین‌سرویسی در production ضعیف است |
| AUTH-003 | متوسط | `register` endpoint بدون احراز هویت یا محدودیت نرخ است — هر کسی می‌تواند کاربر جدید ثبت کند (در production باید فقط توسط admin انجام شود یا OTP داشته باشد) |
| AUTH-004 | متوسط | `login` بدون محدودیت نرخ (rate limiting) یا lockout بعد از تلاش‌های ناموفق — آسیب‌پذیر به brute force |
| AUTH-005 | متوسط | `federation.service.ts` از `federatedIdentityRepository` و `userRepository` استفاده می‌کند اما آن‌ها `any` هستند و هیچ‌گاه inject نمی‌شوند — `linkFederatedIdentity`, `unlinkFederatedIdentity`, `getUserFederatedIdentities` در عمل کار نخواهند کرد (null reference) |
| AUTH-006 | متوسط | `JwtAuthGuard` به `audience: 'modern-banking'` به‌عنوان پیش‌فرض تنظیم شده — این مقدار از پروژه بانکداری کپی شده و برای بیمه نامناسب است |
| AUTH-007 | متوسط | `JwtAuthGuard` به `issuer: 'http://localhost:8080'` به‌عنوان پیش‌فرض تنظیم شده — نامعتبر برای production |
| AUTH-008 | کم | `SoD` rules تعریف شده‌اند اما در جریان `setUserRoles` بررسی نمی‌شوند — `checkSodViolations` فراخوانی نمی‌شود |
| AUTH-009 | متوسط | `SessionService` در `app.module.ts` ثبت شده و `Session` entity تعریف شده، اما `login` از session استفاده نمی‌کند — refresh token rotation در عمل فعال نیست چون `login` فقط JWT صادر می‌کند بدون session creation |
| AUTH-010 | کم | `role-hierarchy.ts` تعریف شده اما در `permissionsForRoles` استفاده نمی‌شود — وراثت نقش‌ها در عمل اعمال نمی‌شود |
| AUTH-011 | کم | عدم اعتبارسنجی قوی ورودی‌ها با DTO/pipe — از validation دستی در controller استفاده شده |
| AUTH-012 | متوسط | عدم CORS configuration در `main.ts` — در صورت دسترسی از مرورگر، ممکن است مشکل‌ساز شود |
| AUTH-013 | کم | `sso.service.ts` الگوریتم‌های `HS256` را در `verifyIdToken` می‌پذیرد که برای OIDC نامناسب است (باید فقط RS256) |
| AUTH-014 | متوسط | عدم password policy (حداقل طول، پیچیدگی) در `register` |
| AUTH-015 | کم | `nationalId` ذخیره می‌شود اما بدون رمزنگاری — داده PII حساس (کد ملی) به‌صورت plaintext |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — ساختار غنی و تخصصی بیمه‌ای، اما حاوی اشکالات عملکردی در federation و session integration

#### ۱.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema اختصاصی (`public` در docker-compose، `auth` در پیش‌فرض کد)
- TypeORM با ۵ entity: User, OrganizationUnit, AccessAudit, Session, AbacPolicy
- ۷ migration برای تکامل schema (init, users, org-units, roles, user-roles, sessions, access-audit)
- Index‌های unique روی email و username
- Index روی orgUnitId برای query‌های سازمانی
- پشتیبانی از Redis برای session store (optional، قابل فعال‌سازی با `SESSION_STORE=redis`)
- اتصال به Kafka در docker-compose (اما consumer تعریف نشده)
- `synchronize` در production غیرفعال است (`NODE_ENV !== 'production' && DB_SYNC === 'true'`)

**اشکالات:**
- schema در docker-compose `public` است اما در کد پیش‌فرض `auth` — ناسازگاری
- عدم Flyway یا migration tool مستقل — migrations با TypeORM تعریف شده اما `migrate` script فقط `dist/migrate.js` را اجرا می‌کند که نیاز بررسی دارد
- Redis در docker-compose تعریف شده اما `REDIS_URL` به auth-service پاس داده نمی‌شود — session store در عمل DB خواهد بود
- عدم connection pool tuning (TypeORM پیش‌فرض)
- Kafka در docker-compose به auth-service متصل است اما هیچ Kafka consumer یا producer در کد تعریف نشده — رویدادهای auth (login, register, role change) منتشر نمی‌شوند

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۱.۳ وضعیت امنیتی

**نقاط قوت:**
- JWT با HS256 (local) و RS256 (JWKS) — پشتیبانی از هر دو
- bcrypt برای hash پسورد
- RBAC با ۲۱ نقش و ۴۲ مجوز تخصصی بیمه‌ای
- ABAC با ۱۰ قانون پیش‌فرض و قابلیت مدیریت از DB
- SoD rules برای جلوگیری از تضاد منافع
- Session management با refresh token rotation و reuse detection
- Audit logging برای تمام عملیات حساس (login, role change, org unit assignment)
- Correlation ID برای ردیابی درخواست‌ها
- Org Unit-based authorization (کاربر فقط به زیرمجموعه واحد خود دسترسی دارد)
- Service token برای احراز هویت بین‌سرویسی با TTL کوتاه (۱۵ دقیقه)
- SSO با OIDC و SAML برای ادغام با Identity Provider‌های سازمانی

**اشکالات:**
- JWT_SECRET پیش‌فرض ضعیف در docker-compose (AUTH-001)
- عدم rate limiting / brute force protection (AUTH-004)
- `register` بدون احراز هویت (AUTH-003)
- عدم password policy (AUTH-014)
- `nationalId` بدون رمزنگاری (AUTH-015)
- audience و issuer پیش‌فرض نامعتبر (AUTH-006, AUTH-007)
- SoD rules در عمل اعمال نمی‌شوند (AUTH-008)
- عدم CSRF protection (برای REST API stateless قابل‌قبول است)
- عدم security headers middleware (Helmet معادل Fastify)
- عدم rate limiting در سطح سرویس
- `verifyIdToken` الگوریتم HS256 را می‌پذیرد (AUTH-013)

**درجه‌بندی امنیتی:** **۶/۱۰** — ساختار خوب اما نیاز به سخت‌سازی برای production

#### ۱.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Service token برای احراز هویت بین‌سرویسی — سایر سرویس‌ها با ارائه `SERVICE_TOKEN_ISSUER_KEY` توکن دریافت می‌کنند
- `JwtAuthGuard` در سایر سرویس‌ها قابل استفاده است (از طریق `@insurance/shared` یا مستقیم)
- API Gateway به auth-service متصل است (`AUTH_SERVICE_URL`)
- تمام سرویس‌ها به `auth-service` وابسته هستند (depends_on در docker-compose)
- JWT forwarding در سطح API Gateway انجام می‌شود
- Audit logging با correlationId برای ردیابی cross-service

**اشکالات:**
- عدم Kafka producer برای انتشار رویدادهای auth (user.registered, user.login, user.role_changed, user.deactivated) — سایر سرویس‌ها از تغییرات کاربران مطلع نمی‌شوند
- عدم Kafka consumer برای رویدادهای ورودی (مثلاً policy.issued → به‌روزرسانی مجوزهای کاربر)
- SessionService تعریف شده اما در جریان login استفاده نمی‌شود — refresh token در عمل فعال نیست
- FederationService به repository‌های غیرموجود اشاره می‌کند (AUTH-005)
- عدم health check عمیق (فقط `/health` ساده بدون بررسی DB/Redis)
- عدم readiness probe برای Docker/K8s

**درجه‌بندی ادغام:** **۵/۱۰**

#### جمع‌بندی auth-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۶/۱۰ |
| ادغام | ۵/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس احراز هویت با ساختار غنی و تخصصی بیمه‌ای ایران (RBAC با ۲۱ نقش، ABAC، SoD، SSO/SAML). منطق اصلی (login, register, JWT) عملکردی است اما session management و federation در عمل فعال نیستند. نیاز به سخت‌سازی امنیتی (rate limiting, password policy, JWT defaults) و فعال‌سازی Kafka events برای ادغام بهتر با سامانه.

---

### ۲. claims-service

**پورت:** 18002  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (OutboxPublisher, OutboxWorker, KafkaProducer, createLogger), jsonwebtoken, uuid

#### ۲.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- چرخه حیات کامل ادعا: `registered` → `assessed` → `approved` → `paid` → `closed` (با وضعیت‌های `rejected` و `adjuster_review`)
- State machine با اعتبارسنجی انتقال وضعیت (`assertAllowedStates`) — جلوگیری از انتقال نامعتبر
- تمام عملیات‌ها در transaction دیتابیس انجام می‌شوند — یکپارچگی داده
- الگوی Outbox برای انتشار رویدادهای Kafka به‌صورت transactional (با `OutboxPublisher`)
- OutboxWorker در `main.ts` برای ارسال رویدادها به Kafka به‌صورت پس‌زمینه
- رویدادهای منتشرشده: `ClaimRegistered`, `ClaimAssessed`, `ClaimApproved`, `ClaimRejected`, `ClaimPaid`, `ClaimClosed`, `ClaimReferredToAdjuster`, `ClaimPaymentRequested`, `ClaimAdjusterAssigned`
- FNOL (First Notification of Loss) با ثبت غنی: کانال اطلاع، موقعیت، شاهدان، مستندات پیوست
- Auto-triage بر اساس lossType و description با scoring (low/medium/high)
- Auto-assign adjuster بر اساس skill و geography و workload
- محاسبه دقیق franchise و deductible (مبلغ ثابت + درصد)
- `validatePolicyForClaim` — بررسی اعتبار بیمه‌نامه قبل از پرداخت (status، coverage، period)
- `getFnolFormDefaults` — واکشی اطلاعات بیمه‌نامه و بیمه‌گذار از سرویس‌های مرتبط برای پیش‌پر کردن فرم
- Service-to-service token با cache و TTL برای احراز هویت با orchestrator
- Audit logging ساختاریافته برای تمام عملیات
- Correlation ID برای ردیابی cross-service
- PII Masking middleware (در سطح module)
- Tenant Guard تعریف شده
- Claim entity غنی با فیلدهای deductible، franchise، FNOL، auto-triage، metadata

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| CLAIMS-001 | بحرانی | `createClaim` endpoint (`POST /claims`) بدون `@UseGuards(JwtAuthGuard)` است — فقط `@RequirePermissions` دارد اما PermissionsGuard به `request.user` نیاز دارد که توسط JwtAuthGuard تنظیم می‌شود. در نتیجه یا همه می‌توانند ادعا ثبت کنند یا خطا رخ می‌دهد |
| CLAIMS-002 | متوسط | `assessClaim` endpoint نیز بدون `@UseGuards(JwtAuthGuard)` است — مشکل مشابه CLAIMS-001 |
| CLAIMS-003 | متوسط | `PiiMaskingMiddleware` فقط `next()` را فراخوانی می‌کند — هیچ masking واقعی انجام نمی‌دهد، کاملاً mock است |
| CLAIMS-004 | متوسط | `autoTriageClaim` از کلمات کلیدی انگلیسی استفاده می‌کند (fire, theft, accident) — برای سیستم بیمه ایران باید کلمات فارسی هم پشتیبانی شود |
| CLAIMS-005 | متوسط | `getFnolFormDefaults` و `validatePolicyForClaim` به policy-service و party-kyc-service با `fetch` مستقیم متصل می‌شوند بدون ارسال JWT token — فقط `x-correlation-id` ارسال می‌شود، احراز هویت بین‌سرویسی رعایت نمی‌شود |
| CLAIMS-006 | متوسط | `getAdjusterPool` به sales-network-service متصل می‌شود بدون JWT یا service token — بدون احراز هویت |
| CLAIMS-007 | کم | عدم Kafka consumer برای رویدادهای ورودی (مثلاً `PolicyIssued` برای به‌روزرسانی وضعیت ادعاهای مرتبط یا `PaymentCompleted` از payments-service) |
| CLAIMS-008 | متوسط | `claimNumber` با `Date.now()` و `Math.random()` تولید می‌شود — ممکن است در حالت همزمان collision رخ دهد. باید از sequence یا UUID استفاده شود |
| CLAIMS-009 | کم | عدم idempotency در `createClaim` — ثبت مجدد همان ادعا با همان پارامترها ادعای تکراری ایجاد می‌کند |
| CLAIMS-010 | کم | `calculateDeductible` خارج از transaction انجام می‌شود — به‌روزرسانی claim با deductible بدون Outbox event |
| CLAIMS-011 | کم | `coverageValid` در `validatePolicyForClaim` با `claim.lossType.toLowerCase()` تطبیق می‌کند اما `coverageTypes` از policy-service ممکن است case-sensitive باشد |
| CLAIMS-012 | متوسط | `approveClaim` سعی می‌کند saga در orchestrator شروع کند اما اگر orchestrator در دسترس نباشد، فقط warn می‌کند و ادامه می‌دهد — claim تأیید می‌شود اما پرداخت ممکن است انجام نشود |
| CLAIMS-013 | کم | عدم pagination cap — `limit` می‌تواند هر مقداری باشد |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — چرخه حیات کامل و Outbox pattern، اما حاوی اشکالات امنیتی در Guardها و mock در PII masking

#### ۲.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema `public`
- TypeORM با entity‌های Claim، OutboxEvent، ConsumedEvent، DeadLetterEvent (از @insurance/shared)
- ۹ migration برای تکامل schema (init، claims table، readmodel، consumed events، dead letter، idempotency، deductible، FNOL)
- Index‌های مناسب: unique روی claimNumber، index روی policyId، composite index روی status+updatedAt
- OutboxWorker با poll interval و batch size قابل تنظیم
- Dead letter queue برای مدیریت رویدادهای ناموفق
- Consumed events table برای idempotency در مصرف رویدادها
- `synchronize` در production غیرفعال است

**اشکالات:**
- عدم connection pool tuning
- عدم Kafka consumer تعریف شده در کد (فقط producer/OutboxWorker فعال است)
- `ConsumedEvent` و `DeadLetterEvent` entity‌ها تعریف شده‌اند اما هیچ consumer‌ای از آن‌ها استفاده نمی‌کند
- عدم Redis برای caching (policy data، adjuster pool)

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۲.۳ وضعیت امنیتی

**نقاط قوت:**
- JwtAuthGuard برای اکثر endpoint‌ها
- PermissionsGuard با ۹ مجوز تخصصی ادعا
- RBAC با نقش‌های بیمه‌ای (claims_handler, loss_adjuster, branch_manager, finance_ops, call_center, agency/broker)
- PII Masking middleware تعریف شده (هرچند mock)
- Tenant Guard تعریف شده
- Audit logging برای تمام عملیات
- Service token برای ارتباط با orchestrator
- Correlation ID

**اشکالات:**
- `createClaim` و `assessClaim` بدون JwtAuthGuard (CLAIMS-001, CLAIMS-002)
- PII Masking middleware کاملاً mock (CLAIMS-003)
- ارتباط با policy-service و party-kyc-service بدون JWT token (CLAIMS-005)
- ارتباط با sales-network-service بدون احراز هویت (CLAIMS-006)
- JWT_SECRET پیش‌فرض ضعیف (`default-secret-change-in-production`)
- عدم rate limiting
- عدم security headers
- عدم CORS configuration
- `contactPhone` و `contactEmail` بدون رمزنگاری ذخیره می‌شوند

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۲.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- الگوی Outbox برای انتشار transactional رویدادها به Kafka
- OutboxWorker فعال در `main.ts` برای ارسال رویدادها
- ۹ نوع رویداد Kafka منتشر می‌شود
- ارتباط با orchestrator-service برای شروع Saga (ClaimPayment)
- ارتباط با policy-service برای validatePolicyForClaim و getFnolFormDefaults
- ارتباط با party-kyc-service برای واکشی اطلاعات بیمه‌گذار
- ارتباط با sales-network-service برای adjuster pool
- Service token با cache برای احراز هویت با auth-service
- Correlation ID در تمام ارتباطات
- Dead letter queue و consumed events برای مدیریت idempotency

**اشکالات:**
- عدم Kafka consumer — سرویس فقط رویداد منتشر می‌کند اما هیچ رویدادی مصرف نمی‌کند (CLAIMS-007)
- ارتباطات بین‌سرویسی بدون JWT forwarding (CLAIMS-005, CLAIMS-006)
- عدم Circuit Breaker در ارتباط با سرویس‌های خارجی
- عدم retry policy در `getFnolFormDefaults` و `validatePolicyForClaim`
- عدم health check عمیق (فقط `/health` ساده)
- `approveClaim` اگر orchestrator در دسترس نباشد، claim تأیید می‌شود اما saga شروع نمی‌شود — عدم هماهنگی

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی claims-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس ادعا با چرخه حیات کامل و Outbox pattern عملکردی است. FNOL automation و auto-triage پیاده‌سازی شده‌اند. اما اشکالات امنیتی در Guardهای endpoint‌های کلیدی (create, assess)، mock بودن PII masking، عدم Kafka consumer، و عدم JWT forwarding در ارتباطات بین‌سرویسی نیاز به اصلاح دارد.

---

### ۳. payments-service

**پورت:** 18004  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (OutboxPublisher, OutboxWorker, KafkaProducer, KafkaConsumer, DeadLetterQueueService, consumeOnce, createLogger), uuid, jsonwebtoken

#### ۳.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- چرخه حیات کامل پرداخت خسارت (مرحله ۵ فرایند بیمه ایران): `prepared` → `finance_approved` → `executed` → `notified` (با وضعیت‌های `failed` و `cancelled`)
- State machine با اعتبارسنجی انتقال وضعیت — جلوگیری از انتقال نامعتبر
- تمام عملیات‌ها در transaction دیتابیس — یکپارچگی داده
- الگوی Outbox برای انتشار transactional رویدادها به Kafka
- Idempotency با `idempotencyKey` در `preparePayment` — جلوگیری از پرداخت تکراری
- پشتیبانی از پرداخت جزئی (partial payment) با `isPartial`, `partialIndex`, `totalPartialCount`
- پشتیبانی از IRR (ریال ایران) به‌عنوان currency پیش‌فرض
- PSP (Payment Service Provider) ایران با interface استاندارد (`IPspProvider`) — قابل تنظیم برای ملت، آسان‌پرداخت، صادرات، پارسیان
- `IranPspProvider` با initiatePayment، verifyCallback (HMAC)، reconcile، refund
- Gateway callback handling برای بازگشت از درگاه پرداخت
- Reconciliation برای مقایسه تراکنش‌های PSP با پرداخت‌های داخلی
- Refund و Dispute management
- Kafka consumer برای `insurance.claim.payment_requested` — وقتی ادعا تأیید می‌شود، پرداخت خودکار آماده‌سازی می‌شود
- `consumeOnce` برای idempotency در مصرف رویدادهای Kafka
- Dead Letter Queue برای مدیریت رویدادهای ناموفق با retry processor
- Audit logging ساختاریافته برای تمام عملیات
- Correlation ID
- دو entity: `PaymentIntent` (intent پرداخت) و `Payment` (ردیف پرداخت واقعی)
- `destinationIban` و `beneficiaryPartyId` برای واریز به حساب بیمه‌گذار

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| PAY-001 | بحرانی | `handleGatewayCallback` endpoint (`POST /payments/gateway/callback`) بدون `@UseGuards` است — این endpoint از خارج (از سمت PSP) فراخوانی می‌شود و نباید JWT داشته باشد، اما باید با HMAC یا signature تأیید شود. در حال حاضر هیچ اعتبارسنجی signature انجام نمی‌شود در سطح controller |
| PAY-002 | متوسط | `reconcilePayments` در query برای `internalPayments` از `createdAt: new Date(params.dateFrom)` استفاده می‌کند که فقط تاریخ دقیق را فیلتر می‌کند نه بازه — باید از `Between` یا `>=` و `<=` استفاده شود |
| PAY-003 | متوسط | `handleGatewayCallback` با `paymentIntentId` به‌عنوان `gatewayPaymentId` جستجو می‌کند — اما `gatewayPaymentId` در `initiateGatewayPayment` به‌صورت UUID جدید تولید می‌شود و در `executionResult.gatewayPaymentId` ذخیره می‌شود، نه در فیلد `paymentIntentId`. این یک bug منطقی است — callback پیدا نخواهد شد |
| PAY-004 | متوسط | `verifyCallback` در PSP interface تعریف شده اما در `handleGatewayCallback` فراخوانی نمی‌شود — callback بدون verify سمت سرور پرداخت ثبت می‌شود |
| PAY-005 | کم | `initiateGatewayPayment` خارج از transaction انجام می‌شود — به‌روزرسانی intent بدون Outbox event |
| PAY-006 | متوسط | `refundPayment` و `createDispute` خارج از transaction انجام می‌شوند و بدون Outbox event — رویدادهای refund/dispute منتشر نمی‌شوند |
| PAY-007 | کم | عدم pagination cap — `limit` می‌تواند هر مقداری باشد |
| PAY-008 | متوسط | `finance` role در permissions تعریف شده اما در auth-service `finance_ops` تعریف شده — ناسازگاری نام نقش |
| PAY-009 | کم | `claim_adjuster` role در permissions تعریف شده اما در auth-service `loss_adjuster` تعریف شده — ناسازگاری نام نقش |
| PAY-010 | متوسط | `PiiMaskingMiddleware` فقط `next()` را فراخوانی می‌کند — کاملاً mock (مشابه claims-service) |
| PAY-011 | کم | `destinationIban` بدون رمزنگاری ذخیره می‌شود — داده حساس بانکی |
| PAY-DEC | متوسط | **همپوشانی مالکیت domain پرداخت** — payments-service (پرداخت خسارت)، collections-service (اقساط حق بیمه) و billing-service (فاکتور و درگاه پرداخت) هر سه به‌صورت مستقل payment gateway و پرداخت/وصول پیاده‌سازی کرده‌اند — عدم مالکیت واحد برای domain پرداخت — هماهنگی و event flow بین این سه سرویس تعریف نشده |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — چرخه حیات کامل و PSP integration، اما bug در gateway callback و عدم verify

#### ۳.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema `public`
- TypeORM با entity‌های PaymentIntent، Payment، OutboxEvent، ConsumedEvent، DeadLetterEvent
- ۴ migration برای تکامل schema
- Index‌های مناسب: unique روی idempotencyKey، index روی claimId، composite index روی status+updatedAt
- OutboxWorker با poll interval و batch size قابل تنظیم
- KafkaConsumer فعال برای `insurance.claim.payment_requested`
- Dead Letter Queue با retry processor
- `consumeOnce` برای idempotency
- `synchronize` در production غیرفعال است

**اشکالات:**
- عدم connection pool tuning
- عدم Redis برای caching
- `reconcilePayments` query bug (PAY-002)

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۳.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)` در سطح controller — همه endpoint‌ها محافظت می‌شوند
- ۱۰ مجوز تخصصی پرداخت: `payments:prepare`, `payments:approve`, `payments:execute`, `payments:notify`, `payments:fail`, `payments:view`, `payments:list`, `payments:reconcile`, `payments:refund`, `payments:dispute`
- RBAC با نقش‌های بیمه‌ای (insurer_admin, head_office_ops, finance, branch_manager, auditor)
- PSP callback با HMAC signature verification در `IranPspProvider.verifyCallback`
- Audit logging برای تمام عملیات
- Correlation ID
- PII Masking middleware (هرچند mock)
- Tenant Guard
- Abac Guard

**اشکالات:**
- Gateway callback endpoint بدون Guard و بدون verify در سطح controller (PAY-001, PAY-004)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- PII Masking کاملاً mock (PAY-010)
- `destinationIban` بدون رمزنگاری (PAY-011)
- ناسازگاری نام نقش‌ها با auth-service (PAY-008, PAY-009)

**درجه‌بندی امنیتی:** **۶/۱۰**

#### ۳.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- الگوی Outbox برای انتشار transactional رویدادها به Kafka
- KafkaConsumer فعال برای `insurance.claim.payment_requested` — ادغام کامل با claims-service
- `consumeOnce` برای idempotency در مصرف رویدادها
- Dead Letter Queue برای مدیریت خطا
- ۶ نوع رویداد Kafka منتشر می‌شود: `PaymentPrepared`, `PaymentFinanceApproved`, `PaymentExecuted`, `PaymentFailed`, `PaymentNotified`, و callback events
- PSP integration با interface استاندارد و پشتیبانی از درگاه‌های ایرانی
- Reconciliation با PSP برای تطبیق تراکنش‌ها
- Correlation ID در تمام ارتباطات
- Service-to-service از طریق Kafka events (نه HTTP مستقیم)

**اشکالات:**
- Bug در gateway callback matching (PAY-003) — callback پیدا نمی‌شود
- عدم verify callback در سطح controller (PAY-004)
- عدم Outbox event برای refund و dispute (PAY-006)
- عدم Circuit Breaker در ارتباط با PSP
- عدم health check عمیق
- ناسازگاری نام نقش‌ها با auth-service (PAY-008, PAY-009)

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی payments-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۶/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۷/۱۰** |

**وضعیت کلی:** سرویس پرداخت با چرخه حیات کامل ۵ مرحله‌ای (آماده‌سازی → تأیید مالی → واریز → ابلاغ) و PSP integration ایران. Kafka consumer برای دریافت رویداد `ClaimPaymentRequested` فعال است. Idempotency و Dead Letter Queue پیاده‌سازی شده‌اند. اما bug در gateway callback matching، عدم verify در سطح controller، ناسازگاری نام نقش‌ها با auth-service، و عدم Outbox event برای refund/dispute نیاز به اصلاح دارد.

---

### ۴. party-kyc-service

**پورت:** 18006  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** uuid, jsonwebtoken (بدون @insurance/shared، بدون Kafka)

#### ۴.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- مدیریت کامل طرف‌ها (Party): ایجاد، مشاهده، لیست با فیلتر nationalId
- دو نوع طرف: `individual` و `company`
- چرخه حیات KYC با ۸ مرحله workflow: `data_collection` → `document_verification` → `aml_screening` → `risk_assessment` → `manual_review` → `approved`/`rejected`/`escalated`
- محاسبه ریسک KYC با scoring (PEP +30, sanctions +40, adverse media +15, document quality +5, nationalId risk +10) و ۴ سطح ریسک (low/medium/high/critical)
- AML screening با PEP، sanctions، adverse media checks
- AML Consent Management: grant، revoke، check validity با انقضا
- Document Trust Chain با hash chain (previousHash) — قابل audit
- Identity Proofing با face match، liveness check، document authenticity، dedup detection
- External Verification Services: sanctions، PEP، adverse_media، identity
- Exception Queue: raise، assign، resolve، escalate با severity (low/medium/high/critical)
- SLA Enforcement با due date (۷ روز) و overdue reviews detection
- Audit logging برای تمام عملیات
- Correlation ID
- KycReview entity غنی با فیلدهای risk، screening، document، escalation، SLA

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| KYC-001 | بحرانی | Document Trust Chain، Identity Proofing، External Verification، و Exception Queue همگی در حافظه (`Map`) ذخیره می‌شوند — کاملاً volatile، با restart تمام داده‌ها از بین می‌روند. این قابلیت‌ها در عمل غیرقابل استفاده هستند |
| KYC-002 | بحرانی | عدم Outbox pattern و عدم Kafka — هیچ رویدادی منتشر نمی‌شود (PartyCreated، KycApproved، KycRejected، AmlScreeningCompleted). سایر سرویس‌ها از تغییرات KYC مطلع نمی‌شوند |
| KYC-003 | بحرانی | `synchronize` در production غیرفعال نیست — `DB_SYNC === 'true'` بدون بررسی `NODE_ENV` — در production خطرناک است |
| KYC-004 | متوسط | `reviewKyc` یک KycReview جدید ایجاد می‌کند به‌جای به‌روزرسانی review فعلی — تاریخچه ایجاد می‌شود اما review فعلی به‌روز نمی‌شود |
| KYC-005 | متوسط | `runAmlScreening` همیشه `amlScreeningStatus = 'passed'` تنظیم می‌کند حتی اگر screening results نشان‌دهنده failure باشد — منطق نادرست |
| KYC-006 | متوسط | `performIdentityProofing` و `requestExternalVerification` بدون JWT token به سرویس‌های خارجی متصل می‌شوند — فقط `content-type` header ارسال می‌شود |
| KYC-007 | متوسط | `getOverdueReviews` تمام review‌ها را از DB بارگذاری می‌کند (`this.kycRepo.find()`) سپس در memory فیلتر می‌کند — عدم query در DB برای overdue |
| KYC-008 | کم | عدم pagination cap — `limit` می‌تواند هر مقداری باشد |
| KYC-009 | متوسط | `nationalId` و `mobile` بدون رمزنگاری ذخیره می‌شوند — داده PII حساس به‌صورت plaintext |
| KYC-010 | کم | عدم duplicate check در `createParty` — اگر nationalId تکراری باشد، unique constraint خطا می‌دهد اما به‌صورت unhandled |
| KYC-011 | کم | `createParty` در دو step (party + initial KYC) بدون transaction انجام می‌شود — اگر step دوم fail شود، party بدون KYC باقی می‌ماند |
| KYC-012 | متوسط | عدم AbacGuard و TenantGuard در module — فقط JwtAuthGuard و PermissionsGuard فعال هستند |
| KYC-DEC | بحرانی | **عدم Outbox/Kafka و تجزیه نامناسب** — party-kyc-service هیچ رویداد Kafka منتشر نمی‌کند (KYC-002) — سایر سرویس‌ها (claims, customer-360, policy) مستقیماً از party-kyc HTTP fetch می‌کنند به‌جای Kafka event consumption — ۴ قابلیت کلیدی (Trust Chain, Identity Proofing, External Verification, Exception Queue) در-memory هستند (KYC-001) — عدم مالکیت داده پایدار — این سرویس باید به‌عنوان source of truth برای party/KYC با event-driven integration پیاده‌سازی می‌شد |

**درجه‌بندی منطق پیاده‌سازی:** **۵/۱۰** — ساختار غنی KYC workflow اما حاوی داده‌های volatile در حافظه و عدم Outbox/Kafka

#### ۴.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema `public`
- TypeORM با entity‌های Party و KycReview
- ۲ migration برای تکامل schema
- Index‌های مناسب: unique روی nationalId، index روی type+createdAt، index روی amlConsentStatus
- KycReview با index‌های متعدد: partyId+createdAt، status+createdAt، riskLevel+workflowStage، amlScreeningStatus
- `synchronize` قابل کنترل با `DB_SYNC`

**اشکالات:**
- `synchronize` در production غیرفعال نیست (KYC-003)
- عدم OutboxEvent، ConsumedEvent، DeadLetterEvent entity — هیچ زیرساخت Kafka تعریف نشده
- عدم connection pool tuning
- عدم Redis برای caching
- ۴ قابلیت کلیدی (Trust Chain، Identity Proofing، External Verification، Exception Queue) در حافظه ذخیره می‌شوند نه در DB (KYC-001)
- `createParty` بدون transaction (KYC-011)

**درجه‌بندی پایگاه‌داده:** **۴/۱۰**

#### ۴.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۱۰ مجوز تخصصی: `party:create`, `party:view`, `party:list`, `kyc:review`, `kyc:submit`, `kyc:verify`, `kyc:screen`, `kyc:escalate`, `kyc:list`, `kyc:view`
- RBAC با نقش‌های بیمه‌ای (insurer_admin, compliance_aml, risk_manager, head_office_ops, branch_manager, branch_staff, call_center, auditor)
- Audit logging برای تمام عملیات
- Correlation ID
- `compliance_aml` نقش تخصصی برای انطباق AML

**اشکالات:**
- عدم AbacGuard و TenantGuard (KYC-012)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- `nationalId` و `mobile` بدون رمزنگاری (KYC-009)
- ارتباط با سرویس‌های خارجی بدون JWT (KYC-006)
- عدم PII Masking middleware

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۴.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- claims-service به party-kyc-service برای واکشی اطلاعات بیمه‌گذار متصل است
- Identity Proofing به model-switchboard-service متصل می‌شود (optional)
- External Verification به external screening service متصل می‌شود (optional)
- Correlation ID در تمام ارتباطات
- Audit logging

**اشکالات:**
- عدم کامل Outbox pattern و Kafka — هیچ رویدادی منتشر نمی‌شود (KYC-002)
- عدم Kafka consumer برای رویدادهای ورودی
- عدم JWT forwarding در ارتباطات بین‌سرویسی (KYC-006)
- عدم health check عمیق
- `main.ts` بسیار ساده — فقط app.listen بدون Kafka initialization
- عدم Circuit Breaker در ارتباط با سرویس‌های خارجی

**درجه‌بندی ادغام:** **۳/۱۰**

#### جمع‌بندی party-kyc-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۵/۱۰ |
| پایگاه‌داده | ۴/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۳/۱۰ |
| **کل** | **۴/۱۰** |

**وضعیت کلی:** سرویس KYC با ساختار غنی workflow (۸ مرحله)، risk scoring، AML screening، identity proofing، document trust chain، exception queue و SLA enforcement. اما ۴ قابلیت کلیدی در حافظه volatile ذخیره می‌شوند (با restart از بین می‌روند)، عدم کامل Outbox/Kafka (هیچ رویدادی منتشر نمی‌شود)، `synchronize` در production غیرفعال نیست، و عدم AbacGuard/TenantGuard. نیاز اساسی به persist کردن داده‌های in-memory و فعال‌سازی Kafka events.

---

### ۵. policy-service

**پورت:** 18007  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (OutboxPublisher, OutboxWorker, KafkaProducer, createLogger), uuid

#### ۵.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- چرخه حیات کامل بیمه‌نامه (۵ مرحله فرایند بیمه ایران): `inquiry` → `docs_pending` → `uw_pending` → `risk_assessed` → `issued` → `active` (با وضعیت‌های `uw_rejected`, `endorsed`, `cancelled`, `renewed`)
- State machine با اعتبارسنجی انتقال وضعیت (`assertAllowedStates`, `assertNotCancelled`)
- الگوی Outbox برای انتشار transactional رویدادها به Kafka
- ۱۲+ نوع رویداد Kafka: `PolicyQuoted`, `PolicyDocsSubmitted`, `PolicyRiskAssessed`, `PolicyUnderwritingDecided`, `PolicyIssued`, `PolicyUniqueCodeSet`, `PolicyEndorsed`, `PolicyCancelled`, `PolicyRenewed`, `AutoRenewEnabled/Disabled`, `RenewalReminderSent`
- SANHAB integration (استعلام چندکاناله: nationalId+uniqueCode، policyNumber، VIN)
- SANHAB Quality Gate — قبل از issue و set_unique_code بررسی اعتبار استعلام سنهاب
- Quality Gate Override با دلیل و audit trail
- Policy Timeline — ترکیب changes و inquiries در یک timeline با RBAC
- Convert Quote to Policy از product-service
- Endorsement با ۶ نوع (coverage_change, premium_change, beneficiary_change, address_change, vehicle_change, other) با ذخیره previousValues
- Auto-renewal: setAutoRenew، scheduleRenewal، approveRenewal، rejectRenewal
- Renewal reminder با reminderCount
- Policy archival job با retention policy (۵ سال retention، ۶ ماه archive)
- PolicyChange entity برای audit trail کامل
- PolicyInquiry entity برای ذخیره تاریخچه استعلام‌های سنهاب
- PolicyRenewal entity برای مدیریت renewal‌ها
- اعتبارسنجی ورودی جامع (UUID validation, date validation, enum validation)
- Pagination cap (حداکثر ۲۰۰)
- Audit logging ساختاریافته برای تمام عملیات
- Correlation ID
- JWT forwarding در ارتباطات بین‌سرویسی (regulatory-gateway، orchestrator، underwriting)
- `paid` boolean برای تأیید پرداخت حق بیمه قبل از صدور

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| POLICY-001 | متوسط | `quote` و `convertQuoteToPolicy` خارج از transaction انجام می‌شوند — save و publish در یک transaction نیستند |
| POLICY-002 | متوسط | `policyNumber` با `Date.now()` و `Math.random()` تولید می‌شود — ممکن است collision رخ دهد. باید از sequence یا UUID استفاده شود |
| POLICY-003 | متوسط | `endorse` وضعیت policy را به `endorsed` تغییر می‌دهد اما بعد از آن policy در وضعیت `endorsed` باقی می‌ماند — هیچ مکانیزمی برای بازگشت به `active` وجود ندارد |
| POLICY-004 | کم | `renew` فقط `endDate` را به‌روزرسانی می‌کند و PolicyRenewal ایجاد نمی‌کند — برخلاف `scheduleRenewal` + `approveRenewal` که کامل است |
| POLICY-005 | متوسط | عدم Kafka consumer برای رویدادهای ورودی (مثلاً `PaymentCompleted` از payments-service برای تأیید خودکار `paid` یا `UnderwritingCompleted` از underwriting-service) |
| POLICY-006 | کم | `PiiMaskingMiddleware` فقط `next()` فراخوانی می‌کند — mock (مشابه سایر سرویس‌ها) |
| POLICY-007 | کم | `archive-job` از `console.log` استفاده می‌کند به‌جای logger ساختاریافته |
| POLICY-008 | متوسط | `archive-job` به جدول `audit` و `audit_archive` ارجاع می‌دهد که در entity‌های تعریف‌شده وجود ندارد — ممکن است در اجرا خطا دهد |
| POLICY-009 | کم | `sanhabSmsInquiry` با `policyId: null` در inquiry ذخیره می‌کند — ممکن است در query‌های بعدی مشکل ایجاد کند |
| POLICY-010 | متوسط | `issue` فقط `paid: boolean` دریافت می‌کند — هیچ تأییدیه واقعی پرداخت از payments-service دریافت نمی‌کند، فقط ادعای پرداخت |
| POLICY-011 | کم | `riskAssess` به underwriting-service متصل می‌شود اما اگر در دسترس نباشد، فقط warn و ادامه — policy به `uw_pending` می‌رود اما underwriting request ثبت نمی‌شود |

**درجه‌بندی منطق پیاده‌سازی:** **۸/۱۰** — چرخه حیات کامل ۵ مرحله‌ای، SANHAB integration، endorsement، renewal، archive

#### ۵.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema `public`
- TypeORM با entity‌های Policy، PolicyChange، PolicyInquiry، PolicyRenewal، OutboxEvent
- ۷ migration برای تکامل schema
- Index‌های مناسب: unique روی policyNumber و uniqueCode، index روی status+updatedAt، partyId
- OutboxWorker با poll interval و batch size قابل تنظیم
- `synchronize` در production غیرفعال است (`NODE_ENV !== 'production'`)
- Archive job با retention policy

**اشکالات:**
- عدم ConsumedEvent و DeadLetterEvent — Kafka consumer تعریف نشده
- عدم connection pool tuning
- عدم Redis برای caching
- `archive-job` به جداول ناموجود ارجاع می‌دهد (POLICY-008)
- `quote` و `convertQuoteToPolicy` بدون transaction (POLICY-001)

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۵.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)` در سطح controller — همه endpoint‌ها محافظت می‌شوند
- ۱۵ مجوز تخصصی بیمه‌نامه
- RBAC با نقش‌های بیمه‌ای (insurer_admin, underwriter, head_office_ops, branch_manager, branch_staff, agency_owner/staff, broker_owner/staff, call_center, auditor)
- JWT forwarding در ارتباطات بین‌سرویسی (regulatory-gateway، orchestrator، underwriting)
- Audit logging برای تمام عملیات
- Correlation ID
- PII Masking middleware (هرچند mock)
- Tenant Guard و Abac Guard فعال
- اعتبارسنجی ورودی جامع (UUID, date, enum)
- Pagination cap

**اشکالات:**
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- PII Masking کاملاً mock (POLICY-006)
- `applicationData` ممکن است حاوی PII باشد بدون رمزنگاری

**درجه‌بندی امنیتی:** **۷/۱۰**

#### ۵.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- الگوی Outbox برای انتشار transactional رویدادها به Kafka
- OutboxWorker فعال در `main.ts`
- ۱۲+ نوع رویداد Kafka منتشر می‌شود
- SANHAB integration از طریق regulatory-gateway-service با JWT forwarding
- Underwriting integration از طریق underwriting-service با JWT forwarding
- Orchestrator integration برای ایجاد sanhab-followup work items با JWT forwarding
- Correlation ID در تمام ارتباطات
- Policy Timeline با ترکیب changes و inquiries
- claims-service به policy-service برای validatePolicyForClaim متصل است
- Convert Quote از product-service

**اشکالات:**
- عدم Kafka consumer برای رویدادهای ورودی (POLICY-005)
- عدم تأیید واقعی پرداخت از payments-service — فقط `paid: boolean` (POLICY-010)
- عدم Circuit Breaker در ارتباط با سرویس‌های خارجی
- عدم retry policy در ارتباطات بین‌سرویسی
- عدم health check عمیق
- اگر underwriting-service در دسترس نباشد، policy بدون underwriting request به `uw_pending` می‌رود (POLICY-011)

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی policy-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۸/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۷/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۷/۱۰** |

**وضعیت کلی:** سرویس بیمه‌نامه با چرخه حیات کامل ۵ مرحله‌ای (استعلام → مدارک → ارزیابی ریسک → صدور → کد یکتا) و SANHAB integration. Endorsement، renewal (شامل auto-renewal)، و archive job پیاده‌سازی شده‌اند. JWT forwarding در ارتباطات بین‌سرویسی رعایت می‌شود. اما عدم Kafka consumer، عدم تأیید واقعی پرداخت، policyNumber collision risk، و وضعیت `endorsed` بدون بازگشت به `active` نیاز به اصلاح دارد.

---

### ۶. document-service

**پورت:** 18008  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM + @fastify/multipart  
**وابستگی‌ها:** @insurance/shared (OutboxPublisher), uuid, @fastify/multipart

#### ۶.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- دو روش بارگذاری سند: multipart upload (فایل فیزیکی) و link (ارجاع به storage خارجی)
- پشتیبانی از reinsurance invoice artifact (بارگذاری و link)
- ۶ نوع سند: `invoice`, `medical_report`, `police_report`, `photo`, `receipt`, `other`, `reinsurance_invoice`
- ۴ وضعیت سند: `pending` → `extracting` → `extracted` / `failed`
- فیلدهای `extractedText` و `extractedFields` برای OCR/AI integration آینده
- فیلد `metadata` (JSONB) برای ذخیره metadata اضافی (invoiceNumber, invoiceDate, amount, etc.)
- فیلد `createdBy` برای audit
- Outbox pattern برای انتشار رویدادها: `DocumentUploaded`, `DocumentLinked`, `ClaimDocumentsAttached`, `ReinsuranceInvoiceArtifactStored`, `ReinsuranceInvoiceArtifactLinked`
- Safe filename sanitization (حذف کاراکترهای غیر مجاز)
- Stream-based file upload با `pipeline` (مدیریت backpressure)
- Multipart parser با `@fastify/multipart`
- Audit logging برای تمام عملیات
- Correlation ID
- Query با فیلتر claimId و reconciliationId

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| DOC-001 | بحرانی | `synchronize` در production غیرفعال نیست — `DB_SYNC === 'true'` بدون بررسی `NODE_ENV` |
| DOC-002 | بحرانی | عدم OutboxWorker در `main.ts` — Outbox events نوشته می‌شوند اما هیچ worker‌ای برای ارسال به Kafka اجرا نمی‌شود. رویدادها در DB باقی می‌مانند و هرگز منتشر نمی‌شوند |
| DOC-003 | بحرانی | عدم Kafka Producer initialization — حتی اگر OutboxWorker اضافه شود، KafkaProducer در `main.ts` ایجاد نمی‌شود |
| DOC-004 | متوسط | ذخیره فایل در filesystem محلی (`data/uploads/`) — عدم پشتیبانی از object storage (S3/MinIO). در محیط distributed غیرقابل استفاده |
| DOC-005 | متوسط | عدم محدودیت حجم فایل — هیچ max file size check وجود ندارد |
| DOC-006 | متوسط | عدم محدودیت نوع فایل — هیچ MIME type whitelist وجود ندارد. امکان upload فایل خطرناک |
| DOC-007 | متوسط | عدم antivirus scan — فایل‌ها بدون بررسی امنیتی ذخیره می‌شوند |
| DOC-008 | کم | عدم pagination cap — `limit` می‌تواند هر مقداری باشد |
| DOC-009 | متوسط | عدم AbacGuard و TenantGuard — فقط JwtAuthGuard و PermissionsGuard فعال هستند |
| DOC-010 | کم | `actor` از header خوانده می‌شود (`x-user-id`) به‌جای `req.user` — قابل جعل |
| DOC-011 | متوسط | ذخیره `storageRef` به‌صورت filesystem path (`data/uploads/...`) — در صورت تغییر مسیر، references غیرمعتبر می‌شوند |
| DOC-012 | کم | عدم endpoint برای download/stream فایل — فقط metadata برمی‌گرداند |

**درجه‌بندی منطق پیاده‌سازی:** **۵/۱۰** — قابلیت‌های پایه upload و link اما OutboxWorker نامفعال و ذخیره filesystem محلی

#### ۶.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema `public`
- TypeORM با entity‌های Document و OutboxEvent
- ۱ migration برای تکامل schema
- Index‌های مناسب: claimId، reconciliationId، status+createdAt
- OutboxPublisher برای نوشتن رویدادها در transaction

**اشکالات:**
- `synchronize` در production غیرفعال نیست (DOC-001)
- عدم OutboxWorker — رویدادها هرگز ارسال نمی‌شوند (DOC-002)
- عدم KafkaProducer initialization (DOC-003)
- عدم ConsumedEvent و DeadLetterEvent
- عدم connection pool tuning
- ذخیره فایل در filesystem محلی نه در object storage (DOC-004)
- عدم Redis برای caching

**درجه‌بندی پایگاه‌داده:** **۴/۱۰**

#### ۶.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۴ مجوز: `documents:upload`, `documents:link`, `documents:view`, `documents:list`
- RBAC با نقش‌های بیمه‌ای (insurer_admin, head_office_ops, branch_manager, branch_staff, claims_handler, loss_adjuster, call_center, agency/broker_owner/staff, auditor)
- Audit logging برای تمام عملیات
- Correlation ID
- Safe filename sanitization

**اشکالات:**
- عدم AbacGuard و TenantGuard (DOC-009)
- عدم محدودیت حجم فایل (DOC-005)
- عدم MIME type whitelist (DOC-006)
- عدم antivirus scan (DOC-007)
- `actor` از header خوانده می‌شود نه از JWT (DOC-010)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- عدم PII Masking middleware
- `storageRef` حاوی filesystem path — اطلاعات حساس سرور

**درجه‌بندی امنیتی:** **۴/۱۰**

#### ۶.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- OutboxPublisher برای نوشتن رویدادها در DB
- ۵ نوع رویداد Kafka تعریف شده: `DocumentUploaded`, `DocumentLinked`, `ClaimDocumentsAttached`, `ReinsuranceInvoiceArtifactStored`, `ReinsuranceInvoiceArtifactLinked`
- `ClaimDocumentsAttached` برای اطلاع claims-service
- `ReinsuranceInvoiceArtifactStored/Linked` برای اطلاع reinsurance-service
- Correlation ID در تمام رویدادها
- Audit logging

**اشکالات:**
- عدم OutboxWorker — رویدادها هرگز به Kafka ارسال نمی‌شوند (DOC-002)
- عدم KafkaProducer initialization (DOC-003)
- عدم Kafka consumer برای رویدادهای ورودی (مثلاً `DocumentExtractionCompleted` از document-ai-service)
- عدم integration با document-ai-service برای OCR/extraction
- عدم endpoint برای download/stream فایل (DOC-012)
- عدم health check عمیق
- `main.ts` بسیار ساده — فقط app.listen بدون Kafka initialization

**درجه‌بندی ادغام:** **۳/۱۰**

#### جمع‌بندی document-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۵/۱۰ |
| پایگاه‌داده | ۴/۱۰ |
| امنیتی | ۴/۱۰ |
| ادغام | ۳/۱۰ |
| **کل** | **۴/۱۰** |

**وضعیت کلی:** سرویس مدیریت اسناد با قابلیت upload (multipart) و link (external storage ref) برای claims و reinsurance invoices. OutboxPublisher فعال است اما OutboxWorker و KafkaProducer در `main.ts` تعریف نشده‌اند — رویدادها در DB نوشته می‌شوند اما هرگز به Kafka ارسال نمی‌شوند. ذخیره فایل در filesystem محلی، عدم محدودیت حجم/نوع فایل، عدم AbacGuard/TenantGuard، و عدم antivirus scan از نواقص اصلی هستند.

---

### ۷. fraud-service

**پورت:** 18009  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (OutboxPublisher, OutboxWorker, KafkaProducer, createLogger, ConsumedEvent, EventEnvelope), kafkajs, uuid

#### ۷.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- سیستم تشخیص تقلب چندلایه: rule-based scoring + ML-based prediction + hybrid mode
- Rule-based scoring با signals: `LOSS_TYPE_AUTO` (30), `LOSS_TYPE_PROPERTY` (20), `LOSS_TYPE_MEDICAL` (10)، `CLAIM_NUMBER_FORMAT_ANOMALY` (10)، `POLICY_LINKED` (5)
- Configurable hold threshold (`FRAUD_HOLD_THRESHOLD`، پیش‌فرض 50)
- Fraud case lifecycle: `open` → `investigating` → `confirmed` / `cleared`
- Case escalation به SIU یا Legal با reasonCodes و requiresHumanApproval
- `holdClaim` flag برای متوقف کردن پردازش ادعا در صورت تقلب مشکوک
- FraudScoreAudit برای audit trail کامل scoring
- ML Model Management: train، deploy، predict، delete با lifecycle کامل (`training` → `trained` → `deployed` / `failed`)
- ML training با external ML server (`ML_MODEL_SERVER_URL`) — ارسال training data و دریافت metrics (accuracy, precision, recall, f1, auc, confusionMatrix, featureImportance)
- ML inference با external ML server — ارسال feature vector و دریافت score/confidence/featureContributions
- Hybrid scoring: ترکیب rule-based (40%) و ML (60%) با fallback به rule-based در صورت خطای ML
- Feature extraction با hash string to numeric
- Validation metrics با ضریب کاهش (0.93-0.96) نسبت به training metrics
- Graph/Network Analytics: entities (person, organization, provider, address, vehicle, phone) و relationships (owner, relative, employee, provider, same_address, same_phone, same_vehicle, shared_provider)
- Suspicious network detection با BFS cluster detection (3+ entities)
- Entity network analysis با BFS تا maxDepth configurable
- Centrality score (totalConnections * 2 + suspiciousConnections * 10)
- Irregularity Alerts (Swiss Re Pattern): ۴ الگوی تشخیص:
  - `MULTIPLE_CLAIMS_SHORT_PERIOD` — ۳+ ادعا در ۳۰ روز
  - `UNUSUAL_CLAIM_AMOUNT` — ۳x بالاتر از میانگین claimant
  - `RAPID_POLICY_ISSUANCE_CLAIM` — ادعا ظرف ۳۰ روز از صدور بیمه‌نامه
  - `REPEATED_LOSS_TYPE` — ۲+ ادعا با همان loss type
- Alert severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- Alert status: `NEW`, `IN_REVIEW`, `CONFIRMED`, `FALSE_POSITIVE`, `DISMISSED`
- Alert recommendations خودکار
- ML Drift Detection با scheduledDriftDetection و retraining config
- ML Explainability: local explanation، counterfactual، model interpretability summary، batch explanations
- Kafka consumer برای `ClaimDocumentsAttached` با idempotency check (ConsumedEvent)
- Outbox pattern برای انتشار رویدادها: `FraudScoreComputed`, `FraudCaseOpened`, `FraudCaseEscalated`, `FraudCaseClosed`
- OutboxWorker و KafkaProducer فعال در `main.ts`
- ۴ migration برای تکامل schema
- ۷ entity: FraudCase، FraudScoreAudit، FraudMLModel، FraudGraphEntity، FraudGraphRelationship، FraudIrregularityAlert، FraudDocumentAttachmentAudit
- ۳ ML service: FraudMLTrainingService، FraudMLDriftDetectionService، FraudMLExplainabilityService
- Audit logging برای تمام عملیات
- Correlation ID
- Pagination cap (حداکثر ۲۰۰)

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| FRAUD-001 | بحرانی | `synchronize` در production غیرفعال نیست — `DB_SYNC === 'true'` بدون بررسی `NODE_ENV` |
| FRAUD-002 | متوسط | Rule-based scoring بسیار ساده است — فقط ۳ loss type و ۲ signal دیگر. برای تشخیص تقلب واقعی کافی نیست |
| FRAUD-003 | متوسط | `computeScore` به claims-service متصل نیست — هیچ query از claims-service برای دریافت اطلاعات ادعا انجام نمی‌شود |
| FRAUD-004 | متوسط | `detectRapidPolicyIssuanceClaim` از `fraudRepo` برای یافتن policy استفاده می‌کند (query `fc.policyId`) اما FraudCase entity است نه Policy — این query نتیجه اشتباه برمی‌گرداند |
| FRAUD-005 | متوسط | `detectUnusualClaimAmount` از `fc.claimAmount` و `fc.claimantId` در fraudRepo query می‌کند اما این فیلدها در FraudCase entity وجود ندارند — query خطا می‌دهد |
| FRAUD-006 | متوسط | `detectMultipleClaimsShortPeriod` از `fc.claimantId` در fraudRepo query می‌کند اما این فیلد در FraudCase entity وجود ندارد |
| FRAUD-007 | متوسط | `detectRepeatedLossType` از `fc.lossType` در fraudRepo query می‌کند اما این فیلد در FraudCase entity وجود ندارد |
| FRAUD-008 | کم | `validationMetrics` با ضریب ثابت (0.93-0.96) محاسبه می‌شود نه با validation set واقعی |
| FRAUD-009 | متوسط | عدم AbacGuard و TenantGuard — فقط JwtAuthGuard و PermissionsGuard |
| FRAUD-010 | کم | `actor` از header خوانده می‌شود (`x-user-id`) به‌جای `req.user` — قابل جعل |
| FRAUD-011 | کم | `console.log` در چندین endpoint explainability به‌جای logger |
| FRAUD-012 | کم | برخی endpoint‌های ML placeholder برمی‌گردانند (`listModels`, `getModel`, `deleteModel` در بخش mlTrainingService) |
| FRAUD-013 | متوسط | `callMLTraining` و `callMLInference` بدون timeout — اگر ML server پاسخ ندهد، request hang می‌شود |
| FRAUD-014 | کم | عدم Circuit Breaker در ارتباط با ML server |
| FRAUD-015 | کم | `FraudDocumentsConsumer` به `localhost:9092` پیش‌فرض متصل می‌شود — اگر KAFKA_BROKERS تنظیم نشده باشد |
| FRAUD-016 | متوسط | `analyzeEntityNetwork` برای هر entity در BFS یک query جداگانه انجام می‌دهد — N+1 query problem |
| FRAUD-017 | کم | `detectSuspiciousClusters` clusterId با `Date.now()` تولید می‌شود — ممکن است collision رخ دهد |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — سیستم چندلایه (rule + ML + graph + irregularity) اما query‌های irregularity به فیلدهای ناموجود ارجاع می‌دهند

#### ۷.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema `public`
- TypeORM با ۷ entity + OutboxEvent + ConsumedEvent
- ۴ migration برای تکامل schema
- OutboxWorker و KafkaProducer فعال در `main.ts`
- Kafka consumer با idempotency check (ConsumedEvent)
- Index‌های مناسب (بر اساس entity definitions)
- External ML server integration برای training و inference
- Pagination cap (حداکثر ۲۰۰)

**اشکالات:**
- `synchronize` در production غیرفعال نیست (FRAUD-001)
- عدم DeadLetterEvent
- عدم connection pool tuning
- عدم Redis برای caching
- Query‌های irregularity به فیلدهای ناموجود ارجاع می‌دهند (FRAUD-004 تا FRAUD-007)
- N+1 query در `analyzeEntityNetwork` (FRAUD-016)
- عدم timeout در ارتباط با ML server (FRAUD-013)

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۷.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۲۳ مجوز تخصصی تقلب (triage, investigate, escalate, cases:list/view/create, score, ml:view/train/deploy/explain/drift/predict/delete, graph:view/create/update/delete, alert:view/create/update, document:view/upload)
- RBAC با نقش‌های تقلب (insurer_admin, risk_manager, fraud_analyst, legal_ops, auditor, head_office_ops)
- Audit logging برای تمام عملیات
- Correlation ID
- Kafka consumer با idempotency check

**اشکالات:**
- عدم AbacGuard و TenantGuard (FRAUD-009)
- `actor` از header خوانده می‌شود نه از JWT (FRAUD-010)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- عدم PII Masking middleware
- `console.log` در endpoint‌های explainability (FRAUD-011)
- ML training data ممکن است حاوی PII باشد بدون رمزنگاری
- عدم audit logging برای ML operations (train, deploy, predict)

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۷.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Outbox pattern برای انتشار رویدادها: `FraudScoreComputed`, `FraudCaseOpened`, `FraudCaseEscalated`, `FraudCaseClosed`
- OutboxWorker و KafkaProducer فعال در `main.ts`
- Kafka consumer برای `ClaimDocumentsAttached` با idempotency check
- Correlation ID در تمام رویدادها
- External ML server integration برای training و inference
- `holdClaim` flag برای متوقف کردن پردازش ادعا در claims-service
- FraudDocumentAttachmentAudit برای tracking اسناد متصل به ادعا

**اشکالات:**
- عدم Kafka consumer برای `ClaimCreated` یا `ClaimSubmitted` — fraud scoring باید به‌صورت دستی فراخوانی شود
- عدم integration خودکار با claims-service — `computeScore` باید از طریق API call فراخوانی شود
- عدم Circuit Breaker در ارتباط با ML server (FRAUD-014)
- عدم timeout در ارتباط با ML server (FRAUD-013)
- عدم health check عمیق
- `FraudDocumentsConsumer` به `localhost:9092` پیش‌فرض متصل می‌شود (FRAUD-015)
- برخی endpoint‌های ML placeholder برمی‌گردانند (FRAUD-012)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی fraud-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس تشخیص تقلب چندلایه با rule-based scoring، ML model management (train/deploy/predict)، graph/network analytics (entity/relationship/cluster detection)، و irregularity alerts (Swiss Re patterns). OutboxWorker و KafkaProducer فعال هستند. Kafka consumer برای `ClaimDocumentsAttached` پیاده‌سازی شده است. اما rule-based scoring بسیار ساده است، query‌های irregularity detection به فیلدهای ناموجود در FraudCase ارجاع می‌دهند (FRAUD-004 تا FRAUD-007)، عدم AbacGuard/TenantGuard، و عدم timeout/circuit breaker در ارتباط با ML server از نواقص اصلی هستند.

---

### ۸. orchestrator-service

**پورت:** 18010  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (KafkaProducer, KafkaConsumer, DeadLetterQueueService, consumeOnce, createEventEnvelope, createLogger, ConsumedEvent, DeadLetterEvent), uuid

#### ۸.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- Saga orchestration با ۵ نوع: `ClaimPayment`, `PolicyIssuance`, `ComplaintHandling`, `ComplaintResolution`, `ReinsuranceRecovery`
- Saga lifecycle: `started` → `waiting` → `completed` / `failed` / `compensating` / `compensated`
- ClaimPayment saga با step‌های: `INITIATED` → `FRAUD_CHECK` → `HUMAN_APPROVAL` (اگر amount > 10M) → `PAYMENT_PREPARE` → `FINANCE_APPROVAL` → `PAYMENT_EXECUTE` → `PAYMENT_NOTIFY` → `COMPLETED`
- PolicyIssuance saga با state machine: `INITIATED` → `UNDERWRITING_REVIEW` → `SANHAB_FOLLOWUP` → `OVERRIDE_REVIEW` → `COMPLETED`
- ComplaintResolution saga با state machine: `INITIATED` → `COMPLAINT_TRIAGE` → `COMPLAINT_SLA_BREACH` → `COMPLETED`
- ReinsuranceRecovery saga با state machine: `INITIATED` → `RECOVERY_IDENTIFIED` → `RECOVERY_RECEIVED` → `COMPLETED`
- Work Item management: create، assign، complete (approved/rejected/escalated)، list، get
- Work Item types: `fraud_check`, `human_approval`, `payment_prepare`, `payment_finance_approval`, `payment_execute`, `payment_notify`, `document_review`, `complaint_triage`, `complaint_sla_breach`, `fraud_case_escalation`, `sanhab_followup`, `underwriting_review`, `override_review`, `suspicious_case`
- Work Item priority: `low`, `medium`, `high`, `critical`
- Saga Step tracking با retry، duration، compensation status
- Saga Compensation/Rollback با per-step compensation actions:
  - `PAYMENT_PREPARE` → publish `insurance.payment.cancel`
  - `PAYMENT_EXECUTE` → publish `insurance.payment.refund`
  - `PAYMENT_NOTIFY` → publish `insurance.notification.compensation`
  - `FRAUD_CHECK` → publish `insurance.fraud.clear_hold`
  - `POLICY_ISSUE` → publish `insurance.policy.cancel`
- Compensation retry برای failed steps
- Deduplication با `dedupeKey` در context برای جلوگیری از saga‌های تکراری
- Kafka event-driven processing: ۹ topic مصرف می‌شود:
  - `insurance.payment.prepared` → advance to FINANCE_APPROVAL
  - `insurance.payment.finance_approved` → advance to PAYMENT_EXECUTE
  - `insurance.payment.executed` → advance to PAYMENT_NOTIFY
  - `insurance.payment.notified` → complete saga
  - `insurance.document.extraction.needs_review` → create document review work item
  - `insurance.fraud.score_computed` → create suspicious case work item (if holdClaim)
  - `insurance.fraud.case_escalated` → create fraud case escalation work item
  - `insurance.complaint.created` → create complaint triage work item
  - `insurance.complaint.sla_breached` → create SLA breach work item
- Dead Letter Queue با retry processor و DLQ management endpoints (stats, list, resolve)
- Idempotency با `consumeOnce` و `ConsumedEvent`
- SLA Monitor Service: breach detection، stats per saga، escalation for >48h overdue
- Saga event publishing برای تمام transitions
- Audit logging برای تمام controller endpoints
- Correlation ID
- ۳ entity: SagaInstance، SagaStep، WorkItem
- ۵ migration
- ۴ controller: OrchestrationsController، WorkflowsController، WorkItemsController، DlqController
- Pagination cap (حداکثر ۲۰۰)
- `synchronize` به‌درستی در production غیرفعال است (`NODE_ENV !== 'production' && DB_SYNC === 'true'`)

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| ORCH-001 | متوسط | عدم AbacGuard و TenantGuard — فقط JwtAuthGuard و PermissionsGuard |
| ORCH-002 | کم | `actor` از header خوانده می‌شود (`x-user-id`) به‌جای `req.user` — قابل جعل |
| ORCH-003 | متوسط | `SlaMonitorService.processSlaBreaches` هیچ scheduler یا cron ندارد — باید به‌صورت دستی فراخوانی شود |
| ORCH-004 | متوسط | `onPaymentEvent` فقط اولین saga را پیدا می‌کند (`orderBy DESC`) — اگر چند saga برای یک claim وجود داشته باشد، فقط آخرین یک پردازش می‌شود |
| ORCH-005 | کم | `completeWorkItem` در صورت `escalated` فقط status را تغییر می‌دهد اما saga را advance نمی‌کند — deadlock ممکن است |
| ORCH-006 | متوسط | `publishSagaEvent` مستقیماً KafkaProducer استفاده می‌کند نه Outbox pattern — در صورت Kafka outage، event از دست می‌رود |
| ORCH-007 | کم | `DLQController.makeDlqService` در هر request یک `DeadLetterQueueService` جدید ایجاد می‌کند — عدم reuse |
| ORCH-008 | کم | `handleHumanApprovalStep` threshold ثابت (50,000,000) — غیرقابل پیکربندی از env |
| ORCH-009 | کم | `startClaimPaymentSaga` threshold برای human approval (10,000,000) ثابت — غیرقابل پیکربندی از env |
| ORCH-010 | متوسط | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |
| ORCH-011 | کم | `dueDate` در `createWorkItem` تنظیم نمی‌شود — فقط در متدهای خاص (underwriting, override, suspicious) |
| ORCH-012 | کم | `try/catch` خالی برای `dueDate` parsing — خطا به‌صورت خاموش نادیده گرفته می‌شود |
| ORCH-013 | متوسط | PolicyIssuance saga فقط ایجاد می‌شود اما هیچ step‌ای اجرا نمی‌کند — `startSaga` برای PolicyIssuance فقط saga را save می‌کند و event publish می‌کند، هیچ work item یا step‌ای ایجاد نمی‌کند |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Saga orchestration جامع با compensation اما عدم Outbox pattern و scheduler برای SLA

#### ۸.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema `public`
- TypeORM با ۳ entity + ConsumedEvent + DeadLetterEvent
- ۵ migration برای تکامل schema
- `synchronize` به‌درستی در production غیرفعال است
- KafkaProducer و KafkaConsumer فعال در `main.ts`
- DeadLetterQueueService با retry processor
- Idempotency با `consumeOnce` و `ConsumedEvent`
- Pagination cap (حداکثر ۲۰۰)

**اشکالات:**
- عدم Outbox pattern — events مستقیماً به Kafka ارسال می‌شوند (ORCH-006)
- عدم connection pool tuning
- عدم Redis برای caching
- `DLQController.makeDlqService` در هر request یک DLQ service جدید ایجاد می‌کند (ORCH-007)

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۸.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۱۶ مجوز تخصصی (saga_start, saga_view, saga_compensate, work_items:list/view/assign/complete/create_sanhab/create_underwriting/create_override/create_suspicious_case, sla_view/sla_manage, dlq:list/stats/resolve)
- RBAC با ۹ نقش (insurer_admin, head_office_ops, claims_handler, finance_ops, fraud_analyst, risk_manager, legal_ops, branch_manager, auditor)
- Audit logging برای تمام عملیات
- Correlation ID
- DLQ management با audit trail

**اشکالات:**
- عدم AbacGuard و TenantGuard (ORCH-001)
- `actor` از header خوانده می‌شود نه از JWT (ORCH-002)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- عدم PII Masking middleware

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۸.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Kafka consumer برای ۹ topic از ۴ سرویس (payments, fraud, complaints, document-ai)
- KafkaProducer برای انتشار saga events (شروع، تکمیل، شکست، compensation)
- Dead Letter Queue برای مدیریت خطا در Kafka consumption
- Idempotency با `consumeOnce` و `ConsumedEvent`
- Correlation ID در تمام events
- Event envelope با `createEventEnvelope` برای فرمت استاندارد
- Integration با payments-service از طریق ۴ payment event
- Integration با fraud-service از طریق ۲ fraud event
- Integration با complaints-service از طریق ۲ complaint event
- Integration با document-ai-service از طریق ۱ document event
- Compensation events برای rollback در سایر سرویس‌ها

**اشکالات:**
- عدم Outbox pattern — events مستقیماً به Kafka (ORCH-006)
- عدم scheduler برای SLA monitoring (ORCH-003)
- PolicyIssuance saga هیچ step‌ای اجرا نمی‌کند (ORCH-013)
- عدم health check عمیق (ORCH-010)
- `SlaMonitorService` در `AppModule` ثبت شده اما هیچ cron/scheduler‌ای آن را فراخوانی نمی‌کند
- عدم integration با workflow-service یا rule-engine-service

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی orchestrator-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس orchestration مرکزی با Saga pattern برای ۵ نوع فرایند (ClaimPayment, PolicyIssuance, ComplaintResolution, ReinsuranceRecovery, ComplaintHandling). Saga compensation با per-step rollback actions، Dead Letter Queue با retry processor، Kafka consumer برای ۹ topic از ۴ سرویس، و Work Item management کامل. `synchronize` به‌درستی در production غیرفعال است. اما عدم Outbox pattern (events مستقیماً به Kafka)، عدم scheduler برای SLA monitoring، PolicyIssuance saga که هیچ step‌ای اجرا نمی‌کند، و عدم AbacGuard/TenantGuard از نواقص اصلی هستند.

---

### ۹. feature-flags-service

**پورت:** 18011  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: feature_flags)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** dotenv

#### ۹.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- دو نوع toggle: FeatureFlag و AiToggle
- FeatureFlag: name (unique)، description، isEnabled، rolloutPercentage، targetAudience (JSONB)
- AiToggle: name (unique)، description، isEnabled، modelName، modelVersion، config (JSONB)
- Upsert logic برای ایجاد/به‌روزرسانی flag‌ها
- `ensureDefaults` برای ایجاد flag‌های پیش‌فرض (`ai.enabled`, `copilot.enabled`, `document_ai.enabled`)
- GET endpoint‌ها بدون authentication (برای دسترسی سایر سرویس‌ها)
- PUT endpoint‌ها با JwtAuthGuard + PermissionsGuard
- Correlation ID
- ۲ entity، ۲ migration
- Schema جداگانه (`feature_flags`)

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| FF-001 | بحرانی | `synchronize` در production غیرفعال نیست — `DB_SYNC === 'true'` بدون بررسی `NODE_ENV` |
| FF-002 | متوسط | GET endpoint‌ها (`/feature-flags`, `/feature-flags/:key`, `/ai-toggles`, `/ai-toggles/:name`) بدون JwtAuthGuard — هر کسی با دسترسی شبکه می‌تواند flag‌ها را ببیند |
| FF-003 | متوسط | عدم caching — هر request به DB می‌رود. برای feature flag که در هر request سایر سرویس‌ها چک می‌شود، این کار performance پایین می‌آورد |
| FF-004 | متوسط | عدم Kafka integration — تغییر flag‌ها به سایر سرویس‌ها notification نمی‌شود. سرویس‌ها باید هر بار flag را fetch کنند |
| FF-005 | کم | `ensureDefaults` در هر `listFeatureFlags` فراخوانی می‌شود — overhead غیرضروری |
| FF-006 | کم | عدم audit logging — تغییر flag‌ها log نمی‌شود |
| FF-007 | کم | عدم pagination — `listFeatureFlags` تمام flag‌ها را برمی‌گرداند |
| FF-008 | کم | عدم validation برای `rolloutPercentage` (باید 0-100 باشد) |
| FF-009 | کم | فقط `insurer_admin` دسترسی manage دارد — عدم نقش `auditor` برای view-only |
| FF-010 | کم | عدم health check عمیق |

**درجه‌بندی منطق پیاده‌سازی:** **۵/۱۰** — قابلیت‌های پایه feature flag و AI toggle اما عدم caching، Kafka notification، و audit logging

#### ۹.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema جداگانه (`feature_flags`)
- TypeORM با ۲ entity
- ۲ migration
- Unique constraint روی `name`

**اشکالات:**
- `synchronize` در production غیرفعال نیست (FF-001)
- عدم Redis برای caching (FF-003)
- عدم connection pool tuning
- عدم Kafka producer برای notification تغییرات (FF-004)

**درجه‌بندی پایگاه‌داده:** **۴/۱۰**

#### ۹.۳ وضعیت امنیتی

**نقاط قوت:**
- PUT endpoint‌ها با `JwtAuthGuard` و `PermissionsGuard` محافظت می‌شوند
- ۲ مجوز: `feature_flags:manage`, `ai_toggles:manage`
- RBAC با نقش `insurer_admin`
- Validation برای `isEnabled` (boolean required)

**اشکالات:**
- GET endpoint‌ها بدون authentication (FF-002)
- عدم AbacGuard و TenantGuard
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- عدم audit logging (FF-006)
- عدم PII Masking middleware

**درجه‌بندی امنیتی:** **۴/۱۰**

#### ۹.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- GET endpoint‌ها بدون authentication برای دسترسی سایر سرویس‌ها
- Schema جداگانه برای isolation
- `ensureDefaults` برای flag‌های پیش‌فرض AI

**اشکالات:**
- عدم Kafka integration برای notification تغییرات (FF-004)
- عدم Redis برای caching — سرویس‌ها باید هر بار flag را fetch کنند (FF-003)
- عدم health check عمیق (FF-010)
- عدم SDK یا client library برای سایر سرویس‌ها
- `main.ts` بسیار ساده — فقط `app.listen` بدون Kafka initialization
- عدم integration با model-switchboard-service یا ai-governance-service

**درجه‌بندی ادغام:** **۳/۱۰**

#### جمع‌بندی feature-flags-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۵/۱۰ |
| پایگاه‌داده | ۴/۱۰ |
| امنیتی | ۴/۱۰ |
| ادغام | ۳/۱۰ |
| **کل** | **۴/۱۰** |

**وضعیت کلی:** سرویس مدیریت feature flag و AI toggle با قابلیت upsert و defaults. GET endpoint‌ها بدون authentication برای دسترسی سایر سرویس‌ها، PUT endpoint‌ها با JwtAuthGuard. اما عدم caching (هر request به DB)، عدم Kafka notification برای تغییرات، عدم audit logging، `synchronize` در production غیرفعال نیست، و GET endpoint‌ها بدون authentication از نواقص اصلی هستند.

---

### ۱۰. claims-readmodel-service

**پورت:** 18012  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: claims_rm)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (ConsumedEvent, createLogger, EventEnvelope), kafkajs

#### ۱۰.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- CQRS read model با ۳ projection: `RmClaimCase`, `RmFraudCase`, `RmComplaintOps`
- Kafka consumer مستقیم با kafkajs (نه از طریق shared KafkaConsumer)
- ۱۷ topic مصرف می‌شود:
  - Claim: `registered`, `assessed`, `approved`, `rejected`, `paid`, `closed` (۶ topic)
  - Fraud: `score_computed`, `case_opened`, `case_closed` (۳ topic)
  - Complaint: `created`, `escalated`, `sla_breached`, `resolved`, `status_changed`, `attachment_added` (۶ topic)
  - Reinsurance: `recovery_identified`, `recovery_received` (۲ topic)
- Idempotency با `ConsumedEvent` و `ensureIdempotent`
- Upsert logic برای هر projection:
  - `upsertRmClaimCase`: claim status, lossDate, lossType, requiresHumanTriage
  - `upsertRmFraudCase`: latestScore, holdClaim, status, assignedTo, caseOpenedAt/ClosedAt, resolution
  - `upsertRmComplaint`: complaintType, status, policyId, claimId, assignedTo, SLA dates, mobile verification
  - `upsertRmClaimReinsurance`: riContractId, riRecoverableAmount, riRecoveredAmount, riCurrency, riLastIdentifiedAt/ReceivedAt
- Query endpoints: list claims (filter by policyId, status), get claim by ID, claims summary (group by status), list fraud cases (filter by status, minScore), list complaints ops (filter by status, complaintType)
- Pagination با limit/offset
- Index‌های مناسب: `policyId`, `status+updatedAt`, `latestScore+updatedAt`, `complaintType+updatedAt`
- `synchronize` به‌درستی در production غیرفعال است (`NODE_ENV !== 'production' && DB_SYNC === 'true'`)
- Schema جداگانه (`claims_rm`)
- ۴ migration
- Correlation ID
- Logger با prettyPrint در non-production

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| RM-001 | متوسط | عدم Dead Letter Queue — در صورت خطا در `applyEvent`، event از دست می‌رود (فقط `ensureIdempotent` چک می‌شود اما no try/catch در `eachMessage`) |
| RM-002 | متوسط | `JSON.parse(rawValue)` بدون try/catch — در صورت malformed JSON، consumer crash می‌کند |
| RM-003 | متوسط | عدم AbacGuard و TenantGuard — فقط JwtAuthGuard و PermissionsGuard |
| RM-004 | کم | عدم pagination cap — limit می‌تواند هر عددی باشد |
| RM-005 | کم | عدم audit logging — query‌ها log نمی‌شوند |
| RM-006 | کم | `fromBeginning: true` در subscribe — در restart، تمام event‌ها از ابتدا پردازش می‌شوند (با idempotency OK است اما overhead دارد) |
| RM-007 | کم | `upsertRmClaimReinsurance` در صورت عدم وجود claim، یک row با placeholder‌های `'—'` و `'00000000-0000-0000-0000-000000000000'` ایجاد می‌کند — data quality issue |
| RM-008 | کم | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |
| RM-009 | کم | Kafka consumer در `onModuleInit` استارت می‌شود — اگر Kafka در دسترس نباشد، service boot نمی‌شود |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — CQRS read model جامع با ۳ projection و ۱۷ topic اما عدم DLQ و error handling در consumer

#### ۱۰.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema جداگانه (`claims_rm`)
- TypeORM با ۳ entity + ConsumedEvent
- ۴ migration
- Index‌های مناسب برای query performance
- `synchronize` به‌درستی در production غیرفعال است
- `upsert` برای idempotent writes
- PrimaryColumn با UUID (نه auto-increment)

**اشکالات:**
- عدم Dead Letter Queue (RM-001)
- عدم connection pool tuning
- عدم Redis برای caching
- `upsertRmClaimReinsurance` placeholder data ایجاد می‌کند (RM-007)

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۱۰.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۴ مجوز: `rm:claims:view`, `rm:claims:summary`, `rm:fraud:view`, `rm:complaints:view`
- RBAC با ۹ نقش (insurer_admin, head_office_ops, claims_handler, fraud_analyst, complaints_handler, legal_ops, compliance_aml, auditor, branch_manager, branch_staff)
- Correlation ID

**اشکالات:**
- عدم AbacGuard و TenantGuard (RM-003)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- عدم audit logging (RM-005)
- عدم PII Masking middleware
- `complainantMobile` در RmComplaintOps بدون masking ذخیره می‌شود

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۱۰.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Kafka consumer برای ۱۷ topic از ۴ دامنه (claims, fraud, complaints, reinsurance)
- Idempotency با `ConsumedEvent`
- CQRS pattern — read model جدا از write model
- Event-driven projection updates
- Query endpoints برای reporting و dashboard
- Schema جداگانه برای isolation

**اشکالات:**
- عدم Dead Letter Queue (RM-001)
- عدم error handling در Kafka consumer (RM-002)
- عدم health check عمیق (RM-008)
- Kafka consumer مستقیم با kafkajs (نه از طریق shared KafkaConsumer) — عدم استفاده از shared infrastructure
- عدم retry mechanism برای failed events
- `fromBeginning: true` در restart (RM-006)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی claims-readmodel-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس CQRS read model با ۳ projection (claims, fraud, complaints) و ۱۷ Kafka topic. Idempotency با ConsumedEvent، upsert logic برای هر projection، و query endpoints با pagination و filtering. `synchronize` به‌درستی در production غیرفعال است. اما عدم Dead Letter Queue، عدم error handling در Kafka consumer (JSON.parse بدون try/catch)، عدم AbacGuard/TenantGuard، و placeholder data در reinsurance upsert از نواقص اصلی هستند.

---

### ۱۱. complaints-service

**پورت:** 18013  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (OutboxPublisher, OutboxWorker, KafkaProducer, createLogger, ConsumedEvent, DeadLetterEvent, OutboxEvent), uuid, crypto

#### ۱۱.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- Complaint lifecycle کامل: create → escalate → update_status → resolve
- ۹ نوع شکایت: `issuance`, `claims_with_case`, `claims_without_case`, `agent`, `broker`, `loss_adjuster`, `unauthorized_office`, `fund`, `other`
- ۵ وضعیت: `open`, `in_review`, `resolved`, `closed`, `escalated`
- ۵ entity: Complaint, ComplaintAttachment, ComplaintAudit, ComplaintSlaBreach, ComplaintMobileOtpChallenge
- ۸ migration
- Outbox pattern با `OutboxPublisher` و `OutboxWorker` — events به‌صورت transactional به Kafka
- ۸ Kafka event: `ComplaintCreated`, `ComplaintEscalated`, `ComplaintSlaBreached`, `ComplaintResolved`, `ComplaintStatusChanged`, `ComplaintAttachmentAdded`, `ComplaintMobileOtpRequested`, `ComplaintMobileVerified`
- Mobile OTP verification با:
  - SHA-256 hash با salt (کد به‌صورت plaintext ذخیره نمی‌شود)
  - Rate limiting (پیکربندی از env: `COMPLAINTS_OTP_RATE_LIMIT_SECONDS`)
  - TTL (پیکربندی از env: `COMPLAINTS_OTP_TTL_SECONDS`)
  - Max attempts (پیکربندی از env: `COMPLAINTS_OTP_MAX_ATTEMPTS`)
  - Status tracking: `sent`, `verified`, `expired`, `locked`
- SLA breach worker با:
  - `setInterval` polling (پیکربندی از env: `COMPLAINTS_SLA_BREACH_POLL_INTERVAL_MS`)
  - `pg_try_advisory_lock` برای leader election در multi-instance
  - Batch processing (پیکربندی از env: `COMPLAINTS_SLA_BREACH_BATCH_SIZE`)
  - Duplicate breach prevention
  - Event publishing برای breaches
- SLA first response و resolution due dates (پیکربندی از env)
- Dashboard endpoint با totals by status, totals by type, SLA overdue counts
- Recurring causes analysis با Persian/English keyword extraction (۲۰ cause category)
- Cause trends با daily aggregation
- Central Insurance integration:
  - `sendToCentralInsurance` با `fetch` API
  - Mobile verification required قبل از export
  - Required fields validation (۱۰ فیلد)
  - Tracking number storage در metadata
  - Retry mechanism برای failed sends
  - Auto-send on resolution
  - Status query endpoint
  - پیکربندی از env: `CENTRAL_INSURANCE_API_URL`, `CENTRAL_INSURANCE_API_KEY`, `CENTRAL_INSURANCE_ENABLED`
- Audit logging برای تمام عملیات (ComplaintAudit entity با eventType, fromStatus, toStatus, reason, details)
- `synchronize` به‌درستی در production غیرفعال است
- Correlation ID
- `req.user` برای actor (نه header)
- Pagination با limit/offset
- Index‌های مناسب: `status+createdAt`, `complaintType+createdAt`, `policyNumber`, `claimId`, `complainantNationalId`

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| CMP-001 | متوسط | عدم AbacGuard و TenantGuard — فقط JwtAuthGuard و PermissionsGuard |
| CMP-002 | متوسط | عدم pagination cap — limit می‌تواند هر عددی باشد |
| CMP-003 | متوسط | `callCentralInsuranceApi` بدون timeout — در صورت عدم پاسخ، request hang می‌شود |
| CMP-004 | متوسط | `callCentralInsuranceApi` بدون retry/circuit breaker — در صورت API outage، هر request fail می‌شود |
| CMP-005 | کم | `extractCausesFromDescription` بسیار ساده — keyword matching نه NLP واقعی |
| CMP-006 | کم | `getCauseTrends` تمام complaints را load می‌کند سپس در-memory filter می‌کند — performance issue برای حجم بالا |
| CMP-007 | کم | `analyzeRecurringCauses` نیز تمام complaints را load می‌کند — performance issue |
| CMP-008 | کم | OTP delivery به‌صورت comment ذکر شده — actual SMS provider integration خارج از service است |
| CMP-009 | کم | `autoSendOnResolution` هیچ scheduler‌ای آن را فراخوانی نمی‌کند — باید به‌صورت دستی trigger شود |
| CMP-010 | کم | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |
| CMP-011 | کم | `complainantMobile` و `complainantNationalId` بدون masking در event payload ذخیره می‌شوند |
| CMP-012 | کم | عدم Kafka consumer — complaints-service فقط event produce می‌کند، هیچ event مصرف نمی‌کند |

**درجه‌بندی منطق پیاده‌سازی:** **۸/۱۰** — Complaint lifecycle کامل با OTP, SLA, Central Insurance, recurring analysis اما عدم timeout/retry در external API و performance issues در analysis

#### ۱۱.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۵ entity + OutboxEvent + ConsumedEvent + DeadLetterEvent
- ۸ migration
- Outbox pattern با `OutboxPublisher` و `OutboxWorker`
- `synchronize` به‌درستی در production غیرفعال است
- Index‌های مناسب برای query performance
- `pg_try_advisory_lock` برای leader election در SLA worker
- UUID primary keys

**اشکالات:**
- عدم connection pool tuning
- عدم Redis برای caching
- `analyzeRecurringCauses` و `getCauseTrends` تمام records را load می‌کنند (CMP-006, CMP-007)

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۱۱.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۱۱ مجوز تخصصی: `complaints:create`, `complaints:view`, `complaints:list`, `complaints:dashboard`, `complaints:escalate`, `complaints:update_status`, `complaints:attach_document`, `complaints:otp_request`, `complaints:otp_verify`, `complaints:export`, `complaints:manage`
- RBAC با ۷ نقش (insurer_admin, head_office_ops, branch_manager, branch_staff, legal_ops, call_center, complaints_handler, auditor)
- `req.user` برای actor (نه header) — قابل جعل نیست
- Audit logging برای تمام عملیات
- OTP با SHA-256 hash + salt
- OTP rate limiting, TTL, max attempts
- Mobile verification required قبل از Central Insurance export
- Required fields validation برای export
- Correlation ID

**اشکالات:**
- عدم AbacGuard و TenantGuard (CMP-001)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting در API level
- عدم security headers
- عدم PII Masking — `complainantMobile` و `complainantNationalId` بدون masking (CMP-011)
- `CENTRAL_INSURANCE_API_KEY` در env — در صورت leak، قابل misuse است

**درجه‌بندی امنیتی:** **۶/۱۰**

#### ۱۱.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Outbox pattern با `OutboxPublisher` و `OutboxWorker` — events به‌صورت transactional
- ۸ Kafka event تولید می‌شود: created, escalated, sla_breached, resolved, status_changed, attachment_added, mobile_otp_requested, mobile_verified
- Central Insurance integration با `fetch` API
- Integration با orchestrator-service از طریق `ComplaintCreated` و `ComplaintSlaBreached` events
- Integration با claims-readmodel-service از طریق ۶ complaint event
- SLA breach worker با leader election برای multi-instance
- Audit trail کامل در `ComplaintAudit` entity
- Correlation ID در تمام events

**اشکالات:**
- عدم Kafka consumer — complaints-service فقط event produce می‌کند (CMP-012)
- عدم timeout/retry در Central Insurance API (CMP-003, CMP-004)
- `autoSendOnResolution` هیچ scheduler‌ای آن را فراخوانی نمی‌کند (CMP-009)
- عدم health check عمیق (CMP-010)
- عدم integration با notification-service برای SMS delivery
- OTP delivery به‌صورت comment — actual SMS provider خارج از service

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی complaints-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۸/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۶/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۷/۱۰** |

**وضعیت کلی:** سرویس مدیریت شکایات با lifecycle کامل (create, escalate, update_status, resolve)، Mobile OTP verification با hash+salt و rate limiting، SLA breach worker با leader election، Outbox pattern برای transactional events، Central Insurance integration با validation و retry، recurring causes analysis با Persian/English keywords، و audit trail کامل. `synchronize` به‌درستی در production غیرفعال است. اما عدم timeout/retry در Central Insurance API، عدم AbacGuard/TenantGuard، عدم Kafka consumer، و performance issues در analysis methods از نواقص اصلی هستند.

---

### ۱۲. reporting-service

**پورت:** 18014  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: reporting)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (ConsumedEvent, createLogger, EventEnvelope), kafkajs, uuid

#### ۱۲.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- CQRS read model با ۱۸ entity (پروژکشن):
  - `RmPolicyLifecycle`, `RmClaimPayment`, `RmFraudSignal`, `RmRiCeded`, `RmRiBorderaux`, `RmRiRecovery`, `RmClaimDocumentsAttached`, `RmFraudCaseEscalation`, `RmComplaintSlaBreach`
  - `KpiSnapshot`, `KpiIngestionAudit`, `KpiGovernancePolicy`
  - `RmPolicy`, `RmPayment`, `RmSalesNetwork`, `RmAml`, `RmUnderwriting`
  - `ExternalSystemConnection`
- Kafka consumer مستقیم با kafkajs — ۲۳ topic مصرف می‌شود:
  - Policy: `quoted`, `docs_submitted`, `risk_assessed`, `underwriting_decided`, `issued`, `unique_code_set`, `endorsed`, `cancelled`, `renewed` (۹ topic)
  - Claim: `registered`, `payment_requested`, `paid`, `documents_attached` (۴ topic)
  - Payment: `executed` (۱ topic)
  - Fraud: `score_computed`, `case_opened`, `case_closed`, `case_escalated` (۴ topic)
  - Complaint: `sla_breached` (۱ topic)
  - Reinsurance: `ceded_calculated`, `borderaux_generated`, `recovery_identified`, `recovery_received` (۴ topic)
- Idempotency با `ConsumedEvent` و `ensureIdempotent`
- Projection upsert logic برای هر دامنه:
  - `applyPolicyEvent`: quotedAt, docsSubmittedAt, riskAssessedAt, issuedAt, uniqueCodeSetAt
  - `applyClaimEvent`: registeredAt, paymentRequestedAt, approvedAmount, claimPaidAt
  - `applyPaymentEvent`: paymentExecutedAt
  - `applyFraudEvent`: latestScore, holdClaim, scoreComputedAt, caseOpenedAt, caseClosedAt, caseResolution
  - `applyClaimDocumentsAttached`: documentsCount, typesSummary, lastDocumentId
  - `applyFraudCaseEscalated`: fraudCaseId, claimId, toUnit, reasonCodes, requiresHumanApproval
  - `applyComplaintSlaBreached`: complaintId, slaHours, elapsedHours, breachedAt
  - `applyRiCeded`: grossAmount, cededAmount, retainedAmount, currency
  - `applyRiBorderaux`: periodStart, periodEnd, itemsCount, documentId
  - `applyRiRecovery`: recoverableAmount, recoveredAmount, identifiedAt, receivedAt
- KPI Governance:
  - `KpiGovernancePolicy` با allowedPeriodGranularities, allowedSourceSystems, expectedUnit, minValue, maxValue, enforced
  - ۳ governed gap KPI: `customer_satisfaction_rate`, `financial_solvency_ratio`, `market_share_percent`
  - Period granularity validation: day, week, month, quarter, year با UTC boundary checks
  - Source system validation
  - Unit validation
  - Min/max value validation
- KPI Snapshot ingestion با idempotency key
- KPI Ingestion Audit
- Ready KPIs: issuanceSpeed (avgMinutesQuoteToIssue), claimPayoutTime (avgMinutesRegisterToPaid), fraudIdentifiedRate (holdRate)
- Executive Dashboard
- Query endpoints برای policies, payments, sales-partners, AML transactions, underwriting
- Pagination با limit/offset (بعضی endpoints با cap: `Math.min(Math.max(lim, 1), 200)`)
- `synchronize` به‌درستی در production غیرفعال است
- Schema جداگانه (`reporting`)
- ۸ migration
- Correlation ID
- Audit logging
- Logger با prettyPrint در non-production

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| RPT-001 | متوسط | عدم Dead Letter Queue — در صورت خطا در `applyEvent`، event از دست می‌رود (no try/catch در `eachMessage`) |
| RPT-002 | متوسط | `JSON.parse(raw)` بدون try/catch — در صورت malformed JSON، consumer crash می‌کند |
| RPT-003 | متوسط | عدم AbacGuard و TenantGuard — فقط JwtAuthGuard و PermissionsGuard |
| RPT-004 | متوسط | عدم pagination cap در اکثر endpoints (فقط `/reporting/kpis/snapshots` cap دارد) |
| RPT-005 | کم | `fromBeginning: true` در subscribe — در restart، تمام event‌ها از ابتدا پردازش می‌شوند |
| RPT-006 | کم | `applyRiCeded`, `applyRiBorderaux`, `applyRiRecovery` همگی برای هر `insurance.ri.*` topic فراخوانی می‌شوند — هر ۳ متد check می‌کنند اما overhead دارد |
| RPT-007 | کم | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |
| RPT-008 | کم | Kafka consumer در `onModuleInit` استارت می‌شود — اگر Kafka در دسترس نباشد، service boot نمی‌شود |
| RPT-009 | کم | actor از header `x-user-id` خوانده می‌شود (نه `req.user`) — قابل جعل |
| RPT-010 | کم | عدم Redis برای caching |

**درجه‌بندی منطق پیاده‌سازی:** **۸/۱۰** — CQRS read model جامع با ۱۸ entity، ۲۳ Kafka topic، KPI governance با validation، و executive dashboard اما عدم DLQ و error handling در consumer

#### ۱۲.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با schema جداگانه (`reporting`)
- TypeORM با ۱۸ entity + ConsumedEvent
- ۸ migration
- `synchronize` به‌درستی در production غیرفعال است
- Upsert logic برای idempotent writes
- KPI Governance با validation
- KPI Snapshot با idempotency key
- KPI Ingestion Audit

**اشکالات:**
- عدم Dead Letter Queue (RPT-001)
- عدم connection pool tuning
- عدم Redis برای caching (RPT-010)
- `fromBeginning: true` در restart (RPT-005)

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۱۲.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۴ مجوز: `reporting:view`, `reporting:ingest`, `reporting:projections:admin`, `reporting:manage`
- RBAC با ۱۲ نقش (insurer_admin, head_office_ops, risk_manager, auditor, finance_ops, underwriter, claims_handler, loss_adjuster, fraud_analyst, compliance_aml, legal_ops, complaints_handler)
- Audit logging برای تمام عملیات
- KPI Governance با enforced validation
- Idempotency key برای KPI ingestion
- Correlation ID

**اشکالات:**
- عدم AbacGuard و TenantGuard (RPT-003)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- actor از header `x-user-id` خوانده می‌شود — قابل جعل (RPT-009)
- عدم PII Masking

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۱۲.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Kafka consumer برای ۲۳ topic از ۶ دامنه (policy, claim, payment, fraud, complaint, reinsurance)
- Idempotency با `ConsumedEvent`
- CQRS pattern — read model جدا از write model
- Event-driven projection updates
- Query endpoints برای dashboard و reporting
- Schema جداگانه برای isolation
- KPI Snapshot ingestion برای external systems
- KPI Governance برای controlled KPI ingestion
- Executive Dashboard
- Integration با claims-readmodel-service (shared event consumption pattern)

**اشکالات:**
- عدم Dead Letter Queue (RPT-001)
- عدم error handling در Kafka consumer (RPT-002)
- عدم health check عمیق (RPT-007)
- Kafka consumer مستقیم با kafkajs (نه از طریق shared KafkaConsumer)
- عدم retry mechanism برای failed events
- `fromBeginning: true` در restart (RPT-005)
- `applyRi*` methods همگی برای هر RI topic فراخوانی می‌شوند (RPT-006)

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی reporting-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۸/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۷/۱۰** |

**وضعیت کلی:** سرویس CQRS read model جامع با ۱۸ entity و ۲۳ Kafka topic از ۶ دامنه (policy, claim, payment, fraud, complaint, reinsurance). KPI Governance با validation برای ۳ governed gap KPI، KPI Snapshot ingestion با idempotency key، Ready KPIs و Executive Dashboard. `synchronize` به‌درستی در production غیرفعال است. اما عدم Dead Letter Queue، عدم error handling در Kafka consumer (JSON.parse بدون try/catch)، عدم AbacGuard/TenantGuard، actor از header قابل جعل، و عدم pagination cap در اکثر endpoints از نواقص اصلی هستند.

---

### ۱۳. aml-service

**پورت:** 18016  
**مسیر پایه:** `/` (endpoint‌ها در root)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** kafkajs, uuid

#### ۱۳.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۵ entity: AmlConsent, AmlRule, AmlAlert, AmlAlertDecision, ExternalDataSource
- ۲ migration
- AML Consent management:
  - Create, get, list, revoke
  - Status: `active`, `revoked`
  - ConsentType, validFrom, validTo, notes
- AML Rule management:
  - Create, get, list, update
  - Rule types: threshold, pattern, velocity, aggregate, behavioral
  - Severity: `low`, `medium`, `high`, `critical`
  - Status: `enabled`, `disabled`
  - Expression-based rule evaluation
  - Duplicate ruleName prevention
  - Search with ILIKE on ruleName, ruleType, expression
- AML Alert management:
  - Create, get, list, assign, update status
  - Status: `open`, `in_review`, `cleared`, `escalated`, `closed`
  - State machine with `isValidAlertTransition`
  - Alert Decision tracking (AmlAlertDecision) with snapshot
  - Search with ILIKE on title
  - Filter by status, severity, subjectNationalId, ruleId, assignedTo
- Transaction evaluation:
  - `evaluateTransaction` با enabled rules
  - Rule expression evaluation
  - Risk level determination: `low`, `medium`, `high`, `critical`
  - Risk score calculation: 25/50/75/100
  - Auto-alert creation for triggered rules
- Kafka consumer (TransactionConsumer):
  - ۵ topic: `payment.completed`, `policy.issued`, `claim.registered`, `claim.paid`, `collection.received`
  - Event-to-transaction mapping for 5 event types
  - Auto-evaluation on transaction events
  - SASL/SSL support
  - `fromBeginning: false`
  - try/catch in `handleTransactionMessage`
- Dashboard:
  - Totals by status, totals by severity
  - Open unassigned count
- Export:
  - Consents, rules, alerts snapshot
  - Configurable limits with clamp
- External Data Source:
  - CRUD operations
  - Sync with external endpoint (`fetch`)
  - Query external source
  - Status: `inactive`, `active`, `syncing`, `error`
  - Last sync tracking (lastSyncAt, lastSyncStatus, lastSyncError)
  - Total records synced counter
- Official AML Report generation:
  - SAR (Suspicious Activity Report)
  - CTR (Currency Transaction Report) — placeholder
  - Annual Summary Report
  - Organization info from env
- Pagination با `normalizePaging` (cap: 1-200 limit, 0-1000000 offset)
- `synchronize` به‌درستی در production غیرفعال است
- Correlation ID
- Audit logging
- `req.user` برای actor (نه header) در اکثر endpoints

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| AML-001 | بحرانی | `evaluateRuleExpression` از `new Function('ctx', ...)` استفاده می‌کند — **Code Injection** vulnerability. expression از DB خوانده می‌شود و اگر rule توسط malicious admin ایجاد شود، arbitrary code اجرا می‌کند |
| AML-002 | متوسط | عدم Dead Letter Queue — در صورت خطا در `handleTransactionMessage`، event از دست می‌رود (try/catch دارد اما فقط log می‌کند) |
| AML-003 | متوسط | عدم idempotency در Kafka consumer — `ConsumedEvent` استفاده نمی‌شود، در retry، همان transaction دوباره evaluate می‌شود |
| AML-004 | متوسط | عدم AbacGuard و TenantGuard — فقط JwtAuthGuard و PermissionsGuard |
| AML-005 | متوسط | عدم Kafka event production — AML alerts به Kafka publish نمی‌شوند (فقط log) |
| AML-006 | متوسط | CTR report placeholder — `currencyTransactions` خالی و `totalAmount: 0` |
| AML-007 | کم | `syncExternalDataSource` بدون timeout — در صورت عدم پاسخ، request hang می‌شود |
| AML-008 | کم | `queryExternalDataSource` بدون timeout |
| AML-009 | کم | `connectionConfig` شامل `apiKey` در JSONB ذخیره می‌شود — در صورت DB leak، قابل misuse |
| AML-010 | کم | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |
| AML-011 | کم | `KAFKA_BROKERS` به‌صورت single string parse می‌شود (`[process.env.KAFKA_BROKERS || 'localhost:9092']`) — اگر comma-separated باشد، به‌درستی parse نمی‌شود |
| AML-012 | کم | عدم Outbox pattern — events تولید نمی‌شوند اما اگر تولید شوند، Outbox استفاده نمی‌شود |

**درجه‌بندی منطق پیاده‌سازی:** **۶/۱۰** — AML lifecycle کامل با consent, rule, alert, transaction evaluation, external source, official report اما **Code Injection vulnerability** در rule evaluation، عدم idempotency، عدم event production، و CTR placeholder

#### ۱۳.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۵ entity
- ۲ migration
- `synchronize` به‌درستی در production غیرفعال است
- Pagination با cap (`normalizePaging`)
- Alert Decision با snapshot
- External Data Source با sync tracking

**اشکالات:**
- عدم idempotency در Kafka consumer (AML-003)
- عدم Dead Letter Queue (AML-002)
- `connectionConfig` با `apiKey` در JSONB (AML-009)
- عدم connection pool tuning
- فقط ۲ migration (نسبت به سایر سرویس‌ها کم)

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۱۳.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۱۶ مجوز تخصصی: `aml:consents:create/view/list/revoke`, `aml:rules:manage/view/list`, `aml:alerts:create/view/list/update_status/assign`, `aml:dashboard`, `aml:export`, `aml:manage`, `aml:view`
- RBAC با ۵ نقش (insurer_admin, head_office_ops, branch_manager, branch_staff, aml_officer)
- `req.user` برای actor (نه header) در اکثر endpoints
- Audit logging
- Alert state machine
- Alert Decision snapshot
- Correlation ID
- Kafka SASL/SSL support

**اشکالات:**
- **Code Injection** در `evaluateRuleExpression` (AML-001) — **بحرانی**
- عدم AbacGuard و TenantGuard (AML-004)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- `connectionConfig` با `apiKey` در JSONB (AML-009)
- عدم PII Masking — `subjectNationalId` بدون masking

**درجه‌بندی امنیتی:** **۳/۱۰** — Code Injection vulnerability در rule evaluation

#### ۱۳.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Kafka consumer برای ۵ topic (payment, policy, claim, collection)
- Auto-evaluation on transaction events
- Event-to-transaction mapping
- External Data Source integration با `fetch`
- Official AML Report generation (SAR, CTR, Annual)
- Integration با reporting-service (AML data در RmAml entity)
- Kafka SASL/SSL support
- Correlation ID

**اشکالات:**
- عدم Kafka event production — AML alerts به Kafka publish نمی‌شوند (AML-005)
- عدم idempotency در Kafka consumer (AML-003)
- عدم Dead Letter Queue (AML-002)
- عدم Outbox pattern (AML-012)
- `KAFKA_BROKERS` parse issue (AML-011)
- عدم timeout در external source sync/query (AML-007, AML-008)
- CTR report placeholder (AML-006)
- عدم health check عمیق (AML-010)
- Kafka consumer مستقیم با kafkajs (نه از طریق shared KafkaConsumer)

**درجه‌بندی ادغام:** **۵/۱۰**

#### جمع‌بندی aml-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۶/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۳/۱۰ |
| ادغام | ۵/۱۰ |
| **کل** | **۵/۱۰** |

**وضعیت کلی:** سرویس AML با consent management، rule-based transaction evaluation، alert lifecycle با state machine و decision tracking، external data source integration، و official report generation (SAR, CTR, Annual). Kafka consumer برای ۵ topic با auto-evaluation. اما **Code Injection vulnerability** در `evaluateRuleExpression` (استفاده از `new Function`) **بحرانی** است. همچنین عدم idempotency در Kafka consumer، عدم Kafka event production (فقط log)، عدم Dead Letter Queue، عدم Outbox pattern، و CTR report placeholder از نواقص اصلی هستند.

---

### ۱۴. reinsurance-service

**پورت:** 18017  
**مسیر پایه:** `/re`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (OutboxPublisher, OutboxWorker, KafkaProducer, ConsumedEvent, DeadLetterEvent, createLogger), uuid

#### ۱۴.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۸ entity: ReTreaty, ReCession, ReStatement, ReReconciliation, ReClaimRecovery, ReTicket, ReTicketMessage, ReTicketAttachment
- ۴ migration
- **Outbox pattern** با `OutboxPublisher` و `OutboxWorker` از `@insurance/shared`
- `ConsumedEvent` و `DeadLetterEvent` از `@insurance/shared`
- `KafkaProducer` با comma-separated broker parsing صحیح
- Treaty management: create, get, list, update, close
  - Status: `draft`, `active`, `closed`
  - Treaty types: quota_share, excess_of_loss, surplus
  - Duplicate treatyNumber prevention
- Cession management: create, get, list, update, approve
  - Status: `pending`, `approved`, `rejected`
  - Auto-cession calculation on policy issuance
  - `calculateCessionAmount` برای ۳ treaty type:
    - Quota Share: fixed cession percentage
    - Excess of Loss: cede amount above retention limit
    - Surplus: cede percentage of amount above retention
- Statement management: create, get, list, update
  - Statement types: bordereau, period_close
  - Status: `draft`, `issued`, `finalized`
  - Borderaux event publishing on status → `issued`
- Reconciliation management: create, get, list, update
  - External invoice registration
  - **Auto-match invoice** با confidence scoring:
    - Amount match (±5% tolerance): 40%
    - Reinsurer name match: 30%
    - Invoice date within period (±30 days buffer): 30%
    - Match threshold: ≥70%
- Claim Recovery management: create, get, list, update
  - Status: `open`, `partially_collected`, `collected`, `closed`
  - Recovery event publishing: `recovery_identified`, `recovery_received`
  - Follow-up tracking (`nextFollowUpAt`)
- Ticket management: create, get, list, assign, update
  - Ticket messages (internal/external)
  - Ticket attachments
  - SLA response hours configurable via `RE_TICKETS_SLA_RESPONSE_HOURS`
  - Status: `open`, `in_progress`, `resolved`, `closed`
- **Period close** با DB transaction:
  - Finds approved cessions for treaty
  - Creates period_close statement
  - Publishes `insurance.reinsurance.period_closed` event
- Export snapshot (treaties, cessions, statements, reconciliations, recoveries, tickets)
- Event publishing via Outbox:
  - `insurance.ri.ceded_calculated`
  - `insurance.ri.borderaux_generated`
  - `insurance.ri.recovery_identified`
  - `insurance.ri.recovery_received`
  - `insurance.reinsurance.period_closed`
- PolicyConsumer (polling-based, reads from ConsumedEvent table):
  - Processes `PolicyIssued` events
  - Auto-creates cessions for active treaties
  - Error handling with event marking
- Pagination با `normalizePaging` (cap: 1-200 limit, 0-1000000 offset)
- Correlation ID
- Audit logging
- `req.user` برای actor

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| RE-001 | متوسط | `synchronize: process.env.DB_SYNC === 'true'` — **عدم conditioning روی `NODE_ENV !== 'production'`** برخلاف سایر سرویس‌ها — در production اگر `DB_SYNC=true` باشد، schema sync فعال می‌شود |
| RE-002 | متوسط | `@ts-nocheck` در `policy.consumer.ts` — TypeScript type checking کاملاً غیرفعال است |
| RE-003 | متوسط | `isTreatyApplicable` همیشه `true` برمی‌گرداند — product filtering پیاده‌سازی نشده ("In a real implementation, this would check treaty.productCodes") |
| RE-004 | متوسط | `listTreaties` پارامتر `lineOfBusiness` دارد اما در query استفاده نمی‌شود — فیلتر خط کسب کار نمی‌کند |
| RE-005 | متوسط | `closePeriod` — totals فقط آخرین cession را منعکس می‌کند، نه مجموع تمام cessions را (loop روی cessions اما totals در هر iteration overwrite می‌شود) |
| RE-006 | متوسط | `closePeriod` — cessions واقعاً بسته نمی‌شوند (فقط count می‌شوند) — status cessions تغییر نمی‌کند |
| RE-007 | کم | `calculateCessionAmount` — `const` در switch cases بدون block scope —潜在 variable redeclaration issues |
| RE-008 | کم | PolicyConsumer از polling (`setInterval` 5s) استفاده می‌کند به جای Kafka consumer مستقیم — latency تا ۵ ثانیه |
| RE-009 | کم | PolicyConsumer events را حتی در صورت خطا به‌عنوان `processed=true` علامت‌گذاری می‌کند — event از دست می‌رود |
| RE-010 | کم | عدم AbacGuard و TenantGuard |
| RE-011 | کم | عدم health check عمیق |
| RE-012 | کم | `publishCededCalculated` — `calculationBasis` همیشه `'policy'` است حتی اگر `policyId` وجود نداشته باشد |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Reinsurance lifecycle کامل با treaty, cession, statement, reconciliation, recovery, ticket، auto-match invoice، period close با transaction، و Outbox pattern اما `synchronize` بدون production guard، `@ts-nocheck`، `isTreatyApplicable` همیشه true، و bugs در `closePeriod`

#### ۱۴.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۸ entity
- ۴ migration
- **Outbox pattern** با `OutboxPublisher` و `OutboxWorker`
- `ConsumedEvent` و `DeadLetterEvent`
- `closePeriod` با DB transaction
- Pagination با cap
- Auto-match invoice با confidence scoring
- External invoice registration

**اشکالات:**
- `synchronize` بدون production guard (RE-001)
- `closePeriod` totals bug (RE-005)
- `closePeriod` cessions بسته نمی‌شوند (RE-006)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۱۴.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۳۱ مجوز تخصصی: treaties (create/view/list/update/close), cessions (create/view/list/update/approve), statements (create/view/list/update), reconciliations (create/view/list/update), recoveries (create/view/list/update), tickets (create/view/list/update/assign/add_message/add_attachment), periods:close, export
- RBAC با ۳ نقش (insurer_admin, head_office_ops, re_ops)
- `req.user` برای actor
- Audit logging
- Correlation ID
- Kafka SASL/SSL support (via KafkaProducer)

**اشکالات:**
- عدم AbacGuard و TenantGuard (RE-010)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- عدم PII Masking

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۱۴.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Outbox pattern** با `OutboxPublisher` و `OutboxWorker` — transactional event publishing
- ۵ Kafka event: `ri.ceded_calculated`, `ri.borderaux_generated`, `ri.recovery_identified`, `ri.recovery_received`, `reinsurance.period_closed`
- `KafkaProducer` با comma-separated broker parsing
- PolicyConsumer برای auto-cession on policy issuance
- Integration با reporting-service (RmRiCeded, RmRiBorderaux, RmRiRecovery read models)
- `ConsumedEvent` و `DeadLetterEvent` از shared package
- Correlation ID
- `createLogger` از shared package

**اشکالات:**
- PolicyConsumer polling-based به جای Kafka consumer (RE-008)
- PolicyConsumer events در خطا از دست می‌روند (RE-009)
- `isTreatyApplicable` همیشه true — product filtering کار نمی‌کند (RE-003)
- `listTreaties` lineOfBusiness filter کار نمی‌کند (RE-004)
- عدم health check عمیق (RE-011)

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی reinsurance-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۷/۱۰** |

**وضعیت کلی:** سرویس اتکایی با lifecycle کامل شامل treaty management (quota_share, excess_of_loss, surplus)، cession auto-calculation، statement/bordereaux، reconciliation با auto-match invoice (confidence scoring)، claim recovery، ticket management با SLA، و period close با DB transaction. **Outbox pattern** با `OutboxPublisher` و `OutboxWorker` از shared package استفاده می‌شود. ۵ Kafka event تولید می‌شود. اما `synchronize` بدون production guard (برخلاف سایر سرویس‌ها)، `@ts-nocheck` در policy.consumer.ts، `isTreatyApplicable` همیشه true، `listTreaties` lineOfBusiness filter کار نمی‌کند، و bugs در `closePeriod` (totals و cession status) از نواقص اصلی هستند.

---

### ۱۵. product-service

**پورت:** 18018  
**مسیر پایه:** `/product`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** uuid

#### ۱۵.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۵ entity: Product, ProductVersion, Coverage, Deductible, PricingRule
- ۲ migration
- Product management: create, get, list, update, archive
  - Status: `draft`, `active`, `archived`
  - Duplicate code prevention
  - Line of business filter
  - Search with ILIKE on code, nameFa, nameEn
  - **Version snapshot** on every update (ProductVersion entity)
  - Version history endpoints (list versions, get specific version)
- Coverage management: create, get, list, update, archive
  - Status: `draft`, `active`, `archived`
  - Duplicate code prevention per product
  - Search with ILIKE on code, nameFa
  - Terms as JSONB
- Deductible management: create, get, list, update, archive
  - Kind: `fixed_amount`, `percent`
  - Duplicate code prevention per product
  - Search with ILIKE on code, nameFa
  - Filter by kind
- Pricing Rule management: create, get, list, update, archive
  - Status: `draft`, `active`, `archived`
  - Rule types: `base`, `conditional`, `tiered`, `regional`, `discount`, `surcharge`
  - Duplicate code prevention per product
  - Search with ILIKE on code, nameFa
  - Priority-based ordering
  - ValidFrom/ValidTo date range
  - Regions array for regional rules
  - Conditions JSONB for conditional rules
- **Quote engine** (`computeQuote`):
  - V1 rule parsing with `parseRuleV1`
  - Base premium accumulation
  - Adjustment matching with `matchWhen` (eq, in, gte, lte operators)
  - Adjustment types: `add`, `multiplier`
  - Total premium calculation
- **Advanced pricing rule evaluation** (`evaluatePricingRules`):
  - 6 rule types: base, conditional, tiered, regional, discount, surcharge
  - Condition evaluation (eq, ne, gt, lt, gte, lte, in, not_in)
  - Tiered rules with min/max ranges
  - Regional rules with region matching
  - Discount rules (negative percent)
  - Surcharge rules (positive percent)
  - Adjustment types: add, multiplier, percent
  - Effective date filtering
- Export snapshot (products, coverages, deductibles, pricing rules)
- Pagination با `normalizePaging` (cap: 1-200 limit, 0-1000000 offset)
- Correlation ID
- Audit logging
- `req.user` برای actor
- Input validation (required fields, non-empty strings, kind validation)

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| PRD-001 | متوسط | `synchronize: process.env.DB_SYNC === 'true'` — **عدم conditioning روی `NODE_ENV !== 'production'`** — در production اگر `DB_SYNC=true` باشد، schema sync فعال می‌شود |
| PRD-002 | متوسط | عدم Outbox pattern و Kafka event production — تغییرات محصول (create, update, archive) به Kafka publish نمی‌شوند |
| PRD-003 | متوسط | `exportSnapshot` بدون limit — تمام records بارگذاری می‌شوند (برخلاف سایر سرویس‌ها که cap دارند) |
| PRD-004 | کم | `computeQuote` — basePremium از تمام active rules جمع می‌شود، اما `evaluatePricingRules` فقط آخر base rule را در نظر می‌گیرد (overwrite) — دو quote engine متفاوت با منطق ناسازگار |
| PRD-005 | کم | `listProductVersions` — pagination از `normalizePaging` استفاده نمی‌کند، مستقیم parseInt می‌کند |
| PRD-006 | کم | عدم AbacGuard و TenantGuard |
| PRD-007 | کم | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |
| PRD-008 | کم | عدم Kafka consumer — product-service هیچ event مصرف نمی‌کند |
| PRD-009 | کم | `evaluatePricingRules` — `rule.ruleType` استفاده می‌شود اما در `createPricingRule` تنظین نمی‌شود (فقط `rule` JSONB ذخیره می‌شود) |
| PRD-DEC | متوسط | **عدم ادغام event-driven و عدم مالکیت catalog** — product-service هیچ Kafka event تولید یا مصرف نمی‌کند (PRD-002, PRD-008) — عدم استفاده از @insurance/shared (OutboxPublisher, KafkaProducer, createLogger) — تغییرات محصول (create, update, archive, pricing) به سایر سرویس‌ها (policy, claims, underwriting) منتقل نمی‌شود — سرویس به‌عنوان catalog source of truth باید event-driven می‌بود — عدم integration با shared infrastructure |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Product lifecycle کامل با versioning، coverage, deductible، pricing rules با ۶ rule type، quote engine، و advanced pricing evaluation اما عدم event production، دو quote engine ناسازگار، و `synchronize` بدون production guard

#### ۱۵.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۵ entity
- ۲ migration
- Pagination با cap (`normalizePaging`)
- Product versioning با snapshot
- JSONB برای terms, rule, conditions, metadata
- Duplicate prevention (code per product, code per product for coverage/deductible/pricing rule)

**اشکالات:**
- `synchronize` بدون production guard (PRD-001)
- `exportSnapshot` بدون limit (PRD-003)
- عدم connection pool tuning
- فقط ۲ migration

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۱۵.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۲۲ مجوز تخصصی: products (create/view/list/update/archive), coverages (create/view/list/update/archive), deductibles (create/view/list/update/archive), pricing_rules (create/view/list/update/archive), quote, export
- RBAC با ۴ نقش (insurer_admin, head_office_ops, uw_ops, product_ops)
- `req.user` برای actor
- Audit logging
- Correlation ID
- Input validation

**اشکالات:**
- عدم AbacGuard و TenantGuard (PRD-006)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- عدم PII Masking

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۱۵.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Product catalog برای policy-service و underwriting-service
- Pricing rules برای quote calculation
- Coverage و deductible definitions برای claims-service
- Correlation ID
- Audit logging

**اشکالات:**
- عدم Outbox pattern و Kafka event production (PRD-002) — تغییرات محصول به سایر سرویس‌ها منتقل نمی‌شود
- عدم Kafka consumer (PRD-008) — product-service هیچ event مصرف نمی‌کند
- عدم health check عمیق (PRD-007)
- عدم integration با shared package (OutboxPublisher, KafkaProducer, createLogger)

**درجه‌بندی ادغام:** **۴/۱۰**

#### جمع‌بندی product-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۴/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس مدیریت محصول با lifecycle کامل شامل product (با version snapshot)، coverage، deductible (fixed_amount/percent)، و pricing rules (۶ rule type: base, conditional, tiered, regional, discount, surcharge). دو quote engine: `computeQuote` (V1) و `evaluatePricingRules` (advanced) با منطق ناسازگار. اما عدم Outbox pattern و Kafka event production (تغییرات محصول به سایر سرویس‌ها منتقل نمی‌شود)، عدم Kafka consumer، `synchronize` بدون production guard، `exportSnapshot` بدون limit، و `ruleType` در create تنظین نمی‌شود از نواقص اصلی هستند.

---

### ۱۶. monitoring-service

**پورت:** 18020  
**مسیر پایه:** `/` (metrics, slos, alerts, dashboard, otel)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: monitoring)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (KafkaConsumer, DeadLetterQueueService, consumeOnce, createLogger), prom-client, node-cron, @opentelemetry/*, axios

#### ۱۶.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۳ entity: Metric, SLO, Alert
- ۳ migration
- **Prometheus metrics** با `prom-client`:
  - Default metrics collection
  - Dynamic metric registration (counter, gauge, histogram)
  - `/metrics` endpoint با Prometheus content type
  - Metric persistence در DB
- **SLO management**:
  - Create, list SLOs
  - SLO evaluation با cron (هر ۵ دقیقه)
  - SLO status: `healthy`, `at_risk`, `breached`
  - Threshold logic: <95% target → breached, <98% → at_risk
  - Auto-alert creation on SLO breach
  - SLO types: availability, latency, error_rate
- **Alert management**:
  - List alerts (filter by status, severity, serviceName)
  - Acknowledge alerts
  - Alert status: `firing`, `acknowledged`, `resolved`
  - Alert severity: `critical`, `warning`, `info`
  - Deduplication (existing firing alert check)
  - Complaint SLA breach → alert mapping با `mapComplaintSlaBreachToSeverity`:
    - ≥24h → critical
    - ≥4h → warning
    - <4h → info
- **Dashboard**:
  - SLO stats (healthy, at_risk, breached, total)
  - Alert stats (firing, acknowledged, resolved × critical, warning, info)
  - 24-hour window
- **Kafka consumer** با shared package:
  - `KafkaConsumer` از `@insurance/shared`
  - **Dead Letter Queue** با `DeadLetterQueueService`
  - **Idempotency** با `consumeOnce` و `ConsumedEvent`
  - Topic: `insurance.complaint.sla_breached`
  - SASL/SSL support
  - `fromBeginning: false`
  - Dual consumer: main.ts bootstrap + ComplaintSlaConsumer (OnModuleInit)
- **OpenTelemetry** (OtelService):
  - Jaeger exporter (configurable)
  - Prometheus exporter (configurable)
  - Instrumentations: HTTP, Express, NestJS, PostgreSQL, Kafka
  - Span, metric, event, exception recording
  - OtelController: health, span, metric, attributes, event, exception endpoints
- **Jaeger client** (JaegerClientService):
  - Trace query and retrieval via Jaeger API
  - Service and operation discovery
  - Dependency graph
  - Axios with timeout
- **Alerting service** (AlertingService):
  - ۴ channel: email, pager, slack, webhook
  - ۸ predefined alert rules (high-error-rate, service-down, high-latency, db-pool-exhausted, kafka-lag, memory-high, disk-low, fraud-spike)
  - Cooldown management
  - Alert lifecycle (pending → sent/failed)
- `synchronize` به‌درستی در production غیرفعال است (`NODE_ENV !== 'production' && DB_SYNC === 'true'`)
- Schema isolation (`monitoring`)
- Correlation ID
- `createLogger` از shared package

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| MON-001 | بحرانی | **Dual Kafka consumer** — هم در `main.ts` و هم در `ComplaintSlaConsumer` (OnModuleInit) Kafka consumer برای همان topic `insurance.complaint.sla_breached` با همان groupId شروع می‌شود — race condition و duplicate processing |
| MON-002 | متوسط | `calculateAvailability`, `calculateLatency`, `calculateErrorRate` — **placeholder با `Math.random()`** — مقادیر واقعی محاسبه نمی‌شوند |
| MON-003 | متوسط | `AlertingService` — alerts در **in-memory array** (`this.alerts = []`) ذخیره می‌شوند — در restart از دست می‌روند و در multi-instance کار نمی‌کنند |
| MON-004 | متوسط | `AlertingService.evaluateCondition` — simplified string-based evaluation با regex replace — **ناتوان در ارزیابی شرایط پیچیده** (مثل `db_pool_active >= db_pool_max * 0.9`) |
| MON-005 | متوسط | `AlertingService` — `sendEmail`, `sendPager`, `sendSlack`, `sendWebhook` — همگی **placeholder** (فقط log می‌کنند، واقعاً ارسال نمی‌کنند) |
| MON-006 | متوسط | `OtelController` — endpoints بدون **JwtAuthGuard و PermissionsGuard** — بدون authentication قابل دسترسی هستند |
| MON-007 | متوسط | `OtelService` — `ExpressInstrumentation` استفاده می‌شود اما سرویس از **Fastify** استفاده می‌کند — instrumentation نادرست |
| MON-008 | کم | `listAlerts` و `listSLOs` — عدم pagination (برخلاف سایر سرویس‌ها) |
| MON-009 | کم | `AlertingService` — در `app.module.ts` ثبت نشده است (عدم integration با NestJS DI) |
| MON-010 | کم | `OtelService` و `JaegerClientService` — در `app.module.ts` ثبت نشده‌اند (عدم integration با NestJS DI) |
| MON-011 | کم | عدم AbacGuard و TenantGuard |
| MON-012 | کم | `recordMetric` — metric name با `serviceName_metricName` ترکیب می‌شود اما کاراکترهای نامعتبر (مثل `-`) برای Prometheus metric name ممکن است مشکل ایجاد کنند |

**درجه‌بندی منطق پیاده‌سازی:** **۶/۱۰** — Prometheus metrics، SLO evaluation با cron، alert management، complaint SLA breach consumer با DLQ و idempotency، OpenTelemetry، Jaeger client، و alerting channels اما **dual Kafka consumer**، **placeholder SLO calculations با Math.random()**، **in-memory alerting**، **placeholder notification channels**، و **unauthenticated OTEL endpoints**

#### ۱۶.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۳ entity
- ۳ migration
- `synchronize` به‌درستی در production غیرفعال است
- Schema isolation (`monitoring`)
- Metric persistence
- `ConsumedEvent` برای idempotency

**اشکالات:**
- `AlertingService` در-memory است (MON-003)
- عدم pagination در list endpoints (MON-008)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۱۶.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در endpoints اصلی (metrics, slos, alerts, dashboard)
- ۶ مجوز تخصصی: metrics:view, slos:list/create, alerts:list/ack, dashboard:view
- RBAC با ۵ نقش (insurer_admin, head_office_ops, auditor, compliance_aml, risk_manager)
- Correlation ID
- Kafka SASL/SSL support

**اشکالات:**
- **OtelController بدون authentication** (MON-006) — span, metric, event, exception endpoints باز هستند
- عدم AbacGuard و TenantGuard (MON-011)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- `/metrics` endpoint با JWT محافظت شده اما در Prometheus scrape معمولاً بدون JWT است — در عمل scrape کار نخواهد کرد

**درجه‌بندی امنیتی:** **۴/۱۰**

#### ۱۶.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Kafka consumer** با shared package (`KafkaConsumer`, `DeadLetterQueueService`, `consumeOnce`)
- **Idempotency** با `ConsumedEvent`
- **Dead Letter Queue** با retry processor
- Topic: `insurance.complaint.sla_breached`
- Prometheus metrics endpoint
- OpenTelemetry instrumentation (HTTP, NestJS, PG, Kafka)
- Jaeger integration
- `createLogger` از shared package
- Complaint SLA breach → alert creation
- Correlation ID

**اشکالات:**
- **Dual Kafka consumer** (MON-001) — race condition
- `ExpressInstrumentation` به جای `FastifyInstrumentation` (MON-007)
- `AlertingService`, `OtelService`, `JaegerClientService` در module ثبت نشده‌اند (MON-009, MON-010)
- Placeholder notification channels (MON-005)
- Placeholder SLO calculations (MON-002)
- عدم Kafka event production — monitoring alerts به Kafka publish نمی‌شوند

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی monitoring-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۶/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۴/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس مانیتورینگ با Prometheus metrics، SLO evaluation با cron (هر ۵ دقیقه)، alert management با acknowledge، complaint SLA breach consumer با DLQ و idempotency از shared package، OpenTelemetry instrumentation (Jaeger + Prometheus)، Jaeger client برای trace query، و alerting service با ۴ channel و ۸ predefined rule. اما **dual Kafka consumer** (race condition)، **placeholder SLO calculations با Math.random()**، **in-memory alerting**، **placeholder notification channels**، **unauthenticated OTEL endpoints**، و **ExpressInstrumentation به جای FastifyInstrumentation** از نواقص اصلی هستند. همچنین `AlertingService`، `OtelService`، و `JaegerClientService` در module ثبت نشده‌اند.

---

### ۱۷. document-ai-service

**پورت:** 18021  
**مسیر پایه:** `/document-ai`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: document_ai)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (ConsumedEvent, OutboxEvent, OutboxPublisher, createLogger, markConsumed), kafkajs, Gemini (Google AI), DeepSeek (AI), OCR, undici (ProxyAgent)

#### ۱۷.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۷ entity: DocumentEntity, DocumentAiAudit, DocumentAiJob, DocumentAiUsageDaily, DocumentAiEvalCase, DocumentAiEvalRun, DocumentAiEvalResult
- ۶ migration
- `synchronize` به‌درستی در production غیرفعال است (`NODE_ENV !== 'production' && DB_SYNC === 'true'`)
- Schema isolation (`document_ai`)
- **Global exception filter** با correlation ID propagation و structured error responses
- **HTTPS/HTTP proxy support** با `undici` ProxyAgent
- **Correlation ID hook** در Fastify (onRequest)
- **Kafka consumer** (DocumentAiConsumer):
  - ۳ topic: `insurance.document.uploaded`, `insurance.document.linked`, `insurance.claim.documents_attached`
  - `markConsumed` از shared package برای idempotency
  - `ConsumedEvent` entity
  - `fromBeginning: true`
  - Document ID extraction از envelope (subject.documentId, payload.documentId, payload.documents[])
  - **Job deduplication** با `dedupeKey` (topic:eventId:documentId)
  - Job creation با `maxAttempts` configurable
- **Document AI Processor**:
  - **Multi-provider extraction with fallback**:
    - OCR (configurable provider)
    - Gemini (Google AI) — image extraction
    - DeepSeek — text analysis (skip for images)
  - **Multi-provider analysis with fallback**:
    - DeepSeek — `insurance_document` task, `fa` language
    - Gemini — `analyzeDocument` with `insurance` type
  - **Confidence scoring**: base 0.65 + 0.15 (extraction) + 0.15 (analysis) = max 0.95
  - **Confidence threshold** configurable (`DOCUMENT_AI_CONFIDENCE_THRESHOLD`, default 0.8)
  - **Decision logic**: `extracted` → `needs_review` (if confidence < threshold or validation failed) → `failed`
  - **Business validation**:
    - Invoice: totalAmount required, invoiceNumber ≥ 3 chars
    - National ID: 10-digit Iranian national ID validation
    - Driving license: licenseNumber ≥ 5 chars
    - Generic: confidence field check
  - **Tenant daily budget limits**:
    - Job limit (`DOCUMENT_AI_TENANT_DAILY_JOB_LIMIT`, default 200)
    - AI request limit (`DOCUMENT_AI_TENANT_DAILY_REQUEST_LIMIT`, default 500)
    - `assertWithinBudget` before processing
    - `upsertUsage` with ON CONFLICT DO UPDATE
  - **Work item routing** to orchestrator-service on `needs_review`/`failed`
  - **Outbox event publishing**:
    - `insurance.document.extracted` (success)
    - `insurance.document.extraction.needs_review` (needs review)
  - **Audit trail**: DocumentAiAudit with input/output, confidence, decision, reason, provider, error
  - **Document status update**: `extracting` → `extracted`/`failed`
- **Job worker** (DocumentAiJobWorker):
  - Polling-based job processor
  - Lock mechanism (`lockedAt`, `lockedBy`)
  - Retry with `maxAttempts`
  - DLQ reason tracking
  - `nextRunAt` scheduling
- **Eval framework** (DocumentAiEvalWorker):
  - Eval case management (create, update, list with tag filter)
  - Eval run management (queued → running → completed/failed)
  - Eval result persistence
  - `extractForEval` method for evaluation without side effects
- **Usage tracking** (DocumentAiUsageDaily):
  - Daily aggregation per tenant
  - Jobs started/completed/failed
  - AI requests count
  - Approx input/output chars
- Job management: list, get, retry
- Audit listing with filters
- Pagination با cap (limit max 200)
- Correlation ID
- Audit logging
- `req.user` برای actor

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| DAI-001 | متوسط | `DocumentAiConsumer` — مستقیم `kafkajs` استفاده می‌کند به جای `KafkaConsumer` از `@insurance/shared` — عدم Dead Letter Queue، عدم SASL/SSL support |
| DAI-002 | متوسط | `tryFetchBytes` — فقط HTTP/HTTPS URLs پشتیبانی می‌کند — فایل‌های ذخیره شده در filesystem یا S3 قابل بازیابی نیستند (returns null) |
| DAI-003 | متوسط | `validateExtractedFields` — cross-check با claims-service/policy-service پیاده‌سازی نشده ("In production, call claims-service or policy-service for ground truth") |
| DAI-004 | متوسط | `routeToWorkItem` — `fetch` بدون authentication token — orchestrator-service اگر JwtAuthGuard داشته باشد، request رد می‌شود |
| DAI-005 | کم | `computeConfidence` — heuristic ساده (0.65 + 0.15 + 0.15) — confidence واقعی از AI provider دریافت نمی‌شود |
| DAI-006 | کم | `OutboxPublisher` در constructor با `this.dataSource` ایجاد می‌شود اما در `processDocument` از `this.dataSource` مستقیم استفاده می‌کند — عدم transactional consistency بین document update و outbox publish |
| DAI-007 | کم | `extractWithFallback` — `useOcr` parameter همیشه `false` ارسال می‌شود (در `processDocument` و `extractForEval`) — OCR هرگز استفاده نمی‌شود |
| DAI-008 | کم | عدم AbacGuard و TenantGuard — tenantId از query parameter قابل تنظیم است (cross-tenant access) |
| DAI-009 | کم | `KAFKA_BROKERS` پیش‌فرض `localhost:9092` — در صورت عدم تنظیم env، به localhost متصل می‌شود |
| DAI-010 | کم | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Multi-provider AI extraction/analysis با fallback (Gemini, DeepSeek, OCR)، confidence scoring با threshold، business validation (invoice, national ID, driving license)، tenant daily budget limits، job worker با retry و DLQ، eval framework، Outbox event publishing، و audit trail اما عدم DLQ در Kafka consumer، `tryFetchBytes` فقط HTTP، cross-check پیاده‌سازی نشده، و routeToWorkItem بدون auth

#### ۱۷.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۷ entity
- ۶ migration
- `synchronize` به‌درستی در production غیرفعال است
- Schema isolation (`document_ai`)
- `ConsumedEvent` و `OutboxEvent` از shared package
- `upsertUsage` با ON CONFLICT DO UPDATE
- Job deduplication با `dedupeKey`
- Pagination با cap

**اشکالات:**
- `tryFetchBytes` فقط HTTP/HTTPS (DAI-002)
- عدم transactional consistency بین document update و outbox publish (DAI-006)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۱۷.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۱۱ مجوز تخصصی: jobs (list/view/retry/dlq), audit (list), usage (view), eval (cases:list/manage, runs:list/start/view)
- RBAC با ۵ نقش (insurer_admin, head_office_ops, claims_handler, auditor, compliance_aml)
- `req.user` برای actor
- Audit logging
- Correlation ID
- Global exception filter
- HTTPS/HTTP proxy support

**اشکالات:**
- عدم AbacGuard و TenantGuard (DAI-008) — tenantId از query parameter
- `routeToWorkItem` بدون auth token (DAI-004)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers
- API keys (Gemini, DeepSeek) باید از env vars مدیریت شوند

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۱۷.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Kafka consumer** با `markConsumed` برای idempotency
- ۳ topic: `insurance.document.uploaded`, `insurance.document.linked`, `insurance.claim.documents_attached`
- **Outbox pattern** با `OutboxPublisher` از shared package
- ۲ Kafka event: `insurance.document.extracted`, `insurance.document.extraction.needs_review`
- **Orchestrator integration** — routeToWorkItem برای needs_review documents
- `ConsumedEvent` و `OutboxEvent` از shared package
- `createLogger` از shared package
- Correlation ID
- Gemini (Google AI) و DeepSeek integration
- OCR service integration
- Document preprocessing service

**اشکالات:**
- مستقیم `kafkajs` به جای `KafkaConsumer` از shared package (DAI-001) — عدم DLQ
- `routeToWorkItem` بدون auth (DAI-004)
- cross-check با claims-service/policy-service پیاده‌سازی نشده (DAI-003)
- OCR هرگز استفاده نمی‌شود (DAI-007)
- عدم health check عمیق (DAI-010)

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی document-ai-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۷/۱۰** |

**وضعیت کلی:** سرویس AI پردازش اسناد با multi-provider extraction/analysis با fallback (Gemini, DeepSeek, OCR)، confidence scoring با configurable threshold، business validation (invoice, national ID, driving license)، tenant daily budget limits (job + AI request)، job worker با retry/DLQ، eval framework (cases + runs + results)، Outbox event publishing (extracted + needs_review)، orchestrator integration برای review routing، و audit trail. اما مستقیم `kafkajs` به جای shared `KafkaConsumer` (عدم DLQ)، `tryFetchBytes` فقط HTTP/HTTPS، cross-check با claims/policy پیاده‌سازی نشده، `routeToWorkItem` بدون auth token، و OCR هرگز استفاده نمی‌شود از نواقص اصلی هستند.

---

### ۱۸. sales-network-service

**پورت:** 18022  
**مسیر پایه:** `/sales-network`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: sales)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (ConsumedEvent, createLogger, EventEnvelope), kafkajs, uuid, @nestjs/axios

#### ۱۸.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۵ entity: SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution
- ۳ migration
- `synchronize` به‌درستی در production غیرفعال است (`NODE_ENV !== 'production' && DB_SYNC === 'true'`)
- Schema isolation (`sales`)
- **Sales Partner management**:
  - Upsert (create or update) با orgUnitId
  - Kind: agency, broker, individual_agent, bancassurance
  - Status: pending, verified, suspended, terminated
  - Verify partner (pending → verified)
  - Set partner status
  - **Org unit-based access control** — non-admin users فقط own orgUnitId را می‌بینند
- **Commission Contract management**:
  - Create contract (draft status)
  - Activate contract (draft → active)
  - Base: `premium_gross` | `premium_net`
  - Rate in basis points (rateBps) + fixed fee
  - Effective date range (effectiveFrom / effectiveTo)
  - Line of business filter
  - Rules as JSONB
  - Currency (default IRR)
- **Commission Ledger**:
  - Auto-creation on PolicyIssued event (status: `accrued`)
  - Commission calculation: `(premium × rateBps / 10000) + fixedFee`
  - Void ledger entry (cannot void `paid`)
  - Mark paid (cannot pay `voided`)
  - Recalculate commission for policy
  - Manual calculate commission endpoint
- **Policy Attribution**:
  - Auto-creation on PolicyIssued event
  - Links policyId → orgUnitId
  - Agent policy listing
- **KPI Daily aggregation**:
  - Auto-upsert on PolicyIssued/Renewed/Cancelled/ComplaintCreated events
  - Metrics: policiesIssuedCount, policiesRenewedCount, policiesCancelledCount, complaintsCreatedCount, premiumIssuedAmount, commissionAccruedAmount
  - Day key (UTC date)
- **Kafka consumer** با ۴ topic:
  - `insurance.policy.issued` → applyPolicyIssued (commission + attribution + KPI)
  - `insurance.policy.renewed` → applyPolicyRenewed (KPI)
  - `insurance.policy.cancelled` → applyPolicyCancelled (KPI)
  - `insurance.complaint.created` → applyComplaintCreated (KPI)
  - `fromBeginning: true`
  - Idempotency با `ConsumedEvent` و `ensureIdempotent`
- **Agent Summary**: partner info, totalPolicies, totalPremium, pendingCommission, paidCommission, activeContract, latestKpi
- **Performance Trend Reporting**:
  - ۶ metric: policiesIssued, policiesRenewed, policiesCancelled, complaintsCreated, premiumIssued, commissionAccrued
  - ۳ granularity: daily, weekly, monthly
  - Period-over-period comparison با changePercent
  - Trend detection (up/down/stable)
  - Total and average calculation
- **HTTP retry logic** با `fetchWithRetry` (3 retries, exponential delay, 5xx + 429 retryable)
- Pagination با cap (limit max 200, offset min 0)
- Correlation ID
- Audit logging
- `req.user` برای actor
- `createLogger` از shared package
- Controller spec test file present (`sales-network.controller.spec.ts`)

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| SNW-001 | متوسط | `@ts-nocheck` در ابتدای `sales-network.service.ts` و `sales-network.controller.ts` — عدم type safety کامل |
| SNW-002 | متوسط | مستقیم `kafkajs` استفاده می‌شود به جای `KafkaConsumer` از `@insurance/shared` — عدم Dead Letter Queue، عدم SASL/SSL support |
| SNW-003 | متوسط | عدم Outbox pattern — تغییرات (partner upsert, contract create/activate, ledger void/pay) به Kafka publish نمی‌شوند |
| SNW-004 | متوسط | `ensureIdempotent` — رقابت (race condition) ممکن است بین `findOne` و `save` — عدم unique constraint یا transaction |
| SNW-005 | متوسط | `getAgentSummary` — تمام attributions و ledgerEntries را با `find()` بارگذاری می‌کند (بدون limit) — برای agents با تعداد زیاد policy مشکل performance |
| SNW-006 | کم | `applyPolicyIssued` — attribution upsert بدون duplicate check (اگر همان PolicyIssued دوبار پردازش شود با eventId متفاوت، attribution duplicate ایجاد می‌شود) |
| SNW-007 | کم | عدم AbacGuard و TenantGuard — orgUnitId از query parameter قابل تنظیم است |
| SNW-008 | کم | `KAFKA_BROKERS` پیش‌فرض `localhost:9092` |
| SNW-009 | کم | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |
| SNW-010 | کم | `HttpService` از `@nestjs/axios` در constructor تزریق شده اما در app.module.ts `HttpModule` import نشده است — ممکن است در runtime خطا دهد |
| SNW-011 | کم | `getPerformanceTrend` — عدم access control بر اساس actorOrgUnitId (برخلاف سایر endpoints) |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Sales partner management با org unit-based access control، commission contract با rate/fixed fee، commission ledger با auto-calculation از PolicyIssued، KPI daily aggregation از ۴ event type، performance trend reporting با ۶ metric و ۳ granularity، HTTP retry، و idempotency اما `@ts-nocheck`، عدم DLQ، عدم Outbox، race condition در idempotency، و performance issue در getAgentSummary

#### ۱۸.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۵ entity
- ۳ migration
- `synchronize` به‌درستی در production غیرفعال است
- Schema isolation (`sales`)
- `ConsumedEvent` از shared package
- Pagination با cap
- KPI daily upsert pattern
- Commission calculation با basis points

**اشکالات:**
- `@ts-nocheck` (SNW-001)
- `getAgentSummary` بدون limit (SNW-005)
- عدم unique constraint برای idempotency (SNW-004)
- عدم connection pool tuning
- `HttpModule` import نشده (SNW-010)

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۱۸.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۹ مجوز تخصصی: partners (manage/view), contracts (manage/view), ledger (view/manage), kpi (view), agent (view), ingest
- RBAC با ۷ نقش (insurer_admin, head_office_ops, agency_owner, agency_staff, broker_owner, broker_staff, auditor)
- **Org unit-based access control** — non-admin users فقط own data را می‌بینند
- `req.user` برای actor
- Audit logging
- Correlation ID
- Input validation

**اشکالات:**
- عدم AbacGuard و TenantGuard (SNW-007)
- `getPerformanceTrend` بدون org unit access control (SNW-011)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers

**درجه‌بندی امنیتی:** **۶/۱۰**

#### ۱۸.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Kafka consumer** با ۴ topic (policy.issued, policy.renewed, policy.cancelled, complaint.created)
- Idempotency با `ConsumedEvent`
- `createLogger` از shared package
- `ConsumedEvent` از shared package
- Correlation ID
- Commission auto-calculation از PolicyIssued events
- KPI aggregation از policy lifecycle + complaint events
- HTTP retry logic برای external calls

**اشکالات:**
- مستقیم `kafkajs` به جای shared `KafkaConsumer` (SNW-002) — عدم DLQ
- عدم Outbox pattern (SNW-003) — تغییرات به Kafka publish نمی‌شوند
- `HttpModule` import نشده (SNW-010)
- عدم health check عمیق (SNW-009)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی sales-network-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۶/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس مدیریت شبکه فروش با sales partner management (agency/broker/agent/bancassurance) با org unit-based access control، commission contract management (rate bps + fixed fee، effective date range)، commission ledger با auto-calculation از PolicyIssued events، KPI daily aggregation از ۴ event type (issued/renewed/cancelled/complaint)، performance trend reporting با ۶ metric و ۳ granularity، و HTTP retry logic. اما `@ts-nocheck`، مستقیم `kafkajs` (عدم DLQ)، عدم Outbox pattern، race condition در idempotency، performance issue در getAgentSummary، و `HttpModule` import نشده از نواقص اصلی هستند.

---

### ۱۹. regulatory-gateway-service

**پورت:** 18024  
**مسیر پایه:** `/reg` (sanhab, warehouse-fire)  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: regulatory)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (KafkaProducer, createEventEnvelope, createLogger, Logger), uuid

#### ۱۹.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۲ entity: SanhabEvent, RegulatoryFailureLog
- ۲ migration
- `synchronize` به‌درستی در production غیرفعال است (`NODE_ENV !== 'production' && DB_SYNC === 'true'`)
- Schema isolation (`regulatory`)
- **Sanhab integration** با dual client:
  - `MockSanhabClient` (default, development mode)
  - `RealSanhabClient` (when `SANHAB_USE_REAL=true`)
  - Interface-based (`ISanhabClient`)
  - ۳ inquiry method: `nationalId_uniqueCode`, `policyNumber`, `vin`
  - Result codes: `OK`, `NOT_FOUND`, `MISMATCH`, `PENDING_SYNC`, `UPSTREAM_ERROR`
- **Circuit Breaker** (custom implementation):
  - ۳ state: CLOSED, OPEN, HALF_OPEN
  - Configurable: failureThreshold (5), successThreshold (2), timeoutMs (60s), halfOpenMaxCalls (3)
  - Auto-transition: CLOSED → OPEN (on failureThreshold), OPEN → HALF_OPEN (after timeout), HALF_OPEN → CLOSED (on successThreshold)
  - Stats endpoint + manual reset
  - In-memory state (not distributed)
- **HTTP retry with exponential backoff** (`fetchWithRetry`):
  - Configurable timeout, retries, base delay
  - AbortController for timeout
  - Exponential delay: `baseDelay * 2^attempt`
- **Webhook handling**:
  - Deduplication via `externalEventId`
  - Event persistence (SanhabEvent)
  - Kafka event publishing (`insurance.regulatory.sanhab.event_received`)
  - Header normalization
- **Simulate endpoint** for testing
- **Inquiry flow**:
  - Circuit breaker check before call
  - Sanhab inquiry through circuit breaker
  - MISMATCH/PENDING_SYNC/UPSTREAM_ERROR → orchestrator work item creation
  - Work item creation with retry + auth header forwarding
  - Failure logging (RegulatoryFailureLog) for all error scenarios
  - Inquiry event persistence + Kafka publish
- **Sanhab SMS inquiry**:
  - Initiate SMS inquiry (phoneNumber, inquiryType)
  - Handle SMS reply
  - Get/cancel pending inquiry
  - SMS providers: KAVENEGAR, TWILIO, MELLIPAYAMAK
  - Configurable (enabled, shortCode, apiKey, timeoutMs, maxRetries)
- **Warehouse Fire inquiry**:
  - Inquire by warehouseId, nationalId, licenseNumber
  - Inquiry types: FIRE_HISTORY, CURRENT_STATUS, INSPECTION_REPORT, COMPLIANCE_CHECK
  - Configurable (apiUrl, apiKey, timeoutMs, enabled)
  - Health check
- **Kafka producer** با `KafkaProducer` از shared package
- **Event envelope** با `createEventEnvelope` از shared package
- Correlation ID
- `createLogger` از shared package
- Pagination با cap (limit max 200)
- Health check endpoint + Sanhab health check

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| RGS-001 | بحرانی | **عدم authentication** — هیچ endpoint‌ی `JwtAuthGuard` یا `PermissionsGuard` ندارد — تمام endpoints از جمله webhook, simulate, inquiry, circuit breaker reset, config update بدون authentication قابل دسترسی هستند |
| RGS-002 | متوسط | **Circuit Breaker in-memory** — در multi-instance deployment، هر instance circuit breaker مستقل دارد — عدم distributed circuit breaker |
| RGS-003 | متوسط | **عدم Kafka consumer** — سرویس فقط producer است، webhook‌های Sanhab را دریافت می‌کند اما از Kafka event مصرف نمی‌کند |
| RGS-004 | متوسط | **عدم Outbox pattern** — Kafka publish مستقیم بعد از DB save انجام می‌شود (عدم transactional consistency) |
| RGS-005 | متوسط | **عدم webhook signature verification** — Sanhab webhook بدون بررسی HMAC/signature پردازش می‌شود — امکان spoofing |
| RGS-006 | متوسط | **عدم permissions** — هیچ permission system تعریف نشده است (عدم `permissions.ts`) |
| RGS-007 | کم | `KAFKA_BROKERS` اگر تنظیم نشود، Kafka producer اصلاً متصل نمی‌شود (silent failure) |
| RGS-008 | کم | `listEvents` — عدم cap در limit (در سرویس cap 200 اعمال می‌شود اما در controller عدم validation) |
| RGS-009 | کم | Warehouse Fire و Sanhab SMS — config update endpoints بدون authentication — امکان تغییر apiKey/apiUrl توسط attacker |
| RGS-010 | کم | عدم AbacGuard و TenantGuard |
| RGS-DEC | متوسط | **عدم authentication و عدم مالکیت کامل regulatory domain** — regulatory-gateway-service تمام endpoints بدون authentication هستند (RGS-001) — عدم Kafka consumer (RGS-003) — عدم Outbox pattern (RGS-004) — webhook signature verification پیاده‌سازی نشده (RGS-005) — سرویس به‌عنوان دروازه تنظیمی باید source of truth برای regulatory events باشد اما events بدون transactional consistency publish می‌شوند — عدم ownership واضح در regulatory compliance workflow |

**درجه‌بندی منطق پیاده‌سازی:** **۶/۱۰** — Sanhab integration با mock/real client، circuit breaker، HTTP retry با exponential backoff، webhook deduplication، inquiry با orchestrator follow-up، failure logging، Sanhab SMS inquiry، warehouse fire inquiry، و Kafka producer اما عدم authentication (بحرانی)، in-memory circuit breaker، عدم webhook signature verification، و عدم Outbox pattern

#### ۱۹.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۲ entity
- ۲ migration
- `synchronize` به‌درستی در production غیرفعال است
- Schema isolation (`regulatory`)
- SanhabEvent persistence
- RegulatoryFailureLog برای audit trail
- Pagination با cap

**اشکالات:**
- عدم Outbox pattern (RGS-004)
- عدم connection pool tuning
- Circuit breaker in-memory (RGS-002)

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۱۹.۳ وضعیت امنیتی

**نقاط قوت:**
- Correlation ID
- Failure logging
- Configurable Sanhab client (mock vs real)
- Authorization header forwarding to orchestrator

**اشکالات:**
- **عدم JwtAuthGuard و PermissionsGuard در تمام endpoints** (RGS-001) — بحرانی
- **عدم webhook signature verification** (RGS-005) — امکان spoofing
- **عدم permission system** (RGS-006)
- **Config update endpoints بدون authentication** (RGS-009) — apiKey/apiUrl قابل تغییر
- عدم AbacGuard و TenantGuard (RGS-010)
- عدم rate limiting
- عدم security headers
- `simulate` endpoint بدون authentication — امکان تزریق event جعلی

**درجه‌بندی امنیتی:** **۲/۱۰**

#### ۱۹.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Kafka producer** با `KafkaProducer` از shared package
- **Event envelope** با `createEventEnvelope` از shared package
- Topic: `insurance.regulatory.sanhab.event_received`
- **Orchestrator integration** — work item creation for MISMATCH/PENDING_SYNC/UPSTREAM_ERROR
- `createLogger` از shared package
- Correlation ID
- Sanhab SMS inquiry integration
- Warehouse Fire inquiry integration
- HTTP retry for orchestrator calls

**اشکالات:**
- عدم Kafka consumer (RGS-003)
- عدم Outbox pattern (RGS-004)
- Circuit breaker in-memory، در multi-instance کار نمی‌کند (RGS-002)
- Kafka producer در صورت عدم KAFKA_BROKERS silently non-functional (RGS-007)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی regulatory-gateway-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۶/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۲/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۵/۱۰** |

**وضعیت کلی:** سرویس دروازه تنظیمی برای ادغام با سامانه سناب با mock/real client، circuit breaker (CLOSED/OPEN/HALF_OPEN)، HTTP retry با exponential backoff، webhook deduplication، inquiry با ۳ method (nationalId+uniqueCode, policyNumber, vin)، orchestrator follow-up برای MISMATCH/PENDING_SYNC/UPSTREAM_ERROR، failure logging، Sanhab SMS inquiry (KAVENEGAR/TWILIO/MELLIPAYAMAK)، warehouse fire inquiry، و Kafka producer. اما **عدم authentication در تمام endpoints** (بحرانی)، **عدم webhook signature verification**، **in-memory circuit breaker**، **عدم permission system**، و **عدم Outbox pattern** از نواقص اصلی هستند.

---

### ۲۰. collections-service

**پورت:** 18025  
**مسیر پایه:** `/collections`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (ConsumedEvent, DeadLetterEvent, OutboxEvent, OutboxPublisher, OutboxWorker, KafkaProducer, createLogger), uuid

#### ۲۰.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۲ entity: InstallmentPlan, Installment
- ۳ migration
- `synchronize` به‌درستی در production غیرفعال است (`NODE_ENV !== 'production' && DB_SYNC === 'true'`)
- `ConsumedEvent`, `DeadLetterEvent`, `OutboxEvent` از shared package
- **Outbox pattern** با `OutboxPublisher` در transaction و `OutboxWorker` در main.ts
- **OutboxWorker** با configurable pollIntervalMs, batchSize, maxAttempts
- **Installment Plan management**:
  - Create plan با idempotency key (deduplication)
  - Premium amount, currency (default IRR)
  - Late fee config: ratePerDay, maxDays, maxAmount
  - Meta as JSONB
  - Status: active
  - Transactional create (plan + installments + outbox)
- **Installment management**:
  - Auto-creation on plan create
  - Installment number (sequential)
  - Due date, amount, currency
  - Status: pending → paid
  - Provider + providerRef for payment tracking
  - Payment details as JSONB
  - Grace period end
  - Late fee: amount, days, totalAmount
  - Reminder: reminderSentAt, reminderCount (max 3)
  - Overdue: overdueNotifiedAt
- **Payment processing**:
  - State machine: pending → paid (cannot pay non-pending)
  - Idempotency via providerRef check
  - Already-paid returns existing
  - Outbox event on payment
- **Reminder system**:
  - Get installments for reminder (daysBeforeDue, pending, reminderCount < 3, not reminded in last 7 days)
  - Send reminder (updates reminderSentAt + reminderCount, outbox event)
- **Overdue management**:
  - Get overdue installments (past grace period, pending, not notified in last 7 days)
  - Mark overdue (sets overdueNotifiedAt + gracePeriodEnd, outbox event)
- **Late fee calculation**:
  - Based on plan's lateFeeRatePerDay
  - Grace period end or due date as start
  - Max days cap, max amount cap
  - Apply late fee to installment
- **Payment Gateway integration**:
  - Interface-based (`IGatewayProvider`)
  - ۲ provider: Zarinpal, IdPay
  - Sandbox mode support
  - Initiate payment (returns paymentUrl + transactionId)
  - Verify payment (calls gateway verify, marks installment as paid)
  - Gateway callback handling (success → verify, failed/cancelled → update details)
  - Configurable via env (`COLLECTIONS_GATEWAY_PROVIDER`, `COLLECTIONS_GATEWAY_SANDBOX`)
- **Kafka events** (۴ topic):
  - `insurance.collections.plan.created` — InstallmentPlanCreated
  - `insurance.collections.installment.paid` — InstallmentPaid
  - `insurance.collections.installment.reminder` — InstallmentReminderSent
  - `insurance.collections.installment.overdue` — InstallmentMarkedOverdue
- Pagination با cap (limit max 200)
- Correlation ID
- Audit logging
- `req.user` برای actor
- Input validation (comprehensive in createPlan)
- `dotenv/config` import

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| COL-001 | متوسط | **Schema پیش‌فرض `public`** — عدم schema isolation (برخلاف سایر سرویس‌ها که schema اختصاصی دارند) |
| COL-002 | متوسط | **عدم Kafka consumer** — سرویس فقط producer است، از Kafka event مصرف نمی‌کند (مثلاً `insurance.policy.issued` برای auto-create plan) |
| COL-003 | متوسط | **Gateway callback endpoint بدون authentication** — `handleGatewayCallback` دارای `@UseGuards` نیست — امکان تزریق callback جعلی |
| COL-004 | متوسط | **`applyLateFee` بدون transaction و outbox** — late fee apply خارج transaction انجام می‌شود و event publish نمی‌کند |
| COL-005 | کم | **عدم AbacGuard و TenantGuard** — tenantId از header خوانده می‌شود اما در query‌ها استفاده نمی‌شود |
| COL-006 | کم | **`initiateGatewayPayment` بدون transaction** — paymentDetails update خارج transaction |
| COL-007 | کم | عدم webhook signature verification در gateway callback (COL-003) |
| COL-008 | کم | عدم health check عمیق — فقط `/health` با `{ status: 'ok' }` |
| COL-009 | کم | `ZARINPAL_MERCHANT_ID` پیش‌فرض empty string — در صورت عدم تنظیم، gateway بدون merchantId کار می‌کند |
| COL-DEC | متوسط | **همپوشانی با billing-service** — collections-service و billing-service هر دو payment gateway integration (Zarinpal/IdPay) پیاده‌سازی کرده‌اند — عدم تفکیک مشخص مسئولیت‌های وصول (collections) از حسابداری و فاکتور (billing) — تداخل domain ownership در payment/وصول |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Installment plan با idempotency، installment management با state machine، payment gateway integration (Zarinpal/IdPay با sandbox)، reminder system با max 3 و 7-day cooldown، overdue management با grace period، late fee calculation با caps، Outbox pattern با OutboxWorker، و ۴ Kafka event اما عدم Kafka consumer، schema پیش‌فرض public، gateway callback بدون auth، و applyLateFee بدون transaction/outbox

#### ۲۰.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۲ entity
- ۳ migration
- `synchronize` به‌درستی در production غیرفعال است
- **Outbox pattern** با `OutboxPublisher` در transaction
- `OutboxWorker` با configurable settings
- `ConsumedEvent`, `DeadLetterEvent`, `OutboxEvent` از shared package
- Transactional create (plan + installments + outbox)
- Transactional pay (installment + outbox)
- Idempotency via idempotencyKey و providerRef
- Pagination با cap

**اشکالات:**
- Schema پیش‌فرض `public` (COL-001) — عدم isolation
- `applyLateFee` بدون transaction (COL-004)
- `initiateGatewayPayment` بدون transaction (COL-006)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۲۰.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در اکثر endpoint‌ها
- ۶ مجوز تخصصی: plan_create, plan_view, plan_list, installment_pay, installment_view, installment_list
- RBAC با ۵ نقش (insurer_admin, head_office_ops, finance, branch_manager, auditor)
- `req.user` برای actor
- Audit logging (success, failure, validation)
- Correlation ID
- Input validation (comprehensive in createPlan)
- `isNonEmptyString` helper

**اشکالات:**
- **Gateway callback بدون authentication** (COL-003) — بحرانی برای payment integrity
- عدم webhook signature verification (COL-007)
- عدم AbacGuard و TenantGuard (COL-005)
- JWT_SECRET پیش‌فرض ضعیف
- عدم rate limiting
- عدم security headers

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۲۰.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Outbox pattern** با `OutboxPublisher` و `OutboxWorker` از shared package
- ۴ Kafka event: plan.created, installment.paid, installment.reminder, installment.overdue
- `KafkaProducer` از shared package
- `createLogger` از shared package
- `ConsumedEvent`, `DeadLetterEvent`, `OutboxEvent` از shared package
- Correlation ID
- Payment gateway integration (Zarinpal, IdPay)
- `dotenv/config` import

**اشکالات:**
- عدم Kafka consumer (COL-002) — عدم مصرف policy events برای auto-create
- Gateway callback بدون auth (COL-003)
- `applyLateFee` بدون outbox event (COL-004)
- عدم health check عمیق (COL-008)

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی collections-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۷/۱۰** |

**وضعیت کلی:** سرویس مدیریت وصول با installment plan management (idempotency key، late fee config)، installment state machine (pending → paid)، payment gateway integration (Zarinpal/IdPay با sandbox و initiate/verify/callback)، reminder system (max 3، 7-day cooldown)، overdue management (grace period)، late fee calculation (ratePerDay با maxDays/maxAmount caps)، Outbox pattern با OutboxWorker، و ۴ Kafka event. اما عدم Kafka consumer، schema پیش‌فرض `public`، gateway callback بدون authentication، و `applyLateFee` بدون transaction/outbox از نواقص اصلی هستند.

---

### ۲۱. customer-360-service

**پورت:** 18026  
**مسیر پایه:** `/customer-360`  
**پایگاه‌داده:** ندارد (stateless aggregation service)  
**فریم‌ورک:** NestJS + Fastify + @nestjs/axios  
**وابستگی‌ها:** @nestjs/axios (HttpService), @nestjs/config (ConfigService), rxjs (firstValueFrom)

#### ۲۱.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- **Stateless aggregation** — بدون پایگاه‌داده، داده‌ها را از ۶+ سرویس جمع‌آوری می‌کند
- **Parallel data fetching** با `Promise.all` — ۱۲ منبع داده به‌صورت موازی:
  - Profile (party-kyc-service)
  - Policies (policy-service)
  - Claims (claims-service)
  - Payments (payments-service)
  - Complaints (complaints-service)
  - AML status (aml-service)
  - KYC status (party-kyc-service)
  - Journey (aggregated from policies + claims + payments)
  - Relationships (party-kyc-service)
  - Risk profile (aml-service)
  - Preferences (party-kyc-service)
  - Consent (simulated/placeholder)
- **Customer360Profile** model با metadata (dataSource, lastSyncedAt, dataFreshness, completeness, confidence)
- **Completeness scoring** (100 points: profile 40, policies 30, claims 30)
- **Confidence scoring** (100 points: KYC verified 50, verificationLevel 20/10, nationalId 20, dateOfBirth 10)
- **Customer journey timeline** — aggregated events (policy_created, policy_issued, claim_submitted, claim_settled, payment_made) sorted by timestamp
- **Customer search** — by nationalId, phone, email, policyNumber across services
- **Customer summary** — lightweight version with active policies, open claims, AML/KYC status, risk category
- **Graceful degradation** — تمام fetch‌ها با try/catch و fallback به empty/null
- Correlation ID
- ConfigService برای service URLs
- `HttpModule` به‌درستی import شده

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| C36-001 | بحرانی | **عدم authentication** — هیچ endpoint‌ی `JwtAuthGuard` یا `PermissionsGuard` ندارد — profile کامل مشتری (شامل AML، KYC، payments، claims) بدون authentication قابل دسترسی است |
| C36-002 | متوسط | **Consent data hardcoded/simulated** — `getConsent` داده‌های static برمی‌گرداند (consent-001, consent-002) — عدم integration با consent management service واقعی |
| C36-003 | متوسط | **عدم auth token forwarding** — HTTP calls به سایر سرویس‌ها بدون JWT/auth header — اگر سرویس‌های هدف JwtAuthGuard داشته باشند، request‌ها رد می‌شوند |
| C36-004 | متوسط | **`searchCustomers` از `.toPromise()`** استفاده می‌کند (deprecated در rxjs 7) — برخلاف `firstValueFrom` در سایر متدها |
| C36-005 | متوسط | **`getJourney` داده‌ها را دوبار fetch می‌کند** — `getPolicies`, `getClaims`, `getPayments` هم در `Promise.all` و هم در `getJourney` فراخوانی می‌شوند (duplicate HTTP calls) |
| C36-006 | کم | **عدم caching** — هر request تمام ۱۲ منبع را fresh fetch می‌کند — برای performance در production مشکل‌ساز |
| C36-007 | کم | **عدم timeout** — HTTP calls بدون timeout — اگر یک سرویس hang کند، کل request معلق می‌شود |
| C36-008 | کم | **عدم pagination** — تمام policies, claims, payments را برمی‌گرداند (بدون limit) — برای مشتریان با تعداد زیاد مشکل performance |
| C36-009 | کم | **عدم health check عمیق** — فقط `/health` |
| C36-010 | کم | **`searchCustomers` و `getCustomerJourneyTimeline` و `getCustomerSummary` در service تعریف شده‌اند اما در controller expose نشده‌اند** — dead code |
| C36-011 | کم | **`getCustomer360` متد ناموجود** — `searchCustomers` به `this.getCustomer360` اشاره می‌کند که تعریف نشده است (runtime error) |
| C36-012 | کم | **عدم `reflect-metadata` import در main.ts** — ممکن است در برخی setups مشکل ایجاد کند |
| C36-DEC | متوسط | **عدم مالکیت داده و عدم ادغام event-driven** — customer-360-service یک stateless aggregator است که هیچ داده‌ای متعلق به خود ندارد و از ۶+ سرویس داده fetch می‌کند — عدم Kafka integration (نه consumer نه producer) — عدم auth token forwarding (C36-003) — عدم caching/timeout/pagination — تجزیه نامناسب: این سرویس باید به‌عنوان CQRS read model با Kafka consumer پیاده‌سازی می‌شد نه stateless HTTP aggregator |

**درجه‌بندی منطق پیاده‌سازی:** **۵/۱۰** — Stateless aggregation از ۱۲ منبع با Promise.all، completeness/confidence scoring، customer journey timeline، و graceful degradation اما عدم authentication (بحرانی)، consent hardcoded، عدم auth token forwarding، duplicate HTTP calls در journey، عدم caching/timeout/pagination، و dead code در service

#### ۲۱.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- Stateless — بدون پایگاه‌داده
- ConfigService برای service URLs
- HttpModule به‌درستی import شده
- Graceful degradation در تمام fetch‌ها

**اشکالات:**
- عدم auth token forwarding (C36-003)
- عدم caching (C36-006)
- عدم timeout (C36-007)
- عدم pagination (C36-008)
- Duplicate HTTP calls (C36-005)
- `getCustomer360` ناموجود (C36-011)

**درجه‌بندی پایگاه‌داده:** **۵/۱۰**

#### ۲۱.۳ وضعیت امنیتی

**نقاط قوت:**
- Correlation ID
- Graceful degradation (عدم leak اطلاعات در error)

**اشکالات:**
- **عدم JwtAuthGuard و PermissionsGuard** (C36-001) — بحرانی — تمام داده‌های مشتری بدون authentication
- **عدم permission system** — هیچ `permissions.ts` تعریف نشده است
- عدم auth token forwarding (C36-003)
- عدم AbacGuard و TenantGuard
- عدم rate limiting
- عدم security headers
- عدم input validation روی customerId

**درجه‌بندی امنیتی:** **۱/۱۰**

#### ۲۱.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **۶+ سرویس integration**: party-kyc, policy, claims, payments, complaints, aml
- ConfigService برای configurable URLs
- Parallel fetching با Promise.all
- Customer journey aggregation از چندین سرویس
- Customer search across services
- Correlation ID (اما نه forwarded از upstream)

**اشکالات:**
- عدم auth token forwarding (C36-003) — سرویس‌های هدف request‌ها را رد می‌کنند
- عدم Kafka integration (نه consumer نه producer)
- Consent service integration پیاده‌سازی نشده (C36-002)
- Duplicate HTTP calls (C36-005)
- `getCustomer360` ناموجود (C36-011) — searchCustomers در runtime خطا می‌دهد
- Dead code — ۳ متد در service expose نشده‌اند (C36-010)

**درجه‌بندی ادغام:** **۴/۱۰**

#### جمع‌بندی customer-360-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۵/۱۰ |
| پایگاه‌داده | ۵/۱۰ |
| امنیتی | ۱/۱۰ |
| ادغام | ۴/۱۰ |
| **کل** | **۴/۱۰** |

**وضعیت کلی:** سرویس aggregation بدون پایگاه‌داده که داده‌های مشتری را از ۶+ سرویس (party-kyc, policy, claims, payments, complaints, aml) با Promise.all به‌صورت موازی جمع‌آوری می‌کند و profile 360 درجه با completeness/confidence scoring و customer journey timeline ارائه می‌دهد. اما **عدم authentication** (بحرانی — تمام داده‌های حساس مشتری بدون auth)، **consent hardcoded**، **عدم auth token forwarding** به سرویس‌های هدف، **duplicate HTTP calls** در journey، **عدم caching/timeout/pagination**، **dead code** (۳ متد expose نشده)، و **`getCustomer360` ناموجود** (runtime error در searchCustomers) از نواقص اصلی هستند.

---

### ۲۲. customer-portal-service

**پورت:** 18027  
**مسیر پایه:** `/customer-portal`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: customer_portal)  
**فریم‌ورک:** NestJS + Fastify + TypeORM + @nestjs/jwt + @nestjs/axios  
**وابستگی‌ها:** @nestjs/jwt (JwtService), @nestjs/axios (HttpService), rxjs (firstValueFrom), axios (AxiosError), crypto, uuid

#### ۲۲.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۱ entity: CustomerSession
- ۱ migration
- Schema isolation (`customer_portal`)
- `JwtModule` با 30-minute TTL
- **OTP-based authentication**:
  - Initiate: ۶-digit OTP با `crypto.randomInt`، ۵-minute expiry
  - Revoke existing active sessions for same phone number
  - Session persistence (CustomerSession)
  - Verify: session validation (active, not expired, OTP match)
  - JWT token generation با customerId, tenantId, phoneNumber, type
  - Session status: ACTIVE, REVOKED, EXPIRED
- **OTP delivery** via notification service (`/notifications/sms/otp`)
- **HTTP retry logic** (`fetchWithRetry`):
  - ۳ retries با linear backoff (1s × attempt)
  - Retryable: 5xx, 429, ECONNREFUSED, ETIMEDOUT, ENOTFOUND
  - AxiosError-aware
- **BFF (Backend-for-Frontend) pattern**:
  - `getPoliciesForCustomer` — party lookup → policy fetch
  - `getPolicyForCustomer` — policy fetch با customer context
  - `getClaimsForCustomer` — claims readmodel fetch
  - `getClaimForCustomer` — claim fetch با ownership verification (customerId check)
  - `getPaymentsForCustomer` — collections service fetch
  - `getComplaintsForCustomer` — complaints service fetch
  - `submitFnol` — policy verification → document upload → claim creation
  - `requestEndorsement` — policy verification → endorsement request
  - `requestRenewal` — policy verification → renewal request
- **Ownership verification** در `getClaimForCustomer` (customerId match → FORBIDDEN)
- **Policy ownership verification** در `submitFnol`, `requestEndorsement`, `requestRenewal`
- Session management (get, revoke, cleanup expired)
- Correlation ID
- HttpModule به‌درستی import شده
- `HttpException` برای proper HTTP status codes

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| CPS-001 | بحرانی | **`synchronize` در production غیرفعال نیست** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check — در production با `DB_SYNC=true` schema overwrite می‌شود |
| CPS-002 | متوسط | **عدم ownership verification در `getPolicyForCustomer`** — comment می‌گوید "Here you would verify" اما پیاده‌سازی نشده — هر مشتری می‌تواند policy هر مشتری دیگر را ببیند |
| CPS-003 | متوسط | **عدم ownership verification در `getPoliciesForCustomer`** — customerId به‌عنوان nationalId به party service ارسال می‌شود اما نتایج فیلتر نمی‌شوند |
| CPS-004 | متوسط | **عدم auth token forwarding** — HTTP calls به سرویس‌های downstream بدون JWT/auth header — اگر سرویس‌های هدف JwtAuthGuard داشته باشند، request‌ها رد می‌شوند |
| CPS-005 | متوسط | **OTP failure silent** — اگر ارسال OTP fail کند، login همچنان success برمی‌گرداند ("Don't fail the login if OTP sending fails") — مشتری بدون دریافت OTP نمی‌تواند login کند اما session ایجاد شده است |
| CPS-006 | متوسط | **`customerId = session.phoneNumber`** — اگر customer در party service ثبت نشده باشد، phoneNumber به‌عنوان customerId استفاده می‌شود — عدم proper customer linking |
| CPS-007 | کم | **`cleanupExpiredSessions` با TypeORM `$lt` syntax** — `$lt` MongoDB syntax است نه TypeORM — در PostgreSQL کار نمی‌کند |
| CPS-008 | کم | **عدم OTP rate limiting** — هر phone number می‌تواند unlimited OTP request کند |
| CPS-009 | کم | **عدم OTP attempt limiting** — unlimited OTP verify attempts — امکان brute force |
| CPS-010 | کم | **JWT_SECRET پیش‌فرض ضعیف** — `customer-portal-secret` |
| CPS-011 | کم | **عدم audit logging** — `audit.logger.ts` وجود دارد اما در controller/service استفاده نمی‌شود |
| CPS-012 | کم | **`getSession` و `revokeSession` بدون authentication** — هر کسی با sessionId می‌تواند session را ببیند یا revoke کند |
| CPS-DEC | متوسط | **عدم auth token forwarding در BFF** — customer-portal-service به‌عنوان BFF عمل می‌کند اما auth token به سرویس‌های downstream forwarding نمی‌شود (CPS-004) — عدم Kafka integration — عدم مالکیت داده (تمام داده از سرویس‌های downstream) — مرز مشخص بین BFF و backend services تعریف نشده — customerId = phoneNumber به‌عنوان fallback (CPS-006) نشان‌دهنده عدم integration صحیح با party-kyc-service |

**درجه‌بندی منطق پیاده‌سازی:** **۶/۱۰** — OTP-based authentication با session management، BFF pattern با ۹ endpoint، HTTP retry با linear backoff، ownership verification در claims و FNOL/endorsement/renewal اما `synchronize` در production فعال (بحرانی)، عدم ownership verification در policies، عدم auth token forwarding، OTP failure silent، customerId = phoneNumber، و cleanupExpiredSessions با MongoDB syntax

#### ۲۲.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۱ entity (CustomerSession)
- ۱ migration
- Schema isolation (`customer_portal`)
- JwtModule با 30-minute TTL
- HttpModule به‌درستی import شده
- HTTP retry logic

**اشکالات:**
- **`synchronize` در production غیرفعال نیست** (CPS-001) — بحرانی
- `cleanupExpiredSessions` با MongoDB `$lt` syntax (CPS-007)
- عدم connection pool tuning
- عدم OTP rate limiting در DB level

**درجه‌بندی پایگاه‌داده:** **۵/۱۰**

#### ۲۲.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard)` در BFF endpoint‌ها (policies, claims, payments, complaints, endorsement, renewal, FNOL)
- OTP-based authentication با ۶-digit و ۵-minute expiry
- JWT با 30-minute TTL و type field
- Session revocation
- Ownership verification در `getClaimForCustomer` (customerId match)
- Policy ownership verification در `submitFnol`, `requestEndorsement`, `requestRenewal`
- `crypto.randomInt` برای OTP generation (secure random)

**اشکالات:**
- **`synchronize` در production فعال** (CPS-001) — بحرانی
- **عدم ownership verification در `getPolicyForCustomer`** (CPS-002) — IDOR
- **عدم ownership verification در `getPoliciesForCustomer`** (CPS-003)
- **عدم auth token forwarding** (CPS-004)
- **OTP failure silent** (CPS-005)
- **عدم OTP rate limiting** (CPS-008)
- **عدم OTP attempt limiting** (CPS-009) — brute force
- **JWT_SECRET پیش‌فرض ضعیف** (CPS-010)
- **`getSession` و `revokeSession` بدون authentication** (CPS-012)
- عدم AbacGuard و TenantGuard
- عدم rate limiting
- عدم security headers

**درجه‌بندی امنیتی:** **۴/۱۰**

#### ۲۲.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **BFF pattern** — proxy به ۶+ سرویس:
  - party-kyc-service (party lookup)
  - policy-service (policies, endorsement, renewal)
  - claims-readmodel-service (claims)
  - claims-service (FNOL/claim creation)
  - collections-service (payments)
  - complaints-service (complaints)
  - document-service (document upload)
  - notification-service (OTP SMS)
- HTTP retry logic با retryable error detection
- Configurable service URLs via env
- Correlation ID
- Customer context forwarding (x-tenant-id, x-customer-id headers)

**اشکالات:**
- عدم auth token forwarding (CPS-004) — سرویس‌های هدف request‌ها را رد می‌کنند
- عدم Kafka integration (نه consumer نه producer)
- عدم audit logging استفاده (CPS-011)
- `customerId = phoneNumber` به‌عنوان fallback (CPS-006)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی customer-portal-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۶/۱۰ |
| پایگاه‌داده | ۵/۱۰ |
| امنیتی | ۴/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۵/۱۰** |

**وضعیت کلی:** سرویس BFF (Backend-for-Frontend) برای پورتال مشتری با OTP-based authentication (۶-digit، ۵-minute expiry، session management)، ۹ BFF endpoint (policies، claims، payments، complaints، endorsement، renewal، FNOL)، HTTP retry logic با linear backoff، و ownership verification در claims/FNOL/endorsement/renewal. اما **`synchronize` در production فعال** (بحرانی)، **عدم ownership verification در policies** (IDOR)، **عدم auth token forwarding**، **OTP failure silent**، **عدم OTP rate/attempt limiting**، **JWT_SECRET پیش‌فرض ضعیف**، و **`getSession`/`revokeSession` بدون authentication** از نواقص اصلی هستند.

---

### ۲۳. workflow-service + workflow-engine-service

**پورت:** 18028  
**مسیر پایه:** `/workflow`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: workflow)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (createLogger, KafkaProducer, OutboxWorker), @nestjs/axios (HttpService), rxjs (firstValueFrom), uuid

#### ۲۳.۱ وضعیت منطق پیاده‌سازی

**ساختار:** دو سرویس مجزا با responsibility‌های متفاوت:
- **workflow-service** — management layer: definition CRUD، template management، instance lifecycle، metrics
- **workflow-engine-service** — execution engine: token-based execution، node types، parallel branches، history

**نقاط قوت (workflow-service):**
- ۳ entity: WorkflowDefinition, WorkflowInstance, WorkflowTemplate
- ۱ migration
- Schema isolation (`workflow`)
- **Workflow Definition management**:
  - Create با auto-increment version
  - Status: DRAFT, ACTIVE, INACTIVE
  - Activate/deactivate
  - Validate (nodes, start/end, edge references, outgoing edges)
  - Update, delete, get, list
- **Workflow Instance management**:
  - Start (find active definition, create instance, auto-advance from start)
  - Advance (handle end, userTask, timerEvent, gateway, task)
  - Complete task (userTask manual completion)
  - Cancel
  - Get, list, metrics
- **Gateway types**: exclusive (first match), parallel (branch instances), inclusive (all matching)
- **Condition evaluation**: ==, !=, >, <, >=, <=, in, contains, startsWith, endsWith
- **Timer event**: ISO 8601 duration parsing (PT#H#M#S)
- **User task**: assignee, candidateUsers, candidateGroups, dueDate
- **Workflow Template**: create, list, create definition from template (variable substitution)
- **Instance metrics**: total, completed, running, cancelled, avgCompletionTime, mostUsedWorkflows
- Pagination با cap (max 200)
- Correlation ID
- `ProfileRecoAdapter` و `ProfileRecoController` (profile recommendation)

**نقاط قوت (workflow-engine-service):**
- ۵ entity: ProcessDefinition, ProcessInstance, ProcessToken, ProcessVariable, ProcessHistory
- Schema isolation (`workflow`) — **همان schema با workflow-service** (potential conflict)
- **Outbox pattern** با `OutboxWorker` در main.ts
- **Token-based execution** (BPMN-like):
  - Token: ACTIVE, CONSUMED, TERMINATED
  - Instance: RUNNING, COMPLETED, CANCELLED, FAILED, SUSPENDED
  - Definition: DRAFT, ACTIVE, INACTIVE
- **Node types** (۸):
  - `start` — pass-through
  - `end` — mark instance completed
  - `api_call` — HTTP call با interpolation, timeout, outputVariable
  - `decision` — expression evaluation, condition-based edge
  - `human_task` — wait for signal, inputData on completion
  - `timer` — setTimeout-based (in-memory)
  - `parallel` — fork to multiple branches
  - `event_wait` — wait for Kafka event (placeholder)
  - `transform` — variable transformation
- **Signal mechanism** — resume waiting human_task nodes
- **Process history** — NODE_ENTER, NODE_EXIT, NODE_ERROR, PROCESS_START, PROCESS_END, PROCESS_CANCEL, SIGNAL_RECEIVED, TIMER_TRIGGERED, PARALLEL_FORK
- **Variable management** — setVariable با scope, JSON serialization
- **Error handling** — node error → instance FAILED, terminate active tokens
- `JwtAuthGuard` و `PermissionsGuard` در تمام endpoint‌ها
- ۸ permission: define, start, signal, cancel, view, list, history, admin
- RBAC با ۱۱ نقش
- `HttpModule` برای API call nodes
- `reflect-metadata` import در main.ts

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| WF-001 | بحرانی | **`synchronize` در production غیرفعال نیست** — هر دو سرویس `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| WF-002 | بحرانی | **`evaluateExpression` با `eval()`** — workflow-engine-service خط ۶۱۷: `return eval(evalExpr)` — **Code Injection** — هر کاربری با `workflow:define` می‌تواند arbitrary JavaScript اجرا کند |
| WF-003 | بحرانی | **عدم authentication در workflow-service** — هیچ endpoint‌ی `JwtAuthGuard` یا `PermissionsGuard` ندارد — برخلاف workflow-engine-service که دارد |
| WF-004 | متوسط | **همان schema (`workflow`) برای هر دو سرویس** — entity conflict احتمالی اگر `DB_SYNC=true` |
| WF-005 | متوسط | **`evaluateEdges` در workflow-engine-service خالی** — خط ۶۰۲-۶۰۶: `return []` — تمام decision/api_call/human_task/transform node‌ها هیچ next node برنمی‌گردانند — workflow متوقف می‌شود |
| WF-006 | متوسط | **`executeTimerNode` با `setTimeout`** — in-memory، در restart از دست می‌رود — عدم persistent timer |
| WF-007 | متوسط | **`executeEventWaitNode` placeholder** — "In production, subscribe to Kafka topic" — پیاده‌سازی نشده |
| WF-008 | متوسط | **`executeHumanTaskNode` بدون work item creation** — "Would integrate with Work Item Service in production" — پیاده‌سازی نشده |
| WF-009 | متوسط | **`executeTask` در workflow-service placeholder** — "Would call service" — فقط log می‌زند، service call واقعی نمی‌کند |
| WF-010 | متوسط | **عدم Kafka consumer** — هر دو سرویس فقط producer هستند (workflow-engine-service) یا هیچ Kafka integration ندارند (workflow-service) |
| WF-011 | متوسط | **عدم tenantId در workflow-engine-service** — ProcessDefinition و ProcessInstance فیلد tenantId ندارند — عدم multi-tenancy |
| WF-012 | کم | **`evaluateCondition` در workflow-service** — اگر evaluation fail کند، `return true` — workflow به‌اشتباه پیش می‌رود |
| WF-013 | کم | **عدم audit logging** — `audit.logger.ts` در workflow-engine-service وجود دارد اما استفاده نمی‌شود |
| WF-014 | کم | **عدم Outbox در workflow-service** — فقط workflow-engine-service Outbox دارد |
| WF-015 | کم | **عدم pagination در workflow-engine-service** — `listInstances` و `listDefinitions` بدون limit/offset |
| WF-016 | کم | **`Object.assign(def, body)` در `updateDefinition`** — mass assignment vulnerability |
| WF-017 | کم | **عدم input validation** — هیچ validation در controller‌های workflow-service |
| WF-018 | کم | **`ProfileRecoAdapter` و `ProfileRecoController`** — functionality اضافی بدون authentication |
| WF-DEC | متوسط | **تجزیه نامناسب workflow domain** — دو سرویس مجزا (workflow-service و workflow-engine-service) با همان schema (`workflow`) و مسئولیت‌های همپوشان (management vs execution) — مرز مشخص بین definition management و execution engine تعریف نشده — entity conflict محتمل (WF-004) — عدم مالکیت واحد برای workflow domain — workflow-service بدون authentication (WF-003) در حالی که engine-service دارای auth است — عدم یکپارچگی امنیتی |

**درجه‌بندی منطق پیاده‌سازی:** **۵/۱۰** — دو سرویس با responsibility‌های متفاوت (management + execution)، definition CRUD با versioning، template management، instance lifecycle، token-based execution با ۸ node type، gateway types (exclusive/parallel/inclusive)، condition evaluation، process history، Outbox pattern (engine)، JWT + RBAC (engine) اما `eval()` (بحرانی)، `evaluateEdges` خالی (workflow متوقف)، عدم auth در workflow-service، timer/event_wait/human_task placeholder، عدم Kafka consumer، و عدم tenantId در engine

#### ۲۳.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۸ entity مجموعاً (۳ + ۵)
- ۱ migration (workflow-service)
- Schema isolation (`workflow`)
- **Outbox pattern** در workflow-engine-service
- `OutboxWorker` با configurable settings
- Token-based execution با persistent tokens
- Process history با execution time
- Process variables با JSON serialization
- Pagination با cap در workflow-service

**اشکالات:**
- **`synchronize` در production فعال** (WF-001) — بحرانی
- **همان schema برای دو سرویس** (WF-004) — entity conflict
- عدم migration در workflow-engine-service
- عدم connection pool tuning
- `setTimeout` برای timer (non-persistent) (WF-006)

**درجه‌بندی پایگاه‌داده:** **۵/۱۰**

#### ۲۳.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در workflow-engine-service (تمام endpoint‌ها)
- ۸ permission تخصصی در workflow-engine-service
- RBAC با ۱۱ نقش در workflow-engine-service
- `@RequirePermissions` در تمام endpoint‌های workflow-engine-service
- `@HttpCode` برای proper HTTP status codes

**اشکالات:**
- **`eval()` در `evaluateExpression`** (WF-002) — بحرانی — Code Injection
- **عدم authentication در workflow-service** (WF-003) — بحرانی — تمام endpoint‌ها بدون auth
- **`synchronize` در production فعال** (WF-001) — بحرانی
- **Mass assignment در `updateDefinition`** (WF-016) — workflow-engine-service
- عدم AbacGuard و TenantGuard
- عدم tenantId در workflow-engine-service (WF-011)
- عدم audit logging (WF-013)
- عدم input validation (WF-017)
- عدم rate limiting
- عدم security headers
- `ProfileRecoController` بدون auth (WF-018)

**درجه‌بندی امنیتی:** **۲/۱۰**

#### ۲۳.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Outbox pattern** در workflow-engine-service با `OutboxWorker`
- `KafkaProducer` از shared package (workflow-engine-service)
- `createLogger` از shared package (workflow-engine-service)
- `HttpModule` برای API call nodes (workflow-engine-service)
- Correlation ID (workflow-service)
- `reflect-metadata` import (workflow-engine-service)
- Process history برای audit trail
- Token-based execution برای parallel branches

**اشکالات:**
- عدم Kafka consumer در هر دو سرویس (WF-010)
- `executeEventWaitNode` placeholder (WF-007) — Kafka event wait پیاده‌سازی نشده
- `executeTask` placeholder در workflow-service (WF-009)
- `executeHumanTaskNode` بدون work item service integration (WF-008)
- `evaluateEdges` خالی (WF-005) — workflow متوقف می‌شود
- عدم Outbox در workflow-service (WF-014)
- عدم auth token forwarding در API call nodes
- عدم audit logging (WF-013)

**درجه‌بندی ادغام:** **۴/۱۰**

#### جمع‌بندی workflow-service + workflow-engine-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۵/۱۰ |
| پایگاه‌داده | ۵/۱۰ |
| امنیتی | ۲/۱۰ |
| ادغام | ۴/۱۰ |
| **کل** | **۴/۱۰** |

**وضعیت کلی:** دو سرویس workflow با responsibility‌های متفاوت: workflow-service (management: definition CRUD با versioning، template management، instance lifecycle، metrics) و workflow-engine-service (execution: token-based با ۸ node type، gateway types، process history، Outbox pattern، JWT + RBAC). اما **`eval()` در expression evaluation** (بحرانی — Code Injection)، **`evaluateEdges` خالی** (workflow متوقف می‌شود)، **عدم authentication در workflow-service** (بحرانی)، **`synchronize` در production فعال** (بحرانی)، **timer/event_wait/human_task placeholder**، **عدم Kafka consumer**، و **همان schema برای دو سرویس** از نواقص اصلی هستند. سرویس در وضعیت فعلی به‌دلیل `evaluateEdges` خالی و placeholder بودن node type‌های کلیدی عملاً قابل استفاده نیست.

---

### ۲۴. copilot-service

**پورت:** 18030  
**مسیر پایه:** `/copilot`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: public)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (createLogger), node:http, node:https

#### ۲۴.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۸ entity: ClaimEntity, DocumentEntity, CopilotAudit, ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport
- ۲ migration
- `LLMService` با ۴ provider: OpenAI, Gemini, DeepSeek, Ollama
- **LLM provider abstraction**:
  - `callOpenAICompatible` (OpenAI + DeepSeek)
  - `callGemini` (Gemini)
  - `callOllama` (Ollama)
  - `generateWithFallback` — fallback chain
  - `generateSummary`, `answerQuestion`, `generateNextBestAction`
  - Configurable via env (API key, base URL, model, maxTokens, temperature, timeout)
- **AI Governance** (Model Inventory):
  - `registerModel` — model registration با riskLevel, trainingDataSummary, performanceMetrics
  - `updateModelStatus` — development → production
  - `getModel`, `listModels`, `deleteModel`
  - `createRiskAssessment` — riskScore, riskFactors, mitigationPlan
  - `approveRiskAssessment`, `rejectRiskAssessment`
  - `createIncidentReport` — AI incident با severity, affectedSystems, impactSummary
  - `updateIncidentStatus`, `resolveIncident`
  - `createModelCard` — modelDetails, intendedUse, limitations, trainingData, evaluationMetrics, ethicalConsiderations
  - `updateModelCard`, `getModelCard`, `getModelCardByVersion`, `listModelCardsForModel`
  - `createValidationReport` — testResults, performanceMetrics, dataQualityMetrics, biasFairnessMetrics, complianceCheck
  - `updateValidationStatus`, `getValidationReport`, `listValidationReportsForModel`
- **AI Copilot features**:
  - `getClaimSummary` — claim + docs summary با redaction
  - `getDocumentSummary` — document summary با redaction
  - `askQuestion` — LLM-powered Q&A (claim, document, policy, complaint context)
  - `getNextBestAction` — LLM-powered next best action
  - `assistUnderwriting` — underwriting recommendation
  - `triageComplaint` — complaint categorization و priority
  - `discoverRecovery` — recovery opportunity discovery
  - `assistPricing` — pricing suggestion
  - `assistSelfService` — customer self-service assistant
- **AI Policy evaluation**:
  - `x-ai-enabled` header check (client-side disable)
  - Feature flag check (`ai.enabled`, `copilot.enabled`)
  - Graceful degradation (default allow if flag fetch fails)
- **Data redaction**:
  - National ID (10-digit), Card number (16-digit), IBAN (IR+24-digit)
- **Audit logging**:
  - `CopilotAudit` entity — resourceType, resourceId, correlationId, tenantId, actorUserId, aiEnabledHeader, policyAllowed, decision, blockedReason, outputPreview, outputRedacted
  - `auditLogger` در تمام endpoint‌ها
  - Audit record در هر AI operation (allowed/blocked)
- **Persian language support** — prompt‌ها و system prompt‌ها به فارسی
- **Currency formatting** — `formatCurrencyIRR` با `fa-IR` locale
- `JwtAuthGuard` و `PermissionsGuard` در تمام endpoint‌ها
- ۶ permission: claims:summary, documents:summary, qa, next-best-action, view, manage
- RBAC با ۴ نقش
- Correlation ID
- Proper HTTP status codes
- `reflect-metadata` import
- `createLogger` از shared package

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| CP-001 | بحرانی | **`synchronize` در production غیرفعال نیست** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| CP-002 | بحرانی | **Schema پیش‌فرض `public`** — عدم schema isolation — برخلاف سایر سرویس‌ها |
| CP-003 | متوسط | **Hardcoded return values در AI features** — `assistUnderwriting` همیشه `confidence: 0.85, riskLevel: 'medium'` برمی‌گرداند، `triageComplaint` همیشه `category: 'فنی', priority: 'medium'`، `discoverRecovery` همیشه hardcoded values — LLM response نادیده گرفته می‌شود |
| CP-004 | متوسط | **`latencyMs: 0` در audit** — همیشه ۰ ثبت می‌شود — عدم actual latency measurement |
| CP-005 | متوسط | **عدم Kafka integration** — نه consumer نه producer — عدم event-driven integration |
| CP-006 | متوسط | **`Object.assign(card, params)` در `updateModelCard`** — mass assignment vulnerability |
| CP-007 | متوسط | **عدم tenantId در Model Inventory** — ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport فیلد tenantId ندارند — عدم multi-tenancy در AI governance |
| CP-008 | متوسط | **`askQuestion` و `getNextBestAction` فقط claim context پیاده‌سازی شده** — policy و complaint context: "Context not available for this resource type in this implementation" |
| CP-009 | متوسط | **`getClaimSummary` و `getDocumentSummary` از LLM استفاده نمی‌کنند** — فقط template-based summary — `generateLLMSummary` تعریف شده اما در `getClaimSummary` صدا زده نمی‌شود |
| CP-010 | کم | **API key در URL برای Gemini** — `?key=${config.apiKey}` در query string — در log‌ها ممکن است leak شود |
| CP-011 | کم | **عدم input validation** — هیچ validation در controller‌ها — `@Body() body: any` |
| CP-012 | کم | **عدم rate limiting** — unlimited LLM calls — هزینه و abuse |
| CP-013 | کم | **عدم LLM response caching** — هر request یک LLM call جدید |
| CP-014 | کم | **`httpGetJson` و `httpPost` با raw `node:http`/`node:https`** — عدم استفاده از `@nestjs/axios` یا `HttpModule` — عدم retry, interceptors, etc. |
| CP-015 | کم | **`assistSelfService` با `copilot:view` permission** — مشتریان می‌توانند LLM calls انجام دهند — عدم proper permission scoping |
| CP-016 | کم | **عدم Outbox pattern** — عدم reliable event publishing |
| CP-DEC | متوسط | **همپوشانی مالکیت AI Governance** — copilot-service شامل entity‌های AI Governance (ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport) است که با ai-governance-service و model-switchboard-service تداخل دارد — سه سرویس مستقل AI governance پیاده‌سازی کرده‌اند بدون مالکیت مشخص — عدم tenantId در copilot-service governance entities (CP-007) در حالی که model-switchboard-service tenant isolation دارد |

**درجه‌بندی منطق پیاده‌سازی:** **۶/۱۰** — LLM provider abstraction با ۴ provider و fallback، AI governance کامل (Model Inventory, Risk Assessment, Incident Report, Model Card, Validation Report)، ۹ AI copilot feature، AI policy evaluation با feature flag، data redaction، audit logging، Persian language support اما hardcoded return values در AI features (LLM response نادیده گرفته می‌شود)، `getClaimSummary`/`getDocumentSummary` بدون LLM، `askQuestion`/`getNextBestAction` فقط claim context، `latencyMs: 0`، و عدم Kafka integration

#### ۲۴.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۸ entity
- ۲ migration
- `CopilotAudit` برای audit trail
- Model Inventory با ۵ entity مرتبط (ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport)
- Pagination در `listModels` و `listIncidents`
- `createLogger` از shared package

**اشکالات:**
- **`synchronize` در production فعال** (CP-001) — بحرانی
- **Schema پیش‌فرض `public`** (CP-002) — بحرانی — عدم isolation
- عدم tenantId در AI governance entities (CP-007)
- عدم connection pool tuning
- عدم Outbox pattern (CP-016)

**درجه‌بندی پایگاه‌داده:** **۵/۱۰**

#### ۲۴.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در تمام endpoint‌ها
- ۶ permission تخصصی
- RBAC با ۴ نقش
- `@RequirePermissions` در تمام endpoint‌ها
- **AI Policy evaluation** — `x-ai-enabled` header + feature flag
- **Data redaction** — National ID, Card, IBAN
- **Audit logging** — CopilotAudit با decision, blockedReason, outputPreview, outputRedacted
- `auditLogger` در تمام endpoint‌ها
- Proper HTTP status codes
- Correlation ID

**اشکالات:**
- **`synchronize` در production فعال** (CP-001) — بحرانی
- **Schema `public`** (CP-002) — بحرانی — عدم isolation
- **Mass assignment در `updateModelCard`** (CP-006)
- **API key در URL برای Gemini** (CP-010)
- عدم AbacGuard و TenantGuard
- عدم tenantId در AI governance (CP-007)
- عدم input validation (CP-011)
- عدم rate limiting (CP-012)
- عدم security headers
- `assistSelfService` با `copilot:view` permission (CP-015)

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۲۴.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **LLM provider integration** با ۴ provider (OpenAI, Gemini, DeepSeek, Ollama)
- **Feature flag integration** — `ai.enabled`, `copilot.enabled` از feature-flags-service
- `createLogger` از shared package
- Correlation ID
- `reflect-metadata` import
- Audit logging برای AI governance
- Persian language support
- `HttpModule`-equivalent (raw `node:http`/`node:https`)

**اشکالات:**
- عدم Kafka integration (CP-005) — نه consumer نه producer
- عدم Outbox pattern (CP-016)
- عدم auth token forwarding به LLM providers
- عدم LLM response caching (CP-013)
- `httpGetJson` و `httpPost` با raw `node:http`/`node:https` (CP-014) — عدم retry, interceptors
- `askQuestion` و `getNextBestAction` فقط claim context (CP-008)
- `getClaimSummary`/`getDocumentSummary` بدون LLM (CP-009)

**درجه‌بندی ادغام:** **۵/۱۰**

#### جمع‌بندی copilot-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۶/۱۰ |
| پایگاه‌داده | ۵/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۵/۱۰ |
| **کل** | **۵/۱۰** |

**وضعیت کلی:** سرویس AI Copilot با LLM provider abstraction (OpenAI, Gemini, DeepSeek, Ollama) و fallback chain، AI governance کامل (Model Inventory, Risk Assessment, Incident Report, Model Card, Validation Report)، ۹ AI copilot feature (claim summary, document summary, Q&A, next-best-action, underwriting assist, complaint triage, recovery discovery, pricing assist, self-service)، AI policy evaluation با feature flag و header، data redaction (National ID, Card, IBAN)، و audit logging. اما **`synchronize` در production فعال** (بحرانی)، **schema `public`** (بحرانی — عدم isolation)، **hardcoded return values در AI features** (LLM response نادیده گرفته می‌شود)، **`getClaimSummary`/`getDocumentSummary` بدون LLM**، **`askQuestion`/`getNextBestAction` فقط claim context**، **عدم Kafka integration**، **`latencyMs: 0`**، و **mass assignment در `updateModelCard`** از نواقص اصلی هستند. سرویس از نظر قابلیت‌های AI governance پیشرفته است اما از نظر استفاده واقعی از LLM در چند feature کلیدی ناقص است.

---

### ۲۵. agent-portal-service

**پورت:** 18031  
**مسیر پایه:** `/agent-portal`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: `agent_portal`)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @nestjs/axios, jsonwebtoken, rxjs

#### ۲۵.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۱ entity: `AgentSession` با `SessionStatus` enum (ACTIVE, EXPIRED, REVOKED)
- `@Index(['agentId', 'status'])` روی AgentSession
- **Session management**:
  - `createSession` — revoke existing active sessions برای agent، سپس session جدید
  - `validateSession` — بررسی status و expiry، auto-expire
  - `revokeSession` — revoke تک‌تک
  - `revokeAllAgentSessions` — revoke همه session‌های فعال یک agent
  - `cleanupExpiredSessions` — cleanup session‌های منقضی
  - `parseExpiresIn` — parse JWT expiresIn format (h/m/d)
- **Agent portal business logic** (همه از sales-network-service fetch می‌شوند):
  - `getDashboardStats` — totalPolicies, activePolicies, pendingPolicies, totalClaims, pendingClaims, totalCommission, pendingCommission, monthlyPremium, monthlyIssuance
  - `getAgentPolicies` — با filters (status, fromDate, toDate)
  - `getAgentClaims` — با filters
  - `getAgentCustomers` — با search
  - `getAgentCommissions` — با filters
  - `getAgentKPI` — daily/weekly/monthly
  - `getPremiumTrends` — monthly trends
  - `getCommissionHistory` — monthly history
  - `getPolicyPortfolio` — product breakdown
  - `getLeads` — lead management با status/priority
- **Retry logic**:
  - `fetchWithRetry` — max 3 retries با exponential backoff
  - `isRetryableError` — 5xx, 429, ECONNREFUSED, ETIMEDOUT, ENOTFOUND
- `HttpModule` از @nestjs/axios (برخلاف copilot-service که raw node:http استفاده می‌کرد)
- `JwtAuthGuard` و `PermissionsGuard` در تمام endpoint‌ها (controller-level)
- ۸ permission: session, dashboard, policies, claims, customers, commissions, kpi, leads
- RBAC با ۳ نقش (agent, branch_manager, insurer_admin)
- Correlation ID
- Typed interfaces برای تمام DTO‌ها
- `healthCheck` endpoint
- `audit.logger.ts` وجود دارد اما در controller استفاده نمی‌شود

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| AP-001 | بحرانی | **`synchronize` در production غیرفعال نیست** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| AP-002 | بحرانی | **`jwtToken` plaintext در DB** — `jwtToken` در `AgentSession` به صورت plaintext ذخیره می‌شود — سرقت session |
| AP-003 | متوسط | **`tenantId` و `authToken` در controller‌ها استفاده نمی‌شوند** — `getDashboardStats` و سایر متدها `tenantId` و `authToken` به عنوان پارامتر اختیاری دارند اما controller‌ها این مقادیر را از headers استخراج نمی‌کنند و پاس نمی‌دهند — عدم tenant isolation و auth forwarding |
| AP-004 | متوسط | **`cleanupExpiredSessions` با MongoDB syntax** — `expiresAt: { $lt: new Date() } as any` — این syntax در TypeORM/PostgreSQL کار نمی‌کند — باید `LessThan(new Date())` استفاده شود |
| AP-005 | متوسط | **عدم auth token forwarding به sales-network-service** — `authToken` همیشه undefined است چون controller آن را استخراج نمی‌کند — sales-network-service بدون auth token فراخوانی می‌شود |
| AP-006 | متوسط | **`parseExpiresIn` برای 'd' (روز) اشتباه محاسبه می‌کند** — `value * 8640000` به جای `value * 86400000` — صفر کم است |
| AP-007 | متوسط | **`audit.logger.ts` وجود دارد اما استفاده نمی‌شود** — عدم audit logging در endpoint‌ها |
| AP-008 | متوسط | **عدم Kafka integration** — نه consumer نه producer — عدم event-driven integration |
| AP-009 | کم | **عدم input validation** — هیچ validation در controller‌ها — `@Body() body: any` در `createSession` |
| AP-010 | کم | **`getDashboardStats` در صورت خطا zero stats برمی‌گرداند** — عدم propagate error به client — data inconsistency |
| AP-011 | کم | **`getPremiumTrends`, `getCommissionHistory`, `getPolicyPortfolio`, `getLeads` در صورت خطا empty array برمی‌گردانند** — عدم propagate error — client نمی‌داند خطا رخ داده |
| AP-012 | کم | **عدم pagination** — هیچ endpointی pagination ندارد — potential large responses |
| AP-013 | کم | **عدم Outbox pattern** — عدم reliable event publishing |
| AP-014 | کم | **عدم rate limiting** |
| AP-015 | کم | **عدم security headers** |
| AP-016 | کم | **`healthCheck` همیشه `healthy: true` برمی‌گرداند** — عدم actual health check (DB, sales-network-service connectivity) |
| AP-DEC | متوسط | **عدم مالکیت داده** — agent-portal-service تمام business data را از sales-network-service fetch می‌کند (pure proxy) — هیچ داده‌ای متعلق به خود ندارد — مرز بین agent-portal و sales-network مشخص نیست — عدم tenant isolation و auth forwarding (AP-003, AP-005) نشان‌دهنده تجزیه نامناسب BFF pattern — عدم Kafka integration (AP-008) — سرویس عملاً یک thin proxy است نه domain service مستقل |

**درجه‌بندی منطق پیاده‌سازی:** **۶/۱۰** — Session management کامل (create, validate, revoke, cleanup)، ۱۱ business endpoint (dashboard, policies, claims, customers, commissions, KPI, premium trends, commission history, policy portfolio, leads, health)، retry logic با exponential backoff، HttpModule از @nestjs/axios، typed interfaces، RBAC با ۸ permission اما `jwtToken` plaintext در DB (بحرانی)، `tenantId`/`authToken` در controller‌ها استفاده نمی‌شوند، `cleanupExpiredSessions` با MongoDB syntax، `parseExpiresIn` bug برای 'd'، عدم audit logging، و عدم pagination

#### ۲۵.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- Schema isolation: `agent_portal`
- ۱ entity: `AgentSession` با proper indexing
- ۱ migration
- `HttpModule` از @nestjs/axios
- External dependency: sales-network-service (port 3022)

**اشکالات:**
- **`synchronize` در production فعال** (AP-001) — بحرانی
- **`jwtToken` plaintext در DB** (AP-002) — بحرانی
- **`cleanupExpiredSessions` با MongoDB syntax** (AP-004) — کار نمی‌کند
- عدم Outbox pattern (AP-013)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۵/۱۰**

#### ۲۵.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در controller-level (تمام endpoint‌ها)
- ۸ permission تخصصی
- RBAC با ۳ نقش
- `@RequirePermissions` در تمام endpoint‌ها
- Session revocation (single و bulk)
- Auto-expire session‌ها
- Correlation ID

**اشکالات:**
- **`jwtToken` plaintext در DB** (AP-002) — بحرانی — سرقت session
- **`synchronize` در production فعال** (AP-001) — بحرانی
- **عدم tenant isolation** — `tenantId` در controller‌ها استخراج نمی‌شود (AP-003)
- **عدم auth token forwarding** — sales-network-service بدون auth فراخوانی می‌شود (AP-005)
- عدم audit logging (AP-007)
- عدم input validation (AP-009)
- عدم AbacGuard و TenantGuard
- عدم rate limiting (AP-014)
- عدم security headers (AP-015)

**درجه‌بندی امنیتی:** **۴/۱۰**

#### ۲۵.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **sales-network-service integration** — ۱۱ endpoint proxy به sales-network-service
- `HttpModule` از @nestjs/axios (proper HTTP client)
- Retry logic با exponential backoff
- `isRetryableError` — proper error classification
- Correlation ID
- Typed interfaces برای تمام DTO‌ها
- `jsonwebtoken` import (اما استفاده نمی‌شود)

**اشکالات:**
- عدم auth token forwarding به sales-network-service (AP-005)
- عدم Kafka integration (AP-008) — نه consumer نه producer
- عدم Outbox pattern (AP-013)
- عدم tenantId forwarding (AP-003)
- `healthCheck` همیشه `healthy: true` — عدم actual health check (AP-016)
- `getDashboardStats` و برخی endpoint‌ها در صورت خطا default/empty برمی‌گردانند — عدم propagate error (AP-010, AP-011)

**درجه‌بندی ادغام:** **۵/۱۰**

#### جمع‌بندی agent-portal-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۶/۱۰ |
| پایگاه‌داده | ۵/۱۰ |
| امنیتی | ۴/۱۰ |
| ادغام | ۵/۱۰ |
| **کل** | **۵/۱۰** |

**وضعیت کلی:** سرویس Agent Portal با session management کامل (create, validate, revoke, cleanup)، ۱۱ business endpoint (dashboard, policies, claims, customers, commissions, KPI, premium trends, commission history, policy portfolio, leads, health)، retry logic با exponential backoff، HttpModule از @nestjs/axios، typed interfaces، و RBAC با ۸ permission. تمام business data از sales-network-service fetch می‌شود (proxy pattern). اما **`jwtToken` plaintext در DB** (بحرانی — سرقت session)، **`synchronize` در production فعال** (بحرانی)، **`tenantId`/`authToken` در controller‌ها استفاده نمی‌شوند** (عدم tenant isolation و auth forwarding)، **`cleanupExpiredSessions` با MongoDB syntax** (کار نمی‌کند در PostgreSQL)، **`parseExpiresIn` bug برای 'd'**، **عدم audit logging**، و **عدم Kafka integration** از نواقص اصلی هستند. سرویس به‌عنوان proxy به sales-network-service عمل می‌کند اما tenant isolation و auth forwarding ناقص است.

---

### ۲۶. knowledge-service + knowledge-layer-service

**پورت:** 18033  
**مسیر پایه:** `/knowledge`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: `knowledge` — مشترک بین دو سرویس)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** fetch API (embedding service)

#### ۲۶.۱ وضعیت منطق پیاده‌سازی

**knowledge-service:**

**نقاط قوت:**
- ۴ entity: `KnowledgeArticle`, `KnowledgeGraphEntity`, `KnowledgeGraphRelationship`, `NextBestAction`
- **Knowledge Article management**:
  - `createArticle` — با status DRAFT، tenantId، category، tags، authorId، metadata
  - `publishArticle` — DRAFT → PUBLISHED
  - `searchArticles` — PostgreSQL full-text search با `to_tsvector`/`to_tsquery`، `buildTsQuery` برای prefix matching
  - `getArticle`, `updateArticle`, `deleteArticle`, `listArticles`
  - `incrementViewCount`
  - Pagination با cap (max 100)
  - Default to PUBLISHED برای search
- **Knowledge Graph**:
  - `createEntity` — با entityType، aliases، properties، embedding، embeddingModel
  - `getEntity`, `listEntities`, `updateEntity`, `deleteEntity`
  - `createRelationship` — source/target entity، relationshipType، weight، properties
  - `getRelationship`, `listRelationships`, `deleteRelationship`
  - `getEntityNeighbors` — graph traversal (depth 1)
  - `semanticSearch` — cosine similarity روی embedding‌ها با threshold
  - `cosineSimilarity` — proper implementation
  - `retrieveKnowledgeForGrounding` — ترکیب full-text search و semantic search برای RAG grounding
- **Next Best Action (NBA)**:
  - `createNba` — با trigger، priority، channels، CTA، context، scheduledAt
  - `getRecommendations` — با priority ordering و 30-day executed filter
  - `executeNba` — mark as executed
  - `listNbas` — با filters
- Tenant isolation در تمام query‌ها
- Correlation ID
- ۱ migration

**اشکالات knowledge-service:**

| ID | شدت | توضیح |
|----|------|-------|
| KS-001 | بحرانی | **عدم authentication و authorization** — هیچ JwtAuthGuard یا PermissionsGuard وجود ندارد — تمام endpoint‌ها بدون auth قابل دسترسی هستند |
| KS-002 | بحرانی | **`synchronize` در production غیرفعال نیست** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| KS-003 | متوسط | **`getEntityNeighbors` فقط depth 1** — `maxDepth` parameter نادیده گرفته می‌شود — همیشه فقط مستقیم neighbors |
| KS-004 | متوسط | **`semanticSearch` تمام entity‌ها را در memory load می‌کند** — عدم vector index (pgvector) — N+1 query problem |
| KS-005 | متوسط | **عدم Kafka integration** — نه consumer نه producer |
| KS-006 | متوسط | **`retrieveKnowledgeForGrounding` بدون queryEmbedding به listEntities fallback می‌شود** — semantic search ناقص |
| KS-007 | کم | **عدم input validation** — `@Body() body: any` در `createNba` |
| KS-008 | کم | **`getEntityNeighbors` N+1 query** — برای هر relationship یک separate query برای targetEntity |
| KS-009 | کم | **عدم audit logging** |
| KS-010 | کم | **عدم Outbox pattern** |

**knowledge-layer-service:**

**نقاط قوت:**
- ۲ entity: `Document`, `DocumentChunk`
- **Document indexing pipeline**:
  - `indexDocument` — create/update با externalId deduplication
  - `processDocument` — chunking + embedding generation + status management
  - `chunkDocument` — character-based chunking با overlap و word boundary detection
  - `generateEmbeddings` — real embedding API integration (EMBEDDING_API_URL) با fallback to mock
  - `generateMockEmbeddings` — seeded random embeddings (deterministic)
  - Document-level و chunk-level embeddings
  - `reindexDocument` — re-process با chunk deletion
  - `deleteDocument` — cascade delete chunks
  - `getDocument`, `getDocumentByExternalId`, `getDocuments`
  - `getStats` — totalDocuments, indexedDocuments, pendingDocuments, failedDocuments, documentsByType, documentsByLanguage
- **Semantic search**:
  - `search` — query embedding + cosine similarity روی document و chunk embeddings
  - Threshold-based filtering
  - Chunk-level matching با top-5 chunks
  - Score-based sorting
- `DocumentStatus` enum (PENDING, INDEXED, FAILED)
- `DocumentType` enum (POLICY, CLAIM, CONTRACT, REGULATION, FAQ, MANUAL, OTHER)
- `JwtAuthGuard` و `PermissionsGuard` در تمام endpoint‌ها (controller-level)
- ۶ permission: index, search, view, delete, reindex, admin
- RBAC با ۱۱ نقش
- `reflect-metadata` import
- Configurable embedding model (default: text-embedding-3-small)
- Configurable embedding dimensions (default: 1536)
- Language support (default: `fa`)
- ۱ migration

**اشکالات knowledge-layer-service:**

| ID | شدت | توضیح |
|----|------|-------|
| KL-001 | بحرانی | **`synchronize` در production غیرفعال نیست** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| KL-002 | متوسط | **همان schema `knowledge` با knowledge-service** — دو سرویس روی همان schema — ریسک conflict |
| KL-003 | متوسط | **`search` تمام indexed document‌ها را در memory load می‌کند** — عدم vector index (pgvector) — برای هر document cosine similarity محاسبه می‌شود — scalability issue |
| KL-004 | متوسط | **`generateMockEmbeddings` fallback** — در صورت عدم config کردن EMBEDDING_API_URL، mock embeddings استفاده می‌شود — search نتایج بی‌معنی |
| KL-005 | متوسط | **`getDocuments` با `@Body()` به جای `@Query()`** — GET request با body — غیر standard |
| KL-006 | متوسط | **عدم Kafka integration** — نه consumer نه producer |
| KL-007 | کم | **`chunkDocument` character-based** — عدم semantic chunking — برای متن فارسی ممکن است کلمات را بشکند |
| KL-008 | کم | **`generateSummary` فقط ۲۰۰ کاراکتر اول** — عدم real summarization |
| KL-009 | کم | **عدم input validation** — `@Body() params: IndexDocumentParams` بدون DTO validation |
| KL-010 | کم | **عدم audit logging** — `audit.logger.ts` وجود دارد اما استفاده نمی‌شود |
| KL-011 | کم | **عدم Outbox pattern** |
| KL-012 | کم | **`getStats` N+1 query** — برای هر `DocumentType` یک separate count query + تمام document‌ها را برای language select می‌کند |
| KL-013 | کم | **Port conflict** — هر دو سرویس `3035` به عنوان default port استفاده می‌کنند |
| KL-DEC | متوسط | **تجزیه نامناسب knowledge domain** — دو سرویس مجزا (knowledge-service و knowledge-layer-service) با همان schema (`knowledge`) و port (`3035`) — مرز مشخص بین knowledge management (articles, graph, NBA) و knowledge indexing (document chunking, embedding) تعریف نشده — entity conflict و port conflict محتمل — عدم مالکیت واحد برای knowledge domain — knowledge-service بدون authentication (KS-001) در حالی که knowledge-layer-service دارای auth است |

**درجه‌بندی منطق پیاده‌سازی:** **۶/۱۰** — knowledge-service با Knowledge Article management (full-text search، pagination)، Knowledge Graph (entity/relationship CRUD، semantic search، graph traversal، RAG grounding)، NBA engine (create، recommend، execute) و knowledge-layer-service با document indexing pipeline (chunking، embedding API integration، mock fallback)، semantic search (cosine similarity، chunk-level matching)، document CRUD، stats. اما عدم auth در knowledge-service (بحرانی)، `synchronize` در production (بحرانی)، عدم vector index (pgvector)، N+1 queries، same schema conflict، port conflict، و عدم Kafka integration از نواقص اصلی هستند.

#### ۲۶.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- Schema: `knowledge` (مشترک بین دو سرویس)
- ۶ entity مجموعاً (۴ + ۲)
- ۲ migration (۱ + ۱)
- PostgreSQL full-text search (`to_tsvector`/`to_tsquery`)
- JSONB برای tags، properties، metadata، embedding
- Tenant isolation در knowledge-service
- External dependency: Embedding API (EMBEDDING_API_URL)

**اشکالات:**
- **`synchronize` در production فعال** (KS-002, KL-001) — بحرانی
- **همان schema `knowledge` برای دو سرویس** (KL-002) — ریسک conflict
- عدم vector index (pgvector) (KS-004, KL-003) — scalability issue
- عدم Outbox pattern (KS-010, KL-011)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۵/۱۰**

#### ۲۶.۳ وضعیت امنیتی

**نقاط قوت:**
- knowledge-layer-service: `@UseGuards(JwtAuthGuard, PermissionsGuard)` در controller-level
- ۶ permission تخصصی در knowledge-layer-service
- RBAC با ۱۱ نقش در knowledge-layer-service
- Tenant isolation در knowledge-service query‌ها

**اشکالات:**
- **عدم authentication در knowledge-service** (KS-001) — بحرانی — تمام endpoint‌ها بدون auth
- **`synchronize` در production فعال** (KS-002, KL-001) — بحرانی
- عدم audit logging در هر دو سرویس (KS-009, KL-010)
- عدم input validation (KS-007, KL-009)
- عدم AbacGuard و TenantGuard
- عدم rate limiting
- عدم security headers
- `audit.logger.ts` در knowledge-layer-service وجود دارد اما استفاده نمی‌شود (KL-010)

**درجه‌بندی امنیتی:** **۳/۱۰**

#### ۲۶.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Embedding API integration** در knowledge-layer-service (EMBEDDING_API_URL, configurable model/dimensions)
- **RAG grounding** در knowledge-service (`retrieveKnowledgeForGrounding` — ترکیب full-text و semantic search)
- PostgreSQL full-text search
- Knowledge Graph با semantic search
- Correlation ID در knowledge-service
- `reflect-metadata` import در knowledge-layer-service

**اشکالات:**
- عدم Kafka integration (KS-005, KL-006) — نه consumer نه producer
- عدم Outbox pattern (KS-010, KL-011)
- عدم LLM integration (فقط embedding)
- Port conflict — هر دو سرویس `3035` (KL-013)
- `retrieveKnowledgeForGrounding` بدون queryEmbedding ناقص (KS-006)
- Mock embeddings fallback نتایج بی‌معنی (KL-004)

**درجه‌بندی ادغام:** **۵/۱۰**

#### جمع‌بندی knowledge-service + knowledge-layer-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۶/۱۰ |
| پایگاه‌داده | ۵/۱۰ |
| امنیتی | ۳/۱۰ |
| ادغام | ۵/۱۰ |
| **کل** | **۵/۱۰** |

**وضعیت کلی:** دو سرویس knowledge با responsibility‌های متفاوت: knowledge-service (knowledge article management با full-text search، knowledge graph با entity/relationship CRUD و semantic search و graph traversal، RAG grounding برای LLM، NBA engine) و knowledge-layer-service (document indexing pipeline با chunking و embedding API integration، semantic search با cosine similarity و chunk-level matching، document CRUD، stats). اما **عدم authentication در knowledge-service** (بحرانی — تمام endpoint‌ها بدون auth)، **`synchronize` در production فعال** (بحرانی)، **همان schema `knowledge` برای دو سرویس** (ریسک conflict)، **عدم vector index (pgvector)** (scalability issue — تمام embeddings در memory load می‌شوند)، **port conflict** (هر دو 3035)، **mock embeddings fallback**، و **عدم Kafka integration** از نواقص اصلی هستند. سرویس‌ها از نظر قابلیت‌های knowledge management و RAG grounding پیشرفته هستند اما از نظر امنیتی و scalability ناقص هستند.

---

### ۲۷. model-switchboard-service

**پورت:** 18035  
**مسیر پایه:** `/model-switchboard`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: `model_switchboard`)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @nestjs/axios, @insurance/shared (audit.logger)

#### ۲۷.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۵ entity: `ModelDefinition`, `ModelInvocation`, `RoutePolicy`, `UsageRecord`, `ModelCard`
- **Model Management**:
  - `registerModel` — با modelKey, modelType, config (endpoint, provider, version, parameters, capabilities), priority, status (DRAFT)
  - `activateModel` — DRAFT → ACTIVE
  - `getModel`, `listModels` — با tenantId, modelType, status filters و pagination (max 200)
- **Model Invocation**:
  - `invokeModel` — select best model → call endpoint → record invocation با latency, status, error
  - `selectBestModel` — criteria-based filtering (maxCost, minAccuracy, maxRisk) و prioritization (cost, accuracy, risk, priority)
  - `callModelEndpoint` — HTTP POST به model endpoint با apiKey auth و configurable timeout
  - `listInvocations` — با tenantId, modelKey, businessKey, status filters و pagination
- **Route Policy**:
  - `createRoutePolicy` — capability, primaryModel, fallbackChain, qualityThreshold, costBudgetPerDay, routingStrategy (BALANCED), tenantId (wildcard `*` support)
  - `updateRoutePolicy`, `getRoutePolicy`, `listRoutePolicies`, `deleteRoutePolicy`
  - `route` — tenant-specific first, then wildcard; cost budget check با daily spend aggregation; fallback chain traversal
- **Usage Recording & Reporting**:
  - `recordUsage` — inputTokens, outputTokens, totalTokens, costMicroCents, latencyMs, qualityScore, periodStart/End
  - `getUsageReport` — با tenantId, modelId, capability, period filters و pagination
  - `getUsageSummary` — aggregate (SUM tokens, SUM cost, AVG latency, AVG quality, COUNT invocations) GROUP BY modelId
- **Model Health**:
  - `getModelsHealth` — per-model avgLatencyMs, errorRate, recentInvocations (last 1 hour)
- **Model Card (AI Governance)**:
  - `createModelCard` — modelId, purpose, intendedUse, limitations, trainingDataDescription, performanceMetrics, biasRiskLevel, fairnessAudit, explainability, version
  - `getModelCard`, `listModelCards`, `updateModelCard`
  - `approveModelCard` — draft → approved با approvedBy, approvedAt
  - `deprecateModelCard` — approved → deprecated
- `auditLogger` در RoutePolicy CRUD و usage recording و routing fallback
- `HttpModule` از @nestjs/axios
- `JwtAuthGuard` و `PermissionsGuard` در تمام endpoint‌ها (controller-level)
- ۸ permission: manage, view, manage_models, manage_policies, route, record_usage, view_usage, admin
- RBAC با ۱۱ نقش
- Correlation ID
- Pagination با cap (max 200)
- Tenant isolation در model و invocation queries
- ۱ migration

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| MS-001 | بحرانی | **`synchronize` در production غیرفعال نیست** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| MS-002 | متوسط | **`Object.assign(policy, params)` در `updateRoutePolicy`** — mass assignment vulnerability |
| MS-003 | متوسط | **`Object.assign(card, updates)` در `updateModelCard`** — mass assignment vulnerability |
| MS-004 | متوسط | **`callModelEndpoint` API key از `model.config.parameters.apiKey`** — API key در DB plaintext ذخیره می‌شود |
| MS-005 | متوسط | **`invokeModel` عدم fallback chain** — اگر `callModelEndpoint` fail کند، fallback chain استفاده نمی‌شود — فقط `selectBestModel` یک model برمی‌گرداند |
| MS-006 | متوسط | **`route` با `order: { tenantId: 'DESC' }`** — tenant-specific قبل از wildcard — اما `DESC` روی string tenantId ممکن است predictable نباشد |
| MS-007 | متوسط | **`getModelsHealth` N+1 query** — برای هر active model یک separate query برای recent invocations |
| MS-008 | متوسط | **عدم Kafka integration** — نه consumer نه producer — عدم event-driven integration |
| MS-009 | متوسط | **`selectBestModel` تمام active models را در memory load می‌کند** — عدم DB-level filtering برای criteria |
| MS-010 | کم | **عدم input validation** — `@Body() body: any` در `createModelCard`, `updateModelCard` |
| MS-011 | کم | **عدم rate limiting** — unlimited model invocations |
| MS-012 | کم | **عدم Outbox pattern** |
| MS-013 | کم | **عدم security headers** |
| MS-014 | کم | **`getModel` و `getRoutePolicy` عدم tenantId check** — cross-tenant data access ممکن است |
| MS-015 | کم | **عدم retry در `callModelEndpoint`** — single attempt — اگر model endpoint transiently unavailable باشد |
| MS-DEC | متوسط | **همپوشانی مالکیت AI Governance** — model-switchboard-service شامل ModelCard entity با approve/deprecate workflow است که با copilot-service (ModelCard, ModelValidationReport) و ai-governance-service (ModelInventory lifecycle) تداخل دارد — سه سرویس مستقل AI governance/model management پیاده‌سازی کرده‌اند بدون مالکیت واحد |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Model management (register, activate, list)، model invocation با criteria-based selection (cost, accuracy, risk, priority)، route policy با fallback chain و cost budget check، usage recording با token/cost/latency/quality tracking، usage summary aggregation، model health monitoring، model card governance (create, approve, deprecate)، audit logging، HttpModule، RBAC با ۸ permission و ۱۱ نقش. اما `synchronize` در production (بحرانی)، mass assignment در updateRoutePolicy و updateModelCard، API key plaintext در DB، عدم fallback در invokeModel، N+1 queries، و عدم Kafka integration از نواقص اصلی هستند.

#### ۲۷.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- Schema isolation: `model_switchboard`
- ۵ entity با proper relationships
- ۱ migration
- `HttpModule` از @nestjs/axios
- Pagination با cap (max 200)
- Tenant isolation در model و invocation queries
- Aggregate queries برای usage summary
- Cost budget tracking با daily spend aggregation

**اشکالات:**
- **`synchronize` در production فعال** (MS-001) — بحرانی
- **API key plaintext در DB** (MS-004) — در `model.config.parameters.apiKey`
- عدم Outbox pattern (MS-012)
- عدم connection pool tuning
- `getModelsHealth` N+1 query (MS-007)

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۲۷.۳ وضعیت امنیتی

**نقاط قوت:**
- `@UseGuards(JwtAuthGuard, PermissionsGuard)` در controller-level (تمام endpoint‌ها)
- ۸ permission تخصصی
- RBAC با ۱۱ نقش
- `@RequirePermissions` در تمام endpoint‌ها
- `auditLogger` در RoutePolicy CRUD و routing fallback و usage recording
- Correlation ID
- API key auth در model endpoint calls

**اشکالات:**
- **`synchronize` در production فعال** (MS-001) — بحرانی
- **Mass assignment در `updateRoutePolicy`** (MS-002) — `Object.assign(policy, params)`
- **Mass assignment در `updateModelCard`** (MS-003) — `Object.assign(card, updates)`
- **API key plaintext در DB** (MS-004)
- عدم input validation (MS-010)
- عدم AbacGuard و TenantGuard
- عدم rate limiting (MS-011)
- عدم security headers (MS-013)
- `getModel` و `getRoutePolicy` عدم tenantId check (MS-014) — cross-tenant access

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۲۷.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Model endpoint integration** — HTTP POST به configurable endpoints با apiKey auth و timeout
- **Route policy با fallback chain** — primary + fallback models
- **Cost budget management** — daily spend tracking با budget enforcement
- **Usage tracking** — tokens, cost, latency, quality score
- **Model health monitoring** — avgLatency, errorRate, recentInvocations
- `HttpModule` از @nestjs/axios
- `auditLogger` از shared infrastructure
- Correlation ID
- Tenant-specific و wildcard route policies

**اشکالات:**
- عدم Kafka integration (MS-008) — نه consumer نه producer
- عدم Outbox pattern (MS-012)
- عدم fallback در `invokeModel` (MS-005) — فقط `selectBestModel`، fallback chain در route استفاده می‌شود اما در invoke نه
- عدم retry در `callModelEndpoint` (MS-015)
- `selectBestModel` در memory filtering (MS-009) — عدم DB-level criteria filtering
- `getModelsHealth` N+1 query (MS-007)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی model-switchboard-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس Model Switchboard با model management (register, activate, list)، model invocation با criteria-based selection (cost, accuracy, risk, priority)، route policy با fallback chain و cost budget enforcement، usage recording با token/cost/latency/quality tracking، usage summary aggregation، model health monitoring، و model card governance (create, approve, deprecate). ۵ entity، ۸ permission، RBAC با ۱۱ نقش، audit logging، HttpModule از @nestjs/axios. اما **`synchronize` در production فعال** (بحرانی)، **mass assignment در `updateRoutePolicy` و `updateModelCard`**، **API key plaintext در DB**، **عدم fallback در `invokeModel`** (فقط `selectBestModel`، fallback chain در route استفاده می‌شود اما در invoke نه)، **N+1 queries در `getModelsHealth`**، و **عدم Kafka integration** از نواقص اصلی هستند. سرویس از نظر قابلیت‌های model routing و usage tracking پیشرفته است اما از نظر امنیتی (mass assignment, API key) و integration (عدم fallback در invoke, عدم Kafka) ناقص است.

---

### ۲۸. ai-governance-service

**پورت:** 18036  
**مسیر پایه:** `/models`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: از `@insurance/shared` `createDataSource`)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** @insurance/shared (createLogger, createDataSource), axios, @nestjs/swagger

#### ۲۸.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۱ entity: `ModelInventory` با ۳ index (`modelType+status`, `status+createdAt`, `version+modelType`)
- `ModelType` (llm, ml, ocr, embedding, other), `ModelStatus` (development, testing, staging, production, deprecated, retired), `ModelRiskLevel` (low, medium, high, critical)
- **Model Intake Controller** (با Swagger decorators):
  - `registerModel` — با modelName, modelType, version, provider, description, parameters, trainingDataSummary, performanceMetrics, tags, metadata, createdBy
  - `listModels` — تمام model‌ها (بدون pagination)
  - `getModel` — by modelId
  - `getModelState` — current status, allowed transitions, riskLevel, deploymentDate, nextEvaluationDate
  - `transitionModel` — state transition با approval check
  - `updateModel` — metadata update (description, parameters, performanceMetrics, tags, metadata, riskLevel)
  - `deleteModel` — soft delete (اما `modelRepository.remove` — hard delete)
  - `getModelsByStatus`
  - `getModelsNeedingEvaluation` — models با nextEvaluationDate <= now و status IN (staging, production)
  - `retireDeprecatedModels` — auto-retire بعد از daysThreshold (default 90)
  - `getTransitionRules`
- **Model Lifecycle Service**:
  - State machine با ۸ transition:
    - development → testing (no approval, low/medium risk)
    - testing → staging (approval + validation report, low/medium risk)
    - staging → production (approval + validation report, low/medium/high risk)
    - production → deprecated (approval)
    - deprecated → retired (approval)
    - production → staging (rollback, approval)
    - staging → testing (rollback, no approval)
    - testing → development (rollback, no approval)
  - Risk level enforcement در transitions
  - Validation report requirement check
  - Auto-set deploymentDate برای production
  - Auto-set lastEvaluationDate و nextEvaluationDate (30 days) برای staging/production
  - `autoRetireDeprecatedModels` — threshold-based retirement
- **۸ service اضافی** (تمام in-memory با `Map`):
  - `AIIncidentResponseService` — incident management (create, assign, investigate, mitigate, resolve, close) با auto-assignment بر اساس severity
  - `DeploymentApprovalGateService` — approval workflow با policies (staging: 1 approver, production: 2 approvers), validation report و risk assessment requirements
  - `ValidationWorkflowService` — validation pipeline (functional, performance, security, bias, compliance, data_quality) با async execution و scoring
  - `CommitteeAuditTrailService` — committee decisions و members management با voting records
  - `MonitoringDashboardService` — metrics recording, anomaly detection (performance degradation, spike in errors, resource exhaustion, drift), drift metrics
  - `MroDashboardService` — dashboard metrics (تمام mock/hardcoded values)
  - `ModelSwitchboardGovernanceService` — model selection policies با use case authorization, rate limiting, circuit breaker
  - (۸ service از این ۷ تا در AppModule ثبت نشده‌اند — فقط `ModelLifecycleService` ثبت شده است)
- **۳ integration adapter**:
  - `DeploymentPipelineIntegration` — axios-based، deployment (canary, blue-green, rolling) با configurable endpoint
  - `ModelSwitchboardIntegration` — integration با model-switchboard-service
  - `MonitoringIntegration` — integration با monitoring service
- `createLogger` از `@insurance/shared` (structured logging)
- `@nestjs/swagger` decorators (ApiTags, ApiOperation, ApiResponse, ApiBearerAuth)
- `@insurance/shared` `createDataSource` (centralized DB config)
- `reflect-metadata` import
- Proper error handling با `BadRequestException`

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| AG-001 | بحرانی | **عدم authentication و authorization** — هیچ JwtAuthGuard یا PermissionsGuard وجود ندارد — `@ApiBearerAuth()` فقط Swagger metadata است — تمام endpoint‌ها بدون auth قابل دسترسی هستند |
| AG-002 | بحرانی | **۷ از ۸ service در AppModule ثبت نشده‌اند** — فقط `ModelLifecycleService` در providers است — `AIIncidentResponseService`, `DeploymentApprovalGateService`, `ValidationWorkflowService`, `CommitteeAuditTrailService`, `MonitoringDashboardService`, `MroDashboardService`, `ModelSwitchboardGovernanceService` همگی تعریف شده اما در DI container ثبت نشده‌اند — غیرقابل استفاده |
| AG-003 | بحرانی | **۷ از ۸ service در-memory با `Map` پیاده‌سازی شده‌اند** — عدم persistence — تمام داده‌ها در restart از بین می‌روند — عملاً non-functional |
| AG-004 | بحرانی | **`MroDashboardService` همگی mock/hardcoded values** — `getDashboardMetrics`, `getModelRiskSummary`, `getValidationTrends` همگی mock data برمی‌گردانند — عدم real DB queries |
| AG-005 | متوسط | **`synchronize` در production فعال** — `process.env.NODE_ENV !== 'production'` — بهتر است explicit `DB_SYNC` check شود |
| AG-006 | متوسط | **`deleteModel` hard delete انجام می‌دهد** — `modelRepository.remove(model)` — несмотря на comment "soft delete" — داده‌ها حذف می‌شوند |
| AG-007 | متوسط | **`listModels` بدون pagination** — تمام model‌ها در یک query — scalability issue |
| AG-008 | متوسط | **عدم tenant isolation** — هیچ tenantId در `ModelInventory` entity وجود ندارد — عدم multi-tenancy support |
| AG-009 | متوسط | **عدم Kafka integration** — نه consumer نه producer |
| AG-010 | متوسط | **۳ integration adapter در AppModule ثبت نشده‌اند** — `DeploymentPipelineIntegration`, `ModelSwitchboardIntegration`, `MonitoringIntegration` همگی تعریف شده اما در DI container ثبت نشده‌اند |
| AG-011 | متوسط | **عدم audit logging** — هیچ audit logger در controller یا service استفاده نمی‌شود |
| AG-012 | کم | **عدم input validation** — `@Body() createModelDto: CreateModelDto` بدون DTO validation (فقط interface) |
| AG-013 | کم | **عدم Correlation ID** |
| AG-014 | کم | **عدم Outbox pattern** |
| AG-015 | کم | **عدم rate limiting** |
| AG-016 | کم | **عدم security headers** |
| AG-017 | کم | **`ValidationWorkflowService.runValidation` simulate tests** — `executeTests` mock tests اجرا می‌کند — عدم real validation |
| AG-018 | کم | **`MonitoringDashboardService.detectAnomalies` in-memory** — عدم persistent anomaly tracking |
| AG-DEC | بحرانی | **بحران مالکیت AI Governance** — ai-governance-service به‌عنوان سرویس اصلی AI Governance تعریف شده اما: (۱) ۷ از ۸ service در AppModule ثبت نشده‌اند (AG-002)، (۲) ۷ service in-memory با Map هستند (AG-003)، (۳) copilot-service و model-switchboard-service نیز مستقلاً AI Governance entity‌هایی (ModelInventory, ModelCard) پیاده‌سازی کرده‌اند — عدم مالکیت واحد و تجزیه نامناسب در AI Governance domain — سرویس عملاً non-functional است |

**درجه‌بندی منطق پیاده‌سازی:** **۴/۱۰** — Model Intake Controller با CRUD و lifecycle management (state machine با ۸ transition، risk level enforcement، validation report requirement، auto-retire)، Swagger decorators، `@insurance/shared` integration. اما **۷ از ۸ service در AppModule ثبت نشده‌اند** (بحرانی — غیرقابل استفاده)، **۷ از ۸ service in-memory با Map** (بحرانی — عدم persistence)، **`MroDashboardService` همگی mock** (بحرانی)، **عدم authentication** (بحرانی)، **عدم tenant isolation**، **hard delete به جای soft delete**، و **عدم pagination** از نواقص اصلی هستند. سرویس از نظر طراحی governance features پیشرفته است اما از نظر implementation به‌شدت ناقص است — اکثر service‌ها غیرفعال هستند.

#### ۲۸.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- `@insurance/shared` `createDataSource` (centralized DB config)
- ۱ entity: `ModelInventory` با ۳ index
- Proper column naming (snake_case در DB, camelCase در code)
- `timestamptz` برای تاریخ‌ها
- JSONB برای parameters, performanceMetrics, metadata
- ۳ integration adapter (deployment pipeline, model switchboard, monitoring)

**اشکالات:**
- **`synchronize` در production فعال** (AG-005) — `NODE_ENV !== 'production'`
- **عدم tenant isolation** (AG-008) — هیچ tenantId در entity
- **۷ service in-memory بدون persistence** (AG-003)
- **۳ integration adapter ثبت نشده** (AG-010)
- عدم Outbox pattern (AG-014)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۴/۱۰**

#### ۲۸.۳ وضعیت امنیتی

**نقاط قوت:**
- `@ApiBearerAuth()` در تمام endpoint‌ها (Swagger metadata)
- `@nestjs/swagger` documentation
- `BadRequestException` برای invalid transitions
- Risk level enforcement در state transitions
- Approval requirement برای staging/production transitions

**اشکالات:**
- **عدم authentication و authorization** (AG-001) — بحرانی — `@ApiBearerAuth()` فقط Swagger metadata است — هیچ guard وجود ندارد
- **عدم audit logging** (AG-011)
- **عدم input validation** (AG-012)
- **عدم tenant isolation** (AG-008)
- **عدم rate limiting** (AG-015)
- **عدم security headers** (AG-016)
- **hard delete به جای soft delete** (AG-006)
- عدم Correlation ID (AG-013)

**درجه‌بندی امنیتی:** **۲/۱۰**

#### ۲۸.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- `@insurance/shared` (createLogger, createDataSource) — centralized infrastructure
- ۳ integration adapter:
  - `DeploymentPipelineIntegration` — axios-based، canary/blue-green/rolling deployment
  - `ModelSwitchboardIntegration` — integration با model-switchboard-service
  - `MonitoringIntegration` — integration با monitoring service
- `@nestjs/swagger` API documentation
- `createLogger` (structured logging با pino)
- Model lifecycle state machine با approval workflow
- Validation workflow با async execution

**اشکالات:**
- **۳ integration adapter در AppModule ثبت نشده‌اند** (AG-010) — غیرقابل استفاده
- **۷ service در AppModule ثبت نشده‌اند** (AG-002) — غیرقابل استفاده
- عدم Kafka integration (AG-009)
- عدم Outbox pattern (AG-014)
- عدم Correlation ID (AG-013)
- `MroDashboardService` mock data (AG-004)
- `ValidationWorkflowService` mock tests (AG-017)
- `MonitoringDashboardService` in-memory anomaly detection (AG-018)

**درجه‌بندی ادغام:** **۳/۱۰**

#### جمع‌بندی ai-governance-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۴/۱۰ |
| پایگاه‌داده | ۴/۱۰ |
| امنیتی | ۲/۱۰ |
| ادغام | ۳/۱۰ |
| **کل** | **۳/۱۰** |

**وضعیت کلی:** سرویس AI Governance با Model Intake Controller (CRUD + lifecycle state machine با ۸ transition، risk level enforcement، validation report requirement، auto-retire)، Swagger documentation، `@insurance/shared` integration (createLogger, createDataSource). ۸ service تعریف شده (incident response, deployment approval gate, validation workflow, committee audit trail, monitoring dashboard, MRO dashboard, model switchboard governance, model lifecycle) و ۳ integration adapter (deployment pipeline, model switchboard, monitoring). اما **۷ از ۸ service در AppModule ثبت نشده‌اند** (بحرانی — غیرقابل استفاده در DI container)، **۷ از ۸ service in-memory با Map** (بحرانی — عدم persistence — داده‌ها در restart از بین می‌روند)، **`MroDashboardService` همگی mock/hardcoded values** (بحرانی)، **عدم authentication** (بحرانی — `@ApiBearerAuth()` فقط Swagger metadata است — هیچ guard وجود ندارد)، **۳ integration adapter ثبت نشده**، **عدم tenant isolation**، **hard delete به جای soft delete**، و **عدم Kafka integration** از نواقص اصلی هستند. سرویس از نظر طراحی governance features (lifecycle state machine، approval workflow، incident response، validation pipeline، committee audit، monitoring، MRO dashboard) بسیار پیشرفته است اما از نظر implementation به‌شدت ناقص است — اکثر service‌ها غیرفعال و in-memory هستند.

---

### ۲۹. notification-service

**پورت:** 18037  
**مسیر پایه:** `/notifications`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: `notification`)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** kavenegar, twilio, @sendgrid/mail, aws-sdk

#### ۲۹.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۳ entity: `NotificationLog`, `EmailTemplate`, `SmsTemplate`
- **Real SMS provider integration**:
  - `KavenegarProvider` — Kavenegar API (ایران‌محور) با `Send` و `VerifyLookup` (OTP template)
  - `TwilioProvider` — Twilio API با `messages.create`
  - `ISmsProvider` interface — `sendSms`, `sendOtp`
  - Configurable via `SMS_PROVIDER` env (kavenegar/twilio)
  - **Fallback SMS provider** — `SMS_FALLBACK_PROVIDER` — اگر primary fail کند، fallback استفاده می‌شود
- **Real Email provider integration**:
  - `SendGridProvider` — SendGrid API با attachments support
  - `AwsSesProvider` — AWS SES با UTF-8 charset
  - `IEmailProvider` interface — `sendEmail` با options (from, html, attachments)
  - Configurable via `EMAIL_PROVIDER` env (sendgrid/aws-ses)
- **Notification sending**:
  - `sendNotification` — create log → process → save
  - `processNotification` — SMS (OTP/SMS) یا EMAIL با provider dispatch
  - `sendOtp` — OTP rate limiting (per tenant + recipient، configurable window/max)
  - `sendBulkNotifications` — bulk send با batchId و scheduledAt support
- **Retry mechanism**:
  - `retryNotification` — exponential backoff (`baseDelay * 2^retryCount`)
  - `retryAllFailed` — batch retry با maxRetries limit
  - Max retries: 3 (configurable)
  - Retry delay: 5000ms base (configurable)
- **Template management**:
  - `renderTemplate` — `{{variable}}` replacement با regex
  - `sendSmsWithTemplate` — template-based SMS با language support
  - `sendEmailWithTemplate` — template-based email با subject/body/html rendering
  - `createSmsTemplate`, `updateSmsTemplate`, `getSmsTemplate`, `listSmsTemplates`
  - `createEmailTemplate`, `updateEmailTemplate`, `getEmailTemplate`, `listEmailTemplates`
  - Template types: policy_issued, claim_submitted, complaint_received, installment_due, otp
  - `seedDefaultTemplates` — ۴ email template + ۵ SMS template (همگی فارسی)
- **Delivery callback handling**:
  - `handleDeliveryCallback` — delivery status update (delivered/failed/bounced/complained)
  - Webhook endpoint برای provider callbacks
- **Notification querying**:
  - `getNotification`, `listNotifications` — با tenantId, userId, correlationId, channel, type, status filters و pagination
- Correlation ID
- Tenant isolation در queries
- `NotificationStatus` enum (PENDING, SENT, FAILED, RETRYING)
- `NotificationChannel` enum (SMS, EMAIL)
- `NotificationType` enum (OTP, POLICY_ISSUED, CLAIM_SUBMITTED, etc.)
- ۲ migration
- Persian language templates (فارسی)

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| NS-001 | بحرانی | **عدم authentication و authorization** — هیچ JwtAuthGuard یا PermissionsGuard وجود ندارد — تمام endpoint‌ها بدون auth قابل دسترسی هستند |
| NS-002 | بحرانی | **`synchronize` در production فعال** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| NS-003 | متوسط | **`processNotification` synchronous** — `await this.processNotification(log.id)` در `sendNotification` — عدم job queue — در bulk send تمام notification‌ها sequential پردازش می‌شوند |
| NS-004 | متوسط | **`retryNotification` با `setTimeout` block می‌کند** — `await new Promise(resolve => setTimeout(resolve, delay))` — thread را blocked نگه می‌دارد |
| NS-005 | متوسط | **`Object.assign(template, params)` در `updateSmsTemplate` و `updateEmailTemplate`** — mass assignment vulnerability |
| NS-006 | متوسط | **OTP در `metadata` ذخیره می‌شود** — `metadata: { otp }` — OTP plaintext در DB |
| NS-007 | متوسط | **`otpRateLimitStore` in-memory** — در multi-instance deployment کار نمی‌کند — rate limit per instance |
| NS-008 | متوسط | **عدم Kafka integration** — نه consumer نه producer — عدم event-driven notification triggering |
| NS-009 | متوسط | **`sendSmsWithTemplate` type را hardcoded `OTP` می‌کند** — `type: NotificationType.OTP` — template type نادیده گرفته می‌شود |
| NS-010 | متوسط | **`sendEmailWithTemplate` type را hardcoded `POLICY_ISSUED` می‌کند** — `type: NotificationType.POLICY_ISSUED` — template type نادیده گرفته می‌شود |
| NS-011 | متوسط | **`handleDeliveryCallback` با `notificationId` search می‌کند** — اما `delivery-callback` endpoint `messageId` می‌فرستد — mismatch |
| NS-012 | کم | **عدم input validation** — `@Body() body: Partial<any>` در updateSmsTemplate و updateEmailTemplate |
| NS-013 | کم | **عدم audit logging** |
| NS-014 | کم | **عدم Outbox pattern** |
| NS-015 | کم | **عدم rate limiting (غیر از OTP)** — unlimited notification sending |
| NS-016 | کم | **عدم security headers** |
| NS-017 | کم | **`scheduledAt` در `sendBulkNotifications` استفاده نمی‌شود** — `status: params.scheduledAt ? PENDING : PENDING` — هر دو حالت PENDING |
| NS-018 | کم | **عدم push notification support** — فقط SMS و EMAIL |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Real SMS provider integration (Kavenegar با VerifyLookup برای OTP، Twilio)، real email provider integration (SendGrid، AWS SES)، fallback SMS provider، OTP rate limiting، retry mechanism با exponential backoff، template management با `{{variable}}` rendering، Persian templates (policy_issued, claim_submitted, complaint_received, installment_due, otp)، delivery callback handling، bulk notifications، Correlation ID، tenant isolation. اما عدم authentication (بحرانی)، `synchronize` در production (بحرانی)، synchronous processing بدون job queue، `setTimeout` blocking در retry، mass assignment در template update، OTP plaintext در DB، in-memory rate limit، و عدم Kafka integration از نواقص اصلی هستند.

#### ۲۹.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- Schema isolation: `notification`
- ۳ entity: `NotificationLog`, `EmailTemplate`, `SmsTemplate`
- ۲ migration
- Real provider integrations:
  - SMS: Kavenegar (ایران‌محور), Twilio
  - Email: SendGrid, AWS SES
- Configurable providers via env vars
- Fallback SMS provider support
- Template deduplication در seedDefaultTemplates

**اشکالات:**
- **`synchronize` در production فعال** (NS-002) — بحرانی
- **OTP plaintext در DB** (NS-006) — در `metadata.otp`
- عدم Outbox pattern (NS-014)
- عدم connection pool tuning
- `otpRateLimitStore` in-memory (NS-007) — عدم Redis-based rate limiting

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۲۹.۳ وضعیت امنیتی

**نقاط قوت:**
- OTP rate limiting (per tenant + recipient)
- Configurable rate limit window و max
- Provider API keys از env vars
- Fallback provider support
- Correlation ID
- Tenant isolation در queries

**اشکالات:**
- **عدم authentication و authorization** (NS-001) — بحرانی — تمام endpoint‌ها بدون auth
- **`synchronize` در production فعال** (NS-002) — بحرانی
- **Mass assignment در template update** (NS-005)
- **OTP plaintext در DB** (NS-006)
- عدم input validation (NS-012)
- عدم audit logging (NS-013)
- عدم AbacGuard و TenantGuard
- عدم rate limiting برای non-OTP notifications (NS-015)
- عدم security headers (NS-016)
- `otpRateLimitStore` in-memory (NS-007) — bypass در multi-instance

**درجه‌بندی امنیتی:** **۳/۱۰**

#### ۲۹.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Real Kavenegar integration** (ایران‌محور) — `Send` و `VerifyLookup` (OTP template)
- **Real Twilio integration** — `messages.create`
- **Real SendGrid integration** — `sgMail.send` با attachments
- **Real AWS SES integration** — `sendEmail` با UTF-8
- **Fallback SMS provider** — primary fail → fallback
- **Delivery callback webhooks** — provider → notification status update
- Persian language templates (فارسی) — policy_issued, claim_submitted, complaint_received, installment_due, otp
- Template-based sending با variable rendering
- Correlation ID
- Configurable providers via env vars

**اشکالات:**
- عدم Kafka integration (NS-008) — نه consumer نه producer — عدم event-driven notification triggering
- عدم Outbox pattern (NS-014)
- `handleDeliveryCallback` mismatch با `delivery-callback` endpoint (NS-011)
- `sendSmsWithTemplate` hardcoded type (NS-009)
- `sendEmailWithTemplate` hardcoded type (NS-010)
- `scheduledAt` در bulk استفاده نمی‌شود (NS-017)
- عدم push notification support (NS-018) — فقط SMS و EMAIL
- Synchronous processing بدون job queue (NS-003)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی notification-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۳/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس Notification با real SMS provider integration (Kavenegar با VerifyLookup برای OTP — ایران‌محور، Twilio با fallback support)، real email provider integration (SendGrid، AWS SES)، OTP rate limiting (per tenant + recipient)، retry mechanism با exponential backoff (max 3 retries)، template management با `{{variable}}` rendering و Persian templates (policy_issued, claim_submitted, complaint_received, installment_due, otp)، delivery callback webhooks، bulk notifications، Correlation ID، tenant isolation. ۳ entity، ۲ migration. اما **عدم authentication** (بحرانی — تمام endpoint‌ها بدون auth)، **`synchronize` در production فعال** (بحرانی)، **synchronous processing بدون job queue**، **`setTimeout` blocking در retry**، **mass assignment در template update**، **OTP plaintext در DB**، **in-memory rate limit** (multi-instance bypass)، **hardcoded type در template-based sending**، و **عدم Kafka integration** از نواقص اصلی هستند. سرویس از نظر real provider integration (به‌ویژه Kavenegar برای ایران) و template management پیشرفته است اما از نظر امنیتی و scalability ناقص است.

---

### ۳۰. rule-engine-service

**پورت:** 18038  
**مسیر پایه:** `/rule-engine`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: `rule_engine`)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** typeorm

#### ۳۰.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۳ entity: `Rule`, `RuleExecution`, `RuleTemplate`
- **Rule Management**:
  - `createRule` — با tenantId, name, ruleSetKey, type, condition (expression + variables), action, priority, metadata, templateId, version, tags
  - Auto-increment version اگر version ارائه نشود
  - `activateRule` — DRAFT → ACTIVE با activatedAt
  - `deactivateRule` — ACTIVE → INACTIVE با deactivatedAt
  - `updateRule` — selective field update (name, description, condition, action, priority, status, metadata, tags)
  - `deleteRule` — hard delete
  - `validateRule` — expression validation، variable extraction و cross-check، action validation
  - `getRule`, `listRules` — با tenantId, ruleSetKey, status, type, tags filters و pagination (max 200)
- **Rule Evaluation**:
  - `evaluateRules` — fetch active rules (priority DESC) → evaluate each condition → apply action → record execution
  - `dryRun` support — conditions evaluated اما actions اعمال نمی‌شوند
  - CONDITION type: stop after first match (highest priority)
  - EXECUTION type: evaluate all matching rules
  - Execution recording: input, output, matchedRules, executionDetails, executionTimeMs, status, error
- **Custom Expression Engine** (بدون `eval()`):
  - `evaluateExpression` — recursive descent parser
  - Logical operators: `&&`, `||`, `!`
  - Comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`
  - Membership: `in`
  - String operators: `contains`, `startsWith`, `endsWith`, `matches` (regex)
  - Functions: `contains()`, `startsWith()`, `endsWith()`, `matches()`, `in()`, `between()`, `isEmpty()`, `isNotEmpty()`
  - Parentheses support با depth tracking
  - `splitLogical` — operator-aware split با depth tracking
  - `evaluateSimpleCondition` — regex-based parsing
  - `parseValue` — string, boolean, null, number, array parsing
  - `parseArguments` — comma-separated با quote handling
  - `getNestedValue` — dot-notation path traversal
  - `setNestedValue` — dot-notation path setting
  - `extractVariables` — variable extraction از expression
- **Action Types**:
  - `return` — merge action.value into output
  - `set` — set nested value
  - `add` — add to current value
  - `multiply` — multiply current value
  - `push` — push to array
  - `call` — log service.method call (placeholder)
  - `emit` — log event emission (placeholder)
  - `log` — log message
- **Execution Tracking**:
  - `listExecutions` — با tenantId, ruleSetKey, businessKey, status filters و pagination (max 200)
  - `getExecution`
  - `getExecutionMetrics` — totalExecutions, successRate, avgExecutionTimeMs, mostMatchedRules (top 10)
- **Template Management**:
  - `createTemplate` — با tenantId, name, category, description, conditionTemplate, actionTemplate, variables
  - `listTemplates` — با tenantId, category filter و pagination (max 200)
  - `createRuleFromTemplate` — variable substitution در condition template → create rule
- Correlation ID
- Tenant isolation در تمام queries
- `RuleStatus` enum (DRAFT, ACTIVE, INACTIVE)
- `RuleType` enum (CONDITION, EXECUTION)
- `ExecutionStatus` enum (SUCCESS, FAILED)
- Pagination با cap (max 200)
- ۱ migration

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| RE-001 | بحرانی | **عدم authentication و authorization** — هیچ JwtAuthGuard یا PermissionsGuard وجود ندارد — تمام endpoint‌ها بدون auth قابل دسترسی هستند |
| RE-002 | بحرانی | **`synchronize` در production فعال** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| RE-003 | متوسط | **`matches` operator با `new RegExp(value)` — ReDoS risk** — user-provided regex بدون sanitization — возможная catastrophic backtracking |
| RE-004 | متوسط | **`deleteRule` hard delete** — `ruleRepo.delete({ id })` — عدم soft delete — execution history orphaned |
| RE-005 | متوسط | **`getRule` و `getExecution` عدم tenantId check** — cross-tenant data access ممکن است |
| RE-006 | متوسط | **`call` و `emit` action types placeholder** — فقط log می‌زنند — عدم real service call یا event emission |
| RE-007 | متوسط | **عدم Kafka integration** — نه consumer نه producer — عدم event-driven rule triggering |
| RE-008 | متوسط | **`evaluateParentheses` با string replacement** — `before + innerResult + after` — ممکن است برای nested parentheses incorrect behavior داشته باشد |
| RE-009 | متوسط | **`getExecutionMetrics` in-memory aggregation** — تمام executions را load می‌کند — عدم DB-level aggregation — scalability issue |
| RE-010 | کم | **عدم input validation** — `@Body() body: any` در چندین endpoint |
| RE-011 | کم | **عدم audit logging** |
| RE-012 | کم | **عدم Outbox pattern** |
| RE-013 | کم | **عدم rate limiting** |
| RE-014 | کم | **عدم security headers** |
| RE-015 | کم | **`createRuleFromTemplate` با `new RegExp` variable substitution** — possible regex injection در variable values |
| RE-016 | کم | **عدم rule versioning history** — فقط آخرین version ذخیره می‌شود — عدم audit trail برای rule changes |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Rule management (create, activate, deactivate, update, delete, validate, list)، custom expression engine (بدون `eval()`) با logical/comparison/string operators و functions، action types (return, set, add, multiply, push, call, emit, log)، execution tracking با metrics، template management با variable substitution، Correlation ID، tenant isolation، pagination با cap. اما عدم authentication (بحرانی)، `synchronize` در production (بحرانی)، ReDoS risk در `matches` operator، hard delete، cross-tenant access در getRule/getExecution، placeholder `call`/`emit` actions، و عدم Kafka integration از نواقص اصلی هستند.

#### ۳۰.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- Schema isolation: `rule_engine`
- ۳ entity: `Rule`, `RuleExecution`, `RuleTemplate`
- ۱ migration
- Pagination با cap (max 200)
- Tenant isolation در تمام queries
- QueryBuilder برای complex filtering
- JSONB برای condition, action, metadata, input, output, matchedRules, executionDetails

**اشکالات:**
- **`synchronize` در production فعال** (RE-002) — بحرانی
- **`deleteRule` hard delete** (RE-004) — execution history orphaned
- عدم Outbox pattern (RE-012)
- عدم connection pool tuning
- `getExecutionMetrics` in-memory aggregation (RE-009) — عدم DB-level GROUP BY

**درجه‌بندی پایگاه‌داده:** **۶/۱۰**

#### ۳۰.۳ وضعیت امنیتی

**نقاط قوت:**
- Correlation ID
- Tenant isolation در list queries
- `validateRule` — expression validation قبل از activation
- Custom expression engine (بدون `eval()` — امنیت بالاتر از workflow-engine-service)

**اشکالات:**
- **عدم authentication و authorization** (RE-001) — بحرانی — تمام endpoint‌ها بدون auth
- **`synchronize` در production فعال** (RE-002) — بحرانی
- **ReDoS risk در `matches` operator** (RE-003) — `new RegExp(value)` بدون sanitization
- **`getRule` و `getExecution` عدم tenantId check** (RE-005) — cross-tenant access
- عدم input validation (RE-010)
- عدم audit logging (RE-011)
- عدم AbacGuard و TenantGuard
- عدم rate limiting (RE-013)
- عدم security headers (RE-014)
- `createRuleFromTemplate` regex injection risk (RE-015)

**درجه‌بندی امنیتی:** **۳/۱۰**

#### ۳۰.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- Custom expression engine با logical/comparison/string operators و functions
- Action types برای output manipulation (return, set, add, multiply, push)
- Template management با variable substitution
- Execution tracking با metrics (successRate, avgExecutionTimeMs, mostMatchedRules)
- Correlation ID
- Tenant isolation
- `dryRun` support برای testing
- CONDITION vs EXECUTION rule types (first-match vs all-match)

**اشکالات:**
- عدم Kafka integration (RE-007) — نه consumer نه producer
- عدم Outbox pattern (RE-012)
- `call` و `emit` action types placeholder (RE-006) — عدم real service call یا event emission
- `evaluateParentheses` string replacement edge cases (RE-008)
- `getExecutionMetrics` in-memory aggregation (RE-009)
- عدم rule versioning history (RE-016)

**درجه‌بندی ادغام:** **۵/۱۰**

#### جمع‌بندی rule-engine-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۶/۱۰ |
| امنیتی | ۳/۱۰ |
| ادغام | ۵/۱۰ |
| **کل** | **۵/۱۰** |

**وضعیت کلی:** سرویس Rule Engine با rule management (create, activate, deactivate, update, delete, validate, list)، custom expression engine (بدون `eval()` — امن‌تر از workflow-engine-service) با logical operators (`&&`, `||`, `!`)، comparison operators (`==`, `!=`, `>`, `<`, `>=`, `<=`)، string operators (`contains`, `startsWith`, `endsWith`, `matches`) و functions (`contains()`, `between()`, `isEmpty()`، etc.)، action types (return, set, add, multiply, push, call, emit, log)، execution tracking با metrics (successRate, avgExecutionTimeMs, mostMatchedRules)، template management با variable substitution، dryRun support، CONDITION vs EXECUTION rule types، Correlation ID، tenant isolation، pagination با cap (max 200). ۳ entity، ۱ migration. اما **عدم authentication** (بحرانی)، **`synchronize` در production فعال** (بحرانی)، **ReDoS risk در `matches` operator**، **hard delete**، **cross-tenant access در getRule/getExecution**، **placeholder `call`/`emit` actions**، **in-memory metrics aggregation**، و **عدم Kafka integration** از نواقص اصلی هستند. سرویس از نظر expression engine design پیشرفته است (بدون eval، با operators و functions) اما از نظر امنیتی و integration ناقص است.

---

### ۳۱. billing-service

**پورت:** 18039  
**مسیر پایه:** `/billing`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: `billing`)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** uuid, fetch (native)

#### ۳۱.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۶ entity: `Invoice`, `JournalEntry`, `Account`, `FinancialPeriod`, `CostCenter`, `ReconciliationResult`
- **RBAC با JwtAuthGuard و PermissionsGuard** — ۷ permission، ۱۱ نقش
- **Invoice Management**:
  - `createInvoice` — با invoiceNumber, policyId, claimId, customerId, invoiceType, amount, taxAmount, dueDate, lineItems, metadata — status DRAFT
  - `issueInvoice` — DRAFT → PENDING
  - `recordPayment` — PENDING/OVERDUE → paidAmount accumulation → PAID اگر کامل
  - `markOverdue` — batch update PENDING → OVERDUE برای dueDate < now
  - `cancelInvoice` — نمی‌تواند PAID را cancel کند
  - `getInvoice`, `listInvoices` — با tenantId, customerId, policyId, status, invoiceType filters و pagination (max 200)
  - `getOutstandingBalance` — SUM(amount - paidAmount) برای PENDING/OVERDUE
- **Double-Entry Accounting**:
  - `createJournalEntry` — با debit/credit balance validation (`Math.abs(totalDebit - totalCredit) > 0.01`)
  - `postJournalEntry` — DRAFT → POSTED با account existence و isActive verification
  - `reverseJournalEntry` — POSTED → REVERSED با reversal entry (swap debit/credit) و auto-post
  - `createAccount` — با accountCode, accountName, accountType, category, parentAccountCode, openingBalance
  - `getAccount`, `listAccounts` — با tenantId, accountType, category, isActive filters و pagination
  - `createFinancialPeriod` — با periodName, startDate, endDate, fiscalYear, periodNumber — status OPEN
  - `closeFinancialPeriod` — OPEN → CLOSED با closedAt, closedBy
  - `getTrialBalance` — all active accounts با debit/credit balances بر اساس account type (ASSET/EXPENSE = debit-normal, other = credit-normal)
  - `getAccountBalance` — per-account debit/credit balance با opening balance
- **CostCenter Management**:
  - `createCostCenter`, `getCostCenter`, `listCostCenters`, `updateCostCenter`, `deleteCostCenter`
  - audit logging برای CostCenter operations
- **Reconciliation**:
  - `reconcile` — expected vs actual با variance calculation و status (MATCHED/MANUAL_REVIEW/UNMATCHED)
  - `listReconciliationResults`, `approveReconciliation` — MANUAL_REVIEW → MATCHED
  - audit logging برای reconciliation operations
- **Financial Reports**:
  - `getPnLReport` — revenue vs expenses با netIncome calculation
  - `getBalanceSheet` — assets, liabilities, equity با totals
- **Payment Gateway Integration** (ایران‌محور):
  - `PaymentGatewayService` — ۸ Iranian payment providers: ZARINPAL, IDPAY, PAYIR, BEHPARDAKHT, SAMAN, MELLAT, PASARGAD, ECOSYSTEM
  - `initiatePayment` — create transaction → provider API call → redirect URL
  - `verifyPayment` — provider verification → update invoice status (PAID)
  - `cancelPayment` — PENDING → CANCELLED
  - `getTransaction`, `getTransactionsByInvoice`
  - `healthCheck` — provider configuration check
  - Real ZarinPal v4 API integration (`/request.json`, `/verify.json`)
  - Real IDPay API integration (`/payment`, `/payment/verify`)
  - Real Pay.ir API integration (`/send`, `/verify`)
  - Ecosystem payment integration (internal payment service)
  - Rial → Toman conversion (`amount * 10`)
  - Idempotency key برای ecosystem payments
- **Auto-Deposit Verification**:
  - `AutoDepositVerificationService` — bank transaction matching با invoices
  - `ingestBankTransaction` — store + match to pending/overdue invoices
  - `matchTransactionToInvoice` — amount-based matching با tolerance و confidence levels (high/medium/low)
  - `autoApprovePayment` — auto-approve high-confidence matches
  - `manualApprovePayment`, `rejectTransaction`
  - `getPendingTransactions`, `getPendingMatches`
  - `reconcileTransactions` — batch reconciliation
  - Configurable: enabled, checkInterval, toleranceAmount, requireExactMatch, autoApproveHighConfidence, bankProviders
  - `getConfig`, `updateConfig`, `healthCheck`
- Correlation ID
- Tenant isolation در تمام queries
- `auditLogger` برای CostCenter و Reconciliation operations
- `InvoiceStatus` enum (DRAFT, PENDING, PAID, OVERDUE, CANCELLED)
- `InvoiceType` enum (premium, claim_payout, commission, refund, penalty)
- `EntryStatus` enum (DRAFT, POSTED, REVERSED)
- `AccountType` enum (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
- `AccountCategory` enum (OPERATING_REVENUE, NON_OPERATING_REVENUE, OPERATING_EXPENSE, NON_OPERATING_EXPENSE, etc.)
- `PeriodStatus` enum (OPEN, CLOSED)
- `ReconciliationStatus` enum (MATCHED, MANUAL_REVIEW, UNMATCHED)
- Pagination با cap (max 200)
- ۱ migration

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| BL-001 | بحرانی | **`PaymentGatewayService.transactions` in-memory (`Map`)** — تمام payment transactions در memory ذخیره می‌شوند — در restart از بین می‌روند — عدم persistence — بحرانی برای مالی |
| BL-002 | بحرانی | **`AutoDepositVerificationService.pendingTransactions` in-memory (`Array`)** — bank transactions در memory — در restart از بین می‌روند |
| BL-003 | متوسط | **`synchronize` در production فعال** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| BL-004 | متوسط | **`markOverdue` از `$lt` syntax استفاده می‌کند** — `dueDate: { $lt: now } as any` — این MongoDB syntax است نه TypeORM — در PostgreSQL کار نمی‌کند |
| BL-005 | متوسط | **`getTrialBalance` N+1 queries** — برای هر account تمام journal entries را load می‌کند — شدید scalability issue |
| BL-006 | متوسط | **`getAccountBalance` تمام journal entries را load می‌کند** — عدم DB-level aggregation — in-memory line-by-line processing |
| BL-007 | متوسط | **`getPnLReport` و `getBalanceSheet` in-memory aggregation** — تمام entries را load می‌کنند — عدم DB-level SUM/GROUP BY |
| BL-008 | متوسط | **`updateCostCenter` mass assignment** — `Object.assign(cc, params)` — ممکن است fields ناخواسته را overwrite کند |
| BL-009 | متوسط | **`deleteCostCenter` hard delete** — `costCenterRepo.delete({ id })` — عدم soft delete |
| BL-010 | متوسط | **عدم Kafka integration** — نه consumer نه producer |
| BL-011 | متوسط | **`matchTransactionToInvoice` عدم tenantId filter** — cross-tenant invoice matching ممکن است |
| BL-012 | متوسط | **`verifyPayment` amount را `0` پاس می‌دهد** — `amount: 0` در controller — باید از transaction fetch شود |
| BL-013 | کم | **عدم input validation** — `@Body() body: any` در چندین endpoint |
| BL-014 | کم | **عدم Outbox pattern** |
| BL-015 | کم | **عدم rate limiting** |
| BL-016 | کم | **عدم security headers** |
| BL-017 | کم | **`getInvoice` عدم tenantId check** — cross-tenant access |
| BL-018 | کم | **`BEHPARDAKHT`, `SAMAN`, `MELLAT`, `PASARGAD` providers not implemented** — فقط `throw new Error` |
| BL-DEC | متوسط | **همپوشانی با collections-service و payments-service** — سه سرویس مستقل پرداخت/وصول (payments, collections, billing) بدون تفکیک مشخص domain boundaries پیاده‌سازی شده‌اند — billing-service علاوه بر حسابداری، payment gateway و auto-deposit نیز پیاده‌سازی کرده که با collections-service تداخل دارد — payment transactions در-memory (BL-001) نشان‌دهنده عدم مالکیت پایدار داده |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Invoice management (create, issue, recordPayment, markOverdue, cancel, list, outstandingBalance)، double-entry accounting (journal entries با balance validation, post, reverse, accounts, financial periods, trial balance, account balance)، CostCenter CRUD با audit logging، reconciliation با variance calculation و approval، financial reports (PnL, Balance Sheet)، real Iranian payment gateway integration (ZarinPal v4, IDPay, Pay.ir, Ecosystem) با initiate/verify/cancel، auto-deposit verification با bank transaction matching و confidence levels، RBAC با ۷ permission و ۱۱ نقش، Correlation ID، tenant isolation، pagination با cap. اما **payment transactions in-memory** (بحرانی — عدم persistence برای مالی)، **auto-deposit in-memory** (بحرانی)، **`markOverdue` MongoDB syntax** (متوسط — در PostgreSQL کار نمی‌کند)، **N+1 queries در trial balance**، **in-memory aggregation در reports**، **mass assignment در updateCostCenter**، و **عدم Kafka integration** از نواقص اصلی هستند.

#### ۳۱.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- Schema isolation: `billing`
- ۶ entity: `Invoice`, `JournalEntry`, `Account`, `FinancialPeriod`, `CostCenter`, `ReconciliationResult`
- ۱ migration
- Pagination با cap (max 200)
- Tenant isolation در تمام queries
- QueryBuilder برای complex filtering
- JSONB برای lineItems, lines, metadata, details
- Double-entry bookkeeping با debit/credit balance validation
- Account hierarchy با parentAccountCode
- Financial period management با OPEN/CLOSED status

**اشکالات:**
- **Payment transactions in-memory** (BL-001) — بحرانی — عدم PaymentTransaction entity
- **Auto-deposit transactions in-memory** (BL-002) — بحرانی
- **`synchronize` در production فعال** (BL-003)
- **`markOverdue` MongoDB syntax** (BL-004) — در PostgreSQL کار نمی‌کند
- **N+1 queries در getTrialBalance** (BL-005)
- **In-memory aggregation در reports** (BL-006, BL-007)
- **`deleteCostCenter` hard delete** (BL-009)
- عدم Outbox pattern (BL-014)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۵/۱۰**

#### ۳۱.۳ وضعیت امنیتی

**نقاط قوت:**
- **JwtAuthGuard و PermissionsGuard** — فقط سرویس با RBAC در این دسته
- ۷ permission key: `billing:create_entry`, `billing:view_entry`, `billing:reconcile`, `billing:close_period`, `billing:manage_accounts`, `billing:manage_cost_centers`, `billing:admin`
- ۱۱ نقش با permission mapping
- `auditLogger` برای CostCenter و Reconciliation operations
- Correlation ID
- Tenant isolation در list queries
- Double-entry balance validation
- Payment provider merchant ID از env vars
- Idempotency key برای ecosystem payments

**اشکالات:**
- **`synchronize` در production فعال** (BL-003)
- **`updateCostCenter` mass assignment** (BL-008)
- **`deleteCostCenter` hard delete** (BL-009)
- **`getInvoice` عدم tenantId check** (BL-017) — cross-tenant access
- **`matchTransactionToInvoice` عدم tenantId filter** (BL-011)
- عدم input validation (BL-013)
- عدم rate limiting (BL-015)
- عدم security headers (BL-016)
- Payment transactions in-memory (BL-001) — عدم audit trail برای payments

**درجه‌بندی امنیتی:** **۵/۱۰**

#### ۳۱.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Real Iranian payment gateway integration** — ZarinPal v4 (`/request.json`, `/verify.json`)، IDPay (`/payment`, `/payment/verify`)، Pay.ir (`/send`, `/verify`)
- ۸ Iranian payment providers پشتیبانی می‌شوند (ZARINPAL, IDPAY, PAYIR, BEHPARDAKHT, SAMAN, MELLAT, PASARGAD, ECOSYSTEM)
- Ecosystem payment integration (internal payment service با idempotency key)
- Rial → Toman conversion (`amount * 10`)
- Auto-deposit verification با bank transaction matching و confidence levels
- Double-entry accounting با journal entries, accounts, financial periods
- Financial reports (PnL, Balance Sheet, Trial Balance)
- Reconciliation با variance calculation
- CostCenter management
- Correlation ID
- Tenant isolation
- RBAC با JwtAuthGuard و PermissionsGuard
- `auditLogger` برای audit trail

**اشکالات:**
- **Payment transactions in-memory** (BL-001) — عدم persistence — در restart تمام payment history از بین می‌رود
- **Auto-deposit transactions in-memory** (BL-002) — عدم persistence
- عدم Kafka integration (BL-010) — نه consumer نه producer
- عدم Outbox pattern (BL-014)
- `BEHPARDAKHT`, `SAMAN`, `MELLAT`, `PASARGAD` providers not implemented (BL-018)
- `verifyPayment` amount mismatch (BL-012)
- `markOverdue` MongoDB syntax (BL-004) — در PostgreSQL کار نمی‌کند
- N+1 queries و in-memory aggregation در reports (BL-005, BL-006, BL-007)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی billing-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۵/۱۰ |
| امنیتی | ۵/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس Billing با invoice management (create, issue, recordPayment, markOverdue, cancel, outstanding balance)، double-entry accounting (journal entries با balance validation, post, reverse, accounts, financial periods, trial balance, account balance)، CostCenter CRUD با audit logging، reconciliation با variance calculation و approval workflow، financial reports (PnL, Balance Sheet)، **real Iranian payment gateway integration** (ZarinPal v4, IDPay, Pay.ir, Ecosystem با initiate/verify/cancel)، auto-deposit verification با bank transaction matching و confidence levels (high/medium/low) و configurable tolerance، RBAC با JwtAuthGuard و PermissionsGuard (۷ permission، ۱۱ نقش)، Correlation ID، tenant isolation، pagination با cap (max 200). ۶ entity، ۱ migration. اما **payment transactions in-memory (`Map`)** (بحرانی — عدم persistence برای مالی — در restart تمام payment history از بین می‌رود)، **auto-deposit transactions in-memory** (بحرانی)، **`markOverdue` MongoDB syntax** (در PostgreSQL کار نمی‌کند)، **N+1 queries در trial balance**، **in-memory aggregation در financial reports**، **mass assignment در updateCostCenter**، **hard delete در deleteCostCenter**، **`getInvoice` عدم tenantId check**، و **عدم Kafka integration** از نواقص اصلی هستند. سرویس از نظر real Iranian payment gateway integration (به‌ویژه ZarinPal) و double-entry accounting پیشرفته است اما از نظر persistence (payment transactions in-memory) و scalability (N+1 queries, in-memory aggregation) ناقص است.

---

### ۳۲. underwriting-service

**پورت:** 18032  
**مسیر پایه:** `/underwriting`  
**پایگاه‌داده:** PostgreSQL (insurance_platform, schema: `public` — عدم schema isolation)  
**فریم‌ورک:** NestJS + Fastify + TypeORM  
**وابستگی‌ها:** uuid

#### ۳۲.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- ۲ entity: `UnderwritingRequest`, `UnderwritingAppetite`
- **RBAC با JwtAuthGuard و PermissionsGuard** — ۴ permission، ۵ نقش
- **Underwriting Request Lifecycle**:
  - `createRequest` — با policyId (UUID validation)، reasonCode، input، dueDate، correlationId — status `pending`
  - Orchestrator integration — `fetch(`${ORCHESTRATOR_URL}/work-items/underwriting-review`)` — ایجاد work item → status `in_review`
  - `attachWorkItem` — link work item to request
  - `getRequest`, `listRequests` — با status, policyId filters و pagination (max 200)
  - `decide` — approved/rejected/escalated با policy service callback (`/policies/{policyId}/underwriting/decision`)
  - `ALREADY_DECIDED` protection — اگر decision قبلاً ثبت شده، error
  - Policy service integration — `fetch(`${POLICY_SERVICE_URL}/policies/{policyId}/underwriting/decision`)` با authorization header forwarding
  - Error handling با custom error codes (`ALREADY_DECIDED`, `POLICY_SERVICE_UNAVAILABLE`, `POLICY_DECISION_FAILED`)
- **SLA Enforcement**:
  - `checkSlaBreaches` — find pending/in_review requests با dueDate < now و escalatedAt < cutoff
  - `escalateOverdueReview` — pending/in_review → escalated با reason و audit logging
  - `getSlaMetrics` — totalPending, overdueCount, escalatedCount, avgResolutionHours, resolutionRate
- **Risk Assessment**:
  - `assessRisk` — weighted risk scoring با ۵ factors:
    - `ageRisk` (weight 0.2) — age < 25 = 0.8, age > 65 = 0.6, else 0.2
    - `claimHistoryRisk` (weight 0.3) — 3+ claims = 0.9, 1+ = 0.5, 0 = 0.1
    - `coverageRisk` (weight 0.2) — coverage/premium ratio > 1000 = 0.7, else 0.3
    - `itemAgeRisk` (weight 0.15) — item age > 15 = 0.6, else 0.2
    - `policyTypeRisk` (weight 0.15) — auto=0.5, life=0.3, health=0.4, fire=0.4, liability=0.3, travel=0.2
  - Risk level: low (<0.3), medium (<0.5), high (<0.7), critical (>=0.7)
  - Recommendations per factor
  - Risk assessment stored in `result.riskAssessment`
  - `getRiskMatrix` — risk matrix reference با levels و actions
  - `getRiskScoringHistory` — history from `result.riskAssessmentHistory`
- **Appetite Matrix & Delegated Authority**:
  - `createAppetiteRule` — lineOfBusiness, productId, riskLevel, decision, maxSumInsured, maxPremium, authorityLevel, approverRole, slaHours
  - `evaluateAppetite` — match rules by lineOfBusiness, riskLevel, productId با sumInsured/premium limits — fallback `refer` با slaHours=48
  - `listAppetiteRules` — با lineOfBusiness, productId, active filters و pagination
  - `updateAppetiteRule` — selective field update
  - `deleteAppetiteRule` — hard delete
- **UUID validation** — `isUuid()` در controller برای تمام ID parameters
- **Input validation** — policyId, reasonCode, decision, decidedBy validation در controller
- Correlation ID
- `auditLogger` برای تمام operations (create, get, list, decide, escalate, assess_risk, risk_matrix)
- Authorization header forwarding به orchestrator و policy service
- `RiskLevel` enum (low, medium, high, critical)
- `AppetiteDecision` enum (accept, refer, decline)
- Pagination با cap (max 200)
- ۱ migration
- `data-source.ts` برای standalone migrations

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| UW-001 | بحرانی | **عدم schema isolation** — `schema: process.env.DB_SCHEMA || 'public'` — استفاده از schema `public` به‌جای schema اختصاصی — تداخل با سایر سرویس‌ها |
| UW-002 | متوسط | **`synchronize` در production فعال** — `DB_SYNC === 'true'` بدون `NODE_ENV !== 'production'` check |
| UW-003 | متوسط | **`getSlaMetrics` از `$lt` MongoDB syntax استفاده می‌کند** — `dueDate: { $lt: now } as any` — در PostgreSQL کار نمی‌کند |
| UW-004 | متوسط | **`getSlaMetrics` in-memory aggregation** — تمام completed reviews را load می‌کند — عدم DB-level AVG |
| UW-005 | متوسط | **`updateAppetiteRule` mass assignment** — `Object.assign(rule, updates)` — ممکن است fields ناخواسته را overwrite کند |
| UW-006 | متوسط | **`deleteAppetiteRule` hard delete** — `appetiteRepo.delete(id)` — عدم soft delete |
| UW-007 | متوسط | **عدم tenant isolation در queries** — `listRequests`, `getRequest`, `checkSlaBreaches` عدم tenantId filter — cross-tenant access |
| UW-008 | متوسط | **عدم Kafka integration** — نه consumer نه producer — عدم event-driven underwriting triggering |
| UW-009 | متوسط | **`createRequest` orchestrator call در silent catch** — `catch {}` — خطای orchestrator نادیده گرفته می‌شود — request در status `pending` باقی می‌ماند بدون notification |
| UW-010 | متوسط | **`assessRisk` factors hardcoded** — age, pastClaims, coverageAmount, itemAge, policyType — عدم configurable risk model |
| UW-011 | کم | **عدم input validation در appetite endpoints** — `@Body() body: any` |
| UW-012 | کم | **عدم Outbox pattern** |
| UW-013 | کم | **عدم rate limiting** |
| UW-014 | کم | **عدم security headers** |
| UW-015 | کم | **`getRiskScoringHistory` از `result.riskAssessmentHistory` استفاده می‌کند** — اما `assessRisk` فقط `result.riskAssessment` را set می‌کند — history هرگز append نمی‌شود |
| UW-016 | کم | **عدم Docker Compose entry** — سرویس در docker-compose وجود ندارد (طبق FUNCTIONAL_COMPLETION_CHECKLIST) |
| UW-DEC | متوسط | **عدم مالکیت داده و عدم event-driven integration** — underwriting-service هیچ داده‌ای persist نمی‌کند که از orchestrator و policy-service مستقل باشد — عدم Kafka integration (UW-008) — orchestrator call در silent catch (UW-009) نشان‌دهنده عدم ownership واضح در underwriting workflow — مرز بین underwriting-service و orchestrator در work item management مشخص نیست — عدم schema isolation (UW-001) |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Underwriting request lifecycle (create, orchestrator integration, decide با policy service callback)، SLA enforcement (breach detection, escalation, metrics)، risk assessment با weighted scoring (۵ factors، ۴ risk levels، recommendations)، appetite matrix با delegated authority (create, evaluate, list, update)، UUID validation، input validation، RBAC با ۴ permission و ۵ نقش، audit logging، Correlation ID، authorization header forwarding. اما عدم schema isolation (بحرانی)، `synchronize` در production، MongoDB syntax در getSlaMetrics، mass assignment در updateAppetiteRule، hard delete، عدم tenant isolation در queries، silent catch در orchestrator call، و عدم Kafka integration از نواقص اصلی هستند.

#### ۳۲.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- ۲ entity: `UnderwritingRequest`, `UnderwritingAppetite`
- ۱ migration
- `data-source.ts` برای standalone migrations
- Pagination با cap (max 200)
- QueryBuilder برای complex filtering
- JSONB برای input, result
- UUID primary keys

**اشکالات:**
- **عدم schema isolation** (UW-001) — بحرانی — schema `public` به‌جای schema اختصاصی
- **`synchronize` در production فعال** (UW-002)
- **`getSlaMetrics` MongoDB syntax** (UW-003) — در PostgreSQL کار نمی‌کند
- **`getSlaMetrics` in-memory aggregation** (UW-004)
- **`deleteAppetiteRule` hard delete** (UW-006)
- عدم Outbox pattern (UW-012)
- عدم connection pool tuning

**درجه‌بندی پایگاه‌داده:** **۵/۱۰**

#### ۳۲.۳ وضعیت امنیتی

**نقاط قوت:**
- **JwtAuthGuard و PermissionsGuard** — RBAC با ۴ permission و ۵ نقش
- ۴ permission: `underwriting:create`, `underwriting:view`, `underwriting:list`, `underwriting:decide`
- ۵ نقش: insurer_admin, head_office_ops, risk_manager, branch_manager, auditor
- UUID validation برای تمام ID parameters
- Input validation در controller (policyId, reasonCode, decision, decidedBy)
- `auditLogger` برای تمام operations
- Correlation ID
- Authorization header forwarding به downstream services
- `ALREADY_DECIDED` protection — جلوگیری از double decision

**اشکالات:**
- **عدم schema isolation** (UW-001) — بحرانی
- **`synchronize` در production فعال** (UW-002)
- **عدم tenant isolation در queries** (UW-007) — cross-tenant access
- **`updateAppetiteRule` mass assignment** (UW-005)
- عدم input validation در appetite endpoints (UW-011)
- عدم rate limiting (UW-013)
- عدم security headers (UW-014)

**درجه‌بندی امنیتی:** **۶/۱۰**

#### ۳۲.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Orchestrator integration** — `fetch(`${ORCHESTRATOR_URL}/work-items/underwriting-review`)` — ایجاد work item برای underwriting review
- **Policy service integration** — `fetch(`${POLICY_SERVICE_URL}/policies/{policyId}/underwriting/decision`)` — apply decision to policy
- Authorization header forwarding به orchestrator و policy service
- Correlation ID propagation به downstream services
- Tenant ID و User ID propagation via headers
- Risk assessment با weighted scoring و recommendations
- Appetite matrix با delegated authority و SLA hours
- SLA enforcement با breach detection و escalation
- `auditLogger` برای audit trail

**اشکالات:**
- عدم Kafka integration (UW-008) — نه consumer نه producer
- عدم Outbox pattern (UW-012)
- `createRequest` orchestrator call در silent catch (UW-009) — خطا نادیده گرفته می‌شود
- `assessRisk` factors hardcoded (UW-010) — عدم configurable risk model
- `getRiskScoringHistory` همیشه empty برمی‌گرداند (UW-015) — history append نمی‌شود
- عدم Docker Compose entry (UW-016) — سرویس در docker-compose وجود ندارد
- `getSlaMetrics` MongoDB syntax (UW-003) — در PostgreSQL کار نمی‌کند

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی underwriting-service

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | ۵/۱۰ |
| امنیتی | ۶/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس Underwriting با underwriting request lifecycle (create با UUID validation، orchestrator integration برای work item creation، decide با policy service callback و authorization forwarding)، SLA enforcement (breach detection با configurable hoursOverdue، escalation با audit logging، metrics با avgResolutionHours و resolutionRate)، risk assessment با weighted scoring (۵ factors: ageRisk, claimHistoryRisk, coverageRisk, itemAgeRisk, policyTypeRisk با weights و ۴ risk levels)، risk matrix reference، appetite matrix با delegated authority (create, evaluate با sumInsured/premium limits و fallback refer، list, update)، RBAC با JwtAuthGuard و PermissionsGuard (۴ permission، ۵ نقش)، UUID validation، input validation، audit logging برای تمام operations، Correlation ID، authorization header forwarding. ۲ entity، ۱ migration. اما **عدم schema isolation** (بحرانی — schema `public` به‌جای schema اختصاصی)، **`synchronize` در production فعال**، **`getSlaMetrics` MongoDB syntax** (در PostgreSQL کار نمی‌کند)، **عدم tenant isolation در queries** (cross-tenant access)، **mass assignment در updateAppetiteRule**، **hard delete در deleteAppetiteRule**، **silent catch در orchestrator call**، **hardcoded risk factors**، **عدم Kafka integration**، و **عدم Docker Compose entry** از نواقص اصلی هستند. سرویس از نظر underwriting workflow (orchestrator + policy service integration) و risk assessment پیشرفته است اما از نظر database design (عدم schema isolation) و tenant isolation ناقص است.

---

### ۳۳. outbox-relay

**پورت:** 18041  
**مسیر پایه:** `/health` (فقط health check)  
**پایگاه‌داده:** PostgreSQL (shared — استفاده از `@insurance/shared` entities)  
**فریم‌ورک:** NestJS (بدون NestJS — raw Node.js + TypeORM + KafkaJS)  
**وابستگی‌ها:** typeorm, kafkajs, @insurance/shared

#### ۳۳.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- **Transaction Outbox Pattern** — پیاده‌سازی صحیح Outbox pattern برای event-driven architecture
- **`FOR UPDATE SKIP LOCKED`** — استفاده از PostgreSQL advisory locking برای concurrent processing بدون contention
- **Kafka producer integration** — KafkaJS با retry configuration (initialRetryTime: 1000ms, retries: 5)
- **Batch processing** — configurable `batchSize` (default 100) و `pollIntervalMs` (default 1000ms)
- **Retry با exponential backoff** — `baseRetryDelayMs * Math.pow(2, attemptCount - 1)` با cap (30s)
- **Max attempts** — configurable `maxAttempts` (default 10) — بعد از آن status → `failed`
- **Dead Letter Queue (DLQ)** — `DeadLetterEvent` entity برای permanently failed events با:
  - `originalEventId`, `topic`, `key`, `value` (full event data)
  - `errorMessage`, `errorStack`, `retryCount`, `maxRetries`
  - `consumerGroup`, `status`, `lastErrorAt`, `resolvedAt`
  - Configurable via `DLQ_ON_PERMANENT_FAILURE` (default: true)
- **Event envelope** — `createEventEnvelope()` از `@insurance/shared` با `eventId`, `eventType`, `eventVersion`, `occurredAt`, `producer`, `correlationId`, `tenantId`, `traceparent`, `subject`, `payload`
- **Partition key** — `subject.claimId || subject.policyId || subject.fraudCaseId || event.id` — ordering guarantee per entity
- **Kafka headers** — `x-event-type`, `x-event-version`, `x-correlation-id`, `x-tenant-id`, `traceparent`
- **Lag monitoring** — warning اگر lag > 60s
- **Health check server** — HTTP server روی port 3041 با `/health` endpoint
- **Graceful shutdown** — `SIGTERM` و `SIGINT` handlers با `relay.stop()` (Kafka disconnect + DataSource destroy)
- **Structured logging** — `createLogger()` از `@insurance/shared` با `serviceName`, `level`, `prettyPrint`
- **Transactional processing** — `dataSource.transaction()` برای atomic batch processing
- **Ordered processing** — events مرتب بر اساس `occurred_at ASC`
- **Status management** — `pending` → `sent` (success) یا `pending` → `failed` (max attempts exceeded)
- **Attempt tracking** — `attempt_count` increment در هر failure
- **Error message storage** — `error_message` در outbox_events
- **`@insurance/shared`** — استفاده از shared package برای `OutboxEvent`, `DeadLetterEvent`, `createDataSource`, `createEventEnvelope`, `createLogger`
- **`synchronize: false`** — عدم auto-sync (صحیح برای production)
- **Configurable** — تمام تنظیمات از env vars (POLL_INTERVAL_MS, BATCH_SIZE, MAX_ATTEMPTS, DLQ_ON_PERMANENT_FAILURE, BASE_RETRY_DELAY_MS, KAFKA_BROKERS)

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| OR-001 | متوسط | **Retry delay در transaction** — `await this.sleep(delay)` داخل transaction — کل transaction را block می‌کند — سایر events در همان batch منتظر می‌مانند |
| OR-002 | متوسط | **عدم schema isolation** — `createDataSource` از shared — عدم مشخص کردن schema اختصاصی |
| OR-003 | متوسط | **عدم authentication در health endpoint** — `/health` بدون auth — قابل قبول برای health check اما اطلاعات service name leak می‌کند |
| OR-004 | کم | **عدم metrics endpoint** — عدم Prometheus/Grafana metrics (lag, throughput, error rate) |
| OR-005 | کم | **عدم multi-tenant support** — عدم tenant-based partitioning یا filtering |
| OR-006 | کم | **`sleep` inside `publishOne`** — exponential backoff داخل transaction — اگر چندین events fail کنند، cumulative delay بسیار طولانی |
| OR-007 | کم | **عدم Kafka topic auto-creation check** — اگر topic وجود نداشته باشد، error |
| OR-008 | کم | **عدم health check عمیق** — `/health` فقط status ok برمی‌گرداند — عدم Kafka connectivity check یا DB connectivity check |

**درجه‌بندی منطق پیاده‌سازی:** **۸/۱۰** — Transaction Outbox Pattern با `FOR UPDATE SKIP LOCKED`، Kafka producer integration با retry، batch processing با configurable size و interval، retry با exponential backoff و cap، DLQ برای permanently failed events با full event data و error info، event envelope با correlation ID و tenant ID و traceparent، partition key برای ordering guarantee، lag monitoring، health check server، graceful shutdown، structured logging، transactional processing، ordered processing، `@insurance/shared` usage، `synchronize: false`. اما **retry delay در transaction** (متوسط — کل transaction را block می‌کند)، **عدم schema isolation**، و **عدم metrics endpoint** از نواقص اصلی هستند.

#### ۳۳.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- PostgreSQL با TypeORM
- `OutboxEvent` و `DeadLetterEvent` از `@insurance/shared`
- `synchronize: false` — صحیح برای production
- `FOR UPDATE SKIP LOCKED` — PostgreSQL advisory locking
- Transactional batch processing
- Ordered processing (`ORDER BY occurred_at ASC`)
- Status management (`pending`, `sent`, `failed`)
- Attempt tracking و error message storage
- DLQ با full event data و error info

**اشکالات:**
- **عدم schema isolation** (OR-002) — عدم مشخص کردن schema اختصاصی
- **Retry delay در transaction** (OR-001) — کل transaction را block می‌کند
- عدم connection pool tuning
- عدم index verification (نیاز به index روی `status`, `attempt_count`, `occurred_at`)

**درجه‌بندی پایگاه‌داده:** **۷/۱۰**

#### ۳۳.۳ وضعیت امنیتی

**نقاط قوت:**
- `synchronize: false` — صحیح برای production
- Graceful shutdown
- Structured logging
- DLQ برای audit trail của failed events
- `@insurance/shared` برای consistent entity definitions
- DB credentials از env vars
- Kafka brokers از env vars

**اشکالات:**
- **عدم authentication در health endpoint** (OR-003) — قابل قبول اما service name leak
- عدم rate limiting (نیازی نیست — internal service)
- عدم security headers (نیازی نیست — فقط health endpoint)
- عدم Kafka SASL/SSL configuration — عدم authentication برای Kafka

**درجه‌بندی امنیتی:** **۶/۱۰**

#### ۳۳.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Kafka producer integration** — KafkaJS با retry configuration
- **`@insurance/shared`** — استفاده از shared package برای entities, data source, event envelope, logger
- **Event envelope** — استاندارد event format با `eventId`, `eventType`, `eventVersion`, `occurredAt`, `producer`, `correlationId`, `tenantId`, `traceparent`, `subject`, `payload`
- **Kafka headers** — `x-event-type`, `x-event-version`, `x-correlation-id`, `x-tenant-id`, `traceparent`
- **Partition key** — `subject.claimId || subject.policyId || subject.fraudCaseId || event.id`
- **Correlation ID propagation**
- **Tenant ID propagation**
- **Traceparent propagation** — W3C Trace Context
- **DLQ** — Dead Letter Queue برای failed events
- **Health check** — `/health` endpoint
- **Graceful shutdown** — SIGTERM/SIGINT handlers

**اشکالات:**
- **عدم metrics endpoint** (OR-004) — عدم Prometheus/Grafana metrics
- **عدم multi-tenant support** (OR-005) — عدم tenant-based partitioning
- **عدم Kafka topic auto-creation check** (OR-007)
- **عدم health check عمیق** (OR-008) — عدم Kafka/DB connectivity check
- عدم Kafka SASL/SSL — عدم authentication برای Kafka

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی outbox-relay

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۸/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۶/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۷/۱۰** |

**وضعیت کلی:** سرویس Outbox Relay با Transaction Outbox Pattern (`FOR UPDATE SKIP LOCKED` برای concurrent processing)، Kafka producer integration (KafkaJS با retry)، batch processing (configurable batchSize و pollIntervalMs)، retry با exponential backoff و cap (30s)، Dead Letter Queue برای permanently failed events با full event data و error info، event envelope استاندارد (`createEventEnvelope` از `@insurance/shared` با correlationId, tenantId, traceparent)، partition key برای ordering guarantee (claimId/policyId/fraudCaseId/eventId)، Kafka headers (x-event-type, x-event-version, x-correlation-id, x-tenant-id, traceparent)، lag monitoring (warning > 60s)، health check server، graceful shutdown (SIGTERM/SIGINT)، structured logging، transactional processing، ordered processing (occurred_at ASC)، `@insurance/shared` usage، `synchronize: false`. اما **retry delay در transaction** (متوسط — کل transaction را block می‌کند — cumulative delay برای چندین failed events)، **عدم schema isolation**، **عدم metrics endpoint** (Prometheus/Grafana)، و **عدم Kafka SASL/SSL** از نواقص اصلی هستند. سرویس از نظر architectural design (Outbox pattern با `FOR UPDATE SKIP LOCKED` و DLQ) پیشرفته است و به‌عنوان backbone event-driven architecture سامانه عمل می‌کند.

---

### ۳۴. api-gateway

**پورت:** 18000  
**مسیر پایه:** `/` (reverse proxy برای تمام services)  
**پایگاه‌داده:** ندارد (stateless gateway)  
**فریم‌ورک:** NestJS + Fastify  
**وابستگی‌ها:** @fastify/cors, @fastify/helmet, @fastify/rate-limit, jsonwebtoken, node:http/https

#### ۳۴.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- **Reverse proxy** برای ۲۸+ upstream services با path-based routing:
  - `/auth` → auth-service (18001), `/claims` → claims-service (18002), `/rm` → claims-readmodel-service
  - `/fraud` → fraud-service (18009), `/documents` → document-service (18008), `/copilot` → copilot-service
  - `/orchestrations` → orchestrator-service (18010), `/workflows`, `/work-items`, `/dlq` → orchestrator
  - `/reg` → regulatory-gateway-service (18024), `/flags` → feature-flags-service (18011)
  - `/party` → party-kyc-service (18006), `/complaints` → complaints-service (18013)
  - `/policies` → policy-service (18007), `/payments` → payments-service (18004)
  - `/collections` → collections-service, `/aml` → aml-service (18016), `/re` → reinsurance-service (18017)
  - `/product` → product-service (18018), `/underwriting` → underwriting-service (18032)
  - `/reporting` → reporting-service, `/monitoring` → monitoring-service (18020)
  - `/document-ai` → document-ai-service, `/sales-network` → sales-network-service
  - `/notifications` → notification-service (18037), `/customer-portal` → customer-portal-service (18027)
  - `/agent-portal` → agent-portal-service (18031), `/workflow` → workflow-service (18028)
  - `/rule-engine` → rule-engine-service (18038), `/knowledge` → knowledge-service (18033)
  - `/model-switchboard` → model-switchboard-service (18035), `/billing` → billing-service (18039)
- **Circuit Breaker** — per-service circuit breaker با ۳ state (CLOSED, OPEN, HALF_OPEN):
  - Configurable `failureThreshold` (default 5), `recoveryTimeout` (default 60s), `successThreshold` (default 2)
  - HALF_OPEN → CLOSED بعد از `successThreshold` consecutive successes
  - Admin endpoints: `GET /admin/circuit-breakers` (status), `POST /admin/circuit-breakers/:serviceName/reset`
- **Rate Limiting** — دو لایه:
  - Global rate limiting via `@fastify/rate-limit` (configurable `RATE_LIMIT_MAX`, default 100 per 15min)
  - Per-tenant per-endpoint rate limiting via in-memory `Map` (configurable `RATE_LIMIT_MAX_PER_TENANT`, `RATE_LIMIT_WINDOW_MS`)
  - `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- **Security middleware**:
  - `@fastify/helmet` — security headers
  - `@fastify/cors` — CORS
- **Correlation ID** — extraction از header یا generation، propagation به upstream
- **Tenant ID** — extraction از header یا `DEFAULT_TENANT_ID`، propagation به upstream
- **JWT decoding** — `jwt.decode(token)` برای extract `userId`/`sub` — propagation به upstream via `X-User-Id` header
- **AI-enabled flag** — `X-AI-Enabled` header propagation
- **Traceparent** — W3C Trace Context propagation
- **Upstream health tracking** — periodic health checks (configurable interval, default 30s):
  - `HEALTH_CHECK_FAILURE_THRESHOLD` (default 3) — بعد از آن upstream unhealthy
  - `HEALTH_CHECK_RECOVERY_MS` (default 60s) — recovery period
  - `isUpstreamHealthy()` check قبل از proxying — 503 اگر unhealthy
- **Deep health check** — `GET /health/deep` با ۲۸+ external service health checks
- **Upstream health endpoint** — `GET /gateway/health/upstreams` با per-upstream status
- **Header canonicalization** — حذف duplicate headers (case-insensitive) قبل از proxying
- **Body forwarding** — JSON و raw body support
- **Content-type aware response** — JSON parse برای `application/json`، raw برای سایر
- **No-proxy configuration** — حذف proxy env vars برای جلوگیری از proxy interference
- **URL validation** — `assertValidUrl()` برای upstream URLs
- **Graceful error handling** — 502 برای upstream errors، 503 برای unhealthy upstream
- **Proxy header management** — حذف `host` و `connection` headers قبل از forwarding

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| AG-001 | بحرانی | **عدم JWT verification** — `jwt.decode(token)` فقط decode می‌کند نه verify — هر کاربر می‌تواند fake JWT بسازد — عدم signature verification — بحرانی برای امنیتی |
| AG-002 | متوسط | **Rate limiting in-memory (`Map`)** — در multi-instance deployment کار نمی‌کند — عدم Redis-backed rate limiting |
| AG-003 | متوسط | **Circuit breaker state in-memory (`Map`)** — در multi-instance deployment کار نمی‌کند — عدم distributed circuit breaker |
| AG-004 | متوسط | **Upstream health tracking in-memory** — در multi-instance deployment کار نمی‌کند |
| AG-005 | متوسط | **`global` object برای circuit breakers** — `(global as any).circuitBreakers` — anti-pattern — عدم DI |
| AG-006 | متوسط | **عدم authentication/authorization در gateway** — gateway فقط JWT decode می‌کند اما هیچ auth check انجام نمی‌دهد — هر request به upstream proxy می‌شود |
| AG-007 | متوسط | **عدم API key validation** — عدم API key برای external clients |
| AG-008 | کم | **عدم request logging** — عدم structured request/response logging |
| AG-009 | کم | **عدم response caching** — عدم caching برای GET requests |
| AG-010 | کم | **عدم request/response transformation** — عدم request/response rewriting |
| AG-011 | کم | **عدم WebSocket support** — عدم WebSocket proxying |
| AG-012 | کم | **`console.log` برای logging** — عدم structured logging در gateway |
| AG-013 | کم | **عدم Kafka integration** — عدم event publishing برای gateway events |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Reverse proxy برای ۲۸+ services با path-based routing، circuit breaker (۳ state, configurable, admin endpoints)، دو لایه rate limiting (global + per-tenant per-endpoint)، security middleware (helmet, CORS)، correlation ID, tenant ID, JWT decoding, AI-enabled flag, traceparent propagation, upstream health tracking با periodic checks, deep health check, upstream health endpoint, header canonicalization, body forwarding, content-type aware response, no-proxy configuration, URL validation, graceful error handling. اما **عدم JWT verification** (بحرانی — فقط decode نه verify)، **rate limiting in-memory** (متوسط — در multi-instance کار نمی‌کند)، **circuit breaker in-memory** (متوسط)، **عدم auth check در gateway** (متوسط — هر request proxy می‌شود)، و **`global` object anti-pattern** از نواقص اصلی هستند.

#### ۳۴.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- Stateless gateway — عدم database dependency
- `@Optional() @InjectDataSource()` در HealthController — optional DB check در deep health
- Upstream service URLs از env vars با fallback defaults
- URL validation برای upstream URLs
- No-proxy configuration برای جلوگیری از proxy interference

**اشکالات:**
- Rate limiting in-memory (AG-002) — عدم Redis
- Circuit breaker in-memory (AG-003) — عدم distributed state
- Upstream health in-memory (AG-004) — عدم distributed state

**درجه‌بندی پایگاه‌داده:** **N/A** (stateless gateway — عدم database dependency)

#### ۳۴.۳ وضعیت امنیتی

**نقاط قوت:**
- `@fastify/helmet` — security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- `@fastify/cors` — CORS
- Rate limiting (global + per-tenant)
- Correlation ID
- Tenant ID isolation
- JWT decoding برای userId extraction
- Header canonicalization — حذف duplicate headers
- Proxy header management — حذف `host` و `connection`
- No-proxy configuration
- URL validation برای upstream URLs

**اشکالات:**
- **عدم JWT verification** (AG-001) — بحرانی — `jwt.decode()` فقط decode می‌کند نه verify — هر کاربر می‌تواند fake JWT بسازد
- **عدم auth check در gateway** (AG-006) — هر request به upstream proxy می‌شود بدون auth check
- **عدم API key validation** (AG-007)
- **Admin endpoints بدون auth** — `/admin/circuit-breakers` و `/admin/circuit-breakers/:serviceName/reset` بدون authentication
- **Rate limiting in-memory** (AG-002) — در multi-instance bypass 가능
- **`console.log` برای logging** (AG-012) — عدم structured logging

**درجه‌بندی امنیتی:** **۴/۱۰**

#### ۳۴.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **Reverse proxy برای ۲۸+ services** — central entry point برای تمام microservices
- **Path-based routing** — consistent URL structure (`/auth`, `/claims`, `/policies`, etc.)
- **Circuit breaker** — per-service resilience با ۳ state و admin endpoints
- **Upstream health tracking** — periodic health checks با configurable interval
- **Deep health check** — `GET /health/deep` با ۲۸+ service checks
- **Upstream health endpoint** — `GET /gateway/health/upstreams`
- **Correlation ID propagation** — end-to-end tracing
- **Tenant ID propagation** — multi-tenant support
- **JWT userId extraction** — `X-User-Id` header برای downstream services
- **AI-enabled flag propagation** — `X-AI-Enabled` header
- **Traceparent propagation** — W3C Trace Context
- **Header management** — canonicalization و cleanup
- **Body forwarding** — JSON و raw body
- **Content-type aware response**
- **Graceful error handling** — 502/503 با structured error responses

**اشکالات:**
- **عدم JWT verification** (AG-001) — بحرانی — downstream services باید خودشان verify کنند
- **عدم auth check در gateway** (AG-006) — gateway به‌عنوان pass-through عمل می‌کند
- **Rate limiting in-memory** (AG-002) — در multi-instance کار نمی‌کند
- **Circuit breaker in-memory** (AG-003) — در multi-instance کار نمی‌کند
- **عدم Kafka integration** (AG-013)
- **عدم WebSocket support** (AG-011)
- **عدم request logging** (AG-008)
- **`console.log` برای logging** (AG-012)

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی api-gateway

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | N/A |
| امنیتی | ۴/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس API Gateway به‌عنوان reverse proxy برای ۲۸+ microservices با path-based routing (`/auth`, `/claims`, `/policies`, `/payments`, etc.)، circuit breaker (۳ state: CLOSED/OPEN/HALF_OPEN با configurable thresholds و admin endpoints)، دو لایه rate limiting (global via `@fastify/rate-limit` + per-tenant per-endpoint via in-memory Map)، security middleware (`@fastify/helmet`, `@fastify/cors`)، correlation ID, tenant ID, JWT decoding, AI-enabled flag, traceparent propagation، upstream health tracking با periodic checks (configurable interval, failure threshold, recovery period)، deep health check (`GET /health/deep` با ۲۸+ service checks)، upstream health endpoint (`GET /gateway/health/upstreams`)، header canonicalization، body forwarding (JSON + raw)، content-type aware response، no-proxy configuration، URL validation، graceful error handling (502/503). اما **عدم JWT verification** (بحرانی — `jwt.decode()` فقط decode می‌کند نه verify — هر کاربر می‌تواند fake JWT بسازد)، **عدم auth check در gateway** (متوسط — هر request به upstream proxy می‌شود بدون auth check)، **admin endpoints بدون auth**، **rate limiting in-memory** (متوسط — در multi-instance bypass 가능)، **circuit breaker in-memory** (متوسط — در multi-instance کار نمی‌کند)، **`global` object anti-pattern**، و **`console.log` برای logging** از نواقص اصلی هستند. سرویس از نظر routing و resilience (circuit breaker, health tracking) پیشرفته است اما از نظر security (عدم JWT verification, عدم auth check) ناقص است.

---

### ۳۵. web-ui

**پورت:** 18042  
**مسیر پایه:** `/` (Next.js App Router)  
**پایگاه‌داده:** ندارد (client-side SPA)  
**فریم‌ورک:** Next.js 14.2.5 (App Router) + React 18.3.1 + TailwindCSS  
**وابستگی‌ها:** @insurance/design-system, @insurance/ui-utils, @insurance/api-client, clsx, tailwind-merge, lucide-react

#### ۳۵.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- **Next.js 14 App Router** با `reactStrictMode: true`
- **RTL support** — `<html lang="fa" dir="rtl">` — فارسی و RTL
- **۲۸+ page modules**:
  - `/` — Dashboard
  - `/party` — اشخاص / KYC
  - `/policies` — بیمه‌نامه‌ها
  - `/payments` — پرداخت‌ها
  - `/collections` — اقساط و وصول
  - `/aml` — AML / انطباق
  - `/work-items` — کارها (Work Items)
  - `/claims` — خسارت
  - `/documents` — اسناد
  - `/fraud` — تقلب
  - `/complaints` — شکایات
  - `/reinsurance/contracts` — اتکایی (Reinsurance)
  - `/product` — محصولات (Product)
  - `/sales-network/partners` — شبکه فروش
  - `/reporting` — گزارش‌ها / KPI
  - `/monitoring` — Monitoring / SLO
  - `/dlq` — DLQ
  - `/document-ai` — Document AI
  - `/ai-governance` — AI Governance
  - `/sanhab` — سنهاب / کد یکتا
  - `/underwriting` — Underwriting
  - `/loss-adjuster` — Loss Adjuster
  - `/admin/users` — کاربران
  - `/admin/jobs` — کارهای پس‌زمینه
  - `/admin/feature-flags` — Feature Flags
  - `/admin/tracing` — Distributed Tracing
  - `/admin/audit-log` — Audit Log
  - `/admin/realtime-test` — تست زنده
  - `/org-units` — واحدهای سازمانی
  - `/settings` — تنظیمات
  - `/login` — ورود
  - `/forbidden` — دسترسی ممنوع
- **Enterprise RBAC** — `enterprise-rbac.ts` با ۱۰۰+ permission keys و role-to-permission mapping:
  - Operational: claims, underwriting, payments, collections, AML, fraud, complaints, sales_network, documents, work_items, party, KYC, reporting, monitoring, document_ai, settings, DLQ
  - Admin: users (list/view/create/update/deactivate), roles (view/create/update)
  - Read Model: rm:claims:view, rm:fraud:view, rm:complaints:view
- **Navigation filtering** — sidebar و bottom nav بر اساس roles و permissions فیلتر می‌شوند
- **Workspace switcher** — ۵ workspace (ops, claims, uw, fraud, admin)
- **AI Toggle** — `AiToggle` component برای enable/disable AI features
- **Realtime support** — `RealtimeManager` با `EventSource` (SSE) و auto-reconnect (max 5 attempts, exponential delay)
- **i18n** — ۳ زبان (fa, en, ar) با `TranslationKey` و `Translations` interface — ۱۱۲۱ lines
- **Theme support** — light/dark themes از `@insurance/design-system`
- **Toast notifications** — `ToastProvider` و `ToastViewport`
- **API client** — `apiFetch()` با:
  - `auth-token` از localStorage
  - `x-ai-enabled` header
  - `x-tenant-id` header
  - `authorization` header (Bearer token)
  - 401 → redirect to `/login` + clear auth state
  - 403 → redirect to `/forbidden`
  - Correlation ID extraction از response headers
  - `cache: 'no-store'`
- **Auth state management** — `getAuthUser()`, `getAuthToken()`, `clearAuthState()`, `hasAuthToken()`
- **JWT verification** — `verifyJWT()` با `jsonwebtoken` و `JWT_SECRET` از env
- **Shared packages** — `@insurance/design-system`, `@insurance/ui-utils`, `@insurance/api-client`
- **Lucide icons** — `lucide-react` برای iconography
- **TailwindCSS** — utility-first styling
- **SkipLink** — accessibility
- **BottomNav** — mobile navigation
- **UserSession** — user session display
- **BulkActions** — bulk action component
- **ConfirmDialog** — confirmation dialog
- **LoadingSpinner** — loading state
- **OverviewCards** — dashboard cards
- **LanguageSwitcher** — language toggle
- **Dockerfile** — containerization support
- **ESLint** — `eslint-config-next`
- **TypeScript** — strict typing

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| WU-001 | بحرانی | **JWT token در localStorage** — `localStorage.getItem('auth-token')` — XSS attack می‌تواند token را steal کند — باید از httpOnly cookie استفاده شود |
| WU-002 | متوسط | **`JWT_SECRET` default insecure** — `process.env.JWT_SECRET || 'your-secret-key'` — default secret در صورت عدم تنظیم env var |
| WU-003 | متوسط | **Auth check client-side only** — `hasAuthToken()` در client-side — server-side protection وجود ندارد — user می‌تواند client-side check را bypass کند |
| WU-004 | متوسط | **`realtime.ts` از `auth_token` استفاده می‌کند** — `localStorage.getItem('auth_token')` — اما `api.ts` از `auth-token` استفاده می‌کند — inconsistency در key name |
| WU-005 | متوسط | **عدم SSR auth** — عدم server-side authentication — تمام auth در client-side |
| WU-006 | کم | **`NEXT_PUBLIC_API_BASE_URL` fallback to localhost** — `http://localhost:18000` — در production باید تنظیم شود |
| WU-007 | کم | **`console.log` در realtime.ts** — عدم structured logging |
| WU-008 | کم | **عدم error boundary** — عدم global error boundary برای React error handling |
| WU-009 | کم | **عدم unit tests** — عدم test coverage |
| WU-010 | کم | **عدم CSP header** — عدم Content-Security-Policy header در Next.js config |

**درجه‌بندی منطق پیاده‌سازی:** **۷/۱۰** — Next.js 14 App Router با RTL support، ۲۸+ page modules covering تمام insurance operations، enterprise RBAC با ۱۰۰+ permission keys، navigation filtering بر اساس roles/permissions، workspace switcher، AI toggle، realtime support (SSE با auto-reconnect)، i18n (fa/en/ar)، theme support (light/dark)، toast notifications، API client با auth/tenant/AI headers و 401/403 handling، JWT verification، shared packages (@insurance/design-system, @insurance/ui-utils, @insurance/api-client)، Lucide icons، TailwindCSS، accessibility (SkipLink)، mobile navigation (BottomNav)، Dockerfile. اما **JWT token در localStorage** (بحرانی — XSS vulnerable)، **auth check client-side only** (متوسط — bypass 가능)، **`JWT_SECRET` default insecure** (متوسط)، **inconsistency در auth token key name** (متوسط)، و **عدم SSR auth** (متوسط) از نواقص اصلی هستند.

#### ۳۵.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- Stateless UI — عدم database dependency
- `@insurance/design-system` — shared design system
- `@insurance/ui-utils` — shared UI utilities
- `@insurance/api-client` — shared API client
- `NEXT_PUBLIC_API_BASE_URL` — configurable API base URL
- `transpilePackages` — transpile shared packages

**اشکالات:**
- `NEXT_PUBLIC_API_BASE_URL` fallback to localhost (WU-006)
- عدم environment-specific configuration

**درجه‌بندی پایگاه‌داده:** **N/A** (stateless UI — عدم database dependency)

#### ۳۵.۳ وضعیت امنیتی

**نقاط قوت:**
- `reactStrictMode: true` — React strict mode
- JWT verification با `jsonwebtoken`
- 401 → redirect to `/login` + clear auth state
- 403 → redirect to `/forbidden`
- Enterprise RBAC با ۱۰۰+ permission keys
- Navigation filtering بر اساس roles/permissions
- `cache: 'no-store'` — عدم caching برای API responses
- Auth state management با `clearAuthState()`

**اشکالات:**
- **JWT token در localStorage** (WU-001) — بحرانی — XSS attack می‌تواند token را steal کند
- **`JWT_SECRET` default insecure** (WU-002) — `'your-secret-key'` fallback
- **Auth check client-side only** (WU-003) — bypass 가능
- **عدم SSR auth** (WU-005) — عدم server-side protection
- **عدم CSP header** (WU-010)
- **inconsistency در auth token key name** (WU-004) — `auth-token` vs `auth_token`

**درجه‌بندی امنیتی:** **۴/۱۰**

#### ۳۵.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **API Gateway integration** — `apiFetch()` به `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:18000`)
- **Auth token propagation** — `Authorization: Bearer {token}` header
- **Tenant ID propagation** — `x-tenant-id` header
- **AI-enabled flag propagation** — `x-ai-enabled` header
- **Correlation ID** — extraction از response headers
- **Realtime integration** — SSE (`EventSource`) به `/api/realtime`
- **Enterprise RBAC** — ۱۰۰+ permission keys covering تمام microservices
- **i18n** — ۳ زبان (fa, en, ar)
- **Shared packages** — `@insurance/design-system`, `@insurance/ui-utils`, `@insurance/api-client`
- **۲۸+ page modules** — covering تمام insurance operations
- **Workspace switcher** — ۵ workspace (ops, claims, uw, fraud, admin)

**اشکالات:**
- **JWT token در localStorage** (WU-001) — بحرانی
- **Auth check client-side only** (WU-003) — server-side protection وجود ندارد
- **inconsistency در auth token key name** (WU-004) — `auth-token` vs `auth_token`
- **عدم SSR auth** (WU-005)
- `NEXT_PUBLIC_API_BASE_URL` fallback to localhost (WU-006)

**درجه‌بندی ادغام:** **۷/۱۰**

#### جمع‌بندی web-ui

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۷/۱۰ |
| پایگاه‌داده | N/A |
| امنیتی | ۴/۱۰ |
| ادغام | ۷/۱۰ |
| **کل** | **۶/۱۰** |

**وضعیت کلی:** سرویس Web UI (Next.js 14 App Router) با ۲۸+ page modules covering تمام insurance operations (dashboard, party/KYC, policies, payments, collections, AML, work-items, claims, documents, fraud, complaints, reinsurance, product, sales-network, reporting, monitoring, DLQ, document-ai, ai-governance, sanhab, underwriting, loss-adjuster, admin), enterprise RBAC با ۱۰۰+ permission keys و role-to-permission mapping، navigation filtering بر اساس roles/permissions، workspace switcher (ops/claims/uw/fraud/admin)، AI toggle، realtime support (SSE با auto-reconnect)، i18n (fa/en/ar با ۱۱۲۱ lines)، theme support (light/dark)، toast notifications، API client با auth/tenant/AI headers و 401/403 handling، JWT verification، shared packages (@insurance/design-system, @insurance/ui-utils, @insurance/api-client)، Lucide icons، TailwindCSS، RTL support، accessibility (SkipLink)، mobile navigation (BottomNav)، Dockerfile. اما **JWT token در localStorage** (بحرانی — XSS vulnerable — باید از httpOnly cookie استفاده شود)، **auth check client-side only** (متوسط — bypass ممکن — عدم SSR auth)، **`JWT_SECRET` default insecure** (متوسط)، **inconsistency در auth token key name** (`auth-token` vs `auth_token`)، و **عدم CSP header** از نواقص اصلی هستند. سرویس از نظر UI coverage (۲۸+ pages) و RBAC (۱۰۰+ permissions) پیشرفته است اما از نظر security (JWT in localStorage, client-side auth only) ناقص است.

---

### ۳۶. customer-portal-ui

**پورت:** 18043  
**مسیر پایه:** `/` (Next.js App Router)  
**پایگاه‌داده:** ندارد (client-side SPA)  
**فریم‌ورک:** Next.js 14.1.0 (App Router) + React 18 + TailwindCSS + Capacitor (mobile)  
**وابستگی‌ها:** @insurance/design-system, @insurance/ui-utils, @insurance/api-client, axios, @tanstack/react-query, lucide-react, zod, react-hook-form, @hookform/resolvers, next-themes

#### ۳۶.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- **Next.js 14 App Router** با RTL support (`<html lang="fa" dir="rtl">`)
- **Capacitor integration** — `capacitor.config.ts` با:
  - `appId: 'com.insurance.customerportal'`, `appName: 'بیمه پلاس'`
  - `androidScheme: 'https'`
  - SplashScreen plugin (2s duration, backgroundColor)
  - PushNotifications plugin (badge, sound, alert)
- **PWA support** — Service Worker registration در layout.tsx، manifest.json، apple-touch-icon
- **OTP-based authentication** — دو مرحله‌ای (phone → OTP):
  - `handleRequestOtp` — POST `/api/portal/otp/initiate` با phoneNumber
  - `handleVerifyOtp` — POST `/api/portal/otp/verify` با phoneNumber + otpCode
  - JWT token در localStorage
  - 401 → redirect to `/`
- **۸ page modules**:
  - `/` — Login (OTP)
  - `/dashboard` — Dashboard
  - `/policies` — بیمه‌نامه‌ها
  - `/claims` — خسارات
  - `/payments` — پرداخت‌ها
  - `/complaints` — شکایات
  - `/fnol` — ثبت خسارت (FNOL)
  - `/endorsement` — الحاقیه
  - `/renewal` — تمدید
  - `/profile` — پروفایل
  - `/chatbot` — چت‌بات
- **API client** (axios) با:
  - `baseURL: ${API_BASE_URL}/customer-portal`
  - Request interceptor — `Authorization: Bearer {token}` از localStorage
  - Response interceptor — 401 → clear token + redirect to `/`
- **API modules**:
  - `authApi` — initiateOtp, verifyOtp, getSession, revokeSession
  - `policiesApi` — list, getById, endorse, scheduleRenewal
  - `claimsApi` — list, getById, submitFnol
  - `paymentsApi` — list, getById
  - `complaintsApi` — list, getById, create
- **React Query** — `@tanstack/react-query` برای data fetching
- **React Hook Form + Zod** — form validation
- **Shared packages** — `@insurance/design-system`, `@insurance/ui-utils`, `@insurance/api-client`
- **Theme support** — light/dark via `next-themes`
- **Toast notifications** — `ToastProvider` و `ToastViewport`
- **Mobile-first design** — `max-w-lg` layout، BottomNav، FAB برای FNOL
- **Accessibility** — SkipLink با Persian label
- **Lucide icons** — iconography
- **TailwindCSS** — utility-first styling
- **Dockerfile** — containerization support
- **TypeScript** — strict typing
- **ESLint** — `eslint-config-next`
- **`.env.example`** — environment variable documentation

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| CP-001 | بحرانی | **JWT token در localStorage** — `localStorage.setItem('auth_token', data.data.token)` — XSS attack می‌تواند token را steal کند |
| CP-002 | متوسط | **Auth check client-side only** — عدم server-side authentication — user می‌تواند client-side check را bypass کند |
| CP-003 | متوسط | **`NEXT_PUBLIC_API_URL` fallback to localhost:3000** — `http://localhost:3000` — باید به API Gateway (18000) اشاره کند |
| CP-004 | متوسط | **`userScalable: false`** — accessibility issue — عدم امکان zoom برای users با visual impairments |
| CP-005 | متوسط | **`dangerouslySetInnerHTML` برای Service Worker** — inline script — potential XSS vector |
| CP-006 | کم | **عدم RBAC** — عدم role-based access control — تمام authenticated users به تمام pages دسترسی دارند |
| CP-007 | کم | **عدم error boundary** — عدم global error boundary |
| CP-008 | کم | **عدم unit tests** |
| CP-009 | کم | **عدم i18n** — عدم multi-language support (فارسی فقط hardcoded) |
| CP-010 | کم | **`scheduleRenewal` فقط `newEndDate` را send می‌کند** — `newStartDate`, `newPremium`, `type`, `notes` ignore می‌شوند |
| CP-011 | کم | **`submitFnol` و `complaintsApi.create` از `data: any` استفاده می‌کنند** — عدم typed DTO |

**درجه‌بندی منطق پیاده‌سازی:** **۶/۱۰** — Next.js 14 App Router با RTL support، Capacitor integration (mobile app با PushNotifications)، PWA support (Service Worker, manifest)، OTP-based authentication (دو مرحله‌ای)، ۸ page modules covering customer-facing operations (dashboard, policies, claims, payments, complaints, FNOL, endorsement, renewal, profile, chatbot)، API client (axios با interceptors)، React Query، React Hook Form + Zod، shared packages، theme support، toast notifications، mobile-first design، accessibility (SkipLink)، FAB برای quick FNOL، Dockerfile. اما **JWT token در localStorage** (بحرانی — XSS vulnerable)، **auth check client-side only** (متوسط)، **`NEXT_PUBLIC_API_URL` fallback to localhost:3000** (متوسط — باید به 18000 اشاره کند)، **`userScalable: false`** (متوسط — accessibility)، **`dangerouslySetInnerHTML`** (متوسط)، **عدم RBAC** (کم)، و **عدم i18n** (کم) از نواقص اصلی هستند.

#### ۳۶.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- Stateless UI — عدم database dependency
- `@insurance/design-system` — shared design system
- `@insurance/ui-utils` — shared UI utilities
- `@insurance/api-client` — shared API client
- `NEXT_PUBLIC_API_URL` — configurable API base URL
- Capacitor for mobile app generation

**اشکالات:**
- `NEXT_PUBLIC_API_URL` fallback to localhost:3000 (CP-003) — باید به API Gateway (18000) اشاره کند
- عدم environment-specific configuration

**درجه‌بندی پایگاه‌داده:** **N/A** (stateless UI — عدم database dependency)

#### ۳۶.۳ وضعیت امنیتی

**نقاط قوت:**
- OTP-based authentication — عدم password-based auth
- 401 → clear token + redirect to login
- `Content-Type: application/json` default header
- TypeScript strict typing
- `@insurance/design-system` — shared security-conscious components

**اشکالات:**
- **JWT token در localStorage** (CP-001) — بحرانی — XSS attack می‌تواند token را steal کند
- **Auth check client-side only** (CP-002) — bypass ممکن
- **`dangerouslySetInnerHTML` برای Service Worker** (CP-005) — inline script — potential XSS vector
- **عدم RBAC** (CP-006) — تمام authenticated users به تمام pages دسترسی دارند
- **عدم CSP header** — عدم Content-Security-Policy
- **`userScalable: false`** (CP-004) — accessibility issue

**درجه‌بندی امنیتی:** **۳/۱۰**

#### ۳۶.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **API Gateway integration** — axios به `${NEXT_PUBLIC_API_URL}/customer-portal`
- **Customer Portal Service integration** — تمام API calls به `/customer-portal` namespace
- **OTP authentication** — `/otp/initiate` و `/otp/verify` endpoints
- **Session management** — `/session` و `/session/revoke` endpoints
- **Policy operations** — list, getById, endorse, scheduleRenewal
- **Claims operations** — list, getById, submitFnol
- **Payments operations** — list, getById
- **Complaints operations** — list, getById, create
- **Shared packages** — `@insurance/design-system`, `@insurance/ui-utils`, `@insurance/api-client`
- **Capacitor** — mobile app generation برای Android/iOS
- **PWA** — Service Worker, manifest, offline support

**اشکالات:**
- `NEXT_PUBLIC_API_URL` fallback to localhost:3000 (CP-003) — باید به API Gateway (18000) اشاره کند
- `scheduleRenewal` فقط `newEndDate` را send می‌کند (CP-010) — سایر fields ignore می‌شوند
- `submitFnol` و `complaintsApi.create` از `data: any` (CP-011) — عدم typed DTO
- عدم i18n (CP-009) — فقط فارسی hardcoded
- عدم RBAC (CP-006)

**درجه‌بندی ادغام:** **۶/۱۰**

#### جمع‌بندی customer-portal-ui

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۶/۱۰ |
| پایگاه‌داده | N/A |
| امنیتی | ۳/۱۰ |
| ادغام | ۶/۱۰ |
| **کل** | **۵/۱۰** |

**وضعیت کلی:** سرویس Customer Portal UI (Next.js 14 App Router + Capacitor) با OTP-based authentication (دو مرحله‌ای: phone → OTP)، ۸ page modules covering customer-facing operations (dashboard, policies, claims, payments, complaints, FNOL, endorsement, renewal, profile, chatbot)، API client (axios با interceptors و auth token propagation)، React Query برای data fetching، React Hook Form + Zod برای form validation، Capacitor integration برای mobile app generation (Android/iOS با PushNotifications)، PWA support (Service Worker, manifest, offline)، shared packages (@insurance/design-system, @insurance/ui-utils, @insurance/api-client)، theme support (light/dark via next-themes)، toast notifications، mobile-first design (max-w-lg, BottomNav, FAB)، accessibility (SkipLink)، RTL support، Dockerfile. اما **JWT token در localStorage** (بحرانی — XSS vulnerable)، **auth check client-side only** (متوسط — bypass ممکن)، **`NEXT_PUBLIC_API_URL` fallback to localhost:3000** (متوسط — باید به API Gateway 18000 اشاره کند)، **`userScalable: false`** (متوسط — accessibility)، **`dangerouslySetInnerHTML`** (متوسط — XSS vector)، **عدم RBAC** (کم — تمام authenticated users به تمام pages)، و **عدم i18n** (کم — فقط فارسی hardcoded) از نواقص اصلی هستند. سرویس از نظر mobile-first design و Capacitor integration پیشرفته است اما از نظر security (JWT in localStorage, dangerouslySetInnerHTML) و integration (wrong API URL fallback) ناقص است.

---

### ۳۷. agent-portal-ui

**پورت:** 18044  
**مسیر پایه:** `/` (Next.js Pages Router)  
**پایگاه‌داده:** ندارد (client-side SPA)  
**فریم‌ورک:** Next.js 14 (Pages Router) + React 18 + TailwindCSS  
**وابستگی‌ها:** @insurance/design-system, @insurance/ui-utils, @insurance/api-client, axios, lucide-react, recharts, date-fns, swr

#### ۳۷.۱ وضعیت منطق پیاده‌سازی

**نقاط قوت:**
- **Next.js 14 Pages Router** با `reactStrictMode: true`
- **RTL support** — Persian labels در navigation
- **۷ page modules**:
  - `/` — Dashboard (EnhancedDashboard با charts)
  - `/customers` — مشتریان
  - `/commissions` — کمیسیون
  - `/leads` — سرنخ‌ها
  - `/portfolio` — پرتفوی
  - `/quotes` — پیشنهادات (در nav اما page directory وجود ندارد)
  - `/settings` — تنظیمات (در nav اما page directory وجود ندارد)
- **AgentPortalAPI class** — typed API client با:
  - `login(username, password)` — POST `/agent-portal/login` — returns token, agentId, partnerId, tenantId
  - `getDashboardStats()` — totalPolicies, activePolicies, pendingPolicies, totalClaims, pendingClaims, totalCommission, pendingCommission, monthlyPremium, monthlyIssuance
  - `getPolicies(filters)` — status, fromDate, toDate filters
  - `getCommissions(filters)` — status, fromDate, toDate filters
  - `getPremiumTrends(months)` — 12 months default
  - `getCommissionHistory(months)` — 12 months default
  - `getPolicyPortfolio()` — per-product breakdown
  - `getLeads()` — lead management با status (new/contacted/qualified/converted/lost) و priority (high/medium/low)
  - `connectWebSocket()` — WebSocket برای real-time updates
  - `connectEventSource()` — SSE برای real-time updates
- **Typed interfaces** — DashboardStats, PremiumTrendData, CommissionHistoryData, PolicyPortfolioData, AgentPolicy, AgentCommission
- **Auth state management** — `setAuth(token, agentId, partnerId, tenantId)`, `clearAuth()`
- **Command Palette** — `⌘K` shortcut با CommandPalette از @insurance/design-system
- **Sidebar navigation** — ۵ nav items با active state
- **Bell notifications** — notification indicator
- **Theme support** — light/dark via ThemeProvider
- **Recharts** — chart library برای dashboard visualizations
- **SWR** — data fetching library
- **date-fns** — date utilities
- **Shared packages** — @insurance/design-system, @insurance/ui-utils, @insurance/api-client
- **Lucide icons** — iconography
- **TailwindCSS** — utility-first styling
- **Dockerfile** — containerization support
- **TypeScript** — strict typing
- **`transpilePackages`** — transpile shared packages

**اشکالات و نواقص:**

| ID | شدت | توضیح |
|----|------|-------|
| AP-001 | بحرانی | **JWT token در class instance** — `this.token = token` — در memory ذخیره می‌شود — در page refresh از بین می‌رود — عدم persistence |
| AP-002 | متوسط | **`NEXT_PUBLIC_API_URL` fallback to localhost:3001** — `http://localhost:3001` — باید به API Gateway (18000) اشاره کند |
| AP-003 | متوسط | **عدم auth check** — عدم authentication check در `_app.tsx` یا `AgentShell` — تمام pages بدون auth check نمایش داده می‌شوند |
| AP-004 | متوسط | **عدم RBAC** — عدم role-based access control — تمام authenticated users به تمام pages دسترسی دارند |
| AP-005 | متوسط | **عدم token persistence** — `this.token` در class instance — در page refresh از بین می‌رود — عدم localStorage/sessionStorage |
| AP-006 | متوسط | **`agentId` و `partnerId` در query params** — `?agentId=${this.agentId}&partnerId=${this.partnerId}` — عدم header-based propagation — اطلاعات حساس در URL |
| AP-007 | کم | **عدم i18n** — عدم multi-language support (فارسی فقط hardcoded) |
| AP-008 | کم | **عدم error boundary** — عدم global error boundary |
| AP-009 | کم | **عدم unit tests** |
| AP-010 | کم | **`/quotes` و `/settings` در nav اما page directories وجود ندارند** — dead links |
| AP-011 | کم | **`console.log` و `console.error` در WebSocket/SSE** — عدم structured logging |
| AP-012 | کم | **عدم CSP header** — عدم Content-Security-Policy |
| AP-013 | کم | **عدم accessibility** — عدم SkipLink (برخلاف web-ui و customer-portal-ui) |

**درجه‌بندی منطق پیاده‌سازی:** **۵/۱۰** — Next.js 14 Pages Router با RTL support، ۷ page modules covering agent-facing operations (dashboard, customers, commissions, leads, portfolio)، typed API client (AgentPortalAPI class با login, dashboard stats, policies, commissions, premium trends, commission history, policy portfolio, leads, WebSocket, SSE)، typed interfaces (DashboardStats, AgentPolicy, AgentCommission, etc.)، Command Palette (⌘K)، sidebar navigation، bell notifications، theme support، Recharts، SWR، date-fns، shared packages، Dockerfile. اما **JWT token در class instance** (بحرانی — در page refresh از بین می‌رود)، **`NEXT_PUBLIC_API_URL` fallback to localhost:3001** (متوسط — باید به 18000 اشاره کند)، **عدم auth check** (متوسط)، **عدم RBAC** (متوسط)، **عدم token persistence** (متوسط)، **`agentId` و `partnerId` در query params** (متوسط — اطلاعات حساس در URL)، **dead links** (`/quotes` و `/settings`)، و **عدم accessibility** (کم) از نواقص اصلی هستند.

#### ۳۷.۲ وضعیت پایگاه‌داده و وابستگی‌های خارجی

**نقاط قوت:**
- Stateless UI — عدم database dependency
- `@insurance/design-system` — shared design system
- `@insurance/ui-utils` — shared UI utilities
- `@insurance/api-client` — shared API client
- `NEXT_PUBLIC_API_URL` — configurable API base URL
- `transpilePackages` — transpile shared packages

**اشکالات:**
- `NEXT_PUBLIC_API_URL` fallback to localhost:3001 (AP-002) — باید به API Gateway (18000) اشاره کند
- عدم environment-specific configuration

**درجه‌بندی پایگاه‌داده:** **N/A** (stateless UI — عدم database dependency)

#### ۳۷.۳ وضعیت امنیتی

**نقاط قوت:**
- `reactStrictMode: true` — React strict mode
- TypeScript strict typing
- `@insurance/design-system` — shared security-conscious components
- Auth state management با `clearAuth()`
- Password-based authentication (username/password)

**اشکالات:**
- **JWT token در class instance** (AP-001) — بحرانی — در page refresh از بین می‌رود — عدم persistence
- **عدم auth check** (AP-003) — تمام pages بدون auth check نمایش داده می‌شوند
- **عدم RBAC** (AP-004) — تمام authenticated users به تمام pages
- **`agentId` و `partnerId` در query params** (AP-006) — اطلاعات حساس در URL
- **عدم token persistence** (AP-005) — در page refresh از بین می‌رود
- **عدم CSP header** (AP-012)
- **عدم accessibility** (AP-013) — عدم SkipLink

**درجه‌بندی امنیتی:** **۳/۱۰**

#### ۳۷.۴ وضعیت ادغام با سامانه

**نقاط قوت:**
- **API Gateway integration** — `fetch()` به `${NEXT_PUBLIC_API_URL}/agent-portal`
- **Agent Portal Service integration** — تمام API calls به `/agent-portal` namespace
- **Login** — POST `/agent-portal/login` با username/password → token, agentId, partnerId, tenantId
- **Dashboard stats** — totalPolicies, activePolicies, pendingPolicies, totalClaims, pendingClaims, totalCommission, pendingCommission, monthlyPremium, monthlyIssuance
- **Policy management** — list با status/date filters
- **Commission management** — list با status/date filters
- **Premium trends** — 12 months chart data
- **Commission history** — 12 months chart data
- **Policy portfolio** — per-product breakdown
- **Lead management** — list با status و priority
- **WebSocket** — real-time updates
- **SSE** — real-time updates (fallback)
- **Shared packages** — @insurance/design-system, @insurance/ui-utils, @insurance/api-client
- **Recharts** — dashboard visualizations

**اشکالات:**
- `NEXT_PUBLIC_API_URL` fallback to localhost:3001 (AP-002) — باید به API Gateway (18000) اشاره کند
- `agentId` و `partnerId` در query params (AP-006) — باید در headers باشند
- عدم token persistence (AP-005) — در page refresh از بین می‌رود
- Dead links `/quotes` و `/settings` (AP-010)
- عدم i18n (AP-007)

**درجه‌بندی ادغام:** **۵/۱۰**

#### جمع‌بندی agent-portal-ui

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۵/۱۰ |
| پایگاه‌داده | N/A |
| امنیتی | ۳/۱۰ |
| ادغام | ۵/۱۰ |
| **کل** | **۴/۱۰** |

**وضعیت کلی:** سرویس Agent Portal UI (Next.js 14 Pages Router) با ۷ page modules covering agent-facing operations (dashboard, customers, commissions, leads, portfolio)، typed API client (AgentPortalAPI class با login, dashboard stats, policies, commissions, premium trends, commission history, policy portfolio, leads, WebSocket, SSE)، typed interfaces (DashboardStats, AgentPolicy, AgentCommission, PremiumTrendData, CommissionHistoryData, PolicyPortfolioData)، Command Palette (⌘K با CommandPalette از @insurance/design-system)، sidebar navigation، bell notifications، theme support (light/dark)، Recharts برای dashboard visualizations، SWR برای data fetching، date-fns، shared packages (@insurance/design-system, @insurance/ui-utils, @insurance/api-client)، Lucide icons، TailwindCSS، RTL support، Dockerfile. اما **JWT token در class instance** (بحرانی — در page refresh از بین می‌رود — عدم persistence)، **`NEXT_PUBLIC_API_URL` fallback to localhost:3001** (متوسط — باید به API Gateway 18000 اشاره کند)، **عدم auth check** (متوسط — تمام pages بدون auth check)، **عدم RBAC** (متوسط)، **عدم token persistence** (متوسط)، **`agentId` و `partnerId` در query params** (متوسط — اطلاعات حساس در URL)، **dead links** (`/quotes` و `/settings` در nav اما page directories وجود ندارند)، و **عدم accessibility** (کم — عدم SkipLink) از نواقص اصلی هستند. سرویس از نظر typed API client و dashboard visualizations (Recharts) متوسط است اما از نظر security (token in memory, عدم auth check, اطلاعات حساس در URL) و integration (wrong API URL fallback, dead links) ناقص است. کمترین امتیاز در میان تمام UI services.

---

### ۳۸. پکیج‌های مشترک (Common + @insurance/shared + packages)

**مسیر:** `services/common` + `packages/shared` + `packages/*`  
**نوع:** Shared libraries/packages  
**زبان:** TypeScript  

#### ۳۸.۱ `services/common` — ماژول‌های مشترک NestJS

**فایل‌ها:**
- `auth/ecosystem-jwt.guard.ts` — EcosystemJwtGuard
- `health/deep-health.service.ts` — DeepHealthService
- `resilience/bulkhead.service.ts` — BulkheadService

**نقاط قوت:**
- **EcosystemJwtGuard** — JWT authentication guard با دو حالت:
  - JWKS-based RS256 validation (برای ecosystem tokens از IAM service) با `jwks-rsa` client (cache, rateLimit)
  - Fallback to local HS256 JWT با `jwt.verify(token, this.jwtSecret)`
  - Issuer و audience validation
  - `request.user`, `request.globalUserId`, `request.scopes` extraction
  - Structured error responses (`{ success: false, error: { code, message } }`)
- **DeepHealthService** — comprehensive health checking:
  - `checkDatabase()` — `SELECT 1` + connection pool status (total, active, idle)
  - Kafka client initialization و health check
  - Redis client initialization و health check
  - `DeepHealthResponse` با status (healthy/unhealthy/degraded), checks, uptime, version
  - Latency measurement برای هر check
- **BulkheadService** — bulkhead pattern برای resilience:
  - Per-service bulkhead configs (policy, claims, fraud, underwriting, payment, sanhab, sms)
  - `maxConcurrent`, `maxWaitTime`, `timeout` per service
  - `BulkheadRejectionError` برای rejected requests
  - `BulkheadStats` (active, waiting, rejected, total connections)
  - Cleanup interval برای expired waits
  - `OnModuleDestroy` برای cleanup

**اشکالات:**
- **`JWT_SECRET` default insecure** — `'default-secret-change-in-production'` — بحرانی در production
- **`IAM_ISSUER` default to localhost:8080** — عدم production-ready default
- **`JWT_AUDIENCES` default to `'modern-banking'`** — عدم insurance-specific audience
- **JWKS fallback to HS256** — اگر JWKS fail شود، به HS256 fallback می‌کند — potential security downgrade
- **BulkheadService in-memory** — در multi-instance deployment کار نمی‌کند

#### ۳۸.۲ `@insurance/shared` (packages/shared) — پکیج مشترک اصلی

**ساختار:**
- `events/` — EventEnvelope, OutboxEvent, DeadLetterEvent, ConsumedEvent, IdempotentConsumer, OutboxPublisher, OutboxWorker
- `messaging/` — KafkaProducer, KafkaConsumer, DLQService
- `observability/` — Logger (pino), Tracer (OpenTelemetry/Jaeger)
- `database/` — createDataSource (TypeORM PostgreSQL)
- `schema/` — EventContracts, SchemaRegistry
- `types/` — ApiResponse, PaginatedResponse, HealthCheckResponse
- `featureFlags/` — Feature flags module
- Core modules: CircuitBreaker, PII Redaction, EventPolicyEnforcer, GDPR Compliance, Idempotency Middleware, API Error, Tenant Isolation, ABAC Guard, Data Governance suite

**نقاط قوت:**

**Event System:**
- **EventEnvelope** — استاندارد event envelope با `eventId`, `eventType`, `eventVersion`, `occurredAt`, `producer`, `correlationId`, `tenantId`, `idempotencyKey`, `causationId`, `traceparent`, `subject`, `payload`
- **`createEventEnvelope()`** — factory function با type safety
- **OutboxEvent** — TypeORM entity با `@Entity('outbox_events')`, `@Index(['status', 'occurredAt'])`, `@Index(['correlationId'])`, UUID PK, `timestamptz`, `jsonb` برای subject و payload, status (pending/sent/failed), attempt_count, error_message
- **DeadLetterEvent** — DLQ entity برای permanently failed events
- **ConsumedEvent** — idempotent consumer tracking
- **OutboxPublisher** — helper برای writing to outbox table
- **OutboxWorker** — worker برای processing outbox events

**Messaging:**
- **KafkaProducer** — KafkaJS wrapper با connect/disconnect/send، error handling، logging
- **KafkaConsumer** — KafkaJS wrapper با connect/disconnect/subscribe/run، message handler، error handling، logging
- **DLQService** — Dead Letter Queue service برای failed messages

**Observability:**
- **Logger** — pino-based structured logging با `serviceName`, `level`, `prettyPrint`, `child()` برای child loggers
- **Tracer** — OpenTelemetry distributed tracing با Jaeger exporter، `createSpan()`, `withSpan()`, error status tracking

**Database:**
- **`createDataSource()`** — TypeORM PostgreSQL DataSource factory با configurable entities, `synchronize: false` default, `logging: false` default
- Shared entities: OutboxEvent, ConsumedEvent

**Schema:**
- **EventContracts** — event contract definitions (7459 lines)
- **SchemaRegistry** — schema registry برای event validation

**Types:**
- **ApiResponse<T>** — `{ success: boolean, data?: T, error?: { code, message, details? }, correlationId: string }`
- **PaginatedResponse<T>** — ApiResponse + pagination (page, pageSize, total, totalPages)
- **HealthCheckResponse** — status, service, version, timestamp, checks (database, messaging, external)

**Resilience:**
- **CircuitBreaker** — ۳ state (CLOSED, OPEN, HALF_OPEN)، configurable (failureThreshold, successThreshold, timeoutMs, resetTimeoutMs)، `CircuitBreakerStats`، `execute<T>(fn)` pattern

**Security & Compliance:**
- **PII Redaction** — `redactNationalId()` (کد ملی ۱۰ رقمی)، `redactIban()` (IR + 24 digits)، configurable masking (maskChar, preserveLength, visibleChars)
- **GDPR Compliance** — GDPR compliance module
- **Idempotency Middleware** — Redis-backed idempotency با InMemoryIdempotencyStore fallback، configurable TTL (default 24h)، `IdempotencyResult` (success/conflict/error)
- **Tenant Isolation** — `TenantIsolationMiddleware` (NestJS) با x-tenant-id header extraction، UUID validation، user-tenant mismatch check، `TenantId` decorator
- **ABAC Guard** — Attribute-Based Access Control guard
- **Event Policy Enforcer** — event policy enforcement

**Data Governance Suite:**
- `consent-management.ts` — consent management
- `data-classification.ts` — data classification
- `data-inventory.ts` — data inventory
- `data-lineage.ts` — data lineage tracking
- `data-minimization.ts` — data minimization
- `data-retention.ts` — data retention policies
- `data-subject-request.ts` — GDPR data subject requests
- `kpi-governance.ts` — KPI governance (15602 bytes)
- `purpose-based-access.ts` — purpose-based access control
- `pii-masking.middleware.ts` — PII masking middleware

**API Error Contract:**
- **ApiError** — `{ code, message, details?, docUrl? }` — standardized error format
- **ApiErrorException** — Error class با `code`, `statusCode`, `details`, `toApiError()`
- **ErrorCodes** — common error codes (VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, INVALID_STATE, UPSTREAM_TIMEOUT, UPSTREAM_UNAVAILABLE, RATE_LIMITED, IDEMPOTENCY_CONFLICT, INTERNAL_ERROR, PSP_INITIATE_FAILED, QUALITY_GATE_FAILED)
- **`successResponse()`** و **`errorResponse()`** — helper functions

**Testing:**
- ۲۵+ runtime test files covering: agent/customer portal, AI governance, AML, architecture, backend endpoints, claims routing, customer 360, data governance, data inventory, enterprise IAM, executive cockpit, external screening, FNOL omnichannel, knowledge layer, KPI governance, KYC workflow, privacy controls, product underwriting, reinsurance, reserve management, subrogation recovery, tenant isolation, todo implementations, UI/UX platform, workflow/rule engine
- Jest configuration (`jest.config.cjs`)

**Dependencies:**
- kafkajs, pg, typeorm, uuid, pino, pino-pretty, @opentelemetry/*, zod, ioredis

**اشکالات:**

| ID | شدت | توضیح |
|----|------|-------|
| SH-001 | متوسط | **`pii-redaction.ts` با `@ts-nocheck`** — عدم type checking — potential type errors |
| SH-002 | متوسط | **Tenant Isolation Middleware UUID validation فقط** — عدم tenant existence check در database |
| SH-003 | متوسط | **Idempotency Middleware InMemoryStore fallback** — در multi-instance کار نمی‌کند — باید Redis اجباری باشد |
| SH-004 | کم | **`createDataSource` عدم SSL/TLS config** — عدم secure database connection |
| SH-005 | کم | **KafkaProducer/Consumer عدم SASL/SSL** — عدم secure Kafka connection |
| SH-006 | کم | **عدم schema versioning در EventEnvelope** — فقط `eventVersion` عددی — عدم semantic versioning |
| SH-007 | کم | **CircuitBreaker in-memory** — در multi-instance کار نمی‌کند |
| SH-008 | کم | **عدم compiled `.d.ts` files در git** — `.d.ts` و `.js` files در src directory — باید در dist باشند |
| SH-009 | کم | **Tracer عدم OTLP exporter** — فقط Jaeger exporter — عدم OTLP standard |

**درجه‌بندی منطق پیاده‌سازی:** **۸/۱۰** — @insurance/shared پکیج مشترک بسیار جامع با Event System (EventEnvelope, OutboxEvent, DeadLetterEvent, ConsumedEvent, OutboxPublisher, OutboxWorker)، Messaging (KafkaProducer, KafkaConsumer, DLQService)، Observability (pino Logger, OpenTelemetry Tracer با Jaeger)، Database (createDataSource با TypeORM PostgreSQL)، Schema (EventContracts, SchemaRegistry)، Types (ApiResponse, PaginatedResponse, HealthCheckResponse)، CircuitBreaker (۳ state)، PII Redaction (National ID, IBAN)، GDPR Compliance، Idempotency Middleware (Redis + InMemory fallback)، Tenant Isolation (UUID validation, user-tenant mismatch check)، ABAC Guard، Event Policy Enforcer، Data Governance suite (consent, classification, inventory, lineage, minimization, retention, subject request, KPI governance, purpose-based access, PII masking)، API Error Contract (ApiError, ApiErrorException, ErrorCodes, successResponse, errorResponse)، ۲۵+ runtime test files، Jest config. اما **`@ts-nocheck` در pii-redaction** (متوسط)، **Tenant Isolation UUID validation فقط** (متوسط)، **Idempotency InMemoryStore fallback** (متوسط)، **عدم SSL/TLS در DB و Kafka** (کم)، و **compiled files در src** (کم) از نواقص اصلی هستند.

#### ۳۸.۳ سایر پکیج‌ها (`packages/api-client`, `packages/design-system`, `packages/ui-utils`)

**`packages/api-client`** — shared API client برای UI services
**`packages/design-system`** — shared design system با themes (light/dark)، components (ThemeToggle, SkipLink, BottomNav, WorkspaceSwitcher, CommandPalette)
**`packages/ui-utils`** — shared UI utilities (cn, clsx + tailwind-merge)

**نقاط قوت:**
- Design system با light/dark themes
- Reusable components (ThemeToggle, SkipLink, BottomNav, WorkspaceSwitcher, CommandPalette)
- `cn()` utility برای className merging (clsx + tailwind-merge)
- Shared across تمام UI services (web-ui, customer-portal-ui, agent-portal-ui)

**اشکالات:**
- عدم documentation برای design system components
- عدم storybook برای component development

#### جمع‌بندی پکیج‌های مشترک

| معیار | درجه |
|-------|------|
| منطق پیاده‌سازی | ۸/۱۰ |
| پایگاه‌داده | ۷/۱۰ |
| امنیتی | ۶/۱۰ |
| ادغام | ۹/۱۰ |
| **کل** | **۷/۵/۱۰** |

**وضعیت کلی:** پکیج‌های مشترک سامانه شامل سه بخش اصلی هستند: (۱) `services/common` با EcosystemJwtGuard (JWKS RS256 + HS256 fallback، issuer/audience validation)، DeepHealthService (DB + Kafka + Redis health checks با latency measurement و pool status)، BulkheadService (per-service bulkhead با maxConcurrent/maxWaitTime/timeout و cleanup)؛ (۲) `@insurance/shared` با Event System (EventEnvelope استاندارد با eventId/eventType/eventVersion/correlationId/tenantId/traceparent، OutboxEvent entity با indexes، DeadLetterEvent، ConsumedEvent، OutboxPublisher، OutboxWorker)، Messaging (KafkaProducer/KafkaConsumer با KafkaJS، DLQService)، Observability (pino Logger با child loggers، OpenTelemetry Tracer با Jaeger)، Database (createDataSource با TypeORM)، Schema (EventContracts ۷۴۵۹ lines، SchemaRegistry)، Types (ApiResponse، PaginatedResponse، HealthCheckResponse)، CircuitBreaker (۳ state)، PII Redaction (National ID، IBAN)، GDPR Compliance، Idempotency Middleware (Redis + InMemory fallback با 24h TTL)، Tenant Isolation (UUID validation، user-tenant mismatch check)، ABAC Guard، Event Policy Enforcer، Data Governance suite (consent، classification، inventory، lineage، minimization، retention، subject request، KPI governance، purpose-based access، PII masking)، API Error Contract (ApiError، ApiErrorException، ErrorCodes، successResponse، errorResponse)، ۲۵+ runtime test files؛ (۳) `packages/design-system` (themes، components)، `packages/api-client`، `packages/ui-utils` (cn utility). اما **`@ts-nocheck` در pii-redaction** (متوسط)، **Tenant Isolation UUID validation فقط** (متوسط)، **Idempotency InMemoryStore fallback** (متوسط)، **عدم SSL/TLS در DB و Kafka** (کم)، **KafkaProducer/Consumer عدم SASL/SSL** (کم)، و **compiled files در src** (کم) از نواقص اصلی هستند. پکیج @insurance/shared به‌عنوان backbone مشترک سامانه بسیار جامع و پیشرفته است و تقریباً تمام الگوهای architectural مورد نیاز (Outbox Pattern، Circuit Breaker، Idempotency، Tenant Isolation، PII Redaction، GDPR Compliance، Observability) را پیاده‌سازی کرده است.

---

## خلاصه اجرایی (Executive Summary)

### نمای کلی

این ممیزی جامع شامل بررسی **۴۰ سرویس و پکیج** در پلتفرم هوش مصنوعی بیمه Enterprise است. پلتفرم بر پایه معماری میکروسرویس با TypeScript + NestJS + TypeORM + PostgreSQL + Kafka + Redis + Bun ساخته شده و شامل سرویس‌های هسته بیمه‌ای، انطباق و ریسک، AI و دانش، زیرساختی، پورتال‌ها و UI، و پکیج‌های مشترک است.

### توزیع امتیازات

| رده امتیاز | تعداد سرویس | سرویس‌ها |
|------------|-------------|----------|
| **عالی (۸-۱۰)** | ۵ | @insurance/shared (۷/۵)، orchestrator-service، claims-service، policy-service، fraud-service |
| **خوب (۷-۷/۹)** | ۱۲ | auth-service، payments-service، party-kyc-service، document-service، feature-flags-service، claims-readmodel-service، complaints-service، reporting-service، aml-service، reinsurance-service، product-service، monitoring-service |
| **متوسط (۶-۶/۹)** | ۱۳ | document-ai-service، sales-network-service، regulatory-gateway-service، collections-service، customer-360-service، customer-portal-service，workflow-service، copilot-service，agent-portal-service，knowledge-service，model-switchboard-service，ai-governance-service，notification-service，rule-engine-service，billing-service，underwriting-service，outbox-relay，api-gateway，web-ui |
| **ضعیف (۴-۵/۹)** | ۴ | customer-portal-ui (۵/۱۰)，agent-portal-ui (۴/۱۰)，rule-engine-service (۵/۱۰)，billing-service (۵/۱۰) |

### میانگین امتیاز کل سامانه: **۶/۲/۱۰**

### یافته‌های بحرانی (Critical Findings)

| ID | شدت | سرویس | توضیح |
|----|------|--------|-------|
| CRIT-001 | بحرانی | api-gateway | **عدم JWT verification** — `jwt.decode()` فقط decode می‌کند نه verify — هر کاربر می‌تواند fake JWT بسازد |
| CRIT-002 | بحرانی | web-ui | **JWT token در localStorage** — XSS attack می‌تواند token را steal کند |
| CRIT-003 | بحرانی | customer-portal-ui | **JWT token در localStorage** — XSS attack می‌تواند token را steal کند |
| CRIT-004 | بحرانی | agent-portal-ui | **JWT token در class instance** — در page refresh از بین می‌رود — عدم persistence |
| CRIT-005 | بحرانی | services/common | **`JWT_SECRET` default insecure** — `'default-secret-change-in-production'` — بحرانی در production |
| CRIT-006 | بحرانی | تمام سرویس‌ها | **عدم schema isolation** — اکثر سرویس‌ها از schema `public` استفاده می‌کنند — عدم tenant isolation در database level |
| CRIT-007 | بحرانی | تمام سرویس‌ها | **عدم Kafka SASL/SSL** — عدم secure Kafka connection در production |
| CRIT-008 | بحرانی | تمام سرویس‌ها | **عدم SSL/TLS در database connections** — عدم secure PostgreSQL connection |
| CRIT-DEC-01 | بحرانی | ai-governance, copilot, model-switchboard | **بحران مالکیت AI Governance** — سه سرویس مستقل AI Governance (ModelInventory, ModelCard, Risk Assessment, Validation) پیاده‌سازی کرده‌اند بدون مالکیت واحد — ai-governance-service عملاً non-functional است (۷ از ۸ service در AppModule ثبت نشده، in-memory) |
| CRIT-DEC-02 | بحرانی | party-kyc-service | **عدم Outbox/Kafka در source of truth داده‌های Party/KYC** — هیچ رویداد Kafka منتشر نمی‌شود — ۴ قابلیت کلیدی در-memory volatile — سایر سرویس‌ها مجبور به HTTP fetch مستقیم به‌جای event consumption |

### یافته‌های مرزبندی و مالکیت Domain (Decomposition/Ownership Findings)

| ID | شدت | سرویس‌های درگیر | توضیح |
|----|------|----------------|-------|
| DEC-01 | بحرانی | ai-governance, copilot, model-switchboard | **همپوشانی سه‌گانه AI Governance** — سه سرویس مستقل (ai-governance-service با ModelInventory lifecycle، copilot-service با ModelInventory/ModelCard/RiskAssessment/IncidentReport/ValidationReport، model-switchboard-service با ModelCard approve/deprecate) بدون مالکیت واحد — داده‌های تکراری، عدم event-driven sync، ai-governance-service non-functional |
| DEC-02 | متوسط | payments, collections, billing | **همپوشانی سه‌گانه Domain پرداخت/وصول** — سه سرویس مستقل payment gateway integration (Zarinpal/IdPay) پیاده‌سازی کرده‌اند — payments-service (پرداخت خسارت)، collections-service (اقساط حق بیمه)، billing-service (فاکتور + درگاه پرداخت + auto-deposit) — عدم مالکیت واحد برای payment/وصول — هماهنگی و event flow بین این سه تعریف نشده |
| DEC-03 | متوسط | workflow-service, workflow-engine-service | **تجزیه نامناسب Workflow Domain** — دو سرویس مجزا با همان schema (`workflow`) و مسئولیت‌های همپوشان (definition management vs execution) — entity conflict محتمل — عدم یکپارچگی امنیتی (workflow-service بدون auth، engine-service با auth) — عدم مالکیت واحد |
| DEC-04 | متوسط | knowledge-service, knowledge-layer-service | **تجزیه نامناسب Knowledge Domain** — دو سرویس مجزا با همان schema (`knowledge`) و port (`3035`) — entity conflict و port conflict محتمل — عدم یکپارچگی امنیتی (knowledge-service بدون auth، layer-service با auth) — عدم مالکیت واحد |
| DEC-05 | متوسط | customer-360-service | **عدم مالکیت داده و تجزیه نامناسب CQRS** — stateless HTTP aggregator از ۶+ سرویس به‌جای CQRS read model با Kafka consumer — عدم caching/timeout/pagination — عدم auth token forwarding — باید به‌عنوان materialized view با event-driven updates پیاده‌سازی می‌شد |
| DEC-06 | متوسط | agent-portal-service, customer-portal-service | **عدم مالکیت داده در BFF‌ها** — هر دو سرویس pure proxy هستند بدون داده مستقل — عدم auth token forwarding به downstream — عدم Kafka integration — مرز مشخص بین BFF و backend services تعریف نشده — agent-portal-service عملاً thin proxy از sales-network-service است |
| DEC-07 | متوسط | product-service | **عدم ادغام event-driven در Catalog Source of Truth** — product-service هیچ Kafka event تولید یا مصرف نمی‌کند — عدم استفاده از @insurance/shared — تغییرات محصول به سایر سرویس‌ها (policy, claims, underwriting) منتقل نمی‌شود — باید به‌عنوان event-driven catalog source of truth پیاده‌سازی می‌شد |
| DEC-08 | متوسط | regulatory-gateway-service | **عدم مالکیت کامل Regulatory Domain** — تمام endpoints بدون authentication — عدم Outbox pattern (events بدون transactional consistency) — عدم webhook signature verification — سرویس به‌عنوان دروازه تنظیمی باید source of truth برای regulatory events باشد اما ownership واضح تعریف نشده |
| DEC-09 | متوسط | underwriting-service | **عدم مالکیت داده مستقل** — underwriting-service داده‌ای persist نمی‌کند که از orchestrator و policy-service مستقل باشد — عدم Kafka integration — orchestrator call در silent catch نشان‌دهنده عدم ownership واضح در underwriting workflow — مرز با orchestrator مشخص نیست |
| DEC-10 | متوسط | party-kyc-service | **عدم Event-Driven Integration در Source of Truth** — party-kyc-service به‌عنوان source of truth برای Party/KYC باید رویدادهای Kafka منتشر می‌کرد (PartyCreated, KycApproved, KycRejected) اما هیچ Kafka integration ندارد — سایر سرویس‌ها مجبور به synchronous HTTP fetch به‌جای async event consumption |

### یافته‌های متوسط (Medium Findings)

| ID | شدت | سرویس | توضیح |
|----|------|--------|-------|
| MED-001 | متوسط | api-gateway | Rate limiting و circuit breaker in-memory — در multi-instance کار نمی‌کنند |
| MED-002 | متوسط | web-ui | Auth check client-side only — bypass ممکن |
| MED-003 | متوسط | customer-portal-ui | `NEXT_PUBLIC_API_URL` fallback to localhost:3000 — باید به API Gateway 18000 اشاره کند |
| MED-004 | متوسط | agent-portal-ui | `NEXT_PUBLIC_API_URL` fallback to localhost:3001 — باید به API Gateway 18000 اشاره کند |
| MED-005 | متوسط | agent-portal-ui | عدم auth check — تمام pages بدون auth check |
| MED-006 | متوسط | تمام سرویس‌ها | عدم Redis-backed rate limiting و circuit breaker — در multi-instance کار نمی‌کنند |
| MED-007 | متوسط | تمام سرویس‌ها | `console.log` برای logging در بسیاری از سرویس‌ها — عدم structured logging |
| MED-008 | متوسط | تمام سرویس‌ها | عدم metrics endpoint (Prometheus/Grafana) در اکثر سرویس‌ها |

### نقاط قوت کلیدی سامانه

1. **معماری Event-Driven** — Transaction Outbox Pattern با `FOR UPDATE SKIP LOCKED`، Kafka integration، DLQ، event envelope استاندارد
2. **پکیج @insurance/shared جامع** — Circuit Breaker، Idempotency Middleware، Tenant Isolation، PII Redaction، GDPR Compliance، Observability (pino + OpenTelemetry)
3. **Enterprise RBAC** — ۱۰۰+ permission keys در web-ui با role-to-permission mapping
4. **API Gateway پیشرفته** — Circuit Breaker (۳ state)، per-tenant rate limiting، upstream health tracking، deep health check
5. **پوشش فرایندهای بیمه‌ای** — claims، payments، policies، fraud، AML، reinsurance، underwriting، complaints، collections، sales-network
6. **پشتیبانی RTL و فارسی** — تمام UI services با RTL support و Persian labels
7. **Capacitor integration** — customer-portal-ui با mobile app generation (Android/iOS)
8. **OpenTelemetry distributed tracing** — Jaeger exporter در @insurance/shared
9. **Bulkhead pattern** — BulkheadService در services/common با per-service configs
10. **Data Governance suite** — consent management، data classification، inventory، lineage، minimization، retention، subject request

### نواقص کلیدی سامانه

1. **عدم JWT verification در API Gateway** — بحرانی — gateway فقط decode می‌کند نه verify
2. **JWT tokens در localStorage** — بحرانی — XSS vulnerable در web-ui و customer-portal-ui
3. **عدم schema isolation** — اکثر سرویس‌ها از schema `public` استفاده می‌کنند
4. **In-memory state management** — rate limiting، circuit breaker، bulkhead همگی in-memory — در multi-instance کار نمی‌کنند
5. **عدم SSL/TLS** — database و Kafka connections بدون SSL/TLS
6. **عدم auth check در UI services** — client-side only — bypass ممکن
7. **`console.log` برای logging** — عدم structured logging در بسیاری از سرویس‌ها
8. **عدم metrics endpoint** — عدم Prometheus/Grafana در اکثر سرویس‌ها
9. **Default insecure secrets** — `JWT_SECRET` با default values در چندین سرویس
10. **عدم real external integrations** — Sanhab، OTP/SMS، payment gateway همگی mock/stub
11. **بحران مالکیت AI Governance** — سه سرویس مستقل (ai-governance, copilot, model-switchboard) AI Governance پیاده‌سازی کرده‌اند بدون مالکیت واحد — ai-governance-service عملاً non-functional است
12. **همپوشانی Domain پرداخت/وصول** — payments, collections, billing هر سه مستقل payment gateway پیاده‌سازی کرده‌اند بدون هماهنگی و event flow
13. **تجزیه نامناسب Workflow و Knowledge** — هر کدام به دو سرویس مجزا با همان schema و port تقسیم شده‌اند — entity conflict و عدم یکپارچگی امنیتی
14. **عدم Event-Driven Integration در Source of Truth‌ها** — party-kyc و product-service هیچ Kafka event منتشر نمی‌کنند — سایر سرویس‌ها مجبور به synchronous HTTP fetch
15. **BFF‌های بدون مالکیت داده** — agent-portal و customer-portal pure proxy هستند بدون auth token forwarding یا Kafka integration

### توصیه‌های اولویت‌بندی شده

#### P0 — بحرانی (باید قبل از production):
1. **JWT verification در API Gateway** — اضافه کردن `jwt.verify()` با proper secret management
2. **انتقال JWT tokens به httpOnly cookies** — در web-ui و customer-portal-ui
3. **Schema isolation per tenant** — استفاده از schema-per-tenant یا RLS
4. **SSL/TLS برای database و Kafka** — secure connections در production
5. **Redis-backed rate limiting و circuit breaker** — در api-gateway و services/common
6. **Secret management** — حذف default secrets و استفاده از vault/KMS
7. **ادغام AI Governance** — تعیین ai-governance-service به‌عنوان single source of truth — حذف entity‌های تکراری از copilot-service و model-switchboard-service — ثبت تمام service‌ها در AppModule — persist کردن داده‌های in-memory
8. **ادغام Domain پرداخت/وصول** — تعیین مرز مشخص بین payments (خسارت)، collections (اقساط) و billing (حسابداری) — استخراج payment gateway مشترک یا تعیین ownership واضز — ایجاد event flow بین این سه سرویس
9. **فعال‌سازی Kafka در Source of Truth‌ها** — party-kyc-service و product-service باید Outbox pattern و Kafka producer داشته باشند — سایر سرویس‌ها به‌جای HTTP fetch از Kafka event consumption استفاده کنند

#### P1 — متوسط (باید قبل از scale):
1. **Server-side auth در UI services** — SSR auth checks در Next.js
2. **Structured logging** — جایگزینی `console.log` با pino logger
3. **Metrics endpoint** — اضافه کردن Prometheus metrics
4. **API URL configuration** — اصلاح fallback URLs در customer-portal-ui و agent-portal-ui
5. **Auth check در agent-portal-ui** — اضافه کردن authentication check
6. **Token persistence در agent-portal-ui** — استفاده از localStorage/sessionStorage
7. **ادغام سرویس‌های همپوشان** — بررسی ادغام workflow-service + workflow-engine-service و knowledge-service + knowledge-layer-service — یا تفکیک مشخص با schema/port جداگانه
8. **بازطراحی customer-360-service** — تبدیل از stateless HTTP aggregator به CQRS read model با Kafka consumer و materialized view
9. **Auth token forwarding در BFF‌ها** — agent-portal-service و customer-portal-service باید auth token به downstream services forward کنند
10. **تعیین مالکیت Regulatory Domain** — اضافه کردن authentication و Outbox pattern به regulatory-gateway-service — تعیین ownership واضز در regulatory compliance workflow

#### P2 — کم (بهبود مستمر):
1. **Unit tests** — اضافه کردن test coverage برای UI services
2. **Error boundaries** — global error boundary در UI services
3. **CSP headers** — Content-Security-Policy در Next.js config
4. **i18n در portal UIs** — اضافه کردن multi-language support
5. **Storybook برای design system** — component documentation
6. **Accessibility** — SkipLink در agent-portal-ui، `userScalable: true` در customer-portal-ui

### جمع‌بندی نهایی

پلتفرم هوش مصنوعی بیمه Enterprise با پوشش **۴۰ سرویس و پکیج**، معماری event-driven جامع، و پکیج مشترک پیشرفته (@insurance/shared) از نظر architectural design پیشرفته است. با این حال، **مسائل امنیتی بحرانی** (عدم JWT verification در gateway، JWT tokens در localStorage، عدم schema isolation، عدم SSL/TLS) باید قبل از production resolved شوند. همچنین **in-memory state management** (rate limiting، circuit breaker، bulkhead) برای multi-instance deployment مناسب نیست و باید به Redis-backed منتقل شود.

**مشکلات سیستمیک مرزبندی و مالکیت Domain** نیز به‌عنوان یافته‌های جدی این ممیزی شناسایی شده‌اند: (۱) بحران مالکیت AI Governance با سه سرویس مستقل و همپوشان (ai-governance, copilot, model-switchboard) که ai-governance-service عملاً non-functional است؛ (۲) همپوشانی سه‌گانه Domain پرداخت/وصول (payments, collections, billing) بدون هماهنگی و event flow؛ (۳) تجزیه نامناسب Workflow و Knowledge domain به دو سرویس مجزا با همان schema و port؛ (۴) عدم Event-Driven Integration در Source of Truth‌ها (party-kyc, product-service) که سایر سرویس‌ها را مجبور به synchronous HTTP fetch می‌کند؛ (۵) BFF‌های بدون مالکیت داده و عدم auth token forwarding. این مشکلات نشان‌دهنده نیاز به بازنگری در معماری decomposition و تعیین واضح مالکیت domain قبل از scale هستند.

با اصلاح نواقص بحرانی امنیتی و مشکلات مرزبندی domain، پلتفرم پتانسیل بالایی برای deployment در محیط production دارد.

**امتیاز کلی سامانه: ۶/۲/۱۰** — متوسط رو به خوب — با پتانسیل رسیدن به ۸+ با اصلاح نواقص بحرانی (امنیتی + مرزبندی domain) و متوسط.

---

*پایان گزارش ممیزی جامع*
