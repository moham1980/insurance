# Channel Workspace BFF — تحلیل نقایص اندپوینت‌های کارگزاری

**سرویس**: channel-workspace-bff  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر کارگزاری  

---

## ۱. احراز هویت و امنیت

### ۱.۱ عدم اعتبارسنجی محلی توکن
- **اشکال**: مانند broker-portal-bff، تمام اندپوینت‌ها bearer token را بدون اعتبارسنجی محلی forward می‌کنند.

### ۱.۲ عدم rate limiting و CORS
- **اشکال**: هیچ rate limiting یا CORS protection ای در مستندات ذکر نشده است.

---

## ۲. Workspace

### ۲.۱ عدم create/update workspace
- **اندپوینت**: فقط `GET /channel/workspaces`، `GET /channel/workspaces/:workspaceId`، `GET /channel/workspaces/mine`  
- **اشکال**: فقط لیست و detail workspace پشتیبانی می‌شود. create، update و delete workspace از طریق BFF قابل دسترسی نیست.

### ۲.۲ عدم workspace member management
- **اشکال**: هیچ اندپوینتی برای add/remove members از workspace وجود ندارد.

### ۲.۳ عدم workspace switching
- **اشکال**: هیچ اندپوینتی برای switch کردن بین workspace‌های مختلف وجود ندارد. یک کاربر ممکن است به چند workspace دسترسی داشته باشد.

---

## ۳. Submissions و Offerings

### ۳.۱ عدم quote comparison
- **اندپوینت**: فقط `GET /channel/offerings`، `GET /channel/submissions`، `POST /channel/submissions`  
- **اشکال**: submission ایجاد می‌شود اما هیچ اندپوینتی برای quote comparison از طریق BFF وجود ندارد.

### ۳.۲ عدم submission update و submit
- **اشکال**: فقط create و list submission پشتیبانی می‌شود. update، submit و expire از طریق BFF قابل دسترسی نیست.

### ۳.۳ عدم offering details
- **اشکال**: فقط لیست offerings پشتیبانی می‌شود. جزئیات offering و pricing از طریق BFF قابل دسترسی نیست.

---

## ۴. Broker Operations (broker.controller.ts)

### ۴.۱ عدم carrier agreement management
- **اندپوینت**: فقط `GET /broker/carrier-agreement`  
- **اشکال**: فقط لیست carrier agreements پشتیبانی می‌شود. create، update و terminate از طریق BFF قابل دسترسی نیست.

### ۴.۲ عدم placement operations
- **اندپوینت**: فقط `GET /broker/placements`  
- **اشکال**: فقط لیست placements پشتیبانی می‌شود. create، bind، retry، cancel و get details از طریق BFF قابل دسترسی نیست.

### ۴.۳ عدم claim advocacy operations
- **اندپوینت**: فقط `GET /broker/claim-advocacy-cases`  
- **اشکال**: فقط لیست claim advocacy cases پشتیبانی می‌شود. open case، escalate، close و add communication از طریق BFF قابل دسترسی نیست.

### ۴.۴ عدم settlement details
- **اندپوینت**: فقط `GET /broker/settlements`  
- **اشکال**: فقط لیست settlements پشتیبانی می‌شود. approve، confirm، verify و detail از طریق BFF قابل دسترسی نیست.

---

## ۵. Commissions و Customers

### ۵.۱ عدم commission details
- **اندپوینت**: فقط `GET /channel/commissions`  
- **اشکال**: فقط لیست commissions پشتیبانی می‌شود. جزئیات commission، dispute و history از طریق BFF قابل دسترسی نیست.

### ۵.۲ عدم customer details
- **اندپوینت**: فقط `GET /channel/customers`  
- **اشکال**: فقط لیست customers پشتیبانی می‌شود. جزئیات customer، KYC status و policy history از طریق BFF قابل دسترسی نیست.

---

## ۶. تکرار با broker-portal-bff

### ۶.۱ تکرار مسیر /broker
- **اشکال**: channel-workspace-bff نیز مسیر `/broker` را پشتیبانی می‌کند (`broker.controller.ts`) که با `broker-portal-bff` تکرار دارد. این باعث ابهام می‌شود که کدام BFF مسئول عملیات broker است. باید clear separation of concerns تعریف شود.

### ۶.۲ عدم تفکیک workspace type
- **اشکال**: workspace type شامل `broker|agent|insurer` است اما هیچ اندپوینتی بر اساس workspace type رفتار متفاوت ندارد. یک workspace insurer نباید به همان اندپوینت‌های workspace broker دسترسی داشته باشد.
