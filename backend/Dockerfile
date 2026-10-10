# syntax=docker/dockerfile:1
# Build from the repository root (the workspaces share one lockfile):
#   docker build -f backend/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
# The lockfile covers every workspace, so npm needs each package.json, even if it installs only one.
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root=false --ignore-scripts
COPY backend/tsconfig.json backend/tsconfig.build.json backend/nest-cli.json backend/
COPY backend/src backend/src
RUN npm run build --workspace backend

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev --ignore-scripts

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=dependencies --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --chown=node:node backend/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
