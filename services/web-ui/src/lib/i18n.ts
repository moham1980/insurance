export type Language = 'fa' | 'en' | 'ar';
export type TranslationKey = string;

export interface Translations {
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    view: string;
    add: string;
    search: string;
    filter: string;
    export: string;
    print: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    confirm: string;
    yes: string;
    no: string;
    or: string;
    and: string;
    of: string;
    to: string;
    from: string;
    at: string;
    in: string;
    on: string;
    by: string;
    with: string;
    for: string;
  };
  navigation: {
    home: string;
    dashboard: string;
    policies: string;
    claims: string;
    customers: string;
    agents: string;
    reports: string;
    settings: string;
    admin: string;
    logout: string;
    login: string;
    register: string;
  };
  auth: {
    login: string;
    logout: string;
    username: string;
    password: string;
    email: string;
    phoneNumber: string;
    nationalId: string;
    rememberMe: string;
    forgotPassword: string;
    resetPassword: string;
    loginSuccess: string;
    loginError: string;
    logoutSuccess: string;
  };
  policy: {
    policies: string;
    policyNumber: string;
    policyId: string;
    policyHolder: string;
    insured: string;
    product: string;
    lineOfBusiness: string;
    status: string;
    effectiveFrom: string;
    effectiveTo: string;
    premium: string;
    sumInsured: string;
    issueDate: string;
    expiryDate: string;
    renew: string;
    cancel: string;
    endorse: string;
    printPolicy: string;
    viewPolicy: string;
    addPolicy: string;
    editPolicy: string;
    deletePolicy: string;
    statusActive: string;
    statusExpired: string;
    statusCancelled: string;
    statusPending: string;
  };
  claim: {
    claims: string;
    claimNumber: string;
    claimId: string;
    policyNumber: string;
    policyId: string;
    claimant: string;
    lossType: string;
    lossDate: string;
    reportedDate: string;
    amount: string;
    status: string;
    description: string;
    submit: string;
    investigate: string;
    approve: string;
    reject: string;
    pay: string;
    close: string;
    addClaim: string;
    editClaim: string;
    viewClaim: string;
    deleteClaim: string;
    statusSubmitted: string;
    statusInvestigating: string;
    statusApproved: string;
    statusRejected: string;
    statusPaid: string;
    statusClosed: string;
  };
  customer: {
    customers: string;
    customerId: string;
    customerName: string;
    nationalId: string;
    phoneNumber: string;
    email: string;
    address: string;
    dateOfBirth: string;
    gender: string;
    addCustomer: string;
    editCustomer: string;
    viewCustomer: string;
    deleteCustomer: string;
    genderMale: string;
    genderFemale: string;
  };
  agent: {
    agents: string;
    agentId: string;
    agentName: string;
    agentCode: string;
    branch: string;
    region: string;
    commission: string;
    performance: string;
    addAgent: string;
    editAgent: string;
    viewAgent: string;
    deleteAgent: string;
  };
  reporting: {
    reports: string;
    dashboard: string;
    metrics: string;
    charts: string;
    trends: string;
    export: string;
    print: string;
    dateRange: string;
    period: string;
    compare: string;
    totalPolicies: string;
    totalClaims: string;
    totalPremium: string;
    totalCommissions: string;
    lossRatio: string;
    combinedRatio: string;
    customerRetention: string;
    newCustomers: string;
    productPerformance: string;
    regionalPerformance: string;
    agentPerformance: string;
  };
  underwriting: {
    underwriting: string;
    requests: string;
    requestId: string;
    policyId: string;
    insuredName: string;
    product: string;
    status: string;
    riskScore: string;
    riskLevel: string;
    creationDate: string;
    approve: string;
    reject: string;
    requestInfo: string;
    addRequest: string;
    viewRequest: string;
    statusPending: string;
    statusApproved: string;
    statusRejected: string;
    statusUnderReview: string;
    riskLevelLow: string;
    riskLevelMedium: string;
    riskLevelHigh: string;
  };
  fraud: {
    fraud: string;
    fraudCases: string;
    caseId: string;
    claimId: string;
    policyId: string;
    score: string;
    riskLevel: string;
    status: string;
    investigation: string;
    addCase: string;
    viewCase: string;
    statusOpen: string;
    statusClosed: string;
    statusUnderInvestigation: string;
    riskLevelLow: string;
    riskLevelMedium: string;
    riskLevelHigh: string;
  };
  sanhab: {
    sanhab: string;
    inquiry: string;
    policyInquiry: string;
    claimInquiry: string;
    smsInquiry: string;
    shortCode: string;
    submitInquiry: string;
    viewResult: string;
  };
  settings: {
    settings: string;
    organization: string;
    sla: string;
    smsTemplates: string;
    fiscalPeriods: string;
    general: string;
    notification: string;
    payment: string;
    compliance: string;
    users: string;
    roles: string;
    permissions: string;
    featureFlags: string;
    auditLog: string;
    addSetting: string;
    editSetting: string;
    deleteSetting: string;
  };
  validation: {
    required: string;
    invalidEmail: string;
    invalidPhone: string;
    invalidNationalId: string;
    minLength: string;
    maxLength: string;
    minValue: string;
    maxValue: string;
    patternMismatch: string;
    dateInvalid: string;
    numberInvalid: string;
  };
  errors: {
    generic: string;
    network: string;
    unauthorized: string;
    forbidden: string;
    notFound: string;
    serverError: string;
    timeout: string;
    validation: string;
  };
}

