# AI Governance Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: ai-governance-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/ai-governance-service/src/`

---

## ۱. مدیریت Incident‌های AI

### ۱.۱ عدم validation فیلد severity و type هنگام ایجاد incident
- **اندپوینت**: `POST /governance/incidents`
- **اشکال**: فیلدهای `type` و `severity` به صورت string آزاد ارسال می‌شوند و هیچ enum یا validation مشخصی برای آن‌ها تعریف نشده است. یک کاربر می‌تواند مقدار نامعتبر وارد کند که باعث ناهماهنگی در گزارش‌گیری و فیلترینگ می‌شود. severity باید مقادیر استاندارد مانند `low`، `medium`، `high`، `critical` باشد.
- **کد**: `controllers/governance.controller.ts:createIncident` (خط ۳۴-۵۱) — پارامترهای `body.type` و `body.severity` با `as any` به سرویس پاس داده می‌شوند بدون هیچ runtime validation. در `services/ai-incident-response.service.ts` (خط ۳-۵) تایپ‌های `IncidentSeverity` و `IncidentType` تعریف شده‌اند اما فقط TypeScript type هستند و در runtime اعمال نمی‌شوند. هیچ DTO یا ValidationPipe ای وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم pagination در لیست incident‌ها
- **اندپوینت**: `GET /governance/incidents`
- **اشکال**: این اندپوینت یک array از incident‌ها برمی‌گرداند بدون هیچ پارامتر `limit` یا `offset`. در صورت انباشت incident‌ها در طول زمان، پاسخ بسیار بزرگ می‌شود و باعث افت عملکرد و مصرف بیش از حد حافظه می‌گردد.
- **کد**: `controllers/governance.controller.ts:listIncidents` (خط ۶۳-۷۲) — تنها پارامترهای `status`، `severity` و `modelId` پذیرفته می‌شوند. در `services/ai-incident-response.service.ts` متدهای `getIncidentsByModel` (خط ۲۶۰)، `getIncidentsByStatus` (خط ۲۶۴)، `getIncidentsBySeverity` (خط ۲۶۸) و `getOpenIncidents` (خط ۲۷۲) همه `Array.from(this.incidents.values())` برمی‌گردانند بدون هیچ محدودیتی.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم فیلتر بر اساس بازه زمانی در لیست incident‌ها
- **اندپوینت**: `GET /governance/incidents`
- **اشکال**: فیلترهای `status`، `severity` و `modelId` پشتیبانی می‌شوند اما هیچ فیلتری بر اساس بازه زمانی (`fromDate`/`toDate`) وجود ندارد. در عملیات governance، فیلتر زمانی برای گزارش‌گیری دوره‌ای و تحلیل رونده الزامی است.
- **کد**: `controllers/governance.controller.ts:listIncidents` (خط ۶۳-۷۲) — هیچ پارامتر `fromDate` یا `toDate` در `@Query` تعریف نشده است. سرویس نیز متدی برای فیلتر زمانی ندارد (برخلاف `CommitteeAuditTrailService.getAuditTrail` که `startDate`/`endDate` دارد).
- **وضعیت**: ✅ تأیید شد

### ۱.۴ ~~عدم قفل همزمانی در انتقال وضعیت incident~~
- **اندپوینت**: `PUT /governance/incidents/:incidentId/investigate`، `PUT /governance/incidents/:incidentId/mitigate`، `PUT /governance/incidents/:incidentId/resolve`، `PUT /governance/incidents/:incidentId/close`
- ~~**اشکال**: انتقال‌های وضعیت (state transitions) هیچ optimistic locking یا بررسی وضعیت فعلی قبل از انتقال ندارند. دو کاربر می‌توانند همزمان یک incident را به وضعیت‌های مختلف منتقل کنند که باعث ناهماهنگی داده می‌شود. مثلاً یک incident که در وضعیت `investigating` است می‌تواند همزمان `close` شود.~~
- **کد**: `services/ai-incident-response.service.ts` — بررسی وضعیت فعلی قبل از انتقال **وجود دارد**: `startInvestigation` (خط ۱۱۵) `if (incident.status !== 'open' && incident.status !== 'investigating')`، `markMitigated` (خط ۱۸۵) `if (incident.status !== 'investigating')`، `resolveIncident` (خط ۲۰۸) `if (incident.status !== 'mitigated')`، `closeIncident` (خط ۲۲۸) `if (incident.status !== 'resolved')`. مثال تحلیل اصلی (close از investigating) غلط است — `closeIncident` فقط از `resolved` مجاز است. اما optimistic locking (version field) واقعاً وجود ندارد و داده‌ها در `Map` در حافظه نگهداری می‌شوند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: بررسی وضعیت فعلی قبل از انتقال در `services/ai-incident-response.service.ts` پیاده‌سازی شده است (خطوط ۱۱۵، ۱۸۵، ۲۰۸، ۲۲۸). فقط عدم optimistic locking باقی است که به دلیل استفاده از in-memory Map در محیط single-threaded Node.js کم‌اهمیت‌تر است.

