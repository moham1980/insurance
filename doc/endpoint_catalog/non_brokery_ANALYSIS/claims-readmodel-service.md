# Claims Readmodel Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: claims-readmodel-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/claims-readmodel-service/src/`

---

## ۱. Projection Lag و Consistency

### ۱.۱ عدم exposure از projection lag در query endpoints
- **اندپوینت**: `GET /rm/claims`، `GET /rm/fraud/cases`، `GET /rm/complaints`
- **اشکال**: هیچ فیلدی در response برای نشان دادن projection lag (مدت زمان از آخرین event تا projection) وجود ندارد. کاربر نمی‌تواند بداند داده‌های read model چقدر stale هستند. در سیستم‌های CQRS، staleness باید شفاف باشد تا کاربر تصمیم بگیرد آیا از read model استفاده کند یا مستقیماً از write model query کند.
- **کد**: `readmodel.controller.ts` lines 66-96 (`list`)، 124-155 (`listFraudCases`)، 157-187 (`listComplaintsOps`) — response فقط `success`، `data`، `pagination` و `correlationId` را برمی‌گرداند. entity‌ها دارای `lastOccurredAt` و `lastEventVersion` هستند (مثلاً `RmClaimCase.ts` lines 57-61) اما این فیلدها در response نمایش داده نمی‌شوند. `getHealthMetrics` (service line 600-640) فقط `lastProcessedAt` کلی را برمی‌گرداند، نه per-record staleness را.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم eventual consistency guarantee
- **اندپوینت**: `GET /rm/claims/:claimId`
- **اشکال**: وقتی claim در claims-service update می‌شود، read model ممکن است هنوز به‌روز نشده باشد. هیچ مکانیزمی برای کاربر وجود ندارد که freshness داده را بررسی کند. اگر کاربر بلافاصله بعد از update claim را از read model query کند، داده قدیمی دریافت می‌کند بدون اینکه بداند.
- **کد**: `readmodel.service.ts:getClaim` (lines 553-555) — فقط `findOne` انجام می‌دهد بدون هیچ staleness check. `readmodel.controller.ts:get` (lines 98-111) — response شامل `lastEventVersion` یا `lastOccurredAt` نیست.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم rebuild برای fraud و complaints
- **اندپوینت**: `POST /rm/admin/rebuild`
- **اشکال**: rebuild فقط `aggregateId` را می‌گیرد و برای claims projection طراحی شده است. هیچ اندپوینتی برای rebuild fraud cases یا complaints projection وجود ندارد. اگر projection برای fraud یا complaints corrupt شود، راهی برای rebuild آن‌ها نیست.
- **کد**: `readmodel.controller.ts:rebuild` (lines 189-201) — فقط `body?.aggregateId` را می‌گیرد. `readmodel.service.ts:rebuildProjection` (lines 642-646) — یک placeholder است که فقط log می‌زند و `{ processed: 0, skipped: 0 }` برمی‌گرداند. هیچ منطق rebuild واقعی برای هیچ projection ای وجود ندارد.
- **وضعیت**: ✅ تأیید شد — **نکته جدید**: rebuild اصلاً پیاده‌سازی نشده است (placeholder).

### ۱.۴ عدم partial rebuild
- **اندپوینت**: `POST /rm/admin/rebuild`
- **اشکال**: rebuild فقط برای یک `aggregateId` انجام می‌شود. هیچ اندپوینتی برای rebuild batch (مثلاً rebuild تمام claims در یک بازه زمانی) وجود ندارد. برای rebuild کامل read model، باید برای هر aggregate به‌طور جداگانه rebuild فراخوانی شود.
- **کد**: `readmodel.controller.ts:rebuild` (lines 189-201) — body فقط `aggregateId` را قبول می‌کند. `readmodel.service.ts:rebuildProjection` (line 642) — signature: `(aggregateId?: string, tenantId?: string)` — هیچ پارامتر برای date range یا batch وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ (جدید) rebuildProjection کاملاً placeholder است
- **اندپوینت**: `POST /rm/admin/rebuild`
- **اشکال**: متد `rebuildProjection` هیچ منطق واقعی برای replay event‌ها ندارد. فقط یک log می‌زند و `{ processed: 0, skipped: 0 }` برمی‌گرداند. این یعنی اگر projection corrupt شود، هیچ راهی برای rebuild آن وجود ندارد — حتی برای claims.
- **کد**: `readmodel.service.ts` lines 642-646:
  ```typescript
  async rebuildProjection(aggregateId?: string, tenantId?: string): Promise<{ processed: number; skipped: number }> {
    // Placeholder: real rebuild would replay from Kafka or outbox with same handlers
    this.logger.info('Rebuild projection requested', { aggregateId, tenantId });
    return { processed: 0, skipped: 0 };
  }
  ```
