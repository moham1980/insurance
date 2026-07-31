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

COPY services/web-ui/package.json ./services/web-ui/
WORKDIR /app/services/web-ui

RUN for i in 1 2 3; do NODE_TLS_REJECT_UNAUTHORIZED=0 bun install --network-concurrency=8 --no-frozen-lockfile && break || sleep 10; done

COPY services/web-ui ./

RUN bun run build

FROM oven/bun:1.3.9-slim

WORKDIR /app/services/web-ui

COPY --from=builder /app/services/web-ui/package.json ./
COPY --from=builder /app/services/web-ui/next.config.mjs ./
COPY --from=builder /app/services/web-ui/.next ./.next
COPY --from=builder /app/services/web-ui/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3026

EXPOSE 3026

CMD ["bun", "x", "next", "start", "-p", "3026"]
