# Knowledge Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: knowledge-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/knowledge-service/src/`

---

## ۱. Article Management

### ۱.۱ عدم تعریف permission صریح برای article endpoints (نقص بحرانی)
- **اندپوینت**: `POST /knowledge/articles`، `PUT /knowledge/articles/:id/publish`، `GET /knowledge/articles/search`، `GET /knowledge/articles/:id`، `PUT /knowledge/articles/:id`، `DELETE /knowledge/articles/:id`، `GET /knowledge/articles`
- **اشکال**: تمام article endpoints به صورت `(implicit from guards)` تعریف شده‌اند. هیچ permission صریحی مانند `knowledge:article:create`، `knowledge:article:publish`، `knowledge:article:edit` یا `knowledge:article:delete` وجود ندارد. این یعنی هر کاربر احراز هویت شده می‌تواند article ایجاد، ویرایش، حذف یا publish کند که نقض اصل least privilege است.
- **کد**: `knowledge.controller.ts` (خط ۹-۱۰) — `@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)` در سطح class تعریف شده، اما هیچ `@RequirePermissions(...)` روی هیچ متدی وجود ندارد. `permissions.decorator.ts:RequirePermissions` (خط ۶) تعریف شده اما هرگز استفاده نشده. `permissions.guard.ts:canActivate` (خط ۱۵) — `if (!required || required.length === 0) return true` — وقتی هیچ permission-required metadata ای نباشد، Guard همیشه `true` برمی‌گرداند. `permissions.ts` (خط ۱-۱۱) — permission key‌هایی مانند `knowledge:articles:create`، `knowledge:articles:update`، `knowledge:articles:delete` تعریف شده‌اند اما هرگز به هیچ endpoint متصل نشده‌اند. `AbacGuard` (خط ۱۴-۱۵) — برای GET همه مجازند، برای non-GET فقط بررسی می‌کند که `roles.length > 0` باشد (خط ۲۶).
- **وضعیت**: ✅ تأیید شد (نقص بحرانی) — PermissionsGuard به طور مؤثر غیرفعال است. تمام permission‌ها در `permissions.ts` تعریف شده‌اند اما هرگز اعمال نمی‌شوند.

### ۱.۲ عدم SoD بین ایجاد و publish article
- **اندپوینت**: `POST /knowledge/articles`، `PUT /knowledge/articles/:id/publish`
- **اشکال**: همان implicit permission برای ایجاد و publish استفاده می‌شود. کسی که article ایجاد می‌کند می‌تواند خودش آن را publish کند. در knowledge management، publish باید توسط reviewer یا editor تایید شود (Separation of Duties).
- **کد**: همانند ۱.۱ — هیچ `@RequirePermissions` ای برای تفکیک create و publish تعریف نشده. `permissions.ts` (خط ۱۴-۲۵) — `insurer_admin` هم `knowledge:articles:create` و هم `knowledge:articles:update` دارد (که می‌تواند شامل publish باشد)، اما `knowledge_ops` هم create و هم update دارد. هیچ permission جداگانه برای `publish` تعریف نشده.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم draft workflow و review
- **اندپوینت**: `PUT /knowledge/articles/:id/publish`
- **اشکال**: article از draft مستقیماً publish می‌شود. هیچ مرحله review یا approval وجود ندارد. در سیستم knowledge management سازمانی، article باید توسط reviewer تایید شود قبل از publish. باید اندپوینت `PUT /knowledge/articles/:id/submit-review` و `PUT /knowledge/articles/:id/approve-review` تعریف شود.
- **کد**: `knowledge.service.ts:publishArticle` (خط ۷۰-۹۱) — `article.status = ArticleStatus.PUBLISHED` مستقیماً set می‌شود. `ArticleStatus` enum (خط ۳-۷ در `KnowledgeArticle.ts`) فقط `DRAFT`، `PUBLISHED`، `ARCHIVED` دارد — هیچ status برای `REVIEW` یا `PENDING_APPROVAL` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم versioning برای article
- **اندپوینت**: `PUT /knowledge/articles/:id`
- **اشکال**: update article محتوای قبلی را overwrite می‌کند. هیچ version history ای وجود ندارد. در صورت ویرایش اشتباه، نسخه قبلی قابل بازیابی نیست. باید versioning با امکان rollback تعریف شود.
- **کد**: `knowledge.service.ts:updateArticle` (خط ۱۵۴-۱۷۳) — `article.title = params.title`، `article.content = params.content` و غیره — مستقیماً overwrite می‌کند. `KnowledgeArticle` entity (خط ۱۸-۶۱) — هیچ فیلد `version` یا relation به version history table وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ عدم soft delete برای article
- **اندپوینت**: `DELETE /knowledge/articles/:id`
- **اشکال**: delete به صورت `deleted: true` برمی‌گردد که احتمالاً soft delete است اما هیچ اندپوینتی برای restore یا list deleted articles وجود ندارد. باید `PUT /knowledge/articles/:id/restore` تعریف شود.
- **کد**: `knowledge.service.ts:deleteArticle` (خط ۱۷۵-۱۷۷) — `await this.articleRepo.delete({ id })` — این **hard delete** است، نه soft delete. `KnowledgeArticle` entity هیچ فیلد `deletedAt` یا `isDeleted` ندارد. response `{ deleted: true }` (کنترلر خط ۱۱۸) فقط یک status flag است، نه نشانگر soft delete.
- **وضعیت**: ✅ تأیید شد — با توضیح که delete در واقع hard delete است، نه soft delete.