- **وضعیت**: ✅ تأیید شد (نقص جدید — بحرانی)

---

## ۲. Query Performance و Filtering

### ۲.۱ عدم فیلتر بر اساس date range
- **اندپوینت**: `GET /rm/claims`
- **اشکال**: لیست claims فقط فیلتر `policyId` و `status` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `createdAt`، `settledAt` یا بازه زمانی وجود ندارد. در عملیات گزارش‌گیری، جستجوی claims در یک بازه زمانی ضروری است.
- **کد**: `readmodel.controller.ts:list` (lines 66-96) — query params فقط `policyId`، `status`، `limit`، `offset`. `readmodel.service.ts:listClaims` (lines 540-551) — فقط `policyId` و `status` در WHERE clause. `RmClaimCase` entity دارای `createdAt` (line 51) و `lossDate` (line 24) است اما فیلتر بر اساس آن‌ها وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم فیلتر fraud cases بر اساس claimId
- **اندپوینت**: `GET /rm/fraud/cases`
- **اشکال**: لیست fraud cases فقط فیلتر `status` و `minScore` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `claimId` وجود ندارد. برای پیدا کردن fraud case‌های یک claim خاص، باید تمام cases را fetch و client-side filter کرد.
- **کد**: `readmodel.controller.ts:listFraudCases` (lines 124-155) — query params فقط `status`، `minScore`، `limit`، `offset`. `readmodel.service.ts:listFraudCases` (lines 574-584) — فقط `status` و `minScore` در WHERE. توجه: `RmFraudCase` دارای `claimId` به‌عنوان PrimaryColumn (line 9) است، پس هر claim حداکثر یک fraud case دارد، اما فیلتر در API تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم فیلتر complaints بر اساس policyNumber یا claimId
- **اندپوینت**: `GET /rm/complaints`
- **اشکال**: لیست complaints فقط فیلتر `status` و `complaintType` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `policyNumber`، `claimId` یا `complainantNationalId` وجود ندارد. این باعث می‌شود cross-reference بین complaints و claims غیرممکن شود.
- **کد**: `readmodel.controller.ts:listComplaintsOps` (lines 157-187) — query params فقط `status`، `complaintType`، `limit`، `offset`. `readmodel.service.ts:listComplaintsOps` (lines 586-596) — فقط `status` و `complaintType` در WHERE. `RmComplaintOps` entity دارای `policyId` (line 21)، `claimId` (line 24) و `policyNumber` (line 27) است اما فیلتر بر اساس آن‌ها وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم sorting در query endpoints
- **اندپوینت**: `GET /rm/claims`، `GET /rm/fraud/cases`، `GET /rm/complaints`
- **اشکال**: هیچ query param برای sorting (مثلاً `sortBy`، `sortOrder`) وجود ندارد. کاربر نمی‌تواند نتایج را بر اساس `createdAt`، `score` یا فیلد دیگری sort کند. این برای dashboard و reporting مهم است.
- **کد**: `readmodel.service.ts:listClaims` (line 547) — `qb.orderBy('rm.updated_at', 'DESC')` hardcoded. `listFraudCases` (line 581) — `qb.orderBy('rm.updated_at', 'DESC')` hardcoded. `listComplaintsOps` (line 593) — `qb.orderBy('rm.updated_at', 'DESC')` hardcoded. هیچ sort parameter در controller تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۵ (جدید) عدم فیلتر claims بر اساس fraudCaseId یا reinsurance fields
- **اندپوینت**: `GET /rm/claims`
- **اشکال**: `RmClaimCase` entity دارای `fraudCaseId` (line 48) و فیلدهای reinsurance (`riContractId`، `riRecoverableAmount`، `riRecoveredAmount`) است اما هیچ فیلتری برای جستجوی claims با fraud case فعال یا با recovery در حال انجام وجود ندارد.
- **کد**: `readmodel.service.ts:listClaims` (lines 540-551) — فقط `policyId` و `status` در WHERE. `RmClaimCase.ts` lines 48-82 — فیلدهای fraud و RI موجود اما در query قابل فیلتر نیستند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۳. PII Masking و Access Control

