# Rule Engine Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: rule-engine-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/rule-engine-service/src/`

---

## ۱. Rule Management

### ۱.۱ نبود rule versioning واقعی
- **اندپوینت**: `POST /rule-engine/rules`، `PUT /rule-engine/rules/:id`
- **اشکال**: در request body `POST`، فیلد `version` وجود دارد (default: 1) و در response نیز `version` برگردانده می‌شود. اما `PUT /rule-engine/rules/:id` (update) هیچ اشاره‌ای به increment version نمی‌کند. مشخص نیست آیا update باعث increment version می‌شود یا version باید دستی ارسال شود. در یک سیستم enterprise، rule versioning باید خودکار و immutable باشد: هر update یک نسخه جدید ایجاد کند و نسخه قبلی قابل query و rollback باشد. هیچ endpoint ای برای `GET /rule-engine/rules/:id/versions` یا `POST /rule-engine/rules/:id/rollback/:version` وجود ندارد.
- **کد**: `rule-engine.service.ts:createRule()` (خطوط ۳۸-۵۰) — اگر `version` ارائه نشود، به‌صورت خودکار `(lastRule?.version || 0) + 1` محاسبه می‌شود (بر اساس آخرین rule با همان `tenantId + ruleSetKey + name`). اما `updateRule()` (خطوط ۶۵۶-۶۸۶) — هیچ اشاره‌ای به `version` نمی‌کند؛ `patch` شامل `name`, `description`, `condition`, `action`, `priority`, `status`, `metadata`, `tags` است ولی `version` نه در patch پذیرفته می‌شود و نه increment می‌شود. `entities/Rule.ts` (خط ۶۸): `@Column({ type: 'integer', default: 1 }) version!: number;` — فیلد version وجود دارد اما در update تغییر نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ نبود audit trail برای تغییرات rule
- **اندپوینت**: `POST /rule-engine/rules`، `PUT /rule-engine/rules/:id`، `DELETE /rule-engine/rules/:id`، `PUT /rule-engine/rules/:id/activate`، `PUT /rule-engine/rules/:id/deactivate`
- **اشکال**: هیچ فیلد `createdBy`، `updatedBy`، `activatedBy` یا `deletedBy` در request یا response وجود ندارد. در response فقط `createdAt` و `updatedAt` دیده می‌شود. در یک سیستم با compliance requirements، هر تغییر rule (مخصوصاً rule‌های pricing و fraud) باید با شناسه کاربر، timestamp و مقدار قبلی/جدید ثبت شود. هیچ endpoint ای برای مشاهده audit history یک rule وجود ندارد.
- **کد**: `entities/Rule.ts` (خطوط ۷۶-۸۶) — فیلدهای `activatedAt` و `deactivatedAt` (timestamp) وجود دارند اما هیچ فیلد `createdBy`، `updatedBy`، `activatedBy` یا `deletedBy` در entity نیست. `rule-engine.controller.ts` — در هیچ متد controller‌ای، `req.user.sub` یا `req.user.userId` به service پاس نمی‌شود. مثلاً `createRule()` (خط ۴۷): `this.service.createRule({ ...body, tenantId })` — فقط `tenantId` اضافه می‌شود، نه `userId`.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ استفاده از DELETE برای hard delete به جای soft delete
- **اندپوینت**: `DELETE /rule-engine/rules/:id`
- **اشکال**: این endpoint rule را حذف می‌کند و فقط `success: true` برمی‌گرداند. مشخص نیست آیا این hard delete است یا soft delete. در یک سیستم enterprise، rule‌های pricing و compliance نباید hard delete شوند بلکه باید `archived` شوند. status `archived` در enum وجود دارد اما DELETE endpoint مستقیماً حذف می‌کند نه archive. باید `POST /rule-engine/rules/:id/archive` وجود داشته باشد و DELETE فقط برای rule‌های draft مجاز باشد.
- **کد**: `rule-engine.service.ts:deleteRule()` (خطوط ۶۸۸-۶۹۳): `const result = await manager.delete(Rule, { id, tenantId });` — این یک **hard delete** است (TypeORM `delete` رکورد را فیزیکی حذف می‌کند). **اصلاح مهم**: برخلاف ادعای تحلیل اولیه، status `archived` در enum وجود ندارد! `entities/Rule.ts` (خطوط ۳-۷): `RuleStatus` فقط شامل `DRAFT`, `ACTIVE`, `INACTIVE` است. کاتالوگ اندپوینت نیز به‌اشتباه `archived` را در status‌ها ذکر کرده است. هیچ مکانیزم soft delete یا archive‌ای پیاده‌سازی نشده است.
- **وضعیت**: ✅ تأیید شد (با اصلاح: `archived` در enum وجود ندارد)

