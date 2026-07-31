# Sales-Network Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: sales-network-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. مدل Partner و قراردادها

### ۱.۱ عدم پشتیبانی Distribution Agreement با Carrier
- **اندپوینت**: `GET /partners`، `POST /partners`  
- **اشکال**: Partner مدل `type: broker|agent|branch` دارد اما هیچ اندپوینتی برای ایجاد یا مدیریت Distribution Agreement بین broker و carrier وجود ندارد. طرح کارگزاری Distribution Agreement را به عنوان موجودیت اصلی بین کارگزار و بیمه‌گر تعریف می‌کند که شامل محصول‌های پوشش‌داده شده، نرخ کمیسیون، field ACL و بازه زمانی است.

### ۱.۲ عدم مدل‌سازی Commission Split
- **اشکال**: قراردادها (`POST /partners/:partnerId/contracts`) فقط نوع و بازه زمانی را پشتیبانی می‌کنند. هیچ فیلدی برای commission split (تقسیم کمیسیون بین broker و sub-agent) وجود ندارد. طرح کارگزاری نیازمند مدل‌سازی split percentage به ازای هر سطح سلسله‌مراتبی است.

### ۱.۳ عدم مدیریت Cap و Floor کمیسیون
- **اشکال**: هیچ اندپوینتی برای تعریف cap (سقف) و floor (کف) کمیسیون به ازای قرارداد یا محصول وجود ندارد. طرح کارگزاری نیازمند این کنترل‌ها برای جلوگیری از over/under-payment است.

---

## ۲. Ledger و Settlement

### ۲.۱ عدم یکپارچه‌سازی با billing-service
- **اشکال**: Ledger endpoints (`GET /partners/:partnerId/ledger`) موجودی را نشان می‌دهند اما هیچ مکانیزم sync با `billing-service` برای settlement batches وجود ندارد. billing-service اندپوینت‌های settlement مستقل دارد که ممکن است با ledger sales-network هماهنگ نباشد.

### ۲.۲ عدم clawback management
- **اشکال**: هیچ اندپوینتی در sales-network-service برای clawback (بازپس‌گیری کمیسیون در صورت cancel/void بیمه‌نامه) وجود ندارد. billing-service اندپوینت `/brokerage/clawbacks/calculate` و `/brokerage/clawbacks/apply` دارد اما sales-network-service از این عملیات بی‌اطلاع است.

### ۲.۳ عدم reconciliation بین ledger و settlements
- **اشکال**: هیچ اندپوینتی برای reconciliation بین ledger entries و settlement batches پرداخت شده وجود ندارد. این می‌تواند باعث مغایرت مالی شود.

---

## ۳. KPI و گزارش‌گیری

### ۳.۱ عدم KPI اختصاصی کارگزاری
- **اندپوینت**: `GET /partners/:partnerId/kpis`  
- **اشکال**: KPIها شامل `totalPolicies`، `totalPremium`، `totalCommission`، `conversionRate` است اما KPI‌های حیاتی کارگزاری مانند persistency rate، retention rate، loss ratio per broker، و average premium per product وجود ندارند.

### ۳.۲ عدم dashboard برای broker level
- **اشکال**: KPI فقط به ازای partner قابل دسترسی است. هیچ dashboard سطح broker organization وجود ندارد که تجمیع KPI تمام sub-agentهای زیرمجموعه را نشان دهد.

---

## ۴. Agent Portal

### ۴.۱ عدم فیلتر بر اساس Organization
- **اندپوینت**: `GET /agent-portal/agent/:agentId/policies`  
- **اشکال**: اندپوینت‌های agent portal فقط `X-Partner-Id` header را استفاده می‌کنند اما هیچ فیلتری بر اساس `organizationId` یا `brokerOrganizationId` اعمال نمی‌کنند. یک agent می‌تواند به داده‌های خارج از scope سازمان خود دسترسی پیدا کند.

### ۴.۲ عدم تفکیک دسترسی broker vs sub-agent
- **اشکال**: تمام اندپوینت‌های agent portal از همان permission (`agent_portal:*`) استفاده می‌کنند. هیچ تفکیکی بین دسترسی broker (که باید تمام sub-agentها را ببیند) و sub-agent (که فقط داده‌های خود را می‌بیند) وجود ندارد.

### ۴.۳ عدم endpoint برای مدیریت sub-agent توسط broker
- **اشکال**: broker باید بتواند sub-agentهای خود را ایجاد، suspend یا terminate کند اما هیچ اندپوینتی برای این کار در sales-network-service وجود ندارد. فقط `GET /agent-portal/agent/:agentId/sub-agents` برای لیست کردن است.

---

## ۵. ذینفعان و مصرف‌کنندگان

### ۵.۱ عدم استفاده channel-workspace-bff از sales-network
- **اشکال**: `channel-workspace-bff` فقط `GET /channel/commissions` را به sales-network-service forward می‌کند اما اندپوینت‌های مدیریت partner یا contract را expose نمی‌کند. broker از طریق channel-workspace-bff نمی‌تواند قراردادهای خود را مدیریت کند.

### ۵.۲ عدم sync با auth-service برای suspend
- **اشکال**: وقتی یک partner در sales-network-service suspend می‌شود، هیچ sync خودکار با auth-service برای suspend دسترسی کاربران آن partner وجود ندارد.

### ۵.۳ عدم اطلاع‌رسانی به product-service
- **اشکال**: وقتی یک قرارداد کارگزار منقضی یا لغو می‌شود، product-service باید به طور خودکار visibility محصولات مربوط به آن قرارداد را revoke کند اما هیچ مکانیزم sync وجود ندارد.
