FROM oven/bun:1.3.9-slim AS builder

WORKDIR /app

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}
ENV PATH=/app/node_modules/.bin:$PATH

COPY package.json bun.lock ./
COPY packages ./packages
COPY services ./services

RUN for i in 1 2 3; do bun install --network-concurrency=8 && break || sleep 10; done

RUN cd packages/shared && bun run build

WORKDIR /app/services/submission-placement-service
RUN bun run build

FROM oven/bun:1.3.9-slim

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/services/submission-placement-service/dist ./services/submission-placement-service/dist
COPY --from=builder /app/services/submission-placement-service/package.json ./services/submission-placement-service/

RUN for i in 1 2 3; do bun install --production --network-concurrency=8 && break || sleep 10; done

WORKDIR /app/services/submission-placement-service

ENV NODE_ENV=production

EXPOSE 3025

CMD ["bun", "run", "dist/main.js"]
