# Workflow Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: workflow-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/workflow-service/src/`

---

## ۱. تعریف Workflow و چرخه حیات

### ۱.۱ عدم validation تعریف workflow هنگام create
- **اندپوینت**: `POST /workflow/definitions`
- **اشکال**: request body شامل `definition` (object) است اما هیچ validation ای در زمان create انجام نمی‌شود. validation فقط در `GET /workflow/definitions/:id/validate` به‌صورت جداگانه وجود دارد. این یعنی یک definition نامعتبر می‌تواند create و activate شود و فقط در زمان start instance خطا دهد. validation باید در create اجباری باشد.
- **کد**: `workflow.service.ts:createDefinition` (سطر ۲۴-۷۹) — `definition: params.definition` مستقیماً در `manager.create` ذخیره می‌شود (سطر ۵۴) بدون هیچ validation. `status` به `DRAFT` تنظیم می‌شود (سطر ۵۵). `validateDefinition` (سطر ۱۳۱-۱۷۹) به‌صورت جداگانه وجود دارد و بررسی می‌کند: وجود nodes، وجود start node، وجود end node، معتبر بودن edges، و وجود outgoing edges برای همه node‌ها به‌جز end. اما این validation در `createDefinition` فراخوانی نمی‌شود. در `startInstance` (سطر ۱۹۵) فقط `startNode` بررسی می‌شود: `const startNode = def.definition.nodes.find(n => n.type === 'start')` و اگر نباشد `throw new Error` می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم versioning immutable
- **اندپوینت**: `POST /workflow/definitions`، `PUT /workflow/definitions/:id`
- **اشکال**: `version` در request body وجود دارد اما `PUT /workflow/definitions/:id` مستقیماً definition را update می‌کند. اگر instance‌های در حال اجرا روی نسخه قدیمی باشند، update می‌تواند به inconsistent state منجر شود. update باید نسخه جدید ایجاد کند و نسخه قدیمی باید immutable باقی بماند.
- **کد**: `workflow.service.ts:createDefinition` (سطر ۳۷-۴۷) — `version` به‌صورت auto-increment محاسبه می‌شود: `(lastDef?.version || 0) + 1`. `updateDefinition` (سطر ۶۲۰-۶۳۸) — `def.definition = patch.definition` مستقیماً definition موجود را mutate می‌کند و `this.definitionRepo.save(def)` ذخیره می‌کند. هیچ نسخه جدیدی ایجاد نمی‌شود. entity `WorkflowDefinition` (`entities/WorkflowDefinition.ts` سطر ۴۷) فیلد `version` دارد اما `@Unique` روی `(tenantId, key, version)` وجود ندارد. instance‌های در حال اجرا با `workflowDefinitionId` به definition وصل می‌شوند (entity `WorkflowInstance` سطر ۲۴) و اگر `definition` تغییر کند، رفتار instance‌های قدیمی تغییر می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم rollback به نسخه قبلی
- **اندپوینت**: `PUT /workflow/definitions/:id/activate`، `PUT /workflow/definitions/:id/deactivate`
- **اشکال**: activate و deactivate وجود دارد اما هیچ rollback‌ای به نسخه قبلی وجود ندارد. اگر نسخه جدید activate شود و مشکلاتی ایجاد کند، باید بتوان به نسخه قبلی rollback کرد. هیچ `PUT /workflow/definitions/:id/rollback` وجود ندارد.
- **کد**: `workflow.service.ts:activateDefinition` (سطر ۸۱-۱۰۴) — `def.status = WorkflowStatus.ACTIVE` و `def.activatedAt = new Date()`. `deactivateDefinition` (سطر ۱۰۶-۱۲۹) — `def.status = WorkflowStatus.INACTIVE` و `def.deactivatedAt = new Date()`. هیچ متد rollback وجود ندارد. از آنجا که `updateDefinition` مستقیماً definition را mutate می‌کند (سطر ۶۳۲)، نسخه قبلی از بین می‌رود و rollback امکان‌پذیر نیست.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم diff بین نسخه‌ها
- **اندپوینت**: `GET /workflow/definitions/:id`
- **اشکال**: فقط get یک definition وجود دارد. هیچ اندپوینتی برای مقایسه diff بین دو نسخه definition وجود ندارد. برای audit و review تغییرات، diff ضروری است.
- **کد**: `workflow.controller.ts:getDefinition` (سطر ۱۲۱-۱۳۴) — فقط `this.service.getDefinition(id)` را فراخوانی می‌کند. `workflow.service.ts:getDefinition` (سطر ۵۸۵-۵۸۷) — `this.definitionRepo.findOne({ where: { id } })`. هیچ متد diff در service وجود ندارد. `listDefinitions` (سطر ۵۸۹-۶۱۸) امکان فیلتر بر اساس `key` را دارد که می‌تواند نسخه‌های یک key را برگرداند، اما مقایسه diff وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ عدم endpoint برای Template‌ها
- **اندپوینت**: (موجود نیست)
- **اشکال**: `WorkflowService` متدهای `createTemplate`، `listTemplates` و `createDefinitionFromTemplate` را دارد اما هیچ controller endpoint‌ای برای دسترسی به این متدها وجود ندارد. entity `WorkflowTemplate` در module ثبت شده اما از طریق API قابل دسترسی نیست.
- **کد**: `workflow.service.ts:createTemplate` (سطر ۷۱۰-۷۴۵)، `listTemplates` (سطر ۷۴۷-۷۶۷)، `createDefinitionFromTemplate` (سطر ۷۶۹-۷۹۲) — همه پیاده‌سازی شده‌اند. `workflow.controller.ts` — هیچ route برای `templates` وجود ندارد. `app.module.ts` (سطر ۲۸-۳۰) — `WorkflowTemplate` در `TypeOrmModule.forFeature` ثبت شده. `permissions.ts` (سطر ۱۲-۱۴) — `workflow:templates:create`، `workflow:templates:view`، `workflow:templates:list` تعریف شده‌اند اما به‌کار گرفته نمی‌شوند.
- **وضعیت**: ✅ تأیید شد — نقص جدید

