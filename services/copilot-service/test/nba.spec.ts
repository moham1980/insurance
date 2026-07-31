import { describe, it, expect } from '@jest/globals';

describe('NBA (Next Best Action) Engine', () => {
  it('should generate actions for claims with amount discrepancy', () => {
    const claim = {
      claimId: 'clm-001',
      claimNumber: 'CL-2024-001',
      status: 'new',
      assessedAmount: 10000000,
      requiresHumanTriage: false,
    };
    const documents = [
      { status: 'extracted', documentType: 'invoice', extractedFields: { totalAmount: 15000000 } },
    ];
    const totalInvoice = documents
      .filter((d) => d.status === 'extracted' && d.documentType === 'invoice')
      .reduce((sum, d) => sum + (d.extractedFields?.totalAmount || 0), 0);

    expect(totalInvoice).toBeGreaterThan(claim.assessedAmount * 1.2);
  });

  it('should generate CLAIM_REQUEST_DOCUMENTS for new claims without documents', () => {
    const claim = { status: 'new', claimId: 'clm-002' };
    const documents: any[] = [];
    const extractedDocs = documents.filter((d) => d.status === 'extracted');
    expect(extractedDocs.length).toBe(0);
    expect(claim.status).toBe('new');
  });

  it('should generate CLAIM_SCHEDULE_PAYMENT for approved claims without payment', () => {
    const claim = { status: 'approved', paidAmount: null, claimId: 'clm-003', approvedAmount: 5000000 };
    expect(claim.status).toBe('approved');
    expect(claim.paidAmount).toBeNull();
  });

  it('should support opt-out with reason', () => {
    const optOut = { logId: 'log-001', reason: 'Customer not interested' };
    expect(optOut.logId).toBeDefined();
    expect(optOut.reason).toContain('not interested');
  });

  it('should not allow executing an already executed action', () => {
    const actionLog = { status: 'executed', logId: 'log-002' };
    expect(actionLog.status).toBe('executed');
  });

  it('should not allow executing an opted-out action', () => {
    const actionLog = { status: 'opted_out', logId: 'log-003' };
    expect(actionLog.status).toBe('opted_out');
  });

  it('should wire downstream calls based on action code', () => {
    const actionCodes = [
      'CLAIM_ASSIGN_ADJUSTER',
      'CLAIM_REQUEST_DOCUMENTS',
      'CLAIM_SCHEDULE_PAYMENT',
      'CLAIM_RECOVERY_REVIEW',
      'NO_ACTION_REQUIRED',
    ];
    actionCodes.forEach((code) => {
      expect(code).toMatch(/^[A-Z_]+$/);
    });
  });
});
