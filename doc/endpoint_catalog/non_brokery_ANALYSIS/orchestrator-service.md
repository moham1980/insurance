# Orchestrator Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: orchestrator-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/orchestrator-service/src/`

---

## ۱. Saga Orchestration و چرخه حیات

### ۱.۱ عدم idempotency در start saga
- **اندپوینت**: `POST /orchestrations/sagas`
- **اشکال**: start saga با `sagaType` و context انجام می‌شود اما هیچ idempotency key‌ای وجود ندارد. اگر کلاینت به دلیل timeout retry کند، دو saga برای همان claim/policy ایجاد می‌شود. باید با `claimId`/`policyId`/`complaintId` به‌عنوان idempotency key از duplicate جلوگیری شود.
- **کد**: `orchestrator.service.ts:startSaga` (سطر ۱۱۰۰-۱۲۶۸) — برای `ClaimPayment` (سطر ۱۱۱۳-۱۱۱۹) متد `startClaimPaymentSaga` فراخوانی می‌شود که در سطر ۱۲۸۹-۱۳۰۰ یک `findExistingSagaByDedupeKey` انجام می‌دهد: `s.claim_id = :claimId AND s.status IN ('started', 'waiting', 'compensating')` و اگر موجود باشد همان را برمی‌گرداند. برای `PolicyIssuance` (سطر ۱۱۲۸-۱۱۳۰) — `dedupeKey = 'PolicyIssuance:${policyId}'` و `findExistingSagaByDedupeKey` (سطر ۱۰۸۵-۱۰۹۸) که با `context @> :dedupeJson::jsonb` جستجو می‌کند. برای `ComplaintHandling`/`ComplaintResolution` (سطر ۱۱۹۰-۱۱۹۲) و `ReinsuranceRecovery` (سطر ۱۲۳۷-۱۲۳۹) همین مکانیزم وجود دارد.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: همه saga type‌ها dedupe دارند. `ClaimPayment` با `claimId` و `PolicyIssuance`/`ComplaintResolution`/`ReinsuranceRecovery` با `dedupeKey` در context. اگر saga موجود با status `started`/`waiting`/`compensating` باشد، همان برگردانده می‌شود.

### ۱.۲ عدم list/search برای sagas
- **اندپوینت**: `POST /orchestrations/sagas`، `GET /orchestrations/sagas/:sagaId`
- **اشکال**: saga می‌تواند start و get با ID شود اما هیچ `GET /orchestrations/sagas` (list) وجود ندارد. برای monitoring و operations، باید بتوان sagas را بر اساس status، sagaType، tenant و بازه زمانی فیلتر کرد. بدون list، پیدا کردن saga‌های failed یا compensating بسیار دشوار است.
- **کد**: `orchestrations.controller.ts` — فقط `POST /orchestrations/sagas` (سطر ۲۰) و `GET /orchestrations/sagas/:sagaId` (سطر ۱۴۲) وجود دارد. هیچ `GET /orchestrations/sagas` بدون param وجود ندارد. `orchestrator.service.ts` — هیچ متد `listSagas` وجود ندارد. entity `SagaInstance` (`entities/SagaInstance.ts` سطر ۴-۷) index‌های `['sagaType', 'status']`، `['correlationId']`، `['tenantId']`، `['createdAt']` دارد که نشان می‌دهد list query طراحی شده اما endpoint پیاده‌سازی نشده.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم cancel/abort برای saga در حال اجرا
- **اندپوینت**: `POST /orchestrations/sagas/:sagaId/compensation`
- **اشکال**: compensation برای rollback است اما هیچ cancel/abort ساده‌ای برای saga در حال اجرا وجود ندارد. اگر saga در step اول است و نیاز به توقف فوری باشد، باید compensation کامل انجام شود که unnecessary است. یک cancel ساده (بدون compensation) برای step‌های اولیه نیاز است.
- **کد**: `orchestrations.controller.ts` — فقط `POST /orchestrations/sagas/:sagaId/compensation` (سطر ۱۶۵) و `POST /orchestrations/sagas/:sagaId/compensation/retry` (سطر ۲۱۱) وجود دارد. `orchestrator.service.ts:initiateCompensation` (سطر ۱۵۳۹-۱۵۷۲) — `saga.status = 'compensating'` و سپس `executeCompensation` (سطر ۱۵۷۰) که همه step‌های completed را compensate می‌کند. هیچ متد `cancelSaga` بدون compensation وجود ندارد. `completeSaga` (سطر ۱۰۰۲+) فقط status را به `completed` یا `failed` تغییر می‌دهد اما از طریق endpoint قابل دسترسی نیست.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم retry برای saga failed (نه compensation)
- **اندپوینت**: `POST /orchestrations/sagas/:sagaId/compensation/retry`
- **اشکال**: retry فقط برای compensation failed وجود دارد. اگر خود saga (نه compensation) fail شود، هیچ retry‌ای از نقطه شکست وجود ندارد. باید `POST /orchestrations/sagas/:sagaId/retry` برای retry saga از step آخر وجود باشد.
- **کد**: `orchestrator.service.ts:retryCompensation` (سطر ۱۷۰۵-۱۷۴۵) — فقط step‌های با `status: 'compensation_failed'` را retry می‌کند (سطر ۱۷۱۹-۱۷۲۱). هیچ متد `retrySaga` برای retry از step failed وجود ندارد. `SagaStep` entity (`entities/SagaStep.ts` سطر ۳۹-۴۳) فیلدهای `retryCount` و `maxRetries` دارد اما هیچ endpoint‌ای برای retry step وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ عدم timeout قابل پیکربندی برای saga
- **اندپوینت**: `POST /orchestrations/sagas`
- **اشکال**: هیچ timeout‌ای برای saga تعریف نشده. یک saga می‌تواند برای همیشه در وضعیت `started` یا `waiting` باقی بماند (مثلاً منتظر work item که هیچ‌کس complete نکند). timeout per sagaType و auto-escalation ضروری است.
- **کد**: `orchestrator.service.ts:startSaga` (سطر ۱۱۰۰-۱۲۶۸) — هیچ timeout‌ای در saga creation set نمی‌شود. entity `SagaInstance` (`entities/SagaInstance.ts` سطر ۸-۴۹) هیچ فیلد `timeout` یا `expiresAt` ندارد. `SlaMonitorService` (سطر ۲۵-۳۸) یک `setInterval` برای SLA check دارد اما این برای work item‌های overdue است، نه برای saga timeout. `SLA_CHECK_INTERVAL_MS` (سطر ۲۶) قابل پیکربندی است اما SLA per sagaType نیست.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Compensation و Saga Correctness

