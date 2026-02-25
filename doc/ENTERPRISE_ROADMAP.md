# Enterprise Roadmap (Iran Insurance 1404-Aligned)

## 1) مبنا (Reference / انطباق با صنعت بیمه ایران 1404)
این roadmap باید منطبق با موارد کلیدی سند «تحقیقات فرایندهای شرکت‌های بیمه ایرانی - 1404» باشد:

- **صدور بیمه‌نامه (5 مرحله)**:
  1) استعلام و مشاوره
  2) جمع‌آوری اطلاعات و مدارک
  3) ارزیابی ریسک
  4) صدور (پس از تأیید نهایی و پرداخت حق بیمه)
  5) پس از صدور (ثبت در CRM/ارسال اطلاعات به بیمه مرکزی/پیگیری رضایت/اصلاحات)

- **پرداخت خسارت (5 مرحله)**:
  1) دریافت و ثبت گزارش خسارت (شماره‌گذاری پرونده)
  2) ارزیابی اولیه (بررسی پوشش/مدارک موردنیاز/ارجاع)
  3) کارشناسی دقیق (بازدید/محاسبه/گزارش)
  4) تصمیم پوشش (انطباق/محاسبه/فرانشیز و کسورات)
  5) پرداخت (مدارک پرداخت/تأیید مالی/واریز/ابلاغ)

- **سنهاب/میز خدمات + کد یکتا**:
  - داده‌های حداقلی بیمه‌نامه باید شامل **شماره بیمه‌نامه و کد یکتا** باشد.
  - **بدون کد یکتا بیمه‌نامه از نظر بیمه مرکزی فاقد اعتبار تلقی می‌شود.**
  - استعلام‌ها باید چندکاناله دیده شوند: کد ملی + کد یکتا / شماره بیمه‌نامه / VIN / پیامک.
  - **Quality Gate برای صدور**: اگر کد یکتا یا نتیجه استعلام مشکل دارد، پرونده باید به مسیر «پیگیری/رفع مغایرت/الحاقیه» هدایت شود.

- **شبکه فروش (نماینده/کارگزار/بازاریاب)**:
  - نقش‌ها و پرتال‌های عملیاتی برای صدور/پشتیبانی/پیگیری لازم است.
  - رصد KPIهای فروش و عملکرد شبکه فروش در داشبورد باید پیش‌بینی شود.

- **شکایات (داخل شرکت و بیمه مرکزی)**:
  - ثبت شکایت داخلی + امکان آماده‌سازی داده برای مسیر بیمه مرکزی:
    - نوع شکایت (صدور/خسارت/نماینده/کارگزار/…)
    - مشخصات بیمه‌نامه
    - هویت شاکی و احراز شماره همراه
    - شرح + مستندات
  - نیازمندی سامانه: Ticket یکپارچه + SLA + داشبورد علل پرتکرار.

- **AML/CFT**:
  - KYC و ثبت رضایت‌ها
  - قواعد معامله مشکوک قابل پیکربندی
  - گزارش داخلی برای واحد AML
  - Audit Trail تصمیمات

- **امنیت اطلاعات/حریم خصوصی/نگهداری داده و لاگ**:
  - Data Minimization + RBAC/Permissions
  - رمزنگاری در انتقال و در حالت ذخیره
  - Audit Log برای عملیات حساس (صدور/پرداخت/تغییرات)
  - Backup/DR
  - سیاست نگهداری داده‌های ترافیک و اطلاعات کاربران باید شفاف و قابل ممیزی باشد.

---

## 2) وضعیت فعلی (As-Is)
پیاده‌سازی فعلی شامل NestJS (Bun + Fastify) و الگوهای زیر است:
- API Gateway: routing/proxy + correlationId
- IAM/Auth: JWT + permission guards (در سرویس‌های موجود)
- Feature Flags: مدیریت Feature Toggle و AI Toggle
- Claims/Documents/Fraud/Orchestrator/Copilot: دامنه‌های اولیه
- Party/KYC: سرویس پایه با migrations + JWT/permissions + audit
- Policy: سرویس پایه هم‌راستا با مراحل صدور و «کد یکتا»

---

## 3) اصول طراحی اجرایی (Executable Principles)
- Database per service (Postgres)
- TypeORM Migrations only (در production `synchronize` باید خاموش باشد)
- API Contract ثابت: `success/data/error/correlationId`
- Audit-grade logging برای عملیات حساس (صدور/الحاقیه/ابطال/پرداخت/تغییر نقش‌ها)
- Event-driven با Kafka + Transactional Outbox (برای عملیات حساس مالی/وضعیت‌های کلیدی)
- Idempotency برای:
  - commandهای حساس (مثلاً پرداخت/صدور)
  - consumerها (Kafka)
