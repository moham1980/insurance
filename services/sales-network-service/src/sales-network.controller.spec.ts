import { Test, TestingModule } from '@nestjs/testing';
import { SalesNetworkController } from './sales-network.controller';
import { SalesNetworkService } from './sales-network.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';

describe('SalesNetworkController', () => {
  let controller: SalesNetworkController;
  let service: SalesNetworkService;

  const mockSalesNetworkService = {
    getAgentStats: jest.fn(),
    getAgentPolicies: jest.fn(),
    getAgentClaims: jest.fn(),
    getAgentCustomers: jest.fn(),
    getAgentCommissions: jest.fn(),
    getAgentKpis: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesNetworkController],
      providers: [
        {
          provide: SalesNetworkService,
          useValue: mockSalesNetworkService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SalesNetworkController>(SalesNetworkController);
    service = module.get<SalesNetworkService>(SalesNetworkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAgentStats', () => {
    it('should return agent stats successfully', async () => {
      const mockStats = {
        totalPolicies: 150,
        activePolicies: 120,
        totalClaims: 45,
        pendingClaims: 5,
        totalCommission: 15000000,
        pendingCommission: 2000000,
        monthlyPremium: 5000000,
        monthlyIssuance: 20,
      };

      mockSalesNetworkService.getAgentStats.mockResolvedValue(mockStats);

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentStats(req, headers, 'agent-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.correlationId).toBe('test-correlation-id');
      expect(service.getAgentStats).toHaveBeenCalledWith({
        agentId: 'agent-1',
        partnerId: 'partner-1',
      });
    });

    it('should return validation error when partner-id header is missing', async () => {
      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
      };

      const result = await controller.getAgentStats(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('x-partner-id header is required');
    });

    it('should handle service errors gracefully', async () => {
      mockSalesNetworkService.getAgentStats.mockRejectedValue(new Error('Service error'));

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentStats(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getAgentPolicies', () => {
    it('should return agent policies with pagination', async () => {
      const mockPolicies = {
        rows: [
          {
            id: 'policy-1',
            policyNumber: 'POL-001',
            customerId: 'customer-1',
            status: 'active',
            premium: 5000000,
          },
          {
            id: 'policy-2',
            policyNumber: 'POL-002',
            customerId: 'customer-2',
            status: 'active',
            premium: 3000000,
          },
        ],
        total: 2,
      };

      mockSalesNetworkService.getAgentPolicies.mockResolvedValue(mockPolicies);

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentPolicies(req, headers, 'agent-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPolicies.rows);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.offset).toBe(0);
    });

    it('should return validation error when partner-id header is missing', async () => {
      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
      };

      const result = await controller.getAgentPolicies(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('x-partner-id header is required');
    });

    it('should handle pagination parameters correctly', async () => {
      const mockPolicies = { rows: [], total: 0 };
      mockSalesNetworkService.getAgentPolicies.mockResolvedValue(mockPolicies);

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentPolicies(
        req,
        headers,
        'agent-1',
        'active',
        '2024-01-01',
        '2024-12-31',
        '100',
        '10'
      );

      expect(service.getAgentPolicies).toHaveBeenCalledWith({
        agentId: 'agent-1',
        partnerId: 'partner-1',
        status: 'active',
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        limit: 100,
        offset: 10,
      });
    });

    it('should handle service errors gracefully', async () => {
      mockSalesNetworkService.getAgentPolicies.mockRejectedValue(new Error('Service error'));

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentPolicies(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getAgentClaims', () => {
    it('should return agent claims with pagination', async () => {
      const mockClaims = {
        rows: [
          {
            id: 'claim-1',
            claimNumber: 'CLM-001',
            policyNumber: 'POL-001',
            status: 'pending',
            amount: 10000000,
          },
          {
            id: 'claim-2',
            claimNumber: 'CLM-002',
            policyNumber: 'POL-002',
            status: 'approved',
            amount: 5000000,
          },
        ],
        total: 2,
      };

      mockSalesNetworkService.getAgentClaims.mockResolvedValue(mockClaims);

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentClaims(req, headers, 'agent-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockClaims.rows);
      expect(result.pagination.total).toBe(2);
    });

    it('should return validation error when partner-id header is missing', async () => {
      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
      };

      const result = await controller.getAgentClaims(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('x-partner-id header is required');
    });

    it('should handle service errors gracefully', async () => {
      mockSalesNetworkService.getAgentClaims.mockRejectedValue(new Error('Service error'));

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentClaims(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getAgentCustomers', () => {
    it('should return agent customers with pagination', async () => {
      const mockCustomers = {
        rows: [
          {
            id: 'customer-1',
            nationalId: '1234567890',
            name: 'John Doe',
            phone: '+98 912 345 6789',
            policiesCount: 2,
            claimsCount: 1,
          },
          {
            id: 'customer-2',
            nationalId: '0987654321',
            name: 'Jane Smith',
            phone: '+98 921 987 6543',
            policiesCount: 1,
            claimsCount: 0,
          },
        ],
        total: 2,
      };

      mockSalesNetworkService.getAgentCustomers.mockResolvedValue(mockCustomers);

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentCustomers(req, headers, 'agent-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomers.rows);
      expect(result.pagination.total).toBe(2);
    });

    it('should return validation error when partner-id header is missing', async () => {
      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
      };

      const result = await controller.getAgentCustomers(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('x-partner-id header is required');
    });

    it('should handle service errors gracefully', async () => {
      mockSalesNetworkService.getAgentCustomers.mockRejectedValue(new Error('Service error'));

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentCustomers(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getAgentCommissions', () => {
    it('should return agent commissions with pagination', async () => {
      const mockCommissions = {
        rows: [
          {
            id: 'commission-1',
            policyId: 'policy-1',
            policyNumber: 'POL-001',
            contractId: 'contract-1',
            commissionRate: 0.15,
            commissionAmount: 750000,
            status: 'PENDING',
            dueDate: '2024-04-01',
          },
          {
            id: 'commission-2',
            policyId: 'policy-2',
            policyNumber: 'POL-002',
            contractId: 'contract-1',
            commissionRate: 0.12,
            commissionAmount: 360000,
            status: 'PAID',
            dueDate: '2024-03-01',
            paidDate: '2024-03-05',
          },
        ],
        total: 2,
      };

      mockSalesNetworkService.getAgentCommissions.mockResolvedValue(mockCommissions);

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentCommissions(req, headers, 'agent-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCommissions.rows);
      expect(result.pagination.total).toBe(2);
    });

    it('should return validation error when partner-id header is missing', async () => {
      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
      };

      const result = await controller.getAgentCommissions(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('x-partner-id header is required');
    });

    it('should handle service errors gracefully', async () => {
      mockSalesNetworkService.getAgentCommissions.mockRejectedValue(new Error('Service error'));

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentCommissions(req, headers, 'agent-1');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getAgentKpis', () => {
    it('should return agent KPIs with pagination', async () => {
      const mockKpis = {
        rows: [
          {
            date: '2024-03-01',
            issuanceCount: 5,
            issuancePremium: 25000000,
            claimsCount: 2,
            claimsAmount: 15000000,
            commissionEarned: 3750000,
            newCustomers: 3,
          },
          {
            date: '2024-03-02',
            issuanceCount: 3,
            issuancePremium: 15000000,
            claimsCount: 1,
            claimsAmount: 5000000,
            commissionEarned: 2250000,
            newCustomers: 2,
          },
        ],
        total: 2,
      };

      mockSalesNetworkService.getAgentKpis.mockResolvedValue(mockKpis);

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentKpis(req, headers, 'agent-1', 'daily');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockKpis.rows);
      expect(result.pagination.total).toBe(2);
    });

    it('should return validation error when partner-id header is missing', async () => {
      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
      };

      const result = await controller.getAgentKpis(req, headers, 'agent-1', 'daily');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toContain('x-partner-id header is required');
    });

    it('should handle service errors gracefully', async () => {
      mockSalesNetworkService.getAgentKpis.mockRejectedValue(new Error('Service error'));

      const req = { user: { userId: 'user-1' } };
      const headers = {
        'x-correlation-id': 'test-correlation-id',
        'x-tenant-id': 'tenant-1',
        'x-partner-id': 'partner-1',
      };

      const result = await controller.getAgentKpis(req, headers, 'agent-1', 'daily');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('parsePagination', () => {
    it('should parse valid pagination parameters', () => {
      const controllerInstance = new SalesNetworkController(mockSalesNetworkService as any);
      const result = (controllerInstance as any).parsePagination('100', '10');

      expect(result.limit).toBe(100);
      expect(result.offset).toBe(10);
    });

    it('should use default values for invalid pagination parameters', () => {
      const controllerInstance = new SalesNetworkController(mockSalesNetworkService as any);
      const result = (controllerInstance as any).parsePagination('invalid', 'invalid');

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should clamp limit to maximum of 200', () => {
      const controllerInstance = new SalesNetworkController(mockSalesNetworkService as any);
      const result = (controllerInstance as any).parsePagination('300', '0');

      expect(result.limit).toBe(200);
    });

    it('should clamp limit to minimum of 1', () => {
      const controllerInstance = new SalesNetworkController(mockSalesNetworkService as any);
      const result = (controllerInstance as any).parsePagination('0', '0');

      expect(result.limit).toBe(1);
    });

    it('should clamp offset to minimum of 0', () => {
      const controllerInstance = new SalesNetworkController(mockSalesNetworkService as any);
      const result = (controllerInstance as any).parsePagination('50', '-10');

      expect(result.offset).toBe(0);
    });
  });

  describe('getCorrelationId', () => {
    it('should use provided correlation-id from headers', () => {
      const controllerInstance = new SalesNetworkController(mockSalesNetworkService as any);
      const headers = { 'x-correlation-id': 'my-correlation-id' };

      const result = (controllerInstance as any).getCorrelationId(headers);

      expect(result).toBe('my-correlation-id');
    });

    it('should use X-Correlation-Id from headers', () => {
      const controllerInstance = new SalesNetworkController(mockSalesNetworkService as any);
      const headers = { 'X-Correlation-Id': 'my-correlation-id' };

      const result = (controllerInstance as any).getCorrelationId(headers);

      expect(result).toBe('my-correlation-id');
    });

    it('should generate correlation-id when not provided', () => {
      const controllerInstance = new SalesNetworkController(mockSalesNetworkService as any);
      const headers = {};

      const result = (controllerInstance as any).getCorrelationId(headers);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
