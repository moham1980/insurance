# Customer Portal Product Requirements Document (PRD)
> **تاریخ**: ۱۴۰۵/۰۲/۱۰  
> **Epic**: E3-T1  
> **Version**: 1.0  
> **Status**: Draft

---

## ۱) خلاصه اجرایی

**هدف**: طراحی و پیاده‌سازی پرتال مشتری برای دسترسی مشتریان به بیمه‌نامه‌ها، خسارت‌ها، پرداخت‌ها و اطلاعات شخصی.

**مخاطبان اصلی**:
- بیمه‌گذاران فردی (B2C)
- بیمه‌گذاران سازمانی (B2B)
- نمایندگان قانونی مشتریان

**کانال‌های دسترسی**:
- وب (responsive web app)
- موبایل (PWA)

**اولویت**: P0 - Critical برای تکمیل چرخه بیمه

---

## ۲) User Personas

### ۲.۱) Persona 1: علی محمدی (بیمه‌گذار فردی)
- **سن**: ۳۵ سال
- **شغل**: کارمند اداری
- **تکنولوژی**: موبایل Android، استفاده متوسط از اپلیکیشن‌ها
- **نیازها**: دسترسی سریع به بیمه‌نامه خودرو، مشاهده وضعیت خسارت، پرداخت حق بیمه
- **دردسرها**: فرآیندهای پیچیده، نیاز به مراجعه حضوری، عدم شفافیت در وضعیت درخواست‌ها

### ۲.۲) Persona 2: شرکت فناوری اطلاعات (بیمه‌گذار سازمانی)
- **نوع**: شرکت با ۵۰ کارمند
- **تکنولوژی**: استفاده از سیستم‌های مدیریت سازمانی
- **نیازها**: مدیریت بیمه‌نامه‌های کارکنان، گزارش‌گیری، تمدید دسته‌جمعی
- **دردسرها**: فرآیندهای دستی، عدم یکپارچگی با سیستم HR، تاخیر در صدور

### ۲.۳) Persona 3: مریم احمدی (نماینده قانونی)
- **نقش**: وکیل یا قیم مشتری
- **نیازها**: دسترسی به اطلاعات بیمه‌نامه موکل، پیگیری خسارت
- **دردسرها**: فرآیندهای پیچیده احراز هویت، عدم دسترسی کامل

---

## ۳) User Stories

### ۳.۱) Authentication & Onboarding

**US-CP-001**: به‌عنوان مشتری، می‌خواهم با شماره موبایل و OTP وارد شوم تا نیاز به رمز عبور نداشته باشم.
- **Acceptance Criteria**:
  - ورود با شماره موبایل ایرانی
  - ارسال OTP از طریق SMS
  - اعتبارسنجی OTP در ۵ دقیقه
  - محدودیت ۳ تلاش ناموفق
  - ذخیره session برای ۳۰ روز

**US-CP-002**: به‌عنوان مشتری، می‌خواهم ثبت‌نام اولیه را با کد ملی و شماره موبایل انجام دهم.
- **Acceptance Criteria**:
  - اعتبارسنجی کد ملی با سنهاب
  - تطبیق شماره موبایل با رکورد سنهاب
  - ارسال OTP برای تایید موبایل
  - ایجاد پروفایل مشتری

### ۳.۲) Dashboard & Overview

**US-CP-003**: به‌عنوان مشتری، می‌خواهم داشبوردی ببینم که خلاصه وضعیت بیمه‌نامه‌ها، خسارت‌ها و پرداخت‌های من را نشان دهد.
- **Acceptance Criteria**:
  - نمایش تعداد بیمه‌نامه‌های فعال
  - نمایش خسارت‌های در حال پردازش
  - نمایش پرداخت‌های سررسید شده
  - نمایش اعلان‌های مهم
  - قابلیت فیلتر بر اساس نوع بیمه

