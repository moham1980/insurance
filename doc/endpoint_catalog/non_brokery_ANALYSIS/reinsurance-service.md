# Reinsurance Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: reinsurance-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/reinsurance-service/src/`

---

## ۱. Treaty Management

### ۱.۱ نبود AbacGuard برای data isolation
- **اندپوینت**: `GET /re/treaties`، `POST /re/treaties`
- **اشکال**: reinsurance-service از `EcosystemJwtGuard + PermissionsGuard + TenantGuard` استفاده می‌کند اما AbacGuard وجود ندارد. هیچ attribute-based فیلتری برای محدود کردن دسترسی به treaties بر اساس organization یا business unit وجود ندارد. یک کاربر با `re:treaties:list` می‌تواند تمام treaties را ببیند.
- **کد**: `reinsurance.controller.ts` — تمام endpoints از `@UseGuards(EcosystemJwtGuard, PermissionsGuard, TenantGuard)` استفاده می‌کنند (مثلاً lines 26, 59, 70, 100, 122). `app.module.ts` line 61 — `providers` شامل `AbacGuard` نیست. هیچ فایل `abac.guard.ts` در سرویس وجود ندارد. `permissions.ts` lines 34-127 — فقط سه role تعریف شده: `insurer_admin`، `head_office_ops`، `re_ops`.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم validation هم‌پوشانی بازه زمانی treaties
- **اندپوینت**: `POST /re/treaties`
- **اشکال**: treaty با `effectiveFrom` و `effectiveTo` ایجاد می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا treaty جدید با treaties فعال قبلی برای همان `reinsurerName` و `lineOfBusiness` هم‌پوشانی دارد یا خیر. دو treaty هم‌پوشان می‌تواند به double cession منجر شود.
- **کد**: `reinsurance.service.ts:createTreaty` (lines 216-267) — فقط duplicate `treatyNumber` را چک می‌کند (line 241: `findOne({ where: { tenantId, treatyNumber } })`). هیچ query برای overlapping date ranges وجود ندارد. `ReTreaty` entity دارای `effectiveFrom` (line 37) و `effectiveTo` (line 40) است.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم treaty activation/deactivation
- **اندپوینت**: `PATCH /re/treaties/:treatyId`، `PATCH /re/treaties/:treatyId/close`
- **اشکال**: close treaty وجود دارد اما هیچ activate یا deactivate endpoint وجود ندارد. یک treaty که به‌طور موقت باید غیرفعال شود (مثلاً به دلیل dispute با reinsurer) باید close شود که داده‌های historical را تحت تاثیر قرار می‌دهد. باید suspend/resume capability وجود داشته باشد.
- **کد**: `ReTreaty.ts` line 3 — `ReTreatyStatus = 'draft' | 'active' | 'closed'`. هیچ `'suspended'` یا `'inactive'` status وجود ندارد. `closeTreaty` (lines 348-355) — فقط `status = 'closed'` تنظیم می‌کند. `updateTreaty` (lines 313-346) — می‌تواند `status` را به هر مقداری تغییر دهد (line 341) اما هیچ validation برای transition وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم treaty versioning
- **اندپوینت**: `PATCH /re/treaties/:treatyId`
- **اشکال**: update treaty مستقیماً `retentionRate`، `cessionRate` و `config` را تغییر می‌دهد. هیچ versioning وجود ندارد. اگر terms treaty در طول دوره تغییر کند، نسخه قبلی از دست می‌رود. در reinsurance، history of treaty terms برای audit و reconciliation ضروری است.
- **کد**: `reinsurance.service.ts:updateTreaty` (lines 313-346) — مستقیماً فیلدها را update می‌کند: `t.retentionRate = ...` (line 337)، `t.cessionRate = ...` (line 338)، `t.config = ...` (line 339)، `t.terms = ...` (line 340). `ReTreaty` entity هیچ فیلد `version` یا history table ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ (جدید) عدم validation برای treaty status transition
- **اندپوینت**: `PATCH /re/treaties/:treatyId`
- **اشکال**: `updateTreaty` می‌تواند `status` را به هر مقداری تغییر دهد. یک treaty `'closed'` می‌تواند به `'active'` بازگردانده شود بدون هیچ validation. این می‌تواند باعث شود cessions جدید برای یک treaty بسته شده ایجاد شود.
- **کد**: `reinsurance.service.ts:updateTreaty` line 341 — `if (params.status !== undefined) t.status = params.status;` بدون هیچ transition check. `ReTreatyStatus` فقط `'draft' | 'active' | 'closed'` را تعریف می‌کند اما هیچ enforcement در service وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۲. Cession Management

