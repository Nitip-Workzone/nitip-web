# Multi-stage: build di container, output untuk di-extract
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN yarn install --frozen-lockfile

COPY . .

ENV NUXT_DEVTOOLS=false

RUN yarn generate