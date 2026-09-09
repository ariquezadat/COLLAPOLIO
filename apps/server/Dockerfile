# Servidor de sockets de CollaPolio — pensado para Railway o Fly.io
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# El servidor importa el motor desde el workspace, así que se copia el monorepo
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/server/package.json apps/server/
RUN npm ci --omit=dev --workspace=@collapolio/server --include-workspace-root

COPY packages/engine packages/engine
COPY apps/server apps/server

EXPOSE 4000
ENV PORT=4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["npm", "run", "start", "--workspace=@collapolio/server"]