- Tenancy از طریق header مانند `x-tenant-id` (حداقل جداسازی در سطح schema/DB)

افزوده‌های الزام‌آور از سند 1404:
- **Multi-channel inquiry (سنهاب/کد یکتا):** پشتیبانی از استعلام با:
  - کد ملی + کد یکتا
  - شماره بیمه‌نامه
  - VIN
  - پیامک (الگوهای عملیاتی مانند `30002621` در UX/پشتیبانی)
- **Retention:** سیاست نگهداری لاگ/ترافیک و Audit Trail باید تعریف و enforce شود (حداقل 5 سال برای مصوبات/نیازهای ممیزی).
- **HITL/Explainability:** برای تصمیم‌های حساس باید امکان مسیر انسانی + ثبت دلیل وجود داشته باشد (صدور رد شده، خسارت بزرگ، تقلب با احتمال بالا، هر تصمیم منجر به شکایت).

---

## 4) فازبندی اجرایی (Phases)

### فاز 0: Foundation / استانداردسازی (باقی‌مانده‌ها)
- سیاست یکپارچه envها و اجرای migration در CI/CD برای همه سرویس‌ها
- اطمینان از خاموش بودن schema sync در production
- استاندارد Event Envelope در shared + contract tests (Done)
- استاندارد audit fields (correlationId/tenantId/actorUserId/action/resourceId/status)
- یکپارچه‌سازی کامل Gateway routes و حذف هر instance اضافی/متناقض
- تکمیل امنیت (JWT + permissions) برای همه endpointهای حساس در همه سرویس‌ها

خروجی‌های الزامی فاز 0 (Done Definition):
- هر سرویس:
  - `migrate:build` قابل اجرا در CI/CD
  - `synchronize: false` در production
  - audit log ساخت‌یافته برای عملیات حساس
- Gateway:
  - یکپارچه‌سازی envها با نام‌های ثابت
  - پاس‌دادن headerهای `x-correlation-id`, `x-tenant-id`, `x-user-id`
- امنیت/نگهداری:
  - تعریف policy نگهداری لاگ/ترافیک + اجرای TTL/Archive در DB یا log store
  - Runbook رخدادها (Critical/High/Medium/Low + SLA پاسخ)

### فاز 1: Enterprise Core بدون AI (منطبق با فرایندهای ایران)
هدف: مسیر End-to-End عملیاتی بدون وابستگی به AI.

1) Party/KYC (MVP)
- CRUD Party + KYC review + Audit + Migrations + Gateway route
- تکمیل موارد: policies نگهداری رضایت‌ها (Consent) برای AML (در صورت نیاز توسعه)

2) Product Service (باقی‌مانده)
- تعریف محصول/پوشش/فرانشیز/قواعد نرخ‌دهی
- پایه لازم برای Quote و Underwriting

- وضعیت پیاده‌سازی (Product Service):
  - CRUD محصول/پوشش/فرانشیز/قواعد نرخ‌دهی + migrations + JWT/RBAC (Done)
  - هم‌راستاسازی UI/Backend در PricingRule (default rule نسخه‌دار هنگام create) (Done)
  - Quote API پایه برای Underwriting: `POST /product/quote` با RBAC (permission: `product:quote`) و خروجی breakdown (Done)

3) Policy Service (صدور/تمدید/الحاقیه/ابطال) — Iran-aligned
- نگاشت مستقیم به 5 مرحله صدور
- مدل کردن `uniqueCode` و Quality Gate سنهاب
- Endorsement/Correction برای اصلاح مفاد (الحاقیه)

- وضعیت پیاده‌سازی (Enterprise contract / Traceability):
  - API Contract ثابت `success/data/error/correlationId` در تمام endpointها + guardها (JWT/Permissions) (Done)
  - Timeline ترکیبی بیمه‌نامه: ادغام `PolicyChange` + `PolicyInquiry` با paging و RBAC OR-logic (Done)
  - State Machine سخت‌گیرانه برای transitionهای کلیدی (Stage2→Stage3→Issue→UniqueCode + مدیریت پورتفولیو: endorse/renew به‌صورت change-event، cancel به‌صورت terminal + جلوگیری از عملیات روی cancelled) (Done)

