# Complaints Service — تحلیل نقایص اندپوینت‌ها

**سرویس**: complaints-service  
**محور تحلیل**: نقاط ضعف، اشکالات و نیازهای بهینه‌سازی از منظر سلامت کلی سیستم

**تاریخ بررسی عمیق**: ۱۴۰۵/۰۵/۱۲  
**منبع بررسی**: کد واقعی سرویس در `services/complaints-service/src/`

---

## ۱. Complaint Creation و Lifecycle

### ۱.۱ عدم validation وجود policy/claim مرتبط
- **اندپوینت**: `POST /complaints`
- **اشکال**: complaint با `policyId`، `claimId`، `policyNumber` و `policyCompanyName` ایجاد می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا این policy یا claim واقعاً در سیستم وجود دارد یا خیر. یک complaint می‌تواند با policyId نامعتبر ایجاد شود که به داده‌های ناهماهنگ منجر می‌شود.
- **کد**: `complaints.service.ts:createComplaint` (lines 389-475) — `policyId` و `claimId` بدون هیچ validation ای ذخیره می‌شوند (`policyId: params.policyId ?? null`, `claimId: params.claimId ?? null`). هیچ query به policy-service یا claims-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۱.۲ عدم duplicate detection برای complaint
- **اندپوینت**: `POST /complaints`
- **اشکال**: هیچ مکانیزم duplicate detection وجود ندارد. یک complainant می‌تواند برای همان policy و complaintType چند complaint ایجاد کند. در عملیات complaints، بررسی duplicate قبل از ایجاد الزامی است.
- **کد**: `complaints.service.ts:createComplaint` (lines 389-475) — هیچ query برای existing complaints با همان `complainantNationalId`، `policyId` و `complaintType` وجود ندارد. مستقیماً `complaintsRepo.create` و `save` فراخوانی می‌شود.
- **وضعیت**: ✅ تأیید شد

### ۱.۳ عدم complaint update endpoint
- **اندپوینت**: `POST /complaints/:complaintId/status`
- **اشکال**: فقط status update پشتیبانی می‌شود. هیچ endpoint برای update فیلدهای complaint (مثلاً description، complainantMobile، complainantAddress) وجود ندارد. اگر اطلاعات complainant ناقص یا اشتباه باشد، قابل اصلاح نیست.
- **کد**: `complaints.controller.ts` — هیچ `PATCH /complaints/:complaintId` وجود ندارد. فقط `POST /complaints/:complaintId/status` (lines 244-287) و `POST /complaints/:complaintId/escalate` (lines 86-129).
- **وضعیت**: ✅ تأیید شد

### ۱.۴ عدم complaint delete یا cancel
- **اندپوینت**: تمام endpoints
- **اشکال**: هیچ اندپوینتی برای delete یا cancel complaint وجود ندارد. یک complaint که به اشتباه ایجاد شده باشد، باید با status change (مثلاً `closed`) بسته شود اما در سیستم باقی می‌ماند و گزارش‌ها را تحت تاثیر قرار می‌دهد.
- **کد**: `complaints.controller.ts` — هیچ `@Delete` endpoint وجود ندارد. `Complaint` entity هیچ فیلد `isDeleted` یا `deletedAt` برای soft delete ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۲. Escalation و SLA Management

### ۲.۱ عدم SLA configuration و tracking
- **اندپوینت**: `POST /complaints/:complaintId/escalate`
- **اشکال**: escalate فقط `reason` و `assignedTo` را می‌گیرد. هیچ SLA configuration بر اساس `complaintType` وجود ندارد. dashboard شامل `slaBreached` است اما مشخص نیست SLA چگونه تعریف می‌شود. هیچ endpoint برای پیکربندی SLA per complaintType وجود ندارد.
- **کد**: `complaints.service.ts:createComplaint` (lines 409-415) — `slaFirstResponseDueAt` و `slaResolutionDueAt` از env vars (`COMPLAINTS_SLA_FIRST_RESPONSE_HOURS`، `COMPLAINTS_SLA_RESOLUTION_HOURS`) خوانده می‌شوند. `ComplaintSlaBreach` entity و `ComplaintSlaBreachWorker` (complaint-sla-breach.worker.ts) برای tracking SLA breach وجود دارند. اما هیچ API endpoint ای برای پیکربندی SLA per complaintType وجود ندارد.
- **وضعیت**: ✅ تأیید شد (SLA tracking via worker وجود دارد، اما پیکربندی per complaintType از طریق API وجود ندارد)

