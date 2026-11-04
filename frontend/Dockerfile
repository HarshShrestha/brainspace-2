# syntax=docker/dockerfile:1.7
# Build from the repository root:  docker build -f frontend/Dockerfile -t brainspace-web .

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Public, build-time only. Keep the same-origin default unless the API lives elsewhere.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Unprivileged NGINX (listens on 8080, runs as a non-root user).
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime
ENV API_UPSTREAM=http://api:8000
COPY frontend/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY frontend/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