---

## ۲. اجرای Instance و State Machine

### ۲.۱ عدم idempotency در start instance
- **اندپوینت**: `POST /workflow/instances`
- **اشکال**: start instance با `workflowKey` و `businessKey` انجام می‌شود اما هیچ idempotency key‌ای وجود ندارد. اگر کلاینت retry کند، دو instance برای همان businessKey ایجاد می‌شود. باید با businessKey به‌عنوان idempotency key از duplicate جلوگیری شود.
- **کد**: `workflow.service.ts:startInstance` (سطر ۱۸۱-۲۵۱) — هیچ idempotency check وجود ندارد. `businessKey` در body قبول می‌شود (سطر ۱۸۴) و در instance ذخیره می‌شود (سطر ۲۰۵). entity `WorkflowInstance` (`entities/WorkflowInstance.ts` سطر ۱۴) — `@Index(['businessKey'])` وجود دارد اما `@Unique` نیست. بنابراین duplicate instance با همان `businessKey` امکان‌پذیر است. برخلاف workflow-engine-service که `@Unique(['tenantId', 'businessKey'])` دارد، اینجا هیچ unique constraint وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم deadlock prevention در advance و complete
- **اندپوینت**: `POST /workflow/instances/:id/advance`، `POST /workflow/instances/:id/tasks/:taskId/complete`
- **اشکال**: advance و complete می‌توانند concurrent فراخوانی شوند. هیچ optimistic locking‌ای با version number وجود ندارد. اگر دو کاربر همزمان یک task را complete کنند، race condition ایجاد می‌شود. باید version-based locking باشد.
- **کد**: `workflow.service.ts:advanceInstance` (سطر ۲۵۳-۳۶۸) — instance با `this.instanceRepo.findOne` خوانده می‌شود (سطر ۲۵۴)، mutate می‌شود و با `this.instanceRepo.save` ذخیره می‌شود. هیچ optimistic locking یا version check وجود ندارد. `completeTask` (سطر ۴۰۷-۴۲۹) — instance را با `findOne` می‌خواند (سطر ۴۰۸)، variables را update می‌کند (سطر ۴۲۱) و سپس `advanceInstance` را فراخوانی می‌کند (سطر ۴۲۸). entity `WorkflowInstance` هیچ فیلد `version` برای optimistic locking ندارد. `@UpdateDateColumn` (سطر ۸۷) وجود دارد اما در query‌ها استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم suspend/resume برای instance
- **اندپوینت**: `PUT /workflow/instances/:id/cancel`
- **اشکال**: فقط cancel وجود دارد. هیچ suspend و resume‌ای وجود ندارد. برای فرآیندهای طولانی که نیاز به توقف موقت دارند (مثلاً منتظر اطلاعات خارجی)، suspend/resume ضروری است.
- **کد**: `entities/WorkflowInstance.ts` (سطر ۸) — `InstanceStatus.SUSPENDED` در enum وجود دارد. `cancelInstance` (سطر ۵۷۴-۵۸۳) — فقط `status` را به `CANCELLED` تغییر می‌دهد. هیچ متد `suspendInstance` یا `resumeInstance` در service وجود ندارد. `advanceInstance` (سطر ۲۵۶-۲۵۸) — اگر `instance.status !== InstanceStatus.RUNNING` باشد، `throw new Error` می‌کند، پس instance در حالت `SUSPENDED` قابل advance نیست.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم retry برای failed instance
- **اندپوینت**: `POST /workflow/instances/:id/advance`
- **اشکال**: اگر instance به وضعیت `failed` برود، هیچ اندپوینتی برای retry از نقطه شکست وجود ندارد. فقط cancel می‌شود. retry از task آخر برای فرآیندهای طولانی ضروری است.
- **کد**: `entities/WorkflowInstance.ts` (سطر ۶) — `InstanceStatus.FAILED` در enum وجود دارد. `advanceInstance` (سطر ۲۵۶-۲۵۸) — اگر `instance.status !== InstanceStatus.RUNNING` باشد، `throw new Error` می‌کند. هیچ متد `retryInstance` در service وجود ندارد. `error` field (سطر ۶۸-۷۳) در entity وجود دارد اما هیچ مکانیزمی برای retry از نقطه شکست پیاده‌سازی نشده. در عمل، هیچ کدی وجود ندارد که status را به `FAILED` تغییر دهد — `advanceInstance` در صورت خطا `throw` می‌کند اما status را به `FAILED` تغییر نمی‌دهد.
- **وضعیت**: ✅ تأیید شد

