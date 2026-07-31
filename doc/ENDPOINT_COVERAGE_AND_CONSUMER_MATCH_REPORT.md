# گزارش پوشش اندپوینت‌ها و تطابق مصرف‌کنندگان — سامانه بیمه

> تاریخ تولید: 2026-07-29T18:42:35.320Z
> روش: استخراج دستی از فایل‌های `.controller.ts` + جستجوی مصرف‌کنندگان در UI/BFF/سرویس‌ها.
> محدودیت: مصرف‌کننده بر اساس وجود `base` یا `route` در فایل مصرف‌کننده شناسایی شده است؛ مسیرهای داینامیک (پارامتر) ممکن است به‌صورت غیرمستقیم مصرف شوند.

## ۱. خلاصه اجرایی

| شاخص | مقدار |
|---|---:|
| تعداد سرویس‌ها | 42 |
| تعداد اندپوینت‌ها | 1055 |
| اندپوینت سلامت (health) | 49 |
| اندپوینت تجاری با مصرف‌کننده | 551 |
| اندپوینت تجاری بدون مصرف‌کننده شناسایی‌شده | 455 |

## ۲. وضعیت کلی هر سرویس

| سرویس | کل اندپوینت‌ها | Health | تجاری | با مصرف‌کننده | تطابق % | ارزیابی کلی |
|---|---|---:|---:|---:|---:|---|
| agent-portal-service | 24 | 1 | 23 | 23 | 100% | ✅ تطابق قابل قبول |
| ai-governance-service | 42 | 1 | 41 | 41 | 100% | ✅ تطابق قابل قبول |
| aml-service | 25 | 2 | 23 | 8 | 35% | ⛔ نواقص جدی در تطابق |
| api-gateway | 4 | 0 | 4 | 0 | 0% | ⛔ نواقص جدی در تطابق |
| auth-service | 64 | 1 | 63 | 55 | 87% | ⚠️ نیاز به بررسی |
| billing-service | 74 | 1 | 73 | 56 | 77% | ⚠️ نیاز به بررسی |
| broker-portal-bff | 14 | 1 | 13 | 13 | 100% | ✅ تطابق قابل قبول |
| catalog-bff | 7 | 0 | 7 | 2 | 29% | ⛔ نواقص جدی در تطابق |
| channel-workspace-bff | 14 | 1 | 13 | 13 | 100% | ✅ تطابق قابل قبول |
| claims-readmodel-service | 7 | 1 | 6 | 5 | 83% | ⚠️ نیاز به بررسی |
| claims-service | 38 | 1 | 37 | 4 | 11% | ⛔ نواقص جدی در تطابق |
| collections-service | 21 | 2 | 19 | 3 | 16% | ⛔ نواقص جدی در تطابق |
| complaints-service | 17 | 2 | 15 | 2 | 13% | ⛔ نواقص جدی در تطابق |
| copilot-service | 43 | 2 | 41 | 1 | 2% | ⛔ نواقص جدی در تطابق |
| customer-360-service | 7 | 1 | 6 | 6 | 100% | ✅ تطابق قابل قبول |
| customer-portal-bff | 20 | 1 | 19 | 13 | 68% | ⚠️ نیاز به بررسی |
| customer-portal-service | 18 | 1 | 17 | 17 | 100% | ✅ تطابق قابل قبول |
| document-ai-service | 17 | 1 | 16 | 7 | 44% | ⛔ نواقص جدی در تطابق |
| document-service | 13 | 1 | 12 | 2 | 17% | ⛔ نواقص جدی در تطابق |
| feature-flags-service | 8 | 2 | 6 | 2 | 33% | ⛔ نواقص جدی در تطابق |
| fraud-service | 16 | 1 | 15 | 2 | 13% | ⛔ نواقص جدی در تطابق |
| insurer-operations-bff | 11 | 1 | 10 | 10 | 100% | ✅ تطابق قابل قبول |
| knowledge-layer-service | 10 | 1 | 9 | 9 | 100% | ✅ تطابق قابل قبول |
| knowledge-service | 11 | 1 | 10 | 10 | 100% | ✅ تطابق قابل قبول |
| model-switchboard-service | 27 | 1 | 26 | 26 | 100% | ✅ تطابق قابل قبول |
| monitoring-service | 15 | 2 | 13 | 12 | 92% | ✅ تطابق قابل قبول |
| notification-service | 28 | 2 | 26 | 26 | 100% | ✅ تطابق قابل قبول |
| orchestrator-service | 25 | 1 | 24 | 6 | 25% | ⛔ نواقص جدی در تطابق |
| partner-gateway | 15 | 2 | 13 | 13 | 100% | ✅ تطابق قابل قبول |
| party-kyc-service | 44 | 1 | 43 | 13 | 30% | ⛔ نواقص جدی در تطابق |
| payments-service | 14 | 1 | 13 | 2 | 15% | ⛔ نواقص جدی در تطابق |
| policy-service | 43 | 1 | 42 | 6 | 14% | ⛔ نواقص جدی در تطابق |
| product-service | 48 | 1 | 47 | 32 | 68% | ⚠️ نیاز به بررسی |
| regulatory-gateway-service | 28 | 1 | 27 | 2 | 7% | ⛔ نواقص جدی در تطابق |
| reinsurance-service | 35 | 1 | 34 | 3 | 9% | ⛔ نواقص جدی در تطابق |
| reporting-service | 76 | 1 | 75 | 11 | 15% | ⛔ نواقص جدی در تطابق |
| rule-engine-service | 16 | 1 | 15 | 15 | 100% | ✅ تطابق قابل قبول |
| sales-network-service | 43 | 1 | 42 | 24 | 57% | ⛔ نواقص جدی در تطابق |
| submission-placement-service | 26 | 1 | 25 | 25 | 100% | ✅ تطابق قابل قبول |
| underwriting-service | 15 | 1 | 14 | 2 | 14% | ⛔ نواقص جدی در تطابق |
| workflow-engine-service | 13 | 2 | 11 | 11 | 100% | ✅ تطابق قابل قبول |
| workflow-service | 19 | 1 | 18 | 18 | 100% | ✅ تطابق قابل قبول |

## ۳. فهرست اندپوینت‌ها به تفکیک سرویس

### agent-portal-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /agent-portal/session | agent-portal | UI(28)، BFF(1)، service(19) |
| GET | /agent-portal/session/:sessionId/validate | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/session/:sessionId/revoke | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/agent/:agentId/revoke-all | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/agent/:agentId/dashboard | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/agent/:agentId/policies | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/agent/:agentId/claims | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/agent/:agentId/customers | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/agent/:agentId/commissions | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/agent/:agentId/kpi | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/dashboard/premium-trends | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/dashboard/commission-history | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/dashboard/policy-portfolio | agent-portal | UI(6)، service(4) |
| GET | /agent-portal/leads | agent-portal | UI(11)، BFF(1)، service(6) |
| GET | /agent-portal/health | agent-portal | UI(18)، BFF(4)، service(70) |
| GET | /agent-portal/claims/:claimId/advocacy | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/claims/:claimId/advocacy-cases | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/advocacy-cases/:caseId/tasks | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/claims/:claimId/adjuster-referrals | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/claims/:claimId/projections | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/claims/:claimId/recovery | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/advocacy-cases/:caseId/escalate | agent-portal | UI(6)، service(4) |
| POST | /agent-portal/advocacy-cases/:caseId/communications | agent-portal | UI(6)، service(4) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### ai-governance-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /governance/incidents | governance | UI(64)، service(14) |
| GET | /governance/incidents/:incidentId | governance | UI(64)، service(13) |
| GET | /governance/incidents | governance | UI(64)، service(14) |
| GET | /governance/incidents/statistics | governance | UI(64)، service(13) |
| PUT | /governance/incidents/:incidentId/assign | governance | UI(64)، service(13) |
| PUT | /governance/incidents/:incidentId/investigate | governance | UI(64)، service(13) |
| PUT | /governance/incidents/:incidentId/mitigate | governance | UI(64)، service(13) |
| PUT | /governance/incidents/:incidentId/resolve | governance | UI(64)، service(13) |
| PUT | /governance/incidents/:incidentId/close | governance | UI(64)، service(13) |
| POST | /governance/committee/decisions | governance | UI(64)، service(13) |
| GET | /governance/committee/decisions/:decisionId | governance | UI(64)، service(13) |
| GET | /governance/committee/decisions | governance | UI(64)، service(13) |
| GET | /governance/committee/statistics/:committeeId | governance | UI(64)، service(13) |
| POST | /governance/approvals | governance | UI(64)، service(17) |
| GET | /governance/approvals/:requestId | governance | UI(64)، service(13) |
| PUT | /governance/approvals/:requestId/approve | governance | UI(64)، service(13) |
| PUT | /governance/approvals/:requestId/reject | governance | UI(64)، service(13) |
| GET | /governance/monitoring/metrics/:modelId | governance | UI(64)، service(13) |
| POST | /governance/monitoring/metrics | governance | UI(64)، service(13) |
| GET | /governance/monitoring/anomalies | governance | UI(64)، service(13) |
| GET | /governance/monitoring/drift/:modelId | governance | UI(64)، service(13) |
| GET | /governance/mro/dashboard | governance | UI(64)، service(13) |
| GET | /governance/mro/alerts | governance | UI(64)، service(13) |
| POST | /governance/validation/initiate | governance | UI(64)، service(13) |
| GET | /governance/validation/:reportId | governance | UI(64)، service(13) |
| PUT | /governance/validation/:reportId/approve | governance | UI(64)، service(13) |
| PUT | /governance/validation/:reportId/reject | governance | UI(64)، service(13) |
| GET | /governance/ecosystem-sync | governance | UI(64)، service(13) |
| GET | /governance/ecosystem-sync/status | governance | UI(64)، service(13) |
| POST | /governance/ecosystem-sync/policy-update | governance | UI(64)، service(13) |
| POST | /models | models | UI(3)، service(23) |
| GET | /models | models | UI(3)، service(23) |
| GET | /models/:modelId | models | UI(3)، service(23) |
| GET | /models/:modelId/state | models | UI(3)، service(23) |
| PUT | /models/:modelId/transition | models | UI(3)، service(23) |
| PUT | /models/:modelId | models | UI(3)، service(23) |
| DELETE | /models/:modelId | models | UI(3)، service(23) |
| GET | /models/status/:status | models | UI(3)، service(23) |
| GET | /models/evaluation/due | models | UI(3)، service(23) |
| POST | /models/retire/deprecated | models | UI(3)، service(23) |
| GET | /models/transitions/rules | models | UI(3)، service(23) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### aml-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /aml/consents | — | UI(3) |
| GET | /aml/consents/:consentId | — | — |
| GET | /aml/consents | — | UI(3) |
| GET | /aml/dashboard | — | UI(3) |
| PATCH | /aml/consents/:consentId/revoke | — | — |
| POST | /aml/rules | — | UI(3) |
| GET | /aml/rules/:ruleId | — | — |
| GET | /aml/rules | — | UI(3) |
| PATCH | /aml/rules/:ruleId | — | — |
| POST | /aml/alerts | — | UI(3) |
| GET | /aml/alerts/:alertId | — | — |
| GET | /aml/alerts | — | UI(3) |
| PATCH | /aml/alerts/:alertId/assign | — | — |
| PATCH | /aml/alerts/:alertId/status | — | — |
| GET | /aml/export | — | UI(3) |
| POST | /aml/transactions/evaluate | — | — |
| POST | /aml/external-sources | — | — |
| PUT | /aml/external-sources/:sourceId | — | — |
| GET | /aml/external-sources/:sourceId | — | — |
| GET | /aml/external-sources | — | — |
| POST | /aml/external-sources/:sourceId/sync | — | — |
| POST | /aml/external-sources/:sourceId/query | — | — |
| POST | /aml/reports/official | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### api-gateway

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | — |
| GET | /gateway/health | — | — |
| GET | /health/deep | — | — |
| GET | /gateway/health/deep | — | — |
| GET | /admin/circuit-breakers | — | — |
| POST | /admin/circuit-breakers/:serviceName/reset | — | — |

