# Build stage only — output extracted via docker cp for nginx
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN yarn install

COPY . .

# Build-time environment variables (CSR embeds these in client JS)
ARG NUXT_PUBLIC_NITIP_API_KEY
ARG NUXT_PUBLIC_NITIP_API_SECRET
ENV NUXT_PUBLIC_NITIP_API_KEY=${NUXT_PUBLIC_NITIP_API_KEY}
ENV NUXT_PUBLIC_NITIP_API_SECRET=${NUXT_PUBLIC_NITIP_API_SECRET}
ENV NUXT_DEVTOOLS=false

RUN yarn generate