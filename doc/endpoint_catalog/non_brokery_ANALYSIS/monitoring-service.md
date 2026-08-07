# Monitoring Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: monitoring-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/monitoring-service/src/`

---

## ۱. Metric Management

### ۱.۱ استفاده از همان permission برای view و record metric
- **اندپوینت**: `GET /metrics`، `POST /metrics`
- **اشکال**: هر دو اندپوینت از permission `monitoring:metrics:view` استفاده می‌کنند. `POST /metrics` (record metric) باید permission جداگانه مانند `monitoring:metrics:record` داشته باشد. استفاده از permission view برای write operation نقض اصل least privilege است و به هر کاربری که می‌تواند metric را ببیند، اجازه record کردن metric دلخواه را می‌دهد که می‌تواند به آلودگی داده‌های metric منجر شود.
- **کد**: `monitoring.controller.ts` (خط ۲۷): `@RequirePermissions('monitoring:metrics:view')` برای `GET /metrics` و (خط ۳۵): `@RequirePermissions('monitoring:metrics:view')` برای `POST /metrics` — هر دو از همان permission استفاده می‌کنند. در `permissions.ts` (خط ۱) هیچ `monitoring:metrics:record` تعریف نشده.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ نبود pagination در پاسخ Prometheus metrics
- **اندپوینت**: `GET /metrics`
- **اشکال**: این اندپوینت تمام Prometheus metrics را در یک پاسخ متنی برمی‌گرداند. در یک سیستم با ده‌ها سرویس و هزاران metric، این پاسخ می‌تواند بسیار بزرگ باشد و باعث timeout یا مصرف بیش از حد memory شود. هیچ مکانیزمی برای فیلتر کردن metric بر اساس `serviceName` یا prefix وجود ندارد.
- **کد**: `monitoring.controller.ts:metrics()` (خط ۲۸-۳۱): `res.end(await this.monitoringService.getPrometheusMetrics())` — هیچ query param برای فیلتر نمی‌گیرد. `monitoring.service.ts:getPrometheusMetrics()` (خط ۹۹-۱۰۱): `this.register.metrics()` — تمام metric‌های registry را برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ نبود validation برای metric name و labels
- **اندپوینت**: `POST /metrics`
- **اشکال**: در request body، `name` و `labels` بدون validation ذکر شده‌اند. هیچ محدودیتی برای کاراکترهای مجاز در `name` (مثل Prometheus naming convention) یا تعداد و نوع `labels` وجود ندارد. یک کاربر می‌تواند metric با نام نامعتبر یا cardinality بالا (مثل label با مقدار یکتا برای هر request) ثبت کند که باعث انفجار cardinality در Prometheus می‌شود.
- **کد**: `monitoring.service.ts:recordMetric()` (خطوط ۱۰۳-۱۵۱) — هیچ validation برای `payload.metricName` یا `payload.labels` وجود ندارد. `metricKey = ${payload.serviceName}_${payload.metricName}` (خط ۱۱۵) بدون هیچ sanitize یا regex check. `labelNames: payload.labels ? Object.keys(payload.labels) : []` (خط ۱۲۳) — هر کلید JSON به‌عنوان label name پذیرفته می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۱.۴ نبود metric retention policy
- **اندپوینت**: `GET /metrics`، `POST /metrics`
- **اشکال**: هیچ endpoint یا پیکربندی برای تعیین retention policy metric‌ها وجود ندارد. در یک سیستم enterprise، metric‌ها باید بر اساس نوع (counter، gauge، histogram) و اهمیت، retention متفاوتی داشته باشند. نبود این قابلیت باعث می‌شود داده‌های metric قدیمی به‌صورت نامحدود ذخیره شوند یا بدون سیاست مشخص حذف شوند.
- **کد**: `entities/MonitoringEntities.ts` (خط ۴): `@Entity('metrics')` با `@Index(['serviceName', 'metricName', 'timestamp'])` — هیچ فیلد `expiresAt` یا retention policy در entity وجود ندارد. هیچ cron job یا cleanup task برای حذف metric‌های قدیمی در `monitoring.service.ts` تعریف نشده.
- **وضعیت**: ✅ تأیید شد

