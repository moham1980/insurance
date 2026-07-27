/**
 * VaultSecretsLoader
 * Loads secrets from HashiCorp Vault when VAULT_ADDR is configured.
 * Falls back to environment variables when Vault is not available.
 *
 * Environment variables:
 * - VAULT_ADDR: Vault server URL (e.g. http://localhost:8200)
 * - VAULT_TOKEN: Vault authentication token
 * - VAULT_MOUNT_PATH: KV mount path (default: secret)
 * - VAULT_SECRET_PATH: Path to the secret within the mount (e.g. insurance/payments)
 */

export interface VaultConfig {
  addr: string;
  token: string;
  mountPath: string;
  secretPath: string;
}

export class VaultSecretsLoader {
  private config: VaultConfig | null = null;
  private cache: Map<string, Record<string, string>> = new Map();
  private ttlMs: number = 300000;
  private timestamps: Map<string, number> = new Map();

  constructor() {
    const addr = process.env.VAULT_ADDR;
    const token = process.env.VAULT_TOKEN;
    if (addr && token) {
      this.config = {
        addr,
        token,
        mountPath: process.env.VAULT_MOUNT_PATH || 'secret',
        secretPath: process.env.VAULT_SECRET_PATH || '',
      };
    }
  }

  isEnabled(): boolean {
    return this.config !== null;
  }

  async loadSecrets(path?: string): Promise<Record<string, string>> {
    if (!this.config) return {};

    const secretPath = path || this.config.secretPath;
    if (!secretPath) return {};

    const cacheKey = `${this.config.mountPath}/${secretPath}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    const cachedAt = this.timestamps.get(cacheKey);

    if (cached && cachedAt && now - cachedAt < this.ttlMs) {
      return cached;
    }

    try {
      const url = `${this.config.addr}/v1/${this.config.mountPath}/data/${secretPath}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Vault-Token': this.config.token,
        },
      });

      if (!response.ok) {
        console.error(`Vault request failed: ${response.status}`);
        return {};
      }

      const result = await response.json() as any;
      const data = result?.data?.data || {};
      const secrets: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        secrets[key] = String(value);
      }

      this.cache.set(cacheKey, secrets);
      this.timestamps.set(cacheKey, now);

      return secrets;
    } catch (error: any) {
      console.error(`Vault secrets load error: ${error.message}`);
      return {};
    }
  }

  /**
   * Get a secret value with fallback to environment variable.
   */
  async getSecret(key: string, path?: string): Promise<string | undefined> {
    if (this.config) {
      const secrets = await this.loadSecrets(path);
      if (secrets[key] !== undefined) return secrets[key];
    }
    return process.env[key];
  }

  /**
   * Merge Vault secrets into process.env.
   * Called at startup before services initialize.
   */
  async mergeIntoEnv(path?: string): Promise<void> {
    if (!this.config) return;
    const secrets = await this.loadSecrets(path);
    for (const [key, value] of Object.entries(secrets)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.timestamps.clear();
  }
}

export const vaultSecrets = new VaultSecretsLoader();
