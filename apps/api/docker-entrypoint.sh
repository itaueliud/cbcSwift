#!/bin/sh
set -e

echo ">>> Applying database schema (prisma db push)..."
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma migrate deploy

echo ">>> Running seed (idempotent)..."
if [ -f ./dist/prisma/seed.js ]; then
  node dist/prisma/seed.js || echo "Seed warning (may already be seeded or partial error)"
else
  npx tsx prisma/seed.ts || echo "Seed warning (may already be seeded or partial error)"
fi

echo ">>> Starting CBCNexus API on port ${PORT:-4000}..."
exec "$@"
