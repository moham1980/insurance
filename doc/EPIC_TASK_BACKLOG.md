# Epic/Task Backlog — تکمیل نواقص سامانه بیمه Enterprise

> **تاریخ**: ۱۴۰۵/۰۲/۱۰  
> **مبنا**: `CAPABILITY_REGISTRY.md`  
> **هدف**: Backlog اجرایی قابل تحویل به تیم توسعه

---

## Epic 1: Truth Alignment & Registry
**P0 | M | Architecture Team**

- E1-T1: Capability Registry Template | XS | P0 | Template با ستون ثابت
- E1-T2: Runtime Truth Audit | M | P0 | لیست divergence (mock vs real)
- E1-T3: بازنگری Functional Completion Checklist | M | P0 | Labels [REAL]/[MOCK]/[SKELETON]
- E1-T4: Service Ownership Matrix | S | P0 | owner + runbook per service
- E1-T5: CI Maturity Badge | L | P1 | Badge test coverage + integration status

---

## Epic 2: Agent Portal Real Integration
**P0 | L | Frontend + Sales Network**

- E2-T1: Canonical API Contract agent↔sales-network | S | P0 | OpenAPI spec approved
- E2-T2: Align sales-network controller endpoints | M | P0 | همه endpointهای نیاز موجود
- E2-T3: Fix agent-portal.service.ts calls | M | P0 | ۰ خطای 404
- E2-T4: Remove hardcoded data from UI | S | P0 | هیچ hardcoded data
- E2-T5: Real session/auth integration | M | P0 | Login→API→Logout real
- E2-T6: Real Agent Dashboard | L | P0 | Data از API واقعی
- E2-T7: E2E test happy path | M | P0 | Playwright test
- E2-T8: Performance test | S | P1 | p95 < 2s

---

## Epic 3: Customer Portal Completion
**P0 | XL | Frontend**

- E3-T1: Customer Portal requirements PRD | S | P0 | PRD approved
- E3-T2: Customer Dashboard | M | P0 | real API integration
- E3-T3: FNOL Self-Service | L | P0 | ثبت خسارت end-to-end
- E3-T4: Policy Endorsement Self-Service | L | P0 | تغییر با workflow approval
- E3-T5: Complaint Filing Self-Service | M | P0 | ثبت + track status
- E3-T6: Payment History view | M | P1 | payments-service integration
- E3-T7: Mobile + PWA | M | P1 | mobile tested
- E3-T8: E2E test 5 journeys | L | P0 | ۵ journey automated

---

## Epic 4: AI Governance Operating Model
**P0 | XL | AI + Governance**

- E4-T1: Model Lifecycle State Machine | S | P0 | State diagram + transitions
- E4-T2: Model Intake API | M | P0 | Create model with risk assessment
- E4-T3: Validation Workflow | L | P0 | Validator review → approve/reject
- E4-T4: MRO Dashboard | M | P0 | Pending approvals + risk heatmap
- E4-T5: Deployment Approval Gate | L | P1 | Canary/Blue-Green trigger after MRO approval
- E4-T6: Monitoring Dashboard (drift/latency/cost) | L | P1 | Real metrics from inference
- E4-T7: AI Incident Response Workflow | M | P1 | Alert → incident → resolution
- E4-T8: Model Switchboard governance integration | M | P1 | Switchboard uses governance status
- E4-T9: Committee Audit Trail | S | P1 | Meeting minutes in system

---

## Epic 5: Knowledge Layer & Copilot
**P1 | XL | AI Team**

- E5-T1: Vector DB setup | S | P1 | PgVector/Qdrant in compose
- E5-T2: Knowledge Ingestion Pipeline | M | P1 | PDF/docs → chunks → embeddings
- E5-T3: Knowledge Graph Schema | L | P1 | Entity relationships defined
- E5-T4: Copilot + Knowledge integration | L | P1 | Responses with citations
- E5-T5: Source Trust Ranking | M | P1 | Priority by source type/freshness
- E5-T6: Tenant-aware Retrieval Filter | M | P1 | Filter by tenant + role
- E5-T7: Hallucination eval suite | L | P2 | Automated eval subset

