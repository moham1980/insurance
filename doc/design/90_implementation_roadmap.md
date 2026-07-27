# 90 — Implementation Roadmap (فازبندی)

> نقشه راه عملی برای ارتقای سه اپ: Customer Portal / Agent Portal / Back-Office Web-UI

---

## اصول فازبندی

- هر فاز **قابل شیپ‌شدن مستقل** و feature-flagged
- **بدون big-bang rewrite** — تدریجی با ادغام Design System
- هر فاز یک **metric** برای تعیین موفقیت

---

## فاز ۰ — Foundation (۲ هفته)

**هدف:** زیرساخت طراحی بدون تغییر UI ظاهری

- [ ] ایجاد `packages/design-system`
- [ ] Design Tokens (color, type, spacing, motion)
- [ ] Tailwind preset
- [ ] Storybook راه‌اندازی
- [ ] 10 primitive (Button, Input, Card, Dialog, ...)
- [ ] Lighthouse CI + axe-core
- [ ] Theme Provider + Dark Mode scaffold

**Deliverable:** PR که هر سه اپ از همین preset استفاده کنند (UI یکسان با قبل).

**Metric:** Zero regression، Storybook سبز.

---

## فاز ۱ — Quick Wins مشترک (۴ هفته)

همزمان در سه اپ:

- [ ] **Dark Mode** کامل (سند 24)
- [ ] **Accessibility pass:** `<html lang dir>`, landmarks, skip-link, contrast fixes
- [ ] **Bottom Navigation** موبایل در Customer Portal
- [ ] **Micro-interactions** پایه روی Button/Input/Toast
- [ ] **Reduced-motion** support
- [ ] **Passwordless Login (OTP)** فعلی ارتقا با Web OTP API

**Metric:**
- Lighthouse A11y ≥ 90
- Mobile bounce rate ↓ 15٪

---

## فاز ۲ — Customer Portal Core (۸ هفته)

- [ ] Shell جدید (Header, BottomNav, Theme toggle)
- [ ] **Dashboard با NBA** (سند 23)
- [ ] PolicyCard component + list page
- [ ] Policy detail با tabs + CoverageMatrix
- [ ] Payment flow + receipt
- [ ] **Passkey / WebAuthn** (سند 20)
- [ ] Profile + Consent page

**Metric:**
- Task success rate (خرید/تمدید) ≥ 85٪
- Passkey adoption ≥ 20٪

---

## فاز ۳ — FNOL Mobile + AI Chatbot (۶ هفته)

- [ ] FNOL Wizard mobile کامل (سند 22)
- [ ] Camera capture + OCR پلاک
- [ ] Offline draft + Background Sync
- [ ] **AI Chatbot** در Customer Portal (سند 21)
- [ ] Handoff به انسان

**Metric:**
- FNOL completion time ≤ 3min
- Chatbot resolution rate ≥ 60٪

---

## فاز ۴ — Agent Portal (۶ هفته)

- [ ] Workbench shell + Command Palette
- [ ] **Quote Wizard V2** با AI Copilot
- [ ] Commission Tracker + Gamification
- [ ] Customer 360° view
- [ ] Keyboard-first shortcuts

**Metric:**
- Time-to-Quote کاهش ۴۰٪
- Agent NPS ≥ 40

---

## فاز ۵ — Back-Office Workbenches (۱۰ هفته)

- [ ] **Role-Based Workspace switcher**
- [ ] Claims Workbench با AI copilot
- [ ] UW Workstation با Risk Scorecard
- [ ] Fraud Console
- [ ] RBAC Matrix UI + Feature Flags Console
- [ ] Audit Explorer

**Metric:**
- Claim processing time ↓ 30٪
- User satisfaction کارشناس ↑

---

## فاز ۶ — Advanced Features (۸ هفته)

- [ ] **Voice UI** در FNOL و Agent (سند 26)
- [ ] **Real-time collaboration** (avatars, lock) در Back-Office
- [ ] Data Viz advanced (سند 27)
- [ ] Personalization engine (recommendation-service integration)
- [ ] Stress-detection / Emotion-aware UX (pilot)

**Metric:**
- Voice usage ≥ 15٪ از FNOL‌ها
- Dashboard widget customization rate ≥ 30٪

---

## فاز ۷ — Polish & Scale (۴ هفته)

- [ ] WCAG 3.0 APCA migration
- [ ] Native wrapper با Capacitor (اختیاری)
- [ ] Performance budget tightening
- [ ] Visual regression coverage ≥ 90٪
- [ ] Docs کامل + playground

---

## جدول زمان‌بندی (به ماه)

| فاز | شروع | طول | پایان |
|-----|------|------|-------|
| ۰ | M0 | 0.5m | M0.5 |
| ۱ | M0.5 | 1m | M1.5 |
| ۲ | M1.5 | 2m | M3.5 |
| ۳ | M2.5 | 1.5m | M4 (همپوشانی) |
| ۴ | M4 | 1.5m | M5.5 |
| ۵ | M5.5 | 2.5m | M8 |
| ۶ | M7 | 2m | M9 (همپوشانی) |
| ۷ | M9 | 1m | M10 |

**کل:** حدود ۱۰ ماه با تیم متوسط (۲ FE، ۱ Designer، ۱ QA، ۰.۵ BE دی‌لاگ)

---

## ریسک‌ها

| ریسک | احتمال | کاهش |
|------|--------|------|
| Big Design System drift بین اپ‌ها | M | Single source package + enforce در CI |
| Performance regression بعد از AI chatbot | H | Lazy load + budget gating |
| Accessibility backtracking | H | axe در CI، manual audit هر فاز |
| Backend نیازهای جدید (API) | M | هماهنگی زودهنگام با BE lead |
| Rollout بدون feature-flag | H | الزامی در definition-of-done |

---

## Definition of Done (per feature)

- [ ] طراحی در Storybook
- [ ] Unit + component tests
- [ ] Playwright E2E حداقل happy path
- [ ] axe-core pass
- [ ] Visual regression snapshot
- [ ] Docs/Changeset
- [ ] Feature flag + rollout plan
- [ ] Observability (metric + event)
