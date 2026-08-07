# Federation Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: federation-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/federation-service/src/`

---

## ۱. نبود REST API و قابلیت مدیریت

### ۱.۱ نبود کامل REST endpoints
- **اندپوینت**: N/A (هیچ REST endpoint وجود ندارد)
- **اشکال**: federation-service به‌عنوان یک سرویس/کتابخانه داخلی عمل می‌کند و هیچ REST endpoint ای ندارد. تمام عملیات از طریق event-driven architecture (Kafka) انجام می‌شود. این طراحی باعث می‌شود هیچ راهی برای مدیریت، مانیتورینگ یا دیباگ federation از طریق API وجود نداشته باشد. در یک سیستم enterprise، اپراتورها باید بتوانند وضعیت federation، projection sync و reconciliation را از طریق API بررسی و مدیریت کنند.
- **کد**: بررسی `services/federation-service/src/` نشان می‌دهد هیچ فایل controller وجود ندارد. تمام فایل‌ها فقط re-export هستند: `index.ts` پنج export دارد که همگی از `common/src/` یا سایر سرویس‌ها re-export می‌شوند. هیچ `main.ts`، `app.module.ts` یا `package.json` در سرویس وجود ندارد — این یک ماژول کتابخانه‌ای است نه یک سرویس مستقل.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ نبود health check endpoint
- **اندپوینت**: N/A
- **اشکال**: هیچ `/health` endpoint ای وجود ندارد. سرویس‌های دیگر (مثل monitoring-service) نمی‌توانند سلامت federation-service را بررسی کنند. در حالی که `partner-health-check.service.ts` و `sync-latency-monitor.ts` به‌صورت داخلی وجود دارند، نتایج آنها از طریق هیچ API ای قابل دسترسی نیست. این باعث می‌شود federation-service یک "black box" باشد که در صورت بروز مشکل، تشخیص و عیب‌یابی آن بسیار دشوار است.
- **کد**: `services/federation-service/src/monitoring/partner-health-check.service.ts` (خط ۱) فقط re-export می‌کند: `export { PartnerHealthCheckService, PartnerHealthStatus } from '../../../partner-gateway/src/monitoring/partner-health-check.service';`. `sync-latency-monitor.ts` نیز از `policy-service/src/sync-latency-monitor` re-export می‌شود. هیچ controller یا health endpoint وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ نبود endpoint برای بررسی وضعیت projection sync
- **اندپوینت**: N/A (فقط `projection-sync.service.ts` داخلی)
- **اشکال**: `projection-sync.service.ts` و `projection-apply.service.ts` به‌صورت داخلی عمل می‌کنند اما هیچ API ای برای بررسی وضعیت projection sync وجود ندارد. اپراتورها نمی‌توانند ببینند کدام projection‌ها sync هستند، کدام عقب افتاده‌اند (lag)، و کدام با خطا مواجه شده‌اند. طبق `FEDERATION_RUNBOOK.md`، `ProjectionSyncDriftDetected` alert باید فعال شود اما هیچ API برای بررسی دستی drift وجود ندارد.
- **کد**: `services/federation-service/src/projection-sync/projection-sync.service.ts` (خط ۱): `export { ProjectionSyncService, InsurerProjectionPayload } from '../../../policy-service/src/projection-sync.service';` — فقط re-export از `policy-service`. `projection-apply.service.ts` نیز از `policy-service` re-export می‌شود. هیچ controller یا API برای مشاهده وضعیت sync وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Token Exchange و Cross-Org Data Sharing