---

## ۲. SLO Management

### ۲.۱ نبود endpoint برای update و delete SLO
- **اندپوینت**: `POST /slos`، `GET /slos`
- **اشکال**: SLO فقط قابل create و list است. هیچ اندپوینتی برای `PUT /slos/:sloId` (update) یا `DELETE /slos/:sloId` (delete) وجود ندارد. اگر یک SLO نیاز به تغییر target یا window داشته باشد، باید SLO جدید ایجاد شود و SLO قدیمی بدون حذف باقی بماند. این باعث انباشت SLO‌های منسوخ می‌شود.
- **کد**: `monitoring.controller.ts` — فقط `@Get('/slos')` (خط ۴۷) و `@Post('/slos')` (خط ۵۶) تعریف شده‌اند. هیچ `@Put` یا `@Delete` برای SLO وجود ندارد. `monitoring.service.ts` نیز فقط `listSLOs()` و `createSLO()` دارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۲ نبود pagination در لیست SLO
- **اندپوینت**: `GET /slos`
- **اشکال**: این اندپوینت تمام SLO‌ها را در یک پاسخ برمی‌گرداند. هیچ `limit` یا `offset` وجود ندارد. با افزایش تعداد سرویس‌ها و SLO‌ها، این اندپوینت می‌تواند پاسخ بسیار بزرگی تولید کند.
- **کد**: `monitoring.service.ts:listSLOs()` (خطوط ۱۵۳-۱۵۸): `qb.getMany()` بدون `.skip()` یا `.take()`. فیلتر فقط بر اساس `serviceName` و `status` از طریق `@Query` در controller (خط ۵۰) وجود دارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ نبود alerting threshold قابل پیکربندی
- **اندپوینت**: `POST /slos`
- **اشکال**: در request body، `target` (مثل ۰.۹۹) و `window` (مثل ۳۰d) تعریف شده‌اند اما هیچ فیلدی برای alerting threshold وجود ندارد. SLO فقط status `healthy|at_risk|breached` دارد اما threshold برای انتقال بین این وضعیت‌ها قابل پیکربندی نیست.
- **کد**: `monitoring.service.ts:evaluateSLOs()` (خطوط ۲۵۱-۲۹۴) — threshold‌ها hardcoded هستند: (خط ۲۶۸) `if (currentValue < slo.target * 0.95) slo.status = 'breached'` و (خط ۲۷۱) `else if (currentValue < slo.target * 0.98) slo.status = 'at_risk'`. این مقادیر ۰.۹۵ و ۰.۹۸ در کد hardcoded شده‌اند و از طریق API قابل تغییر نیستند. `SLOPayload` (خطوط ۱۸-۲۴) هیچ فیلد threshold ندارد.
- **وضعیت**: ✅ تأیید شد

### ۲.۴ نبود SLO burn rate و error budget
- **اندپوینت**: `GET /slos`
- **اشکال**: پاسخ SLO شامل `target` و `current` است اما هیچ محاسبه‌ای برای burn rate یا error budget مصرف شده ارائه نمی‌شود. در SRE مدرن، burn rate (نرخ مصرف error budget) یک metric حیاتی است که نشان می‌دهد آیا با نرخ فعلی، SLO تا پایان window نقض خواهد شد یا خیر. این قابلیت کاملاً غایب است.
- **کد**: `entities/MonitoringEntities.ts` SLO entity (خطوط ۲۸-۶۰) — فیلدها: `sloId`، `serviceName`، `sloName`، `description`، `target`، `window`، `currentValue`، `status`، `createdAt`، `updatedAt`. هیچ فیلد `errorBudget`، `burnRate` یا `remainingBudget` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Alert Management

