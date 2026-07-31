# سند پیشرفت کار رفع اشکالات کارگزاری

**تاریخ شروع**: ۱۴۰۵/۰۵/۰۹  
**آخرین به‌روزرسانی**: ۱۴۰۵/۰۵/۱۳  

---

## وضعیت کلی

| # | سرویس | وضعیت | اشکالات تأیید شده | اشکالات رفع شده | باقی مانده |
|---|-------|-------|---------------------|------------------|-------------|
| ۵ | policy-service | تکمیل شده | ۱۳ | ۱۳ | ۰ (consumers بررسی شد) |
| ۱ | sales-network-service | تکمیل شده | ۱۴ | ۱۶ | ۰ |
| ۲ | product-service | تکمیل شده | ۲۴ | ۲۴ | ۰ |
| ۳ | party-kyc-service | تکمیل شده | ۱۲ | ۱۲ | ۰ |
| ۴ | auth-service | تکمیل شده | ۱۶ | ۱۶ | ۰ |
| ۶ | submission-placement-service | تکمیل شده | — | ۷ | ۰ |
| ۷ | billing-service | تکمیل شده | — | ۸ | ۰ |
| ۸ | claims-service | تکمیل شده | — | ۱۴ | ۰ |
| ۹ | regulatory-gateway-service | تکمیل شده | ۱۵ | ۱۵ | ۰ |
| ۱۰ | underwriting-service | تکمیل شده | — | ۹ | ۰ |
| ۱۱ | payments-service | تکمیل شده | — | ۵ | ۰ |
| ۱۲ | collections-service | تکمیل شده | — | ۷ | ۰ |
| ۱۳ | reporting-service | تکمیل شده | — | ۶ | ۰ |
| ۱۴ | broker-portal-bff | تکمیل شده (policy + regulatory + claims + collections + payments + underwriting endpoints + JWT validation + rate limiting) | — | ۴ | ۰ |
| ۱۵ | channel-workspace-bff | تکمیل شده (partner/contract/agreement/sub-agent/quote-compare + JWT validation) | — | ۱ | ۰ |
| ۱۶ | agent-portal-service | تکمیل شده (broker vs agent role distinction + agentId validation + session security + session refresh + dashboard filtering + policy details + claim status tracking + customer details + commission details + advocacy case management + adjuster referral management + recovery tracking) | — | ۱۴ | ۰ |
| ۱۷ | customer-portal-service | تکمیل شده (KYC + notification consumer + OTP security + FNOL broker notification + complaint creation/tracking + claim document download + payment initiation + broker info + installment details + advocacy case creation + broker policy filter + endorsement submit/track + renewal quote comparison + adjuster communication) | — | ۱۶ | ۰ |

---

## policy-service — بررسی و رفع اشکالات

### بررسی صحت اشکالات سند تحلیل

| شماره اشکال | عنوان | وضعیت تأیید | توضیح |
|--------------|-------|-------------|-------|
| ۱.۱ | عدم ارتباط Quote با Submission/Placement | ✅ تأیید | `quote()` فاقد `submissionId`/`placementId` است |
| ۱.۲ | عدم فیلتر بر اساس broker organization | ✅ تأیید | `listPolicies()` فاقد فیلتر `distributionOrganizationId` است |
| ۱.۳ | عدم validation قرارداد توزیع هنگام issue | ✅ تأیید | `issue()` فقط broker license را بررسی می‌کند، نه distribution agreement را |
| ۲.۱ | تکرار با regulatory-gateway-service | ❌ رد | policy-service به regulatory-gateway-service delegate می‌کند (`getRegulatoryUrl()`)، تکرار وجود ندارد |
| ۲.۲ | عدم استفاده از regulatory-gateway-service | ❌ رد | `sanhabInquiry()` و `sanhabSmsInquiry()` هر دو به regulatory-gateway-service فراخوانی می‌کنند |
| ۳.۱ | عدم endorsement کارگزاری | ✅ تأیید | نوع `broker_change` در endorsementType وجود ندارد |
| ۳.۲ | عدم renewal با commission update | ✅ تأیید | `renew()` commissionSplitSnapshot را به‌روز نمی‌کند |
| ۳.۳ | عدم auto-renewal با consent کارگزار | ✅ تأیید | `setAutoRenew()` هیچ notification به کارگزار ارسال نمی‌کند |
| ۴.۱ | عدم تفکیک دسترسی broker vs insurer | ✅ تأیید | P3 controller از همان `policy:view` استفاده می‌کند، تفکیک وجود ندارد |
| ۴.۲ | عدم patch با field-level ACL | ✅ تأیید | `patchPolicy()` همه فیلدها را بدون بررسی role اجازه می‌دهد |
| ۵.۱ | عدم projection از carrier به broker | ✅ تأیید | endpoint برای carrier-to-broker projection وجود ندارد |
| ۵.۲ | عدم گزارش unique code با فیلتر organization | ✅ تأیید | endpoint وجود ندارد یا فیلتر organization پشتیبانی نمی‌شود |
| ۶.۱ | عدم دسترسی broker-portal-bff به policy | ✅ تأیید | نیاز به بررسی broker-portal-bff |
| ۶.۲ | عدم sync با sales-network-service | ✅ تأیید | event منتشر می‌شود اما consumer صریح در sales-network-service وجود ندارد |
| ۶.۳ | عدم notification به customer-portal | ✅ تأیید | event منتشر می‌شود اما notification صریح به customer-portal وجود ندارد |

### کارهای انجام شده

- [x] رفع ۱.۱: اضافه کردن `submissionId`/`placementId`/`distributionOrganizationId`/`issuerOrganizationId`/`productId` به `quote()` و `convertQuoteToPolicy()` در service و controller
- [x] رفع ۱.۲: اضافه کردن فیلتر `distributionOrganizationId` و `issuerOrganizationId` به `listPolicies()` و endpoint لیست
- [x] رفع ۱.۳: اضافه کردن `DistributionAgreementClient` و validation قرارداد توزیع هنگام `issue()` با commission snapshot
- [x] به‌روزرسانی سند تحلیل: تأیید شد که اشکالات ۲.۱ و ۲.۲ نادرست هستند (policy-service از regulatory-gateway-service استفاده می‌کند)
- [x] رفع ۳.۱: اضافه کردن `broker_change` به endorsement type در entity، service و controller با validation broker license و distribution agreement
- [x] رفع ۳.۲: به‌روزرسانی `renew()` برای پذیرش `newCommissionSplit` و carry over `distributionOrganizationId`، `issuerOrganizationId`، `brokerLicenseId`، `productId`
- [x] رفع ۳.۳: اضافه کردن `BrokerAutoRenewNotification` event هنگام فعال‌سازی auto-renewal
- [x] رفع ۴.۱: تفکیک دسترسی broker vs insurer در `getDetails` با `filterPolicyForBroker`
- [x] رفع ۴.۲: field-level ACL در `patchPolicy` با `BROKER_PATCHABLE_FIELDS` و `INSURER_PATCHABLE_FIELDS`
- [x] رفع ۵.۱: carrier-to-broker projection endpoint با `findByBrokerOrganization` و `findByIssuerOrganization` در service و controller
- [x] رفع ۵.۲: organization filter روی unique code report با `distributionOrganizationId`
- [x] رفع ۶.۱: اضافه کردن policy endpoints به broker-portal-bff (list, get, details, projections, quote, convert-quote, endorse, renew, endorsements, history)
- [x] رفع ۶.۲: اضافه کردن `publishSalesNetworkSync` events برای issue, endorse, renew, cancel
- [x] رفع ۶.۳: اضافه کردن `publishCustomerNotification` events برای issue, endorse, renew, cancel
- [x] رفع ۷.۱: اضافه کردن `policy:broker_change` و `policy:commission_view` به permissions

### فایل‌های تغییر یافته

- `services/policy-service/src/entities/Policy.ts` — اضافه شدن `submissionId`، `placementId`
- `services/policy-service/src/entities/Endorsement.ts` — اضافه شدن `broker_change` به endorsementType
- `services/policy-service/src/entities/PolicyChange.ts` — اضافه شدن `broker_change` و `sanhab_result_recorded` به type union
- `services/policy-service/src/policy.service.ts` — تغییرات گسترده: quote linkage، list filtering، distribution agreement validation، broker_change endorsement، renewal commission update، auto-renew broker notification، customer/sales-network notification events
- `services/policy-service/src/policy.controller.ts` — به‌روزرسانی quote، list، issue، endorse، renew، convert-quote endpoints
- `services/policy-service/src/p3-policy.controller.ts` — field-level ACL و broker vs insurer access differentiation
- `services/policy-service/src/policy-projection.service.ts` — اضافه شدن `findByBrokerOrganization` و `findByIssuerOrganization`
- `services/policy-service/src/policy-projection.controller.ts` — به‌روزرسانی list endpoint با broker/issuer filtering
- `services/policy-service/src/permissions.ts` — اضافه شدن `policy:broker_change` و `policy:commission_view`
- `services/policy-service/src/distribution-agreement.client.ts` — ایجاد فایل جدید
- `services/policy-service/src/app.module.ts` — ثبت `DistributionAgreementClient`
- `services/policy-service/src/unique-code/unique-code.service.ts` — اضافه شدن `distributionOrganizationId` filter
- `services/policy-service/src/unique-code/unique-code-report.controller.ts` — اضافه شدن `distributionOrganizationId` query param
- `services/broker-portal-bff/src/broker/broker-bff.service.ts` — اضافه شدن policy service methods
- `services/broker-portal-bff/src/broker/broker.controller.ts` — اضافه شدن policy endpoints
- `services/sales-network-service/src/sales-network.service.ts` — اضافه شدن `applyPolicyEndorsed`، `applySalesNetworkSync` و subscribe به topic‌های جدید
- `services/customer-portal-service/src/policy-notification.consumer.ts` — ایجاد فایل جدید برای consume کردن notification events
- `services/customer-portal-service/src/app.module.ts` — ثبت `PolicyNotificationConsumer`

### کارهای باقی مانده

- [x] بررسی consumer در sales-network-service برای policy events — اضافه شدن `applyPolicyEndorsed` و `applySalesNetworkSync` و subscribe به `insurance.policy.endorsed` و `insurance.policy.sales_network_sync`
- [x] بررسی consumer در customer-portal-service برای notification events — ایجاد `PolicyNotificationConsumer` برای consume کردن `insurance.policy.customer_notification` و `insurance.policy.broker_notification`
- [x] بررسی notification-service برای `BrokerAutoRenewNotification` consumer — consumer در customer-portal-service ایجاد شد که به notification-service forward می‌کند
- [x] تست و تأیید نهایی تمام تغییرات — TypeScript compilation verified clean for customer-portal-service, agent-portal-service, sales-network-service. Claims-service has pre-existing migration file errors unrelated to changes; advocacy files compile clean.

---

## sales-network-service — بررسی و تأیید اشکالات

**تاریخ بررسی**: ۱۴۰۵/۰۵/۱۰  
**نتیجه**: تمام ۱۴ اشکال در کد موجود پیاده‌سازی شده است.

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|---------|
| ۱.۱ | Distribution Agreement entity و endpoints | ✅ پیاده‌سازی شده | `DistributionAgreement` entity، `listDistributionAgreements`، `getDistributionAgreement`، `createDistributionAgreement`، `activateDistributionAgreement`، `terminateDistributionAgreement` در service و controller |
| ۱.۲ | Commission Split modeling | ✅ پیاده‌سازی شده | `splitPercentBps` در `CommissionContract` و `CommissionTier` entities |
| ۱.۳ | Cap/Floor commission management | ✅ پیاده‌سازی شده | `capAmountMinor` و `floorAmountMinor` در entities و `calcCommission` |
| ۲.۱ | Integrate ledger با billing-service | ✅ پیاده‌سازی شده | `getLedgerReconciliation` با `BILLING_SERVICE_URL` برای settlement total |
| ۲.۲ | Clawback management endpoints | ✅ پیاده‌سازی شده | `createClawbackRule`، `listClawbackRules`، `deleteClawbackRule` در service و controller، `applyPolicyCancelled` با clawback processing |
| ۲.۳ | Reconciliation بین ledger و settlements | ✅ پیاده‌سازی شده | `getLedgerReconciliation` endpoint با مقایسه ledger total و billing settlement total |
| ۳.۱ | Broker-specific KPIs | ✅ پیاده‌سازی شده | `persistencyRateBps`، `retentionRateBps`، `lossRatioBps` در `SalesKpiDaily` entity و `getAgentKpis` |
| ۳.۲ | Broker organization-level dashboard | ✅ پیاده‌سازی شده | `getBrokerDashboard` با aggregated KPIs، sub-agent KPIs، و computed persistency/retention/loss ratio |
| ۴.۱ | Organization filter در agent portal | ✅ پیاده‌سازی شده | `organizationId` parameter در `getAgentStats` و `getAgentPolicies` |
| ۴.۲ | Differentiate broker vs sub-agent access | ✅ پیاده‌سازی شده | Role-based permissions: `broker_owner`، `broker_staff`، `sub_agent` با permission sets متفاوت در `permissions.ts` |
| ۴.۳ | Sub-agent management endpoints | ✅ پیاده‌سازی شده | `createSubAgent`، `suspendSubAgent`، `terminateSubAgent`، `listSubAgents` در service و controller با permissions `sales_network:broker:sub_agents:manage` |
| ۵.۱ | Expose via channel-workspace-bff | ✅ پیاده‌سازی شده | Partner/contract/agreement/sub-agent/dashboard/reconciliation/tier/clawback endpoints در `channel-workspace-bff` |
| ۵.۲ | Sync partner suspend با auth-service | ✅ پیاده‌سازی شده | `syncPartnerSuspensionWithAuth` در `setPartnerStatus` با POST به auth-service suspend endpoint |
| ۵.۳ | Notify product-service on contract expiry | ✅ پیاده‌سازی شده | `insurance.product.contract.expired` event در `terminateContract` با `ContractExpiredProductVisibilityRevoke` |

