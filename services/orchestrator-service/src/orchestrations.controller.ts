import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Controller()
export class OrchestrationsController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'orchestrator-service' };
  }

  @Post('/orchestrations/sagas')
  async startSaga(@Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.sagaType || !body?.claimId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sagaType and claimId are required' },
        correlationId,
      };
    }

    if (body.sagaType !== 'ClaimPayment') {
      return {
        success: false,
        error: { code: 'NOT_SUPPORTED', message: 'Only ClaimPayment saga is supported currently' },
        correlationId,
      };
    }

    try {
      const saga = await this.orchestratorService.startClaimPaymentSaga({
        claimId: body.claimId,
        correlationId,
        context: body.context,
      });

      return {
        success: true,
        data: {
          sagaId: saga.sagaId,
          sagaType: saga.sagaType,
          status: saga.status,
          currentStep: saga.currentStep,
        },
        correlationId,
      };
    } catch (_e) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to start saga' },
        correlationId,
      };
    }
  }

  @Get('/orchestrations/sagas/:sagaId')
  async getSaga(@Headers() headers: Record<string, any>, @Param('sagaId') sagaId: string) {
    const correlationId = this.getCorrelationId(headers);

    const saga = await this.orchestratorService.getSaga(sagaId);
    if (!saga) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Saga not found' },
        correlationId,
      };
    }

    return { success: true, data: saga, correlationId };
  }
}
