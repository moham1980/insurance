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

یافته‌های قطعی از ریپو (Source of Truth = کد و docker-compose):
- سرویس‌های موجود در `services/`:
  - Gateway/IAM/Flags:
    - `api-gateway`, `auth-service`, `feature-flags-service`
  - Core Domain:
    - `party-kyc-service`, `policy-service`, `product-service`, `underwriting-service`
    - `claims-service`, `payments-service`, `collections-service`
    - `complaints-service`, `aml-service`, `reinsurance-service`, `reporting-service`
  - AI/Docs/Fraud/Orchestration/Obs:
    - `document-service`, `document-ai-service`, `fraud-service`, `copilot-service`
    - `orchestrator-service`, `outbox-relay`, `monitoring-service`, `regulatory-gateway-service`
  - UI:
    - `web-ui`
- `docker-compose.yml`:
  - Infra شامل Kafka/Redis/Jaeger/Postgres.
  - Migration jobs به‌صورت profile `migrate` برای چند سرویس تعریف شده است (init containers pattern).
- API Gateway (`services/api-gateway/src/main.ts`):
  - proxy routeها برای `/auth`, `/claims`, `/rm`, `/fraud`, `/documents`, `/copilot`, `/orchestrations`, `/work-items`, `/reg`, `/flags`, `/party`, `/complaints`, `/policies`, `/payments`, `/collections`, `/aml`, `/re`, `/product`, `/underwriting`, `/reporting` تعریف شده است.
  - header propagation:
    - `x-correlation-id`: تولید/forward انجام می‌شود.
    - `x-tenant-id`: مقدار inbound یا `DEFAULT_TENANT_ID` و forward انجام می‌شود.
    - `x-user-id`: ترجیح inbound، در غیر این صورت استخراج از JWT و forward انجام می‌شود.
    - `x-ai-enabled`: در صورت وجود inbound، forward انجام می‌شود.

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

یادداشت تکمیلی (Production hygiene / migrations-only):
- سرویس `outbox-relay` از `synchronize` استفاده نمی‌کند و فقط با مدل migrations-only هم‌راستا است (Implemented).
- سرویس‌های اصلی دامنه و پلتفرم (Policy/Payments/Claims/Orchestrator/Reporting) در production اجازه فعال‌سازی `synchronize` ندارند و `DB_SYNC=true` فقط در محیط غیر production قابل استفاده است (Implemented).

افزوده‌های الزام‌آور از سند 1404:
- **Multi-channel inquiry (سنهاب/کد یکتا):** پشتیبانی از استعلام با:
  - کد ملی + کد یکتا
  - شماره بیمه‌نامه
  - VIN
  - پیامک (الگوهای عملیاتی مانند `30002621` در UX/پشتیبانی)
- **Retention:** سیاست نگهداری لاگ/ترافیک و Audit Trail باید تعریف و enforce شود (حداقل 5 سال برای مصوبات/نیازهای ممیزی).
- **HITL/Explainability:** برای تصمیم‌های حساس باید امکان مسیر انسانی + ثبت دلیل وجود داشته باشد (صدور رد شده، خسارت بزرگ، تقلب با احتمال بالا، هر تصمیم منجر به شکایت).

---

## 3.1) Document Alignment Matrix (Research 1404 ↔ Enterprise Blueprint ↔ Implementation)

این بخش «منبع حقیقت» برای همسان‌سازی سه سند زیر با هم و با کدبیس است:
- تحقیقات: `تحقیقات_فرایندهای_بیمه_ایران_1404.md`
- طراحی: `طراحی_سامانه_هوش_مصنوعی_بیمه_Enterprise.md`
- اجرا: همین سند + کد + docker-compose

تعاریف وضعیت:
- **Aligned:** همسان است.
- **Mismatch:** وجود دارد ولی نام/مسیر/قرارداد با سند دیگر متفاوت است.
- **Missing:** در اجرا وجود ندارد یا ناقص است و باید پیاده‌سازی شود.
- **Decision needed:** نیاز به تصمیم معماری (مهاجرت/compat layer/rename) دارد.

### 3.1.1 ناهمگونی‌ها و گپ‌های کلیدی (Actionable)

1) Orchestrator API vs Workflow Blueprint
- وضعیت: **Mismatch / Decision needed**
- مسئله: Blueprint طراحی برای Orchestrator از APIهای `workflows/processes/*` و commandهای عمومی صحبت می‌کند؛ پیاده‌سازی فعلی حول `/orchestrations/*` و `/work-items/*` است.
- اقدام بعدی:
  - تعریف یک mapping رسمی در رودمپ (Design API ↔ Implementation API)
  - در صورت نیاز، افزودن alias endpoints (compat) در Orchestrator بدون شکستن UI

2) Saga Catalog (Issuance/Claim Payment/Complaints/Reinsurance) vs Implementation
- وضعیت: **Mismatch**
- مسئله: در Blueprint، step-level sagaها و eventهای میانی مثل `ClaimPaymentRequested`/`ComplaintRouted` پیشنهاد شده‌اند.
- اقدام بعدی:
  - ایجاد جدول «Designed events vs Implemented events»
  - تصمیم: اضافه‌کردن eventهای میانی یا تعریف mapping رسمی بین eventهای موجود

3) Sales Network / Agent/Broker Operations
- وضعیت: **Missing**
- مسئله: تحقیقات 1404 و Blueprint دامنه «نماینده/کارگزار/بازاریاب» را جزء هسته عملیاتی می‌دانند؛ رودمپ فعلی milestone اجرایی مستقل برای این دامنه ندارد.
- اقدام بعدی:
  - افزودن فاز/اپیک «Sales Network & Distribution» شامل lifecycle نماینده/کارگزار، کارمزد/کمیسیون، KPI شبکه فروش، پرتال نمایندگی

4) BFF / Read Models برای UIهای حیاتی
- وضعیت: **Mismatch / Partial**
- مسئله: Blueprint توصیه می‌کند UI به fan-out call چند سرویس وابسته نباشد و BFF/ReadModel ارائه شود.
- اقدام بعدی:
  - تعیین مالکیت: `reporting-service` به‌عنوان BFF توسعه‌یافته یا ایجاد سرویس `bff-service`
  - تعریف projectionهای حیاتی (claims ops, fraud, complaints) و query APIهای اختصاصی UI