### ۳.۱ نبود endpoint برای resolve alert
- **اندپوینت**: `PATCH /alerts/:alertId/ack`
- **اشکال**: فقط `ack` (acknowledge) پشتیبانی می‌شود. هیچ اندپوینتی برای `resolve` یا `close` alert وجود ندارد. alert فقط به status `acknowledged` تغییر می‌کند اما اپراتور نمی‌تواند آن را به `resolved` تبدیل کند. این باعث می‌شود alert‌های برطرف شده همچنان در لیست alert‌های open یا acknowledged باقی بمانند.
- **کد**: `monitoring.controller.ts` — فقط `@Patch('/alerts/:alertId/ack')` (خط ۸۴) وجود دارد. **نکته**: `Alert` entity در `MonitoringEntities.ts` (خط ۸۵) دارای `status: 'firing' | 'acknowledged' | 'resolved'` و فیلد `resolvedAt` (خط ۹۹) است، یعنی data model از resolved پشتیبانی می‌کند اما هیچ endpoint ای برای آن وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ نبود endpoint برای create alert rule
- **اندپوینت**: `GET /alerts`
- **اشکال**: alert فقط قابل list و ack است. هیچ اندپوینتی برای تعریف alert rule (مثل "اگر error rate > ۵% برای ۵ دقیقه، alert critical تولید کن") وجود ندارد. alert rule‌ها باید به‌صورت خارجی (مثل Prometheus Alertmanager) پیکربندی شوند اما monitoring-service هیچ API برای مدیریت این rule‌ها ندارد.
- **کد**: هیچ endpoint یا entity برای alert rule در کل سرویس وجود ندارد. alert‌ها فقط از طریق `evaluateSLOs()` (خط ۳۰۸-۳۴۰) و `onComplaintSlaBreached()` (خطوط ۵۳-۹۳) به‌صورت خودکار ایجاد می‌شوند.
- **وضعیت**: ✅ تأیید شد

### ۳.۳ نبود pagination در لیست alerts
- **اندپوینت**: `GET /alerts`
- **اشکال**: با وجود query param‌های `status`، `severity` و `serviceName`، هیچ `limit` یا `offset` وجود ندارد. در یک سیستم با هزاران alert، این اندپوینت می‌تواند پاسخ بسیار بزرگی تولید کند.
- **کد**: `monitoring.service.ts:listAlerts()` (خطوط ۱۷۶-۱۸۵): `qb.orderBy('alert.created_at', 'DESC').getMany()` — بدون `.skip()` یا `.take()`.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ پذیرش `acknowledgedBy` از سمت کلاینت
- **اندپوینت**: `PATCH /alerts/:alertId/ack`
- **اشکال**: `acknowledgedBy` در request body از سمت کلاینت ارسال می‌شود. این باید از JWT token استخراج شود، نه از body. یک کاربر می‌تواند به‌جای کاربر دیگر alert را ack کند و audit trail نادرست تولید شود.
- **کد**: `monitoring.controller.ts:ack()` (خط ۹۱): `this.monitoringService.acknowledgeAlert({ alertId, acknowledgedBy: body?.acknowledgedBy })` — `acknowledgedBy` از `body` کلاینت گرفته می‌شود. `monitoring.service.ts:acknowledgeAlert()` (خط ۱۹۲): `alert.acknowledgedBy = params.acknowledgedBy || 'system'` — اگر کلاینت مقدار نفرستد، `'system'` استفاده می‌شود. هیچ استخراجی از `req.user` یا JWT انجام نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۳.۵ نبود alert silencing و maintenance window
- **اندپوینت**: `GET /alerts`، `PATCH /alerts/:alertId/ack`
- **اشکال**: هیچ مکانیزمی برای alert silencing (mute کردن alert‌ها در بازه زمانی مشخص) یا تعریف maintenance window وجود ندارد. در زمان deployment یا maintenance، alert‌های false positive تولید می‌شوند و اپراتورها را آزار می‌دهند.
- **کد**: هیچ entity، endpoint یا logic برای silencing/maintenance window در کل سرویس وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Dashboard

