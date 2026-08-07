# Workflow Engine Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: workflow-engine-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/workflow-engine-service/src/`

---

## ۱. تعریف فرآیند (Process Definition)

### ۱.۱ عدم validation گراف BPMN هنگام create
- **اندپوینت**: `POST /workflow/definitions`
- **اشکال**: request body شامل `graph` (object) است اما هیچ validation ای بررسی نمی‌کند که آیا گراف یک BPMN معتبر است یا خیر. یک گراف با node‌های نامعتبر، transition‌های نامعتبر یا missing start node می‌تواند ایجاد شود که در زمان start instance به خطا منجر می‌شود. validation باید در زمان create انجام شود نه در زمان start.
- **کد**: `workflow-engine.service.ts:createDefinition` (سطر ۷۷۷-۸۰۵) — `graph: params.graph` مستقیماً در definition ذخیره می‌شود بدون هیچ validation. `status` به `DRAFT` تنظیم می‌شود (سطر ۷۹۹). validation فقط در `startProcess` (سطر ۱۲۳-۱۲۶) انجام می‌شود: `const startNode = definition.graph.nodes.find(n => n.type === 'start')` و اگر نباشد `throw new Error` می‌کند. اما بررسی وجود `end` node، معتبر بودن edges، و معتبر بودن node types در create انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم versioning صریح و immutable
- **اندپوینت**: `POST /workflow/definitions`، `PUT /workflow/definitions/:id`
- **اشکال**: `version` در request body وجود دارد اما `PUT /workflow/definitions/:id` مستقیماً definition را update می‌کند. اگر instance‌های در حال اجرا روی نسخه قدیمی باشند، update می‌تواند به inconsistent state منجر شود. definition باید immutable باشد و update باید نسخه جدید ایجاد کند. instance‌های قدیمی باید روی نسخه خود باقی بمانند.
- **کد**: `workflow-engine.service.ts:updateDefinition` (سطر ۸۲۵-۸۲۹) — `Object.assign(def, body)` و `return this.definitionRepository.save(def)` — مستقیماً definition موجود را mutate می‌کند. هیچ نسخه جدید ایجاد نمی‌شود. entity `ProcessDefinition` (`entities/process-definition.entity.ts` سطر ۳۱) `@Unique(['tenantId', 'key', 'version'])` دارد که جلوی duplicate version را می‌گیرد، اما update مستقیماً روی همان رکورد انجام می‌شود. instance‌های در حال اجرا با `definitionId` به definition وصل می‌شوند (entity `ProcessInstance` سطر ۲۲) و اگر graph تغییر کند، رفتار instance‌های قدیمی تغییر می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم activate/deactivate برای definitions
- **اندپوینت**: `POST /workflow/definitions`، `PUT /workflow/definitions/:id`
- **اشکال**: برخلاف workflow-service که `activate` و `deactivate` دارد، workflow-engine-service فقط create، update و delete دارد. status در response وجود دارد (`draft`، `active`، `deprecated`) اما اندپوینتی برای تغییر status وجود ندارد. فقط delete می‌کند که data loss است.
- **کد**: `entities/process-definition.entity.ts` (سطر ۳-۷) — `ProcessDefinitionStatus` شامل `DRAFT`، `ACTIVE`، `DEPRECATED`. `createDefinition` (سطر ۷۹۹) با `DRAFT` ایجاد می‌کند. `updateDefinition` (سطر ۸۲۵-۸۲۹) با `Object.assign` می‌تواند `status` را تغییر دهد — یعنی activate/deactivate از طریق `PUT /workflow/definitions/:id` با body `{ status: 'active' }` ممکن است، اما endpoint اختصاصی وجود ندارد. `deleteDefinition` (سطر ۸۳۱-۸۳۶) soft-delete می‌کند و `status` را به `DEPRECATED` تغییر می‌دهد.
- **وضعیت**: ✅ تأیید شد — activate/deactivate از طریق `updateDefinition` با `Object.assign` ممکن است اما endpoint اختصاصی ندارد و `findActiveDefinition` (سطر ۶۸۷-۶۹۸) فقط `ACTIVE` را برمی‌گرداند.

