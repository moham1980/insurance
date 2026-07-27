# دامنه و خدمات سرویس‌های پلتفرم هوش مصنوعی بیمه

> **پیش‌فرض:** تمام اشکالات ممیزی رفع شده‌اند. این سند دامنه و خدماتی که هر سرویس **قرار است** ارائه دهد را توصیف می‌کند.

---

## ۱. auth-service (احراز هویت و مدیریت دسترسی)

**پورت:** 18001

**دامنه:** مدیریت هویت، احراز هویت، کنترل دسترسی مبتنی بر نقش (RBAC) و صفات (ABAC) برای کل پلتفرم بیمه.

**خدمات:**
- ثبت‌نام، ورود، مدیریت پروفایل کاربران
- ۲۱ نقش تخصصی بیمه‌ای ایران (insurer_admin, underwriter, claims_handler, loss_adjuster, fraud_analyst, compliance_aml و غیره)
- ۴۲ مجوز دقیق بیمه‌محور (policy:quote, claims:assess, fraud:triage, aml:review و غیره)
- سلسله‌مراتب نقش‌ها با وراثت
- قوانین تفکیک وظایف (SoD) برای جلوگیری از تضاد منافع
- ABAC با ۱۰ قانون پیش‌فرض (ایزوله‌سازی واحد سازمانی، مالکیت منبع، محدودیت ساعات کاری)
- مدیریت Session با refresh token rotation و تشخیص reuse
- SSO با OIDC و SAML (Azure AD, Okta, Keycloak)
- Federation service برای Identity Provider‌های خارجی
- Service token برای احراز هویت بین‌سرویسی (TTL ۱۵ دقیقه)
- Audit logging با correlationId و tenantId
- گزارش‌گیری آماری دسترسی (deny rate, top denied resources/users)
- مدیریت واحد سازمانی با subtree authorization
- رمزنگاری داده‌های PII (کد ملی)
- Rate limiting و brute force protection
- Password policy (پیچیدگی، حداقل طول)

---

## ۲. claims-service (مدیریت ادعای خسارت)

**پورت:** 18002

**دامنه:** مدیریت چرخه حیات کامل ادعای خسارت (مرحله ۴ و ۵ فرایند بیمه ایران).

**خدمات:**
- چرخه حیات ادعا: registered → assessed → approved → paid → closed (با rejected و adjuster_review)
- FNOL (First Notification of Loss) با ثبت غنی: کانال اطلاع، موقعیت، شاهدان، مستندات
- Auto-triage بر اساس lossType و description با scoring (low/medium/high)
- Auto-assign loss adjuster بر اساس skill، geography و workload
- محاسبه دقیق franchise و deductible (مبلغ ثابت + درصد)
- اعتبارسنجی بیمه‌نامه قبل از پرداخت (status, coverage, period)
- پیش‌پر کردن فرم FNOL از اطلاعات بیمه‌نامه و بیمه‌گذار
- الگوی Outbox برای انتشار transactional رویدادها به Kafka
- ۹ نوع رویداد: ClaimRegistered, ClaimAssessed, ClaimApproved, ClaimRejected, ClaimPaid, ClaimClosed, ClaimReferredToAdjuster, ClaimPaymentRequested, ClaimAdjusterAssigned
- ارجاع به loss adjuster
- شروع Saga پرداخت خسارت از طریق orchestrator-service
- PII Masking واقعی برای داده‌های حساس
- Audit logging ساختاریافته

---

## ۳. payments-service (پرداخت خسارت)

**پورت:** 18004

**دامنه:** مدیریت چرخه حیات کامل پرداخت خسارت (مرحله ۵ فرایند بیمه ایران) با ادغام درگاه‌های پرداخت ایرانی.

**خدمات:**
- چرخه حیات پرداخت: prepared → finance_approved → executed → notified (با failed و cancelled)
- پشتیبانی از IRR (ریال ایران) به‌عنوان currency پیش‌فرض
- PSP integration با interface استاندارد (ملت، آسان‌پرداخت، صادرات، پارسیان)
- initiatePayment, verifyCallback (HMAC), reconcile, refund
- Gateway callback handling با تأیید signature
- Reconciliation برای مقایسه تراکنش‌های PSP با پرداخت‌های داخلی
- Refund و Dispute management
- Idempotency با idempotencyKey برای جلوگیری از پرداخت تکراری
- پشتیبانی از پرداخت جزئی (partial payment)
- Kafka consumer برای `ClaimPaymentRequested` — پرداخت خودکار پس از تأیید ادعا
- Dead Letter Queue برای مدیریت رویدادهای ناموفق
- ۶ نوع رویداد Kafka: PaymentPrepared, PaymentFinanceApproved, PaymentExecuted, PaymentFailed, PaymentNotified
- واریز به حساب بیمه‌گذار (IBAN)
- Audit logging و Correlation ID

---

## ۴. party-kyc-service (مدیریت طرف‌ها و شناخت مشتری)

**پورت:** 18006

**دامنه:** مدیریت طرف‌ها (اشخاص حقیقی و حقوقی) و فرایند شناخت مشتری (KYC) با ادغام AML.

**خدمات:**
- مدیریت طرف‌ها: ایجاد، مشاهده، لیست با فیلتر nationalId
- دو نوع طرف: individual و company
- چرخه حیات KYC با ۸ مرحله: data_collection → document_verification → aml_screening → risk_assessment → manual_review → approved/rejected/escalated
- محاسبه ریسک KYC با scoring (PEP, sanctions, adverse media, document quality, nationalId risk) و ۴ سطح ریسک
- AML screening با PEP, sanctions, adverse media checks
- AML Consent Management: grant, revoke, check validity
- Document Trust Chain با hash chain (قابل audit)
- Identity Proofing با face match, liveness check, document authenticity, dedup detection
- External Verification Services: sanctions, PEP, adverse_media, identity
- Exception Queue: raise, assign, resolve, escalate با severity
- SLA Enforcement با due date و overdue detection
- الگوی Outbox و Kafka برای انتشار رویدادها (PartyCreated, KycApproved, KycRejected, AmlScreeningCompleted)
- رمزنگاری nationalId و mobile
- Audit logging

---

## ۵. policy-service (مدیریت بیمه‌نامه)

**پورت:** 18007

**دامنه:** مدیریت چرخه حیات کامل بیمه‌نامه (۵ مرحله فرایند بیمه ایران) با ادغام سنهاب.

**خدمات:**
- چرخه حیات: inquiry → docs_pending → uw_pending → risk_assessed → issued → active (با uw_rejected, endorsed, cancelled, renewed)
- استعلام چندکاناله سنهاب: nationalId+uniqueCode, policyNumber, VIN
- SANHAB Quality Gate — بررسی اعتبار استعلام قبل از صدور و کد یکتا
- Quality Gate Override با دلیل و audit trail
- Policy Timeline — ترکیب changes و inquiries
- Convert Quote to Policy از product-service
- Endorsement با ۶ نوع (coverage_change, premium_change, beneficiary_change, address_change, vehicle_change, other)
- Auto-renewal: setAutoRenew, scheduleRenewal, approveRenewal, rejectRenewal
- Renewal reminder با reminderCount
- Policy archival job با retention policy (۵ سال retention)
- تأیید واقعی پرداخت حق بیمه از payments-service قبل از صدور
- ۱۲+ نوع رویداد Kafka: PolicyQuoted, PolicyIssued, PolicyEndorsed, PolicyCancelled, PolicyRenewed و غیره
- JWT forwarding در ارتباطات بین‌سرویسی
- Kafka consumer برای رویدادهای ورودی (PaymentCompleted, UnderwritingCompleted)
- Audit logging و Correlation ID