### ۲.۲ عدم auto-escalation بر اساس SLA
- **اندپوینت**: `POST /complaints/:complaintId/escalate`
- **اشکال**: escalation فقط manual است. هیچ مکانیزم auto-escalation وجود ندارد که وقتی complaint در مدت زمان مشخص (SLA) resolve نشده باشد، به‌طور خودکار escalate شود. این باعث می‌شود complaint‌های overdue بدون attention بمانند.
- **کد**: `complaint-sla-breach.worker.ts` (lines 79-147) — worker به‌طور دوره‌ای complaint‌های overdue را detect می‌کند و `ComplaintSlaBreach` record ایجاد و event `insurance.complaint.sla_breached` publish می‌کند. اما status complaint را به `escalated` تغییر نمی‌دهد — فقط breach را ثبت می‌کند. auto-escalation واقعی (تغییر status) وجود ندارد. توجه: worker به‌صورت پیش‌فرض غیرفعال است (line 26: `COMPLAINTS_SLA_BREACH_WORKER_ENABLED` باید `true` باشد).
- **وضعیت**: ✅ تأیید شد (SLA breach detection وجود دارد اما auto-escalation نه؛ worker به‌صورت پیش‌فرض غیرفعال است)

### ۲.۳ عدم escalation level tracking
- **اندپوینت**: `POST /complaints/:complaintId/escalate`
- **اشکال**: escalate فقط status را به `escalated` تغییر می‌دهد. هیچ فیلدی برای escalation level (L1، L2، L3) یا escalation history وجود ندارد. یک complaint می‌تواند چند بار escalate شود اما هیچ ردیابی از سطوح escalation وجود ندارد.
- **کد**: `complaints.service.ts:escalateComplaint` (lines 477-531) — `status` به `'escalated'`، `escalatedAt`، `escalatedReason`، `escalatedBy` set می‌شوند. `Complaint` entity هیچ فیلد `escalationLevel` ندارد. `ComplaintAudit` (entities/ComplaintAudit.ts) event را ثبت می‌کند اما هیچ level field ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۳. Mobile Verification و OTP

### ۳.۱ ~~عدم rate limiting برای OTP request~~
- ~~**اشکال**: هیچ rate limiting برای OTP request وجود ندارد. یک کاربر می‌تواند به‌طور مکرر OTP request کند و به SMS bombing منجر شود. همچنین هزینه SMS را به‌طور غیرضروری افزایش می‌دهد.~~
- **کد**: `complaints.service.ts:requestComplaintMobileOtp` (lines 132-144) — rate limiting پیاده‌سازی شده: `getOtpRateLimitSeconds()` (default 60 ثانیه، configurable via `COMPLAINTS_OTP_RATE_LIMIT_SECONDS`). اگر OTP اخیر در بازه rate limit وجود داشته باشد، `RATE_LIMITED` error throw می‌شود.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: rate limiting با configurable cooldown (default 60s) در `requestComplaintMobileOtp` پیاده‌سازی شده است.

### ۳.۲ ~~عدم OTP attempt limit~~
- ~~**اشکال**: verify فقط `code` را می‌گیرد. هیچ محدودیتی برای تعداد attempt ناموفق وجود ندارد. یک کاربر می‌تواند به‌طور نامحدود OTP code را guess کند (brute force).~~
- **کد**: `complaints.service.ts:verifyComplaintMobileOtp` (lines 255-261) — `ch.attempts >= ch.maxAttempts` بررسی می‌شود. `maxAttempts` از `getOtpMaxAttempts()` (default 5، configurable via `COMPLAINTS_OTP_MAX_ATTEMPTS`). بعد از max attempts، status به `'locked'` تغییر می‌کند. `ComplaintMobileOtpChallenge` entity دارای `attempts` و `maxAttempts` fields است.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: attempt limit با configurable max (default 5) و lock بعد از exceed در `verifyComplaintMobileOtp` پیاده‌سازی شده است.

