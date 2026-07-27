# گزارش ممیزی کد `auth-service`

**تاریخ بررسی:** ۲۰۲۶/۰۷/۲۶
**دامنه بررسی:** تمام فایل‌های `src/` شامل controllerها، serviceها، guardها، entityها، DTOها، migrationها، پیکربندی اجرا، `Dockerfile`، `package.json` و `TRUTH.md`
**نقش هدف:** احراز هویت، مدیریت کاربران، RBAC/ABAC، SSO/Federation، نشست‌ها، audit و جداسازی سازمانی
**وضعیت واقعی بر اساس کد:** **Operational با ریسک‌های P0 امنیتی و داده‌ای؛ قابل معرفی به‌عنوان Enterprise-ready نیست**

## ۱. محدوده و اجزای بررسی‌شده

### کنترلرها

- `auth.controller.ts`: ثبت‌نام، ورود، `me`، فهرست کاربران، نقش‌ها و واحد سازمانی
- `iam.controller.ts`: hierarchy نقش، بررسی SoD و گزارش audit
- `org-units.controller.ts`: ایجاد، مشاهده و فهرست واحدهای سازمانی
- `policy-admin.controller.ts`: مدیریت policyهای ABAC
- `sso.controller.ts`: OIDC و SAML
- `federation.controller.ts`: providerهای بیرونی، authorize/token/userinfo/link/unlink و callback اکوسیستم
- `health.controller.ts`: health دیتابیس

### سرویس‌ها و guardها

- `auth.service.ts`, `session.service.ts`, `sso.service.ts`, `federation.service.ts`
- `policy-admin.service.ts`, `access-audit.service.ts`, `org-units.service.ts`
- `jwt-auth.guard.ts`, `permissions.guard.ts`, `roles.guard.ts`, `abac.guard.ts`, `tenant.guard.ts`
- `abac.policy.ts`, `sod.rules.ts`, `role-hierarchy.ts`, `permissions.ts`

### داده و اجرا

- entityهای `User`, `Session`, `AbacPolicy`, `FederatedIdentity`, `AccessAudit`, `OrganizationUnit`
- migrationهای ۸ مرحله‌ای و migration جدول audit
- `app.module.ts`, `data-source.ts`, `main.ts`, `Dockerfile`, `package.json`
- فایل حقیقت ثبت‌شده `TRUTH.md`

**تست اختصاصی در خود پوشه سرویس:** فایل `*.spec.ts` یا `*.test.ts` پیدا نشد. بنابراین ادعاهای این گزارش بر بررسی کد و قراردادهاست؛ صحت runtime باید جداگانه اجرا و ثبت شود.

---

## ۲. خلاصه وضعیت قابلیت‌ها

| قابلیت | نتیجه بررسی کد | وضعیت قابل قبول | شکاف اصلی |
|---|---|---|---|
| ورود محلی | bcrypt + `jwt.sign`/`jwt.verify` وجود دارد | عملیاتی | tenant، claimهای استاندارد و چرخه revoke باید تکمیل شود |
| ثبت‌نام | CRUD واقعی و password policy پایه | ناایمن برای production | endpoint عمومی و امکان تعیین role/orgUnit توسط caller |
| RBAC | mapping نقش→مجوز وجود دارد | عملیاتی پایه | hierarchy در محاسبه مجوزها اعمال نمی‌شود و همه mappingها کامل نیستند |
| ABAC | policy DB + fallback hardcoded | عملیاتی مشروط | fallback در خطای DB و نبود tenant واقعی در context |
| SoD | قواعد نقش و action وجود دارد | ناقص/دوگانه | قواعد نقش در `setUserRoles` اعمال می‌شوند، اما قواعد action در مسیرهای کسب‌وکار اثبات نشده‌اند |
| Session | DB، Redis اختیاری، rotation و revoke وجود دارد | عملیاتی مشروط | login خطای session را می‌بلعد؛ migration/entity schema نیاز به تطبیق دارد |
| OIDC | دریافت code، JWKS و verify وجود دارد | ناقص | fallback کلید و الگوریتم‌های گسترده، نبود ذخیره/اعتبارسنجی state در callback |
| SAML | `validatePostResponseAsync` و mapping وجود دارد | ناقص/تأییدنشده | تولید AuthnRequest واقعی وجود ندارد؛ relay state به‌صورت مستقل validate نمی‌شود |
| Federation | providerها و link/unlink با DB وجود دارد | عملیاتی پایه | callback اکوسیستم توکن پیش‌فرض ناامن می‌سازد و tenant/user provisioning کامل نیست |
| Audit | access audit entity/service و log ساختاریافته وجود دارد | اسکلت تا عملیاتی | auth eventها Outbox/event immutable ندارند؛ برخی guardها audit را تضمین نمی‌کنند |
| Tenant isolation | header با JWT مقایسه می‌شود | ناکافی | JWT محلی tenant ندارد و نبود tenant به‌عنوان system user مجاز شمرده می‌شود |
| Health | `SELECT 1` بررسی می‌شود | liveness/deep DB | Redis/Kafka/session/config readiness گزارش نمی‌شود |