الزامات تکمیلی سنهاب/کد یکتا (عملیاتی):
- APIهای استعلام/اعتبارسنجی باید مسیرهای زیر را به‌صورت workflow پشتیبانی کنند:
  - استعلام با `nationalId + uniqueCode`
  - استعلام با `policyNumber`
  - استعلام با `vin`
- سناریوهای خطا باید به Work Item تبدیل شوند:
  - کد یکتا/شماره بیمه‌نامه یافت نشد
  - عدم تطابق اطلاعات نمایش داده‌شده با بیمه‌گذار
  - تاخیر در قابل‌استعلام شدن (SLA/پیگیری عامل صدور)
- خروجی قابل ممیزی: ثبت نتیجه استعلام + علت‌کد + اقدام پیشنهادی

- وضعیت پیاده‌سازی (سنهاب/Work Items):
  - ثبت PolicyInquiry برای همه نتیجه‌ها (موفق/ناموفق) + ایجاد/لینک WorkItem برای نتیجه‌های غیر OK یا خطاهای upstream (Done)

4) Underwriting Service (ایجاد سرویس - Phase 1 / بدون AI)
- ایجاد `underwriting-service` (NestJS + TypeORM migrations + JWT/RBAC + audit + API contract ثابت)
- Work item برای مرحله ارزیابی ریسک/تصمیم پذیرش (صف کارشناسی)
- approve/reject + SLA + audit (ثبت دلیل تصمیم)
- اتصال به Orchestrator work-items: `underwriting_review`

- وضعیت پیاده‌سازی (Underwriting / No-AI):
  - Orchestrator: پشتیبانی `underwriting_review` (permission + endpoint ایجاد WorkItem) (Done)
  - Gateway: route `/underwriting/*` به `UNDERWRITING_URL` (Done)
  - Underwriting Service: اسکلت + migration + endpointهای create/list/get/decide (Done)
  - Policy Service: مرحله 3 `risk-assess` -> `uw_pending` + ساخت UnderwritingRequest + ثبت PolicyChange (Done)
  - Policy Service: endpoint تصمیم کارشناسی `/policies/:policyId/underwriting/decision` + RBAC (Done)
  - Web UI: نمایش وضعیت `uw_pending/uw_rejected` + امکان ثبت تصمیم کارشناسی با RBAC + قفل صدور تا `risk_assessed` (Done)

5) Payments Service (باقی‌مانده) — مطابق مرحله 5 خسارت
- آماده‌سازی پرداخت/تأیید مالی/واریز/ابلاغ
- Outbox events برای پرداخت‌های موفق/ناموفق
- Idempotency برای پرداخت

- وضعیت پیاده‌سازی (Payments / Stage 5 claim payment):
  - Payments Service: state machine سخت‌گیرانه برای `PaymentIntent` (prepared→finance_approved→executed→notified) + idempotency برای approve/execute/notify (Done)
  - Payments Controller: هندل یکپارچه خطاها (INVALID_STATE/INTERNAL_ERROR/NOT_FOUND) مطابق contract ثابت `success/data/error/correlationId` (Done)
  - Payments Service: رویداد Outbox برای شکست پرداخت `insurance.payment.failed` + endpoint `POST /payments/:paymentIntentId/fail` با RBAC (permission: `payments:fail`) (Done)
  - Payments Service: migrations برای جدول‌های shared events (`outbox_events`, `consumed_events`, `dead_letter_queue`) جهت جلوگیری از drift (Done)

6) Collections/Installments (باقی‌مانده)
- اقساط/وصول/مطالبات (در سند داده‌های کلیدی بیمه‌نامه به اقساط اشاره شده)

- وضعیت پیاده‌سازی (Collections/Installments):
  - ایجاد `collections-service` (NestJS + TypeORM migrations + JWT/RBAC + audit + API contract ثابت) (Done)
  - دیتامدل حداقلی: `InstallmentPlan` و `Installment` با وضعیت‌ها + ثبت وصول با `providerRef` (Done)
  - Outbox events: `insurance.collections.plan.created` و `insurance.collections.installment.paid` (Done)
  - Gateway: route `/collections/*` به `COLLECTIONS_URL` (Done)
  - Web UI: صفحه کامل و مدرن/ریسپانسیو برای طرح‌های قسطی و ثبت وصول اقساط (header حرفه‌ای + modal create + badge status + فرمت مبلغ/تاریخ) + RBAC و navigation integration (Done)
  - RBAC: permissions در web-ui و backend هماهنگ (collections:plan_create/view/list, installment_pay/view/list) (Done)

