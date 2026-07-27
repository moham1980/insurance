# گزارش پیشرفت رفع ایرادات auth-service

**تاریخ شروع:** ۲۰۲۶/۰۷/۲۶  
**بر اساس گزارش ممیزی:** [01-auth-service.md](01-auth-service.md)  
**هدف:** رفع نقص‌های P0 و P1 و ثبت پیشرفت به‌صورت مستقل

---

## وضعیت کلی

| دسته | تعداد | انجام‌شده | باقی‌مانده |
|---|---|---|---|
| P0 | ۴ | ۴ | ۰ |
| P1 | ۹ | ۹ | ۰ |
| P2 | ۳ | ۳ | ۰ |

**تعداد فایل‌های اصلاح/ایجاد شده:** ۳۵+  
**نتایج ساخت (Build):** `bun run build` بدون خطای TypeScript پاس شد.

## برنامه اصلاح

### P0 — بحرانی

1. **AUTH-CODE-001 — ثبت‌نام عمومی نقش/واحد سازمانی تعیین نمی‌کند**
   - فقط فیلدهای email, username, password, firstName, lastName در `/register` پذیرفته شود.
   - نقش پیش‌فرض `['user']`، سایر موارد `null`.
   - DTO و ValidationPipe جهانی فعال شود.
   - فایل‌ها: `src/auth.controller.ts`, `src/auth.service.ts`, `src/dto/register.dto.ts`, `src/main.ts`

2. **AUTH-CODE-002 — tenant در توکن و enforce**
   - افزودن `tenantId` به `User` و `Session` و migration.
   - ورود محلی tenant کاربر را در JWT قرار دهد.
   - `TenantGuard` در نبود tenant برای کاربر عادی رد کند (service token مجاز).
   - فایل‌ها: `src/entities/User.ts`, `src/entities/Session.ts`, `src/migrations/*`, `src/auth.service.ts`, `src/session.service.ts`, `src/tenant.guard.ts`

3. **AUTH-CODE-003 — callback اکوسیستم fallback secret پیش‌فرض**
   - حذف `default-secret-change-in-production`.
   - پیاده‌سازی `AuthService.federateLogin` با provision/link کاربر، ساخت session و توکن استاندارد iss/aud/tenant.
   - عدم بازگرداندن ecosystemIdToken/refreshToken در response.
   - فایل‌ها: `src/federation.controller.ts`, `src/auth.service.ts`, `src/federation.service.ts`

4. **AUTH-CODE-004 — migration/entity Session یکسان‌سازی**
   - ویرایش `1700000000006-create-sessions-table.ts` برای ساخت schema canonical.
   - افزودن migration `1700000000009-align-sessions-schema.ts` برای ارتقای DB موجود.
   - فایل‌ها: `src/migrations/1700000000006-create-sessions-table.ts`, `src/migrations/1700000000009-align-sessions-schema.ts`

### P1 — مهم امنیتی

5. **AUTH-CODE-005/006 — OIDC state/nonce/PKCE و allow-list redirect**
   - اعتبارسنجی `redirect_uri` در allow-list per tenant/provider.
   - تولید nonce و state server-side و ذخیره/اعتبارسنجی.
   - تولید PKCE (code_verifier/code_challenge) server-side و ارسال به IdP.
   - اعتبارسنجی nonce در ID token.
   - محدود کردن algorithm‌ها به RS256 مگر config صریح symmetric.
   - فایل‌ها: `src/sso.service.ts`, `src/sso.controller.ts`, `src/federation.service.ts`, `src/federation.controller.ts`, `src/state-store.service.ts`

6. **AUTH-CODE-007 — Federation به کاربر/tenant محلی map شود**
   - در callback اکوسیستم `federateLogin` انجام شود (جز P0).

7. **AUTH-CODE-008 — service token hardening**
   - اضافه کردن `iss`, `aud`, `sub`, `jti`, `tenantId`, `tokenType`.
   - اضافه کردن allow-list permissions و TTL کوتاه.
   - فایل‌ها: `src/auth.service.ts`, `src/auth.controller.ts`

8. **AUTH-CODE-009 — redaction توکن/PII**
   - رمزنگاری `nationalId` در entity.
   - حذف/ماسک nationalId از پاسخ `/me` و `/users`.
   - عدم بازگرداندن ecosystem tokens.
   - فایل‌ها: `src/entities/User.ts`, `src/auth.controller.ts`, `src/federation.controller.ts`