### ۲.۱ عدم partial compensation
- **اندپوینت**: `POST /orchestrations/sagas/:sagaId/compensation`
- **اشکال**: compensation کل saga را rollback می‌کند. هیچ partial compensation‌ای وجود ندارد. اگر فقط یک step نیاز به rollback دارد (مثلاً payment موفق بود اما notification fail)، باید بتوان فقط آن step را compensate کرد نه کل saga.
- **کد**: `orchestrator.service.ts:executeCompensation` (سطر ۱۵۷۴-۱۶۰۸) — `const completedSteps = steps.filter(s => s.status === 'completed')` (سطر ۱۵۸۰) و سپس `for (const step of completedSteps) { await this.compensateStep(saga, step) }` (سطر ۱۵۸۴-۱۵۹۱). همه step‌های completed compensate می‌شوند. هیچ راهی برای compensate کردن فقط یک step وجود ندارد. `compensateStep` (سطر ۱۶۱۰-۱۶۳۰) به‌صورت جداگانه قابل فراخوانی نیست (private method).
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم compensation step-by-step visibility
- **اندپوینت**: `GET /orchestrations/sagas/:sagaId/compensation/status`
- **اشکال**: compensation status فقط `compensatedSteps` و `totalSteps` را نشان می‌دهد. هیچ visibility‌ای برای اینکه کدام steps compensated شده‌اند و کدام fail کرده‌اند وجود ندارد. برای debugging، باید جزئیات per-step compensation قابل مشاهده باشد.
- **کد**: `orchestrator.service.ts:getCompensationStatus` (سطر ۱۷۴۷-۱۷۶۷) — `steps: SagaStep[]` را برمی‌گرداند (سطر ۱۷۶۱) که شامل `stepName`، `status`، `errorMessage`، `compensatedAt` برای هر step است. همچنین `completedCount`، `failedCount`، `pendingCount` را برمی‌گرداند. بنابراین step-by-step visibility وجود دارد.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `getCompensationStatus` آرایه `steps` را برمی‌گرداند که شامل وضعیت و خطای هر step است.

### ۲.۳ عدم deadlock prevention در concurrent compensation
- **اندپوینت**: `POST /orchestrations/sagas/:sagaId/compensation`، `POST /orchestrations/sagas/:sagaId/compensation/retry`
- **اشکال**: اگر compensation و retry همزمان فراخوانی شوند (مثلاً از دو operator)، race condition ایجاد می‌شود. هیچ optimistic locking‌ای با version number وجود ندارد. باید lock روی sagaId باشد.
- **کد**: `orchestrator.service.ts:initiateCompensation` (سطر ۱۵۳۹-۱۵۷۲) — `saga = await this.sagaRepo.findOne({ where: { sagaId, tenantId } })` (سطر ۱۵۴۰)، سپس `saga.status = 'compensating'` و `await this.sagaRepo.save(saga)` (سطر ۱۵۵۶). هیچ optimistic locking یا version check وجود ندارد. `retryCompensation` (سطر ۱۷۰۵-۱۷۴۵) — همین pattern. اگر دو request همزمان برسند، هر دو `findOne` را اجرا می‌کنند، هر دو status را تغییر می‌دهند و `executeCompensation` را اجرا می‌کنند که می‌تواند به double compensation منجر شود. entity `SagaInstance` هیچ فیلد `version` ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم auto-compensation برای saga failed
- **اندپوینت**: `POST /orchestrations/sagas/:sagaId/compensation`
- **اشکال**: compensation فقط manual است. اگر saga fail شود، باید operator manually compensation را trigger کند. برای saga‌های critical (ClaimPayment)، auto-compensation با policy قابل پیکربندی باید وجود داشته باشد.
- **کد**: `orchestrator.service.ts:completeSaga` (سطر ۱۰۰۲+) — `saga.status = success ? 'completed' : 'failed'` و `saga.errorMessage = errorMessage`. هیچ فراخوانی `initiateCompensation` در `completeSaga` وجود ندارد. `onPaymentEvent` (سطر ۱۰۴۰+) — در صورت خطا `completeSaga(saga, false, ...)` فراخوانی می‌کند (سطر ۱۰۸۰) اما compensation خودکار انجام نمی‌شود. هیچ policy یا configuration برای auto-compensation وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Work Item Management

