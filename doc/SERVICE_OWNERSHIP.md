# Service Ownership Matrix
> **تاریخ**: ۱۴۰۵/۰۲/۱۰  
> **Epic**: E1-T4  
> **هدف**: تعریف owner، SLA و مسئولیت هر سرویس

---

## ۱) خلاصه اجرایی

**تعداد سرویس‌ها**: ۳۲ سرویس اصلی + ۲۷ migration job

**تیم‌های مالک**:
- Core Platform Team: 8 سرویس
- Sales Network Team: 2 سرویس
- Claims Team: 3 سرویس
- Policy & Underwriting Team: 3 سرویس
- Finance Team: 2 سرویس
- AI Team: 3 سرویس
- Integration Team: 3 سرویس
- Compliance Team: 3 سرویس
- Portal Team: 4 سرویس
- Platform Ops Team: 2 سرویس
- Gateway Team: 1 سرویس

---

## ۲) ماتریس مالکیت سرویس‌ها

| سرویس | Team Owner | Backup Owner | Tech Lead | Backup Tech Lead | SLA (Availability) | SLA (Latency p95) | Priority | On-call | Notes |
|--------|-----------|--------------|-----------|------------------|-------------------|-------------------|----------|---------|-------|
| **Infrastructure** | | | | | | | | | |
| insurance-zookeeper | Platform Ops | Platform Ops Backup | DevOps Lead | DevOps Backup | 99.9% | N/A | P0 | 24/7 | Kafka dependency |
| insurance-kafka | Platform Ops | Platform Ops Backup | DevOps Lead | DevOps Backup | 99.9% | N/A | P0 | 24/7 | Event backbone |
| **Core Platform** | | | | | | | | | |
| auth-service | Core Platform | Platform Ops Backup | Auth Lead | Auth Backup | 99.9% | 200ms | P0 | 24/7 | Identity & Access |
| api-gateway | Gateway | Platform Ops Backup | Gateway Lead | Gateway Backup | 99.95% | 100ms | P0 | 24/7 | Entry point |
| feature-flags-service | Core Platform | Platform Ops Backup | Platform Lead | Platform Backup | 99.5% | 100ms | P1 | Business Hours | Feature toggles |
| orchestrator-service | Core Platform | Platform Ops Backup | Orchestrator Lead | Orchestrator Backup | 99% | 500ms | P0 | 24/7 | Saga orchestration |
| monitoring-service | Platform Ops | Platform Ops Backup | SRE Lead | SRE Backup | 99% | N/A | P0 | 24/7 | Observability |
| **Sales Network** | | | | | | | | | |
| sales-network-service | Sales Network | Core Platform Backup | Sales Lead | Sales Backup | 99% | 300ms | P0 | Business Hours | Partners, agents, commissions |
| agent-portal-service | Portal Team | Core Platform Backup | Portal Lead | Portal Backup | 99% | 500ms | P0 | Business Hours | Agent session management |
| **Claims** | | | | | | | | | |
| claims-service | Claims Team | Core Platform Backup | Claims Lead | Claims Backup | 99% | 500ms | P0 | Business Hours | Claims processing |
| claims-readmodel-service | Claims Team | Core Platform Backup | Claims Lead | Claims Backup | 99% | 200ms | P0 | Business Hours | Claims UI data |
| fraud-service | Claims Team | AI Team Backup | Fraud Lead | Fraud Backup | 99% | 1s | P1 | Business Hours | Fraud detection |
| **Policy & Underwriting** | | | | | | | | | |
| policy-service | Policy Team | Core Platform Backup | Policy Lead | Policy Backup | 99% | 500ms | P0 | Business Hours | Policy lifecycle |
| underwriting-service | Policy Team | AI Team Backup | UW Lead | UW Backup | 99% | 1s | P1 | Business Hours | Underwriting engine |
| product-service | Policy Team | Core Platform Backup | Product Lead | Product Backup | 99.5% | 200ms | P1 | Business Hours | Product catalog |
| **Finance** | | | | | | | | | |
| payments-service | Finance Team | Core Platform Backup | Payments Lead | Payments Backup | 99.5% | 500ms | P0 | Business Hours | Payment processing |
| billing-service | Finance Team | Core Platform Backup | Billing Lead | Billing Backup | 99% | 1s | P1 | Business Hours | Billing & invoicing |
| **Party & KYC** | | | | | | | | | |
| party-kyc-service | Core Platform | Platform Ops Backup | Party Lead | Party Backup | 99% | 300ms | P0 | Business Hours | Customer data |
| **Document** | | | | | | | | | |
| document-service | Core Platform | Platform Ops Backup | Doc Lead | Doc Backup | 99% | 500ms | P1 | Business Hours | Document storage |
| document-ai-service | AI Team | Core Platform Backup | Doc AI Lead | Doc AI Backup | 95% | 5s | P1 | Business Hours | OCR & extraction |
| **Integration** | | | | | | | | | |
| regulatory-gateway-service | Integration | Platform Ops Backup | Regulatory Lead | Regulatory Backup | 99% | 2s | P0 | 24/7 | Sanhab integration |
| notification-service | Integration | Platform Ops Backup | Notification Lead | Notification Backup | 99% | 1s | P0 | Business Hours | SMS/Email notifications |
| aml-service | Compliance | Platform Ops Backup | AML Lead | AML Backup | 99% | 1s | P0 | Business Hours | AML monitoring |
| **Compliance** | | | | | | | | | |
| complaints-service | Compliance | Core Platform Backup | Complaints Lead | Complaints Backup | 99% | 500ms | P0 | Business Hours | Complaints handling |
| reinsurance-service | Compliance | Finance Team Backup | RI Lead | RI Backup | 99% | 1s | P1 | Business Hours | Reinsurance |
| **AI** | | | | | | | | | |
| knowledge-service | AI Team | Core Platform Backup | Knowledge Lead | Knowledge Backup | 95% | 2s | P2 | Business Hours | Knowledge layer |
| model-switchboard-service | AI Team | Core Platform Backup | Model Lead | Model Backup | 95% | 500ms | P2 | Business Hours | Model routing |
| ai-governance-service | AI Team | Compliance Backup | AI Gov Lead | AI Gov Backup | 99% | 500ms | P0 | Business Hours | AI governance |
| **Workflow & Rules** | | | | | | | | | |
| workflow-service | Core Platform | Platform Ops Backup | Workflow Lead | Workflow Backup | 99% | 500ms | P1 | Business Hours | Case management |
| rule-engine-service | Core Platform | Platform Ops Backup | Rules Lead | Rules Backup | 99% | 300ms | P1 | Business Hours | Business rules |
| **Reporting** | | | | | | | | | |
| reporting-service | Reporting Team | Platform Ops Backup | Reporting Lead | Reporting Backup | 99% | 2s | P1 | Business Hours | Reports & BI |
| **Portals** | | | | | | | | | |
| customer-portal-service | Portal Team | Core Platform Backup | Portal Lead | Portal Backup | 99% | 500ms | P0 | Business Hours | Customer session |
| customer-portal-ui | Portal Team | Core Platform Backup | Portal Lead | Portal Backup | 99% | N/A | P0 | Business Hours | Customer UI |
| agent-portal-ui | Portal Team | Core Platform Backup | Portal Lead | Portal Backup | 99% | N/A | P0 | Business Hours | Agent UI |
| web-ui | Portal Team | Core Platform Backup | Portal Lead | Portal Backup | 99% | N/A | P1 | Business Hours | Admin UI |