### ۱.۶ عدم audit trail برای article operations
- **اندپوینت**: `POST /knowledge/articles`، `PUT /knowledge/articles/:id`، `PUT /knowledge/articles/:id/publish`، `DELETE /knowledge/articles/:id`
- **اشکال**: هیچ audit trail ای برای اینکه چه کسی article را ایجاد، ویرایش، publish یا حذف کرده ثبت نمی‌شود. در knowledge management سازمانی، audit trail برای compliance الزامی است.
- **کد**: `knowledge.service.ts` — `createArticle` (خط ۵۱-۶۵): `OutboxPublisher.publish` با topic `insurance.knowledge.article.created` — event دارد اما `userId` یا `actorId` در payload نیست. `publishArticle` (خط ۷۶-۸۸): `OutboxPublisher.publish` با topic `insurance.knowledge.article.published` — باز هم بدون user info. `updateArticle` (خط ۱۵۴-۱۷۳) — **هیچ event ای انتشار نمی‌یابد**. `deleteArticle` (خط ۱۷۵-۱۷۷) — **هیچ event ای انتشار نمی‌یابد**. هیچ integration با `audit-service` وجود ندارد.
- **وضعیت**: ⚠️ رد شد جزئی — event برای create و publish منتشر می‌شود (بدون user info)، اما update و delete هیچ event‌ای ندارند. audit trail واقعی وجود ندارد.

---

## ۲. Article Search و Listing

### ۲.۱ عدم full-text search با relevance ranking
- **اندپوینت**: `GET /knowledge/articles/search`
- **اشکال**: search با پارامتر `q` انجام می‌شود اما مشخص نیست آیا full-text search با relevance ranking پشتیبانی می‌شود. نتایج بدون score برمی‌گردند. در knowledge search، ranking بر اساس relevance برای تجربه کاربری بهتر الزامی است.
- **کد**: `knowledge.service.ts:searchArticles` (خط ۱۲۰-۱۲۶) — full-text search با PostgreSQL `to_tsvector` و `to_tsquery` پیاده‌سازی شده: `to_tsvector('english', a.title) @@ to_tsquery('english', :query) OR to_tsvector('english', a.content) @@ to_tsquery('english', :query)`. اما نتایج بر اساس `a.updatedAt DESC` sort می‌شوند (خط ۱۳۱)، نه بر اساس relevance rank. هیچ `ts_rank` یا `ts_rank_cd` استفاده نشده. response شامل `items` است بدون `score` یا `rank`.
- **وضعیت**: ⚠️ رد شد جزئی — full-text search پیاده‌سازی شده، اما relevance ranking وجود ندارد. نتایج بر اساس updatedAt sort می‌شوند.

