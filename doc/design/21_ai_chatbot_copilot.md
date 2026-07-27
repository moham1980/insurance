# 21 — AI Chatbot و Copilot یکپارچه

---

## ۱. دو مفهوم متفاوت

| مفهوم | کجا | مخاطب |
|-------|-----|--------|
| **Chatbot** | Customer Portal / PWA | مشتری نهایی |
| **Copilot** | Agent Portal + Back-Office | کارمند/نماینده |

هر دو روی **knowledge-layer-service** و **workflow-engine-service** موجود سامانه سوار می‌شوند.

---

## ۲. Customer Chatbot

### قابلیت‌ها
- پاسخ به FAQ (بیمه‌نامه، تمدید، پوشش)
- **ثبت FNOL** به‌صورت مکالمه‌ای (conversational form)
- پیگیری وضعیت خسارت/پرداخت
- Explain policy: «چه چیزی تحت پوشش است؟»
- Escalate به انسان وقتی نیاز

### UI
- **Launcher:** FAB پایین-راست (RTL = پایین-چپ بصری) روی همه صفحات
- **Panel:** drawer از راست ۴۰۰px (دسکتاپ) / فول‌اسکرین (موبایل)
- **Header:** آواتار + نام bot + دکمه «صحبت با کارشناس»
- **Messages:**
  - Bot: bubble رنگ `bg-subtle`
  - User: bubble `bg-brand-primary` + `text-brand-on`
  - System: وسط، متن muted
  - Quick-replies: chips کلیک‌پذیر زیر پیام bot

### Conversational FNOL
Bot می‌پرسد گام به گام:
```
Bot: سلام. چه اتفاقی افتاده؟
User: [voice/text] تصادف خودرو
Bot: متاسفم. کدام بیمه‌نامه؟  [chips: بدنه ۱۲۳ / ثالث ۴۵۶]
User: بدنه ۱۲۳
Bot: کجا بود؟  [Button: موقعیت فعلی] [نقشه]
User: ...
Bot: عکس/ویدیو بگیرید  [Camera button]
...
Bot: ✅ خلاصه خسارت آماده است. تایید می‌کنید؟
```

### Fallback و Handoff
- اگر bot ۲ بار نفهمید → «ارتباط با کارشناس» پیشنهاد
- Handoff با **context کامل** (تاریخچه چت + metadata)
- Live-agent ui: مشابه chatbot ولی با human badge

---

## ۳. Agent / Back-Office Copilot

### قابلیت‌ها
- **Explainability:** «چرا این ریسک بالا است؟»، «چرا این مبلغ پیشنهاد شد؟»
- **Draft generation:** پاسخ به مشتری، گزارش خسارت
- **Data lookup:** «بیمه‌نامه‌های این مشتری را نشان بده»
- **Action suggestion:** «این Claim را approve کنم؟» با pre-conditions
- **Summarization:** خلاصه document‌های حجیم

### UI
- Panel سمت چپ (RTL) ۳۶۰px، collapsible
- Context-aware: خودکار Entity فعلی را می‌داند (Claim #X, Customer Y)
- Action chips زیر پاسخ: «اعمال به فرم»، «ارسال»، «ذخیره note»

### Human-in-the-loop (Critical)
- Copilot **هرگز** تصمیم نهایی نمی‌گیرد
- هر اقدام نیاز به **تایید انسان** با دکمه explicit
- Audit log: «Action X پیشنهاد AI، توسط user Y تایید شد»
- اگر AI confidence < threshold → hint قرمز «توصیه: بررسی دقیق»

---

## ۴. Architecture

```
┌─────────────┐   ┌──────────────────────────────┐
│  Frontend   │   │ knowledge-layer-service      │
│  (Chat UI)  │──►│  (RAG + retrieval)           │
└─────────────┘   │  (document-ai integration)   │
       │          └──────────┬───────────────────┘
       │                     │
       ▼                     ▼
┌─────────────┐   ┌──────────────────────────────┐
│ workflow-   │   │ LLM Gateway                  │
│ engine      │◄──┤  (OpenAI/Local + PII filter) │
└─────────────┘   └──────────────────────────────┘
```

### Streaming
- SSE یا WebSocket برای response streaming
- partial tokens → UI با typewriter effect

### PII Protection
- Redact قبل از ارسال به LLM (شماره ملی، کارت بانکی)
- On-prem / sovereign AI برای داده‌های حساس
- Consent banner: «برای بهبود پاسخ، این گفتگو ذخیره می‌شود. [رد]»

---

## ۵. Prompts / System Messages

- **Customer bot tone:** همدلانه، ساده، فارسی محاوره‌ای ولی محترم
- **Agent copilot tone:** فنی، دقیق، با ارجاع به منبع
- **Refusal rules:** تصمیم حقوقی، قیمت‌گذاری نهایی، رد/قبول خسارت را فقط پیشنهاد می‌دهد

---

## ۶. Evaluation & Observability

- **Eval set:** ۵۰۰ نمونه سوال واقعی + expected answer + grading
- **Metrics:** Accuracy, Helpfulness, Safety, Latency p95
- **Shadow mode:** اول فقط log، بعد از ۲ هفته go-live
- **Feedback:** thumb up/down روی هر response + reason

---

## ۷. Offline/Degraded Mode

- اگر LLM قطع → پاسخ از knowledge-base قبلی + «در حال حاضر پاسخ محدود»
- Queue کردن پیام کاربر، retry پس‌زمینه