### ۱.۵ ~~عدم audit trail برای انتقال‌های وضعیت incident~~
- **اندپوینت**: `PUT /governance/incidents/:incidentId/assign`، `PUT /governance/incidents/:incidentId/investigate`، `PUT /governance/incidents/:incidentId/mitigate`، `PUT /governance/incidents/:incidentId/resolve`، `PUT /governance/incidents/:incidentId/close`
- ~~**اشکال**: هیچ مکانیزمی برای ثبت اینکه چه کسی، چه زمانی و با چه کامنتی وضعیت incident را تغییر داده وجود ندارد. در governance، audit trail کامل از انتقال‌های وضعیت الزامی است.~~
- **کد**: `services/ai-incident-response.service.ts` — متد خصوصی `recordAction` (خط ۲۸۴-۲۹۸) در هر انتقال وضعیت فراخوانی می‌شود: `assignIncident` (خط ۱۰۴)، `startInvestigation` (خط ۱۲۳)، `markMitigated` (خط ۱۹۳)، `resolveIncident` (خط ۲۱۷)، `closeIncident` (خط ۲۳۶). هر action شامل `actionId`، `incidentId`، `action`، `takenBy`، `takenAt` و `notes` است و در `incidentActions` Map ذخیره می‌شود. متد `getIncidentActions` (خط ۲۸۰) برای بازیابی آن‌ها وجود دارد. نکته: این audit trail در حافظه نگهداری می‌شود و در restart از بین می‌رود (مشکل جداگانه در نقص ۹.۱).
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: audit trail از طریق `recordAction` و `IncidentAction` در `services/ai-incident-response.service.ts` (خط ۲۸۴-۲۹۸) پیاده‌سازی شده است.

### ۱.۶ عدم escalation policy برای incident‌های بحرانی
- **اندپوینت**: `POST /governance/incidents`
- **اشکال**: هنگام ایجاد incident با severity بالا (مثلاً `critical`)، هیچ مکانیزم escalation خودکار به committee یا مدیر governance تعبیه نشده است. incident بحرانی باید به طور خودکار به notify و escalate شود.
- **کد**: `services/ai-incident-response.service.ts:autoAssignIncident` (خط ۸۰-۹۲) — auto-assign بر اساس severity انجام می‌شود (critical/high → `ai_governance_lead`) اما هیچ notification، event publish یا escalation به committee تعبیه نشده است. هیچ OutboxPublisher یا Kafka event برای incident creation وجود ندارد (برخلاف model registration که event publish می‌کند).
- **وضعیت**: ✅ تأیید شد

---

## ۲. Committee و Approval

### ۲.۱ عدم quorum validation در ثبت تصمیم committee
- **اندپوینت**: `POST /governance/committee/decisions`
- **اشکال**: تصمیم committee ثبت می‌شود بدون اینکه بررسی شود آیا تعداد اعضای حاضر (quorum) کافی بوده است یا خیر. یک نفر می‌تواند به نمایندگی از committee تصمیم ثبت کند. request body به صورت `Committee decision object` مبهم تعریف شده و مشخص نیست فیلدهای `voters`، `quorum` و `dissentingOpinions` در آن وجود دارند یا خیر.
- **کد**: `controllers/governance.controller.ts:recordDecision` (خط ۱۱۹) — `@Body() body: any` بدون هیچ validation. `services/committee-audit-trail.service.ts:recordDecision` (خط ۳۷-۴۷) — تصمیم مستقیماً در Map ذخیره می‌شود. اینترفیس `CommitteeDecision` (خط ۳-۲۰) شامل `attendees` و `votingRecord` است اما هیچ بررسی quorum یا حداقل تعداد رای انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم SoD در تایید deployment
- **اندپوینت**: `PUT /governance/approvals/:requestId/approve`
- **اشکال**: همان permission `ai:governance:approvals:manage` هم برای ایجاد درخواست تایید (`POST /governance/approvals`) و هم برای تایید آن استفاده می‌شود. این یعنی یک نفر می‌تواند درخواست ایجاد کند و خودش تایید کند. Separation of Duties (SoD) نقض می‌شود؛ تاییدکننده باید با ایجادکننده متفاوت باشد.
- **کد**: `controllers/governance.controller.ts` — `requestApproval` (خط ۱۵۴) و `approveRequest` (خط ۱۷۵) هر دو `@RequirePermissions('ai:governance:approvals:manage')` دارند. در `services/deployment-approval-gate.service.ts:approveDeployment` (خط ۱۰۸-۱۴۶) — بررسی `if (!request.approvers.includes(approver))` وجود دارد (خط ۱۲۳) که فقط چک می‌کند approver در لیست roles مجاز است، اما بررسی نمی‌کند که `approver !== request.requestedBy`.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم timeout و auto-reject برای approval‌های معلق
- **اندپوینت**: `GET /governance/approvals/:requestId`
- **اشکال**: هیچ مکانیزمی برای timeout درخواست‌های تایید معلق وجود ندارد. یک درخواست تایید می‌تواند به طور نامحدود در وضعیت pending باقی بماند. باید timeout خودکار (مثلاً ۷۲ ساعت) و auto-reject یا escalation تعریف شود.
- **کد**: `services/deployment-approval-gate.service.ts` — هیچ scheduler یا timeout mechanism وجود ندارد. `requestDeploymentApproval` (خط ۶۵) status را `pending` تنظیم می‌کند و هیچ cron job یا timeout ای آن را auto-reject نمی‌کند. `getPendingApprovals` (خط ۲۰۴) فقط لیست می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم pagination در audit trail committee
- **اندپوینت**: `GET /governance/committee/decisions`
- **اشکال**: audit trail committee بدون pagination برمی‌گردد. با انباشت تصمیم‌ها در طول زمان، این اندپوینت می‌تواند پاسخ بسیار بزرگی تولید کند.
- **کد**: `controllers/governance.controller.ts:getAuditTrail` (خط ۱۳۳-۱۴۳) — فقط `modelId`، `committeeId`، `decisionType` به سرویس پاس داده می‌شوند. `services/committee-audit-trail.service.ts:getAuditTrail` (خط ۱۲۷-۱۵۷) — `Array.from(this.decisions.values())` برمی‌گرداند با sort اما بدون limit/offset.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Monitoring و Drift Detection