### ۱.۴ نبود rule set management مستقل
- **اندپوینت**: `POST /rule-engine/rules`، `GET /rule-engine/rules`
- **اشکال**: rule‌ها بر اساس `ruleSetKey` گروه‌بندی می‌شوند اما هیچ endpoint مستقلی برای مدیریت rule set وجود ندارد. نمی‌توان یک rule set ایجاد، ویرایش یا حذف کرد. rule set فقط به‌صورت implicit با ایجاد rule با `ruleSetKey` جدید ایجاد می‌شود. این باعث می‌شود metadata rule set (مثل description، evaluation mode، default priority) قابل تعریف نباشد.
- **کد**: `rule-engine.controller.ts` — هیچ endpoint‌ای برای rule set management وجود ندارد. `entities/` — هیچ `RuleSet` entity‌ای تعریف نشده است. `ruleSetKey` فقط یک `@Column({ type: 'varchar', length: 50 })` در `Rule` entity (خط ۳۰) است. در `listRules()` (service خط ۶۲۹-۶۳۰) فقط بر اساس `ruleSetKey` فیلتر می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ نبود bulk import/export برای rule‌ها
- **اندپوینت**: `POST /rule-engine/rules`، `GET /rule-engine/rules`
- **اشکال**: rule‌ها فقط به‌صورت تکی ایجاد و دریافت می‌شوند. هیچ endpoint ای برای bulk import (مثل `POST /rule-engine/rules/bulk` با لیستی از rule‌ها) یا export (مثل `GET /rule-engine/rules/export` با فرمت JSON/CSV) وجود ندارد. در migration یا backup، این قابلیت حیاتی است.
- **کد**: `rule-engine.controller.ts` — هیچ `@Post('rules/bulk')` یا `@Get('rules/export')` وجود ندارد. `permissions.ts` (خط ۱۵): permission `rule_engine:export` تعریف شده و به role‌ها `insurer_admin`، `head_office_ops`، `rule_engine_ops` اختصاص داده شده، اما **هیچ endpoint‌ای از این permission استفاده نمی‌کند** — این یک permission تعریف‌شده اما استفاده‌نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Rule Evaluation و Execution

### ۲.۱ نبود hot reload برای rule‌های active
- **اندپوینت**: `PUT /rule-engine/rules/:id/activate`
- **اشکال**: وقتی یک rule activate می‌شود، مشخص نیست آیا تغییرات بلافاصله در evaluation اعمال می‌شوند یا نیاز به reload دارد. در یک سیستم با volume بالا، rule evaluation باید از cache استفاده کند و activate شدن rule باید cache را invalidate کند. هیچ endpoint ای برای `POST /rule-engine/reload` یا `POST /rule-engine/rules/:id/invalidate-cache` وجود ندارد.
- **کد**: `rule-engine.service.ts:evaluateRules()` (خطوط ۱۸۲-۱۸۹): `const rules = await this.ruleRepo.find({ where: { tenantId, ruleSetKey, status: RuleStatus.ACTIVE }, order: { priority: 'DESC' } })` — در هر فراخوانی evaluate، rule‌ها مستقیماً از database خوانده می‌شوند. **هیچ caching layer‌ای وجود ندارد**. این یعنی تغییرات (از جمله activate) بلافاصله در evaluation بعدی اعمال می‌شوند — اما به قیمت query دیتابیس در هر evaluation. در سیستم با volume بالا، این یک bottleneck عملکردی است. `activateRule()` (خطوط ۹۰-۱۱۴) فقط `status` را به `ACTIVE` تغییر می‌دهد و outbox event منتشر می‌کند، اما هیچ cache invalidation لازم نیست چون cache‌ای وجود ندارد.
- **وضعیت**: ✅ تأیید شد (با توضیح: چون cache‌ای وجود ندارد، تغییرات بلافاصله اعمال می‌شوند، اما نبود cache خود یک مشکل عملکردی است)

### ۲.۲ نبود conflict resolution در evaluation
- **اندپوینت**: `POST /rule-engine/evaluate`
- **اشکال**: در evaluation flow، rule‌ها بر اساس priority (descending) مرتب و ارزیابی می‌شوند. اما اگر دو rule با priority یکسان در یک ruleSet همزمان match شوند، چه اتفاقی می‌افتد؟ هیچ مکانیزم conflict resolution (مثل "first match wins"، "all matches execute"، "highest specificity wins") تعریف نشده است. در response، `matchedRules` یک آرایه است که نشان می‌دهد چند rule می‌توانند match شوند اما رفتار execution (sequential، parallel، یا stop on first match) مشخص نیست.
- **کد**: `rule-engine.service.ts:evaluateRules()` (خطوط ۱۹۸-۲۳۷): rule‌ها با `order: { priority: 'DESC' }` (خط ۱۸۸) مرتب می‌شوند — **بدون secondary sort**. اگر دو rule priority یکسان داشته باشند، ترتیب ارزیابی non-deterministic است. با این حال، کد **type-based conflict resolution** دارد (خطوط ۲۲۲-۲۲۹): rule‌های نوع `CONDITION` و `VALIDATION` پس از اولین match متوقف می‌شوند (`break`)؛ rule‌های `CALCULATION` زنجیره‌ای ادامه می‌یابند مگر اینکه `action.stopAfterFirstMatch === true` باشد. اما این رفتار در endpoint catalog یا API response مستند نشده است.
- **وضعیت**: ✅ تأیید شد (با اصلاح: type-based stop logic وجود دارد، اما ترتیب same-priority rules non-deterministic است و رفتار مستند نشده)

