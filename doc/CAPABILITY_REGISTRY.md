# Capability Registry — نقشه قابلیت‌های سامانه بیمه Enterprise

> **تاریخ**: ۱۴۰۵/۰۲/۱۰  
> **مبنا**: `ENTERPRISE_GAP_CHECKLIST_AND_TARGET_DESIGN.md`  
> **هدف**: Single Source of Truth برای هر قابلیت عملیاتی سامانه

---

## راهنما

**وضعیت بلوغ (Maturity)**: Designed → Skeleton → Integrated → Operational → Production-ready → Enterprise-ready

**اولویت**: P0=حیاتی | P1=مهم | P2=مزیت رقابتی

---

## ۱) Platform & Shared

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| PLT-01 | Event Envelope & Schema | `@insurance/shared` | Enterprise-ready | — | سرتاسری | P0 |
| PLT-02 | Correlation ID Propagation | `api-gateway` + همه | Production-ready | برخی flowها ناقص | سرتاسری | P0 |
| PLT-03 | Idempotency Middleware | `@insurance/shared` | Production-ready | — | سرتاسری | P0 |
| PLT-04 | Outbox Pattern | همه سرویس‌ها | Operational | enforcement کامل نیست | Enterprise-ready | P0 |
| PLT-05 | Circuit Breaker | `@insurance/shared` | Production-ready | همه callهای بیرونی integrate نیست | Enterprise-ready | P0 |
| PLT-06 | Bulkhead | `@insurance/shared` | Production-ready | — | Enterprise-ready | P1 |
| PLT-07 | Rate Limiting | `api-gateway` | Production-ready | — | Enterprise-ready | P0 |
| PLT-08 | DLQ & Retry Automation | `orchestrator` | Operational | retry policy کامل نیست | Enterprise-ready | P0 |
| PLT-09 | Observability | `otel` + `jaeger` | Production-ready | — | Enterprise-ready | P0 |
| PLT-10 | Feature Flags | `reporting-service` | Operational | governance formal نیست | Enterprise-ready | P1 |
| PLT-11 | Config/Secrets per Tenant | docker-compose | Skeleton | centralized config نیست | Enterprise-ready | P1 |

## ۲) Identity, Access & Tenant

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| IAM-01 | RBAC Core | `@insurance/shared` | Production-ready | — | Enterprise-ready | P0 |
| IAM-02 | ABAC | — | Designed | هیچ ABAC پیاده نشده | Enterprise-ready | P1 |
| IAM-03 | SSO / OIDC/SAML | — | Designed | فقط JWT local | Enterprise-ready | P1 |
| IAM-04 | Tenant Isolation | همه سرویس‌ها | Operational | file/AI config جدا کامل نیست | Enterprise-ready | P0 |
| IAM-05 | SoD | — | Designed | ماتریس formal نیست | Enterprise-ready | P1 |
| IAM-06 | Session Lifecycle | customer/agent portal | Operational | centralized store نیست | Enterprise-ready | P0 |

## ٣) Party / Customer / KYC

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| PRT-01 | Party CRUD | `party-kyc-service` | Production-ready | — | Enterprise-ready | P0 |
| PRT-02 | KYC Workflow | `party-kyc-service` | Production-ready | document trust chain ناقص | Enterprise-ready | P0 |
| PRT-03 | Consent Management | `party-kyc-service` | Production-ready | — | Enterprise-ready | P0 |
| PRT-04 | Customer 360 View | `reporting-service` | Skeleton | view یکپارچه نداریم | Enterprise-ready | P1 |
| PRT-05 | Identity Proofing | — | Designed | face match, dedup نیست | Enterprise-ready | P1 |

