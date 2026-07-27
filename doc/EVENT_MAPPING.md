# Designed Events ↔ Implemented Events Mapping

This document provides a comprehensive mapping between designed events (from Enterprise Blueprint) and implemented events (in the codebase) for all domains.

## Legend
- ✅ **Implemented**: Event is fully implemented in the codebase
- ⚠️ **Partial**: Event is partially implemented or uses a different name
- ⬜ **Missing**: Event is designed but not yet implemented
- 🔀 **Alias**: Event is implemented with a different name but serves the same purpose

---

## Policy Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.policy.issued` | `insurance.policy.issued` | ✅ | Fully implemented |
| `insurance.policy.unique_code_set` | `insurance.policy.unique_code_set` | ✅ | Fully implemented |
| `insurance.policy.underwriting_decided` | `insurance.policy.underwriting_decided` | ✅ | Fully implemented |
| `insurance.policy.change_recorded` | `insurance.policy.change_recorded` | ✅ | Fully implemented |
| `insurance.policy.renewed` | `insurance.policy.renewed` | ✅ | Fully implemented |
| `insurance.policy.cancelled` | `insurance.policy.cancelled` | ✅ | Fully implemented |
| `insurance.policy.endorsed` | `insurance.policy.endorsed` | ✅ | Fully implemented |

---

## Claims Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.claim.registered` | `insurance.claim.registered` | ✅ | Fully implemented |
| `insurance.claim.assessed` | `insurance.claim.assessed` | ✅ | Fully implemented |
| `insurance.claim.approved` | `insurance.claim.approved` | ✅ | Fully implemented |
| `insurance.claim.rejected` | `insurance.claim.rejected` | ✅ | Fully implemented |
| `insurance.claim.paid` | `insurance.claim.paid` | ✅ | Fully implemented |
| `insurance.claim.closed` | `insurance.claim.closed` | ✅ | Fully implemented |
| `insurance.claim.documents_attached` | `insurance.claim.documents_attached` | ✅ | Fully implemented |

---

## Payments Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.payment.prepared` | `insurance.payment.prepared` | ✅ | Fully implemented |
| `insurance.payment.approved` | `insurance.payment.approved` | ✅ | Fully implemented |
| `insurance.payment.executed` | `insurance.payment.executed` | ✅ | Fully implemented |
| `insurance.payment.notified` | `insurance.payment.notified` | ✅ | Fully implemented |
| `insurance.payment.failed` | `insurance.payment.failed` | ✅ | Fully implemented |

---

## Fraud Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.fraud.score_computed` | `insurance.fraud.score_computed` | ✅ | Fully implemented |
| `insurance.fraud.case_escalated` | `insurance.fraud.case_escalated` | ✅ | Fully implemented |
| `insurance.fraud.case_cleared` | `insurance.fraud.case_cleared` | ✅ | Fully implemented |
| `insurance.fraud.case_confirmed` | `insurance.fraud.case_confirmed` | ✅ | Fully implemented |

---

## Complaints Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.complaint.created` | `insurance.complaint.created` | ✅ | Fully implemented |
| `insurance.complaint.status_updated` | `insurance.complaint.status_updated` | ✅ | Fully implemented |
| `insurance.complaint.sla_breached` | `insurance.complaint.sla_breached` | ✅ | Fully implemented |
| `insurance.complaint.escalated` | `insurance.complaint.escalated` | ✅ | Fully implemented |
| `insurance.complaint.resolved` | `insurance.complaint.resolved` | ✅ | Fully implemented |
| `insurance.complaint.document_attached` | `insurance.complaint.document_attached` | ✅ | Fully implemented |
| `insurance.complaint.mobile_otp_requested` | `insurance.complaint.mobile_otp_requested` | ✅ | Fully implemented |
| `insurance.complaint.mobile_verified` | `insurance.complaint.mobile_verified` | ✅ | Fully implemented |

---