---

## ۶. document-service (مدیریت اسناد)

**پورت:** 18008

**دامنه:** مدیریت بارگذاری، ذخیره‌سازی و استخراج اسناد برای ادعا و اتکایی.

**خدمات:**
- دو روش بارگذاری: multipart upload (فایل فیزیکی) و link (ارجاع به storage خارجی)
- پشتیبانی از object storage (S3/MinIO)
- ۷ نوع سند: invoice, medical_report, police_report, photo, receipt, other, reinsurance_invoice
- وضعیت سند: pending → extracting → extracted / failed
- OCR/AI integration برای استخراج متن و فیلدها (extractedText, extractedFields)
- ذخیره metadata (JSONB) برای اطلاعات اضافی
- محدودیت حجم و نوع فایل (MIME whitelist)
- Antivirus scan
- Outbox pattern با OutboxWorker و KafkaProducer فعال
- ۵ نوع رویداد: DocumentUploaded, DocumentLinked, ClaimDocumentsAttached, ReinsuranceInvoiceArtifactStored, ReinsuranceInvoiceArtifactLinked
- Endpoint برای download/stream فایل
- Audit logging و Correlation ID

---

## ۷. fraud-service (تشخیص تقلب)

**پورت:** 18009

**دامنه:** تشخیص و مدیریت تقلب چندلایه در ادعاهای بیمه‌ای.

**خدمات:**
- سیستم تشخیص تقلب چندلایه: rule-based scoring + ML-based prediction + hybrid mode
- Rule-based scoring با signals قابل پیکربندی
- Fraud case lifecycle: open → investigating → confirmed / cleared
- Case escalation به SIU یا Legal با reasonCodes
- holdClaim flag برای متوقف کردن پردازش ادعا
- FraudScoreAudit برای audit trail
- ML Model Management: train, deploy, predict, delete با lifecycle کامل
- ML training و inference با external ML server
- Hybrid scoring: ترکیب rule-based (40%) و ML (60%) با fallback
- Feature extraction و validation metrics
- Graph/Network Analytics: entities (person, organization, provider, address, vehicle, phone) و relationships
- Suspicious network detection با BFS cluster detection
- Entity network analysis با centrality score
- Irregularity Alerts (Swiss Re Pattern): ۴ الگوی تشخیص
  - MULTIPLE_CLAIMS_SHORT_PERIOD
  - UNUSUAL_CLAIM_AMOUNT
  - RAPID_POLICY_ISSUANCE_CLAIM
  - REPEATED_LOSS_TYPE
- ML Drift Detection با scheduled detection و retraining
- ML Explainability: local explanation, counterfactual, batch explanations
- Kafka consumer برای ClaimCreated و ClaimDocumentsAttached
- ۴ نوع رویداد: FraudScoreComputed, FraudCaseOpened, FraudCaseEscalated, FraudCaseClosed
- Timeout و Circuit Breaker در ارتباط با ML server
- Audit logging

---

## ۸. orchestrator-service (هماهنگ‌کننده Saga)

**پورت:** 18010

**دامنه:** هماهنگ‌سازی فرایندهای چندسرویسی با Saga orchestration pattern.

**خدمات:**
- ۵ نوع Saga: ClaimPayment, PolicyIssuance, ComplaintHandling, ComplaintResolution, ReinsuranceRecovery
- Saga lifecycle: started → waiting → completed / failed / compensating / compensated
- ClaimPayment saga: INITIATED → FRAUD_CHECK → HUMAN_APPROVAL (amount > threshold) → PAYMENT_PREPARE → FINANCE_APPROVAL → PAYMENT_EXECUTE → PAYMENT_NOTIFY → COMPLETED
- PolicyIssuance saga: INITIATED → UNDERWRITING_REVIEW → SANHAB_FOLLOWUP → OVERRIDE_REVIEW → COMPLETED
- ComplaintResolution saga: INITIATED → COMPLAINT_TRIAGE → COMPLAINT_SLA_BREACH → COMPLETED
- ReinsuranceRecovery saga: INITIATED → RECOVERY_IDENTIFIED → RECOVERY_RECEIVED → COMPLETED
- Work Item management: create, assign, complete (approved/rejected/escalated), list
- Work Item priority: low, medium, high, critical
- Saga Step tracking با retry, duration, compensation status
- Saga Compensation/Rollback با per-step compensation actions
- Deduplication با dedupeKey
- Kafka consumer برای ۹ topic از ۴ سرویس (payments, fraud, complaints, document-ai)
- Dead Letter Queue با retry processor
- Idempotency با consumeOnce
- SLA Monitor Service با scheduled breach detection و escalation
- Outbox pattern برای انتشار saga events
- Audit logging و Correlation ID

---

## ۹. feature-flags-service (مدیریت Feature Flag)

**پورت:** 18011

**دامنه:** مدیریت feature flag و AI toggle برای کنترل رفتار پلتفرم.

**خدمات:**
- FeatureFlag: name, description, isEnabled, rolloutPercentage, targetAudience
- AiToggle: name, description, isEnabled, modelName, modelVersion, config
- Upsert logic برای ایجاد/به‌روزرسانی flag‌ها
- Flag‌های پیش‌فرض: ai.enabled, copilot.enabled, document_ai.enabled
- Caching با Redis برای performance بالا
- Kafka notification برای تغییرات flag به سایر سرویس‌ها
- Audit logging برای تغییرات
- GET endpoint‌ها با authentication برای دسترسی امن سرویس‌ها
- PUT endpoint‌ها با JwtAuthGuard + PermissionsGuard
- Validation برای rolloutPercentage (0-100)

---

## ۱۰. claims-readmodel-service (مدل خواندنی ادعا — CQRS)

**پورت:** 18012

**دامنه:** مدل خواندنی CQRS برای ادعا، تقلب، شکایت و اتکایی جهت گزارش‌گیری و داشبورد.

**خدمات:**
- ۳ projection: RmClaimCase, RmFraudCase, RmComplaintOps
- Kafka consumer برای ۱۷ topic از ۴ دامنه (claims, fraud, complaints, reinsurance)
- Idempotency با ConsumedEvent
- Upsert logic برای هر projection
- Query endpoints: list claims (filter by policyId, status), get claim by ID, claims summary
- List fraud cases (filter by status, minScore)
- List complaints ops (filter by status, complaintType)
- Pagination با cap
- Dead Letter Queue برای مدیریت خطا
- Error handling در Kafka consumer
- Schema جداگانه (claims_rm)
- Audit logging

---

## ۱۱. complaints-service (مدیریت شکایات)

**پورت:** 18013

**دامنه:** مدیریت چرخه حیات کامل شکایات بیمه‌ای با ادغام مرکز بیمان.

