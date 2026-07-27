# IAM Integration Guide

This guide explains how to integrate the IAM components (auth-service) with other services in the insurance platform.

## Overview

The auth-service provides:
- JWT-based authentication
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Separation of duties (SoD) enforcement
- Access audit logging
- SSO with OIDC/SAML
- Federation with external identity providers
- Tenant isolation

## Integration Steps

### 1. Add Dependencies

Add the following to your service's `package.json`:

```json
{
  "dependencies": {
    "@insurance/shared": "1.0.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

### 2. Import IAM Components

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AbacGuard } from '@insurance/shared'; // Or import from auth-service if using direct dependency
import { TenantGuard } from '@insurance/shared';
import { TenantIsolationService } from '@insurance/shared';
import { PiiMaskingMiddleware } from '@insurance/shared';
```

### 3. Apply Guards to Controllers

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AbacGuard } from '@insurance/shared';
import { TenantGuard } from '@insurance/shared';
import { Roles } from './decorators/roles.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { TenantId } from '@insurance/shared';

@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class PolicyController {
  
  @Get()
  @Roles('insurer_admin', 'underwriter')
  @Permissions('policy.read')
  async getPolicies(@TenantId() tenantId: string) {
    // Your implementation
  }
  
  @Post()
  @Roles('insurer_admin')
  @Permissions('policy.create')
  async createPolicy(@TenantId() tenantId: string, @Body() policyDto: CreatePolicyDto) {
    // Your implementation
  }
}
```

### 4. Use Tenant Isolation Service

```typescript
import { TenantIsolationService } from '@insurance/shared';

@Injectable()
export class PolicyService {
  constructor(
    private readonly tenantIsolationService: TenantIsolationService,
    private readonly policyRepository: Repository<Policy>,
  ) {}

  async getPolicies(tenantId: string) {
    // Apply tenant filtering to queries
    const queryBuilder = this.policyRepository.createQueryBuilder('policy');
    this.tenantIsolationService.applyTenantFilter(queryBuilder, tenantId, 'policy');
    return queryBuilder.getMany();
  }
}
```

### 5. Apply PII Masking Middleware

```typescript
import { Module } from '@nestjs/common';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { PiiMaskingMiddleware } from '@insurance/shared';

@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PiiMaskingMiddleware).forRoutes('*');
  }
}
```

### 6. Use Data Governance Components

```typescript
import { dataClassificationService } from '@insurance/shared';
import { consentManagementService } from '@insurance/shared';
import { purposeBasedAccessService } from '@insurance/shared';

@Injectable()
export class PolicyService {
  async getPolicyDetails(policyId: string, userId: string) {
    // Check data classification
    const classification = dataClassificationService.classifyData({
      field: 'policy_details',
      sensitivity: 'confidential',
    });

    // Check consent
    const hasConsent = await consentManagementService.hasValidConsent(
      userId,
      'policy_access',
    );

    if (!hasConsent) {
      throw new ForbiddenException('No valid consent for policy access');
    }

    // Check purpose-based access
    const canAccess = purposeBasedAccessService.checkAccess({
      userId,
      purpose: 'claims_processing',
      resource: 'policy',
      action: 'read',
    });

    if (!canAccess.granted) {
      throw new ForbiddenException(canAccess.reason);
    }

    // Return data
    return this.policyRepository.findOne(policyId);
  }
}
```

### 7. Configure Environment Variables

Add the following to your service's `.env` file:

```env
# Auth Service Configuration
AUTH_SERVICE_URL=http://auth-service:3000
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1h

# Tenant Configuration
TENANT_ID_HEADER=x-tenant-id

# Data Governance Configuration
PII_MASKING_ENABLED=true
DATA_RETENTION_ENABLED=true
```

## Service-Specific Integration Examples

### Policy Service

```typescript
// policy-service/src/app.module.ts
import { AbacGuard } from '@insurance/shared';
import { TenantGuard } from '@insurance/shared';
import { PiiMaskingMiddleware } from '@insurance/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([Policy]),
  ],
  controllers: [PolicyController],
  providers: [PolicyService, AbacGuard, TenantGuard],
  exports: [PolicyService],
})
export class PolicyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PiiMaskingMiddleware).forRoutes('policies');
  }
}
```

### Claims Service

```typescript
// claims-service/src/claims.controller.ts
@Controller('claims')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class ClaimsController {
  
  @Get()
  @Roles('claims_handler', 'insurer_admin')
  @Permissions('claim.read')
  async getClaims(@TenantId() tenantId: string) {
    return this.claimsService.getClaims(tenantId);
  }
}
```

### Agent Portal Service

```typescript
// agent-portal-service/src/agent-portal.controller.ts
@Controller('agent-portal')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AgentPortalController {
  
  @Get('dashboard')
  async getDashboard(@TenantId() tenantId: string, @Request() req) {
    return this.agentPortalService.getDashboard(req.user.agentId, tenantId);
  }
}
```

## Testing IAM Integration

### Unit Tests

```typescript
describe('PolicyController', () => {
  let controller: PolicyController;
  let service: PolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyController],
      providers: [
        {
          provide: PolicyService,
          useValue: {
            getPolicies: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AbacGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PolicyController>(PolicyController);
    service = module.get<PolicyService>(PolicyService);
  });

  it('should return policies', async () => {
    jest.spyOn(service, 'getPolicies').mockResolvedValue([]);
    expect(await controller.getPolicies('tenant-123')).toEqual([]);
  });
});
```

### Integration Tests

```typescript
describe('PolicyController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'test', password: 'test' });
    authToken = response.body.accessToken;
  });

  it('/policies (GET) with valid token', () => {
    return request(app.getHttpServer())
      .get('/policies')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-tenant-id', 'tenant-123')
      .expect(200);
  });

  it('/policies (GET) without token', () => {
    return request(app.getHttpServer())
      .get('/policies')
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Checklist for Each Service

- [ ] Add IAM dependencies to package.json
- [ ] Import IAM guards and decorators
- [ ] Apply guards to controllers
- [ ] Add tenant ID parameter to service methods
- [ ] Use TenantIsolationService for filtering
- [ ] Apply PiiMaskingMiddleware
- [ ] Add data governance checks (classification, consent, purpose-based access)
- [ ] Configure environment variables
- [ ] Write unit tests with mocked guards
- [ ] Write integration tests with auth tokens
- [ ] Update API documentation with auth requirements

## Common Issues and Solutions

### Issue: "Cannot find module '@insurance/shared'"
**Solution**: Ensure the shared package is properly linked in your monorepo configuration.

### Issue: Guards not being applied
**Solution**: Ensure guards are added to the providers array in your module.

### Issue: Tenant ID not being extracted
**Solution**: Ensure the x-tenant-id header is being sent in requests.

### Issue: PII masking not working
**Solution**: Ensure the middleware is applied in the configure method of your module.

## Next Steps

1. Integrate IAM components with all services
2. Run integration tests
3. Verify tenant isolation works correctly
4. Test data governance features
5. Update API documentation