### ۱.۴ عدم فیلتر definitions بر اساس createdBy و tags
- **اندپوینت**: `GET /workflow/definitions`
- **اشکال**: query params فقط `status`، `key`، `limit` و `offset` را پشتیبانی می‌کند. فیلتر بر اساس `createdBy` (چه کسی definition را ایجاد کرده) و `tags` وجود ندارد. برای مدیریت چندین definition توسط تیم‌های مختلف، این فیلترها ضروری است.
- **کد**: `workflow-engine.controller.ts:listDefinitions` (سطر ۴۶-۵۹) — query params: `status`، `key`، `limit`، `offset`. `workflow-engine.service.ts:listDefinitions` (سطر ۸۰۷-۸۱۷) — `where: { tenantId, deletedAt: null }` با optional `status` و `key`. entity `ProcessDefinition` فیلد `createdBy` (سطر ۸۱) و `metadata` (سطر ۷۲) دارد اما در query قابل فیلتر نیستند. هیچ فیلد `tags` در entity وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۲. اجرای فرآیند (Process Instance)

### ۲.۱ عدم idempotency در start instance
- **اندپوینت**: `POST /workflow/start`
- **اشکال**: start instance هیچ idempotency key‌ای قبول نمی‌کند. اگر کلاینت به دلیل timeout درخواست را retry کند، دو instance برای همان `businessKey` ایجاد می‌شود. باید با `businessKey` به‌عنوان idempotency key از ایجاد duplicate جلوگیری شود.
- **کد**: `workflow-engine.service.ts:startProcess` (سطر ۸۶-۱۶۳) — هیچ idempotency check صریح وجود ندارد. اما entity `ProcessInstance` (`entities/process-instance.entity.ts` سطر ۱۳) `@Unique(['tenantId', 'businessKey'])` دارد. بنابراین اگر کلاینت با همان `businessKey` retry کند، DB unique constraint violation رخ می‌دهد و instance دوم ایجاد نمی‌شود. اما این خطا به‌صورت DB error برگردانده می‌شود، نه یک response تمیز با code مناسب.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: entity `ProcessInstance` (`entities/process-instance.entity.ts` سطر ۱۳) `@Unique(['tenantId', 'businessKey'])` دارد که از ایجاد duplicate جلوگیری می‌کند. اما خطا به‌صورت DB constraint violation برگردانده می‌شود، نه یک response تمیز با error code مناسب.

### ۲.۲ عدم deadlock prevention در signal
- **اندپوینت**: `POST /workflow/instances/:id/signal`
- **اشکال**: signal می‌تواند variables را update کند و instance را به node بعدی ببرد. اما هیچ مکانیزمی برای جلوگیری از deadlock وجود ندارد. اگر دو signal همزمان روی یک instance ارسال شوند (مثلاً از دو کاربر)، race condition می‌تواند به inconsistent state منجر شود. optimistic locking با version number نیاز است.
- **کد**: `workflow-engine.service.ts:signal` (سطر ۱۶۵-۲۲۷) — instance با `findOne` خوانده می‌شود (سطر ۱۷۲)، هیچ optimistic locking یا version check وجود ندارد. tokens با `find` خوانده می‌شوند (سطر ۱۹۶) و سپس `executeNode` فراخوانی می‌شود (سطر ۲۲۳). اگر دو signal همزمان برسند، هر دو همان instance و tokens را می‌خوانند و هر دو `executeNode` را اجرا می‌کنند که می‌تواند به double execution و inconsistent state منجر شود. entity `ProcessInstance` هیچ فیلد `version` برای optimistic locking ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم suspend/resume برای instance
- **اندپوینت**: `POST /workflow/instances/:id/cancel`
- **اشکال**: فقط cancel وجود دارد. هیچ suspend (توقف موقت) و resume‌ای وجود ندارد. اگر یک instance نیاز به توقف موقت (مثلاً منتظر اطلاعات خارجی) داشته باشد، باید cancel شود که data loss است. suspend/resume برای فرآیندهای طولانی ضروری است.
- **کد**: `entities/process-instance.entity.ts` (سطر ۹) — `ProcessInstanceStatus.SUSPENDED` در enum وجود دارد. `signal` (سطر ۱۸۰) و `cancelInstance` (سطر ۲۴۰) هر دو `SUSPENDED` را قبول می‌کنند. اما هیچ endpoint‌ای برای transition به `SUSPENDED` یا برگشت از آن وجود ندارد. `executeNode` (سطر ۳۸۲) در صورت خطا status را به `FAILED` تغییر می‌دهد. هیچ متدی برای suspend یا resume در service وجود ندارد.
- **وضعیت**: ✅ تأیید شد — status `SUSPENDED` در enum وجود دارد اما هیچ endpoint یا متدی برای suspend/resume پیاده‌سازی نشده است.