7) Claims تکمیل‌تر (Iran claims flow)
- پوشش 5 مرحله خسارت در APIها و وضعیت‌ها
- اتصال به Documents/Payments/Orchestrator

- وضعیت پیاده‌سازی (Claims / Iran-aligned):
  - Claims Service: state machine سخت‌گیرانه + idempotency برای transitionهای اصلی (registered→assessed→approved→paid→closed + reject) با خطای `INVALID_STATE` (Done)
  - Claims→Orchestrator: شروع `ClaimPayment` saga بعد از `approve` (مرحله ۴→۵) برای ایجاد work-itemهای پرداخت (prepare/finance_approval/execute/notify) (Done)
  - Orchestrator: idempotency برای `startClaimPaymentSaga` بر اساس `claimId` (Done)
  - Claims Controller: هندل یکپارچه خطاها (INVALID_STATE/INTERNAL_ERROR/NOT_FOUND) مطابق contract ثابت `success/data/error/correlationId` (Done)

8) Orchestrator (باقی‌مانده)
- sagaهای صدور/خسارت/پرداخت
- WorkItems برای صف‌های عملیاتی (رفع مغایرت سنهاب/پیگیری کد یکتا/…)
- idempotent consumers

- وضعیت پیاده‌سازی (Orchestrator / Resilience):
  - Idempotent consumer table: `consumed_events` + استفاده از `consumeOnce` برای eventهای پرداخت (Done)
  - DLQ table: `dead_letter_queue` (migration) + wiring در `orchestrator-service` برای ذخیره پیام‌های شکست‌خورده و retry processor (Done)
  - همسان‌سازی `data-source.ts` (migrate) با runtime entities/schema برای جلوگیری از drift (Done)
  - DLQ Admin APIs: `GET /dlq` + `GET /dlq/stats` + `POST /dlq/:dlqId/resolve` با JWT/RBAC و contract ثابت (Done)

HITL/Explainability (حداقل لازم در فاز 1):
- Work Item برای تصمیم‌های حساس:
  - رد صدور
  - خسارت بالای آستانه
  - توقف/هولد به‌علت تقلب/AML (حتی اگر scoring هنوز rule-based باشد)
- ثبت دلیل/Notes اجباری برای تصمیم‌های Reject/Escalate
- امکان override تصمیم سیستم توسط کارشناس + audit trail

- وضعیت پیاده‌سازی (HITL/Explainability):
  - Notes اجباری برای تصمیم‌های `rejected/escalated` در `work_items/:id/complete` (validation در controller + service) (Done)
  - Override mechanism: ایجاد WorkItem نوع `override_review` با endpoint `POST /work-items/override-review` + SagaInstance + event `insurance.saga.override_review.required` (Done)

### فاز 2: Compliance و Case Management (مطابق سند)
- Complaints Service (Ticket + SLA + داشبورد + اتصال به policy/claim)
- AML Service (rules + suspicious activity + reports + audit trail)
- Reinsurance Service (Enterprise domain مطابق بخش اتکایی سند: cession/bordereau/statement/reconciliation/tickets)
- Reporting Service (KPIهای سند: سرعت صدور/زمان پرداخت/رضایت/تقلب/توانگری/…)

جزئیات اجرایی الزامی فاز 2 (مطابق سند 1404):

1) Complaints Service (داخل شرکت + آماده‌سازی مسیر بیمه مرکزی)
- داده‌های لازم برای مسیر بیمه مرکزی:
  - نوع شکایت: صدور / خسارت (با پرونده/بدون پرونده) / نماینده / کارگزار / ارزیاب / دفتر غیرمجاز / صندوق
  - مشخصات بیمه‌نامه: نام شرکت بیمه، شماره بیمه‌نامه، عنوان بیمه‌نامه
  - اطلاعات شاکی: کد ملی، تاریخ تولد، موبایل (OTP/تایید)، آدرس، وضعیت اصالت/وکالت
  - شرح شکایت + مستندات (Document linkage)
- SLA:
  - زمان پاسخ اولیه
  - زمان حل
  - Escalation به حقوقی/مدیریت
- داشبورد:
  - حجم شکایات، علت‌های پرتکرار، زمان حل، توزیع کانال‌ها

