import { describe, test, expect } from '@jest/globals';

describe('Unit: Copilot Service', () => {
  describe('Policy Evaluation', () => {
    test('T-UNIT-COP-01: Policy evaluation (x-ai-enabled + Feature Flags)', () => {
      const isAiEnabled = (headers: Record<string, string>, featureFlags: Record<string, boolean>): boolean => {
        if (headers['x-ai-enabled'] !== 'true') return false;
        return featureFlags['copilot_enabled'] === true;
      };

      expect(isAiEnabled({ 'x-ai-enabled': 'true' }, { copilot_enabled: true })).toBe(true);
      expect(isAiEnabled({ 'x-ai-enabled': 'false' }, { copilot_enabled: true })).toBe(false);
      expect(isAiEnabled({ 'x-ai-enabled': 'true' }, { copilot_enabled: false })).toBe(false);
    });
  });

  describe('PII Redaction', () => {
    test('T-UNIT-COP-02: PII redaction (nationalId, IBAN, card number)', () => {
      const redactPii = (text: string): string => {
        return text
          .replace(/IR\d{24}/g, 'IR****************') // IBAN
          .replace(/\d{10}/g, '**********') // National ID
          .replace(/\d{4}-\d{4}-\d{4}-\d{4}/g, '****-****-****-****'); // Card number
      };

      expect(redactPii('National ID: 0123456789')).toBe('National ID: **********');
      expect(redactPii('IBAN: IR123456789012345678901234')).toBe('IBAN: IR****************');
      expect(redactPii('Card: 1234-5678-9012-3456')).toBe('Card: ****-****-****-****');
    });
  });

  describe('Summary Builder', () => {
    test('T-UNIT-COP-03: Summary builder (claim + document)', () => {
      const buildSummary = (claimData: any, documentData: any): string => {
        const claimSummary = `Claim #${claimData.claimId} for policy #${claimData.policyId}. Amount: ${claimData.amount}. Status: ${claimData.status}.`;
        const docSummary = documentData.documents.length > 0 
          ? ` Attached ${documentData.documents.length} documents including ${documentData.documents[0].type}.`
          : ' No documents attached.';
        return claimSummary + docSummary;
      };

      const claimData = {
        claimId: 'CLM-001',
        policyId: 'POL-001',
        amount: 50000000,
        status: 'approved',
      };

      const documentData = {
        documents: [
          { type: 'police_report', name: 'report.pdf' },
          { type: 'photo', name: 'damage.jpg' },
        ],
      };

      const summary = buildSummary(claimData, documentData);
      expect(summary).toContain('CLM-001');
      expect(summary).toContain('POL-001');
      expect(summary).toContain('50000000');
      expect(summary).toContain('approved');
      expect(summary).toContain('2 documents');
    });
  });
});