9. **AUTH-CODE-010 — hierarchy در permissions اعمال شود**
   - استفاده از `getAllRolesWithInheritance` در `permissionsForRoles`.
   - فایل‌ها: `src/permissions.ts`

10. **AUTH-CODE-011 — action-level SoD**
    - افزودن `checkActionSodViolation` در `setUserRoles` و guard/audit.
    - فایل‌ها: `src/auth.service.ts`, `src/permissions.guard.ts` (اختیاری)

11. **AUTH-CODE-012 — ABAC fail-closed**
    - حذف fallback به hardcoded در `AbacGuard` catch.
    - فایل‌ها: `src/abac.guard.ts`

12. **AUTH-CODE-013/014 — resource resolver و tenant guard**
    - `TenantGuard` رد در نبود tenant.
    - `Resource` / `ResourceAction` decorator و `ResourceContextInterceptor` برای resolve نوع/شناسه/اکشن منبع.
    - `ResourceContextInterceptor` owner/orgUnit/tenant کاربر هدف را برای resource type `user` از DB بارگذاری می‌کند.

13. **AUTH-CODE-015 — PII encryption/masking**
    - (مشترک با ۸)

### P2 — تکمیلی

14. **AUTH-CODE-019 — login در خطای session fail شود**
    - حذف try/catch بلعیده در `AuthService.login`.

15. **AUTH-CODE-020 — rotation اتمیک**
    - استفاده از `update` با شرط hash و status.

16. **AUTH-CODE-021 — Redis index کامل**
    - `sadd` در `createSession` و invalidation.

17. **AUTH-CODE-022 — health عمیق**
    - بررسی Redis و Kafka و secret readiness.

18. **AUTH-CODE-023 — پورت canonical**
    - تطبیق `Dockerfile` با `main.ts`.

19. **DTO/ValidationPipe و error contract**
    - افزودن `ValidationPipe` در `main.ts` و اصلاح DTOها.

---

## اقدامات ثبت‌شده

### مرحله ۱: ایجاد برنامه و بررسی کد
- [x] خواندن کامل گزارش ممیزی
- [x] بررسی controllerها، serviceها، entityها، guardها، migrationها
- [x] ایجاد فایل پیشرفت مستقل

### مرحله ۲: اصلاحات P0 — بحرانی
- [x] **AUTH-CODE-001**: `/register` فقط email, username, password, firstName, lastName می‌پذیرد. نقش پیش‌فرض `user`. `RegisterDto` فیلترشده و `ValidationPipe` جهانی فعال شد.
- [x] **AUTH-CODE-002**: ستون `tenant_id` به `User` و `Session` و migrationها اضافه شد. توکن local شامل `tenantId` است. `TenantGuard` برای کاربر بدون tenant رد می‌شود، service token مجاز است.
- [x] **AUTH-CODE-003**: `EcosystemCallbackController` دیگر `default-secret-change-in-production` ندارد. `AuthService.federateLogin` کاربر را provision/link کرده، session و توکن استاندارد صادر می‌کند و ecosystem tokens در response نیست.
- [x] **AUTH-CODE-004**: migration ساخت `sessions` با entity هم‌راستا شد و migration `1700000000010-align-sessions-schema.ts` برای ارتقای DBهای موجود نوشته شد.

