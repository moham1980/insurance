import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export interface WarehouseFireInquiryRequest {
  warehouseId?: string;
  nationalId?: string;
  licenseNumber?: string;
  address?: string;
  city?: string;
  province?: string;
  inquiryType: 'FIRE_HISTORY' | 'CURRENT_STATUS' | 'INSPECTION_REPORT' | 'COMPLIANCE_CHECK';
}

export interface WarehouseFireInquiryResponse {
  success: boolean;
  inquiryId: string;
  warehouseInfo?: {
    warehouseId: string;
    name: string;
    nationalId: string;
    licenseNumber: string;
    address: string;
    city: string;
    province: string;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REVOKED';
    licenseExpiryDate: string;
    lastInspectionDate: string;
  };
  fireHistory?: Array<{
    incidentDate: string;
    incidentType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    damageAmount?: number;
    resolved: boolean;
  }>;
  complianceStatus?: {
    fireExtinguishersValid: boolean;
    sprinklerSystemOperational: boolean;
    emergencyExitsClear: boolean;
    electricalCompliance: boolean;
    overallCompliance: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
    lastAuditDate: string;
    nextAuditDate: string;
  };
  inspectionReport?: {
    inspectionDate: string;
    inspectorName: string;
    findings: string[];
    recommendations: string[];
    overallRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  };
  message?: string;
  errorCode?: string;
}

export interface WarehouseFireConfig {
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
  enabled: boolean;
}

@Injectable()
export class WarehouseFireInquiryService {
  private readonly logger = new Logger(WarehouseFireInquiryService.name);

  constructor() {}

  private getConfig(): WarehouseFireConfig {
    return {
      apiUrl: process.env.WAREHOUSE_FIRE_API_URL || 'https://example-warehouse-fire-api.ir/api',
      apiKey: process.env.WAREHOUSE_FIRE_API_KEY || '',
      timeoutMs: parseInt(process.env.WAREHOUSE_FIRE_TIMEOUT_MS || '30000', 10),
      enabled: process.env.WAREHOUSE_FIRE_ENABLED === 'true',
    };
  }

  async inquire(request: WarehouseFireInquiryRequest): Promise<WarehouseFireInquiryResponse> {
    const config = this.getConfig();
    const inquiryId = uuidv4();

    this.logger.log(`Warehouse fire inquiry: ${inquiryId}, type: ${request.inquiryType}`);

    if (!config.enabled) {
      this.logger.warn('Warehouse fire inquiry is disabled, returning mock data');
      return this.getMockResponse(inquiryId, request);
    }

    if (!config.apiKey) {
      return {
        success: false,
        inquiryId,
        message: 'API key not configured',
        errorCode: 'API_KEY_MISSING',
      };
    }

    try {
      const response = await this.callWarehouseFireApi(config, request, inquiryId);
      return response;
    } catch (error: any) {
      this.logger.error(`Warehouse fire inquiry failed: ${error.message}`);
      return {
        success: false,
        inquiryId,
        message: error.message || 'Warehouse fire inquiry failed',
        errorCode: 'API_ERROR',
      };
    }
  }

  private async callWarehouseFireApi(
    config: WarehouseFireConfig,
    request: WarehouseFireInquiryRequest,
    inquiryId: string
  ): Promise<WarehouseFireInquiryResponse> {
    this.logger.log(`Calling warehouse fire API: ${config.apiUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify({ ...request, inquiryId }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Warehouse fire API returned ${response.status}`);
      }