### ۲.۴ عدم فیلتر instances بر اساس definitionKey و createdBy
- **اندپوینت**: `GET /workflow/instances`
- **اشکال**: query params فقط `businessKey`، `status`، `limit` و `offset` را پشتیبانی می‌کند. فیلتر بر اساس `definitionKey` (کدام definition) و `startedBy` (چه کسی شروع کرده) وجود ندارد. برای monitoring، باید بتوان instances یک definition خاص را دید.
- **کد**: `workflow-engine.controller.ts:listInstances` (سطر ۱۱۶-۱۳۲) — query params: `businessKey`، `status`، `limit`، `offset`. `workflow-engine.service.ts:listInstances` (سطر ۸۵۵-۸۶۵) — `where: { tenantId }` با optional `status`. `getInstancesByBusinessKey` (سطر ۸۴۷-۸۵۳) — فیلتر با `businessKey`. هیچ فیلتر `definitionKey` یا `startedBy` وجود ندارد. entity `ProcessInstance` فیلد `startedBy` (سطر ۶۹) و `definitionId` (سطر ۲۲) دارد اما در query قابل فیلتر نیستند.
- **وضعیت**: ✅ تأیید شد

---

## ۳. State Machine و صحت انتقال وضعیت

### ۳.۱ عدم endpoint برای retry failed instance
- **اندپوینت**: `POST /workflow/instances/:id/signal`، `POST /workflow/instances/:id/cancel`
- **اشکال**: اگر instance به وضعیت `failed` برود، هیچ اندپوینتی برای retry از نقطه شکست وجود ندارد. فقط cancel می‌شود. یک retry از node آخر (یا از node مشخص) برای فرآیندهای طولانی ضروری است.
- **کد**: `workflow-engine.service.ts:signal` (سطر ۱۸۰-۱۸۲) — `if (instance.status !== ProcessInstanceStatus.RUNNING && instance.status !== ProcessInstanceStatus.SUSPENDED) throw new Error(...)`. یعنی signal روی instance `FAILED` رد می‌شود. `cancelInstance` (سطر ۲۴۰-۲۴۲) نیز فقط `RUNNING` و `SUSPENDED` را قبول می‌کند. هیچ متدی برای retry در service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم compensation/saga support در instance
- **اندپوینت**: `POST /workflow/instances/:id/cancel`
- **اشکال**: cancel فقط instance را متوقف می‌کند اما هیچ compensation‌ای برای rollback کارهای انجام شده انجام نمی‌دهد. اگر instance در میانه فرآیند (مثلاً بعد از صدور بیمه‌نامه) cancel شود، کارهای انجام شده rollback نمی‌شوند. این برخلاف orchestrator-service است که compensation دارد.
- **کد**: `workflow-engine.service.ts:cancelInstance` (سطر ۲۲۹-۲۸۳) — active tokens را به `TERMINATED` تغییر می‌دهد (سطر ۲۵۱-۲۵۳)، `instance.status = CANCELLED` (سطر ۲۵۷)، و event `insurance.workflow_engine.process.cancelled` منتشر می‌کند (سطر ۲۶۶-۲۷۹). هیچ compensation logic یا rollback کارهای انجام شده (مثلاً API calls قبلی) وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم validation transition در signal
- **اندپوینت**: `POST /workflow/instances/:id/signal`
- **اشکال**: signal با `signalName` و `variables` ارسال می‌شود اما هیچ validation‌ای بررسی نمی‌کند که آیا این signal در node فعلی معتبر است یا خیر. یک signal نامعتبر می‌تواند instance را به وضعیت نامعتبر ببرد. allowed signals باید بر اساس node فعلی تعریف و validate شوند.
- **کد**: `workflow-engine.service.ts:signal` (سطر ۱۹۶-۲۲۰) — tokens با `status: ACTIVE` پیدا می‌شوند (سطر ۱۹۹). برای هر token، node پیدا می‌شود (سطر ۲۰۳). اگر `nodeId` در params باشد، تطابق `token.nodeId === signalParams.nodeId` و `node.type === 'human_task' || 'event_wait'` بررسی می‌شود (سطر ۲۰۷). اگر `nodeId` نباشد، `node.type === 'human_task' || 'event_wait'` و `expectedSignal === signalParams.signalName` بررسی می‌شود (سطر ۲۱۰-۲۱۴). اگر هیچ match نباشد، `throw new Error('No waiting human_task or event_wait node matches signal')` (سطر ۲۱۹). این یک validation است — signal فقط روی `human_task` یا `event_wait` قابل ارسال است و signalName باید تطابق داشته باشد.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `signal` (سطر ۱۹۶-۲۲۰) validation دارد که signal فقط روی `human_task` یا `event_wait` node‌ها قابل ارسال است و `signalName` باید با `node.config.signalName` تطابق داشته باشد. اگر signal نامعتبر باشد، error throw می‌شود.

