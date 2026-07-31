# Collections Service — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: collections-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. Payment Plan

### ۱.۱ عدم broker context در plan
- **اندپوینت**: `POST /collections/plans`  
- **اشکال**: request body شامل `policyId`، `premiumAmount`، `installments` است اما هیچ `brokerOrganizationId` وجود ندارد. plan نمی‌تواند به یک کارگزار خاص نسبت داده شود.

### ۱.۲ عدم فیلتر لیست بر اساس سازمان
- **اندپوینت**: `GET /collections/plans`  
- **اشکال**: فیلتر فقط `policyId` و `status` را پشتیبانی می‌کند. هیچ فیلتری بر اساس `brokerOrganizationId` وجود ندارد.

### ۱.۳ عدم plan template
- **اشکال**: هر plan به صورت دستی با installments ایجاد می‌شود. هیچ plan template ای برای استفاده مکرر (مثلاً اقساط ۳ ماهه، ۶ ماهه، ۱۲ ماهه) وجود ندارد.

---

## ۲. Installment Operations

### ۲.۱ عدم partial payment
- **اندپوینت**: `POST /collections/installments/:installmentId/pay`  
- **اشکال**: installment pay فقط به صورت کامل انجام می‌شود. در کارگزاری، مشتری ممکن است بخواهد به صورت جزئی پرداخت کند.

### ۲.۲ عدم installment reschedule
- **اشکال**: هیچ اندپوینتی برای reschedule کردن due date یک installment وجود ندارد. در کارگزاری، کارگزار ممکن است نیاز به تمدید تاریخ سررسید برای مشتری داشته باشد.

### ۲.۳ عدم installment waiver
- **اشکال**: installment status شامل `waived` است اما هیچ اندپوینتی برای waive کردن یک installment وجود ندارد.

---

## ۳. Late Fee و Overdue

### ۳.۱ عدم late fee cap
- **اندپوینت**: `POST /collections/installments/:installmentId/late-fee/apply`  
- **اشکال**: late fee calculate و apply می‌شود اما هیچ cap (سقف) برای late fee تعریف نشده است. در برخی قراردادهای کارگزاری، سقف late fee الزامی است.

### ۳.۲ عدم grace period
- **اشکال**: هیچ مکانیزمی برای grace period (دوره مهلت بعد از سررسید قبل از اعمال late fee) وجود ندارد.

### ۳.۳ عدم overdue notification به broker
- **اشکال**: وقتی installment overdue می‌شود، هیچ notification به کارگزار ارسال نمی‌شود. کارگزار باید از overdue مشتریان خود مطلع شود.

---

## ۴. Gateway Payment

### ۴.۱ تکرار با payments-service
- **اندپوینت**: `POST /collections/installments/:installmentId/gateway/initiate`  
- **اشکال**: collections-service gateway payment مستقل دارد در حالی که `payments-service` نیز gateway integration دارد. این تکرار باعث دو مسیر مختلف برای همان عملیات می‌شود.

### ۴.۲ عدم gateway callback با HMAC
- **اندپوینت**: `POST /collections/gateway/callback`  
- **اشکال**: callback از HMAC signature verification استفاده می‌کند اما دو secret مختلف (`PSP_CALLBACK_SECRET` یا `COLLECTIONS_CALLBACK_SECRET`) پشتیبانی می‌شود که باعث ابهام در پیکربندی می‌شود.

---

## ۵. Receivable

### ۵.۱ عدم receivable به broker
- **اندپوینت**: `POST /collections/installments/:installmentId/link-receivable`  
- **اشکال**: receivable فقط به installment link می‌شود. هیچ مکانیزمی برای link receivable به broker organization وجود ندارد.

### ۵.۲ عدم reconciliation خودکار
- **اندپوینت**: `GET /collections/receivables/reconciliation`  
- **اشکال**: reconciliation فقط on-demand انجام می‌شود. هیچ مکانیزم scheduled reconciliation وجود ندارد.

---

## ۶. ذینفعان و مصرف‌کنندگان

### ۶.۱ عدم دسترسی broker-portal-bff به collections
- **اشکال**: `broker-portal-bff` هیچ اندپوینتی برای collections expose نمی‌کند. کارگزار نمی‌تواند وضعیت اقساط مشتریان خود را ببیند.

### ۶.۲ عدم دسترسی customer-portal به installment details
- **اشکال**: `customer-portal-service` فقط `GET /customer-portal/payments` را دارد. مشتری نمی‌تواند جزئیات installment، due dates و late fees را ببیند.

### ۶.۳ عدم sync با billing-service
- **اشکال**: collections-service و billing-service هر دو invoice و payment management مستقل دارند. این تکرار باعث ناهماهنگی می‌شود.

### ۶.۴ عدم یکپارچه‌سازی با sales-network-service
- **اشکال**: وقتی installment پرداخت می‌شود، sales-network-service باید ledger را به‌روز کند اما هیچ مکانیزم sync وجود ندارد.
