# Feature Flags Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: feature-flags-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/feature-flags-service/src/`

---

## ۱. مدیریت Feature Flag

### ۱.۱ عدم وجود اندپوینت DELETE برای حذف feature flag
- **اندپوینت**: `PUT /feature-flags/:key` (تنها اندپوینت مدیریت)
- **اشکال**: سرویس فقط `GET` (list، get) و `PUT` (upsert) دارد. هیچ اندپوینتی برای حذف یک feature flag وجود ندارد. پرچم‌های منسوخ یا آزمایشی به‌صورت دائمی در سیستم باقی می‌مانند و باعث انباشت داده و سردرگمی در مدیریت می‌شوند. حذف نرم (soft delete) یا آرشیو کردن نیز پشتیبانی نمی‌شود.
- **کد**: `feature-flags.controller.ts` — فقط سه متد `health()`، `list()`، `get()`، `put()` تعریف شده‌اند. هیچ متد `delete` یا دکوریتور `@Delete` وجود ندارد. همچنین در `feature-flags.service.ts` هیچ متدی برای حذف وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم تفکیک create از update در upsert
- **اندپوینت**: `PUT /feature-flags/:key`
- **اشکال**: عملیات `PUT` همزمان create و update را انجام می‌دهد (upsert). این طراحی باعث می‌شود نتوان تمایز بین ایجاد یک پرچم جدید و ویرایش پرچم موجود را از نظر audit trail تشخیص داد. همچنین، در صورت اشتباه تایپی در `key`، یک پرچم جدید ناخواسته ایجاد می‌شود به‌جای خطای "not found". استاندارد REST ایجاب می‌کند `POST` برای create و `PUT`/`PATCH` برای update استفاده شود.
- **کد**: `feature-flags.service.ts:upsertFeatureFlag()` (خطوط ۵۵-۱۰۶) — متد ابتدا `findOne` می‌کند؛ اگر رکورد موجود باشد `update` می‌کند و اگر نباشد `create` و `save` می‌کند. هیچ تمایزی در پاسخ بین create و update وجود ندارد و هر دو مسیر همان ساختار پاسخ را برمی‌گردانند.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم وجود pagination در لیست feature flags
- **اندپوینت**: `GET /feature-flags`
- **اشکال**: این اندپوینت تمام feature flag‌ها را در یک پاسخ واحد برمی‌گرداند. هیچ پارامتر `limit`، `offset` یا cursor وجود ندارد. با افزایش تعداد پرچم‌ها در طول زمان، این اندپوینت می‌تواند باعث مصرف بیش از حد حافظه و timeout شود.
- **کد**: `feature-flags.controller.ts:list()` (خط ۲۹) — `this.flagsService.listFeatureFlags()` بدون هیچ پارامتر pagination فراخوانی می‌شود. در `feature-flags.service.ts:listFeatureFlags()` (خط ۳۷) — `this.featureFlagsRepo.find({ order: { name: 'ASC' } })` بدون `skip`/`take`. **نکته**: service یک cache درون‌حافظه‌ای با TTL (پیش‌فرض ۳۰ ثانیه) دارد (`listCache`، خط ۱۱-۱۲) که بار DB را کاهش می‌دهد اما مشکل عدم pagination را حل نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم فیلتر و جستجو در لیست feature flags
- **اندپوینت**: `GET /feature-flags`
- **اشکال**: هیچ پارامتر query برای فیلتر کردن بر اساس `isEnabled`، `targetAudience`، `rolloutPercentage` یا جستجوی متنی در `name`/`description` وجود ندارد. در محیط با ده‌ها پرچم، پیدا کردن پرچم مورد نظر نیازمند فیلتر سمت کلاینت است که ناکارآمد است.
- **کد**: `feature-flags.controller.ts:list()` (خط ۲۷) — متد هیچ `@Query()` پارامتری نمی‌گیرد و فقط `@Headers()` را دریافت می‌کند.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Targeting و Rollout

