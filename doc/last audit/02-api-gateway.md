# گزارش ممیزی کد `api-gateway`

**تاریخ بررسی:** ۲۰۲۶/۰۷/۲۶
**دامنه:** تمام ۴ فایل `src/`، `main.ts` کامل، `health.controller.ts`، `app.module.ts`، `TRUTH.md`، `package.json`، `tsconfig.json` و `Dockerfile`
**وضعیت واقعی بر اساس کد:** **Operational با چند نقص P0 در tenant/auth boundary و نقص‌های P1 در resilience و health**

## ۱. ساختار واقعی

`app.module.ts` فقط `HealthController` را ثبت می‌کند؛ routing/proxy، JWT، rate limit، circuit breaker، upstream health و server hooks همگی در `src/main.ts` به‌صورت متمرکز پیاده شده‌اند. تست اختصاصی در پوشه سرویس یا `test/` وجود ندارد؛ بنابراین مسیرها و کنترل‌های امنیتی از طریق کد بررسی شده‌اند و runtime proof جداگانه لازم است.

مسیرهای تعریف‌شده در `main.ts` شامل auth، claims، read model، fraud، documents، copilot، orchestration/work-items/DLQ، regulatory، flags، party، complaints، policies، payments، collections، AML، reinsurance، product، underwriting، reporting، monitoring، document AI، sales network، notifications، customer portal، agent portal، workflow، rule-engine، knowledge، model-switchboard و billing هستند. بعضی targetها default خالی دارند و فقط در صورت env فعال می‌شوند.

---

## ۲. یافته‌های بحرانی

### GW-CODE-001 — tenant ورودی از client بر tenant داخل JWT مقدم می‌شود

**شاهد کد:** hook اصلی در `main.ts` ابتدا خط 255 مقدار `x-tenant-id` یا `DEFAULT_TENANT_ID` یا `'default'` را در `req.tenantId` قرار می‌دهد. سپس در خطوط 302–308 اگر JWT claim `tenantId` وجود داشته باشد، فقط در صورت `!req.tenantId` آن را جایگزین می‌کند؛ این شرط عملاً همیشه false است.

**اثر:** caller می‌تواند tenant header را تغییر دهد و gateway آن را به upstream در خطوط 491–493 منتقل می‌کند. این با هدف جداسازی tenant ناسازگار است و امکان cross-tenant routing/access ایجاد می‌کند.

**اصلاح:** پس از verify، tenant از claim/identity معتبر تعیین شود؛ header فقط برای تطبیق پذیرفته شود؛ mismatch با 403/401 رد شود؛ برای public login tenant selection باید allow-list و onboarding policy داشته باشد؛ `'default'` در production حذف شود.

### GW-CODE-002 — verify توکن فقط با secret محلی، بدون issuer/audience/algorithm policy است

**شاهد کد:** `main.ts` خطوط 294–302 فقط `jwt.verify(token, jwtSecret)` را صدا می‌زند. برخلاف guardهای برخی سرویس‌ها، `issuer`, `audience` و `algorithms` در options تعیین نشده‌اند و JWKS/RS256 gateway path وجود ندارد.

**اثر:** gateway ممکن است توکن‌هایی را بپذیرد که issuer/audience صحیح سامانه نیستند؛ قرارداد verification با سرویس‌هایی که JWKS/RS256 می‌خواهند یکسان نیست.

**اصلاح:** policy واحد IAM شامل issuer، audience، allowed algorithms و key rotation؛ JWKS cache برای توکن‌های سازمانی؛ fail-closed در نبود config؛ تست token forged، wrong issuer/audience، expired، wrong algorithm و key rotation.

### GW-CODE-003 — endpointهای مدیریتی circuit breaker بدون احراز هویت هستند

**شاهد کد:** `HealthController` مسیرهای `GET /admin/circuit-breakers` و `POST /admin/circuit-breakers/:serviceName/reset` را تعریف می‌کند و در `app.module.ts` guard ثبت نشده است. در `main.ts` هم public path logic این مسیرها را صریحاً محافظت نمی‌کند، اما چون این endpointها قبل/جدا از proxy Nest route هستند باید guard مستقل داشته باشند.

**اثر:** هر caller داخلی/خارجی که به gateway دسترسی داشته باشد می‌تواند وضعیت circuit breaker را بخواند یا آن را reset کند و کنترل عملیاتی را مختل کند.

**اصلاح:** admin guard با JWT+permission، audit، tenant/role scope و rate limit؛ health عمومی فقط اطلاعات غیرحساس بدهد.

### GW-CODE-004 — proxy هویت را به header ساده تبدیل می‌کند و downstream باید دوباره اعتماد را کنترل کند