### auth-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /service-token | — | service(3) |
| POST | /register | — | service(1) |
| POST | /login | — | UI(75)، service(1) |
| GET | /me | — | UI(88)، BFF(1)، service(5) |
| GET | /users | — | UI(14) |
| GET | /roles/catalog | — | UI(3) |
| PUT | /users/:userId/roles | — | — |
| PUT | /users/:userId/org-unit | — | — |
| POST | /brand-configs | brand-configs | UI(5)، BFF(1) |
| GET | /brand-configs | brand-configs | UI(5)، BFF(1) |
| GET | /brand-configs/:brandKey | brand-configs | UI(5)، BFF(1) |
| PUT | /brand-configs/:brandKey | brand-configs | UI(5)، BFF(1) |
| GET | /federation/providers | federation | BFF(7)، service(83) |
| GET | /federation/authorize | federation | UI(44)، BFF(1)، service(114) |
| POST | /federation/token | federation | UI(109)، BFF(4)، service(122) |
| POST | /federation/userinfo | federation | service(31) |
| POST | /federation/link | federation | UI(51)، service(57) |
| POST | /federation/unlink | federation | service(34) |
| GET | /federation/user/:userId/identities | federation | service(31) |
| POST | /federation/refresh | federation | UI(27)، service(39) |
| POST | /federation/callback | federation | UI(22)، service(49) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /iam/roles/hierarchy | iam | UI(2)، service(19) |
| POST | /iam/roles/sod-check | iam | UI(2)، service(19) |
| POST | /iam/roles/validate-assignment | iam | UI(2)، service(19) |
| GET | /iam/audit/user/:userId | iam | UI(2)، service(19) |
| GET | /iam/audit/resource | iam | UI(2)، service(19) |
| GET | /iam/audit/denied | iam | UI(2)، service(19) |
| GET | /iam/audit/stats | iam | UI(2)، service(19) |
| POST | /org-units | — | UI(12)، service(1) |
| GET | /org-units/:orgUnitId | — | — |
| GET | /org-units | — | UI(12)، service(1) |
| POST | /abac/policies | abac/policies | — |
| PUT | /abac/policies/:id | abac/policies | — |
| DELETE | /abac/policies/:id | abac/policies | — |
| GET | /abac/policies/:id | abac/policies | — |
| GET | /abac/policies | abac/policies | — |
| POST | /abac/policies/evaluate | abac/policies | service(25) |
| GET | /sso/providers | sso | UI(16)، BFF(7)، service(71) |
| GET | /sso/oidc/auth-url | sso | UI(16)، service(21) |
| POST | /sso/oidc/token | sso | UI(16)، service(21) |
| POST | /sso/oidc/verify | sso | UI(16)، service(21) |
| POST | /sso/oidc/refresh | sso | UI(16)، service(21) |
| GET | /sso/saml/sso | sso | UI(16)، service(21) |
| POST | /sso/saml/acs | sso | UI(16)، service(21) |
| POST | /sso/oidc/callback | sso | UI(16)، service(21) |
| POST | /api/v1/admin/organizations | /api/v1/admin | service(2) |
| GET | /api/v1/admin/organizations/:organizationId | /api/v1/admin | service(2) |
| PATCH | /api/v1/admin/organizations/:organizationId | /api/v1/admin | service(2) |
| GET | /api/v1/admin/organizations/:organizationId/capabilities | /api/v1/admin | service(2) |
| POST | /api/v1/admin/organizations/:organizationId/capabilities | /api/v1/admin | service(2) |
| DELETE | /api/v1/admin/organizations/:organizationId/capabilities/:capabilityId | /api/v1/admin | service(2) |
| POST | /api/v1/admin/organizations/:organizationId/relationships | /api/v1/admin | service(2) |
| GET | /api/v1/admin/tenants | /api/v1/admin | service(3) |
| POST | /api/v1/admin/tenants | /api/v1/admin | service(3) |
| PATCH | /api/v1/admin/tenants/:tenantId/brand | /api/v1/admin | service(2) |
| GET | /api/v1/admin/tenants/:tenantId/brand | /api/v1/admin | service(2) |
| GET | /api/v1/admin/brand/by-domain | /api/v1/admin | service(2) |
| POST | /workspaces | workspaces | UI(5)، BFF(1)، service(3) |
| GET | /workspaces | workspaces | UI(5)، BFF(1)، service(3) |
| GET | /workspaces/mine | workspaces | UI(13)، BFF(1)، service(11) |
| GET | /workspaces/:workspaceId | workspaces | UI(5)، BFF(1)، service(3) |
| POST | /workspaces/:workspaceId/members | workspaces | UI(5)، BFF(1)، service(3) |
| DELETE | /workspaces/:workspaceId/members/:membershipId | workspaces | UI(5)، BFF(1)، service(3) |

### billing-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /billing/invoices | billing | BFF(4)، service(42) |
| PUT | /billing/invoices/:id/issue | billing | BFF(4)، service(35) |
| POST | /billing/invoices/:id/payment | billing | BFF(4)، service(35) |
| POST | /billing/invoices/mark-overdue | billing | BFF(4)، service(35) |
| PUT | /billing/invoices/:id/cancel | billing | BFF(4)، service(35) |
| GET | /billing/invoices/:id | billing | BFF(4)، service(35) |
| GET | /billing/invoices | billing | BFF(4)، service(42) |
| GET | /billing/balance/outstanding | billing | BFF(4)، service(35) |
| POST | /billing/journal-entries | billing | BFF(4)، service(35) |
| PUT | /billing/journal-entries/:id/post | billing | BFF(4)، service(35) |
| POST | /billing/journal-entries/:id/reverse | billing | BFF(4)، service(35) |
| POST | /billing/accounts | billing | BFF(4)، service(40) |
| GET | /billing/accounts/:accountCode | billing | BFF(4)، service(35) |
| GET | /billing/accounts | billing | BFF(4)، service(40) |
| POST | /billing/financial-periods | billing | BFF(4)، service(35) |
| PUT | /billing/financial-periods/:id/close | billing | BFF(4)، service(35) |
| GET | /billing/accounting/trial-balance | billing | BFF(4)، service(35) |
| GET | /billing/accounts/:accountCode/balance | billing | BFF(4)، service(35) |
| POST | /billing/payments/initiate | billing | BFF(4)، service(38) |
| POST | /billing/payments/verify | billing | BFF(4)، service(35) |
| POST | /billing/payments/:paymentId/cancel | billing | BFF(4)، service(35) |
| GET | /billing/payments/:paymentId | billing | BFF(4)، service(35) |
| GET | /billing/invoices/:invoiceId/payments | billing | BFF(4)، service(35) |
| GET | /billing/payments/health-check | billing | BFF(4)، service(35) |
| POST | /billing/auto-deposit/ingest | billing | BFF(4)، service(35) |
| POST | /billing/auto-deposit/:invoiceId/approve/:transactionId | billing | BFF(4)، service(35) |
| POST | /billing/auto-deposit/:transactionId/reject | billing | BFF(4)، service(35) |
| GET | /billing/auto-deposit/pending | billing | BFF(4)، service(35) |
| GET | /billing/auto-deposit/matches | billing | BFF(4)، service(35) |
| POST | /billing/auto-deposit/reconcile | billing | BFF(4)، service(35) |
| GET | /billing/auto-deposit/config | billing | BFF(4)، service(35) |
| PUT | /billing/auto-deposit/config | billing | BFF(4)، service(35) |
| GET | /billing/auto-deposit/health-check | billing | BFF(4)، service(35) |
| POST | /billing/reconcile | billing | UI(6)، BFF(4)، service(56) |
| GET | /billing/reconcile/results | billing | BFF(4)، service(35) |
| PUT | /billing/reconcile/:id/approve | billing | BFF(4)، service(35) |
| GET | /billing/pnl-report | billing | BFF(4)، service(35) |
| GET | /billing/balance-sheet | billing | BFF(4)، service(35) |
| POST | /brokerage/policies/:policyId/post | — | — |
| POST | /brokerage/commissions/calculate | — | — |
| POST | /brokerage/commissions/post | — | — |
| POST | /brokerage/settlements/batches | — | service(1) |
| POST | /brokerage/settlements/batches/:batchId/approve | — | — |
| POST | /brokerage/settlements/batches/:batchId/confirm | — | — |
| POST | /brokerage/settlements/batches/:batchId/verify | — | — |
| GET | /brokerage/journal-entries/:journalEntryId | — | — |
| POST | /brokerage/journal-entries/:journalEntryId/reverse | — | — |
| POST | /brokerage/settlements/batches/:batchId/reconcile | — | — |
| POST | /brokerage/refunds | — | service(1) |
| POST | /brokerage/refunds/:refundId/approve | — | — |
| POST | /brokerage/refunds/:refundId/send | — | — |
| POST | /brokerage/clawbacks/calculate | — | service(1) |
| POST | /brokerage/clawbacks/apply | — | service(1) |
| GET | /brokerage/escrow/holdings | — | service(1) |
| POST | /brokerage/escrow/holdings/:holdingId/release | — | — |
| GET | /brokerage/escrow/holdings/:holdingId/eligibility | — | — |
| POST | /brokerage/escrow/holdings/:holdingId/carrier-approve | — | — |
| POST | /brokerage/escrow/auto-release | — | service(1) |
| POST | /brokerage/invoices/:invoiceId/pay | — | — |
| GET | /brokerage/payments/:paymentId | — | — |
| POST | /brokerage/payments/:paymentId/retry | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /invoicing/policies/:policyId/invoices | invoicing | service(12) |
| GET | /invoicing/policies/:policyId/invoices | invoicing | service(12) |
| GET | /invoicing/invoices/:invoiceId | invoicing | service(12) |
| POST | /invoicing/invoices/:invoiceId/issue | invoicing | service(12) |
| POST | /invoicing/invoices/:invoiceId/cancel | invoicing | service(12) |
| POST | /invoicing/invoices/:invoiceId/installments | invoicing | service(12) |
| POST | /invoicing/installments/:itemId/pay | invoicing | service(12) |
| POST | /webhooks/payments | webhooks/payments | service(1) |
| GET | /reports/collections | reports | UI(93)، BFF(2)، service(31) |
| GET | /reports/outstanding-invoices | reports | UI(5)، BFF(2)، service(17) |
| GET | /reports/settlements | reports | UI(7)، BFF(3)، service(18) |
| GET | /reports/escrow-balance | reports | UI(5)، BFF(2)، service(17) |

### broker-portal-bff

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /broker/dashboard | broker | UI(107)، BFF(7)، service(178) |
| GET | /broker/agreements | broker | UI(54)، BFF(7)، service(175) |
| GET | /broker/offerings | broker | UI(53)، BFF(7)، service(171) |
| GET | /broker/submissions | broker | UI(53)، BFF(7)، service(172) |
| GET | /broker/submissions/:submissionId | broker | UI(51)، BFF(7)، service(170) |
| GET | /broker/quotes/:submissionId | broker | UI(51)، BFF(7)، service(170) |
| POST | /broker/placements | broker | UI(51)، BFF(7)، service(171) |
| GET | /broker/claims | broker | UI(194)، BFF(8)، service(227) |
| GET | /broker/claims/:claimId | broker | UI(51)، BFF(7)، service(170) |
| POST | /broker/claims/:claimId/communications | broker | UI(51)، BFF(7)، service(170) |
| GET | /broker/commissions | broker | UI(69)، BFF(7)، service(172) |
| GET | /broker/sub-agents | broker | UI(51)، BFF(7)، service(170) |
| GET | /broker/reports/broker-transactions | broker | UI(51)، BFF(7)، service(170) |
| GET | /health | health | UI(12)، BFF(4)، service(68) |

### catalog-bff

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /api/v1/catalog/products | /api/v1/catalog | UI(7)، BFF(2)، service(1) |
| GET | /api/v1/catalog/products/:productId | /api/v1/catalog | — |
| GET | /api/v1/catalog/distributors/:distributorOrganizationId/visible-products | /api/v1/catalog | — |
| GET | /api/v1/catalog/offerings | /api/v1/catalog | UI(2)، BFF(1) |
| GET | /api/v1/catalog/offerings/:offeringId/comparison-hint | /api/v1/catalog | — |
| GET | /api/v1/catalog/customer-offerings | /api/v1/catalog | — |
| GET | /api/v1/catalog/distribution-agreements/:agreementId/eligibility | /api/v1/catalog | — |

### channel-workspace-bff

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /broker/carrier-agreements | broker | UI(51)، BFF(7)، service(170) |
| GET | /broker/product-offerings | broker | UI(51)، BFF(7)، service(170) |
| GET | /broker/placements | broker | UI(51)، BFF(7)، service(171) |
| GET | /broker/settlements | broker | UI(54)، BFF(7)، service(171) |
| GET | /broker/claim-advocacy-cases | broker | UI(51)، BFF(7)، service(170) |
| GET | /channel/workspaces | channel | UI(14)، BFF(3)، service(39) |
| GET | /channel/workspaces/:workspaceId | channel | UI(11)، BFF(2)، service(39) |
| GET | /channel/workspaces/mine | channel | UI(11)، BFF(2)، service(39) |
| GET | /channel/offerings | channel | UI(13)، BFF(5)، service(41) |
| GET | /channel/submissions | channel | UI(11)، BFF(4)، service(46) |
| POST | /channel/submissions | channel | UI(11)، BFF(4)، service(46) |
| GET | /channel/commissions | channel | UI(28)، BFF(4)، service(42) |
| GET | /channel/customers | channel | UI(19)، BFF(3)، service(43) |
| GET | /health | health | UI(12)، BFF(4)، service(68) |

### claims-readmodel-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /rm/claims | — | UI(8)، service(2) |
| GET | /rm/claims/:claimId | — | — |
| GET | /rm/claims/summary | — | UI(3)، service(1) |
| GET | /rm/fraud/cases | — | UI(3)، service(1) |
| GET | /rm/complaints | — | UI(3)، service(1) |
| POST | /rm/admin/rebuild | — | service(1) |