### ۲.۱ ~~نبود targeting rules ساختاریافته~~
- **اندپوینت**: `PUT /feature-flags/:key`
- ~~**اشکال**: فیلد `targetAudience` فقط یک رشته آزاد (`string`) است، نه یک ساختار rule-based. در یک سیستم enterprise، targeting باید بر اساس attribute‌های کاربر (مثل `role`، `organization`، `tenant`، `region`، `userSegment`) تعریف شود.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: فیلد `targetAudience` در entity یک ستون `jsonb` است، نه `string`. در `entities/FeatureFlag.ts` (خط ۲۰-۲۱): `@Column({ type: 'jsonb', name: 'target_audience', nullable: true }) targetAudience!: Record<string, any> | null`. بنابراین از نظر نوع داده، ساختار JSON پشتیبانی می‌شود. با این حال، **نقص واقعی** این است که هیچ موتور ارزیابی rule در سرویس وجود ندارد — یعنی `targetAudience` ذخیره می‌شود اما هیچ منطقی برای ارزیابی آن بر اساس context کاربر پیاده‌سازی نشده است. این نقص در بخش ۲.۲ و ۴.۲ پوشش داده شده است.

### ۲.۲ عدم پشتیبانی از gradual rollout واقعی
- **اندپوینت**: `PUT /feature-flags/:key` (فیلد `rolloutPercentage`)
- **اشکال**: `rolloutPercentage` به‌صورت عدد ۰ تا ۱۰۰ تعریف شده، اما هیچ مکانیزمی برای تعیین نحوه انتخاب کاربران مشخص نشده است. آیا selection بر اساس hash شناسه کاربر است؟ تصادفی؟ بر اساس cohort؟ بدون الگوریتم deterministic، یک کاربر ممکن است در درخواست متوالی گاهی پرچم را فعال و گاهی غیرفعال ببیند که باعث تجربه ناسازگار (inconsistent UX) می‌شود.
- **کد**: `feature-flags.service.ts` — هیچ متدی برای ارزیابی rollout وجود ندارد. `getFeatureFlag()` (خط ۴۲-۵۳) فقط پرچم را برمی‌گرداند؛ هیچ منطق rollout یا hash کاربر پیاده‌سازی نشده است. `entities/FeatureFlag.ts` (خط ۱۷-۱۸): `@Column({ type: 'integer', name: 'rollout_percentage', default: 0 })` — فقط ذخیره عدد.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ نبود A/B testing
- **اندپوینت**: `GET /feature-flags/:key`، `PUT /feature-flags/:key`
- **اشکال**: هیچ مفهوم variant یا experiment در مدل داده feature flag وجود ندارد. یک feature flag فقط `isEnabled: true|false` است. در A/B testing واقعی، باید بتوان چند variant (مثلاً `control`، `variant-a`، `variant-b`) با تخصیص درصد تعریف کرد و metric‌های conversion را برای هر variant ردیابی کرد. این قابلیت کاملاً غایب است.
- **کد**: `entities/FeatureFlag.ts` — فیلدها: `name`، `description`، `isEnabled` (boolean)، `rolloutPercentage` (integer)، `targetAudience` (jsonb)، `createdAt`، `updatedAt`. هیچ فیلد variant یا experiment وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم پشتیبانی از محیط‌های مختلف (environment scoping)
- **اندپوینت**: `GET /feature-flags/:key`، `PUT /feature-flags/:key`
- **اشکال**: feature flag بر اساس `key` (نام) شناسایی می‌شود اما هیچ فیلد `environment` (مثل `dev`، `staging`، `production`) وجود ندارد. در عمل، یک پرچم با همان نام در همه محیط‌ها یک مقدار دارد مگر اینکه tenant ایزوله باشد. این باعث می‌شود مدیریت محیط‌های مختلف پیچیده شود و خطر فعال‌سازی ناخواسته پرچم در production افزایش یابد.
- **کد**: `entities/FeatureFlag.ts` — هیچ فیلد `environment` در entity وجود ندارد. `featureFlagsRepo.findOne({ where: { name } })` در service فقط بر اساس `name` جستجو می‌کند.
- **وضعیت**: ✅ تأیید شد

---

## ۳. امنیت و حاکمیت