## ۴) Product & Pricing

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| PRD-01 | Product CRUD | `product-service` | Production-ready | — | Enterprise-ready | P0 |
| PRD-02 | Coverage Config | `product-service` | Production-ready | — | Enterprise-ready | P0 |
| PRD-03 | Pricing Rules Engine | `product-service` | Production-ready | — | Enterprise-ready | P0 |
| PRD-04 | Config-Driven Deployment | — | Designed | productization کامل نیست | Enterprise-ready | P1 |
| PRD-05 | Pricing Analytics | — | Designed | elasticity, sandbox نیست | Enterprise-ready | P2 |

## ۵) Policy & Underwriting

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| POL-01 | Policy State Machine | `policy-service` | Production-ready | — | Enterprise-ready | P0 |
| POL-02 | Quote to Issue Flow | `policy-service` | Production-ready | — | Enterprise-ready | P0 |
| POL-03 | Endorsement & Renewal | `policy-service` | Production-ready | — | Enterprise-ready | P0 |
| POL-04 | Sanhab Unique Code | `policy-service` + `regulatory-gateway` | Production-ready | real integration نیازمند credential | Enterprise-ready | P0 |
| POL-05 | Underwriting Decision Engine | `underwriting-service` | Production-ready | appetite, exception handling کامل نیست | Enterprise-ready | P1 |
| POL-06 | Data Quality Pre-Submission | `policy-service` | Operational | dedup, anomaly نیست | Enterprise-ready | P0 |
| POL-07 | Auto-Renewal & Reminders | `policy-service` | Production-ready | — | Enterprise-ready | P1 |

## ۶) Claims & FNOL

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| CLM-01 | Claims State Machine | `claims-service` | Production-ready | — | Enterprise-ready | P0 |
| CLM-02 | FNOL API | `claims-service` | Operational | omnichannel نیست | Enterprise-ready | P0 |
| CLM-03 | Adjuster Assignment | `claims-service` | Operational | skill-based routing کامل نیست | Enterprise-ready | P1 |
| CLM-04 | Reserve Management | `claims-service` | Skeleton | reserve governance نیست | Enterprise-ready | P1 |
| CLM-05 | Payment Orchestration | `claims-service` | Production-ready | — | Enterprise-ready | P0 |
| CLM-06 | Subrogation & Recovery | — | Designed | lifecycle نیست | Enterprise-ready | P1 |
| CLM-07 | FNOL Self-Service | `customer-portal-service` | Skeleton | UI عملیاتی نیست | Enterprise-ready | P0 |
| CLM-08 | Workload Balancing | `claims-service` | Skeleton | balancing خودکار نیست | Enterprise-ready | P1 |

## ۷) Payments & Collections

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| PAY-01 | Payment Gateway Integration | `payments-service` | Production-ready | — | Enterprise-ready | P0 |
| PAY-02 | Collections & Reconciliation | `payments-service` | Production-ready | — | Enterprise-ready | P0 |
| PAY-03 | Ledger & Finance Posting | `payments-service` | Production-ready | — | Enterprise-ready | P1 |
| PAY-04 | Installments & Scheduling | `payments-service` | Production-ready | — | Enterprise-ready | P1 |

## ۸) Sales Network & Agent/Broker

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| SAL-01 | Partner/Agent CRUD | `sales-network-service` | Production-ready | — | Enterprise-ready | P0 |
| SAL-02 | Commission Engine | `sales-network-service` | Production-ready | — | Enterprise-ready | P0 |
| SAL-03 | Agent Portal UI | `agent-portal-ui` | Skeleton | داده hardcoded/mock زیاد | Enterprise-ready | P0 |
| SAL-04 | Agent Dashboard | `agent-portal-service` | Operational | real API mapping کامل نیست | Enterprise-ready | P0 |
| SAL-05 | BFF Alignment | `agent-portal-service` | Operational | ناسازگاری endpointها | Enterprise-ready | P0 |
| SAL-06 | Lead & Next Best Action | — | Designed | recommendation engine نیست | Enterprise-ready | P2 |
| SAL-07 | Agent Training & Gamification | — | Designed | — | Enterprise-ready | P2 |

