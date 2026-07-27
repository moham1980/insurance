export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 5, delayMs = 1000, backoff = true } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delay = backoff ? delayMs * attempt : delayMs;
        await wait(delay);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {}
): Promise<void> {
  const { timeoutMs = 30000, intervalMs = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await wait(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

export async function waitForUrl(
  url: string,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {}
): Promise<void> {
  await waitForCondition(
    async () => {
      try {
        const response = await fetch(url);
        return response.ok;
      } catch {
        return false;
      }
    },
    options
  );
}
