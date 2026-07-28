# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_APP_NAME=FitLog
ARG VITE_DEFAULT_REST_SECONDS=90
ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_DEFAULT_REST_SECONDS=$VITE_DEFAULT_REST_SECONDS

RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