### ۲.۵ عدم validation transition در advance
- **اندپوینت**: `POST /workflow/instances/:id/advance`
- **اشکال**: advance فقط `userId` را قبول می‌کند و instance را به stage بعدی می‌برد. اما هیچ validation‌ای بررسی نمی‌کند که آیا transition از node فعلی به node بعدی معتبر است یا خیر. اگر instance در یک node conditional باشد، advance بدون بررسی condition انجام می‌شود.
- **کد**: `workflow.service.ts:advanceInstance` (سطر ۲۵۳-۳۶۸) — برای gateway nodes (سطر ۳۱۶-۳۶۴) condition‌ها بررسی می‌شوند: `exclusive` gateway (سطر ۳۱۹-۳۳۱) با `evaluateCondition`، `parallel` gateway (سطر ۳۳۲-۳۴۲) branch ایجاد می‌کند، `inclusive` gateway (سطر ۳۴۳-۳۶۳) همه matching edge‌ها را take می‌کند. اما برای non-gateway nodes (task, event) (سطر ۳۶۷) — `return this.moveToNode(instance, outgoingEdges[0].to, def, userId)` — همیشه اولین outgoing edge انتخاب می‌شود بدون بررسی condition. `evaluateCondition` (سطر ۴۸۴-۵۲۲) از regex برای parse condition استفاده می‌کند و در صورت خطا `return true` می‌کند (سطر ۵۲۰) که یعنی condition نامعتبر همیشه pass می‌شود.
- **وضعیت**: ✅ تأیید شد — با اصلاح: برای gateway nodes condition بررسی می‌شود، اما برای non-gateway nodes همیشه اولین edge انتخاب می‌شود. `evaluateCondition` در صورت خطا `true` برمی‌گرداند که خطرناک است.

### ۲.۶ عدم re-advance برای parallel gateway branches
- **اندپوینت**: `POST /workflow/instances/:id/advance`
- **اشکال**: وقتی parallel gateway branch‌های فرزند ایجاد می‌کند، parent instance به `WAITING` می‌رود اما هیچ مکانیزمی برای re-advance کردن parent وقتی branch‌ها کامل می‌شوند وجود ندارد.
- **کد**: `workflow.service.ts:advanceInstance` (سطر ۳۳۲-۳۴۲) — `parallel` gateway: `branchInstances` ایجاد می‌شوند (سطر ۳۳۶-۳۳۷)، `instance.currentNode.branches = branchInstances.map(b => b.id)` (سطر ۳۴۰)، `instance.status = InstanceStatus.WAITING` (سطر ۳۴۱). `createBranchInstance` (سطر ۳۷۰-۴۰۵) — branch با `status: RUNNING` ایجاد می‌شود. هیچ کدی وجود ندارد که وقتی branch‌ها کامل می‌شوند parent را از `WAITING` به `RUNNING` برگرداند. `inclusive` gateway (سطر ۳۴۳-۳۶۳) همین مشکل را دارد.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۲.۷ عدم اجرای واقعی task‌ها در executeTask
- **اندپوینت**: `POST /workflow/instances/:id/advance`
- **اشکال**: `executeTask` در واقع هیچ service‌ای را فراخوانی نمی‌کند. فقط log می‌کند و متغیرها را map می‌کند. task‌های automated در عمل اجرا نمی‌شوند.
- **کد**: `workflow.service.ts:executeTask` (سطر ۴۶۸-۴۸۲) — `this.logger.log('Would call service: ' + node.config.service, node.config.params)` (سطر ۴۷۳) — فقط log می‌کند، service را فراخوانی نمی‌کند. `outputMapping` (سطر ۴۷۷-۴۸۱) از `node.config.output` استفاده می‌کند که همیشه `undefined` است چون هیچ output‌ای تولید نمی‌شود.
- **وضعیت**: ✅ تأیید شد — نقص جدید

---

## ۳. Task Management

