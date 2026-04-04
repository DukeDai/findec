# AGENTS.md - Findec 美股量化分析平台

This document provides guidance for AI coding agents working in this repository.

## Project Overview

Findec is a US stock quantitative analysis platform built with Next.js 16, TypeScript, and Prisma. It provides K-line charts, technical indicators, factor screening, backtesting, real-time monitoring, and portfolio analysis.

## Build/Lint/Test Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000

# Build
npm run build            # Production build (includes TypeScript type checking)

# Lint
npm run lint             # Run ESLint

# Database
npx prisma db push       # Push schema changes to database
npx prisma generate      # Generate Prisma client

# Type checking (part of build)
npx tsc --noEmit         # Run TypeScript type checking only
```

**Note**: No test framework is currently configured. Tests should be added in the future.

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (strict mode enabled)
- **Database**: Prisma + SQLite (libsql)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Charts**: Lightweight Charts v5
- **Technical Analysis**: technicalindicators library
- **Real-time**: Socket.io for WebSocket

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (route.ts files)
│   │   ├── quotes/        # Real-time quotes
│   │   ├── history/       # Historical data
│   │   ├── indicators/    # Technical indicators
│   │   ├── factors/       # Factor screening
│   │   ├── backtests/     # Backtesting engine
│   │   ├── alerts/        # Price alerts
│   │   └── portfolios/    # Portfolio management
│   ├── analysis/          # Quantitative analysis page
│   ├── chart/[symbol]/    # Dynamic chart pages
│   └── dashboard/         # Dashboard page
├── components/
│   ├── chart/             # Chart components
│   ├── analysis/          # Analysis UI components
│   ├── dashboard/         # Dashboard components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── prisma.ts          # Prisma client singleton
│   ├── yahoo-finance.ts   # Yahoo Finance API
│   ├── indicators.ts      # Technical indicator calculations
│   ├── backtest-engine.ts # Backtesting engine
│   ├── portfolio-metrics.ts # Portfolio analysis
│   ├── alert-monitor.ts   # Alert monitoring
│   └── websocket-server.ts # WebSocket server
└── types/                 # TypeScript type definitions

prisma/
└── schema.prisma          # Database schema (12 models)
```

## Code Style Guidelines

### Imports

```typescript
// 1. External packages (alphabetical)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 2. Internal modules (use @/* path alias)
import { calculateIndicators } from '@/lib/indicators'
import { Button } from '@/components/ui/button'
```

### TypeScript

- **Strict mode**: Enabled. All code must pass strict type checking.
- **Path alias**: Use `@/*` for `./src/*` (e.g., `@/lib/prisma`, `@/components/ui/button`)
- **Type definitions**: Define interfaces at the top of files or in `src/types/`
- **Avoid `any`**: Use proper types or `unknown` with type guards

```typescript
// Good
interface ChartContainerProps {
  symbol: string
}

export function ChartContainer({ symbol }: ChartContainerProps) { ... }

// Avoid
export function ChartContainer(props: any) { ... }
```

### React Components

- **Server Components**: Default for all components in `app/` directory
- **Client Components**: Add `"use client"` directive at the top when using hooks

```typescript
// Server Component (default)
export default function Page() {
  return <div>...</div>
}

// Client Component
"use client"
import { useState } from 'react'

export function InteractiveComponent() {
  const [state, setState] = useState(null)
  return <div>...</div>
}
```

### API Routes

All API routes follow this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    // Business logic here
    const data = await prisma.stock.findUnique({ where: { symbol } })

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Create/update logic
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    )
  }
}
```

### Error Handling

- Always wrap API route logic in try-catch
- Return appropriate HTTP status codes (400, 404, 500)
- Log errors with `console.error()`
- Provide meaningful error messages in Chinese for user-facing errors

### Database (Prisma)

```typescript
// Singleton pattern for Prisma client
import { prisma } from '@/lib/prisma'

// CRUD operations
const stock = await prisma.stock.findUnique({ where: { symbol } })
const stocks = await prisma.stock.findMany()
const newStock = await prisma.stock.create({ data: { symbol, name } })
const updated = await prisma.stock.update({ where: { symbol }, data: { name } })
await prisma.stock.delete({ where: { symbol } })
```

### Styling

- Use Tailwind CSS utility classes
- Use `cn()` utility for conditional class merging

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'px-4 py-2 rounded-md',
  isActive && 'bg-primary text-white'
)}>
```

### Naming Conventions

- **Files**: kebab-case (e.g., `backtest-engine.ts`, `chart-container.tsx`)
- **Components**: PascalCase (e.g., `ChartContainer`, `BacktestRunner`)
- **Functions**: camelCase (e.g., `calculateIndicators`, `executeBacktest`)
- **Constants**: SCREAMING_SNAKE_CASE for global constants (e.g., `INDICATOR_COLORS`)
- **Database models**: PascalCase (e.g., `FactorStrategy`, `BacktestPlan`)

### Comments

- **Avoid unnecessary comments**: Code should be self-documenting
- **Use comments only when necessary**: Complex algorithms, security-related code, performance optimizations
- **No Chinese comments in code**: Keep code comments in English

## Key Patterns

### Prisma Client Singleton

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### API Response Format

```typescript
// Success
return NextResponse.json({ data })

// Error
return NextResponse.json({ error: 'Error message' }, { status: 400 })
```

### Mock Data Fallback

When external APIs fail, return mock data:

```typescript
const mockData = { symbol: 'AAPL', price: 150.0 + Math.random() * 50 }
return NextResponse.json(mockData)
```

## Database Schema

12 Prisma models:
- `Stock`, `HistoricalData`, `UserConfig` - Core stock data
- `FactorStrategy`, `FactorRule`, `ScreeningResult` - Factor screening
- `BacktestPlan`, `BacktestTrade` - Backtesting
- `Alert` - Price alerts
- `Portfolio`, `Position`, `Transaction` - Portfolio management

## Important Notes

1. **No tests yet**: Test framework should be added in the future
2. **Chinese UI**: User-facing text should be in Chinese
3. **Mock data**: Yahoo Finance API has mock fallback for development
4. **WebSocket**: Real-time features use Socket.io on port 3001
5. **Database**: SQLite file is at `prisma/dev.db` (gitignored)