**خدمات:**
- Complaint lifecycle: create → escalate → update_status → resolve
- ۹ نوع شکایت: issuance, claims_with_case, claims_without_case, agent, broker, loss_adjuster, unauthorized_office, fund, other
- ۵ وضعیت: open, in_review, resolved, closed, escalated
- Mobile OTP verification با SHA-256 hash+salt, rate limiting, TTL, max attempts
- SLA breach worker با leader election (pg_try_advisory_lock) برای multi-instance
- SLA first response و resolution due dates
- Dashboard endpoint با totals by status, type, SLA overdue counts
- Recurring causes analysis با Persian/English keyword extraction (۲۰ cause category)
- Cause trends با daily aggregation
- Central Insurance integration: send, retry, tracking number, auto-send on resolution
- Mobile verification required قبل از export
- ۸ Kafka event: ComplaintCreated, ComplaintEscalated, ComplaintSlaBreached, ComplaintResolved, ComplaintStatusChanged, ComplaintAttachmentAdded, ComplaintMobileOtpRequested, ComplaintMobileVerified
- Outbox pattern با OutboxWorker
- Audit trail کامل (ComplaintAudit entity)
- Timeout و retry در Central Insurance API
- Integration با notification-service برای SMS delivery

---

## ۱۲. reporting-service (گزارش‌گیری و داشبورد اجرایی)

**پورت:** 18014

**دامنه:** مدل خواندنی CQRS جامع برای گزارش‌گیری، KPI و داشبورد اجرایی.

**خدمات:**
- ۱۸ projection/entity برای پوشش تمام دامنه‌ها
- Kafka consumer برای ۲۳ topic از ۷ دامنه (policy, claim, payment, fraud, complaint, reinsurance, document)
- Idempotency با ConsumedEvent
- Projection upsert logic برای هر دامنه:
  - Policy lifecycle (quotedAt → issuedAt → uniqueCodeSetAt)
  - Claim payment (registeredAt → paymentRequestedAt → claimPaidAt)
  - Fraud signal (latestScore, holdClaim, caseOpenedAt/ClosedAt)
  - Reinsurance (ceded, borderaux, recovery)
  - Complaint SLA breach
- KPI Governance: allowedPeriodGranularities, sourceSystem validation, unit validation, min/max value
- KPI Snapshot ingestion با idempotency key
- KPI Ingestion Audit
- Ready KPIs: issuanceSpeed, claimPayoutTime, fraudIdentifiedRate
- Executive Dashboard
- Query endpoints برای policies, payments, sales-partners, AML transactions, underwriting
- Dead Letter Queue برای مدیریت خطا
- Error handling در Kafka consumer
- Pagination با cap
- Schema جداگانه (reporting)
- Audit logging

---

## ۱۳. aml-service (مبارزه با پولشویی)

**پورت:** 18016

**دامنه:** مدیریت قوانین، هشدارها و گزارش‌های مبارزه با پولشویی (AML) برای تراکنش‌های بیمه‌ای.

**خدمات:**
- AML Consent management: ایجاد، مشاهده، لیست، ابطال با تاریخ اعتبار
- AML Rule management با ۵ نوع قانون: threshold, pattern, velocity, aggregate, behavioral
- Rule expression evaluation امن (بدون code injection)
- AML Alert management با state machine: open → in_review → cleared / escalated / closed
- Alert Decision tracking با snapshot
- ارزیابی خودکار تراکنش‌ها بر اساس قوانین فعال
- تعیین سطح ریسک: low, medium, high, critical با risk score
- ایجاد خودکار هشدار برای قوانین نقض‌شده
- Kafka consumer برای ۵ topic: payment.completed, policy.issued, claim.registered, claim.paid, collection.received
- Idempotency در Kafka consumer
- انتشار رویدادهای AML به Kafka (AmlAlertCreated, AmlAlertEscalated)
- External Data Source: CRUD، sync، query با timeout
- گزارش‌های رسمی AML: SAR (Suspicious Activity Report)، CTR (Currency Transaction Report)، Annual Summary Report
- Dashboard با totals by status و severity
- Export snapshot (consents, rules, alerts)
- Dead Letter Queue برای مدیریت خطا
- Audit logging و Correlation ID

---

## ۱۴. reinsurance-service (اتکایی)

**پورت:** 18017

**دامنه:** مدیریت کامل عملیات اتکایی شامل پیمان‌ها، واگذاری‌ها، صورت‌وضعیت، تطبیق، و بازیافت خسارت.

**خدمات:**
- Treaty management: ایجاد، مشاهده، لیست، به‌روزرسانی، بستن
  - ۳ نوع پیمان: quota_share, excess of loss, surplus
  - فیلتر بر اساس خط کسب و کد محصول
- Cession management: ایجاد، مشاهده، لیست، به‌روزرسانی، تأیید
  - محاسبه خودکار واگذاری بر اساس نوع پیمان
  - Auto-cession روی صدور بیمه‌نامه (Kafka consumer برای PolicyIssued)
- Statement management: ایجاد، مشاهده، لیست، به‌روزرسانی
  - ۲ نوع: bordereaux, period close
  - انتشار رویداد borderaux_generated
- Reconciliation management: ایجاد، مشاهده، لیست، به‌روزرسانی
  - ثبت فاکتور خارجی
  - تطبیق خودکار فاکتور با confidence scoring (amount match, reinsurer name, date)
- Claim Recovery management: ایجاد، مشاهده، لیست، به‌روزرسانی
  - وضعیت: open → partially_collected → collected → closed
  - انتشار رویداد recovery_identified و recovery_received
  - Follow-up tracking
- Ticket management: ایجاد، مشاهده، لیست، تخصیص، به‌روزرسانی
  - پیام‌های داخلی/خارجی
  - پیوست‌ها
  - SLA response hours قابل پیکربندی
- Period close با DB transaction
  - محاسبه صحیح مجموع واگذاری‌ها
  - بستن واگذاری‌ها
  - انتشار رویداد period_closed
- Export snapshot
- Outbox pattern با OutboxWorker
- ۵ Kafka event: ri.ceded_calculated, ri.borderaux_generated, ri.recovery_identified, ri.recovery_received, reinsurance.period_closed
- Audit logging و Correlation ID

---

## ۱۵. product-service (مدیریت محصول بیمه)

**پورت:** 18018

**دامنه:** مدیریت کاتالوگ محصولات بیمه‌ای شامل پوشش‌ها، فرانشیز، قوانین قیمت‌گذاری و موتور استعلام قیمت.

**خدمات:**
- Product management: ایجاد، مشاهده، لیست، به‌روزرسانی، بایگانی
  - Version snapshot در هر به‌روزرسانی (ProductVersion)
  - تاریخچه نسخه‌ها
  - فیلتر بر اساس خط کسب
  - جستجو با ILIKE
- Coverage management: ایجاد، مشاهده، لیست، به‌روزرسانی، بایگانی
  - Terms به‌صورت JSONB
  - Duplicate prevention per product
- Deductible management: ایجاد، مشاهده، لیست، به‌روزرسانی، بایگانی
  - ۲ نوع: fixed_amount, percent
- Pricing Rule management: ایجاد، مشاهده، لیست، به‌روزرسانی، بایگانی
  - ۶ نوع قانون: base, conditional, tiered, regional, discount, surcharge
  - Priority-based ordering
  - ValidFrom/ValidTo date range
  - Regions array برای قوانین منطقه‌ای
  - Conditions JSONB برای قوانین شرطی
