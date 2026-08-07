# Fraud Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: fraud-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/fraud-service/src/`

---

## ۱. Fraud Score و Case Management

### ۱.۱ نبود AbacGuard برای data isolation
- **اندپوینت**: `POST /fraud/compute-score`، `GET /fraud/cases`
- **اشکال**: fraud-service از `JWT + PermissionsGuard + TenantGuard` استفاده می‌کند اما AbacGuard در کاتالوگ ذکر نشده است. این یعنی هیچ attribute-based access control برای data isolation وجود ندارد. یک کاربر با `fraud:cases:list` می‌تواند تمام fraud cases را ببیند بدون فیلتر بر اساس organization، branch یا assignment.
- **کد**: `fraud.controller.ts` line 10 — `@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)` (AbacGuard در list نیست). `app.module.ts` line 39 — `providers` شامل `AbacGuard` نیست. فایل `abac.guard.ts` وجود دارد اما استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم get fraud case by ID
- **اندپوینت**: `GET /fraud/cases`
- **اشکال**: لیست cases پشتیبانی می‌شود اما هیچ `GET /fraud/cases/:fraudCaseId` برای دریافت جزئیات یک case خاص وجود ندارد. برای دیدن جزئیات case، باید از list با فیلتر `claimId` استفاده کرد که ناکارآمد است و اگر چند case برای یک claim وجود داشته باشد، ابهام ایجاد می‌کند.
- **کد**: `fraud.controller.ts` — هیچ `@Get('/fraud/cases/:fraudCaseId')` وجود ندارد. `fraud.service.ts` — هیچ متد `getCaseById` جداگانه وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ ~~عدم link بین fraud case و claim hold~~
- ~~**اشکال**: response شامل `holdClaim: false` است اما مشخص نیست این hold چگونه به claims-service اعمال می‌شود. هیچ callback یا webhook endpoint برای sync وضعیت hold با claims-service وجود ندارد. اگر fraud-service claim را hold کند اما claims-service از این hold مطلع نشود، claim می‌تواند proceed شود.~~
- **کد**: `fraud.service.ts:openCase` (lines 181-203) — `OutboxPublisher` event `insurance.fraud.case_opened` را با `holdClaim: true` publish می‌کند. `fraud.service.ts:closeCase` (lines 274-297) — event `insurance.fraud.case_closed` با `holdClaim: false` publish می‌کند. `fraud.service.ts:escalateCase` (lines 230-253) — event `insurance.fraud.case.escalated` publish می‌کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event‌های `insurance.fraud.case_opened`، `insurance.fraud.case_closed` و `insurance.fraud.case.escalated` از طریق Outbox publish می‌شوند که claims-service می‌تواند برای sync وضعیت hold مصرف کند.

### ۱.۴ عدم case reassignment و transfer
- **اندپوینت**: `POST /fraud/cases/:fraudCaseId/escalate`
- **اشکال**: escalate case به `siu` یا `legal` ارجاع می‌دهد اما هیچ اندپوینتی برای reassign یا transfer case بین investigators وجود ندارد. در عمل، یک investigator ممکن است case را به investigator دیگری منتقل کند بدون escalate کردن.
- **کد**: `fraud.controller.ts` — هیچ `PATCH /fraud/cases/:fraudCaseId/assign` وجود ندارد. `fraud.service.ts:escalateCase` (lines 208-256) — فقط `status` را به `'investigating'` تغییر می‌دهد و `notes` را update می‌کند. `FraudCase` entity دارای `assignedTo` (line 46) است اما هیچ endpoint ای برای تغییر آن فراتر از `openCase` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ عدم case timeline و activity log
- **اندپوینت**: `GET /fraud/cases`
- **اشکال**: هیچ اندپوینتی برای دریافت timeline یا activity log یک case وجود ندارد. در fraud investigation، audit trail کامل (چه کسی case را باز کرد، چه زمانی escalate شد، چه notes اضافه شد) الزامی است.
- **کد**: `fraud.service.ts` — هیچ `FraudCaseActivity` entity وجود ندارد (entities فقط `FraudCase`، `FraudScoreAudit` و ...). `FraudScoreAudit` فقط score computation را ثبت می‌کند، نه case lifecycle changes را.
- **وضعیت**: ✅ تأیید شد

