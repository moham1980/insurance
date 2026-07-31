# Agent Portal Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: agent-portal-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Session Management

### ۱.۱ عدم session timeout قابل پیکربندی
- **اندپوینت**: `POST /agent-portal/session`  
- **اشکال**: `expiresIn` در request body ارسال می‌شود (default: `8h`). این باید server-side قابل پیکربندی باشد نه client-side. یک client می‌تواند session با مدت زمان نامحدود ایجاد کند.

### ۱.۲ عدم session refresh
- **اشکال**: هیچ اندپوینتی برای refresh کردن session token وجود ندارد. session فقط create، validate و revoke می‌شود.

### ۱.۳ عدم concurrent session limit
- **اشکال**: هیچ محدودیتی برای تعداد session‌های فعال یک agent وجود ندارد. یک agent می‌تواند unlimited session ایجاد کند.

---

## ۲. Dashboard و KPI

### ۲.۱ عدم dashboard با real-time data
- **اندپوینت**: `GET /agent-portal/agent/:agentId/dashboard`  
- **اشکال**: dashboard شامل `totalPolicies`، `activePolicies`، `totalClaims`، `openClaims`، `totalPremium`، `totalCommission` است اما مشخص نیست این داده‌ها real-time هستند یا cached.

### ۲.۲ عدم dashboard filtering
- **اشکال**: فقط `partnerId` به عنوان query param پشتیبانی می‌شود. هیچ فیلتری بر اساس بازه زمانی یا line of business وجود ندارد.

### ۲.۳ عدم KPI با benchmark
- **اندپوینت**: `GET /agent-portal/agent/:agentId/kpi`  
- **اشکال**: KPI فقط عدد agent را نشان می‌دهد. هیچ benchmark یا مقایسه با میانگین سازمان یا سایر agent‌ها وجود ندارد.

---

## ۳. Policies و Claims

### ۳.۱ عدم policy details
- **اندپوینت**: `GET /agent-portal/agent/:agentId/policies`  
- **اشکال**: فقط لیست policies پشتیبانی می‌شود. جزئیات policy، endorsement و renewal از طریق agent portal قابل دسترسی نیست.

### ۳.۲ عدم claim registration
- **اندپوینت**: `GET /agent-portal/agent/:agentId/claims`  
- **اشکال**: فقط لیست claims پشتیبانی می‌شود. ثبت FNOL یا claim جدید از طریق agent portal قابل دسترسی نیست.

### ۳.۳ عدم claim status tracking
- **اشکال**: هیچ اندپوینتی برای tracking real-time claim status وجود ندارد.

---

## ۳.۵ Customers و Commissions

### ۳.۵.۱ عدم customer details
- **اندپوینت**: `GET /agent-portal/agent/:agentId/customers`  
- **اشکال**: فقط لیست customers با `search` پشتیبانی می‌شود. جزئیات customer، KYC status و policy history قابل دسترسی نیست.

### ۳.۵.۲ عدم commission details
- **اندپوینت**: `GET /agent-portal/agent/:agentId/commissions`  
- **اشکال**: فقط لیست commissions پشتیبانی می‌شود. جزئیات commission، settlement status و payment history قابل دسترسی نیست.

---

## ۴. Advocacy و Adjuster

### ۴.۱ عدم advocacy case management کامل
- **اندپوینت**: `POST /agent-portal/claims/:claimId/advocacy-cases`، `POST /agent-portal/advocacy-cases/:caseId/tasks`  
- **اشکال**: advocacy case ایجاد و task اضافه می‌شود اما close case، list tasks و update task status از طریق agent portal قابل دسترسی نیست.

### ۴.۲ عدم adjuster referral management کامل
- **اندپوینت**: `POST /agent-portal/claims/:claimId/adjuster-referrals`  
- **اشکال**: فقط create referral پشتیبانی می‌شود. accept، reject و submit report از طریق agent portal قابل دسترسی نیست.

### ۴.۳ عدم recovery tracking
- **اندپوینت**: `POST /agent-portal/claims/:claimId/recovery`  
- **اشکال**: recovery case ایجاد می‌شود اما tracking و update status recovery از طریق agent portal قابل دسترسی نیست.

---

## ۵. Leads

### ۵.۱ عدم lead management کامل
- **اندپوینت**: `GET /agent-portal/leads`  
- **اشکال**: فقط لیست leads پشتیبانی می‌شود. create، update، assign و convert lead به submission از طریق agent portal قابل دسترسی نیست.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم تفکیک broker vs agent
- **اشکال**: تمام اندپوینت‌ها از `agent_portal:*` permissions استفاده می‌کنند. هیچ تفکیکی بین دسترسی broker (که باید تمام sub-agentها را ببیند) و agent (که فقط داده‌های خود را می‌بیند) وجود ندارد.

### ۶.۲ عدم validation agentId با token
- **اشکال**: `agentId` در path param ارسال می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا agentId با identity توکن مطابقت دارد یا خیر. یک agent می‌تواند داده‌های agent دیگر را ببیند.

### ۶.۳ عدم یکپارچه‌سازی با sales-network-service
- **اشکال**: agent-portal-service مستقل از sales-network-service عمل می‌کند. داده‌های policies، claims و commissions باید از sales-network-service و سایر سرویس‌ها fetch شوند اما مشخص نیست این یکپارچه‌سازی چگونه انجام می‌شود.

### ۶.۴ عدم استفاده از AbacGuard برای data isolation
- **اشکال**: agent-portal-service از `AbacGuard` استفاده می‌کند اما هیچ attribute-based policy ای برای محدود کردن داده‌ها به agent خاص تعریف نشده است.