export const translations: Record<Language, Translations> = {
  fa: {
    common: {
      loading: 'در حال بارگذاری...',
      error: 'خطا',
      success: 'موفق',
      cancel: 'انصراف',
      save: 'ذخیره',
      delete: 'حذف',
      edit: 'ویرایش',
      view: 'مشاهده',
      add: 'افزودن',
      search: 'جستجو',
      filter: 'فیلتر',
      export: 'خروجی',
      print: 'چاپ',
      back: 'بازگشت',
      next: 'بعدی',
      previous: 'قبلی',
      submit: 'ارسال',
      confirm: 'تأیید',
      yes: 'بله',
      no: 'خیر',
      or: 'یا',
      and: 'و',
      of: 'از',
      to: 'به',
      from: 'از',
      at: 'در',
      in: 'در',
      on: 'در',
      by: 'توسط',
      with: 'با',
      for: 'برای',
    },
    navigation: {
      home: 'خانه',
      dashboard: 'داشبورد',
      policies: 'بیمه‌نامه‌ها',
      claims: 'خسارت‌ها',
      customers: 'مشتریان',
      agents: 'نمایندگان',
      reports: 'گزارش‌ها',
      settings: 'تنظیمات',
      admin: 'مدیریت',
      logout: 'خروج',
      login: 'ورود',
      register: 'ثبت‌نام',
    },
    auth: {
      login: 'ورود',
      logout: 'خروج',
      username: 'نام کاربری',
      password: 'رمز عبور',
      email: 'ایمیل',
      phoneNumber: 'شماره تلفن',
      nationalId: 'کد ملی',
      rememberMe: 'مرا به خاطر بسپار',
      forgotPassword: 'فراموشی رمز عبور',
      resetPassword: 'بازیابی رمز عبور',
      loginSuccess: 'ورود موفقیت‌آمیز بود',
      loginError: 'نام کاربری یا رمز عبور اشتباه است',
      logoutSuccess: 'خروج موفقیت‌آمیز بود',
    },
    policy: {
      policies: 'بیمه‌نامه‌ها',
      policyNumber: 'شماره بیمه‌نامه',
      policyId: 'شناسه بیمه‌نامه',
      policyHolder: 'بیمه‌گذار',
      insured: 'بیمه‌شده',
      product: 'محصول',
      lineOfBusiness: 'شاخه صنعت',
      status: 'وضعیت',
      effectiveFrom: 'تاریخ شروع',
      effectiveTo: 'تاریخ پایان',
      premium: 'حق بیمه',
      sumInsured: 'مبلغ بیمه',
      issueDate: 'تاریخ صدور',
      expiryDate: 'تاریخ انقضا',
      renew: 'تمدید',
      cancel: 'لغو',
      endorse: 'الحاقیه',
      printPolicy: 'چاپ بیمه‌نامه',
      viewPolicy: 'مشاهده بیمه‌نامه',
      addPolicy: 'افزودن بیمه‌نامه',
      editPolicy: 'ویرایش بیمه‌نامه',
      deletePolicy: 'حذف بیمه‌نامه',
      statusActive: 'فعال',
      statusExpired: 'منقضی',
      statusCancelled: 'لغو شده',
      statusPending: 'در انتظار',
    },
    claim: {
      claims: 'خسارت‌ها',
      claimNumber: 'شماره خسارت',
      claimId: 'شناسه خسارت',
      policyNumber: 'شماره بیمه‌نامه',
      policyId: 'شناسه بیمه‌نامه',
      claimant: 'خسارت‌دیدنده',
      lossType: 'نوع خسارت',
      lossDate: 'تاریخ وقوع',
      reportedDate: 'تاریخ گزارش',
      amount: 'مبلغ',
      status: 'وضعیت',
      description: 'توضیحات',
      submit: 'ثبت',
      investigate: 'بررسی',
      approve: 'تأیید',
      reject: 'رد',
      pay: 'پرداخت',
      close: 'بستن',
      addClaim: 'افزودن خسارت',
      editClaim: 'ویرایش خسارت',
      viewClaim: 'مشاهده خسارت',
      deleteClaim: 'حذف خسارت',
      statusSubmitted: 'ثبت شده',
      statusInvestigating: 'در حال بررسی',
      statusApproved: 'تأیید شده',
      statusRejected: 'رد شده',
      statusPaid: 'پرداخت شده',
      statusClosed: 'بسته شده',
    },
    customer: {
      customers: 'مشتریان',
      customerId: 'شناسه مشتری',
      customerName: 'نام مشتری',
      nationalId: 'کد ملی',
      phoneNumber: 'شماره تلفن',
      email: 'ایمیل',
      address: 'آدرس',
      dateOfBirth: 'تاریخ تولد',
      gender: 'جنسیت',
      addCustomer: 'افزودن مشتری',
      editCustomer: 'ویرایش مشتری',
      viewCustomer: 'مشاهده مشتری',
      deleteCustomer: 'حذف مشتری',
      genderMale: 'مرد',
      genderFemale: 'زن',
    },
    agent: {
      agents: 'نمایندگان',
      agentId: 'شناسه نماینده',
      agentName: 'نام نماینده',
      agentCode: 'کد نماینده',
      branch: 'شعبه',
      region: 'منطقه',
      commission: 'کمیسیون',
      performance: 'عملکرد',
      addAgent: 'افزودن نماینده',
      editAgent: 'ویرایش نماینده',
      viewAgent: 'مشاهده نماینده',
      deleteAgent: 'حذف نماینده',
    },
    reporting: {
      reports: 'گزارش‌ها',
      dashboard: 'داشبورد',
      metrics: 'شاخص‌ها',
      charts: 'نمودارها',
      trends: 'روندها',
      export: 'خروجی',
      print: 'چاپ',
      dateRange: 'محدوده تاریخ',
      period: 'دوره',
      compare: 'مقایسه',
      totalPolicies: 'کل بیمه‌نامه‌ها',
      totalClaims: 'کل خسارت‌ها',
      totalPremium: 'کل حق بیمه',
      totalCommissions: 'کل کمیسیون‌ها',
      lossRatio: 'نسبت خسارت',
      combinedRatio: 'نسبت ترکیبی',
      customerRetention: 'نرخ حفظ مشتریان',
      newCustomers: 'مشتریان جدید',
      productPerformance: 'عملکرد محصولات',
      regionalPerformance: 'عملکرد منطقه‌ای',
      agentPerformance: 'عملکرد نمایندگان',
    },
    underwriting: {
      underwriting: 'صدور',
      requests: 'درخواست‌ها',
      requestId: 'شناسه درخواست',
      policyId: 'شناسه بیمه‌نامه',
      insuredName: 'نام بیمه‌شده',
      product: 'محصول',
      status: 'وضعیت',
      riskScore: 'امتیاز ریسک',
      riskLevel: 'سطح ریسک',
      creationDate: 'تاریخ ایجاد',
      approve: 'تأیید',
      reject: 'رد',
      requestInfo: 'اطلاعات درخواست',
      addRequest: 'افزودن درخواست',
      viewRequest: 'مشاهده درخواست',
      statusPending: 'در انتظار',
      statusApproved: 'تأیید شده',
      statusRejected: 'رد شده',
      statusUnderReview: 'در حال بررسی',
      riskLevelLow: 'کم',
      riskLevelMedium: 'متوسط',
      riskLevelHigh: 'زیاد',
    },
    fraud: {
      fraud: 'تقلب',
      fraudCases: 'پرونده‌های تقلب',
      caseId: 'شناسه پرونده',
      claimId: 'شناسه خسارت',
      policyId: 'شناسه بیمه‌نامه',
      score: 'امتیاز',
      riskLevel: 'سطح ریسک',
      status: 'وضعیت',
      investigation: 'بررسی',
      addCase: 'افزودن پرونده',
      viewCase: 'مشاهده پرونده',
      statusOpen: 'باز',
      statusClosed: 'بسته',
      statusUnderInvestigation: 'در حال بررسی',
      riskLevelLow: 'کم',
      riskLevelMedium: 'متوسط',
      riskLevelHigh: 'زیاد',
    },
    sanhab: {
      sanhab: 'صندوق',
      inquiry: 'استعلام',
      policyInquiry: 'استعلام بیمه‌نامه',
      claimInquiry: 'استعلام خسارت',
      smsInquiry: 'استعلام پیامکی',
      shortCode: 'شماره کوتاه',
      submitInquiry: 'ارسال استعلام',
      viewResult: 'مشاهده نتیجه',
    },
    settings: {
      settings: 'تنظیمات',
      organization: 'سازمانی',
      sla: 'SLA',
      smsTemplates: 'قالب‌های پیامک',
      fiscalPeriods: 'دوره‌های مالی',
      general: 'عمومی',
      notification: 'اطلاع‌رسانی',
      payment: 'پرداخت',
      compliance: 'انطباق',
      users: 'کاربران',
      roles: 'نقش‌ها',
      permissions: 'مجوزها',
      featureFlags: 'ویژگی‌ها',
      auditLog: 'لاگ حسابرسی',
      addSetting: 'افزودن تنظیم',
      editSetting: 'ویرایش تنظیم',
      deleteSetting: 'حذف تنظیم',
    },
    validation: {
      required: 'این فیلد الزامی است',
      invalidEmail: 'ایمیل معتبر نیست',
      invalidPhone: 'شماره تلفن معتبر نیست',
      invalidNationalId: 'کد ملی معتبر نیست',
      minLength: 'حداقل {min} کاراکتر',
      maxLength: 'حداکثر {max} کاراکتر',
      minValue: 'حداقل {min}',
      maxValue: 'حداکثر {max}',
      patternMismatch: 'فرمت معتبر نیست',
      dateInvalid: 'تاریخ معتبر نیست',
      numberInvalid: 'عدد معتبر نیست',
    },
    errors: {
      generic: 'خطایی رخ داده است',
      network: 'خطای شبکه',
      unauthorized: 'دسترسی غیرمجاز',
      forbidden: 'دسترسی ممنوع',
      notFound: 'یافت نشد',
      serverError: 'خطای سرور',
      timeout: 'زمان مجاز تمام شد',
      validation: 'خطای اعتبارسنجی',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      print: 'Print',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      or: 'or',
      and: 'and',
      of: 'of',
      to: 'to',
      from: 'from',
      at: 'at',
      in: 'in',
      on: 'on',
      by: 'by',
      with: 'with',
      for: 'for',
    },
    navigation: {
      home: 'Home',
      dashboard: 'Dashboard',
      policies: 'Policies',
      claims: 'Claims',
      customers: 'Customers',
      agents: 'Agents',
      reports: 'Reports',
      settings: 'Settings',
      admin: 'Admin',
      logout: 'Logout',
      login: 'Login',
      register: 'Register',
    },
    auth: {
      login: 'Login',
      logout: 'Logout',
      username: 'Username',
      password: 'Password',
      email: 'Email',
      phoneNumber: 'Phone Number',
      nationalId: 'National ID',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password',
      resetPassword: 'Reset password',
      loginSuccess: 'Login successful',
      loginError: 'Invalid username or password',
      logoutSuccess: 'Logout successful',
    },
    policy: {
      policies: 'Policies',
      policyNumber: 'Policy Number',
      policyId: 'Policy ID',
      policyHolder: 'Policy Holder',
      insured: 'Insured',
      product: 'Product',
      lineOfBusiness: 'Line of Business',
      status: 'Status',
      effectiveFrom: 'Effective From',
      effectiveTo: 'Effective To',
      premium: 'Premium',
      sumInsured: 'Sum Insured',
      issueDate: 'Issue Date',
      expiryDate: 'Expiry Date',
      renew: 'Renew',
      cancel: 'Cancel',
      endorse: 'Endorse',
      printPolicy: 'Print Policy',
      viewPolicy: 'View Policy',
      addPolicy: 'Add Policy',
      editPolicy: 'Edit Policy',
      deletePolicy: 'Delete Policy',
      statusActive: 'Active',
      statusExpired: 'Expired',
      statusCancelled: 'Cancelled',
      statusPending: 'Pending',
    },
    claim: {
      claims: 'Claims',
      claimNumber: 'Claim Number',
      claimId: 'Claim ID',
      policyNumber: 'Policy Number',
      policyId: 'Policy ID',
      claimant: 'Claimant',
      lossType: 'Loss Type',
      lossDate: 'Loss Date',
      reportedDate: 'Reported Date',
      amount: 'Amount',
      status: 'Status',
      description: 'Description',
      submit: 'Submit',
      investigate: 'Investigate',
      approve: 'Approve',
      reject: 'Reject',
      pay: 'Pay',
      close: 'Close',
      addClaim: 'Add Claim',
      editClaim: 'Edit Claim',
      viewClaim: 'View Claim',
      deleteClaim: 'Delete Claim',
      statusSubmitted: 'Submitted',
      statusInvestigating: 'Investigating',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      statusPaid: 'Paid',
      statusClosed: 'Closed',
    },
    customer: {
      customers: 'Customers',
      customerId: 'Customer ID',
      customerName: 'Customer Name',
      nationalId: 'National ID',
      phoneNumber: 'Phone Number',
      email: 'Email',
      address: 'Address',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      addCustomer: 'Add Customer',
      editCustomer: 'Edit Customer',
      viewCustomer: 'View Customer',
      deleteCustomer: 'Delete Customer',
      genderMale: 'Male',
      genderFemale: 'Female',
    },
    agent: {
      agents: 'Agents',
      agentId: 'Agent ID',
      agentName: 'Agent Name',
      agentCode: 'Agent Code',
      branch: 'Branch',
      region: 'Region',
      commission: 'Commission',
      performance: 'Performance',
      addAgent: 'Add Agent',
      editAgent: 'Edit Agent',
      viewAgent: 'View Agent',
      deleteAgent: 'Delete Agent',
    },
    reporting: {
      reports: 'Reports',
      dashboard: 'Dashboard',
      metrics: 'Metrics',
      charts: 'Charts',
      trends: 'Trends',
      export: 'Export',
      print: 'Print',
      dateRange: 'Date Range',
      period: 'Period',
      compare: 'Compare',
      totalPolicies: 'Total Policies',
      totalClaims: 'Total Claims',
      totalPremium: 'Total Premium',
      totalCommissions: 'Total Commissions',
      lossRatio: 'Loss Ratio',
      combinedRatio: 'Combined Ratio',
      customerRetention: 'Customer Retention',
      newCustomers: 'New Customers',
      productPerformance: 'Product Performance',
      regionalPerformance: 'Regional Performance',
      agentPerformance: 'Agent Performance',
    },
    underwriting: {
      underwriting: 'Underwriting',
      requests: 'Requests',
      requestId: 'Request ID',
      policyId: 'Policy ID',
      insuredName: 'Insured Name',
      product: 'Product',
      status: 'Status',
      riskScore: 'Risk Score',
      riskLevel: 'Risk Level',
      creationDate: 'Creation Date',
      approve: 'Approve',
      reject: 'Reject',
      requestInfo: 'Request Info',
      addRequest: 'Add Request',
      viewRequest: 'View Request',
      statusPending: 'Pending',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      statusUnderReview: 'Under Review',
      riskLevelLow: 'Low',
      riskLevelMedium: 'Medium',
      riskLevelHigh: 'High',
    },
    fraud: {
      fraud: 'Fraud',
      fraudCases: 'Fraud Cases',
      caseId: 'Case ID',
      claimId: 'Claim ID',
      policyId: 'Policy ID',
      score: 'Score',
      riskLevel: 'Risk Level',
      status: 'Status',
      investigation: 'Investigation',
      addCase: 'Add Case',
      viewCase: 'View Case',
      statusOpen: 'Open',
      statusClosed: 'Closed',
      statusUnderInvestigation: 'Under Investigation',
      riskLevelLow: 'Low',
      riskLevelMedium: 'Medium',
      riskLevelHigh: 'High',
    },
    sanhab: {
      sanhab: 'Sanhab',
      inquiry: 'Inquiry',
      policyInquiry: 'Policy Inquiry',
      claimInquiry: 'Claim Inquiry',
      smsInquiry: 'SMS Inquiry',
      shortCode: 'Short Code',
      submitInquiry: 'Submit Inquiry',
      viewResult: 'View Result',
    },
    settings: {
      settings: 'Settings',
      organization: 'Organization',
      sla: 'SLA',
      smsTemplates: 'SMS Templates',
      fiscalPeriods: 'Fiscal Periods',
      general: 'General',
      notification: 'Notification',
      payment: 'Payment',
      compliance: 'Compliance',
      users: 'Users',
      roles: 'Roles',
      permissions: 'Permissions',
      featureFlags: 'Feature Flags',
      auditLog: 'Audit Log',
      addSetting: 'Add Setting',
      editSetting: 'Edit Setting',
      deleteSetting: 'Delete Setting',
    },
    validation: {
      required: 'This field is required',
      invalidEmail: 'Invalid email',
      invalidPhone: 'Invalid phone number',
      invalidNationalId: 'Invalid national ID',
      minLength: 'Minimum {min} characters',
      maxLength: 'Maximum {max} characters',
      minValue: 'Minimum {min}',
      maxValue: 'Maximum {max}',
      patternMismatch: 'Invalid format',
      dateInvalid: 'Invalid date',
      numberInvalid: 'Invalid number',
    },
    errors: {
      generic: 'An error occurred',
      network: 'Network error',
      unauthorized: 'Unauthorized',
      forbidden: 'Forbidden',
      notFound: 'Not found',
      serverError: 'Server error',
      timeout: 'Timeout',
      validation: 'Validation error',
    },
  },
  ar: {
    common: {
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجاح',
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      view: 'عرض',
      add: 'إضافة',
      search: 'بحث',
      filter: 'تصفية',
      export: 'تصدير',
      print: 'طباعة',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      submit: 'إرسال',
      confirm: 'تأكيد',
      yes: 'نعم',
      no: 'لا',
      or: 'أو',
      and: 'و',
      of: 'من',
      to: 'إلى',
      from: 'من',
      at: 'في',
      in: 'في',
      on: 'على',
      by: 'بواسطة',
      with: 'مع',
      for: 'لـ',
    },
    navigation: {
      home: 'الرئيسية',
      dashboard: 'لوحة التحكم',
      policies: 'بوالص التأمين',
      claims: 'المطالبات',
      customers: 'العملاء',
      agents: 'الوكلاء',
      reports: 'التقارير',
      settings: 'الإعدادات',
      admin: 'الإدارة',
      logout: 'تسجيل الخروج',
      login: 'تسجيل الدخول',
      register: 'التسجيل',
    },
    auth: {
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      username: 'اسم المستخدم',
      password: 'كلمة المرور',
      email: 'البريد الإلكتروني',
      phoneNumber: 'رقم الهاتف',
      nationalId: 'الرقم الوطني',
      rememberMe: 'تذكرني',
      forgotPassword: 'نسيت كلمة المرور',
      resetPassword: 'إعادة تعيين كلمة المرور',
      loginSuccess: 'تم تسجيل الدخول بنجاح',
      loginError: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      logoutSuccess: 'تم تسجيل الخروج بنجاح',
    },
    policy: {
      policies: 'بوالص التأمين',
      policyNumber: 'رقم بوليصة التأمين',
      policyId: 'معرف بوليصة التأمين',
      policyHolder: 'حامل البوليصة',
      insured: 'المؤمن عليه',
      product: 'المنتج',
      lineOfBusiness: 'خط الأعمال',
      status: 'الحالة',
      effectiveFrom: 'ساري من',
      effectiveTo: 'ساري إلى',
      premium: 'قسط التأمين',
      sumInsured: 'مبلغ التأمين',
      issueDate: 'تاريخ الإصدار',
      expiryDate: 'تاريخ الانتهاء',
      renew: 'تجديد',
      cancel: 'إلغاء',
      endorse: 'إضافة',
      printPolicy: 'طباعة البوليصة',
      viewPolicy: 'عرض البوليصة',
      addPolicy: 'إضافة بوليصة',
      editPolicy: 'تعديل البوليصة',
      deletePolicy: 'حذف البوليصة',
      statusActive: 'نشط',
      statusExpired: 'منتهي',
      statusCancelled: 'ملغى',
      statusPending: 'قيد الانتظار',
    },
    claim: {
      claims: 'المطالبات',
      claimNumber: 'رقم المطالبة',
      claimId: 'معرف المطالبة',
      policyNumber: 'رقم البوليصة',
      policyId: 'معرف البوليصة',
      claimant: 'صاحب المطالبة',
      lossType: 'نوع الخسارة',
      lossDate: 'تاريخ الخسارة',
      reportedDate: 'تاريخ الإبلاغ',
      amount: 'المبلغ',
      status: 'الحالة',
      description: 'الوصف',
      submit: 'إرسال',
      investigate: 'تحقيق',
      approve: 'موافقة',
      reject: 'رفض',
      pay: 'دفع',
      close: 'إغلاق',
      addClaim: 'إضافة مطالبة',
      editClaim: 'تعديل المطالبة',
      viewClaim: 'عرض المطالبة',
      deleteClaim: 'حذف المطالبة',
      statusSubmitted: 'مُرسلة',
      statusInvestigating: 'قيد التحقيق',
      statusApproved: 'مُوافق عليها',
      statusRejected: 'مرفوضة',
      statusPaid: 'مدفوعة',
      statusClosed: 'مغلقة',
    },
    customer: {
      customers: 'العملاء',
      customerId: 'معرف العميل',
      customerName: 'اسم العميل',
      nationalId: 'الرقم الوطني',
      phoneNumber: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      address: 'العنوان',
      dateOfBirth: 'تاريخ الميلاد',
      gender: 'الجنس',
      addCustomer: 'إضافة عميل',
      editCustomer: 'تعديل العميل',
      viewCustomer: 'عرض العميل',
      deleteCustomer: 'حذف العميل',
      genderMale: 'ذكر',
      genderFemale: 'أنثى',
    },
    agent: {
      agents: 'الوكلاء',
      agentId: 'معرف الوكيل',
      agentName: 'اسم الوكيل',
      agentCode: 'رمز الوكيل',
      branch: 'الفرع',
      region: 'المنطقة',
      commission: 'العمولة',
      performance: 'الأداء',
      addAgent: 'إضافة وكيل',
      editAgent: 'تعديل الوكيل',
      viewAgent: 'عرض الوكيل',
      deleteAgent: 'حذف الوكيل',
    },
    reporting: {
      reports: 'التقارير',
      dashboard: 'لوحة التحكم',
      metrics: 'المؤشرات',
      charts: 'الرسوم البيانية',
      trends: 'الاتجاهات',
      export: 'تصدير',
      print: 'طباعة',
      dateRange: 'نطاق التاريخ',
      period: 'الفترة',
      compare: 'مقارنة',
      totalPolicies: 'إجمالي البوالص',
      totalClaims: 'إجمالي المطالبات',
      totalPremium: 'إجمالي الأقساط',
      totalCommissions: 'إجمالي العمولات',
      lossRatio: 'نسبة الخسارة',
      combinedRatio: 'النسبة المركبة',
      customerRetention: 'احتفاظ العملاء',
      newCustomers: 'العملاء الجدد',
      productPerformance: 'أداء المنتجات',
      regionalPerformance: 'الأداء الإقليمي',
      agentPerformance: 'أداء الوكلاء',
    },
    underwriting: {
      underwriting: 'الاكتتاب',
      requests: 'الطلبات',
      requestId: 'معرف الطلب',
      policyId: 'معرف البوليصة',
      insuredName: 'اسم المؤمن عليه',
      product: 'المنتج',
      status: 'الحالة',
      riskScore: 'درجة المخاطرة',
      riskLevel: 'مستوى المخاطرة',
      creationDate: 'تاريخ الإنشاء',
      approve: 'موافقة',
      reject: 'رفض',
      requestInfo: 'معلومات الطلب',
      addRequest: 'إضافة طلب',
      viewRequest: 'عرض الطلب',
      statusPending: 'قيد الانتظار',
      statusApproved: 'مُوافق عليه',
      statusRejected: 'مرفوض',
      statusUnderReview: 'قيد المراجعة',
      riskLevelLow: 'منخفض',
      riskLevelMedium: 'متوسط',
      riskLevelHigh: 'عالي',
    },
    fraud: {
      fraud: 'الاحتيال',
      fraudCases: 'قضايا الاحتيال',
      caseId: 'معرف القضية',
      claimId: 'معرف المطالبة',
      policyId: 'معرف البوليصة',
      score: 'الدرجة',
      riskLevel: 'مستوى المخاطرة',
      status: 'الحالة',
      investigation: 'التحقيق',
      addCase: 'إضافة قضية',
      viewCase: 'عرض القضية',
      statusOpen: 'مفتوحة',
      statusClosed: 'مغلقة',
      statusUnderInvestigation: 'قيد التحقيق',
      riskLevelLow: 'منخفض',
      riskLevelMedium: 'متوسط',
      riskLevelHigh: 'عالي',
    },
    sanhab: {
      sanhab: 'صندوق',
      inquiry: 'استعلام',
      policyInquiry: 'استعلام بوليصة',
      claimInquiry: 'استعلام مطالبة',
      smsInquiry: 'استعلام رسائل نصية',
      shortCode: 'الرمز القصير',
      submitInquiry: 'إرسال الاستعلام',
      viewResult: 'عرض النتيجة',
    },
    settings: {
      settings: 'الإعدادات',
      organization: 'المؤسسة',
      sla: 'اتفاقية مستوى الخدمة',
      smsTemplates: 'قوالب الرسائل النصية',
      fiscalPeriods: 'الفترات المالية',
      general: 'عام',
      notification: 'إشعار',
      payment: 'دفع',
      compliance: 'امتثال',
      users: 'المستخدمون',
      roles: 'الأدوار',
      permissions: 'الأذونات',
      featureFlags: 'علامات الميزات',
      auditLog: 'سجل التدقيق',
      addSetting: 'إضافة إعداد',
      editSetting: 'تعديل الإعداد',
      deleteSetting: 'حذف الإعداد',
    },
    validation: {
      required: 'هذا الحقل مطلوب',
      invalidEmail: 'البريد الإلكتروني غير صالح',
      invalidPhone: 'رقم الهاتف غير صالح',
      invalidNationalId: 'الرقم الوطني غير صالح',
      minLength: 'الحد الأدنى {min} حرف',
      maxLength: 'الحد الأقصى {max} حرف',
      minValue: 'الحد الأدنى {min}',
      maxValue: 'الحد الأقصى {max}',
      patternMismatch: 'التنسيق غير صالح',
      dateInvalid: 'التاريخ غير صالح',
      numberInvalid: 'الرقم غير صالح',
    },
    errors: {
      generic: 'حدث خطأ',
      network: 'خطأ في الشبكة',
      unauthorized: 'غير مصرح',
      forbidden: 'ممنوع',
      notFound: 'غير موجود',
      serverError: 'خطأ في الخادم',
      timeout: 'انتهت المهلة',
      validation: 'خطأ في التحقق',
    },
  },
};

export const defaultLanguage: Language = 'fa';

export function getTranslation(language: Language): Translations {
  return translations[language] || translations[defaultLanguage];
}

export function t(key: string, language: Language = defaultLanguage): string {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to default language
      value = translations[defaultLanguage];
      for (const k2 of keys) {
        value = value?.[k2];
        if (value === undefined) return key;
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
}

export function formatString(template: string, params: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
}