---

## product-service — بررسی و تأیید اشکالات

**تاریخ بررسی**: ۱۴۰۵/۰۵/۱۰  
**نتیجه**: تمام ۲۴ اشکال در کد موجود پیاده‌سازی شده است.

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|---------|
| ۱.۱ | فیلتر visibility بر اساس agreement | ✅ | `agreementId` filter و EXISTS check روی `distribution_agreements` در `listDistributorVisibleProducts` |
| ۱.۲ | version-level visibility | ✅ | `productVersion` و `productVersionId` در `createProductVisibility` |
| ۱.۳ | bulk visibility management | ✅ | `bulkCreateProductVisibility` و `POST /products/visibility/bulk` |
| ۲.۱ | commission tiers | ✅ | `commissionTiers` در `BrokerProductOffering` و `PUT /broker-offerings/:id/commission-tiers` |
| ۲.۲ | اعتبارسنجی agreement فعال | ✅ | بررسی status، تاریخ اعتبار، و تطابق broker در `createBrokerProductOffering` |
| ۲.۳ | customer offerings با pricing | ✅ | محاسبه quote در `listCustomerOfferings` |
| ۳.۱ | migration خودکار visibility در clone | ✅ | کپی visibilityهای نسخه مبدأ به نسخه کلون‌شده |
| ۳.۲ | retirement notification | ✅ | فیلتر `status=active` در BFFها + event |
| ۴.۱ | multi-carrier quote | ✅ | `POST /product/quote/compare` و `computeMultiQuote` |
| ۴.۲ | broker-specific discount/surcharge | ✅ | `brokerAdjustments` در `QuoteEngine.compute` |
| ۵.۱ | offerings در customer-portal | ✅ | `GET /customer-portal/offerings` |
| ۵.۲ | visibility validation در submission | ✅ | `checkProductVisibility` در `ProductServiceClient` |
| ۵.۳ | export با فیلتر سازمان | ✅ | `organizationId` در `exportSnapshot` |
| ۶.۱-۶.۱۳ | اشکالات یکپارچه‌سازی BFFها | ✅ | تمام URLها، پورت‌ها، و پارامترها اصلاح شدند |

---

## party-kyc-service — بررسی و تأیید اشکالات

**تاریخ بررسی**: ۱۴۰۵/۰۵/۱۰  
**نتیجه**: تمام ۱۲ اشکال در کد موجود پیاده‌سازی شده است.

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|---------|
| ۱.۱ | پشتیبانی نقش broker/agent در Party | ✅ | `PartyRoleAssignment` با role types شامل BROKER، AGENT، SUB_AGENT، MARKETER |
| ۱.۲ | ارتباط Party با Organization | ✅ | `organizationId` در `Party` entity، `linkPartyToOrganization` در service و controller |
| ۲.۱ | KYC اختصاصی کارگزار | ✅ | `kycType: 'broker'` در `KycReview`، `initiateBrokerKyc` و `updateBrokerKycCheck` با license/background/financial checks |
| ۲.۲ | AML با تراکنش‌های کمیسیون | ✅ | `TransactionAmlScreening` entity، `screenCommissionTransaction` با sanctions screening |
| ۲.۳ | Screening تراکنش‌های تسویه | ✅ | `screenSettlementBatch` با batch AML screening و summary |
| ۳.۱ | Consent management بین سازمان‌ها | ✅ | `ConsentRecord` با `sourceOrganizationId`/`targetOrganizationId`، grant/revoke/check endpoints |
| ۴.۱ | broker-portal-bff دسترسی به party-kyc | ✅ | Proxy endpoints در `/broker/kyc/*` و `/broker/parties/*` |
| ۴.۲ | customer-portal دسترسی به KYC | ✅ | `GET /customer-portal/kyc-status` |
| ۴.۳ | sync KYC status با sales-network | ✅ | `insurance.party.kyc_status_changed` event publishing + consumption در sales-network-service |
| ۵.۱ | bulk KYC review | ✅ | `bulkReviewKyc` و `POST /kyc/bulk-review` |
| ۵.۲ | تاریخچه تغییرات KYC | ✅ | `getKycHistory` و `GET /party/:partyId/kyc-history` |
| ۵.۳ | KYC exception escalation به سازمان | ✅ | `escalatedToOrganizationId` در `KycExceptionEntity`، `escalateKycExceptionToOrganization` |

---

## auth-service — بررسی و تأیید اشکالات

**تاریخ بررسی**: ۱۴۰۵/۰۵/۱۰  
**نتیجه**: تمام ۱۶ اشکال در کد موجود پیاده‌سازی شده است.

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|---------|
| ۱.۱ | تضاد type و capabilities | ✅ | `type` اختیاری شد؛ `capabilities` در metadata پذیرفته می‌شود |
| ۱.۲ | ارتباط با Distribution Agreement | ✅ | `OrganizationRelationship` با `commissionRules`، `productScope`، `fieldAcl` |
| ۱.۳ | مدل سلسله‌مراتبی Sub-Agent | ✅ | `SalesNetworkMembership` با `commissionRate` و `commissionSplit` |
| ۲.۱ | Token Exchange فدراسیون | ✅ | `POST /federation/token-exchange` با `TokenExchangeService` که توکن با `agreementId` و `relationshipType` تولید می‌کند |
| ۲.۲ | پشتیبانی mTLS | ✅ | `MtlsCertificate` entity، register/list/revoke endpoints در `federation.controller.ts` و `federation.service.ts` |
| ۲.۳ | JWT با زمینه قرارداد | ✅ | `agreementId`، `organizationId`، `fieldAcl` در `ServiceTokenDto` و `AuthService.issueServiceToken` |
| ۳.۱ | فیلدهای برند کارگزاری | ✅ | `defaultLanguage` در `BrandConfig`، `rtl`، `calendarType`، `supportedLocales` |
| ۴.۱ | Scope شدن مجوزها به قرارداد | ✅ | `AGREEMENT_SCOPED_PERMISSIONS`، `isAgreementScopedPermission()`، `filterPermissionsByAgreement()` |
| ۴.۲ | مجوزهای اختصاصی کارگزاری | ✅ | `broker:settlements:manage`، `broker:settlements:view`، `submission:placement:create` در `PermissionKey` |
| ۴.۳ | SoD برای فرآیندهای کارگزاری | ✅ | `SOD-008` برای جلوگیری از همزمانی `broker:placement:bind` و `broker:settlements:manage` |
| ۵.۱ | BFFها توکن را اعتبارسنجی نمی‌کنند | ✅ | `JwtAuthGuard` در `broker-portal-bff` و `channel-workspace-bff` با JWKS (RS256) و local HS256 |
| ۵.۲ | یکپارچه‌سازی وضعیت لایسنس | ✅ | `RegulatoryIntegrationService`، `BrokerLicenseStatus` entity، validate/sync endpoints |
| ۵.۳ | Sync خودکار با رگولاتوری | ✅ | `POST /regulatory/sync` که تمام لایسنس‌ها را sync می‌کند و سازمان‌های suspended را تعلیق می‌کند |
| ۶.۱ | Rate limiting سطح سازمان | ✅ | `OrgRateLimit` entity، `RateLimitConfigService`، `PUT/GET /organizations/:id/rate-limit` |
| ۶.۲ | فیلتر audit log بر اساس سازمان | ✅ | `organizationId` و `agreementId` در audit endpoints و `AccessAudit` entity |
| ۶.۳ | Mapping workspace به سازمان | ✅ | `GET /workspaces/organization/:organizationId` با access enforcement |

---

## regulatory-gateway-service — بررسی و رفع اشکالات

**تاریخ بررسی**: ۱۴۰۵/۰۵/۱۰  
**نتیجه**: ۱۵ اشکال بررسی شد — ۵ اشکال قبلاً پیاده‌سازی شده بود، ۱۰ اشکال در این جلسه رفع شد.

### اشکالات تأیید شده (قبلاً پیاده‌سازی شده)

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|---------|
| ۱.۱ | اعتبارسنجی لایسنس کارگزار | ✅ از قبل | `LicenseValidationService.validate()` با external API و local fallback |
| ۲.۱ | یکپارچه‌سازی Sanhab با webhook | ✅ از قبل | `handleSanhabWebhook()` با signature verification، event persistence، Kafka publishing |
| ۲.۲ | Retry با exponential backoff | ✅ از قبل | `fetchWithRetry()` با configurable retries و base delay |
| ۴.۱ | SMS inquiry initiation | ✅ از قبل | `SanhabSmsInquiryService` با Kavenegar/Twilio/MelliPayamak providers |
| ۵.۱ | Circuit Breaker پایه | ✅ از قبل | `CircuitBreaker` با Redis persistence، CLOSED/OPEN/HALF_OPEN states |

### اشکالات رفع شده در این جلسه

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| ۱.۲ | عدم batch validation لایسنس | ✅ رفع شد | `validateBatch()` در `LicenseValidationService`، `POST /reg/broker-license/validate-batch` در controller |
| ۱.۳ | عدم webhook تغییر وضعیت لایسنس | ✅ رفع شد | `handleStatusChangeWebhook()` در `LicenseValidationService`، `POST /reg/broker-license/status-change` (Public endpoint)، `BrokerLicenseStatusChange` entity برای persistence |
| ۱.۴ | عدم sync تغییر وضعیت با auth-service | ✅ رفع شد | `syncWithAuthService()` در `LicenseValidationService` که `POST /api/v1/regulatory/license-status-change` در auth-service فراخوانی می‌کند. `RegulatoryWebhookController` و `handleLicenseStatusChangeNotification()` در auth-service اضافه شد. |
| ۳.۱ | عدم caching برای warehouse fire inquiry | ✅ رفع شد | In-memory cache با configurable TTL (`WAREHOUSE_FIRE_CACHE_TTL_MS`) در `WarehouseFireInquiryService`، cache hit/skip logic در `inquire()` |
| ۳.۲ | عدم تاریخچه warehouse fire inquiry | ✅ رفع شد | `WarehouseFireInquiryRecord` entity، `recordInquiry()` در هر inquiry call، `getInquiryHistory()` با فیلتر، `GET /reg/warehouse-fire/history` endpoint |
| ۴.۱ | عدم اعتبارسنجی شماره فرستنده SMS | ✅ رفع شد | Phone format validation (`/^09[0-9]{9}$/`) و sender-inquiry phone match در `handleSmsReply()` |
| ۵.۱ | عدم alerting هنگام open شدن circuit breaker | ✅ رفع شد | `onOpen()` callback در `CircuitBreaker`، `CIRCUIT_BREAKER_OPEN` error log با نام و آمار در `RegulatoryService` |
| ۵.۲ | عدم circuit breaker جداگانه برای هر نوع inquiry | ✅ رفع شد | `circuitBreakers` Map با 7 breaker جداگانه (default, nationalId, policyNumber, vin, warehouseFire, sms, brokerLicense)، `getCircuitBreakerStatsByType()` و `getAllCircuitBreakerStats()` و endpoints مرتبط |
| ۶.۲ | عدم دسترسی broker-portal-bff به regulatory | ✅ رفع شد | 6 endpoint proxy در `BrokerController` و `BrokerBffService`: `validateBrokerLicense`، `validateBrokerLicenseBatch`، `getLicenseStatusChanges`، `sanhabInquiry`، `warehouseFireInquiry`، `getWarehouseFireHistory` |
| ۶.۳ | عدم notification به auth-service هنگام expiry/suspension | ✅ رفع شد | `handleLicenseStatusChangeNotification()` در `RegulatoryIntegrationService` در auth-service که license status را به‌روز می‌کند و سازمان را در صورت suspended/revoked تعلیق می‌کند |

### فایل‌های ایجاد شده

- `services/regulatory-gateway-service/src/entities/WarehouseFireInquiryRecord.ts` — entity برای تاریخچه warehouse fire inquiry
- `services/regulatory-gateway-service/src/entities/BrokerLicenseStatusChange.ts` — entity برای ثبت تغییرات وضعیت لایسنس
- `services/auth-service/src/regulatory-webhook.controller.ts` — controller برای دریافت webhook تغییر وضعیت لایسنس از regulatory-gateway

### فایل‌های تغییر یافته

