# UAT (User Acceptance Testing) - Insurance Enterprise Console

## 1) هدف سند
این سند راهنمای جامع تست کاربری (UAT) برای UI سامانه «Insurance Enterprise Console» است.

تمرکز سند:
- اعتبارسنجی دسترسی‌ها و منوها بر اساس نقش‌ها (RBAC)
- اجرای سناریوهای کلیدی هر ماژول در UI
- چک‌لیست رفتارهای عمومی (Login/Logout، خطاها، فیلترها، Export)

## 2) پیش‌نیازهای اجرا

### 2.1) اجرای سرویس‌ها
- سرویس‌ها باید با Docker Compose بالا باشند.
- تمامی migrateها باید موفق باشند (همه `exit code 0`).

### 2.2) آدرس UI و Auth
- **Web UI**: `http://localhost:3030`
- **Auth Service** (برای Login): `http://localhost:3001`

### 2.3) کاربران تست (بر اساس اسکریپت)
فایل: `scripts/create-test-users.ps1`

- نام کاربری هر نقش: `test_<role>`
- ایمیل هر نقش: `test_<role>@insurance.local`
- پسورد مشترک: `Test12345!`

لیست نقش‌ها (مطابق اسکریپت):
- `insurer_admin`
- `head_office_ops`
- `risk_manager`
- `compliance_aml`
- `legal_ops`
- `complaints_handler`
- `branch_manager`
- `branch_staff`
- `claims_handler`
- `loss_adjuster`
- `fraud_analyst`
- `underwriter`
- `finance_ops`
- `collections_ops`
- `reinsurance_ops`
- `agency_owner`
- `agency_staff`
- `broker_owner`
- `broker_staff`
- `call_center`
- `auditor`
- `regulatory_view`

## 3) قوانین نمایش منو در UI (مبنای UAT)
منوی اصلی در `services/web-ui/src/components/app-shell.tsx` تعریف شده و بر اساس Permissionها/Roleها فیلتر می‌شود.

### 3.1) مسیرها (Routes) و شرط دسترسی
- `/` داشبورد: برای همه کاربران لاگین‌شده
- `/party` اشخاص/KYC: نیاز به `party:list`
- `/policies` بیمه‌نامه‌ها: نقش‌های policy (طبق `POLICY_NAV_ROLES`)
- `/payments` پرداخت‌ها: نیاز به `payments:list`
- `/collections` اقساط و وصول: نیاز به `collections:plan_list`
- `/aml` AML/انطباق: نیاز به `aml:dashboard`
- `/work-items` کارها: نیاز به `work_items:list`
- `/claims` خسارت: نیاز به `rm:claims:view`
- `/documents` اسناد: نیاز به `documents:list`
- `/fraud` تقلب: نیاز به `rm:fraud:view`
- `/complaints` شکایات: نیاز به `rm:complaints:view`
- `/sales-network` شبکه فروش: نیاز به `sales_network:partners:view`
- `/reporting` گزارش‌ها/KPI: نیاز به `reporting:view`
- `/monitoring` Monitoring/SLO: نیاز به `monitoring:dashboard:view`
- `/dlq` DLQ: نیاز به `dlq:stats`
- `/document-ai` Document AI: نیاز به `document_ai:jobs:list`
- `/reinsurance` اتکایی: نقش‌های `insurer_admin`, `head_office_ops`, `reinsurance_ops`, `finance_ops`
- `/product` محصولات: نقش‌های `insurer_admin`, `head_office_ops`, `uw_ops`, `product_ops`
- `/users` کاربران: فقط نقش `insurer_admin`
- `/org-units` واحدهای سازمانی: فقط نقش `insurer_admin`
- `/settings` تنظیمات: فقط نقش `insurer_admin`

## 4) سناریوهای عمومی (برای همه نقش‌ها)

### 4.1) Login
- **هدف**: ورود موفق و ذخیره توکن
- **مراحل**:
  1. ورود به `/login`
  2. وارد کردن `username` و `password`
  3. کلیک روی ورود
- **نتیجه مورد انتظار**:
  - انتقال به `/`
  - نمایش منو متناسب با نقش

