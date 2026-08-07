# Copilot Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: copilot-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/copilot-service/src/`

---

## ۱. Summary و QA

### ۱.۱ عدم caching برای claim summary
- **اندپوینت**: `POST /copilot/claims/:claimId/summary`
- **اشکال**: claim summary هر بار که درخواست می‌شود به طور کامل تولید می‌شود. هیچ مکانیزم caching ای وجود ندارد. اگر claim تغییر نکرده باشد، summary قبلی باید از cache برگردانده شود تا هزینه AI و latency کاهش یابد. باید cache key بر اساس `claimId` و `updatedAt` claim باشد.
- **کد**: `controllers/copilot.controller.ts:claimSummary` (خط ۲۴-۳۵) — در هر درخواست `this.copilotService.getClaimSummary()` فراخوانی می‌شود. `services/copilot.service.ts:getClaimSummary` (خط ۱۱۲۷) — هر بار `this.claimRepo.findOne` و `this.docRepo.find` اجرا می‌کند و `this.buildClaimSummary(claim, docs)` را فرامی‌خواند. هیچ cache یا memoization وجود ندارد. نکته: این متد در واقع AI را فراخوانی نمی‌کند — `buildClaimSummary` یک متد محلی برای assembly داده‌ها است. اما با این حال caching برای کاهش DB load مفید است.
- **وضعیت**: ✅ تأیید شد — با توضیح که `getClaimSummary` در حال حاضر AI را فراخوانی نمی‌کند (data assembly است)، اما عدم caching همچنان برای DB load قابل توجه است.

### ۱.۲ عدم async/long-running برای عملیات AI
- **اندپوینت**: `POST /copilot/claims/:claimId/summary`، `POST /copilot/documents/:documentId/summary`، `POST /copilot/qa`
- **اشکال**: تمام این اندپوینت‌ها به صورت synchronous عمل می‌کنند. تولید summary یا پاسخ QA می‌تواند چند ثانیه تا چند دقیقه طول بکشد. این می‌تواند باعث timeout در HTTP و تجمع connection‌ها شود. باید از pattern async (job + polling یا webhook) استفاده شود.
- **کد**: `services/copilot.service.ts` — `getClaimSummary` (خط ۱۱۲۷) در حال حاضر AI را فراخوانی نمی‌کند (data assembly). اما `askQuestion` (خط ۱۳۶۸) از `this.generateLLMSummary` یا `this.llmService.answerQuestion` استفاده می‌کند که `await` می‌شود. همچنین `assistUnderwriting` (خط ۷۰۲)، `triageComplaint` (خط ۷۸۰)، `discoverRecovery` (خط ۸۵۵)، `assistPricing` (خط ۹۳۰)، `assistSelfService` (خط ۱۰۰۵) همگی `await this.llmService.generateWithFallback()` را فراخوانی می‌کنند که synchronous است. `llm.service.ts:httpPost` (خط ۱۰۱) با timeout ۳۰۰۰۰-۶۰۰۰۰ms کار می‌کند.
- **وضعیت**: ✅ تأیید شد — برای اندپوینت‌های AI (QA، underwriting، triage، recovery، pricing، selfservice). `getClaimSummary` در حال حاضر AI فراخوانی نمی‌کند.

### ۱.۳ عدم rate limiting برای عملیات AI پرهزینه
- **اندپوینت**: `POST /copilot/qa`، `POST /copilot/next-best-action`، `POST /copilot/underwriting/assist`، `POST /copilot/pricing/assist`
- **اشکال**: هیچ rate limiting ای برای این اندپوینت‌های AI پرهزینه تعریف نشده است. یک کاربر می‌تواند به طور مکرر درخواست QA یا assist بفرستد و هزینه AI را به شدت افزایش دهد. rate limit باید بر اساس user/tenant و cost budget تعریف شود.
- **کد**: `main.ts` — هیچ `ThrottlerModule` یا rate limiting middleware پیکربندی نشده است. `model-router.ts:ModelRouter` (خط ۹۱) `costBudgetPerDay` را اعمال می‌کند اما این cost-based است نه request-count based. هیچ محدودیتی روی تعداد درخواست‌ها در دقیقه وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم cost tracking در response عملیات AI
- **اندپوینت**: تمام اندپوینت‌های `POST /copilot/*` (summary، qa، assist، triage، discover، pricing، selfservice، recommend-product، draft-communication)
- **اشکال**: هیچ فیلدی برای ثبت cost (token count، API cost) در response وجود ندارد. در عملیات AI، cost tracking برای governance و budget control الزامی است. هر invocation باید cost را برگرداند و در usage log ثبت کند.
- **کد**: `llm.service.ts:LLMResponse` (خط ۱۸-۲۴) فیلد `tokensUsed` دارد و `ModelRouter.recordUsage` (خط ۱۳۳) daily spend را در `dailySpend` Map ذخیره می‌کند. اما در response کنترلر (مثلاً `assistUnderwriting` خط ۷۴۴-۷۴۹) فقط `recommendation`، `confidence`، `suggestedActions` و `riskLevel` برمی‌گردد — هیچ اطلاعاتی درباره tokens یا cost. در audit log (خط ۷۲۸-۷۴۲) `latencyMs: 0` hardcoded است و `tokensUsed` ثبت نمی‌شود.
- **وضعیت**: ✅ تأیید شد — cost داخلی در ModelRouter ذخیره می‌شود اما در API response یا audit log قابل مشاهده نیست.