---

## ۴. History و Audit

### ۴.۱ عدم pagination در history
- **اندپوینت**: `GET /workflow/instances/:id/history`
- **اشکال**: history به‌صورت array کامل برمی‌گرداند بدون pagination. برای instance‌های طولانی با صدها event، response بسیار بزرگ می‌شود. pagination لازم است.
- **کد**: `workflow-engine.controller.ts:getInstanceHistory` (سطر ۱۳۴-۱۳۹) — هیچ query param برای pagination. `workflow-engine.service.ts:getInstanceHistory` (سطر ۸۶۷-۸۷۲) — `this.historyRepository.find({ where: { instanceId, tenantId }, order: { timestamp: 'ASC' } })` — تمام results بدون limit/offset.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم فیلتر history بر اساس eventType و nodeId
- **اندپوینت**: `GET /workflow/instances/:id/history`
- **اشکال**: هیچ query param‌ای برای فیلتر history وجود ندارد. فیلتر بر اساس `eventType` (مثلاً فقط transition events) و `nodeId` (فقط events یک node خاص) برای تحلیل و debugging ضروری است.
- **کد**: `workflow-engine.controller.ts:getInstanceHistory` (سطر ۱۳۴-۱۳۹) — هیچ query param. `workflow-engine.service.ts:getInstanceHistory` (سطر ۸۶۷-۸۷۲) — فقط `instanceId` و `tenantId` در where. entity `ProcessHistory` فیلدهای `eventType` و `nodeId` دارد اما در query قابل فیلتر نیستند.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم export history برای audit
- **اندپوینت**: `GET /workflow/instances/:id/history`
- **اشکال**: history فقط JSON است. هیچ export به CSV یا PDF برای گزارش‌های compliance وجود ندارد.
- **کد**: `getInstanceHistory` (سطر ۸۶۷-۸۷۲) — فقط JSON array برمی‌گرداند. هیچ endpoint export وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۵. یکپارچه‌سازی و معماری