---

## Epic 6: Model Switchboard Operational
**P1 | L | AI Team**

- E6-T1: Model Selection Policy | S | P1 | Cost/latency/accuracy matrix
- E6-T2: Switchboard Engine | M | P1 | Route by policy + availability
- E6-T3: Integrate all AI services | L | P1 | All AI calls via switchboard
- E6-T4: Fallback Chain | M | P1 | Auto fallback on failure
- E6-T5: Cost/Latency monitoring | M | P1 | Dashboard per model per tenant
- E6-T6: A/B Testing Framework | L | P2 | Split traffic between models

---

## Epic 7: Document AI Business Validation
**P1 | L | AI + Claims**

- E7-T1: Validation Rules definition | M | P1 | Per doc type rules
- E7-T2: Validation Engine | L | P1 | Post-OCR validation + errors
- E7-T3: Claims workflow integration | M | P1 | FNOL: upload → extract → validate → alert
- E7-T4: Document Taxonomy & Legal Hold | M | P1 | Taxonomy + retention policy
- E7-T5: Evidence Chain (tamper-evident) | L | P1 | Hash + timestamp + audit

---

## Epic 8: Fraud Closed-Loop & SIU
**P1 | L | Fraud Team**

- E8-T1: SIU Case Lifecycle | M | P1 | State machine complete
- E8-T2: Investigation Notebook | M | P1 | Timeline + evidence + notes UI
- E8-T3: Graph Analytics | L | P1 | Network relationship detection
- E8-T4: Closed-Loop Feedback | L | P1 | Outcome → retraining signal
- E8-T5: Watchlist Management | M | P1 | CRUD + alert on match
- E8-T6: Fraud → Claims hold integration | M | P0 | High score → auto hold + alert

---

## Epic 9: AML Case Management
**P1 | L | Compliance**

- E9-T1: AML Case Lifecycle | M | P1 | Alert → review → SAR → close
- E9-T2: External Screening (Sanctions/PEP) | L | P1 | Sync + local cache
- E9-T3: SAR Report Generation | M | P1 | Generate SAR package
- E9-T4: Real-time Transaction Monitoring | M | P1 | Stream → AML engine
- E9-T5: AML Officer Dashboard | M | P1 | Queues + alerts + SLA

---

## Epic 10: Complaint Regulatory Escalation
**P1 | M | Complaints**

- E10-T1: Regulator Export Schema | S | P1 | بیمه مرکزی schema
- E10-T2: Export Generator (PDF/XML) | M | P1 | Regulator-ready package
- E10-T3: Root Cause + CAPA Tracking | M | P1 | Cause → Action → Verify
- E10-T4: Complaint Analytics Dashboard | M | P1 | Volume + trend + SLA breach
- E10-T5: Auto-link Policy/Claim | S | P1 | Auto-link by metadata

---

## Epic 11: Reinsurance Iran Operations
**P1 | L | Reinsurance**

- E11-T1: Treaty vs Facultative Config | M | P1 | Full config support
- E11-T2: Reconciliation & Settlement | L | P1 | Dispute resolution workflow
- E11-T3: Iran Mandatory Cession Billing | L | P1 | Periodic statements
- E11-T4: Reinsurance Analytics | M | P2 | Ceded/premium analytics

---

## Epic 12: Workflow & Rule Governance
**P1 | L | Platform**

- E12-T1: BPMN Config-Driven Flows | L | P1 | Visual workflow designer
- E12-T2: Rule Lifecycle Governance | M | P1 | Draft → Test → Approve → Deploy
- E12-T3: Case Management Deep | M | P1 | Full case lifecycle
- E12-T4: Workflow Analytics | M | P2 | Bottleneck + SLA tracking

---

## Epic 13: Executive BI & KPI Governance
**P1 | L | Reporting**

- E13-T1: KPI Catalog Definition | M | P1 | Formula + source + owner
- E13-T2: Executive Cockpit Dashboard | L | P1 | Market share, combined ratio, NPS
- E13-T3: AI KPI Dashboard | L | P1 | Drift, cost, quality metrics
- E13-4: Market Intelligence | L | P2 | Benchmark analytics
- E13-5: KPI Data Lineage | M | P1 | Source system trace