- وضعیت پیاده‌سازی (Complaints Service / Phase 2):
  - دیتامدل شکایت: نوع شکایت + اتصال policy/claim + اطلاعات شاکی + پیوست مستندات (Done)
  - SLA: نگهداری due dateها + محاسبه پیش‌فرض (env) برای `slaFirstResponseDueAt/slaResolutionDueAt` در create (Done)
  - Dashboard API: `GET /complaints/dashboard` شامل آمار وضعیت/نوع + شاخص‌های overdue برای SLA (Done)
  - OTP/تایید موبایل (dependency): فعلاً فقط ذخیره وضعیت `complainantMobileVerified/complainantMobileVerifiedAt` برای اتصال به سرویس OTP در فاز بعد (Done)
  - Escalation workflow: `POST /complaints/:complaintId/escalate` با reason + escalatedBy + assignedTo اختیاری + timestamp (Done)
  - Central insurance export validation: بررسی فیلدهای الزامی و بازگشت `VALIDATION_ERROR` همراه `missingFields` در `GET /complaints/:complaintId/export/central-insurance` (Done)
  - Audit trail (DB-backed): جدول `complaint_audit` برای ثبت created/status_changed/escalated/attachment_added همراه correlationId/tenantId/actorUserId (Done)

2) AML Service (حداقل)
- KYC + ثبت رضایت‌ها (Consent)
- Ruleهای معامله مشکوک (قابل پیکربندی)
- گزارش داخلی برای واحد AML
- Audit Trail تصمیمات AML (چه ruleی/چه داده‌ای باعث هشدار شد)

- وضعیت پیاده‌سازی (AML Service / Phase 2):
  - KYC/Consent APIs: ایجاد/لیست/مشاهده/ابطال رضایت (Done)
  - Rule management: ایجاد/لیست/مشاهده/ویرایش قوانین AML (Done)
  - Alerts: ایجاد/لیست/مشاهده/assign/update_status (Done)
  - Audit Trail: ثبت decision history در `aml_alert_decisions` هنگام تغییر status (Done)
  - Internal reporting: `GET /aml/dashboard` (counts by status/severity + open-unassigned) (Done)
  - Web UI: صفحه `/aml` (enterprise console) با nav gating + RBAC mapping + داشبورد (open-unassigned + totalsByStatus) و لیست هشدارها (alerts list) (Done)
  - Web UI: عملیات هشدارها (assign/update_status) + بخش‌های Rules/Consents و Export snapshot در کنسول AML + build verification (Done)

3) Fraud/Operational Risk (rule-based تا قبل از ML)
- خروجی‌های اجرایی الزامی:
  - صف «پرونده‌های مشکوک» (work queue)
  - چرخه ارجاع به کارشناس/حقوقی
  - ثبت دلایل (Explainability) حتی اگر rule-based باشد

- وضعیت پیاده‌سازی (Fraud/Operational Risk):
  - Work queue: ایجاد WorkItem نوع `suspicious_case` از طریق `POST /work-items/suspicious-case` (Done)
  - Explainability: ذخیره `reasonCodes/fraudScore/explainability` در context work item/saga (Done)
  - Referral cycle: assign/complete/escalate از طریق APIهای موجود WorkItems + notes اجباری برای escalated/rejected (Done)

4) Reinsurance Service (Enterprise)
- objects/فرایندهای حداقلی مطابق سند:
  - cession در صدور/الحاقیه/ابطال
  - bordereau/Reporting batch
  - premium statement
  - claim recoveries
  - reconciliation case + ticketing مکاتبات

- وضعیت پیاده‌سازی (Reinsurance Service):
  - Treaties/Cessions/Statements/Reconciliations APIs (Done)
  - Claim Recoveries: `POST/GET/PATCH /re/recoveries*` (Done)
  - Reconciliation Ticketing/CaseManagement: `POST/GET/PATCH /re/tickets*` + messages/attachments با `documentId` و SLA پاسخ (env: `RE_TICKETS_SLA_RESPONSE_HOURS`) (Done)

5) Reporting Service (KPIهای سند)
- KPIهای کلیدی (طبق سند 1404):
  - سرعت صدور بیمه‌نامه
  - زمان پرداخت خسارت
  - نرخ رضایت مشتریان
  - توانگری مالی
  - سهم بازار
  - نرخ تقلب‌های شناسایی شده

