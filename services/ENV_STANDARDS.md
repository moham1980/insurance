# Environment Variables Standards

This document defines the standard environment variables that should be used across all services in the insurance platform.

## Standard Variable Naming Convention

All environment variables should follow these conventions:
- Use uppercase with underscores (e.g., `DB_HOST`, `KAFKA_BROKERS`)
- Use descriptive names that clearly indicate their purpose
- Group related variables with a common prefix (e.g., `DB_*`, `KAFKA_*`)

## Required Variables

All services must support the following standard variables:

### Database Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | Database host | `localhost` | Yes |
| `DB_PORT` | Database port | `5432` | Yes |
| `DB_USERNAME` | Database username | `postgres` | Yes |
| `DB_PASSWORD` | Database password | `postgres` | Yes |
| `DB_DATABASE` | Database name | `insurance_platform` | Yes |
| `DB_SCHEMA` | Database schema | `public` | Yes |
| `DB_SYNC` | Enable schema sync (production: false) | `false` | Yes |

### Service Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Service port | `3000` | Yes |
| `NODE_ENV` | Node environment | `production` | Yes |
| `SERVICE_NAME` | Service name for logging | - | Yes |

### Kafka Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KAFKA_BROKERS` | Kafka broker addresses | `kafka:9092` | Yes |
| `KAFKA_CONSUMER_GROUP` | Kafka consumer group | `${SERVICE_NAME}-group` | Yes |

### JWT Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT secret key | - | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | `1h` | No |

### Tenant Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DEFAULT_TENANT_ID` | Default tenant ID | `default` | Yes |

### Observability
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JAEGER_HOST` | Jaeger host | `jaeger` | No |
| `JAEGER_PORT` | Jaeger port | `6831` | No |

## Service-Specific Variables

Each service may have additional variables specific to its functionality. These should be prefixed with the service name or domain:

- `AUTH_SERVICE_URL` - URL to auth service
- `POLICY_SERVICE_URL` - URL to policy service
- `CLAIMS_SERVICE_URL` - URL to claims service
- etc.

## Implementation Guidelines

1. **Use `.env.template`**: Copy `services/.env.template` to your service directory and customize as needed.

2. **Provide defaults**: All services should provide sensible defaults for non-critical variables.

3. **Document custom variables**: Any service-specific variables must be documented in the service's README.

4. **Validation**: Services should validate required environment variables on startup and fail fast with clear error messages if missing.

5. **Security**: Never commit actual `.env` files with secrets. Use `.env.template` for documentation and secrets management tools for production.

## Migration Guide

When standardizing environment variables in an existing service:

1. Add support for new standard variables alongside existing ones
2. Update service code to use standard variables
3. Update Docker Compose configuration
4. Update documentation
5. Deprecate old variable names with a deprecation warning
6. Remove old variables in a future major version

## Example Usage

```typescript
// In your service's main.ts or config file
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'insurance_platform',
    schema: process.env.DB_SCHEMA || 'public',
    synchronize: process.env.DB_SYNC === 'true',
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092'],
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP || `${process.env.SERVICE_NAME}-group`,
  },
  // ... other config
};
```