### ۴.۱ نبود dashboard customization
- **اندپوینت**: `GET /dashboard`
- **اشکال**: dashboard یک پاسخ ثابت با `services`، `alerts` و `slos` برمی‌گرداند. هیچ پارامتری برای customization وجود ندارد. اپراتورها نمی‌توانند widget‌های دلخواه انتخاب کنند، فیلتر اعمال کنند (مثل فقط سرویس‌های critical)، یا layout ذخیره کنند. در یک سیستم enterprise، dashboard باید قابل شخصی‌سازی per-user یا per-team باشد.
- **کد**: `monitoring.controller.ts:dashboard()` (خطوط ۱۰۱-۱۰۸) — هیچ `@Query()` پارامتری نمی‌گیرد. `monitoring.service.ts:getDashboard()` (خطوط ۱۹۸-۲۴۹) — پاسخ شامل `slos` (با `healthy`، `at_risk`، `breached`، `total`) و `alerts` (با `firing`، `acknowledged`، `resolved` به تفکیک severity) و `timestamp` است. **نکته**: برخلاف کاتالوگ، پاسخ واقعی شامل آرایه `services` نیست — فقط aggregate count‌های SLO و alert برمی‌گرداند.
- **وضعیت**: ✅ تأیید شد

### ۴.۲ نبود time range در dashboard
- **اندپوینت**: `GET /dashboard`
- **اشکال**: هیچ پارامتر `from`/`to` یا `timeRange` وجود ندارد. dashboard فقط داده‌های فعلی (snapshot) را نشان می‌دهد. اپراتور نمی‌تواند dashboard را برای یک بازه زمانی گذشته (مثل "۲۴ ساعت گذشته" یا "۷ روز گذشته") ببیند. این برای تحلیل post-incident حیاتی است.
- **کد**: `monitoring.service.ts:getDashboard()` (خط ۲۱۱): `where("alert.created_at > NOW() - INTERVAL '24 hours'")` — بازه ۲۴ ساعت hardcoded شده و قابل تغییر نیست.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ نبود caching در dashboard
- **اندپوینت**: `GET /dashboard`
- **اشکال**: هیچ اشاره‌ای به caching در پاسخ dashboard نیست. اگر dashboard در هر بار بارگذاری تمام metric‌ها و alert‌ها را از scratch محاسبه کند، در سیستم‌های بزرگ این می‌تواند چند ثانیه طول بکشد. استفاده از `Cache-Control` یا `ETag` برای کاهش بار سرور ضروری است.
- **کد**: `monitoring.controller.ts:dashboard()` — هیچ cache header یا ETag تنظیم نمی‌شود. `getDashboard()` دو query aggregate (`sloStats` و `alertStats`) را به‌صورت همزمان اجرا می‌کند (`Promise.all`) اما هیچ caching درون‌حافظه‌ای وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۵. OpenTelemetry Endpoints

### ۵.۱ نبود authentication در OTel endpoints
- **اندپوینت**: `POST /otel/span`، `POST /otel/metric`، `POST /otel/attributes`، `POST /otel/event`، `POST /otel/exception`
- **اشکال**: تمام OTel endpoints به‌صورت public (بدون auth) تعریف شده‌اند. در note گفته شده "intended for internal instrumentation use" اما هیچ محدودیتی برای دسترسی خارجی وجود ندارد. یک مهاجم می‌تواند span، metric یا exception جعلی ثبت کند و داده‌های observability را آلوده کند. حداقل باید network-level isolation یا API key authentication وجود داشته باشد.
- **کد**: `otel.controller.ts` (خطوط ۱-۸۲) — هیچ `@UseGuards()` دکوریتوری روی هیچ متدی وجود ندارد. **نکته مهم**: `OtelModule` (که شامل `OtelController` است) در `app.module.ts` import نشده! در `app.module.ts` (خط ۳۰): `controllers: [MonitoringController, HealthController]` — `OtelController` در لیست نیست و `OtelModule` در imports نیست. بنابراین این endpoint‌ها در reality در سرویس deploy‌شده در دسترس نیستند.
- **وضعیت**: ✅ تأیید شد (با نکته: endpoint‌ها اصلاً ثبت نشده‌اند)

