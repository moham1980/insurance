import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrokerageProductService } from '../../services/product-service/src/brokerage-product.service';
import { DistributionAgreementService } from '../../services/sales-network-service/src/distribution-agreement/distribution-agreement.service';
import { ProductService } from '../../services/product-service/src/product.service';
import { Product } from '../../services/product-service/src/entities/Product';
import { ProductVersion } from '../../services/product-service/src/entities/ProductVersion';
import { CoverageDefinition } from '../../services/product-service/src/entities/CoverageDefinition';
import { Coverage } from '../../services/product-service/src/entities/Coverage';
import { Deductible } from '../../services/product-service/src/entities/Deductible';
import { PricingRule } from '../../services/product-service/src/entities/PricingRule';
import { RateTableVersion } from '../../services/product-service/src/entities/RateTableVersion';
import { ProductVisibility } from '../../services/product-service/src/entities/ProductVisibility';
import { BrokerProductOffering } from '../../services/product-service/src/entities/BrokerProductOffering';
import { BundleRule } from '../../services/product-service/src/entities/BundleRule';
import { RecommendationRule } from '../../services/product-service/src/entities/RecommendationRule';
import { OutboxEvent, AuditRecord, AuditPersistenceService } from '@insurance/shared';
import { DistributionAgreement } from '../../services/sales-network-service/src/entities/DistributionAgreement';
import { CommissionTier } from '../../services/sales-network-service/src/entities/CommissionTier';
import { ReferralRule } from '../../services/sales-network-service/src/entities/ReferralRule';
import { ClawbackRule } from '../../services/sales-network-service/src/entities/ClawbackRule';
import { BonusTier } from '../../services/sales-network-service/src/entities/BonusTier';
import { MarkupRule } from '../../services/sales-network-service/src/entities/MarkupRule';
import { BindingAuthorityProfile } from '../../services/sales-network-service/src/entities/BindingAuthorityProfile';
import { AgreementApproval } from '../../services/sales-network-service/src/entities/AgreementApproval';
import { SalesPartner } from '../../services/sales-network-service/src/entities/SalesPartner';
import { CommissionContract } from '../../services/sales-network-service/src/entities/CommissionContract';
import { CommissionLedgerEntry } from '../../services/sales-network-service/src/entities/CommissionLedgerEntry';
import { SalesKpiDaily } from '../../services/sales-network-service/src/entities/SalesKpiDaily';
import { SalesPolicyAttribution } from '../../services/sales-network-service/src/entities/SalesPolicyAttribution';
import { ConsumedEvent } from '@insurance/shared';

// P1 backlog: هیچ test skip نشود — tests must always run with real PostgreSQL

const productEntities = [Product, ProductVersion, CoverageDefinition, RateTableVersion, ProductVisibility, BrokerProductOffering, BundleRule, RecommendationRule, OutboxEvent];
const salesEntities = [DistributionAgreement, CommissionTier, ReferralRule, ClawbackRule, BonusTier, MarkupRule, BindingAuthorityProfile, AgreementApproval, SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution, AuditRecord, ConsumedEvent, OutboxEvent];

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5435', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'insurance',
  password: process.env.DB_PASSWORD || 'insurance123',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'insurance_platform',
};

async function createProductDataSource(): Promise<DataSource> {
  const ds = new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    schema: 'public',
    synchronize: true,
    dropSchema: false,
    logging: false,
    entities: productEntities,
  });
  await ds.initialize();
  await ds.query(`SET search_path TO public, sales;`);
  return ds;
}

async function createSalesDataSource(): Promise<DataSource> {
  // Ensure the 'sales' schema exists before initializing
  const adminDs = new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    schema: 'public',
    synchronize: false,
    logging: false,
    entities: [],
  });
  await adminDs.initialize();
  await adminDs.query(`CREATE SCHEMA IF NOT EXISTS "sales"`).catch(() => {});
  await adminDs.destroy();

  const ds = new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    schema: 'sales',
    synchronize: true,
    dropSchema: false,
    logging: false,
    entities: salesEntities,
  });
  await ds.initialize();
  return ds;
}

