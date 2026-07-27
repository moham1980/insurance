"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UnderwritingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnderwritingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const UnderwritingRequest_1 = require("./entities/UnderwritingRequest");
const UnderwritingAppetite_1 = require("./entities/UnderwritingAppetite");
const uuid_1 = require("uuid");
const audit_logger_1 = require("./audit.logger");
let UnderwritingService = UnderwritingService_1 = class UnderwritingService {
    reqRepo;
    appetiteRepo;
    logger = new common_1.Logger(UnderwritingService_1.name);
    constructor(reqRepo, appetiteRepo) {
        this.reqRepo = reqRepo;
        this.appetiteRepo = appetiteRepo;
    }
    getOrchestratorUrl() {
        const url = process.env.ORCHESTRATOR_URL;
        if (typeof url === 'string' && url.length > 0)
            return url;
        return null;
    }
    getPolicyServiceUrl() {
        const url = process.env.POLICY_SERVICE_URL || process.env.API_GATEWAY_URL;
        if (typeof url === 'string' && url.length > 0)
            return url;
        return null;
    }
    async createRequest(params) {
        const r = this.reqRepo.create({
            underwritingRequestId: (0, uuid_1.v4)(),
            policyId: params.policyId,
            status: 'pending',
            reasonCode: params.reasonCode,
            input: params.input || null,
            workItemId: null,
            workItemSagaId: null,
            decision: null,
            decisionNotes: null,
            decidedBy: null,
            decidedAt: null,
            result: null,
            dueDate: params.dueDate ? new Date(params.dueDate) : null,
            correlationId: params.correlationId || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await this.reqRepo.save(r);
        const orchUrl = this.getOrchestratorUrl();
        if (orchUrl && params.authorization) {
            try {
                const res = await fetch(`${orchUrl}/work-items/underwriting-review`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'x-correlation-id': params.correlationId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                        ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
                        ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
                        authorization: params.authorization,
                    },
                    body: JSON.stringify({
                        policyId: params.policyId,
                        reasonCode: params.reasonCode,
                        context: params.input || null,
                        priority: 'high',
                        dueDate: params.dueDate || null,
                    }),
                });
                const json = (await res.json().catch(() => null));
                if (res.ok && json && json.success === true && json.data?.workItemId) {
                    r.workItemId = String(json.data.workItemId);
                    r.workItemSagaId = json.data?.sagaId ? String(json.data.sagaId) : null;
                    r.status = 'in_review';
                    r.updatedAt = new Date();
                    await this.reqRepo.save(r);
                }
            }
            catch { }
        }
        return r;
    }
    async getRequest(underwritingRequestId) {
        return await this.reqRepo.findOne({ where: { underwritingRequestId } });
    }
    async listRequests(params) {
        const take = Math.min(params.limit || 50, 200);
        const skip = params.offset || 0;
        const qb = this.reqRepo.createQueryBuilder('r');
        if (params.status)
            qb.andWhere('r.status = :status', { status: params.status });
        if (params.policyId)
            qb.andWhere('r.policy_id = :policyId', { policyId: params.policyId });
        qb.orderBy('r.created_at', 'DESC').take(take).skip(skip);
        const [rows, total] = await qb.getManyAndCount();
        return { rows, total };
    }
    async attachWorkItem(params) {
        const r = await this.reqRepo.findOne({ where: { underwritingRequestId: params.underwritingRequestId } });
        if (!r)
            return null;
        if (!r.workItemId) {
            r.workItemId = params.workItemId;
            r.workItemSagaId = params.workItemSagaId || null;
            r.status = 'in_review';
            r.updatedAt = new Date();
            await this.reqRepo.save(r);
        }
        return r;
    }
    async decide(params) {
        const r = await this.reqRepo.findOne({ where: { underwritingRequestId: params.underwritingRequestId } });
        if (!r)
            return null;
        if (r.decision) {
            const err = new Error('Decision already recorded');
            err.code = 'ALREADY_DECIDED';
            throw err;
        }
        const policyUrl = this.getPolicyServiceUrl();
        if (!policyUrl || !params.authorization) {
            const err = new Error('Policy service unavailable');
            err.code = 'POLICY_SERVICE_UNAVAILABLE';
            throw err;
        }
        try {
            const res = await fetch(`${policyUrl}/policies/${r.policyId}/underwriting/decision`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-correlation-id': params.correlationId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                    ...(params.tenantId ? { 'x-tenant-id': params.tenantId } : {}),
                    ...(params.actorUserId ? { 'x-user-id': params.actorUserId } : {}),
                    authorization: params.authorization,
                },
                body: JSON.stringify({ decision: params.decision, notes: params.notes || null, decidedBy: params.decidedBy }),
            });
            const json = (await res.json().catch(() => null));
            if (!res.ok || !json || json.success !== true) {
                const err = new Error(json?.error?.message || 'Failed to apply underwriting decision to policy');
                err.code = json?.error?.code || 'POLICY_DECISION_FAILED';
                throw err;
            }
        }
        catch (e) {
            const err = new Error(e?.message || 'Failed to apply underwriting decision to policy');
            err.code = e?.code || 'POLICY_DECISION_FAILED';
            throw err;
        }
        r.decision = params.decision;
        r.decisionNotes = params.notes || null;
        r.decidedBy = params.decidedBy;
        r.decidedAt = new Date();
        r.result = params.result || null;
        r.status = params.decision;
        r.updatedAt = new Date();
        await this.reqRepo.save(r);
        return r;
    }
    // SLA Enforcement
    async checkSlaBreaches(params) {
        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setHours(cutoffDate.getHours() - params.hoursOverdue);
        const qb = this.reqRepo.createQueryBuilder('r');
        qb.where('r.status IN (:...statuses)', { statuses: ['pending', 'in_review'] })
            .andWhere('r.due_date IS NOT NULL')
            .andWhere('r.due_date < :now', { now })
            .andWhere('(r.escalated_at IS NULL OR r.escalated_at < :cutoff)', { cutoff: cutoffDate })
            .orderBy('r.due_date', 'ASC')
            .limit(params.limit)
            .offset(params.offset);
        const [rows, total] = await qb.getManyAndCount();
        return { rows, total };
    }
    async escalateOverdueReview(params) {
        const r = await this.reqRepo.findOne({ where: { underwritingRequestId: params.underwritingRequestId } });
        if (!r) {
            const err = new Error('Request not found');
            err.code = 'NOT_FOUND';
            throw err;
        }
        if (r.status !== 'pending' && r.status !== 'in_review') {
            const err = new Error('Request must be pending or in review to escalate');
            err.code = 'INVALID_STATE';
            throw err;
        }
        r.status = 'escalated';
        r.decision = 'escalated';
        r.decisionNotes = params.reason;
        r.decidedBy = params.actorUserId;
        r.decidedAt = new Date();
        r.updatedAt = new Date();
        await this.reqRepo.save(r);
        audit_logger_1.auditLogger.info('underwriting.sla_escalated', {
            underwritingRequestId: r.underwritingRequestId,
            policyId: r.policyId,
            actorUserId: params.actorUserId,
            reason: params.reason,
            dueDate: r.dueDate,
        });
        return r;
    }
    async getSlaMetrics() {
        const now = new Date();
        const totalPending = await this.reqRepo.count({
            where: { status: 'pending' },
        });
        const overdueCount = await this.reqRepo.count({
            where: {
                status: 'pending',
                dueDate: { $lt: now },
            },
        });
        const escalatedCount = await this.reqRepo.count({
            where: { status: 'escalated' },
        });
        // Calculate average resolution time for completed reviews
        const completedReviews = await this.reqRepo
            .createQueryBuilder('r')
            .where('r.status IN (:...statuses)', { statuses: ['approved', 'rejected', 'escalated'] })
            .andWhere('r.decided_at IS NOT NULL')
            .andWhere('r.created_at IS NOT NULL')
            .getMany();
        let avgResolutionHours = null;
        if (completedReviews.length > 0) {
            const totalHours = completedReviews.reduce((sum, review) => {
                const createdAt = review.createdAt.getTime();
                const decidedAt = review.decidedAt?.getTime() || now.getTime();
                return sum + (decidedAt - createdAt) / (1000 * 60 * 60);
            }, 0);
            avgResolutionHours = Math.round((totalHours / completedReviews.length) * 100) / 100;
        }
        // Calculate resolution rate
        const totalCompleted = completedReviews.length;
        const totalRequests = await this.reqRepo.count();
        const resolutionRate = totalRequests > 0 ? Math.round((totalCompleted / totalRequests) * 10000) / 100 : 0;
        return {
            totalPending,
            overdueCount,
            escalatedCount,
            avgResolutionHours,
            resolutionRate,
        };
    }
    // Risk Assessment Tools
    async assessRisk(params) {
        const r = await this.reqRepo.findOne({ where: { underwritingRequestId: params.underwritingRequestId } });
        if (!r) {
            const err = new Error('Request not found');
            err.code = 'NOT_FOUND';
            throw err;
        }
        const factors = {};
        const recommendations = [];
        // Age-based risk scoring
        const age = typeof params.factors.age === 'number' ? params.factors.age : 35;
        if (age < 25) {
            factors.ageRisk = 0.8;
            recommendations.push('Age < 25: Consider higher premium or additional coverage restrictions');
        }
        else if (age > 65) {
            factors.ageRisk = 0.6;
            recommendations.push('Age > 65: Consider health verification requirements');
        }
        else {
            factors.ageRisk = 0.2;
        }
        // Claim history risk
        const pastClaims = typeof params.factors.pastClaimsCount === 'number' ? params.factors.pastClaimsCount : 0;
        if (pastClaims >= 3) {
            factors.claimHistoryRisk = 0.9;
            recommendations.push('High claim frequency: Consider risk mitigation measures or premium adjustment');
        }
        else if (pastClaims >= 1) {
            factors.claimHistoryRisk = 0.5;
            recommendations.push('Previous claims noted: Review claim patterns');
        }
        else {
            factors.claimHistoryRisk = 0.1;
        }
        // Coverage amount risk
        const coverageAmount = typeof params.factors.coverageAmount === 'number' ? params.factors.coverageAmount : 0;
        const premiumAmount = typeof params.factors.premiumAmount === 'number' ? params.factors.premiumAmount : 1;
        const coverageRatio = coverageAmount / Math.max(premiumAmount, 1);
        if (coverageRatio > 1000) {
            factors.coverageRisk = 0.7;
            recommendations.push('High coverage-to-premium ratio: Verify risk adequacy');
        }
        else {
            factors.coverageRisk = 0.3;
        }
        // Vehicle/property age for motor/fire
        const itemAge = typeof params.factors.itemAge === 'number' ? params.factors.itemAge : 0;
        if (itemAge > 15) {
            factors.itemAgeRisk = 0.6;
            recommendations.push('Item age > 15 years: Consider depreciation adjustment');
        }
        else {
            factors.itemAgeRisk = 0.2;
        }
        // Policy type risk baseline
        const policyType = String(params.factors.policyType || 'auto');
        const typeRisk = { auto: 0.5, life: 0.3, health: 0.4, fire: 0.4, liability: 0.3, travel: 0.2 };
        factors.policyTypeRisk = typeRisk[policyType] || 0.4;
        // Calculate weighted risk score
        const weights = { ageRisk: 0.2, claimHistoryRisk: 0.3, coverageRisk: 0.2, itemAgeRisk: 0.15, policyTypeRisk: 0.15 };
        let riskScore = 0;
        for (const [factor, weight] of Object.entries(weights)) {
            riskScore += (factors[factor] || 0) * weight;
        }
        riskScore = Math.round(riskScore * 100) / 100;
        const riskLevel = riskScore < 0.3 ? 'low' : riskScore < 0.5 ? 'medium' : riskScore < 0.7 ? 'high' : 'critical';
        // Store assessment in request metadata
        r.result = { ...(r.result || {}), riskAssessment: { riskScore, riskLevel, factors, recommendations, assessedAt: new Date().toISOString() } };
        r.updatedAt = new Date();
        await this.reqRepo.save(r);
        return { riskScore, riskLevel, factors, recommendations };
    }
    async getRiskMatrix() {
        const matrix = {
            age: { '<25': 0.8, '25-35': 0.3, '35-50': 0.2, '50-65': 0.4, '>65': 0.6 },
            claimHistory: { '0': 0.1, '1-2': 0.5, '3+': 0.9 },
            coverageRatio: { '<100': 0.1, '100-500': 0.3, '500-1000': 0.5, '>1000': 0.7 },
            itemAge: { '<5': 0.1, '5-10': 0.3, '10-15': 0.4, '>15': 0.6 },
            policyType: { auto: 0.5, life: 0.3, health: 0.4, fire: 0.4, liability: 0.3, travel: 0.2 },
        };
        const levels = {
            low: { min: 0, max: 0.3, action: 'Standard approval process' },
            medium: { min: 0.3, max: 0.5, action: 'Standard approval with additional verification' },
            high: { min: 0.5, max: 0.7, action: 'Enhanced review required - senior underwriter approval' },
            critical: { min: 0.7, max: 1.0, action: 'Decline or refer to reinsurance - maximum scrutiny' },
        };
        return { matrix, levels };
    }
    async getRiskScoringHistory(underwritingRequestId) {
        const r = await this.reqRepo.findOne({ where: { underwritingRequestId } });
        if (!r || !r.result?.riskAssessmentHistory)
            return [];
        return r.result.riskAssessmentHistory;
    }
    // ===== Appetite Matrix & Delegated Authority =====
    async createAppetiteRule(params) {
        const rule = this.appetiteRepo.create({
            lineOfBusiness: params.lineOfBusiness,
            productId: params.productId || null,
            riskLevel: params.riskLevel,
            decision: params.decision,
            maxSumInsured: params.maxSumInsured ?? null,
            maxPremium: params.maxPremium ?? null,
            authorityLevel: params.authorityLevel || null,
            approverRole: params.approverRole || null,
            slaHours: params.slaHours ?? 24,
            active: true,
        });
        return await this.appetiteRepo.save(rule);
    }
    async evaluateAppetite(params) {
        const qb = this.appetiteRepo.createQueryBuilder('a')
            .where('a.lineOfBusiness = :lob', { lob: params.lineOfBusiness })
            .andWhere('a.riskLevel = :riskLevel', { riskLevel: params.riskLevel })
            .andWhere('a.active = true');
        if (params.productId) {
            qb.andWhere('(a.productId = :productId OR a.productId IS NULL)', { productId: params.productId });
        }
        const rules = await qb.orderBy('a.productId', 'DESC').getMany();
        for (const rule of rules) {
            const withinSumInsured = !rule.maxSumInsured || (params.sumInsured !== undefined && params.sumInsured <= rule.maxSumInsured);
            const withinPremium = !rule.maxPremium || (params.premium !== undefined && params.premium <= rule.maxPremium);
            if (withinSumInsured && withinPremium) {
                return {
                    decision: rule.decision,
                    authorityLevel: rule.authorityLevel || undefined,
                    approverRole: rule.approverRole || undefined,
                    slaHours: rule.slaHours,
                    matchedRuleId: rule.id,
                };
            }
        }
        // Default fallback: refer
        return { decision: 'refer', slaHours: 48 };
    }
    async listAppetiteRules(params) {
        const qb = this.appetiteRepo.createQueryBuilder('a');
        if (params.lineOfBusiness)
            qb.andWhere('a.lineOfBusiness = :lob', { lob: params.lineOfBusiness });
        if (params.productId)
            qb.andWhere('a.productId = :productId', { productId: params.productId });
        if (params.active !== undefined)
            qb.andWhere('a.active = :active', { active: params.active });
        qb.orderBy('a.lineOfBusiness', 'ASC').addOrderBy('a.riskLevel', 'ASC');
        qb.take(params.limit).skip(params.offset);
        const [rows, total] = await qb.getManyAndCount();
        return { rows, total };
    }
    async updateAppetiteRule(id, updates) {
        const rule = await this.appetiteRepo.findOne({ where: { id } });
        if (!rule)
            return null;
        Object.assign(rule, updates);
        rule.updatedAt = new Date();
        return await this.appetiteRepo.save(rule);
    }
    async deleteAppetiteRule(id) {
        const result = await this.appetiteRepo.delete(id);
        return (result.affected ?? 0) > 0;
    }
};
exports.UnderwritingService = UnderwritingService;
exports.UnderwritingService = UnderwritingService = UnderwritingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(UnderwritingRequest_1.UnderwritingRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(UnderwritingAppetite_1.UnderwritingAppetite)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UnderwritingService);
