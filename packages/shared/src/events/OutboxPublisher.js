import { OutboxEvent } from './OutboxEvent';
import { v4 as uuidv4 } from 'uuid';
export class OutboxPublisher {
    outboxRepo;
    constructor(dataSourceOrManager) {
        this.outboxRepo = dataSourceOrManager.getRepository(OutboxEvent);
    }
    async publish(options) {
        const eventId = uuidv4();
        const occurredAt = new Date();
        const outboxEvent = this.outboxRepo.create({
            id: eventId,
            occurredAt,
            topic: options.topic,
            eventType: options.eventType,
            eventVersion: options.eventVersion,
            correlationId: options.correlationId,
            subjectJson: options.subject,
            payloadJson: options.payload,
            status: 'pending',
            attemptCount: 0,
        });
        await this.outboxRepo.save(outboxEvent);
        return eventId;
    }
    async markAsSent(eventId) {
        await this.outboxRepo.update({ id: eventId }, { status: 'sent' });
    }
    async markAsFailed(eventId, errorMessage) {
        await this.outboxRepo.update({ id: eventId }, {
            status: 'failed',
            errorMessage,
            attemptCount: () => '"attempt_count" + 1'
        });
    }
    async getPendingEvents(limit = 100) {
        return this.outboxRepo.find({
            where: { status: 'pending' },
            order: { occurredAt: 'ASC' },
            take: limit,
        });
    }
    async getFailedEvents(limit = 100) {
        return this.outboxRepo.find({
            where: { status: 'failed' },
            order: { occurredAt: 'ASC' },
            take: limit,
        });
    }
}
//# sourceMappingURL=OutboxPublisher.js.map