### ۳.۱ عدم claim قبل از complete
- **اندپوینت**: `POST /work-items/:workItemId/complete`، `POST /work-items/:workItemId/assign`
- **اشکال**: assign و complete جدا هستند اما complete بدون claim قبلی امکان‌پذیر است. اگر دو کاربر همزمان یک work item را complete کنند، race condition ایجاد می‌شود. باید claim (atomic assign) قبل از complete اجباری باشد.
- **کد**: `work-items.controller.ts:complete` (سطر ۸۷-۱۹۷) — هیچ check وجود ندارد که work item باید `assigned` باشد قبل از complete. `orchestrator.service.ts:completeWorkItem` (سطر ۱۳۸۸-۱۵۳۶) — `workItem = await this.workItemRepo.findOne({ where: { workItemId, tenantId } })` (سطر ۱۳۹۷)، سپس `workItem.status = params.decision` (سطر ۱۴۱۲). هیچ بررسی `workItem.assignedTo === params.decidedBy` وجود ندارد. `ALREADY_DECIDED` check (سطر ۱۴۰۶-۱۴۱۰) فقط جلوی double complete را می‌گیرد اما race condition را حل نمی‌کند چون بین `findOne` و `save` فاصله وجود دارد. `WorkflowsController` یک `POST /workflows/work-items/:workItemId/claim` (سطر ۳۱۳) دارد که `assignWorkItem` را فراخوانی می‌کند اما claim از `complete` اجباری نیست.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم reassign و delegate
- **اندپوینت**: `POST /work-items/:workItemId/assign`
- **اشکال**: assign فقط یک بار انجام می‌شود. اگر assignee در دسترس نباشد، هیچ reassign‌ای وجود ندارد. باید `POST /work-items/:workItemId/reassign` برای تغییر assignee وجود داشته باشد.
- **کد**: `work-items.controller.ts:assign` (سطر ۱۹۹-۲۷۰) — `this.orchestratorService.assignWorkItem(...)` را فراخوانی می‌کند. `orchestrator.service.ts:assignWorkItem` (سطر ۱۳۷۵-۱۳۸۶) — `workItem.assignedTo = params.assignedTo` و `workItem.status = WorkItemStatus.in_progress`. هیچ check وجود ندارد که جلوی reassign را بگیرد. در واقع، `assignWorkItem` می‌تواند چند بار فراخوانی شود و هر بار `assignedTo` را تغییر دهد. اما اگر work item قبلاً `approved` یا `rejected` شده باشد، `completeWorkItem` `ALREADY_DECIDED` خطا می‌دهد، ولی `assignWorkItem` چنین check‌ی ندارد و می‌تواند یک work item تصمیم‌شده را reassign کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `assignWorkItem` می‌تواند چند بار فراخوانی شود و reassign انجام دهد. اما delegate (ارجاع به کاربر دیگر با حفظ مسئولیت اصلی) وجود ندارد و reassign روی work item تصمیم‌شده محدود نشده است.

### ۳.۳ عدم bulk complete برای work items
- **اندپوینت**: `POST /work-items/:workItemId/complete`
- **اشکال**: complete فقط برای یک work item است. اگر یک saga چندین work item داشته باشد که همگی approved می‌شوند، باید یکی یکی complete شوند. bulk complete با filter ضروری است.
- **کد**: `work-items.controller.ts` — فقط `POST /work-items/:workItemId/complete` (سطر ۸۷) وجود دارد. `orchestrator.service.ts:completeWorkItem` (سطر ۱۳۸۸) — فقط یک workItem قبول می‌کند. هیچ متد `bulkCompleteWorkItems` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم escalation path برای work items
- **اندپوینت**: `POST /work-items/:workItemId/complete` (decision: `escalated`)
- **اشکال**: decision می‌تواند `escalated` باشد اما مشخص نیست escalated به چه معناست و به چه کسی escalate می‌شود. هیچ endpoint‌ای برای define escalation rules یا auto-escalation بر اساس SLA وجود ندارد.
- **کد**: `orchestrator.service.ts:completeWorkItem` (سطر ۱۴۲۸-۱۴۵۵) — وقتی `decision === 'escalated'`، یک escalation work item با `workItemType: 'fraud_case_escalation'` و `priority: critical` ایجاد می‌شود (سطر ۱۴۳۳-۱۴۴۶). `insurance.saga.work_item.escalated` event منتشر می‌شود (سطر ۱۴۴۷-۱۴۵۵). اما هیچ escalation rule قابل پیکربندی وجود ندارد — همیشه `fraud_case_escalation` type استفاده می‌شود. `SlaMonitorService:processSlaBreaches` (سطر ۲۳۸-۲۸۹) — auto-escalation برای overdue > 48h انجام می‌شود و escalation work item با `workItemType: 'sla_escalation'` ایجاد می‌کند (سطر ۲۵۱). اما threshold 48h hardcoded است.
- **وضعیت**: ✅ تأیید شد — با اصلاح: escalation work item ایجاد می‌شود و auto-escalation برای SLA breach وجود دارد، اما escalation rules قابل پیکربندی نیستند و threshold 48h hardcoded است.

---

## ۴. Special Work Item Creation

