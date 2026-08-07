# Model Switchboard Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: model-switchboard-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/model-switchboard-service/src/`

---

## ۱. Model Registration و Lifecycle

### ۱.۱ عدم validation یکتایی modelKey
- **اندپوینت**: `POST /model-switchboard/models`
- **اشکال**: فیلد `modelKey` به صورت required تعریف شده اما مشخص نیست آیا uniqueness validation بر اساس `modelKey` + `tenantId` اعمال می‌شود یا خیر. اگر دو مدل با همان modelKey ثبت شوند، routing به ابهام می‌انجامد. باید unique constraint تعریف شود.
- **کد**: `entities/ModelDefinition.ts` (خط ۳۱) — `@Column({ type: 'varchar', length: 50, unique: true }) modelKey!: string` — unique constraint در سطح DB وجود دارد، اما **global** است، نه per-tenant. این یعنی دو tenant مختلف نمی‌توانند همان `modelKey` را داشته باشند. اگر قرار است modelKey per-tenant unique باشد، باید composite unique constraint (`modelKey` + `tenantId`) تعریف شود.
- **وضعیت**: ⚠️ رد شد جزئی — unique constraint global وجود دارد، اما per-tenant نیست.

### ۱.۲ عدم deactivate endpoint برای model
- **اندپوینت**: `PUT /model-switchboard/models/:id/activate`
- **اشکال**: اندپوینتی برای activate model وجود دارد اما هیچ `PUT /model-switchboard/models/:id/deactivate` ای تعریف نشده است. یک model فقط می‌تواند activate شود اما نمی‌تواند بدون delete غیرفعال شود. باید deactivate endpoint تعریف شود.
- **کد**: `model-switchboard.controller.ts` (خط ۴۵-۵۴) — فقط `@Put('models/:id/activate')` وجود دارد. هیچ `@Put('models/:id/deactivate')` تعریف نشده. `ModelStatus` enum (خط ۱۱-۱۶ در `ModelDefinition.ts`) شامل `DEPRECATED` و `RETIRED` است اما هیچ endpoint ای برای set کردن این status‌ها وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم update endpoint برای model
- **اندپوینت**: (نبود `PUT /model-switchboard/models/:id`)
- **اشکال**: هیچ اندپوینتی برای update model metadata یا config وجود ندارد. برای تغییر `config.endpoint` یا `config.parameters`، باید model را delete و دوباره register کرد که باعث از دست رفتن id و تاریخچه usage می‌شود. باید `PUT /model-switchboard/models/:id` تعریف شود.
- **کد**: `model-switchboard.controller.ts` (خط ۱-۳۶۷) — هیچ `@Put('models/:id')` endpoint ای تعریف نشده (به جز `models/:id/activate`).
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم delete endpoint برای model
- **اندپوینت**: (نبود `DELETE /model-switchboard/models/:id`)
- **اشکال**: هیچ اندپوینتی برای delete یا soft delete model وجود ندارد. model‌های غیرفعال یا قدیمی نمی‌توانند حذف شوند و در لیست models باقی می‌مانند.
- **کد**: `model-switchboard.controller.ts` — هیچ `@Delete('models/:id')` endpoint ای تعریف نشده.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ عدم health check برای model endpoint
- **اندپوینت**: `POST /model-switchboard/models`
- **اشکال**: هنگام ثبت model، `config.endpoint` به صورت string آزاد ارسال می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا endpoint قابل دسترسی است یا خیر. یک model با endpoint نامعتبر می‌تواند ثبت و activate شود که باعث خطای دیرهنگام در invoke می‌شود.
- **کد**: `model-switchboard.service.ts:registerModel` (خط ۳۶-۸۳) — `config.endpoint` بدون هیچ reachability check ذخیره می‌شود. `callModelEndpoint` (خط ۲۹۱-۳۳۰) فقط در زمان invoke بررسی می‌کند که endpoint وجود دارد و قابل دسترسی است.
- **وضعیت**: ✅ تأیید شد

### ۱.۶ ~~عدم audit trail برای model lifecycle~~
- ~~**اشکال**: هیچ audit trail ای برای ثبت اینکه چه کسی model را register یا activate کرده وجود ندارد. در AI governance، audit trail برای تغییرات model lifecycle الزامی است.~~
- **کد**: `model-switchboard.service.ts` — `registerModel` (خط ۶۵-۸۰): `OutboxPublisher.publish` با topic `insurance.ai.model.registered` — event شامل `modelId`، `name`، `modelKey`، `modelType`، `status`، `tenantId` است. `activateModel` (خط ۹۱-۱۰۳): `OutboxPublisher.publish` با topic `insurance.ai.model.activated`. همچنین `auditLogger` (خط ۱۴۱، ۳۰۱، ۴۲۶، ۴۶۵، ۵۲۵، ۵۸۷، ۶۰۴، ۶۴۹، ۸۲۴) برای structured logging استفاده شده. اما event‌ها `userId` یا `actorId` انجام‌دهنده را شامل نمی‌شوند (به جز `createRoutePolicy` که `createdBy` را از `req.user` می‌گیرد — خط ۱۴۰).
- **وضعیت**: ⚠️ رد شد جزئی — event publishing و audit logging پیاده‌سازی شده، اما user info در event‌های model lifecycle ثبت نمی‌شود.

