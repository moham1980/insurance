var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
let OutboxEvent = class OutboxEvent {
    id;
    occurredAt;
    topic;
    eventType;
    eventVersion;
    correlationId;
    subjectJson;
    payloadJson;
    status;
    attemptCount;
    errorMessage;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], OutboxEvent.prototype, "id", void 0);
__decorate([
    Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], OutboxEvent.prototype, "occurredAt", void 0);
__decorate([
    Column({ name: 'topic', type: 'text' }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "topic", void 0);
__decorate([
    Column({ name: 'event_type', type: 'text' }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "eventType", void 0);
__decorate([
    Column({ name: 'event_version', type: 'int' }),
    __metadata("design:type", Number)
], OutboxEvent.prototype, "eventVersion", void 0);
__decorate([
    Column({ name: 'correlation_id', type: 'text' }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "correlationId", void 0);
__decorate([
    Column({ name: 'subject_json', type: 'jsonb' }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "subjectJson", void 0);
__decorate([
    Column({ name: 'payload_json', type: 'jsonb' }),
    __metadata("design:type", Object)
], OutboxEvent.prototype, "payloadJson", void 0);
__decorate([
    Column({ name: 'status', type: 'text', default: 'pending' }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "status", void 0);
__decorate([
    Column({ name: 'attempt_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], OutboxEvent.prototype, "attemptCount", void 0);
__decorate([
    Column({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], OutboxEvent.prototype, "errorMessage", void 0);
OutboxEvent = __decorate([
    Entity('outbox_events'),
    Index(['status', 'occurredAt']),
    Index(['correlationId'])
], OutboxEvent);
export { OutboxEvent };
//# sourceMappingURL=OutboxEvent.js.map