### ۳.۱ عدم configurable PII masking
- **اندپوینت**: `GET /rm/claims`، `GET /rm/claims/:claimId`
- **اشکال**: PII masking فقط بر اساس role-based hardcoded list (`insurer_admin`، `head_office_ops`، `compliance_aml`، `auditor`، `system_admin`) انجام می‌شود. هیچ endpoint برای پیکربندی اینکه کدام فیلدها برای کدام role mask شوند وجود ندارد. این عدم انعطاف‌پذیری در سازمان‌های با ساختار متفاوت مشکل‌ساز می‌شود.
- **کد**: `readmodel.controller.ts` line 17 — `const PII_FIELDS = ['complainantMobile', 'policyNumber', 'assignedTo', 'adjusterId'];` (hardcoded). lines 35-40 — `canViewPii` با hardcoded role list: `['insurer_admin', 'head_office_ops', 'compliance_aml', 'auditor', 'system_admin']`.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم field-level PII control
- **اندپوینت**: `GET /rm/claims/:claimId`
- **اشکال**: PII masking all-or-nothing است. یا تمام PII فیلدها mask می‌شوند یا هیچ‌کدام. در عمل، یک role ممکن است به `complainantMobile` دسترسی داشته باشد اما به `policyNumber` نداشته باشد. field-level PII control در API تعریف نشده است.
- **کد**: `readmodel.controller.ts:canViewPii` (lines 35-40) — boolean برمی‌گرداند. `maskObjectPii` (lines 48-60) — اگر `mask = true` تمام `PII_FIELDS` mask می‌شوند، در غیر این صورت هیچ‌کدام.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ ~~عدم PII masking در fraud و complaints~~
- ~~**اشکال**: PII masking فقط برای claims توضیح داده شده است. برای fraud cases و complaints، مشخص نیست آیا PII masking اعمال می‌شود یا خیر. fraud cases شامل `claimId` و `fraudScore` است و complaints شامل `complaintType` و `status` — اما اگر فیلدهای PII در projection وجود داشته باشند، masking باید صریح تعریف شود.~~
- **کد**: `readmodel.controller.ts:listFraudCases` (line 151) — `this.maskRowsPii(rows, req.user)` فراخوانی می‌شود. `listComplaintsOps` (line 183) — `this.maskRowsPii(rows, req.user)` فراخوانی می‌شود. `PII_FIELDS` شامل `complainantMobile`، `policyNumber`، `assignedTo`، `adjusterId` است که برای fraud cases (`assignedTo` در `RmFraudCase` line 30) و complaints (`complainantMobile` line 30، `policyNumber` line 27، `assignedTo` line 39) اعمال می‌شود.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `maskRowsPii` در تمام list endpoints (claims، fraud، complaints) فراخوانی می‌شود و `PII_FIELDS` برای هر سه دامنه اعمال می‌شود.