### claims-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /claims/:claimId/advocacy-cases | — | — |
| GET | /advocacy-cases | — | BFF(1)، service(2) |
| GET | /advocacy-cases/:caseId | — | — |
| POST | /advocacy-cases/:caseId/tasks | — | — |
| PATCH | /advocacy-cases/:caseId/tasks/:taskId | — | — |
| POST | /advocacy-cases/:caseId/communications | — | — |
| POST | /advocacy-cases/:caseId/escalate | — | — |
| POST | /advocacy-cases/:caseId/close | — | — |
| POST | /claims/:claimId/adjuster-referrals | — | — |
| GET | /claims/:claimId/adjuster-referrals | — | — |
| POST | /adjuster-referrals/:referralId/accept | — | — |
| POST | /adjuster-referrals/:referralId/reject | — | — |
| POST | /adjuster-referrals/:referralId/submit-report | — | — |
| GET | /claims/:claimId/projections | — | — |
| POST | /claims/:claimId/projections | — | — |
| POST | /claims/:claimId/recovery | — | — |
| POST | /claims/:claimId/documents | — | — |
| GET | /claims/:claimId/documents | — | — |
| GET | /claims/:claimId/documents/:documentId/download | — | — |
| POST | /claims | — | UI(80)، BFF(2)، service(11) |
| POST | /claims/:claimId/assess | — | — |
| POST | /claims/:claimId/approve | — | — |
| POST | /claims/:claimId/reject | — | — |
| POST | /claims/:claimId/pay | — | — |
| POST | /claims/:claimId/close | — | — |
| POST | /claims/:claimId/refer-to-adjuster | — | — |
| GET | /claims/:claimId | — | — |
| PATCH | /claims/:claimId | — | — |
| GET | /claims | — | UI(80)، BFF(2)، service(11) |
| POST | /claims/:claimId/calculate-deductible | — | — |
| GET | /claims/fnol/form-defaults | — | — |
| POST | /claims/fnol | — | BFF(1) |
| POST | /claims/:claimId/validate-policy | — | — |
| POST | /claims/:claimId/acknowledge | — | — |
| POST | /claims/:claimId/submit-to-carrier | — | — |
| POST | /claims/:claimId/appeal | — | — |
| GET | /claims/:claimId/history | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### collections-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /collections/plans | — | UI(3) |
| GET | /collections/plans/:planId | — | — |
| GET | /collections/plans | — | UI(3) |
| GET | /collections/installments/:installmentId | — | — |
| GET | /collections/installments | — | UI(3) |
| POST | /collections/installments/:installmentId/pay | — | — |
| GET | /collections/installments/reminder/due | — | — |
| POST | /collections/installments/:installmentId/reminder | — | — |
| GET | /collections/installments/overdue | — | — |
| POST | /collections/installments/:installmentId/overdue | — | — |
| GET | /collections/installments/:installmentId/late-fee | — | — |
| POST | /collections/installments/:installmentId/late-fee/apply | — | — |
| POST | /collections/installments/:installmentId/gateway/initiate | — | — |
| POST | /collections/installments/:installmentId/gateway/verify | — | — |
| POST | /collections/gateway/callback | — | — |
| POST | /collections/installments/:installmentId/link-receivable | — | — |
| POST | /collections/installments/:installmentId/sync-receivable | — | — |
| GET | /collections/receivables/reconciliation | — | — |
| POST | /collections/plans/:planId/publish-receivable-requests | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### complaints-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /complaints | — | UI(39)، BFF(1)، service(8) |
| POST | /complaints/:complaintId/escalate | — | — |
| GET | /complaints/:complaintId | — | — |
| GET | /complaints | — | UI(39)، BFF(1)، service(8) |
| GET | /complaints/dashboard | — | — |
| POST | /complaints/:complaintId/status | — | — |
| POST | /complaints/:complaintId/attachments | — | — |
| POST | /complaints/:complaintId/mobile/otp/request | — | — |
| POST | /complaints/:complaintId/mobile/otp/verify | — | — |
| GET | /complaints/:complaintId/export/central-insurance | — | — |
| GET | /complaints/analysis/recurring-causes | — | — |
| GET | /complaints/analysis/cause-trends | — | — |
| POST | /complaints/:complaintId/central-insurance/send | — | — |
| GET | /complaints/:complaintId/central-insurance/status | — | — |
| POST | /complaints/:complaintId/central-insurance/retry | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### copilot-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /copilot/claims/:claimId/summary | — | — |
| POST | /copilot/documents/:documentId/summary | — | — |
| POST | /copilot/qa | — | — |
| POST | /copilot/next-best-action | — | — |
| GET | /copilot/providers | — | — |
| POST | /copilot/models/register | — | — |
| PUT | /copilot/models/:modelId/status | — | — |
| GET | /copilot/models/:modelId | — | — |
| GET | /copilot/models | — | — |
| DELETE | /copilot/models/:modelId | — | — |
| POST | /copilot/models/:modelId/risk-assessment | — | — |
| PUT | /copilot/risk-assessment/:assessmentId/approve | — | — |
| PUT | /copilot/risk-assessment/:assessmentId/reject | — | — |
| GET | /copilot/risk-assessment/:assessmentId | — | — |
| GET | /copilot/models/:modelId/risk-assessments | — | — |
| POST | /copilot/incidents | — | — |
| PUT | /copilot/incidents/:incidentId/status | — | — |
| PUT | /copilot/incidents/:incidentId/resolve | — | — |
| GET | /copilot/incidents/:incidentId | — | — |
| GET | /copilot/incidents | — | — |
| POST | /copilot/models/:modelId/model-card | — | — |
| PUT | /copilot/model-card/:cardId | — | — |
| GET | /copilot/model-card/:cardId | — | — |
| GET | /copilot/models/:modelId/model-card | — | — |
| GET | /copilot/models/:modelId/model-cards | — | — |
| POST | /copilot/models/:modelId/validation-report | — | — |
| PUT | /copilot/validation-report/:reportId/status | — | — |
| GET | /copilot/validation-report/:reportId | — | — |
| GET | /copilot/models/:modelId/validation-reports | — | — |
| POST | /copilot/underwriting/assist | — | — |
| POST | /copilot/complaints/triage | — | — |
| POST | /copilot/recovery/discover | — | — |
| POST | /copilot/pricing/assist | — | — |
| POST | /copilot/selfservice/assist | — | — |
| POST | /copilot/ecosystem/consult | — | — |
| POST | /copilot/nba/:contextType/:resourceId/actions | — | — |
| POST | /copilot/nba/:logId/execute | — | — |
| POST | /copilot/nba/:logId/opt-out | — | — |
| GET | /copilot/nba/actions | — | UI(1) |
| POST | /copilot/recommend-product | — | — |
| POST | /copilot/draft-communication | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### customer-360-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /customer-360/:customerId | customer-360 | UI(19)، BFF(1)، service(4) |
| GET | /customer-360/:customerId/portfolio | customer-360 | UI(19)، BFF(1)، service(4) |
| GET | /customer-360/:customerId/consents | customer-360 | UI(19)، BFF(1)، service(4) |
| POST | /customer-360/:customerId/consents | customer-360 | UI(19)، BFF(1)، service(4) |
| POST | /customer-360/:customerId/consents/:consentId/revoke | customer-360 | UI(19)، BFF(1)، service(4) |
| GET | /customer-360/:customerId/consents/check | customer-360 | UI(19)، BFF(1)، service(4) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### customer-portal-bff

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /otp/initiate | — | UI(25) |
| POST | /otp/verify | — | UI(28)، BFF(1) |
| GET | /session | — | UI(22)، BFF(1)، service(15) |
| POST | /session/revoke | — | UI(19) |
| GET | /policies | — | UI(132)، BFF(1)، service(72) |
| GET | /policies/:policyId | — | — |
| POST | /policies/:policyId/endorsement | — | — |
| POST | /policies/:policyId/renewal | — | — |
| GET | /claims | — | UI(177)، BFF(3)، service(83) |
| GET | /claims/:claimId | — | — |
| POST | /fnol | — | UI(38)، BFF(1)، service(2) |
| GET | /payments | — | UI(143)، BFF(1)، service(57) |
| GET | /payments/:paymentId | — | — |
| GET | /complaints | — | UI(134)، BFF(1)، service(34) |
| POST | /complaints | — | UI(134)، BFF(1)، service(34) |
| GET | /brand-config/:brandKey | — | — |
| GET | /consent | — | UI(69)، BFF(1)، service(38) |
| POST | /consent/grant | — | UI(3) |
| POST | /consent/revoke | — | UI(3) |
| GET | /health | health | UI(12)، BFF(4)، service(68) |

### customer-portal-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /customer-portal/otp/initiate | customer-portal | UI(66)، BFF(1)، service(4) |
| POST | /customer-portal/otp/verify | customer-portal | UI(69)، BFF(2)، service(4) |
| GET | /customer-portal/session/:sessionId | customer-portal | UI(63)، BFF(1)، service(4) |
| POST | /customer-portal/session/:sessionId/revoke | customer-portal | UI(63)، BFF(1)، service(4) |
| GET | /customer-portal/policies | customer-portal | UI(159)، BFF(2)، service(75) |
| GET | /customer-portal/policies/:policyId | customer-portal | UI(63)، BFF(1)، service(4) |
| GET | /customer-portal/claims | customer-portal | UI(204)، BFF(4)، service(86) |
| GET | /customer-portal/claims/:claimId | customer-portal | UI(63)، BFF(1)، service(4) |
| GET | /customer-portal/payments | customer-portal | UI(170)، BFF(2)، service(60) |
| GET | /customer-portal/complaints | customer-portal | UI(163)، BFF(2)، service(37) |
| POST | /customer-portal/policies/:policyId/endorsement | customer-portal | UI(63)، BFF(1)، service(4) |
| POST | /customer-portal/policies/:policyId/renewal | customer-portal | UI(63)، BFF(1)، service(4) |
| POST | /customer-portal/claims/fnol | customer-portal | UI(63)، BFF(2)، service(4) |
| GET | /customer-portal/claims/:claimId/advocacy | customer-portal | UI(63)، BFF(1)، service(4) |
| POST | /customer-portal/claims/:claimId/advocacy/:caseId/communications | customer-portal | UI(63)، BFF(1)، service(4) |
| GET | /customer-portal/claims/:claimId/status | customer-portal | UI(63)، BFF(1)، service(4) |
| POST | /customer-portal/claims/:claimId/documents | customer-portal | UI(63)، BFF(1)، service(4) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### document-ai-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /document-ai/jobs | — | UI(3) |
| GET | /document-ai/jobs/:jobId | — | — |
| PATCH | /document-ai/jobs/:jobId/retry | — | — |
| GET | /document-ai/audit | — | UI(3) |
| GET | /document-ai/usage/daily | — | UI(3) |
| GET | /document-ai/eval/cases | — | UI(3) |
| POST | /document-ai/eval/cases | — | UI(3) |
| PATCH | /document-ai/eval/cases/:caseId | — | — |
| GET | /document-ai/eval/runs | — | UI(3) |
| POST | /document-ai/eval/runs | — | UI(3) |
| GET | /document-ai/eval/runs/:runId | — | — |
| GET | /document-ai/eval/runs/:runId/results | — | — |
| POST | /document-ai/documents/:documentId/redact | — | — |
| POST | /document-ai/documents/:documentId/classify | — | — |
| POST | /document-ai/documents/:documentId/confirm | — | — |
| POST | /api/v1/ocr/extract | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### document-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /documents/upload | — | UI(3) |
| POST | /documents/link | — | — |
| GET | /documents/:documentId | — | — |
| GET | /documents/:documentId/signed-url | — | — |
| GET | /documents/:documentId/download | — | — |
| GET | /documents | — | UI(16)، service(7) |
| POST | /documents/:documentId/validate | — | — |
| POST | /documents/:documentId/classify | — | — |
| POST | /documents/:documentId/extract | — | — |
| POST | /documents/reinsurance-invoice/upload | — | — |
| POST | /documents/reinsurance-invoice/link | — | — |
| GET | /documents/reconciliation/:reconciliationId | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### feature-flags-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /ai-toggles | — | UI(3)، service(1) |
| GET | /ai-toggles/:name | — | — |
| PUT | /ai-toggles/:name | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /feature-flags | — | UI(12)، service(2) |
| GET | /feature-flags/:key | — | — |
| PUT | /feature-flags/:key | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### fraud-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /fraud/compute-score | — | service(1) |
| POST | /fraud/cases/:claimId/open | — | — |
| POST | /fraud/cases/:fraudCaseId/escalate | — | — |
| POST | /fraud/cases/:fraudCaseId/close | — | — |
| GET | /fraud/cases | — | UI(3)، service(1) |
| POST | /fraud/ml/train | — | — |
| POST | /fraud/ml/models/:modelId/deploy | — | — |
| POST | /fraud/ml/predict | — | — |
| GET | /fraud/ml/models | — | — |
| POST | /fraud/graph/entities | — | — |
| POST | /fraud/graph/relationships | — | — |
| GET | /fraud/graph/suspicious-networks | — | — |
| POST | /fraud/alerts/detect | — | — |
| GET | /fraud/alerts | — | — |
| PUT | /fraud/alerts/:alertId | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |

### insurer-operations-bff

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | health | UI(12)، BFF(4)، service(68) |
| GET | /insurer/products | insurer | UI(106)، BFF(5)، service(106) |
| GET | /insurer/rate-tables | insurer | UI(102)، BFF(3)، service(95) |
| GET | /insurer/distribution-agreements | insurer | UI(102)، BFF(5)، service(97) |
| GET | /insurer/rfqs | insurer | UI(102)، BFF(3)، service(95) |
| POST | /insurer/rfqs/:rfqId/process | insurer | UI(102)، BFF(2)، service(95) |
| GET | /insurer/claims | insurer | UI(189)، BFF(5)، service(161) |
| POST | /insurer/claims/:claimId/assign-loss-adjuster | insurer | UI(102)، BFF(2)، service(95) |
| GET | /insurer/settlements | insurer | UI(104)، BFF(4)، service(97) |
| GET | /insurer/broker-performance | insurer | UI(102)، BFF(3)، service(95) |
| GET | /insurer/regulatory-reports | insurer | UI(102)، BFF(3)، service(95) |

### knowledge-layer-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /knowledge/index | knowledge | UI(140)، service(62) |
| POST | /knowledge/search | knowledge | UI(125)، service(56) |
| GET | /knowledge/documents/:id | knowledge | UI(4)، service(27) |
| GET | /knowledge/documents/external/:externalId | knowledge | UI(4)، service(27) |
| GET | /knowledge/documents | knowledge | UI(104)، service(77) |
| DELETE | /knowledge/documents/:id | knowledge | UI(4)، service(27) |
| POST | /knowledge/documents/:id/reindex | knowledge | UI(4)، service(27) |
| GET | /knowledge/stats | knowledge | UI(44)، BFF(1)، service(32) |
| GET | /knowledge/health | knowledge | UI(13)، BFF(4)، service(89) |

### knowledge-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /knowledge/articles | knowledge | UI(4)، service(27) |
| PUT | /knowledge/articles/:id/publish | knowledge | UI(4)، service(27) |
| GET | /knowledge/articles/search | knowledge | UI(4)، service(27) |
| GET | /knowledge/articles/:id | knowledge | UI(4)، service(27) |
| PUT | /knowledge/articles/:id | knowledge | UI(4)، service(27) |
| DELETE | /knowledge/articles/:id | knowledge | UI(4)، service(27) |
| GET | /knowledge/articles | knowledge | UI(4)، service(27) |
| POST | /knowledge/nba | knowledge | UI(6)، service(32) |
| GET | /knowledge/nba/recommendations | knowledge | UI(4)، service(27) |
| POST | /knowledge/nba/:id/execute | knowledge | UI(4)، service(27) |