## Reinsurance Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.reinsurance.ceded_calculated` | `insurance.reinsurance.ceded_calculated` | ✅ | Fully implemented |
| `insurance.reinsurance.borderaux_generated` | `insurance.reinsurance.borderaux_generated` | ✅ | Fully implemented |
| `insurance.reinsurance.recovery_identified` | `insurance.reinsurance.recovery_identified` | ✅ | Fully implemented |
| `insurance.reinsurance.recovery_received` | `insurance.reinsurance.recovery_received` | ✅ | Fully implemented |

---

## Collections Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.collections.plan_created` | `insurance.collections.plan_created` | ✅ | Fully implemented |
| `insurance.collections.installment_paid` | `insurance.collections.installment_paid` | ✅ | Fully implemented |

---

## Document AI Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.document.uploaded` | `insurance.document.uploaded` | ✅ | Fully implemented |
| `insurance.document.linked` | `insurance.document.linked` | ✅ | Fully implemented |
| `insurance.document.extracted` | `insurance.document.extracted` | ✅ | Fully implemented |
| `insurance.document.extraction_needs_review` | `insurance.document.extraction_needs_review` | ✅ | Fully implemented |
| `insurance.document_ai.extraction_completed` | `insurance.document_ai.extraction_completed` | ✅ | Fully implemented |
| `insurance.document_ai.extraction_needs_review` | `insurance.document_ai.extraction_needs_review` | ✅ | Fully implemented |
| `insurance.document_ai.job_failed` | `insurance.document_ai.job_failed` | ✅ | Fully implemented |

---

## AML Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.aml.alert_created` | `insurance.aml.alert_created` | ✅ | Fully implemented |
| `insurance.aml.alert_escalated` | `insurance.aml.alert_escalated` | ✅ | Fully implemented |
| `insurance.aml.alert_cleared` | `insurance.aml.alert_cleared` | ✅ | Fully implemented |

---

## Party/KYC Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.party.customer_created` | `insurance.party.customer_created` | ✅ | Fully implemented |
| `insurance.party.customer_verified` | `insurance.party.customer_verified` | ✅ | Fully implemented |
| `insurance.party.consent_recorded` | `insurance.party.consent_recorded` | ✅ | Fully implemented |

---

## Product Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.product.created` | `insurance.product.created` | ✅ | Fully implemented |
| `insurance.product.updated` | `insurance.product.updated` | ✅ | Fully implemented |
| `insurance.product.rate_changed` | `insurance.product.rate_changed` | ✅ | Fully implemented |

---

## Underwriting Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.underwriting.request_submitted` | `insurance.underwriting.request_submitted` | ✅ | Fully implemented |
| `insurance.underwriting.decision_made` | `insurance.underwriting.decision_made` | ✅ | Fully implemented |
| `insurance.underwriting.referral_created` | `insurance.underwriting.referral_created` | ✅ | Fully implemented |

---

## Reporting Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.reporting.report_generated` | `insurance.reporting.report_generated` | ✅ | Fully implemented |
| `insurance.reporting.snapshot_created` | `insurance.reporting.snapshot_created` | ✅ | Fully implemented |

---

## Copilot Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.copilot.query_processed` | `insurance.copilot.query_processed` | ✅ | Fully implemented |
| `insurance.copilot.suggestion_generated` | `insurance.copilot.suggestion_generated` | ✅ | Fully implemented |

---

## Workflow/Orchestrator Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.workflow.process_started` | `insurance.orchestrator.saga_started` | 🔀 | Alias: saga_started |
| `insurance.workflow.process_completed` | `insurance.orchestrator.saga_completed` | 🔀 | Alias: saga_completed |
| `insurance.workflow.task_assigned` | `insurance.orchestrator.work_item_assigned` | 🔀 | Alias: work_item_assigned |
| `insurance.orchestrator.saga_started` | `insurance.orchestrator.saga_started` | ✅ | Fully implemented |
| `insurance.orchestrator.saga_completed` | `insurance.orchestrator.saga_completed` | ✅ | Fully implemented |
| `insurance.orchestrator.work_item_assigned` | `insurance.orchestrator.work_item_assigned` | ✅ | Fully implemented |
| `insurance.orchestrator.work_item_completed` | `insurance.orchestrator.work_item_completed` | ✅ | Fully implemented |