### ۲.۳ نبود timeout و resource limit در evaluation
- **اندپوینت**: `POST /rule-engine/evaluate`
- **اشکال**: هیچ فیلدی برای `timeout` یا `maxRulesToEvaluate` در request body وجود ندارد. اگر یک ruleSet شامل هزاران rule باشد و condition هر rule پیچیده باشد، evaluation می‌تواند بسیار طول بکشد. باید timeout پیش‌فرض (مثلاً ۵ ثانیه) و limit تعداد rule‌های ارزیابی شده وجود داشته باشد.
- **کد**: `rule-engine.controller.ts:evaluateRules()` (خطوط ۱۵۶-۱۷۷) — body type شامل `ruleSetKey`, `businessKey`, `input`, `metadata`, `dryRun` است. هیچ `timeout` یا `maxRulesToEvaluate` وجود ندارد. `rule-engine.service.ts:evaluateRules()` (خطوط ۱۸۰-۲۳۷) — هیچ timeout mechanism یا limit روی تعداد rule‌های ارزیابی‌شده وجود ندارد. حلقه `for (const rule of rules)` (خط ۱۹۸) تمام rule‌های ACTIVE در ruleSet را ارزیابی می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ نبود async evaluation برای ruleSet‌های بزرگ
- **اندپوینت**: `POST /rule-engine/evaluate`
- **اشکال**: evaluation به‌صورت sync انجام می‌شود. برای ruleSet‌های بزرگ با هزاران rule، این می‌تواند timeout ایجاد کند. باید یک `POST /rule-engine/evaluate/async` وجود داشته باشد که یک jobId برگرداند و نتیجه از طریق `GET /rule-engine/evaluate/jobs/:jobId` قابل دریافت باشد.
- **کد**: `rule-engine.controller.ts` — هیچ async evaluation endpoint‌ای وجود ندارد. `evaluateRules()` در service به‌صورت sync اجرا می‌شود و کل execution در یک transaction (خط ۲۴۱) ذخیره می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۵ نبود evaluation context enrichment
- **اندپوینت**: `POST /rule-engine/evaluate`
- **اشکال**: در request body، `input` یک object آزاد است. هیچ مکانیزمی برای enrichment خودکار input (مثل fetch کردن customer data از customer-360-service یا policy data از policy-service بر اساس businessKey) وجود ندارد. rule condition باید تمام داده‌های مورد نیاز را در `input` داشته باشد که این باعث وابستگی شدید caller به دانستن ساختار داده rule می‌شود.
- **کد**: `rule-engine.controller.ts:evaluateRules()` (خطوط ۱۶۱-۱۶۷) — body type: `input: Record<string, any>` — یک object آزاد. `rule-engine.service.ts:evaluateRules()` (خط ۱۹۱): `const output = this.deepClone(params.input)` — input مستقیماً استفاده می‌شود. هیچ enrichment یا data fetching از سرویس‌های دیگر وجود ندارد. `businessKey` (خط ۱۷۵) فقط در execution record ذخیره می‌شود، برای fetch داده استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Execution Tracking

### ۳.۱ نبود real-time execution stream
- **اندپوینت**: `GET /rule-engine/executions`
- **اشکال**: execution‌ها فقط به‌صورت list قابل دریافت هستند. هیچ endpoint ای برای streaming real-time execution (مثل WebSocket یا SSE) وجود ندارد. در debug و monitoring، اپراتور باید بتواند execution‌ها را به‌صورت real-time ببیند.
- **کد**: `rule-engine.controller.ts` — هیچ WebSocket یا SSE endpoint‌ای وجود ندارد. `main.ts` — هیچ WebSocket gateway یا adapter‌ای پیکربندی نشده است. فقط FastifyAdapter برای HTTP استفاده می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ نبود filter بر اساس matched rule
- **اندپوینت**: `GET /rule-engine/executions`
- **اشکال**: query param‌ها شامل `ruleSetKey`، `businessKey` و `status` هستند اما هیچ فیلتری برای `ruleId` یا `ruleName` وجود ندارد. اپراتور نمی‌تواند ببیند کدام execution‌ها یک rule خاص را match کرده‌اند. این برای تحلیل impact یک rule حیاتی است.
- **کد**: `rule-engine.controller.ts:listExecutions()` (خطوط ۲۲۰-۲۴۱) — query params: `ruleSetKey`, `businessKey`, `status`, `limit`, `offset`. `rule-engine.service.ts:listExecutions()` (خطوط ۶۹۵-۷۲۳) — فیلترهای `tenantId`, `ruleSetKey`, `businessKey`, `status` پیاده‌سازی شده‌اند. هیچ فیلتر `ruleId` یا `ruleName` وجود ندارد. `matchedRules` در `RuleExecution` entity (خطوط ۳۵-۴۰) یک JSONB array است، اما هیچ query برای فیلتر بر اساس محتوای آن وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ نبود retention policy برای execution data
- **اندپوینت**: `GET /rule-engine/executions`، `GET /rule-engine/executions/:id`
- **اشکال**: هیچ endpoint یا پیکربندی برای retention policy execution data وجود ندارد. execution data شامل `input` (که می‌تواند شامل PII باشد) و `matchedRules` است. این داده‌ها باید بر اساس compliance policy پس از مدتی حذف یا آرشیو شوند.
- **کد**: `entities/RuleExecution.ts` (خطوط ۲۵-۲۶): `@Column({ type: 'jsonb' }) input!: Record<string, any>` — input شامل داده‌های ارزیابی است که می‌تواند PII داشته باشد. هیچ `@DeleteDateColumn` یا soft delete mechanism وجود ندارد. هیچ cron job یا cleanup worker در `main.ts` یا `app.module.ts` برای retention تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ نبود execution replay
- **اندپوینت**: `GET /rule-engine/executions/:id`
- **اشکال**: execution detail شامل `input` و `matchedRules` است اما هیچ endpoint ای برای replay کردن یک execution (با همان input اما rule‌های فعلی) وجود ندارد. این برای مقایسه رفتار rule قبل و بعد از تغییر حیاتی است.
- **کد**: `rule-engine.controller.ts` — هیچ `@Post('executions/:id/replay')` endpoint‌ای وجود ندارد. `getExecution()` (خطوط ۲۴۳-۲۵۸) فقط execution را برمی‌گرداند. `evaluateRules()` در service می‌تواند با همان input فراخوانی شود، اما این باید به‌صورت manual توسط caller انجام شود.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Template Management

