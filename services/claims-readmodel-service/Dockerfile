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

COPY bun.lock ./

COPY packages/shared ./packages/shared
COPY services/claims-readmodel-service ./services/claims-readmodel-service

RUN printf '{\n  "name": "insurance-ai-platform-pruned",\n  "private": true,\n  "workspaces": [\n    "packages/shared",\n    "services/claims-readmodel-service"\n  ]\n}\n' > package.json

RUN for i in 1 2 3; do NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --network-concurrency=8 && break || sleep 10; done

RUN cd packages/shared && bun run build

WORKDIR /app/services/claims-readmodel-service
RUN bun run build

WORKDIR /app

FROM oven/bun:1.3.9-slim

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

COPY --from=builder /app/services/claims-readmodel-service/dist ./services/claims-readmodel-service/dist
COPY --from=builder /app/services/claims-readmodel-service/package.json ./services/claims-readmodel-service/

# Install only production dependencies (much faster than copying full node_modules)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN for i in 1 2 3; do NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --production --network-concurrency=8 && break || sleep 10; done

WORKDIR /app/services/claims-readmodel-service

ENV NODE_ENV=production

EXPOSE 3019

CMD ["bun", "run", "dist/main.js"]