### ۳.۱ عدم claim/release برای task
- **اندپوینت**: `POST /workflow/instances/:id/tasks/:taskId/complete`
- **اشکال**: فقط complete task وجود دارد. هیچ claim (اختصاص به خود) و release (آزاد کردن) برای task وجود ندارد. در یک سیستم multi-user، اگر چند کاربر بتوانند یک task را complete کنند، باید claim قبل از complete باشد تا از concurrent complete جلوگیری شود.
- **کد**: `workflow.controller.ts` (سطر ۱۹۵-۲۱۲) — فقط `completeTask` endpoint وجود دارد. `workflow.service.ts:completeTask` (سطر ۴۰۷-۴۲۹) — `instance.currentNode.completedBy = userId` (سطر ۴۲۵) و `instance.currentNode.completedAt = new Date()` (سطر ۴۲۶). هیچ مکانیزم claim وجود ندارد. `currentNode` در entity `WorkflowInstance` (سطر ۴۵-۵۶) فیلدهای `assignee`، `candidateUsers`، `candidateGroups` دارد اما در `advanceInstance` (سطر ۲۸۲-۲۸۴) فقط set می‌شوند و هیچ claim/release‌ای روی آن‌ها انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم list tasks برای یک instance
- **اندپوینت**: `GET /workflow/instances/:id`
- **اشکال**: get instance برمی‌گرداند اما هیچ اندپوینتی برای list tasks یک instance وجود ندارد. برای dashboard کاربر، باید بتوان task‌های pending یک instance را دید. `GET /workflow/instances/:id/tasks` وجود ندارد.
- **کد**: `workflow.controller.ts` (سطر ۲۳۰-۲۴۳) — فقط `getInstance` وجود دارد. `workflow.service.ts:getInstance` (سطر ۵۳۵-۵۳۷) — `this.instanceRepo.findOne({ where: { id: instanceId } })`. `currentNode` (سطر ۴۵-۵۶ در entity) فقط یک node را نگه می‌دارد. `history` (سطر ۵۹-۶۶) همه node‌های قبلی را دارد اما هیچ endpoint‌ای برای list کردن task‌های pending (مثلاً userTask‌های در انتظار) وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم delegation و reassignment
- **اندپوینت**: `POST /workflow/instances/:id/tasks/:taskId/complete`
- **اشکال**: task فقط complete می‌شود. هیچ اندپوینتی برای delegate (ارجاع به کاربر دیگر) یا reassign وجود ندارد. اگر کاربر تعیین‌شده در دسترس نباشد، باید manager بتواند task را reassign کند.
- **کد**: `workflow.controller.ts` — هیچ endpoint برای delegate یا reassign وجود ندارد. `workflow.service.ts` — هیچ متد `delegateTask` یا `reassignTask` وجود ندارد. `currentNode.assignee` (entity سطر ۴۹) set می‌شود در `advanceInstance` (سطر ۲۸۲) از `node.config?.assignee` اما هیچ راهی برای تغییر آن بعد از set شدن وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم task deadline و SLA
- **اندپوینت**: `POST /workflow/instances/:id/tasks/:taskId/complete`
- **اشکال**: هیچ deadline یا SLA‌ای برای task تعریف نشده. اگر task برای مدت طولانی pending بماند، هیچ escalation‌ای وجود ندارد. deadline و auto-escalation برای SLA management ضروری است.
- **کد**: `workflow.service.ts:advanceInstance` (سطر ۲۸۵) — `instance.currentNode.dueDate = currentNode.config?.dueDate ? new Date(currentNode.config.dueDate) : null` — `dueDate` set می‌شود اما هیچ مکانیزمی برای بررسی deadline یا escalation وجود ندارد. `timerEvent` (سطر ۲۹۰-۳۰۴) — `dueDate` محاسبه می‌شود اما هیچ timer یا scheduler‌ای برای auto-escalation وجود ندارد. هیچ cron job یا background process‌ای برای بررسی overdue task‌ها پیاده‌سازی نشده.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Metrics و Monitoring

### ۴.۱ عدم تفکیک metrics بر اساس node
- **اندپوینت**: `GET /workflow/instances/metrics`
- **اشکال**: metrics در سطح instance است. هیچ metrics در سطح node (مثلاً میانگین زمان در هر node، bottleneck identification) وجود ندارد. برای بهینه‌سازی workflow، باید مشخص باشد کدام node زمان‌بر است.
- **کد**: `workflow.service.ts:getInstanceMetrics` (سطر ۶۴۵-۷۰۸) — `totalInstances`، `completedInstances`، `runningInstances`، `cancelledInstances`، `avgCompletionTimeMs`، `mostUsedWorkflows` محاسبه می‌شوند. `avgCompletionTimeMs` (سطر ۶۸۱-۶۸۳) — `completedAt.getTime() - createdAt.getTime()` که زمان کل instance است، نه زمان در هر node. `history` در entity (سطر ۵۹-۶۶) شامل `enteredAt` و `exitedAt` برای هر node است که می‌تواند برای node-level metrics استفاده شود، اما هیچ کدی این را محاسبه نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم real-time metrics
- **اندپوینت**: `GET /workflow/instances/metrics`
- **اشکال**: metrics با `fromDate`/`toDate` fetch می‌شود اما مشخص نیست real-time هستند یا cached/aggregated. برای dashboard real-time، باید metrics به‌صورت live محاسبه شوند یا با short cache window.
- **کد**: `workflow.service.ts:getInstanceMetrics` (سطر ۶۵۸-۷۰۷) — `const instances = await qb.getMany()` (سطر ۶۷۱) — همه instance‌ها از DB خوانده می‌شوند و metrics در memory محاسبه می‌شود. هیچ caching یا aggregation table وجود ندارد. metrics real-time هستند اما برای dataset‌های بزرگ، performance issue ایجاد می‌کند چون همه instance‌ها در memory load می‌شوند. `mostUsedWorkflows` (سطر ۶۸۵-۶۹۸) — `workflowCount` Map در memory ساخته می‌شود. `workflowName` از `instance.currentNode.nodeName` (سطر ۶۹۱) گرفته می‌شود که نام node فعلی است، نه نام workflow — این یک bug است.
- **وضعیت**: ✅ تأیید شد — با اصلاح: metrics real-time هستند (نه cached)، اما performance issue برای dataset‌های بزرگ دارند. همچنین `workflowName` به‌اشتباه از `currentNode.nodeName` گرفته می‌شود.