### ۴.۱ نبود template versioning
- **اندپوینت**: `POST /rule-engine/templates`، `GET /rule-engine/templates`
- **اشکال**: template فقط create و list می‌شود. هیچ endpoint برای update یا delete template وجود ندارد. اگر یک template نیاز به تغییر داشته باشد، باید template جدید ایجاد شود. این باعث می‌شود template‌های قدیمی بدون حذف باقی بمانند و ردیابی اینکه کدام rule از کدام نسخه template ایجاد شده غیرممکن باشد.
- **کد**: `rule-engine.controller.ts` — فقط `@Post('templates')` (خط ۲۸۰) و `@Get('templates')` (خط ۳۰۴) وجود دارند. هیچ `@Put('templates/:id')` یا `@Delete('templates/:id')` تعریف نشده است. `entities/RuleTemplate.ts` (خطوط ۴۳-۴۷): `@CreateDateColumn` و `@UpdateDateColumn` وجود دارد اما هیچ فیلد `version` در entity نیست. `rule-engine.service.ts:createTemplate()` (خطوط ۷۹۰-۸۰۹) و `listTemplates()` (خطوط ۸۱۱-۸۳۱) — هیچ `updateTemplate` یا `deleteTemplate` متودی وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ نبود template validation قبل از create rule
- **اندپوینت**: `POST /rule-engine/templates/:templateId/rules`
- **اشکال**: در این endpoint، `variableValues` ارسال می‌شود و rule از template ایجاد می‌شود. اما هیچ validation ای بررسی نمی‌کند که آیا تمام متغیرهای template در `variableValues` ارائه شده‌اند یا خیر. اگر متغیری از قلم بیفتد، rule با condition ناقص ایجاد می‌شود که در evaluation خطا تولید می‌کند.
- **کد**: `rule-engine.service.ts:createRuleFromTemplate()` (خطوط ۸۳۳-۸۸۴): `for (const [key, value] of Object.entries(params.variableValues)) { conditionExpression = conditionExpression.replace(new RegExp(\`\\{${key}\\}\`, 'g'), String(value)); }` (خطوط ۸۴۹-۸۵۱) — فقط متغیرهای ارائه‌شده در `variableValues` جایگزین می‌شوند. اگر متغیری از `template.variables` در `variableValues` نباشد، placeholder `{varName}` در condition expression باقی می‌ماند و در evaluation باعث خطا یا false شدن condition می‌شود. هیچ validation مانند `const missing = template.variables.filter(v => !(v in params.variableValues))` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ نبود template category management
- **اندپوینت**: `POST /rule-engine/templates`، `GET /rule-engine/templates`
- **اشکال**: template‌ها بر اساس `category` گروه‌بندی می‌شوند اما هیچ endpoint مستقلی برای مدیریت category وجود ندارد. category فقط یک رشته آزاد است و نمی‌توان category metadata (مثل description، allowed rule types) تعریف کرد.
- **کد**: `entities/RuleTemplate.ts` (خط ۱۶): `@Column({ type: 'varchar', length: 50 }) category!: string` — یک رشته آزاد. `rule-engine.controller.ts:listTemplates()` (خط ۳۱۴): `category: query.category` — فقط فیلتر بر اساس category. هیچ endpoint برای CRUD category وجود ندارد. هیچ `RuleTemplateCategory` entity‌ای تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

---

## ۵. امنیت و حاکمیت

### ۵.۱ نبود SoD بین create و activate
- **اندپوینت**: `POST /rule-engine/rules` (`rule_engine:rules:create`)، `PUT /rule-engine/rules/:id/activate` (`rule_engine:rules:activate`)
- **اشکال**: اگر یک کاربر هم `create` و هم `activate` permission داشته باشد، می‌تواند یک rule ایجاد و بلافاصله فعال کند. در یک سیستم با SoD، ایجاد rule و فعال‌سازی آن باید توسط افراد مختلف انجام شود تا از فعال‌سازی rule‌های تاییدنشده جلوگیری شود. هیچ approval workflow‌ای بین create و activate وجود ندارد.
- **کد**: `permissions.ts` (خطوط ۱۷-۵۹): role `rule_engine_ops` (خطوط ۴۴-۵۸) هم `rule_engine:rules:create` و هم `rule_engine:rules:activate` را دارد. role `insurer_admin` (خطوط ۱۸-۳۳) نیز هر دو permission را دارد. هیچ approval workflow یا state machine‌ای بین `DRAFT` و `ACTIVE` وجود ندارد — `activateRule()` (service خطوط ۹۰-۱۱۴) مستقیماً `status` را به `ACTIVE` تغییر می‌دهد بدون هیچ approval یا review step.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ نبود AbacGuard برای data isolation
- **اندپوینت**: تمام اندپوینت‌های `/rule-engine/*`
- **اشکال**: برخلاف بسیاری از سرویس‌های دیگر که `AbacGuard` دارند، rule-engine-service فقط از `JwtAuthGuard`، `PermissionsGuard` و `TenantGuard` استفاده می‌کند. این یعنی هیچ attribute-based isolation ای وجود ندارد. در یک سیستم multi-tenant، rule‌های pricing یا fraud حساس هستند و باید فقط توسط کاربران با attribute‌های مشخص (مثل `department: actuarial`) قابل مدیریت باشند.
- **کد**: `rule-engine.controller.ts` (خط ۱۱): `@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)` — سه guard اعمال می‌شود. هیچ `AbacGuard` import یا استفاده نمی‌شود. `tenant.guard.ts` (خط ۱): `export { TenantGuard } from '@insurance/shared'` — فقط TenantGuard از shared library. فایل `abac.guard.ts` در این سرویس وجود ندارد (برخلاف notification-service که فایل وجود دارد ولی استفاده نمی‌شود).
- **وضعیت**: ✅ تأیید شد