### ۲.۱ نبود endpoint برای token exchange
- **اندپوینت**: N/A
- **اشکال**: طبق `FEDERATION_RUNBOOK.md`، token exchange یک عملیات حیاتی در federation است (`POST /partner-gateway/token-exchange`). اما federation-service خود هیچ endpoint ای برای token exchange ندارد. این عملیات به `partner-gateway` واگذار شده، اما federation-service که منطق federation را نگه می‌دارد هیچ نقشی در validation یا audit token exchange ندارد. این جدایی باعث می‌شود federation-service نتواند جریان توکن‌های متقاطع tenant را ردیابی کند.
- **کد**: هیچ فایلی در `services/federation-service/src/` به token exchange اشاره نمی‌کند. تست `test/token-exchange.spec.ts` وجود دارد اما این فقط تست است و کد production در `partner-gateway` قرار دارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ نبود endpoint برای cross-org data sharing status
- **اندپوینت**: N/A
- **اشکال**: هیچ API ای برای بررسی اینکه چه داده‌ای بین tenant‌ها به اشتراک گذاشته شده وجود ندارد. در یک سیستم federated، اپراتورها باید بتوانند ببینند کدام entity‌ها از کدام tenant به کدام tenant projection شده‌اند. `getSorMatrix` و `getEntityOwner` به‌صورت داخلی وجود دارند اما از طریق هیچ API ای قابل دسترسی نیستند.
- **کد**: `services/common/src/federation/system-of-record.ts` (خطوط ۵۸-۶۴): `getSorMatrix()` و `getEntityOwner(entityName)` توابعی هستند که یک ماتریس hardcoded (خطوط ۱۵-۵۶) برمی‌گردانند. این ماتریس شامل ۲۸ entity با owner و projectedIn است (مثلاً `Policy: { owner: 'issuerTenant', projectedIn: ['brokerTenant', 'customerTenant'] }`). اما هیچ REST API ای این توابع را expose نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ نبود endpoint برای consent enforcement verification
- **اندپوینت**: N/A
- **اشکال**: طبق `FEDERATION_AI_CONSTRAINTS.md`، `FederationConsentService.enforceConsentBeforeProjection()` قبل از projection اجرا می‌شود. اما هیچ API ای برای بررسی وضعیت consent در context federation وجود ندارد. اپراتورها نمی‌توانند ببینند آیا consent برای یک projection خاص فعال است یا خیر. این در حالی است که `customer-360-service` consent management دارد اما federation-service به آن متصل نیست.
- **کد**: **نکته مهم**: `FederationConsentService` در `federation-service` وجود ندارد. این سرویس در `party-kyc-service/src/identity/federation-consent.service.ts` (خط ۱۹) تعریف شده و متد `enforceConsentBeforeProjection` در خط ۱۱۰ آن سرویس است. `federation-service` هیچ ارجاعی به consent ندارد. بنابراین تحلیل درست است که federation-service هیچ endpoint consent ندارد، اما ارجاع به `FederationConsentService` در این سرویس گمراه‌کننده است — آن سرویس در `party-kyc-service` قرار دارد.
- **وضعیت**: ✅ تأیید شد (با توضیح: FederationConsentService در party-kyc-service است نه federation-service)

---

## ۳. Reconciliation و Data Consistency

