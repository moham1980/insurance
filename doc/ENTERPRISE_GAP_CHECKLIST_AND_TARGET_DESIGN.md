# چک‌لیست جامع نواقص و طراحی هدف سامانه بیمه Enterprise

> **تاریخ**: ۱۴۰۵/۰۲/۱۰  
> **مبنای تدوین**: 
> - `تحقیقات_فرایندهای_بیمه_ایران_1404.md`
> - `طراحی_سامانه_هوش_مصنوعی_بیمه_Enterprise.md`
> - `doc/FUNCTIONAL_COMPLETION_CHECKLIST.md`
> - بازبینی وضعیت فعلی کدبیس و سرویس‌ها
> 
> **هدف این سند**: تبدیل اهداف کلان سامانه به یک نقشه اجرایی برای تکمیل نواقص پروژه، به‌نحوی که سامانه به یک پلتفرم بیمه Enterprise بومی‌سازی‌شده برای ایران و هم‌تراز با بهترین نمونه‌های جهانی تبدیل شود.

---

## ۱) چشم‌انداز نهایی سامانه

سامانه هدف باید این ویژگی‌ها را به‌صورت هم‌زمان محقق کند:

- **نصب اختصاصی برای هر شرکت بیمه** با جداسازی کامل داده، Secrets، تنظیمات و مدل‌ها
- **محصول‌محور و Config-driven** بدون فورک کد برای هر شرکت
- **پوشش کامل چرخه بیمه** شامل فروش، صدور، خسارت، وصول، شکایات، AML/KYC، تقلب، اتکایی، گزارش‌دهی و شبکه فروش
- **یکپارچگی با اکوسیستم ایران** شامل سنهاب، میز خدمت، OTP/SMS، درگاه پرداخت، کارپوشه/دولت همراه و سرویس‌های تخصصی
- **AI بومی و Enterprise-grade** شامل OCR، استخراج، امتیازدهی ریسک، ضدتقلب، Copilot، Knowledge Layer و حاکمیت کامل مدل
- **Human-in-the-loop** در تمام تصمیمات حساس
- **ممیزی‌پذیری، امنیت، پایداری و مشاهده‌پذیری در سطح سازمانی**
- **تجربه کاربری ممتاز** برای مشتری، نماینده، کارشناس، مدیر و ناظر

---

## ۲) اصول طراحی مرجع

- **DDD و Bounded Context** برای جداسازی دامنه‌ها
- **API-first + Event-driven** با Outbox، Idempotency و Schema Governance
- **System of Record روشن برای هر دامنه**
- **CQRS و Read Model برای UIها** به‌جای orchestration در سمت فرانت
- **AI by design with governance** نه AI الحاقی و پراکنده
- **Security/Privacy by design** با Data Minimization و masking
- **Iran-ready integration design** با درنظر گرفتن محدودیت‌های سنهاب، کیفیت داده و الزامات رگولاتوری
- **Business-led operating model** برای جلوگیری از pilot purgatory

---

## ۳) دامنه‌های هدف نهایی سامانه

دامنه‌های الزامی برای نسخه برتر Enterprise:

- **Identity & Access**
- **Party / Customer / KYC**
- **Product & Pricing**
- **Policy / Underwriting**
- **Claims / FNOL / Adjuster**
- **Payments / Collections / Billing / Finance Integration**
- **Sales Network / Agent / Broker**
- **Complaints / Ombudsman / Regulatory escalation**
- **Fraud / SIU / Graph Analytics**
- **AML / CFT / Transaction Monitoring**
- **Reinsurance**
- **Document Service / Document AI**
- **Copilot / GenAI / Knowledge Layer / Model Switchboard**
- **Workflow / Case Management / Rule Engine**
- **Regulatory Gateway / Sanhab / Government integrations**
- **Reporting / Executive BI / Operational Intelligence**
- **Platform Ops / Observability / SRE / Security**

---

## ۴) تصویر واقعی وضعیت فعلی

### ۴.۱) نقاط قوت موجود

- هسته قابل‌قبولی از سرویس‌های عملیاتی، تست‌ها، UI مدیریتی، Monitoring و برخی جریان‌های بیمه پیاده‌سازی شده است.
- ساختار کلی Microservice + Gateway + Kafka + TypeORM + NestJS شکل گرفته است.
- در حوزه‌های Claims، Policy، Complaints، Reporting، Fraud، AML، Reinsurance و Document AI اجزای مهمی وجود دارد.
- Admin UI از نظر breadth نسبتاً گسترده است.

