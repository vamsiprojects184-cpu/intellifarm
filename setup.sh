#!/bin/bash
# ============================================================
#  IntelliFarm — One-command setup & run
#  Usage:  bash setup.sh
# ============================================================

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌾  IntelliFarm — Setup & Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check for required tools
command -v node >/dev/null 2>&1 || { echo "❌  Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v bun  >/dev/null 2>&1 || { echo "⬇️   Installing Bun..."; curl -fsSL https://bun.sh/install | bash; source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || true; }
command -v java >/dev/null 2>&1 || { echo "❌  Java 17+ is required. Install from https://adoptium.net"; exit 1; }

echo "✅  Node  : $(node -v)"
echo "✅  Bun   : $(bun -v)"
echo "✅  Java  : $(java -version 2>&1 | head -1)"
echo ""

# 2. Copy .env if missing
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "⚠️   Created .env from .env.example — please fill in DATABASE_URL and other secrets."
  else
    echo "⚠️   No .env file found. Create one with DATABASE_URL set before running."
  fi
fi

# 3. Install JS dependencies
echo "📦  Installing Node dependencies..."
bun install

# 4. Generate Prisma client + push DB schema
echo "🗄️   Setting up database..."
bunx prisma generate
bunx prisma db push --accept-data-loss

# 5. Seed demo data (optional — safe to re-run)
echo "🌱  Seeding demo data..."
bun run src/lib/seed.ts 2>/dev/null || echo "    (seed skipped or already done)"

# 6. Start Next.js dev server (port 3000) + Spring Boot (port 8080) in parallel
echo ""
echo "🚀  Starting servers..."
echo "    → Next.js  : http://localhost:3000"
echo "    → Spring Boot: http://localhost:8080"
echo ""

# Run both concurrently
if command -v npx >/dev/null 2>&1; then
  npx concurrently \
    --names "NEXT,SPRING" \
    --prefix-colors "blue,green" \
    "bun run dev" \
    "./mvnw spring-boot:run"
else
  bun run dev &
  ./mvnw spring-boot:run &
  wait
fi