### ۱.۶ (جدید) escalateCase مقدار toUnit را در FraudCase ذخیره نمی‌کند
- **اندپوینت**: `POST /fraud/cases/:fraudCaseId/escalate`
- **اشکال**: `escalateCase` مقدار `toUnit` ('siu' یا 'legal') را در event payload publish می‌کند اما در `FraudCase` entity ذخیره نمی‌کند. `FraudCase` هیچ فیلد `toUnit` یا `escalatedTo` ندارد. نتیجه: پس از escalation، نمی‌توان از DB فهمید case به کدام واحد escalate شده است.
- **کد**: `fraud.service.ts:escalateCase` (lines 208-256) — `toUnit` فقط در `outbox.publish` payload (line 248) استفاده می‌شود. `FraudCase` entity (`entities/FraudCase.ts`) هیچ فیلد `toUnit` یا `escalatedTo` ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۱.۷ (جدید) closeCase هویت closer را ثبت نمی‌کند
- **اندپوینت**: `POST /fraud/cases/:fraudCaseId/close`
- **اشکال**: `closeCase` هیچ فیلد `closedBy` یا `resolvedBy` را در `FraudCase` ثبت نمی‌کند. controller `actor` (userId) را دارد اما به service پاس نمی‌دهد. در fraud investigation، ثبت اینکه چه کسی case را بسته است الزامی است.
- **کد**: `fraud.controller.ts:closeCase` (lines 139-180) — `actor` استخراج می‌شود اما به `fraudService.closeCase` پاس داده نمی‌شود. `fraud.service.ts:closeCase` (lines 258-300) — پارامتر `closedBy` وجود ندارد. `FraudCase` entity هیچ فیلد `closedBy` یا `resolvedBy` ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۲. False Positive/Negative Management

### ۲.۱ عدم structured disposition برای closed cases
- **اندپوینت**: `POST /fraud/cases/:fraudCaseId/close`
- **اشکال**: close فقط `resolution: "confirmed|cleared"` را می‌گیرد. هیچ فیلد structured برای ثبت `dispositionReason`، `falsePositiveCategory`، یا `recoveryAmount` وجود ندارد. بدون این داده‌ها، نمی‌توان false positive rate را تحلیل کرد یا ML model را بهینه‌سازی کرد.
- **کد**: `fraud.controller.ts:closeCase` (lines 139-180) — body فقط `resolution` و `notes` را می‌پذیرد. `fraud.service.ts:closeCase` (lines 258-300) — فقط `status` و `holdClaim` و `notes` را set می‌کند. `FraudCase` entity هیچ فیلد disposition structured ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم feedback loop به ML model
- **اندپوینت**: `POST /fraud/cases/:fraudCaseId/close`
- **اشکال**: وقتی case به‌عنوان `cleared` (false positive) بسته می‌شود، هیچ مکانیزمی برای feedback به ML model وجود ندارد. این داده باید به‌عنوان training data منفی برای بهبود دقت model استفاده شود اما هیچ endpoint برای ثبت این feedback تعریف نشده است.
- **کد**: `fraud.service.ts:closeCase` (lines 274-297) — event `insurance.fraud.case_closed` با `resolution` publish می‌شود، اما هیچ فراخوانی به ML training service یا ثبت feedback در model وجود ندارد. `FraudMLModel` entity هیچ فیلد feedback ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم threshold tuning endpoint
- **اندپوینت**: `POST /fraud/compute-score`
- **اشکال**: response شامل `score` و `threshold` است اما threshold در سمت server hardcoded است. هیچ اندپوینتی برای پیکربندی threshold بر اساس `lossType`، `productCode` یا بازه زمانی وجود ندارد. threshold باید قابل تنظیم باشد تا false positive rate مدیریت شود.
- **کد**: `fraud.service.ts:getFraudHoldThreshold` (lines 32-38) — `process.env.FRAUD_HOLD_THRESHOLD` با default 50. `getFraudRuleConfig` (lines 40-57) — rule scores از env vars خوانده می‌شوند. هیچ API endpoint ای برای تغییر runtime این مقادیر وجود ندارد.
- **وضعیت**: ✅ تأیید شد (threshold از env var قابل تنظیم است اما API endpoint وجود ندارد)

