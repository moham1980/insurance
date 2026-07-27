# 12 — ارتقای Agent Portal

> `services/agent-portal-ui` — محل کار روزانه نماینده/کارشناس فروش

---

## ۱. ارزش پیشنهادی

- **سرعت:** کاهش Time-to-Quote تا ۴۰٪
- **هوشمندی:** Co-pilot AI برای پیشنهاد پوشش مناسب
- **کیفیت:** کاهش خطای ورود داده با OCR + Autocomplete
- **شفافیت:** وضعیت real-time از backend + commission tracker

---

## ۲. IA

```
/dashboard                 → KPI + لیست کارهای امروز
/quotes                    → لیست پیش‌نمایش قیمت‌ها
/quotes/new                → Quote Wizard با AI
/policies                  → بیمه‌نامه‌های فروخته‌شده
/customers                 → CRM سبک
/customers/[id]            → 360° مشتری
/commissions               → داشبورد کارمزد
/leaderboard               → رتبه‌بندی داخلی (gamification)
/learn                     → دوره و guideline
/inbox                     → پیام مشتری / تیکت
```

---

## ۳. Workbench Pattern

صفحه کار نماینده باید **یک workbench** باشد نه جابه‌جایی میان تب‌ها:

```
┌──────────────────────────────────────────────────────┐
│ [Search / Quick Switcher (Ctrl+K)]                   │
├────────────┬───────────────────────────┬─────────────┤
│ Sidebar    │  Main Canvas              │  AI Copilot │
│ (nav)      │  (Quote Wizard / Detail)  │  (context)  │
│            │                           │             │
├────────────┴───────────────────────────┴─────────────┤
│ Bottom StatusBar: saving… / online / shortcuts help  │
└──────────────────────────────────────────────────────┘
```

- **Command Palette (Ctrl+K):** جستجوی عمیق (مشتری، بیمه‌نامه، اکشن)
- **AI Copilot panel سمت چپ** (در RTL): context-aware
- **Autosave همیشه فعال** با badge «ذخیره شد • 4 ثانیه قبل»

---

## ۴. Quote Wizard با AI

### Step Flow
1. **مشتری:** شماره ملی → sanhab → پر شدن خودکار
2. **نوع بیمه:** chips بزرگ + recommend AI بر اساس پروفایل
3. **فرم پویا:** بسته به نوع بیمه؛ با validation inline + AI نکات ریسک
4. **پوشش‌ها:** Matrix قابل مقایسه (بسته Basic/Standard/Premium)
5. **قیمت:** نمایش تفکیکی با explainability («چرا این قیمت؟» → عوامل)
6. **ارسال:** چاپ/ایمیل/SMS/PDF/امضای دیجیتال

### AI Copilot در این Wizard
- پیشنهاد پوشش (Cross-sell): «این مشتری ۳ خودرو دارد؛ بیمه بدنه را هم پیشنهاد دهیم؟»
- هشدار ریسک: «سابقه خسارت بالا — لطفاً گزینه franchise را فعال کنید»
- متن پیشنهادی برای فروش: «این‌طور توضیح دهید...»
- **Human-in-the-loop:** نماینده تایید می‌کند، AI تصمیم نهایی نمی‌گیرد

---

## ۵. Dense Tables با UX خوب

- **Row height:** ۴۰px (compact) / ۴۸px (comfortable)
- **Sticky header + sticky first column** (شماره بیمه‌نامه)
- **Virtualization** برای > 100 row (TanStack Virtual)
- **Inline actions:** hover/focus reveal
- **Bulk select** با shift-click + bulk bar پایین
- **Column chooser** persisted در profile کاربر
- **Export:** CSV / XLSX / PDF

---

## ۶. Commission Tracker

- KPI Cards: درآمد ماه / سهم از هدف / رتبه داخلی
- نمودار Trend (تعاملی)
- لیست تراکنش‌های کارمزد با تاریخ واریز
- **Gamification:** progress bar رسیدن به tier بعدی + badges

---

## ۷. Keyboard-First Culture

میانبرها بر اساس سند 04:
- `Ctrl+N`: New Quote
- `Ctrl+S`: Save Draft
- `Ctrl+K`: Command Palette
- `G + D`: Dashboard
- `G + Q`: Quotes
- `G + C`: Customers
- `?`: Help

---

## ۸. Notifications Real-time

- SSE یا WebSocket از backend
- Toast در گوشه + badge در Inbox
- دسته‌بندی: Lead جدید، وضعیت quote، Chat مشتری، تغییر commission

---

## ۹. Mobile Experience

- نماینده اغلب موبایل دارد → responsive کامل
- صفحه‌های اولویت‌دار موبایل: Customer lookup، Quick Quote، Inbox
- FAB: New Quote

---

## ۱۰. Migration Steps

1. ادغام Design System و theme
2. پیاده‌سازی Shell (App Header + Sidebar + Command Palette)
3. Dashboard جدید
4. Quote Wizard V2 با Copilot
5. Commission Tracker
6. Gamification

هر گام: flag-guarded برای rollout تدریجی.