### ۴.۳ عدم alerting روی metrics
- **اندپوینت**: `GET /workflow/instances/metrics`
- **اشکال**: هیچ alerting‌ای روی metrics وجود ندارد. اگر نرخ شکست instance از threshold عبور کند یا میانگین زمان تکمیل افزایش یابد، هیچ notification‌ای ارسال نمی‌شود.
- **کد**: `workflow.service.ts:getInstanceMetrics` (سطر ۶۴۵-۷۰۸) — فقط محاسبه و برگرداندن metrics. هیچ threshold check یا alerting mechanism وجود ندارد. هیچ integration با notification-service برای alert وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Ecosystem AI و Profile Recommendations

### ۵.۱ عدم caching برای recommendations
- **اندپوینت**: `GET /ecosystem-ai/recommendations`
- **اشکال**: recommendations در هر request محاسبه می‌شوند. برای subject‌هایی که به‌ندرت تغییر می‌کنند، caching recommendations (با TTL) می‌تواند performance و هزینه AI را کاهش دهد.
- **کد**: `profile-reco.controller.ts:getRecommendations` (سطر ۱۳-۲۸) — `this.adapter.getRecommendations(authToken, subjectId, domain, maxResults)` در هر request فراخوانی می‌شود. `profile-reco.adapter.ts:getRecommendations` (سطر ۳۴-۶۱) — `fetch('${this.baseURL}/api/v1/recommend', ...)` در هر request به external service فراخوانی می‌شود. هیچ caching layer وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم feedback loop برای بهبود مدل
- **اندپوینت**: `POST /ecosystem-ai/feedback`
- **اشکال**: feedback ثبت می‌شود اما مشخص نیست چگونه به بهبود مدل منجر می‌شود. هیچ اندپوینتی برای مشاهده aggregation feedback‌ها یا retraining trigger وجود ندارد.
- **کد**: `profile-reco.controller.ts:recordFeedback` (سطر ۴۰-۴۸) — `this.adapter.recordFeedback(authToken, body)` به external service ارسال می‌شود. `profile-reco.adapter.ts:recordFeedback` (سطر ۸۶-۱۰۶) — `fetch('${this.baseURL}/api/v1/feedback', ...)` به profile-reco-fabric ارسال می‌شود. هیچ endpoint برای مشاهده aggregation feedback یا retraining trigger در workflow-service وجود ندارد. همه feedback به external service delegate می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم rate limiting روی signals
- **اندپوینت**: `POST /ecosystem-ai/signals`
- **اشکال**: signals بدون rate limiting پذیرفته می‌شوند. یک کلاینت می‌تواند حجم زیادی signal ارسال کند که به storage و processing فشار می‌آورد. rate limiting per subjectId ضروری است.
- **کد**: `profile-reco.controller.ts:publishSignals` (سطر ۳۰-۳۸) — `this.adapter.publishDomainSignals(authToken, body.subjectId, body.traits)` بدون هیچ rate limiting. `profile-reco.adapter.ts:publishDomainSignals` (سطر ۶۳-۸۴) — `fetch('${this.baseURL}/api/v1/profile/${subjectId}', ...)` به external service ارسال می‌شود. هیچ throttle یا rate limit در controller یا adapter وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ عدم validation subjectId با tenant
- **اندپوینت**: `GET /ecosystem-ai/recommendations`، `POST /ecosystem-ai/signals`
- **اشکال**: `subjectId` در request body ارسال می‌شود اما مشخص نیست آیا به tenant فعلی bind می‌شود یا خیر. اگر TenantGuard به‌درستی اعمال نشود، یک tenant می‌تواند recommendations tenant دیگر را ببیند.
- **کد**: `profile-reco.controller.ts:getRecommendations` (سطر ۱۳-۲۸) — `subjectId` از query param گرفته می‌شود و به adapter پاس داده می‌شود. `publishSignals` (سطر ۳۰-۳۸) — `subjectId` از body گرفته می‌شود. `TenantGuard` (`packages/shared/src/tenant-guard.ts` سطر ۲۸-۷۳) — tenant user را از `user.tenantId` استخراج می‌کند و در `request.tenantId` set می‌کند، اما `subjectId` با tenant هیچ ارتباطی داده نمی‌شود. `subjectId` مستقیماً به external profile-reco-fabric ارسال می‌شود بدون validation اینکه متعلق به tenant فعلی است.
- **وضعیت**: ✅ تأیید شد

---

## ۶. یکپارچه‌سازی و تکرار