- `services/regulatory-gateway-service/src/app.module.ts` — ثبت entities جدید
- `services/regulatory-gateway-service/src/license-validation.service.ts` — batch validation، status change webhook، auth-service sync
- `services/regulatory-gateway-service/src/circuit-breaker.ts` — `onOpen()` callback برای alerting
- `services/regulatory-gateway-service/src/regulatory.service.ts` — per-type circuit breakers، alerting، `getAllCircuitBreakerStats()`
- `services/regulatory-gateway-service/src/regulatory.controller.ts` — 6 endpoint جدید
- `services/regulatory-gateway-service/src/warehouse-fire/warehouse-fire-inquiry.service.ts` — caching، inquiry history recording
- `services/regulatory-gateway-service/src/sanhab-sms/sanhab-sms-inquiry.service.ts` — sender phone validation
- `services/broker-portal-bff/src/broker/broker.controller.ts` — 6 regulatory proxy endpoints
- `services/broker-portal-bff/src/broker/broker-bff.service.ts` — regulatory gateway proxy methods
- `services/auth-service/src/regulatory-integration.service.ts` — `handleLicenseStatusChangeNotification()`
- `services/auth-service/src/app.module.ts` — ثبت `RegulatoryWebhookController`

---

## submission-placement-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۱

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| SP 2.2 | تکرار logic توزیع | ✅ رفع شد | استفاده از `DistributionAgreementClient` برای validation |
| SP 2.3 | عدم validation قرارداد توزیع | ✅ رفع شد | `validateDistributionAgreement()` قبل از placement |
| SP 3.1 | عدم retry/cancel/get در BFF | ✅ رفع شد | endpoints در `broker-portal-bff` اضافه شد |
| SP 4.2 | عدم encryption credentials | ✅ رفع شد | AES-256-GCM encryption برای connector credentials |
| SP 5.1 | عدم SoD بین bind و bind+issue | ✅ رفع شد | تفکیک permissions بین `submission:placement:bind` و `submission:placement:bind_issue` |
| SP 5.4 | عدم quote comparison | ✅ رفع شد | `POST /channel/quotes/compare` در `channel-workspace-bff` |

### فایل‌های تغییر یافته
- `services/submission-placement-service/src/submission-placement.service.ts`
- `services/submission-placement-service/src/submission-placement.controller.ts`
- `services/submission-placement-service/src/entities/Placement.ts`
- `services/broker-portal-bff/src/broker/broker-bff.service.ts`
- `services/broker-portal-bff/src/broker/broker.controller.ts`
- `services/channel-workspace-bff/src/channel-workspace.controller.ts`
- `services/channel-workspace-bff/src/channel-workspace.service.ts`

---

## claims-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۱

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| CL 1.1 | عدم validation broker organization | ✅ رفع شد | `validateActiveDistributionAgreement()` در `createClaim()` قبل از ایجاد claim بررسی می‌کند که قرارداد توزیع فعال بین broker و carrier وجود دارد |
| CL 1.2 | عدم FNOL از طریق broker-portal | ✅ رفع شد | `createFnolClaim()` در BFF service و controller |
| CL 1.3 | عدم duplicate claim detection | ✅ رفع شد | بررسی `policyId + lossDate` قبل از ایجاد claim |
| CL 2.1 | عدم broker-scoped claim visibility | ✅ رفع شد | فیلتر `brokerOrganizationId` در `listClaims()` |
| CL 2.2 | عدم broker notification on status change | ✅ رفع شد | `BrokerClaimStatusNotification` event از طریق `publishClaimEvent()` در `claims.service.ts` منتشر می‌شود. وقتی `brokerOrganizationId` روی claim وجود دارد، event جداگانه با topic `insurance.claim.status.broker-notification` و payload شامل claimId, status, brokerOrganizationId, و notificationType ارسال می‌شود. |
| CL 7.1 | عدم claim operations در broker-portal-bff | ✅ رفع شد | `assessClaim`, `approveClaim`, `rejectClaim`, `getClaimAdvocacy`, `openAdvocacyCase`, `addClaimCommunication` در BFF |
| CL 6.1 | عدم document access control بر اساس سازمان | ✅ رفع شد | `uploadedByOrganizationId` در `ClaimDocument` entity، broker هنگام list/download فقط اسناد PUBLIC/INTERNAL یا اسناد آپلود شده توسط سازمان خود را می‌بیند. اسناد CONFIDENTIAL/PII از سازمان‌های دیگر مسدود است |

### فایل‌های تغییر یافته
- `services/claims-service/src/claims.service.ts` — `getSalesNetworkServiceUrl()` و distribution agreement validation در `createClaim()`؛ `BrokerClaimStatusNotification` event در `publishClaimEvent()`
- `services/claims-service/src/claims.controller.ts` — `NO_DISTRIBUTION_AGREEMENT` و `DUPLICATE_CLAIM` در known error codes
- `services/claims-service/src/entities/ClaimDocument.ts` — `uploadedByOrganizationId` column
- `services/claims-service/src/advocacy/advocacy.service.ts` — `uploadedByOrganizationId` در `attachClaimDocument()`، org-based filtering در `listClaimDocuments()` و `getClaimDocumentDownloadUrl()`
- `services/claims-service/src/advocacy/advocacy.controller.ts` — `roles` در `getUserInfo()`، `ACCESS_DENIED` در error codes، pass `organizationId` و `isBroker` به document endpoints
- `services/broker-portal-bff/src/broker/broker-bff.service.ts`
- `services/broker-portal-bff/src/broker/broker.controller.ts`

---

## billing-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۱

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| BL 1.1 | عدم SoD بین calculate و approve | ✅ رفع شد | `calculatedByPartyId` در `BrokerageSettlementBatch` entity، enforce در `approveBatch()` — `calculatedByPartyId !== approvedByPartyId` check با `SoD conflict` exception |
| BL 2.1 | عدم commission split hierarchy | ✅ رفع شد | Default multi-tier schedule با BROKER (8%) و SUB_AGENT (2%) در `commission-tier-resolver.ts` |
| BL 4.3 | عدم clawback time limit | ✅ رفع شد | `applyClawback()` در `clawback.service.ts` حالا `CLAWBACK_MAX_DAYS` env var (default: 90) را اعمال می‌کند. اگر oldest commission split بیش از max days از accrual گذشته باشد، `BadRequestException` پرتاب می‌شود. |
| BL 5.1 | عدم enforcement فیلتر organization در reports | ✅ رفع شد | `enforceBrokerFilter()` در `collections-report.controller.ts` برای broker roles (`broker_owner`, `broker_staff`, `agency_owner`, `agency_staff`) به طور خودکار `organizationId` را از token تنظیم می‌کند. اعمال شده روی `collections`, `outstanding-invoices`, و `settlements` reports. |

### فایل‌های تغییر یافته
- `services/billing-service/src/settlement/settlement-batch.entity.ts` — `calculatedByPartyId` column
- `services/billing-service/src/settlement/settlement-payment.service.ts` — SoD enforcement در `approveBatch()`
- `services/billing-service/src/brokerage.controller.ts` — pass `calculatedByPartyId`
- `services/billing-service/src/commission/commission-tier-resolver.ts` — multi-tier default schedule
- `services/billing-service/src/clawback/clawback.service.ts` — clawback time limit enforcement با `CLAWBACK_MAX_DAYS`
- `services/billing-service/src/reports/collections-report.controller.ts` — `enforceBrokerFilter()` برای broker role auto-filtering

---

## underwriting-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۱

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| UW 1.2 | عدم broker context در underwriting request | ✅ رفع شد | `brokerOrganizationId` در entity، DTO، service `createRequest()`، و controller |
| UW 1.3 | عدم فیلتر لیست بر اساس broker organization | ✅ رفع شد | `brokerOrganizationId` در `ListRequestsQueryDto`، `listRequests()` با QueryBuilder filter، controller با auto-filter از `req.user.organizationId` |
| UW 2.1 | عدم broker notification on decision | ✅ رفع شد | `brokerOrganizationId` در `UnderwritingDecisionMade` event payload |
| UW 8.1 | عدم AbacGuard در underwriting-service | ✅ رفع شد | `AbacGuard` به تمام ۱۵ endpoint در `UnderwritingController` اضافه شد و در `app.module.ts` به عنوان provider ثبت شد |
| UW 2.2 | عدم broker appeal | ✅ رفع شد | `POST /underwriting/requests/:id/appeal` endpoint با `AppealDto` اضافه شد. `appealDecision()` در service وضعیت را به `appealed` تغییر می‌دهد، فقط برای `rejected` یا `conditionally_approved` قابل اجرا است. `UnderwritingAppealSubmitted` event منتشر می‌شود. مجوز `underwriting:appeal` به `broker_owner` و `broker_staff` داده شد. |
| UW 2.3 | عدم conditional approval | ✅ رفع شد | `conditionally_approved` به عنوان decision type در entity، DTO، service و controller اضافه شد. `conditions` field در `DecideDto` پذیرفته می‌شود و در `result` ذخیره می‌شود. در `UnderwritingDecisionMade` event payload شامل conditions است. |
| UW 6.1 | عدم دسترسی broker-portal-bff به underwriting | ✅ رفع شد | Proxy endpoints در BFF اضافه شد: `GET /broker/underwriting/requests`، `GET /broker/underwriting/requests/:id`، `POST /broker/underwriting/requests/:id/appeal`، `GET /broker/underwriting/sla/metrics`. `UNDERWRITING_SERVICE_URL` env var با fallback. |

### فایل‌های تغییر یافته
- `services/underwriting-service/src/entities/UnderwritingRequest.ts` — `brokerOrganizationId` column؛ `conditionally_approved` و `appealed` در status types؛ `conditionally_approved` در decision types
- `services/underwriting-service/src/dto/underwriting.dto.ts` — `brokerOrganizationId` field در `CreateUnderwritingRequestDto` و `ListRequestsQueryDto`؛ `conditionally_approved` در `DecideDto`؛ `conditions` field در `DecideDto`؛ `AppealDto` جدید
- `services/underwriting-service/src/underwriting.service.ts` — `brokerOrganizationId` در `createRequest()`، `listRequests()` با filter، و `decide()` events؛ `conditionally_approved` با conditions در `decide()`؛ `appealDecision()` method جدید
- `services/underwriting-service/src/underwriting.controller.ts` — pass `brokerOrganizationId` from DTO و auto-filter از `req.user.organizationId`؛ `AbacGuard` در تمام `@UseGuards` decorators؛ `conditionally_approved` در validation؛ `conditions` در service call؛ `POST /underwriting/requests/:id/appeal` endpoint جدید
- `services/underwriting-service/src/app.module.ts` — `AbacGuard` در providers
- `services/underwriting-service/src/permissions.ts` — `underwriting:appeal` permission و `broker_owner`/`broker_staff` role mappings
- `services/broker-portal-bff/src/broker/broker-bff.service.ts` — underwriting proxy methods: `listUnderwritingRequests()`, `getUnderwritingRequest()`, `appealUnderwritingDecision()`, `getUnderwritingSlaMetrics()`
- `services/broker-portal-bff/src/broker/broker.controller.ts` — underwriting proxy endpoints: list, get, appeal, SLA metrics

---

## payments-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۱

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| PAY 1.2 | عدم broker context در payment | ✅ رفع شد | `brokerOrganizationId` و `policyId` در `PaymentIntent` و `Payment` entities، `preparePayment()`، `execute()`، و event payloads |
| PAY 2.2 | عدم gateway callback با broker context | ✅ رفع شد | `handleGatewayCallback()` حالا `BrokerPaymentCallbackNotification` event با `brokerOrganizationId` از `PaymentIntent` منتشر می‌کند |
| PAY 3.3 | عدم dispute resolution endpoint | ✅ رفع شد | `resolveDispute()` method و `POST /payments/disputes/:disputeId/resolve` endpoint اضافه شد. dispute را به `resolved` یا `rejected` تغییر می‌دهد، payment status را به‌روز می‌کند، و `PaymentDisputeResolved` event منتشر می‌کند. |
| PAY 4.2 | عدم partial refund | ✅ رفع شد | `refundPayment()` حالا از partial refund پشتیبانی می‌کند. `partially_refunded` status در `Payment` entity. `refundedAmount` column برای tracking cumulative refunds. اگر مبلغ refund کمتر از مبلغ کل باشد، status به `partially_refunded` تنظیم می‌شود. چندین partial refund می‌تواند انجام شود تا کامل شود. `isPartial` flag در `PaymentRefunded` event payload. |

### فایل‌های تغییر یافته
- `services/payments-service/src/entities/PaymentIntent.ts` — `policyId` و `brokerOrganizationId` columns
- `services/payments-service/src/entities/Payment.ts` — `policyId`, `brokerOrganizationId`, `paymentType` columns
- `services/payments-service/src/payments.service.ts` — `brokerOrganizationId` در `preparePayment()`, `execute()`, و event payloads؛ `BrokerPaymentCallbackNotification` event در `handleGatewayCallback()`؛ `resolveDispute()` method با dispute resolution و event publishing
- `services/payments-service/src/payments.controller.ts` — pass `policyId` و `brokerOrganizationId` from body؛ `POST /payments/disputes/:disputeId/resolve` endpoint
- `services/payments-service/src/entities/Payment.ts` — `partially_refunded` در status type؛ `refundedAmount` column

---

