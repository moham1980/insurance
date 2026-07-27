# Permission Matrix (Initial)

## Roles (Iran Insurance)

- insurer_admin
- head_office_ops
- risk_manager
- compliance_aml
- legal_ops
- complaints_handler
- branch_manager
- branch_staff
- claims_handler
- loss_adjuster
- fraud_analyst
- underwriter
- finance_ops
- collections_ops
- reinsurance_ops
- agency_owner
- agency_staff
- broker_owner
- broker_staff
- call_center
- auditor
- regulatory_view

## Permissions (v0)

### Auth / IAM

- users:list
  - insurer_admin
- users:set_roles
  - insurer_admin
- users:assign_org_unit
  - insurer_admin
- org_units:create
  - insurer_admin
- org_units:list
  - insurer_admin
- org_units:get
  - insurer_admin
- roles:catalog
  - insurer_admin

### Issuance / Underwriting (Policy)

- policy:quote
  - underwriter
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
- policy:issue
  - underwriter
  - head_office_ops
- policy:endorse
  - underwriter
  - head_office_ops
  - branch_staff
- policy:cancel
  - head_office_ops
  - branch_manager

#### Policy Module (UI / Enterprise Console)

- policy:submit_docs
  - insurer_admin
  - underwriter
  - branch_staff
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - call_center
- policy:risk_assess
  - insurer_admin
  - underwriter
- policy:underwriting_decide
  - insurer_admin
  - underwriter
- policy:renew
  - insurer_admin
  - head_office_ops
  - branch_manager
  - branch_staff
- policy:view
  - insurer_admin
  - head_office_ops
  - underwriter
  - branch_manager
  - branch_staff
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - call_center
  - auditor
- policy:list
  - insurer_admin
  - head_office_ops
  - underwriter
  - branch_manager
  - branch_staff
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - auditor
- policy:set_unique_code
  - insurer_admin
  - head_office_ops
- policy:sanhab_inquiry
  - insurer_admin
  - head_office_ops
  - underwriter
  - branch_manager
  - branch_staff
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - call_center
- policy:sanhab_inquiries_view
  - insurer_admin
  - head_office_ops
  - underwriter
  - branch_manager
  - branch_staff
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - call_center
  - auditor
- policy:quality_gate_override
  - insurer_admin
  - head_office_ops
- policy:changes_view
  - insurer_admin
  - head_office_ops
  - underwriter
  - branch_manager
  - branch_staff
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - call_center
  - auditor

### Claims

- claims:register
  - claims_handler
  - call_center
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
- claims:assign_adjuster
  - claims_handler
  - branch_manager
- claims:assess
  - claims_handler
  - loss_adjuster
- claims:approve
  - claims_handler
  - branch_manager
- claims:pay
  - finance_ops
  - head_office_ops

### Fraud / Risk

- fraud:triage
  - fraud_analyst
  - risk_manager
- fraud:investigate
  - fraud_analyst
  - legal_ops
- fraud:escalate
  - insurer_admin
  - fraud_analyst
  - legal_ops
- risk:rules_manage
  - risk_manager
  - insurer_admin

### Complaints

- complaints:create
  - insurer_admin
  - complaints_handler
  - branch_staff
  - call_center
- complaints:view
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops
  - branch_manager
  - branch_staff
  - auditor
- complaints:list
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops
  - branch_manager
  - branch_staff
  - auditor
- complaints:dashboard
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops
  - branch_manager
  - auditor
- complaints:escalate
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops
  - branch_manager
- complaints:update_status
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops
  - branch_manager
- complaints:attach_document
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops
- complaints:export
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops
  - auditor

- complaints:otp_request
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops

- complaints:otp_verify
  - insurer_admin
  - head_office_ops
  - complaints_handler
  - legal_ops

### Sales Network & Distribution

- sales_network:partners:view
  - insurer_admin
  - head_office_ops
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - auditor

- sales_network:partners:manage
  - insurer_admin
  - head_office_ops

