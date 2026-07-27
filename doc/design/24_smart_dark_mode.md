# 24 — Dark Mode هوشمند

---

## ۱. استراتژی

سه حالت قابل انتخاب:
1. **System** (پیش‌فرض) — از `prefers-color-scheme` تبعیت می‌کند
2. **Light** — دستی
3. **Dark** — دستی

در فاز ۲: **Smart Auto** بر اساس ساعت محلی + sensor نور (Ambient Light Sensor API - محدود)

---

## ۲. Implementation

### Tailwind Setup
```ts
// tailwind.config.ts
export default {
  darkMode: 'class', // 'media' ممنوع - کاربر کنترل لازم دارد
  ...
};
```

### Theme Provider
```tsx
// providers/ThemeProvider.tsx
'use client';
import { createContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>('system');
  
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) setTheme(saved);
  }, []);
  
  useEffect(() => {
    const resolved = theme === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Listen to system changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const handler = () => document.documentElement.classList.toggle('dark', mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
  
  return (...);
}
```

### No FOUC
در `<head>`:
```html
<script>
  (function() {
    const t = localStorage.getItem('theme') || 'system';
    const dark = t === 'dark' || (t === 'system' &&
      matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  })();
</script>
```

---

## ۳. ToggleControl

- در header بالا، سه‌گزینه (radio group): خورشید / ماه / خودکار
- `aria-label="حالت ظاهر"`
- Smooth transition: `transition: background-color 200ms, color 200ms`
- اما `transition-colors` را در `prefers-reduced-motion` خاموش

---

## ۴. Design Considerations

### رنگ‌ها در Dark
- **هرگز** سیاه مطلق (`#000`). شروع از `#0B1020`
- متن اصلی: `#E6EAF2` (نه سفید خالص)
- سایه‌ها: elevation با border subtle + lighter bg، نه drop-shadow

### Images
- هر illustration نسخه light + dark
- Logo‌ها با CSS filter یا SVG `currentColor`

### Charts
- Palette مخصوص dark (رنگ‌های پررنگ‌تر روی pastel نیستند)
- Grid lines با opacity پایین

### Code / Monospace
- در dark: syntax-theme مناسب (GitHub Dark یا Night Owl)

---

## ۵. Battery / Performance (Mobile)

- OLED benefit: سیاه‌تر = کم‌مصرف‌تر
- "True Black" mode اختیاری در settings (فقط moblie با `pureBlack`)
- اما حفظ elevation با border ظریف

---

## ۶. Accessibility در Dark

- کنتراست حداقل ۷:1 برای متن اصلی (هدف AAA)
- Focus ring روشن‌تر در dark
- تست با color-blind simulator + low-vision

---

## ۷. Sync بین دستگاه‌ها

- setting را در profile backend ذخیره (اختیاری)
- اگر کاربر از موبایل dark انتخاب کرد، وب هم sync شود

---

## ۸. Screen-specific Overrides

گاهی یک صفحه (مثل receipt PDF preview) باید همیشه light باشد:
```tsx
<div data-theme-lock="light">...</div>
```
CSS:
```css
[data-theme-lock="light"] { color-scheme: light; background: #fff; color: #000; }
```

---

## ۹. Roll-out Plan

1. فاز ۱: Dark + Light + System در Customer Portal
2. فاز ۲: همه اپ‌ها + dark به‌عنوان پیش‌فرض Back-office
3. فاز ۳: True Black (mobile) + Smart Auto
4. فاز ۴: High-Contrast theme (accessibility)
