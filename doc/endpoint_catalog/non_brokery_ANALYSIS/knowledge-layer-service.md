# Knowledge Layer Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: knowledge-layer-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/knowledge-layer-service/src/`

---

## ۱. Indexing و Document Management

### ۱.۱ عدم bulk indexing
- **اندپوینت**: `POST /knowledge/index`
- **اشکال**: این اندپوینت فقط یک document را در هر درخواست index می‌کند. هیچ bulk indexing endpoint ای وجود ندارد. در سناریوهایی که نیاز به index کردن هزاران document (مثلاً migration یا batch import) وجود دارد، ارسال هزاران درخواست HTTP جداگانه بسیار ناکارآمد است. باید `POST /knowledge/index/bulk` با پشتیبانی از array of documents تعریف شود.
- **کد**: `knowledge-layer.controller.ts:indexDocument` (خط ۱۵-۲۰) — فقط یک `IndexDocumentParams` دریافت می‌کند. `knowledge-layer.service.ts:indexDocument` (خط ۶۳) — signature متد `async indexDocument(params: IndexDocumentParams): Promise<Document>` است و فقط یک document پردازش می‌کند. هیچ متد `indexDocuments` یا bulk variant وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم validation طول content و ورودی‌ها
- **اندپوینت**: `POST /knowledge/index`
- **اشکال**: فیلد `content` به صورت string آزاد ارسال می‌شود بدون هیچ محدودیت طول. یک document با content بسیار بزرگ می‌تواند باعث مصرف بیش از حد حافظه و افت عملکرد indexing شود. باید max content size validation تعریف شود. همچنین هیچ validation ای برای فیلدهای ضروری مانند `externalId`، `title`، `type` وجود ندارد.
- **کد**: `knowledge-layer.service.ts:IndexDocumentParams` (خط ۹-۲۱) — یک TypeScript interface ساده است بدون هیچ class-validator decorator (`@IsString`، `@IsNotEmpty`، `@MaxLength` و غیره). `main.ts` (خط ۷-۳۱) — هیچ `ValidationPipe` یا `useGlobalPipes` پیکربندی نشده است. `app.module.ts` — هیچ pipe ای ثبت نشده است. جستجو در کل سرویس نشان داد هیچ `class-validator` یا `ValidationPipe` استفاده نشده است.
- **وضعیت**: ✅ تأیید شد — عدم validation کامل نه فقط برای content بلکه برای تمام فیلدهای ورودی.

### ۱.۳ عدم deduplication هنگام indexing
- **اندپوینت**: `POST /knowledge/index`
- **اشکال**: اگر همان `externalId` و `tenantId` دوباره index شود، مشخص نیست آیا document جدید ایجاد می‌شود یا document قبلی update می‌شود. در صورت عدم deduplication، document‌های تکراری ایجاد می‌شوند که نتایج search را آلوده می‌کنند. باید upsert بر اساس `externalId` + `tenantId` انجام شود.
- **کد**: `knowledge-layer.service.ts:indexDocument` (خط ۶۷-۱۰۸) — کد در واقع upsert بر اساس `externalId` انجام می‌دهد: ابتدا `findOne({ where: { externalId: params.externalId } })` را بررسی می‌کند و اگر document موجود باشد، آن را update می‌کند (خط ۷۱-۱۰۸). اما مشکل اینجاست که entity `Document` (`entities/document.entity.ts`) هیچ ستون `tenantId` ندارد. بنابراین upsert فقط بر اساس `externalId` انجام می‌شود، نه `externalId + tenantId`. این یعنی دو tenant مختلف با همان `externalId` یک document را به اشتراک می‌گذارند.
- **وضعیت**: ⚠️ رد شد جزئی — upsert بر اساس `externalId` پیاده‌سازی شده، اما به دلیل نبود `tenantId` در entity، upsert بر اساس `externalId + tenantId` ممکن نیست. عدم `tenantId` در entity یک نقص بحرانی است (به ۳.۱ و نقص جدید ۷.۱ رجوع کنید).

### ۱.۴ عدم update endpoint برای document
- **اندپوینت**: (نبود `PUT /knowledge/documents/:id`)
- **اشکال**: هیچ اندپوینتی برای update یک document وجود ندارد. برای به‌روزرسانی content یا metadata یک document، باید آن را delete و دوباره index کرد که باعث از دست رفتن id و reindex کامل می‌شود. باید `PUT /knowledge/documents/:id` برای partial update تعریف شود.
- **کد**: `knowledge-layer.controller.ts` (خط ۱-۷۲) — هیچ `@Put` endpoint ای تعریف نشده است. با این حال، `POST /knowledge/index` با همان `externalId` به‌طور خودکار document موجود را update می‌کند (`knowledge-layer.service.ts:67-108`). اما این upsert بر اساس `externalId` است نه `id`، و فقط full update است نه partial update.
- **وضعیت**: ✅ تأیید شد — با توضیح که upsert از طریق `POST /knowledge/index` با همان `externalId` ممکن است، اما partial update بر اساس `id` وجود ندارد.

