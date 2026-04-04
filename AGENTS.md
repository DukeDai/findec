# AGENTS.md - Findec 美股量化分析平台

This document provides guidance for AI coding agents working in this repository.

## Project Overview

Findec is a US stock quantitative analysis platform built with Next.js 16, TypeScript, and Prisma. It provides K-line charts, technical indicators, factor screening, backtesting, real-time monitoring, and portfolio analysis.

**Learning Tool**: Platform designed for learning quantitative trading concepts with educational content.

## Build/Lint/Test Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000

# Build (includes TypeScript type checking)
npm run build

# Lint
npm run lint             # Run ESLint

# Database
npx prisma db push       # Push schema changes to database
npx prisma generate      # Generate Prisma client
npx prisma validate      # Validate schema

# Type checking only
npx tsc --noEmit
```

**Note**: No test framework is configured. Tests should be added when needed.

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (strict mode enabled)
- **Database**: Prisma + SQLite (libsql)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Charts**: Lightweight Charts v5
- **Technical Analysis**: technicalindicators library
- **Real-time**: Socket.io for WebSocket (port 3001)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (route.ts files)
│   │   ├── alerts/        # Price alerts
│   │   ├── backtests/    # Backtesting (single + portfolio)
│   │   ├── factors/       # Factor screening
│   │   ├── history/       # Historical data
│   │   ├── indicators/    # Technical indicators
│   │   ├── portfolios/    # Portfolio management
│   │   ├── quotes/       # Real-time quotes
│   │   └── search/       # Stock search
│   ├── analysis/         # Quantitative analysis page (tabbed interface)
│   └── dashboard/        # Portfolio overview page
├── components/
│   ├── analysis/         # Analysis UI components (FactorScreener, BacktestRunner, etc.)
│   ├── chart/            # Chart components (ChartContainer, IndicatorOverlay)
│   ├── dashboard/        # Dashboard components (QuickQuote, StockList, RiskPanel)
│   ├── layout/           # Layout components (Navigation, PageHeader)
│   └── ui/               # shadcn/ui components
└── lib/
    ├── backtest/         # Backtest engine modules
    │   ├── cost-model.ts      # Trading cost model
    │   ├── engine.ts         # Portfolio backtest engine
    │   ├── position-manager.ts # Position management
    │   └── risk-metrics.ts   # Risk metrics calculator
    ├── data/              # Data layer modules
    │   ├── cache-manager.ts  # Cache manager
    │   ├── data-source.ts    # DataSource abstraction
    │   └── rate-limiter.ts   # API rate limiter
    ├── factors/           # Factor system modules
    │   ├── factor-library.ts # Factor definitions
    │   ├── factor-metrics.ts # Factor effectiveness analysis
    │   └── screening-engine.ts # Screening execution
    ├── indicators/        # Indicator modules
    │   ├── calculator.ts      # Extended indicator calculator
    │   └── signal-decorator.ts # Signal annotation
    ├── portfolio/         # Portfolio modules
    │   ├── allocation.ts     # Allocation optimizer
    │   └── risk-monitor.ts   # Risk monitoring
    ├── realtime/           # Real-time modules
    │   └── alert-engine.ts   # Alert engine
    ├── prisma.ts          # Prisma client singleton
    ├── utils.ts           # Utility functions (cn)
    ├── yahoo-finance.ts   # Yahoo Finance API
    └── websocket-server.ts  # WebSocket server

prisma/
└── schema.prisma          # Database schema
```

## Code Style Guidelines

### Imports (order matters)

```typescript
// 1. React/Next.js imports
import { useState, useEffect } from 'react'
import NextRequest, { NextResponse } from 'next/server'

// 2. External packages (alphabetical)
import { Button } from '@/components/ui/button'
import { io } from 'socket.io-client'

// 3. Internal modules (use @/* path alias)
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'
```

### TypeScript

- **Strict mode**: Enabled. All code must pass TypeScript strict checking
- **Path alias**: Use `@/*` for `./src/*` (e.g., `@/lib/prisma`)
- **Avoid `any`**: Use proper types or `unknown` with type guards
- **Interface over type**: Prefer `interface` for object shapes

