/**
 * Customer 360 Component
 * Displays unified customer profile with aggregated data from all services
 */

import React, { useState, useEffect } from 'react';

interface Customer360Profile {
  customerId: string;
  personalProfile: {
    firstName: string;
    lastName: string;
    nationalId: string;
    dateOfBirth: string;
    gender: string;
    maritalStatus: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    };
  };
  policies: Array<{
    policyId: string;
    policyNumber: string;
    productType: string;
    status: string;
    startDate: string;
    endDate: string;
    premium: number;
  }>;
  claims: Array<{
    claimId: string;
    claimNumber: string;
    policyId: string;
    status: string;
    incidentDate: string;
    reportedDate: string;
    estimatedAmount: number;
  }>;
  payments: Array<{
    paymentId: string;
    amount: number;
    currency: string;
    paymentDate: string;
    status: string;
    type: string;
  }>;
  complaints: Array<{
    complaintId: string;
    subject: string;
    status: string;
    createdDate: string;
    priority: string;
  }>;
  amlKycStatus: {
    amlStatus: string;
    kycStatus: string;
    riskLevel: string;
    lastScreeningDate: string;
  };
  journeyEvents: Array<{
    eventId: string;
    eventType: string;
    eventDate: string;
    description: string;
    source: string;
  }>;
  riskProfile: {
    riskScore: number;
    riskCategory: string;
    factors: Array<{ factor: string; value: string }>;
  };
  preferences: {
    communicationPreferences: string[];
    language: string;
    timezone: string;
  };
  consent: {
    marketingConsent: boolean;
    dataProcessingConsent: boolean;
    consentDate: string;
  };
  dataCompleteness: {
    profile: number;
    policies: number;
    claims: number;
    payments: number;
    overall: number;
  };
}

interface Customer360Props {
  customerId?: string;
}