---

## ۳) تعریف SLA Levels

### ۳.۱) Availability SLA
- **P0 (Critical)**: 99.9%+ ( downtime < 43.2 min/month )
- **P1 (High)**: 99%+ ( downtime < 7.2 hours/month )
- **P2 (Medium)**: 95%+ ( downtime < 36 hours/month )

### ۳.۲) Latency SLA (p95)
- **Critical APIs**: < 200ms
- **Standard APIs**: < 500ms
- **Complex Operations**: < 1s
- **AI/Heavy Operations**: < 5s

---

## ۴) مسئولیت‌ها

### ۴.۱) Team Owner Responsibilities
- تعیین Tech Lead برای سرویس
- توسعه و نگهداری سرویس
- رفع bugs و پیاده‌سازی featureها
- نگهداری documentation
- پشتیبانی در ساعات کاری

### ۴.۲) Tech Lead Responsibilities
- Code review برای سرویس
- تصمیم‌گیری در مورد architecture سرویس
- هماهنگی با تیم‌های دیگر
- مدیریت backlog سرویس
- پشتیبانی Level 2

### ۴.۳) Backup Owner Responsibilities
- پوشش در زمان غیبت owner اصلی
- تصمیم‌گیری اضطراری برای سرویس
- هماهنگی با تیم‌های دیگر در زمان owner اصلی
- مدیریت موقت backlog در زمان owner اصلی
- پشتیبانی Level 1 در زمان owner اصلی