**US-CP-004**: به‌عنوان مشتری، می‌خواهم لیست بیمه‌نامه‌های خود را با جزئیات ببینم.
- **Acceptance Criteria**:
  - لیست بیمه‌نامه‌ها با شماره، نوع، وضعیت، تاریخ شروع و پایان
  - قابلیت جستجو بر اساس شماره بیمه‌نامه
  - قابلیت فیلتر بر اساس وضعیت (فعال، منقضی، در انتظار تمدید)
  - قابلیت مرتب‌سازی بر اساس تاریخ سررسید
  - دانلود PDF بیمه‌نامه

### ۳.۳) Policy Management

**US-CP-005**: به‌عنوان مشتری، می‌خواهم جزئیات کامل یک بیمه‌نامه را ببینم.
- **Acceptance Criteria**:
  - نمایش اطلاعات بیمه‌گذار، بیمه‌شده، مبلغ و پوشش‌ها
  - تاریخچه تغییرات (تمدید، اصلاح، ابطال)
  - لیست خسارت‌های مرتبط با بیمه‌نامه
  - دانلود فایل بیمه‌نامه
  - اشتراک‌گذاری بیمه‌نامه از طریق لینک موقت

**US-CP-006**: به‌عنوان مشتری، می‌خواهم بیمه‌نامه خود را تمدید کنم.
- **Acceptance Criteria**:
  - نمایش گزینه تمدید برای بیمه‌نامه‌های قابل تمدید
  - محاسبه حق بیمه جدید
  - پرداخت آنلاین
  - صدور بیمه‌نامه جدید
  - ارسال تایید از طریق SMS

**US-CP-007**: به‌عنوان مشتری، می‌خواهم درخواست اصلاح بیمه‌نامه بدهم.
- **Acceptance Criteria**:
  - انتخاب نوع اصلاح (تغییر آدرس، تغییر پلاک، تغییر پوشش)
  - پر کردن فرم اصلاح
  - بارگذاری مستندات مورد نیاز
  - پیگیری وضعیت درخواست

### ۳.۴) Claims (FNOL)

**US-CP-008**: به‌عنوان مشتری، می‌خواهم خسارت آنلاین ثبت کنم.
- **Acceptance Criteria**:
  - انتخاب بیمه‌نامه مرتبط
  - انتخاب نوع خسارت (تصادف، سرقت، آتش‌سوزی، ...)
  - ثبت تاریخ و مکان خسارت
  - بارگذاری عکس و مستندات
  - ثبت شرح ماجرا
  - دریافت شماره خسارت
  - ارسال تایید از طریق SMS

**US-CP-009**: به‌عنوان مشتری، می‌خواهم وضعیت خسارت خود را پیگیری کنم.
- **Acceptance Criteria**:
  - لیست خسارت‌ها با وضعیت
  - نمایش جزئیات هر خسارت
  - نمایش تاریخچه وضعیت‌ها
  - قابلیت افزودن مستندات اضافی
  - ارتباط با کارشناس خسارت

**US-CP-010**: به‌عنوان مشتری، می‌خواهم با کارشناس خسارت چت کنم.
- **Acceptance Criteria**:
  - چت درون برنامه‌ای
  - ارسال پیام و فایل
  - اعلان پیام جدید
  - تاریخچه چت

### ۳.۵) Payments

**US-CP-011**: به‌عنوان مشتری، می‌خواهم حق بیمه خود را آنلاین پرداخت کنم.
- **Acceptance Criteria**:
  - لیست پرداخت‌های سررسید شده
  - انتخاب مبلغ پرداخت
  - اتصال به درگاه پرداخت
  - تایید پرداخت
  - ارسال رسید از طریق SMS
  - به‌روزرسانی وضعیت بیمه‌نامه

**US-CP-012**: به‌عنوان مشتری، می‌خواهم تاریخچه پرداخت‌های خود را ببینم.
- **Acceptance Criteria**:
  - لیست پرداخت‌ها با تاریخ، مبلغ و وضعیت
  - دانلود رسید
  - فیلتر بر اساس بازه زمانی

### ۳.۶) Profile & Settings

**US-CP-013**: به‌عنوان مشتری، می‌خواهم اطلاعات شخصی خود را ویرایش کنم.
- **Acceptance Criteria**:
  - ویرایش آدرس، شماره تماس، ایمیل
  - اعتبارسنجی تغییرات
  - تایید تغییرات حساس با OTP