export const Customer360: React.FC<Customer360Props> = ({ customerId: propCustomerId }) => {
  const [customerId, setCustomerId] = useState(propCustomerId || '');
  const [profile, setProfile] = useState<Customer360Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'claims' | 'payments' | 'journey'>('overview');

  const fetchCustomerProfile = async () => {
    if (!customerId) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setProfile({
        customerId,
        personalProfile: {
          firstName: 'Ali',
          lastName: 'Rezaei',
          nationalId: '1234567890',
          dateOfBirth: '1985-05-15',
          gender: 'Male',
          maritalStatus: 'Married',
          email: 'ali.rezaei@example.com',
          phone: '+98 21 1234 5678',
          address: {
            street: '123 Valiasr Street',
            city: 'Tehran',
            province: 'Tehran',
            postalCode: '1234567890',
          },
        },
        policies: [
          {
            policyId: 'pol-1',
            policyNumber: 'POL-2024-001',
            productType: 'Auto Insurance',
            status: 'Active',
            startDate: '2024-01-01',
            endDate: '2025-01-01',
            premium: 5000000,
          },
          {
            policyId: 'pol-2',
            policyNumber: 'POL-2024-002',
            productType: 'Health Insurance',
            status: 'Active',
            startDate: '2024-03-01',
            endDate: '2025-03-01',
            premium: 8000000,
          },
        ],
        claims: [
          {
            claimId: 'claim-1',
            claimNumber: 'CLM-2024-001',
            policyId: 'pol-1',
            status: 'Assessment',
            incidentDate: '2024-04-10',
            reportedDate: '2024-04-11',
            estimatedAmount: 15000000,
          },
        ],
        payments: [
          {
            paymentId: 'pay-1',
            amount: 5000000,
            currency: 'IRR',
            paymentDate: '2024-01-01',
            status: 'Completed',
            type: 'Premium',
          },
          {
            paymentId: 'pay-2',
            amount: 8000000,
            currency: 'IRR',
            paymentDate: '2024-03-01',
            status: 'Completed',
            type: 'Premium',
          },
        ],
        complaints: [],
        amlKycStatus: {
          amlStatus: 'Cleared',
          kycStatus: 'Verified',
          riskLevel: 'Low',
          lastScreeningDate: '2024-04-01',
        },
        journeyEvents: [
          {
            eventId: 'evt-1',
            eventType: 'Policy Created',
            eventDate: '2024-01-01',
            description: 'Auto insurance policy created',
            source: 'Policy Service',
          },
          {
            eventId: 'evt-2',
            eventType: 'Payment Made',
            eventDate: '2024-01-01',
            description: 'Premium payment of 5,000,000 IRR',
            source: 'Payment Service',
          },
          {
            eventId: 'evt-3',
            eventType: 'Policy Created',
            eventDate: '2024-03-01',
            description: 'Health insurance policy created',
            source: 'Policy Service',
          },
          {
            eventId: 'evt-4',
            eventType: 'Payment Made',
            eventDate: '2024-03-01',
            description: 'Premium payment of 8,000,000 IRR',
            source: 'Payment Service',
          },
          {
            eventId: 'evt-5',
            eventType: 'Claim Submitted',
            eventDate: '2024-04-11',
            description: 'Auto insurance claim submitted',
            source: 'Claims Service',
          },
        ],
        riskProfile: {
          riskScore: 25,
          riskCategory: 'Low',
          factors: [
            { factor: 'Claims History', value: '1 claim in 12 months' },
            { factor: 'Payment History', value: '100% on-time' },
            { factor: 'AML Screening', value: 'Clear' },
            { factor: 'KYC Verification', value: 'Verified' },
          ],
        },
        preferences: {
          communicationPreferences: ['Email', 'SMS'],
          language: 'fa',
          timezone: 'Asia/Tehran',
        },
        consent: {
          marketingConsent: true,
          dataProcessingConsent: true,
          consentDate: '2024-01-01',
        },
        dataCompleteness: {
          profile: 95,
          policies: 100,
          claims: 100,
          payments: 100,
          overall: 98,
        },
      });
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerProfile();
    }
  }, [customerId]);

  const handleSearch = () => {
    fetchCustomerProfile();
  };

  if (!profile) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer 360</h2>
          <p className="text-gray-600">View unified customer profile</p>
        </div>

        <div className="flex space-x-3">
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Enter Customer ID"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'policies' as const, label: 'Policies' },
    { id: 'claims' as const, label: 'Claims' },
    { id: 'payments' as const, label: 'Payments' },
    { id: 'journey' as const, label: 'Journey' },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Customer 360</h2>
          <button
            onClick={() => {
              setCustomerId('');
              setProfile(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            New Search
          </button>
        </div>
        <p className="text-gray-600">Customer ID: {customerId}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Personal Profile */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Profile</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-500">Name</span>
                <p className="font-medium">{profile.personalProfile.firstName} {profile.personalProfile.lastName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">National ID</span>
                <p className="font-medium">{profile.personalProfile.nationalId}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Date of Birth</span>
                <p className="font-medium">{profile.personalProfile.dateOfBirth}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Email</span>
                <p className="font-medium">{profile.personalProfile.email}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Phone</span>
                <p className="font-medium">{profile.personalProfile.phone}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Address</span>
                <p className="font-medium">{profile.personalProfile.address.city}, {profile.personalProfile.address.province}</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <span className="text-sm text-gray-600">Active Policies</span>
              <p className="text-2xl font-bold text-blue-600">{profile.policies.length}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <span className="text-sm text-gray-600">Open Claims</span>
              <p className="text-2xl font-bold text-orange-600">{profile.claims.filter(c => c.status !== 'Closed').length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <span className="text-sm text-gray-600">Total Premium</span>
              <p className="text-2xl font-bold text-green-600">{profile.policies.reduce((sum, p) => sum + p.premium, 0).toLocaleString()} IRR</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <span className="text-sm text-gray-600">Risk Score</span>
              <p className="text-2xl font-bold text-purple-600">{profile.riskProfile.riskScore}</p>
            </div>
          </div>

          {/* AML/KYC Status */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">AML/KYC Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-500">AML Status</span>
                <p className="font-medium text-green-600">{profile.amlKycStatus.amlStatus}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">KYC Status</span>
                <p className="font-medium text-green-600">{profile.amlKycStatus.kycStatus}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Risk Level</span>
                <p className="font-medium">{profile.amlKycStatus.riskLevel}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Last Screening</span>
                <p className="font-medium">{profile.amlKycStatus.lastScreeningDate}</p>
              </div>
            </div>
          </div>

          {/* Data Completeness */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Completeness</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profile</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${profile.dataCompleteness.profile}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{profile.dataCompleteness.profile}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Policies</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${profile.dataCompleteness.policies}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{profile.dataCompleteness.policies}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Claims</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${profile.dataCompleteness.claims}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{profile.dataCompleteness.claims}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payments</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${profile.dataCompleteness.payments}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{profile.dataCompleteness.payments}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-gray-600 font-medium">Overall</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${profile.dataCompleteness.overall}%` }}></div>
                  </div>
                  <span className="text-sm font-bold">{profile.dataCompleteness.overall}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-4">
          {profile.policies.map(policy => (
            <div key={policy.policyId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{policy.policyNumber}</h3>
                  <p className="text-sm text-gray-500">{policy.productType}</p>
                </div>
                <span className={`px-3 py-1 text-sm rounded ${policy.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {policy.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Start Date:</span> {policy.startDate}
                </div>
                <div>
                  <span className="text-gray-500">End Date:</span> {policy.endDate}
                </div>
                <div>
                  <span className="text-gray-500">Premium:</span> {policy.premium.toLocaleString()} IRR
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="space-y-4">
          {profile.claims.map(claim => (
            <div key={claim.claimId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{claim.claimNumber}</h3>
                  <p className="text-sm text-gray-500">Policy: {claim.policyId}</p>
                </div>
                <span className={`px-3 py-1 text-sm rounded ${
                  claim.status === 'Closed' ? 'bg-green-100 text-green-800' :
                  claim.status === 'Assessment' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {claim.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Incident Date:</span> {claim.incidentDate}
                </div>
                <div>
                  <span className="text-gray-500">Reported Date:</span> {claim.reportedDate}
                </div>
                <div>
                  <span className="text-gray-500">Estimated Amount:</span> {claim.estimatedAmount.toLocaleString()} IRR
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          {profile.payments.map(payment => (
            <div key={payment.paymentId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{payment.paymentId}</h3>
                  <p className="text-sm text-gray-500">{payment.type}</p>
                </div>
                <span className={`px-3 py-1 text-sm rounded ${payment.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {payment.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Amount:</span> {payment.amount.toLocaleString()} {payment.currency}
                </div>
                <div>
                  <span className="text-gray-500">Payment Date:</span> {payment.paymentDate}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'journey' && (
        <div className="space-y-4">
          {profile.journeyEvents.map((event, index) => (
            <div key={event.eventId} className="flex items-start space-x-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                {index < profile.journeyEvents.length - 1 && (
                  <div className="w-0.5 h-16 bg-gray-300"></div>
                )}
              </div>
              <div className="flex-1 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{event.eventType}</h3>
                    <p className="text-sm text-gray-500">{event.source}</p>
                  </div>
                  <span className="text-sm text-gray-500">{event.eventDate}</span>
                </div>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Customer360;