### ۳.۱ نبود endpoint برای trigger reconciliation
- **اندپوینت**: N/A (فقط `ProjectionReconciliationService` داخلی)
- **اشکال**: طبق `FEDERATION_RUNBOOK.md`، reconciliation باید به‌صورت دستی یا خودکار اجرا شود (`ProjectionReconciliationService.reconcileProjections(tenantId, issuerOrgId, { autoRepair: false })`). اما هیچ REST API ای برای trigger کردن reconciliation وجود ندارد. اپراتورها باید به کد دسترسی داشته باشند یا از یک ابزار داخلی استفاده کنند. در یک سیستم enterprise، باید endpoint‌هایی مانند `POST /federation/reconcile` و `GET /federation/reconcile/:jobId/status` وجود داشته باشد.
- **کد**: `services/federation-service/src/reconciliation/projection-reconciliation.service.ts` (خط ۱): `export { ProjectionReconciliationService, ReconciliationResult } from '../../../policy-service/src/projection-reconciliation.service';` — فقط re-export از `policy-service`. هیچ controller یا API برای trigger کردن reconciliation وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ نبود endpoint برای بررسی reconciliation results
- **اندپوینت**: N/A
- **اشکال**: نتیجه reconciliation شامل mismatched، missing و stale projection‌هاست اما هیچ API ای برای مشاهده این نتایج وجود ندارد. اپراتورها باید نتایج را از log‌ها استخراج کنند. در یک سیستم با ده‌ها tenant و هزاران projection، این روش ناکارآمد و مستعد خطا است.
- **کد**: `ReconciliationResult` از `policy-service` re-export می‌شود اما هیچ API ای برای query آن وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ نبود endpoint برای manual projection repair
- **اندپوینت**: N/A
- **اشکال**: وقتی drift تشخیص داده می‌شود، `autoRepair: true` باید در کد فعال شود. هیچ API ای برای repair دستی یک projection خاص وجود ندارد. اپراتور باید بتواند `POST /federation/projections/:projectionId/repair` را فراخوانی کند تا یک projection منفرد را بدون اجرای کامل reconciliation ترمیم کند.
- **کد**: هیچ endpoint یا controller ای در کل `services/federation-service/src/` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Event Signing و Non-Repudiation

### ۴.۱ نبود endpoint برای key management
- **اندپوینت**: N/A (فقط `generateSigningKeyPair`، `generateKeyId` داخلی)
- **اشکال**: توابع `signEvent`، `verifyEventSignature` و `generateSigningKeyPair` به‌صورت داخلی وجود دارند اما هیچ API ای برای مدیریت signing key‌ها وجود ندارد. اپراتورها نمی‌توانند key‌های فعال را لیست کنند، key جدید ایجاد کنند، یا key قدیمی را revoke کنند. طبق `FEDERATION_RUNBOOK.md`، در صورت signature failure باید `signingKeyId` بررسی شود اما هیچ API ای برای این کار نیست.
- **کد**: `services/common/src/events/event-signer.ts` (خطوط ۹۵-۱۰۷): `generateSigningKeyPair(organizationId)` یک key pair RSA 2048-bit تولید می‌کند. `SigningKey` interface (خطوط ۲۲-۳۱) دارای `status: 'active' | 'rotated' | 'revoked'` است، اما هیچ API یا storage برای مدیریت lifecycle این key‌ها وجود ندارد. key‌ها در حافظه تولید و استفاده می‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ نبود endpoint برای verify event signature
- **اندپوینت**: N/A (فقط `verifyEventSignature` و `EventSignatureValidator` داخلی)
- **اشکال**: `EventSignatureValidator` به‌صورت داخلی signature را validate می‌کند اما هیچ API ای برای verify دستی یک event envelope وجود ندارد. در صورت بروز `CrossTenantEventSignatureFailures` alert، اپراتور باید بتواند یک event envelope را به یک endpoint ارسال کند و نتیجه validation را دریافت کند.
- **کد**: `services/common/src/events/event-signer.ts` (خطوط ۷۵-۸۹): `verifyEventSignature(envelope, publicKeyPem)` با استفاده از `createVerify('RSA-SHA256')` signature را verify می‌کند. `EventSignatureValidator` از `common/src/events/event-signature-validator.ts` re-export می‌شود. هیچ controller یا API برای فراخوانی دستی این توابع وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ نبود endpoint برای audit trail federation events
- **اندپوینت**: N/A
- **اشکال**: طبق `FEDERATION_AI_CONSTRAINTS.md`، تمام federation AI inference request‌ها باید با tenant، model، consent reference و correlation ID در `AuditRecord` ثبت شوند. اما هیچ API ای برای query کردن این audit record‌ها در context federation وجود ندارد. اپراتورها نمی‌توانند ببینند چه event‌هایی بین tenant‌ها رد و بدل شده و آیا data classification (`ANONYMIZED`، `AGGREGATED`، `PII`) رعایت شده است.
- **کد**: `SignedEventEnvelope` در `event-signer.ts` (خط ۱۴) دارای `dataClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'PII'` است، اما هیچ API برای query کردن event‌های امضا‌شده وجود ندارد. `AuditRecord` در SOR matrix (خط ۴۰) به‌عنوان entity با `ownerService: 'policy-service'` تعریف شده اما federation-service هیچ accessی به آن ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Monitoring و Observability

