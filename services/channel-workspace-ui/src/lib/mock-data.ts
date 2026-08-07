export const mockWorkspaces = [
  { workspaceId: 'ws-001', channelType: 'کارگزاری', brandKey: 'بیمه ایران', status: 'فعال', subAgentCount: 5, totalCustomers: 142, totalPolicies: 234, totalCommissions: 28450000, description: 'کارگزاری رسمی بیمه ایران با پوشش کامل محصولات شخصی و سازمانی' },
  { workspaceId: 'ws-002', channelType: 'نمایندگی', brandKey: 'بیمه آسیه', status: 'فعال', subAgentCount: 3, totalCustomers: 87, totalPolicies: 156, totalCommissions: 18200000, description: 'نمایندگی فروش بیمه آسیه در منطقه تهران با تخصص بیمه‌های آتش‌سوزی و مهندسی' },
  { workspaceId: 'ws-003', channelType: 'بازاریاب', brandKey: 'بیمه پاسارگاد', status: 'در انتظار', subAgentCount: 0, totalCustomers: 12, totalPolicies: 18, totalCommissions: 2400000, description: 'بازاریاب مستقل بیمه پاسارگاد — در حال راه‌اندازی و اخذ مجوزها' },
];

export const mockOfferings = [
  { offeringId: 'of-001', productName: 'بیمه ثالثی شخصی', carrierName: 'بیمه ایران', premiumRange: '۱.۵ - ۴ میلیون', status: 'فعال', commissionRate: '18%', category: 'شخصی', description: 'پوشش کامل مسئولیت شخص ثالث با امکانات جانبی حوادث راننده و سرنشین', minPremium: 1500000, maxPremium: 4000000 },
  { offeringId: 'of-002', productName: 'بیمه آتش‌سوزی مسکونی', carrierName: 'بیمه آسیه', premiumRange: '۸۰۰ هزار - ۲.۵ میلیون', status: 'فعال', commissionRate: '15%', category: 'مسکن', description: 'بیمه آتش‌سوزی و حوادث ساختمان مسکونی با پوشش لوازم خانگی و مسئولیت', minPremium: 800000, maxPremium: 2500000 },
  { offeringId: 'of-003', productName: 'بیمه حوادث انفرادی', carrierName: 'بیمه پاسارگاد', premiumRange: '۵۰۰ هزار - ۳ میلیون', status: 'فعال', commissionRate: '20%', category: 'شخصی', description: 'بیمه حوادث انفرادی با پوشش فوت، نقص عضو و هزینه‌های درمانی ناشی از حادثه', minPremium: 500000, maxPremium: 3000000 },
  { offeringId: 'of-004', productName: 'بیمه مهندسی عمران', carrierName: 'بیمه البرز', premiumRange: '۲ - ۱۰ میلیون', status: 'فعال', commissionRate: '12%', category: 'مهندسی', description: 'بیمه تمام‌خطر پیمانکاران و مهندسی عمران پروژه‌های ساختمانی', minPremium: 2000000, maxPremium: 10000000 },
  { offeringId: 'of-005', productName: 'بیمه درمان تکمیلی', carrierName: 'بیمه ایران', premiumRange: '۳ - ۸ میلیون', status: 'فعال', commissionRate: '14%', category: 'سلامت', description: 'بیمه درمان تکمیلی با پوشش بستری، سرپایی و dental خدمات', minPremium: 3000000, maxPremium: 8000000 },
  { offeringId: 'of-006', productName: 'بیمه مسئولیت کارفرما', carrierName: 'بیمه آسیه', premiumRange: '۱ - ۵ میلیون', status: 'فعال', commissionRate: '16%', category: 'مسئولیت', description: 'بیمه مسئولیت کارفرما در قبال کارکنان طبق قانون کار', minPremium: 1000000, maxPremium: 5000000 },
  { offeringId: 'of-007', productName: 'بیمه باربری', carrierName: 'بیمه پاسارگاد', premiumRange: '۵۰۰ هزار - ۳ میلیون', status: 'فعال', commissionRate: '19%', category: 'باربری', description: 'بیمه تمام‌خطر باربری داخلی و بین‌المللی', minPremium: 500000, maxPremium: 3000000 },
];