### ۳.۴ عدم audit log برای PII access
- **اندپوینت**: `GET /rm/claims/:claimId`
- **اشکال**: وقتی کاربر با PII view permission به داده‌های unmasked دسترسی پیدا می‌کند، هیچ audit log ای ثبت نمی‌شود. در compliance، دسترسی به PII باید log شود (چه کسی، چه زمانی، چه claimId را با PII دید).
- **کد**: `readmodel.controller.ts:canViewPii` (lines 35-40) و `maskObjectPii` (lines 48-60) — هیچ log ای برای زمانی که PII unmasked نمایش داده می‌شود ثبت نمی‌شود. `readmodel.service.ts` — هیچ audit entity یا log method برای PII access وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ (جدید) PII_FIELDS شامل policyNumber است اما RmClaimCase این فیلد را ندارد
- **اندپوینت**: `GET /rm/claims`، `GET /rm/claims/:claimId`
- **اشکال**: `PII_FIELDS` شامل `policyNumber` است اما `RmClaimCase` entity هیچ فیلد `policyNumber` ندارد (فقط `policyId` دارد). این یعنی masking `policyNumber` برای claims یک no-op است. در مقابل، `RmComplaintOps` دارای `policyNumber` (line 27) است. این ناسازگاری می‌تواند باعث سردرگمی شود — در catalog گفته شده `policyNumber` برای claims mask می‌شود اما در عمل این فیلد در claims entity وجود ندارد.
- **کد**: `readmodel.controller.ts` line 17 — `PII_FIELDS = ['complainantMobile', 'policyNumber', 'assignedTo', 'adjusterId']`. `RmClaimCase.ts` — هیچ `policyNumber` column وجود ندارد (فقط `policyId` در line 18). `RmComplaintOps.ts` line 27 — `policyNumber` وجود دارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۴. Summary و Analytics

### ۴.۱ عدم summary برای fraud و complaints
- **اندپوینت**: `GET /rm/claims/summary`
- **اشکال**: claims summary پشتیبانی می‌شود اما هیچ summary endpoint برای fraud cases یا complaints وجود ندارد. برای dashboard یکپارچه، summary هر سه دامنه (claims، fraud، complaints) نیاز است.
- **کد**: `readmodel.controller.ts` — فقط `@Get('/rm/claims/summary')` (lines 113-122) وجود دارد. هیچ `@Get('/rm/fraud/summary')` یا `@Get('/rm/complaints/summary')` تعریف نشده است. `readmodel.service.ts:getSummary` (lines 557-572) — فقط `rmRepo` (claims) را query می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم summary filtering
- **اندپوینت**: `GET /rm/claims/summary`
- **اشکال**: summary هیچ query param پشتیبانی نمی‌کند. هیچ فیلتری بر اساس بازه زمانی، status یا policyId وجود ندارد. summary فقط یک snapshot کلی نشان می‌دهد که برای تحلیل‌های بخش‌بندی شده کافی نیست.
- **کد**: `readmodel.controller.ts:summary` (lines 113-122) — هیچ query param نمی‌گیرد. `readmodel.service.ts:getSummary` (lines 557-572) — فقط `tenantId` می‌گیرد و `GROUP BY rm.status` انجام می‌دهد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم cross-domain summary
- **اندپوینت**: `GET /rm/claims/summary`
- **اشکال**: summary فقط claims را شامل می‌شود. هیچ endpoint برای cross-domain summary (مثلاً claims با fraud cases فعال، یا claims با complaints مرتبط) وجود ندارد. این برای dashboard یکپارچه Risk & Compliance ضروری است.
- **کد**: `readmodel.service.ts:getSummary` (lines 557-572) — فقط `rmRepo` را query می‌کند. هیچ join با `rmFraudRepo` یا `rmComplaintsRepo` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ (جدید) response واقعی summary با catalog ناسازگار است
- **اندپوینت**: `GET /rm/claims/summary`
- **اشکال**: endpoint catalog نشان می‌دهد که response شامل `totalClaims`، `byStatus` (به‌صورت object)، `averageSettlementTime` و `totalSettledAmount` است. اما کد واقعی فقط `total` و `byStatus` (به‌صورت array of `{ status, count }`) برمی‌گرداند. `averageSettlementTime` و `totalSettledAmount` اصلاً محاسبه نمی‌شوند.
- **کد**: `readmodel.service.ts:getSummary` (lines 557-572) — return `{ total, byStatus: rows.map(...) }`. `readmodel.controller.ts:summary` (line 121) — `return { success: true, data, correlationId }`. هیچ `averageSettlementTime` یا `totalSettledAmount` در کد وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۵. Admin و Health