### ۲.۲ ~~عدم search در content article~~
- ~~**اشکال**: پارامتر `q` به صورت search query تعریف شده اما مشخص نیست آیا در `title`، `content` و `summary` جستجو می‌کند یا فقط در title. باید scope search قابل کنترل باشد.~~
- **کد**: `knowledge.service.ts:searchArticles` (خط ۱۲۲-۱۲۵) — search در هم `title` و هم `content` انجام می‌شود: `to_tsvector('english', a.title) @@ to_tsquery('english', :query) OR to_tsvector('english', a.content) @@ to_tsquery('english', :query)`. اما `summary` در search شامل نمی‌شود.
- **وضعیت**: ❌ رد شد — search در title و content انجام می‌شود. نکته: summary در search شامل نیست.

### ۲.۳ عدم highlighting در نتایج search
- **اندپوینت**: `GET /knowledge/articles/search`
- **اشکال**: نتایج search بدون highlighting بخش‌های مطابق با query برمی‌گردند. highlighting برای اینکه کاربر ببیند چرا article در نتایج است، مهم است.
- **کد**: `knowledge.service.ts:searchArticles` (خط ۱۰۱-۱۳۴) — response فقط شامل `items` (article objects) است. هیچ `ts_headline` یا highlighting تولید نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم caching برای search results
- **اندپوینت**: `GET /knowledge/articles/search`
- **اشکال**: هیچ caching ای برای query‌های مکرر search وجود ندارد. query‌های پرتکرار باید cache شوند تا latency و بار دیتابیس کاهش یابد.
- **کد**: `main.ts` (خط ۶-۳۲) — هیچ cache module پیکربندی نشده. `knowledge.service.ts:searchArticles` — هر بار query builder اجرا می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۲.۵ عدم faceted search
- **اندپوینت**: `GET /knowledge/articles/search`
- **اشکال**: فیلتر `category` و `tags` پشتیبانی می‌شود اما faceted search وجود ندارد. کاربر نمی‌تواند ببیند در نتایج چه category‌ها و tag‌هایی وجود دارند. باید facets در response برگردانده شوند.
- **کد**: `knowledge.service.ts:searchArticles` (خط ۱۱۲-۱۱۸) — فیلتر `category` و `tags` پشتیبانی می‌شود. response فقط شامل `items` و `total` است — هیچ facet count برمی‌نگردد.
- **وضعیت**: ✅ تأیید شد

### ۲.۶ عدم sort options در listing
- **اندپوینت**: `GET /knowledge/articles`
- **اشکال**: listing articles فقط با فیلتر `category` و `status` و pagination پشتیبانی می‌شود. هیچ پارامتر sort (مثلاً `sortBy=updatedAt` یا `sortBy=viewCount`) وجود ندارد. کاربر نمی‌تواند articles را بر اساس جدیدترین، پر بازدیدترین یا محبوب‌ترین مرتب کند.
- **کد**: `knowledge.service.ts:listArticles` (خط ۱۹۹) — `qb.orderBy('a.updatedAt', 'DESC')` — sort ثابت بر اساس updatedAt. `searchArticles` (خط ۱۳۱) — همین. هیچ sort parameter ای در query پذیرفته نمی‌شود.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Article Content و Metadata

### ۳.۱ عدم validation طول content و title
- **اندپوینت**: `POST /knowledge/articles`
- **اشکال**: فیلدهای `title` و `content` به صورت string آزاد و required تعریف شده‌اند اما هیچ محدودیت طولی وجود ندارد. یک article با content بسیار بزرگ می‌تواند باعث افت عملکرد و مصرف بیش از حد حافظه شود.
- **کد**: `knowledge.controller.ts:createArticle` (خط ۱۴-۳۵) — `body` با inline type تعریف شده بدون هیچ class-validator decorator. `main.ts` — هیچ `ValidationPipe` پیکربندی نشده. جستجو در کل سرویس — هیچ `class-validator` یا `ValidationPipe` استفاده نشده. `KnowledgeArticle` entity (خط ۲۹) — `title: varchar(200)` محدودیت در DB دارد، اما `content: text` بدون محدودیت.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم rich content support
- **اندپوینت**: `POST /knowledge/articles`
- **اشکال**: `content` به صورت string ساده تعریف شده است. مشخص نیست آیا markdown، HTML یا rich text پشتیبانی می‌شود. در knowledge management سازمانی، rich content با formatting، images و embedded links الزامی است.
- **کد**: `KnowledgeArticle` entity (خط ۳۲-۳۳) — `content: text` — فقط متن خام. هیچ فیلد برای content format (markdown/HTML) یا embedded media وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم attachment support
- **اشکال**: هیچ اندپوینتی برای upload یا attach فایل‌ها (تصاویر، PDF، document) به article وجود ندارد. article فقط شامل text است.
- **کد**: `knowledge.controller.ts` (خط ۱-۱۷۰) — هیچ endpoint برای file upload تعریف نشده. `KnowledgeArticle` entity — هیچ relation به attachment table وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم expiration و auto-archive
- **اندپوینت**: `PUT /knowledge/articles/:id/publish`
- **اشکال**: article publish می‌شود اما هیچ تاریخ انقضا یا auto-archive تعریف نشده است. article‌های قدیمی باید به طور خودکار archive شوند تا محتوای stale در نتایج search ظاهر نشود.
- **کد**: `KnowledgeArticle` entity (خط ۱۸-۶۱) — هیچ فیلد `expiresAt` یا `archivedAt` وجود ندارد. `ArticleStatus` فقط `DRAFT`، `PUBLISHED`، `ARCHIVED` دارد اما archived فقط به صورت دستی set می‌شود (هیچ endpoint برای archive وجود ندارد). هیچ cron job یا scheduled task برای auto-archive تعریف نشده.
- **وضعیت**: ✅ تأیید شد