### ۵.۳ نبود rate limiting در evaluation endpoint
- **اندپوینت**: `POST /rule-engine/evaluate`
- **اشکال**: این endpoint احتمالاً توسط سرویس‌های دیگر به‌صورت مکرر فراخوانی می‌شود. هیچ rate limiting ای تعریف نشده است. یک سرویس با bug می‌تواند هزاران evaluation در ثانیه ارسال کند و rule-engine-service را از کار بیندازد.
- **کد**: `rule-engine.controller.ts` (خط ۱۵۶): `@Post('evaluate')` — هیچ rate limiting middleware یا guard‌ای اعمال نشده است. `main.ts` — هیچ rate-limit plugin برای Fastify پیکربندی نشده است. `app.module.ts` — هیچ throttle provider یا rate-limit interceptor وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ نبود expression injection protection
- **اندپوینت**: `POST /rule-engine/rules`، `PUT /rule-engine/rules/:id`
- **اشکال**: در request body، `condition.expression` یک رشته آزاد است که در evaluation اجرا می‌شود. اگر expression engine از eval یا مشابه آن استفاده کند، یک کاربر مخرب می‌تواند expression تزریق کند که کد دلخواه اجرا کند (مثل `require('child_process').exec('rm -rf /')`). باید sandbox و whitelist عملیات مجاز در expression تعریف شود.
- **کد**: `rule-engine.service.ts:evaluateCondition()` (خطوط ۲۹۲-۳۰۵) — از یک **custom parser** استفاده می‌کند، نه `eval()` یا `Function()`. `evaluateExpression()` (خطوط ۳۰۷-۳۳۳) به‌صورت بازگشتی `!`، `||`، `&&`، parentheses و simple conditions را parse می‌کند. `evaluateSimpleCondition()` (خطوط ۳۸۸-۴۱۹) با regex `(\w+(?:\.\w+)*)\s*(==|!=|>|<|>=|<=|in|contains|startsWith|endsWith|matches)\s*(.+)` کار می‌کند و فقط comparison operators را پشتیبانی می‌کند. `evaluateFunction()` (خطوط ۴۲۱-۴۴۱) فقط توابع whitelist شده (`contains`, `startsWith`, `endsWith`, `matches`, `in`, `between`, `isEmpty`, `isNotEmpty`) را پشتیبانی می‌کند. `safeRegexTest()` (خطوط ۵۹۹-۶۱۵) شامل ReDoS protection است: max pattern length 200، rejection of dangerous patterns. **نتیجه**: تزریق کد دلخواه از طریق `eval` یا `require` ممکن نیست. اما custom parser ممکن است در edge cases (مثل nested parentheses با string concatenation در خط ۳۵۷: `before + innerResult + after`) رفتار غیرمنتظره داشته باشد.
- **وضعیت**: ❌ رد شد — expression engine از `eval()` یا `Function()` استفاده نمی‌کند. یک custom parser با whitelist operators و functions پیاده‌سازی شده است. تزریق کد دلخواه (مثل `require('child_process')`) ممکن نیست. با این حال، edge cases در parentheses parsing (خط ۳۵۷) ممکن است رفتار غیرمنتظره ایجاد کند که نیازمند hardening است.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم یکپارچه‌سازی با product-service برای pricing rules
- **اشکال**: rule-engine-service rule type `pricing` را پشتیبانی می‌کند اما مشخص نیست چگونه با product-service یکپارچه شده است. product-service طبق `CAPABILITY_REGISTRY.md` قابلیت `PRD-03 Pricing Rules Engine` را دارد. این تضاد نشان می‌دهد یا دو rule engine موازی وجود دارد یا product-service از rule-engine-service استفاده می‌کند. عدم شفافیت در این یکپارچه‌سازی باعث duplication و inconsistency می‌شود.
- **کد**: `entities/Rule.ts` (خطوط ۹-۱۳): `RuleType` enum فقط شامل `CONDITION = 'condition'`, `CALCULATION = 'calculation'`, `VALIDATION = 'validation'` است. **هیچ `PRICING` یا `BUSINESS` یا `ROUTING` یا `FRAUD` یا `COMPLIANCE` در enum وجود ندارد!** کاتالوگ اندپوینت (خط ۳۴) به‌اشتباه `type: "business|validation|routing|pricing|fraud|compliance"` را مستند کرده است. این یک **عدم تطابق критیک بین کاتالوگ و کد** است. در نتیجه، ادعای تحلیل درباره یکپارچه‌سازی pricing rules مبنای اشتباه دارد — چون type `pricing` اصلاً در کد تعریف نشده است.
- **وضعیت**: ✅ تأیید شد (با اصلاح مهم: `pricing` در RuleType enum وجود ندارد؛ کاتالوگ اندپوینت مستندات اشتباه دارد)