**US-CP-014**: به‌عنوان مشتری، می‌خواهم تنظیمات اعلان‌ها را مدیریت کنم.
- **Acceptance Criteria**:
  - انتخاب کانال اعلان (SMS، ایمیل، push)
  - انتخاب نوع اعلان‌ها (تمدید، خسارت، پرداخت)
  - تنظیم زمان اعلان‌ها

### ۳.۷) Support

**US-CP-015**: به‌عنوان مشتری، می‌خواهم تیکت پشتیبانی ثبت کنم.
- **Acceptance Criteria**:
  - انتخاب موضوع تیکت
  - شرح مشکل
  - بارگذاری مستندات
  - پیگیری وضعیت تیکت
  - چت با پشتیبانی

---

## ۴) Functional Requirements

### ۴.۱) Authentication
- **FR-CP-001**: سیستم باید از OTP مبتنی بر موبایل برای احراز هویت استفاده کند.
- **FR-CP-002**: سیستم باید با سنهاب برای احراز هویت مشتریان یکپارچه شود.
- **FR-CP-003**: سیستم باید session management با امنیت مناسب داشته باشد.
- **FR-CP-004**: سیستم باید از rate limiting برای جلوگیری از brute force attacks استفاده کند.

### ۴.۲) Dashboard
- **FR-CP-005**: سیستم باید داشبورد شخصی‌سازی‌شده برای هر مشتری ارائه دهد.
- **FR-CP-006**: سیستم باید داده‌ها را در زمان واقعی (real-time) به‌روز کند.
- **FR-CP-007**: سیستم باید از caching برای بهبود performance استفاده کند.

### ۴.۳) Policy Management
- **FR-CP-008**: سیستم باید لیست بیمه‌نامه‌ها را از policy-service بخواند.
- **FR-CP-009**: سیستم باید امکان دانلود PDF بیمه‌نامه را فراهم کند.
- **FR-CP-010**: سیستم باید تمدید بیمه‌نامه را از طریق orchestrator-service انجام دهد.
- **FR-CP-011**: سیستم باید اصلاحات بیمه‌نامه را در workflow-service ثبت کند.

### ۴.۴) Claims
- **FR-CP-012**: سیستم باید ثبت خسارت (FNOL) را در claims-service انجام دهد.
- **FR-CP-013**: سیستم باید بارگذاری عکس و مستندات را پشتیبانی کند.
- **FR-CP-014**: سیستم باید وضعیت خسارت را از claims-readmodel-service بخواند.
- **FR-CP-015**: سیستم باید چت با کارشناس خسارت را از طریق notification-service انجام دهد.

### ۴.۵) Payments
- **FR-CP-016**: سیستم باید با درگاه پرداخت یکپارچه شود.
- **FR-CP-017**: سیستم باید پرداخت‌ها را در payments-service ثبت کند.
- **FR-CP-018**: سیستم باید رسید پرداخت را تولید کند.
- **FR-CP-019**: سیستم باید وضعیت پرداخت را به‌روز کند.

### ۴.۶) Profile
- **FR-CP-020**: سیستم باید اطلاعات مشتری را از party-kyc-service بخواند.
- **FR-CP-021**: سیستم باید تغییرات حساس را با OTP تایید کند.

---

## ۵) Non-Functional Requirements

### ۵.۱) Performance
- **NFR-CP-001**: صفحه dashboard باید در کمتر از ۲ ثانیه بارگذاری شود.
- **NFR-CP-002**: API calls باید p95 کمتر از ۵۰۰ میلی‌ثانیه داشته باشند.
- **NFR-CP-003**: سیستم باید از ۱۰۰۰ concurrent user پشتیبانی کند.

### ۵.۲) Security
- **NFR-CP-004**: تمام داده‌ها باید در transit و at rest encrypt شوند.
- **NFR-CP-005**: سیستم باید از OWASP Top 10 پیروی کند.
- **NFR-CP-006**: سیستم باید audit logging برای همه عملیات حساس داشته باشد.