### ۲.۱ عدم validation cession در برابر treaty limits
- **اندپوینت**: `POST /re/cessions`
- **اشکال**: cession با `cessionPercent`، `cededAmount` و `cededPremium` ایجاد می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا این cession در محدودیت‌های treaty (retention rate، max cession rate) قرار دارد یا خیر. یک cession می‌تواند بیش از treaty limit باشد.
- **کد**: `reinsurance.service.ts:createCession` (lines 505-578) — فقط `treatyId` معتبر بودن را چک می‌کند (lines 533-536). هیچ validation برای `cessionPercent` در برابر `treaty.cessionRate` یا `cededAmount` در برابر treaty limits وجود ندارد. `calculateCessionAmount` (lines 455-503) — این متد برای automatic cessions استفاده می‌شود اما در manual `createCession` فراخوانی نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم automatic cession validation با policy
- **اندپوینت**: `POST /re/cessions/calculate-automatic`
- **اشکال**: calculate-automatic با `policyId` و `sumInsured` فراخوانی می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا policy واقعاً در policy-service وجود دارد یا خیر. همچنین مشخص نیست آیا sumInsured با policy-service sync است یا خیر.
- **کد**: `reinsurance.service.ts:calculateAutomaticCessions` (lines 358-432) — هیچ HTTP call به policy-service وجود ندارد. فقط `policyId`، `sumInsured`، `premium` از request body گرفته می‌شود. **اما** `PolicyConsumer` (policy.consumer.ts) از Kafka `PolicyIssued` event‌ها را مصرف می‌کند و自动 cessions ایجاد می‌کند — این integration event-driven است اما HTTP endpoint هنوز policy existence را validate نمی‌کند.
- **وضعیت**: ✅ تأیید شد — با نکته: PolicyConsumer برای event-driven integration وجود دارد اما HTTP endpoint policy را validate نمی‌کند

### ۲.۳ عدم cession reversal
- **اندپوینت**: `PATCH /re/cessions/:cessionId`
- **اشکال**: cession می‌تواند update شود اما هیچ reversal یا cancel endpoint وجود ندارد. اگر policy cancel شود، cession مربوطه باید reverse شود. هیچ `POST /re/cessions/:cessionId/reverse` وجود ندارد.
- **کد**: `reinsurance.controller.ts` — هیچ `@Post('/re/cessions/:cessionId/reverse')` وجود ندارد. `updateCession` (lines 610-647) — می‌تواند `status` را تغییر دهد اما هیچ reversal logic یا credit note ایجاد نمی‌کند. `ReCessionStatus = 'pending' | 'approved' | 'settled' | 'rejected'` — هیچ `'reversed'` یا `'cancelled'` status وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم bulk cession برای portfolio
- **اندپوینت**: `POST /re/cessions/calculate-automatic`
- **اشکال**: calculate-automatic فقط برای یک policy انجام می‌شود. برای cession یک portfolio کامل (مثلاً تمام policies یک product)، باید برای هر policy به‌طور جداگانه فراخوانی شود. این برای حجم بالا بسیار ناکارآمد است.
- **کد**: `reinsurance.controller.ts:calculateAutomaticCessions` (lines 131-181) — فقط یک `policyId` در body قبول می‌کند. `reinsurance.service.ts:calculateAutomaticCessions` (lines 358-432) — برای یک policy پردازش می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۲.۵ عدم SoD در cession approval
- **اندپوینت**: `POST /re/cessions`، `PATCH /re/cessions/:cessionId/approve`
- **اشکال**: `re:cessions:create` برای create و `re:cessions:approve` برای approve وجود دارد که SoD را رعایت می‌کند. اما `PATCH /re/cessions/:cessionId` با `re:cessions:update` اجازه می‌دهد cession بعد از approve تغییر کند بدون نیاز به re-approval. این یک loophole است.
- **کد**: `reinsurance.controller.ts:updateCession` (lines 261-281) — `@RequirePermissions('re:cessions:update')`. `reinsurance.service.ts:updateCession` (lines 610-647) — هیچ check برای `c.status === 'approved'` قبل از update وجود ندارد. می‌تواند `status`، `cededAmount`، `cessionPercent` و غیره را بعد از approve تغییر دهد.
- **وضعیت**: ✅ تأیید شد

