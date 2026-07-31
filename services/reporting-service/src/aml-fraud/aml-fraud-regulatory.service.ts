import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RmAml } from '../entities/RmAml';
import { RmFraudSignal } from '../entities/RmFraudSignal';

export interface AmlFraudReport {
  totalAmlTransactions: number;
  amlByStatus: Array<{ status: string; count: number; totalAmount: number }>;
  highRiskAml: number;
  escalatedAml: number;
  totalFraudSignals: number;
  fraudByScoreRange: Array<{ range: string; count: number }>;
  heldClaims: number;
  openFraudCases: number;
  closedFraudCases: number;
  regulatoryActions: Array<{ type: string; count: number; details: string }>;
}

@Injectable()
export class AmlFraudRegulatoryService {
  private readonly logger = new Logger(AmlFraudRegulatoryService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async generateReport(tenantId?: string, startDate?: string, endDate?: string): Promise<AmlFraudReport> {
    const amlStats = await this.getAmlStats(tenantId, startDate, endDate);
    const fraudStats = await this.getFraudStats(tenantId, startDate, endDate);
    const regulatoryActions = this.deriveRegulatoryActions(amlStats, fraudStats);

    return {
      ...amlStats,
      ...fraudStats,
      regulatoryActions,
    };
  }

  private async getAmlStats(tenantId?: string, startDate?: string, endDate?: string) {
    let qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .addSelect('status', 'status')
      .addSelect('COALESCE(SUM(amount::numeric), 0)', 'totalAmount')
      .from('rm_aml', 'a')
      .groupBy('status');

    if (tenantId) qb = qb.andWhere('a.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      qb = qb.andWhere('a.created_at >= :startDate', { startDate }).andWhere('a.created_at <= :endDate', { endDate });
    }
    const byStatus = await qb.getRawMany();

    let highRiskQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('rm_aml', 'a')
      .where("a.risk_level IN ('high', 'critical')");

    if (tenantId) highRiskQb = highRiskQb.andWhere('a.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      highRiskQb = highRiskQb.andWhere('a.created_at >= :startDate', { startDate }).andWhere('a.created_at <= :endDate', { endDate });
    }
    const highRiskRow = await highRiskQb.getRawOne();

    let escalatedQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('rm_aml', 'a')
      .where('a.escalated_at IS NOT NULL');

    if (tenantId) escalatedQb = escalatedQb.andWhere('a.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      escalatedQb = escalatedQb.andWhere('a.created_at >= :startDate', { startDate }).andWhere('a.created_at <= :endDate', { endDate });
    }
    const escalatedRow = await escalatedQb.getRawOne();

    return {
      totalAmlTransactions: byStatus.reduce((sum, r) => sum + Number(r.total), 0),
      amlByStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.total), totalAmount: Number(r.totalAmount) })),
      highRiskAml: Number(highRiskRow?.count || 0),
      escalatedAml: Number(escalatedRow?.count || 0),
    };
  }

  private async getFraudStats(tenantId?: string, startDate?: string, endDate?: string) {
    let totalQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'total')
      .from('rm_fraud_signal', 'f');

    if (tenantId) totalQb = totalQb.andWhere('f.tenant_id = :tenantId', { tenantId });
    if (startDate && endDate) {
      totalQb = totalQb.andWhere('f.updated_at >= :startDate', { startDate }).andWhere('f.updated_at <= :endDate', { endDate });
    }
    const totalRow = await totalQb.getRawOne();

    const scoreRanges = [
      { range: '0-30', min: 0, max: 30 },
      { range: '31-60', min: 31, max: 60 },
      { range: '61-80', min: 61, max: 80 },
      { range: '81-100', min: 81, max: 100 },
    ];

    const fraudByScoreRange: Array<{ range: string; count: number }> = [];
    for (const sr of scoreRanges) {
      let rangeQb = this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('rm_fraud_signal', 'f')
        .where('f.latest_score >= :min', { min: sr.min })
        .andWhere('f.latest_score <= :max', { max: sr.max });

      if (tenantId) rangeQb = rangeQb.andWhere('f.tenant_id = :tenantId', { tenantId });
      const rangeRow = await rangeQb.getRawOne();
      fraudByScoreRange.push({ range: sr.range, count: Number(rangeRow?.count || 0) });
    }

    let heldQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('rm_fraud_signal', 'f')
      .where('f.hold_claim = true');

    if (tenantId) heldQb = heldQb.andWhere('f.tenant_id = :tenantId', { tenantId });
    const heldRow = await heldQb.getRawOne();

    let openCasesQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('rm_fraud_signal', 'f')
      .where('f.case_opened_at IS NOT NULL')
      .andWhere('f.case_closed_at IS NULL');

    if (tenantId) openCasesQb = openCasesQb.andWhere('f.tenant_id = :tenantId', { tenantId });
    const openCasesRow = await openCasesQb.getRawOne();

    let closedCasesQb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('rm_fraud_signal', 'f')
      .where('f.case_closed_at IS NOT NULL');

    if (tenantId) closedCasesQb = closedCasesQb.andWhere('f.tenant_id = :tenantId', { tenantId });
    const closedCasesRow = await closedCasesQb.getRawOne();

    return {
      totalFraudSignals: Number(totalRow?.total || 0),
      fraudByScoreRange,
      heldClaims: Number(heldRow?.count || 0),
      openFraudCases: Number(openCasesRow?.count || 0),
      closedFraudCases: Number(closedCasesRow?.count || 0),
    };
  }

  private deriveRegulatoryActions(amlStats: any, fraudStats: any): Array<{ type: string; count: number; details: string }> {
    const actions: Array<{ type: string; count: number; details: string }> = [];

    if (amlStats.highRiskAml > 0) {
      actions.push({
        type: 'AML_HIGH_RISK_REVIEW',
        count: amlStats.highRiskAml,
        details: `${amlStats.highRiskAml} high-risk AML transactions require regulatory review`,
      });
    }

    if (amlStats.escalatedAml > 0) {
      actions.push({
        type: 'AML_ESCALATION_REPORT',
        count: amlStats.escalatedAml,
        details: `${amlStats.escalatedAml} escalated AML cases need SAR (Suspicious Activity Report) filing`,
      });
    }

    if (fraudStats.heldClaims > 0) {
      actions.push({
        type: 'FRAUD_HELD_CLAIMS',
        count: fraudStats.heldClaims,
        details: `${fraudStats.heldClaims} claims held due to fraud signals`,
      });
    }

    const highFraudScore = fraudStats.fraudByScoreRange.find((r: any) => r.range === '81-100');
    if (highFraudScore && highFraudScore.count > 0) {
      actions.push({
        type: 'FRAUD_HIGH_SCORE_ALERT',
        count: highFraudScore.count,
        details: `${highFraudScore.count} claims with fraud score 81-100 require immediate investigation`,
      });
    }

    if (fraudStats.openFraudCases > 0) {
      actions.push({
        type: 'FRAUD_OPEN_CASES',
        count: fraudStats.openFraudCases,
        details: `${fraudStats.openFraudCases} open fraud investigation cases`,
      });
    }

    return actions;
  }
}