### مرحله ۳: اصلاحات P1 — مهم
- [x] **AUTH-CODE-005/006**: OIDC/Federation `redirect_uri` validate می‌شود. الگوریتم توکن به `RS256` محدود (مگر `OIDC_SIGNING_ALGORITHM` صریح). `email_verified` بررسی و fallback به secret key در صورت JWKS حذف شد. `StateStoreService` state/nonce/PKCE را server-side ذخیره/اعتبارسنجی می‌کند و nonce در `verifyIdToken` چک می‌شود.
- [x] **AUTH-CODE-007**: `federateLogin` کاربر را به tenant پیش‌فرض واکنش کرده و session می‌سازد.
- [x] **AUTH-CODE-008**: service token دارای `iss`, `aud`, `sub`, `jti`, `tenantId`, `tokenType` و allow-list services/permissions است.
- [x] **AUTH-CODE-009**: `nationalId` رمزنگاری شده و از پاسخ‌های `/me` و `/users` حذف شد. ecosystem tokens در callback دیگر برنگردانده نمی‌شود.
- [x] **AUTH-CODE-010**: محاسبه permissionها از `getAllRolesWithInheritance` استفاده می‌کند.
- [x] **AUTH-CODE-011**: `PermissionsGuard` action-level SoD را با `checkActionSodViolation` بررسی می‌کند.
- [x] **AUTH-CODE-012**: `AbacGuard` در خطای policy store به `ServiceUnavailableException` می‌رود (fail-closed).
- [x] **AUTH-CODE-014**: `TenantGuard` رد در نبود tenant.
- [x] **AUTH-CODE-013**: `Resource`/`ResourceAction` decorator و `ResourceContextInterceptor` پیاده‌سازی شد. resource type/id/action از metadata و پارامتر/متد HTTP استخراج و برای resource type `user` owner/orgUnit/tenant از DB بارگذاری می‌شود.

### مرحله ۴: اصلاحات P2 — تکمیلی
- [x] **AUTH-CODE-019**: `AuthService.login` در خطای ایجاد session fail می‌شود (try/catch حذف شد).
- [x] **AUTH-CODE-020**: rotation refresh token با `sessionRepo.update` شرطی اتمیک انجام می‌شود.
- [x] **AUTH-CODE-021**: `createSession` با `sadd` به `user_sessions:${userId}` index Redis را کامل می‌کند.
- [x] **AUTH-CODE-022**: `/health` علاوه بر DB، presence `JWT_SECRET`, `SERVICE_TOKEN_ISSUER_KEY`, `PII_ENCRYPTION_KEY` و Redis را بررسی می‌کند.
- [x] **AUTH-CODE-023**: `Dockerfile` اکنون `EXPOSE 3007` دارد (مطابق `main.ts`).
- [x] **DTO/ValidationPipe**: `LoginDto`, `RegisterDto`, `ServiceTokenDto`, `SetRolesDto`, `AssignOrgUnitDto` تعریف و اعمال شدند. `ValidationPipe` جهانی با `whitelist` و `forbidNonWhitelisted` فعال است.

### لیست فایل‌های اصلاح/ایجاد‌شده
- `services/auth-service/src/auth.controller.ts`
- `services/auth-service/src/auth.service.ts`
- `services/auth-service/src/session.service.ts`
- `services/auth-service/src/jwt-auth.guard.ts`
- `services/auth-service/src/permissions.guard.ts`
- `services/auth-service/src/tenant.guard.ts`
- `services/auth-service/src/abac.guard.ts`
- `services/auth-service/src/sso.service.ts`
- `services/auth-service/src/federation.service.ts`
- `services/auth-service/src/federation.controller.ts`
- `services/auth-service/src/health.controller.ts`
- `services/auth-service/src/main.ts`
- `services/auth-service/src/data-source.ts`
- `services/auth-service/src/permissions.ts`
- `services/auth-service/src/entities/User.ts`
- `services/auth-service/src/entities/Session.ts`
- `services/auth-service/src/dto/register.dto.ts`
- `services/auth-service/src/dto/login.dto.ts`
- `services/auth-service/src/dto/service-token.dto.ts` (new)
- `services/auth-service/src/dto/set-roles.dto.ts` (new)
- `services/auth-service/src/dto/assign-org-unit.dto.ts` (new)
- `services/auth-service/src/utils/field-encryption.ts` (new)
- `services/auth-service/src/state-store.service.ts` (new)
- `services/auth-service/src/resource.decorator.ts` (new)
- `services/auth-service/src/resource-context.interceptor.ts` (new)
- `services/auth-service/src/migrations/1700000000002-create-users-table.ts`
- `services/auth-service/src/migrations/1700000000006-create-sessions-table.ts`
- `services/auth-service/src/migrations/1700000000008-add-missing-user-columns.ts`
- `services/auth-service/src/migrations/1700000000009-add-tenant-to-users.ts` (new)
- `services/auth-service/src/migrations/1700000000010-align-sessions-schema.ts` (new)
- `services/auth-service/package.json`
- `services/auth-service/tsconfig.json`
- `services/auth-service/Dockerfile`
- `services/auth-service/src/entities/OrganizationUnit.ts` (tenant_id added)
- `services/auth-service/src/entities/AccessAudit.ts` (immutable listeners)
- `services/auth-service/src/org-units.service.ts` (tenantId filtering)
- `services/auth-service/src/org-units.controller.ts` (tenantId propagation, correlation id)
- `services/auth-service/src/migrations/1700000000003-create-org-units-table.ts` (tenant_id)
- `services/auth-service/src/migrations/1700000000011-add-tenant-to-org-units.ts` (new)
- `services/auth-service/src/migrations/1700000000012-create-outbox-events.ts` (new)
- `services/auth-service/src/migrations/add-access-audit-table.ts` (type alignment)
- `services/auth-service/src/utils/field-encryption.ts` (fail-safe encryption)
- `services/auth-service/src/session.service.ts` (outbox events, redacted logs)
- `services/auth-service/src/sso.controller.ts` (state/nonce required, redacted errors)
- `services/auth-service/src/federation.service.ts` (state required, provider binding)
- `services/auth-service/src/federation.controller.ts` (state required, redacted errors)
- `services/auth-service/src/health.controller.ts` (Redis ping check)
- `services/auth-service/src/roles.guard.ts` (standard Forbidden response)
- `services/auth-service/src/policy-admin.controller.ts` (typed DTOs)
- `services/auth-service/src/policy-admin.service.ts` (flexible createPolicy type)
- `services/auth-service/src/dto/create-policy.dto.ts` (new)
- `services/auth-service/src/dto/update-policy.dto.ts` (new)
- `services/auth-service/src/dto/evaluate-policy.dto.ts` (new)
- `services/auth-service/src/dto/policy-condition.dto.ts` (new)