### ۴.۱ عدم validation subject با سرویس مبدأ
- **اندپوینت**: `POST /work-items/sanhab-followup`، `POST /work-items/underwriting-review`، `POST /work-items/suspicious-case`، `POST /work-items/override-review`
- **اشکال**: `policyId`، `claimId` در request body ارسال می‌شوند اما هیچ validation‌ای بررسی نمی‌کند که آیا این ID‌ها در سرویس مبدأ (policy-service، claims-service) وجود دارند یا خیر. می‌توان work item برای policy/claim ناموجود ایجاد کرد.
- **کد**: `work-items.controller.ts:createSanhabFollowup` (سطر ۲۷۲-۳۲۹) — فقط `reasonCode` و `inquiry` را validate می‌کند (سطر ۲۸۷). `policyId`/`claimId` بدون validation به `createSanhabFollowupWorkItem` پاس داده می‌شوند. `createUnderwritingReview` (سطر ۳۳۱-۳۸۷) — فقط `policyId` و `reasonCode` را validate می‌کند (سطر ۳۴۶). `createSuspiciousCase` (سطر ۳۸۹-۴۶۵) — فقط `reasonCodes` و `policyId`/`claimId` وجود را بررسی می‌کند (سطر ۴۰۴-۴۰۷). `createOverrideReview` (سطر ۴۶۷-۵۲۶) — فقط `reasonCode` و `policyId`/`claimId` وجود را بررسی می‌کند. هیچ outbound HTTP call به policy-service یا claims-service برای validate ID‌ها وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم duplicate prevention
- **اندپوینت**: `POST /work-items/sanhab-followup`، `POST /work-items/underwriting-review`
- **اشکال**: هیچ جلوگیری از ایجاد duplicate work item وجود ندارد. اگر fraud-service دو بار suspicious-case برای همان claim ایجاد کند، دو work item موازی ایجاد می‌شود. باید با (policyId/claimId + reasonCode) به‌عنوان unique key از duplicate جلوگیری شود.
- **کد**: `orchestrator.service.ts:createSanhabFollowupWorkItem` (سطر ۶۳۷-۷۰۴) — saga جدید با `uuidv4()` ایجاد می‌شود (سطر ۶۴۷) و work item جدید (سطر ۶۷۰). هیچ check برای existing work item با همان `policyId`/`claimId` + `reasonCode` وجود ندارد. `createUnderwritingReviewWorkItem` (سطر ۷۰۶-۷۷۱) — همین. `createSuspiciousCaseWorkItem` (سطر ۸۴۴-۹۲۸) — همین. `createOverrideReviewWorkItem` (سطر ۷۷۳-۸۴۲) — همین. entity `WorkItem` (`entities/WorkItem.ts` سطر ۱۹-۲۴) هیچ unique constraint روی `(claimId, workItemType)` یا `(policyId, workItemType)` ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم generic work item creation
- **اندپوینت**: `POST /work-items/sanhab-followup`، `POST /work-items/underwriting-review`، `POST /work-items/suspicious-case`، `POST /work-items/override-review`
- **اشکال**: هر نوع work item اندپوینت جدا دارد. این design غیرقابل توسعه است. اگر نوع جدید work item نیاز باشد، باید endpoint جدید ایجاد شود. یک `POST /work-items` generic با `type` و `context` قابل توسعه‌تر است.
- **کد**: `work-items.controller.ts` — چهار endpoint جدا: `createSanhabFollowup` (سطر ۲۷۲)، `createUnderwritingReview` (سطر ۳۳۱)، `createSuspiciousCase` (سطر ۳۸۹)، `createOverrideReview` (سطر ۴۶۷). هر کدام permission جدا دارند: `work_items:create_sanhab`، `work_items:create_underwriting`، `work_items:create_suspicious_case`، `work_items:create_override` (`permissions.ts` سطر ۹-۱۲). `WorkItem.workItemType` (`entities/WorkItem.ts` سطر ۳۸-۵۳) ۱۵ نوع دارد که نشان می‌دهد design برای توسعه در نظر گرفته شده اما endpoint‌ها hardcoded هستند.
- **وضعیت**: ✅ تأیید شد

---

## ۵. SLA Monitoring

### ۵.۱ عدم SLA per work item type
- **اندپوینت**: `GET /work-items/sla/breaches`، `GET /work-items/sla/stats/:sagaId`
- **اشکال**: SLA در سطح saga است. هیچ SLA per work item type وجود ندارد. مثلاً sanhab-followup باید SLA ۲۴ ساعت داشته باشد اما underwriting-review ممکن است SLA ۴۸ ساعت داشته باشد. SLA باید per type قابل پیکربندی باشد.
- **کد**: `sla-monitor.service.ts:checkSlaBreaches` (سطر ۴۸-۱۰۶) — `where: { dueDate: LessThan(now), status: Not(In([...])) }` (سطر ۵۹-۶۱). همه work item‌ها با یک logic بررسی می‌شوند. `byWorkItemType` (سطر ۷۶-۸۱) فقط count را برمی‌گرداند، SLA threshold per type نیست. `processSlaBreaches` (سطر ۱۷۵-۳۰۹) — threshold 48h برای escalation hardcoded است (سطر ۲۳۸: `if (overdueHours > 48)`). هیچ configuration table یا env var برای SLA per work item type وجود ندارد. `WorkItem.dueDate` (`entities/WorkItem.ts` سطر ۷۹) set می‌شود اما SLA duration per type قابل پیکربندی نیست.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم auto-escalation
- **اندپوینت**: `POST /work-items/sla/process-breaches`
- **اشکال**: process-breaches manual است. باید operator trigger کند. برای SLA critical، auto-escalation (بدون intervention) ضروری است. یک cron job یا scheduler باید breaches را به‌طور خودکار process کند.
- **کد**: `sla-monitor.service.ts:onModuleInit` (سطر ۲۵-۳۸) — `this.slaTimer = setInterval(async () => { const result = await this.processSlaBreaches() }, intervalMs)` (سطر ۲۷-۳۶). `intervalMs = parseInt(process.env.SLA_CHECK_INTERVAL_MS || '3600000', 10)` (سطر ۲۶) — هر ساعت. `processSlaBreaches` (سطر ۱۷۵-۳۰۹) — auto-escalation برای overdue > 48h (سطر ۲۳۸-۲۸۹): `item.status = WorkItemStatus.escalated` و escalation work item ایجاد می‌شود. بنابراین auto-escalation وجود دارد.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `SlaMonitorService` یک `setInterval` دارد که هر ساعت `processSlaBreaches` را اجرا می‌کند و برای overdue > 48h auto-escalation انجام می‌دهد. اما threshold 48h و interval 1h hardcoded هستند.

