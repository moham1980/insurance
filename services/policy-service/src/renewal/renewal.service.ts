import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Policy } from '../entities/Policy';
import { PolicyRenewal } from '../entities/PolicyRenewal';
import { OutboxPublisher } from '@insurance/shared';

export interface ExpiringPolicyDetection {
  policyId: string;
  tenantId: string | null;
  policyNumber: string;
  endDate: Date;
  daysUntilExpiry: number;
  autoRenew: boolean;
  renewalCount: number;
  maxRenewals: number;
}

export interface RenewalNotificationResult {
  policyId: string;
  renewalId: string;
  notifiedAt: Date;
  consentRequired: boolean;
}

@Injectable()
export class RenewalService {
  private readonly logger = new Logger(RenewalService.name);

  constructor(private readonly dataSource: DataSource) {}

  async detectExpiringPolicies(daysBeforeExpiry: number = 30): Promise<ExpiringPolicyDetection[]> {
    const targetDate = new Date(Date.now() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

    const policies = await this.dataSource.getRepository(Policy)
      .createQueryBuilder('p')
      .where('p.status IN (:...statuses)', { statuses: ['active', 'issued'] })
      .andWhere('p.end_date <= :targetDate', { targetDate })
      .andWhere('p.end_date >= :now', { now: new Date() })
      .andWhere('p.renewal_count < p.max_renewals')
      .orderBy('p.end_date', 'ASC')
      .getMany();

    return policies.map(p => ({
      policyId: p.policyId,
      tenantId: p.tenantId,
      policyNumber: p.policyNumber,
      endDate: p.endDate,
      daysUntilExpiry: Math.ceil((p.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      autoRenew: p.autoRenew,
      renewalCount: p.renewalCount,
      maxRenewals: p.maxRenewals,
    }));
  }

  async sendRenewalNotification(policyId: string, tenantId?: string): Promise<RenewalNotificationResult> {
    const policy = await this.dataSource.getRepository(Policy).findOne({ where: { policyId } });
    if (!policy) throw new Error('Policy not found');

    const renewal = new PolicyRenewal();
    renewal.renewalId = crypto.randomUUID();
    renewal.policyId = policyId;
    renewal.tenantId = policy.tenantId;
    renewal.type = policy.autoRenew ? 'automatic' : 'manual';
    renewal.status = 'pending';
    renewal.previousStartDate = policy.startDate;
    renewal.previousEndDate = policy.endDate;
    renewal.newStartDate = new Date(policy.endDate.getTime());
    renewal.dueDate = new Date(policy.endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    renewal.previousPremium = Number(policy.premiumAmount);
    renewal.newPremium = Number(policy.premiumAmount);
    renewal.reminderCount = 0;

    await this.dataSource.getRepository(PolicyRenewal).save(renewal);

    policy.renewalNotifiedAt = new Date();
    await this.dataSource.getRepository(Policy).save(policy);

    this.logger.log(
      `Renewal notification sent for policy ${policyId}, renewal ${renewal.renewalId}`,
    );

    return {
      policyId,
      renewalId: renewal.renewalId,
      notifiedAt: new Date(),
      consentRequired: !policy.autoRenew,
    };
  }

  async processConsent(renewalId: string, consent: boolean, tenantId?: string): Promise<{ renewalId: string; consent: boolean; nextStep: string }> {
    const renewal = await this.dataSource.getRepository(PolicyRenewal).findOne({ where: { renewalId } });
    if (!renewal) throw new Error('Renewal not found');

    if (consent) {
      renewal.status = 'approved';
      renewal.approvedAt = new Date();
      await this.dataSource.getRepository(PolicyRenewal).save(renewal);
      return { renewalId, consent: true, nextStep: 'payment_authorization' };
    } else {
      renewal.status = 'rejected';
      renewal.rejectionReason = 'Customer did not consent to renewal';
      await this.dataSource.getRepository(PolicyRenewal).save(renewal);
      return { renewalId, consent: false, nextStep: 'lapse_policy' };
    }
  }

  async lapsePolicyIfRenewalFailed(policyId: string, reason: string, tenantId?: string): Promise<Policy> {
    return await this.dataSource.transaction(async (manager) => {
      const policyRepo = manager.getRepository(Policy);
      const policy = await policyRepo.findOne({ where: { policyId }, lock: { mode: 'pessimistic_write' } });
      if (!policy) throw new Error('Policy not found');

      if (policy.status === 'active' || policy.status === 'issued') {
        policy.status = 'lapsed';
        policy.updatedAt = new Date();
        await policyRepo.save(policy);

        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.policy.lapsed',
          eventType: 'PolicyLapsed',
          eventVersion: 1,
          correlationId: `renewal-failure-${Date.now()}`,
          tenantId: policy.tenantId || undefined,
          subject: { policyId: policy.policyId },
          payload: {
            policyId: policy.policyId,
            reason,
            previousStatus: 'active',
          },
        });

        this.logger.warn(`Policy ${policyId} lapsed due to renewal failure: ${reason}`);
      }

      return policy;
    });
  }

  async completeRenewal(params: {
    renewalId: string;
    tenantId?: string;
    newPremium?: number;
    newEndDate?: Date;
    correlationId: string;
  }): Promise<{ renewalId: string; oldPolicyId: string; newPolicyId: string; status: string }> {
    return await this.dataSource.transaction(async (manager) => {
      const policyRepo = manager.getRepository(Policy);
      const renewalRepo = manager.getRepository(PolicyRenewal);
      const outbox = new OutboxPublisher(manager);

      const renewal = await renewalRepo.findOne({ where: { renewalId: params.renewalId }, lock: { mode: 'pessimistic_write' } });
      if (!renewal) throw new Error('Renewal not found');
      if (renewal.status !== 'approved') throw new Error(`Renewal must be in 'approved' status to complete, current: ${renewal.status}`);

      const oldPolicy = await policyRepo.findOne({ where: { policyId: renewal.policyId }, lock: { mode: 'pessimistic_write' } });
      if (!oldPolicy) throw new Error('Original policy not found');

      // Close the old policy
      oldPolicy.status = 'renewed';
      oldPolicy.updatedAt = new Date();
      await policyRepo.save(oldPolicy);

      // Create new policy version
      const newPolicy = new Policy();
      newPolicy.policyId = crypto.randomUUID();
      newPolicy.tenantId = oldPolicy.tenantId;
      newPolicy.policyNumber = `${oldPolicy.policyNumber}-R${oldPolicy.renewalCount + 1}`;
      newPolicy.status = 'active';
      newPolicy.partyId = oldPolicy.partyId;
      newPolicy.customerPartyId = oldPolicy.customerPartyId;
      newPolicy.productId = oldPolicy.productId;
      newPolicy.productVersion = oldPolicy.productVersion;
      newPolicy.lineOfBusiness = oldPolicy.lineOfBusiness;
      newPolicy.distributionOrganizationId = oldPolicy.distributionOrganizationId;
      newPolicy.issuerOrganizationId = oldPolicy.issuerOrganizationId;
      newPolicy.recordOwnerOrganizationId = oldPolicy.recordOwnerOrganizationId;
      newPolicy.authoritativeTenantId = oldPolicy.authoritativeTenantId;
      newPolicy.servicingOrganizationId = oldPolicy.servicingOrganizationId;
      newPolicy.producerPartyId = oldPolicy.producerPartyId;
      newPolicy.subAgentPartyId = oldPolicy.subAgentPartyId;
      newPolicy.marketerPartyId = oldPolicy.marketerPartyId;
      newPolicy.salesChannelType = oldPolicy.salesChannelType;
      newPolicy.sourceSystemId = oldPolicy.sourceSystemId;
      newPolicy.placementId = oldPolicy.placementId;
      newPolicy.premiumAmount = params.newPremium ?? renewal.newPremium ?? oldPolicy.premiumAmount;
      newPolicy.premiumCurrency = oldPolicy.premiumCurrency;
      newPolicy.taxesAmount = oldPolicy.taxesAmount;
      newPolicy.taxesCurrency = oldPolicy.taxesCurrency;
      newPolicy.totalPayableAmount = Number(newPolicy.premiumAmount) + Number(newPolicy.taxesAmount);
      newPolicy.totalPayableCurrency = oldPolicy.totalPayableCurrency;
      newPolicy.fees = oldPolicy.fees;
      newPolicy.policyTerms = oldPolicy.policyTerms;
      newPolicy.coverages = oldPolicy.coverages;
      newPolicy.deductibles = oldPolicy.deductibles;
      newPolicy.commissionSplitSnapshot = oldPolicy.commissionSplitSnapshot;
      newPolicy.startDate = renewal.newStartDate ?? new Date(oldPolicy.endDate.getTime());
      newPolicy.endDate = params.newEndDate ?? renewal.newEndDate ?? new Date(oldPolicy.endDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      newPolicy.renewalParentId = oldPolicy.policyId;
      newPolicy.renewalCount = 0;
      newPolicy.autoRenew = oldPolicy.autoRenew;
      newPolicy.maxRenewals = oldPolicy.maxRenewals;
      newPolicy.idempotencyKey = `renewal-${renewal.renewalId}`;
      newPolicy.version = 1;

      await policyRepo.save(newPolicy);

      // Update old policy renewal count
      oldPolicy.renewalCount += 1;
      await policyRepo.save(oldPolicy);

      // Update renewal record
      renewal.status = 'completed';
      renewal.newPolicyId = newPolicy.policyId;
      renewal.newPremium = Number(newPolicy.premiumAmount);
      renewal.newEndDate = newPolicy.endDate;
      await renewalRepo.save(renewal);

      // Emit PolicyRenewed.v1 event
      await outbox.publish({
        topic: 'insurance.policy.renewed',
        eventType: 'PolicyRenewed',
        eventVersion: 1,
        correlationId: params.correlationId,
        tenantId: oldPolicy.tenantId || undefined,
        subject: { policyId: oldPolicy.policyId, renewalId: renewal.renewalId },
        payload: {
          oldPolicyId: oldPolicy.policyId,
          newPolicyId: newPolicy.policyId,
          renewalId: renewal.renewalId,
          renewalCount: oldPolicy.renewalCount,
          newStartDate: newPolicy.startDate.toISOString(),
          newEndDate: newPolicy.endDate.toISOString(),
          newPremium: Number(newPolicy.premiumAmount),
          currency: newPolicy.premiumCurrency || 'IRR',
        },
      });

      this.logger.log(
        `Renewal completed: old=${oldPolicy.policyId}, new=${newPolicy.policyId}, renewal=${renewal.renewalId}`,
      );

      return {
        renewalId: renewal.renewalId,
        oldPolicyId: oldPolicy.policyId,
        newPolicyId: newPolicy.policyId,
        status: 'completed',
      };
    });
  }
}