### ۵.۲ نبود rate limiting در OTel endpoints
- **اندپوینت**: `POST /otel/span`، `POST /otel/metric`
- **اشکال**: بدون rate limiting، یک سرویس با bug می‌تواند میلیون‌ها span یا metric در ثانیه ارسال کند و monitoring-service را از کار بیندازد. در معماری OTel استاندارد، collector باید rate limiting و sampling داشته باشد.
- **کد**: `otel.controller.ts` — هیچ throttle یا rate-limit middleware وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۳ span ایجاد و پایان در یک درخواست
- **اندپوینت**: `POST /otel/span`
- **اشکال**: این اندپوینت در یک درخواست span را "create and end" می‌کند. این طراحی برای span‌های بلندمدت (مثل یک request چند ثانیه‌ای) مناسب نیست. در OTel استاندارد، span باید با `startSpan` شروع و با `endSpan` پایان یابد تا duration دقیق محاسبه شود. این مدل فقط span‌های point-in-time را پشتیبانی می‌کند.
- **کد**: `otel.controller.ts:createSpan()` (خطوط ۱۷-۳۱): `const span = this.otelService.startSpan(...); span.end();` — span بلافاصله پس از ایجاد end می‌شود. duration همیشه صفر است.
- **وضعیت**: ✅ تأیید شد

### ۵.۴ نبود trace context propagation
- **اندپوینت**: `POST /otel/span`، `POST /otel/attributes`، `POST /otel/event`
- **اشکال**: `POST /otel/attributes` و `POST /otel/event` به "active span" attribute یا event اضافه می‌کنند اما مشخص نیست active span چگونه شناسایی می‌شود. هیچ `traceId` یا `spanId` در request body وجود ندارد. در یک محیط stateless HTTP، نمی‌توان "active span" را بدون context propagation ردیابی کرد.
- **کد**: `otel.controller.ts:addAttributes()` (خط ۵۳): `this.otelService.addAttributes(body.attributes)` و `otel.service.ts:addAttributes()` (خط ۱۶۹): `const span = trace.getActiveSpan()` — در یک محیط HTTP stateless، `trace.getActiveSpan()` فقط اگر request از طریق OTel instrumentation وارد شده باشد active span برمی‌گرداند. اگر کلاینت خارجی مستقیماً POST کند، هیچ active span وجود ندارد و attribute‌ها به جایی اضافه نمی‌شوند (silent no-op).
- **وضعیت**: ✅ تأیید شد

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم یکپارچه‌سازی با federation-service
- **اشکال**: monitoring-service باید سلامت federation-service را مانیتور کند اما federation-service هیچ REST endpoint یا health check ای ندارد که monitoring-service بتواند آن را poll کند. metric‌های federation (مثل `projection_sync_lag`، `event_signature_failures`) به monitoring-service ارسال نمی‌شوند.
- **کد**: هیچ import یا reference به federation-service در `services/monitoring-service/src/` وجود ندارد. `monitoring.service.ts` فقط با `Metric`، `SLO`، `Alert` entities کار می‌کند و هیچ federation metric دریافت نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم یکپارچه‌سازی با notification-service برای alert routing
- **اشکال**: وقتی alert تولید می‌شود، باید از طریق notification-service به اپراتورها اطلاع‌رسانی شود (SMS، email، push). اما هیچ مکانیزمی برای routing alert به notification-service تعریف نشده است. alert فقط در dashboard نمایش داده می‌شود و اپراتور باید دستی dashboard را چک کند.
- **کد**: `monitoring.service.ts:createAlert()` (خطوط ۳۰۸-۳۴۰) — alert فقط در DB ذخیره و log می‌شود (`this.logger.warn('Alert created', ...)`). هیچ event emit، Kafka publish یا API call به notification-service وجود ندارد. `app.module.ts` (خط ۱۴) `OutboxEvent` را import کرده اما در `monitoring.service.ts` از آن استفاده نمی‌شود. `main.ts` (خطوط ۹۴-۱۱۳) یک `OutboxWorker` راه‌اندازی می‌کند اما هیچ event‌ای در outbox نوشته نمی‌شود.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم تفکیک دسترسی بین team‌ها
- **اشکال**: تمام اندپوینت‌های monitoring از `AbacGuard` استفاده می‌کنند اما هیچ attribute-based policy‌ای برای تفکیک دسترسی بین team‌ها تعریف نشده است. مثلاً team claims باید فقط alert‌ها و SLO‌های claims-service را ببیند، نه تمام سرویس‌ها را. در حال حاضر هر کاربر با permission `monitoring:alerts:list` تمام alert‌ها را می‌بیند.
- **کد**: `abac.guard.ts` (خط ۱۵): `if (method === 'GET') return true` — تمام GET request‌ها برای هر کاربر authenticated اجازه داده می‌شوند. هیچ فیلتری بر اساس `serviceName` یا tenant در guard وجود ندارد. `listAlerts` و `listSLOs` در service هیچ tenant filtering انجام نمی‌دهند.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم دسترسی customer-portal و agent-portal به dashboard محدود
- **اشکال**: پورتال‌های customer و agent هیچ دسترسی به monitoring ندارند که درست است، اما هیچ endpointی برای status page عمومی (مثل `/status` که وضعیت سرویس‌ها را بدون جزئیات فنی نشان دهد) وجود ندارد. customer‌ها باید بتوانند وضعیت کلی سیستم را ببینند بدون اینکه به dashboard داخلی دسترسی داشته باشند.
- **کد**: هیچ endpoint `/status` در controller‌ها تعریف نشده. `permissions.ts` هیچ نقش `customer` یا `agent` تعریف نکرده.
- **وضعیت**: ✅ تأیید شد

