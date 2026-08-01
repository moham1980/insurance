export const MOCK_CLAIMS = [
  { claimId: 'clm-001', claimNumber: 'CLM-1402-0001', policyId: 'pol-001', claimantPartyId: 'pty-001', lossDate: '1402-03-15', lossType: 'accident', status: 'registered', description: 'تصادف در بزرگراه تهران-کرج', assessedAmount: 45000000, approvedAmount: null, createdAt: '2024-06-15T10:30:00Z', updatedAt: '2024-06-15T10:30:00Z' },
  { claimId: 'clm-002', claimNumber: 'CLM-1402-0002', policyId: 'pol-002', claimantPartyId: 'pty-002', lossDate: '1402-04-22', lossType: 'fire', status: 'assessed', description: 'آتش‌سوزی انبار', assessedAmount: 120000000, approvedAmount: 110000000, createdAt: '2024-07-22T14:00:00Z', updatedAt: '2024-08-01T09:15:00Z' },
  { claimId: 'clm-003', claimNumber: 'CLM-1402-0003', policyId: 'pol-003', claimantPartyId: 'pty-003', lossDate: '1402-05-10', lossType: 'theft', status: 'approved', description: 'سرقت خودرو', assessedAmount: 85000000, approvedAmount: 85000000, createdAt: '2024-08-10T08:00:00Z', updatedAt: '2024-09-01T16:30:00Z' },
  { claimId: 'clm-004', claimNumber: 'CLM-1402-0004', policyId: 'pol-004', claimantPartyId: 'pty-004', lossDate: '1402-06-05', lossType: 'water_damage', status: 'paid', description: 'خسارت آب‌رفتگی', assessedAmount: 15000000, approvedAmount: 15000000, createdAt: '2024-09-05T11:20:00Z', updatedAt: '2024-10-01T13:45:00Z' },
  { claimId: 'clm-005', claimNumber: 'CLM-1402-0005', policyId: 'pol-005', claimantPartyId: 'pty-005', lossDate: '1402-07-18', lossType: 'accident', status: 'rejected', description: 'تصادف رانندگی', assessedAmount: 30000000, approvedAmount: null, createdAt: '2024-10-18T15:00:00Z', updatedAt: '2024-11-01T10:00:00Z' },
];