---

## ۳. یافته‌های بحرانی (P0)

### AUTH-CODE-001 — ثبت‌نام عمومی می‌تواند نقش و واحد سازمانی تعیین کند

**شاهد کد:** `src/auth.controller.ts` مسیر `POST /register` بدون guard احراز هویت ارائه شده و body را به `AuthService.register` می‌دهد؛ `src/auth.service.ts` در پارامتر ثبت‌نام `roles`, `orgUnitId`, `positionTitle` و `nationalId` را از caller می‌پذیرد و در خطوط 114–126 مستقیماً روی User ذخیره می‌کند.

**اثر:** یک caller ناشناس می‌تواند هنگام ثبت‌نام نقش‌های privileged مانند `insurer_admin`، `finance_ops` یا `claims_handler` و واحد سازمانی دلخواه درخواست کند. حتی اگر role mapping بعداً کنترل شود، این مرز اعتماد باید در backend بسته شود.

**اصلاح لازم:** ثبت‌نام عمومی فقط اطلاعات هویتی پایه بگیرد؛ نقش پیش‌فرض ثابت و واحد سازمانی فقط توسط administrator/identity provisioning تعیین شود. برای provisioning اداری guard، permission، tenant و audit اجباری شود. تست منفی برای ارسال role/admin role اضافه شود.

### AUTH-CODE-002 — tenant در توکن محلی تولید نمی‌شود و TenantGuard نبود tenant را مجاز می‌داند

**شاهد کد:** `TokenPayload` در `src/auth.service.ts` فقط `userId`, `email`, `username`, `roles`, `orgUnitId` دارد؛ `generateToken` نیز همین موارد را امضا می‌کند. در `src/tenant.guard.ts` اگر `user.tenantId` وجود نداشته باشد، خط 12 `return true` می‌کند.

**اثر:** مدل single-tenant اختصاصی هدف سامانه، با enforcement واقعی tenant مرزبندی نشده است. هر endpointی که به `req.tenantId` یا header اعتماد کند ممکن است در نبود claim tenant با context ناقص کار کند.

**اصلاح لازم:** tenant مالک User و Session باشد؛ هنگام login از رکورد کاربر/identity تعیین و در token با issuer/audience ثبت شود؛ نبود tenant برای کاربر عادی رد شود؛ header فقط برای تطبیق باشد نه منبع اعتماد؛ DB، Redis، audit و provider mapping هم tenant-aware شوند. تست cross-tenant اجباری است.

### AUTH-CODE-003 — callback اکوسیستم IAM در صورت نبود secret با کلید پیش‌فرض توکن می‌سازد

**شاهد کد:** `src/federation.controller.ts` در `EcosystemCallbackController` خط 327 مقدار `process.env.JWT_SECRET || 'default-secret-change-in-production'` را استفاده می‌کند و در خطوط 328–339 local JWT می‌سازد.

**اثر:** حتی با وجود guardهای دیگر، این مسیر یک توکن محلی با secret شناخته‌شده تولید می‌کند و برای هویت federated مسیر بحرانی جعل فراهم می‌کند.

**اصلاح لازم:** fallback حذف و نبود secret باعث fail-fast شود؛ token با claims استاندارد issuer/audience/tenant/session ساخته شود؛ user محلی از DB provision/link شود؛ callback state/PKCE و replay protection داشته باشد؛ secret rotation و تست جعل token اضافه شود.

