# Outbox Relay — تحلیل نقایص اندپوینت‌ها

**سرویس**: outbox-relay  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/outbox-relay/src/`

---

## ۱. Health Check و Observability

### ۱.۱ عدم تفکیک عمق health check
- **اندپوینت**: `GET /health`
- **اشکال**: health check فقط `db` و `kafka` را چک می‌کند. هیچ چکی برای lag (تعداد event‌های pending در outbox)، DLQ size یا processing throughput وجود ندارد. یک health check که lag ۱۰۰۰۰ event داشته باشد اما db و kafka ok باشند، status `ok` برمی‌گرداند که گمراه‌کننده است.
- **کد**: `index.ts:isHealthy` (سطر ۸۱-۸۶) — `return { db: this.dataSource.isInitialized, kafka: this.isRunning }`. health server (سطر ۲۹۹-۳۱۶) — `const health = relay.isHealthy(); components.db = health.db ? 'ok' : 'error'; components.kafka = health.kafka ? 'ok' : 'error'`. هیچ query برای count pending events یا DLQ size انجام نمی‌شود. `this.isRunning` فقط یک boolean است که در `start()` (سطر ۷۲) `true` می‌شود و در `stop()` (سطر ۹۰) `false` — یعنی فقط چک می‌کند آیا process در حال اجراست، نه آیا Kafka واقعاً reachable است.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم metrics endpoint
- **اندپوینت**: `GET /health`
- **اشکال**: هیچ `/metrics` endpoint‌ای برای Prometheus یا monitoring وجود ندارد. metrics کلیدی مانند events published/sec، retry count، DLQ size، average processing time قابل دسترسی نیست. operations team باید از logs استخراج کند که ناکارآمد است.
- **کد**: `index.ts` (سطر ۲۹۹-۳۱۶) — health server فقط `/health` route را handle می‌کند، همه چیز دیگر `404` برمی‌گرداند (سطر ۳۱۲-۳۱۴). هیچ `/metrics` endpoint وجود ندارد. `publishOne` (سطر ۱۵۵-۲۶۴) — `this.logger.info('Outbox event relayed', { eventId, topic, lagMs, correlationId })` (سطر ۲۰۰) — metrics فقط در logs نوشته می‌شوند، نه در یک Prometheus endpoint.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم readiness vs liveness separation
- **اندپوینت**: `GET /health`
- **اشکال**: فقط یک health endpoint وجود دارد. در Kubernetes، باید `/health/live` (آیا process زنده است) و `/health/ready` (آیا آماده دریافت traffic است) جدا باشند. اگر kafka down باشد، liveness باید ok باشد اما readiness باید fail (چون نمی‌تواند event publish کند).
- **کد**: `index.ts` (سطر ۲۹۹-۳۱۶) — فقط `if (req.url === '/health')` handle می‌شود. هیچ `/health/live` یا `/health/ready` وجود ندارد. `isHealthy()` (سطر ۸۱-۸۶) — یک boolean برای db و kafka برمی‌گرداند. اگر kafka `false` باشد، `status = 'degraded'` و HTTP 503 برمی‌گرداند (سطر ۳۰۹) که هم liveness و هم readiness را fail می‌کند.
- **وضعیت**: ✅ تأیید شد

---

## ۲. مدیریت DLQ و Retry

### ۲.۱ عدم endpoint برای inspect DLQ
- **اندپوینت**: `GET /health` (تنها endpoint)
- **اشکال**: DLQ در `dead_letter_queue` table ذخیره می‌شود اما هیچ REST endpoint‌ای برای inspect، list یا search DLQ events وجود ندارد. operations team باید مستقیماً به DB query بزند که خطرناک و غیرعملیاتی است. حداقل `GET /dlq/events` با pagination و فیلتر نیاز است.
- **کد**: `index.ts` (سطر ۲۹۹-۳۱۶) — health server فقط `/health` را handle می‌کند. `dlqRepo` (سطر ۶۶) — `this.dlqRepo = this.dataSource.getRepository(DeadLetterEvent)` تعریف شده اما فقط در `publishOne` (سطر ۲۲۹-۲۵۷) برای write استفاده می‌شود. هیچ read endpoint برای DLQ وجود ندارد. `DeadLetterEvent` entity (`packages/shared/src/events/DeadLetterEvent.ts` سطر ۷-۶۴) — index‌های `['topic', 'status']`، `['retryCount', 'nextRetryAt']`، `['createdAt']` دارد که نشان می‌دهد query طراحی شده اما endpoint پیاده‌سازی نشده. توجه: orchestrator-service یک `DlqController` دارد که DLQ inspect و resolve را فراهم می‌کند، اما outbox-relay خودش هیچ DLQ endpoint ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم endpoint برای replay DLQ events
- **اندپوینت**: `GET /health`
- **اشکال**: DLQ events قابل "manual inspection and retried" هستند (طبق کاتالوگ) اما هیچ endpoint‌ای برای replay/retry یک DLQ event وجود ندارد. باید `POST /dlq/events/:eventId/replay` وجود داشته باشد تا event از DLQ به outbox برگردد و retry شود.
- **کد**: `index.ts` — هیچ endpoint برای replay وجود ندارد. `DeadLetterEvent` entity (سطر ۵۰-۵۱) — `status: 'pending' | 'retrying' | 'failed' | 'resolved'` و `nextRetryAt` (سطر ۵۳) وجود دارد اما هیچ کدی برای replay استفاده نمی‌کند. `publishOne` (سطر ۲۲۴-۲۶۱) — وقتی event fail می‌شود، DLQ entry ایجاد می‌کند با `status: 'failed'` و `nextRetryAt: null` (سطر ۲۵۲-۲۵۳) — یعنی هیچ retry خودکار برای DLQ events وجود ندارد. orchestrator-service یک `POST /dlq/:dlqId/resolve` دارد اما outbox-relay خودش ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ عدم endpoint برای delete/archive DLQ events
- **اندپوینت**: `GET /health`
- **اشکال**: DLQ events برای همیشه باقی می‌مانند. هیچ endpoint‌ای برای delete یا archive (پس از بررسی و resolve) وجود ندارد. این باعث رشد نامحدود DLQ table می‌شود.
- **کد**: `index.ts` — هیچ delete/archive endpoint وجود ندارد. `DeadLetterEvent` entity (سطر ۵۹-۶۰) — `resolvedAt` field وجود دارد که می‌تواند برای archive استفاده شود، اما هیچ کدی آن را set نمی‌کند (در `publishOne` سطر ۲۵۴: `resolvedAt: null`). هیچ cron job یا cleanup process برای DLQ وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ عدم alerting روی DLQ size
- **اندپوینت**: `GET /health`
- **اشکال**: اگر event‌ها به DLQ منتقل شوند، هیچ alerting‌ای وجود ندارد. operations team باید خودش DLQ را monitor کند. alerting روی DLQ size (مثلاً > 10 events) ضروری است.
- **کد**: `index.ts:publishOne` (سطر ۲۲۵) — `this.logger.error('Outbox event permanently failed', ...)` — فقط log می‌کند. هیچ alert یا notification ارسال نمی‌شود. هیچ threshold check برای DLQ size وجود ندارد. `processBatch` (سطر ۱۲۰-۱۵۳) — هیچ count query برای DLQ size وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Configuration و Operational Control

### ۳.۱ عدم endpoint برای runtime configuration
- **اندپوینت**: `GET /health`
- **اشکال**: تمام configuration از environment variables انجام می‌شود (`POLL_INTERVAL_MS`، `BATCH_SIZE`، `MAX_ATTEMPTS`). هیچ endpoint‌ای برای runtime reconfiguration وجود ندارد. برای تغییر poll interval یا batch size، باید restart شود که downtime ایجاد می‌کند.
- **کد**: `index.ts` (سطر ۲۶۸-۲۸۵) — `const relay = new OutboxRelay({ ... pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '1000', 10), batchSize: parseInt(process.env.BATCH_SIZE || '100', 10), maxAttempts: parseInt(process.env.MAX_ATTEMPTS || '10', 10) ... })`. همه config در startup time از env vars خوانده می‌شود و در `this.config` ذخیره می‌شود. `poll` (سطر ۱۰۶-۱۱۸) — `this.config.pollIntervalMs` استفاده می‌کند. هیچ endpoint برای تغییر `this.config` در runtime وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ عدم pause/resume processing
- **اندپوینت**: `GET /health`
- **اشکال**: هیچ endpoint‌ای برای pause (توقف موقت processing) و resume وجود ندارد. اگر Kafka down باشد یا maintenance لازم باشد، باید process kill شود. یک `POST /admin/pause` و `POST /admin/resume` برای operational control ضروری است.
- **کد**: `index.ts` — `this.isRunning` (سطر ۳۴) یک private boolean است که در `start()` (سطر ۷۲) `true` و در `stop()` (سطر ۹۰) `false` می‌شود. `poll` (سطر ۱۰۷) — `if (!this.isRunning) return`. هیچ HTTP endpoint برای set کردن `isRunning` وجود ندارد. `stop()` (سطر ۸۸-۱۰۰) — producer disconnect و dataSource destroy می‌کند که کامل shutdown است، نه pause.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ عدم graceful drain endpoint
- **اندپوینت**: `GET /health`
- **اشکال**: graceful shutdown روی SIGTERM/SIGINT وجود دارد اما هیچ HTTP endpoint‌ای برای drain (پردازش تمام pending events قبل از shutdown) وجود ندارد. در Kubernetes rolling update، drain endpoint بهتر از signal است.
- **کد**: `index.ts` (سطر ۳۲۲-۳۳۸) — `process.on('SIGTERM', ...)` و `process.on('SIGINT', ...)` — `relay.stop()` را فراخوانی می‌کنند. `stop()` (سطر ۸۸-۱۰۰) — `this.isRunning = false`، `clearTimeout(this.timer)`، `await this.producer.disconnect()`، `await this.dataSource.destroy()`. هیچ drain logic وجود ندارد — pending events در outbox باقی می‌مانند و در restart بعدی پردازش می‌شوند. هیچ HTTP endpoint برای drain وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۴. امنیت

### ۴.۱ عدم authentication روی admin endpoints
- **اندپوینت**: `GET /health`
- **اشکال**: health check public است که درست است. اما اگر admin endpoints (DLQ inspect، replay، pause) اضافه شوند، باید authentication و authorization داشته باشند. هیچ auth framework‌ای در سرویس تعریف نشده که نشان می‌دهد admin endpoints اگر اضافه شوند، unprotected خواهند بود.
- **کد**: `index.ts` (سطر ۲۹۹-۳۱۶) — health server با `createServer` ایجاد شده، بدون هیچ auth middleware. هیچ JWT validation، no API key check، no rate limiting. اگر endpoint‌های admin اضافه شوند، در همین `createServer` callback باید auth اضافه شود که در حال حاضر هیچ infrastructure‌ای برای آن وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ عدم mTLS برای Kafka connection
- **اندپوینت**: `GET /health`
- **اشکال**: `KAFKA_BROKERS` فقط host:port است. هیچ اشاره‌ای به TLS/mTLS configuration برای Kafka connection وجود ندارد. در production، Kafka connection باید mTLS داشته باشد. environment variables برای SSL cert/key وجود ندارد.
- **کد**: `index.ts` (سطر ۴۴-۵۱) — `this.kafka = new Kafka({ clientId: config.kafkaConfig.clientId, brokers: config.kafkaConfig.brokers, retry: { initialRetryTime: 1000, retries: 5 } })`. هیچ `ssl` یا `sasl` configuration وجود ندارد. `config.kafkaConfig` (سطر ۱۵-۱۸) — فقط `brokers` و `clientId`. هیچ env var برای `KAFKA_SSL_CA`، `KAFKA_SSL_CERT`، `KAFKA_SSL_KEY` یا `KAFKA_SASL_*` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم credential management برای DB
- **اندپوینت**: `GET /health`
- **اشکال**: `DB_PASSWORD` به‌صورت plaintext environment variable است. هیچ اشاره‌ای به secret manager (Vault، AWS Secrets Manager) وجود ندارد. password در environment leak-prone است.
- **کد**: `index.ts` (سطر ۲۷۳) — `password: process.env.DB_PASSWORD || 'postgres'`. plaintext env var با default `'postgres'`. هیچ integration با secret manager وجود ندارد. `createDataSource` (سطر ۵۴) — `this.dataSource = createDataSource({ ...config.dbConfig, entities: [...], synchronize: false })`.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Event Reliability و Correctness

### ۵.۱ عدم exactly-once delivery guarantee
- **اندپوینت**: `GET /health`
- **اشکال**: کاتالوگ می‌نویسد "at-least-once delivery". این یعنی consumer‌ها باید idempotent باشند. اما هیچ مکانیزمی برای tracking delivered events (مثلاً event ID در consumer) وجود ندارد. اگر consumer idempotent نباشد، duplicate events به side effects منجر می‌شود.
- **کد**: `index.ts:publishOne` (سطر ۱۵۵-۲۶۴) — `await this.producer.send({ topic: event.topic, messages: [{ key: partitionKey, value: JSON.stringify(envelope) }] })` (سطر ۱۸۱-۱۹۶). سپس `await manager.query("UPDATE outbox_events SET status='sent' WHERE id=$1", [event.id])` (سطر ۱۹۸). اگر `producer.send` موفق شود اما `UPDATE` fail (مثلاً DB connection drop)، event دوباره در batch بعدی پردازش می‌شود و duplicate به Kafka می‌رود. این at-least-once است. هیچ `idempotency-key` header در Kafka message وجود ندارد که consumer بتواند dedupe کند. envelope شامل `eventId` (سطر ۱۶۹) است که consumer می‌تواند برای dedupe استفاده کند، اما این به consumer بستگی دارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم event ordering guarantee
- **اندپوینت**: `GET /health`
- **اشکال**: partition key از `claimId`، `policyId` یا `fraudCaseId` استفاده می‌کند. این ordering را per key تضمین می‌کند اما اگر batch processing باشد و event‌های مختلف در یک batch باشند، ordering بین keys حفظ نمی‌شود. برای saga‌هایی که به ordering وابسته‌اند، این مشکل‌ساز است.
- **کد**: `index.ts:publishOne` (سطر ۱۵۹) — `const partitionKey = subject.claimId || subject.policyId || subject.fraudCaseId || event.id`. `processBatch` (سطر ۱۲۴-۱۳۵) — `SELECT id FROM outbox_events WHERE status = 'pending' AND attempt_count < $1 ORDER BY occurred_at ASC FOR UPDATE SKIP LOCKED LIMIT $2` — events به ترتیب `occurred_at` fetch می‌شوند. `for (const ev of events) { await this.publishOne(manager, ev) }` (سطر ۱۴۹-۱۵۱) — به ترتیب publish می‌شوند. Kafka ordering per partition key تضمین شده، اما event‌های با partition key‌های مختلف ممکن است به partition‌های مختلف بروند و ordering بین آن‌ها تضمین نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ عدم dead letter sink alternative
- **اندپوینت**: `GET /health`
- **اشکال**: DLQ در database است. اگر خود database down باشد، event‌های fail شده کجا می‌روند؟ هیچ alternative sink (مثلاً file-based یا secondary DLQ) وجود ندارد. single point of failure است.
- **کد**: `index.ts:publishOne` (سطر ۲۲۸-۲۶۰) — `const dlq = this.dlqRepo.create({ ... })` و `await manager.getRepository(DeadLetterEvent).save(dlq)` (سطر ۲۵۷). این در همان transaction با outbox update است. اگر DB down باشد، کل transaction fail می‌شود و event در outbox با `status='pending'` باقی می‌ماند. هیچ alternative sink وجود ندارد. `catch (dlqErr)` (سطر ۲۵۸) — فقط log می‌کند: `this.logger.error('Failed to persist outbox DLQ entry', ...)` — اگر DLQ write fail شود، event lost می‌شود (status در outbox به `failed` تغییر کرده اما DLQ entry ذخیره نشده).
- **وضعیت**: ✅ تأیید شد

### ۵.۴ عدم backpressure mechanism
- **اندپوینت**: `GET /health`
- **اشکال**: outbox-relay با `BATCH_SIZE` 100 و `POLL_INTERVAL_MS` 1000 پردازش می‌کند. اگر Kafka slow باشد یا down باشد، events در outbox انباشته می‌شوند. هیچ backpressure mechanism‌ای برای توقف producer‌ها (سرویس‌هایی که outbox write می‌کنند) وجود ندارد.
- **کد**: `index.ts:processBatch` (سطر ۱۲۰-۱۵۳) — `LIMIT $2` با `batchSize` (سطر ۱۳۴). اگر Kafka slow باشد، `producer.send` (سطر ۱۸۱) کند می‌شود و retry با exponential backoff (سطر ۲۱۰: `Math.min(30_000, baseRetryDelayMs * Math.pow(2, attemptCount - 1))`) انجام می‌شود. اما هیچ mechanism‌ای برای notify producer services وجود ندارد که outbox در حال انباشته شدن است. `OutboxEvent` entity (`packages/shared/src/events/OutboxEvent.ts` سطر ۴) — `@Index(['status', 'occurredAt'])` وجود دارد که query را سریع نگه می‌دارد، اما هیچ threshold check برای outbox size وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم visibility برای producer services
- **اشکال**: سرویس‌هایی که outbox write می‌کنند (claims-service، policy-service، orchestrator-service و غیره) هیچ visibility‌ای به status delivery event‌های خود ندارند. اگر event‌ای در DLQ برود، producer نمی‌داند. باید یک endpoint یا event برای notify producer وجود داشته باشد.
- **کد**: `index.ts` — هیچ endpoint برای producer services وجود ندارد. `publishOne` (سطر ۲۰۰) — `this.logger.info('Outbox event relayed', { eventId, topic, lagMs, correlationId })` — فقط log. هیچ event برای `event.relayed` یا `event.dlq` به Kafka منتشر نمی‌شود. producer services می‌توانند با `correlationId` در outbox_events table جستجو کنند اما این مستقیم به DB نیاز دارد. `OutboxEvent` entity (سطر ۴۰-۴۱) — `status: 'pending' | 'sent' | 'failed'` وجود دارد اما هیچ API برای query آن وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم consumer acknowledgment tracking
- **اشکال**: outbox-relay event‌ها را به Kafka publish می‌کند اما acknowledgment از consumer‌ها track نمی‌کند. اگر consumer fail کند، event lost نمی‌شود (at-least-once) اما outbox-relay نمی‌داند چه event‌هایی successful consumed شده‌اند. برای end-to-end tracing، acknowledgment tracking نیاز است.
- **کد**: `index.ts:publishOne` (سطر ۱۹۸) — `UPDATE outbox_events SET status='sent' WHERE id=$1` — وقتی event به Kafka send شد (نه وقتی consumer آن را consume کرد)، status به `sent` تغییر می‌کند. هیچ mechanism برای consumer acknowledgment وجود ندارد. Kafka consumer offset tracking توسط Kafka خودش انجام می‌شود، اما outbox-relay به آن وصل نیست. هیچ event از consumer برای acknowledgment دریافت نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم dashboard برای operations team
- **اشکال**: operations team برای monitoring outbox-relay نیاز به dashboard (lag، throughput، DLQ size، retry rate) دارد اما هیچ endpoint‌ای به‌جز health check وجود ندارد. باید از logs دستی استخراج کند.
- **کد**: `index.ts` (سطر ۲۹۹-۳۱۶) — فقط `/health` endpoint. هیچ `/stats` یا `/dashboard` endpoint وجود ندارد. `publishOne` (سطر ۱۶۴-۱۶۵) — `if (lagMs > 60_000) { this.logger.warn('Outbox event lag exceeds 60s', ...) }` — lag warning فقط در log. هیچ aggregation یا dashboard data وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم یکپارچه‌سازی با monitoring-service
- **اشکال**: monitoring-service برای alerting و dashboard وجود دارد اما outbox-relay هیچ metrics‌ای به monitoring-service نمی‌فرستد. هیچ Prometheus endpoint یا metrics export‌ای وجود ندارد که monitoring-service بتواند scrape کند.
- **کد**: `index.ts` — هیچ Prometheus client یا metrics export وجود ندارد. هیچ integration با monitoring-service در کد دیده نمی‌شود. `createLogger` (سطر ۳۹) — فقط structured logging. هیچ `/metrics` endpoint برای Prometheus scrape وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۷. نقایص جدید کشف‌شده

### ۷.۱ retry delay داخل transaction
- **اندپوینت**: (داخلی — `processBatch`)
- **اشکال**: exponential backoff retry delay داخل transaction انجام می‌شود. این یعنی DB connection و `FOR UPDATE SKIP LOCKED` lock برای مدت delay (تا ۳۰ ثانیه) نگه داشته می‌شود که connection pool را exhausted می‌کند و دیگر batch‌ها را block می‌کند.
- **کد**: `index.ts:publishOne` (سطر ۲۰۶-۲۶۳) — این متد داخل `dataSource.transaction` (سطر ۱۲۳) فراخوانی می‌شود. `const delay = Math.min(30_000, this.config.baseRetryDelayMs! * Math.pow(2, Math.max(0, attemptCount - 1)))` (سطر ۲۱۰) و `await this.sleep(delay)` (سطر ۲۱۱) — `sleep` داخل transaction انجام می‌شود. `FOR UPDATE SKIP LOCKED` (سطر ۱۳۱) روی row‌های انتخاب شده lock دارد تا transaction commit/rollback شود. با delay تا ۳۰ ثانیه، این lock برای ۳۰ ثانیه نگه داشته می‌شود.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۷.۲ عدم tenant isolation در batch processing
- **اندپوینت**: (داخلی — `processBatch`)
- **اشکال**: `processBatch` همه pending events را بدون فیلتر tenant پردازش می‌کند. اگر یک tenant حجم زیادی event تولید کند، می‌تواند batch را پر کند و event‌های tenant‌های دیگر را delay کند.
- **کد**: `index.ts:processBatch` (سطر ۱۲۴-۱۳۵) — `SELECT id FROM outbox_events WHERE status = 'pending' AND attempt_count < $1 ORDER BY occurred_at ASC FOR UPDATE SKIP LOCKED LIMIT $2` — هیچ فیلتر `tenant_id` وجود ندارد. `OutboxEvent` entity (`packages/shared/src/events/OutboxEvent.ts` سطر ۲۵) — `tenantId` field وجود دارد اما در batch query استفاده نمی‌شود.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۷.۳ عدم schema configuration برای DB
- **اندپوینت**: (داخلی — `start`)
- **اشکال**: هیچ `DB_SCHEMA` environment variable‌ای برای outbox-relay وجود ندارد. `outbox_events` و `dead_letter_queue` table‌ها در default schema search path باید باشند. در multi-schema setup، این می‌تواند conflict ایجاد کند.
- **کد**: `index.ts` (سطر ۵۴-۵۸) — `this.dataSource = createDataSource({ ...config.dbConfig, entities: [OutboxEvent, DeadLetterEvent], synchronize: false })`. `config.dbConfig` (سطر ۸-۱۴) — فقط `host`، `port`، `username`، `password`، `database`. هیچ `schema` field وجود ندارد. در مقایسه، سایر سرویس‌ها (مثلاً workflow-service) `schema: process.env.DB_SCHEMA || 'workflow_service'` دارند.
- **وضعیت**: ✅ تأیید شد — نقص جدید

### ۷.۴ عدم lag warning در health check
- **اندپوینت**: `GET /health`
- **اشکال**: `publishOne` اگر lag > 60s باشد warning log می‌کند (سطر ۱۶۴-۱۶۵) اما این در health check منعکس نمی‌شود. اگر هزاران event pending باشد، health check همچنان `ok` برمی‌گرداند.
- **کد**: `index.ts:publishOne` (سطر ۱۶۴-۱۶۵) — `if (lagMs > 60_000) { this.logger.warn('Outbox event lag exceeds 60s', ...) }`. `isHealthy` (سطر ۸۱-۸۶) — فقط `db` و `kafka` boolean. هیچ count query برای pending events در health check وجود ندارد.
- **وضعیت**: ✅ تأیید شد — نقص جدید