### 4.2) عدم دسترسی بدون توکن
- **هدف**: ریدایرکت به Login
- **مراحل**:
  1. پاک کردن LocalStorage
  2. رفتن مستقیم به یک صفحه مثل `/claims`
- **نتیجه مورد انتظار**: انتقال به `/login`

### 4.3) Logout
- **هدف**: خروج و حذف توکن
- **مراحل**:
  1. از بخش Session/User، گزینه خروج
- **نتیجه مورد انتظار**:
  - حذف token
  - بازگشت به `/login`

## 5) سناریوهای نقش‌محور (Role-based)

در این بخش برای هر کاربر تست (`test_<role>`) حداقل تست‌های لازم تعریف شده است.

### 5.1) test_insurer_admin (نقش: insurer_admin)
- **انتظار منوها**:
  - داشبورد، اشخاص/KYC، بیمه‌نامه‌ها، پرداخت‌ها، اقساط، AML، Work Items، خسارت، اسناد، تقلب، شکایات، شبکه فروش، گزارش‌ها، Monitoring، DLQ، Document AI، اتکایی، محصولات، کاربران، واحدهای سازمانی، تنظیمات
- **سناریوهای کلیدی**:
  - **Users/Org Units/Settings**: ورود به صفحات و مشاهده بارگذاری UI بدون خطا
  - **Document AI**: مشاهده لیست Jobها و صفحات مرتبط
  - **Monitoring**: مشاهده داشبورد و لیست SLO

### 5.2) test_head_office_ops (نقش: head_office_ops)
- **انتظار منوها**:
  - پرداخت‌ها، اقساط، AML (read-heavy)، شکایات، شبکه فروش، اسناد (list/view)، گزارش‌ها، Monitoring، DLQ، Document AI، خسارت (RM)
- **سناریوها**:
  - **Payments**: مشاهده لیست و جزئیات
  - **Collections**: مشاهده planها/اقساط
  - **Complaints**: مشاهده/تغییر وضعیت

### 5.3) test_claims_handler (نقش: claims_handler)
- **انتظار منوها**:
  - خسارت، اسناد، Work Items، گزارش‌ها
- **سناریوها**:
  - **Claims**: مشاهده لیست/جزئیات (Read Model)
  - **Work Items**: مشاهده و تکمیل کار
  - **Documents**: مشاهده و Upload

### 5.4) test_complaints_handler (نقش: complaints_handler)
- **انتظار منوها**:
  - شکایات، گزارش‌ها
- **سناریوها**:
  - **Complaints**: ایجاد شکایت، مشاهده، تغییر وضعیت، پیوست سند، OTP request/verify، Export

### 5.5) test_fraud_analyst (نقش: fraud_analyst)
- **انتظار منوها**:
  - تقلب، Work Items، گزارش‌ها، خسارت (RM)
- **سناریوها**:
  - **Fraud**: triage/investigate/escalate
  - **Work Items**: مشاهده و تکمیل

### 5.6) test_compliance_aml (نقش: compliance_aml)
- **انتظار منوها**:
  - AML، اشخاص/KYC، گزارش‌ها
- **سناریوها**:
  - **AML Dashboard**: مشاهده داشبورد
  - **AML Alerts**: مشاهده لیست و تغییر وضعیت/assign
  - **AML Export**: خروجی گرفتن

### 5.7) test_finance_ops (نقش: finance_ops)
- **انتظار منوها**:
  - پرداخت‌ها، گزارش‌ها، اتکایی (طبق roles در nav)
- **سناریوها**:
  - **Payments**: approve/execute/fail/notify (در UI حداقل مسیرها و دکمه‌ها بررسی شود)

### 5.8) test_branch_staff (نقش: branch_staff)
- **انتظار منوها**:
  - اشخاص، خسارت (RM)، شکایات (RM)، اسناد
- **سناریوها**:
  - **Party**: ایجاد/مشاهده
  - **Complaints**: ایجاد و مشاهده

### 5.9) test_call_center (نقش: call_center)
- **انتظار منوها**:
  - خسارت (register)، شکایات (create)، اشخاص (create/view)

### 5.10) test_auditor (نقش: auditor)
- **انتظار منوها**:
  - خسارت/پرداخت‌ها/شکایات/اسناد/اشخاص/گزارش‌ها/شبکه فروش + Monitoring + Document AI + DLQ (read)