### ۵.۱ تکرار با workflow-service
- **اندپوینت**: `POST /workflow/definitions`، `POST /workflow/start`، `GET /workflow/instances`
- **اشکال**: workflow-engine-service و workflow-service هر دو `/workflow/definitions` و `/workflow/instances` دارند. این تکرار جدی است. مشخص نیست کدام canonical است. اگر هر دو فعال باشند، کلاینت‌ها نمی‌دانند از کدام استفاده کنند و data می‌تواند بین دو سرویس split شود.
- **کد**: `workflow-engine.controller.ts` (سطر ۱۱) — `@Controller('workflow')` با endpoints `/workflow/definitions`، `/workflow/start`، `/workflow/instances`. workflow-service نیز `/workflow/definitions` و `/workflow/instances` دارد. هر دو سرویس entity‌های جداگانه دارند (`process_definitions` vs `workflow_definitions`). هیچ reference‌ای بین دو سرویس وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم یکپارچه‌سازی با orchestrator-service
- **اندپوینت**: `POST /workflow/start`
- **اشکال**: orchestrator-service نیز `/workflows/processes/:processType/start` دارد. مشخص نیست آیا orchestrator-service از workflow-engine-service استفاده می‌کند یا مستقل عمل می‌کند. اگر مستقل باشند، دو موتور workflow موازی وجود دارد که ناهماهنگی ایجاد می‌کند.
- **کد**: هیچ import یا reference به orchestrator-service در `workflow-engine.service.ts` یا `workflow-engine.controller.ts` وجود ندارد. `executeApiCallNode` (سطر ۴۳۳-۴۷۰) می‌تواند به orchestrator-service فراخوانی کند اگر URL در graph config باشد، اما این یکپارچه‌سازی صریح نیست.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم event publishing به Kafka
- **اندپوینت**: `POST /workflow/start`، `POST /workflow/instances/:id/signal`، `POST /workflow/instances/:id/cancel`
- ~~**اشکال**: health check به kafka اشاره می‌کند (`kafka: ok|error|not_configured`) اما مشخص نیست چه event‌هایی منتشر می‌شوند. هیچ اشاره‌ای به event publishing در endpoint‌ها وجود ندارد. برای یکپارچه‌سازی با سرویس‌های دیگر (notification، audit)، event‌های workflow.started، workflow.completed، workflow.cancelled باید منتشر شوند.~~
- **کد**: `workflow-engine.service.ts` — event‌ها از طریق `OutboxPublisher` منتشر می‌شوند:
  - `insurance.workflow_engine.process.started` در `startProcess` (سطر ۱۳۷-۱۵۱)
  - `insurance.workflow_engine.process.cancelled` در `cancelInstance` (سطر ۲۶۶-۲۷۹)
  - `insurance.workflow_engine.process.completed` در `executeEndNode` (سطر ۴۱۷-۴۲۸)
  - `insurance.workflow_engine.human_task.created` در `executeHumanTaskNode` (سطر ۴۹۷-۵۱۰)
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event‌های process.started، process.cancelled، process.completed و human_task.created از طریق `OutboxPublisher` در `workflow-engine.service.ts` منتشر می‌شوند.

---

## ۶. بهینه‌سازی و Performance

### ۶.۱ عدم caching برای definitions
- **اندپوینت**: `GET /workflow/definitions/:id`، `GET /workflow/definitions`
- **اشکال**: definitions که به‌ندرت تغییر می‌کنند، در هر request از DB fetch می‌شوند. caching definitions (با invalidation در update) می‌تواند performance را به‌طور قابل توجهی افزایش دهد.
- **کد**: `workflow-engine.service.ts:getDefinition` (سطر ۸۱۹-۸۲۳) — `this.definitionRepository.findOne(...)` در هر request. `listDefinitions` (سطر ۸۰۷-۸۱۷) — `this.definitionRepository.find(...)` در هر request. هیچ cache layer یا in-memory cache وجود ندارد. در `executeNode` (سطر ۲۹۳-۲۹۴) نیز definition در هر node execution از DB خوانده می‌شود (مگر اینکه به‌صورت parameter پاس داده شود).
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم bulk operations برای instances
- **اندپوینت**: `POST /workflow/instances/:id/cancel`
- **اشکال**: cancel فقط برای یک instance است. اگر نیاز به cancel چندین instance (مثلاً همه instances یک definition) باشد، باید یکی یکی فراخوانی شود. bulk cancel با filter ضروری است.
- **کد**: `workflow-engine.controller.ts:cancel` (سطر ۱۰۱-۱۰۷) — فقط یک `instanceId` از path param. `workflow-engine.service.ts:cancelInstance` (سطر ۲۲۹-۲۸۳) — فقط یک instance. هیچ متد bulk cancel وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم deep health check کامل
- **اندپوینت**: `GET /workflow/health/deep`، `GET /health`
- **اشکال**: deep health فقط db را چک می‌کند. kafka در health اصلی اما نه در deep health چک می‌شود. همچنین هیچ چکی برای connectivity با orchestrator-service یا document-service وجود ندارد.
- **کد**: `workflow-engine.controller.ts:deepHealth` (سطر ۱۴۱-۱۵۲) — فقط `this.workflowEngine.checkDbConnection()` (سطر ۱۴۵). `health.controller.ts:health` (سطر ۱۱-۳۸) — DB و Kafka چک می‌شوند. deep health فقط DB را چک می‌کند و Kafka را ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ عدم تفکیک دسترسی بین definition designer و instance operator
- **اشکال**: `workflow:define` برای create/update definition و `workflow:start` برای start instance وجود دارد اما هیچ تفکیکی بین کسی که definition را طراحی می‌کند (designer) و کسی که instance را اجرا می‌کند (operator) در level of detail وجود ندارد. یک designer نباید بتواند instance را start کند و برعکس.
- **کد**: `permissions.ts` (سطر ۱۲) — `insurer_admin` هم `workflow:define` و هم `workflow:start` دارد. `head_office_ops` (سطر ۱۳) `workflow:start` دارد اما `workflow:define` ندارد. `underwriter`، `branch_manager` و سایر roles نیز `workflow:start` دارند اما `workflow:define` ندارند. بنابراین SoD برای همه roles به‌جز `insurer_admin` برقرار است.
- **وضعیت**: ✅ تأیید شد — SoD برای `insurer_admin` برقرار نیست (هم define هم start دارد). برای سایر roles برقرار است.