### ۶.۵ نبود webhook برای alert notification
- **اشکال**: هیچ مکانیزم webhook‌ای برای اطلاع‌رسانی خودکار alert به سیستم‌های خارجی (مثل Slack، Microsoft Teams، PagerDuty) وجود ندارد. در یک سیستم enterprise، alert routing باید قابل پیکربندی باشد و به کانال‌های مختلف ارسال شود.
- **کد**: هیچ webhook یا external notification در `monitoring.service.ts` یا `alerting.service.ts` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۷. نقص‌های جدید یافت‌شده در کد

### ۷.۱ SLO evaluation از مقادیر random استفاده می‌کند
- **اندپوینت**: `GET /slos` (نتیجه evaluation)
- **اشکال**: متدهای `calculateAvailability`، `calculateLatency` و `calculateErrorRate` در `monitoring.service.ts` به‌جای محاسبه واقعی از metric‌ها، از `Math.random()` استفاده می‌کنند. این یعنی SLO evaluation هر ۵ دقیقه مقادیر تصادفی تولید می‌کند و status SLO کاملاً بی‌معنی است.
- **کد**: `monitoring.service.ts` (خط ۲۹۷): `return 0.995 + Math.random() * 0.005;` برای availability، (خط ۳۰۱): `return 100 + Math.random() * 50;` برای latency، (خط ۳۰۵): `return 0.001 + Math.random() * 0.005;` برای error rate. پارامترها `_serviceName` و `_window` نام‌گذاری شده‌اند (underscore prefix) که نشان می‌دهد عمداً نادیده گرفته شده‌اند.
- **وضعیت**: ✅ تأیید شد (نقص جدید — بحرانی)

