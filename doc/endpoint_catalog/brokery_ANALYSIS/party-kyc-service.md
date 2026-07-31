# Party-KYC Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: party-kyc-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. مدل Party و نقش‌های کارگزاری

### ۱.۱ عدم پشتیبانی نقش broker/agent در Party
- **اندپوینت**: `POST /parties`  
- **اشکال**: مدل Party برای اشخاص حقیقی و حقوقی طراحی شده اما فیلد `role` یا `partyType` قادر به تفکیک نقش‌های کارگزاری (broker، sub-agent، marketer، adjuster) نیست. طرح کارگزاری نیازمند این است که party می‌تواند هم کارگزار و هم مشتری باشد. در request body فقط `type: "individual|organization"` وجود دارد.

### ۱.۲ عدم ارتباط Party با Organization
- **اشکال**: هیچ اندپوینتی برای پیوند دادن یک Party به Organization (که در auth-service مدیریت می‌شود) وجود ندارد. طرح کارگزاری نیازمند این است که کارگزار به عنوان Party تعریف شود و به Organization متصل باشد.

---

## ۲. KYC و انطباق کارگزاری

### ۲.۱ عدم KYC اختصاصی کارگزار
- **اشکال**: فرآیند KYC (`POST /parties/:partyId/kyc/initial-review`) برای مشتریان طراحی شده است. هیچ مسیر KYC اختصاصی برای کارگزاران وجود ندارد که شامل بررسی لایسنس، سوءپیشینه حرفه‌ای و بررسی مالی باشد. طرح کارگزاری نیازمند KYC سخت‌گیرانه‌تر برای کارگزاران است.

### ۲.۲ عدم یکپارچه‌سازی AML با تراکنش‌های کمیسیون
- **اشکال**: AML screening (`POST /parties/:partyId/aml/screen`) روی party انجام می‌شود اما هیچ مکانیزمی برای AML screening روی تراکنش‌های کمیسیون و settlement کارگزاری وجود ندارد. تراکنش‌های بزرگ کمیسیون باید تحت AML monitoring باشند.

### ۲.۳ عدم screening تراکنش‌های تسویه کارگزاری
- **اشکال**: هیچ اندپوینتی برای AML screening روی settlement batches یا commission payments وجود ندارد. این یک نقص حیاتی برای انطباق ضد پولشویی در عملیات کارگزاری است.

---

## ۳. Consent و حریم خصوصی

### ۳.۱ عدم consent management برای اشتراک داده بین سازمان‌ها
- **اشکال**: طرح کارگزاری نیازمند این است که داده مشتری بین کارگزار و بیمه‌گر به اشتراک گذاشته شود. هیچ اندپوینتی برای مدیریت consent مشتری برای اشتراک داده بین سازمان‌های مختلف (broker ↔ carrier) وجود ندارد. consent فعلی فقط در سطح tenant است.

---

## ۴. ذینفعان و مصرف‌کنندگان

### ۴.۱ عدم استفاده broker-portal-bff از party-kyc
- **اشکال**: `broker-portal-bff` هیچ اندپوینتی برای دسترسی به اطلاعات KYC مشتریان ندارد. کارگزار باید بتواند وضعیت KYC مشتریان خود را بررسی کند اما BFF مسیری به party-kyc-service فراهم نمی‌کند.

### ۴.۲ عدم دسترسی customer-portal به وضعیت KYC
- **اشکال**: `customer-portal-service` هیچ اندپوینتی برای نمایش وضعیت KYC مشتری ندارد. مشتری باید بتواند وضعیت KYC و مستندات مورد نیاز خود را ببیند.

### ۴.۳ عدم sync KYC status با sales-network-service
- **اشکال**: وقتی وضعیت KYC یک party تغییر می‌کند، هیچ مکانیزم sync با `sales-network-service` وجود ندارد. اگر KYC یک agent رد شود، sales-network-service باید به طور خودکار وضعیت agent را suspend کند.

---

## ۵. نقایص جامعیت

### ۵.۱ عدم bulk KYC review
- **اشکال**: هیچ اندپوینتی برای bulk KYC review وجود ندارد. در عملیات کارگزاری با تعداد زیادی agent/sub-agent، نیاز به بررسی گروهی KYC وجود دارد.

### ۵.۲ عدم تاریخچه تغییرات KYC
- **اشکال**: هیچ اندپوینتی برای دریافت تاریخچه کامل تغییرات KYC یک party وجود ندارد. فقط `GET /parties/:partyId/kyc/initial-review` آخرین وضعیت را برمی‌گرداند.

### ۵.۳ عدم KYC exception escalation به سازمان
- **اشکال**: KYC exception endpoints (`raise`، `assign`، `resolve`، `escalate`) در سطح party عمل می‌کنند اما قادر به escalation به سطح سازمان نیستند. اگر KYC یک کارگزار مشکل داشته باشد، باید کل سازمان تحت تأثیر قرار گیرد.

---

## ۶. تأیید جامعیت و وضعیت رفع اشکالات

**تاریخ بررسی**: 2025-01-15  
**وضعیت**: همه اشکالات رفع شد  