describe('P1 Brokerage Distribution Integration', () => {
  let productDs: DataSource;
  let salesDs: DataSource;
  let productService: BrokerageProductService;
  let agreementService: DistributionAgreementService;
  const tenantId = uuidv4();
  const carrierOrg = uuidv4();
  const brokerOrg = uuidv4();

  beforeAll(async () => {
    productDs = await createProductDataSource();
    salesDs = await createSalesDataSource();

    productService = new BrokerageProductService(
      productDs,
      productDs.getRepository(Product),
      productDs.getRepository(ProductVersion),
      productDs.getRepository(CoverageDefinition),
      productDs.getRepository(RateTableVersion),
      productDs.getRepository(ProductVisibility),
      productDs.getRepository(BrokerProductOffering),
      productDs.getRepository(BundleRule),
      productDs.getRepository(RecommendationRule),
      new ProductService(
        productDs,
        productDs.getRepository(Product),
        productDs.getRepository(Coverage),
        productDs.getRepository(Deductible),
        productDs.getRepository(PricingRule),
        productDs.getRepository(ProductVersion),
        productDs.getRepository(ProductVisibility),
      ),
    );

    const mockAuthClient: any = {
      listCapabilities: async (organizationId: string, reqTenantId?: string) => {
        const allCaps = [
          { capabilityId: uuidv4(), organizationId: carrierOrg, tenantId: reqTenantId ?? tenantId, capability: 'CARRIER', scope: [], lineOfBusiness: [], status: 'active', effectiveFrom: new Date().toISOString() },
          { capabilityId: uuidv4(), organizationId: brokerOrg, tenantId: reqTenantId ?? tenantId, capability: 'BROKER', scope: [], lineOfBusiness: [], status: 'active', effectiveFrom: new Date().toISOString() },
        ];
        return allCaps.filter((c) => c.organizationId === organizationId);
      },
    };
    const auditService = new AuditPersistenceService(salesDs.getRepository(AuditRecord));

    agreementService = new DistributionAgreementService(
      salesDs.getRepository(DistributionAgreement),
      salesDs.getRepository(CommissionTier),
      salesDs.getRepository(ReferralRule),
      salesDs.getRepository(ClawbackRule),
      salesDs.getRepository(BonusTier),
      salesDs.getRepository(MarkupRule),
      salesDs.getRepository(BindingAuthorityProfile),
      salesDs.getRepository(AgreementApproval),
      mockAuthClient,
      auditService,
    );
  }, 120000);

  afterAll(async () => {
    if (productDs?.isInitialized) await productDs.destroy();
    if (salesDs?.isInitialized) await salesDs.destroy();
  }, 30000);

  beforeEach(async () => {
    if (!productDs?.isInitialized || !salesDs?.isInitialized) return;
    // Disable FK triggers to allow fast cleanup without lock contention
    await productDs.query(`SET session_replication_role = 'replica'`);
    for (const e of productEntities) {
      const tbl = productDs.getRepository(e as any).metadata.tableName;
      await productDs.query(`DELETE FROM public."${tbl}"`);
    }
    await productDs.query(`SET session_replication_role = 'origin'`);

    await salesDs.query(`SET session_replication_role = 'replica'`);
    for (const e of salesEntities) {
      const tbl = salesDs.getRepository(e as any).metadata.tableName;
      await salesDs.query(`DELETE FROM sales."${tbl}"`);
    }
    await salesDs.query(`SET session_replication_role = 'origin'`);
  }, 60000);

  it('P1-1: create and activate product version with coverage and rate table', async () => {
    const ctx = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
    const product = await productService.createProduct(ctx, {
      productCode: 'THIRD-PARTY-001',
      nameFa: 'بیمه شخص ثالث',
      lineOfBusiness: 'third_party',
      effectiveFrom: new Date().toISOString(),
      coverages: [
        { code: 'TP-DEATH', nameFa: 'فوت', type: 'mandatory', minLimit: { amountMinor: '10000000', currency: 'IRR' }, maxLimit: { amountMinor: '100000000', currency: 'IRR' } },
      ],
      rateTables: [
        { algorithmType: 'table', parametersSchema: { table: 'basic' } },
      ],
    });

    expect(product).toBeDefined();
    expect(product.status).toBe('draft');

    const version = await productService.activateProductVersion(ctx, product.productId, 1, {
      effectiveFrom: new Date().toISOString(),
    });

    expect(version.status).toBe('active');
    expect(version.approvedBy).toBe(ctx.userId);

    const coverages = await productDs.getRepository(CoverageDefinition).find({ where: { productVersionId: version.productVersionId } });
    expect(coverages.length).toBe(1);

    const rateTables = await productDs.getRepository(RateTableVersion).find({ where: { productVersionId: version.productVersionId } });
    expect(rateTables.length).toBe(1);
  });

  it('P1-1b: product version lifecycle — supersede and retire', async () => {
    const ctx = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
    const product = await productService.createProduct(ctx, {
      productCode: 'LIFECYCLE-001',
      nameFa: 'چرخه حیات',
      lineOfBusiness: 'life',
      effectiveFrom: new Date().toISOString(),
    });

    // Activate v1
    const v1 = await productService.activateProductVersion(ctx, product.productId, 1, {
      effectiveFrom: new Date().toISOString(),
    });
    expect(v1.status).toBe('active');

    // Create v2
    const v2 = await productService.createProductVersion(ctx, product.productId, {
      nameFa: 'چرخه حیات نسخه ۲',
      effectiveFrom: new Date().toISOString(),
    });
    expect(v2.version).toBe(2);
    expect(v2.status).toBe('draft');

    // Activate v2 — v1 should be superseded
    const v2Active = await productService.activateProductVersion(ctx, product.productId, 2, {
      effectiveFrom: new Date().toISOString(),
    });
    expect(v2Active.status).toBe('active');

    const v1After = await productDs.getRepository(ProductVersion).findOne({
      where: { tenantId, productId: product.productId, version: 1 },
    });
    expect(v1After?.status).toBe('superseded');

    // Retire v2
    const v2Retired = await productService.retireProductVersion(ctx, product.productId, 2, {});
    expect(v2Retired.status).toBe('retired');

    // Product should be retired since currentVersion was 2
    const productAfter = await productDs.getRepository(Product).findOne({
      where: { tenantId, productId: product.productId },
    });
    expect(productAfter?.status).toBe('retired');
  });

  it('P1-2: product visibility is granted only for active versions', async () => {
    const ctx = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
    const product = await productService.createProduct(ctx, { productCode: 'FIRE-001', nameFa: 'آتش سوزی', lineOfBusiness: 'fire' });
    await productService.activateProductVersion(ctx, product.productId, 1, { effectiveFrom: new Date().toISOString() });

    const agreement = await agreementService.createAgreement({
      tenantId, userId: ctx.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4(),
    }, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      distributorOrganizationId: brokerOrg,
      agreementType: 'brokerage',
      effectiveFrom: new Date().toISOString(),
      linesOfBusiness: ['fire'],
    });

    const visibility = await productService.createProductVisibility(ctx, product.productId, {
      distributionAgreementId: agreement.agreementId,
      agreementVersionAtCreation: 1,
      distributorOrganizationId: brokerOrg,
      visibilityType: 'exclusive',
      effectiveFrom: new Date().toISOString(),
    });

    expect(visibility.status).toBe('active');
    expect(visibility.productVersion).toBe(1);
  });

  it('P1-3: broker offering validates product visibility', async () => {
    const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
    const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

    const product = await productService.createProduct(ctxCarrier, { productCode: 'HEALTH-001', nameFa: 'درمان', lineOfBusiness: 'health' });
    await productService.activateProductVersion(ctxCarrier, product.productId, 1, { effectiveFrom: new Date().toISOString() });

    const agreement = await agreementService.createAgreement({
      tenantId, userId: ctxCarrier.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4(),
    }, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      distributorOrganizationId: brokerOrg,
      agreementType: 'brokerage',
      effectiveFrom: new Date().toISOString(),
      linesOfBusiness: ['health'],
    });

    await agreementService.submitForApproval({ tenantId, userId: ctxCarrier.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() }, agreement.agreementId, {});
    await agreementService.decideApproval({ tenantId, userId: uuidv4(), roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() }, agreement.agreementId, 'approved', { reason: 'approved' });

    const visibility = await productService.createProductVisibility(ctxCarrier, product.productId, {
      distributionAgreementId: agreement.agreementId,
      distributorOrganizationId: brokerOrg,
      visibilityType: 'exclusive',
      effectiveFrom: new Date().toISOString(),
    });

    const offering = await productService.createBrokerProductOffering(ctxBroker, {
      brokerOrganizationId: brokerOrg,
      includedProductIds: [product.productId],
      distributionAgreementId: agreement.agreementId,
      agreementVersionSnapshot: 1,
      name: 'پکیج درمان',
      effectiveFrom: new Date().toISOString(),
    });

    expect(offering.includedProductIds).toContain(product.productId);
    expect(offering.status).toBe('inactive');

    const active = await productService.setOfferingStatus(ctxBroker, offering.offeringId, 'active', {});
    expect(active.status).toBe('active');

    const visible = await productService.listDistributorVisibleProducts(ctxBroker, brokerOrg, {});
    expect(visible.rows.some((v) => v.productId === product.productId)).toBe(true);
  });

  it('P1-4: distribution agreement approval workflow with binding authority', async () => {
    const ctxCreator = { tenantId, userId: uuidv4(), roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() };
    const ctxApprover = { tenantId, userId: uuidv4(), roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() };
    const profile = await agreementService.createBindingAuthorityProfile(ctxCreator, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      lineOfBusiness: 'motor',
      perRiskAmountMinor: '1000000',
      perOccurrenceAmountMinor: '2000000',
      aggregateAmountMinor: '5000000',
      currency: 'IRR',
      effectiveFrom: new Date().toISOString(),
    });

    const activated = await agreementService.activateBindingAuthorityProfile(ctxCreator, profile.profileId);
    expect(activated.status).toBe('active');

    const agreement = await agreementService.createAgreement(ctxCreator, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      distributorOrganizationId: brokerOrg,
      agreementType: 'brokerage',
      effectiveFrom: new Date().toISOString(),
      linesOfBusiness: ['motor'],
      productScope: [],
      territories: [],
      bindingAuthorityProfileId: profile.profileId,
    });

    const submitted = await agreementService.submitForApproval(ctxCreator, agreement.agreementId, {});
    expect(submitted.status).toBe('pending_approval');

    const approved = await agreementService.decideApproval(ctxApprover, agreement.agreementId, 'approved', { reason: 'approved' });
    expect(approved.status).toBe('active');

    const approvals = await agreementService.getAgreementApprovals(ctxApprover, agreement.agreementId);
    expect(approvals.length).toBe(1);
    expect(approvals[0].decision).toBe('approved');
  });

  it('P1-4b: eligibility returns referral for risk above perRisk but within referralThreshold', async () => {
    const ctxCreator = { tenantId, userId: uuidv4(), roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() };
    const ctxApprover = { tenantId, userId: uuidv4(), roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() };

    const profile = await agreementService.createBindingAuthorityProfile(ctxCreator, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      lineOfBusiness: 'motor',
      perRiskAmountMinor: '1000000',
      perOccurrenceAmountMinor: '2000000',
      aggregateAmountMinor: '5000000',
      currency: 'IRR',
      autoBind: false,
      referralThresholdAmountMinor: '3000000',
      effectiveFrom: new Date().toISOString(),
    });
    await agreementService.activateBindingAuthorityProfile(ctxCreator, profile.profileId);

    const agreement = await agreementService.createAgreement(ctxCreator, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      distributorOrganizationId: brokerOrg,
      agreementType: 'brokerage',
      effectiveFrom: new Date().toISOString(),
      linesOfBusiness: ['motor'],
      productScope: [],
      territories: [],
      bindingAuthorityProfileId: profile.profileId,
    });
    await agreementService.submitForApproval(ctxCreator, agreement.agreementId, {});
    await agreementService.decideApproval(ctxApprover, agreement.agreementId, 'approved', { reason: 'approved' });

    // Risk within referral threshold → referral=true
    const result = await agreementService.checkEligibility(
      { tenantId, userId: ctxCreator.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() },
      agreement.agreementId,
      'motor',
      '2000000', // above perRisk (1M) but below referralThreshold (3M)
    );
    expect(result.eligible).toBe(false);
    expect(result.referral).toBe(true);

    // Risk above aggregate → eligible=false, referral=false
    const result2 = await agreementService.checkEligibility(
      { tenantId, userId: ctxCreator.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() },
      agreement.agreementId,
      'motor',
      '10000000', // above aggregate (5M)
    );
    expect(result2.eligible).toBe(false);
    expect(result2.referral).toBe(false);

    // Risk below perRisk → eligible=true
    const result3 = await agreementService.checkEligibility(
      { tenantId, userId: ctxCreator.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() },
      agreement.agreementId,
      'motor',
      '500000', // below perRisk (1M)
    );
    expect(result3.eligible).toBe(true);
    expect(result3.referral).toBe(false);
  });

  it('P1-4c: SoD — same person cannot create and approve agreement', async () => {
    const ctxCreator = { tenantId, userId: uuidv4(), roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() };

    const agreement = await agreementService.createAgreement(ctxCreator, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      distributorOrganizationId: brokerOrg,
      agreementType: 'brokerage',
      effectiveFrom: new Date().toISOString(),
      linesOfBusiness: ['fire'],
      productScope: [],
      territories: [],
    });
    await agreementService.submitForApproval(ctxCreator, agreement.agreementId, {});

    // Same person tries to approve — should throw
    await expect(agreementService.decideApproval(ctxCreator, agreement.agreementId, 'approved', { reason: 'approved' }))
      .rejects.toThrow();
  });

  // P1-7.2 Security Tests
  it('P1-SEC-1: BROKER capability cannot create products', async () => {
    const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };
    await expect(productService.createProduct(ctxBroker, {
      productCode: 'BROKER-FORBIDDEN',
      nameFa: 'ممنوع',
      lineOfBusiness: 'fire',
    })).rejects.toThrow();
  });

  it('P1-SEC-2: tenant isolation — broker cannot see another tenant products', async () => {
    const otherTenantId = uuidv4();
    const ctxCarrierOther = { tenantId: otherTenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
    const product = await productService.createProduct(ctxCarrierOther, {
      productCode: 'OTHER-TENANT-001',
      nameFa: 'تست سایر',
      lineOfBusiness: 'fire',
    });
    await productService.activateProductVersion(ctxCarrierOther, product.productId, 1, { effectiveFrom: new Date().toISOString() });

    const ctxBrokerThis = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };
    const visible = await productService.listDistributorVisibleProducts(ctxBrokerThis, brokerOrg, {});
    expect(visible.rows.some((v) => v.productId === product.productId)).toBe(false);
  });

  it('P1-SEC-3: rate table / formula not exposed in customer offerings', async () => {
    const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
    const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

    const product = await productService.createProduct(ctxCarrier, {
      productCode: 'RATE-MASK-001',
      nameFa: 'تست ماسک',
      lineOfBusiness: 'fire',
    });
    await productService.activateProductVersion(ctxCarrier, product.productId, 1, { effectiveFrom: new Date().toISOString() });

    const agreement = await agreementService.createAgreement({
      tenantId, userId: ctxCarrier.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4(),
    }, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      distributorOrganizationId: brokerOrg,
      agreementType: 'brokerage',
      effectiveFrom: new Date().toISOString(),
      linesOfBusiness: ['fire'],
    });

    await agreementService.submitForApproval({ tenantId, userId: ctxCarrier.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() }, agreement.agreementId, {});
    await agreementService.decideApproval({ tenantId, userId: uuidv4(), roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4() }, agreement.agreementId, 'approved', { reason: 'approved' });

    await productService.createProductVisibility(ctxCarrier, product.productId, {
      distributionAgreementId: agreement.agreementId,
      agreementVersionAtCreation: 1,
      distributorOrganizationId: brokerOrg,
      visibilityType: 'exclusive',
      effectiveFrom: new Date().toISOString(),
    });

    const offering = await productService.createBrokerProductOffering(ctxBroker, {
      name: 'تست ماسک نرخ',
      includedProductIds: [product.productId],
      distributionAgreementId: agreement.agreementId,
      agreementVersionSnapshot: 1,
      effectiveFrom: new Date().toISOString(),
    });
    await productService.setOfferingStatus(ctxBroker, offering.offeringId, 'active', {});

    const { rows } = await productService.listCustomerOfferings(ctxBroker, { brokerOrganizationId: brokerOrg });
    const found = rows.find((o: any) => o.offeringId === offering.offeringId);
    expect(found).toBeDefined();
    expect(found).not.toHaveProperty('rateTable');
    expect(found).not.toHaveProperty('parametersSchema');
    expect(found).not.toHaveProperty('algorithmType');
    expect(found).not.toHaveProperty('formula');
  });
});