### AUTH-CODE-004 — migration نشست با entity و service فعلی هم‌خوان نیست

**شاهد کد:** `src/migrations/1700000000006-create-sessions-table.ts` ستون‌های `session_id`, `token_hash`, `expires_at`, `last_used_at`, `is_active` می‌سازد. اما `src/entities/Session.ts` از primary column به نام پیش‌فرض `id`، `refreshTokenHash`, `refreshTokenExpiresAt`, `lastActivityAt`, `isRevoked`, `status` استفاده می‌کند. `SessionService` نیز همین نام‌های entity را در خطوط 84–96 و 123–149 می‌نویسد.

**اثر:** migration تازه یا دیتابیس موجود ممکن است ستون‌هایی غیر از آنچه ORM می‌خواند داشته باشد؛ login/rotation/revoke می‌تواند در runtime خطای ستون یا رفتار نادرست بدهد.

**اصلاح لازم:** یک schema canonical انتخاب شود؛ migration اصلاحی forward-only برای rename/add/backfill/index/FK نوشته شود؛ `data-source.ts` و `app.module.ts` با همان schema و entity اجرا شوند؛ migrate واقعی روی DB خالی و DB ارتقایافته تست شود.

---

## ۴. یافته‌های مهم امنیتی (P1)

### AUTH-CODE-005 — مسیرهای SSO اصلی بدون guard هستند

**شاهد کد:** `SsoController` در `src/sso.controller.ts` فقط `@Controller('sso')` دارد و `@UseGuards` روی provider discovery، token exchange، ID token verification، refresh و SAML ACS وجود ندارد.

**تحلیل:** بعضی از این endpointها ذاتاً public هستند، اما باید rate limit، state/nonce/PKCE، allow-list redirect URI، provider binding و audit مخصوص داشته باشند. در کد، `redirect_uri` از query/body caller دریافت و بدون allow-list به provider ارسال می‌شود. `relayState` نیز فقط منتقل می‌شود و به session/state ذخیره‌شده متصل نیست.

**اصلاح:** public بودن را صریح و محدود کنید؛ state/nonce یک‌بارمصرف و server-side؛ redirect URI allow-list per tenant/provider؛ token exchange و refresh rate limit؛ SAML response به flow و relay state معتبر bind شود؛ پاسخ‌های token و خطاها audit و log redaction داشته باشند.

### AUTH-CODE-006 — OIDC الگوریتم‌های symmetric و asymmetric را هم‌زمان قبول می‌کند

**شاهد کد:** `src/sso.service.ts` خطوط 164–173 در `verifyOptions.algorithms` مقادیر `RS256`, `RS384`, `RS512`, `HS256`, `HS384`, `HS512` را مجاز می‌کند. همچنین در `getSigningKey` اگر JWKS failure شود به `OIDC_PUBLIC_KEY` یا `OIDC_SECRET_KEY` fallback می‌کند.

**اثر:** policy امضای provider شفاف نیست و fallback می‌تواند downgrade یا پذیرش کلید اشتباه ایجاد کند.

**اصلاح:** برای هر provider الگوریتم مورد انتظار و نوع کلید ثابت باشد؛ برای OIDC سازمانی ترجیحاً JWKS/RS256 فقط؛ fallback فقط با feature/config صریح و fail-closed؛ issuer، audience، azp، nonce، `email_verified` و زمان‌ها کامل validate شوند.

### AUTH-CODE-007 — OIDC/SAML نتیجه federated را به کاربر محلی و tenant تبدیل نمی‌کند

**شاهد کد:** `SsoController` فقط token/user info برمی‌گرداند. `EcosystemCallbackController` نیز `userInfo` را می‌گیرد و مستقیماً local JWT می‌سازد؛ مسیر ساخت یا لینک User از طریق `FederationService.linkFederatedIdentity` در callback دیده نمی‌شود.

**اثر:** role، active status، tenant، approval و lifecycle کاربر محلی به‌صورت قابل اتکا اعمال نمی‌شود؛ یک identity بیرونی می‌تواند بدون provisioning policy به سامانه وارد شود.

**اصلاح:** federation workflow شامل provider validation، map tenant/role، JIT provisioning کنترل‌شده، deactivation، link uniqueness، approval و audit شود.