5) Regulatory Gateway و Quality Gates (سنهاب/کد یکتا)
- وضعیت: **Aligned / Needs hardening**
- مسئله: جریان multi-channel inquiry و quality gate در رودمپ آمده، اما نیاز به سخت‌گیری بر اساس integration governance (timeout/retry/circuit breaker/runbook) دارد.
- اقدام بعدی:
  - افزودن policyهای timeout/retry و ثبت خطای استاندارد + work item/ticket در سناریوهای قطعی سرویس

6) Document-AI و Productionization
- وضعیت: **Mismatch / Partial**
- مسئله: در برخی نقاط عبارت‌های MVP/mock یا اسکریپت‌های تست دیده می‌شود؛ هدف enterprise نیاز به pipeline واقعی با queue/backpressure دارد.
- اقدام بعدی:
  - تعریف backlog برای OCR واقعی، job queue، retry/backoff، cost guardrails، eval suite

7) AI Governance & Model Risk
- وضعیت: **Partial**
- مسئله: Blueprint شامل Model Card/Validation/Inventory/Incident را الزام می‌کند.
- اقدام بعدی:
  - افزودن ماژول/جدول inventory برای مدل‌ها/پرامپت‌ها + policy enforcement + گزارش incident

8) NFR/SLO/SLI و عملیات (SRE)
- وضعیت: **Missing / Deferred**
- مسئله: Blueprint NFRهای عددی و SLO dashboard و alerting می‌خواهد.
- اقدام بعدی:
  - افزودن اپیک «SRE/Observability hardening» با خروجی‌های measurable

9) Service-to-Service Security (mTLS/PDP)
- وضعیت: **Missing / Deferred**
- مسئله: Blueprint mTLS و PDP (مثل OPA) را پیشنهاد می‌کند.
- اقدام بعدی:
  - تعریف مسیر مرحله‌ای (start: scoped JWT + deny-by-default در سرویس‌های حساس → سپس mTLS)

10) Complaints: OTP verification
- وضعیت: **Aligned (dependency)**
- مسئله: تحقیقات، احراز شماره همراه را در فرایند شکایت لازم می‌داند؛ در پیاده‌سازی فعلاً فقط فیلدهای verified ذخیره شده است.
- اقدام بعدی:
  - افزودن سرویس/adapter OTP و enforce شدن verified در مسیرهای حساس export/regulatory

وضعیت پیاده‌سازی (Complaints OTP verification):
- `complaints-service`: جدول `complaint_mobile_otp_challenges` + APIهای `POST /complaints/:complaintId/mobile/otp/request` و `POST /complaints/:complaintId/mobile/otp/verify` با RBAC + audit (Implemented)
- `complaints-service`: enforce شدن `complainantMobileVerified=true` در `GET /complaints/:complaintId/export/central-insurance` (Implemented)
- `complaints-service`: انتشار eventهای `insurance.complaint.mobile_otp_requested` و `insurance.complaint.mobile_verified` برای همگام‌سازی read-model (Implemented)
- `claims-readmodel-service`: افزودن ستون‌های `complainantMobileVerified*` به `rm_complaints` + همگام‌سازی projection از رویدادهای complaints برای نمایش وضعیت در `/rm/complaints` (Implemented)
- `web-ui`: نمایش وضعیت verified در کنسول شکایات + flow درخواست/تایید OTP با RBAC (Implemented)
- وضعیت: **Implemented (Pending Verified build/runtime)**

### 3.1.2 As-Is Implementation Map (Source of Truth = Code)

این بخش برای هر محور کلیدی، وضعیت واقعی در کد را ثبت می‌کند تا تصمیم‌های فازبندی و backlog بر اساس واقعیت باشد.

1) Orchestrator (API/Work Items/Saga)
- وضعیت: **Exists / Partial (scope محدود)**
- سرویس/فایل‌ها:
  - `services/orchestrator-service/src/orchestrations.controller.ts`
  - `services/orchestrator-service/src/work-items.controller.ts`
  - `services/orchestrator-service/src/orchestrator.service.ts`
- APIهای موجود (نمونه‌های کلیدی):
  - `POST /orchestrations/sagas` (فعلاً فقط `ClaimPayment`)
  - `GET /orchestrations/sagas/:sagaId`
  - `GET /work-items` + فیلترهای `status/assignedTo/priority` + pagination
  - `GET /work-items/:workItemId`
  - `POST /work-items/:workItemId/assign`
  - `POST /work-items/:workItemId/complete`
- WorkItem typeهای قابل مشاهده در سرویس:
  - `payment_prepare`, `payment_finance_approval`, `payment_execute`, `payment_notify`
  - `document_review`
  - `suspicious_case`
  - `underwriting_review`
  - `override_review`
  - `sanhab_followup`
- گپ‌های مشخص:
  - عدم وجود contract سازگار با Blueprint طراحی برای `/workflows/*` (نیاز به compat layer یا migrate)
  - sagaهای دیگر (issuance/complaints/reinsurance) هنوز به‌صورت عمومی و استاندارد ارائه نشده‌اند

2) Reporting Service (KPI + Governance)
- وضعیت: **Exists (KPI-centric) / Partial (BFF ops dashboards incomplete)**
- سرویس/فایل‌ها:
  - `services/reporting-service/src/reporting.controller.ts`
  - `services/reporting-service/src/reporting.service.ts`
- APIهای موجود (نمونه‌های کلیدی):
  - `GET /reporting/kpis/ready`
  - `POST /reporting/kpis/snapshots` (با `Idempotency-Key` + governance enforcement)
  - `GET /reporting/kpis/snapshots`
  - `GET/PUT /reporting/kpis/governance*`
- گپ‌های مشخص:
  - projectionهای عملیات روزمره (claims ops / fraud queue / complaints ops) و query APIهای UI به سبک BFF هنوز به‌صورت کامل و یکپارچه تعریف نشده است

2.1) Claims Read Model Service (`/rm/*`)
- وضعیت: **Exists (Claims ops read model) / Partial (RBAC و دامنه محدود)**
- سرویس/فایل‌ها:
  - `services/claims-readmodel-service/src/readmodel.controller.ts`
  - `services/claims-readmodel-service/src/readmodel.service.ts`
  - `services/claims-readmodel-service/src/entities/RmClaimCase.ts`
- APIهای موجود:
  - `GET /rm/claims`
  - `GET /rm/claims/:claimId`
  - `GET /rm/claims/summary`
- یکپارچه‌سازی با Gateway:
  - مسیر `/rm/*` به upstream سرویس `claims-readmodel-service` route می‌شود.
