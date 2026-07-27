import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as soap from 'soap';
import { ISanhabClient, SanhabInquiryResponse, SanhabInquiryResultCode } from './sanhab-client.interface';

/**
 * Real Sanhab Client for production.
 * 
 * Integration requirements:
 * 1. Obtain API certificate from Central Insurance of Iran (بیمه مرکزی)
 * 2. Get WSDL endpoint URL for Sanhab SOAP services
 * 3. Register company and obtain API credentials
 * 4. Implement SOAP client using node-soap or similar library
 * 
 * Sanhab API documentation available at: https://sanhab.ir (official site)
 * 
 * Environment variables required:
 * - SANHAB_WSDL_URL: WSDL endpoint URL
 * - SANHAB_API_KEY: API key for authentication
 * - SANHAB_CERT_PATH: Path to client certificate (optional, for mutual TLS)
 * - SANHAB_CERT_KEY_PATH: Path to certificate private key (optional)
 * - SANHAB_CA_PATH: Path to CA certificate (optional)
 * - SANHAB_TIMEOUT_MS: Request timeout in milliseconds (default: 30000)
 */
export class RealSanhabClient implements ISanhabClient {
  private wsdlUrl: string;
  private apiKey: string;
  private certificatePath: string;
  private certificateKeyPath: string;
  private caPath: string;
  private timeoutMs: number;

  constructor() {
    this.wsdlUrl = process.env.SANHAB_WSDL_URL || '';
    this.apiKey = process.env.SANHAB_API_KEY || '';
    this.certificatePath = process.env.SANHAB_CERT_PATH || '';
    this.certificateKeyPath = process.env.SANHAB_CERT_KEY_PATH || '';
    this.caPath = process.env.SANHAB_CA_PATH || '';
    this.timeoutMs = parseInt(process.env.SANHAB_TIMEOUT_MS || '30000', 10);

    if (!this.wsdlUrl || !this.apiKey) {
      throw new Error('SANHAB_WSDL_URL and SANHAB_API_KEY must be configured for real Sanhab integration');
    }
  }

  async inquiryByNationalIdAndUniqueCode(params: {
    nationalId: string;
    uniqueCode: string;
  }): Promise<SanhabInquiryResponse> {
    try {
      const soapClient = await this.createSoapClient();
      
      const request = {
        NationalId: params.nationalId,
        UniqueCode: params.uniqueCode,
        ApiKey: this.apiKey,
        RequestId: this.generateRequestId(),
        Timestamp: new Date().toISOString(),
      };

      const result = await this.callSoapMethod(
        soapClient,
        'InquiryByNationalIdAndUniqueCode',
        request
      );

      return this.mapSoapResponse(result);
    } catch (error) {
      throw this.handleSoapError(error);
    }
  }

  async inquiryByPolicyNumber(params: {
    policyNumber: string;
  }): Promise<SanhabInquiryResponse> {
    try {
      const soapClient = await this.createSoapClient();
      
      const request = {
        PolicyNumber: params.policyNumber,
        ApiKey: this.apiKey,
        RequestId: this.generateRequestId(),
        Timestamp: new Date().toISOString(),
      };

      const result = await this.callSoapMethod(
        soapClient,
        'InquiryByPolicyNumber',
        request
      );

      return this.mapSoapResponse(result);
    } catch (error) {
      throw this.handleSoapError(error);
    }
  }

  async inquiryByVin(params: { vin: string }): Promise<SanhabInquiryResponse> {
    try {
      const soapClient = await this.createSoapClient();
      
      const request = {
        VehicleVin: params.vin,
        ApiKey: this.apiKey,
        RequestId: this.generateRequestId(),
        Timestamp: new Date().toISOString(),
      };

      const result = await this.callSoapMethod(
        soapClient,
        'InquiryByVin',
        request
      );

      return this.mapSoapResponse(result);
    } catch (error) {
      throw this.handleSoapError(error);
    }
  }

  private buildHttpsAgent(): https.Agent | undefined {
    if (!this.certificatePath || !this.certificateKeyPath) {
      return undefined;
    }
    if (!fs.existsSync(this.certificatePath) || !fs.existsSync(this.certificateKeyPath)) {
      throw new Error('Certificate files not found. Check SANHAB_CERT_PATH and SANHAB_CERT_KEY_PATH');
    }
    return new https.Agent({
      cert: fs.readFileSync(this.certificatePath),
      key: fs.readFileSync(this.certificateKeyPath),
      ca: this.caPath ? fs.readFileSync(this.caPath) : undefined,
      rejectUnauthorized: true,
    });
  }