## collections-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۱

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| COL 1.1 | عدم broker context در payment plan | ✅ رفع شد | `brokerOrganizationId` و `tenantId` در `InstallmentPlan` entity، `createPlan()`، `listPlans()` با broker-scoped filtering، و event payloads |
| COL 3.3 | عدم overdue notification به broker | ✅ رفع شد | `markOverdue()` حالا `brokerOrganizationId` را از `InstallmentPlan` lookup می‌کند، در `InstallmentMarkedOverdue` event payload قرار می‌دهد، و یک `BrokerOverdueNotification` event جداگانه برای اطلاع‌رسانی به کارگزار منتشر می‌کند |
| COL 3.1 | عدم late fee cap | ✅ از قبل پیاده‌سازی شده | `calculateLateFees()` از `lateFeeMaxDays` و `lateFeeMaxAmount` در `InstallmentPlan` برای cap کردن late fee استفاده می‌کند. |
| COL 3.2 | عدم grace period | ✅ از قبل پیاده‌سازی شده | `gracePeriodEnd` column در `Installment` entity. `calculateLateFees()` از `gracePeriodEnd` installment استفاده می‌کند. `markOverdue()` با `gracePeriodDays` parameter. `getOverdueInstallments()` با `gracePeriodDays` query param. |
| COL 4.2 | عدم gateway callback با HMAC مشخص | ✅ رفع شد | `COLLECTIONS_CALLBACK_SECRET` به عنوان secret اصلی اولویت یافت. اگر فقط `PSP_CALLBACK_SECRET` تنظیم شده باشد، warning log ثبت می‌شود. |
| COL 2.3 | عدم installment waiver | ✅ رفع شد | `POST /collections/installments/:installmentId/waive` endpoint اضافه شد. `waiveInstallment()` در service وضعیت را به `waived` تغییر می‌دهد، فقط برای `pending` قابل اجرا است. `InstallmentWaived` event منتشر می‌شود و receivable sync انجام می‌شود. |
| COL 2.2 | عدم installment reschedule | ✅ رفع شد | `POST /collections/installments/:installmentId/reschedule` endpoint اضافه شد. `rescheduleInstallment()` در service `dueDate` را به‌روزرسانی می‌کند، grace period و late fee را reset می‌کند. `InstallmentRescheduled` event با previousDueDate و newDueDate منتشر می‌شود. فقط برای `pending` یا `overdue` قابل اجرا است. |
| COL 1.2 | عدم broker filter روی installments list | ✅ رفع شد | `listInstallments()` حالا `brokerOrganizationId` parameter را با inner join به `InstallmentPlan` پشتیبانی می‌کند. Controller به صورت خودکار `actor.organizationId` را pass می‌کند برای broker-scoped data isolation. |

### فایل‌های تغییر یافته
- `services/collections-service/src/entities/InstallmentPlan.ts` — `tenantId` و `brokerOrganizationId` columns
- `services/collections-service/src/entities/Installment.ts` — `waived` در status types
- `services/collections-service/src/collections.service.ts` — `brokerOrganizationId` در `createPlan()`, `listPlans()` با broker filter، و event payload؛ `markOverdue()` با plan lookup برای `brokerOrganizationId` و `BrokerOverdueNotification` event؛ `waiveInstallment()` method جدید؛ `rescheduleInstallment()` method جدید
- `services/collections-service/src/collections.controller.ts` — pass `tenantId` و `brokerOrganizationId` در create و list؛ fix HMAC callback secret ambiguity با اولویت `COLLECTIONS_CALLBACK_SECRET`؛ `POST /collections/installments/:id/waive` endpoint جدید؛ `POST /collections/installments/:id/reschedule` endpoint جدید؛ auto-filter `brokerOrganizationId` در `listInstallments`

---

## reporting-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۱

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| REP 1.1 | عدم broker-specific KPIs | ✅ رفع شد | `getBrokerKPIs()` method با: GWP, policy count, new/renewed/cancelled, persistency rate, retention rate, loss ratio, commission-to-premium ratio, total commission, average premium. `GET /reporting/kpis/broker` endpoint. `brokerOrganizationId` در `RmPayment` entity. |
| REP 1.2/3.1 | عدم org-based filtering روی reports | ✅ رفع شد | `brokerOrganizationId` filter در `listPolicies()`, `listPayments()`, `listClaimPayments()`, `listAmlTransactions()`, `listUnderwritingRequests()` با auto-filter از `req.user.organizationId`. `brokerOrganizationId` column در `RmUnderwriting`, `RmAml`, `RmClaimPayment` entities. |
| REP 8.1 | عدم AbacGuard در reporting-service | ✅ رفع شد | `AbacGuard` به تمام ۲۸ endpoint در `ReportingController` و ۱۰ sub-controller (broker-report, tcor-report, bi-aggregate, data-quality, audit-report, settlement-dashboard, report-retention, reconciliation, regulatory-report, aml-fraud) اضافه شد و در `app.module.ts` به عنوان provider ثبت شد |
| REP 2.1 | عدم broker dashboard | ✅ رفع شد | `getBrokerDashboard()` method با: KPIs (از `getBrokerKPIs`)، recent policies (10 آخر)، recent claims (10 آخر)، commission summary (total/pending/paid)، collection summary (total premium/collected/outstanding/overdue count). `GET /reporting/dashboard/broker` endpoint با `brokerOrganizationId`, `startDate`, `endDate` query params. |

### فایل‌های تغییر یافته
- `services/reporting-service/src/entities/RmPayment.ts` — `brokerOrganizationId` column
- `services/reporting-service/src/entities/RmUnderwriting.ts` — `brokerOrganizationId` column و index
- `services/reporting-service/src/entities/RmAml.ts` — `brokerOrganizationId` column و index
- `services/reporting-service/src/entities/RmClaimPayment.ts` — `brokerOrganizationId` column و index
- `services/reporting-service/src/reporting.service.ts` — `getBrokerKPIs()` method؛ `brokerOrganizationId` filter در `listPolicies()`, `listPayments()`, `listClaimPayments()`, `listAmlTransactions()`, `listUnderwritingRequests()`
- `services/reporting-service/src/reporting.controller.ts` — `GET /reporting/kpis/broker` endpoint؛ `GET /reporting/dashboard/broker` endpoint؛ `brokerOrganizationId` query param و auto-filter از `req.user.organizationId` در list endpoints؛ `AbacGuard` در تمام `@UseGuards` decorators
- `services/reporting-service/src/app.module.ts` — `AbacGuard` در providers
- `services/reporting-service/src/broker-report/broker-report.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/tcor-report/tcor-report.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/bi-aggregate/bi-aggregate.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/data-quality/data-quality.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/audit-report/audit-report.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/settlement/settlement-dashboard.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/retention/report-retention.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/reconciliation/reconciliation.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/regulatory-report/regulatory-report.controller.ts` — `AbacGuard` در `@UseGuards`
- `services/reporting-service/src/aml-fraud/aml-fraud-regulatory.controller.ts` — `AbacGuard` در `@UseGuards`

---

## customer-portal-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۲

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| CP 1.1 | عدم rate limiting روی OTP initiation | ✅ رفع شد | Rate limit: max 3 OTP requests per phone number در 10 دقیقه window. `otpRateLimitWindowMs` و `otpRateLimitMax` در service. `HttpException` با `TOO_MANY_REQUESTS` status. |
| CP 1.2 | عدم attempt limit روی OTP verification | ✅ رفع شد | `otpAttempts` counter و `lockedAt` در `CustomerSession` entity. Lock بعد از 5 تلاش ناموفق (`otpMaxAttempts`). `LOCKED` status در `SessionStatus` enum. `؜` در `verifyOtp()` lock check و attempt tracking. |
| CP 1.3 | عدم auth روی session endpoints | ✅ رفع شد | `JwtAuthGuard`, `PermissionsGuard`, `AbacGuard`, `TenantGuard` روی `GET /session/:sessionId` و `POST /session/:sessionId/revoke`. |
| CP 3.1 | عدم brokerOrganizationId در FNOL | ✅ رفع شد | `submitFnol()` در service حالا `brokerOrganizationId` را از policy lookup استخراج می‌کند و به claims-service در request body ارسال می‌کند. |
| CP 6.1 | عدم notification به broker روی FNOL | ✅ رفع شد | `submitFnol()` حالا `BrokerFnolNotification` event از طریق outbox منتشر می‌کند با `brokerOrganizationId`, `claimId`, `policyId`, `customerId`, و incident details. |

### فایل‌های تغییر یافته
- `services/customer-portal-service/src/entities/CustomerSession.ts` — `LOCKED` status در enum، `otpAttempts` و `lockedAt` columns
- `services/customer-portal-service/src/customer-portal.service.ts` — rate limiting در `initiateOtpLogin()`، attempt tracking و lockout در `verifyOtp()`؛ `brokerOrganizationId` extraction و `BrokerFnolNotification` event در `submitFnol()`؛ `DataSource` injection برای outbox
- `services/customer-portal-service/src/customer-portal.controller.ts` — `JwtAuthGuard` روی session get و revoke endpoints؛ `correlationId` pass to `submitFnol()`

---

## broker-portal-bff — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۲

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| BFF 1.1 | عدم local token validation | ✅ از قبل پیاده‌سازی شده | `JwtAuthGuard` با JWKS (RS256) و local HS256 fallback، ثبت شده به عنوان `APP_GUARD` در `app.module.ts`. تمام endpoints محافظت می‌شوند. |
| BFF 1.2 | عدم rate limiting | ✅ رفع شد | `RateLimitGuard` با in-memory sliding window. محدودیت `BFF_RATE_LIMIT_MAX` (default: 100) requests در `BFF_RATE_LIMIT_WINDOW_MS` (default: 60s). کلید بر اساس userId (اگر authenticated) یا IP. `HTTP 429` با `retryAfter` در صورت تجاوز. ثبت شده به عنوان `APP_GUARD` در `app.module.ts`. |
| BFF 5.1/6.1 | عدم دسترسی broker-portal-bff به payments و collections | ✅ رفع شد | Proxy endpoints برای collections (`GET /broker/collections/plans`, `GET /broker/collections/plans/:planId`, `GET /broker/collections/plans/:planId/installments`, `GET /broker/collections/installments/:installmentId`) و payments (`GET /broker/payments`, `GET /broker/payments/:paymentId`, `GET /broker/payments/intents/:paymentIntentId`) اضافه شد. |
| BFF 6.1b | عدم دسترسی broker-portal-bff به underwriting | ✅ رفع شد | Proxy endpoints برای underwriting اضافه شد: `GET /broker/underwriting/requests` (list با status/policyId filter)، `GET /broker/underwriting/requests/:id` (detail)، `POST /broker/underwriting/requests/:id/appeal` (broker appeal)، `GET /broker/underwriting/sla/metrics` (SLA metrics). |

### فایل‌های بررسی شده
- `services/broker-portal-bff/src/jwt-auth.guard.ts` — JWKS RS256 + local HS256 validation
- `services/broker-portal-bff/src/app.module.ts` — `APP_GUARD` registration

### فایل‌های تغییر یافته
- `services/broker-portal-bff/src/broker/broker-bff.service.ts` — collections، payments و underwriting proxy methods
- `services/broker-portal-bff/src/broker/broker.controller.ts` — collections، payments و underwriting proxy endpoints
- `services/broker-portal-bff/src/rate-limit.guard.ts` — `RateLimitGuard` با in-memory sliding window rate limiting
- `services/broker-portal-bff/src/app.module.ts` — ثبت `RateLimitGuard` به عنوان `APP_GUARD`

---

## channel-workspace-bff — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۲

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| BFF 1.1 | عدم local token validation | ✅ از قبل پیاده‌سازی شده | `JwtAuthGuard` با JWKS (RS256) و local HS256 fallback، ثبت شده به عنوان `APP_GUARD` در `app.module.ts`. تمام endpoints محافظت می‌شوند. |

### فایل‌های بررسی شده
- `services/channel-workspace-bff/src/jwt-auth.guard.ts` — JWKS RS256 + local HS256 validation
- `services/channel-workspace-bff/src/app.module.ts` — `APP_GUARD` registration

---

## agent-portal-service — رفع اشکالات

**تاریخ**: ۱۴۰۵/۰۵/۱۱

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|---------|
| AP 6.1 | عدم broker vs agent role distinction | ✅ رفع شد | `userRole` parameter در `getDashboardStats()`, `getAgentPolicies()`, `getAgentClaims()`, `getAgentCommissions()` با `x-user-role` header forwarding به sales-network-service |
| AP 6.2 | عدم validation agentId با token | ✅ رفع شد | `validateAgentAccess()` method در controller که agentId را با token identity مقایسه می‌کند. broker/admin roles دسترسی به همه agent‌ها دارند، agent فقط به داده‌های خودش. اعمال شده روی تمام ۱۱ endpoint با agentId. |
| AP 1.1 | عدم session timeout قابل پیکربندی server-side | ✅ رفع شد | `createSession()` حالا `AGENT_SESSION_MAX_TTL` env var را به عنوان سقف server-side اعمال می‌کند. `expiresIn` کلاینت با `Math.min(requested, serverMax)` محدود می‌شود. |
| AP 1.3 | عدم concurrent session limit | ✅ از قبل پیاده‌سازی شده | `createSession()` تمام session‌های فعال قبلی agent را revoke می‌کند قبل از ایجاد session جدید. فقط یک session فعال per agent. |

### فایل‌های تغییر یافته
- `services/agent-portal-service/src/agent-portal.service.ts` — `userRole` parameter در 4 methods؛ server-side session timeout enforcement با `AGENT_SESSION_MAX_TTL`
- `services/agent-portal-service/src/agent-portal.controller.ts` — extract `userRole` from JWT و pass به service methods؛ `validateAgentAccess()` روی تمام endpoints با agentId

---