- Quote engine: محاسبه حق بیمه بر اساس قوانین قیمت‌گذاری
  - Base premium accumulation
  - Adjustment matching (eq, in, gte, lte operators)
  - Adjustment types: add, multiplier, percent
  - Tiered rules با min/max ranges
  - Regional rules با region matching
  - Discount و surcharge
- Outbox pattern و Kafka event production برای تغییرات محصول
- Export snapshot
- Pagination با cap
- Audit logging و Correlation ID

---

## ۱۶. monitoring-service (پایش و هشدار)

**پورت:** 18020

**دامنه:** پایش سلامت پلتفرم، مدیریت SLO، هشداردهی و قابل‌ ردیابی توزیع‌شده (Distributed Tracing).

**خدمات:**
- Prometheus metrics با prom-client:
  - Default metrics collection
  - Dynamic metric registration (counter, gauge, histogram)
  - `/metrics` endpoint با Prometheus content type
  - Metric persistence در DB
- SLO management:
  - ایجاد و لیست SLO
  - ارزیابی خودکار با cron (هر ۵ دقیقه)
  - ۳ نوع: availability, latency, error_rate
  - وضعیت: healthy, at_risk, breached
  - ایجاد خودکار هشدار در نقض SLO
- Alert management:
  - لیست هشدارها (فیلتر by status, severity, serviceName)
  - تأیید هشدارها
  - وضعیت: firing → acknowledged → resolved
  - Deduplication
  - نگاشت شکایت SLA breach به severity
- Dashboard:
  - SLO stats و Alert stats در بازه ۲۴ ساعته
- Kafka consumer برای `insurance.complaint.sla_breached` با shared KafkaConsumer
  - Dead Letter Queue
  - Idempotency با consumeOnce
- OpenTelemetry:
  - Jaeger exporter
  - Prometheus exporter
  - Instrumentation: HTTP, Fastify, NestJS, PostgreSQL, Kafka
  - Span, metric, event, exception recording
- Jaeger client:
  - Query و retrieval trace
  - Service و operation discovery
  - Dependency graph
- Alerting service:
  - ۴ کانال: email, pager, slack, webhook
  - ۸ predefined alert rule (high-error-rate, service-down, high-latency, db-pool-exhausted, kafka-lag, memory-high, disk-low, fraud-spike)
  - Cooldown management
  - Alert lifecycle (pending → sent/failed)
- Schema جداگانه (monitoring)
- Audit logging و Correlation ID

---

## ۱۷. document-ai-service (هوش مصنوعی پردازش اسناد)

**پورت:** 18021

**دامنه:** پردازش هوشمند اسناد بیمه‌ای با استخراج متن، تحلیل محتوا و ارزیابی کیفیت با استفاده از چندین ارائه‌دهنده AI.

**خدمات:**
- Kafka consumer برای ۳ topic: document.uploaded, document.linked, claim.documents_attached
- Multi-provider extraction با fallback: OCR، Gemini (Google AI)، DeepSeek
- Multi-provider analysis با fallback: DeepSeek (متن فارسی)، Gemini (تحلیل بیمه‌ای)
- Confidence scoring با threshold قابل پیکربندی
- Business validation: فاکتور (مبلغ، شماره)، کد ملی ایرانی (۱۰ رقم)، گواهینامه رانندگی
- Tenant daily budget limits (job + AI request)
- Job worker با retry، lock mechanism و DLQ
- Job deduplication با dedupeKey
- ارجاع به orchestrator-service برای اسناد نیاز به بازبینی
- Outbox event publishing: document.extracted, document.extraction.needs_review
- Audit trail کامل (DocumentAiAudit)
- Eval framework: eval case management، eval run، eval result
- Usage tracking روزانه per tenant
- مدیریت و بازبینی job‌ها (list, get, retry)
- Schema جداگانه (document_ai)
- Audit logging و Correlation ID

---

## ۱۸. sales-network-service (شبکه فروش)

**پورت:** 18022

**دامنه:** مدیریت شبکه فروش بیمه شامل نمایندگان، کارگزاران، پورسانت و شاخص‌های عملکرد.

**خدمات:**
- Sales Partner management: ایجاد/به‌روزرسانی با org unit
  - ۴ نوع: agency, broker, individual_agent, bancassurance
  - وضعیت: pending → verified → suspended/terminated
  - Org unit-based access control
- Commission Contract management: ایجاد، فعال‌سازی
  - Base: premium_gross یا premium_net
  - Rate در basis points + fixed fee
  - Effective date range، line of business filter
- Commission Ledger:
  - محاسبه خودکار پورسانت از رویداد PolicyIssued
  - وضعیت: accrued → paid (با void)
  - بازمحاسبه پورسانت
- Policy Attribution: پیوند خودکار policyId → orgUnitId
- KPI Daily aggregation از ۴ رویداد: PolicyIssued, PolicyRenewed, PolicyCancelled, ComplaintCreated
  - شاخص‌ها: policiesIssued, renewed, cancelled, complaintsCreated, premiumIssued, commissionAccrued
- Agent Summary: اطلاعات کامل نماینده با مجموع policy، premium، commission
- Performance Trend Reporting با ۶ شاخص و ۳ گرانیولاریتی (daily/weekly/monthly)
- Kafka consumer با idempotency برای ۴ topic
- HTTP retry logic با exponential backoff
- Outbox pattern برای تغییرات
- Pagination با cap
- Audit logging و Correlation ID

---

## ۱۹. regulatory-gateway-service (دروازه تنظیمی)

**پورت:** 18024

**دامنه:** دروازه ارتباط با سامانه‌های تنظیمی ایران (سنهاب، انبارهای آتش‌نشانی) با Circuit Breaker و retry.

**خدمات:**
- Sanhab integration با dual client (mock/real):
  - ۳ روش استعلام: nationalId+uniqueCode, policyNumber, VIN
  - کد نتیجه: OK, NOT_FOUND, MISMATCH, PENDING_SYNC, UPSTREAM_ERROR
- Circuit Breaker با ۳ حالت: CLOSED, OPEN, HALF_OPEN
  - قابل پیکربندی: failureThreshold, successThreshold, timeout
- HTTP retry با exponential backoff و timeout
- Webhook handling با deduplication (externalEventId)
- Inquiry flow با orchestrator follow-up برای MISMATCH/PENDING_SYNC/UPSTREAM_ERROR
- Failure logging (RegulatoryFailureLog)
- Sanhab SMS inquiry (KAVENEGAR, TWILIO, MELLIPAYAMAK)
- Warehouse Fire inquiry (FIRE_HISTORY, CURRENT_STATUS, INSPECTION_REPORT, COMPLIANCE_CHECK)
- Webhook signature verification (HMAC)
- Kafka producer برای رویدادهای تنظیمی
- Authentication و permission system
- Outbox pattern برای transactional event publishing
- Pagination با cap
- Audit logging و Correlation ID

---

## ۲۰. collections-service (وصول حق بیمه)

**پورت:** 18025

**دامنه:** مدیریت اقساط حق بیمه، یادآوری، مطالبات معوق و درگاه پرداخت.

**خدمات:**
- Installment Plan management با idempotency key
  - Late fee config: ratePerDay, maxDays, maxAmount
  - Currency (default IRR)
