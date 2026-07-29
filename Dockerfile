# Full monorepo image: CLI scripts + Next web (G9)
# Prefer this over Vercel serverless for pipeline + filesystem jobs.
FROM node:22-bookworm-slim

WORKDIR /app

# Install root scripts + web deps
COPY package.json ./
COPY scripts ./scripts
COPY schemas ./schemas
COPY fixtures ./fixtures
COPY docs ./docs

COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci

COPY web ./web

ENV NODE_ENV=production
ENV KLING_MODE=mock
# Railway/Fly inject PORT; bind all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app/web
RUN npm run build

EXPOSE 3000
# -H 0.0.0.0 required on Railway/Docker; PORT from platform
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
