# syntax=docker/dockerfile:1.7
# Build from the repository root:  docker build -f backend/Dockerfile -t brainspace-api .

FROM node:22-bookworm-slim AS build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
# Python 3 (standard library only) runs the private AI worker; tini forwards signals for graceful shutdown.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=8000 \
    RAG_PYTHON=python3 \
    RAG_WORKER_DIR=/app/rag
WORKDIR /app/backend
COPY --from=build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --chown=node:node backend/package.json ./
COPY --chown=node:node rag/brainspace_rag /app/rag/brainspace_rag
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 8000) + '/api/v1/health/live').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]
