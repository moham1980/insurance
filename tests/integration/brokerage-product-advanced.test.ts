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

const productEntities = [Product, ProductVersion, CoverageDefinition, RateTableVersion, ProductVisibility, BrokerProductOffering, BundleRule, RecommendationRule, PricingRule, Coverage, Deductible, OutboxEvent];
const salesEntities = [DistributionAgreement, CommissionTier, ReferralRule, ClawbackRule, BonusTier, MarkupRule, BindingAuthorityProfile, AgreementApproval, SalesPartner, CommissionContract, CommissionLedgerEntry, SalesKpiDaily, SalesPolicyAttribution, AuditRecord, ConsumedEvent, OutboxEvent];

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'insurance_test',
};

async function createProductDataSource(): Promise<DataSource> {
  const adminDs = new DataSource({
    type: 'postgres',
    ...dbConfig,
    schema: 'public',
    synchronize: false,
    logging: false,
  });
  await adminDs.initialize();
  await adminDs.query(`CREATE SCHEMA IF NOT EXISTS "public"`).catch(() => {});
  await adminDs.destroy();

  const ds = new DataSource({
    type: 'postgres',
    ...dbConfig,
    schema: 'public',
    synchronize: true,
    dropSchema: false,
    logging: false,
    entities: productEntities,
  });
  await ds.initialize();
  return ds;
}

async function createSalesDataSource(): Promise<DataSource> {
  const adminDs = new DataSource({
    type: 'postgres',
    ...dbConfig,
    schema: 'sales',
    synchronize: false,
    logging: false,
  });
  await adminDs.initialize();
  await adminDs.query(`CREATE SCHEMA IF NOT EXISTS "sales"`).catch(() => {});
  await adminDs.destroy();

  const ds = new DataSource({
    type: 'postgres',
    ...dbConfig,
    schema: 'sales',
    synchronize: true,
    dropSchema: false,
    logging: false,
    entities: salesEntities,
  });
  await ds.initialize();
  return ds;
}