### AUTH-CODE-008 — service token حداقل‌سازی و binding کافی ندارد

**شاهد کد:** `AuthService.issueServiceToken` فقط `serviceId` و آرایه permissions را validate می‌کند و token را با همان permissionها امضا می‌کند. در `src/auth.controller.ts` باید مسیر صادرکننده بررسی شود؛ در خود payload tenant، audience، issuer، jti و محدودیت service registry دیده نمی‌شود.

**اثر:** هر caller که به endpoint صدور برسد می‌تواند permission دلخواه برای service بسازد؛ توکن به tenant و مقصد مشخص bind نشده است.

**اصلاح:** صدور فقط برای service identity ثبت‌شده و permission allow-list؛ claimهای `iss`, `aud`, `sub`, `jti`, `tenantId` و TTL کوتاه؛ احراز mTLS/secret مستقل؛ revoke/rotation و audit.

### AUTH-CODE-009 — secret/tokenهای حساس در لاگ یا پاسخ‌های federated قابل انتشارند

**شاهد کد:** callback اکوسیستم در خطوط 341–348 هم `ecosystemIdToken` و `ecosystemRefreshToken` را در response برمی‌گرداند. `SessionService` نیز در log، `deviceFingerprint` را ثبت می‌کند.

**اثر:** token بیرونی و اطلاعات fingerprint ممکن است در browser/log/proxy باقی بماند.

**اصلاح:** refresh token و ID token فقط در مسیر امن و cookie/سرور نگهداری شوند؛ response حداقلی؛ logger redaction؛ correlation و audit بدون credential.

---

## ۵. یافته‌های RBAC/ABAC/SoD

### AUTH-CODE-010 — hierarchy نقش‌ها در محاسبه مجوزها اعمال نمی‌شود

**شاهد کد:** `role-hierarchy.ts` توابع inheritance را تعریف می‌کند، اما `permissions.ts` در `permissionsForRoles` خطوط 151–159 فقط `ROLE_TO_PERMISSIONS[r]` را برای roleهای دقیق می‌خواند و `getAllRolesWithInheritance` را فراخوانی نمی‌کند.

**اثر:** roleی مانند `agency_owner` یا `claims_handler` مجوزهای parent تعریف‌شده را الزاماً به‌صورت inheritance دریافت نمی‌کند؛ مستندات hierarchy با رفتار واقعی متفاوت است.

**اصلاح:** تصمیم سازمانی بگیرید که inheritance فعال است یا خیر؛ اگر فعال است، mapping با closure roleها و تست matrix پیاده شود؛ اگر نیست، hierarchy حذف/اصلاح و مستند شود.

### AUTH-CODE-011 — قواعد SoD نقش در setUserRoles اعمال می‌شوند، اما قواعد action در مسیر عمومی enforcement نیستند

**شاهد کد:** `AuthService.setUserRoles` خطوط 248–264 فقط `checkSodViolations(params.roles)` را اجرا می‌کند. `checkActionSodViolation` در `sod.rules.ts` تعریف شده، اما در مسیرهای تصمیم policy/claim/payment شاهد فراخوانی آن وجود ندارد.

**اثر:** جلوگیری از ترکیب نقش‌ها ممکن است کار کند، ولی جلوگیری از انجام action متعارض توسط همان کاربر به resource context وابسته است و باید در دامنه‌های مربوطه enforce شود.

**اصلاح:** هر action حساس claim approve، payment approve، underwriting و issuance باید actor/preparer/registrar را از JWT و resource خوانده و policy deny را قبل از commit اجرا کند؛ تست SoD end-to-end.

### AUTH-CODE-012 — ABAC در خطای DB به policy hardcoded fallback می‌کند

**شاهد کد:** `AbacGuard` خطوط 61–68 در هر exception از `evaluatePolicies(evalContext, ABAC_POLICIES)` استفاده می‌کند.

**اثر:** outage یا خطای policy store ممکن است به‌جای fail-closed با policy قدیمی ادامه یابد؛ تغییرات emergency deny یا revocation اعمال نمی‌شود.