### ۳.۱ ~~عدم audit trail برای تغییرات feature flag~~
- **اندپوینت**: `PUT /feature-flags/:key`
- ~~**اشکال**: پاسخ فقط `updatedAt` را برمی‌گرداند اما هیچ فیلدی برای `updatedBy`، `updatedFrom` (آدرس IP)، یا تاریخچه تغییرات وجود ندارد. در یک سیستم enterprise، هر تغییر feature flag باید با شناسه کاربر، timestamp، و مقدار قبلی/جدید ثبت شود. این برای compliance و troubleshooting حیاتی است. هیچ اندپوینتی برای مشاهده history تغییرات یک flag وجود ندارد.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد (جزئی)**: سرویس دارای audit logger است. در `feature-flags.service.ts:upsertFeatureFlag()` (خطوط ۸۴-۹۰) از `auditLogger.log('feature_flag.updated', ...)` با مقادیر `before` و `after` استفاده می‌شود. فایل `audit.logger.ts` یک audit entry با `action`، `resource`، `resourceId`، `actor`، `before`، `after`، `timestamp` ثبت می‌کند. **اما نقص‌های باقی‌مانده**: (۱) `actor` به‌صورت hardcode `'system'` است نه شناسه کاربر واقعی از JWT؛ (۲) audit log فقط در حافظه نگه‌داری می‌شود (آرایه با حداکثر ۱۰۰۰۰ ورودی، خط ۱۳ `audit.logger.ts`) و با restart سرویس از بین می‌رود؛ (۳) هیچ اندپوینتی برای مشاهده history تغییرات وجود ندارد. این نقص‌های باقی‌مانده در نقص‌های جدید ۶.۱ و ۶.۲ پوشش داده شده‌اند.

### ۳.۲ ~~عدم validation مقدار rolloutPercentage~~
- **اندپوینت**: `PUT /feature-flags/:key`
- ~~**اشکال**: در بخش errors فقط `VALIDATION_ERROR` برای `isEnabled` (boolean) ذکر شده است. هیچ validation ای برای محدوده `rolloutPercentage` (۰ تا ۱۰۰) تعریف نشده.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: در `feature-flags.service.ts:upsertFeatureFlag()` (خطوط ۶۲-۶۶) validation وجود دارد: `if (params.rolloutPercentage !== undefined && (params.rolloutPercentage < 0 || params.rolloutPercentage > 100))` و خطای `VALIDATION_ERROR` پرتاب می‌کند. **اما نقص باقی‌مانده**: در `feature-flags.controller.ts:put()` (خطوط ۷۰-۹۶) هیچ `try/catch` вокруг فراخوانی `upsertFeatureFlag` وجود ندارد، بنابراین خطای پرتاب‌شده به‌صورت HTTP 500 برگردانده می‌شود نه یک پاسخ JSON ساختاریافته با `success: false`.

### ۳.۳ عدم rate limiting روی اندپوینت‌های feature flag
- **اندپوینت**: `GET /feature-flags/:key`
- **اشکال**: این اندپوینت احتمالاً توسط سرویس‌های دیگر به‌صورت مکرر (در هر request یا middleware) فراخوانی می‌شود. هیچ cache header (`ETag`، `Cache-Control`) یا rate limit تعریف نشده است. اگر ۱۰ سرویس هر ثانیه ۱۰۰ بار وضعیت یک پرچم را چک کنند، بار قابل توجهی روی سرویس ایجاد می‌شود.
- **کد**: `feature-flags.controller.ts` — هیچ دکوریتور throttle یا rate-limit وجود ندارد. **نکته**: service یک cache درون‌حافظه‌ای دارد (`flagCache` در `feature-flags.service.ts` خط ۱۰، با TTL قابل تنظیم از `CACHE_TTL_MS`، پیش‌فرض ۳۰۰۰۰ms) که بار DB را کاهش می‌دهد اما هیچ cache header HTTP یا rate limit در سطح controller تنظیم نشده است.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ نبود SoD بین view و manage
- **اندپوینت**: `GET /feature-flags` (`feature_flags:view`)، `PUT /feature-flags/:key` (`feature_flags:manage`)
- **اشکال**: دو سطح دسترسی تعریف شده اما هیچ تفکیکی بین `manage` (ویرایش) و `admin` (ایجاد/حذف پرچم حساس) وجود ندارد. در یک سیستم با SoD، باید یک نقش `feature_flags:admin` برای ایجاد پرچم‌های production و `feature_flags:manage` برای ویرایش مقادیر وجود داشته باشد تا از فعال‌سازی ناخواسته جلوگیری شود.
- **کد**: `permissions.ts` (خط ۱) — فقط دو permission برای feature flags تعریف شده: `'feature_flags:manage'` و `'feature_flags:view'`. هیچ `'feature_flags:admin'` وجود ندارد. نقش‌ها: فقط `insurer_admin` (دسترسی کامل) و `auditor` (فقط view) تعریف شده‌اند.
- **وضعیت**: ✅ تأیید شد