- Installment management با state machine: pending → paid
  - شماره اقساط متوالی، due date، amount
  - Grace period، late fee calculation
- Payment processing با idempotency (providerRef)
- Reminder system (max 3، 7-day cooldown)
- Overdue management با grace period
- Late fee calculation با caps (maxDays, maxAmount)
- Payment Gateway integration (Zarinpal, IdPay با sandbox)
  - Initiate payment, verify, callback handling با signature verification
- Outbox pattern با OutboxWorker
- ۴ Kafka event: plan.created, installment.paid, installment.reminder, installment.overdue
- Kafka consumer برای PolicyIssued (auto-create plan)
- Schema اختصاصی
- Pagination با cap
- Audit logging و Correlation ID

---

## ۲۱. customer-360-service (نمای ۳۶۰ درجه مشتری)

**پورت:** 18026

**دامنه:** تجمیع داده‌های مشتری از ۶+ سرویس برای ارائه نمای کامل ۳۶۰ درجه.

**خدمات:**
- Stateless aggregation از ۱۲ منبع داده به‌صورت موازی (Promise.all):
  - Profile, Policies, Claims, Payments, Complaints, AML status, KYC status
  - Journey, Relationships, Risk profile, Preferences, Consent
- Completeness scoring (profile 40, policies 30, claims 30)
- Confidence scoring (KYC verified 50, verificationLevel 20/10, nationalId 20, dateOfBirth 10)
- Customer journey timeline (aggregated events sorted by timestamp)
- Customer search by nationalId, phone, email, policyNumber
- Customer summary (active policies, open claims, AML/KYC status, risk category)
- Authentication و authorization
- Auth token forwarding به سرویس‌های downstream
- Caching با Redis
- Timeout در HTTP calls
- Pagination
- Audit logging و Correlation ID

---

## ۲۲. customer-portal-service (پورتال مشتری — BFF)

**پورت:** 18027

**دامنه:** Backend-for-Frontend برای پورتال مشتری با احراز هویت OTP و دسترسی به خدمات بیمه‌ای.

**خدمات:**
- OTP-based authentication:
  - ۶-digit OTP با crypto.randomInt، ۵-minute expiry
  - Session management (ACTIVE, REVOKED, EXPIRED)
  - JWT با 30-minute TTL
  - OTP delivery از طریق notification service
  - OTP rate limiting و attempt limiting
- BFF endpoints:
  - getPoliciesForCustomer با ownership verification
  - getClaimsForCustomer با ownership verification
  - getPaymentsForCustomer
  - getComplaintsForCustomer
  - submitFnol (policy verification → document upload → claim creation)
  - requestEndorsement (policy verification → endorsement request)
  - requestRenewal (policy verification → renewal request)
- Auth token forwarding به سرویس‌های downstream
- HTTP retry logic با linear backoff
- Session management (get, revoke, cleanup expired)
- Audit logging
- Correlation ID

---

## ۲۳. workflow-service + workflow-engine-service (موتور گردش کار)

**پورت:** 18028

**دامنه:** مدیریت و اجرای فرایندهای گردش کار (BPMN-like) با تعریف، نمونه‌سازی و اجرای token-based.

**خدمات:**
- **workflow-service (مدیریت):**
  - Workflow Definition CRUD با auto-increment version
  - Status: DRAFT, ACTIVE, INACTIVE
  - Validation (nodes, edges, start/end)
  - Workflow Template management با variable substitution
  - Instance lifecycle: start, advance, complete task, cancel
  - Gateway types: exclusive, parallel, inclusive
  - Condition evaluation (==, !=, >, <, >=, <=, in, contains, startsWith, endsWith)
  - Timer event با ISO 8601 duration
  - User task با assignee, candidateUsers, candidateGroups, dueDate
  - Instance metrics (total, completed, running, cancelled, avgCompletionTime)
  - Authentication و authorization
- **workflow-engine-service (اجرا):**
  - Token-based execution (ACTIVE, CONSUMED, TERMINATED)
  - ۸ node type: start, end, api_call, decision, human_task, timer, parallel, event_wait, transform
  - Signal mechanism برای human_task
  - Process history (NODE_ENTER, NODE_EXIT, NODE_ERROR, PROCESS_START/END, SIGNAL_RECEIVED, TIMER_TRIGGERED, PARALLEL_FORK)
  - Variable management با scope و JSON serialization
  - Error handling (node error → instance FAILED)
  - Outbox pattern با OutboxWorker
  - Kafka consumer برای event_wait nodes
  - Persistent timer (نه in-memory)
  - Integration با work item service برای human tasks
  - Multi-tenancy با tenantId
  - JWT + RBAC با ۸ permission
  - Audit logging

---

## ۲۴. copilot-service (دستیار هوشمند بیمه)

**پورت:** 18030

**دامنه:** دستیار هوشمند مبتنی بر AI برای کارکنان بیمه با مدیریت مدل‌های AI و حاکمیت.

**خدمات:**
- ۸ entity: Claim, Document, CopilotAudit, ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport
- LLM integration برای پاسخ به سؤالات بیمه‌ای
- AI Governance:
  - Model Inventory management
  - Model Card (توضیحات مدل، محدودیت‌ها، کاربردها)
  - Model Risk Assessment
  - Model Validation Report
  - AI Incident Report
- Copilot Audit trail
- Claim analysis و document analysis با AI
- Authentication و authorization
- Outbox pattern و Kafka integration
- Audit logging و Correlation ID

---

## ۲۵. agent-portal-service (پورتال نماینده)

**پورت:** 18031

**دامنه:** پورتال نمایندگان بیمه با مدیریت session و دسترسی به آمار، بیمه‌نامه‌ها، ادعاها و پورسانت.

**خدمات:**
- Session management: ایجاد، اعتبارسنجی، ابطال (تکی و گروهی)، پاکسازی منقضی‌شده‌ها
- JWT با expiry قابل پیکربندی
- ۱۱ business endpoint:
  - Dashboard stats (totalPolicies, activePolicies, pendingClaims, totalCommission, monthlyPremium)
  - Agent policies با filters
  - Agent claims با filters
  - Agent customers با search
  - Agent commissions با filters
  - Agent KPI (daily/weekly/monthly)
  - Premium trends (monthly)
  - Commission history (monthly)
  - Policy portfolio (product breakdown)
  - Leads management با status/priority
- HTTP retry logic با exponential backoff
- Auth token forwarding به sales-network-service
- Tenant isolation با tenantId forwarding
- Pagination
- Audit logging
- RBAC با ۸ permission و ۳ نقش
- Correlation ID

---

## ۲۶. knowledge-service + knowledge-layer-service (لایه دانش)

**پورت:** 18033

**دامنه:** مدیریت دانش بیمه‌ای شامل مقالات، گراف دانش، جستجوی معنایی و RAG grounding.

**خدمات:**
- **knowledge-service:**
  - Knowledge Article management با PostgreSQL full-text search
  - Article lifecycle: DRAFT → PUBLISHED
  - Knowledge Graph: entity و relationship CRUD با aliases، properties، embedding
  - Semantic search با cosine similarity روی embedding‌ها
  - Graph traversal (entity neighbors)
  - RAG grounding — ترکیب full-text و semantic search برای LLM grounding
  - Next Best Action (NBA) engine: create، recommend با priority ordering، execute
  - Tenant isolation در تمام query‌ها
  - Authentication و authorization