### model-switchboard-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /model-switchboard/models | model-switchboard | UI(3)، service(28) |
| PUT | /model-switchboard/models/:id/activate | model-switchboard | service(5) |
| GET | /model-switchboard/models/:id | model-switchboard | service(5) |
| GET | /model-switchboard/models | model-switchboard | UI(3)، service(28) |
| POST | /model-switchboard/invoke | model-switchboard | UI(9)، service(9) |
| GET | /model-switchboard/invocations | model-switchboard | service(8) |
| POST | /model-switchboard/policies | model-switchboard | UI(132)، BFF(1)، service(76) |
| GET | /model-switchboard/policies | model-switchboard | UI(132)، BFF(1)، service(76) |
| GET | /model-switchboard/policies/:id | model-switchboard | service(5) |
| PUT | /model-switchboard/policies/:id | model-switchboard | service(5) |
| DELETE | /model-switchboard/policies/:id | model-switchboard | service(5) |
| POST | /model-switchboard/route | model-switchboard | UI(230)، service(23) |
| POST | /model-switchboard/record-usage | model-switchboard | service(5) |
| GET | /model-switchboard/usage | model-switchboard | UI(42)، service(21) |
| GET | /model-switchboard/usage/summary | model-switchboard | service(5) |
| POST | /model-switchboard/model-cards | model-switchboard | service(5) |
| GET | /model-switchboard/model-cards | model-switchboard | service(5) |
| GET | /model-switchboard/model-cards/:modelId | model-switchboard | service(5) |
| PATCH | /model-switchboard/model-cards/:id | model-switchboard | service(5) |
| POST | /model-switchboard/model-cards/:id/approve | model-switchboard | service(5) |
| POST | /model-switchboard/model-cards/:id/deprecate | model-switchboard | service(5) |
| POST | /model-switchboard/governance/validate | model-switchboard | service(5) |
| GET | /model-switchboard/governance/report | model-switchboard | service(5) |
| GET | /model-switchboard/health | model-switchboard | UI(12)، BFF(4)، service(70) |
| GET | /model-switchboard/circuit-breaker/:modelKey | model-switchboard | service(5) |
| GET | /model-switchboard/ab-test/:policyId/report | model-switchboard | service(5) |

### monitoring-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /metrics | — | UI(2)، service(3) |
| POST | /metrics | — | UI(2)، service(3) |
| GET | /slos | — | UI(3) |
| POST | /slos | — | UI(3) |
| GET | /alerts | — | UI(6)، service(2) |
| PATCH | /alerts/:alertId/ack | — | — |
| GET | /dashboard | — | UI(37)، BFF(1) |
| GET | /otel/health | otel | UI(12)، BFF(4)، service(69) |
| POST | /otel/span | otel | UI(206)، service(9) |
| POST | /otel/metric | otel | UI(38)، service(25) |
| POST | /otel/attributes | otel | UI(12)، service(13) |
| POST | /otel/event | otel | UI(94)، service(199) |
| POST | /otel/exception | otel | UI(14)، service(7) |

### notification-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /notifications | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/otp | notifications | UI(67)، BFF(1)، service(24) |
| POST | /notifications/otp/verify | notifications | UI(29)، BFF(1)، service(8) |
| GET | /notifications/:id | notifications | UI(1)، BFF(1)، service(8) |
| GET | /notifications | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/delivery-callback | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/sms/templates | notifications | UI(1)، BFF(1)، service(8) |
| GET | /notifications/sms/templates | notifications | UI(1)، BFF(1)، service(8) |
| GET | /notifications/sms/templates/:type/:language | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/sms/templates/:id | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/sms/send-template | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/email/templates | notifications | UI(1)، BFF(1)، service(8) |
| GET | /notifications/email/templates | notifications | UI(1)، BFF(1)، service(8) |
| GET | /notifications/email/templates/:type/:language | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/email/templates/:id | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/email/send-template | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/:id/retry | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/retry-all-failed | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/bulk | notifications | UI(2)، BFF(1)، service(9) |
| POST | /notifications/webhooks/delivery | notifications | UI(1)، BFF(1)، service(8) |
| POST | /notifications/templates/seed-defaults | notifications | UI(1)، BFF(1)، service(9) |
| POST | /notifications/push | notifications | UI(214)، BFF(1)، service(96) |
| GET | /notifications/health/providers | notifications | UI(1)، BFF(1)، service(8) |
| GET | /notifications/credentials | notifications | UI(26)، BFF(5)، service(17) |
| POST | /notifications/credentials | notifications | UI(26)، BFF(5)، service(17) |
| POST | /notifications/credentials/:credentialId/rotate | notifications | UI(1)، BFF(1)، service(8) |
| DELETE | /notifications/credentials/:credentialId | notifications | UI(1)، BFF(1)، service(8) |

### orchestrator-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /dlq/stats | — | UI(3) |
| GET | /dlq | — | UI(9)، service(2) |
| POST | /dlq/:dlqId/resolve | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /orchestrations/sagas | — | service(1) |
| GET | /orchestrations/sagas/:sagaId | — | — |
| POST | /orchestrations/sagas/:sagaId/compensation | — | — |
| POST | /orchestrations/sagas/:sagaId/compensation/retry | — | — |
| GET | /orchestrations/sagas/:sagaId/compensation/status | — | — |
| GET | /work-items | — | UI(15)، service(7) |
| GET | /work-items/:workItemId | — | — |
| POST | /work-items/:workItemId/complete | — | — |
| POST | /work-items/:workItemId/assign | — | — |
| POST | /work-items/sanhab-followup | — | service(2) |
| POST | /work-items/underwriting-review | — | service(1) |
| POST | /work-items/suspicious-case | — | — |
| POST | /work-items/override-review | — | — |
| GET | /work-items/sla/breaches | — | — |
| POST | /work-items/sla/process-breaches | — | — |
| GET | /work-items/sla/stats/:sagaId | — | — |
| POST | /workflows/processes/:processType/start | — | — |
| GET | /workflows/processes/:processInstanceId | — | — |
| GET | /workflows/work-items | — | — |
| POST | /workflows/work-items/:workItemId/claim | — | — |
| POST | /workflows/work-items/:workItemId/complete | — | — |

### partner-gateway

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | health | UI(12)، BFF(4)، service(68) |
| GET | /health/ready | health | UI(33)، BFF(4)، service(109) |
| POST | /partner-gateway/partners | partner-gateway | UI(95)، service(17) |
| GET | /partner-gateway/partners | partner-gateway | UI(95)، service(17) |
| GET | /partner-gateway/partners/:partnerId | partner-gateway | service(11) |
| PUT | /partner-gateway/partners/:partnerId | partner-gateway | service(11) |
| POST | /partner-gateway/partners/:partnerId/revoke | partner-gateway | service(11) |
| POST | /partner-gateway/partners/:partnerId/suspend | partner-gateway | service(11) |
| POST | /partner-gateway/partners/:partnerId/activate | partner-gateway | service(11) |
| POST | /partner-gateway/partners/:partnerId/certificates | partner-gateway | service(11) |
| GET | /partner-gateway/partners/:partnerId/certificates | partner-gateway | service(11) |
| POST | /partner-gateway/partners/:partnerId/certificates/:certId/rotate | partner-gateway | service(11) |
| GET | /partner-gateway/certificates/expiring | partner-gateway | service(11) |
| POST | /partner-gateway/token-exchange | partner-gateway | service(14) |
| POST | /partner-gateway/validate-access | partner-gateway | service(11) |

### party-kyc-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /api/v1/broker-licenses | /api/v1/broker-licenses | service(1) |
| GET | /api/v1/broker-licenses/:licenseId | /api/v1/broker-licenses | service(1) |
| POST | /api/v1/broker-licenses/:licenseId/verify | /api/v1/broker-licenses | service(1) |
| POST | /api/v1/broker-licenses/:licenseId/validate | /api/v1/broker-licenses | service(1) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /federation/consents | federation/consents | — |
| POST | /federation/consents/:consentId/revoke | federation/consents | — |
| GET | /federation/consents/check | federation/consents | UI(124)، service(116) |
| GET | /federation/consents/subject/:globalSubjectId | federation/consents | — |
| GET | /federation/consents/:consentId | federation/consents | — |
| POST | /api/v1/parties/:partyId/roles | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/parties/:partyId/roles | /api/v1 | UI(11)، BFF(5)، service(29) |
| DELETE | /api/v1/parties/:partyId/roles/:assignmentId | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/global-subjects | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/global-subjects/:globalSubjectId/links | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/global-subjects/:globalSubjectId/links/:linkId/revoke | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/parties | — | BFF(2) |
| GET | /api/v1/parties/:partyId | — | — |
| PATCH | /api/v1/parties/:partyId | — | — |
| GET | /api/v1/parties | — | BFF(2) |
| POST | /party/:partyId/kyc/review | — | — |
| POST | /party/:partyId/kyc/documents | — | — |
| POST | /party/:partyId/kyc/documents/verify | — | — |
| POST | /party/:partyId/kyc/aml-screening | — | — |
| POST | /party/:partyId/kyc/escalate | — | — |
| GET | /kyc/reviews | — | — |
| POST | /party/:partyId/aml-consent/grant | — | — |
| POST | /party/:partyId/aml-consent/revoke | — | — |
| GET | /party/:partyId/aml-consent/check | — | — |
| GET | /party/:partyId/aml-consent/history | — | — |
| POST | /party/:partyId/document-trust-chain | — | — |
| POST | /party/:partyId/document-trust-chain/:documentId/verify | — | — |
| GET | /party/:partyId/document-trust-chain | — | — |
| POST | /party/:partyId/identity-proofing | — | — |
| GET | /identity-proofing/:proofingId | — | — |
| POST | /party/:partyId/external-verification | — | — |
| GET | /external-verification/:requestId | — | — |
| POST | /party/:partyId/kyc-exception | — | — |
| POST | /kyc-exception/:exceptionId/assign | — | — |
| POST | /kyc-exception/:exceptionId/resolve | — | — |
| POST | /kyc-exception/:exceptionId/escalate | — | — |
| GET | /kyc-exceptions | — | — |
| GET | /party/:partyId/sla-compliance | — | — |
| GET | /kyc/overdue-reviews | — | — |

### payments-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /payments/gateway/callback | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /payments/prepare | — | UI(3) |
| POST | /payments/:paymentIntentId/approve | — | — |
| POST | /payments/:paymentIntentId/execute | — | — |
| POST | /payments/:paymentIntentId/fail | — | — |
| POST | /payments/:paymentIntentId/notify | — | — |
| GET | /payments/:paymentIntentId | — | — |
| GET | /api/v1/ecosystem/payments/:paymentId | — | — |
| GET | /payments | — | UI(49)، BFF(1)، service(22) |
| POST | /payments/:paymentIntentId/gateway/initiate | — | — |
| POST | /payments/reconcile | — | — |
| POST | /payments/:paymentId/refund | — | — |
| POST | /payments/:paymentId/dispute | — | — |

### policy-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /policies/:policyId/details | — | — |
| PATCH | /policies/:policyId | — | — |
| GET | /policies/:policyId/coverages | — | — |
| POST | /policies/:policyId/coverages | — | — |
| GET | /policies/:policyId/history | — | — |
| POST | /policies/:policyId/endorsements | — | — |
| POST | /endorsements/:endorsementId/apply | — | — |
| POST | /endorsements/:endorsementId/submit | — | — |
| POST | /endorsements/:endorsementId/approve | — | — |
| POST | /endorsements/:endorsementId/reject | — | — |
| POST | /api/v1/policies/projections | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/policies/projections | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/policies/projections/:policyId | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /policies/:policyId/underwriting/decision | — | — |
| POST | /policies/quote | — | UI(3) |
| POST | /policies/convert-quote | — | service(1) |
| POST | /policies/:policyId/sanhab/inquiry | — | — |
| GET | /policies/:policyId/sanhab/inquiries | — | — |
| POST | /policies/sanhab/sms-inquiry | — | — |
| GET | /policies/:policyId/changes | — | — |
| GET | /policies/:policyId/timeline | — | — |
| POST | /policies/:policyId/submit-docs | — | — |
| POST | /policies/:policyId/risk-assess | — | — |
| POST | /policies/:policyId/issue | — | — |
| POST | /policies/:policyId/unique-code | — | — |
| POST | /policies/:policyId/quality-gate/override | — | — |
| POST | /policies/:policyId/endorse | — | — |
| GET | /policies/:policyId/endorsements | — | — |
| POST | /policies/:policyId/cancel | — | — |
| POST | /policies/:policyId/lapse | — | — |
| POST | /policies/:policyId/renew | — | — |
| GET | /policies/:policyId | — | — |
| GET | /policies | — | UI(56)، BFF(1)، service(12) |
| POST | /policies/:policyId/auto-renew | — | — |
| POST | /policies/:policyId/renewal/schedule | — | — |
| POST | /renewals/:renewalId/approve | — | — |
| POST | /renewals/:renewalId/reject | — | — |
| GET | /policies/:policyId/renewals | — | — |
| GET | /policies/renewal/due | — | — |
| POST | /policies/:policyId/sanhab-result | — | — |
| GET | /api/v1/reports/policies-without-unique-code | — | — |
| GET | /api/v1/reports/duplicate-unique-codes | — | — |