### ۵.۱ permission اشتباه برای rebuild
- **اندپوینت**: `POST /rm/admin/rebuild`
- **اشکال**: rebuild از permission `rm:claims:summary` استفاده می‌کند. این یک نقص SoD است — کسی که می‌تواند summary ببیند نباید بتواند projection را rebuild کند. rebuild یک عملیات admin خطرناک است و باید permission جداگانه (`rm:admin:rebuild`) داشته باشد.
- **کد**: `readmodel.controller.ts` line 191 — `@RequirePermissions('rm:claims:summary')`. `abac.guard.ts` lines 35-43 — `/admin/` URL‌ها به `insurer_admin`، `head_office_ops`، `system_admin`، `auditor` محدود می‌شوند (second layer). اما permission اصلی همچنان `rm:claims:summary` است. `permissions.ts` — هیچ `rm:admin:rebuild` در `PermissionKey` type تعریف نشده است.
- **وضعیت**: ✅ تأیید شد — AbacGuard یک layer اضافی اضافه می‌کند اما permission اصلی همچنان اشتباه است.

### ۵.۲ عدم DLQ monitoring endpoint
- **اندپوینت**: `GET /health`
- **اشکال**: health شامل `dlqCount` و `lastProcessedAt` است اما هیچ endpoint برای list یا replay DLQ messages وجود ندارد. اگر event‌هایی در DLQ باشند، admin باید بتواند آن‌ها را ببیند و replay کند.
- **کد**: `health.controller.ts` (lines 8-26) — فقط `GET /health` با `dlqCount` در components. `readmodel.service.ts:getHealthMetrics` (lines 620-626) — `dlq?.getDLQStats()` فقط count را برمی‌گرداند. هیچ `GET /rm/admin/dlq` یا `POST /rm/admin/dlq/replay` endpoint وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم projection status endpoint
- **اندپوینت**: `GET /health`
- **اشکال**: health فقط `lastProcessedAt` را نشان می‌دهد. هیچ endpoint برای دریافت projection status تفصیلی (مثلاً تعداد records در هر projection، lag per partition، error count) وجود ندارد.
- **کد**: `readmodel.service.ts:getHealthMetrics` (lines 600-640) — return `{ db, kafka, dlqCount, lastProcessedAt }`. `consumerLag` در return type تعریف شده (line 605: `consumerLag?: number`) اما هرگز مقداردهی نمی‌شود. هیچ شمارش records per projection وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ (جدید) Kafka status در health unreliable است
- **اندپوینت**: `GET /health`
- **اشکال**: `getHealthMetrics` برای بررسی Kafka فقط چک می‌کند که `this.consumer` object وجود دارد یا خیر. اگر consumer disconnect شده باشد اما object هنوز موجود باشد، status "ok" نشان داده می‌شود. این یک false positive است.
- **کد**: `readmodel.service.ts` lines 615-618:
  ```typescript
  let kafkaStatus: 'ok' | 'error' | 'unknown' = 'unknown';
  if (this.consumer) {
    kafkaStatus = 'ok'; // rough approximation; consumer object exists
  }
  ```
  هیچ check برای connected status یا heartbeat وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۵.۵ (جدید) consumerLag در return type تعریف شده اما هرگز مقداردهی نمی‌شود
- **اندپوینت**: `GET /health`
- **اشکال**: `getHealthMetrics` در return type خود `consumerLag?: number` تعریف کرده است اما این فیلد هرگز در بدنه متد مقداردهی نمی‌شود و در response health هم نمایش داده نمی‌شود. این یک dead field است که نشان‌دهنده intent اولیه برای پیاده‌سازی lag monitoring بوده اما تکمیل نشده است.
- **کد**: `readmodel.service.ts` line 605 — `consumerLag?: number` در return type. lines 606-639 — `consumerLag` هرگز set نمی‌شود. `health.controller.ts` (lines 19-24) — `consumerLag` در response components نیست.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۶. Design و Architecture