### ۵.۳ عدم notification برای SLA breach
- **اندپوینت**: `GET /work-items/sla/breaches`
- **اشکال**: breaches قابل مشاهده است اما هیچ notification‌ای به assignee یا manager ارسال نمی‌شود. باید قبل از breach (مثلاً ۸۰% زمان) warning notification ارسال شود.
- **کد**: `sla-monitor.service.ts:processSlaBreaches` (سطر ۲۱۵-۲۳۵) — `outboxPublisher.publish({ topic: 'insurance.sla.breached', ... })` برای هر overdue work item (سطر ۲۱۵). `insurance.sla.escalated` برای escalation (سطر ۲۶۹-۲۸۸). این event‌ها از طریق outbox به Kafka منتشر می‌شوند و notification-service می‌تواند آن‌ها را consume کند. اما هیچ warning قبل از breach (مثلاً ۸۰% زمان) وجود ندارد — فقط بعد از breach notification ارسال می‌شود.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event‌های `insurance.sla.breached` و `insurance.sla.escalated` از طریق outbox منتشر می‌شوند. اما warning قبل از breach (pre-breach notification) وجود ندارد.

### ۵.۴ عدم SLA dashboard و trends
- **اندپوینت**: `GET /work-items/sla/stats/:sagaId`
- **اشکال**: SLA stats فقط per saga است. هیچ dashboard یا trend‌ای برای SLA در سطح tenant یا sagaType وجود ندارد. برای management، باید trend SLA compliance در طول زمان قابل مشاهده باشد.
- **کد**: `sla-monitor.service.ts:getSlaStats` (سطر ۱۱۱-۱۷۰) — `sagaStatus`، `totalWorkItems`، `completedOnTime`، `breached`، `pendingWithDueDate`، `pendingWithoutDueDate`، `averageResolutionHours` را برمی‌گرداند. همه per saga. هیچ متد برای tenant-level یا sagaType-level SLA stats وجود ندارد. `checkSlaBreaches` (سطر ۴۸-۱۰۶) — `metrics.byWorkItemType` و `metrics.averageOverdueHours` را برمی‌گرداند اما این real-time stats است نه trend در طول زمان.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Workflow Process و تکرار

### ۶.۱ تکرار بین saga و workflow process
- **اندپوینت**: `POST /orchestrations/sagas` و `POST /workflows/processes/:processType/start`
- **اشکال**: دو اندپوینت برای شروع فرآیند وجود دارد. saga با `sagaType` و process با `processType` (همان مقادیر). مشخص نیست تفاوت چیست. این تکرار باعث سردرگمی کلاینت می‌شود. باید یک اندپوینت canonical باشد.
- **کد**: `orchestrations.controller.ts:startSaga` (سطر ۲۰-۱۴۰) و `workflows.controller.ts:startProcess` (سطر ۲۰-۲۱۷) — هر دو `this.orchestratorService.startSaga(...)` را فراخوانی می‌کنند (سطر ۷۶ و ۱۳۸). `startProcess` فقط `processType` را به `sagaType` تبدیل می‌کند و `body.subject` را به `claimId`/`policyId`/etc تبدیل می‌کند. response شامل هم `processInstanceId` و هم `sagaId` است (سطر ۱۶۳-۱۶۸). این تکرار کامل است.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ تکرار work items بین دو controller
- **اندپوینت**: `GET /work-items` و `GET /workflows/work-items`، `POST /work-items/:workItemId/complete` و `POST /workflows/work-items/:workItemId/complete`
- **اشکال**: work-items.controller و workflows.controller هر دو work item operations دارند. `complete` در هر دو وجود دارد. مشخص نیست کدام canonical است. این تکرار می‌تواند به inconsistent state منجر شود.
- **کد**: `work-items.controller.ts:list` (سطر ۲۴) و `workflows.controller.ts:listWorkItems` (سطر ۲۶۴) — هر دو `orchestratorService.listWorkItems` را فراخوانی می‌کنند. `work-items.controller.ts:complete` (سطر ۸۷) و `workflows.controller.ts:completeWorkItem` (سطر ۴۰۴) — هر دو `orchestratorService.completeWorkItem` را فراخوانی می‌کنند. `workflows.controller.ts` یک `claimWorkItem` (سطر ۳۱۳) دارد که `assignWorkItem` را فراخوانی می‌کند — معادل `assign` در `work-items.controller.ts` (سطر ۱۹۹). هر دو controller به همان service وصل می‌شوند پس inconsistent state ایجاد نمی‌شود، اما API surface تکرار دارد.
- **وضعیت**: ✅ تأیید شد — با اصلاح: هر دو controller به همان `OrchestratorService` وصل می‌شوند پس inconsistent state ایجاد نمی‌شود، اما API surface تکرار دارد و سردرگمی کلاینت ایجاد می‌کند.

### ۶.۳ عدم یکپارچه‌سازی با workflow-engine-service و workflow-service
- **اندپوینت**: `POST /workflows/processes/:processType/start`
- **اشکال**: orchestrator-service خودش workflow process را start می‌کند. مشخص نیست آیا از workflow-engine-service یا workflow-service استفاده می‌کند یا مستقل است. اگر مستقل باشد، سه موتور workflow موازی وجود دارد.
- **کد**: `workflows.controller.ts:startProcess` (سطر ۲۰-۲۱۷) — `this.orchestratorService.startSaga(...)` را فراخوانی می‌کند (سطر ۱۳۸). `orchestrator.service.ts:startSaga` (سطر ۱۱۰۰-۱۲۶۸) — کاملاً مستقل عمل می‌کند. هیچ outbound HTTP call به workflow-engine-service یا workflow-service وجود ندارد. `publishSagaEvent` (سطر ۴۸۸-۵۰۳) event‌ها را به Kafka منتشر می‌کند. orchestrator-service خودش یک saga engine مستقل است با `SagaInstance` و `SagaStep` entity‌های جداگانه.
- **وضعیت**: ✅ تأیید شد

---

## ۷. امنیت و کنترل دسترسی