```typescript
// Good
interface BacktestResult {
  id: string
  totalReturn: number
  sharpeRatio: number
}

// Avoid
const result: any = fetchData()
```

### React Components

- **Server Components**: Default for pages in `app/` directory
- **Client Components**: Add `"use client"` directive at top when using hooks

```typescript
// Server Component (default)
export default function Page() {
  return <div>...</div>
}

// Client Component
"use client"
import { useState } from 'react'

export function InteractiveComponent() {
  const [value, setValue] = useState(0)
  return <div>...</div>
}
```

### API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const data = await prisma.model.findUnique({ where: { id } })
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await prisma.model.create({ data: body })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
```

### Error Handling

- Always wrap API route logic in try-catch
- Return appropriate HTTP status codes (400, 404, 500)
- Log errors with `console.error()`
- User-facing errors should be in Chinese

### Styling

- Use Tailwind CSS utility classes
- Use `cn()` utility for conditional class merging
- Use design tokens (CSS variables) for colors

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'px-4 py-2 rounded-md',
  isActive && 'bg-primary text-white'
)}>
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `backtest-engine.ts`, `chart-container.tsx` |
| Components | PascalCase | `BacktestRunner`, `FactorScreener` |
| Functions | camelCase | `calculateIndicators`, `executeBacktest` |
| Hooks | camelCase with 'use' prefix | `usePortfolio`, `useAlert` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_SYMBOLS`, `INDICATOR_COLORS` |
| Prisma models | PascalCase | `PortfolioBacktestPlan`, `FactorHistory` |
| Database fields | snake_case | `created_at`, `portfolio_id` |

### Comments

- **No unnecessary comments**: Code should be self-documenting
- **Complex logic**: Add brief comment explaining why (not what)
- **No Chinese comments in code**: Keep code comments in English
- **API documentation**: Use JSDoc for complex functions if needed

### Database (Prisma)

```typescript
// Singleton pattern
import { prisma } from '@/lib/prisma'

// After schema changes, run:
npx prisma db push
npx prisma generate
```

## UI/UX Guidelines

- **Chinese UI**: All user-facing text should be in Chinese
- **Responsive**: Use Tailwind responsive prefixes (sm:, md:, lg:)
- **Accessibility**: Use semantic HTML, proper ARIA labels
- **Loading states**: Always show loading indicators for async operations
- **Error states**: Display user-friendly error messages

## Key Patterns

### DataSource Abstraction

```typescript
import { DataSource } from '@/lib/data/data-source'

const dataSource = new DataSource()
const data = await dataSource.getHistoricalData('AAPL', '1y')
```

### Risk Metrics

```typescript
import { RiskMetricsCalculator } from '@/lib/backtest/risk-metrics'

const calculator = new RiskMetricsCalculator()
const metrics = calculator.calculate(equityCurve)
```

### Factor Screening

```typescript
import { FactorLibrary } from '@/lib/factors/factor-library'
import { ScreeningEngine } from '@/lib/factors/screening-engine'

const library = new FactorLibrary()
const engine = new ScreeningEngine(library)
const results = await engine.screen(strategy, symbols)
```

### WebSocket Alerts

```typescript
import { io } from 'socket.io-client'

const socket = io('ws://localhost:3001')
socket.on('alert-triggered', (alert) => {
  console.log('Alert triggered:', alert)
})
```

## Database Models (Prisma)

Core models: `Stock`, `HistoricalData`, `UserConfig`
Factor models: `FactorStrategy`, `FactorRule`, `FactorHistory`, `ScreeningResult`
Backtest models: `BacktestPlan`, `BacktestTrade`, `PortfolioBacktestPlan`
Alert models: `Alert`, `RiskAlertLog`
Portfolio models: `Portfolio`, `Position`, `Transaction`

## Important Notes

1. **Learning Mode**: Navigation has a learning mode toggle for educational content
2. **Mock Fallback**: Data layer falls back to mock data when Yahoo Finance fails
3. **Preset Strategies**: Factor screener and backtest runners have preset strategies for quick testing
4. **WebSocket**: Alert system uses Socket.io on port 3001
5. **Database**: SQLite file at `prisma/dev.db` (gitignored)