### ۶.۱ نبود get fraud case by ID و get complaint by ID
- **اندپوینت**: `GET /rm/fraud/cases`، `GET /rm/complaints`
- **اشکال**: فقط list endpoints برای fraud و complaints وجود دارد. هیچ `GET /rm/fraud/cases/:caseId` یا `GET /rm/complaints/:complaintId` وجود ندارد. برای دریافت جزئیات یک fraud case یا complaint، باید از list با pagination استفاده کرد.
- **کد**: `readmodel.controller.ts` — هیچ `@Get('/rm/fraud/cases/:claimId')` یا `@Get('/rm/complaints/:complaintId')` وجود ندارد. `readmodel.service.ts` — هیچ `getFraudCase` یا `getComplaint` متد جداگانه وجود ندارد. فقط `listFraudCases` و `listComplaintsOps`.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم cursor-based pagination
- **اندپوینت**: `GET /rm/claims`، `GET /rm/fraud/cases`، `GET /rm/complaints`
- **اشکال**: pagination فقط offset-based است. برای حجم بالای داده، offset-based pagination کند می‌شود (OFFSET بالا = scan زیاد). cursor-based pagination برای read model با حجم بالا ضروری است.
- **کد**: `readmodel.controller.ts:list` (lines 79-80) — `lim` و `off` از query params. `readmodel.service.ts:listClaims` (line 547) — `.limit(params.limit).offset(params.offset)`. تمام سه list method از offset-based pagination استفاده می‌کنند.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم caching layer
- **اندپوینت**: `GET /rm/claims/summary`
- **اشکال**: summary endpoint در هر request محاسبه می‌شود. هیچ caching layer (مثلاً Redis با TTL) وجود ندارد. summary می‌تواند cached شود چون داده‌ها به‌صورت periodical update می‌شوند.
- **کد**: `readmodel.service.ts:getSummary` (lines 557-572) — در هر فراخوانی `GROUP BY` query اجرا می‌کند. هیچ Redis cache یا in-memory cache وجود ندارد. `app.module.ts` — هیچ cache module import نشده است.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ (جدید) reinsurance events ممکن است claim records ناقص ایجاد کنند
- **اندپوینت**: `POST /rm/admin/rebuild` (indirect — از طریق Kafka consumer)
- **اشکال**: `upsertRmClaimReinsurance` اگر claimId در `rm_claims_cases` وجود نداشته باشد، یک record جدید با status `'pending_recovery_data'` و `claimNumber: null`، `policyId: null` ایجاد می‌کند. اگر reinsurance event قبل از claim event برسد، یک record ناقص در read model ایجاد می‌شود که در query‌های `GET /rm/claims` با status نامعتبر نمایش داده می‌شود.
- **کد**: `readmodel.service.ts:upsertRmClaimReinsurance` (lines 226-288) — lines 242-250:
  ```typescript
  const row = existing
    ? { ...existing }
    : repo.create({
        claimId,
        tenantId: envelope.tenantId,
        claimNumber: null,
        policyId: null,
        status: 'pending_recovery_data',
      });
  ```
  هیچ validation برای اینکه آیا claim واقعاً وجود دارد انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۶.۵ (جدید) ComplaintAttachmentAdded event مصرف می‌شود اما هیچ attachment data ذخیره نمی‌شود
- **اندپوینت**: (indirect — از طریق Kafka consumer)
- **اشکال**: `applyEvent` برای `ComplaintAttachmentAdded` event، `upsertRmComplaint` را فراخوانی می‌کند. اما `upsertRmComplaint` هیچ فیلد attachment را update نمی‌کند چون `RmComplaintOps` entity هیچ فیلد attachment ندارد. نتیجه: event مصرف و idempotency mark می‌شود اما هیچ attachment data در read model ذخیره نمی‌شود. این یک silent data loss است.
- **کد**: `readmodel.service.ts:applyEvent` (lines 437-443) — `ComplaintAttachmentAdded` به `upsertRmComplaint` route می‌شود. `upsertRmComplaint` (lines 360-417) — هیچ reference به attachment وجود ندارد. `RmComplaintOps.ts` — هیچ attachment field در entity وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید — silent data loss)