### ۳.۳ ~~عدم OTP resend cooldown~~
- ~~**اشکال**: هیچ cooldown period بین OTP request‌ها وجود ندارد. یک کاربر می‌تواند بلافاصله بعد از request اول، request دوم ارسال کند.~~
- **کد**: همان rate limiting در ۳.۱ — `getOtpRateLimitSeconds()` (default 60s) cooldown را اعمال می‌کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: cooldown با rate limiting (default 60s) پیاده‌سازی شده است.

---

## ۴. Central Insurance Integration

### ۴.۱ عدم idempotency در send
- **اندپوینت**: `POST /complaints/:complaintId/central-insurance/send`
- **اشکال**: send به Central Insurance هیچ idempotency key یا mechanism ندارد. اگر request به دلیل network error retry شود، ممکن است complaint دو بار به Central Insurance ارسال شود. این به duplicate records در نهاد نظارتی منجر می‌شود.
- **کد**: `complaints.service.ts:sendToCentralInsurance` (lines 977-1080) — هیچ بررسی‌ای برای `metadata.centralInsurance.status === 'sent'` قبل از ارسال وجود ندارد. `autoSendOnResolution` (lines 1105-1133) این بررسی را دارد (`if (ciData?.status === 'sent') return`) اما manual send endpoint این بررسی را ندارد.
- **وضعیت**: ✅ تأیید شد (autoSend دارای idempotency check است، اما manual send endpoint ندارد)

### ۴.۲ عدم retry limit و backoff
- **اندپوینت**: `POST /complaints/:complaintId/central-insurance/retry`
- **اشکال**: retry شامل `retryCount` در response است اما هیچ max retry limit یا exponential backoff وجود ندارد. یک کاربر می‌تواند به‌طور مکرر retry کند و Central Insurance API را تحت فشار قرار دهد.
- **کد**: `complaints.service.ts:retryFailedCentralInsuranceSend` (lines 1163-1190) — فقط بررسی می‌کند `ciData.status === 'failed'` و سپس `sendToCentralInsurance` را فراخوانی می‌کند. هیچ retry count یا backoff وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۴.۳ عدم webhook برای Central Insurance callback
- **اندپوینت**: `GET /complaints/:complaintId/central-insurance/status`
- **اشکال**: status فقط با polling قابل دریافت است. هیچ webhook endpoint برای دریافت callback از Central Insurance وجود ندارد. این باعث می‌شود status update‌ها با delay دریافت شوند و load اضافی روی complaints-service ایجاد کند.
- **کد**: `complaints.controller.ts` — هیچ `POST /complaints/central-insurance/webhook` یا endpoint مشابه وجود ندارد. `getCentralInsuranceStatus` (lines 685-703) فقط از `complaint.metadata.centralInsurance` می‌خواند.
- **وضعیت**: ✅ تأیید شد

### ۴.۴ عدم validation mobile verified قبل از send
- **اندپوینت**: `POST /complaints/:complaintId/central-insurance/send`
- **اشکال**: export endpoint خطای `MOBILE_NOT_VERIFIED` دارد اما send endpoint این validation را ندارد. مشخص نیست آیا send بدون mobile verification انجام می‌شود یا خیر. اگر Central Insurance mobile verification الزامی باشد، send باید قبل از ارسال verify کند.
- **کد**: `complaints.controller.ts:exportCentralInsurance` (lines 407-527) — `if (!c.complainantMobileVerified)` بررسی می‌شود (line 432). `complaints.service.ts:sendToCentralInsurance` (lines 977-1080) — هیچ بررسی `complainantMobileVerified` وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۵. Attachments و Documents