### ۱.۵ عدم explainability واقعی در پاسخ‌های AI
- **اندپوینت**: `POST /copilot/qa`، `POST /copilot/underwriting/assist`، `POST /copilot/pricing/assist`، `POST /copilot/recommend-product`
- **اشکال**: پاسخ‌های AI فقط شامل `data` هستند بدون هیچ explanation یا confidence score. در تصمیمات underwriting و pricing که تاثیر مالی دارند، copilot باید confidence level و rationale ارائه دهد تا کاربر بتواند اعتبار پاسخ را ارزیابی کند.
- **کد**: `services/copilot.service.ts` — `assistUnderwriting` (خط ۷۴۴) `confidence: 0.85` و `riskLevel: 'medium'` را **hardcoded** برمی‌گرداند، مستقل از پاسخ AI. `triageComplaint` (خط ۸۲۱) `category: 'فنی'`، `priority: 'medium'` hardcoded. `assistPricing` (خط ۹۷۱) `suggestedPremium: coverageAmount * 0.03` hardcoded. `discoverRecovery` (خط ۸۹۶) `recoveryOpportunities` hardcoded. در مقابل، `getClaimSummary` (خط ۱۲۰۸) و `askQuestion` (خط ۱۴۹۹) `confidence` واقعی از `computeOutputConfidence` برمی‌گردانند.
- **وضعیت**: ✅ تأیید شد — مقادیر confidence و riskLevel در اکثر assist endpoints hardcoded هستند و از پاسخ واقعی AI استخراج نمی‌شوند.

### ۱.۶ عدم validation طول query در QA
- **اندپوینت**: `POST /copilot/qa`
- **اشکال**: فیلد `question` به صورت string آزاد ارسال می‌شود بدون محدودیت طول. یک کاربر می‌تواند query بسیار طولانی بفرستد که باعث مصرف بیش از حد token و هزینه بالا شود. باید max length validation تعریف شود.
- **کد**: `controllers/copilot.controller.ts:askQuestion` (خط ۵۹-۹۰) — `body?.question` مستقیماً به `this.copilotService.askQuestion` پاس داده می‌شود بدون هیچ بررسی طول. `services/copilot.service.ts:askQuestion` (خط ۱۳۶۸) نیز `question: string` را بدون محدودیت طول می‌پذیرد. در `chat` endpoint (خط ۱۴۹) فقط بررسی `!body?.message` وجود دارد اما max length تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Underwriting و Pricing Assist

### ۲.۱ عدم human-in-the-loop در underwriting assist
- **اندپوینت**: `POST /copilot/underwriting/assist`
- **اشکال**: underwriting assist پاسخ AI را برمی‌گرداند اما هیچ مکانیزمی برای human review و approval وجود ندارد. در underwriting، تصمیم AI باید توسط underwriter تایید شود قبل از اعمال. هیچ اندپوینتی برای approve/reject پیشنهاد AI تعریف نشده است.
- **کد**: `controllers/copilot.controller.ts:assistUnderwriting` (خط ۹۰۵-۹۵۰) — فقط `POST` وجود دارد و response شامل `recommendation`، `confidence`، `suggestedActions` و `riskLevel` است. هیچ اندپوینتی برای approve/reject این recommendation تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ ~~عدم audit trail برای pricing assist~~
- **اندپوینت**: `POST /copilot/pricing/assist`
- ~~**اشکال**: pricing assist پیشنهاد قیمت می‌دهد اما هیچ audit trail ای ثبت نمی‌شود که چه کسی، چه زمانی و با چه ورودی‌هایی درخواست کرده و چه پیشنهادی دریافت کرده است. در pricing، audit trail برای compliance الزامی است.~~
- **کد**: `services/copilot.service.ts:assistPricing` (خط ۹۵۵-۹۶۹) — `await this.auditRepo.save({...})` با فیلدهای `action: 'copilot:pricing:assist'`، `userId`، `correlationId`، `requestPayload`، `responsePayload`، `provider`، `model`. audit trail در `CopilotAudit` entity ذخیره می‌شود. نکته: `latencyMs: 0` hardcoded است (مشکل جداگانه).
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: audit trail از طریق `this.auditRepo.save()` در `services/copilot.service.ts:assistPricing` (خط ۹۵۵) پیاده‌سازی شده است.