### ۳.۱ عدم alerting خودکار بر اساس drift
- **اندپوینت**: `GET /governance/monitoring/drift/:modelId`
- **اشکال**: drift metrics فقط قابل مشاهده هستند. هیچ threshold-based alerting یا notification خودکار بر اساس drift بالا تعریف نشده است. drift بحرانی باید به طور خودکار incident ایجاد کند.
- **کد**: `services/monitoring-dashboard.service.ts:recordDriftMetrics` (خط ۲۱۵-۲۳۰) — اگر `driftDetected` باشد یک anomaly ایجاد می‌کند (در `anomalies` Map ذخیره می‌شود) اما هیچ incident در `AIIncidentResponseService` ایجاد نمی‌کند و هیچ notification یا event publish نمی‌شود. `getDriftMetrics` (خط ۲۳۲) فقط داده‌ها برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم pagination در لیست anomaly‌ها
- **اندپوینت**: `GET /governance/monitoring/anomalies`
- **اشکال**: لیست anomaly‌ها بدون پارامتر `limit` یا `offset` برمی‌گردد. در صورت تشدید anomaly‌ها، پاسخ می‌تواند بسیار بزرگ شود.
- **کد**: `controllers/governance.controller.ts:getAnomalies` (خط ۲۰۵-۲۰۷) — فقط `@Query('modelId')` پذیرفته می‌شود. `services/monitoring-dashboard.service.ts:getAnomalies` (خط ۱۷۶-۱۸۴) — `Array.from(this.anomalies.values())` برمی‌گرداند بدون محدودیت.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم فیلتر زمانی در anomaly‌ها
- **اندپوینت**: `GET /governance/monitoring/anomalies`
- **اشکال**: فقط فیلتر `modelId` پشتیبانی می‌شود. هیچ فیلتر زمانی برای محدود کردن anomaly‌ها به بازه خاص وجود ندارد.
- **کد**: `controllers/governance.controller.ts:getAnomalies` (خط ۲۰۵) — فقط `modelId`. `services/monitoring-dashboard.service.ts:getAnomalies` (خط ۱۷۶) — فقط بر اساس `modelId` فیلتر می‌کند. هر anomaly فیلد `detectedAt` دارد اما فیلتر زمانی پیاده‌سازی نشده است.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم real-time monitoring و WebSocket
- **اندپوینت**: `GET /governance/monitoring/metrics/:modelId`
- **اشکال**: metrics history با پارامتر `minutes` (default: 60) fetch می‌شود اما به صورت polling است. برای monitoring real-time، WebSocket یا SSE باید پشتیبانی شود تا dashboard به طور زنده به‌روز شود.
- **کد**: `controllers/governance.controller.ts:getModelMetrics` (خط ۱۹۰-۱۹۳) — `parseInt(minutes || '60', 10)` و فراخوانی `getMetricsHistory`. هیچ WebSocket یا SSE gateway در `main.ts` یا `app.module.ts` پیکربندی نشده است.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ عدم validation metrics object در ثبت
- **اندپوینت**: `POST /governance/monitoring/metrics`
- **اشکال**: request body به صورت `Metrics object` مبهم تعریف شده است. هیچ schema validation مشخصی برای اطمینان از اینکه metrics شامل فیلدهای الزامی مانند `modelId`، `timestamp`، `metricName` و `value` است وجود ندارد.
- **کد**: `controllers/governance.controller.ts:recordMetrics` (خط ۱۹۸) — `@Body() body: any` بدون هیچ validation. `services/monitoring-dashboard.service.ts:recordMetrics` (خط ۴۹) — پارامتر `metrics: ModelMetrics` اما در runtime هیچ بررسی وجود ندارد. اینترفیس `ModelMetrics` (خط ۳-۱۴) فیلدهای `modelId`، `modelName`، `timestamp`، `requestsPerMinute`، `averageLatency`، `errorRate`، `throughput`، `cpuUsage`، `memoryUsage` را انتظار دارد اما اگر فراخوانی‌کننده فیلدی را ارسال نکند، undefined ذخیره می‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Validation و Model Lifecycle