### ۶.۲ عدم یکپارچه‌سازی با fraud-service برای fraud rules
- **اشکال**: rule type `fraud` پشتیبانی می‌شود اما fraud-service مستقل نیز وجود دارد. مشخص نیست fraud-service از rule-engine-service استفاده می‌کند یا rule engine خود را دارد. این ambiguity باعث می‌شود rule‌های fraud در دو جا تعریف شوند و inconsistency ایجاد شود.
- **کد**: همانند ۶.۱ — `RuleType` enum فقط `CONDITION`, `CALCULATION`, `VALIDATION` را شامل می‌شود. `fraud` در enum وجود ندارد. این ادعای تحلیل نیز مبنای اشتباه دارد.
- **وضعیت**: ✅ تأیید شد (با اصلاح: `fraud` در RuleType enum وجود ندارد)

### ۶.۳ عدم یکپارچه‌سازی با monitoring-service برای execution metrics
- **اشکال**: rule-engine-service execution metrics دارد (`GET /rule-engine/executions/metrics`) اما این metric‌ها به monitoring-service ارسال نمی‌شوند. monitoring-service باید metric‌هایی مانند `rule_engine_evaluation_duration_seconds` و `rule_engine_evaluation_failures_total` را برای alerting و dashboard دریافت کند.
- **کد**: `rule-engine.service.ts:getExecutionMetrics()` (خطوط ۷۲۹-۷۸۸) — metric‌ها (`totalExecutions`, `successRate`, `avgExecutionTimeMs`, `mostMatchedRules`) را محاسبه و برمی‌گرداند. هیچ Kafka event یا Prometheus metric برای monitoring-service منتشر نمی‌شود. `evaluateRules()` (خطوط ۲۵۸-۲۷۵) outbox event `insurance.rule_engine.evaluated` منتشر می‌کند که شامل `executionTimeMs` و `status` است، اما این event برای monitoring dashboard‌ها طراحی نشده و به monitoring-service متصل نیست.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم یکپارچه‌سازی با notification-service برای rule failure alert
- **اشکال**: وقتی یک rule evaluation fail می‌شود (status: `failed`)، هیچ notification‌ای به اپراتور ارسال نمی‌شود. در rule‌های compliance و fraud، failure باید فوراً به اپراتور اطلاع داده شود. این یکپارچه‌سازی با notification-service غایب است.
- **کد**: `rule-engine.service.ts:evaluateRules()` (خطوط ۲۳۱-۲۳۶): در صورت خطا، `this.logger.error()` فراخوانی می‌شود و `error` در execution record ذخیره می‌شود. هیچ call به notification-service یا emit کردن event برای notification ارسال نمی‌شود. outbox event `insurance.rule_engine.evaluated` (خط ۲۵۹) شامل `status` است ولی هیچ consumer برای failure alert‌ها پیکربندی نشده است.
- **وضعیت**: ✅ تأیید شد

### ۶.۵ نبود endpoint برای rule dependency graph
- **اشکال**: rule‌ها در یک ruleSet با priority ارزیابی می‌شوند اما هیچ endpoint ای برای نمایش dependency graph بین rule‌ها وجود ندارد. در یک ruleSet پیچیده، فهمیدن اینکه کدام rule قبل از کدام ارزیابی می‌شود و تغییر یک rule چه impact روی rule‌های دیگر دارد، بدون visualization بسیار دشوار است.
- **کد**: `rule-engine.controller.ts` — هیچ endpoint‌ای برای dependency graph وجود ندارد. rule‌ها فقط `priority` (integer) دارند و هیچ `dependsOn` یا `prerequisiteRuleIds` فیلدی در `Rule` entity وجود ندارد. `evaluateRules()` (service خط ۱۸۸) فقط `order: { priority: 'DESC' }` استفاده می‌کند.
- **وضعیت**: ✅ تأیید شد

---

## ۷. نقایص جدید کشف‌شده در بررسی عمیق

### ۷.۱ عدم تطابق критیک RuleType enum با کاتالوگ اندپوینت
- **اندپوینت**: `POST /rule-engine/rules`، `PUT /rule-engine/rules/:id`، `GET /rule-engine/rules`، `POST /rule-engine/templates/:templateId/rules`
- **اشکال**: کاتالوگ اندپوینت `type` را به‌صورت `"business|validation|routing|pricing|fraud|compliance"` مستند کرده است، اما `RuleType` enum واقعی فقط شامل `CONDITION`, `CALCULATION`, `VALIDATION` است. این عدم تطابق باعث می‌شود کلاینت‌هایی که بر اساس کاتالوگ توسعه داده‌شده‌اند با خطای validation مواجه شوند.
- **کد**: `entities/Rule.ts` (خطوط ۹-۱۳): `export enum RuleType { CONDITION = 'condition', CALCULATION = 'calculation', VALIDATION = 'validation' }`. کاتالوگ `doc/endpoint_catalog/rule-engine-service.md` (خط ۳۴): `"type": "business|validation|routing|pricing|fraud|compliance"`.
- **وضعیت**: ✅ تأیید شد (نقص جدید — بحرانی)