### ۴.۲) مشکل اصلی پروژه فعلی

مشکل اصلی این نیست که «هیچ چیز وجود ندارد»؛ مشکل این است که:

- بخشی از چک‌لیست فعلی بیش از حد خوش‌بینانه است.
- بعضی قابلیت‌ها در سند به‌عنوان «کامل» ثبت شده‌اند ولی در کدبیس فقط shell، mock، یا implementation ناقص دارند.
- بعضی سرویس‌ها از نظر کد وجود دارند اما از نظر integration، readiness، data ownership یا runtime هنوز Enterprise-ready نیستند.
- بعضی حوزه‌های حیاتی فقط در حد entity یا API اولیه هستند و هنوز به operating capability تبدیل نشده‌اند.

---

## ۵) چک‌لیست جامع نواقص بر اساس اهداف سامانه

## ۵.۱) شکاف‌های سطح معماری و محصول

- [ ] **هم‌ترازی مجدد کدبیس با blueprint مرجع**
  - وضعیت فعلی: بین طراحی مرجع، چک‌لیست فعلی و کد واقعی ناهماهنگی وجود دارد.
  - طراحی هدف: یک Source of Truth واحد برای دامنه‌ها، سرویس‌ها، APIها، eventها و maturity matrix ایجاد شود.
  - معیار پذیرش: هر capability دارای owner، status، service mapping، API mapping و test mapping باشد.

- [ ] **تعریف Maturity Model برای هر دامنه**
  - وضعیت فعلی: کامل/ناقص بودن بیشتر توصیفی است.
  - طراحی هدف: سطوح `Designed`, `Skeleton`, `Integrated`, `Operational`, `Production-ready`, `Enterprise-ready` تعریف شود.
  - معیار پذیرش: برای همه دامنه‌ها سطح maturity ثبت و قابل گزارش باشد.

- [ ] **تفکیک دقیق بین قابلیت پیاده‌شده، mock، simulate و future**
  - وضعیت فعلی: mockها گاهی در چک‌لیست به‌عنوان completion ثبت شده‌اند.
  - طراحی هدف: برچسب‌گذاری رسمی capabilityها بر اساس runtime truth.
  - معیار پذیرش: هر API و UI مشخص کند real/mock/simulated/internal-demo است.

## ۵.۲) Identity, IAM, Tenant Isolation

- [ ] **پیاده‌سازی Enterprise IAM واقعی**
  - شکاف: SSO، OIDC/SAML، ABAC، SoD و policy administration در سطح کامل دیده نمی‌شود.
  - طراحی هدف: IAM مرکزی با RBAC/ABAC، federation، role templates، policy audit.
  - معیار پذیرش: پشتیبانی از SSO سازمانی، role matrix، least privilege و audit کامل access.

- [ ] **تقویت جداسازی tenant در همه سرویس‌ها**
  - شکاف: در بعضی flowها tenant header propagation هست، اما enforcement سرتاسری نیاز به validation عملیاتی دارد.
  - طراحی هدف: tenant boundary در DB، cache، queue، file storage، AI config و secrets enforce شود.
  - معیار پذیرش: تست‌های نفوذ و isolation برای cross-tenant access صفر خطا داشته باشد.

## ۵.۳) Party / Customer / KYC

- [ ] **تکمیل Customer 360**
  - شکاف: Party/KYC وجود دارد اما نمای یکپارچه 360 درجه مشتری، household، وابستگی‌ها و journey history کامل نیست.
  - طراحی هدف: Customer Profile کامل شامل policies, claims, complaints, payments, AML, interactions.
  - معیار پذیرش: یک API و UI واحد برای customer 360 وجود داشته باشد.

- [ ] **دیجیتال‌سازی کامل KYC**
  - شکاف: KYC workflow هست اما document trust chain، identity proofing، dedup و external verification کامل نشده است.
  - طراحی هدف: KYC چندمرحله‌ای با OCR، face match، sanctions/PEP screening، consent lifecycle.
  - معیار پذیرش: از intake تا approval و exception queue end-to-end عملیاتی باشد.

## ۵.۴) Product, Pricing, Underwriting

- [ ] **موتور محصول‌سازی کامل Config-driven**
  - شکاف: Product service وجود دارد اما productization enterprise-level برای خطوط مختلف بیمه کامل نیست.
  - طراحی هدف: product templates، coverages، clauses، exclusions، pricing dimensions، rule packs، version rollout.
  - معیار پذیرش: معرفی محصول جدید بدون تغییر کد هسته برای اکثر سناریوها ممکن باشد.