- **سناریوها**:
  - **Exportها**: در ماژول‌هایی که export دارند بررسی شود

## 6) چک‌لیست رگرسیون UI
- **منوها**: هر نقش فقط منوهای مجاز را ببیند
- **API Errors**: خطاها به شکل کاربرپسند نمایش داده شوند
- **فیلتر/جستجو**: با داده کم/بدون داده، UI نریزد
- **Export**: فایل خروجی تولید شود یا پیام خطای درست نمایش داده شود
- **RTL/فونت**: متن‌ها خوانا و راست‌به‌چپ درست

---

## وضعیت کار
- Migrationها: انجام شد (exit code 0)
- UAT.md: ایجاد شد (نسخه اولیه)
- Kafka document-ai-service: در نوبت بعدی

---

## UAT Document (User Acceptance Tests) – Insurance Platform

> **Prepared for**: QA & Business Teams  
> **Version**: 1.2 (Feb 2026)  
> **Scope**: Role-based UI navigation, CRUD workflows, permissions, error handling, concurrency, and performance

---

## 1) How to Use This Document

- **Test Users**: Use the PowerShell script `scripts/create-test-users.ps1` to create test users with predefined roles.
- **Login**: Access the UI at `http://localhost:3030/login`.
- **Permissions**: All navigation and actions are controlled by enterprise RBAC (see `services/web-ui/src/lib/enterprise-rbac.ts`).
- **Reporting**: Note any deviation, broken navigation, or permission error in a bug tracker with the role and steps.

---

## 2) Test Users & Roles

Run `scripts/create-test-users.ps1` to create the following users (password: `Test123!`):

| Username | Role(s) | Description |
|----------|---------|-------------|
| `admin_test` | `super_admin` | Full access to all pages and actions |
| `claims_test` | `claims_adjuster` | Claims, documents, payments, fraud, reporting |
| `complaints_test` | `complaints_officer` | Complaints, documents, reporting |
| `fraud_test` | `fraud_analyst` | Fraud, reporting |
| `aml_test` | `aml_officer` | AML, reporting |
| `product_test` | `product_manager` | Products, coverages, deductibles, pricing rules |
| `monitoring_test` | `ops` | Monitoring, reporting |
| `reporting_test` | `bi_analyst` | Reporting only |
| `sales_test` | `sales_agent` | Sales network (UI not yet implemented) |
| `collections_test` | `collections_ops` | Collections and installments |
| `regulatory_test` | `regulatory_view` | Read-only regulatory gateway (UI not yet implemented) |
| `underwriter_test` | `underwriter` | Underwriting (UI not yet implemented) |
| `loss_adjuster_test` | `loss_adjuster` | Loss adjustment (UI not yet implemented) |
| `agency_admin_test` | `agency_admin` | Agency management (UI not yet implemented) |
| `broker_test` | `broker` | Broker operations (UI not yet implemented) |
| `reinsurance_test` | `reinsurance_ops` | Reinsurance (UI not yet implemented) |

---

## 3) General UI Behavior (All Roles)

| Scenario | Steps | Expected |
|----------|-------|----------|
| **Login** | Enter username/password; click Login | Redirect to dashboard; token stored in localStorage |
| **Logout** | Clear token or navigate to `/login` | Shows login page; no access to protected pages |
| **Forbidden** | Access a page without permission | Redirect to `/forbidden` with message and options |
| **Dashboard Health Cards** | View overview cards | Show health status for API Gateway, Claims, Documents, Fraud, Orchestrator, Auth, Feature Flags with OK/DOWN and latency |
| **Navigation Menu** | Open sidebar/menu | Only show items allowed by role (see section 4) |
| **Error Handling** | Trigger an API error (e.g., invalid input) | Show error banner with message and correlationId |

---

## 4) Role-Based Navigation & Access

### 4.1) Super Admin (`admin_test`)
- **Menu items**: All items visible
- **Pages**: All pages accessible
- **Special**: Can access admin-only features (if any)