---

## ۴. NBA (Next Best Action)

### ۴.۱ تکرار NBA با copilot-service
- **اندپوینت**: `POST /knowledge/nba`، `GET /knowledge/nba/recommendations`، `POST /knowledge/nba/:id/execute`
- **اشکال**: knowledge-service و copilot-service هر دو NBA management دارند. copilot-service اندپوینت‌های `POST /copilot/nba/:contextType/:resourceId/actions` و `POST /copilot/nba/:logId/execute` دارد. این تکرار باعث می‌شود دو مسیر مختلف برای NBA وجود داشته باشد و ناهماهنگی داده ایجاد شود. باید مشخص شود کدام سرویس owner اصلی NBA است.
- **کد**: `knowledge.service.ts` (خط ۴۹۴-۵۸۵) — `createNba`، `getRecommendations`، `executeNba`، `listNbas` متدها. `NextBestAction` entity (خط ۱-۵۸) — با `trigger`، `priority`، `channels`، `customerId`. copilot-service نیز `NbaActionLog` entity و NBA endpoints دارد. دو مدل داده متفاوت: knowledge-service از `NextBestAction` با `trigger` و `priority` استفاده می‌کند، copilot-service از `NbaActionLog` با `contextType` و `resourceId`.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم pagination در NBA recommendations
- **اندپوینت**: `GET /knowledge/nba/recommendations`
- **اشکال**: `limit` (default: 20, max: 200) پشتیبانی می‌شود اما `offset` وجود ندارد. pagination ناقص است و نمی‌توان به صفحات بعدی دسترسی داشت.
- **کد**: `knowledge.controller.ts:getRecommendations` (خط ۱۵۳-۱۶۲) — فقط `customerId` و `limit` از query گرفته می‌شوند. `knowledge.service.ts:getRecommendations` (خط ۵۲۶-۵۴۳) — `qb.limit(params.limit || 5)` — فقط limit، بدون offset. نکته: `listNbas` متد (خط ۵۷۰-۵۸۵) هم `limit` و هم `offset` دارد، اما هیچ endpoint ای این متد را expose نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم validation actionType و contextType در NBA
- **اندپوینت**: `POST /knowledge/nba`
- **اشکال**: فیلدهای `actionType` و `contextType` به صورت string آزاد تعریف شده‌اند. باید whitelist از مقادیر مجاز تعریف شود تا NBA نامعتبر ایجاد نشود.
- **کد**: `knowledge.controller.ts:createNba` (خط ۱۴۷) — `@Body() body: any` — body به صورت `any` تعریف شده، هیچ validation. `knowledge.service.ts:createNba` (خط ۴۹۶-۵۲۴) — `trigger: string` و `priority: string` — در سطح TypeScript تایپ‌دهی شده اما در runtime validation انجام نمی‌شود (نبود ValidationPipe). `NextBestAction` entity (خط ۲۰-۲۱) — `trigger` و `priority` به عنوان enum در DB تعریف شده‌اند، پس PostgreSQL مقادیر نامعتبر را reject می‌کند، اما خطای DB به جای خطای validation مناسب API برمی‌گردد.
- **وضعیت**: ✅ تأیید شد — با توضیح که DB-level enum validation وجود دارد اما API-level validation نیست.

