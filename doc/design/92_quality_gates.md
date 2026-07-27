# 92 — Quality Gates و Testing UI

> استانداردهای کیفیت و testing که هر PR باید عبور کند.

---

## ۱. Gates اجباری (CI Blocking)

| Gate | ابزار | Threshold |
|------|-------|-----------|
| TypeCheck | `tsc --noEmit` | 0 error |
| Lint | ESLint + jsx-a11y | 0 error |
| Unit Tests | Vitest | coverage ≥ 80٪ |
| Component Tests | Testing Library | هر کامپوننت public |
| A11y Tests | axe-core | 0 violation |
| E2E Smoke | Playwright | happy path پاس |
| Lighthouse | CI | Perf ≥ 85، A11y ≥ 95 |
| Visual Regression | Chromatic / Playwright | diff < 0.1٪ |
| Bundle Size | size-limit | per budget |

---

## ۲. Testing Pyramid

```
        ▲     E2E (5%)   — Playwright، cross-browser
       ▲▲    Integration (20%) — API + UI
      ▲▲▲   Component (40%) — RTL + Storybook play
     ▲▲▲▲  Unit (35%) — Vitest pure functions
```

---

## ۳. Unit Test قواعد

- هر util، hook، reducer، validator
- 1 behaviour per test
- نام: `describe('useCurrency').it('formats IRR with separators')`
- بدون snapshot برای منطق (فقط برای UI)

---

## ۴. Component Test

```tsx
import { render, screen, userEvent } from '@/test-utils';
import { Button } from '@/design-system';

test('Button calls onClick', async () => {
  const user = userEvent.setup();
  const fn = vi.fn();
  render(<Button onClick={fn}>ارسال</Button>);
  await user.click(screen.getByRole('button', { name: 'ارسال' }));
  expect(fn).toHaveBeenCalled();
});
```

- استفاده از **role/name** نه testId
- هر variant / state یک test
- `userEvent` نه `fireEvent`

---

## ۵. Accessibility Testing

### Automated
```ts
import { injectAxe, checkA11y } from 'axe-playwright';

test('Login page a11y', async ({ page }) => {
  await page.goto('/login');
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    axeOptions: { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  });
});
```

### Manual چک‌لیست (هر release)
- [ ] NVDA روی Customer Dashboard
- [ ] VoiceOver iOS روی FNOL
- [ ] Keyboard-only فرم‌های بحرانی
- [ ] Zoom 200٪ بدون horizontal scroll
- [ ] prefers-reduced-motion پاس

---

## ۶. Visual Regression

- Storybook → Chromatic snapshot
- Playwright `toHaveScreenshot()` برای critical pages
- Tolerance: 0.1٪
- Review manual قبل از merge اگر diff

---

## ۷. Performance Testing

### Lighthouse CI
```yaml
# .lighthouserc.yml
ci:
  collect:
    url:
      - http://localhost:3000
      - http://localhost:3000/dashboard
      - http://localhost:3000/policies
  assert:
    assertions:
      categories:performance: ['error', {minScore: 0.85}]
      categories:accessibility: ['error', {minScore: 0.95}]
      categories:best-practices: ['warn', {minScore: 0.9}]
      categories:seo: ['warn', {minScore: 0.9}]
```

### Bundle Size Budget
```jsonc
// size-limit config
[
  { "path": ".next/**/main-*.js", "limit": "170 KB" },
  { "path": ".next/**/app/**/*.js", "limit": "80 KB per route" }
]
```

### Web Vitals Monitoring
- `next/web-vitals` → send به endpoint
- Alert روی p75 regression

---

## ۸. E2E Critical Flows

Playwright tests برای happy path + failure paths:

### Customer
- Login (OTP + Passkey)
- Dashboard load
- Policy view + download
- FNOL wizard کامل (با mock camera)
- Payment flow (با gateway mock)
- Profile update

### Agent
- Login SSO
- Quote Wizard کامل
- Customer lookup
- Commission view

### Back-Office
- Login
- Claim queue → detail → action
- UW decision flow
- Audit search

---

## ۹. Security Testing

- OWASP ZAP scan در staging (weekly)
- CSP violation monitoring
- Dependency scan (Dependabot + Snyk)
- XSS / CSRF tests در E2E

---

## ۱۰. Definition of Done Checklist (per feature)

- [ ] Unit tests coverage ≥ 80٪
- [ ] Component stories در Storybook
- [ ] axe-core pass
- [ ] Playwright E2E happy path
- [ ] Lighthouse بدون regression
- [ ] Visual snapshot approved
- [ ] RTL + Dark mode visual check
- [ ] Mobile 360px visual check
- [ ] Keyboard-only navigation test
- [ ] Feature flag set up
- [ ] Observability event/metric افزوده
- [ ] Docs / Changeset
- [ ] PR review (Design + Code + QA)

---

## ۱۱. Post-Release

- Canary rollout (5٪ → 25٪ → 100٪)
- Alert روی error rate spike
- Rollback plan مستند
- Retrospective پس از هر فاز اصلی

---

## ۱۲. Metrics Dashboard

داشبورد مرکزی برای:
- Lighthouse trends
- A11y violations over time
- Bundle size trend
- Test coverage trend
- Error rate
- Web vitals p75
- Feature adoption per flag

منبع: ترکیب GitHub Actions + Grafana موجود.