### ۷.۱ عدم SoD بین saga start و compensate
- **اندپوینت**: `POST /orchestrations/sagas` (perm: `orchestrations:saga_start`)، `POST /orchestrations/sagas/:sagaId/compensation` (perm: `orchestrations:saga_compensate`)
- **اشکال**: saga_start و saga_compensate permission جدا دارند که خوب است. اما هیچ enforcement‌ای وجود ندارد که کسی که saga را start کرده نمی‌تواند compensate کند. برای SoD، compensator باید کاربر متفاوتی از starter باشد.
- **کد**: `orchestrations.controller.ts:startSaga` (سطر ۲۲) — `@RequirePermissions('orchestrations:saga_start')`. `initiateCompensation` (سطر ۱۶۷) — `@RequirePermissions('orchestrations:saga_compensate')`. `permissions.ts` (سطر ۲۰-۳۷) — `insurer_admin` و `head_office_ops` هر دو `saga_start` و `saga_compensate` دارند. `claims_handler` (سطر ۵۴) فقط `saga_start` دارد. هیچ check وجود ندارد که `actor` در `initiateCompensation` با `actor` در `startSaga` متفاوت باشد. `initiateCompensation` (سطر ۱۹۰) — `triggeredBy` پارامتر دارد اما فقط در log و event استفاده می‌شود، نه برای SoD enforcement.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم validation decidedBy با token
- **اندپوینت**: `POST /work-items/:workItemId/complete`، `POST /workflows/work-items/:workItemId/complete`
- **اشکال**: `decidedBy` در request body ارسال می‌شود و هیچ validation‌ای بررسی نمی‌کند که آیا decidedBy با identity token مطابقت دارد یا خیر. یک کاربر می‌تواند به‌جای کاربر دیگر decision ثبت کند.
- **کد**: `work-items.controller.ts:complete` (سطر ۱۱۵) — `const decidedBy = body.decidedBy || actor` — اگر `body.decidedBy` ارائه شود، بدون validation با token استفاده می‌شود. `workflows.controller.ts:completeWorkItem` (سطر ۴۳۵) — `const decidedBy = body.decidedBy || actor` — همین. `orchestrator.service.ts:completeWorkItem` (سطر ۱۴۱۳) — `workItem.decidedBy = params.decidedBy` — هر decidedBy پذیرفته می‌شود. `jwt-auth.guard.ts` (سطر ۲۶) — `request.user = payload` اما `body.decidedBy` با `request.user.userId` مقایسه نمی‌شود.
- **وضعیت**: ✅ تأیید شد — با اصلاح: اگر `body.decidedBy` ارائه نشود، `actor` (از token) استفاده می‌شود. اما اگر `body.decidedBy` ارائه شود، بدون validation پذیرفته می‌شود.

### ۷.۳ عدم ABAC برای data isolation در work items
- **اندپوینت**: `GET /work-items`
- **اشکال**: AbacGuard ذکر شده اما هیچ attribute-based policy‌ای تعریف نشده. یک کاربر می‌تواند work items همه saga‌ها را ببیند. باید work items بر اساس assignee یا organization فیلتر شوند.
- **کد**: `abac.guard.ts` (سطر ۱-۳۹) — `hasAdmin = scopes.includes('orchestrator:admin') || roles.includes('system_admin')` (سطر ۱۷). `if (method === 'GET')` — requires `orchestrator:read` or `orchestrator:write` scope (سطر ۲۰-۲۷). `if (!scopes.includes('orchestrator:write'))` — requires `orchestrator:write` for non-GET (سطر ۳۰-۳۵). این scope-based است نه attribute-based. `work-items.controller.ts:list` (سطر ۲۴-۶۳) — `tenantId` از `req.user.tenantId` گرفته می‌شود (سطر ۳۷) و در query استفاده می‌شود (سطر ۴۵). `assignedTo` و `priority` و `status` قابل فیلتر هستند اما هیچ فیلتر خودکار بر اساس `req.user.userId` وجود ندارد — یک کاربر می‌تواند work items همه assignee‌ها را ببیند.
- **وضعیت**: ✅ تأیید شد

### ۷.۴ عدم rate limiting روی special work item creation
- **اندپوینت**: `POST /work-items/sanhab-followup`، `POST /work-items/suspicious-case`
- **اشکال**: ایجاد special work items بدون rate limiting است. یک سرویس compromise شده می‌تواند حجم زیادی work item ایجاد کند و سیستم را overflow کند.
- **کد**: `work-items.controller.ts` — هیچ rate limiting mechanism در controller یا service وجود ندارد. `createSanhabFollowup` (سطر ۲۷۲)، `createSuspiciousCase` (سطر ۳۸۹)، `createUnderwritingReview` (سطر ۳۳۱)، `createOverrideReview` (سطر ۴۶۷) — همه بدون throttle. هیچ NestJS throttle guard یا rate limiter در `app.module.ts` ثبت نشده.
- **وضعیت**: ✅ تأیید شد

---

## ۸. بهینه‌سازی و Observability