- [ ] **Appetite & Underwriting Decision Engine**
  - شکاف: underwriting service و risk tools وجود دارند، اما appetite management، delegated authority، exception handling و referral policy کامل نیست.
  - طراحی هدف: underwriting rules + AI assist + human approval + SLA + explainability.
  - معیار پذیرش: تصمیمات صدور با traceability و approval matrix کامل ثبت شوند.

- [ ] **Pricing Support واقعی و Actuarial-ready**
  - شکاف: quote و rules موجود است، اما pricing analytics، elasticity، scenario testing و governance کامل نیست.
  - طراحی هدف: sandbox نرخ‌دهی، rule impact analysis، audit، approval workflow.
  - معیار پذیرش: هر تغییر rule اثرسنجی و approval trail داشته باشد.

## ۵.۵) Policy Lifecycle

- [ ] **تکمیل lifecycle کامل بیمه‌نامه در تمام خطوط کسب‌وکار**
  - شکاف: چرخه صدور برای برخی مسیرها وجود دارد ولی product-line completeness مشخص نیست.
  - طراحی هدف: quote, issue, unique code, endorsement, renewal, cancellation, reinstatement, lapse handling.
  - معیار پذیرش: برای هر line of business state machine و acceptance criteria مشخص شود.

- [ ] **کیفیت داده و pre-submission validation در سطح Enterprise**
  - شکاف: quality gate وجود دارد ولی data quality framework جامع نیست.
  - طراحی هدف: فیلدهای هویتی، VIN، موبایل، کد یکتا، address normalization، dedup و anomaly detection قبل از صدور.
  - معیار پذیرش: درصد خطای برگشتی از رگولاتور و عملیات دستی به‌شدت کاهش یابد.

## ۵.۶) Claims, FNOL, Adjuster

- [ ] **تبدیل Claims به operating model کامل**
  - شکاف: state machine خوب است اما routing، reserve governance، subrogation، salvage، supplier ecosystem و medical/provider integration کامل نیست.
  - طراحی هدف: claims triage، adjuster dispatch، reserve management، payment orchestration، recovery lifecycle.
  - معیار پذیرش: claims journey از FNOL تا closure و recovery بدون gap دستی قابل اجرا باشد.

- [ ] **FNOL omnichannel واقعی**
  - شکاف: FNOL API وجود دارد ولی voice/chat/email/mobile ingestion و guided self-service کامل نیست.
  - طراحی هدف: intake از web/mobile/agent/call center با prefill، OCR و conversation assist.
  - معیار پذیرش: مشتری بتواند بدون تماس انسانی، FNOL کامل ثبت کند.

- [ ] **Workload balancing و intelligent routing**
  - شکاف: ارجاع به adjuster هست ولی skill-based routing و balancing کامل نیست.
  - طراحی هدف: assignment بر اساس skill, geography, claim type, fraud risk, SLA.
  - معیار پذیرش: queue balancing و SLA adherence به‌صورت خودکار سنجش شود.

## ۵.۷) Fraud / SIU

- [ ] **تکمیل Fraud Operating Model**
  - شکاف: rule + ML + graph وجود دارد، اما SIU lifecycle، evidence management، referral to legal و network intelligence enterprise-grade کامل نیست.
  - طراحی هدف: fraud triage, case build-up, investigation notebook, watchlists, outcome feedback loop.
  - معیار پذیرش: fraud case از detection تا closure و model feedback ثبت شود.

- [ ] **Closed-loop learning از Fraud outcomes**
  - شکاف: نتیجه تحقیقات و overrides به شکل نظام‌مند به مدل‌ها و ruleها برنمی‌گردد.
  - طراحی هدف: feedback loop برای rules, thresholds, models, investigator outcomes.
  - معیار پذیرش: هر fraud case outcome قابل استفاده برای retraining/rule tuning باشد.

## ۵.۸) AML / CFT

- [ ] **AML transaction monitoring در سطح Enterprise**
  - شکاف: rules و alerts موجود است ولی سناریوهای end-to-end AML، case handling، escalation chain و reporting-grade traceability کامل نیست.
  - طراحی هدف: KYC + transaction screening + case management + SAR/official reporting + evidence chain.
  - معیار پذیرش: alert-to-case-to-report flow عملیاتی و ممیزی‌پذیر باشد.

