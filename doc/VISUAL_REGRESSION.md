# Visual Regression Testing

## Setup

```bash
bun install --dev @storybook/test-runner playwright
npx playwright install
```

## Run Tests

```bash
# Start Storybook in CI mode
bun run storybook:ci

# Run visual regression
bun run test:storybook
```

## Baseline

Baseline snapshots stored in `.storybook/__snapshots__/`.

Update baseline after intentional UI changes:
```bash
bun run test:storybook --updateSnapshot
```

## Coverage Target

- **≥ ۹۰٪** component coverage
- **≥ ۹۵٪** critical path coverage (Button, Input, Card, PolicyCard, CoverageMatrix)
