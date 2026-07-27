# 25 — Micro-Interactions و Motion

---

## ۱. فلسفه

- **Motion معنا دارد، تزئینی نیست.**
- هر animation باید یک سوال پاسخ دهد:
  - «چه چیزی تغییر کرد؟»
  - «کجا رفت؟»
  - «چقدر طول می‌کشد؟»
  - «آیا موفق بود؟»
- **Reduced Motion اولویت بالا:** همیشه `prefers-reduced-motion` احترام

---

## ۲. Motion Tokens (از سند 02)

```css
--motion-fast: 120ms;   /* hover, button press */
--motion-base: 200ms;   /* modal open, toast */
--motion-slow: 320ms;   /* page transition, drawer */
--motion-stagger: 40ms; /* list items stagger */

--ease-standard: cubic-bezier(.2,.8,.2,1);      /* in+out متعادل */
--ease-emphasized: cubic-bezier(.2,0,0,1);       /* ورود مهم */
--ease-exit: cubic-bezier(.4,0,1,1);             /* خروج سریع */
```

---

## ۳. Micro-interactions کلیدی

### Button
- Hover: bg lighten 4٪، ۱۲۰ms
- Active: scale(0.98)، ۸۰ms
- Loading: spinner fade-in + متن محو

### Input
- Focus: border transition + label float
- Error: shake (با احترام reduced-motion)، ۲۰۰ms
- Success: check-icon fade-in

### Toggle / Switch
- Spring animation (framer-motion)
- Haptic feedback موبایل (Vibration API)

### Form Submit
- Button → Spinner → Check → متن «ارسال شد»
- طول کل ۶۰۰ms برای perceived speed

---

## ۴. Page / Route Transitions

### Next.js App Router
- **Shared Element** برای cards (layoutId در framer-motion)
- **Fade + slight slide** پیش‌فرض
- **Back button:** معکوس direction

### Bottom Sheet / Drawer
- در موبایل: slide up
- swipe down → close با physics spring

---

## ۵. List Interactions

- Item enter: stagger 40ms per item
- Item remove: collapse height + fade
- Reorder: layout animation
- Virtualized lists: transition خاموش در scroll سریع

---

## ۶. Feedback States

### Optimistic Updates
- UI بلافاصله state جدید را نشان دهد
- اگر fail، rollback با shake

### Skeleton
- همیشه height واقعی (جلوگیری از CLS)
- shimmer animation ملایم

### Toast / Notification
- Enter: slide از بالا + fade
- Exit: slide بالا یا fade (۳۲۰ms)
- Swipe to dismiss موبایل

---

## ۷. Data Viz Motion

- Chart load: animate-on-mount (bars grow)
- Chart update: interpolate between values
- Tooltip: fade in ۸۰ms (نه bounce)

---

## ۸. Celebration Moments

مواقع خاص:
- پرداخت موفق: confetti کوتاه (یا حذف در reduced-motion)
- اولین بیمه‌نامه صادر شد
- Badge جدید (gamification)

**قاعده:** یک‌بار در هر session، نه اسپم.

---

## ۹. Performance

- Animate فقط `transform` و `opacity` (GPU-friendly)
- بدون `animate: height` (بدون `height: auto` hack → از FLIP یا grid استفاده)
- `will-change` فقط وقتی لازم، سپس حذف

### Framer Motion vs CSS
- CSS برای تعاملات ساده (hover, focus)
- Framer Motion برای state-driven (layout, shared, gesture)

---

## ۱۰. Reduced Motion Fallbacks

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

در framer-motion:
```tsx
const shouldReduce = useReducedMotion();
<motion.div animate={shouldReduce ? {} : { x: 100 }} />
```

---

## ۱۱. Haptic (موبایل)

- `navigator.vibrate(10)` برای tap مهم
- الگوهای از پیش‌تعریف:
  - `success`: `[10]`
  - `warning`: `[50, 30, 50]`
  - `error`: `[100]`
- Setting user opt-out

---

## ۱۲. چک‌لیست قبل از merge هر animation

- [ ] در `prefers-reduced-motion` کار می‌کند؟
- [ ] اندازه p95 < 300ms؟
- [ ] فقط transform/opacity؟
- [ ] روی صفحه کوچک (360px) بد نیست؟
- [ ] keyboard navigation نمی‌شکند؟
- [ ] screen-reader announcement درست است؟
