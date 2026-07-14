# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN yarn install

COPY . .

ENV NUXT_DEVTOOLS=false

RUN yarn build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder /app ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NUXT_DEVTOOLS=false

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", ".output/server/index.mjs"]