### ۲.۳ عدم validation riskFactors و riskProfile
- **اندپوینت**: `POST /copilot/underwriting/assist`، `POST /copilot/pricing/assist`
- **اشکال**: فیلدهای `riskFactors` و `riskProfile` به صورت array و object آزاد تعریف شده‌اند بدون هیچ schema مشخصی. ساختار نامعتبر می‌تواند به پاسخ AI نادرست منجر شود.
- **کد**: `controllers/copilot.controller.ts:assistUnderwriting` (خط ۹۰۸) — `@Body() body: any` بدون validation. `services/copilot.service.ts:assistUnderwriting` (خط ۷۰۷) — `riskFactors?: string[]` بدون schema validation. `assistPricing` (خط ۹۳۴) — `riskProfile?: string` و `marketData?: any` بدون validation. `buildUnderwritingContext` (خط ۷۶۱) و `buildPricingContext` (خط ۹۸۸) فقط مقادیر را در string concat می‌کنند.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Complaint Triage و Recovery

### ۳.۱ عدم severity validation در complaint triage
- **اندپوینت**: `POST /copilot/complaints/triage`
- **اشکال**: فیلد `severity` به صورت string آزاد ارسال می‌شود. باید enum با مقادیر استاندارد (`low`، `medium`، `high`، `critical`) باشد. severity نامعتبر باعث routing نادرست می‌شود.
- **کد**: `controllers/copilot.controller.ts:triageComplaint` (خط ۹۵۶) — `@Body() body: any` بدون validation. `services/copilot.service.ts:triageComplaint` (خط ۷۸۵) — `severity?: string` بدون enum validation. `buildComplaintContext` (خط ۸۴۹) فقط `severity` را در string concat می‌گذارد. خروجی `priority` نیز hardcoded `'medium'` است (خط ۸۲۳).
- **وضعیت**: ✅ تأیید شد

### ۳.۲ ~~عدم fallback در recovery discover~~
- **اندپوینت**: `POST /copilot/recovery/discover`
- ~~**اشکال**: اگر AI provider در دسترس نباشد یا خطا دهد، هیچ fallback mechanism ای وجود ندارد. باید fallback به provider دیگر یا response پیش‌فرض تعریف شود.~~
- **کد**: `services/copilot.service.ts:discoverRecovery` (خط ۸۵۵) — `this.llmService.generateWithFallback(providers, ...)` (خط ۸۷۰) فراخوانی می‌کند که در `llm.service.ts:generateWithFallback` (خط ۳۳۸-۳۶۴) روی تمام providers حلقه می‌زند و در صورت خطا به provider بعدی می‌رود. اگر همه fail شوند، `catch` block (خط ۹۰۲) مقادیر پیش‌فرض hardcoded برمی‌گرداند. پس هم fallback بین providers وجود دارد و هم fallback به response پیش‌فرض.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `generateWithFallback` در `llm.service.ts` (خط ۳۳۸) fallback بین providers را پیاده‌سازی می‌کند و `catch` block در `discoverRecovery` (خط ۹۰۲) fallback به response پیش‌فرض را ارائه می‌دهد.

---

## ۴. Self-Service و Ecosystem

### ۴.۱ عدم PII detection در self-service
- **اندپوینت**: `POST /copilot/selfservice/assist`
- **اشکال**: فیلد `query` از customer دریافت می‌شود و به AI provider ارسال می‌شود. هیچ PII detection یا redaction ای قبل از ارسال به AI provider وجود ندارد. اطلاعات حساس مشتری (کد ملی، شماره حساب) می‌تواند به AI provider خارجی نشت کند.
- **کد**: `services/copilot.service.ts:assistSelfService` (خط ۱۰۰۵) — `buildSelfServiceContext` (خط ۱۰۶۲) `params.query` را مستقیماً در context string قرار می‌دهد و به `generateWithFallback` (خط ۱۰۱۹) پاس می‌دهد. هیچ `redactSensitive` روی input اعمال نمی‌شود. متد `redactSensitive` (خط ۱۵۹) فقط روی **output** در `getClaimSummary` (خط ۱۱۷۹) و `askQuestion` (خط ۱۴۷۱) اعمال می‌شود، نه روی input. مهم‌تر اینکه `assistSelfService` خروجی AI را هم **بدون** `redactSensitive` برمی‌گرداند (خط ۱۰۴۶: `response: response.text`).
- **وضعیت**: ✅ تأیید شد — نه روی input و نه روی output در `assistSelfService` PII redaction اعمال نمی‌شود.