### ۲.۶ (جدید) PolicyConsumer از calculateCessionAmount استفاده نمی‌کند
- **اندپوینت**: (indirect — Kafka consumer `PolicyIssued`)
- **اشکال**: `PolicyConsumer.handlePolicyIssued` (policy.consumer.ts) برای auto-creation cession، مستقیماً `createCession` را فراخوانی می‌کند و `cessionRate` را برای محاسبه `cededPremium` و `cededSumInsured` استفاده می‌کند. اما از `calculateCessionAmount` استفاده نمی‌کند که منطق treaty type-specific (quota_share، excess_of_loss، surplus) را پیاده‌سازی کرده است. نتیجه: برای treaty type‌های non-quota-share، cession amounts نادرست محاسبه می‌شوند.
- **کد**: `policy.consumer.ts:handlePolicyIssued` (lines 108-155) — lines 142-143: `cededPremium: premiumAmount * (this.n(treaty.cessionRate) / 100)` و `cededSumInsured: sumInsured * (this.n(treaty.cessionRate) / 100)`. این فقط برای quota_share درست است. `reinsurance.service.ts:calculateCessionAmount` (lines 455-503) — switch بر روی `treatyType` با cases برای `quota_share`، `excess_of_loss`، `surplus`.
- **وضعیت**: ✅ تأیید شد (نقص جدید — بحرانی)

---

## ۳. Statement و Reconciliation

### ۳.۱ ~~عدم automatic statement generation~~ (اصلاح شد)
- ~~**اشکال**: statement به‌صورت manual با `totals` ایجاد می‌شود. هیچ endpoint برای automatic generation statement از cessions یک دوره وجود ندارد. totals باید به‌صورت manual محاسبه و ارسال شود که به خطای انسانی مستعد است.~~
- **کد**: `reinsurance.service.ts:closePeriod` (lines 1254-1368) — به‌صورت خودکار یک statement با `statementType: 'period_close'` ایجاد می‌کند و `totals` را از cessions approved محاسبه می‌کند (lines 1320-1328): `{ totalCessions, totalCededAmount, totalPremium }`. اما این فقط در `closePeriod` اتفاق می‌افتد، نه به‌صورت standalone.
- **وضعیت**: ~~اصلاح شد~~ — **اصلاح**: `closePeriod` به‌صورت خودکار statement با computed totals ایجاد می‌کند. اما standalone automatic generation (بدون close period) هنوز وجود ندارد.

### ۳.۲ عدم statement lock/finalization
- **اندپوینت**: `PATCH /re/statements/:statementId`
- **اشکال**: statement می‌تواند update شود اما هیچ lock یا finalize endpoint وجود ندارد. یک statement که به reinsurer ارسال شده نباید قابل تغییر باشد. هیچ مکانیزمی برای جلوگیری از update بعد از submission وجود ندارد.
- **کد**: `reinsurance.service.ts:updateStatement` (lines 735-752) — هیچ check برای `s.status === 'finalized'` یا `s.status === 'issued'` قبل از update وجود ندارد. `ReStatementStatus = 'draft' | 'issued' | 'settled' | 'canceled' | 'finalized'` — اما هیچ enforcement برای جلوگیری از update finalized statements وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم reconciliation matching rules قابل پیکربندی
- **اندپوینت**: `POST /re/reconciliations/:reconciliationId/auto-match`
- **اشکال**: auto-match فقط `invoiceId` را می‌گیرد. منطق matching (مثلاً match بر اساس amount، date، reference) در server hardcoded است. هیچ endpoint برای پیکربندی matching rules وجود ندارد. در reinsurance، matching rules باید قابل تنظیم باشد.
- **کد**: `reinsurance.controller.ts:autoMatchInvoice` (lines 805-845) — body فقط `tolerancePercent` را قبول می‌کند (line 830: `tolerancePercent: body?.tolerancePercent`). **نکته**: endpoint catalog می‌گوید `invoiceId` اما کد واقعی `tolerancePercent` می‌گیرد — این یک catalog mismatch است. `reinsurance.service.ts:autoMatchInvoice` (lines 1195-1241) — matching logic hardcoded: amount match (40 points)، reinsurer match (30 points)، invoice date match (30 points). threshold = 70 points.
- **وضعیت**: ✅ تأیید شد — با نکته: `tolerancePercent` قابل پیکربندی است اما matching rules hardcoded هستند. همچنین catalog با کد ناسازگار است.

