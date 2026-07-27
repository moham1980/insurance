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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnderwritingController = void 0;
const common_1 = require("@nestjs/common");
const underwriting_service_1 = require("./underwriting.service");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const permissions_guard_1 = require("./permissions.guard");
const permissions_decorator_1 = require("./permissions.decorator");
const audit_logger_1 = require("./audit.logger");
let UnderwritingController = class UnderwritingController {
    underwritingService;
    constructor(underwritingService) {
        this.underwritingService = underwritingService;
    }
    isUuid(value) {
        if (typeof value !== 'string')
            return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }
    getCorrelationId(headers) {
        const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
        if (typeof cid === 'string' && cid.length > 0)
            return cid;
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    health() {
        return { status: 'ok', service: 'underwriting-service' };
    }
    async create(req, headers, body) {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        const authorization = (headers['authorization'] || headers['Authorization']);
        audit_logger_1.auditLogger.info('underwriting.request.create.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:create',
        });
        if (!body?.policyId || !body?.reasonCode) {
            audit_logger_1.auditLogger.warn('underwriting.request.create.validation_failed', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:create',
            });
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'policyId and reasonCode are required' }, correlationId };
        }
        if (!this.isUuid(body.policyId)) {
            audit_logger_1.auditLogger.warn('underwriting.request.create.validation_failed', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:create',
            });
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'policyId must be a UUID' }, correlationId };
        }
        const r = await this.underwritingService.createRequest({
            policyId: String(body.policyId),
            reasonCode: String(body.reasonCode),
            input: body.input && typeof body.input === 'object' ? body.input : undefined,
            correlationId,
            dueDate: typeof body.dueDate === 'string' ? body.dueDate : undefined,
            tenantId,
            actorUserId: actor?.userId ?? null,
            authorization,
        });
        audit_logger_1.auditLogger.info('underwriting.request.create.success', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:create',
            underwritingRequestId: r.underwritingRequestId,
            policyId: r.policyId,
        });
        return { success: true, data: r, correlationId };
    }
    async get(req, headers, underwritingRequestId) {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        if (!this.isUuid(underwritingRequestId)) {
            audit_logger_1.auditLogger.warn('underwriting.request.get.validation_failed', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:view',
                underwritingRequestId,
            });
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'underwritingRequestId must be a UUID' }, correlationId };
        }
        audit_logger_1.auditLogger.info('underwriting.request.get.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:view',
            underwritingRequestId,
        });
        const r = await this.underwritingService.getRequest(underwritingRequestId);
        if (!r) {
            audit_logger_1.auditLogger.warn('underwriting.request.get.not_found', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:view',
                underwritingRequestId,
            });
            return { success: false, error: { code: 'NOT_FOUND', message: 'Underwriting request not found' }, correlationId };
        }
        return { success: true, data: r, correlationId };
    }
    async list(req, headers, status, policyId, limit = '50', offset = '0') {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        audit_logger_1.auditLogger.info('underwriting.request.list.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:list',
        });
        const lim = parseInt(limit, 10);
        const off = parseInt(offset, 10);
        const { rows, total } = await this.underwritingService.listRequests({
            status,
            policyId,
            limit: Number.isFinite(lim) ? lim : 50,
            offset: Number.isFinite(off) ? off : 0,
        });
        return {
            success: true,
            data: rows,
            pagination: {
                total,
                limit: Number.isFinite(lim) ? lim : 50,
                offset: Number.isFinite(off) ? off : 0,
            },
            correlationId,
        };
    }
    async decide(req, headers, underwritingRequestId, body) {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        const authorization = (headers['authorization'] || headers['Authorization']);
        if (!this.isUuid(underwritingRequestId)) {
            audit_logger_1.auditLogger.warn('underwriting.request.decide.validation_failed', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:decide',
                underwritingRequestId,
            });
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'underwritingRequestId must be a UUID' }, correlationId };
        }
        audit_logger_1.auditLogger.info('underwriting.request.decide.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:decide',
            underwritingRequestId,
        });
        if (!body?.decision) {
            audit_logger_1.auditLogger.warn('underwriting.request.decide.validation_failed', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:decide',
                underwritingRequestId,
            });
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'decision is required' }, correlationId };
        }
        if (!['approved', 'rejected', 'escalated'].includes(String(body.decision))) {
            audit_logger_1.auditLogger.warn('underwriting.request.decide.validation_failed', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:decide',
                underwritingRequestId,
            });
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'decision must be approved|rejected|escalated' }, correlationId };
        }
        const decidedBy = body.decidedBy || actor?.userId;
        if (!decidedBy) {
            audit_logger_1.auditLogger.warn('underwriting.request.decide.no_actor', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:decide',
                underwritingRequestId,
            });
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'decidedBy is required (provide in body or via JWT userId)' }, correlationId };
        }
        try {
            const r = await this.underwritingService.decide({
                underwritingRequestId,
                decision: body.decision,
                decidedBy,
                notes: body.notes,
                result: body.result && typeof body.result === 'object' ? body.result : undefined,
                correlationId,
                tenantId,
                actorUserId: actor?.userId ?? null,
                authorization,
            });
            if (!r) {
                audit_logger_1.auditLogger.warn('underwriting.request.decide.not_found', {
                    correlationId,
                    tenantId,
                    actorUserId: actor?.userId,
                    action: 'underwriting:decide',
                    underwritingRequestId,
                });
                return { success: false, error: { code: 'NOT_FOUND', message: 'Underwriting request not found' }, correlationId };
            }
            audit_logger_1.auditLogger.info('underwriting.request.decide.success', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:decide',
                underwritingRequestId,
                decision: r.decision,
            });
            return { success: true, data: r, correlationId };
        }
        catch (e) {
            if (e?.code === 'ALREADY_DECIDED') {
                audit_logger_1.auditLogger.warn('underwriting.request.decide.already_decided', {
                    correlationId,
                    tenantId,
                    actorUserId: actor?.userId,
                    action: 'underwriting:decide',
                    underwritingRequestId,
                });
                return { success: false, error: { code: 'ALREADY_DECIDED', message: e.message }, correlationId };
            }
            if (e?.code === 'POLICY_SERVICE_UNAVAILABLE') {
                audit_logger_1.auditLogger.warn('underwriting.request.decide.policy_service_unavailable', {
                    correlationId,
                    tenantId,
                    actorUserId: actor?.userId,
                    action: 'underwriting:decide',
                    underwritingRequestId,
                });
                return { success: false, error: { code: 'POLICY_SERVICE_UNAVAILABLE', message: e.message }, correlationId };
            }
            if (e?.code === 'POLICY_DECISION_FAILED') {
                audit_logger_1.auditLogger.warn('underwriting.request.decide.policy_decision_failed', {
                    correlationId,
                    tenantId,
                    actorUserId: actor?.userId,
                    action: 'underwriting:decide',
                    underwritingRequestId,
                });
                return { success: false, error: { code: 'POLICY_DECISION_FAILED', message: e.message }, correlationId };
            }
            const err = e instanceof Error ? e : new Error(String(e));
            audit_logger_1.auditLogger.error('underwriting.request.decide.failed', err, {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:decide',
                underwritingRequestId,
            });
            return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to decide underwriting request' }, correlationId };
        }
    }
    // SLA Enforcement Endpoints
    async getSlaBreaches(req, headers, hoursOverdue = '48', limit = '50', offset = '0') {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        audit_logger_1.auditLogger.info('underwriting.sla.breaches.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:list',
        });
        const hours = parseInt(hoursOverdue, 10) || 48;
        const lim = parseInt(limit, 10);
        const off = parseInt(offset, 10);
        const { rows, total } = await this.underwritingService.checkSlaBreaches({
            hoursOverdue: hours,
            limit: Number.isFinite(lim) ? lim : 50,
            offset: Number.isFinite(off) ? off : 0,
        });
        return {
            success: true,
            data: rows,
            pagination: {
                total,
                limit: Number.isFinite(lim) ? lim : 50,
                offset: Number.isFinite(off) ? off : 0,
            },
            correlationId,
        };
    }
    async escalateOverdueReview(req, headers, underwritingRequestId, body) {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        if (!this.isUuid(underwritingRequestId)) {
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'underwritingRequestId must be a UUID' }, correlationId };
        }
        audit_logger_1.auditLogger.info('underwriting.escalate.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:decide',
            underwritingRequestId,
        });
        if (!body?.reason || typeof body.reason !== 'string') {
            return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' }, correlationId };
        }
        try {
            const r = await this.underwritingService.escalateOverdueReview({
                underwritingRequestId,
                actorUserId: actor?.userId,
                reason: body.reason,
            });
            return { success: true, data: r, correlationId };
        }
        catch (e) {
            if (e?.code === 'NOT_FOUND') {
                return { success: false, error: { code: 'NOT_FOUND', message: 'Request not found' }, correlationId };
            }
            if (e?.code === 'INVALID_STATE') {
                return { success: false, error: { code: 'INVALID_STATE', message: e.message }, correlationId };
            }
            const err = e instanceof Error ? e : new Error(String(e));
            audit_logger_1.auditLogger.error('underwriting.escalate.failed', err, {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:decide',
                underwritingRequestId,
            });
            return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to escalate review' }, correlationId };
        }
    }
    async getSlaMetrics(req, headers) {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        audit_logger_1.auditLogger.info('underwriting.sla.metrics.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:list',
        });
        const metrics = await this.underwritingService.getSlaMetrics();
        return { success: true, data: metrics, correlationId };
    }
    async assessRisk(id, body, req, headers) {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        audit_logger_1.auditLogger.info('underwriting.assess_risk.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:create',
            underwritingRequestId: id,
        });
        try {
            const result = await this.underwritingService.assessRisk({
                underwritingRequestId: id,
                factors: body.factors || {},
            });
            return { success: true, data: result, correlationId };
        }
        catch (e) {
            audit_logger_1.auditLogger.warn('underwriting.assess_risk.error', {
                correlationId,
                tenantId,
                actorUserId: actor?.userId,
                action: 'underwriting:create',
                underwritingRequestId: id,
                error: e?.message,
            });
            return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to assess risk' }, correlationId };
        }
    }
    async getRiskMatrix(req, headers) {
        const correlationId = this.getCorrelationId(headers);
        const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']);
        const actor = req?.user;
        audit_logger_1.auditLogger.info('underwriting.risk_matrix.request', {
            correlationId,
            tenantId,
            actorUserId: actor?.userId,
            action: 'underwriting:view',
        });
        const result = await this.underwritingService.getRiskMatrix();
        return { success: true, data: result, correlationId };
    }
    // Appetite Matrix Endpoints
    async createAppetiteRule(req, headers, body) {
        const correlationId = this.getCorrelationId(headers);
        const result = await this.underwritingService.createAppetiteRule({
            lineOfBusiness: body.lineOfBusiness,
            productId: body.productId,
            riskLevel: body.riskLevel,
            decision: body.decision,
            maxSumInsured: body.maxSumInsured,
            maxPremium: body.maxPremium,
            authorityLevel: body.authorityLevel,
            approverRole: body.approverRole,
            slaHours: body.slaHours,
        });
        return { success: true, data: result, correlationId };
    }
    async evaluateAppetite(req, headers, body) {
        const correlationId = this.getCorrelationId(headers);
        const result = await this.underwritingService.evaluateAppetite({
            lineOfBusiness: body.lineOfBusiness,
            productId: body.productId,
            riskLevel: body.riskLevel,
            sumInsured: body.sumInsured,
            premium: body.premium,
        });
        return { success: true, data: result, correlationId };
    }
    async listAppetiteRules(req, headers, lineOfBusiness, productId, active, limit = '50', offset = '0') {
        const correlationId = this.getCorrelationId(headers);
        const result = await this.underwritingService.listAppetiteRules({
            lineOfBusiness,
            productId,
            active: active !== undefined ? active === 'true' : undefined,
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10),
        });
        return { success: true, data: result.rows, pagination: { total: result.total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) }, correlationId };
    }
    async updateAppetiteRule(id, body) {
        const result = await this.underwritingService.updateAppetiteRule(id, body);
        if (!result)
            return { success: false, error: { code: 'NOT_FOUND', message: 'Appetite rule not found' } };
        return { success: true, data: result };
    }
};
exports.UnderwritingController = UnderwritingController;
__decorate([
    (0, common_1.Post)('/underwriting/requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:create'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('/underwriting/requests/:underwritingRequestId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:view'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Param)('underwritingRequestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('/underwriting/requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:list'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('policyId')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('/underwriting/requests/:underwritingRequestId/decide'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:decide'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Param)('underwritingRequestId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "decide", null);
__decorate([
    (0, common_1.Get)('/underwriting/sla/breaches'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:list'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Query)('hoursOverdue')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "getSlaBreaches", null);
__decorate([
    (0, common_1.Post)('/underwriting/requests/:underwritingRequestId/escalate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:decide'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Param)('underwritingRequestId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "escalateOverdueReview", null);
__decorate([
    (0, common_1.Get)('/underwriting/sla/metrics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:list'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "getSlaMetrics", null);
__decorate([
    (0, common_1.Post)('/underwriting/requests/:id/assess-risk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:create'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "assessRisk", null);
__decorate([
    (0, common_1.Get)('/underwriting/risk-matrix'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:view'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "getRiskMatrix", null);
__decorate([
    (0, common_1.Post)('/underwriting/appetite-rules'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:create'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "createAppetiteRule", null);
__decorate([
    (0, common_1.Post)('/underwriting/appetite-rules/evaluate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:view'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "evaluateAppetite", null);
__decorate([
    (0, common_1.Get)('/underwriting/appetite-rules'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:view'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Query)('lineOfBusiness')),
    __param(3, (0, common_1.Query)('productId')),
    __param(4, (0, common_1.Query)('active')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "listAppetiteRules", null);
__decorate([
    (0, common_1.Patch)('/underwriting/appetite-rules/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.RequirePermissions)('underwriting:create'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UnderwritingController.prototype, "updateAppetiteRule", null);
exports.UnderwritingController = UnderwritingController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [underwriting_service_1.UnderwritingService])
], UnderwritingController);