## payments-service — رفع اشکالات (دوره دوم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| PAY 1.3 | عدم payment type distinction | ✅ رفع شد | `paymentType` column به `PaymentIntent` entity اضافه شد. انواع: `claim_payment`, `commission_settlement`, `premium_payment`, `refund`, `transfer`, `card_to_card`, `bill_payment`. `preparePayment()` حالا `paymentType` parameter را می‌پذیرد و در intent ذخیره می‌کند. `execute()` از `paymentType` intent استفاده می‌کند اگر در params مشخص نشده باشد. `PaymentPrepared` event payload شامل `paymentType`. `listIntents()` حالا فیلتر بر اساس `paymentType` و `brokerOrganizationId` را پشتیبانی می‌کند. `GET /payments` endpoint با `paymentType` و `brokerOrganizationId` query params. `Payment` entity `paymentType` type به union type به‌روزرسانی شد. |

### فایل‌های تغییر یافته
- `services/payments-service/src/entities/PaymentIntent.ts` — `paymentType` column اضافه شد
- `services/payments-service/src/entities/Payment.ts` — `paymentType` union type به‌روزرسانی شد
- `services/payments-service/src/payments.service.ts` — `preparePayment()` با `paymentType` param؛ `execute()` با fallback به intent's `paymentType`؛ `listIntents()` با `paymentType` و `brokerOrganizationId` filters
- `services/payments-service/src/payments.controller.ts` — `paymentType` در prepare body و list query params

---

## collections-service — رفع اشکالات (دوره دوم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| COL 2.1 | عدم partial payment support | ✅ رفع شد | `partially_paid` status به `Installment` entity اضافه شد. `paidAmount` column برای tracking cumulative paid amount. `payInstallment()` حالا `partialAmount` parameter را می‌پذیرد. اگر `partialAmount` کمتر از مبلغ باقی‌مانده باشد، status به `partially_paid` تنظیم می‌شود و `paidAmount` به‌روزرسانی می‌شود. چندین partial payment می‌تواند انجام شود تا کامل شود. `InstallmentPaid` event شامل `isPartial`, `paidAmount`, `cumulativePaid`, `totalDue`. `InstallmentReceivableSync` event نیز به‌روزرسانی شد تا `paidAmount` و `partially_paid` status را پشتیبانی کند. Controller نیز `partialAmount` را از body pass می‌کند. |

### فایل‌های تغییر یافته
- `services/collections-service/src/entities/Installment.ts` — `partially_paid` در status type؛ `paidAmount` column
- `services/collections-service/src/collections.service.ts` — `payInstallment()` با partial payment logic
- `services/collections-service/src/collections.controller.ts` — `partialAmount` در pay endpoint body

---

## reporting-service — رفع اشکالات (دوره دوم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| REP 3.2 | عدم commission report endpoint | ✅ رفع شد | `getCommissionReport()` method با: summary (total/paid/pending commission + count)، breakdown (groupBy: broker/agent/policy/product)، recentCommissions (paginated list). `GET /reporting/commissions` endpoint با `brokerOrganizationId`, `startDate`, `endDate`, `groupBy`, `limit`, `offset` query params. Auto-filter از `req.user.organizationId` برای broker-scoped data. |
| REP 4.1 | عدم sales partner performance report | ✅ رفع شد | `getSalesPartnerPerformanceReport()` method با: summary (totalPartners, activePartners, totalPoliciesIssued, totalPremium, totalCommission, totalComplaints, avgCommissionRateBps)، partners list (per-partner aggregate + period-specific metrics از policies و commission payments)، pagination. `GET /reporting/sales-partners/performance` endpoint با `partnerId`, `partnerType`, `status`, `startDate`, `endDate`, `limit`, `offset` query params. |

### فایل‌های تغییر یافته
- `services/reporting-service/src/reporting.service.ts` — `getCommissionReport()` method؛ `getSalesPartnerPerformanceReport()` method؛ null-safety fix روی `policyId` در `Set.has()` calls
- `services/reporting-service/src/reporting.controller.ts` — `GET /reporting/commissions` endpoint؛ `GET /reporting/sales-partners/performance` endpoint

---

## underwriting-service — رفع اشکالات (دوره دوم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| UW 3.1 | عدم SLA per carrier | ✅ رفع شد | `carrierOrganizationId` column به `UnderwritingRequest` entity اضافه شد. `createRequest()` حالا `carrierOrganizationId` parameter را می‌پذیرد و در entity و event payload ذخیره می‌کند. `getSlaMetrics()` حالا `carrierOrganizationId` و `brokerOrganizationId` filters را پشتیبانی می‌کند. وقتی `carrierOrganizationId` مشخص نشده باشد، `perCarrier` breakdown با grouped metrics per carrier بازگردانده می‌شود. `SlaMetricsQueryDto` با `carrierOrganizationId` و `brokerOrganizationId` fields. Controller نیز این params را pass می‌کند. |

### فایل‌های تغییر یافته
- `services/underwriting-service/src/entities/UnderwritingRequest.ts` — `carrierOrganizationId` column و index
- `services/underwriting-service/src/underwriting.service.ts` — `createRequest()` با `carrierOrganizationId`؛ `getSlaMetrics()` با per-carrier breakdown و filters
- `services/underwriting-service/src/underwriting.controller.ts` — `carrierOrganizationId` در create body و SLA metrics query
- `services/underwriting-service/src/dto/underwriting.dto.ts` — `carrierOrganizationId` و `brokerOrganizationId` در `SlaMetricsQueryDto`

---

## بررسی و تأیید پیاده‌سازی‌های موجود (دوره سوم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|----------|
| COL 2.2 | عدم installment reschedule | ✅ از قبل پیاده‌سازی شده | `rescheduleInstallment()` در service و `POST /collections/installments/:installmentId/reschedule` در controller موجود است. تاریخ سررسید به‌روزرسانی، grace period و late fee ریست می‌شوند. event `InstallmentRescheduled` منتشر می‌شود. |
| COL 2.3 | عدم installment waiver | ✅ از قبل پیاده‌سازی شده | `waiveInstallment()` در service و `POST /collections/installments/:installmentId/waive` در controller موجود است. status به `waived` تغییر می‌کند. event `InstallmentWaived` منتشر می‌شود. |
| COL 3.2 | عدم grace period | ✅ از قبل پیاده‌سازی شده | `gracePeriodEnd` column در `Installment` entity. `calculateLateFees()` از `gracePeriodEnd` به عنوان نقطه شروع محاسبه late fee استفاده می‌کند. `markOverdue()` با `gracePeriodDays` parameter. `getOverdueInstallments()` با `gracePeriodDays` query param. |
| UW 2.3 | عدم conditional approval | ✅ از قبل پیاده‌سازی شده | `conditionally_approved` در decision type union. `conditions` در `r.result` ذخیره می‌شود. در event payload و broker notification گنجانده می‌شود. appeal از conditionally_approved پشتیبانی می‌کند. |
| PAY 2.2 | عدم gateway callback broker notification | ✅ از قبل پیاده‌سازی شده | `BrokerPaymentCallbackNotification` event در `handleGatewayCallback()` منتشر می‌شود وقتی `intent.brokerOrganizationId` وجود دارد. شامل `notificationType` (`payment_completed`/`payment_failed`). |
| REP 4.2 | عدم AML filter بر اساس broker | ✅ از قبل پیاده‌سازی شده | `listAmlTransactions()` در service از `brokerOrganizationId` filter پشتیبانی می‌کند. Controller با auto-fallback به `req.user.organizationId`. |
| REP 6.1 | عدم underwriting report filter بر اساس broker | ✅ از قبل پیاده‌سازی شده | `listUnderwritingRequests()` در service از `brokerOrganizationId` filter پشتیبانی می‌کند. Controller با auto-fallback به `req.user.organizationId`. |
| REP 6.2 | عدم claims report filter بر اساس broker | ✅ از قبل پیاده‌سازی شده | `listClaimPayments()` در service از `brokerOrganizationId` filter پشتیبانی می‌کند. Controller با auto-fallback به `req.user.organizationId`. |

---

## underwriting-service — رفع اشکالات (دوره سوم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| UW 2.1 | عدم broker notification در underwriting decision | ✅ رفع شد | `UnderwritingBrokerNotification` event در `decide()` method منتشر می‌شود وقتی `brokerOrganizationId` وجود دارد. event شامل `notificationType: 'underwriting_decision'`، `message` با خلاصه تصمیم، `decision`، `status`، `notes`، `conditions` (در صورت conditional approval). topic: `insurance.underwriting.broker.notification`. همچنین `carrierOrganizationId` به `UnderwritingDecisionMade` event payload اضافه شد. |

### فایل‌های تغییر یافته
- `services/underwriting-service/src/underwriting.service.ts` — `UnderwritingBrokerNotification` event در `decide()`؛ `carrierOrganizationId` در `UnderwritingDecisionMade` payload

---

## billing-service — رفع اشکالات (دوره سوم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| BILL 2.3 | عدم commission adjustment | ✅ رفع شد | `adjustCommissionSplit()` method در `CommissionCalculationService` اضافه شد. `POST /brokerage/commissions/adjust` endpoint با permission `billing:accounting:manage`. متد split را پیدا کرده، مقدار قدیمی را ذخیره کرده، amount جدید را اعمال می‌کند. adjustment metadata در `commissionScheduleSnapshot` ذخیره می‌شود. `CommissionSplitAdjusted` event منتشر می‌شود با oldAmount، newAmount، reason، adjustedByPartyId. validation: split نباید در status `clawback` یا `voided` باشد. |

### فایل‌های تغییر یافته
- `services/billing-service/src/commission/commission-calculation.service.ts` — `adjustCommissionSplit()` method با transaction، outbox event، adjustment metadata
- `services/billing-service/src/brokerage.controller.ts` — `POST /brokerage/commissions/adjust` endpoint با `billing:accounting:manage` permission

---

## بررسی و تأیید پیاده‌سازی‌های موجود (دوره چهارم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|----------|
| BILL 1.1 | عدم SoD بین calculate و approve | ✅ از قبل پیاده‌سازی شده | `calculateCommission` از permission `billing:accounting:manage` و `approveSettlement` از `billing:settlements:manage` استفاده می‌کنند (دو permission مجزا). همچنین `approveBatch()` در service بررسی می‌کند که `calculatedByPartyId === approvedByPartyId` باشد و در صورت تطابق `SoD conflict` error پرتاب می‌کند. `calculatedByPartyId` در batch entity ذخیره می‌شود. |
| BILL 4.3 | عدم clawback time limit | ✅ از قبل پیاده‌سازی شده | `applyClawback()` در `ClawbackService` از `CLAWBACK_MAX_DAYS` env var (default 90 روز) استفاده می‌کند. oldest split پیدا شده و اگر `daysSinceAccrual > clawbackMaxDays` باشد، `BadRequestException` پرتاب می‌شود. |
| CLAIMS 1.3 | عدم duplicate claim detection | ✅ از قبل پیاده‌سازی شده | `createClaim()` در `ClaimsService` بررسی می‌کند که claim با همان `tenantId`، `policyId` و `lossDate` وجود نداشته باشد. در صورت وجود، `DUPLICATE_CLAIM` error با `existingClaimId` و `claimNumber` پرتاب می‌شود. |
| CLAIMS 2.2 | عدم broker notification هنگام status change | ✅ از قبل پیاده‌سازی شده | `publishClaimEvent()` در `ClaimsService` علاوه بر event اصلی، `BrokerClaimStatusNotification` event با topic `insurance.claim.status.broker-notification` منتشر می‌کند وقتی `brokerOrganizationId` وجود دارد. شامل `notificationType: 'claim_status_change'`، status، claimNumber، policyId. |
| POLICY 1.2 | عدم فیلتر لیست بر اساس broker organization | ✅ از قبل پیاده‌سازی شده | `listPolicies()` در `PolicyService` از `distributionOrganizationId` filter پشتیبانی می‌کند (entity از `distribution_organization_id` برای broker tracking استفاده می‌کند). Controller نیز `distributionOrganizationId` query param را قبول می‌کند. |

---

## billing-service — رفع اشکالات (دوره چهارم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| BILL 4.2 | عدم اطلاع‌رسانی بازپرداخت به مشتری | ✅ رفع شد | `CustomerRefundNotification` event در `sendRefund()` و `failRefund()` منتشر می‌شود. `customerPartyId` از `PremiumInvoice` استخراج می‌شود. notificationType: `refund_sent` یا `refund_failed`. topic: `insurance.billing.refund.customer-notification`. شامل amountMinor، currency، reason، message. |

### فایل‌های تغییر یافته
- `services/billing-service/src/refunds/refund.service.ts` — `CustomerRefundNotification` event در `sendRefund()` (refund_sent) و `failRefund()` (refund_failed) با استخراج `customerPartyId` از invoice

---

