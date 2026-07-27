import { DataSource } from 'typeorm';
export type ConsumeOnceParams<TPayload> = {
    dataSource: DataSource;
    consumerName: string;
    topic: string;
    eventId: string;
    handler: () => Promise<TPayload>;
};
export type ConsumeOnceResult<T> = {
    consumed: true;
    result: T;
} | {
    consumed: false;
    reason: 'DUPLICATE';
};
export type MarkConsumedParams = {
    dataSource: DataSource;
    consumerName: string;
    topic: string;
    eventId: string;
};
export declare function markConsumed(params: MarkConsumedParams): Promise<boolean>;
export declare function consumeOnce<T>(params: ConsumeOnceParams<T>): Promise<ConsumeOnceResult<T>>;