### ۶.۶ (جدید) status transition validation ناقص است
- **اندپوینت**: (indirect — از طریق Kafka consumer)
- **اشکال**: `isValidStatusTransition` فقط transition‌های از terminal state‌ها را block می‌کند. اما transition‌های نامعتبر از non-terminal state‌ها را بررسی نمی‌کند. مثلاً `ClaimApproved` در terminal map نیست، پس از status `approved` هر event type مجاز است — حتی `ClaimRegistered` که باید block شود. همچنین `ClaimSubmitted` نیز در map نیست.
- **کد**: `readmodel.service.ts:isValidStatusTransition` (lines 145-156):
  ```typescript
  const terminal: Record<string, string[]> = {
    ClaimRejected: ['ClaimPaid', 'ClaimClosed'],
    ClaimPaid: ['ClaimClosed'],
    ClaimClosed: [],
    FraudCaseClosed: ['FraudScoreComputed', 'FraudCaseOpened'],
    ComplaintResolved: ['ComplaintCreated', 'ComplaintEscalated', 'ComplaintSlaBreached', 'ComplaintStatusChanged'],
  };
  ```
  `ClaimApproved`، `ClaimSubmitted`، `ClaimAssessed` و بسیاری از status‌ها در map نیستند. برای این status‌ها، `blockedNext` برابر `[]` می‌شود و تمام transition‌ها مجاز هستند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ ~~عدم یکپارچه‌سازی با reporting-service~~ (اصلاح شد)
- ~~**اشکال**: reporting-service احتمالاً برای گزارش‌های cross-domain از read model استفاده می‌کند. اما claims-readmodel-service فقط claims، fraud و complaints را پوشش می‌دهد. AML alerts و reinsurance data در read model وجود ندارند. این باعث می‌شود reporting-service نتواند گزارش‌های یکپارچه Risk & Compliance تولید کند.~~
- **کد**: `readmodel.service.ts:upsertRmClaimReinsurance` (lines 226-288) — reinsurance data (`riContractId`، `riRecoverableAmount`، `riRecoveredAmount`، `riCurrency`، `riLastIdentifiedAt`، `riLastReceivedAt`) در `RmClaimCase` entity ذخیره می‌شود. `applyEvent` (lines 445-448) — `RecoveryIdentified` و `RecoveryReceived` event‌ها پردازش می‌شوند. `RmClaimCase.ts` lines 63-82 — فیلدهای reinsurance در entity. اما AML alerts هنوز پوشش داده نمی‌شوند.
- **وضعیت**: ~~اصلاح شد~~ — **اصلاح**: reinsurance data اکنون در read model موجود است (embedded در claims entity). اما AML alerts همچنان پوشش داده نمی‌شوند. نقص فقط برای AML باقی می‌ماند.

### ۷.۲ عدم دسترسی broker-portal به read model
- **اشکال**: claims-readmodel-service از `rm:claims:view` permission استفاده می‌کند. مشخص نیست آیا broker-portal-bff به این permission دسترسی دارد یا خیر. اگر broker بخواهد claims مرتبط با policies خود را ببیند، باید از claims-service مستقیم query کند که load بیشتری ایجاد می‌کند.
- **کد**: `permissions.ts` lines 7-18 — `ROLE_TO_PERMISSIONS` map شامل `broker`، `broker_agent` یا `broker_portal` نیست. `abac.guard.ts:permissionsForRoles` (lines 75-87) — هیچ broker role در map وجود ندارد. نتیجه: broker هیچ permission ای برای read model ندارد.
- **وضعیت**: ✅ تأیید شد

### ۷.۳ ~~عدم event source مشخص برای projection~~ (اصلاح شد)
- ~~**اشکال**: مشخص نیست read model از کدام event source projection می‌شود. claims از claims-service، fraud از fraud-service و complaints از complaints-service. اما اگر یکی از این سرویس‌ها event‌ها را با schema متفاوت publish کند، projection می‌تواند break شود. هیچ schema validation یا contract checking در API تعریف نشده است.~~
- **کد**: `readmodel.service.ts` lines 15-28 — `EventEnvelopeSchema` (Zod) تمام event envelope را validate می‌کند: `eventId`، `eventType`، `eventVersion`، `occurredAt`، `producer`، `correlationId`، `tenantId`، `subject`، `payload`. `processMessage` (lines 469-476) — `EventEnvelopeSchema.safeParse(parsed)` قبل از پردازش اعمال می‌شود. event‌های نامعتبر به DLQ فرستاده می‌شوند. `applyEvent` (line 450) — unknown `eventType` throw می‌کند و به DLQ می‌رود. **اما** `payload` با `z.unknown()` تعریف شده (line 27) — یعنی payload structure اصلاً validate نمی‌شود.
- **وضعیت**: ~~اصلاح شد~~ — **اصلاح**: envelope schema validation با Zod پیاده‌سازی شده است. اما payload structure اعتبارسنجی نمی‌شود (`z.unknown()`). نقص فقط برای payload validation باقی می‌ماند.

