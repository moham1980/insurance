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
COPY packages ./packages
COPY services ./services

RUN npm install --legacy-peer-deps

COPY packages/shared ./packages/shared
COPY services/reporting-service ./services/reporting-service

RUN cd packages/shared && npx tsc

WORKDIR /app/services/reporting-service
RUN npx tsc

FROM node:18-slim

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/services/reporting-service/dist ./services/reporting-service/dist
COPY --from=builder /app/services/reporting-service/package.json ./services/reporting-service/

COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN npm install --production --legacy-peer-deps

WORKDIR /app/services/reporting-service

ENV NODE_ENV=production

EXPOSE 3014

CMD ["node", "dist/main.js"]