### ۴.۱ عدم SoD در تایید validation report
- **اندپوینت**: `PUT /governance/validation/:reportId/approve`
- **اشکال**: همان permission `ai:governance:validation:manage` هم برای initiate و هم برای approve استفاده می‌شود. کسی که validation را initiate می‌کند می‌تواند خودش آن را تایید کند.
- **کد**: `controllers/governance.controller.ts` — `initiateValidation` (خط ۲۳۳) و `approveValidationReport` (خط ۲۵۲) هر دو `@RequirePermissions('ai:governance:validation:manage')` دارند. `services/validation-workflow.service.ts:approveValidationReport` (خط ۲۱۱-۲۳۰) — فقط بررسی `if (report.status !== 'passed' && report.status !== 'needs_review')` وجود دارد، اما بررسی `approvedBy !== validatedBy` انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم ارتباط validation با approval deployment
- **اندپوینت**: `POST /governance/approvals`، `POST /governance/validation/initiate`
- **اشکال**: در `POST /governance/approvals` فیلد `validationReportId` وجود دارد اما هیچ enforcement ای بررسی نمی‌کند که آیا validation report مورد نظر در وضعیت `approved` است یا خیر. یک درخواست deployment می‌تواند با validation report رد شده یا pending تایید شود.
- **کد**: `services/deployment-approval-gate.service.ts:requestDeploymentApproval` (خط ۶۵-۱۰۶) — بررسی `if (policy.requiresValidationReport && !validationReportId)` (خط ۸۱) فقط وجود `validationReportId` را چک می‌کند، اما وضعیت validation report (passed/failed/pending) بررسی نمی‌شود. هیچ ارجاعی به `ValidationWorkflowService` برای بررسی وضعیت report وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم فیلتر در لیست model‌ها
- **اندپوینت**: `GET /models`
- **اشکال**: pagination با `limit` (default: 50, max: 200) و `offset` پشتیبانی می‌شود اما هیچ فیلتری بر اساس `modelType`، `provider`، `riskLevel` یا `status` وجود ندارد. در محیط با تعداد زیادی مدل، فیلتر کردن ضروری است.
- **کد**: `controllers/model-intake.controller.ts:listModels` (خط ۱۰۹-۱۱۷) — فقط `@Query('limit')` و `@Query('offset')`. `this.modelRepository.findAndCount({ take: lim, skip: off, order: { createdAt: 'DESC' as any } })` — هیچ `where` clause برای فیلتر وجود ندارد. Entity `ModelInventory` (خط ۹-۱۲) ایندکس‌های `modelType+status`، `status+createdAt`، `version+modelType` و `tenantId+status` دارد که نشان می‌دهد فیلتر در نظر گرفته شده اما پیاده‌سازی نشده است.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ عدم enforcement transition rules پویا
- **اندپوینت**: `PUT /models/:modelId/transition`
- **اشکال**: انتقال وضعیت با `targetStatus` انجام می‌شود و اگر transition نامعتبر باشد خطا برمی‌گرداند، اما مشخص نیست آیا transition rules از `GET /models/transitions/rules` به صورت پویا اعمال می‌شوند یا hardcode شده‌اند. اگر hardcode باشند، endpoint rules بی‌فایده است.
- **کد**: `services/model-lifecycle.service.ts:initializeTransitions` (خط ۳۸-۱۰۸) — transition rules در constructor به صورت hardcode در `stateTransitions` Map تعریف می‌شوند (۸ transition: development→testing، testing→staging، staging→production، production→deprecated، deprecated→retired، و ۳ rollback). `transitionModel` (خط ۱۱۰-۲۲۵) از همین Map استفاده می‌کند. `getTransitionRules` (خط ۳۱۸) نیز از همان Map برمی‌گرداند. پس endpoint rules بی‌فایده نیست (نمایش می‌دهد چه rules اعمال می‌شود) اما rules از DB قابل پیکربندی نیستند و در restart تغییر نمی‌کنند.
- **وضعیت**: ✅ تأیید شد — transition rules hardcode شده‌اند و از DB قابل پیکربندی نیستند، اما endpoint `GET /models/transitions/rules` برای visibility مفید است.