### تأیید جامعیت لیست اشکالات
بررسی کدهای موجود و مقایسه با `BROKERAGE_IMPLEMENTATION_PLAN.md` نشان می‌دهد که لیست فوق **کامل و جامع** است. هیچ نقص دیگری در `party-kyc-service` از منظر کارگزاری یافت نشد. موجودیت‌های `PartyRoleAssignment`، `BrokerLicense`، `FederationConsent`، `GlobalSubject`، `IdentityLink` و `KycExceptionEntity` از قبل در کد موجود بودند اما به طور کامل یکپارچه نشده بودند.

### وضعیت رفع اشکالات

| شماره | اشکال | وضعیت | فایل‌های تغییر یافته |
|--------|-------|--------|---------------------|
| ۱.۱ | پشتیبانی نقش broker/agent در Party | **رفع شد** | `party.service.ts`, `party.controller.ts`, `permissions.ts` |
| ۱.۲ | ارتباط Party با Organization | **رفع شد** | `Party.ts`, `party.service.ts`, `party.controller.ts`, migration |
| ۲.۱ | KYC اختصاصی کارگزار | **رفع شد** | `KycReview.ts`, `party.service.ts`, `party.controller.ts`, migration |
| ۲.۲ | AML با تراکنش‌های کمیسیون | **رفع شد** | `TransactionAmlScreening.ts`, `party.service.ts`, `party.controller.ts`, migration |
| ۲.۳ | Screening تراکنش‌های تسویه | **رفع شد** | `TransactionAmlScreening.ts`, `party.service.ts`, `party.controller.ts`, migration |
| ۳.۱ | Consent management بین سازمان‌ها | **رفع شد** | `ConsentRecord.ts`, `party.service.ts`, `party.controller.ts`, migration |
| ۴.۱ | broker-portal-bff دسترسی به party-kyc | **رفع شد** | `broker-bff.service.ts`, `broker.controller.ts` |
| ۴.۲ | customer-portal دسترسی به وضعیت KYC | **رفع شد** | `customer-portal.service.ts`, `customer-portal.controller.ts` |
| ۴.۳ | sync KYC status با sales-network-service | **رفع شد** | `party.service.ts` (event publishing), `sales-network.service.ts` (event consumption) |
| ۵.۱ | bulk KYC review | **رفع شد** | `party.service.ts`, `party.controller.ts` |
| ۵.۲ | تاریخچه تغییرات KYC | **رفع شد** | `party.service.ts`, `party.controller.ts` |
| ۵.۳ | KYC exception escalation به سازمان | **رفع شد** | `KycExceptionEntity.ts`, `party.service.ts`, `party.controller.ts`, migration |

### اندپوینت‌های جدید اضافه شده

**در party-kyc-service:**
- `POST /party/:partyId/link-organization` — پیوند Party به Organization
- `POST /party/:partyId/broker-kyc/initiate` — شروع KYC اختصاصی کارگزار
- `POST /party/:partyId/broker-kyc/check` — به‌روزرسانی وضعیت بررسی‌های کارگزار
- `POST /party/:partyId/aml/commission-screening` — AML روی تراکنش کمیسیون
- `POST /aml/settlement-batch-screening` — AML روی batch تسویه
- `POST /party/:partyId/cross-org-consent/grant` — اعطای consent بین سازمان‌ها
- `POST /party/:partyId/cross-org-consent/revoke` — ابطال consent بین سازمان‌ها
- `GET /party/:partyId/cross-org-consent/check` — بررسی وضعیت consent
- `POST /kyc/bulk-review` — بررسی گروهی KYC
- `GET /party/:partyId/kyc-history` — تاریخچه KYC
- `POST /kyc-exception/:exceptionId/escalate-to-organization` — escalation به سازمان
- `GET /organizations/:organizationId/parties` — دریافت party‌های یک سازمان

**در broker-portal-bff:**
- تمام اندپوینت‌های فوق به صورت proxy از طریق `/broker/kyc/*` و `/broker/organizations/*` و `/broker/parties/*`

**در customer-portal-service:**
- `GET /customer-portal/kyc-status` — نمایش وضعیت KYC مشتری

### تغییرات Schema (Migration)
فایل migration: `1700000000050-brokerage-kyc-enhancements.ts`
- `parties.organization_id` (uuid, nullable)
- `kyc_reviews.kyc_type` (text, default 'standard')
- `kyc_reviews.license_check_status`, `license_verified_at`, `license_id`
- `kyc_reviews.background_check_status`, `background_checked_at`
- `kyc_reviews.financial_check_status`, `financial_checked_at`
- `kyc_exception.organization_id`, `escalated_to_organization_id`
- `consent_records.target_organization_id`, `source_organization_id`
- جدول جدید: `transaction_aml_screenings`

### رویدادهای جدید Kafka
- `insurance.party.kyc_status_changed` — برای sync با sales-network-service
- `insurance.party.organization_linked` — برای پیوند Party به Organization
- `insurance.aml.commission_screened` — نتیجه AML تراکنش کمیسیون
- `insurance.aml.settlement_batch_screened` — نتیجه AML batch تسویه
- `insurance.party.cross_org_consent_granted` — اعطای consent بین سازمان‌ها
- `insurance.party.cross_org_consent_revoked` — ابطال consent بین سازمان‌ها
- `insurance.kyc.exception_escalated_to_org` — escalation به سازمان