export const mockSubmissions = [
  { submissionId: 'sub-001', submissionNumber: 'S-1403-001', productName: 'بیمه ثالثی شخصی', customerName: 'علی محمدی', carrierName: 'بیمه ایران', status: 'در انتظار قیمت‌گذاری', createdAt: '۱۴۰۳/۰۵/۱۰', premium: 3200000, description: 'بیمه ثالثی خودرو پژو ۲۰۷ مدل ۱۴۰۲' },
  { submissionId: 'sub-002', submissionNumber: 'S-1403-002', productName: 'بیمه آتش‌سوزی مسکونی', customerName: 'مریم احمدی', carrierName: 'بیمه آسیه', status: 'قیمت‌گذاری شده', createdAt: '۱۴۰۳/۰۵/۱۲', premium: 1800000, description: 'بیمه آتش‌سوزی آپارتمان ۱۲۰ متری در منطقه غرب تهران' },
  { submissionId: 'sub-003', submissionNumber: 'S-1403-003', productName: 'بیمه حوادث انفرادی', customerName: 'حسین رضایی', carrierName: 'بیمه پاسارگاد', status: 'تسویه شده', createdAt: '۱۴۰۳/۰۵/۰۸', premium: 1200000, description: 'بیمه حوادث انفرادی پوشش ۱۰۰ میلیون تومان' },
  { submissionId: 'sub-004', submissionNumber: 'S-1403-004', productName: 'بیمه مهندسی عمران', customerName: 'فاطمه کریمی', carrierName: 'بیمه البرز', status: 'در انتظار قیمت‌گذاری', createdAt: '۱۴۰۳/۰۵/۱۴', premium: 8500000, description: 'بیمه تمام‌خطر پروژه ساختمانی ۸ واحدی در شمال تهران' },
  { submissionId: 'sub-005', submissionNumber: 'S-1403-005', productName: 'بیمه درمان تکمیلی', customerName: 'رضا صادقی', carrierName: 'بیمه ایران', status: 'قیمت‌گذاری شده', createdAt: '۱۴۰۳/۰۵/۱۵', premium: 4500000, description: 'بیمه درمان تکمیلی خانواده ۴ نفره پلان VIP' },
  { submissionId: 'sub-006', submissionNumber: 'S-1403-006', productName: 'بیمه باربری', customerName: 'سارا موسوی', carrierName: 'بیمه پاسارگاد', status: 'صدور شده', createdAt: '۱۴۰۳/۰۵/۰۵', premium: 2200000, description: 'بیمه باربری محموله صنعتی مسیر تهران-بندرعباس' },
];

export const mockCommissions = [
  { commissionId: 'cm-001', policyNumber: 'B-1403-0231', carrierName: 'بیمه ایران', premium: 2500000, rate: '18%', amount: 450000, status: 'پرداخت شده', dueDate: '۱۴۰۳/۰۶/۰۱' },
  { commissionId: 'cm-002', policyNumber: 'B-1403-0232', carrierName: 'بیمه آسیه', premium: 1800000, rate: '15%', amount: 270000, status: 'در انتظار', dueDate: '۱۴۰۳/۰۶/۱۵' },
  { commissionId: 'cm-003', policyNumber: 'B-1403-0233', carrierName: 'بیمه پاسارگاد', premium: 3200000, rate: '20%', amount: 640000, status: 'در انتظار', dueDate: '۱۴۰۳/۰۷/۰۱' },
  { commissionId: 'cm-004', policyNumber: 'B-1403-0230', carrierName: 'بیمه ایران', premium: 1500000, rate: '18%', amount: 270000, status: 'پرداخت شده', dueDate: '۱۴۰۳/۰۵/۰۱' },
];

export const mockCustomers = [
  { partyId: 'p-001', name: 'علی محمدی', phone: '09121234567', email: 'a.mohammadi@mail.ir', policies: 3, totalPremium: 7500000, status: 'فعال', nationalId: '0012345678', address: 'تهران، خیابان ولیعصر، پلاک ۱۲', joinDate: '۱۴۰۲/۰۳/۱۵', lastActivity: '۱۴۰۳/۰۵/۱۴' },
  { partyId: 'p-002', name: 'مریم احمدی', phone: '09127654321', email: 'm.ahmadi@mail.ir', policies: 2, totalPremium: 4000000, status: 'فعال', nationalId: '0023456789', address: 'تهران، خیابان شریعتی، کوچه گلستان', joinDate: '۱۴۰۲/۰۶/۰۱', lastActivity: '۱۴۰۳/۰۵/۱۰' },
  { partyId: 'p-003', name: 'حسین رضایی', phone: '09131112233', email: 'h.rezaei@mail.ir', policies: 1, totalPremium: 3200000, status: 'فعال', nationalId: '0034567890', address: 'اصفهان، خیابان چهارباغ', joinDate: '۱۴۰۲/۰۹/۲۰', lastActivity: '۱۴۰۳/۰۴/۲۵' },
  { partyId: 'p-004', name: 'فاطمه کریمی', phone: '09150001122', email: 'f.karimi@mail.ir', policies: 2, totalPremium: 7300000, status: 'فعال', nationalId: '0045678901', address: 'تهران، سعادت‌آباد، بلوار دریا', joinDate: '۱۴۰۱/۱۱/۱۰', lastActivity: '۱۴۰۳/۰۵/۱۲' },
  { partyId: 'p-005', name: 'رضا صادقی', phone: '09163334455', email: 'r.sadeghi@mail.ir', policies: 1, totalPremium: 1200000, status: 'غیرفعال', nationalId: '0056789012', address: 'شیراز، خیابان زند', joinDate: '۱۴۰۲/۰۲/۰۵', lastActivity: '۱۴۰۳/۰۲/۱۸' },
  { partyId: 'p-006', name: 'سارا موسوی', phone: '09174445566', email: 's.mousavi@mail.ir', policies: 4, totalPremium: 12500000, status: 'فعال', nationalId: '0067890123', address: 'تهران، فرشته، کوچه نسترن', joinDate: '۱۴۰۱/۰۵/۲۲', lastActivity: '۱۴۰۳/۰۵/۱۵' },
  { partyId: 'p-007', name: 'محمد جعفری', phone: '09185556677', email: 'm.jafari@mail.ir', policies: 2, totalPremium: 5800000, status: 'فعال', nationalId: '0078901234', address: 'کرج، گوهردشت، بلوار طالقانی', joinDate: '۱۴۰۲/۰۸/۱۲', lastActivity: '۱۴۰۳/۰۵/۰۹' },
];

