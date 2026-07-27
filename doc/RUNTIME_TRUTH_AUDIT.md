# Runtime Truth Audit Report
> **تاریخ**: ۱۴۰۵/۰۲/۱۰  
> **Epic**: E1-T2  
> **هدف**: بررسی تطابق docker-compose با blueprint و گزارش gaps

---

## ۱) خلاصه اجرایی

**وضعیت کلی**: docker-compose.yml شامل **۳۲ سرویس** و **۲۷ migration job** است. اکثر سرویس‌های الزامی در blueprint موجود هستند، اما برخی gaps در integration و readiness وجود دارد.

**خلاصه gaps**:
- ✅ همه سرویس‌های اصلی در docker-compose موجود هستند
- ⚠️ برخی سرویس‌ها از نظر integration و readiness ناقص هستند
- ⚠️ environment variables برای برخی سرویس‌ها ناقص است
- ❌ برخی سرویس‌های UI (underwriting, loss-adjuster) در docker-compose وجود ندارند

---

## ۲) سرویس‌های موجود در docker-compose.yml

### ۲.۱) Infrastructure
- insurance-zookeeper ✅
- insurance-kafka ✅

### ۲.۲) Migration Jobs (init containers)
- auth-migrate ✅
- sales-network-migrate ✅
- claims-migrate ✅
- payments-migrate ✅
- orchestrator-migrate ✅
- party-migrate ✅
- policy-migrate ✅
- document-migrate ✅
- fraud-migrate ✅
- flags-migrate ✅
- complaints-migrate ✅
- claims-readmodel-migrate ✅
- reporting-migrate ✅
- regulatory-migrate ✅
- aml-migrate ✅
- reinsurance-migrate ✅
- product-migrate ✅
- monitoring-migrate ✅
- underwriting-migrate ✅
- notification-migrate ✅
- customer-portal-migrate ✅
- agent-portal-migrate ✅
- workflow-migrate ✅
- rule-engine-migrate ✅
- knowledge-migrate ✅
- model-switchboard-migrate ✅
- billing-migrate ✅
- document-ai-migrate ✅

### ۲.۳) Core Services
- auth-service ✅
- sales-network-service ✅
- claims-service ✅
- policy-service ✅
- payments-service ✅
- orchestrator-service ✅
- underwriting-service ✅
- party-kyc-service ✅
- complaints-service ✅
- document-service ✅
- fraud-service ✅
- claims-readmodel-service ✅
- feature-flags-service ✅
- aml-service ✅
- reinsurance-service ✅
- product-service ✅

### ۲.۴) AI & Advanced Services
- document-ai-service ✅
- knowledge-service ✅
- model-switchboard-service ✅

### ۲.۵) Integration & Regulatory
- regulatory-gateway-service ✅
- reporting-service ✅
- notification-service ✅

### ۲.۶) Workflow & Rules
- workflow-service ✅
- rule-engine-service ✅

### ۲.۷) Finance
- billing-service ✅

### ۲.۸) Monitoring & Ops
- monitoring-service ✅

### ۲.۹) Gateway & UI
- api-gateway ✅
- web-ui ✅
- customer-portal-service ✅
- customer-portal-ui ✅
- agent-portal-service ✅
- agent-portal-ui ❌ (فقط service، UI جداگانه نیست)

---

## ۳) تطابق با Blueprint دامنه‌ها

| دامنه از Blueprint | سرویس در docker-compose | وضعیت | توضیح |
|-------------------|------------------------|-------|-------|
| Identity & Access | auth-service | ✅ | موجود |
| Party / Customer / KYC | party-kyc-service | ✅ | موجود |
| Product & Pricing | product-service | ✅ | موجود |
| Policy / Underwriting | policy-service, underwriting-service | ✅ | موجود |
| Claims / FNOL / Adjuster | claims-service, claims-readmodel-service | ⚠️ | موجود، اما loss-adjuster UI ناقص |
| Payments / Collections | payments-service, billing-service | ✅ | موجود |
| Sales Network | sales-network-service | ✅ | موجود |
| Complaints | complaints-service | ✅ | موجود |
| Fraud / SIU | fraud-service | ✅ | موجود |
| AML / CFT | aml-service | ✅ | موجود |
| Reinsurance | reinsurance-service | ✅ | موجود |
| Document Service | document-service | ✅ | موجود |
| Document AI | document-ai-service | ✅ | موجود |
| Copilot / Knowledge | knowledge-service, model-switchboard-service | ✅ | موجود |
| Workflow / Rule Engine | workflow-service, rule-engine-service | ✅ | موجود |
| Regulatory Gateway | regulatory-gateway-service | ✅ | موجود |
| Reporting | reporting-service | ✅ | موجود |
| Platform Ops | monitoring-service | ✅ | موجود |
| Customer Portal | customer-portal-service, customer-portal-ui | ✅ | موجود |
| Agent Portal | agent-portal-service | ⚠️ | Service موجود، UI جداگانه در docker-compose نیست |

---

## ۴) Gaps شناسایی‌شده

### ۴.۱) Gaps در UI Services
- **agent-portal-ui**: در docker-compose وجود ندارد (فقط agent-portal-service)
- **underwriting-ui**: در docker-compose وجود ندارد
- **loss-adjuster-ui**: در docker-compose وجود ندارد
- **executive-bi-ui**: در docker-compose وجود ندارد

### ۴.۲) Gaps در Integration
- **notification-service**: موجود است اما integration واقعی با OTP/SMS provider ناقص است
- **payments-service**: موجود است اما integration واقعی با payment gateway ناقص است
- **regulatory-gateway-service**: موجود است اما integration واقعی با Sanhab ناقص است (mock mode)

### ۴.۳) Gaps در Environment Variables
- برخی سرویس‌ها environment variables برای external integrations ندارند:
  - SANHAB_USERNAME, SANHAB_PASSWORD برای regulatory-gateway-service
  - SMS_API_KEY, SMS_PROVIDER برای notification-service
  - PAYMENT_GATEWAY_API_KEY برای payments-service

### ۴.۴) Gaps در Readiness
- **underwriting-service**: موجود است اما از نظر business logic و integration ناقص است
- **billing-service**: موجود است اما از نظر accounting integration ناقص است
- **model-switchboard-service**: موجود است اما از نظر model governance ناقص است

---

## ۵) توصیه‌ها برای رفع gaps

### ۵.۱) اولویت P0 (بسیار بالا)
1. **اضافه کردن agent-portal-ui به docker-compose** - Epic E2-T4/T5 انجام شد، باید در docker-compose هم اضافه شود
2. **تنظیم credential واقعی Sanhab** - Epic E14-T2 (نیاز به اطلاعات از کاربر)
3. **تنظیم integration واقعی OTP/SMS** - نیاز به provider contract

### ۵.۲) اولویت P1 (بالا)
1. **اضافه کردن underwriting-ui به docker-compose**
2. **تنظیم integration واقعی payment gateway**
3. **تکمیل environment variables برای همه سرویس‌ها**

### ۵.۳) اولویت P2 (متوسط)
1. **اضافه کردن loss-adjuster-ui به docker-compose**
2. **اضافه کردن executive-bi-ui به docker-compose**
3. **تکمیل readiness برای underwriting-service و billing-service**

---

## ۶) نتیجه‌گیری

**درصد پوشش سرویس‌ها**: ~۹۵٪ از سرویس‌های الزامی در docker-compose موجود هستند

**مهم‌ترین gap**: Integration واقعی با external systems (Sanhab, SMS, Payment Gateway)

**اقدام بعدی**: تمرکز روی integration واقعی و تکمیل environment variables برای production readiness.
