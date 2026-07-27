import { Controller, Get, Post, Body, Headers, Query, UseGuards } from '@nestjs/common';
import { ProfileRecoAdapter } from './profile-reco.adapter';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller('ecosystem-ai')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class ProfileRecoController {
  constructor(private readonly adapter: ProfileRecoAdapter) {}

  @Get('recommendations')
  async getRecommendations(
    @Headers() headers: Record<string, any>,
    @Query('subjectId') subjectId: string,
    @Query('domain') domain: string,
    @Query('maxResults') maxResults?: string,
  ) {
    const authToken = headers['authorization'] || '';
    const results = await this.adapter.getRecommendations(
      authToken,
      subjectId,
      domain || 'insurance',
      maxResults ? parseInt(maxResults, 10) : 5,
    );
    return { success: true, data: results };
  }

  @Post('signals')
  async publishSignals(
    @Headers() headers: Record<string, any>,
    @Body() body: { subjectId: string; traits: Record<string, any> },
  ) {
    const authToken = headers['authorization'] || '';
    await this.adapter.publishDomainSignals(authToken, body.subjectId, body.traits);
    return { success: true };
  }

  @Post('feedback')
  async recordFeedback(
    @Headers() headers: Record<string, any>,
    @Body() body: { subjectId: string; recommendationId: string; eventType: string; metadata?: Record<string, any> },
  ) {
    const authToken = headers['authorization'] || '';
    await this.adapter.recordFeedback(authToken, body);
    return { success: true };
  }
}