### ۴.۲ عدم validation contextType در ecosystem consult
- **اندپوینت**: `POST /copilot/ecosystem/consult`
- **اشکال**: فیلد `contextType` اختیاری و string آزاد است. باید whitelist از contextType‌های مجاز تعریف شود. همچنین `query` required است اما max length تعریف نشده.
- **کد**: `controllers/copilot.controller.ts:ecosystemConsult` (خط ۱۱۴۶) — `body: { query: string; context?: string; contextType?: string }` — `contextType` اختیاری و `string` بدون whitelist. `query` required است (بررسی در خط ۱۱۵۶) اما max length تعریف نشده. `services/copilot.service.ts:ecosystemConsult` (خط ۱۶۹۱) — `contextType?: 'claim' | 'document' | 'policy' | 'complaint'` اما در runtime `as any` (خط ۱۱۶۸ کنترلر) پاس داده می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ ~~عدم timeout handling در ecosystem consult~~
- **اندپوینت**: `POST /copilot/ecosystem/consult`
- ~~**اشکال**: اگر ecosystem AI gateway پاسخ ندهد، مشخص نیست چه timeout ای تعریف شده است. خطای `ECOSYSTEM_AI_ERROR` برگردانده می‌شود اما retry policy و circuit breaker تعریف نشده‌اند.~~
- **کد**: `services/ecosystem-ai.provider.ts:consult` (خط ۵۵) — `AbortController` با `this.timeoutMs` (خط ۸۰-۸۱) که از `ECOSYSTEM_AI_TIMEOUT_MS` (default 60000ms) خوانده می‌شود. در صورت timeout، `AbortError` catch شده و `'Ecosystem AI gateway timeout'` throw می‌شود (خط ۱۱۲-۱۱۳). پس timeout تعریف شده است. اما retry policy و circuit breaker واقعاً وجود ندارند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: timeout از طریق `AbortController` در `ecosystem-ai.provider.ts:consult` (خط ۸۰) پیاده‌سازی شده است. اما عدم retry policy و circuit breaker همچنان معتبر است (نقص جداگانه).

---

## ۵. Model Governance (تکرار با ai-governance-service)

### ۵.۱ تکرار کامل model registration با ai-governance-service
- **اندپوینت**: `POST /copilot/models/register`
- **اشکال**: copilot-service اندپوینت مستقل برای ثبت model دارد در حالی که ai-governance-service نیز `POST /models` را برای همان هدف دارد. این تکرار باعث می‌شود مدل‌ها در دو سرویس به طور جداگانه ثبت شوند و هماهنگی از دست برود. copilot-service باید از ai-governance-service استفاده کند.
- **کد**: `controllers/copilot.controller.ts:registerModel` (خط ۱۸۲) — `copilot:manage` permission. `services/copilot.service.ts:registerModel` (در `ModelInventory` entity) مدل را در DB محلی copilot-service ذخیره می‌کند. هیچ HTTP client یا proxy به ai-governance-service وجود ندارد. `entities/ModelInventory.ts` (۱۰KB) entity مستقل دارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ تکرار incident management با ai-governance-service
- **اندپوینت**: `POST /copilot/incidents`، `PUT /copilot/incidents/:incidentId/status`، `PUT /copilot/incidents/:incidentId/resolve`، `GET /copilot/incidents/:incidentId`، `GET /copilot/incidents`
- **اشکال**: copilot-service سیستم incident management مستقل دارد در حالی که ai-governance-service نیز incident lifecycle کامل را پشتیبانی می‌کند (create، assign، investigate، mitigate، resolve، close). copilot-service فقط create، update status و resolve را دارد و از assign، investigate و mitigate بی‌بهره است. این تکرار و نقص همزمان باعث سردرگمی می‌شود.
- **کد**: `controllers/copilot.controller.ts` — `createIncident` (خط ۴۸۸)، `updateIncidentStatus` (خط ۵۳۴)، `resolveIncident` (خط ۵۶۵)، `getIncident` (خط ۵۹۳)، `listIncidents` (خط ۶۱۵). `services/copilot.service.ts` — `createIncidentReport` (خط ۴۵۲) با `OutboxPublisher` event publish می‌کند. اما هیچ assign، investigate یا mitigate endpointی وجود ندارد. `AIIncidentReport` entity مستقل از `ai-governance-service` است.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ تکرار risk assessment و validation report
- **اندپوینت**: `POST /copilot/models/:modelId/risk-assessment`، `POST /copilot/models/:modelId/validation-report`
- **اشکال**: copilot-service risk assessment و validation report مستقل دارد در حالی که ai-governance-service نیز validation workflow کامل دارد. این تکرار باعث می‌شود دو مسیر مختلف برای همان عملیات وجود داشته باشد.
- **کد**: `controllers/copilot.controller.ts` — `createRiskAssessment` (خط ۳۴۷)، `createValidationReport` (خط ۷۸۱). `services/copilot.service.ts` — `createRiskAssessment` (خط ۳۷۶) و `createValidationReport` (خط ۶۳۵) هر دو در DB محلی ذخیره می‌کنند. هیچ ارجاعی به `ai-governance-service` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ تکرار model card با model-switchboard-service
- **اندپوینت**: `POST /copilot/models/:modelId/model-card`، `PUT /copilot/model-card/:cardId`، `GET /copilot/model-card/:cardId`
- **اشکال**: copilot-service و model-switchboard-service هر دو model card management دارند. تکرار عملیات model card در دو سرویس باعث ناهماهنگی داده می‌شود.
- **کد**: `controllers/copilot.controller.ts` — `createModelCard` (خط ۶۳۷)، `updateModelCard` (خط ۶۸۴)، `getModelCard` (خط ۷۲۱)، `getModelCardByVersion` (خط ۷۴۳)، `listModelCardsForModel` (خط ۷۶۵). `services/copilot.service.ts` — `createModelCard`، `updateModelCard`، `getModelCard` در DB محلی. `ModelCard` entity مستقل.
- **وضعیت**: ✅ تأیید شد — نیاز به بررسی کد model-switchboard-service برای تأیید کامل.