export const mockSubAgents = [
  { agentId: 'sa-001', name: 'محمد رضایی', code: 'A-1001', phone: '09121234567', email: 'm.rezaei@broker.ir', status: 'فعال', policies: 45, commission: 8500000, customers: 38, joinDate: '۱۴۰۲/۰۱/۱۵', region: 'تهران مرکز' },
  { agentId: 'sa-002', name: 'زهرا حسینی', code: 'A-1002', phone: '09127654321', email: 'z.hosseini@broker.ir', status: 'فعال', policies: 32, commission: 6200000, customers: 27, joinDate: '۱۴۰۲/۰۴/۰۱', region: 'تهران شمال' },
  { agentId: 'sa-003', name: 'رضا کریمی', code: 'A-1003', phone: '09131112233', email: 'r.karimi@broker.ir', status: 'غیرفعال', policies: 12, commission: 2100000, customers: 10, joinDate: '۱۴۰۲/۰۷/۲۰', region: 'کرج' },
  { agentId: 'sa-004', name: 'نرگس احمدی', code: 'A-1004', phone: '09196667788', email: 'n.ahmadi@broker.ir', status: 'فعال', policies: 28, commission: 5400000, customers: 22, joinDate: '۱۴۰۲/۰۲/۱۰', region: 'تهران غرب' },
];

export const mockPartners = [
  { partnerId: 'pt-001', name: 'بیمه ایران', type: 'بیمه‌گر', status: 'فعال', agreements: 3, totalPolicies: 120, contactPerson: 'محمد احمدی', phone: '021-88123456', email: 'm.ahmadi@iran-insurance.ir' },
  { partnerId: 'pt-002', name: 'بیمه آسیه', type: 'بیمه‌گر', status: 'فعال', agreements: 2, totalPolicies: 65, contactPerson: 'علی رضایی', phone: '021-88234567', email: 'a.rezaei@asia-insurance.ir' },
  { partnerId: 'pt-003', name: 'بیمه پاسارگاد', type: 'بیمه‌گر', status: 'فعال', agreements: 2, totalPolicies: 48, contactPerson: 'حسین کریمی', phone: '021-88345678', email: 'h.karimi@pasargad-insurance.ir' },
  { partnerId: 'pt-004', name: 'بیمه البرز', type: 'بیمه‌گر', status: 'در مذاکره', agreements: 1, totalPolicies: 15, contactPerson: 'مریم صادقی', phone: '021-88456789', email: 'm.sadeghi@alborz-insurance.ir' },
  { partnerId: 'pt-005', name: 'بیمه دانا', type: 'بیمه‌گر', status: 'فعال', agreements: 1, totalPolicies: 32, contactPerson: 'سعید موسوی', phone: '021-88567890', email: 's.mousavi@dana-insurance.ir' },
];