- sales_network:contracts:view
  - insurer_admin
  - head_office_ops
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - auditor

- sales_network:contracts:manage
  - insurer_admin
  - head_office_ops

- sales_network:ledger:view
  - insurer_admin
  - head_office_ops
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - auditor

- sales_network:ledger:manage
  - insurer_admin
  - head_office_ops

- sales_network:kpi:view
  - insurer_admin
  - head_office_ops
  - agency_owner
  - agency_staff
  - broker_owner
  - broker_staff
  - auditor

### Read Models (/rm)

- rm:claims:view
  - insurer_admin
  - head_office_ops
  - claims_handler
  - fraud_analyst
  - auditor
  - branch_manager
  - branch_staff
- rm:claims:summary
  - insurer_admin
  - head_office_ops
  - claims_handler
  - auditor
  - branch_manager
  - branch_staff
- rm:fraud:view
  - insurer_admin
  - head_office_ops
  - claims_handler
  - fraud_analyst
  - legal_ops
  - auditor
- rm:complaints:view
  - insurer_admin
  - head_office_ops
  - claims_handler
  - complaints_handler
  - compliance_aml
  - legal_ops
  - auditor
  - branch_manager

### Compliance / AML

- aml:review
  - compliance_aml
  - risk_manager
- aml:report
  - compliance_aml

### Reinsurance

- reinsurance:manage_program
  - reinsurance_ops
  - head_office_ops
- reinsurance:reconcile
  - reinsurance_ops
  - finance_ops

### Reporting / Audit / Regulatory

- reporting:view
  - auditor
  - head_office_ops
  - risk_manager
  - insurer_admin
  - finance_ops
  - underwriter
  - claims_handler
  - loss_adjuster
  - fraud_analyst
  - compliance_aml
  - legal_ops
  - complaints_handler
- reporting:ingest
  - insurer_admin
- reporting:projections:admin
  - insurer_admin
- regulatory:view
  - regulatory_view
  - insurer_admin

### Monitoring / Observability

- monitoring:metrics:view
  - insurer_admin
  - auditor
- monitoring:slos:list
  - insurer_admin
  - head_office_ops
  - auditor
- monitoring:slos:create
  - insurer_admin
- monitoring:alerts:list
  - insurer_admin
  - head_office_ops
  - auditor
- monitoring:alerts:ack
  - insurer_admin
  - head_office_ops
- monitoring:dashboard:view
  - insurer_admin
  - head_office_ops
  - auditor

### Document-AI Ops

- document_ai:jobs:list
  - insurer_admin
  - head_office_ops
  - claims_handler
  - auditor
- document_ai:jobs:view
  - insurer_admin
  - head_office_ops
  - claims_handler
  - auditor
- document_ai:jobs:retry
  - insurer_admin
- document_ai:jobs:dlq
  - insurer_admin
- document_ai:audit:list
  - insurer_admin
  - head_office_ops
  - claims_handler
  - auditor
- document_ai:usage:view
  - insurer_admin
  - head_office_ops
  - auditor

### Document-AI Eval Suite Ops

- document_ai:eval:cases:list
  - insurer_admin
  - head_office_ops
  - auditor
- document_ai:eval:cases:manage
  - insurer_admin
- document_ai:eval:runs:list
  - insurer_admin
  - head_office_ops
  - auditor
- document_ai:eval:runs:start
  - insurer_admin
  - head_office_ops
- document_ai:eval:runs:view
  - insurer_admin
  - head_office_ops
  - auditor

### Dead Letter Queue (DLQ) Ops

- dlq:stats
  - insurer_admin
  - head_office_ops
  - auditor
- dlq:list
  - insurer_admin
  - head_office_ops
  - auditor
- dlq:resolve
  - insurer_admin
  - head_office_ops

### Notes

- This matrix is a starting point. It will be refined when each domain service (policy/claims/payments/complaints/reinsurance) is implemented.
- Scope concept (next step): permissions should be evaluated together with an organizational scope derived from orgUnit (e.g., branch-only vs head-office) and optionally portfolio/line-of-business.