### 4.2) Claims Adjuster (`claims_test`)
- **Menu items**: Dashboard, Party/KYC, Claims, Documents, Payments, Fraud, Reporting, Monitoring
- **Pages**:
  - **Claims**: List, filter, register new claim, view claim details (NOTE: detail page not implemented; navigation leads to 404)
  - **Payments**: List, filter, prepare, approve, execute, fail, notify
  - **Fraud**: List, filter, clear/confirm/escalate cases
  - **Documents**: ✅ **Implemented**: Upload, download, preview, filter, link to claims
  - **Reporting**: Full access (KPIs, snapshots, governance, reinsurance projections, exports)
  - **Monitoring**: View dashboard, alerts, SLOs, acknowledge alerts
  - **Party/KYC**: List, create, filter persons

### 4.3) Complaints Officer (`complaints_test`)
- **Menu items**: Dashboard, Party/KYC, Complaints, Documents, Reporting, Monitoring
- **Pages**:
  - **Complaints**: List, filter, create, update status, attach documents, OTP request/verify, export Central Insurance JSON
  - **Documents**: ✅ **Implemented**: Upload, download, preview, filter, link to claims
  - **Reporting**: Full access
  - **Monitoring**: View-only (no acknowledge)
  - **Party/KYC**: List, create, filter

### 4.4) Fraud Analyst (`fraud_test`)
- **Menu items**: Dashboard, Fraud, Reporting, Monitoring
- **Pages**:
  - **Fraud**: List, filter, clear/confirm/escalate cases
  - **Reporting**: Full access
  - **Monitoring**: View-only

### 4.5) AML Officer (`aml_test`)
- **Menu items**: Dashboard, AML, Reporting, Monitoring
- **Pages**:
  - **AML**: Tabs: Dashboard, Alerts (list, assign, update status), Rules (list, create, update), Consents (list, create, revoke), Export (snapshot JSON)
  - **Reporting**: Full access
  - **Monitoring**: View-only

### 4.6) Product Manager (`product_test`)
- **Menu items**: Dashboard, Product, Reporting, Monitoring
- **Pages**:
  - **Product**: Tabs: Products (CRUD, archive), Coverages (CRUD, archive, requires product selection), Deductibles (CRUD, archive, requires product selection), Pricing Rules (CRUD, archive, requires product selection), Export (JSON)
  - **Reporting**: Full access
  - **Monitoring**: View-only

### 4.7) Collections Ops (`collections_test`)
- **Menu items**: Dashboard, Collections, Reporting, Monitoring
- **Pages**:
  - **Collections**: Plans (list, filter, create, view installments), Installments (list, pay), Export (JSON)
  - **Reporting**: Full access
  - **Monitoring**: View-only

### 4.8) Ops (`monitoring_test`)
- **Menu items**: Dashboard, Monitoring, Reporting
- **Pages**:
  - **Monitoring**: Dashboard, Alerts (list, acknowledge), SLOs (list)
  - **Reporting**: Full access

### 4.9) BI Analyst (`reporting_test`)
- **Menu items**: Dashboard, Reporting
- **Pages**:
  - **Reporting**: Full access (no write actions)
  - **Monitoring**: Not accessible (forbidden)

### 4.10) Roles with No UI Yet (Menu items visible but pages missing)
- **Sales Agent**, **Underwriter**, **Loss Adjuster**, **Agency Admin**, **Broker**, **Reinsurance Ops**, **Regulatory View**
- **Expected**: Menu items appear but lead to forbidden or 404 until implemented.
- **Note**: Underwriter and Loss Adjuster share Claims UI; no dedicated workflows.

---

## 5) Page-Level Test Scenarios

### 5.1) Dashboard (`/`)
- **All roles**: View health cards; refresh
- **Expected**: Cards show health for 7 services; refresh updates status

### 5.2) Party/KYC (`/party`)
- **Roles allowed**: `claims_adjuster`, `complaints_officer`, `super_admin`
- **Actions**:
  - List persons with pagination
  - Filter by nationalId
  - Create person (natural/legal) with name, nationalId, mobile (optional)
  - View status
- **Expected**: Create button disabled for unauthorized roles; create success updates list

### 5.3) Claims (`/claims`)
- **Roles allowed**: `claims_adjuster`, `super_admin`
- **Actions**:
  - List claims with pagination; filter by status, policyId
  - Register new claim (form: policyId, claimantPartyId, lossDate, lossType, description)
  - Click claim to view details (✅ **Implemented**: Full detail page with tabs)
  - Bulk select claims (checkboxes, select all)
  - Bulk actions: export, assign, close (with confirmation)