**اصلاح:** policy cache نسخه‌دار و immutable با آخرین وضعیت تأییدشده؛ distinction بین availability mode و fail-closed؛ fallback فقط برای policyهای کم‌ریسک و با alert؛ تست DB failure.

### AUTH-CODE-013 — ABAC context به request metadata وابسته است و resource loader مرکزی ندارد

**شاهد کد:** `AbacGuard` مقادیر `request.resourceType`, `resourceId`, `resourceOwner`, `resourceOrgUnitId`, `resourceAttributes` و `request.action` را می‌خواند. این مقادیر در همین guard از منبع معتبر resource بارگذاری نمی‌شوند.

**اثر:** اگر controller آن‌ها را set نکند یا caller بتواند header/body متناظر بسازد، policy روی metadata ناقص یا قابل جعل ارزیابی می‌شود.

**اصلاح:** resource resolver استاندارد per domain، action metadata decorator، tenant/resource lookup از DB، و عدم اعتماد به مقادیر client.

### AUTH-CODE-014 — tenant guard در نبود user یا tenant اجازه می‌دهد

**شاهد کد:** `tenant.guard.ts` خطوط 8 و 12 برای نبود user یا `userTenantId` مقدار true برمی‌گرداند.

**اثر:** برای guard عمومی شاید طراحی شده باشد، اما در endpointهایی که آن را کنار JwtAuthGuard می‌آورند، نبود tenant نباید برای کاربران عادی مجاز باشد.

**اصلاح:** public endpointها explicit bypass داشته باشند؛ مسیر محافظت‌شده بدون tenant رد شود؛ system identity جدا با scope محدود داشته باشد.

---

## ۶. یافته‌های داده، migration و حریم خصوصی

### AUTH-CODE-015 — PII کدملی plaintext ذخیره و در list users برگردانده می‌شود

**شاهد کد:** `User.ts` خط 38 ستون `nationalId` را text عادی تعریف می‌کند. `auth.controller.ts` در پاسخ list users فیلد `nationalId` را map می‌کند.

**اثر:** داده شناسایی حساس هم در DB و هم response مدیریتی منتشر می‌شود.

**اصلاح:** encryption at rest در سطح field/KMS، masking در response، purpose-based access، audit مشاهده، retention و عدم نمایش پیش‌فرض.

### AUTH-CODE-016 — schema پیش‌فرض دو مسیر متفاوت دارد

**شاهد کد:** `app.module.ts` خط 39 schema را `public` می‌گیرد؛ `data-source.ts` خط 13 default را `auth` می‌گذارد. migrationها نیز tableها را بدون schema-qualified نام می‌برند.

**اثر:** migrate ممکن است در schema متفاوت از runtime application اجرا شود.

**اصلاح:** یک منبع تنظیمات مشترک؛ schema صریح در همه migrationها یا search_path کنترل‌شده؛ تست migration→start→CRUD روی DB خالی و موجود.

### AUTH-CODE-017 — migrationهای ابتدایی با entityهای فعلی drift دارند

**شاهد کد:** migration users ابتدا فقط ستون‌های پایه را می‌سازد و migration 0008 بخشی از ستون‌های User را اضافه می‌کند؛ entity `User` همچنین `globalUserId` دارد که migration مربوطه جداست. sessions به‌طور مشخص نام ستون‌های متفاوت دارد.

**اثر:** ترتیب، idempotency و اجرای migration روی نسخه‌های مختلف DB نیاز به اثبات دارد؛ `createTable(..., true)` در access audit و ترکیب SQL خام کنترل drift را دشوار می‌کند.

**اصلاح:** migration ledger واقعی، schema snapshot، test روی DB خالی و upgrade از نسخه قبلی، constraint/index/FK کامل و حذف reliance بر `synchronize`.

### AUTH-CODE-018 — access audit immutable یا event-driven نیست

**شاهد کد:** `AccessAudit` جدول قابل update/delete معمولی است و `access-audit.service.ts` repository save انجام می‌دهد؛ `main.ts` فقط OutboxWorker را روشن می‌کند و در source بررسی‌شده auth event publisher برای login/register/role change دیده نشد.

**اثر:** audit موردنیاز enterprise و بازسازی تصمیم‌ها تضمین نمی‌شود.

**اصلاح:** append-only policy، جلوگیری از update/delete، hash chain یا storage محافظت‌شده، outbox برای eventهای حساس، correlation/tenant اجباری و retention/legal hold.