### ۵.۵ عدم SoD در risk assessment approval
- **اندپوینت**: `POST /copilot/models/:modelId/risk-assessment`، `PUT /copilot/risk-assessment/:assessmentId/approve`
- **اشکال**: هر دو اندپوینت از permission `copilot:manage` استفاده می‌کنند. کسی که risk assessment ایجاد می‌کند می‌تواند خودش آن را تایید کند. Separation of Duties نقض می‌شود.
- **کد**: `controllers/copilot.controller.ts` — `createRiskAssessment` (خط ۳۴۹) و `approveRiskAssessment` (خط ۳۹۲) هر دو `@RequirePermissions('copilot:manage')` دارند. `services/copilot.service.ts:approveRiskAssessment` (خط ۴۰۶) — فقط `assessor` را set می‌کند، بررسی `assessor !== createdBy` انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۶. NBA (Next Best Action)

### ۶.۱ ~~عدم pagination در NBA action logs~~
- **اندپوینت**: `GET /copilot/nba/actions`
- ~~**اشکال**: pagination با `limit` (default: 50) و `offset` پشتیبانی می‌شود اما `contextType` و `resourceId` هر دو required هستند. نمی‌توان تمام NBA logs را بدون فیلتر contextType دید که برای audit و reporting مشکل‌ساز است.~~
- **کد**: `controllers/copilot.controller.ts:listNbaActions` (خط ۱۲۷۸) — `@Query('contextType') contextType: string` و `@Query('resourceId') resourceId: string` در TypeScript type به صورت required تعریف شده‌اند، اما NestJS در runtime اگر query param وجود نداشته باشد `undefined` پاس می‌دهد. `services/copilot.service.ts:listNbaActionLogs` (خط ۱۸۸۲) — `contextType?: string` و `resourceId?: string` اختیاری هستند. `nba/nba.service.ts:listActions` (خط ۱۷۰) — `if (params.contextType) qb.andWhere(...)` — اگر contextType وجود نداشته باشد، فیلتر اعمال نمی‌شود. پس در runtime می‌توان تمام NBA logs را بدون فیلتر دید.
- **وضعیت**: ~~رد شد~~ — **رد شد**: در runtime `contextType` و `resourceId` اختیاری هستند و `nba/nba.service.ts:listActions` (خط ۱۷۰) بدون این فیلترها هم query می‌کند. TypeScript type در controller misleading است اما enforcement نمی‌شود.

### ۶.۲ عدم feedback loop در NBA
- **اندپوینت**: `POST /copilot/nba/:logId/execute`، `POST /copilot/nba/:logId/opt-out`
- **اشکال**: NBA action می‌تواند execute یا opt-out شود اما هیچ اندپوینتی برای ثبت feedback (مثلاً "این پیشنهاد مفید بود" یا "این پیشنهاد نامناسب بود") وجود ندارد. feedback loop برای بهبود مدل NBA الزامی است.
- **کد**: `controllers/copilot.controller.ts` — فقط `executeNbaAction` (خط ۱۲۲۷) و `optOutNbaAction` (خط ۱۲۵۰) وجود دارند. `nba/nba.service.ts` — فقط `markExecuted` (خط ۱۵۳) و `markOptedOut` (خط ۱۶۱). هیچ متد یا endpoint برای feedback/thumbs-up/thumbs-down وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم rate limiting در NBA generation
- **اندپوینت**: `POST /copilot/nba/:contextType/:resourceId/actions`
- **اشکال**: NBA generation برای هر context و resource می‌تواند به طور مکرر فراخوانی شود. باید rate limiting تعریف شود تا از مصرف بیش از حد منابع AI جلوگیری شود.
- **کد**: `controllers/copilot.controller.ts:generateNbaActions` (خط ۱۱۸۵) — هیچ rate limiting. `nba/nba.service.ts:generateActions` (خط ۳۸) — در هر فراخوانی actions تولید و log می‌کند. هیچ محدودیتی روی تعداد فراخوانی‌ها برای همان context/resource وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۷. Provider Management