- وضعیت پیاده‌سازی (Reporting Service / Phase 2):
  - Data contracts / Events برای KPIها:
    - زمان پرداخت خسارت: رویدادهای Claims (`insurance.claim.*`) + Payments (`insurance.payment.*`) موجود است (Ready)
    - نرخ تقلب‌های شناسایی شده: رویدادهای Fraud (`insurance.fraud.*`) موجود است (Ready)
    - سرعت صدور بیمه‌نامه: رویدادهای Policy lifecycle (`insurance.policy.*`) برای Quote/Docs/Risk/Issue/UniqueCode منتشر می‌شود (Ready)
    - نرخ رضایت مشتریان: منبع داده در سیستم فعلی موجود نیست؛ مسیر جایگزین enterprise برای ingestion snapshot (Audited + Idempotent) در Reporting تعریف شد (Done)
    - توانگری مالی: منبع داده در سیستم فعلی موجود نیست؛ مسیر جایگزین enterprise برای ingestion snapshot (Audited + Idempotent) در Reporting تعریف شد (Done)
    - سهم بازار: منبع داده در سیستم فعلی موجود نیست؛ مسیر جایگزین enterprise برای ingestion snapshot (Audited + Idempotent) در Reporting تعریف شد (Done)
  - KPI Read Model/Projection: ایجاد `reporting-service` با schema `reporting` + جدول‌های projection (`rm_policy_lifecycle`, `rm_claim_payment`, `rm_fraud_signal`) + consumer Kafka با idempotency (Done)
  - KPI API (Ready KPIs): `GET /reporting/kpis/ready` با JWT/RBAC (permission: `reporting:view`) و contract ثابت (Done)
  - Gateway route: مسیر `/reporting/*` به `REPORTING_URL` (Done)
  - KPI Gap Coverage (Snapshot ingestion): `POST /reporting/kpis/snapshots` با JWT/RBAC (permission: `reporting:ingest`) + header `Idempotency-Key` + audit trail در `kpi_ingestion_audit` و ذخیره snapshot در `kpi_snapshots` (Done)
  - Reporting stakeholders (1404-aligned): گسترش ذینفعان `reporting:view` مطابق «داشبورد مدیریتی» سند ۱۴۰۴ برای نقش‌های عملیاتی/پشتیبان موجود (`underwriter/claims_handler/loss_adjuster/fraud_analyst/compliance_aml/legal_ops/complaints_handler` به‌علاوه `finance_ops/head_office_ops/risk_manager/auditor/insurer_admin`) و محدودسازی `reporting:ingest` و `reporting:projections:admin` به `insurer_admin` (Done)
  - اقدام بعدی (Governance قبل از سخت‌گیرانه‌کردن Contract): سند ۱۴۰۴ نیاز به داشبورد/گزارش‌دهی را مشخص می‌کند اما دوره‌بندی KPIها را به‌صورت اجرایی و صریح (روزانه/ماهانه/فصلی) برای هر KPI استاندارد نکرده است؛ بنابراین باید در سطح enterprise governance برای هر KPI:
    - دوره استاندارد (day/week/month/quarter/year)
    - منبع داده رسمی (BI/مالی/CRM/نظرسنجی/…)
    - مالک داده (Data Owner) و فرآیند تامین/تایید
    تعریف و تصویب شود، سپس اتصال سیستم‌های مالی/BI/نظرسنجی به endpoint ingestion و enforce شدن validationهای دوره/منبع انجام گردد.
    - وضعیت enforcement (Implementation):
      - DB-backed governance policy: جدول `kpi_governance_policies` به‌عنوان منبع حقیقت برای allowed period granularities + allowed source systems + expected unit + value range (Done)
      - Admin APIs (RBAC: `reporting:projections:admin`): `GET /reporting/kpis/governance`, `GET /reporting/kpis/governance/:kpiKey`, `PUT /reporting/kpis/governance/:kpiKey` (Done)
      - Ingestion enforcement: برای KPIهای gap governed، اگر policy تعریف نشده باشد ingestion مسدود می‌شود؛ و در حالت `enforced=true` اعتبارسنجی allowed lists/unit/range + مرزبندی زمانی UTC برای day/week/month/quarter/year اعمال می‌شود (Done)
    - وضعیت UI:
      - فرم ingestion صفحه `/reporting` به‌صورت dynamic از governance policyها fetch می‌کند و allowed values را (kpiKey/periodGranularity/source systems/unit/range) نمایش می‌دهد، auto-fill انجام می‌دهد، و خطاها را همراه correlationId به‌صورت enterprise نمایش می‌دهد (Done)
      - UI-side boundary validation (UTC) برای `day/week/month/quarter/year` در حالت `enforced=true` هم‌راستا با backend (Done)

### فاز 3: AI Optional (Toggleable)
- Document-AI pipeline واقعی + fallback
- Fraud/Risk scoring (در صدور و خسارت)
- Copilot با guardrails + audit trail + policy enforcement
- UX: توضیح‌پذیری (Explainability) و مسیر ارجاع انسانی