### ۶.۱ تکرار جدی با workflow-engine-service
- **اندپوینت**: `POST /workflow/definitions`، `POST /workflow/instances`، `GET /workflow/instances`
- **اشکال**: workflow-service و workflow-engine-service هر دو `/workflow/definitions` و `/workflow/instances` دارند. این تکرار جدی است و مشخص نیست کدام canonical است. اگر هر دو فعال باشند، کلاینت‌ها نمی‌دانند از کدام استفاده کنند و data بین دو سرویس split می‌شود.
- **کد**: `workflow.controller.ts` — `/workflow/definitions` (سطر ۱۵)، `/workflow/instances` (سطر ۱۵۷). `workflow-engine-service` نیز همین route‌ها را دارد. هر دو سرویس entity‌های جداگانه دارند: `WorkflowDefinition`/`WorkflowInstance` در workflow-service و `ProcessDefinition`/`ProcessInstance` در workflow-engine-service. هر دو در schema‌های جداگانه DB ذخیره می‌شوند (`workflow_service` و `workflow_engine`). هیچ reference‌ای بین دو سرویس وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم یکپارچه‌سازی با orchestrator-service
- **اندپوینت**: `POST /workflow/instances`
- **اشکال**: orchestrator-service نیز `/workflows/processes/:processType/start` دارد. مشخص نیست آیا orchestrator-service از workflow-service استفاده می‌کند یا مستقل است. اگر مستقل باشند، دو موتور workflow موازی وجود دارد.
- **کد**: `workflow-service` هیچ reference‌ای به orchestrator-service در کد ندارد. `profile-reco.adapter.ts` فقط به `PROFILE_RECO_FABRIC_URL` وصل می‌شود. هیچ outbound HTTP call به orchestrator-service وجود ندارد. `OutboxPublisher` events را به Kafka منتشر می‌کند اما هیچ consumer برای این events در workflow-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم event publishing
- **اندپوینت**: `POST /workflow/instances`، `POST /workflow/instances/:id/advance`، `POST /workflow/instances/:id/tasks/:taskId/complete`
- **اشکال**: هیچ اشاره‌ای به event publishing به Kafka در endpoint‌ها وجود ندارد. برای یکپارچه‌سازی با notification-service و audit، event‌های workflow.started، workflow.task_completed، workflow.completed باید منتشر شوند.
- **کد**: `workflow.service.ts` — `OutboxPublisher` به‌طور گسترده استفاده می‌شود: `createDefinition` (سطر ۶۱-۷۶) — `insurance.workflow.definition.created`، `activateDefinition` (سطر ۸۸-۱۰۱) — `insurance.workflow.definition.activated`، `deactivateDefinition` (سطر ۱۱۳-۱۲۶) — `insurance.workflow.definition.deactivated`، `startInstance` (سطر ۲۲۷-۲۴۲) — `insurance.workflow.instance.started`، `createTemplate` (سطر ۷۲۹-۷۴۲) — `insurance.workflow.template.created`. اما `advanceInstance`، `completeTask` و `cancelInstance` هیچ event‌ای منتشر نمی‌کنند. `advanceInstance` (سطر ۲۷۰-۲۷۸) — وقتی instance به `COMPLETED` می‌رسد، هیچ event‌ای منتشر نمی‌شود. `cancelInstance` (سطر ۵۷۴-۵۸۳) — فقط `update` می‌کند، هیچ event‌ای منتشر نمی‌کند.
- **وضعیت**: ~~رد شد~~ — **با اصلاح**: event publishing وجود دارد برای `definition.created`، `definition.activated`، `definition.deactivated`، `instance.started` و `template.created`. اما event‌های `instance.completed`، `instance.cancelled`، `task.completed` و `task.assigned` منتشر نمی‌شوند که برای notification و audit ضروری هستند.

---

## ۷. امنیت و کنترل دسترسی

### ۷.۱ عدم permission صریح در endpoint‌ها
- **اندپوینت**: تمام `/workflow/*` و `/ecosystem-ai/*` endpoints
- **اشکال**: کاتالوگ می‌نویسد "Permission: (implicit from guards)". هیچ permission صریحی تعریف نشده. این یعنی تمام کاربران authenticated می‌توانند تمام عملیات‌ها را انجام دهند. RBAC باید permission‌های جداگانه برای define، start، advance، complete، cancel، metrics تعریف کند.
- **کد**: `permissions.ts` (سطر ۱-۱۶) — ۱۵ `PermissionKey` تعریف شده: `workflow:definitions:create`، `workflow:definitions:view`، ... `workflow:export`. `permissions.decorator.ts` — `@RequirePermissions` decorator تعریف شده. اما grep در کل سرویس نشان می‌دهد `@RequirePermissions` در هیچ controller method‌ای استفاده نشده. `permissions.guard.ts` (سطر ۱۵) — `if (!required || required.length === 0) return true` — اگر هیچ permission‌ی required نباشد، guard همیشه `true` برمی‌گرداند. بنابراین همه endpoint‌ها برای همه authenticated users باز هستند. `ROLE_TO_PERMISSIONS` (سطر ۱۸-۶۲) — `insurer_admin`، `head_office_ops`، `workflow_ops` نقش‌ها تعریف شده‌اند اما به‌کار گرفته نمی‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم ABAC برای data isolation
- **اندپوینت**: `GET /workflow/instances`، `GET /workflow/instances/:id`
- **اشکال**: AbacGuard ذکر شده اما هیچ attribute-based policy‌ای تعریف نشده. یک کاربر می‌تواند instances همه tenant‌ها را ببیند (اگر tenantId در query param نباشد). data isolation بر اساس tenant و organization ضروری است.
- **کد**: `abac.guard.ts` (سطر ۱-۲۸) — `if (method === 'GET') return true` (سطر ۱۵) — همه GET request‌ها برای همه authenticated users مجاز هستند. `if (hasAdmin) return true` (سطر ۲۲) — admin role‌ها همه عملیات‌ها مجاز هستند. `return roles.length > 0` (سطر ۲۶) — هر کاربر با هر role‌ای می‌تواند non-GET عملیات انجام دهد. هیچ attribute-based policy واقعی وجود ندارد. `tenant.guard.ts` (`packages/shared/src/tenant-guard.ts` سطر ۲۸-۷۳) — `request.tenantId = userTenantId` (سطر ۷۱) — tenantId را set می‌کند. `workflow.controller.ts:listInstances` (سطر ۲۵۱) — `tenantId: req?.user?.tenantId || query.tenantId` — اگر `req.user.tenantId` وجود داشته باشد از آن استفاده می‌کند، در غیر این صورت از `query.tenantId`. برای system/service accounts (`isServiceOrSystemUser` در TenantGuard سطر ۴۲-۴۸) `tenantId` از header یا query param گرفته می‌شود که می‌تواند cross-tenant access ایجاد کند.
- **وضعیت**: ✅ تأیید شد — با اصلاح: TenantGuard tenant isolation را تا حدی فراهم می‌کند، اما AbacGuard واقعاً attribute-based نیست و برای system accounts cross-tenant access ممکن است.