### ۷.۱ عدم health check برای AI providers
- **اندپوینت**: `GET /copilot/providers`
- **اشکال**: لیست providers برمی‌گردد اما هیچ status یا health check ای برای هر provider وجود ندارد. اگر یک provider down باشد، کاربر نمی‌تواند از این اندپوینت بفهمد.
- **کد**: `controllers/copilot.controller.ts:getAvailableProviders` (خط ۱۷۰) — `this.copilotService.getAvailableProviders()`. `llm.service.ts:getAvailableProviders` (خط ۹۳) — `Array.from(this.configs.keys())` — فقط نام providers برمی‌گردد بدون status. هیچ ping یا health check ای انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۷.۲ عدم validation provider در request
- **اندپوینت**: `POST /copilot/qa`، `POST /copilot/underwriting/assist`، `POST /copilot/pricing/assist` و سایر اندپوینت‌های assist
- **اشکال**: فیلد `provider` در request body ارسال می‌شود اما مشخص نیست آیا validation ای بررسی می‌کند که provider در لیست providers فعال وجود دارد یا خیر. یک provider نامعتبر می‌تواند به خطای دیرهنگام منجر شود.
- **کد**: `controllers/copilot.controller.ts` — `body?.provider` به سرویس پاس داده می‌شود. `services/copilot.service.ts:assistUnderwriting` (خط ۷۱۷) — `params.provider ? [params.provider] : this.llmService.getAvailableProviders()`. سپس `generateWithFallback` (خط ۳۳۸) — `if (!this.hasProvider(provider)) { continue; }` — provider نامعتبر skip می‌شود اما هیچ خطای صریح به کاربر برگردانده نمی‌شود. اگر همه providers skip شوند، `All providers failed` error می‌دهد.
- **وضعیت**: ✅ تأیید شد — provider نامعتبر به صورت silent skip می‌شود نه validation error در ابتدا.

---

## ۸. مسائل امنیتی و طراحی

### ۸.۱ عدم tenant isolation در model listing
- **اندپوینت**: `GET /copilot/models`
- **اشکال**: query params شامل `modelType`، `status`، `riskLevel`، `limit` و `offset` است اما `tenantId` وجود ندارد. مشخص نیست TenantGuard به طور خودکار tenant را فیلتر می‌کند یا خیر. اگر نه، یک tenant می‌تواند مدل‌های tenant دیگر را ببیند.
- **کد**: `controllers/copilot.controller.ts:listModels` (خط ۲۹۸) — `query.modelType`، `query.status`، `query.riskLevel`، `query.limit`، `query.offset` — هیچ `tenantId`. `services/copilot.service.ts:listModels` (خط ۳۴۸) — `createQueryBuilder` با فیلترهای `modelType`، `status`، `riskLevel` اما بدون `tenantId`. `TenantGuard` فقط `request.tenantId` set می‌کند اما query را فیلتر نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۸.۲ عدم pagination در list risk assessments و validation reports
- **اندپوینت**: `GET /copilot/models/:modelId/risk-assessments`، `GET /copilot/models/:modelId/validation-reports`
- **اشکال**: این اندپوینت‌ها array کامل برمی‌گردانند بدون pagination. در صورت انباشت assessments و reports، پاسخ بسیار بزرگ می‌شود.
- **کد**: `services/copilot.service.ts` — `listRiskAssessmentsForModel` (خط ۴۴۴): `this.riskAssessmentRepo.find({ where: { modelId }, order: { createdAt: 'DESC' } })` — بدون limit/offset. `listValidationReportsForModel` (خط ۶۹۴): `this.validationRepo.find({ where: { modelId }, order: { createdAt: 'DESC' } })` — بدون limit/offset. `listModelCardsForModel` (خط ۶۲۷) نیز بدون pagination.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ عدم draft-communication safety guardrails
- **اندپوینت**: `POST /copilot/draft-communication`
- **اشکال**: communication draft تولید می‌شود بدون هیچ safety guardrail ای. AI می‌تواند محتوای نامناسب، توهین‌آمیز یا از نظر قانونی مشکل‌دار تولید کند. باید content moderation و approval workflow قبل از ارسال تعریف شود.
- **کد**: `controllers/copilot.controller.ts:draftCommunication` (خط ۱۳۵۵) — `this.ragService.draftCommunication(...)` فراخوانی می‌کند. هیچ content moderation یا safety check قبل یا بعد از تولید draft وجود ندارد. خروجی مستقیماً به کاربر برگردانده می‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۹. ذینفعان و مصرف‌کنندگان

### ۹.۱ ~~عدم یکپارچه‌سازی با claims-service برای summary~~
- ~~**اشکال**: `POST /copilot/claims/:claimId/summary` به claimId ارجاع می‌دهد اما مشخص نیست آیا copilot-service مستقیماً از claims-service داده‌های claim را fetch می‌کند یا خیر. اگر مستقیم fetch نکند، summary بر اساس داده ناقص تولید می‌شود.~~
- **کد**: `services/copilot.service.ts:getClaimSummary` (خط ۱۱۶۴) — `this.claimRepo.findOne({ where: { claimId: params.claimId } })` و `this.docRepo.find({ where: { claimId: params.claimId } })` — copilot-service از **DB محلی خود** (entities `ClaimEntity` و `DocumentEntity`) داده‌های claim را می‌خواند، نه از claims-service via API. این یعنی داده‌های claim باید در DB copilot-service sync باشند. نکته: `getClaimSummary` در حال حاضر AI فراخوانی نمی‌کند — `buildClaimSummary` یک متد محلی برای data assembly است.
- **وضعیت**: ✅ تأیید شد — copilot-service از DB محلی خود claim را می‌خواند نه از claims-service via API. یکپارچه‌سازی واقعی با claims-service وجود ندارد.

