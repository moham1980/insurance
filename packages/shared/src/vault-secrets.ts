import * as fs from 'fs';
import * as https from 'https';

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
 * - VAULT_CLIENT_CERT: Path to client certificate for mTLS
 * - VAULT_CLIENT_KEY: Path to client private key for mTLS
 * - VAULT_CA_CERT: Path to CA certificate for mTLS
 * - VAULT_TOKEN_RENEWABLE: Set to `true` to enable token renew-self
 * - VAULT_TOKEN_RENEW_INTERVAL_MS: Token renewal interval in ms (default: 300000)
 */

export interface VaultConfig {
  addr: string;
  token: string;
  mountPath: string;
  secretPath: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  caCertPath?: string;
  renewable?: boolean;
  renewIntervalMs?: number;
}

export class VaultSecretsLoader {
  private config: VaultConfig | null = null;
  private cache: Map<string, Record<string, string>> = new Map();
  private ttlMs: number = 300000;
  private timestamps: Map<string, number> = new Map();
  private agent?: https.Agent;
  private tokenRenewTimer?: ReturnType<typeof setInterval>;

  constructor() {
    const addr = process.env.VAULT_ADDR;
    const token = process.env.VAULT_TOKEN;
    if (addr && token) {
      this.config = {
        addr,
        token,
        mountPath: process.env.VAULT_MOUNT_PATH || 'secret',
        secretPath: process.env.VAULT_SECRET_PATH || '',
        clientCertPath: process.env.VAULT_CLIENT_CERT,
        clientKeyPath: process.env.VAULT_CLIENT_KEY,
        caCertPath: process.env.VAULT_CA_CERT,
        renewable: process.env.VAULT_TOKEN_RENEWABLE === 'true',
        renewIntervalMs: parseInt(process.env.VAULT_TOKEN_RENEW_INTERVAL_MS || '300000', 10),
      };

      this.agent = this.createAgent();

      if (this.config.renewable) {
        this.startTokenRenewal(this.config.renewIntervalMs || 300000);
      }
    }
  }

  private createAgent(): https.Agent | undefined {
    if (!this.config) return undefined;

    const cert = this.config.clientCertPath && fs.existsSync(this.config.clientCertPath)
      ? fs.readFileSync(this.config.clientCertPath)
      : undefined;
    const key = this.config.clientKeyPath && fs.existsSync(this.config.clientKeyPath)
      ? fs.readFileSync(this.config.clientKeyPath)
      : undefined;
    const ca = this.config.caCertPath && fs.existsSync(this.config.caCertPath)
      ? fs.readFileSync(this.config.caCertPath)
      : undefined;

    if (!cert || !key) return undefined;

    return new https.Agent({ cert, key, ca });
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
      const fetchOptions: any = {
        method: 'GET',
        headers: {
          'X-Vault-Token': this.config.token,
        },
      };

      if (this.agent) {
        fetchOptions.agent = this.agent;
      }

      const response = await fetch(url, fetchOptions);

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
   * Renew the Vault token via /auth/token/renew-self.
   */
  async renewToken(): Promise<void> {
    if (!this.config) return;

    try {
      const url = `${this.config.addr}/v1/auth/token/renew-self`;
      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.config.token,
        },
      };

      if (this.agent) {
        fetchOptions.agent = this.agent;
      }

      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        console.error(`Vault token renewal failed: ${response.status}`);
        return;
      }

      const result = await response.json() as any;
      const newToken = result?.auth?.client_token;
      const leaseDuration = result?.auth?.lease_duration;

      if (newToken) {
        this.config.token = newToken;
        if (process.env.VAULT_TOKEN === undefined) {
          process.env.VAULT_TOKEN = newToken;
        }
      }

      if (leaseDuration && this.tokenRenewTimer) {
        const nextInterval = Math.max(leaseDuration * 1000 / 2, 60000);
        this.stopTokenRenewal();
        this.startTokenRenewal(nextInterval);
      }
    } catch (error: any) {
      console.error(`Vault token renewal error: ${error.message}`);
    }
  }

  /**
   * Start periodic token renewal.
   */
  startTokenRenewal(intervalMs: number): void {
    this.stopTokenRenewal();
    this.tokenRenewTimer = setInterval(() => {
      this.renewToken().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stop periodic token renewal.
   */
  stopTokenRenewal(): void {
    if (this.tokenRenewTimer) {
      clearInterval(this.tokenRenewTimer);
      this.tokenRenewTimer = undefined;
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