---

## ۴. یکپارچه‌سازی و مصرف

### ۴.۱ عدم وجود اندپوینت bulk evaluation
- **اندپوینت**: `GET /feature-flags/:key`
- **اشکال**: برای بررسی وضعیت چند پرچم، کلاینت باید به‌صورت متوالی `GET /feature-flags/:key` را برای هر کدام فراخوانی کند. هیچ اندپوینتی مانند `POST /feature-flags/evaluate` که لیستی از کلیدها و context کاربر را بگیرد و وضعیت همه را در یک پاسخ برگرداند وجود ندارد. این باعث افزایش latency و network overhead می‌شود.
- **کد**: `feature-flags.controller.ts` — هیچ اندپوینت bulk یا evaluate وجود ندارد. `get()` فقط یک `key` می‌گیرد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم پشتیبانی از client-side SDK / evaluation context
- **اندپوینت**: `GET /feature-flags/:key`
- **اشکال**: هیچ پارامتری برای ارسال context کاربر (مثل `userId`، `role`، `organization`، `attributes`) وجود ندارد. ارزیابی سمت سرور بر اساس `targetAudience` انجام می‌شود اما کلاینت نمی‌تواند context خود را ارسال کند تا ارزیابی شخصی‌سازی شده دریافت کند. این برای SDK‌های سمت کلاینت (frontend) حیاتی است.
- **کد**: `feature-flags.controller.ts:get()` (خط ۴۷) — فقط `@Headers()` و `@Param('key')` می‌گیرد. هیچ `@Body()` یا `@Query()` برای context کاربر وجود ندارد. `getFeatureFlag()` در service فقط `name` می‌گیرد و هیچ ارزیابی بر اساس context انجام نمی‌دهد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم انتشار تغییرات از طریق webhook یا event
- **اندپوینت**: `PUT /feature-flags/:key`
- **اشکال**: وقتی یک feature flag تغییر می‌کند، هیچ event یا webhook ای برای اطلاع‌رسانی سرویس‌های مصرف‌کننده ارسال نمی‌شود. سرویس‌ها باید polling کنند یا تا restart بعدی مقدار قدیمی را در cache نگه دارند. این باعث می‌شود تغییرات با تأخیر اعمال شوند یا به‌طور کامل از قلم بیفتند.
- **کد**: `feature-flags.service.ts:upsertFeatureFlag()` — پس از update/create فقط `invalidateCache()` فراخوانی می‌شود (خط ۸۲/۱۰۴). هیچ event emit یا outbox write وجود ندارد. **نکته**: در `app.module.ts` (خط ۱۳) `OutboxEvent` از `@insurance/shared` import شده اما در هیچ جای سرویس استفاده نمی‌شود — احتمالاً import بلااستفاده یا planned اما پیاده‌سازی‌نشده.
- **وضعیت**: ✅ تأیید شد

---

## ۵. ذینفعان و مصرف‌کنندگان