### ۸.۱ عدم pagination در SLA breaches
- **اندپوینت**: `GET /work-items/sla/breaches`
- **اشکال**: breaches به‌صورت array برمی‌گردد بدون pagination. اگر صدها breach وجود داشته باشد، response بسیار بزرگ می‌شود.
- **کد**: `work-items.controller.ts:getSlaBreaches` (سطر ۵۲۹-۵۴۵) — `const { breached, metrics } = await this.slaMonitorService.checkSlaBreaches(tenantId)` و `return { success: true, data: { breached, metrics } }` (سطر ۵۳۷-۵۴۴). `sla-monitor.service.ts:checkSlaBreaches` (سطر ۶۷-۶۹) — `this.workItemRepo.find({ where, order: { dueDate: 'ASC' } })` — همه breached items را برمی‌گرداند بدون limit/offset. هیچ pagination در endpoint یا service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۸.۲ عدم metrics برای saga performance
- **اندپوینت**: `GET /orchestrations/sagas/:sagaId`
- **اشکال**: هیچ metrics‌ای برای saga (میانگین زمان تکمیل، نرخ شکست، نرخ compensation) وجود ندارد. برای monitoring، باید dashboard saga performance وجود داشته باشد.
- **کد**: `orchestrator.service.ts:getSagaStepMetrics` (سطر ۶۱۱-۶۳۵) — `totalSteps`، `completedSteps`، `failedSteps`، `pendingSteps`، `totalDurationMs`، `averageStepDurationMs` را محاسبه می‌کند. اما هیچ controller endpoint‌ای این متد را فراخوانی نمی‌کند. `orchestrations.controller.ts` — فقط `getSaga` و `getCompensationStatus` وجود دارد. هیچ endpoint برای saga metrics در سطح tenant یا sagaType وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ عدم tracing distributed
- **اندپوینت**: `POST /orchestrations/sagas`
- **اشکال**: `X-Correlation-Id` اختیاری است. برای saga که چند سرویس را فراخوانی می‌کند، correlation ID باید اجباری و propagate شود تا tracing کامل باشد.
- **کد**: `orchestrations.controller.ts:getCorrelationId` (سطر ۱۴-۱۸) — `const cid = headers['x-correlation-id'] || headers['X-Correlation-Id']; if (typeof cid === 'string' && cid.length > 0) return cid; return '${Date.now()}-${Math.random()...}'` — اگر header نباشد، یک random ID تولید می‌شود. `X-Correlation-Id` اختیاری است. `publishSagaEvent` (سطر ۴۸۸-۵۰۳) — `correlationId` در event envelope استفاده می‌شود (سطر ۴۹۶) که propagation انجام می‌دهد. اما اگر کلاینت correlation ID نفرستد، یک random ID تولید می‌شود که tracing end-to-end را غیرممکن می‌کند.
- **وضعیت**: ✅ تأیید شد

---

## ۹. ذینفعان و مصرف‌کنندگان

### ۹.۱ عدم دسترسی claims-service به saga start
- **اشکال**: claims-service برای ClaimPayment saga نیاز به `POST /orchestrations/sagas` با `orchestrations:saga_start` permission دارد. مشخص نیست آیا این permission به claims-service اختصاص داده شده یا خیر. اگر عمومی باشد، هر سرویسی می‌تواند saga start کند.
- **کد**: `permissions.ts` (سطر ۵۴) — `claims_handler` نقش دارد با `orchestrations:saga_start`، `orchestrations:saga_view`، `work_items:list`، `work_items:view`، `work_items:complete`. اما `claims_handler` یک نقش انسانی است، نه service role. برای claims-service به‌عنوان M2M، نیاز به service token با `orchestrations:saga_start` scope دارد. `AbacGuard` (سطر ۱۷) — `scopes.includes('orchestrator:admin')` یا `roles.includes('system_admin')` admin دسترسی می‌دهد. هیچ نقش `claims_service` در `ROLE_TO_PERMISSIONS` تعریف نشده. `PermissionsGuard` (سطر ۱۵) — `if (!required || required.length === 0) return true` — اما `@RequirePermissions` استفاده شده پس permission‌ها enforce می‌شوند.
- **وضعیت**: ✅ تأیید شد — با اصلاح: `@RequirePermissions` در orchestrator-service استفاده شده (برخلاف workflow-service) و permission‌ها enforce می‌شوند. اما هیچ service role برای claims-service تعریف نشده.

### ۹.۲ عدم یکپارچه‌سازی با notification-service برای saga status
- **اشکال**: وقتی saga complete یا fail می‌شود، باید ذینفعان (customer، agent، insurer) مطلع شوند. اما هیچ event‌ای به notification-service ارسال نمی‌شود (در کاتالوگ مشخص نیست).
- **کد**: `orchestrator.service.ts:publishSagaEvent` (سطر ۴۸۸-۵۰۳) — event‌ها از طریق `OutboxPublisher` به Kafka منتشر می‌شوند. event‌های منتشر شده: `insurance.saga.claim_payment.started` (سطر ۱۳۲۶)، `insurance.saga.payment.prepare.required` (سطر ۳۵۳)، `insurance.saga.payment.finance_approval.required` (سطر ۳۸۰)، `insurance.saga.payment.execute.required` (سطر ۴۰۵)، `insurance.saga.payment.notify.required` (سطر ۴۳۰)، `insurance.saga.human_approval.required` (سطر ۹۸۲)، `insurance.saga.fraud_check.required` (سطر ۹۴۸)، `insurance.saga.work_item.completed` (سطر ۱۵۲۶)، `insurance.saga.work_item.escalated` (سطر ۱۴۴۷)، `insurance.saga.compensation.started` (سطر ۱۵۶۰)، `insurance.saga.compensation.completed` (سطر ۱۵۹۹)، `insurance.saga.compensation.failed` (سطر ۱۶۹۷)، `insurance.sla.breached` (سطر ۲۱۵)، `insurance.sla.escalated` (سطر ۲۶۹). notification-service می‌تواند این event‌ها را consume کند. اما هیچ event برای `saga.completed` یا `saga.failed` وجود ندارد — `completeSaga` (سطر ۱۰۰۲+) فقط status را تغییر می‌دهد و event منتشر نمی‌کند.
- **وضعیت**: ~~رفع شد~~ — **با اصلاح**: event‌های متعدد از طریق outbox به Kafka منتشر می‌شوند. اما event برای `saga.completed` و `saga.failed` وجود ندارد که برای notification نهایی ضروری است.

