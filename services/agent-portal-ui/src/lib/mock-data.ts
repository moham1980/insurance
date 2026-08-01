export const mockDashboardStats = {
  totalPolicies: 186,
  activePolicies: 152,
  pendingPolicies: 8,
  expiredPolicies: 21,
  cancelledPolicies: 5,
  totalClaims: 34,
  pendingClaims: 12,
  approvedClaims: 18,
  rejectedClaims: 4,
  totalCommission: 28450000,
  pendingCommission: 6200000,
  paidCommission: 22250000,
  monthlyPremium: 45200000,
  monthlyIssuance: 23,
  conversionRate: 68,
  targetProgress: 78,
};

export const mockPremiumTrends = [
  { month: 'فروردین', premium: 28500000, policies: 18 },
  { month: 'اردیبهشت', premium: 32000000, policies: 21 },
  { month: 'خرداد', premium: 35400000, policies: 25 },
  { month: 'تیر', premium: 38900000, policies: 22 },
  { month: 'مرداد', premium: 41200000, policies: 26 },
  { month: 'شهریور', premium: 45200000, policies: 23 },
];

export const mockCommissionHistory = [
  { month: 'فروردین', commission: 3200000, paid: 3200000, pending: 0 },
  { month: 'اردیبهشت', commission: 3800000, paid: 3800000, pending: 0 },
  { month: 'خرداد', commission: 4200000, paid: 4200000, pending: 0 },
  { month: 'تیر', commission: 4500000, paid: 3500000, pending: 1000000 },
  { month: 'مرداد', commission: 5800000, paid: 3800000, pending: 2000000 },
  { month: 'شهریور', commission: 6200000, paid: 3750000, pending: 2450000 },
];

export const mockPolicyPortfolio = [
  { product: 'ثالثی شخصی', count: 78, premium: 23400000 },
  { product: 'آتش‌سوزی', count: 32, premium: 9600000 },
  { product: 'حوادث', count: 28, premium: 7800000 },
  { product: 'مهندسی', count: 18, premium: 5400000 },
  { product: 'درمان تکمیلی', count: 30, premium: 9000000 },
];

export const mockPolicies = [
  { id: '1', policyNumber: 'AG-1403-5001', product: 'ثالثی شخصی', customerName: 'علی محمدی', status: 'ACTIVE', premium: 2500000, issueDate: '۱۴۰۳/۰۱/۱۵', endDate: '۱۴۰۳/۱۲/۲۹' },
  { id: '2', policyNumber: 'AG-1403-5002', product: 'آتش‌سوزی مسکونی', customerName: 'مریم احمدی', status: 'ACTIVE', premium: 1800000, issueDate: '۱۴۰۳/۰۲/۰۱', endDate: '۱۴۰۴/۰۱/۳۱' },
  { id: '3', policyNumber: 'AG-1403-5003', product: 'حوادث انفرادی', customerName: 'حسین رضایی', status: 'ACTIVE', premium: 3200000, issueDate: '۱۴۰۳/۰۱/۲۰', endDate: '۱۴۰۳/۱۲/۲۹' },
  { id: '4', policyNumber: 'AG-1403-5004', product: 'مهندسی عمران', customerName: 'فاطمه کریمی', status: 'PENDING', premium: 5500000, issueDate: '۱۴۰۳/۰۶/۰۱', endDate: '۱۴۰۴/۰۵/۳۱' },
  { id: '5', policyNumber: 'AG-1403-5005', product: 'درمان تکمیلی', customerName: 'رضا صادقی', status: 'ACTIVE', premium: 1200000, issueDate: '۱۴۰۳/۰۳/۱۰', endDate: '۱۴۰۴/۰۳/۰۹' },
  { id: '6', policyNumber: 'AG-1402-4998', product: 'ثالثی شخصی', customerName: 'زهرا حسینی', status: 'EXPIRED', premium: 2100000, issueDate: '۱۴۰۲/۰۱/۰۱', endDate: '۱۴۰۲/۱۲/۲۹' },
  { id: '7', policyNumber: 'AG-1403-5006', product: 'آتش‌سوزی مسکونی', customerName: 'محمد رحیمی', status: 'ACTIVE', premium: 2000000, issueDate: '۱۴۰۳/۰۴/۰۵', endDate: '۱۴۰۴/۰۴/۰۴' },
  { id: '8', policyNumber: 'AG-1403-5007', product: 'حوادث انفرادی', customerName: 'سارا نوری', status: 'PENDING', premium: 2800000, issueDate: '۱۴۰۳/۰۶/۱۰', endDate: '۱۴۰۴/۰۶/۰۹' },
];