- **Tabs in Detail Page**:
  - **Overview**: Claim info, reinsurance details, amounts, parties, timestamps
  - **Documents**: List, download, preview (for images/PDFs), link to claim
  - **Payments**: List payment intents with status, amounts, execution dates
  - **Timeline**: Event history with correlationId and expandable event data
- **Expected**: Register button disabled for unauthorized; list updates after create; detail page loads correctly; bulk selection works

### 5.4) Payments (`/payments`)
- **Roles allowed**: `claims_adjuster`, `super_admin`
- **Actions**:
  - List payment intents; filter by claimId, status
  - Prepare payment (claimId, amount, idempotencyKey)
  - Approve, Execute, Fail, Notify per payment
- **Expected**: Buttons disabled for unauthorized; actions update status

### 5.5) Collections (`/collections`)
- **Roles allowed**: `collections_ops`, `super_admin`
- **Actions**:
  - List plans; filter by policyId, status
  - Create plan (policyId, premiumAmount, currency, idempotencyKey, installments list)
  - Select plan to view/installments; pay installment
- **Expected**: Create/pay disabled for unauthorized; plan status updates after payments

### 5.6) Fraud (`/fraud`)
- **Roles allowed**: `fraud_analyst`, `claims_adjuster`, `super_admin`
- **Actions**:
  - List cases; filter by status, claimId
  - Clear/Confirm/Escalate case (with review notes and escalation confirmation)
- **Expected**: Action buttons disabled for unauthorized; escalation requires confirmation text

### 5.7) AML (`/aml`)
- **Roles allowed**: `aml_officer`, `super_admin`
- **Tabs**:
  - **Dashboard**: KPI cards (open unassigned alerts, totals by status)
  - **Alerts**: List; assign (prompt), update status (prompt)
  - **Rules**: List; create (prompt), update (prompt)
  - **Consents**: List; create (prompt), revoke (prompt)
  - **Export**: Snapshot JSON
- **Expected**: Tabs disabled per permissions; prompts for required fields

### 5.8) Product (`/product`)
- **Roles allowed**: `product_manager`, `super_admin`
- **Tabs**:
  - **Products**: CRUD (code, nameFa, nameEn, lineOfBusiness); archive
  - **Coverages**: CRUD (requires product selection); archive
  - **Deductibles**: CRUD (requires product selection); archive
  - **Pricing Rules**: CRUD (requires product selection); archive
  - **Export**: JSON snapshot
- **Expected**: Create buttons disabled if no product selected for child tabs; archive confirmation

### 5.9) Complaints (`/complaints`)
- **Roles allowed**: `complaints_officer`, `super_admin`
- **Actions**:
  - List complaints; filter by status, complaintType, policyNumber, claimId, complainantNationalId
  - Create complaint (many fields; see UI)
  - Update status with resolutionSummary
  - Attach document (documentId, notes)
  - OTP request/verify (mobile verification flow)
  - Export Central Insurance JSON
- **Expected**: Create/update/attach/OTP/export disabled for unauthorized; OTP buttons disabled if verified

### 5.10) Reporting (`/reporting`)
- **Roles allowed**: `bi_analyst`, `claims_adjuster`, `complaints_officer`, `fraud_analyst`, `aml_officer`, `product_manager`, `collections_ops`, `ops`, `super_admin`
- **Sections**:
  - **Ready KPIs**: Issuance speed, claim payout time, fraud identified rate
  - **KPI Snapshots**: Ingest (with governance validation), list/filter/export
  - **Governance**: Admin only (manage KPI policies)
  - **Reinsurance Projections**: Ceded, Borderaux, Recoveries with filters and pagination
  - **Other Projections**: Claim documents attached, claim payments, fraud escalations, complaint SLA breaches
- **Expected**: Ingest validation errors for governed KPIs; admin-only governance section

### 5.11) Monitoring (`/monitoring`)
- **Roles allowed**: `ops`, `claims_adjuster`, `complaints_officer`, `fraud_analyst`, `aml_officer`, `product_manager`, `collections_ops`, `super_admin`
- **Actions**:
  - Dashboard: SLO totals, healthy, breached
  - SLOs: List
  - Alerts: List; acknowledge (prompt) (only for `ops` and `super_admin`)