### ۳.۴ عدم manual match و unmatched listing
- **اندپوینت**: `POST /re/reconciliations/:reconciliationId/auto-match`
- **اشکال**: فقط auto-match پشتیبانی می‌شود. هیچ endpoint برای manual match (assign یک invoice به یک statement item) یا list unmatched items وجود ندارد. در عمل، auto-match همیشه کامل نیست و manual matching ضروری است.
- **کد**: `reinsurance.controller.ts` — هیچ `@Post('/re/reconciliations/:reconciliationId/manual-match')` یا `@Get('/re/reconciliations/:reconciliationId/unmatched')` وجود ندارد. `reinsurance.service.ts` — هیچ `manualMatch` یا `listUnmatched` متد وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ (جدید) registerExternalInvoice در صورت عدم وجود reconciliation یکی ایجاد می‌کند
- **اندپوینت**: `POST /re/reconciliations/invoice/register`
- **اشکال**: `registerExternalInvoice` اگر reconciliation برای statement وجود نداشته باشد، یکی ایجاد می‌کند. این رفتار در endpoint catalog ذکر نشده است. catalog می‌گوید این endpoint برای "Register external invoice" است اما در واقعیت دو عملیات متفاوت انجام می‌دهد: update invoice در reconciliation موجود یا ایجاد reconciliation جدید.
- **کد**: `reinsurance.service.ts:registerExternalInvoice` (lines 1134-1193) — lines 1148-1170: اگر `existingReconciliation` وجود داشته باشد، invoice را update می‌کند و history نگه می‌دارد. lines 1173-1192: اگر وجود نداشته باشد، یک reconciliation جدید با status `'open'` ایجاد می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید — catalog mismatch)

---

## ۴. Recovery Management

### ۴.۱ عدم recovery workflow کامل
- **اندپوینت**: `POST /re/recoveries`، `PATCH /re/recoveries/:recoveryId`
- **اشکال**: recovery create و update می‌شود اما هیچ endpoint برای recovery stages (submitted، acknowledged، partially paid، fully paid، written off) وجود ندارد. `status` فقط به‌صورت string ارسال می‌شود بدون validation enum یا workflow enforcement.
- **کد**: `ReClaimRecovery.ts` line 3 — `ReClaimRecoveryStatus = 'open' | 'in_collection' | 'partially_collected' | 'collected' | 'written_off' | 'closed'`. enum تعریف شده اما `updateRecovery` (lines 953-986) — `r.status = params.status` (line 967) بدون هیچ transition validation. می‌توان از `'collected'` به `'open'` برگشت بدون validation. controller هم `status` را به‌عنوان `ReClaimRecoveryStatus` type می‌گیرد اما TypeScript در runtime validation انجام نمی‌دهد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ ~~عدم link recovery با claims-service~~ (اصلاح شد)
- ~~**اشکال**: recovery با `claimId` و `policyId` ایجاد می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا claim در claims-service وجود دارد یا خیر. همچنین وقتی recovery دریافت می‌شود، claims-service باید مطلع شود تا recovery amount در claim settlement اعمال شود. هیچ event یا webhook برای این sync وجود ندارد.~~
- **کد**: `reinsurance.service.ts:publishRecoveryIdentified` (lines 146-173) — event `insurance.ri.recovery_identified` با `RecoveryIdentified` eventType را publish می‌کند. `publishRecoveryReceived` (lines 175-201) — event `insurance.ri.recovery_received` با `RecoveryReceived` eventType را publish می‌کند. `createRecovery` (lines 873-924) — `publishRecoveryIdentified` را فراخوانی می‌کند. `updateRecovery` (lines 953-986) — `publishRecoveryReceived` را وقتی `recoveredAmount` تغییر می‌کند یا status به `partially_collected`/`collected` می‌رسد فراخوانی می‌کند. **اما** هیچ validation برای existence claim در claims-service وجود ندارد.
- **وضعیت**: ~~اصلاح شد~~ — **اصلاح**: event‌های `RecoveryIdentified` و `RecoveryReceived` از طریق Outbox publish می‌شوند که claims-service/claims-readmodel-service می‌تواند مصرف کند. اما validation وجود claim هنوز انجام نمی‌شود.