---

## ۲. Invocation و Routing

### ۲.۱ عدم rate limiting در invoke
- **اندپوینت**: `POST /model-switchboard/invoke`
- **اشکال**: هیچ rate limiting ای برای model invocation وجود ندارد. یک کاربر می‌تواند به طور مکرر model را invoke کند و هزینه AI و بار سیستم را به شدت افزایش دهد. rate limit باید بر اساس user/tenant و cost budget تعریف شود.
- **کد**: `main.ts` (خط ۷-۳۴) — هیچ `ThrottlerModule` یا rate limiting پیکربندی نشده.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم cost tracking در invoke response
- **اندپوینت**: `POST /model-switchboard/invoke`
- **اشکال**: response فقط شامل `data` و `correlationId` است. هیچ فیلدی برای cost (input tokens، output tokens، cost in cents) در response وجود ندارد. در AI operations، cost tracking برای budget control و governance الزامی است.
- **کد**: `model-switchboard.service.ts:invokeModel` (خط ۱۰۸-۲۱۷) — `ModelInvocation` entity شامل `input`، `output`، `status`، `error`، `latencyMs`، `modelKey`، `modelVersion` است — هیچ فیلد cost یا token count. cost فقط از طریق endpoint جداگانه `POST /record-usage` به طور دستی ثبت می‌شود. هیچ automatic cost recording از invoke انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم timeout و retry policy در invoke
- **اندپوینت**: `POST /model-switchboard/invoke`
- **اشکال**: اگر model endpoint پاسخ ندهد یا کند باشد، مشخص نیست چه timeout و retry policy ای اعمال می‌شود. باید timeout قابل پیکربندی و retry با exponential backoff تعریف شود.
- **کد**: `model-switchboard.service.ts:callModelEndpoint` (خط ۳۱۶-۳۲۰) — `timeout: model.config.parameters?.timeout || 30000` — timeout قابل پیکربندی است (default ۳۰ ثانیه). `CircuitBreaker` (خط ۲۹۹-۳۰۳) — circuit breaker پیاده‌سازی شده که پس از `failureThreshold` (default ۵) خطا، circuit را open می‌کند. اما هیچ retry با exponential backoff وجود ندارد — اگر call ناموفق باشد، مستقیماً error throw می‌شود (خط ۳۲۸).
- **وضعیت**: ⚠️ رد شد جزئی — timeout و circuit breaker پیاده‌سازی شده، اما retry با exponential backoff وجود ندارد.

### ۲.۴ عدم async invoke برای long-running models
- **اندپوینت**: `POST /model-switchboard/invoke`
- **اشکال**: invoke به صورت synchronous انجام می‌شود. برای model‌های زمان‌بر (مثلاً generative model‌ها)، این می‌تواند باعث timeout HTTP و تجمع connection‌ها شود. باید async invoke (job + polling) تعریف شود.
- **کد**: `model-switchboard.service.ts:invokeModel` (خط ۱۰۸-۲۱۷) — `await this.callModelEndpoint(model, params.input)` به صورت synchronous. هیچ job queue یا async pattern.
- **وضعیت**: ✅ تأیید شد

### ۲.۵ عدم explainability در routing decision
- **اندپوینت**: `POST /model-switchboard/route`
- **اشکال**: routing decision برمی‌گردد اما مشخص نیست چرا یک model خاص انتخاب شده است. باید rationale routing (مثلاً "selected because highest priority" یا "selected because cost optimized") در response برگردانده شود تا قابل audit باشد.
- **کد**: `model-switchboard.service.ts:route` (خط ۵۳۰-۶۱۰) — response فقط `{ modelId, policyId, fallbackChain }` است. `auditLogger` rationale را log می‌کند (خط ۵۵۶: "A/B test: routing to B variant"، خط ۵۸۷: "Cost budget exhausted, using cheapest fallback"، خط ۶۰۴: "Primary model unavailable, using fallback") اما در API response برمی‌نگردد.
- **وضعیت**: ✅ تأیید شد — با توضیح که rationale در audit log ثبت می‌شود اما در API response نیست.