### ۴.۵ عدم soft delete audit در model deletion
- **اندپوینت**: `DELETE /models/:modelId`
- **اشکال**: soft delete انجام می‌شود اما مشخص نیست چه کسی و چه زمانی حذف را انجام داده است. در governance، حذف مدل (حتی soft) باید با audit trail کامل همراه باشد.
- **کد**: `controllers/model-intake.controller.ts:deleteModel` (خط ۱۹۲-۲۰۳) — `this.modelRepository.update(modelId, { status: 'retired' })` — فقط status را `retired` می‌کند. هیچ `@Req() req` برای گرفتن userId استفاده نمی‌شود و هیچ OutboxPublisher یا audit event publish نمی‌شود (برخلاف `registerModel` و `transitionModel` که event publish می‌کنند).
- **وضعیت**: ✅ تأیید شد

### ۴.۶ عدم bulk retire برای مدل‌های deprecated
- **اندپوینت**: `POST /models/retire/deprecated`
- **اشکال**: این اندپوینت مدل‌های deprecated را به طور خودکار retire می‌کند اما هیچ preview یا dry-run ای وجود ندارد. قبل از retire انبوه، باید امکان preview لیست مدل‌هایی که retire می‌شوند وجود داشته باشد.
- **کد**: `controllers/model-intake.controller.ts:retireDeprecatedModels` (خط ۲۲۹) — `this.modelLifecycleService.autoRetireDeprecatedModels(body.daysThreshold || 90)`. `services/model-lifecycle.service.ts:autoRetireDeprecatedModels` (خط ۲۷۹-۳۱۵) — مستقیماً status را `retired` می‌کند و event publish می‌کند. هیچ پارامتر `dryRun` یا `preview` پذیرفته نمی‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Ecosystem Sync

### ۵.۱ عدم authentication متقابل در ecosystem sync
- **اندپوینت**: `POST /governance/ecosystem-sync/policy-update`
- **اشکال**: این اندپوینت policy update را از ecosystem AI governance دریافت می‌کند. permission `ai:governance:sync:manage` استفاده می‌شود اما مشخص نیست آیا authentication متقابل (mutual TLS یا service-to-service token) بین سیستم محلی و ecosystem برقرار است یا خیر. یک منبع خارجی می‌تواند policy جعلی تزریق کند.
- **کد**: `controllers/governance.controller.ts:receivePolicyUpdate` (خط ۲۸۰-۲۸۹) — فقط `@RequirePermissions('ai:governance:sync:manage')` دارد. هیچ mTLS یا service-to-service token validation در controller یا service وجود ندارد. در `main.ts` (خط ۵۲-۶۹) Kafka consumer نیز policy update دریافت می‌کند اما بدون authentication متقابل. `services/ecosystem-sync.service.ts:importPolicyUpdate` (خط ۱۳۹) — فقط log می‌کند و اعمال می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم validation sourceSystem در policy update
- **اندپوینت**: `POST /governance/ecosystem-sync/policy-update`
- **اشکال**: فیلد `sourceSystem` در request body وجود دارد اما هیچ whitelist یا validation ای برای آن تعریف نشده است. هر منبعی می‌تواند policy update ارسال کند.
- **کد**: `services/ecosystem-sync.service.ts:importPolicyUpdate` (خط ۱۳۹-۱۶۶) — `update.sourceSystem` فقط در log استفاده می‌شود (خط ۱۴۰) و هیچ whitelist یا validation انجام نمی‌شود. در `main.ts` (خط ۶۲) `sourceSystem: event.sourceSystem || 'ecosystem'` — حتی اگر sourceSystem وجود نداشته باشد، default می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم rollback برای policy update
- **اندپوینت**: `POST /governance/ecosystem-sync/policy-update`
- **اشکال**: policy update از ecosystem دریافت و اعمال می‌شود اما هیچ مکانیزم rollback برای بازگرداندن policy قبلی در صورت بروز مشکل وجود ندارد.
- **کد**: `services/ecosystem-sync.service.ts:importPolicyUpdate` (خط ۱۳۹-۱�۶۶) — فقط `this.logger.log` می‌کند و `{ applied: true, message: ... }` برمی‌گرداند. هیچ نسخه قبلی policy ذخیره نمی‌شود و هیچ متد rollback وجود ندارد. policy update فقط log می‌شود و در واقعیت هیچ state تغییر نمی‌کند (no-op).
- **وضعیت**: ✅ تأیید شد

---

## ۶. MRO و Dashboard