- [ ] **External screening sources واقعی**
  - شکاف: external sources بیشتر در سطح simulate/config دیده می‌شود.
  - طراحی هدف: sanctions, PEP, adverse media, suspicious fund sources با sync واقعی/قراردادی.
  - معیار پذیرش: source health، sync status و lineage داده قابل مشاهده باشد.

## ۵.۹) Complaints & Regulatory Escalation

- [ ] **Complaint orchestration دو‌لایه شرکت/بیمه مرکزی**
  - شکاف: ثبت و رسیدگی داخلی خوب است اما الگوی کامل escalation به بیمه مرکزی، category mapping و evidence pack کامل نیست.
  - طراحی هدف: complaint intake، categorization، routing، SLA، resolution، regulator export، closed-loop root cause analysis.
  - معیار پذیرش: هر شکایت به entityهای مرتبط وصل و برای regulator package آماده شود.

- [ ] **علت‌یابی ساختاری و preventive action**
  - شکاف: تحلیل علل پرتکرار وجود دارد ولی تبدیل آن به action tracking و process improvement loop کامل نیست.
  - طراحی هدف: root cause program + CAPA + trend analytics.
  - معیار پذیرش: هر دسته علت پرتکرار action owner و due date داشته باشد.

## ۵.۱۰) Sales Network / Agent / Broker

- [ ] **تکمیل واقعی پرتال نماینده**
  - شکاف: UI فعلی نماینده بیشتر demo/mock است و با APIهای backend هم در بعضی مسیرها ناسازگار است.
  - طراحی هدف: login/session واقعی، dashboard زنده، commission tracking، policy issuance assist، claims follow-up، customer portfolio.
  - معیار پذیرش: agent portal بدون داده hardcoded و با APIهای واقعی کار کند.

- [ ] **رفع ناسازگاری BFF و سرویس فروش شبکه**
  - شکاف: endpointهای مورد انتظار agent portal و sales-network هم‌راستا نیستند.
  - طراحی هدف: API contract canonical برای agent-facing queries.
  - معیار پذیرش: dashboard نماینده در runtime بدون 404 و mapping workaround اجرا شود.

- [ ] **قابلیت‌های توسعه شبکه فروش**
  - شکاف: آموزش، lead management، next best action، retention campaigns و gamification کامل نیست.
  - طراحی هدف: digital distribution platform با insightهای AI.
  - معیار پذیرش: agent productivity dashboard و action recommendations عملیاتی باشد.

## ۵.۱۱) Customer Portal / Self-service

- [ ] **تکمیل Customer Portal واقعی**
  - شکاف: UI مشتری محدود است و بسیاری از journeyهای کلیدی هنوز پوشش ندارد.
  - طراحی هدف: OTP/login، dashboard، policy wallet، claim tracking، document upload، complaint filing، payment history، endorsements، renewals، self-service assistant.
  - معیار پذیرش: حداقل ۸۰٪ درخواست‌های رایج مشتری بدون تماس انسانی انجام شود.

- [ ] **Omnichannel customer experience**
  - شکاف: mobile-first, notifications, chat, assisted journeys، accessibility و proactive engagement کامل نیست.
  - طراحی هدف: web/mobile/PWA + notifications + conversational self-service.
  - معیار پذیرش: نرخ completion journey و رضایت مشتری قابل پایش باشد.

## ۵.۱۲) Reinsurance

- [ ] **تکمیل اتکایی در سطح Core Insurance**
  - شکاف: اجزای خوبی وجود دارد ولی treaty/facultative breadth، bordereaux lifecycle، dispute resolution و finance integration کامل نیست.
  - طراحی هدف: contract lifecycle، cession engine، statementing، recoveries، reconciliation، ticketing، financial postings.
  - معیار پذیرش: فرآیند صدور و خسارت به‌طور خودکار اثر اتکایی ایجاد کند و صورت‌حساب/مغایرت عملیاتی باشد.

- [ ] **پشتیبانی کامل از اتکایی قانونی و اختیاری ایران**
  - شکاف: سناریوهای mandatory cession، صورتحساب‌های دوره‌ای، کد یکتا و ارتباط با بیمه مرکزی نیاز به hardening دارند.
  - طراحی هدف: Iran-specific reinsurance operating model.
  - معیار پذیرش: مغایرت‌گیری و پیگیری صورتحساب به‌صورت end-to-end انجام شود.