### ۵.۳) Availability
- **NFR-CP-007**: سیستم باید ۹۹.۵% uptime داشته باشد.
- **NFR-CP-00۸**: downtime برنامه‌ریزی‌شده باید در ساعات کم‌ترافیک انجام شود.

### ۵.۴) Usability
- **NFR-CP-009**: UI باید RTL و پشتیبانی کامل از زبان فارسی داشته باشد.
- **NFR-CP-010**: UI باید responsive برای موبایل و دسکتاپ باشد.
- **NFR-CP-011**: UI باید از WCAG 2.1 Level AA پیروی کند.

### ۵.۵) Compatibility
- **NFR-CP-012**: سیستم باید در Chrome، Firefox، Safari و Edge کار کند.
- **NFR-CP-013**: سیستم باید در Android 8+ و iOS 12+ کار کند.

---

## ۶) API Requirements

### ۶.۱) Customer Portal Service Endpoints

| Endpoint | Method | Description | Priority |
|----------|--------|-------------|----------|
| `/customer-portal/otp/initiate` | POST | شروع فرآیند OTP با شماره موبایل | P0 |
| `/customer-portal/otp/verify` | POST | تایید OTP و ایجاد session | P0 |
| `/customer-portal/session/validate` | POST | تایید اعتبار session | P0 |
| `/customer-portal/session/revoke` | POST | ابطال session | P0 |
| `/customer-portal/policies` | GET | لیست بیمه‌نامه‌های مشتری | P0 |
| `/customer-portal/policies/:id` | GET | جزئیات بیمه‌نامه | P0 |
| `/customer-portal/policies/:id/renew` | POST | درخواست تمدید بیمه‌نامه | P1 |
| `/customer-portal/claims` | GET | لیست خسارت‌های مشتری | P0 |
| `/customer-portal/claims` | POST | ثبت خسارت جدید (FNOL) | P0 |
| `/customer-portal/claims/:id` | GET | جزئیات خسارت | P0 |
| `/customer-portal/claims/:id/documents` | POST | افزودن مستندات به خسارت | P1 |
| `/customer-portal/payments` | GET | لیست پرداخت‌های مشتری | P0 |
| `/customer-portal/payments/initiate` | POST | شروع پرداخت | P0 |
| `/customer-portal/profile` | GET | پروفایل مشتری | P1 |
| `/customer-portal/profile` | PUT | ویرایش پروفایل مشتری | P1 |

### ۶.۲) Integration with Other Services

| Service | Purpose | Endpoints Used |
|---------|---------|---------------|
| party-kyc-service | احراز هویت مشتری | `/party/validate`, `/party/profile` |
| policy-service | اطلاعات بیمه‌نامه | `/policy/policies`, `/policy/renew` |
| claims-service | ثبت و پیگیری خسارت | `/claims/fnol`, `/claims/status` |
| claims-readmodel-service | داده‌های UI خسارت | `/rm/claims` |
| payments-service | پرداخت آنلاین | `/payments/initiate`, `/payments/confirm` |
| notification-service | ارسال OTP و اعلان | `/notification/sms`, `/notification/push` |
| orchestrator-service | هماهنگی تمدید | `/orchestrator/renewal` |

---

## ۷) UI/UX Requirements

### ۷.۱) Design Principles
- **Simplicity**: رابط کاربری ساده و intuitve
- **Consistency**: استفاده از design system یکپارچه
- **Accessibility**: پشتیبانی از screen readers و keyboard navigation
- **Performance**: انیمیشن‌های smooth و load times سریع