- گپ‌های مشخص:
  - RBAC/permissions در read model controller صریح نیست (در قیاس با سایر سرویس‌ها)
  - read model فعلاً فقط claims را پوشش می‌دهد؛ read modelهای fraud/complaints به سبک `/rm/*` موجود نیستند

تصمیم (Option 1):
- مسیر `/rm/*` به‌عنوان الگوی رسمی Read Model در سیستم تثبیت می‌شود.
- مسیر `/bff/*` در فاز فعلی ایجاد/اجبار نمی‌شود؛ در صورت نیاز فقط به‌عنوان facade اختیاری برای UI اضافه خواهد شد.

3) Regulatory Gateway (SANHAB)
- وضعیت: **Exists / Partial (mock/adapter + hardening needed)**
- سرویس/فایل‌ها:
  - `services/regulatory-gateway-service/src/regulatory.controller.ts`
  - `services/regulatory-gateway-service/src/regulatory.service.ts`
- APIهای موجود (نمونه‌های کلیدی):
  - `POST /reg/sanhab/inquiry` (روش‌ها: `nationalId+uniqueCode` یا `policyNumber` یا `vin`)
  - `POST /reg/sanhab/webhook` (دریافت event خارجی + dedup)
  - `POST /reg/sanhab/simulate`
  - `GET /reg/sanhab/events`
- قابلیت موجود:
  - در نتایج failure-like (`MISMATCH/PENDING_SYNC/UPSTREAM_ERROR`) تلاش برای ایجاد work item پیگیری از Orchestrator: `POST /work-items/sanhab-followup`
- گپ‌های مشخص:
  - timeout/retry/circuit breaker و استاندارد error handling در call به Orchestrator و سرویس‌های بیرونی باید سخت‌گیرانه‌تر شود
  - پوشش پیامک/VIN/… در UX و مسیرهای multi-channel باید end-to-end تکمیل و verify شود

4) Document-AI (Kafka consumer + Outbox)
- وضعیت: **Exists / Partial (job queue/backpressure missing)**
- سرویس/فایل‌ها:
  - `services/document-ai-service/src/document-ai.consumer.ts`
- قابلیت موجود:
  - مصرف Kafka از `insurance.document.uploaded` و `insurance.document.linked`
  - idempotency با `consumed_events` از shared (`markConsumed`)
  - audit trail در `document_ai_audit`
  - انتشار eventهای outbox:
    - `insurance.document.extracted`
    - `insurance.document.extraction.needs_review`
- گپ‌های مشخص:
  - نبود queue سطح job (جدول job + retry schedule + DLQ semantics مستقل از Kafka)
  - نبود backpressure/capacity controls (concurrency limits, budget burn rate) در pipeline

### 3.1.3 API Mapping: Blueprint Workflows ↔ Implementation (Compat Plan)

هدف: همسویی با Blueprint طراحی بدون شکستن مسیرهای فعلی (`/orchestrations/*` و `/work-items/*`).

اصول:
- مسیرهای فعلی در Gateway و UI حفظ می‌شوند.
- یک compat layer اضافه می‌شود تا APIهای Blueprint (`/workflows/*`) به رفتار فعلی translate شوند.

Mapping پیشنهادی:

1) Start Process
- Blueprint: `POST /workflows/processes/{processType}/start`
- Implementation (as-is): `POST /orchestrations/sagas`
- Translation:
  - `{processType}` → `sagaType`
  - `subject.claimId` → `claimId`
  - `inputs` → `context`
- وضعیت واقعی کد:
  - Orchestrator فعلاً فقط `ClaimPayment` را پشتیبانی می‌کند و در صورت غیر از آن `NOT_SUPPORTED` می‌دهد.

2) Get Process State
- Blueprint: `GET /workflows/processes/{processInstanceId}`
- Implementation (as-is): `GET /orchestrations/sagas/:sagaId`
- Translation:
  - `processInstanceId` ↔ `sagaId`

3) Work Items Query
- Blueprint: `GET /workflows/work-items?assigneeUserId=...&state=open`
- Implementation (as-is): `GET /work-items?assignedTo=...&status=pending`

4) Claim/Complete Work Item
- Blueprint: `POST /workflows/work-items/{workItemId}/claim` و `POST /workflows/work-items/{workItemId}/complete`
- Implementation (as-is):
  - `POST /work-items/:workItemId/assign`
  - `POST /work-items/:workItemId/complete`

5) Commands on Process
- Blueprint: `POST /workflows/processes/{processInstanceId}/commands`
- Implementation (as-is): عمدتاً از طریق work item completion انجام می‌شود.
- تصمیم:
  - compat endpoint می‌تواند commandها را به completion/assign/retry translate کند، اما مدل command عمومی هنوز در سرویس فعلی explicit نیست.

### 3.1.4 Backlog اجرایی (PR-ready) برای بستن گپ‌های Enterprise

1) Orchestrator Compat Endpoints (Blueprint)
- خروجی: اضافه شدن endpointهای alias در `orchestrator-service` (بدون حذف مسیرهای فعلی)
  - `POST /workflows/processes/{processType}/start`
  - `GET /workflows/processes/{processInstanceId}`
  - `GET /workflows/work-items`
  - `POST /workflows/work-items/{workItemId}/claim`
  - `POST /workflows/work-items/{workItemId}/complete`
- قواعد:
  - پاسخ‌ها همچنان contract ثابت `success/data/error/correlationId` را رعایت کنند.
  - RBAC/permissions با permissionهای موجود map شود.

وضعیت پیاده‌سازی (Orchestrator Compat Endpoints):
- `orchestrator-service`: اضافه شدن `WorkflowsController` و پیاده‌سازی endpointهای `/workflows/*` با نگاشت به منطق موجود (`startClaimPaymentSaga`, `listWorkItems`, `assignWorkItem`, `completeWorkItem`) + RBAC (Done)
- `api-gateway`: اضافه شدن proxy route `/workflows/*` به `ORCHESTRATOR_URL` (Done)

2) Orchestrator: Generalize Saga Start (Beyond ClaimPayment)
- خروجی: پشتیبانی از `PolicyIssuance`, `ComplaintHandling`, `ReinsuranceRecovery` به‌عنوان sagaTypeهای استاندارد و step-level skeleton.
- حداقل: start/get + ثبت state machine متنی در saga instance.

