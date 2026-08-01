export const mockDashboard = {
  stats: {
    activeAgreements: 12,
    activePolicies: 348,
    openClaims: 23,
    pendingPayments: 8,
    underwritingQueue: 5,
    pendingCollections: 14,
  },
  trends: [
    { month: 'فروردین', policies: 32, premium: 145000000 },
    { month: 'اردیبهشت', policies: 28, premium: 132000000 },
    { month: 'خرداد', policies: 35, premium: 168000000 },
    { month: 'تیر', policies: 41, premium: 195000000 },
    { month: 'مرداد', policies: 38, premium: 182000000 },
    { month: 'شهریور', policies: 45, premium: 210000000 },
  ],
  recentActivity: [
    { description: 'صدور بیمه‌نامه B-1403-0231', timestamp: '۱۴۰۳/۰۵/۱۵ - ۱۰:۳۰' },
    { description: 'تسویه پورسانت ماه مرداد', timestamp: '۱۴۰۳/۰۵/۱۴ - ۱۴:۱۵' },
    { description: 'پذیرش درخواست خسارت CLM-8821', timestamp: '۱۴۰۳/۰۵/۱۴ - ۰۹:۰۰' },
    { description: 'تمدید قرارداد با بیمه ایران', timestamp: '۱۴۰۳/۰۵/۱۳ - ۱۶:۴۵' },
  ],
};