## ۹) Complaints & Ombudsman

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| CMP-01 | Complaint CRUD | `complaints-service` | Production-ready | — | Enterprise-ready | P0 |
| CMP-02 | Complaint State Machine | `complaints-service` | Production-ready | — | Enterprise-ready | P0 |
| CMP-03 | Auto-Categorization (AI) | `complaints-service` | Production-ready | — | Enterprise-ready | P0 |
| CMP-04 | SLA & Escalation | `complaints-service` | Production-ready | — | Enterprise-ready | P0 |
| CMP-05 | Regulatory Export | `complaints-service` | Skeleton | بسته بیمه مرکزی کامل نیست | Enterprise-ready | P1 |
| CMP-06 | Root Cause Analysis & CAPA | — | Designed | preventive action tracking نیست | Enterprise-ready | P1 |

## ۱۰) Fraud & SIU

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| FRD-01 | Fraud Rules Engine | `fraud-service` | Production-ready | — | Enterprise-ready | P0 |
| FRD-02 | Fraud ML Scoring | `fraud-service` | Production-ready | — | Enterprise-ready | P0 |
| FRD-03 | Graph & Network Analytics | `fraud-service` | Skeleton | graph analysis کامل نیست | Enterprise-ready | P1 |
| FRD-04 | SIU Case Management | `fraud-service` | Operational | case lifecycle کامل نیست | Enterprise-ready | P1 |
| FRD-05 | Explainability & Feedback Loop | `fraud-service` | Skeleton | outcome to model feedback نیست | Enterprise-ready | P1 |
| FRD-06 | Irregularity Alerts | `fraud-service` | Production-ready | — | Enterprise-ready | P1 |

## ۱۱) AML / CFT

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| AML-01 | AML Screening Rules | `aml-service` | Production-ready | — | Enterprise-ready | P0 |
| AML-02 | Transaction Monitoring | `aml-service` | Production-ready | — | Enterprise-ready | P0 |
| AML-03 | Case Management | `aml-service` | Operational | escalation chain کامل نیست | Enterprise-ready | P1 |
| AML-04 | External Screening (Sanctions/PEP) | — | Designed | external sync نیست | Enterprise-ready | P1 |
| AML-05 | SAR Reporting Workflow | — | Designed | official report flow نیست | Enterprise-ready | P1 |

## ۱۲) Reinsurance

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| REI-01 | Reinsurance Contract CRUD | `reinsurance-service` | Production-ready | — | Enterprise-ready | P0 |
| REI-02 | Cession Calculation | `reinsurance-service` | Production-ready | — | Enterprise-ready | P0 |
| REI-03 | Bordereaux Lifecycle | `reinsurance-service` | Production-ready | — | Enterprise-ready | P0 |
| REI-04 | Treaty vs Facultative | `reinsurance-service` | Production-ready | — | Enterprise-ready | P1 |
| REI-05 | Reconciliation & Settlement | `reinsurance-service` | Operational | dispute resolution کامل نیست | Enterprise-ready | P1 |
| REI-06 | Iran Mandatory Cession | `reinsurance-service` | Operational | صورتحساب دوره‌ای کامل نیست | Enterprise-ready | P1 |

## ۱۳) Document & Document AI

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| DOC-01 | Document Storage & Retrieval | `document-service` | Production-ready | — | Enterprise-ready | P0 |
| DOC-02 | Document Lifecycle | `document-service` | Production-ready | — | Enterprise-ready | P0 |
| DOC-03 | OCR (Tesseract + Google Vision) | `document-ai-service` | Production-ready | — | Enterprise-ready | P0 |
| DOC-04 | Document Classification | `document-ai-service` | Production-ready | — | Enterprise-ready | P0 |
| DOC-05 | Extraction & Validation | `document-ai-service` | Production-ready | cross-check با policy/claim کامل نیست | Enterprise-ready | P1 |
| DOC-06 | Document Taxonomy & Retention | `document-service` | Operational | legal hold, retention policy کامل نیست | Enterprise-ready | P1 |
| DOC-07 | Evidence Chain & Audit | `document-service` | Skeleton | tamper-evident audit نیست | Enterprise-ready | P1 |