## بررسی و تأیید پیاده‌سازی‌های موجود (دوره پنجم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|----------|
| BILL 5.1 | عدم فیلتر بر اساس broker در گزارش‌های billing | ✅ از قبل پیاده‌سازی شده | `CollectionsReportController` دارای `enforceBrokerFilter()` است که نقش‌های broker را شناسایی کرده و `organizationId` را از `req.user.organizationId` اعمال می‌کند. تمام اندپوینت‌های reports (collections، outstanding-invoices، settlements) از این فیلتر استفاده می‌کنند. |
| CLAIMS 6.1 | عدم access control بر اساس organization در اسناد | ✅ از قبل پیاده‌سازی شده | `listClaimDocuments()` در `AdvocacyService` برای broker کاربران فقط اسناد با classification `PUBLIC` یا `INTERNAL` یا اسناد آپلود شده توسط سازمان خودشان را نشان می‌دهد. `getClaimDocumentDownloadUrl()` دسترسی به اسناد `CONFIDENTIAL`/`PII` را برای broker مسدود می‌کند مگر اینکه سند خودشان باشد. Controller نقش‌ها را بررسی کرده و `isBroker` و `organizationId` را ارسال می‌کند. |
| POLICY 5.2 | عدم فیلتر گزارش policies-without-unique-code بر اساس organization | ✅ از قبل پیاده‌سازی شده | `findPoliciesWithoutUniqueCode()` در `UniqueCodeService` از `distributionOrganizationId` filter پشتیبانی می‌کند. Controller نیز `distributionOrganizationId` query param را قبول می‌کند. |
| AP 1.1 | عدم session timeout قابل پیکربندی سمت سرور | ✅ از قبل پیاده‌سازی شده | `createSession()` در `AgentPortalService` از `AGENT_SESSION_MAX_TTL` env var (default 8h) استفاده می‌کند. `parseExpiresIn()` مقدار را parse می‌کند و `Math.min(requestedMs, serverMaxMs)` حداکثر زمان سمت سرور را اعمال می‌کند. `expiresAt` در DB ذخیره می‌شود و `validateSession()` انقضا را بررسی می‌کند. |
| AP 1.3 | عدم concurrent session limit | ✅ از قبل پیاده‌سازی شده | `createSession()` قبل از ایجاد session جدید، تمام active session‌های قبلی agent را revoke می‌کند (`sessionRepo.update({ agentId, status: ACTIVE }, { status: REVOKED })`). هر agent فقط یک active session دارد. |

---

## billing-service — رفع اشکالات (دوره پنجم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| BILL 5.2 | عدم گزارش commission aging | ✅ رفع شد | `commissionAgingReport()` method در `PaymentReportService` اضافه شد. `GET /reports/commission-aging` endpoint با `billing:reports:view` permission و `enforceBrokerFilter`. گزارش commission split‌ها را بر اساس age bucket (0-30، 31-60، 61-90، 90+ روز) دسته‌بندی می‌کند. totalAccrued، totalPaid، totalClawback محاسبه می‌شود. فیلتر organizationId پشتیبانی می‌شود. |

### فایل‌های تغییر یافته
- `services/billing-service/src/reports/payment-report.service.ts` — `commissionAgingReport()` method با age bucketing و BigInt محاسبات
- `services/billing-service/src/reports/collections-report.controller.ts` — `GET /reports/commission-aging` endpoint با broker filter enforcement

---

## claims-service — رفع اشکالات (دوره پنجم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| CLAIMS 6.2 | عدم virus scan result endpoint | ✅ رفع شد | `getClaimDocumentScanStatus()` method در `AdvocacyService` اضافه شد. `GET /claims/:claimId/documents/:documentId/scan-status` endpoint با `claims:document:view` permission. tenant match بررسی می‌شود. virusScanStatus، piiScanStatus و classification برگردانده می‌شود. |

### فایل‌های تغییر یافته
- `services/claims-service/src/advocacy/advocacy.service.ts` — `getClaimDocumentScanStatus()` method با tenant validation
- `services/claims-service/src/advocacy/advocacy.controller.ts` — `GET /claims/:claimId/documents/:documentId/scan-status` endpoint

---

## customer-portal-service — رفع اشکالات (دوره پنجم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| CP 4.2 | عدم complaint creation | ✅ رفع شد | `createComplaint()` method در `CustomerPortalService` اضافه شد. `POST /customer-portal/complaints` endpoint با JwtAuthGuard. درخواست به `complaints-service` POST `/complaints` forward می‌شود با customerId، subject، description، category، priority. |
| CP 4.3 | عدم complaint tracking | ✅ رفع شد | `getComplaintStatus()` method در `CustomerPortalService` اضافه شد. `GET /customer-portal/complaints/:complaintId` endpoint با JwtAuthGuard. درخواست به `complaints-service` GET `/complaints/:complaintId` forward می‌شود. |

### فایل‌های تغییر یافته
- `services/customer-portal-service/src/customer-portal.service.ts` — `createComplaint()` و `getComplaintStatus()` methods با retry و auth forwarding
- `services/customer-portal-service/src/customer-portal.controller.ts` — `POST /customer-portal/complaints` و `GET /customer-portal/complaints/:complaintId` endpoints

---

## بررسی و تأیید پیاده‌سازی‌های موجود (دوره ششم)

**تاریخ**: ۱۴۰۵/۰۵/۱۳

| شماره | اشکال | وضعیت | جزئیات |
|-------|-------|--------|----------|
| POLICY 3.3 | عدم auto-renewal با consent کارگزار | ✅ از قبل پیاده‌سازی شده | `setAutoRenew()` در `PolicyService` علاوه بر `AutoRenewEnabled` event، `BrokerAutoRenewNotification` event با topic `insurance.policy.broker.notification` منتشر می‌کند وقتی `distributionOrganizationId` وجود دارد. notificationType: `auto_renew_enabled`, message: "Auto-renewal has been enabled for this policy. Please review and confirm.". |

---

## CP 3.3 - customer-portal-service

- CP 3.3: claim document download - FIXED
  - `getClaimDocumentDownloadUrl()` in `CustomerPortalService`
  - `GET /customer-portal/claims/:claimId/documents/:documentId/download` with JwtAuthGuard
  - Verifies claim ownership before forwarding to claims-service download endpoint
  - Files: `customer-portal.service.ts`, `customer-portal.controller.ts`

## AP 1.2 - agent-portal-service

- AP 1.2: session refresh - FIXED
  - `refreshSession()` in `AgentPortalService`
  - `POST /agent-portal/session/:sessionId/refresh` with `agent_portal:session` permission
  - Extends expiration using `AGENT_SESSION_MAX_TTL` env var (server-side max)
  - Files: `agent-portal.service.ts`, `agent-portal.controller.ts`

## SP 2.3 - submission-placement-service

- SP 2.3: quote auto-expire - FIXED
  - `expireStaleQuotes()` in `RfqEngine` - marks quote responses past `expiresAt` as expired
  - Publishes `QuoteResponseExpired.v1` event on `insurance.quote.events` topic
  - Called automatically in `listRequests()` before returning results
  - Files: `rfq/rfq-engine.ts`

## Verified: SN 3.1 and SN 3.2 - sales-network-service

- SN 3.1: Broker-specific KPIs - ALREADY IMPLEMENTED
  - `getBrokerDashboard()` includes `persistencyRateBps`, `retentionRateBps`, `lossRatioBps`, `avgPremiumPerPolicy`
- SN 3.2: Broker-level dashboard - ALREADY IMPLEMENTED
  - `GET /sales-network/broker/:brokerPartnerId/dashboard` with `sales_network:broker:dashboard:view` permission
  - Aggregates all sub-agent KPIs with per-sub-agent breakdown

---

## customer-portal-service - Round 7 Fixes

- CP 4.1: Payment initiation - FIXED
  - `initiatePayment()` in `CustomerPortalService` proxies to billing-service `POST /payments/initiate`
  - `POST /customer-portal/payments/initiate` endpoint with JwtAuthGuard
  - Files: `customer-portal.service.ts`, `customer-portal.controller.ts`

- CP 6.2: Broker information display - FIXED
  - `getBrokerInfo()` in `CustomerPortalService` looks up customer policy for `distributionOrganizationId`, then fetches partner info from sales-network-service
  - `GET /customer-portal/broker-info` endpoint with JwtAuthGuard
  - Returns partnerId, displayName, status, organizationId, partnerType
  - Files: `customer-portal.service.ts`, `customer-portal.controller.ts`

- CP 6.4: Installment details sync - FIXED
  - `getInstallmentDetails()` in `CustomerPortalService` proxies to collections-service `GET /collections/installments/:installmentId`
  - `GET /customer-portal/installments/:installmentId` endpoint with JwtAuthGuard
  - Verifies customerId match before returning data
  - Files: `customer-portal.service.ts`, `customer-portal.controller.ts`

## agent-portal-service - Round 7 Fixes

- AP 2.2: Dashboard filtering - FIXED
  - Added `startDate`, `endDate`, `lineOfBusiness` query params to `GET /agent-portal/agent/:agentId/dashboard`
  - `getDashboardStats()` in `AgentPortalService` forwards filters to sales-network-service
  - `getAgentStats()` in `SalesNetworkService` applies date range to KPI queries and lineOfBusiness filter to attribution queries
  - Files: `agent-portal.controller.ts`, `agent-portal.service.ts`, `sales-network.controller.ts`, `sales-network.service.ts`

## agent-portal-service - Round 8 Fixes

- AP 3.1: Policy details - FIXED
  - `getPolicyDetail()` in `AgentPortalService` fetches single policy from policy-service `GET /policies/:policyId`
  - `GET /agent-portal/agent/:agentId/policies/:policyId` endpoint with `agent_portal:policies` permission
  - Validates agent access before returning data
  - Files: `agent-portal.service.ts`, `agent-portal.controller.ts`

- AP 3.3: Claim status tracking - FIXED
  - `getClaimStatus()` in `AgentPortalService` fetches real-time claim status from claims-service
  - `GET /agent-portal/agent/:agentId/claims/:claimId/status` endpoint with `agent_portal:claims` permission
  - Returns claimId, claimNumber, status, policyId, lossDate, reportedAt, updatedAt
  - Files: `agent-portal.service.ts`, `agent-portal.controller.ts`

- AP 5.1: Lead management - FIXED
  - Created `Lead` entity in sales-network-service with fields: customerName, phone, email, productInterest, status, priority, notes, assignedTo, convertedSubmissionId
  - Added `createLead()`, `listLeads()`, `updateLead()`, `assignLead()`, `convertLead()` methods to `SalesNetworkService`
  - Added endpoints: `POST /sales-network/leads`, `GET /sales-network/leads`, `PATCH /sales-network/leads/:leadId`, `POST /sales-network/leads/:leadId/assign`, `POST /sales-network/leads/:leadId/convert`
  - Permissions: `sales_network:leads:manage`, `sales_network:leads:view`
  - Registered Lead entity in app.module.ts
  - Files: `entities/Lead.ts` (new), `sales-network.service.ts`, `sales-network.controller.ts`, `app.module.ts`

## Verified: SN 5.2 - sales-network-service

- SN 5.2: Auth-service sync on partner suspend - ALREADY IMPLEMENTED
  - `setPartnerStatus()` calls `syncPartnerSuspensionWithAuth()` when status is `suspended` or `terminated`
  - Sends POST to auth-service `/api/v1/admin/organizations/:orgUnitId/suspend` to suspend user access

## agent-portal-service - Round 9 Fixes

- AP 3.5.1: Customer details - FIXED
  - `getCustomerDetail()` in `AgentPortalService` fetches party details from party-kyc-service, KYC status, and policy history from policy-service
  - `GET /agent-portal/agent/:agentId/customers/:customerId` endpoint with `agent_portal:customers` permission
  - Returns customerId, displayName, phoneNumber, email, kycStatus, and policy history array
  - Files: `agent-portal.service.ts`, `agent-portal.controller.ts`

- AP 3.5.2: Commission details - FIXED
  - `getCommissionDetail()` in `AgentPortalService` fetches single commission split from billing-service
  - `GET /agent-portal/agent/:agentId/commissions/:commissionId` endpoint with `agent_portal:commissions` permission
  - Returns splitId, sourceId, sourceType, role, amount, currency, status, organizationId, commissionScheduleSnapshot
  - Files: `agent-portal.service.ts`, `agent-portal.controller.ts`

- AP 4.1: Advocacy case management - FIXED
  - Added `closeAdvocacyCase()`, `listAdvocacyTasks()`, `updateAdvocacyTaskStatus()` methods to `AgentPortalService` proxying to claims-service
  - Added `listTasks()` method to `ClaimAdvocacyService` in claims-service
  - Added `GET /advocacy-cases/:caseId/tasks` endpoint to claims-service controller
  - Added `POST /agent-portal/advocacy-cases/:caseId/close`, `GET /agent-portal/advocacy-cases/:caseId/tasks`, `PATCH /agent-portal/advocacy-cases/:caseId/tasks/:taskId` endpoints
  - Files: `agent-portal.service.ts`, `agent-portal.controller.ts`, `claims-service/advocacy/advocacy.service.ts`, `claims-service/advocacy/advocacy.controller.ts`

## customer-portal-service - Round 8 Fixes

- CP 5.1: Advocacy case creation - FIXED
  - `createAdvocacyCaseForCustomer()` in `CustomerPortalService` verifies claim ownership then proxies to claims-service `POST /claims/:claimId/advocacy-cases`
  - `POST /customer-portal/claims/:claimId/advocacy` endpoint with JwtAuthGuard
  - Accepts brokerOrganizationId, caseType, priority, description
  - Files: `customer-portal.service.ts`, `customer-portal.controller.ts`

## Verified: CP 6.3 - customer-portal-service

- CP 6.3: Product offering display - ALREADY IMPLEMENTED
  - `GET /customer-portal/offerings` endpoint exists, calls `getOfferingsForCustomer()` which proxies to product-service
  - Supports brokerOrganizationId, currency, region, limit, offset query params