---

## ۳. ML Model Management

### ۳.۱ عدم model versioning و rollback
- **اندپوینت**: `POST /fraud/ml/models/:modelId/deploy`
- **اشکال**: deploy یک model را فعال می‌کند و `isDefault` را set می‌کند اما هیچ مکانیزم rollback به version قبلی وجود ندارد. اگر model جدید به false positive بالا منجر شود، باید بتوان به‌سرعت به version قبلی برگشت. هیچ `POST /fraud/ml/models/:modelId/rollback` وجود ندارد.
- **کد**: `fraud.service.ts:deployMLModel` (lines 515-541) — previous default model با `undeployQb` غیرفعال می‌شود (`isDefault: false`) اما هیچ reference ای به مدل قبلی ذخیره نمی‌شود. هیچ endpoint rollback وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم A/B testing برای models
- **اندپوینت**: `POST /fraud/ml/predict`
- **اشکال**: predict فقط از default model استفاده می‌کند. هیچ مکانیزمی برای A/B testing دو model به‌طور همزمان وجود ندارد. برای ارزیابی model جدید قبل از deploy کامل، باید بتوان درصدی از تراکنش‌ها را با model جدید predict کرد.
- **کد**: `fraud.service.ts:predictWithML` (lines 543-573) — query فقط `isDefault = true` و `status = DEPLOYED` را فیلتر می‌کند. هیچ پارامتر `modelId` برای انتخاب model خاص وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم model performance monitoring endpoint
- **اندپوینت**: `GET /fraud/ml/models`
- **اشکال**: list models فقط metadata را برمی‌گرداند. هیچ اندپوینتی برای دریافت performance metrics (precision، recall، F1، false positive rate) یک model وجود ندارد. بدون این metrics، نمی‌توان کیفیت model را ارزیابی کرد.
- **کد**: `fraud.service.ts:trainMLModel` (lines 323-409) — `trainingMetrics` و `validationMetrics` (accuracy، precision، recall، f1Score، auc) در `FraudMLModel` entity ذخیره می‌شوند. `listMLModels` این metrics را برمی‌گرداند. اما هیچ endpoint برای production performance monitoring (real-time false positive rate) وجود ندارد.
- **وضعیت**: ✅ تأیید شد (training/validation metrics ذخیره می‌شوند اما production monitoring وجود ندارد)

### ۳.۴ عدم training data validation و bias check
- **اندپوینت**: `POST /fraud/ml/train`
- **اشکال**: `trainingData` به‌صورت array ارسال می‌شود اما هیچ validation ای برای بررسی bias، data quality، یا class imbalance در training data وجود ندارد. training data نامناسب می‌تواند به model تبعیض‌آمیز منجر شود.
- **کد**: `fraud.service.ts:trainMLModel` (lines 323-409) — `fraudCount` و `nonFraudCount` محاسبه می‌شوند (lines 352-353) اما هیچ بررسی bias یا class imbalance انجام نمی‌شود. `trainingDataSummary` ذخیره می‌شود اما validation ای روی آن انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Graph/Network Analytics

