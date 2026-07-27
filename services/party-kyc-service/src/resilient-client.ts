import { Logger } from '@nestjs/common';

export interface ResilientFetchOptions {
  url: string;
  init: RequestInit;
  idempotencyKey?: string;
  retries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  logger?: Logger;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resilientFetch(options: ResilientFetchOptions): Promise<Response> {
  const { url, init, retries = 3, baseDelayMs = 500, timeoutMs = 10000, logger } = options;

  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = new Headers(init.headers || {});
      if (options.idempotencyKey) headers.set('x-idempotency-key', options.idempotencyKey);

      const res = await fetch(url, { ...init, headers: Object.fromEntries(headers), signal: controller.signal });
      clearTimeout(timeoutHandle);

      if (!res.ok && attempt < retries) {
        const status = res.status;
        if (status >= 500 || status === 429 || status === 408 || status === 0) {
          const delay = baseDelayMs * 2 ** attempt;
          logger?.warn(`Provider ${url} returned ${status}; retry ${attempt + 1}/${retries} in ${delay}ms`);
          await sleep(delay);
          continue;
        }
        return res;
      }
      return res;
    } catch (error: any) {
      clearTimeout(timeoutHandle);
      lastError = error;
      if (error.name === 'AbortError' || error.message?.includes('fetch')) {
        if (attempt < retries) {
          const delay = baseDelayMs * 2 ** attempt;
          logger?.warn(`Provider ${url} attempt ${attempt + 1} failed: ${error.message}; retry in ${delay}ms`);
          await sleep(delay);
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError || new Error(`Provider ${url} failed after ${retries + 1} attempts`);
}