وضعیت پیاده‌سازی (Orchestrator Generalize Saga Start):
- `orchestrator-service`: افزودن `startSaga()` برای `ClaimPayment/PolicyIssuance/ComplaintHandling(Re-mapped to ComplaintResolution)/ReinsuranceRecovery` با idempotency (dedupeKey در context) و انتشار event شروع برای هر sagaType (Implemented)
- `orchestrations.controller.ts`: پذیرش sagaTypeهای بالا در `POST /orchestrations/sagas` با validation صریح per-sagaType و contract ثابت (Implemented)
- `workflows.controller.ts`: پذیرش processTypeهای بالا در `POST /workflows/processes/:processType/start` با validation صریح per-processType و contract ثابت (Implemented)
- وضعیت: **Implemented (Pending Verified build/runtime)**

3) Reporting → BFF Ops Projections
- خروجی: projection tableها + consumerها برای 3 داشبورد عملیاتی:
  - Claims Ops (`rm_claims_cases`)
  - Fraud Queue (`rm_fraud_cases`)
  - Complaints Ops (`rm_complaints`)
- APIها (Option 1: Read Model رسمی):
  - `GET /rm/claims` و `GET /rm/claims/:claimId`
  - `GET /rm/fraud/cases` و `GET /rm/fraud/cases/:fraudCaseId`
  - `GET /rm/complaints` و `GET /rm/complaints/:complaintId`
- تصمیم پیاده‌سازی:
  - Read modelهای `fraud/complaints` در فاز اول در کنار `claims-readmodel-service` پیاده‌سازی می‌شوند (یا به‌صورت سرویس‌های readmodel مجزا با همان prefix `/rm`).

3.1) یکپارچه‌سازی `claims-readmodel-service` با الگوی Enterprise
- خروجی:
  - اضافه شدن JWT/RBAC و contract ثابت در `claims-readmodel-service` (همسو با سایر سرویس‌ها)
  - تثبیت naming:
    - `/rm/*` read-model رسمی است و endpointهای ops باید در همین namespace منتشر شوند.
  - گسترش read modelها (در همین سرویس یا سرویس‌های مجزا):
    - Fraud read model (`rm_fraud_cases`) برای صف عملیاتی
    - Complaints read model (`rm_complaints`) برای SLA ops

وضعیت پیاده‌سازی (Read Models / Option 1):
- `claims-readmodel-service`:
  - Migration ایجاد جدول‌ها: `1700000000501-add-fraud-and-complaints-readmodels.ts` (Implemented)
  - Entities:
    - `RmFraudCase` → جدول `rm_fraud_cases` (Implemented)
    - `RmComplaintOps` → جدول `rm_complaints` (Implemented)
  - Kafka consumer:
    - subscribe به `insurance.fraud.*` و `insurance.complaint.*` و upsert projectionها (Implemented)
  - APIهای جدید (JWT/RBAC):
    - `GET /rm/fraud/cases` (permission: `rm:fraud:view`) (Implemented)
    - `GET /rm/complaints` (permission: `rm:complaints:view`) (Implemented)
  - Permissions:
    - اضافه شدن `rm:fraud:view` و `rm:complaints:view` و نگاشت نقش‌های عملیاتی (Implemented)
  - **Docker Compose Alignment (Implemented):**
    - اضافه شدن `claims-readmodel-migrate` برای اجرای migrationها در schema `claims_rm` (Done)
    - اضافه شدن `claims-readmodel-service` با پورت `3019` و envهای `KAFKA_BROKERS/KAFKA_CONSUMER_GROUP` (Done)
    - به‌روزرسانی `api-gateway` با `CLAIMS_READMODEL_URL: http://claims-readmodel-service:3019/rm` (برای هم‌راستایی با نحوه strip کردن prefix در gateway و endpointهای upstream) + depends_on (Done)
- `complaints-service`:
  - **Docker Compose Alignment (Implemented):**
    - اضافه شدن `KAFKA_BROKERS: kafka:9092` برای OutboxWorker (Done)
    - اضافه شدن envهای `OUTBOX_POLL_INTERVAL_MS/BATCH_SIZE/MAX_ATTEMPTS` (Done)
    - اضافه شدن `kafka` به depends_on (Done)

اقدام بعدی (برای عملیاتی شدن end-to-end):
- اطمینان از اینکه Outbox relay، topicهای شکایات را publish می‌کند تا read model شکایات واقعاً تغذیه شود:
  - `insurance.complaint.created`
  - `insurance.complaint.escalated`
  - `insurance.complaint.resolved`
  - `insurance.complaint.status_changed`
  - `insurance.complaint.attachment_added`

4) Regulatory Gateway Hardening
- خروجی:
  - timeout/retry/backoff استاندارد برای callهای outbound (خصوصاً call به Orchestrator)
  - errorCodeهای استاندارد (`UPSTREAM_TIMEOUT`, `UPSTREAM_UNAVAILABLE`, ...)
  - ثبت audit-grade log + ذخیره رخدادهای failure-like در DB
  - runbook کوتاه برای triage (در همین سند یا DEPLOY_RUNBOOK)

وضعیت پیاده‌سازی (Regulatory Gateway Hardening):
- `regulatory-gateway-service`:
  - DB-backed failure log: جدول `regulatory_failure_log` + migration `1700000000601-add-regulatory-failure-log.ts` (Implemented)
  - Outbound hardening: timeout + retry/backoff برای call به Orchestrator (`/work-items/sanhab-followup`) با envهای:
    - `ORCHESTRATOR_TIMEOUT_MS`
    - `ORCHESTRATOR_RETRIES`
    - `ORCHESTRATOR_RETRY_BASE_DELAY_MS`
    و ثبت `errorCode`های استاندارد (`UPSTREAM_TIMEOUT`, `UPSTREAM_UNAVAILABLE`, `UPSTREAM_ERROR`) در failure log (Implemented)

