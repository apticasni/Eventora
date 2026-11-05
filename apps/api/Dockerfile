FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
RUN npm run build --workspace=@eventora/shared
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run db:generate --workspace=apps/api

EXPOSE 4000
CMD ["npm", "run", "dev", "--workspace=@eventora/api"]