## ۱۴) Copilot / GenAI / Knowledge

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| COP-01 | GenAI Copilot API | `ai-governance-service` | Operational | grounding governance کامل نیست | Enterprise-ready | P1 |
| COP-02 | Summarization | `ai-governance-service` | Production-ready | — | Enterprise-ready | P1 |
| COP-03 | Q&A with Grounding | `ai-governance-service` | Operational | citation, source ranking کامل نیست | Enterprise-ready | P1 |
| COP-04 | Next Best Action | — | Designed | recommend engine نیست | Enterprise-ready | P2 |
| COP-05 | Knowledge Layer (Vector DB + KG) | — | Designed | vector store + graph نیست | Enterprise-ready | P1 |
| COP-06 | Model Switchboard | `model-switchboard-service` | Skeleton | operational integration کامل نیست | Enterprise-ready | P1 |

## ۱۵) AI Governance & MLOps

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| AIG-01 | Model Inventory | `ai-governance-service` | Production-ready | — | Enterprise-ready | P0 |
| AIG-02 | Model Card & Documentation | `ai-governance-service` | Operational | Model Card template کامل نیست | Enterprise-ready | P0 |
| AIG-03 | Approval Workflow (MRO/Validator) | — | Designed | committee process نیست | Enterprise-ready | P0 |
| AIG-04 | Risk Classification | — | Designed | Low/Medium/High enforcement نیست | Enterprise-ready | P0 |
| AIG-05 | Deployment Approval (Canary/Blue-Green) | — | Designed | automated deployment gate نیست | Enterprise-ready | P1 |
| AIG-06 | Performance Monitoring | `ai-governance-service` | Skeleton | drift, latency KPI کامل نیست | Enterprise-ready | P1 |
| AIG-07 | Incident Response for AI | — | Designed | runbook نیست | Enterprise-ready | P1 |
| AIG-08 | Explainability (LIME/SHAP) | — | Designed | tooling نیست | Enterprise-ready | P1 |
| AIG-09 | Bias Testing & Fairness | — | Designed | test suite نیست | Enterprise-ready | P1 |
| AIG-10 | Prompt Injection Defense | — | Designed | security filter نیست | Enterprise-ready | P1 |

## ۱۶) Workflow / Rule / Case

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| WFL-01 | Work Item & Task Queue | `workflow-service` | Production-ready | — | Enterprise-ready | P0 |
| WFL-02 | Workflow State Machine | `workflow-service` | Production-ready | — | Enterprise-ready | P0 |
| WFL-03 | Rule Engine Core | `rule-engine-service` | Production-ready | — | Enterprise-ready | P0 |
| WFL-04 | BPMN / Config-Driven Flows | — | Designed | BPMN designer نیست | Enterprise-ready | P1 |
| WFL-05 | Rule Lifecycle Governance | — | Designed | draft/test/approve/rollback نیست | Enterprise-ready | P1 |
| WFL-06 | Case Management Framework | `workflow-service` | Operational | case lifecycle deep نیست | Enterprise-ready | P1 |

## ۱۷) Reporting & Executive BI

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| RPT-01 | Operational Reports | `reporting-service` | Production-ready | — | Enterprise-ready | P0 |
| RPT-02 | KPI Dashboards (Admin) | `reporting-service` | Production-ready | — | Enterprise-ready | P0 |
| RPT-03 | Executive Cockpit | `reporting-service` | Skeleton | market share, combined ratio, NPS نیست | Enterprise-ready | P1 |
| RPT-04 | Market Intelligence | — | Designed | benchmark analytics نیست | Enterprise-ready | P2 |
| RPT-05 | AI KPI Dashboard | — | Designed | drift, cost, quality KPIs نیست | Enterprise-ready | P1 |
| RPT-06 | Canonical KPI Catalog | — | Designed | formula, lineage, owner formal نیست | Enterprise-ready | P1 |

