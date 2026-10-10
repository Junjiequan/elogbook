# syntax=docker/dockerfile:1
# Build from the repository root (the workspaces share one lockfile):
#   docker build -f backend/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY packages/permissions/package.json packages/permissions/
# The lockfile covers every workspace, so npm needs each package.json, even if it installs only one.
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root=false --ignore-scripts
COPY packages/permissions/tsconfig.json packages/permissions/tsconfig.build.json packages/permissions/
COPY packages/permissions/src packages/permissions/src
RUN npm run build --workspace @elogbook/permissions
COPY backend/tsconfig.json backend/tsconfig.build.json backend/nest-cli.json backend/
COPY backend/src backend/src
RUN npm run build --workspace backend

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY packages/permissions/package.json packages/permissions/
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev --ignore-scripts

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=dependencies --chown=node:node /app/node_modules /app/node_modules
# node_modules/@elogbook/permissions links to the workspace package, so the package must be there too.
COPY --from=build --chown=node:node /app/packages/permissions/dist /app/packages/permissions/dist
COPY --chown=node:node packages/permissions/package.json /app/packages/permissions/
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --chown=node:node backend/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