### ۹.۳ عدم دسترسی fraud-service به suspicious case work item
- **اشکال**: fraud-service برای ایجاد suspicious case work item نیاز به `work_items:create_suspicious_case` دارد. اما برای track status و update work item نیاز به `work_items:view` و `work_items:complete` دارد. مشخص نیست آیا fraud-service این permission‌ها را دارد یا فقط create می‌تواند.
- **کد**: `permissions.ts` (سطر ۵۶) — `fraud_analyst` نقش دارد با `orchestrations:saga_view`، `work_items:list`، `work_items:view`، `work_items:complete`، `work_items:create_suspicious_case`. اما `fraud_analyst` یک نقش انسانی است. `orchestrator.service.ts:onFraudScoreComputed` (سطر ۴۹-۷۵) — وقتی fraud score با `holdClaim = true` محاسبه می‌شود، `createSuspiciousCaseWorkItem` مستقیماً فراخوانی می‌شود (سطر ۶۲) بدون نیاز به API call. بنابراین fraud-service از طریق Kafka event به‌صورت خودکار work item ایجاد می‌کند، نه از طریق REST API. برای track status، fraud-service نیاز به `GET /work-items/:workItemId` با `work_items:view` دارد.
- **وضعیت**: ✅ تأیید شد — با اصلاح: fraud-service از طریق Kafka event به‌صورت خودکار work item ایجاد می‌کند (`onFraudScoreComputed`). اما برای track status از طریق REST API، نیاز به service token با `work_items:view` دارد که تعریف نشده.

### ۹.۴ عدم dashboard برای operations team
- **اشکال**: operations team برای مدیریت work items و SLA نیاز به dashboard دارد. اما هیچ dashboard endpoint‌ای (aggregated stats، trends) وجود ندارد. باید از چند endpoint دستی جمع‌آوری کند.
- **کد**: `work-items.controller.ts` — `list` (سطر ۲۴)، `get` (سطر ۶۵)، `complete` (سطر ۸۷)، `assign` (سطر ۱۹۹)، `getSlaBreaches` (سطر ۵۲۹)، `processSlaBreaches` (سطر ۵۴۷)، `getSlaStats` (سطر ۵۸۰). هیچ endpoint برای aggregated stats در سطح tenant وجود ندارد. `getSlaStats` فقط per saga است. `checkSlaBreaches` `metrics.byWorkItemType` و `metrics.averageOverdueHours` را برمی‌گرداند اما این real-time است نه trend.
- **وضعیت**: ✅ تأیید شد

---

## ۱۰. نقایص جدید کشف‌شده

### ۱۰.۱ عدم endpoint برای saga steps
- **اندپوینت**: (موجود نیست)
- **اشکال**: `OrchestratorService` متدهای `getSagaSteps` و `getSagaStepMetrics` را دارد اما هیچ controller endpoint‌ای برای دسترسی به این متدها وجود ندارد. برای debugging و monitoring، مشاهده step‌های یک saga ضروری است.
- **کد**: `orchestrator.service.ts:getSagaSteps` (سطر ۶۰۴-۶۰۹) — `sagaStepRepo.find({ where: { sagaId, tenantId }, order: { stepOrder: 'ASC' } })`. `getSagaStepMetrics` (سطر ۶۱۱-۶۳۵) — `totalSteps`، `completedSteps`، `failedSteps`، `pendingSteps`، `totalDurationMs`، `averageStepDurationMs`. `orchestrations.controller.ts` — هیچ `GET /orchestrations/sagas/:sagaId/steps` یا `GET /orchestrations/sagas/:sagaId/metrics` وجود ندارد.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۱۰.۲ عدم filter work items بر اساس sagaId یا workItemType
- **اندپوینت**: `GET /work-items`
- **اشکال**: `listWorkItems` فقط `status`، `assignedTo`، `priority` را پشتیبانی می‌کند. فیلتر بر اساس `sagaId` یا `workItemType` وجود ندارد. برای پیدا کردن همه work item‌های یک saga یا همه work item‌های یک نوع، باید کل list را fetch و client-side filter کند.
- **کد**: `work-items.controller.ts:list` (سطر ۲۴-۶۳) — query params: `status`، `assignedTo`، `priority`، `limit`، `offset`. `orchestrator.service.ts:listWorkItems` (سطر ۱۳۵۲-۱۳۶۹) — `if (params.status) qb.andWhere(...)`، `if (params.assignedTo) qb.andWhere(...)`، `if (params.priority) qb.andWhere(...)`. هیچ فیلتر `sagaId` یا `workItemType` وجود ندارد. entity `WorkItem` index `['sagaId']` (سطر ۲۰) دارد که نشان می‌دهد query طراحی شده اما endpoint پیاده‌سازی نشده.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۱۰.۳ عدم event برای saga completed/failed
- **اندپوینت**: `POST /orchestrations/sagas`
- **اشکال**: وقتی saga complete یا fail می‌شود، هیچ event‌ای منتشر نمی‌شود. `completeSaga` فقط status را تغییر می‌دهد. برای notification و audit، event‌های `saga.completed` و `saga.failed` ضروری هستند.
- **کد**: `orchestrator.service.ts:completeSaga` (سطر ۱۰۰۲+) — `saga.status = success ? 'completed' : 'failed'`، `saga.completedAt = new Date()`، `saga.errorMessage = errorMessage`. `await this.sagaRepo.save(saga)`. هیچ `publishSagaEvent` فراخوانی نمی‌شود. در مقایسه، `initiateCompensation` (سطر ۱۵۶۰) و `executeCompensation` (سطر ۱۵۹۹) event‌های compensation منتشر می‌کنند.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۱۰.۴ عدم health check برای ecosystem-ai client
- **اندپوینت**: `GET /health`
- **اشکال**: health check DB و Kafka را بررسی می‌کند اما `ecosystem-ai.client.ts` که یک external dependency است بررسی نمی‌شود.
- **کد**: `health.controller.ts` (سطر ۹-۶۵) — `this.dataSource.query('SELECT 1')` برای DB (سطر ۱۵) و Kafka admin (سطر ۳۹-۴۲). `ecosystem-ai.client.ts` وجود دارد اما در health check بررسی نمی‌شود.
- **وضعیت**: ✅ تأیید شد — نقص جدید