## ۵.۱۳) Regulatory Gateway / Sanhab / Government Integrations

- [ ] **واقعی‌سازی کامل integrationهای بیرونی**
  - شکاف: بخشی از integrationها mock/simulated یا وابسته به setup ناقص هستند.
  - طراحی هدف: connectorهای production-grade با contract tests, health checks, retry, circuit breaker, audit, masking.
  - معیار پذیرش: هر integration دارای runbook، credential model، health endpoint و fallback policy باشد.

- [ ] **رفع dependency gapهای runtime**
  - شکاف: برای نمونه مسیر real Sanhab به dependency و setup واقعی نیاز دارد.
  - طراحی هدف: deployment-ready dependency manifest و operational verification.
  - معیار پذیرش: سناریوی real integration بدون خطای missing package/config اجرا شود.

- [ ] **پشتیبانی چندکاناله استعلام و پاسخگویی**
  - شکاف: وب، پیامک، VIN، دولت همراه، کارپوشه و مسیرهای جایگزین هنوز در یک تجربه یکپارچه جمع نشده‌اند.
  - طراحی هدف: multi-channel inquiry orchestration.
  - معیار پذیرش: اپراتور و مشتری بتوانند از مسیر جایگزین استفاده کنند و trail کامل حفظ شود.

## ۵.۱۴) Document Service / Document AI

- [ ] **تکمیل document operating system**
  - شکاف: OCR و extraction خوب است ولی taxonomy، retention، legal hold، evidence chain و content intelligence کامل نیست.
  - طراحی هدف: document ingestion, classification, extraction, validation, lineage, retention, secure retrieval.
  - معیار پذیرش: هر سند از upload تا consumption در claims/policy/complaint traceable باشد.

- [ ] **Validation against business context**
  - شکاف: extraction وجود دارد ولی cross-check با policy/claim/product rules باید عمیق‌تر شود.
  - طراحی هدف: business validation engine برای اسناد.
  - معیار پذیرش: خطاهای استخراج و مغایرت‌های business به work item تبدیل شوند.

## ۵.۱۵) Copilot / Knowledge Layer / Model Switchboard

- [ ] **Knowledge-grounded Copilot کامل**
  - شکاف: copilot capabilityها وجود دارد ولی grounding سازمانی، retrieval governance و source trust ranking کامل نیست.
  - طراحی هدف: Vector DB + Knowledge Graph + citation + access-aware retrieval.
  - معیار پذیرش: پاسخ‌های copilot citation و source provenance داشته باشند.

- [ ] **مدیریت مرکزی انتخاب مدل**
  - شکاف: model switchboard در blueprint مهم است اما operating integration آن با همه use caseها باید یکپارچه شود.
  - طراحی هدف: selection بر اساس cost, latency, privacy, risk, accuracy, availability.
  - معیار پذیرش: هر AI call از policy engine مدل استفاده کند نه انتخاب پراکنده در سرویس‌ها.

- [ ] **GenAI safety و anti-hallucination controls**
  - شکاف: guardrailها در طراحی آمده ولی نیازمند enforcement سرتاسری، evaluation suite و policy gating است.
  - طراحی هدف: prompt defense، output policy، hallucination scoring، sensitive-action blocking.
  - معیار پذیرش: use caseهای high-risk بدون grounding و HITL اجازه اجرا نداشته باشند.

## ۵.۱۶) AI Governance / MLOps / LLMOps

- [ ] **تبدیل AI Governance از entity-level به operating capability**
  - شکاف: بعضی artifacts مثل inventory/card/report تعریف شده‌اند، اما اگر سرویس/چرخه مستقل و committee process نداشته باشد هنوز governance کامل نیست.
  - طراحی هدف: model lifecycle governance شامل intake, risk assessment, validation, approval, deployment, monitoring, retirement.
  - معیار پذیرش: هر مدل active، owner، risk class، validation status، monitoring status و rollback plan داشته باشد.

- [ ] **استقرار ساختار سازمانی حاکمیت AI**
  - شکاف: نقش‌های MRO، Validator، Data Owner، AI Governance Committee در سیستم و workflowها بازتاب کامل ندارند.
  - طراحی هدف: role-driven approval workflows و SoD.
  - معیار پذیرش: مدل medium/high risk بدون approval chain قابل استقرار نباشد.