- **knowledge-layer-service:**
  - Document indexing pipeline: chunking + embedding generation
  - Configurable embedding API integration (model, dimensions, language)
  - Document-level و chunk-level embeddings
  - Semantic search با cosine similarity و chunk-level matching
  - Document CRUD با externalId deduplication
  - Reindex و delete با cascade
  - Stats (totalDocuments, indexed, pending, failed, byType, byLanguage)
  - pgvector برای vector index (scalability)
  - JWT + RBAC با ۶ permission و ۱۱ نقش
- Audit logging و Correlation ID

---

## ۲۷. model-switchboard-service (سوئیچ‌بورد مدل‌های AI)

**پورت:** 18035

**دامنه:** مدیریت، مسیریابی و پایش مدل‌های AI با کنترل هزینه و حاکمیت مدل.

**خدمات:**
- Model Management: ثبت، فعال‌سازی، لیست با filters و pagination
  - Model types: llm, ml, ocr, embedding, other
  - Status: DRAFT → ACTIVE
- Model Invocation:
  - Criteria-based selection (maxCost, minAccuracy, maxRisk)
  - Prioritization (cost, accuracy, risk, priority)
  - HTTP POST به model endpoint با apiKey auth و timeout
  - Fallback chain در route policy
  - Retry در callModelEndpoint
- Route Policy:
  - Primary + fallback chain
  - Quality threshold و cost budget per day
  - Tenant-specific و wildcard (`*`) policies
  - Routing strategy: BALANCED
- Usage Recording & Reporting:
  - Token tracking (input, output, total)
  - Cost tracking (costMicroCents)
  - Latency و quality score
  - Usage summary aggregation GROUP BY model
- Model Health:
  - Per-model avgLatency, errorRate, recentInvocations
- Model Card (AI Governance):
  - Create, approve, deprecate lifecycle
  - Purpose, intendedUse, limitations, trainingData, performanceMetrics, biasRiskLevel, fairnessAudit, explainability
- Audit logging در RoutePolicy CRUD و routing fallback
- RBAC با ۸ permission و ۱۱ نقش
- Tenant isolation
- Pagination با cap
- Correlation ID

---

## ۲۸. ai-governance-service (حاکمیت هوش مصنوعی)

**پورت:** 18036

**دامنه:** حاکمیت کامل چرخه حیات مدل‌های AI شامل ثبت، ارزیابی، تأیید، استقرار و بازنشست.

**خدمات:**
- Model Intake Controller:
  - ثبت مدل با modelName, modelType, version, provider, parameters, trainingDataSummary, performanceMetrics
  - Model types: llm, ml, ocr, embedding, other
  - Risk levels: low, medium, high, critical
  - State machine با ۸ transition:
    - development → testing → staging → production
    - Rollback: production → staging → testing → development
    - production → deprecated → retired
  - Risk level enforcement در transitions
  - Validation report requirement
  - Auto-set deploymentDate، lastEvaluationDate، nextEvaluationDate
  - Auto-retire deprecated models بعد از threshold
  - getModelState، getModelsNeedingEvaluation، getTransitionRules
- AI Incident Response: create, assign, investigate, mitigate, resolve, close با auto-assignment
- Deployment Approval Gate: approval workflow با policies (staging: 1 approver, production: 2 approvers)
- Validation Workflow: functional, performance, security, bias, compliance, data_quality با scoring
- Committee Audit Trail: committee decisions و members با voting records
- Monitoring Dashboard: metrics recording, anomaly detection (performance degradation, error spike, drift)
- MRO Dashboard: real metrics از DB
- Model Switchboard Governance: model selection policies با use case authorization, rate limiting, circuit breaker
- Integration adapters: deployment pipeline (canary/blue-green/rolling)، model switchboard، monitoring
- Authentication و authorization
- Tenant isolation با tenantId
- Pagination
- Audit logging و Correlation ID
- Swagger documentation

---

## ۲۹. notification-service (اطلاع‌رسانی)

**پورت:** 18037

**دامنه:** ارسال و مدیریت اطلاع‌رسانی SMS و Email با ارائه‌دهنده‌های واقعی ایران‌محور و بین‌المللی.

**خدمات:**
- Real SMS provider integration:
  - Kavenegar (ایران‌محور) با Send و VerifyLookup (OTP template)
  - Twilio با messages.create
  - Fallback SMS provider
  - Configurable via SMS_PROVIDER env
- Real Email provider integration:
  - SendGrid با attachments support
  - AWS SES با UTF-8 charset
  - Configurable via EMAIL_PROVIDER env
- Notification sending:
  - SMS (OTP/SMS) و EMAIL با provider dispatch
  - OTP rate limiting (per tenant + recipient، configurable window/max)
  - Bulk notifications با batchId و scheduledAt
- Retry mechanism با exponential backoff (max 3 retries)
- Job queue برای async processing
- Template management:
  - `{{variable}}` replacement با regex
  - SMS و Email templates با language support
  - Template types: policy_issued, claim_submitted, complaint_received, installment_due, OTP
  - Default Persian templates (seed)
  - CRUD برای SMS و Email templates
- Delivery callback handling (delivered/failed/bounced/complained)
- Notification querying با filters (tenantId, userId, correlationId, channel, type, status)
- Authentication و authorization
- Kafka consumer برای event-driven notification triggering
- Outbox pattern
- OTP hash storage (نه plaintext)
- Redis-based rate limiting (multi-instance)
- Audit logging و Correlation ID
- Tenant isolation

---

## ۳۰. rule-engine-service (موتور قوانین)

**پورت:** 18038

**دامنه:** موتور ارزیابی و اجرای قوانین بیمه‌ای با expression engine امن و مدیریت قالب.

**خدمات:**
- Rule Management:
  - Create با tenantId, ruleSetKey, type, condition, action, priority, tags
  - Auto-increment version
  - Lifecycle: DRAFT → ACTIVE → INACTIVE
  - Validate (expression, variables, action)
  - Selective field update
  - Soft delete
  - List با filters (tenantId, ruleSetKey, status, type, tags) و pagination
- Rule Evaluation:
  - Fetch active rules (priority DESC)
  - CONDITION type: stop after first match
  - EXECUTION type: evaluate all matching rules
  - DryRun support (conditions evaluated, actions not applied)
  - Execution recording (input, output, matchedRules, executionTimeMs, status)
- Custom Expression Engine (بدون eval):
  - Logical: &&, ||, !
  - Comparison: ==, !=, >, <, >=, <=
  - Membership: in
  - String: contains, startsWith, endsWith, matches (regex با sanitization)
  - Functions: contains(), startsWith(), endsWith(), matches(), in(), between(), isEmpty(), isNotEmpty()
  - Parentheses با depth tracking
  - Dot-notation path traversal
  - Variable extraction
- Action Types: return, set, add, multiply, push, call, emit, log
- Execution Tracking:
  - List با filters و pagination
  - Execution metrics (totalExecutions, successRate, avgExecutionTimeMs, mostMatchedRules)
- Template Management:
  - Create با category, conditionTemplate, actionTemplate, variables
  - Create rule from template با variable substitution
- Authentication و authorization
- Tenant isolation با tenantId check در تمام queries
- Audit logging و Correlation ID
- Pagination با cap