### ۴.۱ عدم query و traversal برای graph
- **اندپوینت**: `POST /fraud/graph/entities`، `POST /fraud/graph/relationships`
- **اشکال**: فقط create entity و relationship پشتیبانی می‌شود. هیچ endpoint برای query graph (مثلاً find all entities connected to a given entity در depth N) وجود ندارد. در fraud detection، ability to traverse network و find connections بین entities ضروری است.
- **کد**: `fraud.controller.ts` — هیچ `GET /fraud/graph/entities/:entityId/connections` یا `POST /fraud/graph/traverse` وجود ندارد. `fraud.service.ts` — فقط `createGraphEntity`، `createGraphRelationship` و `detectSuspiciousNetworks` وجود دارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم delete برای graph entities و relationships
- **اندپوینت**: `POST /fraud/graph/entities`، `POST /fraud/graph/relationships`
- **اشکال**: هیچ delete endpoint برای graph entities یا relationships وجود ندارد. اگر entity یا relationship اشتباه ایجاد شود، قابل حذف نیست.
- **کد**: `fraud.controller.ts` — هیچ `@Delete` endpoint وجود ندارد. `fraud.service.ts` — هیچ متد `deleteGraphEntity` یا `deleteGraphRelationship` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم pagination در suspicious networks
- **اندپوینت**: `GET /fraud/graph/suspicious-networks`
- **اشکال**: response شامل `networks` array است اما هیچ pagination یا limit وجود ندارد. اگر شبکه‌های مشکوک زیاد باشند، response می‌تواند بسیار بزرگ شود و به timeout یا OOM منجر شود.
- **کد**: `fraud.service.ts:detectSuspiciousNetworks` (lines 812-870) — تمام suspicious entities را برمی‌گرداند بدون limit/offset. `fraud.controller.ts:detectSuspiciousNetworks` (lines 393-413) — هیچ pagination پارامتری دریافت نمی‌کند.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Irregularity Alerts

### ۵.۱ عدم alert deduplication
- **اندپوینت**: `POST /fraud/alerts/detect`
- **اشکال**: detect با `claimId` و `claimData` فراخوانی می‌شود اما هیچ مکانیزم deduplication وجود ندارد. اگر detect برای همان claim چند بار فراخوانی شود، alert‌های تکراری ایجاد می‌شود که به alert fatigue منجر می‌شود.
- **کد**: `fraud.service.ts:detectIrregularities` (lines 1125-1163) — هیچ بررسی‌ای برای existing alerts با همان `claimId` و `patternType` انجام نمی‌دهد. هر فراخوانی، alerts جدید ایجاد می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ ~~عدم alert severity auto-assignment~~
- ~~**اشکال**: response شامل array از alerts است اما مشخص نیست severity هر alert چگونه تعیین می‌شود. هیچ فیلدی برای severity در request body وجود ندارد و منطق severity assignment در API قابل پیکربندی نیست.~~
- **کد**: `fraud.service.ts:detectMultipleClaimsShortPeriod` (lines 1186-1190) — `severity: recentClaims >= 5 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM`. severity به‌طور خودکار بر اساس detection logic تعیین می‌شود. `FraudIrregularityAlert` entity دارای `severity` enum (LOW, MEDIUM, HIGH, CRITICAL) است.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: severity به‌طور خودکار در `detectMultipleClaimsShortPeriod` و سایر detection methods بر اساس منطق (مثلاً count threshold) تعیین می‌شود.

### ۵.۳ عدم alert-to-case conversion
- **اندپوینت**: `PUT /fraud/alerts/:alertId`
- **اشکال**: alert می‌تواند update شود اما هیچ اندپوینتی برای convert alert به fraud case وجود ندارد. در عمل، وقتی irregularity alert تایید می‌شود، باید به fraud case تبدیل شود و investigation شروع شود. این workflow در API تعریف نشده است.
- **کد**: `fraud.controller.ts` — هیچ `POST /fraud/alerts/:alertId/convert-to-case` وجود ندارد. `fraud.service.ts:updateIrregularityAlert` (lines 1434-1457) — فقط `status`، `assignedTo`، `notes`، `resolutionNotes` را update می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ (جدید) BUG: detectIrregularities alerts را در DB ذخیره نمی‌کند
- **اندپوینت**: `POST /fraud/alerts/detect`
- **اشکال**: `detectIrregularities` از `irregularityAlertRepo.create()` استفاده می‌کند که فقط یک entity instance در memory ایجاد می‌کند، اما هرگز `irregularityAlertRepo.save()` فراخوانی نمی‌کند. نتیجه: alerts تشخیص داده می‌شوند اما در DB ذخیره نمی‌شوند و در `GET /fraud/alerts` قابل دسترسی نیستند.
- **کد**: `fraud.service.ts:detectIrregularities` (lines 1125-1163) — `alerts.push(multipleClaimsAlert)` و return `alerts`، بدون هیچ `save()`. `detectMultipleClaimsShortPeriod` (line 1186) — `this.irregularityAlertRepo.create({...})` بدون `save()`. controller (lines 433-439) — alerts را return می‌کند بدون save.
- **وضعیت**: ✅ تأیید شد (نقص جدید — بحرانی)