- [ ] **Operational monitoring برای مدل‌ها**
  - شکاف: drift و explainability در برخی بخش‌ها هست ولی model-wide KPI, incident handling, retraining cadence و audit cadence کامل نیست.
  - طراحی هدف: AI operations dashboard سرتاسری.
  - معیار پذیرش: latency، quality، drift، bias، cost و incidents برای هر مدل قابل پایش باشد.

## ۵.۱۷) Workflow / Rule Engine / Case Management

- [ ] **یکپارچه‌سازی واقعی workflow engine با همه دامنه‌ها**
  - شکاف: workflow و work item وجود دارد اما همه فرآیندهای حساس هنوز کاملاً مدل‌محور نشده‌اند.
  - طراحی هدف: BPM/workflow برای issuance, claim, complaint, AML, fraud, reinsurance, onboarding.
  - معیار پذیرش: تغییر فرایندها بیشتر از طریق config/workflow definition انجام شود نه تغییر کد.

- [ ] **Rule lifecycle governance**
  - شکاف: rule engine باید draft/test/approve/deploy/rollback و impact analysis رسمی داشته باشد.
  - طراحی هدف: managed rules platform.
  - معیار پذیرش: همه ruleهای حساس version, owner, test evidence و deployment trail داشته باشند.

## ۵.۱۸) Reporting / Executive BI / Analytics

- [ ] **Executive cockpit در سطح جهانی**
  - شکاف: dashboardهایی وجود دارد اما KPI framework کامل برای market share, combined ratio, retention, NPS, leakage, fraud yield, straight-through processing کامل نیست.
  - طراحی هدف: مدیریتی، عملیاتی، ریسکی و AI KPIها در چند لایه.
  - معیار پذیرش: مدیرعامل، COO، CFO، CRO، Head of Claims و Sales هر کدام view اختصاصی داشته باشند.

- [ ] **Canonical KPI governance**
  - شکاف: تعریف، منبع، دوره‌بندی و ownership KPIها هنوز نیاز به formalization دارد.
  - طراحی هدف: KPI catalog با lineage.
  - معیار پذیرش: هر KPI دارای formula، refresh policy، source systems و owner باشد.

## ۵.۱۹) UI / UX / Design System

- [ ] **یکپارچه‌سازی طراحی فرانت‌های متعدد**
  - شکاف: admin UI، customer portal و agent portal از نظر maturity و integration هم‌سطح نیستند.
  - طراحی هدف: design system مشترک، BFF strategy، auth consistency، navigation consistency.
  - معیار پذیرش: همه UIها از یک language system و interaction model پیروی کنند.

- [ ] **Enterprise UX برای نقش‌های عملیاتی**
  - شکاف: بسیاری از صفحات از نظر usability، empty states، bulk workflow، keyboard productivity و work queues نیاز به بلوغ بیشتر دارند.
  - طراحی هدف: role-based cockpitها برای adjuster، underwriter، SIU، AML officer، complaint officer، agent manager.
  - معیار پذیرش: task completion time و training time برای کاربران کلیدی کاهش یابد.

## ۵.۲۰) Data Governance / Security / Privacy / Audit

- [ ] **پیاده‌سازی Data Inventory رسمی**
  - شکاف: موجودی داده و طبقه‌بندی سرتاسری به‌عنوان artifact سازمانی دیده نمی‌شود.
  - طراحی هدف: catalog برای data sources, owners, sensitivity, retention, lawful basis.
  - معیار پذیرش: همه datasetهای کلیدی در inventory ثبت شده باشند.

- [ ] **Append-only audit و legal-grade traceability**
  - شکاف: audit وجود دارد اما برای همه عملیات حساس و AI interactions باید immutable-grade policy طراحی شود.
  - طراحی هدف: tamper-evident audit architecture.
  - معیار پذیرش: عملیات حساس و AI decisions قابل بازسازی و ممیزی باشند.

- [ ] **Privacy operating controls**
  - شکاف: masking و minimization هست، اما data subject requests، consent lineage، retention exceptions و purpose-based access باید formal شود.
  - طراحی هدف: privacy control plane.
  - معیار پذیرش: هر داده حساس policy و purpose روشن داشته باشد.

## ۵.۲۱) Platform Engineering / SRE / NFR

- [ ] **Production readiness واقعی همه سرویس‌ها**
  - شکاف: وجود سرویس در compose یا repository به‌معنای operational readiness نیست.
  - طراحی هدف: readiness checklist per service شامل config, migration, health, backup, alerts, runbook, dashboard, scaling, DR.
  - معیار پذیرش: هر سرویس runbook و production checklist کامل داشته باشد.