### ۵.۱ عدم validation document existence
- **اندپوینت**: `POST /complaints/:complaintId/attachments`
- **اشکال**: `documentId` در request body ارسال می‌شود اما هیچ validation ای بررسی نمی‌کند که آیا این document در document-service وجود دارد یا خیر. یک attachment با documentId نامعتبر می‌تواند ایجاد شود.
- **کد**: `complaints.controller.ts:attach` (lines 289-334) — فقط `documentId` وجود دارد check می‌شود. `complaints.service.ts:attachDocument` (lines 641-694) — `documentId` بدون validation در `ComplaintAttachment` ذخیره می‌شود. هیچ فراخوانی به document-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۵.۲ عدم list و delete attachments
- **اندپوینت**: `POST /complaints/:complaintId/attachments`
- **اشکال**: فقط create attachment پشتیبانی می‌شود. هیچ endpoint برای list attachments یک complaint (به‌صورت جداگانه) یا delete attachment وجود ندارد. `GET /complaints/:complaintId` attachments را در response شامل می‌شود اما pagination ندارد.
- **کد**: `complaints.service.ts:listAttachments` (line 695) — متد وجود دارد و در `getComplaint` endpoint (line 159) استفاده می‌شود. اما هیچ dedicated `GET /complaints/:complaintId/attachments` endpoint وجود ندارد. هیچ `DELETE /complaints/:complaintId/attachments/:attachmentId` وجود ندارد.
- **وضعیت**: ✅ تأیید شد (listAttachments در service وجود دارد اما dedicated endpoint و delete وجود ندارد)

### ۵.۳ عدم attachment type validation
- **اندپوینت**: `POST /complaints/:complaintId/attachments`
- **اشکال**: هیچ فیلدی برای `attachmentType` یا `documentCategory` وجود ندارد. در complaints، نوع attachment (evidence، correspondence، resolution document) مهم است و باید categorize شود.
- **کد**: `complaints.controller.ts:attach` (lines 289-334) — body فقط `documentId` و `notes` را می‌پذیرد. `ComplaintAttachment` entity — هیچ فیلد `attachmentType` یا `documentCategory` ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۶. Analysis و Dashboard

### ۶.۱ عدم caching برای analysis endpoints
- **اندپوینت**: `GET /complaints/analysis/recurring-causes`، `GET /complaints/analysis/cause-trends`
- **اشکال**: analysis endpoints به‌صورت on-demand محاسبه می‌شوند. هیچ caching mechanism وجود ندارد. برای حجم بالای complaints، این محاسبات می‌تواند سنگین باشد و به slow response منجر شود.
- **کد**: `complaints.controller.ts:analyzeRecurringCauses` (lines 530-579) و `getCauseTrends` (lines 581-632) — هیچ cache layer وجود ندارد. `complaints.service.ts:analyzeRecurringCauses` (line 802) و `getCauseTrends` (line 911) — مستقیماً query می‌زنند.
- **وضعیت**: ✅ تأیید شد

### ۶.۲ عدم dashboard filtering
- **اندپوینت**: `GET /complaints/dashboard`
- **اشکال**: dashboard هیچ query param پشتیبانی نمی‌کند. هیچ فیلتری بر اساس بازه زمانی، complaintType، یا assignedTo وجود ندارد. dashboard فقط یک snapshot کلی نشان می‌دهد.
- **کد**: `complaints.controller.ts:dashboard` (lines 214-242) — هیچ `@Query` پارامتری دریافت نمی‌کند. `complaints.service.ts:getDashboard` (line 699) — فقط `now: Date` دریافت می‌کند.
- **وضعیت**: ✅ تأیید شد

### ۶.۳ عدم export برای analysis results
- **اندپوینت**: `GET /complaints/analysis/recurring-causes`
- **اشکال**: analysis results فقط به‌صورت JSON response برمی‌گردند. هیچ endpoint برای export نتایج به CSV یا PDF وجود ندارد. در عملیات complaints، export تحلیل‌ها برای گزارش‌های مدیریتی ضروری است.
- **کد**: `complaints.controller.ts` — هیچ `GET /complaints/analysis/export` endpoint وجود ندارد.
- **وضعیت**: ✅ تأیید شد