---

## ۷. یافته‌های نشست و عملیات

### AUTH-CODE-019 — خطای ایجاد session در login بلعیده می‌شود

**شاهد کد:** `auth.service.ts` خطوط 161–172 `createSession` را در try/catch اجرا می‌کند و در catch فقط warning نوشته و login بدون refresh token ادامه می‌یابد.

**اثر:** سرویس می‌تواند موفقیت ورود اعلام کند، اما session/revocation/refresh برای همان کاربر وجود نداشته باشد؛ وضعیت امنیتی به‌صورت silent degraded ادامه می‌یابد.

**اصلاح:** در production failure session برای مسیرهای session-required باید login را fail کند؛ یا قرارداد explicit `sessionMode` و alert/metric داشته باشد. refresh endpoint و logout باید هم‌زمان با login تکمیل شوند.

### AUTH-CODE-020 — rotation به‌صورت compare-and-swap اتمیک نیست

**شاهد کد:** `rotateRefreshToken` ابتدا session را می‌خواند، hash را مقایسه می‌کند و بعد save می‌کند؛ دو درخواست همزمان می‌توانند هر دو قبل از save hash قبلی را معتبر ببینند.

**اثر:** reuse detection در race هم‌زمان ممکن است دور زده شود.

**اصلاح:** update اتمیک با شرط hash/status/version، row lock یا transaction isolation و تست دو refresh همزمان.

### AUTH-CODE-021 — Redis session store واقعاً لیست `user_sessions` را اضافه نمی‌کند

**شاهد کد:** `createSession` در خط 98 فقط `session:{id}` را setex می‌کند؛ `revokeSession` خط 180 `srem(user_sessions:{userId}, sessionId)` دارد، اما `sadd` در create دیده نمی‌شود. ضمن اینکه `validateSession` بعد از cache hit دوباره DB را می‌خواند.

**اثر:** طراحی Redis secondary index ناقص و مزیت store توزیع‌شده محدود است؛ رفتار limit session به DB وابسته می‌ماند.

**اصلاح:** indexهای Redis را کامل یا حذف کنید؛ source of truth را مشخص کنید؛ TTL، invalidation، reconnect و health را تست کنید.

### AUTH-CODE-022 — health فقط DB را می‌سنجد

**شاهد کد:** `health.controller.ts` فقط `SELECT 1` اجرا می‌کند؛ Redis، Kafka، migration status، session store، secret readiness و dependency provider بررسی نمی‌شوند.

**اثر:** orchestrator/deployment ممکن است سرویس را سالم اعلام کند درحالی‌که login refresh، SSO یا event publishing خراب است.

**اصلاح:** liveness و readiness جدا؛ check DB/Redis/Kafka/config، latency و version؛ status مناسب برای degraded و عدم افشای جزئیات خطا در public response.

### AUTH-CODE-023 — Dockerfile پورت 3001 را expose می‌کند اما کد default پورت 3007 دارد

**شاهد کد:** `src/main.ts` خط 28 default `3007` است؛ `Dockerfile` خط 67 `EXPOSE 3001` دارد؛ package و compose باید مقدار نهایی را جداگانه هم‌راستا کنند.

**اثر:** health probe، route و dependency ممکن است به پورت اشتباه متصل شوند.

**اصلاح:** یک port registry canonical، تطبیق compose/Dockerfile/health script و تست container با env خالی/production.

---

## ۸. یافته‌های کنترل ورودی و قرارداد API

- DTOهای `RegisterDto` و `LoginDto` وجود دارند، اما controllerهای بررسی‌شده در چند مسیر body را به‌صورت inline `any` می‌گیرند و در `main.ts` نیز `ValidationPipe` سراسری دیده نمی‌شود؛ استفاده واقعی DTO و whitelist/forbidNonWhitelisted باید تأیید و اجباری شود.
- `policy-admin.controller.ts` در create/update، entity type را مستقیماً به‌عنوان body می‌گیرد؛ `conditions`، `effect`، `priority` و status باید schema validation، version و approval داشته باشند.
- `SsoController` و `FederationController` خطاها را با `error.message` به client برمی‌گردانند؛ پیام provider، URL یا جزئیات داخلی نباید مستقیم منتشر شود.
- correlation ID در چند controller با `Date.now()+Math.random()` ساخته می‌شود؛ باید UUID/trace context استاندارد و middleware مشترک باشد.
- `RolesGuard` در صورت نقش ناکافی `false` برمی‌گرداند و response استاندارد/دلیل denial به‌صورت صریح ندارد؛ باید با policy/permission guard و audit هماهنگ شود.