### ۲.۶ عدم validation skipGovernance flag
- **اندپوینت**: `POST /model-switchboard/invoke`
- **اشکال**: فیلد `skipGovernance` (default: false) در request body وجود دارد. اگر true باشد، governance checks دور زده می‌شود. این یک خطر امنیتی است؛ باید محدود شود که فقط سرویس‌های خاص با permission `switchboard:admin` بتوانند `skipGovernance: true` بفرستند.
- **کد**: `model-switchboard.controller.ts:invokeModel` (خط ۹۲) — `skipGovernance?: boolean` در body. `model-switchboard.service.ts:invokeModel` (خط ۱۵۰) — `if (selectedModel && !params.skipGovernance)` — اگر `true` باشد، governance check کاملاً دور زده می‌شود. هیچ permission check اضافی برای `skipGovernance: true` وجود ندارد. هر کاربری با permission `switchboard:route` می‌تواند governance را دور بزند.
- **وضعیت**: ✅ تأیید شد (نقص امنیتی بحرانی)

### ۲.۷ عدم فیلتر زمانی در list invocations
- **اندپوینت**: `GET /model-switchboard/invocations`
- **اشکال**: pagination با `limit` (default: 50, max: 200) و `offset` پشتیبانی می‌شود اما هیچ فیلتر زمانی (`fromDate`/`toDate`) وجود ندارد. در صورت انباشت invocation logs، فیلتر زمانی برای گزارش‌گیری الزامی است.
- **کد**: `model-switchboard.controller.ts:listInvocations` (خط ۱۰۰-۱۱۶) — `limit` و `offset` پشتیبانی می‌شوند. `model-switchboard.service.ts:listInvocations` (خط ۳۶۳-۳۹۱) — فیلتر `modelKey`، `businessKey`، `status` وجود دارد اما هیچ فیلتر `fromDate`/`toDate` یا `invokedAt` range.
- **وضعیت**: ✅ تأیید شد — pagination وجود دارد اما فیلتر زمانی نیست.

---

## ۳. Route Policy

### ۳.۱ عدم SoD در create و update policy
- **اندپوینت**: `POST /model-switchboard/policies`، `DELETE /model-switchboard/policies/:id`، `PUT /model-switchboard/policies/:id`
- **اشکال**: create policy با `switchboard:manage_policies` و delete با `switchboard:admin` انجام می‌شود. این تفکیک خوب است اما update policy نیز با `switchboard:manage_policies` انجام می‌شود که یعنی کسی که policy ایجاد می‌کند می‌تواند آن را update کند. باید بررسی شود آیا update policy نیاز به approval دارد یا خیر.
- **کد**: `model-switchboard.controller.ts` — `createRoutePolicy` (خط ۱۲۱): `@RequirePermissions('switchboard:manage_policies')`. `deleteRoutePolicy` (خط ۱۹۴): `@RequirePermissions('switchboard:admin')`. `updateRoutePolicy` (خط ۱۶۸): `@RequirePermissions('switchboard:manage_policies')`. پس create و update همان permission را دارند. `permissions.ts` (خط ۱۲-۱۳) — `insurer_admin` و `head_office_ops` هر دو `switchboard:manage_policies` دارند اما `head_office_ops` `switchboard:admin` ندارد.
- **وضعیت**: ✅ تأیید شد — create و update همان permission را دارند.

### ۳.۲ عدم validation fallbackChain
- **اندپوینت**: `POST /model-switchboard/policies`
- **اشکال**: فیلد `fallbackChain` به صورت array آزاد تعریف شده است. مشخص نیست آیا validation ای بررسی می‌کند که model‌های در fallbackChain وجود دارند و active هستند یا خیر. یک fallbackChain با model‌های نامعتبر باعث می‌شود fallback در زمان اجرا fail شود.
- **کد**: `model-switchboard.service.ts:createRoutePolicy` (خط ۳۹۵-۴۴۳) — `fallbackChain: params.fallbackChain || []` — بدون هیچ validation که model‌ها وجود دارند یا active هستند. در زمان routing (`route` متد، خط ۶۰۱-۶۰۷)، fallback model‌ها بررسی می‌شوند اما فقط در زمان اجرا.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم validation abTestSplitPercent
- **اندپوینت**: `POST /model-switchboard/policies`
- **اشکال**: فیلد `abTestSplitPercent` به صورت number تعریف شده اما مشخص نیست آیا validation ای بررسی می‌کند که مقدار بین 0 و 100 است یا خیر. همچنین اگر `abTestEnabled` true باشد اما `abTestModelId` خالی باشد، هیچ validation ای وجود ندارد.
- **کد**: `model-switchboard.service.ts:createRoutePolicy` (خط ۴۲۱) — `abTestSplitPercent: params.abTestSplitPercent ?? 50` — هیچ validation برای range 0-100. (خط ۴۱۹-۴۲۰) — `abTestEnabled: params.abTestEnabled || false`، `abTestModelId: params.abTestModelId || null` — اگر `abTestEnabled: true` اما `abTestModelId: null` باشد، هیچ validation error داده نمی‌شود. در `route` متد (خط ۵۵۰) — `if (policy.abTestEnabled && policy.abTestModelId)` — اگر `abTestModelId` null باشد، A/B test silently skip می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم versioning برای route policy
- **اندپوینت**: `PUT /model-switchboard/policies/:id`
- **اشکال**: update policy محتوای قبلی را overwrite می‌کند. هیچ version history ای وجود ندارد. در صورت تغییر اشتباه policy (مثلاً تغییر primary model)، نسخه قبلی قابل بازیابی نیست. باید versioning با rollback تعریف شود.
- **کد**: `model-switchboard.service.ts:updateRoutePolicy` (خط ۴۴۵-۴۸۲) — `Object.assign(policy, params, { updatedAt: new Date() })` — مستقیماً overwrite. `RoutePolicy` entity (خط ۱-۶۷) — هیچ فیلد version یا relation به version history.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ عدم preview impact برای policy change
- **اندپوینت**: `PUT /model-switchboard/policies/:id`
- **اشکال**: وقتی policy تغییر می‌کند، هیچ preview ای وجود ندارد که نشان دهد این تغییر چه تاثیری روی routing دارد. باید dry-run یا preview endpoint تعریف شود که قبل از اعمال تغییر، impact را نشان دهد.
- **کد**: `model-switchboard.controller.ts` — هیچ dry-run یا preview endpoint تعریف نشده.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Usage و Cost Tracking

