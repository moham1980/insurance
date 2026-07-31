# خلاصه تحلیل نقایص اندپوینت‌های کارگزاری

**محور**: تحلیل کاتالوگ اندپوینت‌های سرویس‌های مرتبط با کارگزاری  
**منبع راهنما**: `BROKERAGE_IMPLEMENTATION_PLAN.md`  
**تعداد سرویس‌های تحلیل شده**: ۱۷ سرویس  

---

## فهرست سرویس‌های تحلیل شده

| # | سرویس | تعداد نقایص کلیدی | فایل تحلیل |
|---|-------|-------------------|------------|
| ۱ | auth-service | ۱۵ | auth-service.md |
| ۲ | party-kyc-service | ۱۲ | party-kyc-service.md |
| ۳ | sales-network-service | ۱۴ | sales-network-service.md |
| ۴ | product-service | ۱۳ | product-service.md |
| ۵ | policy-service | ۱۶ | policy-service.md |
| ۶ | submission-placement-service | ۱۵ | submission-placement-service.md |
| ۷ | billing-service | ۱۶ | billing-service.md |
| ۸ | claims-service | ۱۷ | claims-service.md |
| ۹ | regulatory-gateway-service | ۱۳ | regulatory-gateway-service.md |
| ۱۰ | underwriting-service | ۱۳ | underwriting-service.md |
| ۱۱ | payments-service | ۱۲ | payments-service.md |
| ۱۲ | collections-service | ۱۴ | collections-service.md |
| ۱۳ | reporting-service | ۱۵ | reporting-service.md |
| ۱۴ | broker-portal-bff | ۱۶ | broker-portal-bff.md |
| ۱۵ | channel-workspace-bff | ۱۳ | channel-workspace-bff.md |
| ۱۶ | agent-portal-service | ۱۴ | agent-portal-service.md |
| ۱۷ | customer-portal-service | ۱۵ | customer-portal-service.md |

---

## نقص‌های ساختاری مشترک (Cross-Cutting)

### ۱. عدم وجود Distribution Agreement به عنوان موجودیت اول‌کلاس
- در هیچ سرویسی Distribution Agreement به عنوان موجودیت مستقل با قواعد کمیسیون، محدوده محصول، field ACL و بازه زمانی پیاده‌سازی نشده است. auth-service فقط generic relationships دارد و sales-network-service فقط contracts ساده دارد.

### ۲. عدم Token Exchange فدراسیون
- هیچ سرویسی قابلیت تبادل توکن بین‌سازمانی با scoped claims (agreementId، field ACL) ندارد. این یک نیاز حیاتی برای فدراسیون کارگزاری است.

### ۳. تکرار عملیات بین سرویس‌ها
- Sanhab inquiry: هم در policy-service و هم در regulatory-gateway-service
- Payment gateway: هم در payments-service، هم در billing-service و هم در collections-service
- Underwriting decision: هم در policy-service و هم در underwriting-service
- Reporting: هم در billing-service و هم در reporting-service

### ۴. عدم فیلتر بر اساس brokerOrganizationId
- اکثر سرویس‌ها فیلتر بر اساس سازمان کارگزار را پشتیبانی نمی‌کنند. این باعث می‌شود data isolation بین کارگزاران مختلف تضمین نشود.

### ۵. عدم BFF کامل
- broker-portal-bff و channel-workspace-bff فقط عملیات read (لیست و detail) را expose می‌کنند. اکثر عملیات write (create، update، approve) از طریق BFF قابل دسترسی نیست.

### ۶. عدم notification و event-driven sync
- بین سرویس‌ها هیچ مکانیزم notification یا event-driven sync تعریف نشده است. تغییرات در یک سرویس باید به صورت خودکار در سرویس‌های دیگر منعکس شود.

### ۷. عدم SoD برای عملیات حیاتی کارگزاری
- SoD بین calculate commission و approve settlement، بین bind placement و approve settlement اعمال نمی‌شود.

### ۸. عدم AbacGuard در برخی سرویس‌ها
- reporting-service و underwriting-service از AbacGuard استفاده نمی‌کنند که باعث می‌شود attribute-based access control اعمال نشود.

---

## اولویت‌بندی نقص‌ها

### P0 — حیاتی (باید قبل از production برطرف شود)
1. عدم اعتبارسنجی توکن در BFFها
2. عدم webhook signature validation در regulatory-gateway-service
3. عدم OTP rate limiting در customer-portal-service
4. عدم session security در customer-portal-service (public session endpoints)
5. عدم validation قرارداد توزیع هنگام bind و issue
6. عدم data isolation بر اساس brokerOrganizationId

### P1 — مهم (باید قبل از scale برطرف شود)
1. عدم Distribution Agreement به عنوان موجودیت اول‌کلاس
2. عدم Token Exchange فدراسیون
3. عدم commission split بین سطوح سلسله‌مراتبی
4. تکرار عملیات بین سرویس‌ها
5. عدم BFF کامل (write operations)
6. عدم SoD برای عملیات حیاتی

### P2 — بهبود (باید در فاز بعدی برطرف شود)
1. عدم KPI‌های اختصاصی کارگزاری
2. عدم broker dashboard
3. عدم bulk operations
4. عدم caching برای inquiryها
5. عدم real-time data در dashboardها
6. عدم proactive monitoring و alerting