export const mockAgreements = [
  { id: 'AG-001', carrierName: 'بیمه ایران', productLine: 'ثالثی', commissionRate: '18%', status: 'فعال', startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۳/۱۲/۲۹' },
  { id: 'AG-002', carrierName: 'بیمه آسیه', productLine: 'آتش‌سوزی', commissionRate: '15%', status: 'فعال', startDate: '۱۴۰۳/۰۲/۰۱', endDate: '۱۴۰۴/۰۱/۳۱' },
  { id: 'AG-003', carrierName: 'بیمه پاسارگاد', productLine: 'حوادث', commissionRate: '20%', status: 'فعال', startDate: '۱۴۰۳/۰۱/۱۵', endDate: '۱۴۰۳/۱۲/۲۹' },
  { id: 'AG-004', carrierName: 'بیمه البرز', productLine: 'مهندسی', commissionRate: '12%', status: 'در مذاکره', startDate: '۱۴۰۳/۰۶/۰۱', endDate: '—' },
  { id: 'AG-005', carrierName: 'بیمه رازی', productLine: 'کشتی', commissionRate: '10%', status: 'منقضی', startDate: '۱۴۰۲/۰۱/۰۱', endDate: '۱۴۰۲/۱۲/۲۹' },
];

export const mockOfferings = [
  { id: 'OF-001', productName: 'بیمه ثالثی شخصی', carrierName: 'بیمه ایران', premiumRange: '۱.۵ - ۴ میلیون تومان', status: 'فعال' },
  { id: 'OF-002', productName: 'بیمه آتش‌سوزی مسکونی', carrierName: 'بیمه آسیه', premiumRange: '۸۰۰ هزار - ۲.۵ میلیون تومان', status: 'فعال' },
  { id: 'OF-003', productName: 'بیمه حوادث انفرادی', carrierName: 'بیمه پاسارگاد', premiumRange: '۵۰۰ هزار - ۳ میلیون تومان', status: 'فعال' },
  { id: 'OF-004', productName: 'بیمه مهندسی عمران', carrierName: 'بیمه البرز', premiumRange: '۲ - ۱۰ میلیون تومان', status: 'فعال' },
  { id: 'OF-005', productName: 'بیمه مسئولیت پزشکان', carrierName: 'بیمه ایران', premiumRange: '۳ - ۸ میلیون تومان', status: 'فعال' },
];

export const mockSubmissions = [
  { id: 'SUB-001', submissionNumber: 'S-1403-001', customerName: 'علی محمدی', productName: 'بیمه ثالثی', status: 'در انتظار قیمت‌گذاری', createdAt: '۱۴۰۳/۰۵/۱۰' },
  { id: 'SUB-002', submissionNumber: 'S-1403-002', customerName: 'مریم احمدی', productName: 'بیمه آتش‌سوزی', status: 'قیمت‌گذاری شده', createdAt: '۱۴۰۳/۰۵/۱۲' },
  { id: 'SUB-003', submissionNumber: 'S-1403-003', customerName: 'حسین رضایی', productName: 'بیمه حوادث', status: 'تسویه شده', createdAt: '۱۴۰۳/۰۵/۰۸' },
  { id: 'SUB-004', submissionNumber: 'S-1403-004', customerName: 'فاطمه کریمی', productName: 'بیمه مهندسی', status: 'در انتظار قیمت‌گذاری', createdAt: '۱۴۰۳/۰۵/۱۴' },
];

export const mockQuotes = [
  { id: 'Q-001', carrierName: 'بیمه ایران', premium: 2500000, coverage: '۱۰۰ میلیون', deductible: '۵۰۰ هزار', score: 85, isSelected: false },
  { id: 'Q-002', carrierName: 'بیمه آسیه', premium: 2200000, coverage: '۸۰ میلیون', deductible: '۳۰۰ هزار', score: 78, isSelected: false },
  { id: 'Q-003', carrierName: 'بیمه پاسارگاد', premium: 2800000, coverage: '۱۲۰ میلیون', deductible: '۵۰۰ هزار', score: 92, isSelected: true },
];

export const mockPlacements = [
  { id: 'PL-001', placementNumber: 'P-1403-001', customerName: 'علی محمدی', carrierName: 'بیمه ایران', premium: 2500000, status: 'صادر شده', createdAt: '۱۴۰۳/۰۵/۱۰' },
  { id: 'PL-002', placementNumber: 'P-1403-002', customerName: 'مریم احمدی', carrierName: 'بیمه آسیه', premium: 1800000, status: 'در حال صدور', createdAt: '۱۴۰۳/۰۵/۱۲' },
  { id: 'PL-003', placementNumber: 'P-1403-003', customerName: 'حسین رضایی', carrierName: 'بیمه پاسارگاد', premium: 3200000, status: 'صادر شده', createdAt: '۱۴۰۳/۰۵/۰۸' },
];

export const mockCommissions = [
  { id: 'CM-001', policyNumber: 'B-1403-0231', carrierName: 'بیمه ایران', premium: 2500000, rate: '18%', amount: 450000, status: 'پرداخت شده', dueDate: '۱۴۰۳/۰۶/۰۱' },
  { id: 'CM-002', policyNumber: 'B-1403-0232', carrierName: 'بیمه آسیه', premium: 1800000, rate: '15%', amount: 270000, status: 'در انتظار', dueDate: '۱۴۰۳/۰۶/۱۵' },
  { id: 'CM-003', policyNumber: 'B-1403-0233', carrierName: 'بیمه پاسارگاد', premium: 3200000, rate: '20%', amount: 640000, status: 'در انتظار', dueDate: '۱۴۰۳/۰۷/۰۱' },
  { id: 'CM-004', policyNumber: 'B-1403-0230', carrierName: 'بیمه ایران', premium: 1500000, rate: '18%', amount: 270000, status: 'پرداخت شده', dueDate: '۱۴۰۳/۰۵/۰۱' },
];

export const mockSubAgents = [
  { id: 'SA-001', name: 'محمد رضایی', code: 'A-1001', phone: '09121234567', email: 'm.rezaei@broker.ir', status: 'فعال', policies: 45 },
  { id: 'SA-002', name: 'زهرا حسینی', code: 'A-1002', phone: '09127654321', email: 'z.hosseini@broker.ir', status: 'فعال', policies: 32 },
  { id: 'SA-003', name: 'رضا کریمی', code: 'A-1003', phone: '09131112233', email: 'r.karimi@broker.ir', status: 'غیرفعال', policies: 12 },
];

export const mockClaims = [
  { id: 'CLM-8821', claimNumber: 'CL-1403-8821', policyNumber: 'B-1403-0231', customerName: 'علی محمدی', type: 'ثالثی', status: 'در حال بررسی', amount: 15000000, date: '۱۴۰۳/۰۵/۱۰' },
  { id: 'CLM-8822', claimNumber: 'CL-1403-8822', policyNumber: 'B-1403-0232', customerName: 'مریم احمدی', type: 'آتش‌سوزی', status: 'تایید شده', amount: 8000000, date: '۱۴۰۳/۰۵/۱۲' },
  { id: 'CLM-8823', claimNumber: 'CL-1403-8823', policyNumber: 'B-1403-0233', customerName: 'حسین رضایی', type: 'حوادث', status: 'رد شده', amount: 5000000, date: '۱۴۰۳/۰۵/۰۸' },
];

export const mockPolicies = [
  { id: '1', policyNumber: 'B-1403-0231', customerName: 'علی محمدی', type: 'ثالثی شخصی', status: 'فعال', premium: 2500000, startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۳/۱۲/۲۹' },
  { id: '2', policyNumber: 'B-1403-0232', customerName: 'مریم احمدی', type: 'آتش‌سوزی مسکونی', status: 'فعال', premium: 1800000, startDate: '۱۴۰۳/۰۲/۰۱', endDate: '۱۴۰۴/۰۱/۳۱' },
  { id: '3', policyNumber: 'B-1403-0233', customerName: 'حسین رضایی', type: 'حوادث انفرادی', status: 'فعال', premium: 3200000, startDate: '۱۴۰۳/۰۱/۱۵', endDate: '۱۴۰۳/۱۲/۲۹' },
  { id: '4', policyNumber: 'B-1403-0234', customerName: 'فاطمه کریمی', type: 'مهندسی', status: 'در انتظار', premium: 5500000, startDate: '۱۴۰۳/۰۶/۰۱', endDate: '۱۴۰۴/۰۵/۳۱' },
];

export const mockPayments = [
  { id: 'PAY-001', policyNumber: 'B-1403-0231', customerName: 'علی محمدی', amount: 2500000, status: 'موفق', method: 'کارت بانکی', date: '۱۴۰۳/۰۱/۰۱' },
  { id: 'PAY-002', policyNumber: 'B-1403-0232', customerName: 'مریم احمدی', amount: 1800000, status: 'موفق', method: 'انتقال بانکی', date: '۱۴۰۳/۰۲/۰۱' },
  { id: 'PAY-003', policyNumber: 'B-1403-0233', customerName: 'حسین رضایی', amount: 3200000, status: 'در انتظار', method: 'کارت بانکی', date: '۱۴۰۳/۰۵/۱۰' },
];

export const mockDocuments = [
  { id: 'DOC-001', carrierName: 'بیمه ایران', docType: 'قرارداد کارگزاری', fileName: 'قرارداد-ایران-1403.pdf', fileSize: '۲.۴ MB', uploadDate: '۱۴۰۳/۰۱/۱۵', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-002', carrierName: 'بیمه ایران', docType: 'مجوز فعالیت', fileName: 'مجوز-نمایندگی-ایران.pdf', fileSize: '۱.۱ MB', uploadDate: '۱۴۰۳/۰۱/۱۵', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-003', carrierName: 'بیمه آسیه', docType: 'قرارداد کارگزاری', fileName: 'قرارداد-آسیه-1403.pdf', fileSize: '۱.۸ MB', uploadDate: '۱۴۰۳/۰۲/۲۰', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-004', carrierName: 'بیمه آسیه', docType: 'بیمه‌نامه نمونه', fileName: 'نمونه-بیمه‌نامه-آسیه.pdf', fileSize: '۸۲۰ KB', uploadDate: '۱۴۰۳/۰۳/۰۱', status: 'در حال بررسی', uploadedBy: 'کارشناس فروش' },
  { id: 'DOC-005', carrierName: 'بیمه پاسارگاد', docType: 'قرارداد نمایندگی', fileName: 'قرارداد-پاسارگاد-1403.pdf', fileSize: '۳.۲ MB', uploadDate: '۱۴۰۳/۰۳/۱۰', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-006', carrierName: 'بیمه البرز', docType: 'درخواست همکاری', fileName: 'درخواست-البرز.pdf', fileSize: '۶۵۰ KB', uploadDate: '۱۴۰۳/۰۶/۰۱', status: 'در انتظار', uploadedBy: 'کارشناس فروش' },
  { id: 'DOC-007', carrierName: 'بیمه دانا', docType: 'قرارداد کارگزاری', fileName: 'قرارداد-دانا-1403.pdf', fileSize: '۲.۱ MB', uploadDate: '۱۴۰۳/۰۳/۲۵', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-008', carrierName: 'بیمه ایران', docType: 'کارت ملی مدیر', fileName: 'کارت-ملی.pdf', fileSize: '۴۲۰ KB', uploadDate: '۱۴۰۳/۰۱/۱۵', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
];

export const mockSettlements = [
  { id: 'ST-001', period: 'خرداد ۱۴۰۳', carrierName: 'بیمه ایران', totalPremium: 45000000, commissionAmount: 8100000, status: 'تسویه شده', settlementDate: '۱۴۰۳/۰۴/۰۱', policyCount: 18, referenceNumber: 'REF-IRN-001' },
  { id: 'ST-002', period: 'خرداد ۱۴۰۳', carrierName: 'بیمه آسیه', totalPremium: 28000000, commissionAmount: 4200000, status: 'تسویه شده', settlementDate: '۱۴۰۳/۰۴/۰۱', policyCount: 12, referenceNumber: 'REF-AS-002' },
  { id: 'ST-003', period: 'تیر ۱۴۰۳', carrierName: 'بیمه ایران', totalPremium: 52000000, commissionAmount: 9360000, status: 'در انتظار', settlementDate: '', policyCount: 22, referenceNumber: '' },
  { id: 'ST-004', period: 'تیر ۱۴۰۳', carrierName: 'بیمه پاسارگاد', totalPremium: 31000000, commissionAmount: 6200000, status: 'در انتظار', settlementDate: '', policyCount: 15, referenceNumber: '' },
  { id: 'ST-005', period: 'تیر ۱۴۰۳', carrierName: 'بیمه آسیه', totalPremium: 18000000, commissionAmount: 2700000, status: 'در انتظار', settlementDate: '', policyCount: 8, referenceNumber: '' },
  { id: 'ST-006', period: 'مرداد ۱۴۰۳', carrierName: 'بیمه دانا', totalPremium: 12000000, commissionAmount: 1680000, status: 'تسویه شده', settlementDate: '۱۴۰۳/۰۶/۰۱', policyCount: 6, referenceNumber: 'REF-DA-006' },
];

export const mockPartners = [
  { id: 'PT-001', name: 'بیمه ایران', type: 'بیمه‌گر', contactPerson: 'محمد احمدی', phone: '021-88123456', email: 'm.ahmadi@iran-insurance.ir', status: 'فعال', totalPolicies: 120, agreements: 3 },
  { id: 'PT-002', name: 'بیمه آسیه', type: 'بیمه‌گر', contactPerson: 'علی رضایی', phone: '021-88234567', email: 'a.rezaei@asia-insurance.ir', status: 'فعال', totalPolicies: 65, agreements: 2 },
  { id: 'PT-003', name: 'بیمه پاسارگاد', type: 'بیمه‌گر', contactPerson: 'حسین کریمی', phone: '021-88345678', email: 'h.karimi@pasargad-insurance.ir', status: 'فعال', totalPolicies: 48, agreements: 2 },
  { id: 'PT-004', name: 'بیمه البرز', type: 'بیمه‌گر', contactPerson: 'مریم صادقی', phone: '021-88456789', email: 'm.sadeghi@alborz-insurance.ir', status: 'در مذاکره', totalPolicies: 15, agreements: 1 },
  { id: 'PT-005', name: 'بیمه دانا', type: 'بیمه‌گر', contactPerson: 'سعید موسوی', phone: '021-88567890', email: 's.mousavi@dana-insurance.ir', status: 'فعال', totalPolicies: 32, agreements: 1 },
];

export const mockSubAgentHierarchy = {
  id: 'root',
  name: 'کارگزاری مرکزی',
  code: 'BRK-001',
  status: 'فعال',
  policies: 117,
  children: [
    {
      id: 'sa-001', name: 'محمد رضایی', code: 'A-1001', status: 'فعال', policies: 45, phone: '09121234567', region: 'تهران مرکز',
      children: [
        { id: 'sa-005', name: 'احمد نوری', code: 'A-1005', status: 'فعال', policies: 18, phone: '09140001122', region: 'تهران مرکز', children: [] },
        { id: 'sa-006', name: 'سمیرا کاظمی', code: 'A-1006', status: 'فعال', policies: 12, phone: '09150002233', region: 'تهران مرکز', children: [] },
      ],
    },
    {
      id: 'sa-002', name: 'زهرا حسینی', code: 'A-1002', status: 'فعال', policies: 32, phone: '09127654321', region: 'تهران شمال',
      children: [
        { id: 'sa-007', name: 'مریم نوری', code: 'A-1007', status: 'فعال', policies: 8, phone: '09160003344', region: 'تهران شمال', children: [] },
      ],
    },
    {
      id: 'sa-003', name: 'رضا کریمی', code: 'A-1003', status: 'غیرفعال', policies: 12, phone: '09131112233', region: 'کرج',
      children: [],
    },
    {
      id: 'sa-004', name: 'نرگس احمدی', code: 'A-1004', status: 'فعال', policies: 28, phone: '09196667788', region: 'تهران غرب',
      children: [],
    },
  ],
};

export const mockUnderwriting: any[] = [
  { id: 'UW-001', policyId: 'B-1403-0234', status: 'در حال بررسی', decision: 'ارجاع به ارزیاب', reason: 'مبلغ حق بیمه بالای سقف صلاحیت صدور', customerName: 'فاطمه کریمی', carrierName: 'بیمه البرز', productType: 'مهندسی', premium: 5500000, date: '۱۴۰۳/۰۶/۰۱' },
  { id: 'UW-002', policyId: 'B-1403-0235', status: 'تأیید شده', decision: 'صدور مستقیم', reason: 'در محدوده صلاحیت', customerName: 'علی محمدی', carrierName: 'بیمه ایران', productType: 'ثالثی', premium: 2500000, date: '۱۴۰۳/۰۵/۲۰' },
  { id: 'UW-003', policyId: 'B-1403-0236', status: 'رد شده', decision: 'رد به دلیل ریسک بالا', reason: 'سابقه خسارت متعدد در یک سال گذشته', customerName: 'حسین رضایی', carrierName: 'بیمه پاسارگاد', productType: 'حوادث', premium: 3200000, date: '۱۴۰۳/۰۵/۱۵' },
  { id: 'UW-004', policyId: 'B-1403-0237', status: 'در حال بررسی', decision: 'در انتظار مدارک تکمیلی', reason: 'نیاز به بررسی پزشکی', customerName: 'مریم احمدی', carrierName: 'بیمه ایران', productType: 'مسئولیت پزشکان', premium: 4800000, date: '۱۴۰۳/۰۶/۱۰' },
  { id: 'UW-005', policyId: 'B-1403-0238', status: 'تأیید شده', decision: 'صدور مستقیم', reason: 'در محدوده صلاحیت', customerName: 'رضا کریمی', carrierName: 'بیمه آسیه', productType: 'آتش‌سوزی', premium: 1800000, date: '۱۴۰۳/۰۶/۰۵' },
];

export const mockCollectionsPlans: any[] = [
  { id: 'COL-001', policyId: 'B-1403-0231', customerName: 'علی محمدی', status: 'فعال', totalAmount: 2500000, paidAmount: 1250000, remainingAmount: 1250000, installmentCount: 4, paidCount: 2, nextDueDate: '۱۴۰۳/۰۷/۰۱' },
  { id: 'COL-002', policyId: 'B-1403-0232', customerName: 'مریم احمدی', status: 'فعال', totalAmount: 1800000, paidAmount: 1800000, remainingAmount: 0, installmentCount: 3, paidCount: 3, nextDueDate: '—' },
  { id: 'COL-003', policyId: 'B-1403-0233', customerName: 'حسین رضایی', status: 'سررسید گذشته', totalAmount: 3200000, paidAmount: 800000, remainingAmount: 2400000, installmentCount: 4, paidCount: 1, nextDueDate: '۱۴۰۳/۰۴/۰۱' },
  { id: 'COL-004', policyId: 'B-1403-0234', customerName: 'فاطمه کریمی', status: 'فعال', totalAmount: 5500000, paidAmount: 1375000, remainingAmount: 4125000, installmentCount: 4, paidCount: 1, nextDueDate: '۱۴۰۳/۰۹/۰۱' },
];

export const mockCollectionsInstallments: Record<string, any[]> = {
  'COL-001': [
    { id: 'INS-001', installmentNumber: 1, amount: 625000, dueDate: '۱۴۰۳/۰۳/۰۱', status: 'پرداخت شده' },
    { id: 'INS-002', installmentNumber: 2, amount: 625000, dueDate: '۱۴۰۳/۰۵/۰۱', status: 'پرداخت شده' },
    { id: 'INS-003', installmentNumber: 3, amount: 625000, dueDate: '۱۴۰۳/۰۷/۰۱', status: 'در انتظار' },
    { id: 'INS-004', installmentNumber: 4, amount: 625000, dueDate: '۱۴۰۳/۰۹/۰۱', status: 'در انتظار' },
  ],
  'COL-002': [
    { id: 'INS-005', installmentNumber: 1, amount: 600000, dueDate: '۱۴۰۳/۰۲/۰۱', status: 'پرداخت شده' },
    { id: 'INS-006', installmentNumber: 2, amount: 600000, dueDate: '۱۴۰۳/۰۴/۰۱', status: 'پرداخت شده' },
    { id: 'INS-007', installmentNumber: 3, amount: 600000, dueDate: '۱۴۰۳/۰۶/۰۱', status: 'پرداخت شده' },
  ],
  'COL-003': [
    { id: 'INS-008', installmentNumber: 1, amount: 800000, dueDate: '۱۴۰۳/۰۲/۰۱', status: 'پرداخت شده' },
    { id: 'INS-009', installmentNumber: 2, amount: 800000, dueDate: '۱۴۰۳/۰۴/۰۱', status: 'سررسید گذشته' },
    { id: 'INS-010', installmentNumber: 3, amount: 800000, dueDate: '۱۴۰۳/۰۶/۰۱', status: 'در انتظار' },
    { id: 'INS-011', installmentNumber: 4, amount: 800000, dueDate: '۱۴۰۳/۰۸/۰۱', status: 'در انتظار' },
  ],
  'COL-004': [
    { id: 'INS-012', installmentNumber: 1, amount: 1375000, dueDate: '۱۴۰۳/۰۶/۰۱', status: 'پرداخت شده' },
    { id: 'INS-013', installmentNumber: 2, amount: 1375000, dueDate: '۱۴۰۳/۰۹/۰۱', status: 'در انتظار' },
    { id: 'INS-014', installmentNumber: 3, amount: 1375000, dueDate: '۱۴۰۳/۱۲/۰۱', status: 'در انتظار' },
    { id: 'INS-015', installmentNumber: 4, amount: 1375000, dueDate: '۱۴۰۴/۰۳/۰۱', status: 'در انتظار' },
  ],
};

export const mockCapabilities = [
  'dashboard', 'agreements', 'offerings', 'submissions', 'quotes',
  'placements', 'commissions', 'subagents', 'claims', 'policies',
  'payments', 'underwriting', 'collections', 'regulatory',
  'documents', 'settlements', 'partners',
];

export function formatToman(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}