---

## ۳۱. billing-service (مالی و صدور فاکتور)

**پورت:** 18039

**دامنه:** مدیریت مالی، صدور فاکتور، حسابداری دوطرفه، درگاه پرداخت ایرانی و تطبیق بانکی.

**خدمات:**
- Invoice Management:
  - Create با invoiceNumber, policyId, claimId, invoiceType, amount, taxAmount, dueDate, lineItems
  - Lifecycle: DRAFT → PENDING → PAID/OVERDUE/CANCELLED
  - recordPayment با paidAmount accumulation
  - markOverdue (batch)
  - Outstanding balance calculation
  - List با filters و pagination
- Double-Entry Accounting:
  - Journal entries با debit/credit balance validation
  - Post و reverse با reversal entry (swap debit/credit)
  - Account management با hierarchy (parentAccountCode)
  - Account types: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  - Financial period management (OPEN/CLOSED)
  - Trial balance با debit/credit balances
  - Account balance با opening balance
- CostCenter Management: CRUD با audit logging
- Reconciliation:
  - Expected vs actual با variance calculation
  - Status: MATCHED, MANUAL_REVIEW, UNMATCHED
  - Approval workflow
- Financial Reports:
  - PnL Report (revenue vs expenses, netIncome)
  - Balance Sheet (assets, liabilities, equity)
- Payment Gateway Integration (ایران‌محور):
  - ۸ Iranian provider: ZARINPAL, IDPAY, PAYIR, BEHPARDAKHT, SAMAN, MELLAT, PASARGAD, ECOSYSTEM
  - Initiate, verify, cancel
  - Rial → Toman conversion
  - Idempotency key برای ecosystem payments
  - PaymentTransaction persistence در DB
- Auto-Deposit Verification:
  - Bank transaction ingestion و matching با invoices
  - Confidence levels (high/medium/low) با tolerance
  - Auto-approve high-confidence matches
  - Manual approve/reject
  - Batch reconciliation
  - Configurable: enabled, checkInterval, toleranceAmount, autoApprove
- RBAC با ۷ permission و ۱۱ نقش
- Tenant isolation
- Audit logging برای CostCenter و Reconciliation
- Correlation ID و Pagination با cap

---

## ۳۲. underwriting-service (بیمه‌گری و ارزیابی ریسک)

**پورت:** 18032

**دامنه:** مدیریت فرایند بیمه‌گری، ارزیابی ریسک، ماتریس اشتهار و اعمال تصمیمات.

**خدمات:**
- Underwriting Request Lifecycle:
  - Create با policyId (UUID validation), reasonCode, input, dueDate
  - Orchestrator integration برای work item creation
  - Decide: approved/rejected/escalated با policy service callback
  - ALREADY_DECIDED protection
  - List با filters و pagination
- SLA Enforcement:
  - Breach detection (dueDate < now)
  - Escalation با audit logging
  - SLA metrics (totalPending, overdueCount, avgResolutionHours, resolutionRate)
- Risk Assessment:
  - Weighted scoring با ۵ factor:
    - ageRisk (0.2), claimHistoryRisk (0.3), coverageRisk (0.2), itemAgeRisk (0.15), policyTypeRisk (0.15)
  - Risk levels: low (<0.3), medium (<0.5), high (<0.7), critical (>=0.7)
  - Recommendations per factor
  - Risk matrix reference
  - Risk scoring history (persistent)
- Appetite Matrix & Delegated Authority:
  - Create rules: lineOfBusiness, productId, riskLevel, decision, maxSumInsured, maxPremium, authorityLevel, approverRole, slaHours
  - Evaluate: match rules با sumInsured/premium limits, fallback refer
  - List, update, delete (soft)
- Configurable risk model (نه hardcoded)
- Orchestrator و policy service integration با authorization header forwarding
- RBAC با ۴ permission و ۵ نقش
- Tenant isolation
- Audit logging و Correlation ID
- UUID validation و input validation
- Pagination با cap

---

## ۳۳. outbox-relay (رله Outbox)

**پورت:** 18041

**دامنه:** پردازش و انتشار رویدادهای Outbox به Kafka با تضمین تراکنشی و DLQ.

**خدمات:**
- Transaction Outbox Pattern با `FOR UPDATE SKIP LOCKED` برای concurrent processing
- Kafka producer integration (KafkaJS با retry configuration)
- Batch processing با configurable batchSize و pollIntervalMs
- Retry با exponential backoff و cap (30s)
- Max attempts (configurable, default 10) → status `failed`
- Dead Letter Queue (DLQ) برای permanently failed events:
  - Full event data (originalEventId, topic, key, value)
  - Error info (errorMessage, errorStack, retryCount)
  - Resolution tracking (resolvedAt)
- Event envelope استاندارد (createEventEnvelope از @insurance/shared):
  - eventId, eventType, eventVersion, occurredAt, producer, correlationId, tenantId, traceparent, subject, payload
- Partition key برای ordering guarantee (claimId/policyId/fraudCaseId/eventId)
- Kafka headers: x-event-type, x-event-version, x-correlation-id, x-tenant-id, traceparent
- Lag monitoring (warning > 60s)
- Health check server
- Graceful shutdown (SIGTERM/SIGINT)
- Structured logging (pino)
- Transactional batch processing (atomic)
- Ordered processing (occurred_at ASC)
- Status management: pending → sent/failed
- Attempt tracking و error message storage
- Metrics endpoint (Prometheus/Grafana)
- Deep health check (Kafka + DB connectivity)
- `synchronize: false`
- Correlation ID, Tenant ID, Traceparent propagation

---

## ۳۴. api-gateway (دروازه API)

**پورت:** 18000

**دامنه:** دروازه مرکزی API با reverse proxy، Circuit Breaker، rate limiting و propagation هدرها.

**خدمات:**
- Reverse proxy برای ۲۸+ upstream service با path-based routing:
  - `/auth`, `/claims`, `/rm`, `/fraud`, `/documents`, `/copilot`, `/orchestrations`
  - `/workflows`, `/work-items`, `/dlq`, `/reg`, `/flags`, `/party`, `/complaints`
  - `/policies`, `/payments`, `/collections`, `/aml`, `/re`, `/product`, `/underwriting`
  - `/reporting`, `/monitoring`, `/document-ai`, `/sales-network`, `/notifications`
  - `/customer-portal`, `/agent-portal`, `/workflow`, `/rule-engine`, `/knowledge`
  - `/model-switchboard`, `/billing`
- JWT verification (نه فقط decode) با proper secret management
- Circuit Breaker per-service (۳ state: CLOSED, OPEN, HALF_OPEN):
  - Configurable failureThreshold, recoveryTimeout, successThreshold
  - Admin endpoints: status, reset
  - Redis-backed (multi-instance)
- Rate Limiting دو لایه:
  - Global (configurable)
  - Per-tenant per-endpoint (Redis-backed)
  - X-RateLimit headers
- Security middleware: Helmet (security headers), CORS
- Correlation ID: extraction یا generation، propagation
- Tenant ID: extraction یا default، propagation
- JWT userId extraction → X-User-Id header
- AI-enabled flag propagation (X-AI-Enabled)
- Traceparent propagation (W3C Trace Context)
- Upstream health tracking: periodic checks، failure threshold، recovery period
- Deep health check (GET /health/deep با ۲۸+ service checks)
- Upstream health endpoint (GET /gateway/health/upstreams)
- Header canonicalization و proxy header management
- Body forwarding (JSON + raw)
- Content-type aware response
- Graceful error handling (502/503)
- Authentication و authorization checks
- API key validation برای external clients
- Structured request/response logging
- WebSocket support