### ۷.۴ ~~عدم multi-tenant isolation در rebuild~~ (اصلاح شد)
- ~~**اشکال**: `POST /rm/admin/rebuild` فقط `aggregateId` را می‌گیرد. هیچ `tenantId` در request وجود ندارد. اگر read model multi-tenant باشد، rebuild باید tenant-scoped باشد تا از rebuild cross-tenant جلوگیری شود.~~
- **کد**: `readmodel.controller.ts:rebuild` (lines 189-201) — `const tenantId = this.getTenantId(req);` (line 198) و `this.readModelService.rebuildProjection(body?.aggregateId, tenantId)` (line 199). `TenantGuard` tenant context را از `X-Tenant-Id` header استخراج می‌کند. `AbacGuard` (lines 26-31) cross-tenant access را block می‌کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `rebuildProjection` اکنون `tenantId` را از `TenantGuard` دریافت می‌کند. اما توجه: متد placeholder است و `tenantId` را استفاده نمی‌کند (line 644).

---

## ۸. امنیت و Resilience (بخش جدید)

### ۸.۱ (جدید) عدم rate limiting در query endpoints
- **اندپوینت**: `GET /rm/claims`، `GET /rm/fraud/cases`، `GET /rm/complaints`
- **اشکال**: هیچ rate limiting در query endpoints وجود ندارد. با `limit` تا 200 و `offset` نامحدود، یک client می‌تواند با pagination سریع تمام records را fetch کند. این می‌تواند باعث DB load بالا شود.
- **کد**: `readmodel.controller.ts` — هیچ rate limiter یا throttle decorator در هیچ endpoint وجود ندارد. `main.ts` (lines 6-10) — هیچ rate limiting middleware تنظیم نشده است. `app.module.ts` — هیچ throttle module وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۸.۲ (جدید) Kafka consumer retry بدون max retry count
- **اندپوینت**: (indirect — Kafka consumer lifecycle)
- **اشکال**: `scheduleRetry` با exponential backoff و jitter retry می‌کند اما هیچ max retry count ندارد. `retryCount` فقط برای log استفاده می‌شود (line 91) و reset می‌شود اگر موفق شود (line 94). اگر Kafka دائماً down باشد، consumer بی‌نهایت retry می‌کند که می‌تواند log flooding ایجاد کند.
- **کد**: `readmodel.service.ts:scheduleRetry` (lines 84-100) — `this.retryCount++` و `this.scheduleRetry()` در catch block. هیچ check برای `retryCount > MAX_RETRIES` وجود ندارد. `MAX_RETRY_DELAY_MS = 60000` (line 33) فقط delay را cap می‌کند، نه retry count را.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۸.۳ (جدید) health endpoint بدون authentication اطلاعات حساس نشت می‌دهد
- **اندپوینت**: `GET /health`
- **اشکال**: health endpoint بدون authentication است و `dlqCount` و `lastProcessedAt` را نشت می‌دهد. اگرچه این اطلاعات به‌تنهایی بحرانی نیست، اما در ترکیب با سایر اطلاعات می‌تواند به attacker کمک کند وضعیت سیستم را ارزیابی کند (مثلاً اگر `dlqCount` بالا باشد، نشان‌دهنده مشکل در پردازش event است).
- **کد**: `health.controller.ts` (lines 8-9) — `@Get('/health')` بدون هیچ `@UseGuards` decorator. `app.module.ts` line 32 — `HealthController` در controllers list.
- **وضعیت**: ✅ تأیید شد (نقص جدید — low severity)
