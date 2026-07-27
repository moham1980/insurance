# فهرست اسناد طراحی ارتقای UI/UX سامانه بیمه

> **مبنا:** `doc/UI_UX_Research_2026.md` + وضعیت فعلی اپ‌های پروژه
> **هدف:** ارتقای اپ‌های فعلی (Customer Portal, Agent Portal, Back-Office Web-UI) تا سطح ترندهای ۲۰۲۶
> **نسخه:** 1.0 — ۱۴۰۵/۰۲

---

## اپ‌های هدف در پروژه

| اپ | مسیر | Stack فعلی | نوع مخاطب |
|----|------|-----------|-----------|
| Customer Portal | `services/customer-portal-ui` | Next.js + Tailwind | مشتری (B2C, B2B) |
| Agent Portal | `services/agent-portal-ui` | Next.js + Tailwind | نماینده فروش |
| Back-Office Web-UI | `services/web-ui` | Next.js App Router + Tailwind | کارمند داخلی (Claims, UW, Admin) |
| Admin-UI (تکمیلی) | `apps/admin-ui` | Minimal | Admin/SRE |

---

## فهرست اسناد طراحی

### اسناد پایه (مشترک بین همه اپ‌ها)

| # | عنوان | فایل |
|---|------|------|
| 01 | اصول طراحی (Design Principles) | [`01_design_principles.md`](01_design_principles.md) |
| 02 | Design System و Tokens | [`02_design_system_tokens.md`](02_design_system_tokens.md) |
| 03 | Typography, Color & Iconography | [`03_visual_foundations.md`](03_visual_foundations.md) |
| 04 | Accessibility (WCAG 3.0+ / RTL) | [`04_accessibility_rtl.md`](04_accessibility_rtl.md) |
| 05 | Component Library (shadcn/Radix) | [`05_component_library.md`](05_component_library.md) |

### اسناد اپ‌محور

| # | عنوان | فایل |
|---|------|------|
| 10 | ارتقای Customer Portal (وب) | [`10_customer_portal_redesign.md`](10_customer_portal_redesign.md) |
| 11 | PWA موبایل مشتری | [`11_customer_mobile_pwa.md`](11_customer_mobile_pwa.md) |
| 12 | ارتقای Agent Portal | [`12_agent_portal_redesign.md`](12_agent_portal_redesign.md) |
| 13 | ارتقای Back-Office (web-ui) | [`13_back_office_redesign.md`](13_back_office_redesign.md) |

### اسناد قابلیت‌محور (Feature-level)

| # | عنوان | فایل |
|---|------|------|
| 20 | احراز هویت Passwordless + Biometric | [`20_auth_passwordless.md`](20_auth_passwordless.md) |
| 21 | AI Chatbot + Copilot یکپارچه | [`21_ai_chatbot_copilot.md`](21_ai_chatbot_copilot.md) |
| 22 | FNOL موبایل با AR/Camera | [`22_fnol_mobile_ar.md`](22_fnol_mobile_ar.md) |
| 23 | Dashboard شخصی‌سازی‌شده | [`23_personalized_dashboard.md`](23_personalized_dashboard.md) |
| 24 | Dark Mode هوشمند | [`24_smart_dark_mode.md`](24_smart_dark_mode.md) |
| 25 | Micro-Interactions و Motion | [`25_microinteractions_motion.md`](25_microinteractions_motion.md) |
| 26 | Voice UI برای Agent و FNOL | [`26_voice_ui.md`](26_voice_ui.md) |
| 27 | Data Visualization و Charts | [`27_data_viz.md`](27_data_viz.md) |

### اسناد اجرایی

| # | عنوان | فایل |
|---|------|------|
| 90 | Implementation Roadmap فازبندی | [`90_implementation_roadmap.md`](90_implementation_roadmap.md) |
| 91 | Tech Stack و Dependencies | [`91_tech_stack.md`](91_tech_stack.md) |
| 92 | Quality Gates و Testing UI | [`92_quality_gates.md`](92_quality_gates.md) |

---

## ترتیب مطالعه پیشنهادی

1. **PM / PO:** 00 → 01 → 10/11/12/13 → 90
2. **Designer:** 01 → 02 → 03 → 04 → 05 → سپس اپ هدف
3. **Frontend Dev:** 02 → 05 → 91 → اپ هدف → feature docs
4. **QA / Accessibility:** 04 → 92