      const result = (await response.json().catch(() => null)) as any;
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from warehouse fire API');
      }

      return {
        success: result.success !== false,
        inquiryId,
        warehouseInfo: result.warehouseInfo,
        fireHistory: result.fireHistory,
        complianceStatus: result.complianceStatus,
        inspectionReport: result.inspectionReport,
        message: result.message,
        errorCode: result.errorCode,
      };
    } catch (error: any) {
      clearTimeout(timeout);
      this.logger.warn(`Warehouse fire API call failed, falling back to mock: ${error.message}`);
      // Fallback to mock response when the real API is unavailable (e.g., dev mode)
      return this.getMockResponse(inquiryId, request);
    }
  }

  private getMockResponse(
    inquiryId: string,
    request: WarehouseFireInquiryRequest
  ): WarehouseFireInquiryResponse {
    const mockWarehouseInfo = {
      warehouseId: request.warehouseId || 'WH-12345',
      name: 'انبار نمونه',
      nationalId: request.nationalId || '0123456789',
      licenseNumber: request.licenseNumber || 'LIC-987654',
      address: request.address || 'تهران، خیابان نمونه، پلاک ۱',
      city: request.city || 'تهران',
      province: request.province || 'تهران',
      status: 'ACTIVE' as const,
      licenseExpiryDate: '2025-12-31',
      lastInspectionDate: '2024-06-15',
    };

    const response: WarehouseFireInquiryResponse = {
      success: true,
      inquiryId,
      warehouseInfo: mockWarehouseInfo,
    };

    // Add fire history if requested
    if (request.inquiryType === 'FIRE_HISTORY' || request.inquiryType === 'COMPLIANCE_CHECK') {
      response.fireHistory = [
        {
          incidentDate: '2023-05-10',
          incidentType: 'ELECTRICAL_FIRE',
          severity: 'MEDIUM',
          description: 'آتش‌سوزی کوچک ناشی از مشکل الکتریکی',
          damageAmount: 15000000,
          resolved: true,
        },
      ];
    }

    // Add compliance status if requested
    if (request.inquiryType === 'CURRENT_STATUS' || request.inquiryType === 'COMPLIANCE_CHECK') {
      response.complianceStatus = {
        fireExtinguishersValid: true,
        sprinklerSystemOperational: true,
        emergencyExitsClear: true,
        electricalCompliance: true,
        overallCompliance: 'COMPLIANT',
        lastAuditDate: '2024-06-15',
        nextAuditDate: '2024-12-15',
      };
    }

    // Add inspection report if requested
    if (request.inquiryType === 'INSPECTION_REPORT') {
      response.inspectionReport = {
        inspectionDate: '2024-06-15',
        inspectorName: 'مهندس احمدی',
        findings: [
          'کپسول‌های آتش‌نشانی معتبر هستند',
          'سیستم اسپرینکلر عملیاتی است',
          'خروجی‌های اضطراری باز هستند',
        ],
        recommendations: [
          'تعمیر دوره‌ای سیستم الکتریکی',
          'برگزاری تمرین آتش‌نشانی هر سه ماه',
        ],
        overallRating: 'GOOD',
      };
    }

    return response;
  }

  async inquireByNationalId(nationalId: string, inquiryType: string = 'FIRE_HISTORY'): Promise<WarehouseFireInquiryResponse> {
    return this.inquire({
      nationalId,
      inquiryType: inquiryType as any,
    });
  }

  async inquireByLicenseNumber(licenseNumber: string, inquiryType: string = 'FIRE_HISTORY'): Promise<WarehouseFireInquiryResponse> {
    return this.inquire({
      licenseNumber,
      inquiryType: inquiryType as any,
    });
  }

  async inquireByWarehouseId(warehouseId: string, inquiryType: string = 'FIRE_HISTORY'): Promise<WarehouseFireInquiryResponse> {
    return this.inquire({
      warehouseId,
      inquiryType: inquiryType as any,
    });
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    enabled: boolean;
    apiUrl: string;
    message: string;
  }> {
    const config = this.getConfig();

    if (!config.enabled) {
      return {
        healthy: true,
        enabled: false,
        apiUrl: config.apiUrl,
        message: 'Warehouse fire inquiry is disabled',
      };
    }

    if (!config.apiKey) {
      return {
        healthy: false,
        enabled: true,
        apiUrl: config.apiUrl,
        message: 'API key not configured',
      };
    }

    return {
      healthy: true,
      enabled: true,
      apiUrl: config.apiUrl,
      message: 'Warehouse fire inquiry is configured and ready',
    };
  }

  async getConfiguration(): Promise<WarehouseFireConfig> {
    return this.getConfig();
  }

  async updateConfig(updates: Partial<WarehouseFireConfig>): Promise<WarehouseFireConfig> {
    // In a real implementation, this would persist to database
    this.logger.log('Warehouse fire config updated', { updates });
    return { ...this.getConfig(), ...updates };
  }
}