### ۵.۱ نبود endpoint برای sync latency monitoring
- **اندپوینت**: N/A (فقط `sync-latency-monitor.ts` داخلی)
- **اشکال**: `sync-latency-monitor.ts` به‌صورت داخلی latency را مانیتور می‌کند اما هیچ API ای برای مشاهده latency فعلی بین tenant‌ها وجود ندارد. اپراتورها نمی‌توانند ببینند کدام tenant‌ها latency بالا دارند و آیا SLA federation رعایت می‌شود.
- **کد**: `services/federation-service/src/monitoring/sync-latency-monitor.ts` (خط ۱): `export { SyncLatencyMonitor, SyncLatencyMetric } from '../../../policy-service/src/sync-latency-monitor';` — فقط re-export از `policy-service`. هیچ controller یا API برای مشاهده latency metric‌ها وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ نبود endpoint برای partner health status
- **اندپوینت**: N/A (فقط `partner-health-check.service.ts` داخلی)
- **اشکال**: `partner-health-check.service.ts` سلامت partner‌ها را بررسی می‌کند اما نتیجه از طریق هیچ API ای قابل دسترسی نیست. در حالی که `partner-gateway` اندپوینت‌های مدیریت partner دارد، federation-service که health check واقعی را انجام می‌دهد هیچ خروجی API ندارد.
- **کد**: `services/federation-service/src/monitoring/partner-health-check.service.ts` (خط ۱): `export { PartnerHealthCheckService, PartnerHealthStatus } from '../../../partner-gateway/src/monitoring/partner-health-check.service';` — فقط re-export از `partner-gateway`. هیچ controller یا API برای مشاهده health status وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ نبود integration با monitoring-service
- **اندپوینت**: N/A
- **اشکال**: federation-service هیچ metric یا event ای به monitoring-service ارسال نمی‌کند (یا حداقل هیچ API ای برای این کار ندارد). در یک سیستم observable، federation-service باید metric‌هایی مانند `federation_projection_sync_lag_seconds`، `federation_event_signature_failures_total` و `federation_reconciliation_mismatches_total` را به monitoring-service ارسال کند.
- **کد**: هیچ import یا reference به monitoring-service در کل `services/federation-service/src/` وجود ندارد. `FederationEventRouter` در `common/src/federation/federation-event-router.ts` (خط ۲۸) یک logger مینیمال دارد (`info`, `warn`, `error`, `debug`) اما این فقط logging محلی است، نه ارسال metric به monitoring-service.
- **وضعیت**: ✅ تأیید شد

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم دسترسی اپراتورها به وضعیت federation
- **اشکال**: اپراتورهای سیستم (DevOps، SRE) هیچ راهی برای بررسی وضعیت federation از طریق API ندارند. تمام عملیات federation از طریق event‌های Kafka انجام می‌شود و هیچ dashboard یا API برای مشاهده وضعیت وجود ندارد. این باعث می‌شود در زمان incident، زمان تشخیص (MTTD) به‌شدت افزایش یابد.
- **کد**: تأیید می‌شود — هیچ controller یا REST API در کل سرویس وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم یکپارچه‌سازی با partner-gateway
- **اشکال**: `partner-gateway` مسئول مدیریت partner و token exchange است اما federation-service که منطق event routing و projection را نگه می‌دارد، هیچ API ای برای هماهنگی با partner-gateway ندارد. مثلاً وقتی یک partner در partner-gateway غیرفعال می‌شود، federation-service باید event routing به آن partner را متوقف کند اما هیچ endpoint ای برای این هماهنگی وجود ندارد.
- **کد**: `FederationEventRouter` در `common/src/federation/federation-event-router.ts` (خطوط ۸۲-۹۷) متد `isEventAllowedForTenant` دارد که بر اساس SOR matrix بررسی می‌کند، اما این فقط بر اساس tenant type است نه partner status. هیچ اتصالی به partner-gateway برای بررسی وضعیت partner وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم یکپارچه‌سازی با customer-360-service برای consent
- **اشکال**: `customer-360-service` consent management را مدیریت می‌کند و `FEDERATION_AI_CONSTRAINTS.md` می‌گوید consent قبل از projection باید enforce شود. اما هیچ API یا endpoint ای برای federation-service جهت query کردن consent از customer-360-service وجود ندارد. این یکپارچه‌سازی باید از طریق event یا internal call انجام شود اما در کاتالوگ اندپوینت هیچ نشانی از آن نیست.
- **کد**: `FederationConsentService` در `party-kyc-service/src/identity/federation-consent.service.ts` (خط ۱۹) تعریف شده و `enforceConsentBeforeProjection` در خط ۱۱۰ آن پیاده‌سازی شده است. اما federation-service هیچ ارجاعی به این سرویس یا customer-360-service ندارد. SOR matrix در `system-of-record.ts` (خط ۴۳) `FederationConsent` را با `ownerService: 'party-kyc-service'` تعریف کرده، اما هیچ API در federation-service برای query consent وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم یکپارچه‌سازی با auth-service برای tenant validation
- **اشکال**: federation-service با tenant‌های مختلف کار می‌کند اما هیچ API ای برای validate کردن tenant از طریق auth-service ندارد. `isLocalAuthoritative` و `canMutate` به‌صورت داخلی کار می‌کنند اما اگر tenant matrix ناقص باشد، هیچ راهی برای validate کردن از auth-service وجود ندارد.
- **کد**: `isLocalAuthoritative` و `canMutate` از `common/src/federation/authoritative-tenant.decorator.ts` re-export می‌شوند (خط ۲ `index.ts`). این توابع فقط بر اساس SOR matrix hardcoded کار می‌کنند و هیچ اتصالی به auth-service ندارند.
- **وضعیت**: ✅ تأیید شد