---

## ۹. نقاط قوت واقعی کد

- `JWT_SECRET` در constructor اصلی `AuthService` و `JwtAuthGuard` الزام‌آور شده است.
- password با bcrypt hash می‌شود و حداقل طول، uppercase، lowercase و digit در `AuthService.register` کنترل می‌شود.
- email و username unique index دارند.
- RBAC permission catalog و نقش‌های بیمه‌ای گسترده وجود دارد.
- ABAC policy entity، cache، policy admin API و hardcoded fallback پیاده شده است.
- Federation repositoryها به‌صورت واقعی با `@InjectRepository` تزریق شده‌اند؛ ادعای قدیمی null repository در کد جاری تأیید نشد.
- SAML response با `validatePostResponseAsync` و certificate بررسی می‌شود؛ بااین‌حال تولید AuthnRequest و state binding ناقص است.
- session refresh token به‌صورت hash در DB ذخیره و reuse detection در مسیر rotation در نظر گرفته شده است.
- CORS و چند security header در `main.ts` اضافه شده‌اند و health DB وجود دارد.
- OutboxWorker در `main.ts` در صورت تنظیم `KAFKA_BROKERS` راه‌اندازی می‌شود؛ اما event sourceهای auth باید جداگانه اثبات شوند.

---

## ۱۰. ماتریس اقدامات اصلاحی

| اولویت | اقدام | معیار اتمام |
|---|---|---|
| P0 | بستن ثبت‌نام عمومی privileged | anonymous register فقط role پیش‌فرض؛ تست role injection رد شود |
| P0 | tenant claim و enforcement | login، DB، JWT، guard و همه resourceها tenant را اجباری کنترل کنند |
| P0 | حذف secret پیش‌فرض callback اکوسیستم | نبود env باعث startup/request failure امن شود |
| P0 | یکسان‌سازی sessions migration/entity | DB خالی و upgrade DB هر دو بدون خطا و با CRUD/rotation موفق |
| P1 | تکمیل OIDC/SAML state/nonce/PKCE/allow-list | replay، open redirect و token substitution تست منفی داشته باشد |
| P1 | fail-closed ABAC و resource resolver | DB outage یا metadata جعلی اجازه دسترسی ندهد |
| P1 | action-level SoD در claims/payments/policy | self-approve و role conflict end-to-end رد شود |
| P1 | رمزنگاری/masking PII و token redaction | nationalId و refresh/ID token در DB/response/log افشا نشوند |
| P1 | session atomic rotation و failure policy | concurrent refresh و Redis outage رفتار قطعی داشته باشد |
| P1 | audit append-only + outbox | login/role/ABAC/SSO event قابل بازسازی و غیرقابل حذف باشد |
| P2 | DTO/ValidationPipe و error contract | ورودی اضافی/ناصحیح رد و خطاها استاندارد شوند |
| P2 | readiness عمیق و پورت canonical | container، compose، health و dependency همه یکسان باشند |
| P2 | تست اختصاصی سرویس | unit/integration/security/runtime tests با evidence CI منتشر شود |

---

## ۱۱. نتیجه نهایی

`auth-service` از نظر حجم قابلیت و پوشش مفهومی، هسته قابل‌توجهی دارد؛ اما **وجود کد برای RBAC، ABAC، SSO و session به‌معنای تکمیل سازمانی نیست**. چهار موضوع باید پیش از اعلام آمادگی تولیدی بسته شوند: ثبت‌نام و federation امن، tenant enforcement، هم‌خوانی migration/entity نشست، و audit/SoD قابل‌اعتماد. همچنین نبود تست اختصاصی در خود سرویس باعث می‌شود وضعیت بسیاری از قابلیت‌های اعلام‌شده در `TRUTH.md` هنوز runtime-verified محسوب نشود.