- وضعیت پیاده‌سازی (Phase 3 / Document-AI):
  - Confidence threshold: env `DOCUMENT_AI_CONFIDENCE_THRESHOLD` و تصمیم `extracted vs needs_review` (Done)
  - Audit trail: جدول `document_ai_audit` برای input/output/decision/error (Done)
  - Fallback انسانی: انتشار event `insurance.document.extraction.needs_review` و تبدیل به WorkItem نوع `document_review` در Orchestrator + event `insurance.saga.document_review.required` (Done)

- وضعیت پیاده‌سازی (Phase 3 / Fraud Scoring):
  - Rule-based deterministic scoring + threshold env `FRAUD_HOLD_THRESHOLD` (Done)
  - Auditability: جدول `fraud_score_audit` برای ذخیره ورودی/امتیاز/سیگنال‌ها/آستانه (Done)
  - Human-in-the-loop routing: مصرف event `insurance.fraud.score_computed` در Orchestrator و ایجاد خودکار WorkItem نوع `suspicious_case` در صورت `holdClaim=true` (Done)

- وضعیت پیاده‌سازی (Phase 3 / Copilot):
  - JWT + RBAC: اعمال `JwtAuthGuard` و `PermissionsGuard` روی endpointها (Done)
  - Policy enforcement: تصمیم نهایی بر مبنای header `x-ai-enabled` + Feature Flags (`ai.enabled` و `copilot.enabled`) (Done)
  - Audit trail: جدول `copilot_audit` برای ثبت actor/tenant/correlation/decision/blockedReason/outputPreview/outputRedacted (Done)
  - Output redaction: mask/redact الگوهای حساس (PII) قبل از بازگشت پاسخ و ثبت `outputRedacted` (Done)

کنترل‌های حاکمیتی AI (خلاصه اجرایی از سند 1404):
- Model lifecycle: تعریف → آموزش → اعتبارسنجی مستقل → استقرار → پایش
- Incident management:
  - گزارش رخدادهای critical
  - SLA پاسخ/رفع
  - ثبت ورودی/خروجی مدل بدون exfiltration داده محرمانه

---

## 5) Feature Flags / AI Toggle (Design)
- Source of truth:
  - per-tenant در Feature Flags service
  - per-user override در UI یا IAM policy
- Runtime:
  - UI ارسال header مثل `x-ai-enabled: true|false`
  - Gateway پاس‌دادن header
  - سرویس‌ها تصمیم نهایی = tenant policy + user override + قابلیت سرویس

---

## 6) UI (Enterprise Console)
- ماژول‌های لازم (Iran-aligned):
  - Party/KYC
  - Policy Issuance (5-stage)
  - Claims Workbench (5-stage)
  - Payments/Finance approvals
  - Complaints (Ticketing + SLA)
  - AML dashboard (alerts/reports)
  - Settings (Tenancy, AI toggle, roles/permissions)
- UX اجباری:
  - مدیریت 401/403 (redirect/login/forbidden)

- وضعیت پیاده‌سازی (UI / RBAC):
  - Policy Console: اکشن‌ها/پنل‌ها permission-aware (disable/gate) برای جلوگیری از 403 و انطباق با RBAC (Done)
  - Reporting Console: صفحه `/reporting` برای داشبورد KPI (Ready KPIs + Snapshot KPIs) با RBAC کامل (role-aware nav و gateهای `reporting:view`/`reporting:ingest` برای ذینفعان شامل `insurer_admin/head_office_ops/risk_manager/auditor/finance_ops/underwriter/claims_handler/loss_adjuster/fraud_analyst/compliance_aml/legal_ops/complaints_handler`) و محدودسازی `reporting:ingest` و `reporting:projections:admin` به `insurer_admin` (Done)
  - Reinsurance Console: nav role-aware با نقش‌های استاندارد سند/permissions (`reinsurance_ops` به‌جای `re_ops` + همسویی با `finance_ops` برای reconciliation) (Done)
  - RBAC governance alignment (1404): یکپارچه‌سازی محاسبه permissionها در UI (centralized RBAC utilities برای Reporting/Policies)، role-aware navigation برای ماژول‌های حساس (Users/OrgUnits/Settings) و همگام‌سازی `PERMISSIONS_MATRIX.md` با permissionهای واقعی Policy Console + هم‌راستاسازی mapping مجوزها در `auth-service` (Done)
  - UI RBAC (Modules): nav gating و page/action gating مبتنی بر permission برای ماژول‌های `claims/payments/fraud/complaints/documents/work-items/party` با redirect به `/forbidden` و disable/hide اکشن‌ها براساس permissionهای واقعی سرویس‌ها + build verification (`web-ui: bun run build`) (Done)

