FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
RUN npm run build --workspace=@eventora/shared

EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=@eventora/web", "--", "--hostname", "0.0.0.0"]
