# 13 — ارتقای Back-Office (web-ui)

> `services/web-ui` — ابزار کار کارمندان داخلی: Claims, Underwriting, Admin, Fraud, ...

---

## ۱. مشکلات فعلی (بر اساس بررسی ساختار)

- وجود >20 ماژول (admin, aml, claims, fraud, reinsurance, ...) با UX متفاوت
- جابه‌جایی زیاد بین صفحات → workbench وجود ندارد
- استفاده ناهماهنگ از Tailwind بدون design system
- عدم RBAC-aware UI (disabled vs hidden vs 403 مخلوط)

---

## ۲. مدل جدید: **Role-Based Workspace**

هر کاربر با login به **Workspace** مخصوص نقش خود می‌رسد:

| نقش | Workspace اصلی |
|-----|----------------|
| Claim Adjuster | Claims Workbench |
| Underwriter | UW Workbench |
| Fraud Analyst | Fraud Console |
| Collections Officer | Collections Queue |
| Loss Adjuster | Field Adjuster |
| Admin/Org | Settings & Governance |
| Product Manager | Product Studio |

**Switcher بالا-راست** برای سوئیچ workspace (اگر کاربر چند نقش دارد).

---

## ۳. Workbench الگوی مشترک

```
┌──────────────────────────────────────────────────┐
│ Top bar: [Logo] [Workspace▾] [Search] [Notif] [▾]│
├──────┬───────────────────────────────┬───────────┤
│ Nav  │  Main Work Canvas             │ Side Tools│
│ rail │  (Queue | Detail | Form)      │ (AI/Help) │
│      │                               │           │
├──────┴───────────────────────────────┴───────────┤
│ Audit/Status Bar                                  │
└──────────────────────────────────────────────────┘
```

- **Nav rail** آیکون-only 60px، hover → expand 240px
- **Side tools** قابل collapse (AI copilot, notes, attachments)
- **Queue → Detail → Action** در یک صفحه (split view)

---

## ۴. Claims Workbench (نمونه کامل)

### Layout
- **چپ (RTL):** Queue با filter pills (NEW/IN_REVIEW/ESCALATED/PAID)
- **وسط:** Claim Detail با tab‌ها: Overview / Documents / Timeline / Financial / Chat
- **راست:** AI Copilot (خلاصه، پیشنهاد مبلغ، ریسک تقلب)

### Microinteractions
- Keyboard `J/K` برای up/down روی queue
- Enter → باز کردن detail
- `A` = Approve / `R` = Reject با confirm
- Diff viewer برای تغییرات

### AI Copilot
- Summary خودکار از document‌ها (DOC-AI)
- پیش‌بینی مبلغ قابل پرداخت با range
- Red-flag تقلب + لینک به fraud-service

---

## ۵. Underwriting Workstation

- Risk Scorecard با explainability (کدام عامل چقدر اثر دارد)
- Rule Engine Explorer: کاربر می‌بیند کدام rule اعمال شده
- Override Log: اگر کاربر override کند، دلیل الزامی + audit
- Compare mode: ۲ سناریو کنار هم

---

## ۶. Admin / Governance

- **RBAC Matrix UI:** سند `doc/PERMISSIONS_MATRIX.md` الان ماتریسی است → تبدیل به UI قابل ویرایش با approval workflow
- **Feature Flags Console:** rollout درصدی + segment
- **Audit Explorer:** جستجو در audit-log با filter (user, entity, time, action)
- **Health Monitor:** real-time SLA، DLQ، feature usage

---

## ۷. Dark Mode پیش‌فرض

برای کارمندان که ساعات طولانی کار می‌کنند، dark mode پیشنهاد اول است. Light available.

---

## ۸. Density Options

هر workbench سه حالت:
- **Compact:** row 32px — data-entry
- **Comfortable:** row 40px — default
- **Spacious:** row 48px — بررسی دقیق

ذخیره در profile کاربر.

---

## ۹. Real-time Collaboration

- نمایش آواتار کاربرانی که در حال دیدن همان Claim هستند
- Lock optimistic: اگر کسی در حال ویرایش باشد، به بقیه اطلاع
- Comment thread روی فیلدها (مثل Figma)

---

## ۱۰. Data Viz & Reporting

سند 27 جزئیات کامل. خلاصه:
- KPI bar در هر workspace
- Drill-down روی chart
- Export PDF/XLSX با watermark + audit log

---

## ۱۱. Migration Plan

### فاز ۱ (۲ ماه)
- Design System ادغام
- Shell + Nav rail + Workspace switcher
- Command Palette

### فاز ۲ (۳ ماه)
- Claims Workbench (اولویت بالا)
- UW Workbench

### فاز ۳ (۳ ماه)
- Fraud Console، Collections، Reinsurance
- Admin Governance UI

### فاز ۴ (۲ ماه)
- Real-time collaboration، AI copilot کامل، Advanced analytics
