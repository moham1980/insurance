# 27 — Data Visualization و Charts

---

## ۱. اصول

- **Clarity > Decoration.** بدون 3D pie، بدون gradient بی‌معنی
- **Perceptual accuracy.** bar > area > pie برای مقایسه
- **Accessibility.** هر chart: alt text، data table fallback، keyboard navigation
- **RTL-aware.** محور x از راست به چپ در pertinent charts

---

## ۲. Tech Stack

| نیاز | انتخاب |
|------|--------|
| Charts تعاملی | **ECharts** (RTL خوب، locale فارسی، performant) |
| Sparklines ساده | **Recharts** یا مستقیم SVG |
| Maps | **Leaflet** + OpenStreetMap (یا NeshanMap) |
| Heatmaps | ECharts |
| Timeline | custom SVG |

**نه:** Chart.js (RTL ضعیف), Highcharts (پولی)

---

## ۳. Chart Types — موارد کاربرد

| نوع | کاربرد در بیمه |
|-----|----------------|
| Line | درآمد premium ماهانه |
| Bar | تعداد claims per status |
| Stacked Bar | premium breakdown by line |
| Area | cumulative claims |
| Sparkline | KPI trend در card |
| Gauge | سهم از هدف (commission) |
| Treemap | portfolio distribution |
| Sankey | flow of claims (filed → paid) |
| Heatmap | risk region |
| Map (Choropleth) | pricing by استان |

---

## ۴. Color & Encoding

### Palette (قابل تمایز روی color-blind)
```
#1E5BFF #0EA5A4 #F59E0B #DC2626
#8B5CF6 #EC4899 #10B981 #64748B
```

### قواعد
- Sequential (low→high): یک hue، تغییر luminance
- Diverging (negative/positive): دو hue متضاد با mid neutral
- Categorical: حداکثر ۸ دسته، بقیه = "سایر"
- **Never color-only.** همیشه pattern یا shape جایگزین

---

## ۵. Data Viz Accessibility

### الزامات
- `role="img"` + `aria-label` توصیفی
- `<title>` و `<desc>` در SVG
- Keyboard navigation: Tab focus روی datapoints، Enter/Space برای tooltip
- Data table alternative (toggle `[View as table]`)
- Min font: 12px، contrast ≥ 4.5:1

### Example
```tsx
<figure role="group" aria-labelledby="chart-title" aria-describedby="chart-desc">
  <figcaption id="chart-title">درآمد ماهانه بیمه بدنه</figcaption>
  <p id="chart-desc" className="sr-only">
    نمودار میله‌ای ۱۲ ماه. کمترین: فروردین ۱.۲M، بیشترین: شهریور ۳.۵M
  </p>
  <EChartsReact option={option} />
  <details>
    <summary>مشاهده به صورت جدول</summary>
    <table>...</table>
  </details>
</figure>
```

---

## ۶. Interactions

- **Hover tooltip:** تاخیر ۱۵۰ms، به زبان فارسی با اعداد formatted
- **Click drill-down:** به‌جای navigate، drawer با جزئیات
- **Zoom/Brush:** روی time-series
- **Legend toggle:** کلیک = hide سری
- **Loading:** skeleton به‌اندازه واقعی (جلوگیری از CLS)

---

## ۷. Performance

- Server-side رندر svg برای export/email
- در client: `useMemo` option، avoid re-render
- Large datasets > 10k: sampling یا aggregation backend-side
- ECharts `lazyUpdate: true`

---

## ۸. Dashboard Composition

قواعد:
- یک chart type غالب در هر dashboard
- Title + time-range picker + export در همه
- max ۶ chart در یک صفحه (اگر بیشتر → tabs یا sections)
- Grid ۱۲ ستون، chart min 4 ستون

---

## ۹. Export

- PNG (static) با watermark + تاریخ + سازمان
- CSV data
- PDF با layout مناسب چاپ
- Clipboard copy با Share API در موبایل

---

## ۱۰. Persian/RTL Gotchas

- اعداد محور y همیشه Latin
- Tooltip direction: RTL
- Date formatting: جلالی با `date-fns-jalali`
- Axis labels: فارسی روی x برای دسته‌ها

---

## ۱۱. Live Data

- SSE stream به chart
- animate update با `ease-standard` ۳۰۰ms
- badge "زنده" گوشه chart
- pause on user hover

---

## ۱۲. Financial Numbers Display

- **همیشه جداسازی سه‌رقمی**
- واحد: "ریال" / "میلیون ریال" بالای chart
- اعداد بزرگ: K/M/B یا "هزار/میلیون/میلیارد"
- منفی با رنگ `--color-danger` + پرانتز
- صفر مطلق → "—"