### ۷.۲ عدم تطابق RuleStatus enum با کاتالوگ اندپوینت
- **اندپوینت**: `POST /rule-engine/rules`، `PUT /rule-engine/rules/:id`، `GET /rule-engine/rules`، `GET /rule-engine/rules/:id`
- **اشکال**: کاتالوگ اندپوینت `status` را به‌صورت `"draft|active|inactive|archived"` مستند کرده است، اما `RuleStatus` enum واقعی فقط شامل `DRAFT`, `ACTIVE`, `INACTIVE` است. `archived` وجود ندارد. علاوه بر این، `updateRule()` در body `status` را می‌پذیرد (controller خط ۱۰۱) که اجازه می‌دهد status مستقیماً از طریق update تغییر کند، که این از activate/deactivate endpoints عبور می‌کند.
- **کد**: `entities/Rule.ts` (خطوط ۳-۷): `export enum RuleStatus { DRAFT = 'draft', ACTIVE = 'active', INACTIVE = 'inactive' }`. کاتالوگ (خط ۶۸): `"status": "draft|active|inactive|archived"`. `rule-engine.controller.ts:updateRule()` (خط ۱۰۱): `status?: RuleStatus` در body type. `rule-engine.service.ts:updateRule()` (خط ۶۷۹): `if (patch.status) rule.status = patch.status` — مستقیماً status را set می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۳ عدم تطابق ExecutionStatus enum با کاتالوگ اندپوینت
- **اندپوینت**: `GET /rule-engine/executions`، `GET /rule-engine/executions/:id`
- **اشکال**: کاتالوگ اندپوینت execution status را به‌صورت `"success|partial_success|failed"` مستند کرده است، اما `ExecutionStatus` enum واقعی شامل `SUCCESS`, `FAILED`, `SKIPPED` است. `partial_success` وجود ندارد و `skipped` در کاتالوگ ذکر نشده است.
- **کد**: `entities/RuleExecution.ts` (خطوط ۳-۷): `export enum ExecutionStatus { SUCCESS = 'success', FAILED = 'failed', SKIPPED = 'skipped' }`. کاتالوگ (خط ۴۰۴): `"status" (optional, string: success|partial_success|failed)`. `rule-engine.service.ts:evaluateRules()` (خط ۱۹۴): `let status = ExecutionStatus.SUCCESS` — فقط SUCCESS یا FAILED تنظیم می‌شود (خط ۲۳۴)، SKIPPED هرگز استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۴ deleteRule و updateRule outbox event منتشر نمی‌کنند
- **اندپوینت**: `DELETE /rule-engine/rules/:id`، `PUT /rule-engine/rules/:id`
- **اشکال**: برخلاف `createRule`، `activateRule` و `deactivateRule` که همگی outbox event منتشر می‌کنند، `deleteRule` و `updateRule` هیچ outbox event‌ای منتشر نمی‌کنند. این یعنی downstream consumer‌ها (مثل caching layer یا audit service) از حذف یا تغییر rule‌ها مطلع نمی‌شوند.
- **کد**: `rule-engine.service.ts:deleteRule()` (خطوط ۶۸۸-۶۹۳): فقط `manager.delete(Rule, { id, tenantId })` — هیچ `OutboxPublisher` استفاده نمی‌شود. `updateRule()` (خطوط ۶۵۶-۶۸۶): فقط `manager.save(rule)` — هیچ outbox event‌ای منتشر نمی‌شود. در مقایسه، `createRule()` (خطوط ۶۸-۸۵) outbox event `insurance.rule_engine.rule.created` و `activateRule()` (خطوط ۹۷-۱۱۱) outbox event `insurance.rule_engine.rule.activated` منتشر می‌کنند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۵ createRuleFromTemplate outbox event منتشر نمی‌کند
- **اندپوینت**: `POST /rule-engine/templates/:templateId/rules`
- **اشکال**: وقتی یک rule از template ایجاد می‌شود، برخلاف `createRule` مستقیم، هیچ outbox event‌ای منتشر نمی‌شود. این یعنی downstream consumer‌ها از rule‌های ایجادشده از template مطلع نمی‌شوند.
- **کد**: `rule-engine.service.ts:createRuleFromTemplate()` (خطوط ۸۳۳-۸۸۴): rule ایجاد و `manager.save(rule)` می‌شود (خط ۸۸۲)، اما هیچ `OutboxPublisher` یا `outbox.publish()` فراخوانی نمی‌شود. در مقایسه، `createRule()` (خطوط ۶۸-۸۵) outbox event منتشر می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۶ نبود correlationId در response برخی endpoint‌ها
- **اندپوینت**: `GET /rule-engine/rules/:id`، `GET /rule-engine/executions/:id`، `GET /rule-engine/executions/metrics`
- **اشکال**: این سه endpoint برخلاف سایر endpoint‌ها، `correlationId` در response برنمی‌گردانند. این باعث عدم یکنواختی در API و مشکل در trace می‌شود.
- **کد**: `rule-engine.controller.ts:getRule()` (خطوط ۱۷۹-۱۹۴): response فقط `success` و `data` (یا `error`) — بدون `correlationId`. `getExecution()` (خطوط ۲۴۳-۲۵۸): همانند. `getExecutionMetrics()` (خطوط ۲۶۰-۲۷۸): همانند. در مقایسه، `createRule()` (خط ۵۱), `activateRule()` (خط ۶۷), `evaluateRules()` (خط ۱۷۵) همگی `correlationId` برمی‌گردانند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۷ فیلتر tags در listRules فقط از اولین tag استفاده می‌کند
- **اندپوینت**: `GET /rule-engine/rules?tags=tag1,tag2,tag3`
- **اشکال**: وقتی چند tag با کاما ارسال می‌شود، فقط اولین tag برای فیلتر استفاده می‌شود و بقیه نادیده گرفته می‌شوند. این یک bug است.
- **کد**: `rule-engine.controller.ts:listRules()` (خط ۲۰۹): `tags: query.tags ? query.tags.split(',') : undefined` — tags به‌صورت array پاس می‌شود. `rule-engine.service.ts:listRules()` (خط ۶۳۹): `qb.andWhere(':tag = ANY(r.tags)', { tag: params.tags[0] })` — فقط `params.tags[0]` استفاده می‌شود. باید به‌صورت `WHERE r.tags && ARRAY[...]` (overlap) پیاده‌سازی شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید — bug)