### ۴.۱ عدم validation costMicroCents در record-usage
- **اندپوینت**: `POST /model-switchboard/record-usage`
- **اشکال**: فیلد `costMicroCents` به صورت number ارسال می‌شود اما هیچ validation ای برای مقدار منفی یا نامعتبر وجود ندارد. همچنین مشخص نیست آیا این مقدار از invoke به طور خودکار ثبت می‌شود یا باید به طور دستی فراخوانی شود. اگر دستی است، ممکن است ثبت نشود.
- **کد**: `model-switchboard.service.ts:recordUsage` (خط ۶۱۴-۶۶۸) — `costMicroCents: params.costMicroCents` — بدون validation برای مقدار منفی. `UsageRecord` entity (خط ۲۹-۳۰) — `@Column({ type: 'int' }) costMicroCents: number` — بدون constraint. `invokeModel` (خط ۱۰۸-۲۱۷) — **هیچ automatic cost recording انجام نمی‌دهد**. cost فقط از طریق endpoint جداگانه `POST /record-usage` به طور دستی ثبت می‌شود.
- **وضعیت**: ✅ تأیید شد — با تأکید که cost recording کاملاً manual است.

### ۴.۲ ~~عدم aggregation در usage report~~
- ~~**اشکال**: usage report با pagination برمی‌گردد اما هیچ aggregation ای (مثلاً total cost per day، average latency per model) وجود ندارد. باید aggregated report با group by model، capability و period تعریف شود.~~
- **کد**: `model-switchboard.controller.ts:getUsageSummary` (خط ۲۵۳-۲۶۴) — endpoint `GET /usage/summary` تعریف شده. `model-switchboard.service.ts:getUsageSummary` (خط ۶۹۲-۷۰۹) — aggregation پیاده‌سازی شده: `SUM(ur.totalTokens)`، `SUM(ur.costMicroCents)`، `AVG(ur.latencyMs)`، `AVG(ur.qualityScore)`، `COUNT(ur.id)` grouped by `ur.modelId`. فیلتر `tenantId`، `periodStart`، `periodEnd` پشتیبانی می‌شود. اما group by `capability` یا period (day/week/month) پشتیبانی نمی‌شود.
- **وضعیت**: ⚠️ رد شد جزئی — aggregation by modelId پیاده‌سازی شده، اما group by capability یا period وجود ندارد.

### ۴.۳ ~~عدم cost budget enforcement~~
- ~~**اشکال**: در route policy فیلد `costBudgetPerDay` وجود دارد اما مشخص نیست آیا این budget در invoke به طور خودکار اعمال می‌شود یا خیر. اگر budget تمام شود، invoke باید fail یا به fallback model route شود. هیچ endpoint ای برای view budget consumption وجود ندارد.~~
- **کد**: `model-switchboard.service.ts:route` (خط ۵۷۰-۵۹۲) — cost budget enforcement پیاده‌سازی شده: `SUM(ur.costMicroCents)` برای امروز محاسبه می‌شود، اگر `totalSpent >= policy.costBudgetPerDay`، به cheapest fallback route می‌شود یا error throw می‌کند. اما هیچ endpoint ای برای view budget consumption تعریف نشده (می‌توان از `GET /usage/summary` استنتاج کرد اما مستقیم نیست).
- **وضعیت**: ⚠️ رد شد جزئی — cost budget enforcement در routing پیاده‌سازی شده، اما endpoint برای view budget consumption وجود ندارد.

