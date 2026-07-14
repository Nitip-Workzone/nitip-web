# Stage 1: Build static files
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN yarn install

COPY . .

ARG NUXT_PUBLIC_NITIP_API_KEY
ARG NUXT_PUBLIC_NITIP_API_SECRET
ENV NUXT_PUBLIC_NITIP_API_KEY=${NUXT_PUBLIC_NITIP_API_KEY}
ENV NUXT_PUBLIC_NITIP_API_SECRET=${NUXT_PUBLIC_NITIP_API_SECRET}
ENV NUXT_DEVTOOLS=false

RUN yarn generate

# Stage 2: Serve with nginx
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-container.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/.output/public /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]