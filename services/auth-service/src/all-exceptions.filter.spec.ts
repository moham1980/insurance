import { AllExceptionsFilter } from '../../common/src/all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Tests for the shared AllExceptionsFilter.
 *
 * These tests verify that the filter never leaks internal exception details
 * (stack traces, connection strings, driver messages) to the API consumer
 * and that error codes are mapped correctly for all standard HTTP statuses.
 *
 * Note: The auth-service uses `bun test` (not Jest). These tests are
 * Jest/bun-compatible and can be run with either runner once configured.
 */

function createMockHost(headers: Record<string, string> = {}) {
  const responseBody: any = {};
  const responseHeaders: Record<string, string> = {};
  const mockResponse: any = {
    header: (key: string, value: string) => {
      responseHeaders[key] = value;
    },
    status: (code: number) => ({
      send: (body: any) => {
        responseBody.body = body;
        responseBody.statusCode = code;
        return mockResponse;
      },
    }),
    json: (body: any) => {
      responseBody.body = body;
      responseBody.statusCode = 200;
    },
  };
  const mockRequest: any = {
    headers,
    url: '/auth/login',
  };
  const mockHost: any = {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  };
  return { mockHost, responseBody, responseHeaders };
}

describe('AllExceptionsFilter', () => {
  it('should return safe error envelope without stack trace for generic Error', () => {
    const filter = new AllExceptionsFilter();
    const { mockHost, responseBody } = createMockHost({
      'x-trace-id': 'test-trace-001',
    });
    const exception = new Error(
      'Internal DB connection failed: postgres://user:pass@host:5432',
    );

    filter.catch(exception, mockHost as any);

    expect(responseBody.body.success).toBe(false);
    expect(responseBody.body.error.code).toBe('INTERNAL_ERROR');
    // Safe message must not contain internal details
    expect(responseBody.body.error.message).not.toContain('postgres');
    expect(responseBody.body.error.message).not.toContain('pass');
    expect(responseBody.body.error.message).not.toContain('Internal DB');
    // Correlation ID propagated
    expect(responseBody.body.correlationId).toBe('test-trace-001');
    // No stack trace in the serialized response
    const serialized = JSON.stringify(responseBody.body);
    expect(serialized).not.toContain('stack');
    expect(serialized).not.toContain('at ');
  });

  it('should map 400 HttpException to VALIDATION_ERROR and preserve safe message', () => {
    const filter = new AllExceptionsFilter();
    const { mockHost, responseBody } = createMockHost({
      'x-trace-id': 'test-trace-400',
    });
    const exception = new HttpException('Bad request data', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost as any);

    expect(responseBody.body.error.code).toBe('VALIDATION_ERROR');
    // 4xx messages are controller-authored and safe to expose
    expect(responseBody.body.error.message).toContain('Bad request data');
  });

  it('should map 502 HttpException to DOWNSTREAM_ERROR with safe message', () => {
    const filter = new AllExceptionsFilter();
    const { mockHost, responseBody } = createMockHost({
      'x-trace-id': 'test-trace-502',
    });
    const exception = new HttpException(
      'upstream timeout at internal-host:9090',
      HttpStatus.BAD_GATEWAY,
    );

    filter.catch(exception, mockHost as any);

    expect(responseBody.body.error.code).toBe('DOWNSTREAM_ERROR');
    // 5xx must NOT leak the internal message
    expect(responseBody.body.error.message).not.toContain('internal-host');
    expect(responseBody.body.error.message).not.toContain('9090');
    expect(responseBody.body.error.message).not.toContain('upstream timeout');
  });

  it('should map 504 HttpException to TIMEOUT', () => {
    const filter = new AllExceptionsFilter();
    const { mockHost, responseBody } = createMockHost({
      'x-trace-id': 'test-trace-504',
    });
    const exception = new HttpException(
      'gateway timeout after 30s',
      HttpStatus.GATEWAY_TIMEOUT,
    );

    filter.catch(exception, mockHost as any);

    expect(responseBody.body.error.code).toBe('TIMEOUT');
    expect(responseBody.body.error.message).not.toContain('30s');
  });

  it('should generate a correlation ID when no trace header is present', () => {
    const filter = new AllExceptionsFilter();
    const { mockHost, responseBody } = createMockHost({});

    filter.catch(new Error('boom'), mockHost as any);

    expect(responseBody.body.correlationId).toBeTruthy();
    expect(typeof responseBody.body.correlationId).toBe('string');
    expect(responseBody.body.correlationId.length).toBeGreaterThan(0);
  });

  it('should set X-Correlation-Id response header for Fastify responses', () => {
    const filter = new AllExceptionsFilter();
    const { mockHost, responseHeaders } = createMockHost({
      'x-trace-id': 'header-test-001',
    });

    filter.catch(new Error('boom'), mockHost as any);

    expect(responseHeaders['X-Correlation-Id']).toBe('header-test-001');
  });
});