### ۶.۱ عدم فیلتر در MRO dashboard
- **اندپوینت**: `GET /governance/mro/dashboard`
- **اشکال**: MRO dashboard metrics بدون هیچ پارامتر فیلتر برمی‌گردد. هیچ فیلتری بر اساس `modelId`، `tenantId` یا بازه زمانی وجود ندارد. در محیط multi-tenant، dashboard باید قابل فیلتر باشد.
- **کد**: `controllers/governance.controller.ts:getMroDashboard` (خط ۲۱۹-۲۲۱) — هیچ پارامتری نمی‌گیرد. `services/mro-dashboard.service.ts:getDashboardMetrics` (خط ۳۰-۶۲) — **داده‌های hardcoded mock** برمی‌گرداند (مثلاً `totalModels: 25`، `modelsByStatus: { development: 8, ... }`). هیچ query از DB انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم severity و pagination در MRO alerts
- **اندپوینت**: `GET /governance/mro/alerts`
- **اشکال**: alerts بدون pagination و فیلتر severity برمی‌گردند. در صورت انباشت alert‌ها، پاسخ بسیار بزرگ می‌شود و اولویت‌بندی ممکن نیست.
- **کد**: `controllers/governance.controller.ts:getMroAlerts` (خط ۲۲۶-۲۲۸) — هیچ پارامتری نمی‌گیرد. `services/mro-dashboard.service.ts:getActiveAlerts` (خط ۱۷۸-۱۸۰) — `this.alerts.filter(a => !a.resolvedAt)` — همه alert‌های فعال برمی‌گردند بدون pagination یا فیلتر severity. متد `getAlertsBySeverity` (خط ۱۸۲) وجود دارد اما از طریق controller قابل دسترسی نیست.
- **وضعیت**: ✅ تأیید شد

---

## ۷. مسائل امنیتی عمومی

### ۷.۱ عدم rate limiting در اندپوینت‌های governance
- **اندپوینت**: تمام اندپوینت‌های `POST` و `PUT` در governance.controller.ts
- **اشکال**: هیچ rate limiting ای در سطح سرویس تعریف نشده است. یک کاربر می‌تواند به طور مکرر incident ایجاد کند، approval request بفرستد یا model transition انجام دهد که می‌تواند منجر به noise در سیستم governance شود.
- **کد**: `main.ts` — هیچ `ThrottlerModule` یا rate limiting middleware پیکربندی نشده است. جستجو در کل `src/` هیچ reference به `ThrottlerGuard` یا `rate-limit` در سطح HTTP پیدا نکرد (فقط در `model-switchboard-governance.service.ts` rate limiting برای model selection وجود دارد که در سطح سرویس داخلی است).
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم tenant isolation در model listing
- **اندپوینت**: `GET /models`، `GET /models/status/:status`
- **اشکال**: اگرچه TenantGuard استفاده می‌شود، اما هیچ پارامتر `tenantId` در query params وجود ندارد و مشخص نیست آیا TenantGuard به طور خودکار داده‌ها به tenant کاربر محدود می‌کند یا خیر. در multi-tenant، یک tenant نباید مدل‌های tenant دیگر را ببیند.
- **کد**: `packages/shared/src/tenant-guard.ts:canActivate` (خط ۳۱-۷۳) — TenantGuard فقط `request.tenantId = userTenantId` تنظیم می‌کند (خط ۷۱) اما هیچ فیلتری روی query اعمال نمی‌کند. `controllers/model-intake.controller.ts:listModels` (خط ۱۱۲) — `this.modelRepository.findAndCount({ take, skip, order })` بدون `where: { tenantId }`. `services/model-lifecycle.service.ts:getModelsByStatus` (خط ۲۶۶) — `this.modelRepository.find({ where: { status } })` بدون tenant filter. Entity `ModelInventory` فیلد `tenantId` (خط ۱۷) و ایندکس `tenantId+status` (خط ۱۲) دارد اما استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۸. ذینفعان و مصرف‌کنندگان

### ۸.۱ عدم یکپارچه‌سازی با copilot-service
- **اشکال**: copilot-service اندپوینت‌های مستقل برای model registration، risk assessment، incident management و validation report دارد که با ai-governance-service تکرار می‌شوند. این دو سرویس باید از طریق یکپارچه‌سازی عمل کنند نه به صورت مستقل. مثلاً copilot-service باید برای ثبت model از ai-governance-service استفاده کند.
- **کد**: در `services/ai-governance-service/src/integrations/` هیچ integration با copilot-service وجود ندارد. در `app.module.ts` هیچ HTTP client یا proxy به copilot-service پیکربندی نشده است.
- **وضعیت**: ✅ تأیید شد — نیاز به بررسی کد copilot-service برای تأیید کامل.

### ۸.۲ عدم یکپارچه‌سازی با model-switchboard-service
- **اشکال**: model-switchboard-service اندپوینت `POST /model-switchboard/governance/validate` دارد که governance validation انجام می‌دهد اما مشخص نیست آیا این از ai-governance-service استفاده می‌کند یا به صورت مستقل عمل می‌کند. تکرار عملیات governance در دو سرویس باعث ناهماهنگی می‌شود.
- **کد**: `services/ai-governance-service/src/services/model-switchboard-governance.service.ts` (کلاس `ModelSwitchboardGovernanceService`) — این سرویس governance checks برای model selection انجام می‌دهد (rate limiting، use case authorization، circuit breaker) اما کاملاً مستقل از `model-switchboard-service` عمل می‌کند و در in-memory Map نگهداری می‌شود. مهم‌تر اینکه این سرویس **هیچ controller endpoint ای ندارد** و از طریق هیچ اندپوینت HTTP قابل دسترسی نیست. `services/ai-governance-service/src/integrations/model-switchboard.integration.ts` نیز وجود دارد اما فقط interface تعریف می‌کند.
- **وضعیت**: ✅ تأیید شد — `ModelSwitchboardGovernanceService` در ai-governance-service وجود دارد اما بدون controller و با in-memory storage. یکپارچه‌سازی واقعی با model-switchboard-service وجود ندارد.

