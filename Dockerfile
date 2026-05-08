# Stage 1: Build the Vite frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files and install all deps (tsx is a devDep but needed to run server.ts)
COPY package*.json ./
RUN npm ci

# Copy built frontend from stage 1
COPY --from=builder /app/dist ./dist

# Copy server source (tsx compiles it at startup — no separate compile step needed)
COPY server.ts ./
COPY tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