**شاهد کد:** gateway پس از verify فقط `X-User-Id` را در خطوط 329 و 494–495 اضافه می‌کند. `Authorization` اولیه نیز در loop headerها به upstream می‌رسد، اما gateway claimهای tenant/roles/scopes را canonical و امضاشده به‌صورت مستقل منتقل نمی‌کند.

**اثر:** سرویس‌های downstream اگر به `x-user-id` اعتماد کنند، هویت قابل جعل یا ناسازگار می‌شود؛ در حالی‌که هدف gateway باید مرز اعتماد روشن داشته باشد.

**اصلاح:** downstream همیشه token را خودش verify کند یا gateway assertion امضاشده کوتاه‌عمر با audience سرویس بسازد؛ هیچ سرویس به user/tenant header بدون verify اعتماد نکند؛ قرارداد propagation مستند و تست شود.

---

## ۳. نواقص P1 در احراز هویت و route policy

### GW-CODE-005 — allow-list مسیرهای public با `includes` نوشته شده است

**شاهد کد:** در `main.ts` خطوط 317–320، `publicPaths.some(p => url.includes(p))` استفاده می‌شود.

**اثر:** مسیرهایی که صرفاً شامل substring `/health` یا `/auth/login` هستند ممکن است اشتباهاً public شوند؛ این روش route boundary دقیق نیست.

**اصلاح:** parser مسیر، exact route/method allow-list، route metadata و تست `/foo/auth/login-like`, query string و encoded path.

### GW-CODE-006 — login/refresh/federation و callbackها در gateway policy یکسان و دقیق نیستند

**شاهد کد:** public paths فقط `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/health`, `/gateway/health` هستند؛ اما auth service مسیرهای SSO و federation، callback و registration دارد. این‌ها یا با token لازم fail می‌شوند یا برای public شدن به substring policy وابسته‌اند.

**اثر:** inconsistency میان API contract و gateway؛ مسیرهای login/SSO یا inaccessible می‌شوند یا با تغییر allow-list ناخواسته public.

**اصلاح:** route registry شامل method، auth mode، audience، permission، body limit و upstream؛ contract test برای تمام public/private مسیرها.

### GW-CODE-007 — token verification فقط HS256 ecosystem را پوشش می‌دهد

**شاهد کد:** gateway `jwt.verify` را با `JWT_SECRET` انجام می‌دهد؛ هیچ JWKS client یا branch برای RS256 ندارد. در عین حال auth guardهای دیگر مسیر JWKS را تعریف کرده‌اند.

**اثر:** توکن معتبر سازمانی ممکن است در gateway رد شود یا برای عبور مجبور به مسیر HS256 شود؛ مرز federation یکپارچه نیست.

**اصلاح:** انتخاب روش verification براساس issuer/key set معتبر، نه الگوریتم ادعاشده؛ key rotation، cache و timeout؛ ممنوعیت fallback ناامن.

### GW-CODE-008 — CORS بدون policy صریح ثبت شده است

**شاهد کد:** `fastify.register(cors)` بدون origin allow-list، credential policy یا method/header محدود اجرا می‌شود.

**اثر:** در صورت پیش‌فرض permissive plugin، originهای ناخواسته و credentialed browser requests ممکن است پذیرفته شوند.

**اصلاح:** `CORS_ORIGINS` اجباری در production، allow-list per environment/tenant، methods/headers محدود و تست preflight.

### GW-CODE-009 — حذف headerهای governance فقط برای چند capitalization انجام می‌شود

**شاهد کد:** خطوط 480–490 نام‌های lower و چند upper/literal را حذف می‌کنند. Node معمولاً headerها را lower-case می‌کند، اما منطق canonical باید case-insensitive مطمئن و central باشد.

**اثر:** احتمال عبور duplicate یا header متعارض و ambiguity در downstream.

**اصلاح:** نرمال‌سازی با map lower-case، حذف همه headerهای hop-by-hop و governance قبل از set canonical؛ تست header duplication.

---

## ۴. نواقص P1 در resilience و محدودسازی

### GW-CODE-010 — rate limit سفارشی in-memory و با tenant قابل‌جعل است

**شاهد کد:** `rateLimitStore` در خطوط 112–135 یک `Map` داخل process است و key با tenant header ساخته می‌شود. علاوه بر آن، `@fastify/rate-limit` نیز global ثبت شده است.

**اثر:** در چند instance state مشترک نیست؛ با تغییر tenant header quota دور زده می‌شود؛ دو محدودکننده رفتار و error contract متفاوت ایجاد می‌کنند؛ Map entries فقط هنگام درخواست بعدی پاک می‌شوند و می‌تواند رشد کند.

**اصلاح:** یک سیاست واحد، Redis/shared store، key مبتنی بر verified tenant/user/IP، cleanup/TTL، quota متفاوت برای login/claims/payment و metrics.