## agent-portal-service - Round 10 Fixes

- AP 4.2: Adjuster referral management - FIXED
  - Added `acceptAdjusterReferral()`, `rejectAdjusterReferral()`, `submitAdjusterReport()` methods to `AgentPortalService` proxying to claims-service
  - Added `POST /agent-portal/adjuster-referrals/:referralId/accept`, `POST /agent-portal/adjuster-referrals/:referralId/reject`, `POST /agent-portal/adjuster-referrals/:referralId/submit-report` endpoints
  - Files: `agent-portal.service.ts`, `agent-portal.controller.ts`

- AP 4.3: Recovery tracking - FIXED
  - Added `getRecoveryCase()`, `listRecoveryCases()`, `updateRecoveryStatus()` methods to `AgentPortalService` proxying to claims-service
  - Added `getRecoveryCase()`, `listRecoveryCases()`, `updateRecoveryStatus()` methods to `ClaimAdvocacyService` in claims-service
  - Added `GET /recovery/:recoveryId`, `GET /claims/:claimId/recovery`, `PATCH /recovery/:recoveryId/status` endpoints to claims-service controller
  - Added `GET /agent-portal/claims/:claimId/recovery`, `GET /agent-portal/recovery/:recoveryId`, `PATCH /agent-portal/recovery/:recoveryId/status` endpoints to agent-portal controller
  - Files: `agent-portal.service.ts`, `agent-portal.controller.ts`, `claims-service/advocacy/advocacy.service.ts`, `claims-service/advocacy/advocacy.controller.ts`

## Verified: SN 5.3 - sales-network-service

- SN 5.3: Product-service notification on contract expiry/cancellation - ALREADY IMPLEMENTED
  - `terminateContract()` publishes outbox event with topic `insurance.product.contract.expired` and eventType `ContractExpiredProductVisibilityRevoke`
  - Payload includes contractId, orgUnitId, distributionAgreementId, lineOfBusiness, reason, action: 'revoke_product_visibility'
  - Product-service can consume this event to revoke product visibility for the expired/cancelled contract

## customer-portal-service - Round 9 Fixes

- CP 2.1: Broker filter on policies - FIXED
  - `getPoliciesForCustomer()` now accepts optional `brokerOrganizationId` parameter and passes it to policy-service
  - `GET /customer-portal/policies?brokerOrganizationId=...` endpoint
  - Files: `customer-portal.service.ts`, `customer-portal.controller.ts`

- CP 2.2: Endorsement submit/track for broker approval - FIXED
  - Added `submitEndorsementForCustomer()` and `getEndorsementStatusForCustomer()` methods proxying to policy-service
  - `POST /customer-portal/endorsements/:endorsementId/submit` — submits draft endorsement for broker approval
  - `GET /customer-portal/endorsements/:endorsementId` — tracks endorsement status (draft, submitted, approved, applied, rejected)
  - Policy-service already has full endorsement lifecycle: create → submit → approve/reject → apply
  - Files: `customer-portal.service.ts`, `customer-portal.controller.ts`

- CP 2.3: Renewal quote comparison - FIXED
  - Added `compareRenewalQuotes()` method that verifies policy ownership then proxies to product-service `POST /product/quote/compare`
  - `POST /customer-portal/policies/:policyId/renewal/compare-quotes` endpoint
  - Accepts productIds and effectiveDate, returns comparison quotes from multiple carriers
  - Files: `customer-portal.service.ts`, `customer-portal.controller.ts`

- CP 5.2: Direct adjuster communication - FIXED
  - Added `addAdjusterCommunication()` method to claims-service `ClaimAdvocacyService` that creates a communication linked to an adjuster referral
  - Added `POST /adjuster-referrals/:referralId/communications` endpoint to claims-service controller
  - Added `addAdjusterCommunicationForCustomer()` method to customer-portal service with claim ownership verification
  - Added `POST /customer-portal/claims/:claimId/adjuster-referrals/:referralId/communications` endpoint
  - Publishes `AdjusterCommunicationAdded` event via outbox for traceability
  - Files: `claims-service/advocacy/advocacy.service.ts`, `claims-service/advocacy/advocacy.controller.ts`, `customer-portal.service.ts`, `customer-portal.controller.ts`

## Verified: SN 1.1, 1.2, 1.3 - sales-network-service

- SN 1.1: Distribution Agreement management - ALREADY IMPLEMENTED
  - Full CRUD: `GET/POST /sales-network/agreements`, `GET /sales-network/agreements/:agreementId`, `POST /sales-network/agreements/:agreementId/activate`, `POST /sales-network/agreements/:agreementId/terminate`
  - `DistributionAgreement` entity with carrierOrganizationId, distributorOrganizationId, linesOfBusiness, status, effectiveFrom/To
  - Also exposed via channel-workspace-bff

- SN 1.2: Commission Split modeling - ALREADY IMPLEMENTED
  - `splitPercentBps` field in `CommissionContract` and `CommissionTier` entities
  - Used in `calculateCommission()` to compute `splitAmount` = (commission * splitBps) / 10000
  - `SalesPolicyAttribution` entity stores `commissionSplitAmount` per policy

- SN 1.3: Cap and Floor commission management - ALREADY IMPLEMENTED
  - `capAmountMinor` and `floorAmountMinor` fields in `CommissionContract` and `CommissionTier` entities
  - Enforced in `calculateCommission()`: if commission > cap, commission = cap; if commission < floor, commission = floor
  - Accepted in `createContract()` and `createCommissionTier()` endpoints

## Verified: SN 2.1, 2.2, 2.3 - sales-network-service

- SN 2.1: Billing-service sync for settlement - ALREADY IMPLEMENTED
  - Clawback events published to billing-service via outbox: `insurance.billing.clawback.request` with `ClawbackRequested` eventType
  - Settlement sync via billing-service commission endpoints consumed by sales-network event handlers

- SN 2.2: Clawback management - ALREADY IMPLEMENTED
  - `ClawbackRule` entity with agreementId, triggerEvent, windowDays, rateBps, fixedAmountMinor
  - `createClawbackRule()`, `listClawbackRules()`, `deleteClawbackRule()` methods
  - Clawback logic in policy cancellation handler: finds matching rule, calculates clawback amount, updates ledger entry status to 'clawback', publishes `CommissionClawbackApplied` event

- SN 2.3: Ledger reconciliation - ALREADY IMPLEMENTED
  - `getLedgerReconciliation()` method in `SalesNetworkService`
  - `GET /sales-network/ledger/reconciliation` endpoint with `sales_network:ledger:view` permission
  - Accepts orgUnitId, fromDate, toDate parameters

## Verified: SN 5.1 - channel-workspace-bff

- SN 5.1: channel-workspace-bff partner/contract exposure - ALREADY IMPLEMENTED
  - Partner endpoints: `GET/POST /sales-network/partners`
  - Contract endpoints: `GET/POST /sales-network/contracts`, `POST /sales-network/contracts/:contractId/terminate`
  - Distribution Agreement endpoints: `GET/POST /sales-network/agreements`, `GET /sales-network/agreements/:agreementId`, activate/terminate
  - Sub-Agent endpoints: `GET/POST /sales-network/broker/:brokerPartnerId/sub-agents`, suspend/terminate
  - Broker Dashboard: `GET /sales-network/broker/:brokerPartnerId/dashboard`
  - Carrier Agreement: `GET /carrier-agreement`

## Verified: AP 6.3, 6.4 - agent-portal-service

- AP 6.3: sales-network-service integration - ALREADY IMPLEMENTED
  - agent-portal-service fetches from sales-network-service (partners, contracts, commissions), policy-service (policies, details), claims-service (claims, advocacy, recovery), billing-service (commissions), party-kyc-service (customers, KYC)
  - All proxy methods propagate tenantId, authToken, and correlationId

- AP 6.4: AbacGuard for data isolation - ALREADY IMPLEMENTED
  - Controller-level `@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)` on all endpoints
  - `validateAgentAccess()` method enforces agentId-to-token identity matching
  - `organizationId` query parameter forwarded to all downstream services for org-level filtering

## Verified: Cross-Cutting Items from summary.md

All 8 cross-cutting structural defects and all P0/P1/P2 priority items have been addressed:

- **Cross-cutting 1**: Distribution Agreement as first-class entity — ✅ Implemented in sales-network-service with full CRUD, `DistributionAgreement` entity, linked to contracts and commission tiers
- **Cross-cutting 2**: Token Exchange federation — ✅ `POST /federation/token-exchange` in auth-service with `agreementId`, `relationshipType`, `fieldAcl` claims
- **Cross-cutting 3**: Duplication between services — ✅ policy-service delegates to regulatory-gateway-service for Sanhab; billing-service and payments-service have distinct roles (settlement vs payment gateway)
- **Cross-cutting 4**: brokerOrganizationId filter — ✅ Implemented across claims-service, collections-service, reporting-service, policy-service, customer-portal-service, agent-portal-service
- **Cross-cutting 5**: BFF write operations — ✅ broker-portal-bff exposes create/approve/reject for claims, payments, underwriting, collections, policies; channel-workspace-bff exposes create/terminate for contracts, agreements, sub-agents
- **Cross-cutting 6**: Event-driven sync — ✅ Multiple event consumers: sales-network (policy events), customer-portal (notification events), claims-service (broker notifications), billing-service (clawback events)
- **Cross-cutting 7**: SoD for critical operations — ✅ SoD between commission calculate and settlement approve (BL 1.1), between placement bind and bind+issue (SP 5.1), auth-service SOD-008 rule
- **Cross-cutting 8**: AbacGuard in reporting/underwriting — ✅ AbacGuard added to all 28 reporting endpoints + 10 sub-controllers; underwriting-service has AbacGuard

### P0 (Critical) — All Resolved
1. ✅ BFF token validation — JwtAuthGuard with JWKS (RS256) + local HS256 fallback
2. ✅ Webhook signature validation in regulatory-gateway-service
3. ✅ OTP rate limiting in customer-portal-service
4. ✅ Session security in customer-portal-service
5. ✅ Distribution agreement validation on bind/issue
6. ✅ Data isolation by brokerOrganizationId

### P1 (Important) — All Resolved
1. ✅ Distribution Agreement as first-class entity
2. ✅ Token Exchange federation
3. ✅ Commission split between hierarchy levels
4. ✅ Duplication between services
5. ✅ BFF write operations
6. ✅ SoD for critical operations

### P2 (Improvement) — All Resolved
1. ✅ Broker-specific KPIs (REP 1.1)
2. ✅ Broker dashboard (REP 2.1, SN 3.2)
3. ✅ Bulk operations (product-service bulk visibility, party-kyc bulk review)
4. ✅ Caching for inquiries (warehouse fire inquiry caching)
5. ✅ Real-time data in dashboards (claim status real-time via claims-service projections)
6. ✅ Proactive monitoring and alerting (circuit breaker onOpen callback with alerting)

---

## Final Status

**All 187 defects across 17 services resolved. All cross-cutting items and P0/P1/P2 priorities addressed. TypeScript compilation verified.**

---

## Frontend UI Completion

**تاریخ**: ۱۴۰۵/۰۵/۱۴

### Agent Portal UI (`agent-portal-ui`)
- ✅ Recovery tracking page — list, create, update status with modal
- ✅ Claims, advocacy, adjuster referrals pages wired into navigation
- ✅ Loading, error handling, data tables, user interactions
- ✅ API client integration with auth token from cookies

### Customer Portal UI (`customer-portal-ui`)
- ✅ Advocacy page — case listing, details, communications, new case creation
- ✅ Adjuster communication page — claim selection, messaging
- ✅ Endorsement tracking page — policy selection, endorsement list, tracking details
- ✅ Renewal quote comparison page — policy selection, quote list, comparison, acceptance
- ✅ Navigation links added to portal-shell for all new pages

### Channel Workspace UI (`channel-workspace-ui`)
- ✅ Extended API client with `channelApi` and `brokerApi` objects
- ✅ Dashboard tab with stat cards and recent activity
- ✅ Sub-agents tab with data table and create modal
- ✅ Partners tab with data table and create modal (partner type selector)

### Broker Portal UI (`broker-portal-ui`) — Created from scratch
- ✅ Next.js 14 + React 18 + Tailwind + TypeScript project scaffold
- ✅ API client covering all BFF endpoints (dashboard, claims, policies, payments, underwriting, collections, regulatory, agreements, offerings, submissions, placements, commissions, sub-agents, KYC)
- ✅ 7 page sections: Dashboard, Claims (with approve/reject), Policies (with endorsements), Payments (with status filter), Underwriting (with appeal flow), Collections (with installments), Regulatory (3 sub-tabs: license validation, Sanhab inquiry, warehouse fire inquiry)
- ✅ Login page with token-based auth
- ✅ Dockerfile + docker-compose service (port 18046)
- ✅ `next-env.d.ts` for TypeScript support

### E2E Tests
- ✅ `tests/e2e/broker-portal-bff.test.ts` — 24 test cases covering all BFF endpoints
- ✅ `tests/e2e/channel-workspace-bff.test.ts` — 18 test cases covering all BFF endpoints + auth guard verification

### Docker Compose
- ✅ `broker-portal-ui` service added on port 18046, depends on api-gateway and broker-portal-bff
- ✅ `NEXT_PUBLIC_BROKER_BFF_URL` env var configured for container-to-container communication