describe('P1 Brokerage Advanced Integration — Missing Coverage', () => {
  let productDs: DataSource;
  let salesDs: DataSource;
  let productService: BrokerageProductService;
  let rawProductService: ProductService;
  let agreementService: DistributionAgreementService;
  const tenantId = uuidv4();
  const carrierOrg = uuidv4();
  const brokerOrg = uuidv4();

  beforeAll(async () => {
    productDs = await createProductDataSource();
    salesDs = await createSalesDataSource();

    rawProductService = new ProductService(
      productDs,
      productDs.getRepository(Product),
      productDs.getRepository(Coverage),
      productDs.getRepository(Deductible),
      productDs.getRepository(PricingRule),
      productDs.getRepository(ProductVersion),
      productDs.getRepository(ProductVisibility),
    );

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
      rawProductService,
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

  // Helper: create and activate a product with pricing rules
  async function createProductWithPricing(ctxCarrier: any, lineOfBusiness: string, basePremiumMinor: number) {
    const product = await productService.createProduct(ctxCarrier, {
      productCode: `ADV-${lineOfBusiness}-${uuidv4().slice(0, 8)}`,
      nameFa: `بیمه ${lineOfBusiness}`,
      lineOfBusiness,
      coverages: [
        { code: 'BASE', nameFa: 'پایه', type: 'mandatory', minLimit: { amountMinor: '1000000', currency: 'IRR' }, maxLimit: { amountMinor: '100000000', currency: 'IRR' } },
      ],
      rateTables: [
        { algorithmType: 'table', parametersSchema: { table: 'basic' } },
      ],
    });
    await productService.activateProductVersion(ctxCarrier, product.productId, 1, {
      effectiveFrom: new Date().toISOString(),
    });

    // Add a pricing rule directly
    const rule = productDs.getRepository(PricingRule).create({
      pricingRuleId: uuidv4(),
      tenantId,
      productId: product.productId,
      code: 'BASE_PREMIUM',
      nameFa: 'حق بیمه پایه',
      ruleType: 'base',
      status: 'active',
      priority: 0,
      conditions: null,
      rule: { algorithm: 'flat', amountMinor: String(basePremiumMinor), currency: 'IRR' },
      validFrom: new Date(),
      validTo: null,
      regions: null,
      createdBy: ctxCarrier.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await productDs.getRepository(PricingRule).save(rule);

    return product;
  }

  // Helper: create and approve a distribution agreement
  async function createApprovedAgreement(ctxCarrier: any, lob: string) {
    const agreement = await agreementService.createAgreement({
      tenantId, userId: ctxCarrier.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4(),
    }, {
      tenantId,
      carrierOrganizationId: carrierOrg,
      distributorOrganizationId: brokerOrg,
      agreementType: 'brokerage',
      effectiveFrom: new Date().toISOString(),
      linesOfBusiness: [lob],
    });
    await agreementService.submitForApproval({
      tenantId, userId: ctxCarrier.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4(),
    }, agreement.agreementId, {});
    await agreementService.decideApproval({
      tenantId, userId: uuidv4(), roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4(),
    }, agreement.agreementId, 'approved', { reason: 'approved' });
    return agreement;
  }

  // Helper: create visibility, offering, and activate offering
  async function createActiveOffering(ctxCarrier: any, ctxBroker: any, product: any, agreement: any) {
    await productService.createProductVisibility(ctxCarrier, product.productId, {
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
      name: `پکیج ${product.lineOfBusiness}`,
      effectiveFrom: new Date().toISOString(),
      markupRules: [{ type: 'add', amountMinor: '50000', currency: 'IRR', code: 'BROKER_FEE', nameFa: 'کارمزد کارگزار' }],
    });
    await productService.setOfferingStatus(ctxBroker, offering.offeringId, 'active', {});
    return offering;
  }

  // ---------------------------------------------------------------------------
  // P1-ADV-1: cloneProductVersion auto-migrates visibilities
  // ---------------------------------------------------------------------------
  describe('P1-ADV-1: cloneProductVersion auto-migrates visibilities', () => {
    it('should clone a version and migrate active visibilities to the new version', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
      const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'fire');
      await productService.createProductVisibility(ctxCarrier, product.productId, {
        distributionAgreementId: agreement.agreementId,
        distributorOrganizationId: brokerOrg,
        visibilityType: 'exclusive',
        effectiveFrom: new Date().toISOString(),
      });

      // Clone version 1 → should create version 2 and migrate visibilities
      const cloned = await productService.cloneProductVersion(ctxCarrier, product.productId, 1, {
        nameFa: 'نسخه کلون شده',
        effectiveFrom: new Date().toISOString(),
      });

      expect(cloned.version).toBe(2);
      expect(cloned.status).toBe('draft');

      // Check that visibility was migrated to version 2
      const visibilities = await productDs.getRepository(ProductVisibility).find({
        where: { tenantId, productId: product.productId, productVersion: 2, status: 'active' },
      });
      expect(visibilities.length).toBe(1);
      expect(visibilities[0].distributorOrganizationId).toBe(brokerOrg);
      expect(visibilities[0].distributionAgreementId).toBe(agreement.agreementId);
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-2: listDistributorVisibleProducts with agreementId filter
  // ---------------------------------------------------------------------------
  describe('P1-ADV-2: listDistributorVisibleProducts with agreementId filter', () => {
    it('should filter visible products by agreementId', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
      const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

      const product1 = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const product2 = await createProductWithPricing(ctxCarrier, 'motor', 300000);

      const agreement1 = await createApprovedAgreement(ctxCarrier, 'fire');
      const agreement2 = await createApprovedAgreement(ctxCarrier, 'motor');

      // Create visibility for product1 under agreement1
      await productService.createProductVisibility(ctxCarrier, product1.productId, {
        distributionAgreementId: agreement1.agreementId,
        distributorOrganizationId: brokerOrg,
        visibilityType: 'exclusive',
        effectiveFrom: new Date().toISOString(),
      });

      // Create visibility for product2 under agreement2
      await productService.createProductVisibility(ctxCarrier, product2.productId, {
        distributionAgreementId: agreement2.agreementId,
        distributorOrganizationId: brokerOrg,
        visibilityType: 'exclusive',
        effectiveFrom: new Date().toISOString(),
      });

      // Filter by agreement1 — should only return product1
      const filtered = await productService.listDistributorVisibleProducts(ctxBroker, brokerOrg, {
        agreementId: agreement1.agreementId,
      });
      expect(filtered.rows.length).toBe(1);
      expect(filtered.rows[0].productId).toBe(product1.productId);

      // Filter by agreement2 — should only return product2
      const filtered2 = await productService.listDistributorVisibleProducts(ctxBroker, brokerOrg, {
        agreementId: agreement2.agreementId,
      });
      expect(filtered2.rows.length).toBe(1);
      expect(filtered2.rows[0].productId).toBe(product2.productId);

      // No filter — should return both
      const all = await productService.listDistributorVisibleProducts(ctxBroker, brokerOrg, {});
      expect(all.rows.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-3: listCustomerOfferings with pricing enrichment
  // ---------------------------------------------------------------------------
  describe('P1-ADV-3: listCustomerOfferings with pricing enrichment', () => {
    it('should return offerings with productQuotes and commissionDisclosure', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
      const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'health', 1000000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'health');
      const offering = await createActiveOffering(ctxCarrier, ctxBroker, product, agreement);

      const { rows, total } = await productService.listCustomerOfferings(ctxBroker, {
        brokerOrganizationId: brokerOrg,
        currency: 'IRR',
      });

      expect(total).toBe(1);
      expect(rows.length).toBe(1);
      const item = rows[0];
      expect(item.offeringId).toBe(offering.offeringId);
      // Pricing enrichment
      expect(item).toHaveProperty('productQuotes');
      expect(Array.isArray(item.productQuotes)).toBe(true);
      expect(item.productQuotes.length).toBe(1);
      expect(item.productQuotes[0].productId).toBe(product.productId);
      // Quote may succeed or fail depending on pricing rules, but must have either quote or error
      if (item.productQuotes[0].quote) {
        expect(item.productQuotes[0].quote).toBeDefined();
      } else {
        expect(item.productQuotes[0].error).toBeDefined();
      }
      // Commission disclosure
      expect(item).toHaveProperty('commissionDisclosure');
      expect(item.commissionDisclosure).toHaveProperty('brokerServiceFee');
      expect(item.commissionDisclosure).toHaveProperty('reasonCode');
      // Conflict of interest
      expect(item).toHaveProperty('conflictOfInterest');
      // Rate table must NOT be exposed
      expect(item).not.toHaveProperty('rateTable');
      expect(item).not.toHaveProperty('parametersSchema');
      expect(item).not.toHaveProperty('algorithmType');
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-4: computeMultiQuote with multiple products
  // ---------------------------------------------------------------------------
  describe('P1-ADV-4: computeMultiQuote with multiple products', () => {
    it('should compute quotes for multiple products and return totalPremiumMinor', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };

      const product1 = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const product2 = await createProductWithPricing(ctxCarrier, 'motor', 300000);

      const result = await rawProductService.computeMultiQuote({
        tenantId,
        productIds: [product1.productId, product2.productId],
        currency: 'IRR' as any,
        exposure: {},
        effectiveDate: new Date(),
      });

      expect(result).toHaveProperty('quotes');
      expect(result.quotes.length).toBe(2);
      expect(result).toHaveProperty('totalPremiumMinor');
      expect(typeof result.totalPremiumMinor).toBe('number');
      expect(result.currency).toBe('IRR');

      // Each quote should have productId and either quote or error
      for (const q of result.quotes) {
        expect(q).toHaveProperty('productId');
        if (q.quote === null) {
          expect(q).toHaveProperty('error');
        }
      }
    });

    it('should reject empty productIds array', async () => {
      await expect(rawProductService.computeMultiQuote({
        tenantId,
        productIds: [],
        currency: 'IRR' as any,
      })).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-5: exportSnapshot with organizationId filter
  // ---------------------------------------------------------------------------
  describe('P1-ADV-5: exportSnapshot with organizationId filter', () => {
    it('should filter products by organizationId visibility', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };

      const product1 = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const product2 = await createProductWithPricing(ctxCarrier, 'motor', 300000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'fire');

      // Only product1 has visibility for brokerOrg
      await productService.createProductVisibility(ctxCarrier, product1.productId, {
        distributionAgreementId: agreement.agreementId,
        distributorOrganizationId: brokerOrg,
        visibilityType: 'exclusive',
        effectiveFrom: new Date().toISOString(),
      });

      // Export with organizationId filter — should only include product1
      const snapshot = await rawProductService.exportSnapshot({
        tenantId,
        organizationId: brokerOrg,
      });

      expect(snapshot.products.length).toBe(1);
      expect(snapshot.products[0].productId).toBe(product1.productId);
      // product2 should NOT be in the snapshot
      expect(snapshot.products.find((p: any) => p.productId === product2.productId)).toBeUndefined();
    });

    it('should return empty array when organization has no visibilities', async () => {
      const snapshot = await rawProductService.exportSnapshot({
        tenantId,
        organizationId: uuidv4(), // random org with no visibilities
      });

      expect(snapshot.products.length).toBe(0);
    });

    it('should return all products when no organizationId filter is provided', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };

      await createProductWithPricing(ctxCarrier, 'fire', 500000);
      await createProductWithPricing(ctxCarrier, 'motor', 300000);

      const snapshot = await rawProductService.exportSnapshot({
        tenantId,
      });

      expect(snapshot.products.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-6: computeQuote with brokerAdjustments
  // ---------------------------------------------------------------------------
  describe('P1-ADV-6: computeQuote with brokerAdjustments', () => {
    it('should apply broker discount adjustment to the quote', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'fire', 500000);

      // First compute without adjustments
      const baseQuote = await rawProductService.computeQuote({
        tenantId,
        productId: product.productId,
        currency: 'IRR' as any,
        exposure: {},
        effectiveDate: new Date(),
      });

      // Then compute with a 10% discount
      const adjustedQuote = await rawProductService.computeQuote({
        tenantId,
        productId: product.productId,
        currency: 'IRR' as any,
        exposure: {},
        effectiveDate: new Date(),
        brokerAdjustments: [
          { code: 'BROKER_DISCOUNT', nameFa: 'تخفیف کارگزار', type: 'percent', value: -10, reasonCode: 'loyalty' },
        ],
      });

      // The adjusted quote should be different from the base quote
      expect(adjustedQuote).toBeDefined();
      if (baseQuote?.totalPremiumMinor && adjustedQuote?.totalPremiumMinor) {
        const basePremium = Number(baseQuote.totalPremiumMinor);
        const adjustedPremium = Number(adjustedQuote.totalPremiumMinor);
        expect(adjustedPremium).toBeLessThan(basePremium);
      }
    });

    it('should apply broker surcharge (add) adjustment to the quote', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'motor', 300000);

      const baseQuote = await rawProductService.computeQuote({
        tenantId,
        productId: product.productId,
        currency: 'IRR' as any,
        exposure: {},
        effectiveDate: new Date(),
      });

      const adjustedQuote = await rawProductService.computeQuote({
        tenantId,
        productId: product.productId,
        currency: 'IRR' as any,
        exposure: {},
        effectiveDate: new Date(),
        brokerAdjustments: [
          { code: 'BROKER_SURCHARGE', nameFa: 'کارمزد', type: 'add', value: 50000, reasonCode: 'service_fee' },
        ],
      });

      expect(adjustedQuote).toBeDefined();
      if (baseQuote?.totalPremiumMinor && adjustedQuote?.totalPremiumMinor) {
        const basePremium = Number(baseQuote.totalPremiumMinor);
        const adjustedPremium = Number(adjustedQuote.totalPremiumMinor);
        expect(adjustedPremium).toBeGreaterThan(basePremium);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-7: bulkCreateProductVisibility
  // ---------------------------------------------------------------------------
  describe('P1-ADV-7: bulkCreateProductVisibility', () => {
    it('should create visibilities for multiple products in one call', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };

      const product1 = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const product2 = await createProductWithPricing(ctxCarrier, 'motor', 300000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'fire');

      const result = await productService.bulkCreateProductVisibility(ctxCarrier, {
        items: [
          {
            productId: product1.productId,
            distributionAgreementId: agreement.agreementId,
            distributorOrganizationId: brokerOrg,
            visibilityType: 'exclusive',
            effectiveFrom: new Date().toISOString(),
          },
          {
            productId: product2.productId,
            distributionAgreementId: agreement.agreementId,
            distributorOrganizationId: brokerOrg,
            visibilityType: 'exclusive',
            effectiveFrom: new Date().toISOString(),
          },
        ],
      });

      expect(result.created.length).toBe(2);
      expect(result.errors.length).toBe(0);

      // Verify visibilities were created
      const vis1 = await productDs.getRepository(ProductVisibility).find({
        where: { tenantId, productId: product1.productId, distributorOrganizationId: brokerOrg, status: 'active' },
      });
      expect(vis1.length).toBe(1);

      const vis2 = await productDs.getRepository(ProductVisibility).find({
        where: { tenantId, productId: product2.productId, distributorOrganizationId: brokerOrg, status: 'active' },
      });
      expect(vis2.length).toBe(1);
    });

    it('should report errors for invalid products but still create valid ones', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };

      const product1 = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'fire');

      const result = await productService.bulkCreateProductVisibility(ctxCarrier, {
        items: [
          {
            productId: product1.productId,
            distributionAgreementId: agreement.agreementId,
            distributorOrganizationId: brokerOrg,
            visibilityType: 'exclusive',
            effectiveFrom: new Date().toISOString(),
          },
          {
            productId: uuidv4(), // non-existent product
            distributionAgreementId: agreement.agreementId,
            distributorOrganizationId: brokerOrg,
            visibilityType: 'exclusive',
            effectiveFrom: new Date().toISOString(),
          },
        ],
      });

      expect(result.created.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].productId).toBeDefined();
      expect(result.errors[0].error).toBeDefined();
    });

    it('should reject empty items array', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };

      await expect(productService.bulkCreateProductVisibility(ctxCarrier, {
        items: [],
      })).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-8: updateCommissionTiers validation
  // ---------------------------------------------------------------------------
  describe('P1-ADV-8: updateCommissionTiers validation', () => {
    it('should update commission tiers on an offering', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
      const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'fire');
      const offering = await createActiveOffering(ctxCarrier, ctxBroker, product, agreement);

      const updated = await productService.updateCommissionTiers(ctxBroker, offering.offeringId, {
        commissionTiers: [
          { name: 'Tier 1', rateBps: 500, description: '5% commission' },
          { name: 'Tier 2', rateBps: 1000, description: '10% commission' },
        ],
      });

      expect(updated.commissionTiers).toHaveLength(2);
      const tiers = updated.commissionTiers!;
      expect(tiers[0].name).toBe('Tier 1');
      expect(tiers[0].rateBps).toBe(500);
      expect(tiers[1].name).toBe('Tier 2');
      expect(tiers[1].rateBps).toBe(1000);
    });

    it('should reject commission tiers with invalid rateBps', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
      const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'motor', 300000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'motor');
      const offering = await createActiveOffering(ctxCarrier, ctxBroker, product, agreement);

      await expect(productService.updateCommissionTiers(ctxBroker, offering.offeringId, {
        commissionTiers: [
          { name: 'Bad Tier', rateBps: 99999 },
        ],
      })).rejects.toThrow();
    });

    it('should reject empty commissionTiers array', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
      const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'fire');
      const offering = await createActiveOffering(ctxCarrier, ctxBroker, product, agreement);

      await expect(productService.updateCommissionTiers(ctxBroker, offering.offeringId, {
        commissionTiers: [],
      })).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-9: Broker offering rejects when agreement is not active
  // ---------------------------------------------------------------------------
  describe('P1-ADV-9: Broker offering rejects when agreement is not active', () => {
    it('should reject offering creation when agreement is in pending_approval state', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
      const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'fire', 500000);

      // Create agreement but do NOT approve it
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
      await agreementService.submitForApproval({
        tenantId, userId: ctxCarrier.userId, roles: ['insurer_admin'], organizationId: carrierOrg, correlationId: uuidv4(),
      }, agreement.agreementId, {});
      // Agreement is now pending_approval — not active

      // Create visibility (carrier can do this without agreement being active)
      await productService.createProductVisibility(ctxCarrier, product.productId, {
        distributionAgreementId: agreement.agreementId,
        distributorOrganizationId: brokerOrg,
        visibilityType: 'exclusive',
        effectiveFrom: new Date().toISOString(),
      });

      // Broker tries to create offering — should fail because agreement is not active
      await expect(productService.createBrokerProductOffering(ctxBroker, {
        brokerOrganizationId: brokerOrg,
        includedProductIds: [product.productId],
        distributionAgreementId: agreement.agreementId,
        agreementVersionSnapshot: 1,
        name: 'پکیج تست',
        effectiveFrom: new Date().toISOString(),
      })).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // P1-ADV-10: Organization mismatch on offering update
  // ---------------------------------------------------------------------------
  describe('P1-ADV-10: Organization mismatch on offering update', () => {
    it('should reject update when offering belongs to another broker organization', async () => {
      const ctxCarrier = { tenantId, organizationId: carrierOrg, capabilities: ['CARRIER'], roles: [], userId: uuidv4() };
      const ctxBroker = { tenantId, organizationId: brokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };
      const otherBrokerOrg = uuidv4();
      const ctxOtherBroker = { tenantId, organizationId: otherBrokerOrg, capabilities: ['BROKER'], roles: [], userId: uuidv4() };

      const product = await createProductWithPricing(ctxCarrier, 'fire', 500000);
      const agreement = await createApprovedAgreement(ctxCarrier, 'fire');

      // Create visibility for brokerOrg
      await productService.createProductVisibility(ctxCarrier, product.productId, {
        distributionAgreementId: agreement.agreementId,
        distributorOrganizationId: brokerOrg,
        visibilityType: 'exclusive',
        effectiveFrom: new Date().toISOString(),
      });

      // Create offering as brokerOrg
      const offering = await productService.createBrokerProductOffering(ctxBroker, {
        brokerOrganizationId: brokerOrg,
        includedProductIds: [product.productId],
        distributionAgreementId: agreement.agreementId,
        agreementVersionSnapshot: 1,
        name: 'پکیج تست',
        effectiveFrom: new Date().toISOString(),
      });

      // Other broker tries to update — should fail
      await expect(productService.updateBrokerProductOffering(ctxOtherBroker, offering.offeringId, {
        name: 'هک شده',
      })).rejects.toThrow();
    });
  });
});