### ۵.۱ عدم تعریف مصرف‌کنندگان در کاتالوگ
- **اشکال**: کاتالوگ اندپوینت هیچ اطلاعاتی درباره اینکه کدام سرویس‌ها یا UI از feature-flags-service استفاده می‌کنند ارائه نمی‌دهد. طبق `CAPABILITY_REGISTRY.md`، قابلیت `PLT-10` Feature Flags به `reporting-service` نسبت داده شده، نه به `feature-flags-service` مستقل. این تضاد نشان می‌دهد یا دو سرویس موازی وجود دارد یا feature-flags-service یک wrapper است. عدم شفافیت در ownership باعث مشکلات نگهداری می‌شود.
- **کد**: در `feature-flags.service.ts:ensureDefaults()` (خطوط ۱۰۸-۱۳۲) سه پرچم پیش‌فرض ایجاد می‌شود: `ai.enabled`، `copilot.enabled`، `document_ai.enabled` — نشان می‌دهد مصرف‌کنندگان اصلی این سرویس copilot-service، document-ai-service و سایر سرویس‌های AI هستند. همچنین `ai-toggles.controller.ts` نشان می‌دهد سرویس برای مدیریت AI toggles نیز استفاده می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم یکپارچه‌سازی با monitoring-service برای health flag
- **اشکال**: هیچ مکانیزمی برای گزارش وضعیت feature flag‌ها به monitoring-service وجود ندارد. اگر یک پرچم حساس (مثل `disable_payments`) فعال شود، monitoring-service باید alert تولید کند یا dashboard را به‌روز کند. این یکپارچه‌سازی غایب است.
- **کد**: هیچ import یا reference به monitoring-service در کل سرویس وجود ندارد. `app.module.ts` فقط `OutboxEvent` را import می‌کند (که هم استفاده نشده).
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم دسترسی customer-portal و agent-portal به feature flags
- **اشکال**: پورتال‌های customer و agent برای کنترل تجربه کاربری (مثل نمایش/پنهان کردن ویژگی‌های جدید) نیاز به ارزیابی feature flag دارند، اما هیچ BFF یا endpoint proxy برای این پورتال‌ها تعریف نشده است. فراخوانی مستقیم از frontend به feature-flags-service با JWT کاربر نهایی امن نیست.
- **کد**: تمام اندپوینت‌ها (به‌جز `/health`) از `JwtAuthGuard + PermissionsGuard + AbacGuard + TenantGuard` استفاده می‌کنند. `permissions.ts` فقط نقش‌های `insurer_admin` و `auditor` را پشتیبانی می‌کند — هیچ نقش `customer` یا `agent` تعریف نشده، بنابراین کاربران نهایی نمی‌توانند حتی view کنند.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ عدم governance برای feature flag lifecycle
- **اشکال**: طبق `CAPABILITY_REGISTRY.md`، شکاف `PLT-10` "governance formal نیست" ذکر شده. این سرویس هیچ مکانیزم governance ندارد: هیچ approval workflow‌ای برای فعال‌سازی پرچم در production، هیچ expiration date برای پرچم‌های موقت، و هیچ گزارشی برای پرچم‌های متروکه (orphaned) وجود ندارد.
- **کد**: `entities/FeatureFlag.ts` — هیچ فیلد `expiresAt`، `approvedBy`، `status` (draft/approved/active) وجود ندارد. `upsertFeatureFlag()` بدون هیچ approval check مستقیماً flag را ذخیره می‌کند.
- **وضعیت**: ✅ تأیید شد

---

## ۶. نقص‌های جدید یافت‌شده در کد