### ۷.۲) Color Palette
- Primary: Blue (#0066CC)
- Success: Green (#00CC66)
- Warning: Orange (#FF9900)
- Error: Red (#CC0033)
- Neutral: Gray (#666666)

### ۷.۳) Typography
- Font: Vazirmatn یا مشابه (پشتیبانی فارسی)
- Sizes: 12px, 14px, 16px, 18px, 24px, 32px
- Weights: Regular, Medium, Bold

### ۷.۴) Components
- Buttons: Primary, Secondary, Outline, Text
- Forms: Input, Select, Checkbox, Radio, DatePicker
- Cards: Policy Card, Claim Card, Payment Card
- Modals: Confirmation, Form, Alert
- Navigation: Bottom bar (mobile), Top bar (desktop)

---

## ۸) Data Model

### ۸.۱) Customer Session
```typescript
{
  id: string;
  customerId: string;
  nationalId: string;
  mobile: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}
```

### ۸.۲) Customer Policy View
```typescript
{
  policyId: string;
  policyNumber: string;
  product: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'CANCELLED';
  startDate: Date;
  endDate: Date;
  premium: number;
  insuredName: string;
  vehiclePlate?: string;
  propertyAddress?: string;
}
```

### ۸.۳) Customer Claim View
```typescript
{
  claimId: string;
  claimNumber: string;
  policyId: string;
  policyNumber: string;
  type: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  submittedAt: Date;
  estimatedAmount?: number;
  paidAmount?: number;
  documents: Document[];
}
```

---

## ۹) Testing Strategy

### ۹.۱) Unit Tests
- Coverage: >80%
- Tools: Jest
- Scope: Components, Services, Utils

### ۹.۲) Integration Tests
- Coverage: All API endpoints
- Tools: Supertest
- Scope: API integration with other services

### ۹.۳) E2E Tests
- Coverage: Critical user journeys
- Tools: Playwright
- Scenarios:
  - Login → Dashboard → View Policies → Logout
  - Login → File Claim → Track Status
  - Login → Make Payment → View Receipt

### ۹.۴) Performance Tests
- Load test: 500 concurrent users
- Stress test: 1000 concurrent users
- Tools: k6

---

## ۱۰) Deployment Strategy

### ۱۰.۱) Environments
- **Development**: Local development with mock services
- **Staging**: Pre-production with real integrations (sandbox)
- **Production**: Production environment

### ۱۰.۲) CI/CD
- Branch: main → deploy to staging
- Branch: production → deploy to production
- Automated tests on every PR
- Manual approval for production deployment

---

## ۱۱) Success Metrics

### ۱۱.۱) Adoption Metrics
- DAU (Daily Active Users)
- MAU (Monthly Active Users)
- Registration rate
- Session duration

### ۱۱.۲) Engagement Metrics
- Policies viewed per session
- Claims filed online vs offline
- Payments made online vs offline
- Support tickets per user

### ۱۱.۳) Satisfaction Metrics
- NPS (Net Promoter Score)
- CSAT (Customer Satisfaction)
- Task completion rate
- Time to complete task

---

## ۱۲) Risks و Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Integration با سنهاب ناموفق | Medium | High | Fallback به manual verification |
| OTP delivery failure | Medium | Medium | Backup verification methods |
| Payment gateway downtime | Low | High | Multiple payment providers |
| Performance degradation under load | Medium | Medium | Caching, rate limiting, auto-scaling |
| Security breach | Low | Critical | Regular security audits, penetration testing |

---

## ۱۳) Timeline و Milestones

### Phase 1: MVP (MVP)
- **Duration**: 8 weeks
- **Scope**:
  - Authentication (OTP)
  - Dashboard
  - Policy list and details
  - FNOL (basic)
  - Profile management
- **Milestone**: Beta launch with limited users

### Phase 2: Enhancement
- **Duration**: 6 weeks
- **Scope**:
  - Claims tracking and chat
  - Online payments
  - Policy renewal
  - Support tickets
- **Milestone**: Full launch

### Phase 3: Advanced Features
- **Duration**: 4 weeks
- **Scope**:
  - Policy amendments
  - Advanced analytics
  - Multi-language support
- **Milestone**: Feature complete

---

## ۱۴) Acceptance Criteria for Epic Completion

- [ ] همه user stories P0 پیاده‌سازی شده باشند
- [ ] E2E tests برای critical user journeys نوشته شده باشند
- [ ] Performance requirements برآورده شده باشند
- [ ] Security audit انجام شده باشد
- [ ] Documentation کامل باشد
- [ ] Beta launch با حداقل ۱۰۰ user انجام شده باشد
- [ ] Feedback از beta users جمع‌آوری و پیاده‌سازی شده باشد