### ۹.۲ عدم یکپارچه‌سازی با document-service برای document summary
- **اشکال**: `POST /copilot/documents/:documentId/summary` به documentId ارجاع می‌دهد اما مشخص نیست آیا copilot-service از document-service محتوای document را دریافت می‌کند. یکپارچه‌سازی با document-service باید صریح باشد.
- **کد**: `services/copilot.service.ts` — `getDocumentSummary` از `this.docRepo.findOne({ where: { documentId } })` استفاده می‌کند (DB محلی). هیچ HTTP client به document-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد — مشابه ۹.۱، از DB محلی خوانده می‌شود نه از document-service via API.

### ۹.۳ عدم یکپارچه‌سازی با knowledge-service برای NBA
- **اشکال**: copilot-service اندپوینت `POST /copilot/next-best-action` دارد و knowledge-service نیز `POST /knowledge/nba` و `GET /knowledge/nba/recommendations` دارد. این تکرار NBA در دو سرویس باعث سردرگمی می‌شود. باید مشخص شود کدام سرویس owner اصلی NBA است.
- **کد**: `controllers/copilot.controller.ts` — `getNextBestAction` (خط ۹۲) و `generateNbaActions` (خط ۱۱۸۵). `nba/nba.service.ts:NbaEngineService` — rule-based NBA تولید می‌کند (نه AI-based). هیچ ارجاعی به knowledge-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۹.۴ عدم یکپارچه‌سازی با model-switchboard-service برای routing
- **اشکال**: copilot-service فیلد `provider` در request body دارد که کاربر به طور دستی provider را انتخاب می‌کند. در حالی که model-switchboard-service اندپوینت `POST /model-switchboard/route` برای routing خودکار دارد. copilot-service باید از model-switchboard-service برای routing استفاده کند نه انتخاب دستی.
- **کد**: `services/copilot.service.ts` — `assistUnderwriting` (خط ۷۱۷): `params.provider ? [params.provider] : this.llmService.getAvailableProviders()`. `llm.service.ts:generate` (خط ۱۶۳) — `this.modelRouter.route(...)` که `ModelRouter` داخلی است (نه model-switchboard-service). `model-router.ts` (خط ۳۸) یک router مستقل داخلی است که cost/quality-based routing انجام می‌دهد. هیچ HTTP client به model-switchboard-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد — copilot-service از `ModelRouter` داخلی استفاده می‌کند نه از model-switchboard-service.

### ۹.۵ عدم دسترسی customer-portal به self-service assist
- **اشکال**: `POST /copilot/selfservice/assist` با permission `copilot:view` در دسترس است اما مشخص نیست آیا customer-portal-service به این اندپوینت دسترسی دارد یا خیر. اگر customer-portal بخواهد از copilot برای self-service استفاده کند، باید integration صریح تعریف شود.
- **کد**: `controllers/copilot.controller.ts:assistSelfService` (خط ۱۰۹۷) — `@RequirePermissions('copilot:view')`. هیچ integration صریح با customer-portal-service در کد copilot-service تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۹.۶ ~~عدم audit trail مرکزی برای تمام عملیات AI~~
- ~~**اشکال**: هیچ ارجاعی به audit-service یا event publishing برای عملیات AI copilot وجود ندارد. تمام invocation‌های AI باید در audit trail مرکزی ثبت شوند تا قابل追踪 و compliance باشند.~~
- **کد**: `services/copilot.service.ts` — `this.auditRepo` (entity `CopilotAudit`) در تمام عملیات AI استفاده می‌شود: `getClaimSummary` (خط ۱۱۸۴)، `askQuestion` (خط ۱۳۸۰)، `assistUnderwriting` (خط ۷۲۸)، `triageComplaint` (خط ۸۰۵)، `discoverRecovery` (خط ۸۸۰)، `assistPricing` (خط ۹۵۵)، `assistSelfService` (خط ۱۰۲۹)، `ecosystemConsult` (خط ۱۷۲۲)، `chat` (خط ۱۹۵۵). `audit.logger.ts` نیز `auditLogger.info` در کنترلر برای هر درخواست فراخوانی می‌شود. اما این audit trail **محلی** است (در DB copilot-service) و به audit-service مرکزی ارسال نمی‌شود.
- **وضعیت**: ✅ تأیید شد — audit trail محلی از طریق `CopilotAudit` entity وجود دارد، اما یکپارچه‌سازی با audit-service مرکزی وجود ندارد.