## ۱۸) Regulatory & External Integration

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| REG-01 | Sanhab SOAP Integration | `regulatory-gateway-service` | Production-ready | soap dependency + real cred نیازمند است | Enterprise-ready | P0 |
| REG-02 | Sanhab Mock Client | `regulatory-gateway-service` | Production-ready | — | Enterprise-ready | P0 |
| REG-03 | Inquiry Orchestration (Retry/Circuit Breaker) | `regulatory-gateway-service` | Production-ready | — | Enterprise-ready | P0 |
| REG-04 | Regulatory Webhook | `regulatory-gateway-service` | Production-ready | — | Enterprise-ready | P0 |
| REG-05 | Multi-Channel Inquiry | — | Designed | SMS/VIN/کارپوشه یکپارچه نیست | Enterprise-ready | P1 |
| REG-06 | Data Quality Gate (Pre-Regulatory) | `regulatory-gateway-service` | Operational | full validation suite کامل نیست | Enterprise-ready | P0 |
| REG-07 | OTP Integration | `notification-service` | Production-ready | — | Enterprise-ready | P0 |
| REG-08 | Payment Gateway | `payments-service` | Production-ready | — | Enterprise-ready | P0 |

## ۱۹) UI / UX / Portals

| ID | قابلیت | Owner سرویس | وضعیت | شکاف | هدف | Priority |
|----|--------|-------------|-------|------|-----|----------|
| UI-01 | Admin Dashboard | `admin-portal-ui` | Production-ready | — | Enterprise-ready | P0 |
| UI-02 | Customer Portal Login (OTP) | `customer-portal-ui` | Production-ready | — | Enterprise-ready | P0 |
| UI-03 | Customer Portal Dashboard | `customer-portal-ui` | Skeleton | journeyهای کلیدی کم است | Enterprise-ready | P0 |
| UI-04 | Customer Self-Service (Claims/Policy) | `customer-portal-ui` | Skeleton | FNOL, endorsement, renewal نیست | Enterprise-ready | P0 |
| UI-05 | Agent Portal Login | `agent-portal-ui` | Operational | real session کامل نیست | Enterprise-ready | P0 |
| UI-06 | Agent Portal Dashboard | `agent-portal-ui` | Skeleton | داده hardcoded | Enterprise-ready | P0 |
| UI-07 | Agent Commission/Performance View | `agent-portal-ui` | Skeleton | real API mapping کامل نیست | Enterprise-ready | P0 |
| UI-08 | Design System Shared | — | Designed | component library مشترک نیست | Enterprise-ready | P1 |
| UI-09 | BFF Strategy (per portal) | — | Designed | BFF جداگانه formal نیست | Enterprise-ready | P1 |
| UI-10 | Mobile / PWA | — | Designed | mobile-first نیست | Enterprise-ready | P2 |
| UI-11 | RTL & Accessibility | همه UIها | Production-ready | — | Enterprise-ready | P0 |

---

## جمع‌بندی آماری

| سطح بلوغ | تعداد |
|----------|-------|
| Enterprise-ready | 1 |
| Production-ready | ~35 |
| Operational | ~14 |
| Skeleton | ~12 |
| Designed | ~16 |
| Integrated | 0 |

| اولویت | تعداد |
|----------|-------|
| P0 | ~26 |
| P1 | ~30 |
| P2 | ~12 |

---

## نکته اجرایی

این registry باید هر ۲ هفته یک‌بار بازبینی شود و maturity هر capability بر اساس integration test + code review + runbook verification به‌روزرسانی گردد.