---

## Epic 14: Sanhab & External Integration Hardening
**P0 | M | Regulatory + Platform**

- E14-T1: Real SOAP dependency fix | XS | P0 | soap package installed + configured
- E14-T2: Real credential setup & test | S | P0 | Test against real Sanhab sandbox
- E14-T3: Multi-channel inquiry (SMS/VIN/کارپوشه) | L | P1 | Orchestration layer
- E14-T4: Data Quality Gate enforcement | M | P0 | Pre-submission validation
- E14-T5: Integration runbook per external | S | P0 | Runbook + health check + fallback

---

## Epic 15: Security, Privacy & Audit Hardening
**P1 | L | Security + Platform**

- E15-T1: Data Inventory & Classification | M | P1 | Catalog all datasets
- E15-T2: Immutable Audit Architecture | L | P1 | Append-only + tamper-evident
- E15-T3: Privacy Control Plane | M | P1 | DSR + consent lineage
- E15-T4: ABAC Implementation | L | P1 | Attribute-based decisions
- E15-T5: SoD Enforcement | M | P1 | Block violating approvals
- E15-T6: Secrets Rotation Automation | M | P1 | Automated KMS rotation

---

## Epic 16: SRE & Production Readiness
**P0 | L | Platform + SRE**

- E16-T1: Per-Service Readiness Checklist | M | P0 | Config + migration + health + backup + alert + runbook per service
- E16-T2: SLO Definition per Journey | M | P0 | issuance, claims, AI API SLO defined
- E16-T3: Chaos/Resilience Game Days | L | P1 | Failure mode testing
- E16-T4: Capacity Planning | M | P1 | Scaling policy + forecast
- E16-5: DR/Backup Automation | M | P1 | Automated backup + restore test

---

## Epic 17: UI/UX Design System Consolidation
**P1 | M | Frontend**

- E17-T1: Shared Design System Library | M | P1 | Component library + tokens
- E17-T2: BFF Strategy Definition | S | P1 | BFF per portal strategy
- E17-T3: Admin UX Enhancement | M | P1 | Empty states + bulk workflow + keyboard
- E17-T4: Role-based Cockpits | L | P1 | Adjuster, Underwriter, SIU, AML, Complaint cockpits

---

## Epic 18: Tenant Deployment Blueprint
**P1 | XL | Platform + DevOps**

- E18-T1: Multi-tenant Config Schema | M | P1 | Per-tenant config structure
- E18-T2: Tenant Onboarding Automation | L | P1 | Provisioning workflow
- E18-T3: Per-Tenant Secrets Management | M | P1 | KMS per tenant
- E18-T4: Tenant Isolation Verification | L | P0 | Cross-tenant leak test
- E18-5: Database Migration Strategy | M | P1 | Per-tenant migration safety

---

## جمع‌بندی آماری

| Epic | Priority | Effort |
|------|----------|--------|
| E1: Truth Alignment | P0 | M |
| E2: Agent Portal | P0 | L |
| E3: Customer Portal | P0 | XL |
| E4: AI Governance | P0 | XL |
| E5: Knowledge Layer | P1 | XL |
| E6: Model Switchboard | P1 | L |
| E7: Document AI | P1 | L |
| E8: Fraud Closed-Loop | P1 | L |
| E9: AML Case Mgmt | P1 | L |
| E10: Complaint Regulator | P1 | M |
| E11: Reinsurance Iran | P1 | L |
| E12: Workflow Governance | P1 | L |
| E13: Executive BI | P1 | L |
| E14: Sanhab Hardening | P0 | M |
| E15: Security Hardening | P1 | L |
| E16: SRE Readiness | P0 | L |
| E17: UX Consolidation | P1 | M |
| E18: Tenant Blueprint | P1 | XL |

**Total**: 18 Epic | ~80+ Task | ۶ P0 Epic | ۱۲ P1 Epic