---

## ۱۰. نقص‌های جدید (کشف شده در بررسی عمیق کد)

### ۱۰.۱ مقادیر hardcoded در response اندپوینت‌های AI assist
- **اندپوینت**: `POST /copilot/underwriting/assist`، `POST /copilot/complaints/triage`، `POST /copilot/recovery/discover`، `POST /copilot/pricing/assist`
- **اشکال**: این اندپوینت‌ها AI را فراخوانی می‌کنند اما response‌های hardcoded برمی‌گردانند که مستقل از پاسخ AI است. پاسخ AI در audit log ذخیره می‌شود اما به کاربر برگردانده نمی‌شود. این یعنی کاربر همیشه مقادیر یکسان دریافت می‌کند.
- **کد**: 
  - `assistUnderwriting` (خط ۷۴۴): `confidence: 0.85`، `riskLevel: 'medium'`، `suggestedActions` hardcoded — `response.text` در audit log (خط ۷۳۵) ذخیره می‌شود اما در return استفاده نمی‌شود.
  - `triageComplaint` (خط ۸۲۱): `category: 'فنی'`، `priority: 'medium'` hardcoded.
  - `discoverRecovery` (خط ۸۹۶): `recoveryOpportunities`، `estimatedRecoveryAmount: lossAmount * 0.15` hardcoded.
  - `assistPricing` (خط ۹۷۱): `suggestedPremium: coverageAmount * 0.03` hardcoded.
- **وضعیت**: ✅ تأیید شد — نقص بحرانی: پاسخ AI نادیده گرفته می‌شود و مقادیر hardcoded برگردانده می‌شود.

### ۱۰.۲ عدم PII redaction روی output در اندپوینت‌های assist
- **اندپوینت**: `POST /copilot/underwriting/assist`، `POST /copilot/complaints/triage`، `POST /copilot/recovery/discover`، `POST /copilot/pricing/assist`، `POST /copilot/selfservice/assist`
- **اشکال**: متد `redactSensitive` فقط در `getClaimSummary`، `askQuestion`، `ecosystemConsult` و `chat` روی output اعمال می‌شود. در اندپوینت‌های assist، خروجی AI بدون redaction برگردانده می‌شود که می‌تواند شامل PII باشد.
- **کد**: `services/copilot.service.ts` — `assistUnderwriting` (خط ۷۴۴) `response.text` را استفاده نمی‌کند (hardcoded values). اما `assistSelfService` (خط ۱۰۴۶) `response: response.text` را مستقیماً بدون `redactSensitive` برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد

### ۱۰.۳ `latencyMs: 0` hardcoded در audit logs
- **اندپوینت**: تمام اندپوینت‌های assist
- **اشکال**: در audit log entries، `latencyMs: 0` hardcoded است و زمان واقعی اجرای AI ثبت نمی‌شود.
- **کد**: `services/copilot.service.ts` — `assistUnderwriting` (خط ۷۳۹): `latencyMs: 0`، `triageComplaint` (خط ۸۱۶): `latencyMs: 0`، `discoverRecovery` (خط ۸۹۱): `latencyMs: 0`، `assistPricing` (خط ۹۶۶): `latencyMs: 0`، `assistSelfService` (خط ۱۰۴۰): `latencyMs: 0`. هیچ `Date.now()` قبل و بعد از LLM call برای محاسبه latency وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱۰.۴ ModelRouter daily spend در حافظه — از دست رفتن در restart
- **اندپوینت**: تمام اندپوینت‌های AI
- **اشکال**: `ModelRouter` daily spend را در `Map` در حافظه نگهداری می‌کند. در صورت restart سرویس، spend counter صفر می‌شود که می‌تواند باعث تجاوز از budget روزانه شود.
- **کد**: `model-router.ts` (خط ۷۹): `private dailySpend: Map<string, number> = new Map()`. `resetDailyIfNeeded` (خط ۱۷۴) فقط در تغییر روز reset می‌کند، نه در restart.
- **وضعیت**: ✅ تأیید شد

### ۱۰.۵ عدم validation contextType در NBA generation
- **اندپوینت**: `POST /copilot/nba/:contextType/:resourceId/actions`
- **اشکال**: controller بررسی می‌کند که `contextType` در `['claim', 'policy', 'complaint']` باشد، اما `NbaContext` در service از `'claim' | 'policy' | 'complaint' | 'customer'` استفاده می‌کند. `customer` در controller مجاز نیست.
- **کد**: `controllers/copilot.controller.ts:generateNbaActions` (خط ۱۲۰۸): `if (!['claim', 'policy', 'complaint'].includes(contextType))`. `nba/nba.service.ts:NbaContext` (خط ۲۵): `contextType: 'claim' | 'policy' | 'complaint' | 'customer'`. پس `customer` در NBA service پشتیبانی می‌شود اما از طریق controller قابل دسترسی نیست.
- **وضعیت**: ✅ تأیید شد