### ۷.۳ عدم validation userId با token در advance/complete
- **اندپوینت**: `POST /workflow/instances/:id/advance` (body: `userId`)، `POST /workflow/instances/:id/tasks/:taskId/complete` (body: `userId`)
- **اشکال**: `userId` در request body ارسال می‌شود و هیچ validation‌ای بررسی نمی‌کند که آیا userId با identity token مطابقت دارد یا خیر. یک کاربر می‌تواند به‌جای کاربر دیگر advance یا complete کند.
- **کد**: `workflow.controller.ts:advanceInstance` (سطر ۱۷۸-۱۹۳) — `body.userId` مستقیماً به `this.service.advanceInstance(id, body.userId)` پاس داده می‌شود. `completeTask` (سطر ۱۹۵-۲۱۲) — `body.userId` مستقیماً به `this.service.completeTask(id, taskId, body.userId, body.variables)` پاس داده می‌شود. `jwt-auth.guard.ts` (سطر ۲۶) — `const payload = jwt.verify(token, this.jwtSecret)` و `request.user = payload` — user از token استخراج می‌شود اما `body.userId` با `request.user.userId` یا `request.user.sub` مقایسه نمی‌شود. `workflow.service.ts:completeTask` (سطر ۴۲۵) — `instance.currentNode.completedBy = userId` — هر userId می‌تواند به‌عنوان completer ثبت شود.
- **وضعیت**: ✅ تأیید شد

---

## ۸. ذینفعان و مصرف‌کنندگان

### ۸.۱ عدم دسترسی claims-service به workflow management
- **اشکال**: claims-service برای مدیریت فرآیند claim نیاز به start، advance و complete task دارد. اما مشخص نیست چه permission‌هایی به claims-service اختصاص داده شده. با "implicit from guards" نمی‌توان RBAC را مدیریت کرد.
- **کد**: `permissions.ts` (سطر ۱۸-۶۲) — فقط `insurer_admin`، `head_office_ops`، `workflow_ops` تعریف شده‌اند. هیچ نقش `claims_service` یا `claims_agent` وجود ندارد. `permissionsForRoles` (سطر ۶۴-۷۳) — اگر role ناشناخته باشد، `continue` می‌کند و هیچ permission‌ی نمی‌دهد. اما چون `@RequirePermissions` هیچ‌کجا استفاده نشده، PermissionsGuard همیشه `true` برمی‌گرداند و هر authenticated user (از جمله claims-service با service token) می‌تواند همه عملیات را انجام دهد.
- **وضعیت**: ✅ تأیید شد — با اصلاح: در عمل به دلیل عدم استفاده از `@RequirePermissions`، claims-service دسترسی دارد اما به‌صورت ناامنانه و بدون کنترل RBAC.

### ۸.۲ عدم یکپارچه‌سازی با notification-service برای task assignment
- **اشکال**: وقتی task به کاربری اختصاص می‌یابد، باید مطلع شود. اما هیچ event‌ای به notification-service ارسال نمی‌شود. کاربر باید خودش poll کند.
- **کد**: `workflow.service.ts:advanceInstance` (سطر ۲۸۱-۲۸۷) — وقتی `userTask` node رسید، `assignee`، `candidateUsers`، `candidateGroups` و `dueDate` set می‌شوند اما هیچ event منتشر نمی‌شود. `startInstance` (سطر ۲۲۷-۲۴۲) — `insurance.workflow.instance.started` منتشر می‌شود اما این event برای task assignment نیست. هیچ event برای `task.assigned` یا `task.completed` وجود ندارد. `OutboxPublisher` فقط در `createDefinition`، `activateDefinition`، `deactivateDefinition`، `startInstance` و `createTemplate` استفاده شده — نه در `advanceInstance` یا `completeTask`.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ عدم dashboard برای operations team
- **اشکال**: metrics وجود دارد اما dashboard کامل (تعداد instances در حال اجرا، task‌های pending، SLA breaches) وجود ندارد. operations team باید از چند endpoint دستی جمع‌آوری کند.
- **کد**: `workflow.controller.ts:getInstanceMetrics` (سطر ۲۶۷-۲۸۳) — فقط `getInstanceMetrics` را فراخوانی می‌کند. `workflow.service.ts:getInstanceMetrics` (سطر ۶۴۵-۷۰۸) — `totalInstances`، `completedInstances`، `runningInstances`، `cancelledInstances`، `avgCompletionTimeMs`، `mostUsedWorkflows` را برمی‌گرداند. هیچ metric برای pending tasks، SLA breaches، overdue tasks، یا failed instances وجود ندارد. `InstanceStatus.FAILED` در enum وجود دارد اما در metrics شمارش نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۸.۴ عدم دسترسی customer-portal به workflow status
- **اشکال**: مشتری برای دیدن وضعیت claim/policy خود نیاز به workflow status دارد. اما هیچ BFF یا endpoint عمومی برای customer وجود ندارد. customer باید از طریق claims-service یا policy-service غیرمستقیم ببیند که ممکن است status real-time نباشد.
- **کد**: `workflow.controller.ts` — همه endpoint‌ها با `JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard` محافظت می‌شوند (سطر ۱۱). هیچ endpoint عمومی یا BFF برای customer وجود ندارد. `getInstance` (سطر ۲۳۰-۲۴۳) — فقط instance را برمی‌گرداند اما نیاز به authentication دارد و هیچ فیلتر برای محدود کردن به instance‌های مرتبط با customer وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۹. نقایص جدید کشف‌شده

