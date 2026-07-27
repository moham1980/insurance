var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryColumn, Column, Index } from 'typeorm';
let ConsumedEvent = class ConsumedEvent {
    eventId;
    consumerName;
    consumedAt;
    topic;
};
__decorate([
    PrimaryColumn({ name: 'event_id', type: 'uuid' }),
    __metadata("design:type", String)
], ConsumedEvent.prototype, "eventId", void 0);
__decorate([
    PrimaryColumn({ name: 'consumer_name', type: 'text' }),
    __metadata("design:type", String)
], ConsumedEvent.prototype, "consumerName", void 0);
__decorate([
    Column({ name: 'consumed_at', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], ConsumedEvent.prototype, "consumedAt", void 0);
__decorate([
    Column({ name: 'topic', type: 'text' }),
    __metadata("design:type", String)
], ConsumedEvent.prototype, "topic", void 0);
ConsumedEvent = __decorate([
    Entity('consumed_events'),
    Index(['consumedAt'])
], ConsumedEvent);
export { ConsumedEvent };
//# sourceMappingURL=ConsumedEvent.js.map