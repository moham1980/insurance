/**
 * Insurance API Client
 * Generated from OpenAPI specifications.
 * TODO: Replace with actual generated clients once OpenAPI specs are finalized.
 */

export interface ApiError {
  statusCode: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Typed fetch wrapper with error handling.
 */
export async function typedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ApiError;
    throw new ApiClientError(
      errorData.message || `HTTP ${response.status}`,
      response.status,
      errorData.code,
      errorData.details
    );
  }

  return response.json() as Promise<T>;
}
