# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
RUN npm install -g pnpm@10.9.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY demo-app/ ./demo-app/
RUN pnpm install --frozen-lockfile
RUN cd demo-app && npx vite build

FROM node:20-alpine AS runner
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/demo-app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "serve dist -s -l ${PORT:-3000}"]