### ۷.۸ permission `rule_engine:export` تعریف شده اما هیچ endpoint‌ای از آن استفاده نمی‌کند
- **اندپوینت**: N/A
- **اشکال**: در `permissions.ts`، permission `rule_engine:export` تعریف شده و به سه role (`insurer_admin`, `head_office_ops`, `rule_engine_ops`) اختصاص داده شده است، اما هیچ endpoint‌ای با `@RequirePermissions('rule_engine:export')` وجود ندارد. این یک dead permission است.
- **کد**: `permissions.ts` (خط ۱۵): `'rule_engine:export'` در `PermissionKey`. (خطوط ۳۲, ۴۲, ۵۷): به role‌ها اختصاص داده شده. `rule-engine.controller.ts` — هیچ `@RequirePermissions('rule_engine:export')` وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۹ ارزیابی rule با ruleSetKey ناموجود به‌جای NOT_FOUND، SUCCESS با matchedRules خالی برمی‌گرداند
- **اندپوینت**: `POST /rule-engine/evaluate`
- **اشکال**: اگر یک `ruleSetKey` ناموجود ارسال شود، evaluation با status `SUCCESS` و `matchedRules: null` برمی‌گرداند. این می‌تواند گمراه‌کننده باشد — کلاینت ممکن است فکر کند evaluation موفق بوده در حالی که هیچ rule‌ای ارزیابی نشده است.
- **کد**: `rule-engine.service.ts:evaluateRules()` (خطوط ۱۸۲-۱۸۹): `this.ruleRepo.find({ where: { tenantId, ruleSetKey, status: RuleStatus.ACTIVE } })` — اگر ruleSetKey ناموجود باشد، `rules` آرایه خالی است. حلقه `for` (خط ۱۹۸) اجرا نمی‌شود. `status` در `SUCCESS` باقی می‌ماند (خط ۱۹۴). execution با `matchedRules: null` (خط ۲۴۹) ذخیره می‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۱۰ evaluateParentheses با string concatenation رفتار غیرمنتظره ممکن است ایجاد کند
- **اندپوینت**: `POST /rule-engine/evaluate`، `POST /rule-engine/rules` (در validation)
- **اشکال**: در `evaluateParentheses()`، وقتی قبل و after یک parenthesized expression وجود دارد، نتیجه boolean به string تبدیل و در expression جایگزین می‌شود (`before + innerResult + after`). این می‌تواند در edge cases (مثل `!(a == b) && c == d`) به parsing نادرست منجر شود.
- **کد**: `rule-engine.service.ts:evaluateParentheses()` (خطوط ۳۳۵-۳۶۳): خط ۳۵۷: `const newExpr = before + innerResult + after` — `innerResult` یک boolean است که به string ("true"/"false") تبدیل می‌شود و با before/after concat می‌شود. سپس `this.evaluateExpression(newExpr, context)` فراخوانی می‌شود. مثلاً `!(a == b) && c == d` پس از ارزیابی inner: `"!true && c == d"` که سپس re-evaluate می‌شود. این در این حالت کار می‌کند، اما در حالت `(a == b)c == d` (بدون operator قبل) ممکن است نتیجه نادرست باشد.
- **وضعیت**: ✅ تأیید شد (نقص جدید — edge case)

### ۷.۱۱ نبود validation برای ruleSetKey یا name در createRule
- **اندپوینت**: `POST /rule-engine/rules`
- **اشکال**: هیچ validation‌ای برای طول یا فرمت `ruleSetKey` یا `name` وجود ندارد. `ruleSetKey` محدود به `varchar(50)` است و `name` محدود به `varchar(100)`، اما هیچ application-level validation قبل از ذخیره انجام نمی‌شود. اگر رشته‌ای طولانی‌تر از limit ارسال شود، database error رخ می‌دهد به‌جای یک validation error تمیز.
- **کد**: `rule-engine.controller.ts:createRule()` (خطوط ۲۶-۵۳) — body type شامل `name: string` و `ruleSetKey: string` بدون هیچ validation annotation. `entities/Rule.ts` (خطوط ۲۶-۳۰): `@Column({ type: 'varchar', length: 100 }) name` و `@Column({ type: 'varchar', length: 50 }) ruleSetKey`. هیچ DTO یا class-validator استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۱۲ نبود tenant isolation در createRuleFromTemplate
- **اندپوینت**: `POST /rule-engine/templates/:templateId/rules`
- **اشکال**: `createRuleFromTemplate` در controller از `rule_engine:templates:create` permission استفاده می‌کند (نه `rule_engine:rules:create`). این یعنی یک کاربر با permission template create می‌تواند rule ایجاد کند بدون permission rule create. این یک privilege escalation است.
- **کد**: `rule-engine.controller.ts:createRuleFromTemplate()` (خط ۳۲۶): `@RequirePermissions('rule_engine:templates:create')` — این endpoint یک rule ایجاد می‌کند اما permission `rule_engine:rules:create` را require نمی‌کند. `permissions.ts` (خطوط ۴۴-۵۸): role `rule_engine_ops` هم `templates:create` و هم `rules:create` دارد، اما اگر در آینده role‌ای فقط `templates:create` داشته باشد، می‌تواند rule ایجاد کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید — امنیتی)
