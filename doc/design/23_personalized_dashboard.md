# 23 — Dashboard شخصی‌سازی‌شده

> «داشبورد گزارش نیست، ماشین تصمیم است.» — داشبوردهای ۲۰۲۶ باید **action-first** باشند.

---

## ۱. الگوهای سه‌گانه

| الگو | مخاطب | تمرکز |
|------|--------|--------|
| **Alert-First** | Customer | یک NBA + ۳ KPI ساده |
| **Workload Queue** | Agent / Adjuster | لیست کاری روز + متریک عملکرد |
| **Operational Health** | Admin / Ops | SLA، DLQ، usage، anomalies |

---

## ۲. Customer Dashboard

### Hero: Next Best Action (NBA)
- یک کارت بزرگ بالا، رنگ accent:
  - "بیمه بدنه شما تا ۷ روز دیگر منقضی می‌شود — تمدید"
  - "گواهی عدم خسارت شما صادر شد — دانلود"
  - "خسارت ۱۲۳ تایید شد — پرداخت ظرف ۴۸h"
- منبع: سرویس **recommendation-service** + **workflow-engine**

### KPI Strip (4 cards)
| کارت | محتوا |
|------|--------|
| بیمه‌نامه‌های فعال | تعداد + small chart trend |
| خسارات باز | تعداد + وضعیت آخرین |
| پرداخت سررسید | مبلغ + تاریخ |
| امتیاز ایمنی | عدد + badge |

### Cards پایینی
- PolicyCard carousel
- Timeline فعالیت اخیر (۱۰ آیتم آخر)
- Tips / محتوای آموزشی سلامت یا رانندگی (based on portfolio)

### Personalization Rules
- زمان روز: صبح → سررسیدها، شب → خلاصه خسارات
- بر اساس پورتفولیو: اگر فقط خودرو دارد → tips رانندگی
- بر اساس life-stage (از sanhab): جوان → بیمه عمر پیشنهاد، مسن → health

---

## ۳. Agent Dashboard

### KPI Row
- درآمد ماه (vs. هدف) — progress bar
- Leadهای جدید
- Quote‌های در انتظار
- رتبه داخلی (gamification)

### Workload
- **Today's Plan:** لیست مشتریان برای follow-up (AI rank شده)
- **Hot Leads:** conversion score بالا
- **Expiring Policies:** بیمه‌نامه‌های مشتریان او که در حال انقضا

### Quick Actions FAB
- New Quote / Lookup Customer / Scan Card

---

## ۴. Ops / Admin Dashboard

### Health Tiles
- Services status (green/yellow/red) از `/health` endpoints
- Kafka DLQ depth
- API p95 latency
- Active Users
- Error rate

### Anomaly Feed
- ML anomaly detection روی metrics
- top 5 alerts امروز

### Quick Jumps
- Audit Explorer
- Feature Flags
- Recent Deploys

---

## ۵. Technical Implementation

### Widget System
```tsx
type Widget = {
  id: string;
  type: 'nba' | 'kpi' | 'chart' | 'list' | 'map';
  title: string;
  dataSource: string; // endpoint
  refreshInterval?: number; // ms
  permissions?: string[]; // RBAC
  layout: { col: number; row: number; w: number; h: number };
};
```

- ذخیره layout در user profile
- کاربر می‌تواند drag/resize (react-grid-layout)
- Default layout per role

### Data Fetching
- **React Query** با stale-time منطقی
- **SSE** برای real-time updates (NBA)
- **Prefetch** روی hover

### Empty / Loading / Error
- هر widget سه state: skeleton، empty (با illustration و CTA)، error (با retry)

---

## ۶. Personalization Signals

| Signal | منبع | استفاده |
|--------|------|---------|
| نقش | IAM | Workspace switcher |
| پورتفولیو | policy-service | Card ordering |
| تاریخچه فعالیت | audit-log | Recent timeline |
| Life stage | KYC/sanhab | NBA content |
| Location | geo + policy | Weather/risk tips |
| Time | client | Content emphasis |

---

## ۷. Privacy

- همه signal‌ها consent-based
- Setting: «شخصی‌سازی داشبورد» on/off
- Explain: «چرا این پیشنهاد؟» لینک روی NBA