### ۱.۵ عدم soft delete برای document
- **اندپوینت**: `DELETE /knowledge/documents/:id`
- **اشکال**: delete به صورت hard delete (204 No Content) انجام می‌شود. هیچ soft delete یا archival ای وجود ندارد. در صورت حذف اشتباه، document قابل بازیابی نیست. باید soft delete با امکان restore تعریف شود.
- **کد**: `knowledge-layer.service.ts:deleteDocument` (خط ۴۱۷-۴۳۷) — `await manager.delete(DocumentChunk, { documentId: id })` و `await manager.delete(Document, { id })` — hard delete کامل. هیچ flag `deletedAt` یا `isDeleted` در entity `Document` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۶ عدم audit trail برای عملیات indexing و deletion
- **اندپوینت**: `POST /knowledge/index`، `DELETE /knowledge/documents/:id`
- **اشکال**: هیچ audit trail ای ثبت نمی‌شود که چه کسی، چه زمانی document را index یا delete کرده است. در سیستم knowledge management، audit trail برای compliance و troubleshooting الزامی است.
- **کد**: `knowledge-layer.service.ts` — `indexDocument` (خط ۸۹-۱۰۲) و `deleteDocument` (خط ۴۲۲-۴۳۵) از `OutboxPublisher` برای انتشار event‌های `KnowledgeDocumentIndexed`، `KnowledgeDocumentReindexed` و `KnowledgeDocumentDeleted` به Kafka استفاده می‌کنند. اما این event‌ها فقط `documentId`، `externalId`، `title` و `status` را شامل می‌شوند — هیچ اطلاعاتی درباره کاربر (`userId`)، timestamp دقیق عملیات، یا tenant انجام‌دهنده ثبت نمی‌شود. هیچ integration با `audit-service` وجود ندارد.
- **وضعیت**: ⚠️ رد شد جزئی — event notification از طریق Outbox pattern پیاده‌سازی شده، اما audit trail واقعی (ثبت کاربر، زمان، جزئیات عملیات) وجود ندارد.

---

## ۲. Search

### ۲.۱ عدم full-text search با ranking
- **اندپوینت**: `POST /knowledge/search`
- **اشکال**: search با `query`، `filters`، `limit` و `offset` انجام می‌شود اما مشخص نیست آیا full-text search با relevance ranking پشتیبانی می‌شود یا خیر. پاسخ فقط شامل `results` است بدون `score` یا `relevance`. در knowledge layer، ranking نتایج بر اساس relevance برای تجربه کاربری بهتر الزامی است.
- **کد**: `knowledge-layer.service.ts:search` (خط ۳۱۶-۳۷۸) — search در واقع semantic/vector search است: query embedding تولید می‌شود (`generateEmbeddings`، خط ۳۱۹)، سپس `cosineSimilarity` (خط ۳۸۱-۴۰۰) بین query embedding و document embeddings محاسبه می‌شود. نتایج شامل `score` (خط ۳۶۸) و per-chunk scores (خط ۳۵۲-۳۵۷) هستند و بر اساس score sort می‌شوند (خط ۳۷۷). اما این semantic search است نه traditional full-text keyword search. هیچ PostgreSQL `tsvector` یا ILIKE search وجود ندارد. برای جستجوهای keyword دقیق، semantic search ممکن است کافی نباشد.
- **وضعیت**: ⚠️ رد شد جزئی — ranking و score از طریق cosine similarity پیاده‌سازی شده است. اما traditional full-text keyword search وجود ندارد. نقص واقعی: عدم hybrid search (ترکیب keyword + semantic).

