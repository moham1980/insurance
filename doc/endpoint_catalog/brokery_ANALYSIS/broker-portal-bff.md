# Broker Portal BFF — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: broker-portal-bff  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. احراز هویت و امنیت

### ۱.۱ عدم اعتبارسنجی محلی توکن
- **اشکال**: تمام اندپوینت‌ها bearer token را بدون اعتبارسنجی محلی به سرویس‌های پایین‌دست forward می‌کنند. اگر توکن منقضی یا باطل شده باشد، همچنان به downstream ارسال می‌شود. BFF باید حداقل توکن را محلی اعتبارسنجی کند.

### ۱.۲ عدم rate limiting
- **اشکال**: هیچ rate limiting ای در سطح BFF وجود ندارد. یک کارگزار می‌تواند به طور نامحدود درخواست ارسال کند و بار روی سرویس‌های پایین‌دست ایجاد کند.

### ۱.۳ عدم cors و csrf protection صریح
- **اشکال**: در مستندات هیچ اشاره‌ای به CORS و CSRF protection نشده است. BFF به عنوان frontend-facing service باید این محافظت‌ها را داشته باشد.

---

## ۲. Dashboard

### ۲.۱ عدم dashboard با داده real-time
- **اندپوینت**: `GET /broker/dashboard`  
- **اشکال**: dashboard شامل `totalPolicies`، `activePolicies`، `pendingSubmissions`، `totalPremium`، `totalCommission`، `recentClaims` است اما هیچ freshness guarantee ای وجود ندارد. داده‌ها ممکن است stale باشند.

### ۲.۲ عدم dashboard filtering
- **اشکال**: هیچ query param برای فیلتر کردن dashboard بر اساس بازه زمانی، خط محصول یا carrier وجود ندارد.

---

## ۳. Submissions و Placements

### ۳.۱ عدم create submission
- **اندپوینت**: فقط `GET /broker/submissions` و `GET /broker/submissions/:submissionId`  
- **اشکال**: BFF فقط لیست و detail submission را expose می‌کند. کارگزار نمی‌تواند از طریق BFF submission جدید ایجاد کند. این یک نقص حیاتی است.

### ۳.۲ عدم placement operations کامل
- **اندپوینت**: فقط `POST /broker/placements`  
- **اشکال**: فقط create placement پشتیبانی می‌شود. retry، cancel، get details و list placements از طریق BFF قابل دسترسی نیست.

### ۳.۳ عدم quote comparison
- **اندپوینت**: فقط `GET /broker/quotes/:submissionId`  
- **اشکال**: quotes لیست می‌شوند اما هیچ اندپوینتی برای comparison quotes وجود ندارد. submission-placement-service اندپوینت compare دارد اما BFF آن را expose نمی‌کند.

---

## ۴. Claims

### ۴.۱ عدم FNOL
- **اشکال**: BFF هیچ اندپوینتی برای FNOL (First Notification of Loss) expose نمی‌کند. کارگزار نمی‌تواند claim جدید ثبت کند.

### ۴.۲ عدم claim status tracking
- **اندپوینت**: فقط `GET /broker/claims` و `GET /broker/claims/:claimId`  
- **اشکال**: فقط لیست و detail claim پشتیبانی می‌شود. assess، approve، reject و advocacy operations از طریق BFF قابل دسترسی نیست.

### ۴.۳ عدم claim document upload
- **اشکال**: هیچ اندپوینتی برای upload claim documents از طریق BFF وجود ندارد.

---

## ۵. Commissions و Settlements

### ۵.۱ عدم settlement details
- **اندپوینت**: فقط `GET /broker/commissions`  
- **اشکال**: فقط لیست commissions پشتیبانی می‌شود. settlement batch details، escrow holdings، refund status و clawback از طریق BFF قابل دسترسی نیست.

### ۵.۲ عدم commission dispute
- **اشکال**: هیچ اندپوینتی برای dispute کردن commission از طریق BFF وجود ندارد.

---

## ۶. Sub-Agents

### ۶.۱ عدم مدیریت sub-agent
- **اندپوینت**: فقط `GET /broker/sub-agents`  
- **اشکال**: فقط لیست sub-agents پشتیبانی می‌شود. create، suspend، terminate و update sub-agent از طریق BFF قابل دسترسی نیست.

---

## ۷. Reports

### ۷.۱ عدم گزارش‌های متنوع
- **اندپوینت**: فقط `GET /broker/reports/broker-transactions`  
- **اشکال**: فقط broker transactions report پشتیبانی می‌شود. KPI reports، commission reports، persistency reports و loss ratio reports از طریق BFF قابل دسترسی نیست.

---

## ۸. نقص‌های جامعیت

### ۸.۱ عدم endpoints برای agreements management
- **اندپوینت**: فقط `GET /broker/agreements`  
- **اشکال**: فقط لیست agreements پشتیبانی می‌شود. create، update، terminate agreement از طریق BFF قابل دسترسی نیست.

### ۸.۲ عدم offerings management
- **اندپوینت**: فقط `GET /broker/offerings`  
- **اشکال**: فقط لیست offerings پشتیبانی می‌شود. create، update، activate، inactivate offering از طریق BFF قابل دسترسی نیست.

### ۸.۳ عدم customer lookup
- **اشکال**: هیچ اندپوینتی برای جستجو و مشاهده اطلاعات مشتریان کارگزار از طریق BFF وجود ندارد.

### ۸.۴ عدم policy details
- **اشکال**: هیچ اندپوینتی برای مشاهده جزئیات بیمه‌نامه از طریق BFF وجود ندارد. کارگزار فقط submissions و claims را می‌بیند اما policy details قابل دسترسی نیست.