### ۸.۳ عدم notification به ecosystem در ثبت incident
- **اشکال**: هنگام ایجاد incident بحرانی، هیچ event یا notification ای به ecosystem AI governance ارسال نمی‌شود. فقط `insurance.ai.model.registered` event publish می‌شود اما event مشابه برای incident‌ها تعریف نشده است.
- **کد**: `services/ai-incident-response.service.ts:createIncident` (خط ۴۷-۷۸) — هیچ `OutboxPublisher` یا event publish وجود ندارد. در `controllers/model-intake.controller.ts:registerModel` (خط ۸۰) و `services/model-lifecycle.service.ts:transitionModel` (خط ۱۷۷) از `OutboxPublisher` برای publish event استفاده می‌شود اما در incident service این مکانیزم وجود ندارد. `services/ecosystem-sync.service.ts:exportToEcosystem` (خط ۷۳) incidents را export می‌کند اما فقط به صورت pull (GET endpoint)، نه push (event).
- **وضعیت**: ✅ تأیید شد

### ۸.۴ عدم دسترسی UI مناسب برای committee members
- **اشکال**: committee endpoints فقط شامل create و get decision هستند. هیچ اندپوینتی برای committee members برای view pending approvals یا vote روی آن‌ها وجود ندارد. committee member باید بتواند درخواست‌های تایید معلق را ببیند و رای دهد.
- **کد**: `controllers/governance.controller.ts` — committee endpoints فقط `POST /governance/committee/decisions` (خط ۱۱۶)، `GET /governance/committee/decisions/:decisionId` (خط ۱۲۳)، `GET /governance/committee/decisions` (خط ۱۳۰) و `GET /governance/committee/statistics/:committeeId` (خط ۱۴۵) هستند. هیچ اندپوینتی برای list pending approvals یا vote وجود ندارد. `DeploymentApprovalGateService` متدهای `getPendingApprovals` (خط ۲۰۴) و `getPendingApprovalsForApprover` (خط ۲۰۸) دارد اما این‌ها از طریق controller قابل دسترسی نیستند.
- **وضعیت**: ✅ تأیید شد

### ۸.۵ عدم یکپارچه‌سازی با audit-service
- **اشکال**: هیچ ارجاعی به audit-service برای ثبت audit trail عملیات governance وجود ندارد. تمام عملیات بحرانی مانند approval، validation و incident resolution باید در audit-service مرکزی ثبت شوند.
- **کد**: جستجو در کل `src/` هیچ ارجاعی به `audit-service` یا `AuditService` پیدا نکرد. `model-switchboard-governance.service.ts:auditModelSelection` (خط ۱۹۸) فقط `console.log` می‌کند. هیچ HTTP client یا Kafka producer برای ارسال audit events به audit-service پیکربندی نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۹. نقص‌های جدید (کشف شده در بررسی عمیق کد)

### ۹.۱ استفاده از in-memory Map به جای پایگاه داده — از دست رفتن داده در restart
- **اندپوینت**: تمام اندپوینت‌های incidents، committee، approvals، monitoring، validation
- **اشکال**: اکثر سرویس‌های governance داده‌ها را در `Map` در حافظه نگهداری می‌کنند نه در پایگاه داده. در صورت restart سرویس، تمام incidents، committee decisions، approval requests، monitoring metrics، anomalies، drift metrics و validation reports از بین می‌روند. این برای یک سرویس governance که audit trail و compliance را مدیریت می‌کند، بحرانی است.
- **کد**: 
  - `services/ai-incident-response.service.ts` (خط ۴۴-۴۵): `private incidents: Map<string, Incident>` و `private incidentActions: Map<string, IncidentAction[]>`
  - `services/committee-audit-trail.service.ts` (خط ۳۴-۳۵): `private decisions: Map<string, CommitteeDecision>` و `private members: Map<string, CommitteeMember>`
  - `services/deployment-approval-gate.service.ts` (خط ۳۶-۳۷): `private approvalRequests: Map<string, ApprovalRequest>` و `private approvalPolicies: Map<...>`
  - `services/monitoring-dashboard.service.ts` (خط ۴۵-۴۷): `private metricsHistory: Map<...>`, `private anomalies: Map<...>`, `private driftMetrics: Map<...>`
  - `services/validation-workflow.service.ts` (خط ۳۴): `private validationReports: Map<string, ValidationReport>`
  - `services/mro-dashboard.service.ts` (خط ۲۸): `private alerts: Alert[]`
  - فقط `ModelInventory` (entity) از پایگاه داده واقعی استفاده می‌کند.