### ۷.۲ عدم دسترسی claims-service به workflow start
- **اشکال**: claims-service برای مدیریت فرآیند claim نیاز به start و signal workflow دارد. اما مشخص نیست چه permission‌هایی به claims-service اختصاص داده شده. اگر `workflow:start` و `workflow:signal` عمومی باشند، هر سرویسی می‌تواند workflow را دستکاری کند.
- **کد**: `permissions.ts` (سطر ۱۴-۲۱) — `underwriter`، `branch_manager`، `branch_staff`، `agency_owner`، `agency_staff`، `broker_owner`، `broker_staff`، `call_center` همگی `workflow:start` دارند. `workflow:signal` فقط به `insurer_admin`، `head_office_ops`، `underwriter`، `branch_manager` اختصاص دارد. هیچ role `claims_handler` یا `claims_service` تعریف نشده است.
- **وضعیت**: ✅ تأیید شد — هیچ role مختص claims-service تعریف نشده است.

### ۷.۳ عدم monitoring dashboard برای operations team
- **اشکال**: هیچ اندپوینتی برای dashboard یا metrics (تعداد instances در حال اجرا، میانگین زمان تکمیل، نرخ شکست) وجود ندارد. operations team برای monitoring نیاز به این داده‌ها دارد اما باید از `GET /workflow/instances` با pagination دستی جمع‌آوری کند.
- **کد**: هیچ metrics یا dashboard endpoint در controller وجود ندارد. `listInstances` (سطر ۸۵۵-۸۶۵) فقط list با pagination برمی‌گرداند. هیچ aggregation یا count by status وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۷.۴ عدم یکپارچه‌سازی با notification-service
- ~~**اشکال**: وقتی instance به node‌ای می‌رسد که نیاز به human task دارد، باید کاربر مطلع شود. اما هیچ event‌ای به notification-service ارسال نمی‌شود. کاربر باید خودش status instance را poll کند.~~
- **کد**: `workflow-engine.service.ts:executeHumanTaskNode` (سطر ۴۸۵-۵۱۳) — event `insurance.workflow_engine.human_task.created` از طریق `OutboxPublisher` منتشر می‌شود (سطر ۴۹۷-۵۱۰) با payload شامل `assignees`. notification-service می‌تواند این event را consume کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `executeHumanTaskNode` (سطر ۴۹۷-۵۱۰) event `insurance.workflow_engine.human_task.created` را با اطلاعات assignees منتشر می‌کند.

---

## ۸. نقص‌های جدید یافت‌شده در کد