### ۴.۳ عدم recovery aging report
- **اندپوینت**: `GET /re/recoveries`
- **اشکال**: لیست recoveries فقط فیلتر `treatyId`، `status` و `claimId` را پشتیبانی می‌کند. هیچ aging report (recoveries بر اساس days outstanding) وجود ندارد. در reinsurance، aging analysis برای follow-up recoveries ضروری است.
- **کد**: `reinsurance.controller.ts:listRecoveries` (lines 442-466) — query params فقط `treatyId`، `status`، `claimId`، `limit`، `offset`. `reinsurance.service.ts:listRecoveries` (lines 930-951) — فقط این فیلترها در WHERE. `ReClaimRecovery` entity دارای `createdAt` (line 52) و `nextFollowUpAt` (line 43) است اما هیچ aging computation وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Ticket Management

### ۵.۱ عدم SLA breach notification
- **اندپوینت**: `POST /re/tickets`
- **اشکال**: ticket با `slaResponseDueAt` ایجاد می‌شود اما هیچ مکانیزمی برای notification خودکار وقتی SLA breach شود وجود ندارد. SLA فقط در creation set می‌شود اما monitoring و alerting در API تعریف نشده است.
- **کد**: `reinsurance.service.ts:createTicket` (lines 989-1031) — `slaResponseDueAt` set می‌شود (lines 1009-1013). `ReTicket` entity دارای `slaResponseDueAt` (line 25) است. هیچ scheduled job یا background worker برای SLA monitoring وجود ندارد. هیچ event برای SLA breach publish نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم ticket close endpoint
- **اندپوینت**: `PATCH /re/tickets/:ticketId`
- **اشکال**: ticket می‌تواند update شود (status و summary) اما هیچ dedicated close endpoint وجود ندارد. close باید با `PATCH` و `status: "closed"` انجام شود اما هیچ validation ای برای بررسی آیا ticket واقعاً resolved است (مثلاً reconciliation matched) قبل از close وجود ندارد.
- **کد**: `reinsurance.controller.ts:updateTicket` (lines 545-558) — `@Patch('/re/tickets/:ticketId')` با `re:tickets:update`. `reinsurance.service.ts:updateTicket` (lines 1069-1078) — `if (params.status === 'resolved' && !t.resolvedAt) t.resolvedAt = new Date()` (line 1074). `ReTicketStatus = 'open' | 'in_review' | 'resolved' | 'rejected'` — هیچ `'closed'` status وجود ندارد. هیچ validation برای reconciliation status قبل از resolve وجود ندارد.
- **وضعیت**: ✅ تأیید شد — با نکته: status `'closed'` در entity تعریف نشده، فقط `'resolved'`

### ۵.۳ عدم ticket priority و category
- **اندپوینت**: `POST /re/tickets`
- **اشکال**: ticket فقط `reasonCode` و `summary` دارد. هیچ فیلدی برای `priority` (urgent، high، medium، low) یا `category` (dispute، information request، adjustment) وجود ندارد. این برای triage و routing tickets ضروری است.
- **کد**: `ReTicket.ts` — فیلدها: `reasonCode` (line 19)، `status` (line 22)، `slaResponseDueAt` (line 25)، `assignedTo` (line 28)، `summary` (line 31)، `resolvedAt` (line 34). هیچ `priority` یا `category` field وجود ندارد. `createTicket` (lines 989-1031) — هیچ پارامتر `priority` یا `category` نمی‌گیرد.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Export و Period Close