- **Expected**: Acknowledge button disabled for non-ops; prompt for acknowledgedBy

### 5.12) Documents (`/documents`)
- **Roles allowed**: `claims_adjuster`, `complaints_officer`, `super_admin`
- **Actions**:
  - List documents with pagination; filter by claimId
  - Upload document (file, documentType, claimId)
  - Download document
  - Preview document (images/PDFs)
  - Navigate to associated claim
- **Expected**: Upload button disabled for unauthorized; file validation; preview opens in new tab

### 5.13) Policies (`/policies`)
- **Roles allowed**: `underwriter`, `super_admin`
- **Actions**:
  - Quote creation (partyId, lineOfBusiness, dates, premiumAmount)
  - List policies with pagination; filter by partyId, uniqueCode
  - Policy lifecycle management in drawer:
    - Submit documents (JSON)
    - Risk assessment (JSON)
    - Underwriting decision (approved/rejected/escalated with notes)
    - Sanhab inquiry (nationalId, uniqueCode, policyNumber, VIN)
    - Quality Gate override (issue/set_unique_code with audit reason)
    - View inquiry history and policy changes
- **Expected**: All actions disabled for unauthorized; workflow steps enforce status transitions

### 5.14) User Management (`/admin/users`)
- **Roles allowed**: `super_admin`
- **Actions**:
  - List users with pagination; filter by status, role, search query
  - Create new user (username, email, firstName, lastName, password, roles, department, orgUnitId, positionTitle, nationalId)
  - Edit existing user (all fields except username/email for existing users)
  - Change user status (activate/deactivate)
  - Role assignment with checkboxes for all available roles
- **Expected**: All actions disabled for unauthorized; validation on required fields; role checkboxes work correctly

### 5.15) Real-time Updates Test (`/admin/realtime-test`)
- **Roles allowed**: `super_admin`
- **Actions**:
  - View real-time connection status (connected/disconnected)
  - Subscribe to all event types for testing
  - Send test events via interface
  - Filter events by type
  - View event history with timestamps and correlation IDs
  - Clear event history
- **Expected**: Connection status updates automatically; events appear in real-time; filtering works correctly

### 5.16) Background Job Queue (`/admin/jobs`)
- **Roles allowed**: `super_admin`
- **Actions**:
  - List jobs with pagination; filter by status, jobType, search query
  - View job details (payload, result, error, timestamps)
  - Cancel pending/running jobs
  - Retry failed jobs
  - View job status (pending, running, completed, failed, cancelled)
  - View job priority (low, normal, high, critical)
- **Expected**: All actions disabled for unauthorized; job status updates correctly; retry works for failed jobs

### 5.17) Sales/Agency Partners (`/sales-network/partners`)
- **Roles allowed**: `insurer_admin`, `head_office_ops`, `agency_owner`, `agency_staff`, `broker_owner`, `broker_staff`
- **Actions**:
  - List partners with pagination; filter by status, partnerType, search query
  - Create new partner (agency/broker with all details)
  - Edit existing partner
  - View partner details (legal info, contact, commission, contract)
  - Manage partner status (active, inactive, suspended, pending)
- **Expected**: All actions disabled for unauthorized; validation on required fields; commission and credit limit work correctly

### 5.18) Reinsurance Contracts (`/reinsurance/contracts`)
- **Roles allowed**: `insurer_admin`, `head_office_ops`, `reinsurance_ops`, `finance_ops`
- **Actions**:
  - List contracts with pagination; filter by status, contractType, search query
  - Create new contract (quota_share, excess_of_loss, stop_loss, facultative)
  - Edit existing contract
  - View contract details (reinsurer, retention, share, premium, broker)
  - Manage contract status (active, expired, pending, cancelled)
- **Expected**: All actions disabled for unauthorized; validation on required fields; retention and share calculations work correctly

### 5.19) Feature Flags (`/admin/feature-flags`)
- **Roles allowed**: `super_admin`
- **Actions**:
  - List flags with pagination; filter by environment, targetType, search query
  - Create new flag (key, name, description, environment, targetType)
  - Edit existing flag
  - Toggle flag status (active/inactive)
  - View flag details and target configuration
