# Load Testing with k6

This directory contains load testing scripts using k6.

## Prerequisites

- k6 installed: `brew install k6` (macOS) or download from https://k6.io/

## Running Tests

### Claims API Load Test
```bash
k6 run tests/load/claims-api.js
```

### Payments API Load Test
```bash
k6 run tests/load/payments-api.js
```

### With Custom API URL
```bash
API_URL=http://your-api-url k6 run tests/load/claims-api.js
```

## Test Scenarios

### claims-api.js
- **Stages**: 10 → 50 users
- **Duration**: 3.5 minutes
- **Thresholds**: 95% of requests < 500ms, error rate < 1%

### payments-api.js
- **Stages**: 5 → 20 users
- **Duration**: 3.5 minutes
- **Thresholds**: 95% of requests < 1s, error rate < 2%

## Results

k6 will output:
- Request duration percentiles
- Request count
- Failure rate
- RPS (requests per second)

## Adding New Tests

1. Create a new `.js` file in this directory
2. Configure stages and thresholds
3. Add authentication logic if needed
4. Update this README