### ۶.۱ عدم pagination در export
- **اندپوینت**: `GET /re/export`
- **اشکال**: export با limit‌های جداگانه برای هر entity (default: 200) انجام می‌شود اما هیچ cursor یا pagination mechanism وجود ندارد. اگر records از limit بیشتر باشد، داده‌های باقی‌مانده قابل دسترسی نیست.
- **کد**: `reinsurance.service.ts:exportSnapshot` (lines 832-870) — `clampInt` برای هر limit با max 2000 (lines 853-858). `find` با `take` (lines 861-866) — فقط اولین N records را برمی‌گرداند. هیچ offset یا cursor وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم period close validation
- **اندپوینت**: `POST /re/periods/close`
- **اشکال**: period close با `treatyId` و `periodEnd` انجام می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا تمام cessions، statements و reconciliations برای آن دوره complete هستند یا خیر. یک دوره می‌تواند close شود در حالی که cessions یا statements هنوز pending هستند.
- **کد**: `reinsurance.service.ts:closePeriod` (lines 1254-1368) — فقط cessions با `status: 'approved'` را پردازش می‌کند (line 1295). cessions با `status: 'pending'` یا `'rejected'` silently نادیده گرفته می‌شوند. هیچ warning یا error برای pending cessions وجود ندارد. هیچ check برای reconciliations باز یا statements بدون issue وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم period reopen
- **اندپوینت**: `POST /re/periods/close`
- **اشکال**: period close یک‌طرفه است. اگر بعد از close خطایی کشف شود، هیچ endpoint برای reopen period وجود ندارد. در reinsurance، reopen period برای correction گاهی ضروری است.
- **کد**: `reinsurance.controller.ts` — هیچ `@Post('/re/periods/reopen')` وجود ندارد. `closePeriod` (lines 1254-1368) — cessions را به `'settled'` تغییر می‌دهد و statement با status `'finalized'` ایجاد می‌کند. هیچ راهی برای برگرداندن این تغییرات وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ (جدید) closePeriod از statementType غیرمجاز استفاده می‌کند
- **اندپوینت**: `POST /re/periods/close`
- **اشکال**: `closePeriod` statement با `statementType: 'period_close'` ایجاد می‌کند (line 1334). اما `ReStatement` entity فقط `statementType: 'bordereau' | 'settlement'` را تعریف کرده است (line 20). `'period_close'` در union type تعریف نشده است. این یک type safety violation است که در runtime باعث مشکل نمی‌شود چون TypeScript types در runtime حذف می‌شوند، اما در schema level مشکل‌ساز است.
- **کد**: `reinsurance.service.ts:closePeriod` line 1334 — `statementType: 'period_close' as any`. `ReStatement.ts` line 20 — `statementType!: 'bordereau' | 'settlement'`. استفاده از `as any` برای bypass type check.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ ~~عدم یکپارچه‌سازی با policy-service برای automatic cession~~ (رفع شد)
- ~~**اشکال**: `POST /re/cessions/calculate-automatic` با `policyId` فراخوانی می‌شود اما هیچ event-driven integration با policy-service وجود ندارد. وقتی policy صادر یا endorse می‌شود، باید به‌طور خودکار cession calculate شود. این sync در API تعریف نشده است.~~
- **کد**: `policy.consumer.ts` (lines 1-161) — `PolicyConsumer` از Kafka topic `insurance.policy.events` مصرف می‌کند (line 56). `handlePolicyIssued` (lines 108-155) — برای هر `PolicyIssued` event، active treaties را پیدا می‌کند و `createCession` را فراخوانی می‌کند. `consumeOnce` (line 86) برای idempotency استفاده می‌شود.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `PolicyConsumer` از Kafka `PolicyIssued` event‌ها را مصرف و به‌طور خودکار cession ایجاد می‌کند. اما نکته: PolicyConsumer از `calculateCessionAmount` استفاده نمی‌کند (نقص ۲.۶).

### ۷.۲ ~~عدم یکپارچه‌سازی با claims-service برای recovery~~ (رفع شد)
- ~~**اشکال**: recovery با `claimId` ایجاد می‌شود اما وقتی recovery amount دریافت می‌شود، claims-service باید مطلع شود. هیچ event یا webhook برای sync recovery با claim settlement وجود ندارد. این باعث می‌شود settlement amount در claims-service نادرست باشد.~~
- **کد**: `reinsurance.service.ts:publishRecoveryIdentified` (lines 146-173) — event `insurance.ri.recovery_identified` را با payload شامل `recoverableAmount`، `currency`، `claimId` publish می‌کند. `publishRecoveryReceived` (lines 175-201) — event `insurance.ri.recovery_received` را با payload شامل `amount`، `currency`، `claimId` publish می‌کند. `claims-readmodel-service` این event‌ها را در `upsertRmClaimReinsurance` مصرف می‌کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event‌های `RecoveryIdentified` و `RecoveryReceived` از طریق Outbox publish می‌شوند.