- [ ] **NFR governance**
  - شکاف: availability، latency، throughput، RPO/RTO، capacity و performance budgetها به‌صورت formal و per-domain نیاز به تثبیت دارند.
  - طراحی هدف: SLO per journey.
  - معیار پذیرش: issuance، claims و AI APIها SLO تعریف‌شده و alarm داشته باشند.

- [ ] **Chaos/resilience hardening**
  - شکاف: circuit breaker و bulkhead وجود دارد اما failure mode verification و game dayها کامل نیست.
  - طراحی هدف: resilience engineering program.
  - معیار پذیرش: سناریوهای قطعی DB/Kafka/external integration test شده باشند.

## ۵.۲۲) تست و تضمین کیفیت

- [ ] **بازنگری اعتبار چک‌لیست تست فعلی**
  - شکاف: بخشی از completion فعلی باید از منظر runtime truth و real integration بازبینی شود.
  - طراحی هدف: evidence-based QA matrix.
  - معیار پذیرش: هر تست به capability واقعی و service version مرتبط باشد.

- [ ] **Golden journey tests برای نقش‌های کلیدی**
  - شکاف: journeyهای مشتری، نماینده، کارشناس، AML officer، SIU و regulator-facing هنوز باید به‌صورت end-to-end استاندارد شوند.
  - طراحی هدف: role journey regression suite.
  - معیار پذیرش: golden flows روی CI/CD و pre-release gates اجرا شوند.

---

## ۶) شکاف‌های بحرانی که باید فوراً اصلاح شوند

### P0 — حیاتی

- [ ] همسان‌سازی سند وضعیت با کد واقعی
- [ ] رفع ناسازگاری `agent-portal-service` و `sales-network-service`
- [ ] واقعی‌سازی `agent-portal-ui` و حذف داده‌های hardcoded
- [ ] تکمیل واقعی `customer-portal-ui` برای journeyهای کلیدی
- [ ] تبدیل AI Governance به سرویس/قابلیت عملیاتی واقعی
- [ ] تکمیل deployment readiness برای integrationهای واقعی سنهاب و سرویس‌های بیرونی
- [ ] تعریف Source of Truth برای capability map، maturity و ownership
- [ ] تعریف KPI catalog رسمی و business ownership

### P1 — مهم

- [ ] تکمیل omnichannel FNOL و customer self-service
- [ ] تکمیل sales network productivity suite
- [ ] تکمیل complaint-to-regulator operating model
- [ ] تکمیل AML case management و external screening واقعی
- [ ] تکمیل reinsurance mandatory/optional operating flows
- [ ] تکمیل knowledge-grounded copilot با citation
- [ ] formalization of IAM/SSO/SoD

### P2 — مزیت رقابتی جهانی

- [ ] personalization engine برای فروش و نگهداشت
- [ ] next best action در همه دامنه‌ها
- [ ] sentiment/voice analytics
- [ ] proactive claims/customer communication
- [ ] market intelligence و benchmark analytics
- [ ] closed-loop optimization برای ruleها، مدل‌ها و journeyها

---

## ۷) طراحی هدف برای «برترین سامانه بیمه ایران با استاندارد جهانی»

## ۷.۱) ویژگی‌های متمایزکننده محصول نهایی

- **صدور سریع و دقیق** با کیفیت داده بالا و کمترین خطای رگولاتوری
- **خسارت هوشمند و کم‌اصطکاک** با FNOL دیجیتال، triage خودکار و تصمیم‌یار کارشناسان
- **پرتال مشتری ممتاز** با self-service واقعی و پیگیری شفاف
- **پرتال نماینده توانمندساز** نه صرفاً نمایشی
- **ضدتقلب و AML پیشرفته** با graph analytics، explainability و case management
- **Copilot قابل‌اعتماد** با grounding، citation و HITL
- **اتکایی و گزارش‌دهی سازمانی** در سطح Core
- **داشبورد مدیریتی واقعی** برای سودآوری، توانگری، رضایت، تقلب، SLA و کیفیت عملیات
- **حاکمیت AI در سطح هیئت‌مدیره‌پسند** با artifactها، approval chain و ممیزی کامل

## ۷.۲) خطوط طراحی تجربه کاربری

