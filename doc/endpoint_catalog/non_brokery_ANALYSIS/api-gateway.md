# API Gateway — تحلیل نقایص اندپوینت‌ها

**سرویس**: api-gateway  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم  
**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/api-gateway/src/`

---

## ۱. Health Check و Observability

### ۱.۱ عدم احراز هویت در Deep Health Check
- **اندپوینت**: `GET /health/deep`، `GET /gateway/health/deep`
- **اشکال**: deep health check اطلاعات زیرساختی حساس شامل وضعیت database، Kafka، و تمام سرویس‌های آپ‌استریم را افشا می‌کند اما هیچ احراز هویتی ندارد (public). یک مهاجم می‌تواند با فراخوانی این اندپوینت، نقاط ضعف زیرساختی و وضعیت سرویس‌های آپ‌استریم را کشف کند و حملات هدفمندتری طراحی کند.
- **کد**: `health.controller.ts:deepHealth()` — بدون `@UseGuards`؛ در `gateway.config.ts:115-116` در `PUBLIC_ROUTES` لیست شده است.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ تکرار اندپوینت‌های Health Check
- **اندپوینت**: `GET /health` و `GET /gateway/health`، `GET /health/deep` و `GET /gateway/health/deep`
- **اشکال**: دو مسیر alias برای هر health check وجود دارد. این تکرار باعث افزایش سطح حمله (duplicate public endpoints) و پیچیدگی unnecessary در پیکربندی monitoring و load balancer می‌شود. همچنین اگر یک مسیر پچ شود و دیگری نه، ناهماهنگی به وجود می‌آید.
- **کد**: `health.controller.ts:20` — `@Get(['/health', '/gateway/health'])` و `health.controller.ts:29` — `@Get(['/health/deep', '/gateway/health/deep'])`؛ هر دو در `PUBLIC_ROUTES` (`gateway.config.ts:113-116`).
- **وضعیت**: ✅ تأیید شد

### ۱.۳ ~~عدم عدم‌موجودی Deep Health Check برای تمام سرویس‌های آپ‌استریم~~
- **اندپوینت**: `GET /health/deep`
- ~~**اشکال**: deep health check فقط `auth-service` و `policy-service` را بررسی می‌کند در حالی که gateway به سرویس‌های متعددی proxy می‌کند.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `health.controller.ts:68-99` — تابع `deepHealth()` حلقه‌ای روی تمام `SERVICE_ROUTES` (۳۸ مسیر در `gateway.config.ts:59-98`) اجرا می‌کند و برای هر سرویس `fetch(${target}/health)` با timeout ۵ ثانیه فراخوانی می‌کند. کاتالوگ قدیمی فقط auth-service و policy-service را ذکر کرده بود اما کد فعلی تمام سرویس‌ها را بررسی می‌کند.

### ۱.۴ عدم ارسال metrics و Prometheus endpoint
- **اشکال**: هیچ اندپوینتی برای export metrics (Prometheus/Grafana) وجود ندارد. gateway به عنوان نقطه ورودی تمام ترافیک، منبع غنی داده‌های observability است (rate limit hits، circuit breaker transitions، upstream latency) اما هیچ metrics endpoint ای تعریف نشده است.
- **کد**: هیچ فایل metrics یا prometheus در `src/` وجود ندارد؛ `health.controller.ts` فقط health و admin endpoints را تعریف می‌کند؛ `main.ts` هیچ prometheus plugin ای ثبت نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۱.۵ (جدید) اجرای ترتیبی Deep Health Check با timeout بلند
- **اندپوینت**: `GET /health/deep`
- **اشکال**: deep health check تمام سرویس‌های آپ‌استریم را به‌صورت ترتیبی (sequential) بررسی می‌کند، نه موازی. با ۳۸ مسیر و timeout ۵ ثانیه‌ای برای هر کدام، در بدترین حالت این اندپوینت می‌تواند تا ۱۹۰ ثانیه طول بکشد و باعث timeout کلاینت یا load balancer شود.
- **کد**: `health.controller.ts:69` — `for (const route of SERVICE_ROUTES)` با `await` داخل حلقه؛ `health.controller.ts:81` — `AbortSignal.timeout(5000)` برای هر fetch.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۱.۶ (جدید) افشای وضعیت تمام سرویس‌های آپ‌استریم در endpoint عمومی
- **اندپوینت**: `GET /gateway/health/upstreams`
- **اشکال**: این اندپوینت عمومی (در `PUBLIC_ROUTES` لیست شده) وضعیت سلامتی، تعداد failure و زمان آخرین failure برای تمام سرویس‌های آپ‌استریم را افشا می‌کند. این اطلاعات برای یک مهاجم ارزشمند است تا سرویس‌های ضعیف را شناسایی کند.
- **کد**: `main.ts:914-925` — `fastify.get('/gateway/health/upstreams', ...)` بدون Guard؛ `gateway.config.ts:115` — در `PUBLIC_ROUTES`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۲. Circuit Breaker Admin

### ۲.۱ عدم تفکیک دسترسی در AdminGuard
- **اندپوینت**: `GET /admin/circuit-breakers`، `POST /admin/circuit-breakers/:serviceName/reset`
- **اشکال**: AdminGuard فقط بررسی می‌کند که کاربر admin باشد. هیچ تفکیکی بین admin مشاهده‌کننده (read-only) و admin عملیاتی (reset) وجود ندارد. یک اپراتور NOC باید بتواند وضعیت circuit breaker را ببیند اما نباید بتواند آن را reset کند. عدم Separation of Duties (SoD) خطر اشتباه انسانی یا compromise را افزایش می‌دهد.
- **کد**: `admin.guard.ts:20-44` — `canActivate` فقط بررسی `hasAdminRole || hasAdminPermission || hasAdminScope` را انجام می‌دهد؛ `ADMIN_ROLE` و `ADMIN_PERMISSION` از `gateway.config.ts:51-52` یک مقدار ثابت هستند (`platform_admin` و `gateway:admin`). هر دو endpoint از همان `@UseGuards(AdminGuard)` استفاده می‌کنند (`health.controller.ts:105` و `health.controller.ts:132`).
- **وضعیت**: ✅ تأیید شد

### ۲.۲ عدم audit log برای reset circuit breaker
- **اندپوینت**: `POST /admin/circuit-breakers/:serviceName/reset`
- **اشکال**: reset کردن circuit breaker یک عملیات حساس عملیاتی است اما هیچ audit log ای ثبت نمی‌شود. بدون audit trail، در صورت بروز incident نمی‌توان تشخیص داد چه کسی و چه زمانی circuit breaker را reset کرده است.
- **کد**: `health.controller.ts:131-155` — `resetCircuitBreaker` فقط `cb.reset()` را فراخوانی کرده و پیام success برمی‌گرداند؛ هیچ `logger.info` یا audit recording وجود ندارد. در مقابل، `sanitizeHealthError` در خط ۲۱۰ از `logger.warn` استفاده می‌کند که نشان می‌دهد logger در دسترس است اما برای reset استفاده نشده است.
- **وضعیت**: ✅ تأیید شد

### ۲.۳ ~~عدم rate limiting در admin endpoints~~
- **اندپوینت**: `POST /admin/circuit-breakers/:serviceName/reset`
- ~~**اشکال**: هیچ rate limiting ای برای admin endpoints تعریف نشده است. یک admin (یا token لو رفته) می‌تواند با فراخوانی مکرر reset، circuit breaker را مدام reset کرده و باعث bypass مکانیزم محافظتی شود.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: `main.ts:489-650` — hook عمومی `onRequest` برای تمام درخواست‌ها (شامل admin endpoints) اجرا می‌شود و rate limiting را با `checkRateLimit` اعمال می‌کند. identity برای admin احراز‌شده `${tenantId}:${userId}` است (خط ۶۳۰). با این حال، محدودیت ۱۰۰ درخواست در ۶۰ ثانیه برای reset عملیات حساس کافی نیست — توصیه می‌شود limit جداگانه و سخت‌گیرانه‌تر برای admin endpoints در نظر گرفته شود، اما ادعای «هیچ rate limiting وجود ندارد» نادرست است.

---

## ۳. امنیت Proxy و Tenant Resolution

### ۳.۱ عدم validation برای X-Tenant-Id header در public routes
- **اندپوینت**: Proxy Behavior (public routes با `allowsTenantSelection`)
- **اشکال**: tenant از `X-Tenant-Id` header برای public routes (مثل `/auth/login`، `/auth/register`) قابل resolve می‌شود. این header توسط client قابل تنظیم است و هیچ validation در gateway انجام نمی‌شود. یک مهاجم می‌تواند tenant spoof کند. gateway امضای HMAC تولید می‌کند اما آن را روی incoming request اعتبارسنجی نمی‌کند.
- **کد**: `main.ts:588-590` — `if (publicRoute.allowsTenantSelection) { tenantId = inboundTenantId || brandTenant?.tenantId; }`؛ `main.ts:624` — `signInternalContext(tenantContextPayload)` امضا را تولید می‌کند اما validation incoming signature وجود ندارد. `gateway.config.ts:102-110` — مسیرهای `allowsTenantSelection: true` شامل login، refresh، forgot-password، register، SSO.
- **وضعیت**: ✅ تأیید شد

### ۳.۲ ~~عدم tenant allowlist و brand spoofing~~
- **اندپوینت**: Proxy Behavior (host-based brand resolution)
- ~~**اشکال**: tenant از host-based brand resolution انجام می‌شود اما مشخص نیست که آیا allowlist از host‌های مجاز وجود دارد یا خیر.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `gateway.config.ts:198-215` — تابع `resolveTenantFromHost` مکانیزم `domainAllowList` را پیاده‌سازی می‌کند: برای هر brand، `domainAllowList` بررسی می‌شود و اگر host در allowlist نباشد، `undefined` برگردانده می‌شود. `main.ts:531-538` — اگر `BRAND_HOST_TENANT_MAP` پیکربندی شده باشد و host ناشناخته باشد (و مسیر public نباشد)، `403 UNKNOWN_HOST` برگردانده می‌شود. با این حال، اگر `BRAND_HOST_TENANT_MAP` پیکربندی نشده باشد (`hasBrandMap === false`)، این بررسی به‌طور کامل skip می‌شود.

### ۳.۳ عدم IP allowlisting برای admin endpoints
- **اندپوینت**: `GET /admin/circuit-breakers`، `POST /admin/circuit-breakers/:serviceName/reset`
- **اشکال**: admin endpoints فقط با AdminGuard محافظت می‌شوند و هیچ IP allowlisting یا network-level restriction وجود ندارد. اگر یک admin token لو برود، از هر IP قابل misuse است.
- **کد**: `admin.guard.ts:20-44` — فقط بررسی JWT roles/permissions؛ هیچ بررسی IP در `main.ts` یا `admin.guard.ts` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۳.۴ عدم protection در برابر credential stuffing در auth routes
- **اندپوینت**: `/auth/login`، `/auth/register`، `/auth/forgot-password`، `/auth/verify-otp`
- **اشکال**: این مسیرها public هستند و rate limiting per-tenant-per-IP انجام می‌شود (نه per-identity)، زیرا در این مسیرها هنوز userId وجود ندارد. بدون per-identity rate limiting (per phone number یا per email)، credential stuffing و OTP brute-force از IPهای مختلف ممکن است.
- **کد**: `main.ts:630` — `const rateLimitIdentity = req.userId ? `${tenantId}:${req.userId}` : `${tenantId}:${clientIp}`;` — برای auth routes، `req.userId` وجود ندارد (احراز هویت نشده)، پس identity بر اساس IP است. یک مهاجم با rotation IP می‌تواند این محدودیت را bypass کند.
- **وضعیت**: ✅ تأیید شد

---

## ۴. Rate Limiting و Circuit Breaker

### ۴.۱ ~~عدم per-user rate limiting~~
- **اندپوینت**: Proxy Behavior (rate limiting)
- ~~**اشکال**: rate limiting per-tenant و per-endpoint انجام می‌شود اما per-user rate limit وجود ندارد.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: `main.ts:630` — `const rateLimitIdentity = req.userId ? `${tenantId}:${req.userId}` : `${tenantId}:${clientIp}`;` — برای کاربران احراز‌شده، identity شامل `userId` است و rate limit per-user اعمال می‌شود. کلید rate limit به‌صورت `${identity}:${endpoint}` است (`main.ts:239`) که per-user-per-endpoint است. برای کاربران احراز‌نشده، per-IP اعمال می‌شود.

### ۴.۲ عدم differentiated rate limits بر اساس endpoint sensitivity
- **اندپوینت**: Proxy Behavior (rate limiting)
- **اشکال**: rate limit با `RATE_LIMIT_MAX_PER_TENANT` یکپارچه برای تمام endpoint‌ها اعمال می‌شود. endpoint‌های حساس (مثل `/auth/login`، `/fnol`، `/policies/quote`) باید rate limit سخت‌گیرانه‌تری نسبت به endpoint‌های read-only (مثل `/policies` list) داشته باشند.
- **کد**: `main.ts:632` — `const maxRequestsPerTenant = parseInt(process.env.RATE_LIMIT_MAX_PER_TENANT || '100', 10);` — یک مقدار ثابت برای تمام endpoint‌ها؛ هیچ مکانیزم per-endpoint override وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم circuit breaker fallback response معنادار
- **اندپوینت**: Proxy Behavior (circuit breaker)
- **اشکال**: وقتی circuit OPEN است، gateway خطای `503 SERVICE_UNAVAILABLE` برمی‌گرداند اما هیچ fallback یا cached response ارائه نمی‌شود. برای endpoint‌های read-only (مثل لیست products)، می‌توان از cached response یا stale-while-revalidate استفاده کرد تا UX بهتر حفظ شود.
- **کد**: `main.ts:119` — `throw new Error('Circuit breaker is OPEN')`؛ `main.ts:873-880` — catch block خطای 503 برمی‌گرداند. هیچ cache layer وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ عدم circuit breaker برای tenant خاص
- **اندپوینت**: Proxy Behavior (circuit breaker)
- **اشکال**: circuit breaker per-service است نه per-tenant. اگر یک tenant با ترافیک مخرب باعث fail یک سرویس شود، circuit breaker برای تمام tenant‌ها باز می‌شود و tenant‌های سالم نیز آسیب می‌بینند. باید circuit breaker per-tenant-per-service باشد.
- **کد**: `main.ts:225` — `const circuitBreakers = new Map<string, CircuitBreaker>()`؛ `main.ts:325-338` — `getCircuitBreaker(serviceName)` کلید فقط `serviceName` (در واقع `u.host`) است؛ `main.ts:359` — `const serviceName = u.host`؛ هیچ tenant dimension در کلید circuit breaker وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۵ (جدید) Health check از طریق circuit breaker عبور می‌کند
- **اندپوینت**: Proxy Behavior (upstream health check)
- **اشکال**: تابع `checkUpstreamHealth` از `requestNoProxy` استفاده می‌کند که از طریق `circuitBreaker.execute` عبور می‌کند. این یعنی failure در health check به‌عنوان failure در circuit breaker ثبت می‌شود و می‌تواند باعث باز شدن circuit breaker شود. این یک circular dependency است: health check fail → circuit breaker opens → ترافیک مسدود می‌شود.
- **کد**: `main.ts:670` — `const r = await requestNoProxy({...})` داخل `checkUpstreamHealth`؛ `main.ts:360-393` — `requestNoProxy` از `circuitBreaker.execute` استفاده می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۵. Header Forwarding و Data Integrity

### ۵.۱ عدم validation X-Tenant-Context-Signature در downstream
- **اندپوینت**: Proxy Behavior (headers forwarded)
- **اشکال**: gateway `X-Tenant-Context-Signature` (HMAC) را به downstream forward می‌کند اما مشخص نیست که آیا downstream services این signature را validate می‌کنند یا خیر. اگر validate نشود، یک سرویس downstream که مستقیماً (بدون gateway) فراخوانی شود، می‌تواند tenant spoof کند. این مسئولیت downstream است و از کد gateway قابل تأیید نیست.
- **کد**: `main.ts:624` — `signInternalContext(tenantContextPayload)` امضا را تولید می‌کند؛ `main.ts:809` — `headers['x-tenant-context-signature'] = String(req.tenantContextSignature)` آن را به downstream forward می‌کند؛ `gateway.config.ts:217-228` — `signInternalContext` از HMAC-SHA256 با `GATEWAY_SIGNATURE_SECRET` استفاده می‌کند.
- **وضعیت**: ✅ تأیید شد (مسئولیت downstream)

### ۵.۲ ~~عدم stripping حساس header‌های client~~
- **اندپوینت**: Proxy Behavior (headers forwarded)
- ~~**اشکال**: مشخص نیست که gateway header‌های خطرناک client (مانند `X-Forwarded-For` spoof، `X-Real-IP` spoof، `X-User-Id` spoof) را strip می‌کند یا خیر.~~
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `main.ts:756-777` — مجموعه `governanceHeaders` شامل `x-user-id`، `x-forwarded-for`، `x-forwarded-host`، `x-forwarded-proto`، `x-forwarded-port`، `forwarded`، `host`، `connection` و سایر hop-by-hop headers است. `main.ts:801-805` — این headers از incoming request strip می‌شوند (`if (governanceHeaders.has(lk)) continue`). سپس `main.ts:807-812` مقادیر canonical و verified را اضافه می‌کند (`x-user-id` از `req.userId` احراز‌شده، `x-tenant-id` از tenant resolved، و غیره).

### ۵.۳ عدم forwarded header برای IP و trace
- **اندپوینت**: Proxy Behavior (headers forwarded)
- **اشکال**: `X-Forwarded-For` و `X-Real-IP` از incoming request strip می‌شوند (در `governanceHeaders`) اما gateway مقادیر جدیدی با IP واقعی client به downstream اضافه نمی‌کند. این باعث می‌شود downstream services نتوانند IP واقعی client را برای audit، fraud detection و rate limiting تشخیص دهند.
- **کد**: `main.ts:756-777` — `governanceHeaders` شامل `x-forwarded-for` و `forwarded`؛ `main.ts:801-805` — این headers strip می‌شوند؛ `main.ts:807-812` — هیچ `x-forwarded-for` یا `x-real-ip` با IP کلاینت اضافه نمی‌شود. `main.ts:629` — `clientIp` محاسبه می‌شود اما فقط برای rate limit identity استفاده می‌شود، نه برای forwarding.
- **وضعیت**: ✅ تأیید شد

---

## ۶. بهینه‌سازی و عملکرد

### ۶.۱ عدم response caching برای endpoint‌های read-only
- **اندپوینت**: Proxy Behavior
- **اشکال**: gateway هیچ response caching انجام نمی‌دهد. endpoint‌های read-only که به ندرت تغییر می‌کنند (مثل لیست products، brand config) در هر request به downstream فرستاده می‌شود. این باعث افزایش latency و بار غیرضروری روی downstream می‌شود.
- **کد**: `main.ts:782-881` — handler مستقیماً `requestNoProxy` را فراخوانی می‌کند و response را برمی‌گرداند؛ هیچ cache layer یا ETag/If-None-Match handling وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم request compression
- **اندپوینت**: Proxy Behavior
- **اشکال**: gateway response compression (gzip/brotli) را انجام نمی‌دهد. پاسخ‌های JSON بزرگ (مثل لیست policies با pagination) بدون compression پهنای باند زیادی مصرف می‌کنند.
- **کد**: `main.ts:450-451` — `FastifyAdapter` فقط `bodyLimit` پیکربندی شده است؛ هیچ `@fastify/compress` plugin ثبت نشده است.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم request body size limit قابل پیکربندی per-endpoint
- **اندپوینت**: Proxy Behavior (`BODY_LIMIT_BYTES`)
- **اشکال**: body size limit با `BODY_LIMIT_BYTES` یکپارچه (10MB) برای تمام endpoint‌ها اعمال می‌شود. endpoint‌های file upload (مثل documents در FNOL) نیاز به limit بالاتر و endpoint‌های متادیتا نیاز به limit پایین‌تر دارند.
- **کد**: `main.ts:450` — `const bodyLimit = parseInt(process.env.BODY_LIMIT_BYTES || '10485760', 10)`؛ `main.ts:451` — `new FastifyAdapter({ bodyLimit })`؛ `main.ts:490-497` — hook `onRequest` فقط `bodyLimit` کلی را بررسی می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۶.۴ عدم WebSocket / SSE support
- **اندپوینت**: Proxy Behavior
- **اشکال**: gateway به عنوان reverse proxy HTTP طراحی شده است و WebSocket یا Server-Sent Events (SSE) را پشتیبانی نمی‌کند. برای قابلیت‌های real-time (مثل claim status tracking، notification) نیاز به long-lived connection است.
- **کد**: `main.ts:396-447` — `singleRequestNoProxy` از `http.request`/`https.request` استفاده می‌کند که WebSocket upgrade را پشتیبانی نمی‌کند؛ `main.ts:883-884` — `fastify.all` فقط HTTP methods را هندل می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۶.۵ (جدید) مقدار پیش‌فرض ناامن برای GATEWAY_SIGNATURE_SECRET
- **اندپوینت**: Proxy Behavior (tenant context signing)
- **اشکال**: اگر متغیر محیطی `GATEWAY_SIGNATURE_SECRET` تنظیم نشده باشد، از مقدار پیش‌فرض `'default-gateway-secret-do-not-use-in-production'` استفاده می‌شود. این مقدار در کد سورس موجود است و هر کسی می‌تواند آن را ببیند. با این مقدار، یک سرویس downstream مخرب می‌تواند HMAC signature معتبر جعل کند.
- **کد**: `gateway.config.ts:217-219` — `return process.env.GATEWAY_SIGNATURE_SECRET || 'default-gateway-secret-do-not-use-in-production';`
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۶.۶ (جدید) عدم startup validation برای JWT_SECRET در حالت HS256
- **اندپوینت**: Proxy Behavior (JWT verification)
- **اشکال**: اگر `JWT_SECRET` تنظیم نشده باشد و یک توکن HS256 ارسال شود، gateway در runtime خطای `GATEWAY_MISCONFIGURED` برمی‌گرداند. اما هیچ بررسی در startup وجود ندارد که این مشکل را قبل از شروع سرویس شناسایی کند. `GATEWAY_STRICT_STARTUP` فقط برای routes بررسی می‌کند، نه برای JWT_SECRET.
- **کد**: `jwt-verifier.ts:84-86` — `if (!this.jwtSecret) { return Promise.resolve({ error: { code: 'GATEWAY_MISCONFIGURED', message: 'JWT_SECRET is not configured' } }); }`؛ `main.ts:723-729` — `validateRequiredRoutes` فقط routes را بررسی می‌کند.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

---

## ۷. ذینفعان و مصرف‌کنندگان

### ۷.۱ عدم BFF-aware routing
- **اشکال**: gateway تمام ترافیک را بر اساس `SERVICE_ROUTES` proxy می‌کند اما هیچ awareness از BFF‌ها (catalog-bff، customer-portal-bff، insurer-operations-bff) ندارد. در واقع این سه BFF اصلاً در `SERVICE_ROUTES` تعریف نشده‌اند. فقط `broker-portal-bff` و `channel-workspace-bff` مسیر دارند. gateway قبل از proxy کردن وضعیت سلامت upstream را بررسی می‌کند (`isUpstreamHealthy`) و اگر ناسالم باشد 503 برمی‌گرداند، اما این بررسی فقط برای سرویس‌های موجود در `SERVICE_ROUTES` انجام می‌شود.
- **کد**: `gateway.config.ts:59-98` — `SERVICE_ROUTES` شامل `broker-portal-bff` (خط ۹۶) و `channel-workspace-bff` (خط ۹۷) است اما `catalog-bff`، `customer-portal-bff` و `insurer-operations-bff` وجود ندارند؛ `main.ts:787-793` — `if (!isUpstreamHealthy(name)) { reply.status(503)... }`.
- **وضعیت**: ✅ تأیید شد (با اصلاح: gateway برای BFFهای موجود health check انجام می‌دهد، اما سه BFF اصلاً route نشده‌اند)

### ۷.۲ عدم service mesh integration
- **اشکال**: gateway به صورت standalone عمل می‌کند و هیچ service mesh (مثل Istio) یکپارچه‌سازی نشده است. بدون service mesh، mTLS بین gateway و downstream تضمین نمی‌شود و ترافیک داخلی به صورت plaintext است.
- **کد**: `main.ts:396-447` — `singleRequestNoProxy` از `http.request`/`https.request` استفاده می‌کند؛ هیچ mTLS یا certificate configuration در upstream request وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۷.۳ ~~عدم API key / mTLS برای partner-gateway~~
- ~~**اشکال**: gateway برای مسیرهای partner-gateway از همان JWT verification استفاده می‌کند اما partner-gateway برای federation از certificate-based auth استفاده می‌کند.~~
- **وضعیت**: ~~رد شد~~ — **رد شد**: `gateway.config.ts:59-98` — `SERVICE_ROUTES` هیچ مسیری برای `partner-gateway` ندارد. partner-gateway اصلاً از طریق api-gateway proxy نمی‌شود و این نقص بر اساس فرض اشتباه (وجود مسیر partner-gateway در gateway) مطرح شده است.

### ۷.۴ عدم documentation endpoint (OpenAPI aggregation)
- **اشکال**: gateway هیچ اندپوینتی برای aggregate یا serve کردن OpenAPI spec سرویس‌های downstream ندارد. توسعه‌دهندگان و consumer‌ها باید جداگانه با هر سرویس برای documentation ارتباط برقرار کنند که در یک معماری microservice باعث fragmentation می‌شود.
- **کد**: `health.controller.ts` فقط health و admin endpoints را دارد؛ `main.ts` هیچ OpenAPI/Swagger endpoint ثبت نمی‌کند.
- **وضعیت**: ✅ تأیید شد

### ۷.۵ (جدید) عدم CORS allowlist صریح در production
- **اندپوینت**: Proxy Behavior (CORS)
- **اشکال**: اگر `CORS_ORIGINS` تنظیم نشده باشد و `NODE_ENV` برابر `production` نباشد، gateway تمام originها را اجازه می‌دهد (`cb(null, true)`). اگر `NODE_ENV` به‌اشتباه در production تنظیم نشده باشد، CORS به‌طور کامل باز است.
- **کد**: `main.ts:476-479` — `if (CORS_ORIGINS.length === 0) { return cb(null, process.env.NODE_ENV === 'production' ? false : true); }`
- **وضعیت**: ✅ تأیید شد (نقص جدید)
