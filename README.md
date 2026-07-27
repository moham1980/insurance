# Insurance Platform

A comprehensive insurance management platform with microservices architecture, real-time updates, and enterprise-grade security.

## 🚀 Features

### Core Functionality
- **Claims Management**: Full lifecycle claim processing with document management
- **Policy Management**: Quote, risk assessment, underwriting, and issuance
- **Payments & Collections**: Payment processing with idempotency and DLQ handling
- **Fraud Detection**: Real-time fraud scoring and AML compliance
- **Sales Network**: Partner and agency management with commission tracking
- **Reinsurance**: Contract management with retention limits and broker commissions
- **Complaints**: OTP-verified complaint handling with escalation
- **Reporting**: KPI dashboards and export functionality

### Advanced Features
- **Real-time Updates**: Server-Sent Events (SSE) for live UI updates
- **Background Jobs**: Job queue management with retry and cancellation
- **Feature Flags**: Environment-based targeting and role-based rollout
- **Distributed Tracing**: Request tracing across microservices
- **Bulk Actions**: Multi-item operations with confirmation dialogs
- **Audit Logging**: Complete change tracking with user attribution
- **RBAC**: Enterprise-grade role-based access control

### Infrastructure
- **CI/CD**: GitHub Actions for automated testing and deployment
- **IaC**: Kubernetes manifests with HPA and Ingress
- **Monitoring**: Prometheus and Grafana for metrics and dashboards
- **Security**: Network policies, Pod Security Standards, and secrets management

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 18+
- PostgreSQL 15+
- Kafka 7.5+
- kubectl (for Kubernetes deployment)
- Helm (optional)

## 🛠️ Local Development

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/insurance.git
cd insurance
```

### 2. Start Infrastructure
```bash
docker compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Kafka (port 9092)
- Zookeeper (port 2181)

### 3. Create Test Users
```powershell
.\scripts\create-test-users.ps1
```

### 4. Build All Services

Build all services sequentially (recommended to avoid race conditions):
```bash
bun run scripts/build-all-sequential.ts
```

Or build a specific service:
```bash
bun run --filter <service-name> build
```

### 5. Start Services

Use the local dev orchestrator to start multiple services:
```bash
bun run scripts/start-local.ts api-gateway auth-service policy-service web-ui
```

Or start a single service:
```bash
bun run --filter <service-name> dev
```

### 6. Start Web UI
```bash
bun run --filter web-ui dev
```

The UI will be available at `http://localhost:3030`

### 7. Verify Health
```bash
bun run scripts/health-check.ts
```

### 8. Build Docker Images
```bash
# Build all services
bun run scripts/docker-build-all.ts

# Or build a specific service with host network
docker build --network=host -f services/<service>/Dockerfile -t <service>:latest .
```

## 🚢 Kubernetes Deployment

### 1. Create Namespace
```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Deploy Infrastructure
```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/kafka.yaml
```

### 3. Deploy Services
```bash
kubectl apply -f k8s/claims-service.yaml
kubectl apply -f k8s/web-ui.yaml
```

### 4. Deploy Monitoring
```bash
kubectl apply -f k8s/prometheus.yaml
kubectl apply -f k8s/grafana.yaml
```

### 5. Apply Security Policies
```bash
kubectl apply -f k8s/security-policies.yaml
```

### 6. Create Secrets
```bash
kubectl apply -f k8s/secrets.yaml
```

**Important**: Update secrets with production values before deployment.

## 🔐 Security

See [SECURITY.md](SECURITY.md) for detailed security guidelines.

### Key Security Features
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Network policies (deny-all by default)
- Pod Security Standards (restricted)
- Secrets management with Kubernetes Secrets
- TLS encryption for all external communications

## 📊 Monitoring

### Prometheus
- URL: `http://prometheus.insurance.example.com`
- Metrics endpoint: `/metrics` on each service
- Scrape interval: 15s

### Grafana
- URL: `http://grafana.insurance.example.com`
- Default credentials: admin/admin
- Dashboards: Pre-configured for all services

## 🧪 Testing

### Unit Tests
```bash
cd services/web-ui
npm test
```

### Load Testing
```bash
# Install k6 first
brew install k6  # macOS
# or download from https://k6.io/

# Run load tests
k6 run tests/load/claims-api.js
k6 run tests/load/payments-api.js

# With custom API URL
API_URL=http://your-api-url k6 run tests/load/claims-api.js
```

See [tests/load/README.md](tests/load/README.md) for more details.

### UAT Scenarios
See [UAT.md](UAT.md) for comprehensive test scenarios.

## 📚 Documentation

- [ROADMAP.md](ROADMAP.md): Development roadmap and completed features
- [UAT.md](UAT.md): User Acceptance Testing scenarios
- [SECURITY.md](SECURITY.md): Security hardening guide

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

#### Web UI
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

#### Services
```env
DATABASE_URL=postgresql://insurance:insurance@localhost:5432/insurance
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-jwt-secret
PORT=3001
```

See `.env.example` for all available variables.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## 📝 License

Proprietary - All rights reserved

## 🆘 Support

For issues and questions, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: April 2026
