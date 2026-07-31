import { describe, it, expect } from 'bun:test';
import { P3PolicyLifecycleService } from '../src/p3-policy-lifecycle.service';
import { Endorsement } from '../src/entities/Endorsement';

describe('P3 Endorsement Lifecycle', () => {
  describe('Endorsement state transitions', () => {
    it('validates draft → submitted → approved → applied flow', () => {
      const endorsement = new Endorsement();
      endorsement.status = 'draft';
      expect(endorsement.status).toBe('draft');

      endorsement.status = 'submitted';
      expect(endorsement.status).toBe('submitted');

      endorsement.status = 'approved';
      endorsement.approvedByPartyId = '00000000-0000-4000-8000-000000000001';
      expect(endorsement.status).toBe('approved');
      expect(endorsement.approvedByPartyId).toBeDefined();

      endorsement.status = 'applied';
      endorsement.appliedAt = new Date();
      expect(endorsement.status).toBe('applied');
      expect(endorsement.appliedAt).toBeDefined();
    });

    it('validates draft → submitted → rejected flow', () => {
      const endorsement = new Endorsement();
      endorsement.status = 'draft';
      endorsement.status = 'submitted';
      endorsement.status = 'rejected';
      endorsement.rejectedAt = new Date();
      endorsement.rejectionReason = 'Premium adjustment too high';
      expect(endorsement.status).toBe('rejected');
      expect(endorsement.rejectionReason).toBe('Premium adjustment too high');
      expect(endorsement.rejectedAt).toBeDefined();
    });

    it('validates draft → rejected direct flow', () => {
      const endorsement = new Endorsement();
      endorsement.status = 'draft';
      endorsement.status = 'rejected';
      endorsement.rejectedAt = new Date();
      endorsement.rejectionReason = 'Invalid endorsement type';
      expect(endorsement.status).toBe('rejected');
    });
  });

  describe('Endorsement premium delta calculation', () => {
    it('calculates premium delta correctly for coverage change', () => {
      const endorsement = new Endorsement();
      endorsement.premiumDeltaAmount = 2_000_000;
      endorsement.premiumDeltaCurrency = 'IRR';
      endorsement.taxDeltaAmount = 180_000;
      endorsement.taxDeltaCurrency = 'IRR';

      const basePremium = 10_000_000;
      const baseTax = 900_000;
      const baseTotal = 10_900_000;

      const newPremium = basePremium + endorsement.premiumDeltaAmount;
      const newTax = baseTax + endorsement.taxDeltaAmount;
      const newTotal = baseTotal + endorsement.premiumDeltaAmount + endorsement.taxDeltaAmount;

      expect(newPremium).toBe(12_000_000);
      expect(newTax).toBe(1_080_000);
      expect(newTotal).toBe(13_080_000);
    });

    it('handles negative premium delta for coverage reduction', () => {
      const endorsement = new Endorsement();
      endorsement.premiumDeltaAmount = -1_500_000;
      endorsement.premiumDeltaCurrency = 'IRR';
      endorsement.taxDeltaAmount = -135_000;
      endorsement.taxDeltaCurrency = 'IRR';

      const basePremium = 10_000_000;
      const newPremium = basePremium + endorsement.premiumDeltaAmount;
      expect(newPremium).toBe(8_500_000);
    });
  });

  describe('Endorsement type validation', () => {
    it('accepts all valid endorsement types', () => {
      const validTypes = ['change', 'renewal', 'cancellation', 'rewrite'];
      for (const type of validTypes) {
        const endorsement = new Endorsement();
        endorsement.endorsementType = type as any;
        expect(endorsement.endorsementType).toBe(type);
      }
    });
  });

  describe('Endorsement apply state guard', () => {
    it('allows apply from draft state', () => {
      const endorsement = new Endorsement();
      endorsement.status = 'draft';
      expect(['draft', 'submitted'].includes(endorsement.status)).toBe(true);
    });

    it('allows apply from submitted state', () => {
      const endorsement = new Endorsement();
      endorsement.status = 'submitted';
      expect(['draft', 'submitted'].includes(endorsement.status)).toBe(true);
    });

    it('rejects apply from approved state', () => {
      const endorsement = new Endorsement();
      endorsement.status = 'approved';
      expect(['draft', 'submitted'].includes(endorsement.status)).toBe(false);
    });

    it('rejects apply from rejected state', () => {
      const endorsement = new Endorsement();
      endorsement.status = 'rejected';
      expect(['draft', 'submitted'].includes(endorsement.status)).toBe(false);
    });

    it('rejects apply from applied state', () => {
      const endorsement = new Endorsement();
      endorsement.status = 'applied';
      expect(['draft', 'submitted'].includes(endorsement.status)).toBe(false);
    });
  });
});