### ۴.۴ عدم feedback loop در NBA
- **اندپوینت**: `POST /knowledge/nba/:id/execute`
- **اشکال**: NBA action execute می‌شود اما هیچ اندپوینتی برای ثبت نتیجه execution یا feedback وجود ندارد. باید ثبت شود که آیا action موفق بود یا ناموفق و چه نتیجه‌ای داشت.
- **کد**: `knowledge.service.ts:executeNba` (خط ۵۴۵-۵۶۸) — فقط `nba.executedAt = new Date()` و `nba.active = false` set می‌کند. هیچ فیلدی برای `result`، `feedback` یا `outcome` در `NextBestAction` entity وجود ندارد. event `KnowledgeNbaExecuted` منتشر می‌شود اما فقط `nbaId`، `customerId`، `title` و `trigger` در payload است.
- **وضعیت**: ✅ تأیید شد

### ۴.۵ عدم priority-based filtering در recommendations
- **اندپوینت**: `GET /knowledge/nba/recommendations`
- **اشکال**: فیلتر `customerId` و `tenantId` پشتیبانی می‌شود اما فیلتر بر اساس `priority` یا `actionType` وجود ندارد. کاربر نمی‌تواند فقط recommendation‌های با اولویت بالا یا نوع خاص را ببیند.
- **کد**: `knowledge.service.ts:getRecommendations` (خط ۵۳۱-۵۴۱) — فیلتر فقط `tenantId`، `customerId` و `active = true`. ORDER BY priority (خط ۵۳۶-۵۳۸) انجام می‌شود، اما فیلتر بر اساس priority وجود ندارد. هیچ فیلتر برای `trigger` (action type) هم وجود ندارد.
- **وضعیت**: ✅ تأیید شد — با توضیح که results بر اساس priority sort می‌شوند، اما فیلتر بر اساس priority وجود ندارد.

### ۴.۶ عدم deduplication در recommendations
- **اندپوینت**: `GET /knowledge/nba/recommendations`
- **اشکال**: مشخص نیست آیا recommendation‌های تکراری برای همان customer و context فیلتر می‌شوند یا خیر. ممکن است چند recommendation مشابه برای همان customer برگردانده شود.
- **کد**: `knowledge.service.ts:getRecommendations` (خط ۵۳۱-۵۴۲) — هیچ deduplication یا DISTINCT logic وجود ندارد. query فقط `active = true` و `executedAt IS NULL OR > 30 days ago` فیلتر می‌کند. ممکن است چند NBA با همان `trigger` و `customerId` برگردانده شود.
- **وضعیت**: ✅ تأیید شد

---

## ۵. مسائل امنیتی و طراحی

### ۵.۱ عدم tenant isolation در get/update/delete/publish article (نقص بحرانی)
- **اندپوینت**: `GET /knowledge/articles/:id`، `PUT /knowledge/articles/:id`، `DELETE /knowledge/articles/:id`، `PUT /knowledge/articles/:id/publish`
- **اشکال**: `tenantId` در request body برای create وجود دارد اما در get، update و delete در path param وجود ندارد. مشخص نیست TenantGuard چگونه tenant isolation را اعمال می‌کند. اگر TenantGuard فقط tenant از token را استفاده کند، باید اطمینان حاصل شود که article متعلق به همان tenant است.
- **کد**: `knowledge.service.ts` — `searchArticles` (خط ۱۰۳): `.where('a.tenantId = :tenantId', { tenantId: params.tenantId })` ✅. `listArticles` (خط ۱۸۷): `.where('a.tenantId = :tenantId', { tenantId: params.tenantId })` ✅. اما `getArticle` (خط ۱۴۷): `findOne({ where: { id } })` ❌ — بدون فیلتر tenant. `updateArticle` (خط ۱۶۲): `findOne({ where: { id } })` ❌. `deleteArticle` (خط ۱۷۶): `delete({ id })` ❌. `publishArticle` (خط ۷۲): `findOne({ where: { id } })` ❌. `incrementViewCount` (خط ۱۵۱): `increment({ id }, ...)` ❌. این یعنی یک کاربر tenant A می‌تواند article tenant B را بخواند، ویرایش، حذف یا publish کند.
- **وضعیت**: ✅ تأیید شد (نقص بحرانی) — search و list tenant isolation دارند، اما get/update/delete/publish ندارد.

