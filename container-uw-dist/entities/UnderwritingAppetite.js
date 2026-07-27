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
exports.UnderwritingAppetite = void 0;
const typeorm_1 = require("typeorm");
let UnderwritingAppetite = class UnderwritingAppetite {
    id;
    lineOfBusiness;
    productId;
    riskLevel;
    decision;
    maxSumInsured;
    maxPremium;
    authorityLevel; // e.g., 'junior', 'senior', 'committee'
    approverRole;
    slaHours;
    active;
    createdAt;
    updatedAt;
};
exports.UnderwritingAppetite = UnderwritingAppetite;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UnderwritingAppetite.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], UnderwritingAppetite.prototype, "lineOfBusiness", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingAppetite.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['low', 'medium', 'high', 'critical'] }),
    __metadata("design:type", String)
], UnderwritingAppetite.prototype, "riskLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['auto_accept', 'auto_reject', 'refer'] }),
    __metadata("design:type", String)
], UnderwritingAppetite.prototype, "decision", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingAppetite.prototype, "maxSumInsured", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingAppetite.prototype, "maxPremium", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingAppetite.prototype, "authorityLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UnderwritingAppetite.prototype, "approverRole", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], UnderwritingAppetite.prototype, "slaHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], UnderwritingAppetite.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], UnderwritingAppetite.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], UnderwritingAppetite.prototype, "updatedAt", void 0);
exports.UnderwritingAppetite = UnderwritingAppetite = __decorate([
    (0, typeorm_1.Entity)('underwriting_appetite'),
    (0, typeorm_1.Index)(['lineOfBusiness', 'productId'])
], UnderwritingAppetite);