---

## ۷. Security و Privacy

### ۷.۱ عدم PII masking در complaint responses
- **اندپوینت**: `GET /complaints/:complaintId`، `GET /complaints`
- **اشکال**: complaint شامل `complainantNationalId`، `complainantMobile`، `complainantBirthDate` و `complainantAddress` است. هیچ PII masking در response‌ها ذکر نشده است. برخلاف claims-readmodel-service که PII masking دارد، complaints-service تمام داده‌های حساس را در clear text برمی‌گرداند.
- **کد**: `pii-masking.middleware.ts` (lines 4-7) — `PII_FIELDS` set شامل `complainantNationalId`، `complainantPhone`، `complainantEmail` است. اما `complainantMobile` (نام واقعی فیلد در Complaint entity) در set **نیست** (فقط `mobile` و `complainantPhone` موجود است). `complainantBirthDate` و `complainantAddress` نیز mask نمی‌شوند. `PiiMaskingMiddleware` در `app.module.ts` (line 39) ثبت شده است.
- **وضعیت**: ✅ تأیید شد (بخشی — `complainantNationalId` mask می‌شود اما `complainantMobile`، `complainantBirthDate` و `complainantAddress` mask نمی‌شوند)

### ۷.۲ ~~عدم audit trail برای status changes~~
- ~~**اشکال**: status update فقط `status` و `resolutionSummary` را می‌گیرد. هیچ فیلدی برای ثبت `updatedBy` یا `previousStatus` در request وجود ندارد. audit trail تغییرات status برای compliance الزامی است.~~
- **کد**: `complaints.controller.ts:updateStatus` (lines 244-287) — `actor?.userId` در `audit` param به service پاس داده می‌شود. `complaints.service.ts:updateStatus` (lines 561-639) — `writeAudit` با `fromStatus`، `toStatus`، `actorUserId`، `details` فراخوانی می‌شود. `ComplaintAudit` entity (entities/ComplaintAudit.ts) دارای `fromStatus`، `toStatus`، `actorUserId`، `eventType` fields است.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: `ComplaintAudit` entity و `writeAudit` متد audit trail کامل با `fromStatus`، `toStatus`، `actorUserId` برای تمام status changes ثبت می‌کنند.

---

## ۸. ذینفعان و مصرف‌کنندگان

### ۸.۱ ~~عدم یکپارچه‌سازی با claims-service برای complaint-claim linkage~~
- ~~**اشکال**: complaint می‌تواند `claimId` داشته باشد اما هیچ sync دوطرفه با claims-service وجود ندارد. وقتی complaint برای یک claim ایجاد می‌شود، claims-service باید مطلع شود تا claim handler بتواند complaint را ببیند. هیچ event یا webhook برای این sync تعریف نشده است.~~
- **کد**: `complaints.service.ts:createComplaint` (lines 465-472) — event `insurance.complaint.created` را publish می‌کند. `escalateComplaint` (lines 515-528) — event `insurance.complaint.escalated`. `updateStatus` (lines 607-635) — event‌های `insurance.complaint.resolved` و `insurance.complaint.status_changed`. تمام event‌ها از طریق Outbox publish می‌شوند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event‌های complaint lifecycle از طریق Outbox publish می‌شوند که claims-service می‌تواند برای sync مصرف کند.

### ۸.۲ عدم یکپارچه‌سازی با regulatory-gateway-service
- **اشکال**: `POST /complaints/:complaintId/central-insurance/send` مستقیماً با Central Insurance ارتباط برقرار می‌کند. باید از regulatory-gateway-service به عنوان gateway مرکزی استفاده شود اما هیچ اشاره‌ای به این معماری در endpoint‌ها وجود ندارد.
- **کد**: `complaints.service.ts:sendToCentralInsurance` (lines 1020-1026) — مستقیماً `fetch(apiUrl, ...)` با `getCentralInsuranceApiUrl()` و `getCentralInsuranceApiKey()` فراخوانی می‌کند. هیچ فراخوانی به regulatory-gateway-service وجود ندارد.
- **وضعیت**: ✅ تأیید شد