### ۵.۲ عدم author validation
- **اندپوینت**: `POST /knowledge/articles`
- **اشکال**: فیلد `authorId` در request body ارسال می‌شود اما مشخص نیست آیا validation ای بررسی می‌کند که `authorId` با identity توکن کاربر مطابقت دارد یا خیر. یک کاربر می‌تواند به نام کاربر دیگر article ایجاد کند.
- **کد**: `knowledge.controller.ts:createArticle` (خط ۲۴) — `authorId?: string` از body گرفته می‌شود. `knowledge.service.ts:createArticle` (خط ۴۶) — `authorId: params.authorId || null` — بدون هیچ validation با `req.user.userId` یا `req.user.sub`. `req` در کنترلر available است (خط ۱۶: `@Headers() headers`) اما `req.user` برای authorId استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم rate limiting در search
- **اندپوینت**: `GET /knowledge/articles/search`
- **اشکال**: هیچ rate limiting ای برای search وجود ندارد. یک کاربر می‌تواند query‌های مکرر بفرستد و بار سرچ را افزایش دهد.
- **کد**: `main.ts` (خط ۶-۳۲) — هیچ `ThrottlerModule` یا rate limiting middleware پیکربندی نشده.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ تداخل base path با knowledge-layer-service
- **اشکال**: هم knowledge-service و هم knowledge-layer-service از base path `/knowledge` استفاده می‌کنند. این تداخل در API gateway باعث مشکل routing می‌شود. باید base path‌ها تفکیک شوند (مثلاً `/knowledge-articles` و `/knowledge-index`).
- **کد**: `knowledge.controller.ts` (خط ۹) — `@Controller('knowledge')`. `knowledge-layer-service/knowledge-layer.controller.ts` (خط ۱۰) — `@Controller('knowledge')`. هر دو سرویس از همان base path استفاده می‌کنند. در API gateway، routing باید بر اساس sub-path (مثلاً `/knowledge/articles` vs `/knowledge/index`) انجام شود، اما این شکننده است.
- **وضعیت**: ✅ تأیید شد

