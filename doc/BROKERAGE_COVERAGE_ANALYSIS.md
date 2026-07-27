# تحلیل پوشش سامانه کارگزاری بیمه و نرم‌افزارهای منبع‌باز

## ۱. نتیجه کلی

سامانه موجود (بیمه‌محور اکوسیستم) حدود **۵۵–۶۵٪** (تقریباً **۶۰٪**) از نیازمندی‌های تخصصی یک **سامانه کارگزاری بیمه در ایران** را پوشش می‌دهد.

اگر از منظر کلی «سامانه بیمه» نگاه کنیم، چک‌لیست تکمیل کارکردی (`FUNCTIONAL_COMPLETION_CHECKLIST.md`) نشان می‌دهد بخش‌های عمومی پلتفرم حدود **۸۸٪** پیشرفت دارند؛ اما بخش‌های خاص کارگزاری (مقایسه چندبیمه‌گر، اتصال واقعی به سنهاب/بیمه مرکزی، مدیریت پروانه کارگزاری، محاسبات کارمزد آیین‌نامه ۱۰۲، RFQ/Placement، Claims Advocacy و ...) هنوز ناقص یا نیازمند گسترش هستند.

---

## ۲. نقشه سامانه موجود

سرویس‌های اصلی موجود در کدبیس که با نیاز کارگزاری تداخل دارند (بر اساس `service-capability-summary.md` و `FUNCTIONAL_COMPLETION_CHECKLIST.md`):

| سرویس | نقش در کارگزاری | وضعیت |
|-------|-------------------|-------|
| `sales-network-service` | ثبت کارگزار/نماینده، قرارداد کارمزد، دفتر پورسانت، KPI | ✅ پیاده‌سازی شده |
| `agent-portal-service` | داشبورد کارگزار، بیمه‌نامه‌ها، خسارات، پورسانت، leads | ✅ پیاده‌سازی شده |
| `customer-portal-service` | پرتال مشتری (خرید، FNOL، شکایت، تمدید) | ✅ پیاده‌سازی شده |
| `policy-service` + `product-service` | صدور، تمدید، الحاقیه، محاسبه حق بیمه | ✅ پیاده‌سازی شده |
| `quote-engine.ts` | موتور قیمت‌گذاری تک‌محصولی با قوانین پیچیده | ✅ پیاده‌سازی شده |
| `claims-service` | ثبت، ارجاع به ارزیاب، پیگیری خسارت | ✅ پیاده‌سازی شده |
| `payments-service` + `billing-service` + `collections-service` | پرداخت، اقساط، فاکتور، حسابداری دوطرفه، درگاه | ✅ پیاده‌سازی شده |
| `regulatory-gateway-service` | استعلام سنهاب (mock + real skeleton)، کد یکتا | ⚠️ زیرساخت آماده؛ اتصال واقعی نیازمند گواهی/کلید بیمه مرکزی |
| `notification-service` | SMS/Email/OTP (Kavenegar/Twilio/SendGrid/SES) | ✅ پیاده‌سازی شده |
| `workflow-service` / `workflow-engine-service` | BPMN-lite، human task، timer | ✅ پیاده‌سازی شده |
| `rule-engine-service` | قواعد قیمت/انطباق | ✅ پیاده‌سازی شده |
| `copilot-service` + `knowledge-service` + `model-switchboard-service` | AI Copilot، NBA، Knowledge Graph | ⚠️ قابل استفاده؛ OCR/LLM واقعی نیازمند تنظیم API Key |
| `underwriting-service` | ارزیابی ریسک، Appetite Matrix | ✅ پیاده‌سازی شده |
| `reporting-service` + Executive BI | داشبورد مدیریتی، read model | ✅ پیاده‌سازی شده |

---

## ۳. ارزیابی پوشش بر اساس چک‌لیست کارگزاری

چک‌لیست استخراج‌شده از `تحقیقات_کارگزاری_های_بیمه_ایران.md` بخش ۱۲ و نقشه راه بخش ۱۶:

### ۱۲.۱ داده‌ها و هویت

