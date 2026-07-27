import { DataSource } from 'typeorm';

export type ConsumeOnceParams<TPayload> = {
  dataSource: DataSource;
  consumerName: string;
  topic: string;
  eventId: string;
  handler: () => Promise<TPayload>;
};

export type ConsumeOnceResult<T> =
  | { consumed: true; result: T }
  | { consumed: false; reason: 'DUPLICATE' };

export type MarkConsumedParams = {
  dataSource: DataSource;
  consumerName: string;
  topic: string;
  eventId: string;
};

export async function markConsumed(params: MarkConsumedParams): Promise<boolean> {
  const inserted = await params.dataSource.query(
    `
    INSERT INTO consumed_events(event_id, consumer_name, consumed_at, topic)
    VALUES ($1, $2, NOW(), $3)
    ON CONFLICT (event_id, consumer_name) DO NOTHING
    RETURNING event_id;
    `,
    [params.eventId, params.consumerName, params.topic]
  );

  return Array.isArray(inserted) && inserted.length > 0;
}

export async function consumeOnce<T>(params: ConsumeOnceParams<T>): Promise<ConsumeOnceResult<T>> {
  return await params.dataSource.transaction(async (manager) => {
    const inserted = await manager.query(
      `
      INSERT INTO consumed_events(event_id, consumer_name, consumed_at, topic)
      VALUES ($1, $2, NOW(), $3)
      ON CONFLICT (event_id, consumer_name) DO NOTHING
      RETURNING event_id;
      `,
      [params.eventId, params.consumerName, params.topic]
    );

    if (!Array.isArray(inserted) || inserted.length === 0) {
      return { consumed: false, reason: 'DUPLICATE' };
    }

    const result = await params.handler();
    return { consumed: true, result };
  });
}