### ۹.۱ عدم delete برای instances
- **اندپوینت**: (موجود نیست)
- **اشکال**: هیچ endpoint‌ای برای delete یک workflow instance وجود ندارد. فقط `cancel` وجود دارد که status را به `CANCELLED` تغییر می‌دهد اما رکورد را حذف نمی‌کند. برای GDPR compliance و data retention، delete ضروری است.
- **کد**: `workflow.controller.ts` — هیچ `DELETE /workflow/instances/:id` وجود ندارد. `workflow.service.ts` — هیچ متد `deleteInstance` وجود ندارد. `cancelInstance` (سطر ۵۷۴-۵۸۳) — فقط `update` می‌کند.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۹.۲ عدم فیلتر instances بر اساس date range
- **اندپوینت**: `GET /workflow/instances`
- **اشکال**: `listInstances` فیلتر `fromDate`/`toDate` را پشتیبانی نمی‌کند. فقط `getInstanceMetrics` این فیلتر را دارد. برای audit و reporting، فیلتر بر اساس date range در list ضروری است.
- **کد**: `workflow.controller.ts:listInstances` (سطر ۲۴۵-۲۶۵) — query params: `tenantId`، `workflowKey`، `businessKey`، `status`، `initiatorUserId`، `limit`، `offset`. `workflow.service.ts:listInstances` (سطر ۵۳۹-۵۷۲) — `qb.andWhere` فقط برای `workflowKey`، `businessKey`، `status`، `initiatorUserId`. هیچ فیلتر `fromDate`/`toDate` وجود ندارد. `getInstanceMetrics` (سطر ۶۶۴-۶۶۸) — `fromDate` و `toDate` را پشتیبانی می‌کند.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۹.۳ عدم export endpoint
- **اندپوینت**: (موجود نیست)
- **اشکال**: `workflow:export` permission در `permissions.ts` تعریف شده اما هیچ endpoint‌ای برای export workflow definitions یا instances وجود ندارد.
- **کد**: `permissions.ts` (سطر ۱۶) — `'workflow:export'` تعریف شده. `insurer_admin` (سطر ۳۴)، `head_office_ops` (سطر ۴۴)، `workflow_ops` (سطر ۶۰) این permission را دارند. اما هیچ endpoint در `workflow.controller.ts` برای export وجود ندارد.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۹.۴ عدم health check برای external dependencies
- **اندپوینت**: `GET /health`
- **اشکال**: health check فقط DB را بررسی می‌کند. اتصال به `profile-reco-fabric` که یک external dependency است بررسی نمی‌شود. اگر fabric down باشد، `/ecosystem-ai/*` endpoints fail می‌شوند اما health check `ok` برمی‌گرداند.
- **کد**: `health.controller.ts` (سطر ۸-۳۴) — فقط `this.dataSource.query('SELECT 1')` برای DB. `profile-reco.adapter.ts` (سطر ۳۱) — `this.baseURL = process.env.PROFILE_RECO_FABRIC_URL || 'http://localhost:8546'` — هیچ health check برای این URL در health controller وجود ندارد.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۹.۵ عدم unique constraint روی (tenantId, key, version) برای definitions
- **اندپوینت**: `POST /workflow/definitions`
- **اشکال**: entity `WorkflowDefinition` هیچ unique constraint روی `(tenantId, key, version)` ندارد. این یعنی دو definition با همان `key` و `version` می‌توانند ایجاد شوند که به ambiguity منجر می‌شود.
- **کد**: `entities/WorkflowDefinition.ts` (سطر ۱۱-۱۲) — `@Index(['tenantId', 'status'])` و `@Index(['tenantId', 'key'])` وجود دارد اما `@Unique(['tenantId', 'key', 'version'])` وجود ندارد. `createDefinition` (سطر ۳۷-۴۷) — `version` auto-increment می‌شود: `(lastDef?.version || 0) + 1` اما در concurrent scenario، دو request می‌توانند همان version را محاسبه کنند.
- **وضعیت**: ✅ تأیید شد — نقص جدید
