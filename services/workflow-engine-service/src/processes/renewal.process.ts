import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEngineService, StartProcessParams } from '../workflow-engine.service';

export interface RenewalProcessVariables {
  policyId: string;
  tenantId: string;
  brokerOrganizationId?: string;
  carrierOrganizationId?: string;
  productId?: string;
  productVersion?: number;
  currentEndDate: string;
  newPremium?: number;
  newEndDate?: string;
  customerPartyId?: string;
  correlationId: string;
  assignedTo?: string;
  deadline?: string;
}

export interface RenewalProcessResult {
  status: 'renewed' | 'lapsed' | 'rejected' | 'cancelled';
  newPolicyId?: string;
  renewalId?: string;
  reason?: string;
  processedAt: string;
}

@Injectable()
export class RenewalProcess {
  private readonly logger = new Logger(RenewalProcess.name);
  private readonly definitionKey = 'policy-renewal';

  constructor(private readonly workflowEngine: WorkflowEngineService) {}

  async startRenewal(variables: RenewalProcessVariables): Promise<{ instanceId: string; taskId: string }> {
    const params: StartProcessParams = {
      definitionKey: this.definitionKey,
      definitionVersion: 1,
      businessKey: variables.policyId,
      tenantId: variables.tenantId,
      initialVariables: {
        ...variables,
        step: 'detect_expiring',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      startedBy: variables.correlationId,
      metadata: {
        policyId: variables.policyId,
        carrierOrganizationId: variables.carrierOrganizationId,
        brokerOrganizationId: variables.brokerOrganizationId,
      },
    };

    const instance = await this.workflowEngine.startProcess(params);

    this.logger.log(
      `Renewal process started: instance=${instance.instanceId}, policy=${variables.policyId}`,
    );

    return {
      instanceId: instance.instanceId,
      taskId: `renewal-${instance.instanceId}`,
    };
  }

  async notifyCustomer(instanceId: string, tenantId: string, customerPartyId: string): Promise<void> {
    await this.workflowEngine.signal({
      instanceId,
      signalName: 'customer_notified',
      tenantId,
      data: {
        customerPartyId,
        notifiedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Renewal customer notification sent: instance=${instanceId}, customer=${customerPartyId}`);
  }

  async recordConsent(instanceId: string, tenantId: string, consent: boolean): Promise<void> {
    await this.workflowEngine.signal({
      instanceId,
      signalName: 'customer_consent',
      tenantId,
      data: {
        consent,
        recordedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Renewal consent recorded: instance=${instanceId}, consent=${consent}`);
  }

  async authorizePayment(instanceId: string, tenantId: string, paymentId: string): Promise<void> {
    await this.workflowEngine.signal({
      instanceId,
      signalName: 'payment_authorized',
      tenantId,
      data: {
        paymentId,
        authorizedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Renewal payment authorized: instance=${instanceId}, payment=${paymentId}`);
  }

  async completeRenewal(instanceId: string, tenantId: string, result: RenewalProcessResult): Promise<void> {
    await this.workflowEngine.signal({
      instanceId,
      signalName: 'renewal_completed',
      tenantId,
      data: {
        ...result,
        processedAt: result.processedAt || new Date().toISOString(),
      },
    });

    this.logger.log(
      `Renewal completed: instance=${instanceId}, status=${result.status}, newPolicyId=${result.newPolicyId || 'N/A'}`,
    );
  }

  async lapseRenewal(instanceId: string, tenantId: string, reason: string): Promise<void> {
    await this.workflowEngine.signal({
      instanceId,
      signalName: 'renewal_lapsed',
      tenantId,
      data: {
        status: 'lapsed',
        reason,
        processedAt: new Date().toISOString(),
      },
    });

    this.logger.warn(`Renewal lapsed: instance=${instanceId}, reason=${reason}`);
  }

  async cancelRenewal(instanceId: string, tenantId: string, reason: string): Promise<void> {
    await this.workflowEngine.signal({
      instanceId,
      signalName: 'renewal_cancelled',
      tenantId,
      data: {
        status: 'cancelled',
        reason,
        cancelledAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Renewal cancelled: instance=${instanceId}, reason=${reason}`);
  }

  async getTaskHistory(instanceId: string, tenantId: string): Promise<any[]> {
    return this.workflowEngine.getHistory(instanceId, tenantId);
  }
}