---

## ۳۵. web-ui (رابط کاربری وب — پنل مدیریت)

**پورت:** 18042

**دامنه:** رابط کاربری وب پنل مدیریت بیمه با ۲۸+ ماژول صفحه و RBAC سازمانی.

**خدمات:**
- Next.js 14 App Router با RTL support (`<html lang="fa" dir="rtl">`)
- ۲۸+ page modules:
  - Dashboard, Party/KYC, Policies, Payments, Collections, AML, Work Items
  - Claims, Documents, Fraud, Complaints, Reinsurance, Product, Sales Network
  - Reporting, Monitoring, DLQ, Document AI, AI Governance, Sanhab
  - Underwriting, Loss Adjuster, Admin (Users, Jobs, Feature Flags, Tracing, Audit Log)
  - Org Units, Settings, Login, Forbidden
- Enterprise RBAC با ۱۰۰+ permission keys و role-to-permission mapping
- Navigation filtering بر اساس roles و permissions
- Workspace switcher (۵ workspace: ops, claims, uw, fraud, admin)
- AI Toggle برای enable/disable AI features
- Realtime support (SSE با auto-reconnect)
- i18n (۳ زبان: fa, en, ar)
- Theme support (light/dark)
- Toast notifications
- API client با auth/tenant/AI headers و 401/403 handling
- JWT verification با httpOnly cookie (نه localStorage)
- SSR auth (server-side authentication)
- Shared packages (@insurance/design-system, @insurance/ui-utils, @insurance/api-client)
- Lucide icons, TailwindCSS
- Accessibility (SkipLink, BottomNav)
- CSP header
- Dockerfile

---

## ۳۶. customer-portal-ui (رابط کاربری پورتال مشتری)

**پورت:** 18043

**دامنه:** رابط کاربری موبایل‌محور پورتال مشتری با احراز هویت OTP و PWA.

**خدمات:**
- Next.js 14 App Router با RTL support
- Capacitor integration (mobile app برای Android/iOS):
  - appId: com.insurance.customerportal
  - PushNotifications, SplashScreen
- PWA support (Service Worker, manifest, offline)
- OTP-based authentication (دو مرحله‌ای: phone → OTP)
- JWT در httpOnly cookie (نه localStorage)
- SSR auth (server-side authentication)
- ۸ page module:
  - Login (OTP), Dashboard, Policies, Claims, Payments, Complaints
  - FNOL (ثبت خسارت), Endorsement, Renewal, Profile, Chatbot
- API client (axios با interceptors و auth token propagation)
- React Query برای data fetching
- React Hook Form + Zod برای form validation
- RBAC با role-based access control
- Shared packages (@insurance/design-system, @insurance/ui-utils, @insurance/api-client)
- Theme support (light/dark via next-themes)
- Toast notifications
- Mobile-first design (max-w-lg, BottomNav, FAB)
- Accessibility (SkipLink, userScalable: true)
- i18n (multi-language support)
- Lucide icons, TailwindCSS
- CSP header
- Dockerfile

---

## ۳۷. agent-portal-ui (رابط کاربری پورتال نماینده)

**پورت:** 18044

**دامنه:** رابط کاربری پورتال نمایندگان بیمه با داشبورد و مدیریت مشتریان.

**خدمات:**
- Next.js 14 Pages Router با RTL support
- ۷ page module:
  - Dashboard (با charts), Customers, Commissions, Leads, Portfolio
  - Quotes, Settings
- Typed API client (AgentPortalAPI class):
  - Login (username/password)
  - Dashboard stats (totalPolicies, activePolicies, pendingClaims, totalCommission, monthlyPremium)
  - Policies با filters
  - Commissions با filters
  - Premium trends (12 months)
  - Commission history (12 months)
  - Policy portfolio (per-product breakdown)
  - Leads با status و priority
  - WebSocket و SSE برای real-time updates
- JWT token persistence (localStorage/sessionStorage)
- Auth check در تمام pages
- RBAC با role-based access control
- Command Palette (⌘K)
- Sidebar navigation و bell notifications
- Theme support (light/dark)
- Recharts برای dashboard visualizations
- SWR برای data fetching
- date-fns
- Shared packages (@insurance/design-system, @insurance/ui-utils, @insurance/api-client)
- Lucide icons, TailwindCSS
- Accessibility (SkipLink)
- i18n (multi-language support)
- CSP header
- Dockerfile

---

## ۳۸. پکیج‌های مشترک (Shared Packages)

**دامنه:** پکیج‌های مشترک زیرساختی برای تمام سرویس‌های پلتفرم.

**خدمات:**

### services/common
- **EcosystemJwtGuard**: JWT authentication با JWKS RS256 (IAM) + HS256 fallback، issuer/audience validation
- **DeepHealthService**: comprehensive health checking (DB + Kafka + Redis با latency و pool status)
- **BulkheadService**: bulkhead pattern با per-service configs (maxConcurrent, maxWaitTime, timeout) — Redis-backed

### @insurance/shared
- **Event System**: EventEnvelope (eventId, eventType, eventVersion, correlationId, tenantId, traceparent, subject, payload)، OutboxEvent entity، DeadLetterEvent، ConsumedEvent، OutboxPublisher، OutboxWorker
- **Messaging**: KafkaProducer, KafkaConsumer, DLQService (KafkaJS)
- **Observability**: pino Logger (structured logging با child loggers)، OpenTelemetry Tracer (Jaeger + OTLP exporter)
- **Database**: createDataSource (TypeORM PostgreSQL با SSL/TLS)
- **Schema**: EventContracts (۷۴۵۹ lines)، SchemaRegistry
- **Types**: ApiResponse, PaginatedResponse, HealthCheckResponse
- **CircuitBreaker**: ۳ state (CLOSED, OPEN, HALF_OPEN) — Redis-backed
- **PII Redaction**: redactNationalId, redactIban با configurable masking
- **GDPR Compliance**: consent management, data classification, inventory, lineage, minimization, retention, subject request, KPI governance, purpose-based access, PII masking middleware
- **Idempotency Middleware**: Redis-backed (اجباری، نه InMemory fallback) با configurable TTL
- **Tenant Isolation**: x-tenant-id header extraction، UUID validation، tenant existence check، TenantId decorator
- **ABAC Guard**: Attribute-Based Access Control
- **Event Policy Enforcer**: event policy enforcement
- **API Error Contract**: ApiError, ApiErrorException, ErrorCodes، successResponse, errorResponse
- **Kafka SASL/SSL**: secure Kafka connection
- **SSL/TLS**: secure database connection
- ۲۵+ runtime test files

### packages/design-system
- Themes (light/dark)، Reusable components (ThemeToggle, SkipLink, BottomNav, WorkspaceSwitcher, CommandPalette)
- Storybook برای component documentation

### packages/api-client
- Shared API client برای UI services

### packages/ui-utils
- `cn()` utility (clsx + tailwind-merge)

---

<!-- پایان سند -->