---

## ۶. Security و Integration

### ۶.۱ نبود AbacGuard و ضعف در data isolation
- **اندپوینت**: تمام endpoints
- **اشکال**: برخلاف aml-service و complaints-service که AbacGuard دارند، fraud-service فقط از PermissionsGuard و TenantGuard استفاده می‌کند. این یعنی هیچ attribute-based فیلتری بر اساس organization، branch یا user assignment وجود ندارد. در fraud، data isolation بین واحدهای سازمانی (مثلاً SIU vs branch) بسیار مهم است.
- **کد**: `fraud.controller.ts` line 10 — `@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)`. `app.module.ts` line 39 — `AbacGuard` در providers نیست.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم rate limiting برای compute-score
- **اندپوینت**: `POST /fraud/compute-score`
- **اشکال**: compute-score به‌صورت on-demand فراخوانی می‌شود. هیچ rate limiting وجود ندارد. یک consumer می‌تواند به‌طور مکرر compute-score را برای همان claim فراخوانی کند و منابع ML را مصرف کند.
- **کد**: `fraud.controller.ts:computeScore` (lines 25-56) — هیچ throttle یا rate limit middleware وجود ندارد. `fraud.service.ts:computeScore` (lines 59-145) — هیچ deduplication یا caching برای همان claimId وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ (جدید) BUG بحرانی: بسیاری از permissions به هیچ role اختصاص داده نشده‌اند
- **اندپوینت**: `POST /fraud/ml/train`، `POST /fraud/ml/models/:modelId/deploy`، `POST /fraud/ml/predict`، `GET /fraud/ml/models`، `POST /fraud/graph/entities`، `POST /fraud/graph/relationships`، `GET /fraud/graph/suspicious-networks`، `POST /fraud/alerts/detect`، `GET /fraud/alerts`، `PUT /fraud/alerts/:alertId`
- **اشکال**: `permissions.ts` تمام permission keys را تعریف می‌کند اما `ROLE_TO_PERMISSIONS` فقط یک زیرمجموعه محدود را به roles اختصاص می‌دهد. permissions مانند `fraud:ml:train`، `fraud:ml:deploy`، `fraud:ml:predict`، `fraud:ml:view`، `fraud:graph:create`، `fraud:graph:view`، `fraud:alert:create`، `fraud:alert:view`، `fraud:alert:update` به هیچ role داده نشده‌اند. نتیجه: هیچ کاربری نمی‌تواند به endpoints مربوط به ML، graph و alerts دسترسی داشته باشد (همیشه `FORBIDDEN`).
- **کد**: `permissions.ts` (lines 3-10) — `ROLE_TO_PERMISSIONS` فقط شامل `fraud:triage`، `fraud:investigate`، `fraud:escalate`، `fraud:cases:list` است. هیچ role شامل `fraud:ml:*`، `fraud:graph:*` یا `fraud:alert:*` نیست.
- **وضعیت**: ✅ تأیید شد (نقص جدید — بحرانی)

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ ~~عدم یکپارچه‌سازی خودکار با claims-service~~
- ~~**اشکال**: `POST /fraud/compute-score` به‌صورت manual فراخوانی می‌شود. هیچ event-driven integration با claims-service وجود ندارد که به‌طور خودکار هنگام submit شدن claim، fraud score را compute کند. این باعث می‌شود claim‌هایی که fraud screening نشده‌اند proceed شوند.~~
- **کد**: `fraud-claim-registration.consumer.ts` (lines 1-211) — `FraudClaimRegistrationConsumer` به topic `insurance.claim.registered` subscribe می‌کند (line 83). `handleClaimRegistered` (lines 142-210) — به‌طور خودکار `FraudCase` با `holdClaim: true` و `FraudScoreAudit` ایجاد می‌کند و event `insurance.fraud.screening.initiated` را publish می‌کند. Idempotency با `ConsumedEvent` (lines 98-110) و DLQ (lines 131-139) پیاده‌سازی شده است.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `FraudClaimRegistrationConsumer` به‌طور خودکار `insurance.claim.registered` events را مصرف و fraud screening انجام می‌دهد.

