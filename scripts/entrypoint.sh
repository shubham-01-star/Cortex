#!/bin/sh
set -e

echo "🚀 Starting Cortex Entrypoint..."

# Run migrations
if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo "📦 Running database migrations..."
  npx prisma migrate deploy
else
  echo "⏭️ Skipping migrations..."
fi

# Run custom setup if needed (optional)
# npm run db:setup

echo "⚡ Starting application server..."
exec node server.js