export const mockCommissions: { id: string; policyNumber: string; commissionRate: number; commissionAmount: number; dueDate: string; status: 'PENDING' | 'PAID' | 'CANCELLED' }[] = [
  { id: '1', policyNumber: 'AG-1403-5001', commissionRate: 0.18, commissionAmount: 450000, dueDate: '۱۴۰۳/۰۷/۰۱', status: 'PAID' },
  { id: '2', policyNumber: 'AG-1403-5002', commissionRate: 0.15, commissionAmount: 270000, dueDate: '۱۴۰۳/۰۷/۰۱', status: 'PAID' },
  { id: '3', policyNumber: 'AG-1403-5003', commissionRate: 0.20, commissionAmount: 640000, dueDate: '۱۴۰۳/۰۸/۰۱', status: 'PENDING' },
  { id: '4', policyNumber: 'AG-1403-5005', commissionRate: 0.12, commissionAmount: 144000, dueDate: '۱۴۰۳/۰۷/۱۵', status: 'PAID' },
  { id: '5', policyNumber: 'AG-1403-5007', commissionRate: 0.15, commissionAmount: 300000, dueDate: '۱۴۰۳/۰۸/۰۵', status: 'PENDING' },
  { id: '6', policyNumber: 'AG-1403-5004', commissionRate: 0.10, commissionAmount: 550000, dueDate: '۱۴۰۳/۰۹/۰۱', status: 'PENDING' },
];

export const mockLeads: { id: string; name: string; phone: string; productInterest: string; status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'; priority: 'high' | 'medium' | 'low'; createdAt: string }[] = [
  { id: '1', name: 'نیما شریفی', phone: '09121112233', productInterest: 'ثالثی شخصی', status: 'new', priority: 'high', createdAt: '۱۴۰۳/۰۵/۱۰' },
  { id: '2', name: 'آیدا مرادی', phone: '09124445566', productInterest: 'آتش‌سوزی', status: 'contacted', priority: 'medium', createdAt: '۱۴۰۳/۰۵/۱۲' },
  { id: '3', name: 'بهروز قاسمی', phone: '09137778899', productInterest: 'حوادث', status: 'qualified', priority: 'high', createdAt: '۱۴۰۳/۰۵/۱۴' },
  { id: '4', name: 'الهام یوسفی', phone: '09150001122', productInterest: 'درمان تکمیلی', status: 'contacted', priority: 'medium', createdAt: '۱۴۰۳/۰۵/۱۵' },
  { id: '5', name: 'کاوه اکبری', phone: '09163334455', productInterest: 'مهندسی', status: 'converted', priority: 'low', createdAt: '۱۴۰۳/۰۵/۰۸' },
];

export const mockClaims = [
  { id: '1', claimNumber: 'CL-1403-9001', policyNumber: 'AG-1403-5001', customerName: 'علی محمدی', claimType: 'ثالثی', status: 'در حال بررسی', amount: 12000000, date: '۱۴۰۳/۰۵/۱۰' },
  { id: '2', claimNumber: 'CL-1403-9002', policyNumber: 'AG-1403-5002', customerName: 'مریم احمدی', claimType: 'آتش‌سوزی', status: 'تأیید شده', amount: 8500000, date: '۱۴۰۳/۰۵/۱۲' },
  { id: '3', claimNumber: 'CL-1403-9003', policyNumber: 'AG-1403-5003', customerName: 'حسین رضایی', claimType: 'حوادث', status: 'رد شده', amount: 4000000, date: '۱۴۰۳/۰۵/۰۸' },
  { id: '4', claimNumber: 'CL-1403-9004', policyNumber: 'AG-1403-5005', customerName: 'رضا صادقی', claimType: 'درمان', status: 'در حال بررسی', amount: 3200000, date: '۱۴۰۳/۰۵/۱۴' },
];

export const mockNbaActions = [
  { id: '1', title: 'تماس با سرنخ‌های در انتظار', description: '۳ سرنخ نیازمند تماس پیگیری دارند', priority: 'بالا', type: 'تماس', action: 'پیگیری سرنخ‌ها' },
  { id: '2', title: 'تمدید بیمه‌نامه‌های رو به انقضا', description: '۵ بیمه‌نامه تا پایان ماه منقضی می‌شوند', priority: 'بحرانی', type: 'تمدید', action: 'تمدید بیمه‌نامه' },
  { id: '3', title: 'ارسال پیشنهاد درمان تکمیلی', description: '۱۲ مشتری واجد شرایط برای بیمه درمان تکمیلی', priority: 'متوسط', type: 'فروش', action: 'ارسال پیشنهاد' },
  { id: '4', title: 'بررسی خسارت‌های در انتظار', description: '۲ خسارت نیازمند پیگیری با بیمه‌گر', priority: 'بالا', type: 'پیگیری', action: 'پیگیری خسارت' },
];