یادداشت وضعیت (پیش‌نیاز Read Model شکایات):
- Complaints Service: شروع event-driven شدن با Outbox
  - Migration اضافه شد: `1700000000315-create-shared-event-tables.ts`
  - انتشار eventهای دامنه شکایات در `complaints.service.ts`:
    - `insurance.complaint.created`
    - `insurance.complaint.escalated`
    - `insurance.complaint.resolved`
    - `insurance.complaint.status_changed`
    - `insurance.complaint.attachment_added`
  - OutboxWorker: مانند سایر سرویس‌ها (Policy/Claims/Payments) در `complaints-service/src/main.ts` فعال شد و با داشتن `KAFKA_BROKERS`، رویدادهای outbox را publish می‌کند (Implemented).
  - **UI Alignment با Read Models (/rm/*) - Implemented:**
    - `web-ui/src/lib/enterprise-rbac.ts`: اضافه شدن permissionهای Read Model (`rm:claims:view`, `rm:claims:summary`, `rm:fraud:view`, `rm:complaints:view`) به EnterprisePermissionKey و نگاشت نقش‌ها مطابق PERMISSIONS_MATRIX (Done)
    - `web-ui/src/components/app-shell.tsx`: به‌روزرسانی navigation permissions از permissionهای قدیمی (`claims:list`, `fraud:cases:list`, `complaints:list`) به permissionهای Read Model (`rm:claims:view`, `rm:fraud:view`, `rm:complaints:view`) (Done)
    - `web-ui/src/app/claims/page.tsx`: تغییر از `/claims` (direct service) به `/rm/claims` (Read Model) برای لیست + permission check از `claims:list` به `rm:claims:view` (Done)
    - `web-ui/src/app/claims/[claimId]/page.tsx`: ایجاد صفحه جزئیات خسارت با استفاده از `GET /rm/claims/:claimId` + RBAC gating با `rm:claims:view` (Done)
    - `web-ui/src/app/claims/summary/page.tsx`: ایجاد داشبورد خلاصه خسارت‌ها با استفاده از `GET /rm/claims/summary` + RBAC gating با `rm:claims:summary` (Done)
    - `web-ui/src/app/complaints/page.tsx`: تغییر از `/complaints` (direct service) به `/rm/complaints` (Read Model) برای لیست + permission check از `complaints:list` به `rm:complaints:view` (Done)
    - `web-ui/src/app/fraud/page.tsx`: تغییر از `/fraud/cases` (direct service) به `/rm/fraud/cases` (Read Model) برای لیست + permission check از `fraud:cases:list` به `rm:fraud:view` (Done)
    - **نتیجه:** UI از pattern fan-out (call مستقیم به سرویس‌ها) به pattern Enterprise Blueprint (استفاده از Read Models برای query) منتقل شد. mutation operations (create/update/close) همچنان به operational services متصل هستند.

5) Document-AI Job Queue + Backpressure
- خروجی:
  - جدول job (مثلاً `document_ai_jobs`) با state (`queued/running/succeeded/failed/deadletter`)
  - scheduler/worker با concurrency limit و retry policy
  - DLQ semantics داخلی (مستقل از Kafka) + endpoint admin برای replay
  - budget/cost guardrails (rate limit per tenant + سقف هزینه)

6) Sales Network & Distribution (Agent/Broker)
- وضعیت: **Implemented (Pending Verified build/runtime)**
- یافته‌های کد:
  - role catalog در auth-service شامل roleهای `agency_owner/agency_staff/broker_owner/broker_staff` است.
  - در UI شکایات، complaintType شامل `agent` و `broker` است (برای ثبت شکایت مرتبط).
- خروجی‌های قابل تحویل (Enterprise):
  - سرویس `sales-network-service` یا معادل آن با:
    - lifecycle نماینده/کارگزار (ثبت/احراز/وضعیت فعال/تعلیق)
    - ساختار سازمانی شبکه (branch/agency/broker) و کاربران
    - قرارداد کمیسیون/کارمزد + محاسبه و گزارش
    - KPI شبکه فروش (صدور، حق‌بیمه، retention، شکایات مرتبط)
  - UI module/portal برای نمایندگی/کارگزاری با RBAC و محدودسازی داده‌ها به tenant/agency

وضعیت پیاده‌سازی (As-Is در ریپو):
- `sales-network-service` (Implemented):
  - NestJS + TypeORM + migrations + `migrate:build`
  - DB schema: `sales` با جداول:
    - `sales_partners` (lifecycle: pending/verified/active/suspended/terminated)
    - `commission_contracts` (draft/active/retired)
    - `commission_ledger` (accrual/paid/void)
    - `sales_kpi_daily` (daily KPI per orgUnit: issued/renewed/cancelled/complaints + premium/commission)
    - `sales_policy_attributions` (policyId -> producer orgUnit برای اتصال شکایات/renew/cancel)
    - `consumed_events` (idempotency)
  - API endpoints (JWT + RBAC + audit):
    - `GET/POST /sales-network/partners`
    - `POST /sales-network/partners/:orgUnitId/verify`
    - `POST /sales-network/partners/:orgUnitId/status`
    - `GET/POST /sales-network/contracts`
    - `POST /sales-network/contracts/:contractId/activate`
    - `GET /sales-network/ledger`
    - `POST /sales-network/ledger/:ledgerEntryId/pay`
    - `POST /sales-network/ledger/:ledgerEntryId/void`
    - `GET /sales-network/kpi/daily`
  - Kafka consumer (event-driven): مصرف `insurance.policy.issued|renewed|cancelled` و `insurance.complaint.created` برای ledger + KPI با idempotency
- `api-gateway` (Implemented): route جدید `/sales-network` با env `SALES_NETWORK_URL`
- `docker-compose.yml` (Implemented): سرویس `sales-network-service` و job `sales-network-migrate`

- `web-ui` (Implemented):
  - صفحه `GET /sales-network` برای مدیریت:
    - Partners (list/create/verify/status)
    - Contracts (list/create/activate)
    - Ledger (list + عملیات pay/void برای نقش‌های مجاز)
    - KPI Daily (list)
  - Navigation entry با permission `sales_network:partners:view`
  - RBAC gating مطابق `PERMISSIONS_MATRIX.md`

گپ‌های باقی‌مانده برای enterprise-grade کامل:
- Runtime verification: اجرای migrationها + docker compose up + تست end-to-end (Pending)
- اتصال producer به policy events: افزودن `producerOrgUnitId` در DB و eventهای policy (Implemented)
- بهبود KPIها: افزودن retention/complaints KPIs از eventهای `insurance.policy.*` و `insurance.complaint.*` (Implemented)

## 4) فازبندی اجرایی (Phases)

### فاز 0: Foundation / استانداردسازی (باقی‌مانده‌ها)
- سیاست یکپارچه envها و اجرای migration در CI/CD برای همه سرویس‌ها
- اطمینان از خاموش بودن schema sync در production
- استاندارد Event Envelope در shared + contract tests (Done)
- استاندارد audit fields (correlationId/tenantId/actorUserId/action/resourceId/status)
- یکپارچه‌سازی کامل Gateway routes و حذف هر instance اضافی/متناقض
- تکمیل امنیت (JWT + permissions) برای همه endpointهای حساس در همه سرویس‌ها

تعریف وضعیت‌ها برای خوانش دقیق رودمپ:
- **Implemented:** در ریپو وجود دارد (service + migrations + routeهای Gateway).
- **Verified (Runtime):** با اجرای `docker compose up` و اجرای migrationها و health check/flowهای پایه، در محیط عملیاتی تأیید شده است.

تصمیم عملیاتی (Resilient Integration):
- خطای یکپارچه‌سازی بین سرویس‌ها (مثلاً call به Orchestrator/Underwriting) نباید عملیات اصلی دامنه را fail کند.
- به‌جای fail کردن، باید `auditLogger.warn` با `correlationId/tenantId/actorUserId` ثبت شود تا امکان پیگیری/جبران فراهم باشد.

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

اپیک‌های تکمیلی فاز 0 (برای Enterprise-grade شدن):

1) Workflow/Orchestrator Alignment (Blueprint ↔ Implementation)
- هدف: حذف ambiguity بین APIهای طراحی (`/workflows/*`) و APIهای فعلی (`/orchestrations/*` و `/work-items/*`).
- خروجی‌های قابل تحویل:
  - جدول mapping رسمی (Design API ↔ Current API) داخل همین رودمپ
  - تصمیم نهایی: یکی از دو مسیر زیر
    - (ترجیحی) افزودن alias endpoints برای `/workflows/*` در gateway و/orchestrator (compat) بدون شکستن UI
    - یا migrate کامل UI و سرویس‌ها به contract جدید
  - استانداردسازی نام‌گذاری processType/state/commandType و ثبت نسخه قرارداد

2) Event Catalog Governance (Designed vs Implemented)
- هدف: یک منبع حقیقت برای eventها و جلوگیری از drift.
- خروجی‌های قابل تحویل:
  - جدول «Designed events vs Implemented events» (حداقل برای Policy/Claims/Payments/Fraud/Complaints/Reinsurance)
  - تصمیم برای eventهای میانی (مثل `ClaimPaymentRequested`/`ComplaintRouted`) و وضعیت انتشار آن‌ها
  - enforce کردن naming و retention/DLQ policy در سطح platform

### Event Catalog (As-Is Implemented Topics)
این لیست از روی کد استخراج شده و «بدون حدس» ثبت می‌شود. وضعیت Designed/Gap باید با سند Enterprise نهایی شود.

- Policy:
  - `insurance.policy.*` (منتشر می‌شود در policy-service via Outbox) (As-Is: Implemented)
- Claims:
  - `insurance.claim.registered`
  - `insurance.claim.assessed`
  - `insurance.claim.approved`
  - `insurance.claim.payment_requested`
  - `insurance.claim.rejected`
  - `insurance.claim.paid`
  - `insurance.claim.closed`
- Payments:
  - `insurance.payment.prepared`
  - `insurance.payment.finance_approved`
  - `insurance.payment.executed`
  - `insurance.payment.notified`
  - `insurance.payment.failed`
- Fraud:
  - `insurance.fraud.score_computed`
  - `insurance.fraud.case_opened`
  - `insurance.fraud.case_closed`
- Complaints:
  - `insurance.complaint.created`
  - `insurance.complaint.escalated`
  - `insurance.complaint.resolved`
  - `insurance.complaint.status_changed`
  - `insurance.complaint.attachment_added`
- Documents:
  - `insurance.document.uploaded`
  - `insurance.document.linked`
- Collections:
  - `insurance.collections.plan.created`
  - `insurance.collections.installment.paid`
- Orchestrator (Saga/WorkItems events):
  - `insurance.saga.document_review.required`
  - `insurance.saga.payment.prepare.required`
  - `insurance.saga.payment.finance_approval.required`
  - `insurance.saga.payment.execute.required`
  - `insurance.saga.payment.notify.required`
- Regulatory:
  - `insurance.regulatory.sanhab.event_received`

اقدام بعدی (Governance):
- استخراج لیست «Designed events» از سند Enterprise و ایجاد mapping دقیق (Designed ↔ Implemented) برای هر دامنه.
- تعیین وضعیت eventهای میانی (مثل `ClaimPaymentRequested`/`ComplaintRouted`) و تصمیم publish/consume.

### Designed ↔ Implemented (Extracted Mapping - Partial)
این بخش «فقط» بر اساس مواردی که از سند Enterprise پیدا شد ثبت می‌شود (به‌منظور جلوگیری از حدس).

| Designed Event | Designed Topic | As-Is Implemented | Gap / Next Action |
|---|---|---|---|
| `PolicyQuoted` | `insurance.policy.quoted` | Implemented (Policy Service publishes `insurance.policy.*` via Outbox) | - |
| `PolicyIssued` | `insurance.policy.issued` | Implemented (Policy Service publishes `insurance.policy.*` via Outbox) | - |
| `PolicyCancelled` | `insurance.policy.cancelled` | Implemented (Policy Service publishes `insurance.policy.*` via Outbox) | - |
| `PolicyEndorsed` | `insurance.policy.endorsed` | Implemented (Policy Service publishes `insurance.policy.*` via Outbox) | - |
| `PolicyRenewed` | `insurance.policy.renewed` | Implemented (Policy Service publishes `insurance.policy.*` via Outbox) | - |

| `ClaimRegistered` | `insurance.claim.registered` | Implemented | - |
| `ClaimAssessed` | `insurance.claim.assessed` | Implemented | - |
| `ClaimApproved` | `insurance.claim.approved` | Implemented | - |
| `ClaimRejected` | `insurance.claim.rejected` | Implemented | - |
| `ClaimClosed` | `insurance.claim.closed` | Implemented | - |
| `ClaimPaymentRequested` | `insurance.claim.payment_requested` | Implemented | Decision resolved (Option A): this event is source of truth to start payment workflow. Contract tests implemented in `@insurance/shared` (zod + Jest). Implemented idempotent consumer in payments-service (Kafka + DLQ) that creates PaymentIntent and emits `insurance.payment.prepared`. Implemented reporting projection (`rm_claim_payment.payment_requested_at/approved_amount` + API + surfaced in `/reporting` UI) |
| `ClaimPaid` | `insurance.claim.paid` | Implemented | - |
| `ClaimDocumentsAttached` | `insurance.claim.documents_attached` | Implemented (Document Service publishes via Outbox on upload/link as source of truth) | Contract tests implemented in `@insurance/shared` (zod schema + Jest). Implemented idempotent consumers: reporting-service projection (`rm_claim_documents_attached` + API + surfaced in `/reporting` UI) + fraud-service audit consumer (`fraud_document_attachment_audit`) |

| `FraudScoreComputed` | `insurance.fraud.score_computed` | Implemented | - |
| `FraudCaseOpened` | `insurance.fraud.case_opened` | Implemented | - |
| `FraudCaseEscalated` | `insurance.fraud.case_escalated` | Implemented (Fraud Service publishes via Outbox on `/fraud/cases/:fraudCaseId/escalate`) | Contract tests implemented in `@insurance/shared` (zod + Jest). Implemented idempotent consumers: orchestrator-service (HITL work item `fraud_case_escalation`) + reporting-service projection (`rm_fraud_case_escalations` + API + surfaced in `/reporting` UI) |
| `FraudCaseClosed` | `insurance.fraud.case_closed` | Implemented | - |

| `ComplaintCreated` | `insurance.complaint.created` | Implemented | - |
| `ComplaintEscalated` | `insurance.complaint.escalated` | Implemented | - |
| `ComplaintResolved` | `insurance.complaint.resolved` | Implemented | - |
| `ComplaintSlaBreached` | `insurance.complaint.sla_breached` | Implemented (Complaints Service publishes via Outbox from SLA breach worker) | Contract tests implemented in `@insurance/shared` (zod + Jest). Implemented idempotent consumers: orchestrator-service (HITL work item `complaint_sla_breach`) + reporting-service projection (`rm_complaint_sla_breaches` + API + surfaced in `/reporting` UI) + monitoring-service Ops alert policy (Kafka consumer + idempotent alert creation surfaced via `/monitoring` UI) |

| `CededCalculated` | `insurance.ri.ceded_calculated` | Implemented (Reinsurance Service publishes via Outbox on cession create/update/approve) | Contract tests implemented in `@insurance/shared` (zod schema + Jest). Implemented consumer/projection in reporting-service (idempotent, `rm_ri_ceded`) + surfaced in `/reporting` UI |
| `BorderauxGenerated` | `insurance.ri.borderaux_generated` | Implemented (Reinsurance Service publishes via Outbox when bordereau statement status becomes `issued`) | Contract tests implemented in `@insurance/shared` (zod schema + Jest). Implemented consumer/projection in reporting-service (idempotent, `rm_ri_borderaux`) + surfaced in `/reporting` UI. اقدام بعدی: ذخیره artifact در document-service (اختیاری) |
| `RecoveryIdentified` | `insurance.ri.recovery_identified` | Implemented (Reinsurance Service publishes via Outbox on recovery create) | Contract tests implemented in `@insurance/shared` (zod schema + Jest). Implemented consumers/projections in claims-readmodel-service (`rm_claims_cases`) and reporting-service (`rm_ri_recoveries`) + surfaced in web-ui (claim detail + `/reporting`) |
| `RecoveryReceived` | `insurance.ri.recovery_received` | Implemented (Reinsurance Service publishes via Outbox on recovery update when received/collected) | Contract tests implemented in `@insurance/shared` (zod schema + Jest). Implemented consumers/projections in claims-readmodel-service (`rm_claims_cases`) and reporting-service (`rm_ri_recoveries`) + surfaced in web-ui (claim detail + `/reporting`). اقدام بعدی: اگر Finance مالک دریافت است، جایگزینی/همگام‌سازی با producer مالی |

3) BFF/Read Models برای UIهای عملیاتی
- هدف: UI وابسته به fan-out call چند سرویس نباشد.
- خروجی‌های قابل تحویل:
  - تصمیم مالکیت: توسعه `reporting-service` به‌عنوان BFF یا ایجاد `bff-service`
  - Projectionهای حیاتی:
    - claims ops dashboard (rm_claims_cases)
    - fraud queue (rm_fraud_cases)
    - complaints ops (rm_complaints)
  - APIهای query اختصاصی UI با pagination/filter/sort و RBAC

4) SRE/Observability Hardening (SLO/SLI/DLQ)
- هدف: عملیاتی‌سازی با معیارهای عددی و آلارم.
- خروجی‌های قابل تحویل:
  - تعریف SLI/SLO برای journeyهای کلیدی (صدور/خسارت/پرداخت/شکایت)
  - داشبورد lag/DLQ/error rate و alert policy (حداقل در dev/stage)
  - استاندارد errorCodeها (برای triage) و اتصال به runbook
  - RBAC Enforcement برای endpointهای `/monitoring/*` + Ops UI pages

### پیادهسازی SRE/Observability (Done)
- **monitoring-service**: سرویس مرکزی metrics/SLO/alert با Prometheus
  - پورت: 3020
  - endpoints:
    - `GET /metrics` (Prometheus scrape)
    - `GET /slos` (list SLOs)
    - `POST /slos` (create SLO)
    - `GET /alerts` (list alerts)
    - `PATCH /alerts/:alertId/ack` (acknowledge)
    - `GET /dashboard` (SLO/alert stats)
  - ارزیابی SLO هر ۵ دقیقه با cron
  - تولید خودکار alert هنگام breach
- **docker-compose**: اضافه شد monitoring-service
- **api-gateway**: اضافه شد route `/monitoring` → monitoring-service:3020

#### Hardening (Enterprise) - Ops Security/UI (Done)
- **RBAC Enforcement**: تمام endpointهای `/monitoring/*` به‌جز `/health` با `JwtAuthGuard` + `PermissionsGuard` محافظت شدند.
- **Ops UI**: صفحه‌ی کنسول `/monitoring` در `web-ui` اضافه شد (SLOs/Alerts/Dashboard) با permission gating.
- **DLQ Ops UI**: صفحه‌ی کنسول `/dlq` در `web-ui` اضافه شد با ویژگی‌های enterprise:
  - DLQ stats + list با pagination server-driven (`limit/offset/total`)
  - فیلترهای status/topic + reset
  - جزئیات رکورد (payload/headers/error stack) در پنل جداگانه
  - Resolve با تایید دو مرحله‌ای (confirmation string) و نمایش correlationId در خطاها
  - مسیر `/dlq/*` از طریق `api-gateway`
- **Document-AI Ops UI**: صفحه‌ی کنسول `/document-ai` در `web-ui` اضافه شد با ویژگی‌های enterprise:
  - tabs: Jobs/Audit/Usage با pagination server-driven (`limit/offset/total`)
  - فیلترهای دقیق per-tab (jobs: status/documentId/tenantId، audit: documentId/decision/tenantId، usage: tenantId/usageDate)
  - job details panel (call به `GET /document-ai/jobs/:jobId`)
  - Retry با تایید دو مرحله‌ای (confirmation string) و نمایش correlationId در خطاها
  - مسیر `/document-ai/*` از طریق `api-gateway`
- **SLOهای پیش‌فرض** (seed/migration):
  - `claims_service_availability` (target: 99.5%, window: 30d)
  - `claims_service_latency_p95` (target: 500ms, window: 7d)
  - `payments_service_availability` (target: 99.5%, window: 30d)
  - `orchestrator_saga_success_rate` (target: 99%, window: 7d)
  - `complaints_resolution_sla` (target: 95%, window: 30d)
  - پیاده‌سازی: migration اضافه شد در `monitoring-service`: `src/migrations/1700000000810-seed-default-slos.ts` (Done)
- **Alert policy**:
  - breach → status: firing, severity: critical
  - at_risk (< 98% target) → status: at_risk, severity: warning
  - ack/resolve endpoints available

5) Service-to-Service Security (مرحله‌ای)
- هدف: حرکت به سمت Zero Trust بدون توقف توسعه.
- خروجی‌های قابل تحویل:
  - مرحله 1: scoped tokens + deny-by-default policy روی سرویس‌های حساس (Claims/Payments/Policy)
  - مرحله 2: PDP (OPA یا معادل) برای commandهای حساس و SoD
  - مرحله 3: mTLS/service identity (در حد محیط docker-compose و سپس نصب واقعی)

#### وضعیت پیاده‌سازی مرحله 1 (Done)
- **Service Token Model**:
  - JWT claim: `tokenType=service`
  - claims: `serviceId`, `permissions[]`
  - TTL جداگانه با env: `SERVICE_JWT_EXPIRES_IN` (پیش‌فرض 15m)
- **Issuer**: `auth-service` endpoint `POST /service-token` با header `x-service-issuer-key` (env: `SERVICE_TOKEN_ISSUER_KEY`)
- **Deny-by-default enforcement**:
  - `PermissionsGuard` در سرویس‌های حساس (claims/payments/policy/orchestrator) ابتدا `permissions[]` را (اگر وجود دارد) مبنا قرار می‌دهد، و فقط در نبود آن از role-based permissions استفاده می‌کند.
- **Internal call migration**:
  - `claims-service` برای شروع Saga پرداخت به جای توکن کاربر، service-token scoped با permission `orchestrations:saga_start` می‌گیرد و به `orchestrator-service` ارسال می‌کند.

6) Document-AI Productionization (نه صرفاً MVP)
- هدف: pipeline واقعی با queue/backpressure و هزینه قابل کنترل.
- خروجی‌های قابل تحویل:
  - job queue + retry/backoff + DLQ برای extraction
  - cost guardrails (rate limit، سقف هزینه tenant، مدل fallback)
  - eval suite حداقلی (golden set) + audit trail کامل

#### وضعیت پیاده‌سازی (Partial)
- **Job Queue (DB-backed)**: اضافه شد `DocumentAiJob` + migration `document_ai.document_ai_jobs`
- **Consumer vs Worker**:
  - Kafka consumer فقط enqueue می‌کند (idempotent via `ConsumedEvent` + `dedupe_key`)
  - Worker (`DocumentAiJobWorker`) پردازش extraction را انجام می‌دهد
- **Retry/Backoff/DLQ**:
  - retry با exponential backoff + jitter
  - انتقال به `dead_letter` پس از `max_attempts`
- **Audit trail**:
  - ثبت در `document_ai.document_ai_audit` (extracted/needs_review/failed)
- **Cost guardrails (Tenant-level)**:
  - سقف روزانه job و AI request per-tenant با env:
    - `DOCUMENT_AI_TENANT_DAILY_JOB_LIMIT`
    - `DOCUMENT_AI_TENANT_DAILY_REQUEST_LIMIT`
  - Accounting روزانه در `document_ai.document_ai_usage_daily`
- **Eval Suite (Golden Set + Scoring + Reporting)**:
  - DB tables + entities + migrations: `document_ai_eval_cases`, `document_ai_eval_runs`, `document_ai_eval_results` (Done)
  - Worker: `DocumentAiEvalWorker` برای اجرای runهای `queued` و تولید result per-case (Done)
  - Side-effect free extraction: `DocumentAiProcessor.extractForEval()` برای اجرای eval بدون update/publish/audit/usage (Done)
  - Ops APIs (secured):
    - `GET /document-ai/eval/cases` + `POST /document-ai/eval/cases` + `PATCH /document-ai/eval/cases/:caseId` (Done)
    - `GET /document-ai/eval/runs` + `POST /document-ai/eval/runs` + `GET /document-ai/eval/runs/:runId` (Done)
    - `GET /document-ai/eval/runs/:runId/results` (Done)
  - RBAC permissions: `document_ai:eval:*` در backend/web-ui/PERMISSIONS_MATRIX همگام شد (Done)
  - Ops UI integration (enterprise-grade): اضافه شدن tab `Eval` در `/document-ai` شامل:
    - Cases console: list با pagination/filters، details panel، create/edit با confirmation سخت‌گیرانه (Done)
    - Runs console: list با pagination/filter، start run با confirmation، results viewer با paging و نمایش score/expected/actual/diff (Done)
    - RBAC gating در UI مطابق permissionهای `document_ai:eval:*` + redirect به `/forbidden` (Done)
    - وضعیت build روی Windows: build سراسری repo با Bun انجام و تایید شد (`bun install` + `bun run build`) (Done)
  - CorrelationId hardening (Document-AI Service): افزودن `X-Correlation-Id` propagation و Global Exception Filter برای پاسخ‌های خطا مطابق contract ثابت `success/error/correlationId` (Done)

#### عملیات/Runbook (Document-AI)
- Runbook عملیاتی Document-AI (failure modes, DLQ/retry, cost guardrails, on-call) اضافه شد: `doc/DOCUMENT_AI_RUNBOOK.md` (Done)

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

  یادداشت تکمیلی (سخت‌گیری state machine):
  - اجرای پرداخت (`execute`) فقط در وضعیت `finance_approved` مجاز است و سایر وضعیت‌ها با `INVALID_STATE` رد می‌شوند (Implemented).

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

  یادداشت تکمیلی (Production hygiene):
  - اسکریپت تستی `services/document-ai-service/src/test-gemini.ts` از build artifactهای TypeScript خارج شده است (Implemented).

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

یادداشت اجرایی (Env alignment / Outbox Worker):
- `payments-service` در `docker-compose.yml` از envهای `OUTBOX_POLL_INTERVAL_MS/OUTBOX_BATCH_SIZE/OUTBOX_MAX_ATTEMPTS` استفاده می‌کند (هم‌راستا با `payments-service/src/main.ts`).

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