| نیازمندی | وضعیت | شواهد/ملاحظات |
|----------|-------|---------------|
| ثبت کارگزار با کد رسمی بیمه مرکزی، کد همکاری و پروانه | ⚠️ ناقص | `SalesPartner` دارای `license_code` و `legal_national_id` است (`services/sales-network-service/src/entities/SalesPartner.ts`) اما اعتبارسنجی خودکار با بیمه مرکزی وجود ندارد. |
| تفکیک کارگزار حقیقی/حقوقی و برخط/غیربرخط | ⚠️ ناقص | فیلد `kind` فقط `agency | brokerage` را دارد؛ نوع برخط/غیربرخط و حقیقی/حقوقی در `metadata` قابل ذخیره است. |
| ثبت شعب، نمایندگان جنرال، نمایندگان زندگی و بازاریابان تابعه | ⚠️ ناقص | `orgUnit` ساپورت می‌شود ولی مدل تفکیک رشته‌ای (زندگی/غیرزندگی) وجود ندارد. |
| لینک کارگزار به چندین شرکت بیمه (برخلاف نماینده تک‌شرکتی) | ⬜ موجود نیست | `CommissionContract` و `SalesPartner` بر اساس `orgUnitId` یک شرکت/tenant طراحی شده‌اند؛ ارتباط چندبه‌چند با شرکت‌های بیمه‌گر مختلف تعریف نشده. |
| قرارداد و نرخ کارمزد قابل پیکربندی به تفکیک شرکت بیمه و رشته | ⚠️ ناقص | `CommissionContract` رشته (`line_of_business`) و نرخ (`rate_bps` / `fixed_fee_amount`) را دارد (`services/sales-network-service/src/entities/CommissionContract.ts`) اما فیلتر شرکت بیمه‌گر ندارد. |

### ۱۲.۲ فرآیند فروش و صدور

| نیازمندی | وضعیت | شواهد/ملاحظات |
|----------|-------|---------------|
| پیشنهادگری محصول و مقایسه نرخ بین شرکت‌ها | ⬜ موجود نیست | `quote-engine.ts` تک‌محصولی است و قابلیت مقایسه side-by-side چند شرکت بیمه‌گر ندارد. |
| ثبت استعلام و پیش‌فاکتور | ⚠️ ناقص | quote و convert-quote وجود دارد اما پیش‌فاکتور رسمی کارگزاری/RFQ به شکل مستقل تعریف نشده. |
| ثبت بیمه‌نامه با ثبت کارگزار به‌عنوان کانال فروش | ✅ کامل | `SalesPolicyAttribution` در `sales-network-service` خودکار `policyId` را به `orgUnitId` پیوند می‌دهد. |
| محاسبه و تسویه کارمزد کارگزار | ✅ کامل | `CommissionLedger` با وضعیت `accrued → paid` و `void` در `sales-network-service` پیاده‌سازی شده. |
| داشبورد فروش و پرتفوی کارگزار | ✅ کامل | `agent-portal-service` داشبورد، KPI، trend، commission history و policy portfolio دارد. |

### ۱۲.۳ خسارت و پشتیبانی

| نیازمندی | وضعیت | شواهد/ملاحظات |
|----------|-------|---------------|
| ثبت و پیگیری خسارت توسط کارگزار از طرف بیمه‌گذار | ✅ کامل | `agent-portal-service` امکان مشاهده خسارات و `customer-portal-service` امکان ثبت FNOL دارد. |
| ارتباط مستقیم کارگزار با کارشناس خسارت | ⚠️ ناقص | `orchestrator-service` work item دارد ولی چت/تیکت اختصاصی بین کارگزار و ارزیاب خسارت پیاده‌سازی نشده. |
| بارگذاری مدارک و رهگیری وضعیت پرونده | ✅ کامل | `document-service`، `claims-service` و `document-ai-service` کامل هستند. |

### ۱۲.۴ انطباق و حاکمیت

| نیازمندی | وضعیت | شواهد/ملاحظات |
|----------|-------|---------------|
| بررسی مجوز و اعتبار کارگزار قبل از ثبت هر معامله | ⚠️ ناقص | وضعیت `pending → verified` در `SalesPartner` وجود دارد ولی استعلام زنده از بیمه مرکزی ندارد. |
| کنترل کارمزد بر اساس آیین‌نامه ۱۰۲ / جلوگیری از پرداخت بیش از نصاب | ⚠️ ناقص | نرخ کارمزد قابل ثبت است اما سقف آیین‌نامه‌ای به‌صورت خودکار کنترل نمی‌شود. |
| گزارش‌دهی به بیمه مرکزی و سنهاب | ⚠️ ناقص | `RealSanhabClient` فقط skeleton دارد (`services/regulatory-gateway-service/src/sanhab-clients/real-sanhab.client.ts`)؛ اتصال واقعی نیازمند گواهی و WSDL است. |
| ثبت شکایات مرتبط با کارگزاران | ✅ کامل | `complaints-service` با مدیریت شکایات و SLA وجود دارد. |

### ۱۲.۵ دیجیتال و AI