### GW-CODE-011 — circuit breaker فقط in-memory است

**شاهد کد:** `CircuitBreaker` و map آن در `main.ts` خطوط 26–110 process-local هستند.

**اثر:** restart state را از بین می‌برد و چند replica تصمیم متفاوت می‌گیرند.

**اصلاح:** state توزیع‌شده یا circuit breaker per instance با آگاهی از load balancer؛ ثبت state در metrics؛ game day و failover test.

### GW-CODE-012 — circuit breaker خطاهای HTTP را failure حساب نمی‌کند

**شاهد کد:** `requestNoProxy` در پاسخ HTTP هر status را resolve می‌کند. `CircuitBreaker.execute` فقط promise reject را failure می‌داند. بنابراین 500/502/503 از upstream به‌تنهایی failure breaker را افزایش نمی‌دهد.

**اثر:** وقتی upstream خطای application می‌دهد، breaker ممکن است باز نشود و بار خطا ادامه یابد.

**اصلاح:** policy مشخص برای statusهای 5xx، timeout، connection error و 429؛ عدم شمارش 4xx؛ تست threshold و half-open همزمان.

### GW-CODE-013 — timeout و retry policy ناقص است

**شاهد کد:** `requestNoProxy` timeout پیش‌فرض ۳۰ ثانیه دارد، اما retry طبقه‌بندی‌شده برای خطاهای idempotent وجود ندارد؛ route handler catch فقط 502 برمی‌گرداند.

**اثر:** درخواست‌های کاربر می‌توانند ۳۰ ثانیه منابع را نگه دارند و خطای downstream به عملیات مالی/صدور نیمه‌کاره منجر شود.

**اصلاح:** timeout per route، retry محدود فقط برای GET/idempotent، عدم retry پرداخت/صدور بدون idempotency، deadline propagation و error mapping.

---

## ۵. نواقص route و integration

### GW-CODE-014 — route targetهای خالی به‌صورت conditional فعال‌اند

**شاهد کد:** برای collections، reporting، document-ai، sales-network و چند سرویس دیگر target از `normalizeUrl(env) || ''` می‌آید و route فقط در صورت target فعال ثبت می‌شود.

**اثر:** compose/محیطی که env را کامل ندارد بخشی از سامانه را silently فاقد route می‌کند؛ build موفق وجود route را تضمین نمی‌کند.

**اصلاح:** configuration validation هنگام startup برای routeهای P0؛ route disabled با status/metric واضح؛ environment manifest و smoke test برای تمام routeها.

### GW-CODE-015 — اختلاف پورت/مسیر بین کد، TRUTH و compose نیازمند reconciliation است

**شاهد کد:** main defaultها عمدتاً `180xx` هستند، `TRUTH.md` بخشی از defaultها را 300x ثبت کرده و Dockerfile gateway `EXPOSE 3000` دارد؛ `main.ts` نیز default port 3000 دارد. صحت compose باید با runtime واقعی تطبیق داده شود.

**اثر:** health check، proxy و مستندات ممکن است به target متفاوت متصل شوند.

**اصلاح:** یک registry تولیدی برای service URL/port؛ تولید compose/env از همان registry؛ contract test route→health.

### GW-CODE-016 — upstream health قبل از first check سالم فرض می‌شود

**شاهد کد:** `isUpstreamHealthy` خطوط 378–381 اگر health state وجود نداشته باشد `true` برمی‌گرداند.

**اثر:** route قبل از اولین probe به upstream خراب ارسال می‌شود؛ false healthy و latency اولیه.

**اصلاح:** وضعیت `unknown` و readiness policy؛ برای P0ها تا probe موفق route را محدود یا پاسخ 503 بدهید.

### GW-CODE-017 — health Kafka واقعی نیست

**شاهد کد:** `health.controller.ts` خطوط 51–66 صرفاً وجود `KAFKA_BROKERS` را به status ok تبدیل می‌کند و Kafka admin/client ping انجام نمی‌دهد.

**اثر:** broker قطع یا credential اشتباه، سالم گزارش می‌شود.

**اصلاح:** admin metadata/connection با timeout، status degraded، broker latency و alert.

### GW-CODE-018 — deep health فقط سرویس‌هایی را می‌سنجد که env آن‌ها تنظیم شده است

**شاهد کد:** loop خطوط 100–125 فقط `if (service.url)` را بررسی می‌کند و از defaultهای route map استفاده نمی‌کند.

**اثر:** سرویس routeشده با default ممکن است در deep health اصلاً بررسی نشود.

**اصلاح:** health target و route target از یک map استفاده کنند؛ optional/required بودن هر dependency ثبت شود.

---

## ۶. نواقص proxy و داده