### ۴.۴ عدم real-time cost alerting
- **اشکال**: هیچ endpoint یا mechanism ای برای alerting زمانی که cost budget نزدیک به اتمام است وجود ندارد. باید threshold-based alerting تعریف شود (مثلاً 80% budget consumed).
- **کد**: هیچ alerting mechanism در سرویس تعریف نشده. `circuit-breaker.ts` فقط برای endpoint failure alerting است نه cost.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Model Card

### ۵.۱ تکرار model card با copilot-service
- **اندپوینت**: `POST /model-switchboard/model-cards`، `GET /model-switchboard/model-cards`، `PATCH /model-switchboard/model-cards/:id`، `POST /model-switchboard/model-cards/:id/approve`، `POST /model-switchboard/model-cards/:id/deprecate`
- **اشکال**: model-switchboard-service و copilot-service هر دو model card management دارند. copilot-service اندپوینت‌های `POST /copilot/models/:modelId/model-card`، `PUT /copilot/model-card/:cardId` و `GET /copilot/model-card/:cardId` دارد. این تکرار باعث می‌شود model card در دو سرویس به طور جداگانه مدیریت شود و ناهماهنگی داده ایجاد کند.
- **کد**: `model-switchboard.controller.ts` (خط ۲۶۸-۳۱۸) — ۵ endpoint برای model card. `entities/ModelCard.ts` — entity کامل با `modelId`، `modelName`، `purpose`، `intendedUse`، `limitations`، `biasRiskLevel`، `fairnessAudit`، `explainability`، `status`، `approvedBy`. copilot-service نیز model card endpoints دارد با مدل داده متفاوت.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم SoD در model card approval
- **اندپوینت**: `POST /model-switchboard/model-cards`، `POST /model-switchboard/model-cards/:id/approve`
- **اشکال**: هر دو اندپوینت از permission `switchboard:manage` استفاده می‌کنند. کسی که model card ایجاد می‌کند می‌تواند خودش آن را approve کند. Separation of Duties نقض می‌شود.
- **کد**: `model-switchboard.controller.ts` — `createModelCard` (خط ۲۶۹): `@RequirePermissions('switchboard:manage')`. `approveModelCard` (خط ۳۰۴): `@RequirePermissions('switchboard:manage')`. همان permission. `permissions.ts` (خط ۱۲-۱۳) — `insurer_admin` و `head_office_ops` هر دو `switchboard:manage` دارند.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم validation modelId در model card
- **اندپوینت**: `POST /model-switchboard/model-cards`
- **اشکال**: فیلد `modelId` در request body وجود دارد اما مشخص نیست آیا validation ای بررسی می‌کند که model مورد نظر در model-switchboard ثبت شده است یا خیر. یک model card برای model ناموجود می‌تواند ایجاد شود.
- **کد**: `model-switchboard.service.ts:createModelCard` (خط ۷۳۷-۷۶۵) — `modelId: params.modelId` — بدون هیچ بررسی که model در `model_definitions` table وجود دارد. `model-switchboard.controller.ts:createModelCard` (خط ۲۷۰) — `body: any` — هیچ validation.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Governance و Monitoring

### ۶.۱ عدم یکپارچه‌سازی governance با ai-governance-service
- **اندپوینت**: `POST /model-switchboard/governance/validate`، `GET /model-switchboard/governance/report`
- **اشکال**: model-switchboard-service اندپوینت‌های governance مستقل دارد در حالی که ai-governance-service به عنوان سرویس مرکزی governance تعریف شده است. این تکرار باعث می‌شود دو مسیر مختلف برای governance validation وجود داشته باشد. model-switchboard-service باید از ai-governance-service استفاده کند.
- **کد**: `model-switchboard.service.ts:governanceCheck` (خط ۸۱۲-۸۳۷) — governance check محلی: model را در DB جستجو می‌کند، model card را بررسی می‌کند، اگر card `approved` باشد اجازه می‌دهد. هیچ call به ai-governance-service وجود ندارد. `getGovernanceReport` (خط ۸۳۹-۸۶۷) — report محلی از model cards و invocations summary.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم detail در governance report
- **اندپوینت**: `GET /model-switchboard/governance/report`
- **اشکال**: governance report فقط با `tenantId`، `limit` و `offset` فیلتر می‌شود. هیچ فیلتری بر اساس `modelId`، `capability` یا بازه زمانی وجود ندارد. report باید قابل فیلتر باشد.
- **کد**: `model-switchboard.controller.ts:governanceReport` (خط ۳۳۳-۳۴۴) — فقط `tenantId`، `limit`، `offset` از query. `model-switchboard.service.ts:getGovernanceReport` (خط ۸۳۹-۸۶۷) — فیلتر فقط `tenantId`.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم alerting برای circuit breaker
- **اندپوینت**: `GET /model-switchboard/circuit-breaker/:modelKey`
- **اشکال**: circuit breaker state فقط قابل مشاهده است. اگر circuit breaker باز (tripped) شود، هیچ notification یا alert ای ارسال نمی‌شود. باید alerting خودکار تعریف شود.
- **کد**: `circuit-breaker.ts` (خط ۱۱۴) — `this.logger.warn(...)` — فقط log. هیچ event یا notification ارسال نمی‌شود. هیچ OutboxPublisher برای circuit breaker events استفاده نشده.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم reset endpoint برای circuit breaker
- **اندپوینت**: `GET /model-switchboard/circuit-breaker/:modelKey`
- **اشکال**: circuit breaker state فقط قابل view است. هیچ اندپوینتی برای manual reset circuit breaker وجود ندارد. در صورت tripped شدن، باید ادمین بتواند آن را reset کند.
- **کد**: `circuit-breaker.ts:reset` (خط ۱۳۷-۱۳۹) — `reset(key: string): void { this.breakers.delete(key) }` — متد reset در کلاس وجود دارد. `model-switchboard.controller.ts` — هیچ endpoint ای برای reset تعریف نشده. متد `getCircuitBreakerStats` در service (خط ۸۷۱-۸۷۳) فقط stats برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد — با توضیح که `reset` متد در CircuitBreaker class وجود دارد اما از طریق API قابل دسترسی نیست.