export const mockDashboardStats = {
  activeSubmissions: 8,
  totalCommissions: '۲۸٬۴۵۰٬۰۰۰ تومان',
  totalCommissionsAmount: 28450000,
  totalCustomers: 142,
  totalOfferings: 7,
  totalPolicies: 234,
  pendingCommissions: '۶٬۲۰۰٬۰۰۰ تومان',
  pendingCommissionsAmount: 6200000,
  conversionRate: '68%',
  monthlyGrowth: '+12%',
  recentActivity: [
    { description: 'درخواست جدید S-1403-006 ثبت شد', timestamp: '۱۴۰۳/۰۵/۱۵', type: 'submission' },
    { description: 'بیمه‌نامه POL-1403-045 صادر شد', timestamp: '۱۴۰۳/۰۵/۱۴', type: 'policy' },
    { description: 'پورسانت ۴٬۵۰۰٬۰۰۰ تومان تسویه شد', timestamp: '۱۴۰۳/۰۵/۱۲', type: 'commission' },
    { description: 'پرونده خسارت CLM-1403-92145 ثبت شد', timestamp: '۱۴۰۳/۰۵/۱۰', type: 'claim' },
    { description: 'نماینده فرعی جدید A-1004 اضافه شد', timestamp: '۱۴۰۳/۰۵/۰۸', type: 'subagent' },
  ],
  monthlyChartData: [
    { month: 'فروردین', submissions: 12, policies: 8, commissions: 4200000 },
    { month: 'اردیبهشت', submissions: 15, policies: 11, commissions: 5800000 },
    { month: 'خرداد', submissions: 18, policies: 14, commissions: 7200000 },
    { month: 'تیر', submissions: 14, policies: 10, commissions: 5400000 },
    { month: 'مرداد', submissions: 20, policies: 16, commissions: 8100000 },
  ],
};