  private customRequest(agent?: https.Agent): any {
    return (url: string, options: any, callback: (err: any, res?: any, body?: any) => void, _exheaders?: any, _exopts?: any) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      const requestOptions: http.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: `${urlObj.pathname}${urlObj.search}`,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: this.timeoutMs,
        agent: agent,
      };

      const req = client.request(requestOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          callback(null, res, body);
        });
      });

      req.on('error', (err) => callback(err));
      req.on('timeout', () => {
        req.destroy();
        callback(new Error('Sanhab service timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    };
  }

  private async createSoapClient(): Promise<any> {
    const agent = this.buildHttpsAgent();
    const options: any = {
      endpoint: this.wsdlUrl,
      request: this.customRequest(agent),
    };

    return new Promise((resolve, reject) => {
      soap.createClient(this.wsdlUrl, options, (err: any, client: any) => {
        if (err) {
          reject(new Error(`Failed to create SOAP client: ${err.message}`));
          return;
        }
        // Ensure subsequent SOAP method calls use the same TLS/timeout config
        resolve(client);
      });
    });
  }

  private async callSoapMethod(client: any, methodName: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      client[methodName](
        request,
        (err: any, result: any, rawResponse: any, soapHeader: any, rawRequest: any) => {
          if (err) {
            reject(new Error(`SOAP method ${methodName} failed: ${err.message}`));
            return;
          }
          resolve(result);
        },
        { request: this.customRequest(this.buildHttpsAgent()) }
      );
    });
  }

  private mapSoapResponse(soapResult: any): SanhabInquiryResponse {
    // Sanhab response structure may vary - this is a common structure
    const result = soapResult?.return || soapResult;
    
    return {
      resultCode: this.mapResultCode(result?.ResultCode || result?.resultCode || '99'),
      policyNumber: result?.PolicyNumber || result?.policyNumber || null,
      uniqueCode: result?.UniqueCode || result?.uniqueCode || null,
      insuredNationalId: result?.InsuredNationalId || result?.insuredNationalId || null,
      vehicleVin: result?.VehicleVin || result?.vehicleVin || null,
      insurerCode: result?.InsurerCode || result?.insurerCode || null,
      issueDate: result?.IssueDate || result?.issueDate ? (result.IssueDate || result.issueDate).toString() : undefined,
      expiryDate: result?.ExpiryDate || result?.expiryDate ? (result.ExpiryDate || result.expiryDate).toString() : undefined,
      errorMessage: result?.ErrorMessage || result?.errorMessage || null,
    };
  }

  private mapResultCode(code: string): SanhabInquiryResultCode {
    const mapping: Record<string, SanhabInquiryResultCode> = {
      '0': 'OK',
      '1': 'NOT_FOUND',
      '2': 'MISMATCH',
      '3': 'PENDING_SYNC',
      '4': 'UPSTREAM_ERROR',
      '5': 'UPSTREAM_ERROR',
      '99': 'UPSTREAM_ERROR',
      'OK': 'OK',
      'NOT_FOUND': 'NOT_FOUND',
      'MISMATCH': 'MISMATCH',
      'PENDING_SYNC': 'PENDING_SYNC',
      'UPSTREAM_ERROR': 'UPSTREAM_ERROR',
    };
    return mapping[code] || 'UPSTREAM_ERROR';
  }

  private handleSoapError(error: any): Error {
    if (error.code === 'ECONNREFUSED') {
      return new Error('Sanhab service is unavailable (connection refused)');
    }
    if (error.code === 'ETIMEDOUT') {
      return new Error('Sanhab service timeout');
    }
    if (error.code === 'ENOTFOUND') {
      return new Error('Sanhab service endpoint not found');
    }
    
    // Return original error if it's already a custom error
    if (error.message && error.message.includes('Sanhab')) {
      return error;
    }
    
    return new Error(`Sanhab integration error: ${error.message}`);
  }

  private generateRequestId(): string {
    return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Health check for Sanhab connection
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string; latencyMs?: number }> {
    const startTime = Date.now();
    try {
      const client = await this.createSoapClient();
      await this.callSoapMethod(client, 'Ping', { ApiKey: this.apiKey });
      const latencyMs = Date.now() - startTime;
      return { healthy: true, message: 'Sanhab service is reachable', latencyMs };
    } catch (error: any) {
      return { healthy: false, message: `Sanhab service error: ${error?.message || String(error)}` };
    }
  }
}