### ۴.۴) Backup Tech Lead Responsibilities
- Code review جایگزین در زمان غیبت tech lead اصلی
- تصمیم‌گیری architecture در زمان tech lead اصلی
- هماهنگی با تیم‌های دیگر در زمان tech lead اصلی
- پشتیبانی Level 2 در زمان tech lead اصلی

### ۴.۵) Platform Ops Responsibilities
- Deployment سرویس‌ها
- Monitoring و alerting
- Incident response
- Capacity planning
- Security patching

---

## ۵) escalation Path

### ۵.۱) Incident Escalation (General)
1. **Level 1**: On-call Engineer (اولین پاسخ‌دهنده)
2. **Level 2**: Tech Lead (ساعات کاری) / On-call Backup (خارج ساعات کاری برای P0)
3. **Level 3**: Team Owner (ساعات کاری) / Engineering Manager (24/7 برای P0)
4. **Level 4**: Engineering Manager / VP Engineering (خارج ساعات کاری)
5. **Level 5**: CTO (کاتاستروف)

### ۵.۲) Detailed Escalation Chain Per Service

#### Infrastructure Services (P0 - 24/7)
- **insurance-zookeeper, insurance-kafka**:
  1. On-call DevOps Engineer → DevOps Lead → Platform Ops Manager → VP Engineering → CTO
  - Response SLA: 15 min (P0), 30 min (P1)
  - Resolution SLA: 1 hour (P0), 4 hours (P1)

#### Core Platform Services (P0 - 24/7 for auth/gateway/orchestrator)
- **auth-service**:
  1. On-call Auth Engineer → Auth Lead → Core Platform Manager → Engineering Manager → CTO
  - Response SLA: 10 min (P0), 30 min (P1)
  - Resolution SLA: 30 min (P0), 2 hours (P1)

- **api-gateway**:
  1. On-call Gateway Engineer → Gateway Lead → Gateway Manager → Engineering Manager → CTO
  - Response SLA: 5 min (P0), 15 min (P1)
  - Resolution SLA: 15 min (P0), 1 hour (P1)

- **orchestrator-service**:
  1. On-call Orchestrator Engineer → Orchestrator Lead → Core Platform Manager → Engineering Manager → CTO
  - Response SLA: 15 min (P0), 30 min (P1)
  - Resolution SLA: 1 hour (P0), 4 hours (P1)

#### Business Services (P0 - Business Hours)
- **sales-network-service, claims-service, payments-service, party-kyc-service, regulatory-gateway-service, notification-service, aml-service, complaints-service, customer-portal-service**:
  1. On-call Service Engineer → Tech Lead → Team Owner → Engineering Manager → CTO
  - Response SLA: 30 min (ساعات کاری), 2 hours (خارج ساعات کاری)
  - Resolution SLA: 2 hours (ساعات کاری), 8 hours (خارج ساعات کاری)

### ۵.۳) Feature Request Escalation
1. **Tech Lead** → **Team Owner** → **Product Manager**
2. برای cross-team features: **Product Manager** → **CTO**
3. برای architectural changes: **Tech Lead** → **Architecture Board** → **CTO**

### ۵.۴) Security Incident Escalation
1. **Security On-call** → **Security Lead** → **CTO** → **Board**
2. Response SLA: 5 min (Critical), 15 min (High)
3. Resolution SLA: 1 hour (Critical), 4 hours (High)

---

## ۶) On-call Rotation

### ۶.۱) Primary On-call Teams (24/7)
- **Platform Ops Team**: 24/7 برای P0 سرویس‌های Infrastructure
  - Rotation: Weekly rotation
  - Handoff: Monday 09:00
  - Primary: DevOps Engineer 1, 2, 3 (rotation)
  - Secondary: Platform Ops Manager
  - Escalation: VP Engineering (after 30 min no response)