---

## Frontend UI Audit & Docker-Compose Fixes

**تاریخ**: ۱۴۰۵/۰۵/۱۱

### Port & URL Mismatches Fixed

| Service | Issue | Fix |
|---------|-------|-----|
| `agent-portal-ui` | Default API port 3001 | Changed to 3032 (matches `agent-portal-service`) |
| `customer-portal-ui` api.ts | Default API port 3000 | Changed to 3030 (matches `customer-portal-service`) |
| `customer-portal-ui` consent page | Default API port 3010 | Changed to 3030 |
| `customer-portal-ui` OTP routes | Port 18035, path `/portal/otp` | Changed to port 3030, path `/customer-portal/otp` |
| `customer-portal-ui` .env.example | Outdated ports, missing tenant ID | Updated all ports to 3030, added `NEXT_PUBLIC_TENANT_ID` |

### OTP Flow Fixes (customer-portal-ui)
- Added `tenantId` to OTP initiate request (required by controller)
- Track `sessionId` from initiate response, use in verify request instead of `phoneNumber`
- Fixed `authApi` functions: `initiateOtp(tenantId, phoneNumber)`, `verifyOtp(sessionId, otp)`
- Fixed `getSession(sessionId)` and `revokeSession(sessionId)` to pass sessionId as path param

### Agent-Portal-UI API Path Fixes
- Dashboard: `/dashboard/stats` → `/agent/:agentId/dashboard`
- Policies: `/policies` → `/agent/:agentId/policies`
- Commissions: `/commissions` → `/agent/:agentId/commissions`
- Claims: `/claims` → `/agent/:agentId/claims`
- Claim details: `/claims/:id` → `/agent/:agentId/claims/:id/status`
- Customer detail: `/customers/:id` → `/agent/:agentId/customers/:id`
- Advocacy paths: `/advocacy/` → `/advocacy-cases/`
- Recovery: `/recovery` → `/claims/:claimId/recovery`

### New Backend Endpoints Added

**agent-portal-service:**
- `POST /agent-portal/login` — AuthController proxying to auth-service
- `POST /agent-portal/session/validate` — Body-based session validation (matching integration test)
- `DELETE /agent-portal/session/:sessionId` — DELETE alias for session revoke
- `DELETE /agent-portal/sessions` — Bulk session revoke by agentId query param

**channel-workspace-bff broker controller:**
- Route aliases: `carrier-agreements` (singular), `partners`, `contracts`, `contracts/:id` (top-level)
- Top-level `sub-agents` endpoints extracting `brokerPartnerId` from JWT

**customer-portal-service:**
- `GET/POST /customer-portal/consent` — Consent management (proxied to customer-360-service)
- `POST /customer-portal/consent/revoke` — Revoke consent
- `GET/POST /customer-portal/claims/:claimId/adjuster-communications` — Adjuster messaging (proxied to claims-service)
- `GET /customer-portal/claims/:claimId/advocacy/:caseId/communications` — Advocacy communications
- `GET /customer-portal/policies/:policyId/endorsements` — Policy endorsements list
- `GET /customer-portal/policies/:policyId/endorsements/:endorsementId` — Endorsement detail
- `GET /customer-portal/policies/:policyId/endorsements/:endorsementId/track` — Endorsement tracking
- `GET /customer-portal/policies/:policyId/renewal/quotes` — Renewal quotes
- `POST /customer-portal/policies/:policyId/renewal/quotes/:quoteId/accept` — Accept renewal quote
- `POST /customer-portal/policies/:policyId/renewal/schedule` — Schedule renewal
- `GET /customer-portal/payments/:paymentId` — Payment detail by ID

### Customer-Portal-UI API Fixes
- `compareRenewalQuotes`: Changed from `GET /renewal/compare` to `POST /renewal/compare-quotes`
- `scheduleRenewal`: Now sends all fields (`newStartDate`, `newEndDate`, `newPremium`, `type`, `notes`)

### Docker-Compose Fixes

| Issue | Fix |
|-------|-----|
| `customer-portal-ui` `NEXT_PUBLIC_API_URL` pointed to `api-gateway:18000` | Changed to `customer-portal-service:18027` |
| `agent-portal-ui` `NEXT_PUBLIC_API_URL` pointed to `api-gateway:18000` | Changed to `agent-portal-service:18031` |
| `channel-workspace-ui` `NEXT_PUBLIC_API_URL` pointed to `api-gateway:18000` | Changed to `channel-workspace-bff:3020` |
| `web-ui` `NEXT_PUBLIC_API_BASE_URL` used `localhost:18000` | Changed to `api-gateway:18000` |
| `customer-portal-service` missing downstream service URLs | Added `POLICY_SERVICE_URL`, `CLAIMS_SERVICE_URL`, `CLAIMS_READMODEL_URL`, `COLLECTIONS_SERVICE_URL`, `COMPLAINTS_SERVICE_URL`, `CUSTOMER_360_URL`, `SALES_NETWORK_SERVICE_URL`, `JWT_SECRET` + corresponding `depends_on` |
| `agent-portal-service` missing downstream service URLs | Added `POLICY_SERVICE_URL`, `CLAIMS_SERVICE_URL`, `CLAIMS_READMODEL_URL`, `SALES_NETWORK_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `COMPLAINTS_SERVICE_URL`, `COLLECTIONS_SERVICE_URL`, `REPORTING_SERVICE_URL`, `CUSTOMER_360_SERVICE_URL`, `COPILOT_SERVICE_URL`, `JWT_SECRET` + corresponding `depends_on` |
| `submission-placement-service` wrong `SALES_NETWORK_SERVICE_URL` (port 18006) | Fixed to port 18022 |
| `submission-placement-service` wrong `UNDERWRITING_SERVICE_URL` (port 18016) | Fixed to port 18020 |
| `submission-placement-service` wrong `WORKFLOW_ENGINE_SERVICE_URL` (port 18013) | Fixed to `workflow-service:18028` |
| `submission-placement-service` `depends_on` referenced `workflow-engine-service` | Fixed to `workflow-service` |
| `broker-portal-bff` wrong `SUBMISSION_PLACEMENT_SERVICE_URL` (port 18012) | Fixed to port 18025 |
| `broker-portal-bff` wrong `UNDERWRITING_SERVICE_URL` (port 18032) | Fixed to port 18020 |
| `channel-workspace-bff` wrong `SUBMISSION_PLACEMENT_SERVICE_URL` (port 18012) | Fixed to port 18025 |
| `api-gateway` missing `BROKER_PORTAL_BFF_URL` and `CHANNEL_WORKSPACE_BFF_URL` env vars | Added with correct Docker service names |
| `api-gateway` missing `broker-portal-bff` and `channel-workspace-bff` in `depends_on` | Added |

### E2E & Integration Test Fixes
- `tests/e2e/agent-portal-flow.test.ts`: Fixed `/agent-portal/policies` → `/agent-portal/agent/${agentId}/policies` and `/agent-portal/claims` → `/agent-portal/agent/${agentId}/claims`
- `tests/e2e/experience-ai.spec.ts`: Fixed stale default ports: customer-portal 3010→18027, copilot 18060→18030, document-ai 18070→18021
- `tests/e2e/federation-claim-projection.spec.ts`: Fixed stale ports: partner-gateway 3010→18010, claims 3012→18002, policy 3015→18007, party-kyc 3004→18006
- `tests/e2e/federation-quote-to-bind.spec.ts`: Fixed stale ports: partner-gateway 3010→18010, auth 3001→18001, submission 3003→18025, policy 3015→18007
- `tests/e2e/federation-flow.test.ts`: Fixed stale ports: partner-gateway 3010→18010, auth 3001→18001, party-kyc 3004→18006
- `tests/e2e/broker-portal-bff.test.ts`: Fixed stale port: broker-bff 3010→3030
- `tests/helpers/docker-compose.ts`: Added 16 missing services to health check port map (collections, customer-portal, agent-portal, notification, billing, copilot, customer-360, workflow, rule-engine, knowledge, model-switchboard, outbox-relay, ai-governance, broker-portal-bff, channel-workspace-bff)
- `docker-compose.e2e.yml`: Added missing services: `billing-service` (18039), `notification-service` (18037), `agent-portal-service` (18031), `collections-service` (18025), `customer-360-service` (18026) — required by E2E tests that call `waitForHealth` on these services
- `services/document-ai-service/.env.example`: Fixed stale ports: claims 3002→18002, monitoring 3003→18020

### Files Modified
- `services/agent-portal-ui/src/lib/api.ts`
- `services/customer-portal-ui/src/lib/api.ts`
- `services/customer-portal-ui/src/app/api/portal/otp/initiate/route.ts`
- `services/customer-portal-ui/src/app/api/portal/otp/verify/route.ts`
- `services/customer-portal-ui/src/app/page.tsx`
- `services/customer-portal-ui/src/app/consent/page.tsx`
- `services/customer-portal-ui/.env.example`
- `services/agent-portal-service/src/auth.controller.ts`
- `services/agent-portal-service/src/app.module.ts`
- `services/agent-portal-service/src/agent-portal.controller.ts`
- `services/channel-workspace-bff/src/broker/broker.controller.ts`
- `services/channel-workspace-bff/src/channel/channel-bff.service.ts`
- `services/customer-portal-service/src/customer-portal.controller.ts`
- `services/customer-portal-service/src/customer-portal.service.ts`
- `docker-compose.yml`
- `docker-compose.e2e.yml`
- `tests/e2e/agent-portal-flow.test.ts`
- `tests/e2e/experience-ai.spec.ts`
- `tests/e2e/federation-claim-projection.spec.ts`
- `tests/e2e/federation-quote-to-bind.spec.ts`
- `tests/e2e/federation-flow.test.ts`
- `tests/e2e/broker-portal-bff.test.ts`
- `tests/helpers/docker-compose.ts`
- `services/document-ai-service/.env.example`

---

## product-service — بررسی مجدد و رفع اشکالات یکپارچه‌سازی (دوره ششم)

**تاریخ**: ۱۴۰۵/۰۵/۱۴

### اشکالات اضافی کشف و رفع شده

| شماره | اشکال | وضعیت | جزئیات رفع |
|-------|-------|--------|----------|
| ۶.۳ | پورت اشتباه product-service در channel-workspace-bff | ✅ رفع شد | از 18050 به 18018 |
| ۶.۴ | پورت اشتباه product-service در catalog-bff | ✅ رفع شد | از 3012 به 18018 |
| ۶.۵ | پورت اشتباه product-service در customer-portal-service | ✅ رفع شد | از 18040 به 18018 |
| ۶.۶ | پورت اشتباه product-service در submission-placement client registry | ✅ رفع شد | از 3018 به 18018 |
| ۶.۷ | پورت اشتباه product-service در docker-compose برای submission-placement | ✅ رفع شد | از 18005 به 18018 |
| ۶.۸ | عدم وجود PRODUCT_SERVICE_URL در docker-compose برای customer-portal-service | ✅ رفع شد | اضافه شد env var و dependency |
| ۶.۹ | عدم پاس agreementId در catalog-bff listDistributorVisibleProducts | ✅ رفع شد |
| ۶.۱۰ | عدم status=active در catalog-bff listBrokerOfferings | ✅ رفع شد | پیش‌فرض status=active |
| ۶.۱۱ | عدم پاس currency/region در catalog-bff listCustomerOfferings | ✅ رفع شد |
| ۶.۱۲ | عدم شامل کردن commissionTiers در catalog-bff getOfferingComparisonHint | ✅ رفع شد |
| ۶.۱۳ | عدم pagination/status در channel-workspace-bff listBrokerOfferings | ✅ رفع شد | اضافه شد params و status=active پیش‌فرض |
| TS fix | خطای TS1016 در channel-workspace-bff (required param after optional) | ✅ رفع شد | req و headers optional شدند |
| TS fix | خطای TS2339 در customer-portal-service (this.http → this.httpService) | ✅ رفع شد | 10 مورد در متدهای consent/adjuster/endorsement/renewal |

### فایل‌های تغییر یافته
- `services/channel-workspace-bff/src/channel/channel-bff.service.ts` — اصلاح پورت productUrl به 18018
- `services/channel-workspace-bff/src/broker/broker.controller.ts` — اصلاح TS1016 (req/headers optional)
- `services/channel-workspace-bff/src/channel/channel.controller.ts` — اصلاح TS1016 (req/headers optional در listPartners و listSubAgents)
- `services/catalog-bff/src/catalog.service.ts` — اصلاح پورت، agreementId، status، currency/region، commissionTiers
- `services/customer-portal-service/src/customer-portal.service.ts` — اصلاح پورت + this.http → this.httpService
- `services/submission-placement-service/src/clients/client.registry.ts` — اصلاح پورت به 18018
- `docker-compose.yml` — اصلاح پورت PRODUCT_SERVICE_URL برای submission-placement + اضافه شدن env var برای customer-portal-service
- `doc/endpoint_catalog/brokery_ANALYSIS/product-service.md` — به‌روزرسانی جدول وضعیت با اشکالات ۶.۳ تا ۶.۱۳

### تأیید کامپایل
- ✅ catalog-bff — TypeScript compilation clean
- ✅ channel-workspace-bff — TypeScript compilation clean
- ✅ customer-portal-service — TypeScript compilation clean
- ✅ submission-placement-service — TypeScript compilation clean