### product-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /api/v1/products | /api/v1 | UI(16)، BFF(5)، service(29) |
| GET | /api/v1/products | /api/v1 | UI(16)، BFF(5)، service(29) |
| GET | /api/v1/products/:productId | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/products/:productId/versions | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/products/:productId/versions | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/products/:productId/versions/:version | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/products/:productId/versions/:version/activate | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/products/:productId/versions/:version/retire | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/products/:productId/versions/:version/clone | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/products/:productId/visibility | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/products/:productId/visibility | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/products/:productId/visibility/:visibilityId | /api/v1 | UI(11)، BFF(5)، service(29) |
| PATCH | /api/v1/products/:productId/visibility/:visibilityId | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/products/:productId/visibility/:visibilityId/revoke | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/distributors/:distributorOrganizationId/visible-products | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/broker-offerings | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/broker-offerings | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/broker-offerings/:offeringId | /api/v1 | UI(11)، BFF(5)، service(29) |
| PATCH | /api/v1/broker-offerings/:offeringId | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/broker-offerings/:offeringId/activate | /api/v1 | UI(11)، BFF(5)، service(29) |
| POST | /api/v1/broker-offerings/:offeringId/inactivate | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /api/v1/customers/offerings | /api/v1 | UI(11)، BFF(5)، service(29) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /product/products | — | UI(3) |
| GET | /product/products/:productId | — | — |
| GET | /product/products | — | UI(3) |
| PATCH | /product/products/:productId | — | — |
| POST | /product/products/:productId/archive | — | — |
| POST | /product/coverages | — | UI(3) |
| GET | /product/coverages/:coverageId | — | — |
| GET | /product/coverages | — | UI(3) |
| PATCH | /product/coverages/:coverageId | — | — |
| POST | /product/coverages/:coverageId/archive | — | — |
| POST | /product/deductibles | — | UI(3) |
| GET | /product/deductibles/:deductibleId | — | — |
| GET | /product/deductibles | — | UI(3) |
| PATCH | /product/deductibles/:deductibleId | — | — |
| POST | /product/deductibles/:deductibleId/archive | — | — |
| POST | /product/pricing-rules | — | UI(3) |
| GET | /product/pricing-rules/:pricingRuleId | — | — |
| GET | /product/pricing-rules | — | UI(3) |
| PATCH | /product/pricing-rules/:pricingRuleId | — | — |
| POST | /product/pricing-rules/:pricingRuleId/archive | — | — |
| GET | /product/export | — | UI(3) |
| POST | /product/quote | — | service(1) |
| GET | /product/products/:productId/versions | — | — |
| GET | /product/products/:productId/versions/:version | — | — |
| POST | /product/products/:productId/pricing-rules/evaluate | — | — |

### regulatory-gateway-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /reg/sanhab/webhook | — | — |
| POST | /reg/sanhab/simulate | — | — |
| POST | /reg/sanhab/inquiry | — | UI(3)، service(1) |
| GET | /reg/sanhab/events | — | — |
| GET | /reg/sanhab/circuit-breaker | — | — |
| PUT | /reg/sanhab/circuit-breaker/reset | — | — |
| GET | /reg/sanhab/health-check | — | — |
| POST | /reg/warehouse-fire/inquire | — | — |
| GET | /reg/warehouse-fire/national-id/:nationalId | — | — |
| GET | /reg/warehouse-fire/license/:licenseNumber | — | — |
| GET | /reg/warehouse-fire/warehouse/:warehouseId | — | — |
| GET | /reg/warehouse-fire/health-check | — | — |
| GET | /reg/warehouse-fire/config | — | — |
| PUT | /reg/warehouse-fire/config | — | — |
| POST | /reg/sanhab/sms/initiate | — | — |
| POST | /reg/sanhab/sms/reply | — | — |
| GET | /reg/sanhab/sms/inquiry/:inquiryId | — | — |
| GET | /reg/sanhab/sms/pending/:phoneNumber | — | — |
| POST | /reg/sanhab/sms/inquiry/:inquiryId/cancel | — | — |
| GET | /reg/sanhab/sms/health-check | — | — |
| GET | /reg/sanhab/sms/config | — | — |
| PUT | /reg/sanhab/sms/config | — | — |
| POST | /reg/broker-license/validate | — | service(1) |
| POST | /api/v1/policies/:policyId/sanhab-submit | — | — |
| GET | /api/v1/policies/:policyId/sanhab-status | — | — |
| POST | /api/v1/policies/:policyId/sanhab-retry | — | — |
| GET | /api/v1/sanhab/config | — | — |

### reinsurance-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /re/treaties | — | UI(3) |
| GET | /re/treaties/:treatyId | — | — |
| GET | /re/treaties | — | UI(3) |
| PATCH | /re/treaties/:treatyId | — | — |
| PATCH | /re/treaties/:treatyId/close | — | — |
| POST | /re/cessions/calculate-automatic | — | — |
| POST | /re/cessions | — | — |
| GET | /re/cessions/:cessionId | — | — |
| GET | /re/cessions | — | — |
| PATCH | /re/cessions/:cessionId | — | — |
| PATCH | /re/cessions/:cessionId/approve | — | — |
| POST | /re/statements | — | — |
| GET | /re/statements/:statementId | — | — |
| GET | /re/statements | — | — |
| PATCH | /re/statements/:statementId | — | — |
| POST | /re/reconciliations | — | — |
| POST | /re/recoveries | — | — |
| GET | /re/recoveries/:recoveryId | — | — |
| GET | /re/recoveries | — | — |
| PATCH | /re/recoveries/:recoveryId | — | — |
| POST | /re/tickets | — | — |
| GET | /re/tickets/:ticketId | — | — |
| GET | /re/tickets | — | — |
| PATCH | /re/tickets/:ticketId | — | — |
| PATCH | /re/tickets/:ticketId/assign | — | — |
| POST | /re/tickets/:ticketId/messages | — | — |
| POST | /re/tickets/:ticketId/attachments | — | — |
| GET | /re/reconciliations/:reconciliationId | — | — |
| GET | /re/reconciliations | — | — |
| PATCH | /re/reconciliations/:reconciliationId | — | — |
| GET | /re/export | — | UI(3) |
| POST | /re/periods/close | — | — |
| POST | /re/reconciliations/invoice/register | — | — |
| POST | /re/reconciliations/:reconciliationId/auto-match | — | — |

### reporting-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /reporting/aml-fraud/regulatory-report | — | — |
| POST | /reporting/audit-reports | — | — |
| GET | /reporting/audit-reports | — | — |
| GET | /reporting/audit-reports/:reportId | — | — |
| POST | /reporting/audit-reports/:reportId/generate | — | — |
| GET | /reporting/audit-reports/:reportId/export | — | — |
| GET | /reporting/audit-reports/:reportId/verify | — | — |
| GET | /reporting/bi/executive | — | — |
| GET | /reporting/bi/cockpit | — | — |
| GET | /reporting/bi/export | — | — |
| POST | /reporting/broker-reports | — | — |
| GET | /reporting/broker-reports | — | — |
| GET | /reporting/broker-reports/:reportId | — | — |
| POST | /reporting/broker-reports/:reportId/generate | — | — |
| POST | /reporting/broker-reports/:reportId/approve | — | — |
| POST | /reporting/broker-reports/:reportId/submit | — | — |
| POST | /reporting/data-quality/reconcile | — | — |
| GET | /reporting/data-quality/issues | — | — |
| GET | /reporting/data-quality/issues/:issueId | — | — |
| POST | /reporting/data-quality/issues/:issueId/resolve | — | — |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /reporting/reconciliation/policy-ledger | — | — |
| GET | /reporting/reconciliation/payment-ledger | — | — |
| GET | /reporting/reconciliation/run-all | — | — |
| POST | /reporting/regulatory-reports | — | — |
| GET | /reporting/regulatory-reports | — | — |
| GET | /reporting/regulatory-reports/:reportId | — | — |
| POST | /reporting/regulatory-reports/:reportId/generate | — | — |
| GET | /reporting/regulatory-reports/:reportId/export-xml | — | — |
| GET | /reporting/regulatory-reports/:reportId/export-pdf | — | — |
| POST | /reporting/regulatory-reports/:reportId/submit | — | — |
| GET | /reporting/kpis/ready | — | UI(3) |
| GET | /reporting/ri/ceded | — | UI(3) |
| GET | /reporting/claims/payments | — | UI(2) |
| GET | /reporting/fraud/case-escalations | — | UI(3) |
| GET | /reporting/complaints/sla-breaches | — | UI(3) |
| GET | /reporting/claims/documents-attached | — | UI(2) |
| GET | /reporting/ri/borderaux | — | UI(3) |
| GET | /reporting/ri/recoveries | — | UI(3) |
| GET | /reporting/kpis/governance | — | UI(3) |
| GET | /reporting/kpis/governance/:kpiKey | — | — |
| PUT | /reporting/kpis/governance/:kpiKey | — | — |
| POST | /reporting/kpis/snapshots | — | UI(3) |
| GET | /reporting/kpis/snapshots | — | UI(3) |
| GET | /reporting/dashboard/executive | — | — |
| GET | /reporting/policies | — | — |
| GET | /reporting/policies/:policyId | — | — |
| GET | /reporting/payments | — | — |
| GET | /reporting/payments/:paymentId | — | — |
| GET | /reporting/sales-partners | — | — |
| GET | /reporting/sales-partners/:partnerId | — | — |
| GET | /reporting/aml-transactions | — | — |
| GET | /reporting/aml-transactions/:transactionId | — | — |
| GET | /reporting/underwriting-requests | — | — |
| GET | /reporting/underwriting-requests/:requestId | — | — |
| POST | /reporting/external-systems | — | — |
| PUT | /reporting/external-systems/:connectionId | — | — |
| GET | /reporting/external-systems/:connectionId | — | — |
| GET | /reporting/external-systems | — | — |
| POST | /reporting/external-systems/:connectionId/sync | — | — |
| GET | /reporting/external-systems/:connectionId/sync-status | — | — |
| POST | /reporting/external-systems/:connectionId/delete | — | — |
| GET | /reporting/kpis/financial | — | — |
| GET | /reporting/kpis/market-share | — | — |
| GET | /reporting/kpis/satisfaction | — | — |
| GET | /reporting/retention/policies | — | — |
| POST | /reporting/retention/apply | — | — |
| GET | /reporting/settlement/dashboard | — | — |
| GET | /reporting/settlement/brokers | — | — |
| POST | /reporting/tcor-reports | — | — |
| GET | /reporting/tcor-reports | — | — |
| GET | /reporting/tcor-reports/:reportId | — | — |
| POST | /reporting/tcor-reports/:reportId/generate | — | — |
| GET | /reporting/tcor-reports/:reportId/drilldown | — | — |
| POST | /reporting/tcor-reports/:reportId/approve | — | — |
| POST | /reporting/tcor-reports/:reportId/submit | — | — |

### rule-engine-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /rule-engine/rules | rule-engine | UI(34)، service(65) |
| PUT | /rule-engine/rules/:id/activate | rule-engine | service(3) |
| PUT | /rule-engine/rules/:id/deactivate | rule-engine | service(3) |
| PUT | /rule-engine/rules/:id | rule-engine | service(3) |
| DELETE | /rule-engine/rules/:id | rule-engine | service(3) |
| GET | /rule-engine/rules/:id/validate | rule-engine | service(3) |
| POST | /rule-engine/evaluate | rule-engine | service(28) |
| GET | /rule-engine/rules/:id | rule-engine | service(3) |
| GET | /rule-engine/rules | rule-engine | UI(34)، service(65) |
| GET | /rule-engine/executions | rule-engine | service(7) |
| GET | /rule-engine/executions/:id | rule-engine | service(3) |
| GET | /rule-engine/executions/metrics | rule-engine | service(3) |
| POST | /rule-engine/templates | rule-engine | UI(3)، service(17) |
| GET | /rule-engine/templates | rule-engine | UI(3)، service(17) |
| POST | /rule-engine/templates/:templateId/rules | rule-engine | service(3) |

### sales-network-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /api/v1/distribution-agreements | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /api/v1/distribution-agreements | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /api/v1/distribution-agreements/:agreementId | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/:agreementId/versions | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/:agreementId/activate | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/:agreementId/terminate | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /api/v1/distribution-agreements/:agreementId/eligibility | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/:agreementId/submit-for-approval | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/:agreementId/approve | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/:agreementId/reject | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/:agreementId/return | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /api/v1/distribution-agreements/:agreementId/approvals | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /api/v1/distribution-agreements/:agreementId/history | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /api/v1/distribution-agreements/:agreementId/binding-authority | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/binding-authority-profiles | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /api/v1/distribution-agreements/binding-authority-profiles | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /api/v1/distribution-agreements/binding-authority-profiles/:profileId | /api/v1/distribution-agreements | BFF(3)، service(2) |
| POST | /api/v1/distribution-agreements/binding-authority-profiles/:profileId/activate | /api/v1/distribution-agreements | BFF(3)، service(2) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /sales-network/partners | — | UI(12) |
| POST | /sales-network/ledger/:ledgerEntryId/void | — | — |
| POST | /sales-network/ledger/:ledgerEntryId/pay | — | — |
| POST | /sales-network/partners | — | UI(12) |
| POST | /sales-network/partners/:orgUnitId/verify | — | — |
| POST | /sales-network/partners/:orgUnitId/status | — | — |
| GET | /sales-network/contracts | — | UI(3) |
| POST | /sales-network/contracts | — | UI(3) |
| POST | /sales-network/contracts/:contractId/activate | — | — |
| GET | /sales-network/ledger | — | UI(3) |
| GET | /sales-network/kpi/daily | — | UI(2) |
| GET | /sales-network/agent/summary | — | — |
| GET | /sales-network/agent/policies | — | — |
| POST | /sales-network/commission/calculate | — | — |
| POST | /sales-network/commission/recalculate | — | — |
| GET | /sales-network/performance/trend | — | — |
| GET | /sales-network/performance/compare-periods | — | — |
| GET | /sales-network/performance/top-performers | — | — |
| GET | /sales-network/agents/:agentId/stats | — | — |
| GET | /sales-network/agents/:agentId/policies | — | — |
| GET | /sales-network/agents/:agentId/claims | — | — |
| GET | /sales-network/agents/:agentId/customers | — | — |
| GET | /sales-network/agents/:agentId/commissions | — | — |
| GET | /sales-network/agents/:agentId/kpis | — | — |

