# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html ./
COPY public ./public
COPY src ./src
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./

ARG VITE_OIDC_ISSUER_URL
ARG VITE_OIDC_CLIENT_ID
RUN set -e; \
    if [ -n "${VITE_OIDC_ISSUER_URL}" ]; then export VITE_OIDC_ISSUER_URL="${VITE_OIDC_ISSUER_URL}"; fi; \
    if [ -n "${VITE_OIDC_CLIENT_ID}" ]; then export VITE_OIDC_CLIENT_ID="${VITE_OIDC_CLIENT_ID}"; fi; \
    npm run build

FROM nginx:1.27-alpine
COPY dockerfile/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN chown -R 1000:1000 /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