### ۸.۱ عدم graceful handling برای unique constraint violation در start
- **اندپوینت**: `POST /workflow/start`
- **اشکال**: entity `ProcessInstance` `@Unique(['tenantId', 'businessKey'])` دارد که از duplicate جلوگیری می‌کند، اما خطای DB به‌صورت raw error برگردانده می‌شود، نه یک response تمیز با error code مناسب.
- **کد**: `workflow-engine.service.ts:startProcess` (سطر ۹۸-۱۰۹) — `manager.save(instance)` در transaction. اگر unique constraint violation رخ دهد، error به caller propagates می‌شود بدون catch و transform به error response مناسب.
- **وضعیت**: ✅ تأیید شد

### ۸.۲ عدم SSRF protection کامل در API call node
- **اندپوینت**: `POST /workflow/start` (داخلی — executeApiCallNode)
- **اشکال**: `isUrlAllowed` اگر `WORKFLOW_API_ALLOW_LIST` تنظیم نشده باشد، همه URL‌ها را اجازه می‌دهد. این یک خطر امنیتی SSRF است.
- **کد**: `workflow-engine.service.ts:isUrlAllowed` (سطر ۷۱۷-۷۲۵) — `if (!allowList || allowList.trim().length === 0) { this.logger.warn('WORKFLOW_API_ALLOW_LIST is not configured; allowing all workflow API URLs'); return true; }`. یعنی اگر env var تنظیم نشده باشد، همه URL‌ها (از جمله internal/localhost) مجاز هستند.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ عدم validation expression در decision و transform nodes
- **اندپوینت**: `POST /workflow/definitions`
- **اشکال**: expression‌های `decision` و `transform` nodes در زمان create validation نمی‌شوند. یک expression نامعتبر در زمان execution به `false` ارزیابی می‌شود (سطر ۶۰۱) که می‌تواند به رفتار نادرست منجر شود.
- **کد**: `workflow-engine.service.ts:evaluateExpression` (سطر ۵۹۵-۶۰۳) — `try { ... } catch (error) { this.logger.error(...); return false; }`. یعنی expression نامعتبر به‌جای خطا، `false` برمی‌گرداند که می‌تواند به wrong path در decision node منجر شود.
- **وضعیت**: ✅ تأیید شد

### ۸.۴ عدم timeout برای human_task و event_wait nodes
- **اندپوینت**: `POST /workflow/start`
- **اشکال**: human_task و event_wait nodes تا ابد می‌توانند منتظر بمانند. هیچ timeout‌ای برای این nodes تعریف نشده. اگر کسی signal نفرستد، instance برای همیشه در `RUNNING` باقی می‌ماند.
- **کد**: `workflow-engine.service.ts:executeHumanTaskNode` (سطر ۴۸۵-۵۱۳) — `consumeToken: false` و `nextNodes: []` (سطر ۵۱۲). token در حالت `ACTIVE` باقی می‌ماند. `executeEventWaitNode` (سطر ۵۵۵-۵۶۷) — مشابه. هیچ timeout یا SLA برای این nodes وجود ندارد. فقط `timer` node (سطر ۵۱۵-۵۴۵) timeout دارد.
- **وضعیت**: ✅ تأیید شد

### ۸.۵ عدم tenant isolation در timer processing
- **اندپوینت**: `GET /workflow/health/deep` (داخلی — processPendingTimers)
- **اشکال**: `processPendingTimers` (سطر ۷۲۷-۷۷۵) timers را بدون فیلتر tenantId پیدا می‌کند. اگر چند tenant داشته باشیم، timer‌های همه tenant‌ها در یک batch پردازش می‌شوند که می‌تواند به performance issue منجر شود.
- **کد**: `workflow-engine.service.ts:processPendingTimers` (سطر ۷۲۹-۷۳۱) — `this.timerRepository.find({ where: { status: TimerStatus.PENDING, fireAt: LessThanOrEqual(now) }, take: 100 })` — هیچ فیلتر `tenantId`. در loop (سطر ۷۳۴)، instance و definition با `tenantId` از timer پیدا می‌شوند (سطر ۷۴۱، ۷۵۷) که درست است، اما خود query اول بدون tenant فیلتر است.
- **وضعیت**: ✅ تأیید شد (ریسک پایین — tenant isolation در نهایت رعایت می‌شود اما query بدون tenant filter است)