export const MOCK_POLICIES = [
  { policyId: 'pol-001', policyNumber: 'POL-1402-0001', uniqueCode: 'UC-001', partyId: 'pty-001', lineOfBusiness: 'car_third_party', status: 'active', startDate: '2024-01-01', endDate: '2024-12-31', premiumAmount: 3200000, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { policyId: 'pol-002', policyNumber: 'POL-1402-0002', uniqueCode: 'UC-002', partyId: 'pty-002', lineOfBusiness: 'fire', status: 'active', startDate: '2024-03-01', endDate: '2025-02-28', premiumAmount: 8500000, createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
  { policyId: 'pol-003', policyNumber: 'POL-1402-0003', uniqueCode: 'UC-003', partyId: 'pty-003', lineOfBusiness: 'car_comprehensive', status: 'active', startDate: '2024-05-15', endDate: '2025-05-14', premiumAmount: 12000000, createdAt: '2024-05-15T00:00:00Z', updatedAt: '2024-05-15T00:00:00Z' },
  { policyId: 'pol-004', policyNumber: 'POL-1402-0004', uniqueCode: 'UC-004', partyId: 'pty-004', lineOfBusiness: 'home', status: 'expired', startDate: '2023-06-01', endDate: '2024-05-31', premiumAmount: 5400000, createdAt: '2023-06-01T00:00:00Z', updatedAt: '2024-05-31T00:00:00Z' },
  { policyId: 'pol-005', policyNumber: 'POL-1402-0005', uniqueCode: 'UC-005', partyId: 'pty-005', lineOfBusiness: 'life', status: 'active', startDate: '2024-02-01', endDate: '2034-01-31', premiumAmount: 18000000, createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z' },
];

export const MOCK_PAYMENTS = [
  { paymentId: 'pay-001', policyId: 'pol-001', partyId: 'pty-001', amount: 3200000, status: 'paid', dueDate: '2024-01-01', paidDate: '2024-01-01', method: 'bank_transfer', createdAt: '2024-01-01T00:00:00Z' },
  { paymentId: 'pay-002', policyId: 'pol-002', partyId: 'pty-002', amount: 8500000, status: 'paid', dueDate: '2024-03-01', paidDate: '2024-03-02', method: 'card', createdAt: '2024-03-01T00:00:00Z' },
  { paymentId: 'pay-003', policyId: 'pol-003', partyId: 'pty-003', amount: 12000000, status: 'pending', dueDate: '2024-11-15', paidDate: null, method: '', createdAt: '2024-05-15T00:00:00Z' },
  { paymentId: 'pay-004', policyId: 'pol-005', partyId: 'pty-005', amount: 18000000, status: 'pending', dueDate: '2025-02-01', paidDate: null, method: '', createdAt: '2024-02-01T00:00:00Z' },
  { paymentId: 'pay-005', policyId: 'pol-001', partyId: 'pty-001', amount: 3200000, status: 'overdue', dueDate: '2024-01-01', paidDate: null, method: '', createdAt: '2024-01-01T00:00:00Z' },
];

export const MOCK_PARTIES = [
  { partyId: 'pty-001', partyType: 'individual', nationalId: '0012345678', firstName: 'محمد', lastName: 'احمدی', phone: '09121234567', email: 'ahmadi@example.com', status: 'verified', createdAt: '2024-01-01T00:00:00Z' },
  { partyId: 'pty-002', partyType: 'legal', nationalId: '10234567890', firstName: 'شرکت', lastName: 'سپهر', phone: '02187654321', email: 'sepehr@co.ir', status: 'verified', createdAt: '2024-01-15T00:00:00Z' },
  { partyId: 'pty-003', partyType: 'individual', nationalId: '0023456789', firstName: 'فاطمه', lastName: 'رضایی', phone: '09123456789', email: 'rezaei@example.com', status: 'pending', createdAt: '2024-03-10T00:00:00Z' },
  { partyId: 'pty-004', partyType: 'individual', nationalId: '0034567890', firstName: 'علی', lastName: 'محمدی', phone: '09120000000', email: 'mohammadi@example.com', status: 'verified', createdAt: '2024-04-20T00:00:00Z' },
  { partyId: 'pty-005', partyType: 'legal', nationalId: '10345678901', firstName: 'شرکت', lastName: 'پارس', phone: '02111111111', email: 'pars@co.ir', status: 'rejected', createdAt: '2024-05-05T00:00:00Z' },
];

export const MOCK_COLLECTIONS = [
  { planId: 'col-001', policyId: 'pol-001', partyId: 'pty-001', totalAmount: 3200000, paidAmount: 3200000, status: 'completed', installments: 1, createdAt: '2024-01-01T00:00:00Z' },
  { planId: 'col-002', policyId: 'pol-002', partyId: 'pty-002', totalAmount: 8500000, paidAmount: 4250000, status: 'in_progress', installments: 2, createdAt: '2024-03-01T00:00:00Z' },
  { planId: 'col-003', policyId: 'pol-003', partyId: 'pty-003', totalAmount: 12000000, paidAmount: 0, status: 'pending', installments: 4, createdAt: '2024-05-15T00:00:00Z' },
  { planId: 'col-004', policyId: 'pol-005', partyId: 'pty-005', totalAmount: 18000000, paidAmount: 9000000, status: 'in_progress', installments: 10, createdAt: '2024-02-01T00:00:00Z' },
];

export const MOCK_FRAUD_ALERTS = [
  { alertId: 'frd-001', claimNumber: 'CLM-1402-0001', claimId: 'clm-001', status: 'open', riskScore: 0.85, holdClaim: true, reason: 'شکستگی غیرمتعارف در زمان ثبت', createdAt: '2024-06-16T00:00:00Z' },
  { alertId: 'frd-002', claimNumber: 'CLM-1402-0003', claimId: 'clm-003', status: 'confirmed', riskScore: 0.92, holdClaim: true, reason: 'سابقه خسارت متعدد در مدت کوتاه', createdAt: '2024-08-11T00:00:00Z' },
  { alertId: 'frd-003', claimNumber: 'CLM-1402-0004', claimId: 'clm-004', status: 'cleared', riskScore: 0.15, holdClaim: false, reason: 'بررسی شد - خطر پایین', createdAt: '2024-09-06T00:00:00Z' },
];

export const MOCK_COMPLAINTS = [
  { complaintId: 'cmp-001', complaintNumber: 'CMP-1402-001', partyId: 'pty-001', subject: 'تأخیر در پرداخت خسارت', status: 'open', priority: 'high', description: 'پاسخگو در مورد تأخیر نیست', createdAt: '2024-07-01T00:00:00Z' },
  { complaintId: 'cmp-002', complaintNumber: 'CMP-1402-002', partyId: 'pty-002', subject: 'صدور بیمه‌نامه با اشتباه', status: 'in_progress', priority: 'medium', description: 'نام بیمه‌گر اشتباه ثبت شده', createdAt: '2024-08-15T00:00:00Z' },
  { complaintId: 'cmp-003', complaintNumber: 'CMP-1402-003', partyId: 'pty-003', subject: 'رضایت از خدمات', status: 'resolved', priority: 'low', description: 'درخواست اصلاح اطلاعات تماس', createdAt: '2024-09-20T00:00:00Z' },
];

export const MOCK_DOCUMENTS = [
  { documentId: 'doc-001', policyId: 'pol-001', type: 'policy_schedule', status: 'processed', fileName: 'بیمه‌نامه-001.pdf', uploadedAt: '2024-01-01T00:00:00Z' },
  { documentId: 'doc-002', claimId: 'clm-001', type: 'claim_photo', status: 'processed', fileName: 'تصادف-001.jpg', uploadedAt: '2024-06-15T00:00:00Z' },
  { documentId: 'doc-003', policyId: 'pol-002', type: 'inspection_report', status: 'pending', fileName: 'بازرسی-002.pdf', uploadedAt: '2024-03-05T00:00:00Z' },
];

export const MOCK_WORK_ITEMS = [
  { workItemId: 'wi-001', type: 'claim_review', status: 'pending', assignee: null, priority: 'high', createdAt: '2024-06-16T00:00:00Z', data: { claimId: 'clm-001', claimNumber: 'CLM-1402-0001' } },
  { workItemId: 'wi-002', type: 'policy_issuance', status: 'assigned', assignee: 'user-001', priority: 'medium', createdAt: '2024-07-22T00:00:00Z', data: { policyId: 'pol-003' } },
  { workItemId: 'wi-003', type: 'fraud_check', status: 'completed', assignee: 'user-002', priority: 'high', createdAt: '2024-08-11T00:00:00Z', data: { alertId: 'frd-002' } },
];

export const MOCK_PRODUCTS = [
  { productId: 'prd-001', code: 'car_third_party', nameFa: 'بیمه شخص ثالث خودرو', nameEn: 'Car Third Party', lineOfBusiness: 'motor', status: 'active', basePremium: 3200000, createdAt: '2024-01-01T00:00:00Z' },
  { productId: 'prd-002', code: 'car_comprehensive', nameFa: 'بیمه تمام‌خطر خودرو', nameEn: 'Car Comprehensive', lineOfBusiness: 'motor', status: 'active', basePremium: 12000000, createdAt: '2024-01-01T00:00:00Z' },
  { productId: 'prd-003', code: 'fire', nameFa: 'بیمه آتش‌سوزی', nameEn: 'Fire Insurance', lineOfBusiness: 'fire', status: 'active', basePremium: 8500000, createdAt: '2024-01-01T00:00:00Z' },
  { productId: 'prd-004', code: 'life', nameFa: 'بیمه عمر', nameEn: 'Life Insurance', lineOfBusiness: 'life', status: 'active', basePremium: 18000000, createdAt: '2024-01-01T00:00:00Z' },
  { productId: 'prd-005', code: 'home', nameFa: 'بیمه خانه', nameEn: 'Home Insurance', lineOfBusiness: 'home', status: 'archived', basePremium: 5400000, createdAt: '2024-01-01T00:00:00Z' },
];

export const MOCK_ORG_UNITS = [
  { orgUnitId: 'org-001', name: 'دفتر مرکزی', parentId: null, type: 'headquarters', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
  { orgUnitId: 'org-002', name: 'شعبه تهران', parentId: 'org-001', type: 'branch', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
  { orgUnitId: 'org-003', name: 'شعبه اصفهان', parentId: 'org-001', type: 'branch', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
  { orgUnitId: 'org-004', name: 'بخش فروش', parentId: 'org-002', type: 'department', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
];

export const MOCK_USERS = [
  { userId: 'usr-001', username: 'admin', email: 'admin@insurance.ir', roles: ['admin'], status: 'active', createdAt: '2024-01-01T00:00:00Z' },
  { userId: 'usr-002', username: 'claims_handler', email: 'claims@insurance.ir', roles: ['claims_handler'], status: 'active', createdAt: '2024-01-01T00:00:00Z' },
  { userId: 'usr-003', username: 'underwriter', email: 'uw@insurance.ir', roles: ['underwriter'], status: 'active', createdAt: '2024-01-01T00:00:00Z' },
  { userId: 'usr-004', username: 'agent', email: 'agent@insurance.ir', roles: ['agent'], status: 'inactive', createdAt: '2024-01-01T00:00:00Z' },
];

export const MOCK_SANHAB = [
  { inquiryId: 'snh-001', nationalId: '0012345678', result: 'verified', resultCode: '00', message: 'تأیید شد', createdAt: '2024-06-01T00:00:00Z' },
  { inquiryId: 'snh-002', nationalId: '0098765432', result: 'not_found', resultCode: '14', message: 'یافت نشد', createdAt: '2024-06-10T00:00:00Z' },
];

export const MOCK_MONITORING = [
  { service: 'claim-service', status: 'healthy', latency: 45, uptime: '99.9%', lastCheck: '2024-11-01T10:00:00Z' },
  { service: 'policy-service', status: 'healthy', latency: 32, uptime: '99.95%', lastCheck: '2024-11-01T10:00:00Z' },
  { service: 'billing-service', status: 'degraded', latency: 250, uptime: '98.5%', lastCheck: '2024-11-01T10:00:00Z' },
  { service: 'workflow-engine', status: 'healthy', latency: 55, uptime: '99.8%', lastCheck: '2024-11-01T10:00:00Z' },
];

export const MOCK_DLQ_MESSAGES = [
  { id: 'dlq-001', topic: 'insurance.claim.events', partition: 0, offset: 1234, error: 'JSON parse error', payload: '{"claimId":"clm-001"}', timestamp: '2024-10-01T00:00:00Z' },
  { id: 'dlq-002', topic: 'insurance.policy.events', partition: 1, offset: 5678, error: 'Schema validation failed', payload: '{"policyId":"pol-001"}', timestamp: '2024-10-02T00:00:00Z' },
  { id: 'dlq-003', topic: 'insurance.billing.events', partition: 0, offset: 9012, error: 'Timeout', payload: '{"paymentId":"pay-001"}', timestamp: '2024-10-03T00:00:00Z' },
];

export const MOCK_REINSURANCE_CONTRACTS = [
  { contractId: 're-001', treatyType: 'quota_share', reinsurer: 'Munich Re', share: 40, status: 'active', startDate: '2024-01-01', endDate: '2024-12-31', premium: 500000000 },
  { contractId: 're-002', treatyType: 'surplus', reinsurer: 'Swiss Re', share: 25, status: 'active', startDate: '2024-01-01', endDate: '2024-12-31', premium: 300000000 },
  { contractId: 're-003', treatyType: 'excess_of_loss', reinsurer: 'Hannover Re', share: 100, status: 'pending', startDate: '2024-06-01', endDate: '2025-05-31', premium: 150000000 },
];

export const MOCK_SALES_NETWORK_PARTNERS = [
  { partnerId: 'ptn-001', name: 'آژانس مرکزی', type: 'agency', status: 'active', commissionRate: 15, policies: 245, createdAt: '2024-01-01T00:00:00Z' },
  { partnerId: 'ptn-002', name: 'آژانس شمال', type: 'agency', status: 'active', commissionRate: 12, policies: 180, createdAt: '2024-01-01T00:00:00Z' },
  { partnerId: 'ptn-003', name: 'کارگزاری پارس', type: 'brokerage', status: 'suspended', commissionRate: 18, policies: 92, createdAt: '2024-02-01T00:00:00Z' },
  { partnerId: 'ptn-004', name: 'آژانس جنوب', type: 'agency', status: 'pending', commissionRate: 14, policies: 0, createdAt: '2024-06-01T00:00:00Z' },
];

export const MOCK_UNDERWRITING_REQUESTS = [
  { requestId: 'uw-001', policyId: 'pol-003', insuredName: 'فاطمه رضایی', product: 'بیمه تمام‌خطر خودرو', status: 'pending', riskLevel: 'MEDIUM', riskScore: 0.45, premium: 12000000, createdAt: '2024-08-10T00:00:00Z' },
  { requestId: 'uw-002', policyId: 'pol-006', insuredName: 'شرکت سپهر', product: 'بیمه آتش‌سوزی', status: 'in_review', riskLevel: 'HIGH', riskScore: 0.72, premium: 8500000, createdAt: '2024-09-15T00:00:00Z' },
  { requestId: 'uw-003', policyId: 'pol-007', insuredName: 'علی محمدی', product: 'بیمه عمر', status: 'approved', riskLevel: 'LOW', riskScore: 0.12, premium: 18000000, createdAt: '2024-10-01T00:00:00Z' },
  { requestId: 'uw-004', policyId: 'pol-008', insuredName: 'محمد احمدی', product: 'بیمه شخص ثالث', status: 'rejected', riskLevel: 'CRITICAL', riskScore: 0.95, premium: 3200000, createdAt: '2024-10-20T00:00:00Z' },
];

export const MOCK_AML_ALERTS = [
  { alertId: 'aml-001', partyId: 'pty-002', type: 'large_transaction', risk: 'high', amount: 500000000, status: 'open', description: 'تراکنش بزرگ غیرعادی', createdAt: '2024-07-01T00:00:00Z' },
  { alertId: 'aml-002', partyId: 'pty-005', type: 'structured_deposits', risk: 'medium', amount: 120000000, status: 'under_review', description: 'ساختار شکسته‌سازی تراکنش', createdAt: '2024-08-15T00:00:00Z' },
  { alertId: 'aml-003', partyId: 'pty-001', type: 'unusual_pattern', risk: 'low', amount: 35000000, status: 'cleared', description: 'بررسی شد - عادی', createdAt: '2024-09-01T00:00:00Z' },
];

export const MOCK_AML_DASHBOARD = {
  totalAlerts: 3,
  openAlerts: 1,
  underReviewAlerts: 1,
  clearedAlerts: 1,
  highRiskAlerts: 1,
  mediumRiskAlerts: 1,
  lowRiskAlerts: 1,
  totalRules: 5,
  activeRules: 4,
  totalConsents: 12,
  activeConsents: 10,
  revokedConsents: 2,
  lastUpdated: '2024-09-01T00:00:00Z',
};

export const MOCK_AML_RULES = [
  { ruleId: 'rul-001', ruleName: 'تراکنش بزرگ', ruleType: 'threshold', expression: 'amount > 100000000', severity: 'high', status: 'enabled', createdAt: '2024-01-01T00:00:00Z' },
  { ruleId: 'rul-002', ruleName: 'شکسته‌سازی تراکنش', ruleType: 'pattern', expression: 'count(amount > 10000000) > 5 in 1h', severity: 'medium', status: 'enabled', createdAt: '2024-02-01T00:00:00Z' },
  { ruleId: 'rul-003', ruleName: 'الگوی غیرعادی', ruleType: 'behavioral', expression: 'deviation > 3sigma', severity: 'low', status: 'enabled', createdAt: '2024-03-01T00:00:00Z' },
  { ruleId: 'rul-004', ruleName: 'تحریم', ruleType: 'sanctions', expression: 'match(sanctions_list)', severity: 'critical', status: 'enabled', createdAt: '2024-04-01T00:00:00Z' },
  { ruleId: 'rul-005', ruleName: 'تراکنش بین‌المللی', ruleType: 'geographic', expression: 'country != IR', severity: 'medium', status: 'disabled', createdAt: '2024-05-01T00:00:00Z' },
];

export const MOCK_AML_CONSENTS = [
  { consentId: 'cns-001', subjectNationalId: '0012345678', consentType: 'data_processing', status: 'active', grantedAt: '2024-01-15T00:00:00Z', revokedAt: null, notes: 'رضایت اولیه' },
  { consentId: 'cns-002', subjectNationalId: '0098765432', consentType: 'data_sharing', status: 'active', grantedAt: '2024-02-20T00:00:00Z', revokedAt: null, notes: 'اشتراک با بیمه‌گر' },
  { consentId: 'cns-003', subjectNationalId: '0011112222', consentType: 'data_processing', status: 'revoked', grantedAt: '2024-03-10T00:00:00Z', revokedAt: '2024-06-01T00:00:00Z', notes: 'درخواست حذف' },
  { consentId: 'cns-004', subjectNationalId: '0033334444', consentType: 'monitoring', status: 'active', grantedAt: '2024-04-05T00:00:00Z', revokedAt: null, notes: 'پایش تراکنش' },
];

export const MOCK_AML_EXPORT = {
  generatedAt: '2024-09-01T00:00:00Z',
  period: '2024-Q3',
  totalAlerts: 3,
  totalRules: 5,
  totalConsents: 12,
  summary: 'گزارش AML سه‌ماهه سوم ۱۴۰۳ شامل ۳ هشدار، ۵ قانون و ۱۲ رضایت.',
};

export const MOCK_CLAIM_DETAIL: Record<string, any> = {
  claimId: 'clm-001',
  claimNumber: 'CLM-1402-0001',
  policyId: 'pol-001',
  claimantPartyId: 'pty-001',
  lossDate: '1402-03-15',
  lossType: 'accident',
  status: 'registered',
  description: 'تصادف در بزرگراه تهران-کرج — برخورد از طرف راست در تقاطع آزادی. خسارت مالی به وسیله نقلیه و آسیب جزئی به خودرو بیمه‌گذار.',
  assessedAmount: 45000000,
  approvedAmount: null,
  requiresHumanTriage: false,
  createdAt: '2024-06-15T10:30:00Z',
  updatedAt: '2024-06-15T10:30:00Z',
  riContractId: null,
  riLastRecoveryId: null,
  riRecoverableAmount: null,
  riRecoveredAmount: null,
  riCurrency: null,
  riLastIdentifiedAt: null,
  riLastReceivedAt: null,
};

export const MOCK_CLAIM_DOCUMENTS = [
  { documentId: 'doc-001', claimId: 'clm-001', documentType: 'claim_photo', fileName: 'تصادف-001.jpg', fileSize: 2048576, mimeType: 'image/jpeg', uploadedAt: '2024-06-15T10:35:00Z', uploadedBy: 'usr-002' },
  { documentId: 'doc-002', claimId: 'clm-001', documentType: 'police_report', fileName: 'گزارش-پلیس.pdf', fileSize: 512000, mimeType: 'application/pdf', uploadedAt: '2024-06-15T11:00:00Z', uploadedBy: 'usr-002' },
  { documentId: 'doc-003', claimId: 'clm-001', documentType: 'claim_photo', fileName: 'تصادف-002.jpg', fileSize: 1843200, mimeType: 'image/jpeg', uploadedAt: '2024-06-15T11:10:00Z', uploadedBy: 'usr-001' },
];

export const MOCK_CLAIM_PAYMENTS = [
  { paymentIntentId: 'pi-001', claimId: 'clm-001', amount: 45000000, currency: 'IRR', status: 'pending', createdAt: '2024-06-16T09:00:00Z', executedAt: null },
];

export const MOCK_CLAIM_EVENTS = [
  { eventId: 'evt-001', eventType: 'ClaimRegistered', eventData: { claimNumber: 'CLM-1402-0001' }, occurredAt: '2024-06-15T10:30:00Z', correlationId: 'corr-001' },
  { eventId: 'evt-002', eventType: 'ClaimAssigned', eventData: { assignee: 'usr-002' }, occurredAt: '2024-06-15T11:00:00Z', correlationId: 'corr-002' },
  { eventId: 'evt-003', eventType: 'DocumentsUploaded', eventData: { count: 3 }, occurredAt: '2024-06-15T11:10:00Z', correlationId: 'corr-003' },
];

export const MOCK_LOSS_ADJUSTERS = [
  { adjusterId: 'la-001', name: 'کارشناس شمال', licenseNo: 'LA-001', status: 'available', assignedClaims: 3, region: 'تهران', rating: 4.5 },
  { adjusterId: 'la-002', name: 'کارشناس جنوب', licenseNo: 'LA-002', status: 'busy', assignedClaims: 8, region: 'اصفهان', rating: 4.2 },
  { adjusterId: 'la-003', name: 'کارشناس مرکز', licenseNo: 'LA-003', status: 'available', assignedClaims: 1, region: 'تهران', rating: 4.8 },
];
