import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEngineService, StartProcessParams } from '../workflow-engine.service';

export interface ManualQuoteProcessVariables {
  submissionId: string;
  quoteRequestId: string;
  tenantId: string;
  carrierOrganizationId: string;
  brokerOrganizationId: string;
  productId: string;
  productVersion: number;
  lineOfBusiness: string;
  exposure: Record<string, any>;
  effectiveFrom: string;
  effectiveTo: string;
  correlationId: string;
  assignedTo?: string;
  deadline?: string;
}

export interface ManualQuoteResult {
  status: 'quoted' | 'declined' | 'referral';
  premiumAmountMinor?: string;
  premiumCurrency?: string;
  coverages?: Array<{ code: string; limit?: string; deductible?: string }>;
  exclusions?: string[];
  subjectivities?: Array<{ description: string; requiredBy: string }>;
  validUntil?: string;
  notes?: string;
  submittedBy: string;
  submittedAt: string;
}

@Injectable()
export class ManualQuoteProcess {
  private readonly logger = new Logger(ManualQuoteProcess.name);
  private readonly definitionKey = 'manual-quote';

  constructor(private readonly workflowEngine: WorkflowEngineService) {}

  async startManualQuote(variables: ManualQuoteProcessVariables): Promise<{ instanceId: string; taskId: string }> {
    const params: StartProcessParams = {
      definitionKey: this.definitionKey,
      definitionVersion: 1,
      businessKey: variables.quoteRequestId,
      tenantId: variables.tenantId,
      initialVariables: {
        ...variables,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      startedBy: variables.correlationId,
      metadata: {
        carrierOrganizationId: variables.carrierOrganizationId,
        submissionId: variables.submissionId,
        quoteRequestId: variables.quoteRequestId,
      },
    };

    const instance = await this.workflowEngine.startProcess(params);

    this.logger.log(
      `Manual quote process started: instance=${instance.instanceId}, quoteRequest=${variables.quoteRequestId}, carrier=${variables.carrierOrganizationId}`,
    );

    return {
      instanceId: instance.instanceId,
      taskId: `manual-quote-${instance.instanceId}`,
    };
  }

  async submitManualQuote(
    instanceId: string,
    tenantId: string,
    result: ManualQuoteResult,
  ): Promise<void> {
    await this.workflowEngine.signal({
      instanceId,
      signalName: 'manual_quote_submitted',
      tenantId,
      data: {
        ...result,
        submittedAt: result.submittedAt || new Date().toISOString(),
      },
    });

    this.logger.log(
      `Manual quote submitted: instance=${instanceId}, status=${result.status}, by=${result.submittedBy}`,
    );
  }

  async getTaskHistory(instanceId: string, tenantId: string): Promise<any[]> {
    const history = await this.workflowEngine.getHistory(instanceId, tenantId);
    return history;
  }

  async cancelManualQuote(instanceId: string, tenantId: string, reason: string): Promise<void> {
    await this.workflowEngine.signal({
      instanceId,
      signalName: 'manual_quote_cancelled',
      tenantId,
      data: { reason, cancelledAt: new Date().toISOString() },
    });

    this.logger.log(`Manual quote cancelled: instance=${instanceId}, reason=${reason}`);
  }
}