- یک **Admin/Operations Workspace** برای کاربران داخلی
- یک **Customer Experience Workspace** برای مشتریان
- یک **Sales Network Workspace** برای نماینده/کارگزار
- یک **Executive Workspace** برای مدیران ارشد
- یک **Governance Workspace** برای ریسک، امنیت، AML و AI governance

## ۷.۳) خطوط طراحی فنی

- BFFهای مجزا برای `admin`, `customer`, `agent`
- Canonical query contracts برای UIها
- Event catalog نهایی و schema registry
- Central config/rule/workflow platform
- Knowledge layer و model routing مشترک
- Secure document pipeline و evidence vault
- Observability و runbook baseline برای همه سرویس‌ها

---

## ۸) برنامه پیشنهادی تکمیل در ۵ موج

## موج ۱: Truth & Stabilization

- [ ] ایجاد capability registry و maturity map
- [ ] اصلاح چک‌لیست فعلی بر اساس runtime truth
- [ ] رفع contract mismatchهای backend/frontend
- [ ] تعیین service ownership و production readiness baseline

## موج ۲: Core Operational Completion

- [ ] تکمیل customer portal و agent portal
- [ ] تکمیل underwriting, claims routing, complaint escalation, AML case flow
- [ ] hardening integrationهای سنهاب/OTP/payment

## موج ۳: Intelligence & Automation

- [ ] تکمیل knowledge layer، switchboard و copilot grounded
- [ ] تکمیل fraud closed-loop و AI assist در underwriting/claims/complaints
- [ ] تکمیل document intelligence و business validation

## موج ۴: Governance & Enterprise Controls

- [ ] پیاده‌سازی operating model کامل AI governance
- [ ] formalization of data governance, privacy, SoD, audit immutability
- [ ] KPI governance و executive scorecards

## موج ۵: Competitive Differentiation

- [ ] personalization, NBA, proactive servicing, voice/sentiment
- [ ] advanced benchmarking، market intelligence و optimization loops
- [ ] rollout playbooks برای استقرار چندشرکتی

---

## ۹) معیار پذیرش کلان برای اتمام پروژه

پروژه زمانی «تکمیل‌شده در سطح Enterprise» محسوب می‌شود که:

- [ ] تمام دامنه‌های اصلی دارای owner، maturity level و runbook باشند.
- [ ] هیچ UI کلیدی به داده hardcoded یا simulate وابسته نباشد.
- [ ] همه integrationهای حیاتی حداقل یک مسیر real production-ready داشته باشند.
- [ ] journeyهای اصلی مشتری، نماینده، خسارت، شکایت و AML به‌صورت end-to-end تست شوند.
- [ ] تمام use caseهای AI دارای governance، monitoring، approval و fallback باشند.
- [ ] KPIهای عملیاتی و مدیریتی از داده واقعی و traceable تغذیه شوند.
- [ ] سامانه برای یک شرکت بیمه ایرانی بدون فورک کد و با پیکربندی قابل استقرار باشد.
- [ ] الزامات رگولاتوری، ممیزی، نگهداری داده و حریم خصوصی قابل اثبات باشند.

---

## ۱۰) خروجی‌های اجرایی که باید بعداً بر اساس این سند تولید شوند

- [ ] Capability Registry تفصیلی به تفکیک سرویس/دامنه/API/UI/Test
- [ ] Target Operating Model برای واحدهای کسب‌وکار و فناوری
- [ ] Canonical API & Event Catalog نهایی
- [ ] Tenant Deployment Blueprint
- [ ] Data Inventory & Classification Register
- [ ] AI Governance Operating Handbook
- [ ] UI/BFF Consolidation Plan
- [ ] Production Readiness Checklist per Service
- [ ] Gap-to-Epic Delivery Backlog

---

## ۱۱) جمع‌بندی

این پروژه پایه مناسبی دارد، اما برای رسیدن به «برترین سامانه بیمه ایران با استاندارد جهانی» باید از حالت **feature accumulation** به سمت **capability completion** حرکت کند.

یعنی تمرکز بعدی باید این باشد:

- تکمیل قابلیت‌های واقعی به‌جای افزایش صرف تعداد endpointها
- واقعی‌سازی integrationها و portalها
- تبدیل AI از capability پراکنده به operating system قابل‌اعتماد
- رسمی‌سازی governance، ownership، NFR و readiness
- ساخت تجربه یکپارچه برای مشتری، نماینده، کارشناس و مدیر

این سند، مبنای رسمی برای استخراج backlog تکمیل نواقص و طراحی فازهای بعدی است.