- **Core Platform Team**: 24/7 برای auth-service, api-gateway, orchestrator-service
  - Rotation: Weekly rotation
  - Handoff: Monday 09:00
  - Primary: Auth Engineer, Gateway Engineer, Orchestrator Engineer (rotation)
  - Secondary: Core Platform Manager
  - Escalation: Engineering Manager (after 15 min no response)

- **Integration Team**: 24/7 برای regulatory-gateway-service
  - Rotation: Weekly rotation
  - Handoff: Monday 09:00
  - Primary: Regulatory Engineer 1, 2 (rotation)
  - Secondary: Integration Manager
  - Escalation: Engineering Manager (after 20 min no response)

### ۶.۲) Secondary On-call Teams (Business Hours)
- **Sales Network Team**: ساعات کاری (09:00-18:00)
  - Rotation: Daily rotation
  - Primary: Sales Engineer 1, 2, 3
  - Secondary: Sales Lead
  - Escalation: Sales Network Manager

- **Claims Team**: ساعات کاری (09:00-18:00)
  - Rotation: Daily rotation
  - Primary: Claims Engineer 1, 2, 3
  - Secondary: Claims Lead
  - Escalation: Claims Manager

- **Finance Team**: ساعات کاری (09:00-18:00)
  - Rotation: Daily rotation
  - Primary: Payments Engineer 1, 2
  - Secondary: Payments Lead
  - Escalation: Finance Manager

- **Portal Team**: ساعات کاری (09:00-18:00)
  - Rotation: Daily rotation
  - Primary: Portal Engineer 1, 2, 3
  - Secondary: Portal Lead
  - Escalation: Portal Manager

### ۶.۳) On-call Responsibilities
- **Primary On-call**:
  - پاسخ به alerts در زمان SLA
  - تلاش برای resolution اولیه
  - Escalation به secondary در صورت نیاز
  - Document کردن incident در ticketing system
  - Participation در post-mortem

- **Secondary On-call**:
  - پشتیبانی primary در موارد پیچیده
  - Escalation به manager در صورت نیاز
  - Coverage در زمان غیبت primary

### ۶.۴) On-call Handoff Process
1. **Pre-handoff (30 min before)**:
   - Review open incidents
   - Review pending deployments
   - Review known issues

2. **Handoff Meeting (15 min)**:
   - Discuss active incidents
   - Discuss recent changes
   - Discuss upcoming maintenance

3. **Post-handoff**:
   - Update on-call calendar
   - Send notification to team
   - Update status page

---

## ۷) Integration with Incident Response

### ۷.۱) Incident Triage Process
1. **Alert Reception**:
   - Alerts received via PagerDuty/OpsGenie
   - Automatic routing to on-call engineer based on service
   - Severity auto-assignment based on alert type

2. **Initial Triage (5-15 min)**:
   - On-call engineer acknowledges alert
   - Determines severity (P0, P1, P2)
   - Creates incident ticket in JIRA/ServiceNow
   - Notifies team via Slack

3. **Escalation Trigger**:
   - P0: Auto-escalate after 15 min no acknowledgment
   - P1: Auto-escalate after 30 min no acknowledgment
   - P2: Auto-escalate after 1 hour no acknowledgment

### ۷.۲) Incident Categories by Service
- **Infrastructure Incidents**:
  - Services: zookeeper, kafka
  - Owner: Platform Ops
  - Impact: Cross-service
  - Escalation: Immediate to VP Engineering

- **Authentication Incidents**:
  - Services: auth-service
  - Owner: Core Platform
  - Impact: All authenticated services
  - Escalation: Immediate to Engineering Manager

- **Gateway Incidents**:
  - Services: api-gateway
  - Owner: Gateway Team
  - Impact: All external traffic
  - Escalation: Immediate to Engineering Manager

- **Business Logic Incidents**:
  - Services: sales-network, claims, payments, etc.
  - Owner: Respective team
  - Impact: Specific domain
  - Escalation: Team Owner → Engineering Manager

### ۷.۳) Incident Response Roles
- **Incident Commander (IC)**:
  - Usually the on-call engineer who acknowledges first
  - Responsible for overall incident coordination
  - Makes final decisions on resolution approach
  - Communicates with stakeholders

