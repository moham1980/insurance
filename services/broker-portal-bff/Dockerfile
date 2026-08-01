FROM node:18-slim AS builder
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

COPY package.json bun.lock ./
COPY services/broker-portal-bff/package.json ./services/broker-portal-bff/

RUN npm install --legacy-peer-deps

COPY services/broker-portal-bff ./services/broker-portal-bff

WORKDIR /app/services/broker-portal-bff
RUN npx tsc

FROM node:18-slim

WORKDIR /app

COPY --from=builder /app/services/broker-portal-bff/dist ./services/broker-portal-bff/dist
COPY --from=builder /app/services/broker-portal-bff/package.json ./services/broker-portal-bff/

COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN npm install --production --legacy-peer-deps

WORKDIR /app/services/broker-portal-bff

ENV NODE_ENV=production

EXPOSE 3030

CMD ["node", "dist/main.js"]
