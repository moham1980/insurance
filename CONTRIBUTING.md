# Contributing to Insurance Platform

Thank you for your interest in contributing to the Insurance Platform!

## 📋 Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git
- Basic knowledge of TypeScript, React, and microservices architecture

## 🚀 Getting Started

### 1. Fork and Clone
```bash
git clone https://github.com/your-username/insurance.git
cd insurance
```

### 2. Install Dependencies
```bash
# Install dependencies for all services
cd services/web-ui
npm install

cd ../claims-service
npm install

# Repeat for other services
```

### 3. Start Infrastructure
```bash
docker compose up -d
```

### 4. Run Migrations
```bash
docker compose --profile migrate up
```

### 5. Start Services
```bash
# Start individual services
cd services/claims-service
npm run dev

# Or use docker compose
docker compose up
```

## 🏗️ Project Structure

```
insurance/
├── services/
│   ├── web-ui/              # Next.js frontend
│   ├── claims-service/      # Claims microservice
│   ├── payments-service/    # Payments microservice
│   └── [other services]
├── k8s/                     # Kubernetes manifests
├── scripts/                 # Utility scripts
└── docs/                    # Documentation
```

## 📝 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow existing code conventions
- Use meaningful variable and function names
- Add comments for complex logic

### Commit Messages
Follow conventional commits:
- `feat: add new feature`
- `fix: fix bug`
- `docs: update documentation`
- `refactor: refactor code`
- `test: add tests`

### Pull Request Process
1. Create a feature branch from `develop`
2. Make your changes
3. Run tests
4. Update documentation
5. Submit a pull request with a clear description

## 🧪 Testing

### Run Tests
```bash
cd services/web-ui
npm test
```

### Integration Tests
```bash
# Run integration tests
docker compose --profile test up
```

## 🔒 Security

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Follow security best practices (see SECURITY.md)
- Report security vulnerabilities privately

## 📚 Documentation

- Update README.md for user-facing changes
- Update ROADMAP.md for new features
- Update UAT.md for test scenarios
- Add inline comments for complex code

## 🤝 Code of Conduct

Be respectful and constructive in all interactions.

## 📧 Contact

For questions, contact the development team.

---

Thank you for contributing! 🎉