### ۵.۵ عدم bulk operations برای article
- **اندپوینت**: `POST /knowledge/articles`
- **اشکال**: فقط یک article در هر درخواست ایجاد می‌شود. هیچ bulk create یا bulk update endpoint ای وجود ندارد. برای migration یا import انبوه، باید `POST /knowledge/articles/bulk` تعریف شود.
- **کد**: `knowledge.controller.ts:createArticle` (خط ۱۴-۳۵) — فقط یک article. `knowledge.service.ts:createArticle` (خط ۲۷-۶۸) — `async createArticle(params: ...): Promise<KnowledgeArticle>` — یک article.
- **وضعیت**: ✅ تأیید شد

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم یکپارچه‌سازی با knowledge-layer-service برای indexing
- **اشکال**: knowledge-service article‌ها را مدیریت می‌کند اما مشخص نیست آیا article‌ها به طور خودکار در knowledge-layer-service index می‌شوند یا خیر. اگر نه، article‌ها در search knowledge-layer-service قابل پیدا کردن نیستند. باید event-driven indexing تعریف شود: وقتی article publish می‌شود، به طور خودکار در knowledge-layer-service index شود.
- **کد**: `knowledge.service.ts:publishArticle` (خط ۷۶-۸۸) — event `insurance.knowledge.article.published` از طریق OutboxPublisher منتشر می‌شود. اما هیچ consumer در knowledge-layer-service برای این event وجود ندارد (جستجو در knowledge-layer-service/src — هیچ reference به `article.published` یافت نشد). هیچ event-driven indexing chain تعریف نشده.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم یکپارچه‌سازی با copilot-service برای NBA
- **اشکال**: copilot-service و knowledge-service هر دو NBA دارند. مشخص نیست کدام سرویس NBA recommendations را تولید و کدام را اجرا می‌کند. این ابهام باعث می‌شود مصرف‌کنندگان ندانند از کدام سرویس استفاده کنند.
- **کد**: knowledge-service از `NextBestAction` entity با `trigger`، `priority`، `customerId` استفاده می‌کند. copilot-service از `NbaActionLog` entity با `contextType`، `resourceId` استفاده می‌کند. دو مدل داده متفاوت بدون هیچ integration یا coordination.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم دسترسی customer-portal به knowledge articles
- **اشکال**: هیچ اندپوینتی برای customer-portal جهت دسترسی به knowledge articles (FAQ، راهنما) وجود ندارد. article‌ها فقط برای کاربران داخلی قابل دسترسی هستند. باید endpoint عمومی یا با permission محدود برای customer تعریف شود.
- **کد**: `knowledge.controller.ts` (خط ۱۰) — `@UseGuards(JwtAuthGuard, ...)` در سطح class — تمام endpoint‌ها احراز هویت require می‌کنند. هیچ endpoint public یا customer-facing تعریف نشده.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ ~~عدم notification در صورت publish یا archive article~~
- ~~**اشکال**: وقتی article publish یا archive می‌شود، هیچ event یا notification ای به سرویس‌های مصرف‌کننده ارسال نمی‌شود. اگر copilot-service از article‌ها برای RAG استفاده می‌کند، باید از تغییرات مطلع شود.~~
- **کد**: `knowledge.service.ts` — `createArticle` (خط ۵۱-۶۵): `OutboxPublisher.publish` با topic `insurance.knowledge.article.created`. `publishArticle` (خط ۷۶-۸۸): `OutboxPublisher.publish` با topic `insurance.knowledge.article.published`. `executeNba` (خط ۵۵۲-۵۶۵): `OutboxPublisher.publish` با topic `insurance.knowledge.nba.executed`. `main.ts` (خط ۱۲-۲۸) — `OutboxWorker` پیکربندی شده. اما `updateArticle` (خط ۱۵۴-۱۷۳) و `deleteArticle` (خط ۱۷۵-۱۷۷) **هیچ event‌ای منتشر نمی‌کنند**.
- **وضعیت**: ⚠️ رد شد جزئی — event برای create و publish منتشر می‌شود، اما update و delete event ندارند. هیچ endpoint برای archive وجود ندارد.

### ۶.۵ عدم یکپارچه‌سازی با claims-service و policy-service برای context-aware NBA
- **اشکال**: NBA recommendations بر اساس `customerId` و `contextType` ایجاد می‌شوند اما مشخص نیست آیا knowledge-service از claims-service یا policy-service داده‌های context را دریافت می‌کند یا خیر. NBA باید بر اساس داده‌های واقعی claim یا policy تولید شود.
- **کد**: `knowledge.service.ts:createNba` (خط ۴۹۶-۵۲۴) — `trigger` و `customerId` از ورودی گرفته می‌شوند. هیچ integration با claims-service یا policy-service برای fetch داده‌های context وجود ندارد. `trigger` به صورت دستی set می‌شود (enum: `policy_renewal_due`، `claim_submitted`، ...). هیچ event consumer برای trigger خودکار (مثلاً وقتی claim submit می‌شود) تعریف نشده.
- **وضعیت**: ✅ تأیید شد

---

## ۷. نقایص جدید کشف‌شده در بررسی کد