---

## 7) معیار Done (Enterprise Increment)
- مسیرهای E2E بدون AI:
  - Issue policy (با `uniqueCode` و Quality Gate سنهاب)
  - Register claim → assess → approve → pay (با تأیید مالی/ابلاغ)
  - Attach documents و trace کامل
- Audit trail قابل ممیزی برای عملیات حساس
- migrations-first و CI/CD با migration step
- Dashboardهای حداقلی KPI مطابق سند (سرعت صدور/زمان پرداخت/تقلب/رضایت)

### فاز 0: Event Envelope / Governance (Foundation)
- استاندارد Event Envelope به‌عنوان contract بین سرویس‌ها: استفاده از `createEventEnvelope` در shared + تست قراردادی `event-envelope.contract.test.ts` (Done)
- یکسان‌سازی انتشار eventهای Kafka در سرویس‌ها: اصلاح `orchestrator-service` برای publish eventهای saga/work-item به‌صورت `EventEnvelope` و تنظیم headerهای `x-correlation-id/x-event-type/x-event-version` (به‌علاوه `x-tenant-id` و `traceparent` در صورت وجود) (Done)
- استانداردسازی audit fields (Phase 0): اضافه‌کردن ستون‌های `tenantId/actorUserId/action/status` به audit tableهای کلیدی با migration (نمونه: `fraud_score_audit`, `document_ai_audit`) + عبور دادن مقادیر از HTTP headers یا EventEnvelope + build/migrate verification برای سرویس‌های نمونه (Done)
- یکپارچه‌سازی Gateway header propagation (Phase 0): پاس‌دادن `x-correlation-id/x-tenant-id/x-user-id/x-ai-enabled` به‌صورت canonical و tenant-aware + propagation `traceparent` + هم‌راستاسازی default upstream URLها با docker-compose و غیرفعال‌کردن routeهای optional در نبود upstream (build verified) (Done)

### چک‌لیست Done (قابل تست)
- هر endpoint حساس:
  - JWT + permission guard
  - ثبت audit log شامل `correlationId/tenantId/actor/action/resourceId/outcome`
- سنهاب/کد یکتا:
  - حداقل یک مسیر multi-channel inquiry در سیستم (mock یا adapter)
  - Work item برای مغایرت/تاخیر/عدم تطابق
- Complaints:
  - ایجاد ticket + attach document + SLA state
- Retention:
  - policy نگهداری لاگ/ترافیک تعریف شده و enforce شده

---

## 8) Runbook / Operations (Executable)

### 8.1 اجرای مهاجرت‌ها (Migrations)

- اجرای فقط migrationها (init pattern):
  - `docker compose --profile migrate up --build`
- اجرای سرویس‌ها پس از migration:
  - `docker compose up -d --build`

قانون: در production باید `synchronize` خاموش باشد و مسیر ارتقاء schema فقط از migration انجام شود.

### 8.2 قرارداد هدرها در Gateway
- Gateway باید این headerها را پاس دهد:
  - `x-correlation-id`
  - `x-tenant-id`
  - `x-user-id`
  - `x-ai-enabled`

### 8.3 Incident Runbook (مطابق سند 1404)
- طبقه‌بندی رخداد:
  - Critical / High / Medium / Low
- حداقل فیلدهای گزارش رخداد:
  - زمان رخداد، سیستم‌های متاثر، correlationId نمونه، علت ریشه‌ای، اقدام اصلاحی، درس‌آموخته
- SLA پاسخ و رفع باید تعریف شود (در حد MVP: targetهای داخلی).

### 8.4 Retention / Backup / DR
- Retention policy:
  - نگهداری audit trail و لاگ‌های کلیدی حداقل 5 سال (مطابق سند 1404)
  - مشخص‌کردن داده‌های قابل mask/redact (PII)
- Backup:
  - backup زمان‌بندی‌شده Postgres + تست restore
- DR:
  - تعریف RPO/RTO هدف و سناریوی بازیابی

- وضعیت پیاده‌سازی:
  - Runbook اجرایی: تکمیل `doc/DEPLOY_RUNBOOK.md` با Retention policy (حداقل 5 سال) + Backup schedule + Restore test + DR template (RPO/RTO) (Done)
  - ابزار اجرایی DB: اضافه‌شدن اسکریپت‌های `scripts/pg-backup.sh`, `scripts/pg-restore.sh`, `scripts/pg-restore-verify.sh` برای backup/restore و smoke verification (Done)