### ۷.۲ ~~عدم sync fraud case status با claims-readmodel-service~~
- ~~**اشکال**: claims-readmodel-service fraud cases را projection می‌کند (`GET /rm/fraud/cases`) اما مشخص نیست چگونه از fraud-service sync می‌شود. هیچ event یا webhook در fraud-service برای notify کردن readmodel وجود ندارد. projection lag می‌تواند به stale data در readmodel منجر شود.~~
- **کد**: `fraud.service.ts` — event‌های `insurance.fraud.case_opened` (line 185)، `insurance.fraud.case.escalated` (line 234)، `insurance.fraud.case_closed` (line 278)، `insurance.fraud.score_computed` (line 123)، `insurance.fraud.screening.initiated` (consumer line 193) از طریق Outbox publish می‌شوند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event‌های متعدد fraud از طریق Outbox publish می‌شوند که claims-readmodel-service می‌تواند برای projection مصرف کند.

### ۷.۳ ~~عدم یکپارچه‌سازی با notification-service برای escalation~~
- ~~**اشکال**: وقتی case escalate می‌شود (`POST /fraud/cases/:fraudCaseId/escalate`)، هیچ notification به SIU یا legal team از طریق notification-service ارسال نمی‌شود. escalation فقط در سیستم ثبت می‌شود.~~
- **کد**: `fraud.service.ts:escalateCase` (lines 230-253) — event `insurance.fraud.case.escalated` با `toUnit`، `reasonCodes`، `requiresHumanApproval` publish می‌شود. notification-service می‌تواند این event را مصرف کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event `insurance.fraud.case.escalated` از طریق Outbox publish می‌شود که notification-service می‌تواند برای ارسال notification مصرف کند.

### ۷.۴ عدم دسترسی customer-portal به fraud case status
- **اشکال**: هیچ BFF endpoint برای customer-portal برای دیدن وضعیت fraud case وجود ندارد. اگر claim مشتری در fraud hold باشد، مشتری باید از طریق تماس تلفانی وضعیت را بفهمد که تجربه کاربری ضعیفی است.
- **کد**: این نقص در customer-portal-bff است، نه در fraud-service. fraud-service هیچ endpoint عمومی برای مشتریان ندارد.
- **وضعیت**: ✅ تأیید شد (نقص در customer-portal-bff)

### ۷.۵ عدم SoD بین investigator و closer
- **اشکال**: `fraud:investigate` permission برای close case استفاده می‌شود. اما همان investigator که case را باز و investigate می‌کند، می‌تواند آن را close کند. در SoD، تایید close باید توسط شخص دیگری انجام شود. هیچ `fraud:cases:approve_close` permission وجود ندارد.
- **کد**: `permissions.ts` — هیچ `fraud:cases:approve_close` تعریف نشده است. `fraud.controller.ts:closeCase` (line 140) — `@RequirePermissions('fraud:investigate')`. همان role‌هایی که `fraud:investigate` دارند (insurer_admin، fraud_analyst، legal_ops) می‌توانند close کنند.
- **وضعیت**: ✅ تأیید شد

---

## ۸. نقص‌های امنیتی و زیرساختی (جدید)

### ۸.۱ (جدید) tenantId filtering شرطی است و می‌تواند cross-tenant access ایجاد کند
- **اندپوینت**: `GET /fraud/cases`، `GET /fraud/alerts`
- **اشکال**: در `listCases` و `listIrregularityAlerts`، فیلتر `tenantId` فقط وقتی اعمال می‌شود که `params.tenantId !== undefined` باشد. اگر `TenantGuard` مقدار `tenantId` را set نکند (مثلاً header نباشد)، هیچ فیلتر tenant اعمال نمی‌شود و همه داده‌های همه tenant‌ها قابل دسترسی است.
- **کد**: `fraud.service.ts:listCases` (lines 305-307) — `if (params.tenantId !== undefined)`. `fraud.service.ts:listIrregularityAlerts` (lines 1409-1411) — `if (params.tenantId !== undefined)`. `fraud.controller.ts:getTenantId` (lines 20-23) — `req?.tenantId || req?.user?.tenantId` که می‌تواند `undefined` باشد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