### مرحله ۵: اصلاحات تکمیلی ثانویه (بازبینی مجدد)

- [x] **AUTH-CODE-002 — tenant در کوئری‌های user/org-unit**: افزودن ستون `tenant_id` به `OrganizationUnit` و migration `1700000000011-add-tenant-to-org-units.ts`. فیلتر `tenantId` در `OrgUnitsService` و `AuthService.listUsers` و بررسی `TENANT_MISMATCH` در `setUserRoles`/`assignOrgUnit` اعمال شد.
- [x] **AUTH-CODE-005/006 — الزام state در token exchange**: `SsoService.exchangeCodeForTokens` و `FederationService.exchangeCodeForTokens` اکنون state را required می‌دانند و `nonce` را در پاسخ برمی‌گردانند. `SsoController.verifyIdToken` nonce را required کرد.
- [x] **AUTH-CODE-009 — PII encryption fail-safe**: `field-encryption.ts` در صورت نبود `PII_ENCRYPTION_KEY` خطا می‌دهد (plaintext fallback حذف شد). `deviceFingerprint` از لاگ `SessionService` حذف شد.
- [x] **AUTH-CODE-018 — audit immutable/outbox**: `AccessAudit` entity با `@BeforeUpdate`/`@BeforeRemove` immutable شد. migration `add-access-audit-table.ts` با entity هم‌راستا شد. `OutboxEvent` به `AppModule` اضافه و migration `1700000000012-create-outbox-events.ts` نوشته شد؛ رویدادهای `user.registered`, `user.logged_in`, `user.roles_set`, `user.org_unit_assigned`, `user.federated_login`, `session.rotated`, `session.revoked` در outbox ثبت می‌شوند.
- [x] **AUTH-CODE-022 — health عمیق‌تر**: `/health` علاوه بر DB و secrets، اتصال واقعی Redis را با `ping()` بررسی می‌کند.
- [x] **correlation IDs استاندارد**: تمام `getCorrelationId` در `auth/org-units/sso/iam/federation` controllers fallback را به `uuidv4()` تغییر دادند.
- [x] **DTO/ValidationPipe برای ABAC policy**: `CreatePolicyDto`, `UpdatePolicyDto`, `EvaluatePolicyDto` و `PolicyConditionDto` ایجاد و در `policy-admin.controller.ts` اعمال شدند.
- [x] **RolesGuard استاندارد**: `RolesGuard` اکنون به جای `false`، `ForbiddenException` با response استاندارد پرتاب می‌کند.
- [x] **redaction پیام خطای SSO/Federation**: تمام catch blocks در `sso.controller.ts` و `federation.controller.ts` پیام generic `Operation failed` برمی‌گردانند.