### ۶.۵ عدم statistical significance در A/B test report
- **اندپوینت**: `GET /model-switchboard/ab-test/:policyId/report`
- **اشکال**: A/B test report برمی‌گردد اما مشخص نیست آیا statistical significance (p-value، confidence interval) محاسبه می‌شود یا خیر. بدون statistical significance، نمی‌توان تشخیص داد که تفاوت بین model A و B معنادار است یا تصادفی.
- **کد**: `model-switchboard.service.ts:getAbTestReport` (خط ۸۷۷-۹۲۴) — report شامل `invocations`، `successes`، `failures`، `avgLatencyMs` برای هر variant. هیچ p-value، confidence interval، یا statistical significance test.
- **وضعیت**: ✅ تأیید شد

### ۶.۶ عدم stop endpoint برای A/B test
- **اندپوینت**: `GET /model-switchboard/ab-test/:policyId/report`
- **اشکال**: A/B test report فقط قابل view است. هیچ اندپوینتی برای stop یا conclude A/B test وجود ندارد. باید `POST /model-switchboard/ab-test/:policyId/stop` تعریف شود تا بتوان A/B test را متوقف و winner را declare کرد.
- **کد**: `model-switchboard.controller.ts` — هیچ endpoint برای stop A/B test. برای stop می‌توان `updateRoutePolicy` با `abTestEnabled: false` استفاده کرد اما این یک endpoint عمومی است نه A/B test specific.
- **وضعیت**: ✅ تأیید شد

---

## ۷. مسائل امنیتی عمومی

### ۷.۱ عدم tenant isolation در getModel و activateModel (نقص جدید)
- **اندپوینت**: `GET /model-switchboard/models/:id`، `PUT /model-switchboard/models/:id/activate`
- **اشکال**: `getModel` و `activateModel` بر اساس `id` جستجو می‌کنند بدون فیلتر tenant. یک کاربر می‌تواند model متعلق به tenant دیگر را ببیند یا activate کند.
- **کد**: `model-switchboard.service.ts:getModel` (خط ۳۵۹-۳۶۱) — `this.modelRepo.findOne({ where: { id } })` — بدون فیلتر tenant. `activateModel` (خط ۸۷) — `manager.findOne(ModelDefinition, { where: { id } })` — بدون فیلتر tenant. در مقابل، `listModels` (خط ۳۳۹-۳۴۰) به درستی `m.tenantId = :tenantId` فیلتر می‌کند. `selectBestModel` (خط ۲۳۲) هم tenant فیلتر می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۲ عدم rate limiting در record-usage
- **اندپوینت**: `POST /model-switchboard/record-usage`
- **اشکال**: هیچ rate limiting ای برای record-usage وجود ندارد. یک سرویس می‌تواند به طور مکرر usage record بفرستد و usage data را دستکاری کند.
- **کد**: `main.ts` — هیچ rate limiting.
- **وضعیت**: ✅ تأیید شد

### ۷.۳ عدم validation requestId در record-usage
- **اندپوینت**: `POST /model-switchboard/record-usage`
- **اشکال**: فیلد `requestId` وجود دارد اما مشخص نیست آیا uniqueness بررسی می‌شود یا خیر. اگر نه، usage record‌های تکراری می‌توانند ثبت شوند که باعث تورم cost report می‌شود.
- **کد**: `entities/UsageRecord.ts` (خط ۳۸-۳۹) — `@Column({ nullable: true }) requestId: string` — هیچ `unique: true` constraint. `model-switchboard.service.ts:recordUsage` (خط ۶۴۳) — `requestId: params.requestId || null` — بدون uniqueness check.
- **وضعیت**: ✅ تأیید شد