### ۶.۵ نبود API برای SOR matrix management
- **اشکال**: `getSorMatrix` و `getEntityOwner` توابع داخلی هستند اما هیچ API ای برای مدیریت یا مشاهده SOR matrix وجود ندارد. در یک سیستم federated، SOR matrix باید قابل مشاهده و ویرایش باشد تا اپراتورها بتوانند در صورت تغییر ownership، ماتریس را به‌روز کنند.
- **کد**: `services/common/src/federation/system-of-record.ts` (خطوط ۱۵-۵۶): `SOR_MATRIX` یک constant hardcoded است با `version: 1` و `updated: '2025-01-15'`. هیچ راهی برای به‌روزرسانی runtime آن وجود ندارد. توابع `getSorMatrix()` و `getEntityOwner()` فقط این constant را برمی‌گردانند.
- **وضعیت**: ✅ تأیید شد

---

## ۷. نقص‌های جدید یافت‌شده در کد

### ۷.۱ federation-service یک سرویس مستقل نیست — فقط re-export module است
- **اندپوینت**: N/A
- **اشکال**: federation-service هیچ `package.json`، `main.ts`، `app.module.ts` یا NestJS module ندارد. تمام فایل‌های `src/` فقط re-export از سرویس‌های دیگر هستند (`common/src/`، `policy-service/src/`، `partner-gateway/src/`، `document-service/src/`). این یعنی federation-service به‌عنوان یک سرویس مستق deploy نمی‌شود و فقط یک aggregation point برای import‌ها است. این طراحی باعث وابستگی circular احتمالی می‌شود (مثلاً `policy-service` → `federation-service` → `policy-service`).
- **کد**: تمام فایل‌های `src/`: `index.ts` (۵ خط)، `event-router/federation-event-router.ts` (۵ خط)، `event-router/partition-selector.ts` (۴ خط)، `projection-sync/projection-sync.service.ts` (۱ خط)، `projection-sync/projection-apply.service.ts` (۱ خط)، `reconciliation/projection-reconciliation.service.ts` (۱ خط)، `monitoring/partner-health-check.service.ts` (۱ خط)، `monitoring/sync-latency-monitor.ts` (۱ خط)، `document-non-repudiation.service.ts` (۸ خط)، `config/sor-matrix.ts` (۸ خط) — همگی فقط export از سایر سرویس‌ها.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۲ hardcoded بودن SOR matrix بدون امکان پیکربندی runtime
- **اندپوینت**: N/A
- **اشکال**: SOR matrix در `system-of-record.ts` یک constant hardcoded است. هر تغییر در ownership entity نیازمند تغییر کد و deploy مجدد است. در یک سیستم federated پویا، SOR matrix باید از یک منبع پیکربندی (DB، config file، یا API) بارگذاری شود.
- **کد**: `services/common/src/federation/system-of-record.ts` (خط ۱۵): `const SOR_MATRIX: SorMatrix = { version: 1, updated: '2025-01-15', entities: { ... } }` — یک constant با ۲۸ entity hardcoded. هیچ مکانیزم reload یا update runtime وجود ندارد. `getSorMatrix()` (خط ۵۸) فقط این constant را برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۳ عدم error handling در FederationEventRouter برای event type‌های ناشناخته
- **اندپوینت**: N/A
- **اشکال**: `FederationEventRouter.isEventAllowedForTenant` اگر eventType در SOR matrix نباشد، فقط `warn` log می‌کند و `false` برمی‌گرداند. هیچ error یا alert ای تولید نمی‌شود. این می‌تواند باعث شود event‌های مهم به‌صورت خاموش drop شوند.
- **کد**: `services/common/src/federation/federation-event-router.ts` (خطوط ۸۸-۹۶): `if (!entityConfig) { this.logger.warn('Event type not found in SOR matrix', { eventType }); return false; }` — فقط warning log، هیچ error throw یا metric افزایش نمی‌دهد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۴ عدم persistence برای signing key‌ها
- **اندپوینت**: N/A
- **اشکال**: `generateSigningKeyPair` یک key pair تولید می‌کند اما هیچ storage یا persistence برای ذخیره key‌ها وجود ندارد. `KeyProvider` interface تعریف شده اما هیچ implementation دائمی برای آن در federation-service وجود ندارد. key‌ها در حافظه تولید و استفاده می‌شوند و با restart از بین می‌روند.
- **کد**: `services/common/src/events/event-signer.ts` (خطوط ۳۳-۳۶): `KeyProvider` interface با `getActiveKey` و `getPublicKey` تعریف شده، اما هیچ implementation در federation-service وجود ندارد. `SigningKey` (خطوط ۲۲-۳۱) دارای `status: 'active' | 'rotated' | 'revoked'` است اما هیچ DB table یا file storage برای ذخیره آن‌ها تعریف نشده.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۵ عدم تست برای re-export structure
- **اندپوینت**: N/A
- **اشکال**: در دایرکتوری `test/` چهار فایل تست وجود دارد (`event-signing.spec.ts`، `partner-gateway.spec.ts`، `projection-sync.spec.ts`، `token-exchange.spec.ts`) اما هیچ تستی وجود ندارد که صحت re-export‌ها را بررسی کند. اگر یک export از سرویس مبدأ حذف یا rename شود، federation-service بدون خطای compile شکست می‌خورد.
- **کد**: `services/federation-service/test/` شامل ۴ فایل تست است اما هیچ تست import validation برای re-export structure وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