### ۸.۳ عدم دسترسی customer-portal به complaint status
- **اشکال**: هیچ BFF endpoint برای customer-portal برای دیدن وضعیت complaint توسط complainant وجود ندارد. complainant باید از طریق تماس تلفانی وضعیت را بفهمد.
- **کد**: این نقص در customer-portal-bff است، نه در complaints-service.
- **وضعیت**: ✅ تأیید شد (نقص در customer-portal-bff)

### ۸.۴ ~~عدم یکپارچه‌سازی با notification-service~~
- ~~**اشکال**: وقتی complaint escalate می‌شود، status change می‌کند، یا resolve می‌شود، هیچ notification به complainant یا assigned operator از طریق notification-service ارسال نمی‌شود.~~
- **کد**: `complaints.service.ts` — event‌های متعدد publish می‌شوند: `insurance.complaint.created` (line 466)، `insurance.complaint.escalated` (line 516)، `insurance.complaint.resolved` (line 609)، `insurance.complaint.status_changed` (line 624)، `insurance.complaint.mobile_otp_requested` (line 192)، `insurance.complaint.mobile_verified` (line 310)، `insurance.complaint.sla_breached` (line 333). notification-service می‌تواند این event‌ها را مصرف کند.
- **وضعیت**: ~~رفع شد~~ — **رفع شده در کد**: event‌های complaint lifecycle از طریق Outbox publish می‌شوند که notification-service می‌تواند برای ارسال notification مصرف کند.

### ۸.۵ عدم projection در claims-readmodel-service
- **اشکال**: claims-readmodel-service complaints را projection می‌کند (`GET /rm/complaints`) اما فقط `complaintId`، `complaintType`، `status` و `createdAt` را شامل می‌شود. داده‌های غنی‌تر (policy linkage، SLA status، escalation level) در readmodel وجود ندارد.
- **کد**: این نقص در claims-readmodel-service است. complaints-service event‌های غنی publish می‌کند (شامل SLA، escalation، policy linkage در payload).
- **وضعیت**: ✅ تأیید شد (نقص در claims-readmodel-service)

---

## ۹. نقص‌های امنیتی و زیرساختی (جدید)

### ۹.۱ (جدید) عدم tenant filtering در listComplaints
- **اندپوینت**: `GET /complaints`
- **اشکال**: `listComplaints` هیچ فیلتری بر اساس `tenantId` اعمال نمی‌کند. controller `tenantId` را استخراج می‌کند اما به service پاس نمی‌دهد. نتیجه: همه complaint‌های همه tenant‌ها قابل دسترسی هستند.
- **کد**: `complaints.controller.ts:list` (lines 164-212) — `tenantId` استخراج می‌شود اما به `listComplaints` پاس داده نمی‌شود. `complaints.service.ts:listComplaints` (lines 537-559) — هیچ پارامتر `tenantId` وجود ندارد. `Complaint` entity هیچ ستون `tenant_id` ندارد.
- **وضعیت**: ✅ تأیید شد (نقص جدید)

### ۹.۲ (جدید) SLA breach worker به‌صورت پیش‌فرض غیرفعال است
- **اندپوینت**: (زیرساختی)
- **اشکال**: `ComplaintSlaBreachWorker` فقط وقتی فعال می‌شود که `COMPLAINTS_SLA_BREACH_WORKER_ENABLED=true` باشد. به‌صورت پیش‌فرض غیرفعال است، به این معنی که SLA breach detection در deployment پیش‌فرض کار نمی‌کند.
- **کد**: `complaint-sla-breach.worker.ts` (line 26) — `const enabled = String(process.env.COMPLAINTS_SLA_BREACH_WORKER_ENABLED || '').toLowerCase() === 'true'`.
- **وضعیت**: ✅ تأیید شد (نقص جدید)