---

## ۸. ذینفعان و مصرف‌کنندگان

### ۸.۱ عدم یکپارچه‌سازی با copilot-service برای routing
- **اشکال**: copilot-service فیلد `provider` در request body دارد که کاربر به طور دستی provider را انتخاب می‌کند. در حالی که model-switchboard-service اندپوینت `POST /model-switchboard/route` برای routing خودکار دارد. copilot-service باید از model-switchboard-service برای routing استفاده کند نه انتخاب دستی. این یکپارچه‌سازی تعریف نشده است.
- **کد**: جستجو در `copilot-service/src` برای `model-switchboard` یا `model-switchboard/route` — هیچ نتیجه‌ای یافت نشد. copilot-service از `ModelRouter` داخلی خود استفاده می‌کند نه model-switchboard-service.
- **وضعیت**: ✅ تأیید شد

### ۸.۲ عدم یکپارچه‌سازی با ai-governance-service برای model registration
- **اشکال**: model-switchboard-service و ai-governance-service هر دو model registration دارند. مشخص نیست آیا model‌های ثبت شده در ai-governance-service به طور خودکار در model-switchboard-service register می‌شوند یا خیر. اگر نه، دو سیستم جداگانه برای model inventory وجود دارد.
- **کد**: `model-switchboard.service.ts:registerModel` (خط ۳۶-۸۳) — event `insurance.ai.model.registered` منتشر می‌کند. اما هیچ consumer در ai-governance-service برای این event یافت نشد. هیچ integration بین دو سرویس برای model registration.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ ~~عدم event publishing برای model lifecycle changes~~
- ~~**اشکال**: وقتی model activate یا deactivate می‌شود، هیچ event ای publish نمی‌شود. سرویس‌های مصرف‌کننده (مانند copilot-service) باید از تغییرات model status مطلع شوند.~~
- **کد**: `model-switchboard.service.ts` — `registerModel` (خط ۶۵-۸۰): `OutboxPublisher.publish` با topic `insurance.ai.model.registered`. `activateModel` (خط ۹۱-۱۰۳): `OutboxPublisher.publish` با topic `insurance.ai.model.activated`. `createRoutePolicy` (خط ۴۲۷-۴۴۲): event `RoutePolicyCreated`. `updateRoutePolicy` (خط ۴۶۶-۴۸۰): event `RoutePolicyUpdated`. `deleteRoutePolicy` (خط ۵۱۱-۵۲۳): event `RoutePolicyDeleted`. `recordUsage` (خط ۶۵۰-۶۶۵): event `ModelInvoked`. `main.ts` (خط ۱۲-۲۹) — `OutboxWorker` پیکربندی شده. اما چون deactivate endpoint وجود ندارد (نقص ۱.۲)، هیچ `ModelDeactivated` event‌ای منتشر نمی‌شود.
- **وضعیت**: ⚠️ رد شد جزئی — event برای register و activate منتشر می‌شود، اما deactivate event وجود ندارد (چون deactivate endpoint نیست).

---

## ۹. نقایص جدید کشف‌شده در بررسی کد

### ۹.۱ عدم tenant isolation در model card operations (نقص جدید)
- **اندپوینت**: `POST /model-switchboard/model-cards`، `GET /model-switchboard/model-cards`، `PATCH /model-switchboard/model-cards/:id`، `POST /model-switchboard/model-cards/:id/approve`، `POST /model-switchboard/model-cards/:id/deprecate`
- **اشکال**: هیچ‌کدام از model card operations بر اساس tenant فیلتر نمی‌شوند. `ModelCard` entity هیچ ستون `tenantId` ندارد. یک کاربر می‌تواند model card متعلق به tenant دیگر را ببیند، ویرایش، approve یا deprecate کند.
- **کد**: `entities/ModelCard.ts` (خط ۹-۶۶) — هیچ ستون `tenantId`. `model-switchboard.service.ts` — `createModelCard` (خط ۷۵۰)، `getModelCard` (خط ۷۶۸)، `listModelCards` (خط ۷۷۶)، `updateModelCard` (خط ۷۸۵)، `approveModelCard` (خط ۷۹۳)، `deprecateModelCard` (خط ۸۰۳) — هیچ‌کدام tenant فیلتر نمی‌کنند.
- **وضعیت**: ✅ تأیید شد (نقص جدید بحرانی)