- **وضعیت**: ✅ تأیید شد — نقص بحرانی

### ۹.۲ MRO Dashboard داده‌های hardcoded mock برمی‌گرداند
- **اندپوینت**: `GET /governance/mro/dashboard`
- **اشکال**: MRO dashboard به جای query از پایگاه داده، مقادیر hardcoded برمی‌گرداند. این داده‌ها همیشه یکسان هستند و بازتاب واقعی وضعیت سیستم نیستند.
- **کد**: `services/mro-dashboard.service.ts:getDashboardMetrics` (خط ۳۰-۶۲) — مقادیر مثل `totalModels: 25`، `modelsByStatus: { development: 8, testing: 5, ... }` hardcoded شده‌اند. کامنت خط ۳۱: `// In a real implementation, this would query the database`. متد `getModelRiskSummary` (خط ۶۴) و `getValidationTrends` (خط ۸۲) نیز mock داده برمی‌گردانند (در `getValidationTrends` از `Math.random()` استفاده می‌شود).
- **وضعیت**: ✅ تأیید شد

### ۹.۳ عدم 404 handling در اندپوینت‌های get-by-id
- **اندپوینت**: `GET /governance/incidents/:incidentId`، `GET /governance/approvals/:requestId`، `GET /governance/committee/decisions/:decisionId`، `GET /governance/validation/:reportId`
- **اشکال**: سرویس‌ها در صورت عدم یافتن رکورد، `null` برمی‌گردانند اما controller‌ها null را به صورت response 200 با body `null` برمی‌گردانند به جای 404. این باعث سردرگمی کلاینت می‌شود.
- **کد**: 
  - `controllers/governance.controller.ts:getIncident` (خط ۵۶) — `return this.incidentService.getIncident(incidentId)` — `getIncident` (خط ۲۵۶) `null` برمی‌گرداند.
  - `controllers/governance.controller.ts:getApprovalRequest` (خط ۱۶۹) — `getApprovalRequest` (خط ۱۹۶) `null` برمی‌گرداند.
  - `controllers/governance.controller.ts:getDecision` (خط ۱۲۶) — `getDecision` (خط ۴۹) `null` برمی‌گرداند.
  - `controllers/governance.controller.ts:getValidationReport` (خط ۲۴۶) — `getValidationReport` (خط ۲۰۳) `null` برمی‌گرداند.
  - در مقابل، `controllers/model-intake.controller.ts:getModel` (خط ۱۲۷) درست `throw new Error('Model not found')` می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۹.۴ عدم validation وجود modelId در ثبت metrics
- **اندپوینت**: `POST /governance/monitoring/metrics`
- **اشکال**: هنگام ثبت metrics، بررسی نمی‌شود که آیا `modelId` ارسال شده در `ModelInventory` وجود دارد یا خیر. می‌توان metrics برای یک مدل ناموجود ثبت کرد.
- **کد**: `services/monitoring-dashboard.service.ts:recordMetrics` (خط ۴۹-۶۲) — `metrics.modelId` بدون هیچ بررسی وجود در `ModelInventory` مستقیماً در `metricsHistory` Map ذخیره می‌شود. این سرویس هیچ injection از `ModelInventory` repository ندارد.
- **وضعیت**: ✅ تأیید شد

### ۹.۵ ModelSwitchboardGovernanceService بدون controller endpoint
- **اندپوینت**: ندارد (سرویس بدون controller)
- **اشکال**: `ModelSwitchboardGovernanceService` که governance checks برای model selection انجام می‌دهد (rate limiting، use case authorization، circuit breaker) هیچ controller endpoint ای ندارد و از طریق HTTP قابل دسترسی نیست. این سرویس فقط به صورت internal قابل استفاده است اما هیچ integration واقعی با model-switchboard-service وجود ندارد.
- **کد**: `services/model-switchboard-governance.service.ts` (کلاس کامل) — متدهای `registerModelPolicy`، `selectModel`، `getSelectionHistory` و غیره وجود دارند اما جستجو در `controllers/` نشان می‌دهد هیچ controller ای این سرویس را inject نکرده است. در `app.module.ts` این سرویس provider شده اما هیچ controller آن را استفاده نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۹.۶ AbacGuard برای GET requests همیشه allow می‌دهد
- **اندپوینت**: تمام اندپوینت‌های GET
- **اشکال**: `AbacGuard` برای تمام درخواست‌های GET بدون بررسی role، `true` برمی‌گرداند. این یعنی هر کاربر authenticated می‌تواند تمام داده‌های governance را بخواند حتی اگر permission مناسبی نداشته باشد (البته PermissionsGuard همچنان بررسی می‌کند).
- **کد**: `services/ai-governance-service/src/abac.guard.ts:canActivate` (خط ۱۵) — `if (method === 'GET') return true;`. برای non-GET، فقط بررسی `roles.length > 0` می‌کند (خط ۲۶) که بسیار ضعیف است.
- **وضعیت**: ✅ تأیید شد
