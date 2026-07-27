FROM oven/bun:1.3.9-slim AS builder

WORKDIR /app

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG ALL_PROXY
ARG all_proxy

ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}
ENV http_proxy=${http_proxy}
ENV https_proxy=${https_proxy}
ENV no_proxy=${no_proxy}
ENV ALL_PROXY=${ALL_PROXY}
ENV all_proxy=${all_proxy}

ENV PATH=/app/node_modules/.bin:$PATH

# Copy package.json files first for better caching
COPY package.json bun.lock ./
COPY packages ./packages
COPY services ./services

# Install dependencies
RUN for i in 1 2 3; do NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --network-concurrency=8 && break || sleep 10; done

# Copy source code
COPY packages/shared ./packages/shared
COPY services/auth-service ./services/auth-service

# Build shared package
RUN cd packages/shared && bun run build

# Build service and run migrations
WORKDIR /app/services/auth-service
RUN bun run build

# Production stage
FROM oven/bun:1.3.9-slim

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/package.json ./services/auth-service/

# Install only production dependencies (much faster than copying full node_modules)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN for i in 1 2 3; do NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --production --network-concurrency=8 && break || sleep 10; done

WORKDIR /app/services/auth-service

ENV NODE_ENV=production

EXPOSE 3007

CMD ["bun", "run", "dist/main.js"]