### ۲.۲ عدم faceted search
- **اندپوینت`: `POST /knowledge/search`
- **اشکال**: فیلد `filters` به صورت object آزاد تعریف شده اما هیچ faceted search ای وجود ندارد. کاربر نمی‌تواند ببیند چه category‌ها یا tag‌هایی در نتایج وجود دارند تا فیلتر کند. باید facets در response برگردانده شوند.
- **کد**: `knowledge-layer.service.ts:search` (خط ۳۱۶-۳۷۸) — response فقط شامل `SearchResult[]` است (خط ۳۷۸). هیچ facet یا aggregation در response وجود ندارد. `SearchParams` (خط ۲۳-۳۰) فیلترهای `type`، `tags`، `language` را دارد اما هیچ facet count برمی‌نگردد.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم highlighting در نتایج search
- **اندپوینت**: `POST /knowledge/search`
- **اشکال**: نتایج search بدون highlighting بخش‌های مطابق با query برمی‌گردند. highlighting برای اینکه کاربر ببیند چرا document در نتایج است، مهم است.
- **کد**: `knowledge-layer.service.ts:search` (خط ۳۶۰-۳۷۱) — `SearchResult` شامل `chunks` با `content`، `score`، `startPosition` و `endPosition` است. position اطلاعات موجود است اما هیچ highlighting (مثلاً `<mark>` tags) تولید نمی‌شود.
- **وضعیت**: ✅ تأیید شد — با توضیح که position اطلاعات chunk‌ها موجود است اما highlighting تولید نمی‌شود.

### ۲.۴ عدم search suggestions / autocomplete
- **اشکال**: هیچ اندپوینتی برای search suggestions یا autocomplete وجود ندارد. در تجربه search مدرن، autocomplete query برای بهبود سرعت و دقت search الزامی است.
- **کد**: `knowledge-layer.controller.ts` (خط ۱-۷۲) — هیچ endpoint برای suggestions یا autocomplete تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۵ عدم caching برای search results
- **اندپوینت**: `POST /knowledge/search`
- **اشکال**: هیچ caching ای برای query‌های مکرر وجود ندارد. اگر چند کاربر همان query را سرچ کنند، هر بار search از نو انجام می‌شود. باید cache بر اساس query hash + tenantId تعریف شود.
- **کد**: `knowledge-layer.service.ts:search` (خط ۳۱۶) — هر بار `generateEmbeddings` (API call خارجی) و `cosineSimilarity` برای تمام documents اجرا می‌شود. هیچ cache layer (Redis، in-memory) وجود ندارد. `main.ts` و `app.module.ts` — هیچ cache module پیکربندی نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۶ عدم validation limit در search
- **اندپوینت**: `POST /knowledge/search`
- **اشکال**: `limit` با default 10 تعریف شده اما max value برای `limit` مشخص نشده است. یک کاربر می‌تواند `limit` بسیار بزرگ بفرستد که باعث افت عملکرد شود. باید max limit (مثلاً 200) تعریف شود.
- **کد**: `knowledge-layer.service.ts:search` (خط ۳۷۸) — `results.slice(0, params.limit || 10)` بدون هیچ cap. در مقابل، `getDocuments` در controller (خط ۴۴) `Math.min(parseInt(params?.limit || '50', 10), 200)` دارد که limit را به 200 محدود می‌کند. اما `search` endpoint هیچ محدودیتی ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۷ عدم pagination در search (نقص جدید)
- **اندپوینت**: `POST /knowledge/search`
- **اشکال**: search فقط `limit` دارد اما `offset` برای pagination وجود ندارد. کاربر نمی‌تواند به صفحه بعدی نتایج دسترسی پیدا کند. فقط N نتیجه اول برمی‌گردد.
- **کد**: `knowledge-layer.service.ts:SearchParams` (خط ۲۳-۳۰) — فقط `limit` دارد، `offset` وجود ندارد. `search` (خط ۳۷۸) — `results.slice(0, params.limit || 10)` فقط از ابتدا slice می‌کند. در مقابل، `getDocuments` (خط ۴۶۶-۴۶۸) هم `limit` و هم `offset` دارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۲.۸ tags filter فقط اولین tag را بررسی می‌کند (نقص جدید)
- **اندپوینت**: `POST /knowledge/search`، `GET /knowledge/documents`
- **اشکال**: فیلتر tags فقط اولین tag در آرایه را بررسی می‌کند، نه تمام tag‌ها. اگر کاربر چند tag بفرستد، فقط اولین tag برای فیلتر استفاده می‌شود.
- **کد**: `knowledge-layer.service.ts:search` (خط ۳۳۴) — `queryBuilder.andWhere(':tag = ANY(doc.tags)', { tag: params.tags[0] })` — فقط `params.tags[0]` استفاده می‌شود. `getDocuments` (خط ۴۶۲) — همان مشکل: `queryBuilder.andWhere(':tag = ANY(doc.tags)', { tag: params.tags[0] })`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۳. Document Retrieval

### ۳.۱ عدم tenant isolation در document retrieval (نقص بحرانی)
- **اندپوینت**: `GET /knowledge/documents/:id`، `GET /knowledge/documents/external/:externalId`، `GET /knowledge/documents`، `DELETE /knowledge/documents/:id`، `POST /knowledge/documents/:id/reindex`
- **اشکال**: اگرچه TenantGuard استفاده می‌شود، اما `tenantId` در path یا query param وجود ندارد. مشخص نیست آیا TenantGuard به طور خودکار بررسی می‌کند که document متعلق به tenant کاربر است یا خیر. اگر نه، یک tenant می‌تواند document tenant دیگر را ببیند.
- **کد**: `entities/document.entity.ts` (خط ۱۹-۸۸) — entity `Document` هیچ ستون `tenantId` ندارد. `TenantGuard` (shared `tenant-guard.ts`) `request.tenantId` را از JWT token تنظیم می‌کند (خط ۷۱: `request.tenantId = userTenantId`)، اما سرویس هرگز از این مقدار استفاده نمی‌کند. `knowledge-layer.service.ts` — `getDocument` (خط ۴۰۳): `findOne({ where: { id } })` بدون فیلتر tenant. `getDocumentByExternalId` (خط ۴۱۰): `findOne({ where: { externalId } })` بدون فیلتر tenant. `getDocuments` (خط ۴۴۷): query builder بدون فیلتر tenant. `search` (خط ۳۲۲): query builder بدون فیلتر tenant. `deleteDocument` (خط ۴۱۸): `findOne({ where: { id } })` بدون فیلتر tenant. `reindexDocument` (خط ۴۷۵): `findOne({ where: { id } })` بدون فیلتر tenant. `indexDocument` (خط ۶۷): `findOne({ where: { externalId } })` بدون فیلتر tenant. در مقایسه، `knowledge-service` به درستی `tenantId` را در تمام query‌های خود فیلتر می‌کند (مثلاً `knowledge.service.ts:searchArticles` خط ۹۴: `tenantId: string` در params).
- **وضعیت**: ✅ تأیید شد — نقص بحرانی. تمام document‌ها بین تمام tenant‌ها به اشتراک گذاشته می‌شوند. هیچ tenant isolation ای در سطح داده وجود ندارد.

### ۳.۲ عدم versioning برای document
- **اندپوینت**: `GET /knowledge/documents/:id`
- **اشکال**: document فقط `indexedAt` دارد اما هیچ versioning ای وجود ندارد. اگر document reindex شود، نسخه قبلی از دست می‌رود. در knowledge management، version history برای audit و rollback الزامی است.
- **کد**: `entities/document.entity.ts` (خط ۶۷-۶۸) — `version: number` وجود دارد اما فقط یک عدد است، نه یک history. `knowledge-layer.service.ts:indexDocument` (خط ۸۲) — `existingDoc.version = params.version || existingDoc.version` — فقط عدد version override می‌شود. `reindexDocument` (خط ۴۸۰-۴۸۵) — document موجود overwrite می‌شود، نسخه قبلی ذخیره نمی‌شود. هیچ table یا relation برای version history وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم partial content retrieval
- **اندپوینت**: `GET /knowledge/documents/:id`
- **اشکال**: تمام content document برمی‌گردد. برای document‌های بزرگ، باید امکان partial retrieval (مثلاً با `range` header یا `fields` param) وجود داشته باشد تا فقط بخش مورد نیاز fetch شود.
- **کد**: `knowledge-layer.service.ts:getDocument` (خط ۴۰۳-۴۰۷) — `findOne({ where: { id }, relations: ['chunks'] })` — تمام document با تمام chunks و content برمی‌گردد. هیچ پارامتری برای partial retrieval یا field selection وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Reindex و Stats

### ۴.۱ عدم bulk reindex
- **اندپوینت**: `POST /knowledge/documents/:id/reindex`
- **اشکال**: reindex فقط برای یک document در هر درخواست انجام می‌شود. هیچ bulk reindex endpoint ای وجود ندارد. در صورت تغییر schema یا به‌روزرسانی indexing engine، باید بتوان تمام document‌ها را به طور انبوه reindex کرد. باید `POST /knowledge/reindex-all` یا `POST /knowledge/documents/bulk-reindex` تعریف شود.
- **کد**: `knowledge-layer.controller.ts:reindexDocument` (خط ۵۵-۶۰) — فقط یک `id` از path param دریافت می‌کند. `knowledge-layer.service.ts:reindexDocument` (خط ۴۷۴) — `async reindexDocument(id: string): Promise<Document>` — فقط یک document. هیچ متد bulk reindex وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم async processing برای reindex و indexing
- **اندپوینت**: `POST /knowledge/documents/:id/reindex`، `POST /knowledge/index`
- **اشکال**: reindex به صورت synchronous انجام می‌شود. برای document‌های بزرگ، reindex می‌تواند زمان‌بر باشد. باید async (job + status polling) تعریف شود.
- **کد**: `knowledge-layer.service.ts:reindexDocument` (خط ۴۷۴-۴۸۸) — `await this.processDocument(document)` به صورت synchronous فراخوانی می‌شود. `processDocument` (خط ۱۵۲-۲۰۱) — برای هر chunk، `await this.generateEmbeddings(chunk.content)` (API call خارجی) و `await this.chunkRepository.save` انجام می‌دهد. برای document‌های بزرگ با chunk‌های زیاد، این می‌تواند ثانیه‌ها تا دقیقه‌ها طول بکشد. `indexDocument` (خط ۱۰۶ و ۱۴۷) نیز `await this.processDocument(document)` را synchronous فراخوانی می‌کند. هیچ job queue یا async pattern وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم فیلتر در stats
- **اندپوینت**: `GET /knowledge/stats`
- **اشکال**: stats فقط شامل `totalDocuments`، `indexedDocuments`، `tenants` و `lastIndexedAt` است. هیچ فیلتری بر اساس tenantId یا بازه زمانی وجود ندارد. در multi-tenant، هر tenant باید stats خود را ببیند.
- **کد**: `knowledge-layer.controller.ts:getStats` (خط ۶۲-۶۶) — هیچ query param دریافت نمی‌کند. `knowledge-layer.service.ts:getStats` (خط ۴۹۰-۵۳۵) — `this.documentRepository.count()` و `this.documentRepository.count({ where: { status: ... } })` — global count بدون هیچ فیلتر tenant یا زمان. نکته: stats واقعی با catalog مطابقت ندارد — شامل `totalDocuments`، `indexedDocuments`، `pendingDocuments`، `failedDocuments`، `documentsByType`، `documentsByLanguage` است (نه `tenants` و `lastIndexedAt` که catalog ادعا می‌کند).
- **وضعیت**: ✅ تأیید شد — با توضیح که stats واقعی با catalog مطابقت ندارد.

### ۴.۴ عدم detailed stats
- **اندپوینت**: `GET /knowledge/stats`
- **اشکال**: stats بسیار کلی است. باید شامل جزئیات مانند distribution by category، index size، average document size، search latency و error rate باشد.
- **کد**: `knowledge-layer.service.ts:getStats` (خط ۴۹۰-۵۳۵) — فقط count‌های کلی (total، indexed، pending، failed)، breakdown by type و breakdown by language. هیچ metric برای index size، average document size، search latency، error rate یا indexing throughput وجود ندارد.
- **وضعیت**: ✅ تأیید شد — با توضیح که breakdown by type و by language پیاده‌سازی شده، اما metric‌های عملکردی وجود ندارد.

---

## ۵. مسائل امنیتی و یکپارچه‌سازی

### ۵.۱ عدم rate limiting در indexing
- **اندپوینت**: `POST /knowledge/index`
- **اشکال**: هیچ rate limiting ای برای indexing وجود ندارد. یک کاربر می‌تواند به طور مکرر document index کند و منابع indexing را اشغال کند.
- **کد**: `main.ts` (خط ۷-۳۱) — هیچ `ThrottlerModule` یا rate limiting middleware پیکربندی نشده است. `app.module.ts` — هیچ throttle module ای import نشده است.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم rate limiting در search
- **اندپوینت**: `POST /knowledge/search`
- **اشکال**: هیچ rate limiting ای برای search وجود ندارد. یک کاربر می‌تواند query‌های مکرر بفرستد و بار سرچ را افزایش دهد.
- **کد**: همانند ۵.۱ — هیچ rate limiting در سطح سرویس پیکربندی نشده است. `search` متد (خط ۳۱۶) هر بار `generateEmbeddings` (API call خارجی) را فراخوانی می‌کند که هزینه و latency دارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم یکپارچه‌سازی با knowledge-service
- **اشکال**: knowledge-service (articles) و knowledge-layer-service (document indexing/search) هر دو base path `/knowledge` دارند. این تداخل مسیر می‌تواند در routing gateway باعث مشکل شود. همچنین مشخص نیست آیا knowledge-service از knowledge-layer-service برای indexing articles استفاده می‌کند یا خیر. یکپارچه‌سازی باید صریح باشد.
- **کد**: جستجو در `knowledge-service/src` برای `knowledge-layer` یا `knowledge/index` یا `knowledge/search` — هیچ نتیجه‌ای یافت نشد. knowledge-service دارای search خود است (`knowledge.service.ts:searchArticles` خط ۹۳ با full-text search PostgreSQL `tsvector` و `searchEntities` خط ۳۸۴ با semantic search برای knowledge graph entities). knowledge-service به درستی `tenantId` را در تمام query‌های خود فیلتر می‌کند. هیچ integration ای بین دو سرویس وجود ندارد. تداخل base path `/knowledge` در gateway می‌تواند مشکل‌ساز شود.
- **وضعیت**: ✅ تأیید شد — هم تداخل مسیر و هم عدم integration تأیید شد. نکته: knowledge-service tenant isolation دارد اما knowledge-layer-service ندارد.

### ۵.۴ عدم یکپارچه‌سازی با copilot-service برای RAG
- **اشکال**: copilot-service در توضیحات purpose به RAG اشاره دارد اما هیچ اندپوینتی در copilot-service برای RAG با knowledge-layer-service وجود ندارد. copilot-service باید از knowledge-layer-service برای retrieval در RAG استفاده کند اما این یکپارچه‌سازی تعریف نشده است.
- **کد**: `copilot-service/src/rag/rag.service.ts:retrieveAndGenerate` (خط ۴۱-۱۰۵) — از `EcosystemAiProvider.consult` (ecosystem AI gateway) یا fallback به `LLMService.generate` استفاده می‌کند. هیچ reference ای به `knowledge-layer-service` یا `POST /knowledge/search` وجود ندارد. جستجو در `copilot-service/src` برای `knowledge-layer` یا `knowledge/search` — هیچ نتیجه‌ای یافت نشد. copilot-service به جای استفاده از knowledge-layer-service برای retrieval، از ecosystem AI gateway یا inline context استفاده می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۵.۵ ~~عدم vector search / semantic search~~
- **اندپوینت**: `POST /knowledge/search`
- ~~**اشکال**: search فقط keyword-based به نظر می‌رسد. در AI & Knowledge group، vector search یا semantic search برای پیدا کردن document‌های معنادار (نه فقط keyword match) الزامی است. باید embedding-based search پشتیبانی شود.~~
- **کد**: `knowledge-layer.service.ts:search` (خط ۳۱۶-۳۷۸) — search در واقع semantic/vector search است: `generateEmbeddings(params.query)` (خط ۳۱۹) query embedding تولید می‌کند، سپس `cosineSimilarity(queryEmbedding, document.embeddings)` (خط ۳۴۵) شباهت را محاسبه می‌کند. per-chunk embeddings نیز تولید و مقایسه می‌شوند (خط ۳۵۲-۳۵۷). `generateEmbeddings` (خط ۲۵۱-۲۹۱) از real embedding API (با fallback به mock) استفاده می‌کند. `Document` entity (خط ۵۳) و `DocumentChunk` entity (خط ۲۳) هر دو ستون `embeddings: number[]` دارند.
- **وضعیت**: ❌ رد شد — vector/semantic search با embeddings و cosine similarity به طور کامل پیاده‌سازی شده است.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم دسترسی copilot-service به search endpoint
- **اشکال**: copilot-service برای RAG به search نیاز دارد اما هیچ integration صریحی بین copilot-service و knowledge-layer-service تعریف نشده است. copilot-service باید بتواند از `POST /knowledge/search` برای retrieval استفاده کند.
- **کد**: همانند ۵.۴ — `copilot-service/src/rag/rag.service.ts` هیچ reference ای به knowledge-layer-service ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم دسترسی document-service به index endpoint
- **اشکال**: document-service باید document‌های خود را در knowledge-layer-service index کند تا قابل search باشند اما هیچ integration صریحی تعریف نشده است. باید event-driven indexing (مثلاً وقتی document در document-service ایجاد می‌شود، به طور خودکار در knowledge-layer-service index شود) تعریف شود.
- **کد**: هیچ integration ای بین document-service و knowledge-layer-service یافت نشد. `knowledge-layer.service.ts:indexDocument` از `OutboxPublisher` برای انتشار event استفاده می‌کند اما هیچ consumer برای event‌های document-service تعریف نشده است.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ ~~عدم notification در صورت تغییر document~~
- ~~**اشکال**: وقتی document در knowledge-layer-service reindex یا delete می‌شود، هیچ event یا notification ای به سرویس‌های مصرف‌کننده (مانند copilot-service یا knowledge-service) ارسال نمی‌شود. این باعث می‌شود سرویس‌های دیگر با داده stale کار کنند.~~
- **کد**: `knowledge-layer.service.ts` — `indexDocument` (خط ۸۹-۱۰۲): `OutboxPublisher.publish` با topic `insurance.knowledge.document.indexed`. `indexDocument` update path (خط ۹۰-۱۰۲): `OutboxPublisher.publish` با topic `insurance.knowledge.document.reindexed`. `deleteDocument` (خط ۴۲۲-۴۳۵): `OutboxPublisher.publish` با topic `insurance.knowledge.document.deleted`. `main.ts` (خط ۱۳-۲۸) — `OutboxWorker` پیکربندی شده که event‌ها را از outbox table به Kafka منتقل می‌کند.
- **وضعیت**: ❌ رد شد — event notification از طریق Outbox pattern به Kafka پیاده‌سازی شده است.

### ۶.۴ ~~عدم multi-language support~~
- ~~**اشکال**: هیچ پارامتری برای language در indexing یا search وجود ندارد. در سیستم بیمه ایران، document‌ها ممکن است فارسی یا انگلیسی باشند و search باید از هر دو زبان پشتیبانی کند.~~
- **کد**: `knowledge-layer.service.ts:IndexDocumentParams` (خط ۱۶) — `language?: string` وجود دارد. `knowledge-layer.service.ts:indexDocument` (خط ۱۲۱) — `language: params.language || 'fa'` (default فارسی). `entities/document.entity.ts` (خط ۵۸-۵۹) — `language: string` ستون وجود دارد. `SearchParams` (خط ۲۷) — `language?: string` برای فیلتر. `search` (خط ۳۲۹-۳۳۱) — `if (params.language) { queryBuilder.andWhere('doc.language = :language', { language: params.language }) }`. `getDocuments` (خط ۴۵۷-۴۵۹) — همان فیلتر. `getStats` (خط ۵۱۹-۵۲۵) — `documentsByLanguage` breakdown.
- **وضعیت**: ❌ رد شد — multi-language support به طور کامل پیاده‌سازی شده است.

---

## ۷. نقایص جدید کشف‌شده در بررسی کد

### ۷.۱ عدم tenantId در Document entity (نقص بحرانی جدید)
- **اندپوینت**: تمام اندپوینت‌های `/knowledge/*`
- **اشکال**: entity `Document` هیچ ستون `tenantId` ندارد. این یعنی تمام document‌ها بین تمام tenant‌ها به اشتراک گذاشته می‌شوند. TenantGuard `request.tenantId` را تنظیم می‌کند اما سرویس هرگز از آن استفاده نمی‌کند. این یک نقص امنیتی بحرانی است که باعث data leak بین tenant‌ها می‌شود.
- **کد**: `entities/document.entity.ts` (خط ۱۹-۸۸) — هیچ `@Column` برای `tenantId` وجود ندارد. مقایسه با `knowledge-service` که در تمام query‌های خود `tenantId` را فیلتر می‌کند (مثلاً `knowledge.service.ts:searchArticles` خط ۹۴). `TenantGuard` (shared) `request.tenantId` را در خط ۷۱ تنظیم می‌کند اما هیچ کد در `knowledge-layer.service.ts` از `request.tenantId` استفاده نمی‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید بحرانی) — این نقص ریشه تمام مشکلات tenant isolation در این سرویس است.

### ۷.۲ fallback به mock embeddings در production (نقص جدید)
- **اندپوینت**: `POST /knowledge/index`، `POST /knowledge/search`
- **اشکال**: اگر `EMBEDDING_API_URL` تنظیم نشده باشد یا API call ناموفق باشد، سرویس به mock embeddings (random seeded) fallback می‌کند. این یعنی در production بدون تنظیمات صحیح، search quality به شدت افت می‌کند چون embeddings تصادفی معنادار نیستند.
- **کد**: `knowledge-layer.service.ts:generateEmbeddings` (خط ۲۵۶-۲۵۹) — `if (!embeddingApiUrl) { this.logger.warn('...'); return this.generateMockEmbeddings(content, embeddingSize) }`. همچنین (خط ۲۸۸-۲۹۰) — در catch block: `return this.generateMockEmbeddings(content, embeddingSize)`. `generateMockEmbeddings` (خط ۲۹۳-۳۰۷) — با `seededRandom` یک hash از content تولید می‌کند و embedding تصادعی می‌سازد که هیچ معنای semantic ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید) — fallback به mock باید فقط در development mode فعال باشد، نه production.

### ۷.۳ عدم timeout در embedding API call (نقص جدید)
- **اندپوینت**: `POST /knowledge/index`، `POST /knowledge/search`
- **اشکال**: `generateEmbeddings` از `fetch` بدون timeout استفاده می‌کند. اگر embedding API کند باشد، request به طور نامحدود معلق می‌ماند.
- **کد**: `knowledge-layer.service.ts:generateEmbeddings` (خط ۲۶۲-۲۷۴) — `const response = await fetch(embeddingApiUrl, { method: 'POST', ... })` — هیچ `AbortController` یا `signal` برای timeout وجود ندارد. در مقایسه، `copilot-service/src/llm.service.ts:httpPost` (خط ۱۰۱) timeout ۳۰۰۰۰-۶۰۰۰۰ms دارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۴ N+1 query در search (نقص جدید)
- **اندپوینت**: `POST /knowledge/search`
- **اشکال**: search تمام document‌های matching را fetch می‌کند، سپس برای هر document، chunks را جداگانه query می‌کند. این N+1 query problem است که برای تعداد زیاد document‌ها باعث افت عملکرد می‌شود.
- **کد**: `knowledge-layer.service.ts:search` (خط ۳۳۷) — `const documents = await queryBuilder.getMany()` تمام document‌ها را fetch می‌کند. سپس (خط ۳۴۸-۳۵۰) — `const chunks = await this.chunkRepository.find({ where: { documentId: document.id } })` برای هر document جداگانه در حلقه. باید با `relations` یا `leftJoin` در یک query انجام شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۵ عدم tenant isolation در stats (نقص جدید)
- **اندپوینت**: `GET /knowledge/stats`
- **اشکال**: stats global است و tenant فیلتر نمی‌شود. در multi-tenant، هر tenant باید stats خود را ببیند، نه stats کل سیستم.
- **کد**: `knowledge-layer.service.ts:getStats` (خط ۴۹۸-۵۰۳) — `this.documentRepository.count()` و `this.documentRepository.count({ where: { status: ... } })` — global count بدون فیلتر tenant. ریشه این مشکل همان عدم `tenantId` در entity است (نقص ۷.۱).
- **وضعیت**: ✅ تأیید شد (نقص جدید) — وابسته به نقص ۷.۱.

### ۷.۶ عدم AbacGuard مؤثر (نقص جدید)
- **اندپوینت**: تمام اندپوینت‌های `/knowledge/*`
- **اشکال**: `AbacGuard` برای GET requests همه کاربران authenticated را اجازه می‌دهد و برای state-changing operations فقط بررسی می‌کند که کاربر role داشته باشد. این ABAC واقعی نیست و policy‌های مبتنی بر attribute را اعمال نمی‌کند.
- **کد**: `abac.guard.ts` (خط ۱۴-۱۵) — `if (method === 'GET') return true` — تمام GET requests برای همه کاربران authenticated مجاز است. (خط ۱۸-۲۶) — برای non-GET، admin roles بررسی می‌شوند، اما اگر کاربر هر role ای داشته باشد (`roles.length > 0`) مجاز است. این عملاً هیچ کنترل دسترسی مبتنی بر attribute انجام نمی‌دهد.
- **وضعیت**: ✅ تأیید شد (نقص جدید) — AbacGuard به طور مؤثر پیاده‌سازی نشده است.

### ۷.۷ عدم error handling برای document not found در getDocument و getDocumentByExternalId (نقص جدید)
- **اندپوینت**: `GET /knowledge/documents/:id`، `GET /knowledge/documents/external/:externalId`
- **اشکال**: اگر document با id یا externalId داده شده یافت نشود، `findOne` برمی‌گردد `null` و سرویس `null` را برمی‌گرداند بدون خطای 404. این می‌تواند باعث رفتار غیرمنتظره در client شود.
- **کد**: `knowledge-layer.service.ts:getDocument` (خط ۴۰۳-۴۰۷) — `return this.documentRepository.findOne(...)` — اگر یافت نشود، `null` برمی‌گردد بدون throw کردن `NotFoundException`. `getDocumentByExternalId` (خط ۴۱۰-۴۱۴) — همان مشکل. در مقایسه، `reindexDocument` (خط ۴۷۶-۴۷۸) به درستی `throw new Error('Document not found')` می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۸ عدم validation برای type در indexing (نقص جدید)
- **اندپوینت**: `POST /knowledge/index`
- **اشکال**: فیلد `type` باید یکی از مقادیر enum `DocumentType` باشد، اما هیچ validation ای در سطح API انجام نمی‌شود. اگر کاربر مقدار نامعتبر بفرستد، database error رخ می‌دهد.
- **کد**: `knowledge-layer.service.ts:IndexDocumentParams` (خط ۱۴) — `type: DocumentType` فقط در TypeScript level تایپ‌دهی شده، اما در runtime هیچ validation انجام نمی‌شود (نبود `ValidationPipe` و `class-validator`). `entities/document.entity.ts` (خط ۳۶-۳۹) — `@Column({ type: 'enum', enum: DocumentType })` — اگر مقدار نامعتبر بفرستد، PostgreSQL error می‌دهد.
- **وضعیت**: ✅ تأیید شد (نقص جدید) — وابسته به عدم validation کلی (نقص ۱.۲).