### ۷.۳ ~~عدم یکپارچه‌سازی با billing-service برای ceded premium~~ (رفع شد)
- ~~**اشکال**: cession شامل `cededPremium` است اما هیچ sync با billing-service وجود ندارد. ceded premium باید در billing و settlement با reinsurer منعکس شود. هیچ event برای این sync تعریف نشده است.~~
- **کد**: `reinsurance.service.ts:publishCededCalculated` (lines 49-81) — event `insurance.ri.ceded_calculated` را با payload شامل `grossAmount`، `cededAmount`، `retainedAmount`، `currency`، `counterpartyId` publish می‌کند. `createCession` (line 572) و `updateCession` (line 640) و `approveCession` (line 659) همگی `publishCededCalculated` را فراخوانی می‌کنند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event `CededCalculated` از طریق Outbox publish می‌شود.

### ۷.۴ عدم یکپارچه‌سازی با reporting-service
- **اشکال**: `GET /re/export` یک snapshot برمی‌گرداند اما این snapshot برای reporting-service به‌صورت real-time قابل استفاده نیست. reporting-service باید بتواند reinsurance data را به‌صورت query-based دریافت کند نه فقط snapshot.
- **کد**: `reinsurance.controller.ts:exportSnapshot` (lines 666-701) — فقط یک snapshot با limit برمی‌گرداند. هیچ streaming یا query-based API برای reporting-service وجود ندارد. هیچ Kafka topic برای real-time reporting تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۷.۵ ~~عدم notification به stakeholder برای period close~~ (رفع شد)
- ~~**اشکال**: وقتی period close می‌شود، هیچ notification به finance team یا reinsurer از طریق notification-service ارسال نمی‌شود. period close فقط در سیستم ثبت می‌شود.~~
- **کد**: `reinsurance.service.ts:publishPeriodClosed` (lines 113-144) — event `insurance.reinsurance.period_closed` را با payload شامل `treatyId`، `statementId`، `periodEnd`، `totals`، `closedBy`، `closedAt`، `notes` publish می‌کند. `closePeriod` (line 1345) — `publishPeriodClosed` را فراخوانی می‌کند. notification-service می‌تواند این event را مصرف کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event `ReinsurancePeriodClosed` از طریق Outbox publish می‌شود.

---

## ۸. امنیت و Resilience (بخش جدید)

### ۸.۱ (جدید) EcosystemJwtGuard fallback HS256 بدون issuer/audience validation
- **اندپوینت**: تمام endpoints (except `/health`)
- **اشکال**: در fallback HS256 path، `jwt.verify(token, this.jwtSecret)` بدون `issuer` و `audience` validation فراخوانی می‌شود. در مسیر RS256، issuer و audience چک می‌شوند اما در fallback نه. این یعنی یک token معتبر با issuer/audience نامناسب نیز پذیرفته می‌شود.
- **کد**: `ecosystem-jwt.guard.ts` lines 73-76:
  ```typescript
  const payload = jwt.verify(token, this.jwtSecret) as any;
  request.user = payload;
  return true;
  ```
  مقایسه با RS256 path (lines 59-63) که `issuer` و `audience` را چک می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید — امنیتی)

### ۸.۲ (جدید) default JWT secret ناامن
- **اندپوینت**: تمام endpoints (except `/health`)
- **اشکال**: `EcosystemJwtGuard` constructor از `process.env.JWT_SECRET || 'default-secret-change-in-production'` استفاده می‌کند. اگر `JWT_SECRET` تنظیم نشده باشد، یک secret پیش‌فرض ناامن استفاده می‌شود. در production این یک vulnerability بحرانی است.
- **کد**: `ecosystem-jwt.guard.ts` line 27 — `this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';`
- **وضعیت**: ✅ تأیید شد (نقص جدید — امنیتی بحرانی)

### ۸.۳ (جدید) health endpoint Kafka check در هر فراخوانی یک Kafka admin ایجاد می‌کند
- **اندپوینت**: `GET /health`
- **اشکال**: `HealthController.health` در هر فراخوانی یک `new Kafka()` و `kafka.admin()` ایجاد می‌کند، connect و disconnect می‌کند. این برای health check که ممکن است هر چند ثانیه فراخوانی شود، ناکارآمد است و می‌تواند resource leak ایجاد کند.
- **کد**: `health.controller.ts` lines 30-37:
  ```typescript
  const kafka = new Kafka({ clientId: 'reinsurance-health-check', brokers: ... });
  const admin = kafka.admin();
  await admin.connect();
  await admin.describeCluster();
  await admin.disconnect();
  ```
  هیچ caching یا reuse از admin client وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید — performance)
