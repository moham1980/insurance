export class AssertionHelpers {
  static assertApiContract(response: any, expectedFields: string[]): void {
    for (const field of expectedFields) {
      if (!(field in response)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  static assertEventEnvelope(event: any): void {
    const requiredFields = ['eventType', 'eventId', 'occurredAt', 'tenantId', 'payload'];
    this.assertApiContract(event, requiredFields);

    if (typeof event.occurredAt !== 'string' || !Date.parse(event.occurredAt)) {
      throw new Error('Invalid occurredAt format');
    }

    if (typeof event.eventId !== 'string' || event.eventId.length === 0) {
      throw new Error('Invalid eventId');
    }
  }

  static assertAuditTrail(audit: any): void {
    const requiredFields = ['tenantId', 'actorUserId', 'action', 'status', 'timestamp'];
    this.assertApiContract(audit, requiredFields);
  }

  static assertCorrelationId(response: any, expectedCorrelationId: string): void {
    if (response.correlationId !== expectedCorrelationId) {
      throw new Error(
        `Correlation ID mismatch: expected ${expectedCorrelationId}, got ${response.correlationId}`
      );
    }
  }

  static assertSuccessResponse(response: any): void {
    if (response.success !== true) {
      throw new Error(`Expected success response, got: ${JSON.stringify(response)}`);
    }
  }

  static assertErrorResponse(response: any, expectedErrorCode?: string): void {
    if (response.success !== false) {
      throw new Error(`Expected error response, got success`);
    }

    if (expectedErrorCode && response.error?.code !== expectedErrorCode) {
      throw new Error(
        `Expected error code ${expectedErrorCode}, got ${response.error?.code}`
      );
    }
  }

  static assertPagination(response: any): void {
    if (!response.pagination) {
      throw new Error('Missing pagination info');
    }

    const { total, limit, offset } = response.pagination;
    if (typeof total !== 'number' || total < 0) {
      throw new Error('Invalid pagination total');
    }
    if (typeof limit !== 'number' || limit <= 0) {
      throw new Error('Invalid pagination limit');
    }
    if (typeof offset !== 'number' || offset < 0) {
      throw new Error('Invalid pagination offset');
    }
  }

  static assertTenantId(response: any, expectedTenantId: string): void {
    if (response.data?.tenantId !== expectedTenantId) {
      throw new Error(
        `Tenant ID mismatch: expected ${expectedTenantId}, got ${response.data?.tenantId}`
      );
    }
  }
}