- **Expected**: All actions disabled for unauthorized; validation on required fields; toggle works correctly

### 5.20) Distributed Tracing (`/admin/tracing`)
- **Roles allowed**: `super_admin`
- **Actions**:
  - List traces with pagination; filter by service, status, search query
  - View trace details (operation, service, duration, status)
  - View spans within a trace with parent-child relationships
  - View span logs and tags
  - Filter traces by service name (claims, payments, collections, fraud, aml, complaints, reporting, orchestrator)
- **Expected**: All actions disabled for unauthorized; spans load correctly; duration formatting works

### 5.21) Audit Log (`/admin/audit-log`)
- **Roles allowed**: `super_admin`
- **Actions**:
  - List audit logs with pagination; filter by action, entityType, userId, date range
  - View log details (user, action, entity, changes, IP, timestamp)
  - View change history with old/new values for each field
  - View correlation ID for traceability
  - Filter by action type (create, update, delete, login, logout, export)
  - Filter by entity type (user, claim, policy, payment, document, partner, contract, feature_flag)
- **Expected**: All actions disabled for unauthorized; changes display correctly; date filtering works

---

## 6) Negative Tests

| Scenario | Steps | Expected |
|----------|-------|----------|
| **Unauthorized page access** | Manually navigate to a page not allowed for role | Redirect to `/forbidden` |
| **Invalid login** | Wrong username/password | Error message; no redirect |
| **Missing required fields** | Submit forms without required fields | Validation errors; no submission |
| **Invalid idempotency key** | Use duplicate or short idempotency key in payments/collections | Error message; no duplicate operation |
| **Escalation confirmation mismatch** | Type wrong confirmation text in fraud escalation | Error message; no escalation |
| **Export without data** | Trigger export on empty list | Empty or no data exported; no error |
| **Real-time updates** | Perform actions in one browser and check another without refresh | Updates appear automatically in real-time (SSE implemented) |
| **Real-time connection loss** | Disconnect network and perform actions | Connection status shows disconnected; reconnects automatically |

---

## 7) Concurrency & Performance Tests

| Scenario | Steps | Expected |
|----------|-------|----------|
| **Concurrent payments** | Two users approve different payments simultaneously | No conflicts; both succeed |
| **Concurrent collections** | Create plan and pay installment simultaneously | No conflicts; both succeed |
| **Bulk data pagination** | Load 1000+ records in Reporting with pagination | Fast response; pagination works |
| **Large export** | Export 5000+ records from Reporting | Success (may be slow) |
| **Network error recovery** | Disconnect network during operation, then refresh | Error shown; manual refresh recovers |

---

## 8) Cross-Browser & Device

- **Desktop**: Chrome, Firefox, Edge, Safari latest versions
- **Mobile**: Responsive layout test on viewport widths 375px–768px
- **Expected**: All forms and tables usable on mobile; drawers overlay correctly

---

## 9) Data Seeding Prerequisites

- Run `scripts/create-test-users.ps1` to create test users.
- Ensure Kafka, PostgreSQL, and all services are running (`docker compose up -d`).
- For some workflows (claims, payments), you may need to create base data (policies, parties) via API or UI.

---

## 10) Known Limitations & Gaps (see ROADMAP.md)

- **Underwriter/Loss Adjustment UI**: Not implemented (except Policies for Underwriting)
- **High Priority Items Resolved**: Claims Detail Page, Document Management UI, Policy Management UI, User/Role Management UI, Real-time Updates, Background Job Queue
- **Medium Priority Items Resolved**: Sales/Agency UI, Reinsurance UI, Feature Flag Integration, Distributed Tracing
- **Low Priority Items Resolved**: Bulk Actions, Audit Log UI, Loading Indicators, Confirmation Dialogs, Mobile Responsiveness, CI/CD, IaC, Monitoring Integration, Security Hardening
- **Infrastructure Items Resolved**: Load Testing with k6

---

## 11) Reporting Bugs

Include:
- Role used
- Page/URL
- Steps to reproduce
- Expected vs actual
- Browser/device
- Screenshots if applicable
- Concurrency/performance details if applicable

---

**End of UAT Document**