### submission-placement-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| POST | /api/v1/quote-requests/:quoteRequestId/compare | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/quote-requests/:quoteRequestId/compare | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/carrier-connectors | api/v1 | UI(11)، BFF(8)، service(33) |
| GET | /api/v1/carrier-connectors | api/v1 | UI(11)، BFF(8)، service(33) |
| GET | /api/v1/carrier-connectors/:connectorId | api/v1 | UI(11)، BFF(8)، service(29) |
| PUT | /api/v1/carrier-connectors/:connectorId | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/carrier-connectors/:carrierOrganizationId/health | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/carrier-connectors/:carrierOrganizationId/test | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /ready | — | UI(3) |
| POST | /api/v1/quote-responses/:quoteResponseId/select | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/quote-responses/:quoteResponseId/placement | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/placements/:placementId/bind | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/placements/:placementId/retry | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/placements/:placementId/cancel | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/placements | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/placements/:placementId | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/submissions/:submissionId/quotes/request | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/submissions/:submissionId/quotes | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/quote-requests/:quoteRequestId | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/submissions | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/submissions | api/v1 | UI(11)، BFF(8)، service(29) |
| GET | /api/v1/submissions/:submissionId | api/v1 | UI(11)، BFF(8)، service(29) |
| PATCH | /api/v1/submissions/:submissionId | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/submissions/:submissionId/submit | api/v1 | UI(11)، BFF(8)، service(29) |
| POST | /api/v1/submissions/:submissionId/expire | api/v1 | UI(11)، BFF(8)، service(29) |

### underwriting-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /underwriting/requests | — | UI(6)، service(2) |
| GET | /underwriting/requests/:underwritingRequestId | — | — |
| GET | /underwriting/requests | — | UI(6)، service(2) |
| POST | /underwriting/requests/:underwritingRequestId/decide | — | — |
| GET | /underwriting/sla/breaches | — | — |
| POST | /underwriting/requests/:underwritingRequestId/escalate | — | — |
| GET | /underwriting/sla/metrics | — | — |
| POST | /underwriting/requests/:id/assess-risk | — | — |
| GET | /underwriting/risk-matrix | — | — |
| POST | /underwriting/appetite-rules | — | — |
| POST | /underwriting/appetite-rules/evaluate | — | — |
| GET | /underwriting/appetite-rules | — | — |
| PATCH | /underwriting/appetite-rules/:id | — | — |
| POST | /underwriting/appetite-rules/:id/delete | — | — |

### workflow-engine-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| POST | /workflow/definitions | workflow | service(45) |
| GET | /workflow/definitions | workflow | service(45) |
| GET | /workflow/definitions/:id | workflow | service(38) |
| PUT | /workflow/definitions/:id | workflow | service(38) |
| DELETE | /workflow/definitions/:id | workflow | service(38) |
| POST | /workflow/start | workflow | UI(195)، BFF(2)، service(235) |
| POST | /workflow/instances/:id/signal | workflow | service(38) |
| POST | /workflow/instances/:id/cancel | workflow | service(38) |
| GET | /workflow/instances/:id | workflow | service(38) |
| GET | /workflow/instances | workflow | service(44) |
| GET | /workflow/instances/:id/history | workflow | service(38) |
| GET | /workflow/health/deep | workflow | service(38) |

### workflow-service

| متد | مسیر کامل | base | مصرف‌کنندگان |
|---|---|---|---|
| GET | /health | — | UI(8)، BFF(4)، service(44) |
| GET | /ecosystem-ai/recommendations | ecosystem-ai | UI(3)، service(17) |
| POST | /ecosystem-ai/signals | ecosystem-ai | UI(3)، service(19) |
| POST | /ecosystem-ai/feedback | ecosystem-ai | UI(14)، service(7) |
| POST | /workflow/definitions | workflow | service(45) |
| PUT | /workflow/definitions/:id/activate | workflow | service(38) |
| PUT | /workflow/definitions/:id/deactivate | workflow | service(38) |
| GET | /workflow/definitions/:id/validate | workflow | service(38) |
| PUT | /workflow/definitions/:id | workflow | service(38) |
| DELETE | /workflow/definitions/:id | workflow | service(38) |
| GET | /workflow/definitions/:id | workflow | service(38) |
| GET | /workflow/definitions | workflow | service(45) |
| POST | /workflow/instances | workflow | service(44) |
| POST | /workflow/instances/:id/advance | workflow | service(38) |
| POST | /workflow/instances/:id/tasks/:taskId/complete | workflow | service(38) |
| PUT | /workflow/instances/:id/cancel | workflow | service(38) |
| GET | /workflow/instances/:id | workflow | service(38) |
| GET | /workflow/instances | workflow | service(44) |
| GET | /workflow/instances/metrics | workflow | service(38) |

## ۴. اندپوینت‌های تجاری بدون مصرف‌کننده شناسایی‌شده

### aml-service
- GET /aml/consents/:consentId (services/aml-service/src/aml.controller.ts)
- PATCH /aml/consents/:consentId/revoke (services/aml-service/src/aml.controller.ts)
- GET /aml/rules/:ruleId (services/aml-service/src/aml.controller.ts)
- PATCH /aml/rules/:ruleId (services/aml-service/src/aml.controller.ts)
- GET /aml/alerts/:alertId (services/aml-service/src/aml.controller.ts)
- PATCH /aml/alerts/:alertId/assign (services/aml-service/src/aml.controller.ts)
- PATCH /aml/alerts/:alertId/status (services/aml-service/src/aml.controller.ts)
- POST /aml/transactions/evaluate (services/aml-service/src/aml.controller.ts)
- POST /aml/external-sources (services/aml-service/src/aml.controller.ts)
- PUT /aml/external-sources/:sourceId (services/aml-service/src/aml.controller.ts)
- GET /aml/external-sources/:sourceId (services/aml-service/src/aml.controller.ts)
- GET /aml/external-sources (services/aml-service/src/aml.controller.ts)
- POST /aml/external-sources/:sourceId/sync (services/aml-service/src/aml.controller.ts)
- POST /aml/external-sources/:sourceId/query (services/aml-service/src/aml.controller.ts)
- POST /aml/reports/official (services/aml-service/src/aml.controller.ts)

### api-gateway
- GET /health (services/api-gateway/src/health.controller.ts)
- GET /gateway/health (services/api-gateway/src/health.controller.ts)
- GET /health/deep (services/api-gateway/src/health.controller.ts)
- GET /gateway/health/deep (services/api-gateway/src/health.controller.ts)
- GET /admin/circuit-breakers (services/api-gateway/src/health.controller.ts)
- POST /admin/circuit-breakers/:serviceName/reset (services/api-gateway/src/health.controller.ts)

### auth-service
- PUT /users/:userId/roles (services/auth-service/src/auth.controller.ts)
- PUT /users/:userId/org-unit (services/auth-service/src/auth.controller.ts)
- GET /org-units/:orgUnitId (services/auth-service/src/org-units.controller.ts)
- POST /abac/policies (services/auth-service/src/policy-admin.controller.ts)
- PUT /abac/policies/:id (services/auth-service/src/policy-admin.controller.ts)
- DELETE /abac/policies/:id (services/auth-service/src/policy-admin.controller.ts)
- GET /abac/policies/:id (services/auth-service/src/policy-admin.controller.ts)
- GET /abac/policies (services/auth-service/src/policy-admin.controller.ts)

