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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnderwritingRequest = void 0;
const typeorm_1 = require("typeorm");
let UnderwritingRequest = class UnderwritingRequest {
    underwritingRequestId;
    policyId;
    status;
    reasonCode;
    input;
    workItemId;
    workItemSagaId;
    decision;
    decisionNotes;
    decidedBy;
    decidedAt;
    result;
    dueDate;
    correlationId;
    createdAt;
    updatedAt;
};
exports.UnderwritingRequest = UnderwritingRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid', { name: 'underwriting_request_id' }),
    __metadata("design:type", String)
], UnderwritingRequest.prototype, "underwritingRequestId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'policy_id', type: 'uuid' }),
    __metadata("design:type", String)
], UnderwritingRequest.prototype, "policyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'text', default: 'pending' }),
    __metadata("design:type", String)
], UnderwritingRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reason_code', type: 'text' }),
    __metadata("design:type", String)
], UnderwritingRequest.prototype, "reasonCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'input', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "input", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_item_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "workItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_item_saga_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "workItemSagaId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decision', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "decision", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decision_notes', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "decisionNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decided_by', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "decidedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'decided_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "decidedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'result', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_date', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlation_id', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingRequest.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], UnderwritingRequest.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], UnderwritingRequest.prototype, "updatedAt", void 0);
exports.UnderwritingRequest = UnderwritingRequest = __decorate([
    (0, typeorm_1.Entity)('underwriting_requests'),
    (0, typeorm_1.Index)(['policyId', 'createdAt']),
    (0, typeorm_1.Index)(['status', 'createdAt'])
], UnderwritingRequest);