- `requestNoProxy` همه headerهای ورودی string را کپی می‌کند؛ allow-list برای headerها، حذف `forwarded`, `x-forwarded-*` و کنترل credentialها کامل نیست.
- پاسخ JSON با `JSON.parse` پردازش می‌شود؛ JSON خراب، پاسخ خالی یا content-type اشتباه به 502 عمومی تبدیل می‌شود و body اصلی/trace از بین می‌رود.
- body برای multipart، stream، فایل و raw binary به‌صورت کامل پشتیبانی نشده و در بسیاری موارد به `req.body` parsed وابسته است؛ برای Document/Document AI و upload باید تست شود.
- proxy پاسخ `set-cookie`، cache، location و hop-by-hop را بدون policy اختصاصی منتقل می‌کند؛ برای login/SSO باید رفتار cookie و redirect صریح باشد.
- `req.url` برای محاسبه endpoint rate limit شامل query string است؛ یک endpoint با queryهای متعدد کلیدهای متعدد و quota قابل دورزدن/پراکنده ایجاد می‌کند.
- `DEFAULT_TENANT_ID || 'default'` روی محیطی که env فراموش شده، خطای configuration را پنهان می‌کند.

---

## ۷. health و عملیات

- `/health` همیشه `{status:'ok'}` می‌دهد و DB وجود ندارد چون `AppModule` هیچ TypeORM module ثبت نمی‌کند؛ این endpoint فقط liveness است و باید همین‌طور مستند شود.
- `/health/deep` پیام خطای خام dependency را برمی‌گرداند؛ در محیط عمومی می‌تواند اطلاعات topology/error را افشا کند.
- health checkها sequential اجرا می‌شوند و `setInterval` بدون کنترل overlap است؛ اگر یک چرخه طولانی شود، چرخه بعدی می‌تواند هم‌زمان شروع شود.
- `runHealthChecks` خطا را silently catch می‌کند؛ metric/log کافی برای failure scheduler وجود ندارد.
- `logger` structured است، اما در startup مسیر flags health و برخی خطاها جزئیات body upstream را log می‌کند؛ redaction باید بررسی شود.
- body limit فقط `content-length` را کنترل می‌کند؛ chunked requests یا decompression محدودیت مؤثر را دور می‌زنند و Fastify parser limit نیز باید تنظیم شود.

---

## ۸. نقاط قوت تأییدشده

- امضای JWT در کد جاری با `jwt.verify` انجام می‌شود؛ ادعای قدیمی «decode-only» برای نسخه فعلی تأیید نشد.
- correlation ID ساخته و به upstream منتقل می‌شود.
- governance headerها قبل از forwarding canonicalize می‌شوند.
- timeout شبکه، circuit breaker، upstream health probe، body size check، CORS/Helmet plugin و rate-limit plugin وجود دارند.
- route map متمرکز است و targetهای optional امکان فعال‌سازی محیطی دارند.
- پاسخ خطای proxy credential یا body کامل upstream را مستقیماً برنمی‌گرداند.

---

## ۹. برنامه اصلاحی و معیار پذیرش

| اولویت | اقدام | معیار پذیرش |
|---|---|---|
| P0 | tenant از JWT/identity معتبر و mismatch denial | تغییر header tenant بدون تغییر identity رد شود |
| P0 | verification policy واحد JWT/JWKS | issuer/aud/alg/key rotation و forged token تست شود |
| P0 | محافظت admin health/circuit endpoints | user بدون permission نتواند reset/observe کند |
| P1 | public route registry دقیق | method/path/query/redirect contract تست شود |
| P1 | rate limit توزیع‌شده و key معتبر | چند replica و tenant spoofing تست شود |
| P1 | circuit breaker با status policy | 5xx/timeout/half-open و restart رفتار تعریف‌شده داشته باشند |
| P1 | route/health/config registry مشترک | همه targetهای required در startup validate شوند |
| P1 | واقعی‌سازی Kafka/dependency health | قطع broker/credential خطا بدهد |
| P1 | proxy binary/multipart/cookie/redirect policy | upload، SSO، download و callback بدون corruption اجرا شود |
| P2 | scheduler، metrics و redaction | health lag، probe failure و sensitive fields قابل پایش باشند |
| P2 | تست اختصاصی gateway | route contract، security، load و resilience در CI اجرا شود |

## ۱۰. نتیجه نهایی

`api-gateway` از نظر تعداد route، forwarding و کنترل‌های پایه ساختار قابل‌قبولی دارد؛ اما در وضعیت فعلی **مرز اعتماد tenant و token قطعی نیست**. تا زمانی که tenant header از client قابل‌اعتماد نباشد، issuer/audience/JWKS policy اعمال نشود، endpointهای مدیریتی محافظت نشوند و health/resilience توزیع‌شده تکمیل نشود، gateway برای production Enterprise قابل تأیید نیست.