export function formatToman(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

export const mockBrokerDashboard = {
  stats: {
    activeAgreements: 8,
    activePlacements: 23,
    pendingSettlements: 5,
    activeClaims: 12,
    subAgents: 6,
    partners: 5,
    totalCommissionYTD: 45200000,
    totalPoliciesYTD: 312,
    recentActivity: [
      { description: 'قرارداد جدید با بیمه ایران امضا شد', timestamp: '۱۴۰۳/۰۵/۱۴', type: 'agreement' },
      { description: 'سفارش POL-1403-045 صادر شد', timestamp: '۱۴۰۳/۰۵/۱۳', type: 'placement' },
      { description: 'تسویه پورسانت به مبلغ ۴٬۵۰۰٬۰۰۰ تومان انجام شد', timestamp: '۱۴۰۳/۰۵/۱۲', type: 'settlement' },
      { description: 'پرونده خسارت CLM-1403-92145 ثبت شد', timestamp: '۱۴۰۳/۰۵/۱۰', type: 'claim' },
      { description: 'نماینده فرعی جدید: نرگس احمدی اضافه شد', timestamp: '۱۴۰۳/۰۵/۰۸', type: 'subagent' },
      { description: 'شریک جدید: بیمه دانا به لیست اضافه شد', timestamp: '۱۴۰۳/۰۵/۰۵', type: 'partner' },
    ],
    monthlyChartData: [
      { month: 'فروردین', placements: 8, settlements: 5, commissions: 6200000 },
      { month: 'اردیبهشت', placements: 12, settlements: 7, commissions: 8400000 },
      { month: 'خرداد', placements: 15, settlements: 9, commissions: 10500000 },
      { month: 'تیر', placements: 10, settlements: 6, commissions: 7800000 },
      { month: 'مرداد', placements: 18, settlements: 11, commissions: 12300000 },
    ],
  },
};

export const mockAgreements = { rows: [
  { agreementId: 'ag-001', carrierName: 'بیمه ایران', agreementType: 'کارگزاری', startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۴/۰۱/۰۱', commissionRate: '18%', status: 'فعال', products: 5, totalPolicies: 120 },
  { agreementId: 'ag-002', carrierName: 'بیمه آسیه', agreementType: 'کارگزاری', startDate: '۱۴۰۳/۰۲/۱۵', endDate: '۱۴۰۴/۰۲/۱۵', commissionRate: '15%', status: 'فعال', products: 3, totalPolicies: 65 },
  { agreementId: 'ag-003', carrierName: 'بیمه پاسارگاد', agreementType: 'نمایندگی', startDate: '۱۴۰۳/۰۳/۰۱', endDate: '۱۴۰۴/۰۳/۰۱', commissionRate: '20%', status: 'فعال', products: 4, totalPolicies: 48 },
  { agreementId: 'ag-004', carrierName: 'بیمه البرز', agreementType: 'بازاریاب', startDate: '۱۴۰۳/۰۴/۱۰', endDate: '۱۴۰۴/۰۴/۱۰', commissionRate: '12%', status: 'در مذاکره', products: 2, totalPolicies: 15 },
  { agreementId: 'ag-005', carrierName: 'بیمه دانا', agreementType: 'کارگزاری', startDate: '۱۴۰۳/۰۳/۲۰', endDate: '۱۴۰۴/۰۳/۲۰', commissionRate: '14%', status: 'فعال', products: 3, totalPolicies: 32 },
]};

export const mockBrokerOfferings = { rows: [
  { offeringId: 'bof-001', productName: 'بیمه ثالثی شخصی', carrierName: 'بیمه ایران', premiumRange: '۱.۵ - ۴ میلیون', commissionRate: '18%', status: 'فعال', category: 'شخصی' },
  { offeringId: 'bof-002', productName: 'بیمه آتش‌سوزی مسکونی', carrierName: 'بیمه آسیه', premiumRange: '۸۰۰ هزار - ۲.۵ میلیون', commissionRate: '15%', status: 'فعال', category: 'مسکن' },
  { offeringId: 'bof-003', productName: 'بیمه حوادث انفرادی', carrierName: 'بیمه پاسارگاد', premiumRange: '۵۰۰ هزار - ۳ میلیون', commissionRate: '20%', status: 'فعال', category: 'شخصی' },
  { offeringId: 'bof-004', productName: 'بیمه مهندسی عمران', carrierName: 'بیمه البرز', premiumRange: '۲ - ۱۰ میلیون', commissionRate: '12%', status: 'فعال', category: 'مهندسی' },
  { offeringId: 'bof-005', productName: 'بیمه درمان تکمیلی', carrierName: 'بیمه ایران', premiumRange: '۳ - ۸ میلیون', commissionRate: '14%', status: 'فعال', category: 'سلامت' },
  { offeringId: 'bof-006', productName: 'بیمه مسئولیت کارفرما', carrierName: 'بیمه آسیه', premiumRange: '۱ - ۵ میلیون', commissionRate: '16%', status: 'فعال', category: 'مسئولیت' },
]};

export const mockPlacements = { rows: [
  { placementId: 'pl-001', placementNumber: 'PL-1403-001', customerName: 'علی محمدی', productName: 'بیمه ثالثی شخصی', carrierName: 'بیمه ایران', premium: 3200000, status: 'صادر شده', date: '۱۴۰۳/۰۵/۱۰', policyNumber: 'POL-IRN-001' },
  { placementId: 'pl-002', placementNumber: 'PL-1403-002', customerName: 'مریم احمدی', productName: 'بیمه آتش‌سوزی مسکونی', carrierName: 'بیمه آسیه', premium: 1800000, status: 'در حال صدور', date: '۱۴۰۳/۰۵/۱۲', policyNumber: '' },
  { placementId: 'pl-003', placementNumber: 'PL-1403-003', customerName: 'حسین رضایی', productName: 'بیمه حوادث انفرادی', carrierName: 'بیمه پاسارگاد', premium: 2500000, status: 'صادر شده', date: '۱۴۰۳/۰۵/۰۸', policyNumber: 'POL-PSG-003' },
  { placementId: 'pl-004', placementNumber: 'PL-1403-004', customerName: 'فاطمه کریمی', productName: 'بیمه مهندسی عمران', carrierName: 'بیمه البرز', premium: 8500000, status: 'در حال صدور', date: '۱۴۰۳/۰۵/۱۴', policyNumber: '' },
  { placementId: 'pl-005', placementNumber: 'PL-1403-005', customerName: 'سارا موسوی', productName: 'بیمه درمان تکمیلی', carrierName: 'بیمه ایران', premium: 4500000, status: 'صادر شده', date: '۱۴۰۳/۰۵/۰۶', policyNumber: 'POL-IRN-005' },
  { placementId: 'pl-006', placementNumber: 'PL-1403-006', customerName: 'محمد جعفری', productName: 'بیمه باربری', carrierName: 'بیمه پاسارگاد', premium: 2200000, status: 'مستندات ناقص', date: '۱۴۰۳/۰۵/۱۵', policyNumber: '' },
]};

export const mockSettlements = { rows: [
  { settlementId: 'st-001', period: 'خرداد ۱۴۰۳', carrierName: 'بیمه ایران', totalPremium: 45000000, commissionAmount: 8100000, status: 'تسویه شده', settlementDate: '۱۴۰۳/۰۴/۰۱' },
  { settlementId: 'st-002', period: 'خرداد ۱۴۰۳', carrierName: 'بیمه آسیه', totalPremium: 28000000, commissionAmount: 4200000, status: 'تسویه شده', settlementDate: '۱۴۰۳/۰۴/۰۱' },
  { settlementId: 'st-003', period: 'تیر ۱۴۰۳', carrierName: 'بیمه ایران', totalPremium: 52000000, commissionAmount: 9360000, status: 'در انتظار', settlementDate: '' },
  { settlementId: 'st-004', period: 'تیر ۱۴۰۳', carrierName: 'بیمه پاسارگاد', totalPremium: 31000000, commissionAmount: 6200000, status: 'در انتظار', settlementDate: '' },
  { settlementId: 'st-005', period: 'تیر ۱۴۰۳', carrierName: 'بیمه آسیه', totalPremium: 18000000, commissionAmount: 2700000, status: 'در انتظار', settlementDate: '' },
  { settlementId: 'st-006', period: 'مرداد ۱۴۰۳', carrierName: 'بیمه دانا', totalPremium: 12000000, commissionAmount: 1680000, status: 'تسویه شده', settlementDate: '۱۴۰۳/۰۶/۰۱' },
]};

export const mockBrokerClaims = { rows: [
  { claimId: 'bcl-001', claimNumber: 'CLM-1403-92145', policyNumber: 'POL-1403-0231', customerName: 'علی محمدی', lossType: 'تصادف', amount: 15000000, status: 'در حال بررسی', date: '۱۴۰۳/۰۵/۱۰', description: 'تصادف رانندگی خودرو پژو ۲۰۷ — خسارت بدنه و شخص ثالث' },
  { claimId: 'bcl-002', claimNumber: 'CLM-1403-92146', policyNumber: 'POL-1403-0232', customerName: 'مریم احمدی', lossType: 'سرقت', amount: 85000000, status: 'تأیید شده', date: '۱۴۰۳/۰۵/۰۸', description: 'سرقت لوازم خانگی از آپارتمان مسکونی' },
  { claimId: 'bcl-003', claimNumber: 'CLM-1403-92147', policyNumber: 'POL-1403-0233', customerName: 'حسین رضایی', lossType: 'آتش‌سوزی', amount: 120000000, status: 'ثبت شده', date: '۱۴۰۳/۰۵/۱۴', description: 'آتش‌سوزی انبار صنعتی — در حال ارزیابی کارشناس' },
  { claimId: 'bcl-004', claimNumber: 'CLM-1403-92148', policyNumber: 'POL-1403-0234', customerName: 'فاطمه کریمی', lossType: 'حوادث', amount: 5000000, status: 'پرداخت شده', date: '۱۴۰۳/۰۴/۲۰', description: 'جراحت ناشی از حادثه کاری در کارگاه ساختمانی' },
]};

export const mockContracts = { rows: [
  { contractId: 'ct-001', contractNumber: 'CT-1403-001', carrierName: 'بیمه ایران', contractType: 'کارگزاری', startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۴/۰۱/۰۱', status: 'فعال', value: 450000000 },
  { contractId: 'ct-002', contractNumber: 'CT-1403-002', carrierName: 'بیمه آسیه', contractType: 'نمایندگی', startDate: '۱۴۰۳/۰۲/۱۵', endDate: '۱۴۰۴/۰۲/۱۵', status: 'فعال', value: 280000000 },
  { contractId: 'ct-003', contractNumber: 'CT-1403-003', carrierName: 'بیمه پاسارگاد', contractType: 'بازاریاب', startDate: '۱۴۰۳/۰۳/۰۱', endDate: '۱۴۰۴/۰۳/۰۱', status: 'فعال', value: 310000000 },
  { contractId: 'ct-004', contractNumber: 'CT-1403-004', carrierName: 'بیمه دانا', contractType: 'کارگزاری', startDate: '۱۴۰۳/۰۳/۲۰', endDate: '۱۴۰۴/۰۳/۲۰', status: 'فعال', value: 120000000 },
]};

export const mockBrokerSubAgents = { rows: [
  { id: 'bsa-001', name: 'محمد رضایی', code: 'A-1001', phone: '09121234567', email: 'm.rezaei@broker.ir', status: 'فعال', policies: 45, region: 'تهران مرکز' },
  { id: 'bsa-002', name: 'زهرا حسینی', code: 'A-1002', phone: '09127654321', email: 'z.hosseini@broker.ir', status: 'فعال', policies: 32, region: 'تهران شمال' },
  { id: 'bsa-003', name: 'رضا کریمی', code: 'A-1003', phone: '09131112233', email: 'r.karimi@broker.ir', status: 'غیرفعال', policies: 12, region: 'کرج' },
  { id: 'bsa-004', name: 'نرگس احمدی', code: 'A-1004', phone: '09196667788', email: 'n.ahmadi@broker.ir', status: 'فعال', policies: 28, region: 'تهران غرب' },
]};

export const mockBrokerDocuments = { rows: [
  { id: 'DOC-001', carrierName: 'بیمه ایران', docType: 'قرارداد کارگزاری', fileName: 'قرارداد-ایران-1403.pdf', fileSize: '۲.۴ MB', uploadDate: '۱۴۰۳/۰۱/۱۵', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-002', carrierName: 'بیمه ایران', docType: 'مجوز فعالیت', fileName: 'مجوز-نمایندگی-ایران.pdf', fileSize: '۱.۱ MB', uploadDate: '۱۴۰۳/۰۱/۱۵', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-003', carrierName: 'بیمه آسیه', docType: 'قرارداد کارگزاری', fileName: 'قرارداد-آسیه-1403.pdf', fileSize: '۱.۸ MB', uploadDate: '۱۴۰۳/۰۲/۲۰', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-004', carrierName: 'بیمه آسیه', docType: 'بیمه‌نامه نمونه', fileName: 'نمونه-بیمه‌نامه-آسیه.pdf', fileSize: '۸۲۰ KB', uploadDate: '۱۴۰۳/۰۳/۰۱', status: 'در حال بررسی', uploadedBy: 'کارشناس فروش' },
  { id: 'DOC-005', carrierName: 'بیمه پاسارگاد', docType: 'قرارداد نمایندگی', fileName: 'قرارداد-پاسارگاد-1403.pdf', fileSize: '۳.۲ MB', uploadDate: '۱۴۰۳/۰۳/۱۰', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
  { id: 'DOC-006', carrierName: 'بیمه البرز', docType: 'درخواست همکاری', fileName: 'درخواست-البرز.pdf', fileSize: '۶۵۰ KB', uploadDate: '۱۴۰۳/۰۶/۰۱', status: 'در انتظار', uploadedBy: 'کارشناس فروش' },
  { id: 'DOC-007', carrierName: 'بیمه دانا', docType: 'قرارداد کارگزاری', fileName: 'قرارداد-دانا-1403.pdf', fileSize: '۲.۱ MB', uploadDate: '۱۴۰۳/۰۳/۲۵', status: 'تأیید شده', uploadedBy: 'مدیر کارگزاری' },
]};

export const mockSubAgentHierarchy = {
  id: 'root', name: 'کارگزاری مرکزی', code: 'BRK-001', status: 'فعال', policies: 117,
  children: [
    { id: 'sa-001', name: 'محمد رضایی', code: 'A-1001', status: 'فعال', policies: 45, phone: '09121234567', region: 'تهران مرکز', children: [
      { id: 'sa-005', name: 'احمد نوری', code: 'A-1005', status: 'فعال', policies: 18, phone: '09140001122', region: 'تهران مرکز', children: [] },
      { id: 'sa-006', name: 'سمیرا کاظمی', code: 'A-1006', status: 'فعال', policies: 12, phone: '09150002233', region: 'تهران مرکز', children: [] },
    ]},
    { id: 'sa-002', name: 'زهرا حسینی', code: 'A-1002', status: 'فعال', policies: 32, phone: '09127654321', region: 'تهران شمال', children: [
      { id: 'sa-007', name: 'مریم نوری', code: 'A-1007', status: 'فعال', policies: 8, phone: '09160003344', region: 'تهران شمال', children: [] },
    ]},
    { id: 'sa-003', name: 'رضا کریمی', code: 'A-1003', status: 'غیرفعال', policies: 12, phone: '09131112233', region: 'کرج', children: [] },
    { id: 'sa-004', name: 'نرگس احمدی', code: 'A-1004', status: 'فعال', policies: 28, phone: '09196667788', region: 'تهران غرب', children: [] },
  ],
};

export const mockBrokerQuotes = { rows: [
  { quoteId: 'qt-001', submissionNumber: 'S-1403-001', carrierName: 'بیمه ایران', productName: 'بیمه ثالثی شخصی', premium: 2500000, coverage: '۱۰۰ میلیون', deductible: '۵۰۰ هزار', commissionRate: '18%', score: 85, validUntil: '۱۴۰۳/۰۶/۱۰', status: 'معتبر' },
  { quoteId: 'qt-002', submissionNumber: 'S-1403-001', carrierName: 'بیمه آسیه', productName: 'بیمه ثالثی شخصی', premium: 2200000, coverage: '۸۰ میلیون', deductible: '۳۰۰ هزار', commissionRate: '15%', score: 78, validUntil: '۱۴۰۳/۰۶/۱۰', status: 'معتبر' },
  { quoteId: 'qt-003', submissionNumber: 'S-1403-001', carrierName: 'بیمه پاسارگاد', productName: 'بیمه ثالثی شخصی', premium: 2800000, coverage: '۱۲۰ میلیون', deductible: '۵۰۰ هزار', commissionRate: '20%', score: 92, validUntil: '۱۴۰۳/۰۶/۱۲', status: 'معتبر' },
  { quoteId: 'qt-004', submissionNumber: 'S-1403-002', carrierName: 'بیمه آسیه', productName: 'بیمه آتش‌سوزی مسکونی', premium: 1800000, coverage: '۵۰ میلیون', deductible: '۲۰۰ هزار', commissionRate: '15%', score: 88, validUntil: '۱۴۰۳/۰۶/۱۵', status: 'معتبر' },
  { quoteId: 'qt-005', submissionNumber: 'S-1403-002', carrierName: 'بیمه ایران', productName: 'بیمه آتش‌سوزی مسکونی', premium: 2100000, coverage: '۶۰ میلیون', deductible: '۳۰۰ هزار', commissionRate: '18%', score: 82, validUntil: '۱۴۰۳/۰۶/۱۵', status: 'منقضی' },
]};

export const mockBrokerPolicies = { rows: [
  { policyId: 'pol-001', policyNumber: 'POL-IRN-001', customerName: 'علی محمدی', carrierName: 'بیمه ایران', productName: 'بیمه ثالثی شخصی', premium: 3200000, startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۳/۱۲/۲۹', status: 'فعال', uniqueCode: 'IRN-1403-001' },
  { policyId: 'pol-002', policyNumber: 'POL-AS-002', customerName: 'مریم احمدی', carrierName: 'بیمه آسیه', productName: 'بیمه آتش‌سوزی مسکونی', premium: 1800000, startDate: '۱۴۰۳/۰۲/۰۱', endDate: '۱۴۰۴/۰۱/۳۱', status: 'فعال', uniqueCode: 'AS-1403-002' },
  { policyId: 'pol-003', policyNumber: 'POL-PSG-003', customerName: 'حسین رضایی', carrierName: 'بیمه پاسارگاد', productName: 'بیمه حوادث انفرادی', premium: 2500000, startDate: '۱۴۰۳/۰۱/۱۵', endDate: '۱۴۰۳/۱۲/۲۹', status: 'فعال', uniqueCode: 'PSG-1403-003' },
  { policyId: 'pol-004', policyNumber: 'POL-IRN-005', customerName: 'سارا موسوی', carrierName: 'بیمه ایران', productName: 'بیمه درمان تکمیلی', premium: 4500000, startDate: '۱۴۰۳/۰۳/۰۱', endDate: '۱۴۰۴/۰۲/۲۹', status: 'فعال', uniqueCode: 'IRN-1403-005' },
  { policyId: 'pol-005', policyNumber: 'POL-DA-006', customerName: 'محمد جعفری', carrierName: 'بیمه دانا', productName: 'بیمه باربری', premium: 2200000, startDate: '۱۴۰۳/۰۴/۰۱', endDate: '۱۴۰۴/۰۳/۳۱', status: 'فعال', uniqueCode: 'DA-1403-006' },
  { policyId: 'pol-006', policyNumber: 'POL-IRN-007', customerName: 'رضا صادقی', carrierName: 'بیمه ایران', productName: 'بیمه ثالثی شخصی', premium: 1500000, startDate: '۱۴۰۲/۰۶/۰۱', endDate: '۱۴۰۳/۰۵/۳۱', status: 'منقضی', uniqueCode: 'IRN-1402-007' },
]};

export const mockBrokerBrandSettings = {
  displayNameFa: 'کارگزاری بیمه پارس',
  displayNameEn: 'Pars Insurance Brokerage',
  primaryColor: '#1a56db',
  logoUrl: '/logos/pars-broker.png',
  supportPhone: '021-88123456',
  supportEmail: 'support@parsbroker.ir',
  domain: 'parsbroker.ir',
  rtl: true,
  calendarType: 'jalali',
  defaultCurrency: 'IRT',
};

export const mockChannelCapabilities: string[] = [
  'dashboard', 'overview', 'offerings', 'submissions', 'quotes', 'placements',
  'commissions', 'settlements', 'customers', 'claims', 'subAgents', 'partners',
  'documents', 'brandSettings',
];

export const mockBrokerCapabilities: string[] = [
  'dashboard', 'agreements', 'offerings', 'placements', 'settlements',
  'claims', 'contracts', 'subAgents', 'partners', 'documents', 'subAgentTree',
  'customers', 'submissions', 'quotes', 'commissions', 'policies', 'brandSettings',
];

export const mockBrokerPartners = { rows: [
  { id: 'bp-001', name: 'بیمه ایران', type: 'بیمه‌گر', contactPerson: 'محمد احمدی', phone: '021-88123456', email: 'm.ahmadi@iran-insurance.ir', status: 'فعال', totalPolicies: 120 },
  { id: 'bp-002', name: 'بیمه آسیه', type: 'بیمه‌گر', contactPerson: 'علی رضایی', phone: '021-88234567', email: 'a.rezaei@asia-insurance.ir', status: 'فعال', totalPolicies: 65 },
  { id: 'bp-003', name: 'بیمه پاسارگاد', type: 'بیمه‌گر', contactPerson: 'حسین کریمی', phone: '021-88345678', email: 'h.karimi@pasargad-insurance.ir', status: 'فعال', totalPolicies: 48 },
  { id: 'bp-004', name: 'بیمه البرز', type: 'بیمه‌گر', contactPerson: 'مریم صادقی', phone: '021-88456789', email: 'm.sadeghi@alborz-insurance.ir', status: 'در مذاکره', totalPolicies: 15 },
  { id: 'bp-005', name: 'بیمه دانا', type: 'بیمه‌گر', contactPerson: 'سعید موسوی', phone: '021-88567890', email: 's.mousavi@dana-insurance.ir', status: 'فعال', totalPolicies: 32 },
]};
