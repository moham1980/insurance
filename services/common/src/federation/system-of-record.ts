export interface SorEntry {
  owner: string;
  ownerService: string;
  projectedIn: string[];
  notes?: string;
}

export interface SorMatrix {
  version: number;
  updated: string;
  entities: Record<string, SorEntry>;
  rules: string[];
}

const SOR_MATRIX: SorMatrix = {
  version: 1,
  updated: '2025-01-15',
  entities: {
    Organization: { owner: 'homeTenant', ownerService: 'auth-service', projectedIn: [], notes: 'Organization is always owned by its home tenant.' },
    Tenant: { owner: 'homeTenant', ownerService: 'auth-service', projectedIn: [] },
    BrandConfig: { owner: 'homeTenant', ownerService: 'auth-service', projectedIn: [] },
    OrganizationCapability: { owner: 'homeTenant', ownerService: 'auth-service', projectedIn: [] },
    Party: { owner: 'customerHomeTenant', ownerService: 'party-kyc-service', projectedIn: [], notes: 'Party is owned by the tenant where the customer was first registered.' },
    PiiReference: { owner: 'customerHomeTenant', ownerService: 'party-kyc-service', projectedIn: [] },
    BrokerLicense: { owner: 'homeTenant', ownerService: 'party-kyc-service', projectedIn: [] },
    KycReview: { owner: 'customerHomeTenant', ownerService: 'party-kyc-service', projectedIn: [] },
    Policy: { owner: 'issuerTenant', ownerService: 'policy-service', projectedIn: ['brokerTenant', 'customerTenant'], notes: 'Policy is owned by the issuing insurer tenant.' },
    PolicyChange: { owner: 'issuerTenant', ownerService: 'policy-service', projectedIn: ['brokerTenant'] },
    PolicyRenewal: { owner: 'issuerTenant', ownerService: 'policy-service', projectedIn: ['brokerTenant'] },
    Claim: { owner: 'issuerTenant', ownerService: 'claims-service', projectedIn: ['brokerTenant', 'customerTenant'] },
    Submission: { owner: 'brokerTenant', ownerService: 'policy-service', projectedIn: ['issuerTenant'] },
    QuoteRequest: { owner: 'brokerTenant', ownerService: 'policy-service', projectedIn: ['issuerTenant'] },
    QuoteResponse: { owner: 'issuerTenant', ownerService: 'policy-service', projectedIn: ['brokerTenant'] },
    Placement: { owner: 'brokerTenant', ownerService: 'sales-network-service', projectedIn: ['issuerTenant'] },
    Payment: { owner: 'paymentServiceTenant', ownerService: 'payments-service', projectedIn: ['issuerTenant', 'brokerTenant'] },
    DistributionAgreement: { owner: 'carrierTenant', ownerService: 'sales-network-service', projectedIn: ['distributorTenant'] },
    CommissionTier: { owner: 'carrierTenant', ownerService: 'sales-network-service', projectedIn: ['distributorTenant'] },
    BonusTier: { owner: 'carrierTenant', ownerService: 'sales-network-service', projectedIn: ['distributorTenant'] },
    MarkupRule: { owner: 'carrierTenant', ownerService: 'sales-network-service', projectedIn: ['distributorTenant'] },
    AuditRecord: { owner: 'actingTenant', ownerService: 'policy-service', projectedIn: [] },
    TransitionAudit: { owner: 'actingTenant', ownerService: 'policy-service', projectedIn: [] },
    IdempotencyRecord: { owner: 'actingTenant', ownerService: 'any', projectedIn: [] },
    FederationConsent: { owner: 'customerHomeTenant', ownerService: 'party-kyc-service', projectedIn: ['targetTenant'], notes: 'Consent is owned by the customer home tenant; target tenant receives a projection for enforcement.' },
    PartnerRegistration: { owner: 'homeTenant', ownerService: 'partner-gateway', projectedIn: [], notes: 'Partner registration is owned by the tenant that initiated the partnership.' },
    PartnerCertificate: { owner: 'homeTenant', ownerService: 'partner-gateway', projectedIn: [] },
    FederationNonce: { owner: 'homeTenant', ownerService: 'partner-gateway', projectedIn: [] },
    GlobalSubject: { owner: 'customerHomeTenant', ownerService: 'party-kyc-service', projectedIn: ['brokerTenant', 'issuerTenant'], notes: 'Global subject identity is owned by customer home tenant; broker and insurer receive projections for identity linking.' },
    IdentityLink: { owner: 'hostTenant', ownerService: 'party-kyc-service', projectedIn: [], notes: 'Identity link is owned by the tenant where the link was established.' },
  },
  rules: [
    'No entity may be written by a tenant that is not its owner (or a designated projection target for read-only copies).',
    'Projections are read-only federated copies. The owner service is the single source of truth.',
    'New entities must be added to this matrix before the pull request is merged.',
    'Federation reads must check this matrix to determine which tenant to query.',
  ],
};

export function getSorMatrix(): SorMatrix {
  return SOR_MATRIX;
}

export function getEntityOwner(entityName: string): SorEntry | undefined {
  return SOR_MATRIX.entities[entityName];
}

export function isProjectionTarget(entityName: string, tenantType: string): boolean {
  const entry = getEntityOwner(entityName);
  if (!entry) return false;
  return entry.projectedIn.includes(tenantType);
}

export function validateEntityRegistered(entityName: string): boolean {
  return entityName in SOR_MATRIX.entities;
}
