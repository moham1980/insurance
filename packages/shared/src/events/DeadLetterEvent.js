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
let DeadLetterEvent = class DeadLetterEvent {
    dlqId;
    originalEventId;
    topic;
    partition;
    offset;
    key;
    value;
    headers;
    errorMessage;
    errorStack;
    consumerGroup;
    retryCount;
    maxRetries;
    status;
    nextRetryAt;
    lastErrorAt;
    resolvedAt;
    createdAt;
};
__decorate([
    PrimaryGeneratedColumn('uuid', { name: 'dlq_id' }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "dlqId", void 0);
__decorate([
    Column({ name: 'original_event_id', type: 'text' }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "originalEventId", void 0);
__decorate([
    Column({ name: 'topic', type: 'text' }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "topic", void 0);
__decorate([
    Column({ name: 'partition', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], DeadLetterEvent.prototype, "partition", void 0);
__decorate([
    Column({ name: 'offset', type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "offset", void 0);
__decorate([
    Column({ name: 'key', type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "key", void 0);
__decorate([
    Column({ name: 'value', type: 'jsonb' }),
    __metadata("design:type", Object)
], DeadLetterEvent.prototype, "value", void 0);
__decorate([
    Column({ name: 'headers', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], DeadLetterEvent.prototype, "headers", void 0);
__decorate([
    Column({ name: 'error_message', type: 'text' }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "errorMessage", void 0);
__decorate([
    Column({ name: 'error_stack', type: 'text', nullable: true }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "errorStack", void 0);
__decorate([
    Column({ name: 'consumer_group', type: 'text' }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "consumerGroup", void 0);
__decorate([
    Column({ name: 'retry_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], DeadLetterEvent.prototype, "retryCount", void 0);
__decorate([
    Column({ name: 'max_retries', type: 'int', default: 3 }),
    __metadata("design:type", Number)
], DeadLetterEvent.prototype, "maxRetries", void 0);
__decorate([
    Column({ name: 'status', type: 'text', default: 'pending' }),
    __metadata("design:type", String)
], DeadLetterEvent.prototype, "status", void 0);
__decorate([
    Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], DeadLetterEvent.prototype, "nextRetryAt", void 0);
__decorate([
    Column({ name: 'last_error_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], DeadLetterEvent.prototype, "lastErrorAt", void 0);
__decorate([
    Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], DeadLetterEvent.prototype, "resolvedAt", void 0);
__decorate([
    Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], DeadLetterEvent.prototype, "createdAt", void 0);
DeadLetterEvent = __decorate([
    Entity('dead_letter_queue'),
    Index(['topic', 'status']),
    Index(['retryCount', 'nextRetryAt']),
    Index(['createdAt'])
], DeadLetterEvent);
export { DeadLetterEvent };
//# sourceMappingURL=DeadLetterEvent.js.map