### billing-service
- POST /brokerage/policies/:policyId/post (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/commissions/calculate (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/commissions/post (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/settlements/batches/:batchId/approve (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/settlements/batches/:batchId/confirm (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/settlements/batches/:batchId/verify (services/billing-service/src/brokerage.controller.ts)
- GET /brokerage/journal-entries/:journalEntryId (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/journal-entries/:journalEntryId/reverse (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/settlements/batches/:batchId/reconcile (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/refunds/:refundId/approve (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/refunds/:refundId/send (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/escrow/holdings/:holdingId/release (services/billing-service/src/brokerage.controller.ts)
- GET /brokerage/escrow/holdings/:holdingId/eligibility (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/escrow/holdings/:holdingId/carrier-approve (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/invoices/:invoiceId/pay (services/billing-service/src/brokerage.controller.ts)
- GET /brokerage/payments/:paymentId (services/billing-service/src/brokerage.controller.ts)
- POST /brokerage/payments/:paymentId/retry (services/billing-service/src/brokerage.controller.ts)

### catalog-bff
- GET /api/v1/catalog/products/:productId (services/catalog-bff/src/catalog.controller.ts)
- GET /api/v1/catalog/distributors/:distributorOrganizationId/visible-products (services/catalog-bff/src/catalog.controller.ts)
- GET /api/v1/catalog/offerings/:offeringId/comparison-hint (services/catalog-bff/src/catalog.controller.ts)
- GET /api/v1/catalog/customer-offerings (services/catalog-bff/src/catalog.controller.ts)
- GET /api/v1/catalog/distribution-agreements/:agreementId/eligibility (services/catalog-bff/src/catalog.controller.ts)

### claims-readmodel-service
- GET /rm/claims/:claimId (services/claims-readmodel-service/src/readmodel.controller.ts)

### claims-service
- POST /claims/:claimId/advocacy-cases (services/claims-service/src/advocacy/advocacy.controller.ts)
- GET /advocacy-cases/:caseId (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /advocacy-cases/:caseId/tasks (services/claims-service/src/advocacy/advocacy.controller.ts)
- PATCH /advocacy-cases/:caseId/tasks/:taskId (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /advocacy-cases/:caseId/communications (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /advocacy-cases/:caseId/escalate (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /advocacy-cases/:caseId/close (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /claims/:claimId/adjuster-referrals (services/claims-service/src/advocacy/advocacy.controller.ts)
- GET /claims/:claimId/adjuster-referrals (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /adjuster-referrals/:referralId/accept (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /adjuster-referrals/:referralId/reject (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /adjuster-referrals/:referralId/submit-report (services/claims-service/src/advocacy/advocacy.controller.ts)
- GET /claims/:claimId/projections (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /claims/:claimId/projections (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /claims/:claimId/recovery (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /claims/:claimId/documents (services/claims-service/src/advocacy/advocacy.controller.ts)
- GET /claims/:claimId/documents (services/claims-service/src/advocacy/advocacy.controller.ts)
- GET /claims/:claimId/documents/:documentId/download (services/claims-service/src/advocacy/advocacy.controller.ts)
- POST /claims/:claimId/assess (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/approve (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/reject (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/pay (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/close (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/refer-to-adjuster (services/claims-service/src/claims.controller.ts)
- GET /claims/:claimId (services/claims-service/src/claims.controller.ts)
- PATCH /claims/:claimId (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/calculate-deductible (services/claims-service/src/claims.controller.ts)
- GET /claims/fnol/form-defaults (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/validate-policy (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/acknowledge (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/submit-to-carrier (services/claims-service/src/claims.controller.ts)
- POST /claims/:claimId/appeal (services/claims-service/src/claims.controller.ts)
- GET /claims/:claimId/history (services/claims-service/src/claims.controller.ts)

### collections-service
- GET /collections/plans/:planId (services/collections-service/src/collections.controller.ts)
- GET /collections/installments/:installmentId (services/collections-service/src/collections.controller.ts)
- POST /collections/installments/:installmentId/pay (services/collections-service/src/collections.controller.ts)
- GET /collections/installments/reminder/due (services/collections-service/src/collections.controller.ts)
- POST /collections/installments/:installmentId/reminder (services/collections-service/src/collections.controller.ts)
- GET /collections/installments/overdue (services/collections-service/src/collections.controller.ts)
- POST /collections/installments/:installmentId/overdue (services/collections-service/src/collections.controller.ts)
- GET /collections/installments/:installmentId/late-fee (services/collections-service/src/collections.controller.ts)
- POST /collections/installments/:installmentId/late-fee/apply (services/collections-service/src/collections.controller.ts)
- POST /collections/installments/:installmentId/gateway/initiate (services/collections-service/src/collections.controller.ts)
- POST /collections/installments/:installmentId/gateway/verify (services/collections-service/src/collections.controller.ts)
- POST /collections/gateway/callback (services/collections-service/src/collections.controller.ts)
- POST /collections/installments/:installmentId/link-receivable (services/collections-service/src/collections.controller.ts)
- POST /collections/installments/:installmentId/sync-receivable (services/collections-service/src/collections.controller.ts)
- GET /collections/receivables/reconciliation (services/collections-service/src/collections.controller.ts)
- POST /collections/plans/:planId/publish-receivable-requests (services/collections-service/src/collections.controller.ts)

### complaints-service
- POST /complaints/:complaintId/escalate (services/complaints-service/src/complaints.controller.ts)
- GET /complaints/:complaintId (services/complaints-service/src/complaints.controller.ts)
- GET /complaints/dashboard (services/complaints-service/src/complaints.controller.ts)
- POST /complaints/:complaintId/status (services/complaints-service/src/complaints.controller.ts)
- POST /complaints/:complaintId/attachments (services/complaints-service/src/complaints.controller.ts)
- POST /complaints/:complaintId/mobile/otp/request (services/complaints-service/src/complaints.controller.ts)
- POST /complaints/:complaintId/mobile/otp/verify (services/complaints-service/src/complaints.controller.ts)
- GET /complaints/:complaintId/export/central-insurance (services/complaints-service/src/complaints.controller.ts)
- GET /complaints/analysis/recurring-causes (services/complaints-service/src/complaints.controller.ts)
- GET /complaints/analysis/cause-trends (services/complaints-service/src/complaints.controller.ts)
- POST /complaints/:complaintId/central-insurance/send (services/complaints-service/src/complaints.controller.ts)
- GET /complaints/:complaintId/central-insurance/status (services/complaints-service/src/complaints.controller.ts)
- POST /complaints/:complaintId/central-insurance/retry (services/complaints-service/src/complaints.controller.ts)

### copilot-service
- POST /copilot/claims/:claimId/summary (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/documents/:documentId/summary (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/qa (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/next-best-action (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/providers (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/models/register (services/copilot-service/src/copilot.controller.ts)
- PUT /copilot/models/:modelId/status (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/models/:modelId (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/models (services/copilot-service/src/copilot.controller.ts)
- DELETE /copilot/models/:modelId (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/models/:modelId/risk-assessment (services/copilot-service/src/copilot.controller.ts)
- PUT /copilot/risk-assessment/:assessmentId/approve (services/copilot-service/src/copilot.controller.ts)
- PUT /copilot/risk-assessment/:assessmentId/reject (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/risk-assessment/:assessmentId (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/models/:modelId/risk-assessments (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/incidents (services/copilot-service/src/copilot.controller.ts)
- PUT /copilot/incidents/:incidentId/status (services/copilot-service/src/copilot.controller.ts)
- PUT /copilot/incidents/:incidentId/resolve (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/incidents/:incidentId (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/incidents (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/models/:modelId/model-card (services/copilot-service/src/copilot.controller.ts)
- PUT /copilot/model-card/:cardId (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/model-card/:cardId (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/models/:modelId/model-card (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/models/:modelId/model-cards (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/models/:modelId/validation-report (services/copilot-service/src/copilot.controller.ts)
- PUT /copilot/validation-report/:reportId/status (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/validation-report/:reportId (services/copilot-service/src/copilot.controller.ts)
- GET /copilot/models/:modelId/validation-reports (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/underwriting/assist (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/complaints/triage (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/recovery/discover (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/pricing/assist (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/selfservice/assist (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/ecosystem/consult (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/nba/:contextType/:resourceId/actions (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/nba/:logId/execute (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/nba/:logId/opt-out (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/recommend-product (services/copilot-service/src/copilot.controller.ts)
- POST /copilot/draft-communication (services/copilot-service/src/copilot.controller.ts)

### customer-portal-bff
- GET /policies/:policyId (services/customer-portal-bff/src/customer/customer.controller.ts)
- POST /policies/:policyId/endorsement (services/customer-portal-bff/src/customer/customer.controller.ts)
- POST /policies/:policyId/renewal (services/customer-portal-bff/src/customer/customer.controller.ts)
- GET /claims/:claimId (services/customer-portal-bff/src/customer/customer.controller.ts)
- GET /payments/:paymentId (services/customer-portal-bff/src/customer/customer.controller.ts)
- GET /brand-config/:brandKey (services/customer-portal-bff/src/customer/customer.controller.ts)

### document-ai-service
- GET /document-ai/jobs/:jobId (services/document-ai-service/src/document-ai.controller.ts)
- PATCH /document-ai/jobs/:jobId/retry (services/document-ai-service/src/document-ai.controller.ts)
- PATCH /document-ai/eval/cases/:caseId (services/document-ai-service/src/document-ai.controller.ts)
- GET /document-ai/eval/runs/:runId (services/document-ai-service/src/document-ai.controller.ts)
- GET /document-ai/eval/runs/:runId/results (services/document-ai-service/src/document-ai.controller.ts)
- POST /document-ai/documents/:documentId/redact (services/document-ai-service/src/document-ai.controller.ts)
- POST /document-ai/documents/:documentId/classify (services/document-ai-service/src/document-ai.controller.ts)
- POST /document-ai/documents/:documentId/confirm (services/document-ai-service/src/document-ai.controller.ts)
- POST /api/v1/ocr/extract (services/document-ai-service/src/document-ai.controller.ts)

### document-service
- POST /documents/link (services/document-service/src/documents.controller.ts)
- GET /documents/:documentId (services/document-service/src/documents.controller.ts)
- GET /documents/:documentId/signed-url (services/document-service/src/documents.controller.ts)
- GET /documents/:documentId/download (services/document-service/src/documents.controller.ts)
- POST /documents/:documentId/validate (services/document-service/src/documents.controller.ts)
- POST /documents/:documentId/classify (services/document-service/src/documents.controller.ts)
- POST /documents/:documentId/extract (services/document-service/src/documents.controller.ts)
- POST /documents/reinsurance-invoice/upload (services/document-service/src/documents.controller.ts)
- POST /documents/reinsurance-invoice/link (services/document-service/src/documents.controller.ts)
- GET /documents/reconciliation/:reconciliationId (services/document-service/src/documents.controller.ts)

### feature-flags-service
- GET /ai-toggles/:name (services/feature-flags-service/src/ai-toggles.controller.ts)
- PUT /ai-toggles/:name (services/feature-flags-service/src/ai-toggles.controller.ts)
- GET /feature-flags/:key (services/feature-flags-service/src/feature-flags.controller.ts)
- PUT /feature-flags/:key (services/feature-flags-service/src/feature-flags.controller.ts)

### fraud-service
- POST /fraud/cases/:claimId/open (services/fraud-service/src/fraud.controller.ts)
- POST /fraud/cases/:fraudCaseId/escalate (services/fraud-service/src/fraud.controller.ts)
- POST /fraud/cases/:fraudCaseId/close (services/fraud-service/src/fraud.controller.ts)
- POST /fraud/ml/train (services/fraud-service/src/fraud.controller.ts)
- POST /fraud/ml/models/:modelId/deploy (services/fraud-service/src/fraud.controller.ts)
- POST /fraud/ml/predict (services/fraud-service/src/fraud.controller.ts)
- GET /fraud/ml/models (services/fraud-service/src/fraud.controller.ts)
- POST /fraud/graph/entities (services/fraud-service/src/fraud.controller.ts)
- POST /fraud/graph/relationships (services/fraud-service/src/fraud.controller.ts)
- GET /fraud/graph/suspicious-networks (services/fraud-service/src/fraud.controller.ts)
- POST /fraud/alerts/detect (services/fraud-service/src/fraud.controller.ts)
- GET /fraud/alerts (services/fraud-service/src/fraud.controller.ts)
- PUT /fraud/alerts/:alertId (services/fraud-service/src/fraud.controller.ts)

### monitoring-service
- PATCH /alerts/:alertId/ack (services/monitoring-service/src/monitoring.controller.ts)

### orchestrator-service
- POST /dlq/:dlqId/resolve (services/orchestrator-service/src/dlq.controller.ts)
- GET /orchestrations/sagas/:sagaId (services/orchestrator-service/src/orchestrations.controller.ts)
- POST /orchestrations/sagas/:sagaId/compensation (services/orchestrator-service/src/orchestrations.controller.ts)
- POST /orchestrations/sagas/:sagaId/compensation/retry (services/orchestrator-service/src/orchestrations.controller.ts)
- GET /orchestrations/sagas/:sagaId/compensation/status (services/orchestrator-service/src/orchestrations.controller.ts)
- GET /work-items/:workItemId (services/orchestrator-service/src/work-items.controller.ts)
- POST /work-items/:workItemId/complete (services/orchestrator-service/src/work-items.controller.ts)
- POST /work-items/:workItemId/assign (services/orchestrator-service/src/work-items.controller.ts)
- POST /work-items/suspicious-case (services/orchestrator-service/src/work-items.controller.ts)
- POST /work-items/override-review (services/orchestrator-service/src/work-items.controller.ts)
- GET /work-items/sla/breaches (services/orchestrator-service/src/work-items.controller.ts)
- POST /work-items/sla/process-breaches (services/orchestrator-service/src/work-items.controller.ts)
- GET /work-items/sla/stats/:sagaId (services/orchestrator-service/src/work-items.controller.ts)
- POST /workflows/processes/:processType/start (services/orchestrator-service/src/workflows.controller.ts)
- GET /workflows/processes/:processInstanceId (services/orchestrator-service/src/workflows.controller.ts)
- GET /workflows/work-items (services/orchestrator-service/src/workflows.controller.ts)
- POST /workflows/work-items/:workItemId/claim (services/orchestrator-service/src/workflows.controller.ts)
- POST /workflows/work-items/:workItemId/complete (services/orchestrator-service/src/workflows.controller.ts)

### party-kyc-service
- POST /federation/consents (services/party-kyc-service/src/identity/federation-consent.controller.ts)
- POST /federation/consents/:consentId/revoke (services/party-kyc-service/src/identity/federation-consent.controller.ts)
- GET /federation/consents/subject/:globalSubjectId (services/party-kyc-service/src/identity/federation-consent.controller.ts)
- GET /federation/consents/:consentId (services/party-kyc-service/src/identity/federation-consent.controller.ts)
- GET /api/v1/parties/:partyId (services/party-kyc-service/src/party.controller.ts)
- PATCH /api/v1/parties/:partyId (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/kyc/review (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/kyc/documents (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/kyc/documents/verify (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/kyc/aml-screening (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/kyc/escalate (services/party-kyc-service/src/party.controller.ts)
- GET /kyc/reviews (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/aml-consent/grant (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/aml-consent/revoke (services/party-kyc-service/src/party.controller.ts)
- GET /party/:partyId/aml-consent/check (services/party-kyc-service/src/party.controller.ts)
- GET /party/:partyId/aml-consent/history (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/document-trust-chain (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/document-trust-chain/:documentId/verify (services/party-kyc-service/src/party.controller.ts)
- GET /party/:partyId/document-trust-chain (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/identity-proofing (services/party-kyc-service/src/party.controller.ts)
- GET /identity-proofing/:proofingId (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/external-verification (services/party-kyc-service/src/party.controller.ts)
- GET /external-verification/:requestId (services/party-kyc-service/src/party.controller.ts)
- POST /party/:partyId/kyc-exception (services/party-kyc-service/src/party.controller.ts)
- POST /kyc-exception/:exceptionId/assign (services/party-kyc-service/src/party.controller.ts)
- POST /kyc-exception/:exceptionId/resolve (services/party-kyc-service/src/party.controller.ts)
- POST /kyc-exception/:exceptionId/escalate (services/party-kyc-service/src/party.controller.ts)
- GET /kyc-exceptions (services/party-kyc-service/src/party.controller.ts)
- GET /party/:partyId/sla-compliance (services/party-kyc-service/src/party.controller.ts)
- GET /kyc/overdue-reviews (services/party-kyc-service/src/party.controller.ts)

### payments-service
- POST /payments/gateway/callback (services/payments-service/src/gateway-callback.controller.ts)
- POST /payments/:paymentIntentId/approve (services/payments-service/src/payments.controller.ts)
- POST /payments/:paymentIntentId/execute (services/payments-service/src/payments.controller.ts)
- POST /payments/:paymentIntentId/fail (services/payments-service/src/payments.controller.ts)
- POST /payments/:paymentIntentId/notify (services/payments-service/src/payments.controller.ts)
- GET /payments/:paymentIntentId (services/payments-service/src/payments.controller.ts)
- GET /api/v1/ecosystem/payments/:paymentId (services/payments-service/src/payments.controller.ts)
- POST /payments/:paymentIntentId/gateway/initiate (services/payments-service/src/payments.controller.ts)
- POST /payments/reconcile (services/payments-service/src/payments.controller.ts)
- POST /payments/:paymentId/refund (services/payments-service/src/payments.controller.ts)
- POST /payments/:paymentId/dispute (services/payments-service/src/payments.controller.ts)

### policy-service
- GET /policies/:policyId/details (services/policy-service/src/p3-policy.controller.ts)
- PATCH /policies/:policyId (services/policy-service/src/p3-policy.controller.ts)
- GET /policies/:policyId/coverages (services/policy-service/src/p3-policy.controller.ts)
- POST /policies/:policyId/coverages (services/policy-service/src/p3-policy.controller.ts)
- GET /policies/:policyId/history (services/policy-service/src/p3-policy.controller.ts)
- POST /policies/:policyId/endorsements (services/policy-service/src/p3-policy.controller.ts)
- POST /endorsements/:endorsementId/apply (services/policy-service/src/p3-policy.controller.ts)
- POST /endorsements/:endorsementId/submit (services/policy-service/src/p3-policy.controller.ts)
- POST /endorsements/:endorsementId/approve (services/policy-service/src/p3-policy.controller.ts)
- POST /endorsements/:endorsementId/reject (services/policy-service/src/p3-policy.controller.ts)
- POST /policies/:policyId/underwriting/decision (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/sanhab/inquiry (services/policy-service/src/policy.controller.ts)
- GET /policies/:policyId/sanhab/inquiries (services/policy-service/src/policy.controller.ts)
- POST /policies/sanhab/sms-inquiry (services/policy-service/src/policy.controller.ts)
- GET /policies/:policyId/changes (services/policy-service/src/policy.controller.ts)
- GET /policies/:policyId/timeline (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/submit-docs (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/risk-assess (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/issue (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/unique-code (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/quality-gate/override (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/endorse (services/policy-service/src/policy.controller.ts)
- GET /policies/:policyId/endorsements (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/cancel (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/lapse (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/renew (services/policy-service/src/policy.controller.ts)
- GET /policies/:policyId (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/auto-renew (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/renewal/schedule (services/policy-service/src/policy.controller.ts)
- POST /renewals/:renewalId/approve (services/policy-service/src/policy.controller.ts)
- POST /renewals/:renewalId/reject (services/policy-service/src/policy.controller.ts)
- GET /policies/:policyId/renewals (services/policy-service/src/policy.controller.ts)
- GET /policies/renewal/due (services/policy-service/src/policy.controller.ts)
- POST /policies/:policyId/sanhab-result (services/policy-service/src/policy.controller.ts)
- GET /api/v1/reports/policies-without-unique-code (services/policy-service/src/unique-code/unique-code-report.controller.ts)
- GET /api/v1/reports/duplicate-unique-codes (services/policy-service/src/unique-code/unique-code-report.controller.ts)

### product-service
- GET /product/products/:productId (services/product-service/src/product.controller.ts)
- PATCH /product/products/:productId (services/product-service/src/product.controller.ts)
- POST /product/products/:productId/archive (services/product-service/src/product.controller.ts)
- GET /product/coverages/:coverageId (services/product-service/src/product.controller.ts)
- PATCH /product/coverages/:coverageId (services/product-service/src/product.controller.ts)
- POST /product/coverages/:coverageId/archive (services/product-service/src/product.controller.ts)
- GET /product/deductibles/:deductibleId (services/product-service/src/product.controller.ts)
- PATCH /product/deductibles/:deductibleId (services/product-service/src/product.controller.ts)
- POST /product/deductibles/:deductibleId/archive (services/product-service/src/product.controller.ts)
- GET /product/pricing-rules/:pricingRuleId (services/product-service/src/product.controller.ts)
- PATCH /product/pricing-rules/:pricingRuleId (services/product-service/src/product.controller.ts)
- POST /product/pricing-rules/:pricingRuleId/archive (services/product-service/src/product.controller.ts)
- GET /product/products/:productId/versions (services/product-service/src/product.controller.ts)
- GET /product/products/:productId/versions/:version (services/product-service/src/product.controller.ts)
- POST /product/products/:productId/pricing-rules/evaluate (services/product-service/src/product.controller.ts)

### regulatory-gateway-service
- POST /reg/sanhab/webhook (services/regulatory-gateway-service/src/regulatory.controller.ts)
- POST /reg/sanhab/simulate (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/sanhab/events (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/sanhab/circuit-breaker (services/regulatory-gateway-service/src/regulatory.controller.ts)
- PUT /reg/sanhab/circuit-breaker/reset (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/sanhab/health-check (services/regulatory-gateway-service/src/regulatory.controller.ts)
- POST /reg/warehouse-fire/inquire (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/warehouse-fire/national-id/:nationalId (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/warehouse-fire/license/:licenseNumber (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/warehouse-fire/warehouse/:warehouseId (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/warehouse-fire/health-check (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/warehouse-fire/config (services/regulatory-gateway-service/src/regulatory.controller.ts)
- PUT /reg/warehouse-fire/config (services/regulatory-gateway-service/src/regulatory.controller.ts)
- POST /reg/sanhab/sms/initiate (services/regulatory-gateway-service/src/regulatory.controller.ts)
- POST /reg/sanhab/sms/reply (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/sanhab/sms/inquiry/:inquiryId (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/sanhab/sms/pending/:phoneNumber (services/regulatory-gateway-service/src/regulatory.controller.ts)
- POST /reg/sanhab/sms/inquiry/:inquiryId/cancel (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/sanhab/sms/health-check (services/regulatory-gateway-service/src/regulatory.controller.ts)
- GET /reg/sanhab/sms/config (services/regulatory-gateway-service/src/regulatory.controller.ts)
- PUT /reg/sanhab/sms/config (services/regulatory-gateway-service/src/regulatory.controller.ts)
- POST /api/v1/policies/:policyId/sanhab-submit (services/regulatory-gateway-service/src/sanhab/sanhab.controller.ts)
- GET /api/v1/policies/:policyId/sanhab-status (services/regulatory-gateway-service/src/sanhab/sanhab.controller.ts)
- POST /api/v1/policies/:policyId/sanhab-retry (services/regulatory-gateway-service/src/sanhab/sanhab.controller.ts)
- GET /api/v1/sanhab/config (services/regulatory-gateway-service/src/sanhab/sanhab.controller.ts)

### reinsurance-service
- GET /re/treaties/:treatyId (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/treaties/:treatyId (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/treaties/:treatyId/close (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/cessions/calculate-automatic (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/cessions (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/cessions/:cessionId (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/cessions (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/cessions/:cessionId (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/cessions/:cessionId/approve (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/statements (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/statements/:statementId (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/statements (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/statements/:statementId (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/reconciliations (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/recoveries (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/recoveries/:recoveryId (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/recoveries (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/recoveries/:recoveryId (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/tickets (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/tickets/:ticketId (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/tickets (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/tickets/:ticketId (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/tickets/:ticketId/assign (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/tickets/:ticketId/messages (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/tickets/:ticketId/attachments (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/reconciliations/:reconciliationId (services/reinsurance-service/src/reinsurance.controller.ts)
- GET /re/reconciliations (services/reinsurance-service/src/reinsurance.controller.ts)
- PATCH /re/reconciliations/:reconciliationId (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/periods/close (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/reconciliations/invoice/register (services/reinsurance-service/src/reinsurance.controller.ts)
- POST /re/reconciliations/:reconciliationId/auto-match (services/reinsurance-service/src/reinsurance.controller.ts)

### reporting-service
- GET /reporting/aml-fraud/regulatory-report (services/reporting-service/src/aml-fraud/aml-fraud-regulatory.controller.ts)
- POST /reporting/audit-reports (services/reporting-service/src/audit-report/audit-report.controller.ts)
- GET /reporting/audit-reports (services/reporting-service/src/audit-report/audit-report.controller.ts)
- GET /reporting/audit-reports/:reportId (services/reporting-service/src/audit-report/audit-report.controller.ts)
- POST /reporting/audit-reports/:reportId/generate (services/reporting-service/src/audit-report/audit-report.controller.ts)
- GET /reporting/audit-reports/:reportId/export (services/reporting-service/src/audit-report/audit-report.controller.ts)
- GET /reporting/audit-reports/:reportId/verify (services/reporting-service/src/audit-report/audit-report.controller.ts)
- GET /reporting/bi/executive (services/reporting-service/src/bi-aggregate/bi-aggregate.controller.ts)
- GET /reporting/bi/cockpit (services/reporting-service/src/bi-aggregate/bi-aggregate.controller.ts)
- GET /reporting/bi/export (services/reporting-service/src/bi-aggregate/bi-aggregate.controller.ts)
- POST /reporting/broker-reports (services/reporting-service/src/broker-report/broker-report.controller.ts)
- GET /reporting/broker-reports (services/reporting-service/src/broker-report/broker-report.controller.ts)
- GET /reporting/broker-reports/:reportId (services/reporting-service/src/broker-report/broker-report.controller.ts)
- POST /reporting/broker-reports/:reportId/generate (services/reporting-service/src/broker-report/broker-report.controller.ts)
- POST /reporting/broker-reports/:reportId/approve (services/reporting-service/src/broker-report/broker-report.controller.ts)
- POST /reporting/broker-reports/:reportId/submit (services/reporting-service/src/broker-report/broker-report.controller.ts)
- POST /reporting/data-quality/reconcile (services/reporting-service/src/data-quality/data-quality.controller.ts)
- GET /reporting/data-quality/issues (services/reporting-service/src/data-quality/data-quality.controller.ts)
- GET /reporting/data-quality/issues/:issueId (services/reporting-service/src/data-quality/data-quality.controller.ts)
- POST /reporting/data-quality/issues/:issueId/resolve (services/reporting-service/src/data-quality/data-quality.controller.ts)
- GET /reporting/reconciliation/policy-ledger (services/reporting-service/src/reconciliation/reconciliation.controller.ts)
- GET /reporting/reconciliation/payment-ledger (services/reporting-service/src/reconciliation/reconciliation.controller.ts)
- GET /reporting/reconciliation/run-all (services/reporting-service/src/reconciliation/reconciliation.controller.ts)
- POST /reporting/regulatory-reports (services/reporting-service/src/regulatory-report/regulatory-report.controller.ts)
- GET /reporting/regulatory-reports (services/reporting-service/src/regulatory-report/regulatory-report.controller.ts)
- GET /reporting/regulatory-reports/:reportId (services/reporting-service/src/regulatory-report/regulatory-report.controller.ts)
- POST /reporting/regulatory-reports/:reportId/generate (services/reporting-service/src/regulatory-report/regulatory-report.controller.ts)
- GET /reporting/regulatory-reports/:reportId/export-xml (services/reporting-service/src/regulatory-report/regulatory-report.controller.ts)
- GET /reporting/regulatory-reports/:reportId/export-pdf (services/reporting-service/src/regulatory-report/regulatory-report.controller.ts)
- POST /reporting/regulatory-reports/:reportId/submit (services/reporting-service/src/regulatory-report/regulatory-report.controller.ts)
- GET /reporting/kpis/governance/:kpiKey (services/reporting-service/src/reporting.controller.ts)
- PUT /reporting/kpis/governance/:kpiKey (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/dashboard/executive (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/policies (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/policies/:policyId (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/payments (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/payments/:paymentId (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/sales-partners (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/sales-partners/:partnerId (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/aml-transactions (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/aml-transactions/:transactionId (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/underwriting-requests (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/underwriting-requests/:requestId (services/reporting-service/src/reporting.controller.ts)
- POST /reporting/external-systems (services/reporting-service/src/reporting.controller.ts)
- PUT /reporting/external-systems/:connectionId (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/external-systems/:connectionId (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/external-systems (services/reporting-service/src/reporting.controller.ts)
- POST /reporting/external-systems/:connectionId/sync (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/external-systems/:connectionId/sync-status (services/reporting-service/src/reporting.controller.ts)
- POST /reporting/external-systems/:connectionId/delete (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/kpis/financial (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/kpis/market-share (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/kpis/satisfaction (services/reporting-service/src/reporting.controller.ts)
- GET /reporting/retention/policies (services/reporting-service/src/retention/report-retention.controller.ts)
- POST /reporting/retention/apply (services/reporting-service/src/retention/report-retention.controller.ts)
- GET /reporting/settlement/dashboard (services/reporting-service/src/settlement/settlement-dashboard.controller.ts)
- GET /reporting/settlement/brokers (services/reporting-service/src/settlement/settlement-dashboard.controller.ts)
- POST /reporting/tcor-reports (services/reporting-service/src/tcor-report/tcor-report.controller.ts)
- GET /reporting/tcor-reports (services/reporting-service/src/tcor-report/tcor-report.controller.ts)
- GET /reporting/tcor-reports/:reportId (services/reporting-service/src/tcor-report/tcor-report.controller.ts)
- POST /reporting/tcor-reports/:reportId/generate (services/reporting-service/src/tcor-report/tcor-report.controller.ts)
- GET /reporting/tcor-reports/:reportId/drilldown (services/reporting-service/src/tcor-report/tcor-report.controller.ts)
- POST /reporting/tcor-reports/:reportId/approve (services/reporting-service/src/tcor-report/tcor-report.controller.ts)
- POST /reporting/tcor-reports/:reportId/submit (services/reporting-service/src/tcor-report/tcor-report.controller.ts)

### sales-network-service
- POST /sales-network/ledger/:ledgerEntryId/void (services/sales-network-service/src/sales-network.controller.ts)
- POST /sales-network/ledger/:ledgerEntryId/pay (services/sales-network-service/src/sales-network.controller.ts)
- POST /sales-network/partners/:orgUnitId/verify (services/sales-network-service/src/sales-network.controller.ts)
- POST /sales-network/partners/:orgUnitId/status (services/sales-network-service/src/sales-network.controller.ts)
- POST /sales-network/contracts/:contractId/activate (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/agent/summary (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/agent/policies (services/sales-network-service/src/sales-network.controller.ts)
- POST /sales-network/commission/calculate (services/sales-network-service/src/sales-network.controller.ts)
- POST /sales-network/commission/recalculate (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/performance/trend (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/performance/compare-periods (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/performance/top-performers (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/agents/:agentId/stats (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/agents/:agentId/policies (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/agents/:agentId/claims (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/agents/:agentId/customers (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/agents/:agentId/commissions (services/sales-network-service/src/sales-network.controller.ts)
- GET /sales-network/agents/:agentId/kpis (services/sales-network-service/src/sales-network.controller.ts)

### underwriting-service
- GET /underwriting/requests/:underwritingRequestId (services/underwriting-service/src/underwriting.controller.ts)
- POST /underwriting/requests/:underwritingRequestId/decide (services/underwriting-service/src/underwriting.controller.ts)
- GET /underwriting/sla/breaches (services/underwriting-service/src/underwriting.controller.ts)
- POST /underwriting/requests/:underwritingRequestId/escalate (services/underwriting-service/src/underwriting.controller.ts)
- GET /underwriting/sla/metrics (services/underwriting-service/src/underwriting.controller.ts)
- POST /underwriting/requests/:id/assess-risk (services/underwriting-service/src/underwriting.controller.ts)
- GET /underwriting/risk-matrix (services/underwriting-service/src/underwriting.controller.ts)
- POST /underwriting/appetite-rules (services/underwriting-service/src/underwriting.controller.ts)
- POST /underwriting/appetite-rules/evaluate (services/underwriting-service/src/underwriting.controller.ts)
- GET /underwriting/appetite-rules (services/underwriting-service/src/underwriting.controller.ts)
- PATCH /underwriting/appetite-rules/:id (services/underwriting-service/src/underwriting.controller.ts)
- POST /underwriting/appetite-rules/:id/delete (services/underwriting-service/src/underwriting.controller.ts)

## ۵. گپ‌ها و پیشنهادات

### گپ‌های عمده تطابق

سرویس‌های با تطابق کمتر از ۶۰٪ (نیازمند بررسی دقیق مصرف‌کنندگان):
- aml-service (35%)
- api-gateway (0%)
- catalog-bff (29%)
- claims-service (11%)
- collections-service (16%)
- complaints-service (13%)
- copilot-service (2%)
- document-ai-service (44%)
- document-service (17%)
- feature-flags-service (33%)
- fraud-service (13%)
- orchestrator-service (25%)
- party-kyc-service (30%)
- payments-service (15%)
- policy-service (14%)
- regulatory-gateway-service (7%)
- reinsurance-service (9%)
- reporting-service (15%)
- sales-network-service (57%)
- underwriting-service (14%)

### نکات مهم

1. اندپوینت‌های `/health` و `/health/*` برای liveness/readiness هستند و نیازی به مصرف‌کننده UI/BFF ندارند؛ در محاسبات تطابق از آن‌ها صرفنظر شده است.
2. اندپوینت‌های `MessagePattern` / `EventPattern` از طریق Kafka مصرف می‌شوند؛ مصرف‌کننده آن‌ها باید در listener سایر سرویس‌ها جستجو شود.
3. مسیرهای دارای پارامتر (`:id`) معمولاً از طریق BFF یا UI با الگوی template literal مصرف می‌شوند؛ جستجوی رشته‌ای ممکن است مصرف‌کننده دقیق را نشان ندهد.
4. برای رسیدن به تطابق ۱۰۰٪، هر سرویس باید حداقل یک مصرف‌کننده شناخته‌شده (UI، BFF یا سرویس دیگر) برای هر اندپوینت تجاری داشته باشد.
