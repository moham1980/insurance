export class VaultSecretsLoader {
    config = null;
    cache = new Map();
    ttlMs = 300000;
    timestamps = new Map();
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
    isEnabled() {
        return this.config !== null;
    }
    async loadSecrets(path) {
        if (!this.config)
            return {};
        const secretPath = path || this.config.secretPath;
        if (!secretPath)
            return {};
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
                headers: { 'X-Vault-Token': this.config.token },
            });
            if (!response.ok) {
                console.error(`Vault request failed: ${response.status}`);
                return {};
            }
            const result = await response.json();
            const data = result?.data?.data || {};
            const secrets = {};
            for (const [key, value] of Object.entries(data)) {
                secrets[key] = String(value);
            }
            this.cache.set(cacheKey, secrets);
            this.timestamps.set(cacheKey, now);
            return secrets;
        }
        catch (error) {
            console.error(`Vault secrets load error: ${error.message}`);
            return {};
        }
    }
    async getSecret(key, path) {
        if (this.config) {
            const secrets = await this.loadSecrets(path);
            if (secrets[key] !== undefined)
                return secrets[key];
        }
        return process.env[key];
    }
    async mergeIntoEnv(path) {
        if (!this.config)
            return;
        const secrets = await this.loadSecrets(path);
        for (const [key, value] of Object.entries(secrets)) {
            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    }
    clearCache() {
        this.cache.clear();
        this.timestamps.clear();
    }
}
export const vaultSecrets = new VaultSecretsLoader();
//# sourceMappingURL=vault-secrets.js.map
