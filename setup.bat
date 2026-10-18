@echo off
REM ============================================================
REM  IntelliFarm — One-command setup & run (Windows)
REM  Usage:  setup.bat
REM ============================================================

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   IntelliFarm -- Setup ^& Start
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM 1. Check tools
where node >nul 2>&1 || (echo ERROR: Node.js not found. Install from https://nodejs.org && exit /b 1)
where bun  >nul 2>&1 || (echo ERROR: Bun not found. Install from https://bun.sh && exit /b 1)
where java >nul 2>&1 || (echo ERROR: Java 17+ not found. Install from https://adoptium.net && exit /b 1)

echo [OK] Node: && node -v
echo [OK] Bun:  && bun -v

REM 2. Copy .env if missing
if not exist ".env" (
  if exist ".env.example" (
    copy .env.example .env
    echo [WARN] Created .env from .env.example -- please fill in DATABASE_URL.
  ) else (
    echo [WARN] No .env file found. Create one with DATABASE_URL before running.
  )
)

REM 3. Install dependencies
echo.
echo [1/4] Installing dependencies...
call bun install

REM 4. Setup database
echo [2/4] Generating Prisma client...
call bunx prisma generate

echo [3/4] Pushing DB schema...
call bunx prisma db push --accept-data-loss

REM 5. Seed data
echo [4/4] Seeding demo data...
call bun run src/lib/seed.ts 2>nul || echo (seed skipped)

REM 6. Start both servers in separate windows
echo.
echo Starting Next.js on http://localhost:3000 ...
start "IntelliFarm - Next.js" cmd /k "bun run dev"

echo Starting Spring Boot on http://localhost:8080 ...
start "IntelliFarm - Spring Boot" cmd /k "mvnw.cmd spring-boot:run"

echo.
echo Both servers are starting in separate windows!
echo   Next.js   -^> http://localhost:3000
echo   Spring Boot -^> http://localhost:8080
echo.
pause