### ۷.۱ عدم tenant isolation در NBA execute (نقص جدید)
- **اندپوینت**: `POST /knowledge/nba/:id/execute`
- **اشکال**: `executeNba` بر اساس `id` جستجو می‌کند بدون فیلتر tenant. یک کاربر می‌تواند NBA متعلق به tenant دیگر را execute کند.
- **کد**: `knowledge.service.ts:executeNba` (خط ۵۴۷) — `manager.findOne(NextBestAction, { where: { id } })` — بدون فیلتر `tenantId`. در مقابل، `getRecommendations` (خط ۵۳۲) به درستی `tenantId` فیلتر می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۲ عدم انتشار event برای update و delete article (نقص جدید)
- **اندپوینت**: `PUT /knowledge/articles/:id`، `DELETE /knowledge/articles/:id`
- **اشکال**: برخلاف create و publish که event منتشر می‌کنند، update و delete هیچ event‌ای منتشر نمی‌کنند. این باعث می‌شود سرویس‌های مصرف‌کننده از تغییرات مطلع نشوند.
- **کد**: `knowledge.service.ts:updateArticle` (خط ۱۵۴-۱۷۳) — هیچ `OutboxPublisher` استفاده نشده. `deleteArticle` (خط ۱۷۵-۱۷۷) — `this.articleRepo.delete({ id })` — هیچ event.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۳ عدم validation کامل ورودی‌ها (نقص جدید)
- **اندپوینت**: تمام اندپوینت‌های `POST` و `PUT`
- **اشکال**: هیچ `ValidationPipe` یا `class-validator` در کل سرویس استفاده نشده. body types به صورت inline TypeScript تعریف شده‌اند بدون runtime validation.
- **کد**: `main.ts` — هیچ `useGlobalPipes` پیکربندی نشده. `knowledge.controller.ts:createArticle` (خط ۱۷-۲۶) — inline body type. `createNba` (خط ۱۴۷) — `body: any`. جستجو در کل سرویس — هیچ `class-validator` یا `ValidationPipe` یافت نشد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۴ AbacGuard غیر مؤثر (نقص جدید)
- **اندپوینت**: تمام اندپوینت‌های `/knowledge/*`
- **اشکال**: AbacGuard برای GET requests همه کاربران authenticated را اجازه می‌دهد و برای state-changing operations فقط بررسی می‌کند که کاربر role داشته باشد. این ABAC واقعی نیست.
- **کد**: `abac.guard.ts` (خط ۱۴-۱۵) — `if (method === 'GET') return true`. (خط ۱۸-۲۶) — برای non-GET، admin roles بررسی می‌شوند، اما اگر کاربر هر role ای داشته باشد (`roles.length > 0`) مجاز است.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۵ متد listNbas وجود دارد اما endpoint ندارد (نقص جدید)
- **اشکال**: `listNbas` متد در service با pagination کامل (limit + offset) و فیلتر (tenantId، customerId، active) پیاده‌سازی شده، اما هیچ controller endpoint ای آن را expose نمی‌کند.
- **کد**: `knowledge.service.ts:listNbas` (خط ۵۷۰-۵۸۵) — متد کامل با pagination. `knowledge.controller.ts` (خط ۱-۱۷۰) — هیچ `@Get('nba')` یا `@Get('nba/list')` endpoint ای تعریف نشده.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۶ عدم validation برای category و status در search/list (نقص جدید)
- **اندپوینت**: `GET /knowledge/articles/search`، `GET /knowledge/articles`
- **اشکال**: `category` و `status` از query param گرفته می‌شوند و با `as ArticleCategory` و `as ArticleStatus` cast می‌شوند بدون هیچ validation. اگر کاربر مقدار نامعتبر بفرستد، query نتیجه غلط برمی‌گرداند.
- **کد**: `knowledge.controller.ts:searchArticles` (خط ۶۱-۶۳) — `category: query.category as ArticleCategory`، `status: query.status as ArticleStatus`. `listArticles` (خط ۱۳۱-۱۳۲) — همین. هیچ validation برای مقادیر enum.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۷ عدم tenant isolation در incrementViewCount (نقص جدید)
- **اندپوینت**: `GET /knowledge/articles/:id`
- **اشکال**: `incrementViewCount` بدون فیلتر tenant انجام می‌شود. یک کاربر می‌تواند view count article tenant دیگر را افزایش دهد.
- **کد**: `knowledge.service.ts:incrementViewCount` (خط ۱۵۰-۱۵۲) — `await this.articleRepo.increment({ id }, 'viewCount', 1)` — فقط `id` فیلتر می‌شود، بدون `tenantId`.
- **وضعیت**: ✅ تأیید شد (نقص جدید) — وابسته به نقص ۵.۱.

### ۷.۸ عدم endpoint برای archive article (نقص جدید)
- **اشکال**: `ArticleStatus.ARCHIVED` در enum تعریف شده اما هیچ endpoint ای برای archive کردن article وجود ندارد. article‌ها فقط می‌توانند draft یا published شوند.
- **کد**: `KnowledgeArticle.ts` (خط ۶) — `ARCHIVED = 'archived'` در enum. `knowledge.controller.ts` — هیچ `@Put('articles/:id/archive')` endpoint. `knowledge.service.ts` — هیچ متد `archiveArticle`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