---

## Sales Network Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.sales.partner_activated` | `insurance.sales.partner_activated` | ✅ | Fully implemented |
| `insurance.sales.commission_calculated` | `insurance.sales.commission_calculated` | ✅ | Fully implemented |

---

## Notification Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.notification.sent` | `insurance.notification.sent` | ✅ | Fully implemented |
| `insurance.notification.failed` | `insurance.notification.failed` | ✅ | Fully implemented |

---

## Billing Domain

| Designed Event | Implemented Event | Status | Notes |
|----------------|-------------------|--------|-------|
| `insurance.billing.invoice_generated` | `insurance.billing.invoice_generated` | ✅ | Fully implemented |
| `insurance.billing.payment_recorded` | `insurance.billing.payment_recorded` | ✅ | Fully implemented |
| `insurance.billing.invoice_overdue` | `insurance.billing.invoice_overdue` | ✅ | Fully implemented |

---

## Summary Statistics

| Domain | Total Events | Implemented | Partial | Missing | % Complete |
|--------|--------------|-------------|---------|---------|------------|
| Policy | 7 | 7 | 0 | 0 | 100% |
| Claims | 7 | 7 | 0 | 0 | 100% |
| Payments | 5 | 5 | 0 | 0 | 100% |
| Fraud | 4 | 4 | 0 | 0 | 100% |
| Complaints | 8 | 8 | 0 | 0 | 100% |
| Reinsurance | 4 | 4 | 0 | 0 | 100% |
| Collections | 2 | 2 | 0 | 0 | 100% |
| Document AI | 7 | 7 | 0 | 0 | 100% |
| AML | 3 | 3 | 0 | 0 | 100% |
| Party/KYC | 3 | 3 | 0 | 0 | 100% |
| Product | 3 | 3 | 0 | 0 | 100% |
| Underwriting | 3 | 3 | 0 | 0 | 100% |
| Reporting | 2 | 2 | 0 | 0 | 100% |
| Copilot | 2 | 2 | 0 | 0 | 100% |
| Workflow/Orchestrator | 7 | 7 | 0 | 0 | 100% |
| Sales Network | 2 | 2 | 0 | 0 | 100% |
| Notification | 2 | 2 | 0 | 0 | 100% |
| Billing | 3 | 3 | 0 | 0 | 100% |
| **Total** | **77** | **77** | **0** | **0** | **100%** |

---

## Notes

1. **Naming Convention**: All implemented events follow the standard naming convention `insurance.<domain>.<action>`.

2. **Event Envelope**: All events use the standard `EventEnvelope` structure with required fields: `eventId`, `eventType`, `eventVersion`, `occurredAt`, `producer`, `correlationId`, `subject`, `payload`.

3. **Workflow/Orchestrator**: The workflow domain uses the orchestrator's event naming (`saga_*`, `work_item_*`) which serves the same purpose as the designed workflow events.

4. **Contract Tests**: All events have corresponding contract tests in `tests/contract/event-contract.test.ts`.

5. **Outbox Pattern**: All critical events are published using the Transactional Outbox pattern to ensure reliability.

6. **Kafka Topics**: Events are published to Kafka topics following the naming convention `insurance.<domain>`.

---

## Recommendations

1. **Standardization**: Consider standardizing the workflow/orchestrator event naming to match the blueprint exactly (e.g., use `process_started` instead of `saga_started`).

2. **Documentation**: Ensure this document is kept up-to-date as new events are added.

3. **Validation**: Add automated validation to ensure all implemented events follow the naming convention and have contract tests.

4. **Deprecation**: If any events are deprecated, mark them clearly in this document and provide migration guidance.
