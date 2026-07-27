/**
 * Formal API Error Contract for @insurance/shared
 * Standardizes error responses across all microservices.
 */

import { ApiResponse } from './types';
export { ApiResponse } from './types';

export interface ApiError {
  /** Machine-readable error code */
  code: string;
  /** Human-readable description */
  message: string;
  /** Optional structured error details for validation errors */
  details?: Array<{ field: string; message: string; code?: string }>;
  /** Link to documentation or remediation guidance */
  docUrl?: string;
}

export interface EnrichedApiResponse<T = unknown> extends ApiResponse<T> {
  /** Optional pagination metadata */
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

export class ApiErrorException extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: ApiError['details'];

  constructor(params: { code: string; message: string; statusCode?: number; details?: ApiError['details'] }) {
    super(params.message);
    this.code = params.code;
    this.statusCode = params.statusCode || 500;
    this.details = params.details;
    Error.captureStackTrace(this, ApiErrorException);
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/** Common error codes used across services */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INVALID_STATE: 'INVALID_STATE',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PSP_INITIATE_FAILED: 'PSP_INITIATE_FAILED',
  QUALITY_GATE_FAILED: 'QUALITY_GATE_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** Build a standardized success response */
export function successResponse<T>(data: T, correlationId: string): ApiResponse<T> {
  return { success: true, data, correlationId };
}

/** Build a standardized error response */
export function errorResponse(code: string, message: string, correlationId: string, details?: ApiError['details']): ApiResponse<never> {
  return { success: false, error: { code, message, details }, correlationId };
}