### ۹.۲ governanceCheck اجازه invocation بدون model card می‌دهد (نقص جدید بحرانی)
- **اندپوینت**: `POST /model-switchboard/invoke`
- **اشکال**: اگر model card وجود نداشته باشد، `governanceCheck` به جای reject کردن، `allowed: true` برمی‌گرداند. این یعنی model‌های بدون model card می‌توانند بدون governance review invoke شوند.
- **کد**: `model-switchboard.service.ts:governanceCheck` (خط ۸۲۳-۸۲۶) — `if (!card) { auditLogger.warn('No model card found; allowing with governance warning', ...); return { allowed: true, reason: 'No model card found; governance review recommended', cardStatus: 'missing', riskLevel: 'unknown' } }` — این یک fail-open policy است که خطر امنیتی دارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید بحرانی) — باید fail-closed باشد: اگر model card وجود نداشته باشد، `allowed: false`.

### ۹.۳ عدم automatic cost recording از invoke (نقص جدید)
- **اندپوینت**: `POST /model-switchboard/invoke`
- **اشکال**: `invokeModel` به طور خودکار usage record ایجاد نمی‌کند. cost و token usage فقط از طریق endpoint جداگانه `POST /record-usage` به طور دستی ثبت می‌شود. اگر caller فراموش کند `record-usage` را فراخوانی کند، cost data از دست می‌رود.
- **کد**: `model-switchboard.service.ts:invokeModel` (خط ۱۰۸-۲۱۷) — `ModelInvocation` ذخیره می‌کند اما `recordUsage` فراخوانی نمی‌کند. `recordUsage` (خط ۶۱۴-۶۶۸) یک متد جداگانه است که از controller endpoint جداگانه فراخوانی می‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۹.۴ عدم validation کامل ورودی‌ها (نقص جدید)
- **اندپوینت**: تمام اندپوینت‌های `POST` و `PUT`
- **اشکال**: هیچ `ValidationPipe` یا `class-validator` در کل سرویس استفاده نشده. body types به صورت inline TypeScript تعریف شده‌اند بدون runtime validation.
- **کد**: `main.ts` — هیچ `useGlobalPipes`. جستجو در کل سرویس — هیچ `class-validator` یا `ValidationPipe`. `model-switchboard.controller.ts:createModelCard` (خط ۲۷۰) — `body: any`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۹.۵ AbacGuard غیر مؤثر (نقص جدید)
- **اندپوینت**: تمام اندپوینت‌های `/model-switchboard/*`
- **اشکال**: AbacGuard برای GET requests همه کاربران authenticated را اجازه می‌دهد و برای state-changing operations فقط بررسی می‌کند که کاربر role داشته باشد.
- **کد**: `abac.guard.ts` (خط ۱۴-۱۵) — `if (method === 'GET') return true`. (خط ۲۶) — `return roles.length > 0`. با این حال، این سرویس به طور مؤثر از `@RequirePermissions` استفاده می‌کند که PermissionsGuard را فعال می‌کند، بنابراین AbacGuard لایه اضافی ضعیف است.
- **وضعیت**: ✅ تأیید شد (نقص جدید) — اما کمتر بحرانی است چون PermissionsGuard به درستی با `@RequirePermissions` فعال شده.

### ۹.۶ عدم tenant isolation در route policy operations (نقص جدید)
- **اندپوینت**: `GET /model-switchboard/policies/:id`، `PUT /model-switchboard/policies/:id`، `DELETE /model-switchboard/policies/:id`
- **اشکال**: `getRoutePolicy`، `updateRoutePolicy`، و `deleteRoutePolicy` بر اساس `id` جستجو می‌کنند بدون فیلتر tenant. یک کاربر می‌تواند policy متعلق به tenant دیگر را ببیند، ویرایش یا حذف کند.
- **کد**: `model-switchboard.service.ts` — `getRoutePolicy` (خط ۴۸۴): `findOne({ where: { id } })` — بدون tenant filter. `updateRoutePolicy` (خط ۴۶۱): `findOne({ where: { id } })` — بدون tenant filter. `deleteRoutePolicy` (خط ۵۰۸): `findOne({ where: { id } })` — بدون tenant filter. در مقابل، `listRoutePolicies` (خط ۴۹۷) به درستی tenant فیلتر می‌کند (با wildcard support).
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۹.۷ عدم tenant isolation در governance report (نقص جدید)
- **اندپوینت**: `GET /model-switchboard/governance/report`
- **اشکال**: governance report اگر `tenantId` ارسال نشود، تمام model cards را برمی‌گرداند. هیچ اجباری برای ارسال tenantId وجود ندارد.
- **کد**: `model-switchboard.controller.ts:governanceReport` (خط ۳۳۸-۳۴۳) — `tenantId: query.tenantId` — اختیاری. `model-switchboard.service.ts:getGovernanceReport` (خط ۸۳۹-۸۶۷) — `if (params.tenantId)` — اگر tenantId نباشد، تمام model cards برمی‌گردند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