| نیازمندی | وضعیت | شواهد/ملاحظات |
|----------|-------|---------------|
| پرتال کارگزار با امکان صدور آنلاین | ⚠️ ناقص | `agent-portal-service` و UI `/sales-network` وجود دارد اما مسیر صدور آنلاین کامل توسط کارگزار از طریق پرتال مستقل هنوز ناقص است. |
| ابزار مقایسه و مشاوره هوشمند | ⚠️ ناقص | `knowledge-service` و `copilot-service` مشاوره دارند ولی موتور مقایسه نرخ چند شرکت ندارند. |
| پیشنهادگر Next Best Action برای هر کارگزار/مشتری | ✅ کامل | `knowledge-service` دارای NBA Engine است. |
| پنل مشاوران و بازاریابان زیرمجموعه کارگزار | ⚠️ ناقص | `sales-network-service` partner و `agent-portal` KPI دارد ولی سلسله‌مراتب زیرمجموعه کارگزار کامل نیست. |
| پیگیری خودکار خسارت و یادآوری تمدید | ✅ کامل | `notification-service` templateها و `workflow-service` وظایف/یادآوری دارند. |

### جمع‌بندی عددی

با امتیازدهی ۱=کامل، ۰.۵=ناقص، ۰=ندارد:

- داده/هویت: ۲/۵ (۴۰٪)
- فروش/صدور: ۳.۵/۵ (۷۰٪)
- خسارت/پشتیبانی: ۲.۲۵/۳ (~۷۵٪)
- انطباق/حاکمیت: ۲.۲۵/۴ (~۵۶٪)
- دیجیتال/AI: ۳.۲۵/۵ (۶۵٪)
- **میانگین کل: ~۵۸٪–۶۲٪**

---

## ۴. نقاط ضعف/خلأ کلیدی برای کارگزاری

1. **مقایسه چندبیمه‌گر (Multi-carrier quoting/RFQ)** — مهم‌ترین نیاز کارگزاری نسبت به نماینده تک‌شرکتی.
2. **Placement / RFQ Packaging** — ارسال خودکار استعلام به چند بیمه‌گر و جمع‌آوری پیشنهاد.
3. **اعتبارسنجی و استعلام پروانه کارگزاری از بیمه مرکزی**.
4. **اتصال واقعی سنهاب** (کد یکتا، استعلام بیمه‌نامه/خودرو) — `RealSanhabClient` آماده اما فاقد کلید/گواهی است.
5. **کنترل خودکار کارمزد بر اساس آیین‌نامه ۱۰۲**.
6. **Claims Advocacy / ارتباط کارگزار-ارزیاب خسارت**.
7. **داشبورد TCoR و تحلیل پرتفوی سازمانی** (بخش ۱۶ نقشه راه).
8. **بیمه تعبیه‌شده / پارامتریک / API عمومی کارگزاری**.
9. **OCR/LLM واقعی** (Copilot/Document AI) — نیازمند API Key و آموزش مدل‌های فارسی/بیمه‌ای.

---

## ۵. نرم‌افزارهای منبع‌باز نزدیک به نیازمندی‌ها