### ۶.۱ عدم persistence برای audit log
- **اندپوینت**: `PUT /feature-flags/:key`
- **اشکال**: audit logger فقط در حافظه نگه‌داری می‌شود (آرایه جاوااسکریپتی با حداکثر ۱۰۰۰۰ ورودی) و با restart سرویس تمام تاریخچه از بین می‌رود. این برای compliance و audit قابل‌قبول نیست.
- **کد**: `audit.logger.ts` (خط ۱۲): `const entries: AuditEntry[] = [];` و (خط ۱۳): `const MAX_ENTRIES = 10000;` — هیچ اتصال به DB یا فایل برای persist کردن وجود ندارد. `getEntries()` فقط آرایه درون‌حافظه‌ای برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۶.۲ hardcode بودن actor در audit log به‌جای استخراج از JWT
- **اندپوینت**: `PUT /feature-flags/:key`
- **اشکال**: در audit log، `actor` همیشه `'system'` است نه شناسه کاربر واقعی که تغییر را انجام داده. این باعث می‌شود در audit trail نتوان مشخص کرد چه کسی یک feature flag را تغییر داده است.
- **کد**: `feature-flags.service.ts:upsertFeatureFlag()` (خط ۸۷): `actor: 'system'` — hardcoded. در `ai-toggles.controller.ts` نیز `actor: 'system'` (خط ۱۶۹). هیچ ارجاعی به `req.user` یا `req.user.sub` در service وجود ندارد چون service به request object دسترسی ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۶.۳ عدم مدیریت خطا در controller برای validation errors
- **اندپوینت**: `PUT /feature-flags/:key`
- **اشکال**: controller خطاهای پرتاب‌شده از service (مثل validation خطای `rolloutPercentage`) را catch نمی‌کند، بنابراین به‌جای پاسخ JSON ساختاریافته، یک HTTP 500 به کلاینت برگردانده می‌شود.
- **کد**: `feature-flags.controller.ts:put()` (خطوط ۷۷-۸۳) — `const updated = await this.flagsService.upsertFeatureFlag({...})` بدون `try/catch`. اگر service خطا پرتاب کند (مثلاً `rolloutPercentage must be between 0 and 100`)، NestJS یک 500 Internal Server Error برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۶.۴ تعارض route بین دو اندپوینت `/health`
- **اندپوینت**: `GET /health`
- **اشکال**: دو controller مختلف هرکدام یک `GET /health` تعریف کرده‌اند: `FeatureFlagsController` (خط ۱۹-۲۲) پاسخ مینیمال `{ status: 'ok', service: 'feature-flags-service' }` و `HealthController` (خط ۸-۳۴) پاسخ کامل با DB check، uptime و components. این تعارض باعث رفتار غیرقابل پیش‌بینی می‌شود (کدام route handler اول match می‌شود به ترتیب ثبت در module بستگی دارد).
- **کد**: `feature-flags.controller.ts` (خط ۱�۹): `@Get('/health')` و `health.controller.ts` (خط ۸): `@Get('/health')`. در `app.module.ts` (خط ۲۹): `controllers: [FeatureFlagsController, AiTogglesController, HealthController]` — FeatureFlagsController اول ثبت شده، بنابراین health مینیمال آن احتمالاً اول match می‌شود و health check واقعی با DB test هرگز فراخوانی نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۶.۵ عدم وجود اندپوینت‌های AI Toggles در کاتالوگ
- **اندپوینت**: `GET /ai-toggles`، `GET /ai-toggles/:name`، `PUT /ai-toggles/:name`
- **اشکال**: سرویس دارای یک controller کامل برای مدیریت AI toggles است (`ai-toggles.controller.ts`) با سه اندپوینت، اما هیچ‌کدام در کاتالوگ اندپوینت (`feature-flags-service.md`) ذکر نشده‌اند. این اندپوینت‌ها امکان مدیریت مدل‌های AI (modelName، modelVersion، config) را فراهم می‌کنند و دارای permission جداگانه (`ai_toggles:view`، `ai_toggles:manage`) هستند.
- **کد**: `ai-toggles.controller.ts` (خطوط ۱۹-۹۶) — سه اندپوینت: `GET /ai-toggles` (list)، `GET /ai-toggles/:name` (get)، `PUT /ai-toggles/:name` (upsert). entity: `entities/AiToggle.ts` با فیلدهای `name`، `description`، `isEnabled`، `modelName`، `modelVersion`، `config` (jsonb). در `permissions.ts` (خط ۱): `'ai_toggles:manage'` و `'ai_toggles:view'` تعریف شده‌اند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۶.۶ عدم تطابق AbacGuard با permissions.ts
- **اندپوینت**: همه اندپوینت‌های غیر-GET
- **اشکال**: `AbacGuard` نقش‌های `['insurer_admin', 'head_office_ops', 'system_admin']` را برای عملیات state-changing چک می‌کند، اما `permissions.ts` فقط نقش `insurer_admin` را تعریف کرده است. نقش‌های `head_office_ops` و `system_admin` در permissions map وجود ندارند، بنابراین این نقش‌ها اگر AbacGuard را عبور کنند، در PermissionsGuard رد می‌شوند چون هیچ permission به آن‌ها نگاشت نشده.
- **کد**: `abac.guard.ts` (خط ۱۸): `const adminRoles = ['insurer_admin', 'head_office_ops', 'system_admin'];` در مقابل `permissions.ts` (خطوط ۳-۶): فقط `insurer_admin` و `auditor` در `ROLE_TO_PERMISSIONS` تعریف شده‌اند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۶.۷ عدم validation برای ai-toggles (rolloutPercentage و config)
- **اندپوینت**: `PUT /ai-toggles/:name`
- **اشکال**: برخلاف feature flags که validation برای `rolloutPercentage` دارد، `upsertAiToggle` هیچ validation ای برای فیلد `config` (jsonb) ندارد. کلاینت می‌تواند هر ساختار JSON را ارسال کند بدون هیچ schema validation.
- **کد**: `feature-flags.service.ts:upsertAiToggle()` (خطوط ۱۴۲-۱۸۸) — هیچ validation برای `config` یا `modelName`/`modelVersion` وجود ندارد. `ai-toggles.controller.ts:put()` (خط ۷۰-۷۲) — فقط `isEnabled` را به‌عنوان boolean چک می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