export const mockAdvocacy = [
  { id: '1', caseNumber: 'ADV-1403-001', customerName: 'علی محمدی', claimNumber: 'CL-1403-9001', status: 'فعال', createdAt: '۱۴۰۳/۰۵/۱۰', description: 'درخواست تجدید نظر در رد خسارت ثالثی' },
  { id: '2', caseNumber: 'ADV-1403-002', customerName: 'حسین رضایی', claimNumber: 'CL-1403-9003', status: 'در حال بررسی', createdAt: '۱۴۰۳/۰۵/۱۲', description: 'اعتراض به مبلغ خسارت محقق شده' },
  { id: '3', caseNumber: 'ADV-1403-003', customerName: 'مریم احمدی', claimNumber: 'CL-1403-9002', status: 'حل شده', createdAt: '۱۴۰۳/۰۴/۲۰', description: 'درخواست تسریع در پرداخت خسارت' },
];

export const mockAdjusterReferrals = [
  { id: '1', referralNumber: 'AR-1403-001', customerName: 'علی محمدی', claimNumber: 'CL-1403-9001', adjusterName: 'کارشناس امینی', status: 'ارسال شده', createdAt: '۱۴۰۳/۰۵/۱۰' },
  { id: '2', referralNumber: 'AR-1403-002', customerName: 'مریم احمدی', claimNumber: 'CL-1403-9002', adjusterName: 'کارشناس رضایی', status: 'گزارش آماده', createdAt: '۱۴۰۳/۰۵/۱۲' },
  { id: '3', referralNumber: 'AR-1403-003', customerName: 'حسین رضایی', claimNumber: 'CL-1403-9003', adjusterName: 'کارشناس صادقی', status: 'پذیرفته شده', createdAt: '۱۴۰۳/۰۵/۰۸' },
];

export const mockRecovery = [
  { id: '1', recoveryNumber: 'RC-1403-001', customerName: 'علی محمدی', claimNumber: 'CL-1403-9001', amount: 5000000, status: 'در حال پیگیری', createdAt: '۱۴۰۳/۰۵/۱۰' },
  { id: '2', recoveryNumber: 'RC-1403-002', customerName: 'مریم احمدی', claimNumber: 'CL-1403-9002', amount: 3000000, status: 'وصول شده', createdAt: '۱۴۰۳/۰۴/۲۵' },
  { id: '3', recoveryNumber: 'RC-1403-003', customerName: 'حسین رضایی', claimNumber: 'CL-1403-9003', amount: 2000000, status: 'در انتظار', createdAt: '۱۴۰۳/۰۵/۱۴' },
];

export const mockNotifications = [
  { id: '1', title: 'خسارت جدید ثبت شد', description: 'خسارت CL-1403-9004 توسط رضا صادقی ثبت شد', time: '۵ دقیقه پیش', type: 'claim' },
  { id: '2', title: 'پورسانت پرداخت شد', description: 'پورسانت بیمه‌نامه AG-1403-5001 پرداخت شد', time: '۱ ساعت پیش', type: 'commission' },
  { id: '3', title: 'سرنخ جدید', description: 'سرنخ جدید از وب‌سایت: نیما شریفی', time: '۲ ساعت پیش', type: 'lead' },
  { id: '4', title: 'بیمه‌نامه در انتظار صدور', description: 'بیمه‌نامه AG-1403-5004 نیازمند تکمیل مدارک', time: '۳ ساعت پیش', type: 'policy' },
];

export const mockCustomer360 = {
  name: 'علی محمدی',
  nationalId: '0012345678',
  phone: '09121112233',
  email: 'ali.mohammadi@example.com',
  address: 'تهران، خیابان ولیعصر، پلاک ۱۲۳',
  joinDate: '۱۴۰۱/۰۳/۱۵',
  policies: [
    { policyNumber: 'AG-1403-5001', type: 'ثالثی شخصی', status: 'active' as const, startDate: '۱۴۰۳/۰۱/۱۵', endDate: '۱۴۰۳/۱۲/۲۹', premium: '۲٬۵۰۰٬۰۰۰ تومان' },
    { policyNumber: 'AG-1402-۴۹۸۸', type: 'درمان تکمیلی', status: 'expired' as const, startDate: '۱۴۰۲/۰۱/۰۱', endDate: '۱۴۰۲/۱۲/۲۹', premium: '۱٬۲۰۰٬۰۰۰ تومان' },
    { policyNumber: 'AG-1403-5009', type: 'آتش‌سوزی مسکونی', status: 'pending' as const, startDate: '۱۴۰۳/۰۶/۰۱', endDate: '۱۴۰۴/۰۵/۳۱', premium: '۱٬۸۰۰٬۰۰۰ تومان' },
  ],
  nextBestActions: [
    { title: 'تمدید بیمه‌نامه درمان تکمیلی', description: 'بیمه‌نامه منقضی شده قابل تمدید است', actionLabel: 'شروع تمدید', priority: 'high' as const },
    { title: 'ارسال پیشنهاد بیمه حوادث', description: 'مشتری واجد شرایط بیمه حوادث انفرادی است', actionLabel: 'ارسال پیشنهاد', priority: 'medium' as const },
    { title: 'تماس پیگیری', description: 'آخرین تماس ۱۴ روز پیش بوده است', actionLabel: 'تماس الان', priority: 'low' as const },
  ],
};

export function formatToman(amount: number): string {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}
