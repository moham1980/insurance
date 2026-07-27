export const partyFixtures = {
  individual: {
    type: 'individual',
    fullName: 'John Doe',
    nationalId: '1234567890',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    maritalStatus: 'single',
    address: {
      street: '123 Main St',
      city: 'Tehran',
      postalCode: '12345',
      country: 'IR',
    },
    contact: {
      email: 'john.doe@example.com',
      phone: '+989123456789',
    },
  },
  legal: {
    type: 'legal',
    companyName: 'Test Company Ltd',
    registrationNumber: 'REG123456',
    nationalId: '9876543210',
    establishedDate: '2010-01-01',
    legalForm: 'LLC',
    address: {
      street: '456 Business Ave',
      city: 'Tehran',
      postalCode: '67890',
      country: 'IR',
    },
    contact: {
      email: 'info@testcompany.com',
      phone: '+989876543210',
    },
  },
};

export const quoteFixtures = {
  basic: {
    productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    lineOfBusiness: 'AUTO',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    premiumAmount: 15000000,
    coverages: [{ type: 'third_party', limit: 500000000 }],
    deductibles: [{ type: 'collision', amount: 5000000 }],
  },
};

export const claimFixtures = {
  basic: {
    lossDate: new Date().toISOString(),
    lossType: 'accident',
    description: 'Test claim description',
    estimatedAmount: 100000000,
    location: {
      address: 'Test Location',
      city: 'Tehran',
    },
  },
};

export const paymentFixtures = {
  premium: {
    amount: 15000000,
    currency: 'IRR',
    paymentMethod: 'bank_transfer',
    reference: 'REF-001',
  },
  claim: {
    amount: 50000000,
    currency: 'IRR',
    paymentMethod: 'bank_transfer',
    reference: 'REF-002',
  },
};