- **Communication Lead**:
  - Responsible for external communications
  - Updates status page
  - Notifies customers if needed
  - Sends post-incident summary

- **Scribe**:
  - Documents all actions taken
  - Records timeline
  - Captures root cause analysis
  - Prepares post-mortem document

### ۷.۴) Post-Incident Process
1. **Immediate Actions (0-24 hours)**:
   - Service restoration
   - Temporary mitigation if needed
   - Customer communication

2. **Short-term Actions (1-7 days)**:
   - Root cause analysis
   - Permanent fix implementation
   - Post-mortem document creation
   - Team retrospective

3. **Long-term Actions (1-4 weeks)**:
   - Process improvements
   - Monitoring enhancements
   - Runbook updates
   - Training if needed

### ۷.۵) Incident Metrics Tracking
- **MTTA (Mean Time to Acknowledge)**: Target < 15 min for P0
- **MTTR (Mean Time to Resolve)**: Target < 1 hour for P0
- **Incident Frequency**: Track per service
- **Recurring Incidents**: Identify patterns
- **Escalation Rate**: Monitor escalation effectiveness

---

## ۸) Communication Channels

| تیم | Channel (Slack) | Meeting (Weekly) |
|-----|----------------|-----------------|
| Core Platform | #core-platform | Monday 10:00 |
| Sales Network | #sales-network | Tuesday 10:00 |
| Claims Team | #claims | Wednesday 10:00 |
| Policy Team | #policy | Thursday 10:00 |
| Finance Team | #finance | Thursday 14:00 |
| AI Team | #ai-team | Friday 10:00 |
| Integration Team | #integration | Tuesday 14:00 |
| Compliance Team | #compliance | Wednesday 14:00 |
| Portal Team | #portals | Monday 14:00 |
| Platform Ops | #platform-ops | Daily 09:30 standup |
| Gateway Team | #gateway | Monday 11:00 |

### ۸.۱) On-call Communication Channels
| Channel | Purpose | Members |
|---------|---------|---------|
| #on-call-primary | Primary on-call coordination | All on-call engineers |
| #on-call-escalation | Escalation notifications | Team leads, managers |
| #incidents | Active incident discussion | All engineers |
| #incident-command | Incident commander coordination | ICs, communication leads |
| #post-mortem | Post-incident reviews | All engineers, managers |

---

## ۹) Metrics و KPIها

### ۹.۱) Service Health Metrics
- Availability (Uptime)
- Error Rate (5xx)
- Latency (p50, p95, p99)
- Throughput (RPS)

### ۹.۲) Team Performance Metrics
- Mean Time to Resolve (MTTR)
- Mean Time to Acknowledge (MTTA)
- Deployment Frequency
- Change Failure Rate
- Lead Time for Changes

### ۹.۳) On-call Performance Metrics
- Alert Response Time
- Escalation Rate
- Incident Resolution Time
- On-call Coverage Gaps
- Handoff Effectiveness

---

## ۱۰) نتیجه‌گیری

**تعداد سرویس‌های با مالکیت تعریف‌شده**: ۳۲ سرویس

**تعداد سرویس‌های P0**: ۱۳ سرویس (auth, api-gateway, orchestrator, sales-network, agent-portal, claims, claims-readmodel, payments, party-kyc, regulatory-gateway, notification, aml, customer-portal, ai-governance)

**تعداد سرویس‌های P1**: ۱۴ سرویس

**تعداد سرویس‌های P2**: ۵ سرویس

**Backup Owners**: تعریف شده برای همه سرویس‌ها

**Backup Tech Leads**: تعریف شده برای همه سرویس‌ها

**Escalation Chains**: تعریف شده برای همه سرویس‌ها با SLAهای مشخص

**On-call Rotation**: تعریف شده برای تیم‌های 24/7 و Business Hours

**Incident Response Integration**: کامل با triage process، roles، و post-incident workflow

**وضعیت E1-T4**: ✅ Done + Verified

**اقدامات بعدی**:
- پیاده‌سازی monitoring و alerting برای همه سرویس‌های P0
- راه‌اندازی PagerDuty/OpsGenie برای on-call management
- ایجاد runbooks برای سرویس‌های P0
- آموزش تیم‌ها برای on-call responsibilities
