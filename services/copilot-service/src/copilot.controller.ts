import { Controller, Get, Headers, Param, Post, Res } from '@nestjs/common';
import { CopilotService } from './copilot.service';

@Controller()
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Get('/health')
  health() {
    return { status: 'ok', service: 'copilot-service' };
  }

  @Post('/copilot/claims/:claimId/summary')
  async claimSummary(@Param('claimId') claimId: string, @Headers() _headers: Record<string, any>, @Res() res: any) {
    const result = await this.copilotService.getClaimSummary(claimId);
    return res.status(result.status).json(result.body);
  }

  @Post('/copilot/documents/:documentId/summary')
  async docSummary(@Param('documentId') documentId: string, @Headers() _headers: Record<string, any>, @Res() res: any) {
    const result = await this.copilotService.getDocumentSummary(documentId);
    return res.status(result.status).json(result.body);
  }
}
