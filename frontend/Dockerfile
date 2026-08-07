FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Install the exact pinned versions (next@14.2.5) so the runtime server
# matches the toolchain that built .next. Using `npx` here is unsafe because
# it downloads the latest Next at runtime, which mismatches the build.
RUN npm ci --omit=dev --no-audit --no-fund

EXPOSE 3000

# `npm start` runs the package.json "start" script (`next start`) with
# node_modules/.bin on PATH, so the locally-installed next@14.2.5 (which built
# .next) is used at runtime instead of npx fetching an incompatible version.
CMD ["npm", "start"]