### ۷.۲ عدم ثبت OtelModule در AppModule
- **اندپوینت**: `POST /otel/span`، `POST /otel/metric`، `POST /otel/attributes`، `POST /otel/event`، `POST /otel/exception`، `GET /otel/health`
- **اشکال**: `OtelModule` که شامل `OtelController` است در `AppModule` import نشده. این یعنی تمام ۶ endpoint مربوط به OTel که در کاتالوگ توضیح داده شده‌اند در سرویس deploy‌شده در دسترس نیستند و خطای 404 برمی‌گردانند.
- **کد**: `app.module.ts` (خط ۳۰): `controllers: [MonitoringController, HealthController]` — `OtelController` وجود ندارد. `OtelModule` در آرایه `imports` (خطوط ۱۶-۲۸) نیست. `otel.module.ts` (خط ۸): `controllers: [OtelController]` تعریف شده اما هیچ‌جا import نمی‌شود.
- **وضعیت**: ✅ تأیید شد (نقص جدید — بحرانی)

### ۷.۳ تعارض route بین دو اندپوینت `/health`
- **اندپوینت**: `GET /health`
- **اشکال**: دو controller مختلف هرکدام `GET /health` تعریف کرده‌اند: `MonitoringController` (خط ۲۰-۲۳) پاسخ مینیمال و `HealthController` (خط ۸-۳۴) پاسخ کامل با DB check. در `app.module.ts` (خط ۳۰): `controllers: [MonitoringController, HealthController]` — MonitoringController اول ثبت شده و health مینیمال آن احتمالاً اول match می‌شود.
- **کد**: `monitoring.controller.ts` (خط ۲۰): `@Get('/health')` و `health.controller.ts` (خط ۸): `@Get('/health')`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۴ تکرار Kafka consumer در main.ts و ComplaintSlaConsumer
- **اندپوینت**: N/A (internal)
- **اشکال**: هم در `main.ts` (خطوط ۱۳-۹۱) و هم در `complaint-sla.consumer.ts` (خطوط ۱۸-۱۰۵) یک Kafka consumer برای topic `insurance.complaint.sla_breached` با همان `groupId` راه‌اندازی می‌شود. این باعث می‌شود هر پیام دو بار پردازش شود یا رقابت بین دو consumer ایجاد شود.
- **کد**: `main.ts` (خط ۳۵): `await consumer.subscribe(['insurance.complaint.sla_breached'], false)` و `complaint-sla.consumer.ts` (خط ۴۳): `await this.consumer.subscribe(['insurance.complaint.sla_breached'], false)` — هر دو از `process.env.KAFKA_GROUP_ID || 'monitoring-service'` استفاده می‌کنند. `ComplaintSlaConsumer` در `app.module.ts` (خط ۳۱) به‌عنوان provider ثبت شده.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۵ عدم تطابق status name‌ها با کاتالوگ
- **اندپوینت**: `GET /alerts`، `GET /slos`
- **اشکال**: کاتالوگ برای alert status از `open|acknowledged|resolved` استفاده می‌کند اما کد از `firing|acknowledged|resolved`. برای SLO status، کاتالوگ از `healthy|degraded|breached` استفاده می‌کند اما کد از `healthy|at_risk|breached`. این عدم تطابق می‌تواند باعث خطای parsing در کلاینت‌ها شود.
- **کد**: `entities/MonitoringEntities.ts` (خط ۸۵): `status!: 'firing' | 'acknowledged' | 'resolved'` برای Alert و (خط ۵۳): `status!: 'healthy' | 'at_risk' | 'breached'` برای SLO. در `monitoring.service.ts:evaluateSLOs()` (خط ۲۷۲): `slo.status = 'at_risk'` — نه `degraded`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۷.۶ نبود dashboard `services` در پاسخ واقعی
- **اندپوینت**: `GET /dashboard`
- **اشکال**: کاتالوگ نشان می‌دهد که dashboard شامل آرایه `services` با `serviceName`، `status`، `uptime`، `errorRate` است اما در کد واقعی چنین آرایه‌ای وجود ندارد. dashboard فقط aggregate count‌های SLO و alert برمی‌گرداند.
- **کد**: `monitoring.service.ts:getDashboard()` (خطوط ۲۱۶-۲۴۸) — پاسخ شامل `slos: { healthy, at_risk, breached, total }`، `alerts: { firing: {critical, warning, info}, acknowledged: {...}, resolved: {...} }` و `timestamp`. هیچ آرایه `services` وجود ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