### نتایج بررسی
- `bun run build` در مسیر `services/auth-service` بدون خطای TypeScript اجرا شد.
- تست‌های runtime خاص auth-service در repo وجود نداشت؛ بنابراین صحت runtime مستلزم اجرای دستی با DB/Redis است.

### مرحله ۶: تکمیل بازبینی نهایی (ادامه)

- [x] **SAML server-side relay-state binding**: `StateStoreService` اکنون `flowType`/`clientState`/`providerId` را ذخیره می‌کند. `SsoService.generateSamlSsoUrl` رله‌استیت سرورایجاد کرده و با `SAML.getAuthorizeUrlAsync` درخواست AuthnRequest واقعی تولید/امضا می‌کند (با fallback ایمن). `handleSamlResponse` رله‌استیت را با `stateStore.validate` بررسی می‌کند.
- [x] **OIDC/SAML → local user/tenant**: `SsoController` دارای endpointهای `POST /sso/oidc/callback` و `POST /sso/saml/acs` است که پس از exchange/verify/assertion، `AuthService.federateLogin` را برای JIT provisioning/link و صدور توکن محلی و tenant فراخوانی می‌کند.
- [x] **SSO/Federation audit logging**: تمام callbackهای SSO/SAML با `AccessAuditService` (decision allow/deny) ثبت می‌شوند.
- [x] **SSO rate limiting**: `SsoController` محدودیت درخواست per-IP (30 در دقیقه) برای endpointهای عمومی OIDC/SAML اعمال می‌کند.
- [x] **action-level SoD برای federation endpoints**: `FederationController` اکنون `PermissionsGuard` دارد و متدها با `@Permissions('federation:read' | 'federation:manage')` علامت‌گذاری شده‌اند؛ `PermissionsGuard` قبل از اجازه، `checkActionSodViolation` را بررسی می‌کند.
- [x] **ABAC resource resolver**: `ResourceContextInterceptor` علاوه بر `user`، resource attributes را از DB برای `orgUnit`، `policy`، `session` و `federatedIdentity` بارگذاری می‌کند.
- [x] **health عمیق‌تر**: `/health` اکنون `kafka`، `migrations` و `session_store` را نیز گزارش می‌کند (علاوه بر DB، Redis و secrets).
- [x] **Redis session tenantId**: `SessionService` در cache rotation `tenantId` را نیز ذخیره می‌کند؛ `createSession` از قبل `tenantId` را در Redis داشت.

### مرحله ۷: بازبینی نهایی سند ممیزی و رفع موارد باقی‌مانده

- [x] **AUTH-CODE-004/017 — migration/entity sessions و سایر entityها**: entity `Session`، `AbacPolicy` و `FederatedIdentity` با column names صریح snake_case به migrations هم‌راستا شدند. migrationهای `1700000000013-create-abac-policies-table.ts` و `1700000000014-create-federated-identities-table.ts` برای ایجاد جداول مربوطه اضافه شدند. `data-source.ts` همه entityها را شامل می‌شود.
- [x] **AUTH-CODE-004 — sessions migration/entity**: `1700000000006-create-sessions-table.ts` و `1700000000010-align-sessions-schema.ts` با entity `Session` مطابقت دارند.

### باقی‌مانده
- هیچ مورد P0/P1 شناسایی‌شده‌ای در این گزارش باقی نمانده است.
- P2 مربوط به تست اختصاصی سرویس (`*.spec.ts` / `*.test.ts`) هنوز در repo وجود ندارد و برای ادعای ۱۰۰٪ runtime-verified نیاز به اضافه‌کردن تست و اجرای آن دارد.

### نتیجه نهایی
- `bun run build` در مسیر `services/auth-service` بدون خطای TypeScript اجرا شد.
- تمام یافته‌های P0/P1 و بخش اصلی P2 در سطح کد پیاده‌سازی شده است. ادعای ۱۰۰٪ تکمیل کد صحت دارد، اما evidence اجرای تست مستقل همچنان باقی است.

---

*این فایل در طول اصلاحات به‌روزرسانی می‌شود.*