| رتبه | نام | لینک | فناوری | پوشش نزدیک به پروژه | ملاحظات |
|------|-----|------|--------|---------------------|---------|
| ۱ | **Nebula Insurance CRM** | https://github.com/gajakannan/nebula-insurance-crm | C# .NET/React/Python | Commercial P&C CRM برای broker/MGA: producer hierarchies, policy lifecycle, submission/quoting/proposal, document management, communication capture, claims tracking, commissions, billing, carrier relationships. | MIT License؛ public preview؛ مناسب‌ترین برای جایگزینی/مرجع ماژول CRM/کارگزاری. |
| ۲ | **Quickfire / Openfire** | https://github.com/flashvenom/quickfire | ASP.NET Core / Blazor / EF Core | AMS برای independent P&C agencies/brokers: clients, policies, carriers, renewals, quotes, submissions, forms library, OpenAI integration. | Openfire هسته open-source؛ نسخه کامل desktop/server تجاری است؛ فاقد سنهاب/بومی‌سازی ایران. |
| ۳ | **CoSure PAS** | https://github.com/cosure-dev/pas-platform | MACH (microservices/API-first/cloud-native/headless) | Policy Administration System برای brokers/MGAs/InsurTechs: dynamic form engine, pluggable underwriting engine, decoupled rating engine, no-code product config. | Apache 2.0؛ هنوز early stage؛ معماری نزدیک به پروژه فعلی. |
| ۴ | **ACORDAI** | https://github.com/BaharathBathula/ACORDAI | Next.js / FastAPI / PostgreSQL | AI-powered AMS: customer mgmt, policy, claims, AI Copilot, workflow engine, document intelligence, analytics, compliance. | Stars کم؛ بیشتر مرجع AI/Architecture؛ مناسب برای بخش AI. |
| ۵ | **InsurancePortal (Carlsson)** | https://github.com/eCarlsson-r/InsurancePortal | Laravel 12 / React 19 / MySQL | Hierarchical agent system (Leader/Team/Agency), policies, OCR policy ingestion, receipt tracking, production reports, complex commission/bonus calculations. | MIT؛ قوی در سلسله‌مراتب نمایندگان و پورسانت؛ مناسب برای ایده‌برداری از مدل کمیسیون. |
| ۶ | **inxuro** | https://github.com/ryanvelbon/inxuro | Laravel / Vue.js / Tailwind | Insurance broker CRM: leads/contacts, insurers/rates, policies, claims, accounting/billing, multi-tenancy, multi-lingual, multi-theme. | BSL License؛ ساده‌تر و مناسب برای دفاتر کوچک. |
| ۷ | **Yosef** | https://github.com/elyosemite/Yosef | .NET C# / Python / TypeScript / Gleam | Insurance microservices: identity for brokerages, quotation, policy, claim, notification, analytics. | هنوز در حال توسعه؛ معماری microservices نزدیک. |
| ۸ | **LatticePolicy** | https://github.com/kishorjakkula/LatticePolicy | — | Multi-tenant P&C PAS: quote, bind, issue, endorse, cancel, renew, customer portal, Docker. | مناسب برای ماژول سیاست‌گذاری. |
| ۹ | **Aposin OpenInsurancePlatform** | https://github.com/aposin/openinsuranceplatform | Java/OSGi | Comprehensive core insurance: CRM, sales force, policy, claims, collection/disbursement, commission, product engine, workflow, reinsurance. | جامع ولی سنگین؛ بیشتر مناسب شرکت بیمه (carrier) تا کارگزاری خالص. |
| ۱۰ | **Scalovate Insurance Broker Pro** | https://github.com/rulhaq/insurance-broker-ai | SvelteKit / Firebase | AI-powered broker platform: marketplace, rate comparison, automated claims, workflow, AI chat. | MIT؛ Firebase-based؛ مناسب ایده UI/UX broker marketplace. |

**نکته مهم:** هیچ‌یک از پروژه‌های بالا اتصال آماده به **سنهاب/بیمه مرکزی ایران** یا بومی‌سازی فارسی/ریال ندارند و نیازمند تطبیق هستند.

---

## ۶. پیشنهادهای کلیدی

1. **ادغام و تکمیل سامانه موجود (توصیه اول)**
   - بیشترین هزینه/فایده: سامانه فعلی دارای زیرساخت policy/claims/payment/portal/notification/workflow/AI است.
   - تمرکز روی ۴ گپ اصلی: **multi-carrier quoting/RFQ**، **اتصال واقعی سنهاب**، **اعتبارسنجی پروانه کارگزاری**، **کنترل کارمزد آیین‌نامه ۱۰۲**.

2. **استفاده از منبع‌باز به‌عنوان مرجع/الگو**
   - برای ماژول CRM/کارگزاری: **Nebula Insurance CRM** یا **Quickfire/Openfire**.
   - برای موتور قیمت/فرم/تنظیم محصول بدون کد: **CoSure PAS**.
   - برای AI Copilot/Document Intelligence: **ACORDAI**.
   - برای سلسله‌مراتب و محاسبات پورسانت پیچیده: **InsurancePortal**.

3. **فنی**
   - هر کاندیدای منبع‌باز باید با معماری میکروسرویس و API Gateway موجود یکپارچه شود.
   - بومی‌سازی (RTL، تقویم شمسی، ریال/تومان، درگاه‌های پرداخت ایرانی، Sanhab، Kavenegar) برای هر پروژه‌ای الزامی است.

---

## ۷. منابع داخلی مرجع

- `d:\CascadeProjects\old\insurance\تحقیقات_کارگزاری_های_بیمه_ایران.md` (نیازمندی‌ها و نقشه راه)
- `d:\CascadeProjects\old\insurance\doc\FUNCTIONAL_COMPLETION_CHECKLIST.md` (وضعیت پیاده‌سازی)
- `d:\CascadeProjects\old\insurance\doc\service-capability-summary.md` (توانمندی‌های سرویس‌ها)
- `d:\CascadeProjects\old\insurance\services\sales-network-service\src\entities\SalesPartner.ts`
- `d:\CascadeProjects\old\insurance\services\sales-network-service\src\entities\CommissionContract.ts`
- `d:\CascadeProjects\old\insurance\services\sales-network-service\src\sales-network.controller.ts`
- `d:\CascadeProjects\old\insurance\services\agent-portal-service\src\agent-portal.controller.ts`
- `d:\CascadeProjects\old\insurance\services\product-service\src\quote-engine.ts`
- `d:\CascadeProjects\old\insurance\services\regulatory-gateway-service\src\sanhab-clients\real-sanhab.client.ts`
