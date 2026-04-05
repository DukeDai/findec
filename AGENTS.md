# AGENTS.md - FinDec 美股量化分析平台

This document provides guidance for AI coding agents working in this repository.

## Project Overview

FinDec is a US stock quantitative analysis platform built with Next.js 16, TypeScript, and Prisma. It provides K-line charts, technical indicators, factor screening, backtesting, real-time monitoring, and portfolio analysis.

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
- **Charts**: Lightweight Charts v5, Recharts
- **Technical Analysis**: technicalindicators library
- **Real-time**: Socket.io for WebSocket (port 3001)
- **Email**: Nodemailer (SMTP)

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── alerts/               # Price alerts + browser notification bridge
│   │   ├── backtests/            # Backtesting (single + portfolio)
│   │   ├── data-manager/         # Batch data download
│   │   ├── factors/              # Factor screening + effectiveness + correlation
│   │   ├── fundamentals/         # Fundamental data
│   │   ├── history/              # Historical K-line data
│   │   ├── indicators/           # Technical indicators
│   │   ├── portfolio/            # Single portfolio risk
│   │   ├── portfolios/           # Portfolio CRUD + health + positions
│   │   ├── quotes/              # Real-time quotes
│   │   ├── search/              # Stock search + name cache
│   │   ├── strategies/          # Custom strategy editor
│   │   ├── user-config/         # User preferences (email, notification settings)
│   │   └── ws/                   # WebSocket route
│   ├── analysis/                 # Quantitative analysis (tabbed: screener/backtest/alerts/portfolio)
│   ├── dashboard/               # Customizable dashboard with widgets
│   ├── data-manager/            # Batch data download UI
│   ├── education/                # Learning content (6 interactive education pages)
│   ├── fundamentals/[symbol]/   # Fundamental data page
│   ├── settings/data-management/ # Import/export JSON backup
│   ├── strategy-editor/         # Custom strategy JSON editor
│   └── page.tsx                 # Landing/Dashboard
├── components/
│   ├── analysis/                 # Analysis UI components
│   ├── chart/                   # Chart components (Lightweight Charts)
│   ├── dashboard/               # Dashboard + widget components
│   ├── factors/                 # Factor visualization components
│   ├── fundamentals/            # Fundamental data display
│   ├── interactive/             # Parameter controls (Phase 5)
│   ├── layout/                 # Layout components (Navigation, Breadcrumb)
│   ├── learning/               # Vocabulary tooltip + search
│   ├── strategy-editor/         # Strategy JSON editor
│   └── ui/                     # shadcn/ui base components
└── lib/
    ├── backtest/               # Backtest engine
    │   ├── cost-model.ts        # Trading cost model (commission/slippage/stamp duty)
    │   ├── engine.ts            # Portfolio backtest engine
    │   ├── grid-search.ts       # Grid search optimization
    │   ├── monte-carlo.ts       # Monte Carlo simulation
    │   ├── position-manager.ts  # Position management
    │   ├── risk-metrics.ts      # Risk metrics calculator
    │   └── walk-forward.ts      # Walk-Forward analysis
    ├── data/                    # Data layer
    │   ├── cache-manager.ts     # SQLite-backed cache
    │   ├── data-source.ts       # DataSource abstraction
    │   ├── data-source-config.ts # Data source configuration
    │   ├── data-source-registry.ts # Multi-source registry + circuit breaker
    │   ├── fundamental-data.ts  # Fundamental data fetcher
    │   ├── rate-limiter.ts      # API rate limiter
    │   └── sources/             # Source implementations
    │       ├── finnhub-source.ts
    │       ├── polygon-source.ts
    │       └── yahoo-finance-source.ts
    ├── export/                  # Export utilities
    │   ├── backup.ts            # JSON import/export
    │   └── exportUtils.ts       # CSV + HTML print export
    ├── factors/                 # Factor system
    │   ├── factor-correlation.ts # Factor correlation matrix
    │   ├── factor-library.ts    # Factor definitions
    │   ├── factor-metrics.ts    # Factor effectiveness (IC/IR)
    │   ├── fundamental-factors.ts # Fundamental factors (PE, ROE, etc.)
    │   ├── screening-engine.ts  # Screening execution engine
    │   └── strategy-templates.ts # Preset strategy templates
    ├── hooks/                   # React hooks
    │   ├── useBrowserNotifications.ts
    │   └── useWebSocket.ts
    ├── indicators/              # Indicator system
    │   ├── calculator.ts        # Extended indicator calculator
    │   └── signal-decorator.ts  # Signal annotation
    ├── learning/                # Learning system
    │   └── vocabulary.ts        # 33 quantitative trading terms (Chinese)
    ├── portfolio/               # Portfolio modules
    │   ├── allocation.ts        # Allocation optimizer
    │   ├── health-score.ts      # Portfolio health score (5-dimension)
    │   └── risk-monitor.ts      # Risk monitoring
    ├── realtime/                 # Real-time modules
    │   ├── alert-engine.ts      # Alert engine
    │   └── email-notifier.ts    # SMTP email notifier
    ├── prisma.ts               # Prisma client singleton
    ├── alert-monitor.ts        # Alert monitoring loop
    ├── indicators.ts           # Indicator registry
    ├── portfolio-metrics.ts     # Portfolio metrics calculator
    ├── utils.ts                # Utility functions (cn)
    ├── yahoo-finance.ts        # Yahoo Finance API wrapper
    └── websocket-server.ts      # WebSocket server

prisma/
└── schema.prisma               # Database schema
```

## Code Style Guidelines

### Imports (order matters)

```typescript
// 1. React/Next.js imports
import { useState, useEffect } from 'react'
import { NextRequest, NextResponse } from 'next/server'

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

### Multi-Source Registry (Phase 1)

```typescript
import { DataSourceRegistry } from '@/lib/data/data-source-registry'

const registry = new DataSourceRegistry()
registry.register('yahoo', new YahooFinanceSource())
registry.register('finnhub', new FinnhubSource())
// Auto-failover with circuit breaker
const data = await registry.getHistoricalData('AAPL', '1y')
```

### Risk Metrics

```typescript
import { RiskMetricsCalculator } from '@/lib/backtest/risk-metrics'

const calculator = new RiskMetricsCalculator()
const metrics = calculator.calculate(equityCurve)
```

### Portfolio Health Score (Phase 4)

```typescript
import { calculateHealthScore } from '@/lib/portfolio/health-score'

const score = await calculateHealthScore(portfolioId)
// score.total (0-100), score.concentration, score.volatility,
// score.correlation, score.liquidity, score.riskAdjustedReturn
```

### Factor Screening

```typescript
import { FactorLibrary } from '@/lib/factors/factor-library'
import { ScreeningEngine } from '@/lib/factors/screening-engine'

const library = new FactorLibrary()
const engine = new ScreeningEngine(library)
const results = await engine.screen(strategy, symbols)
```

### Factor Effectiveness Analysis (Phase 3)

```typescript
import { calculateFactorMetrics } from '@/lib/factors/factor-metrics'
// Returns IC, IC_IR, group returns, IC decay for each factor
```

### Browser Notifications (Phase 4)

```typescript
import { useBrowserNotifications } from '@/lib/hooks/useBrowserNotifications'

const { requestPermission, sendNotification } = useBrowserNotifications()
```

### WebSocket Alerts

```typescript
import { io } from 'socket.io-client'

const socket = io('ws://localhost:3001')
socket.on('alert-triggered', (alert) => {
  console.log('Alert triggered:', alert)
})
```

### Export (Phase 5)

```typescript
import { exportToCSV, exportToPrintableHTML } from '@/lib/export/exportUtils'

const csv = exportToCSV(trades)
const html = exportToPrintableHTML(backtestResult)
```

## Database Models (Prisma)

Core models: `Stock`, `HistoricalData`, `UserConfig`, `DataSourceMeta`
Factor models: `FactorStrategy`, `FactorRule`, `FactorHistory`, `ScreeningResult`
Backtest models: `BacktestPlan`, `BacktestTrade`, `PortfolioBacktestPlan`
Alert models: `Alert`, `RiskAlertLog`
Portfolio models: `Portfolio`, `Position`, `Transaction`

## Important Notes

1. **Learning Mode**: Navigation has a learning mode toggle for educational content
2. **Mock Fallback**: Data layer falls back to mock data when all external sources fail
3. **Preset Strategies**: Factor screener and backtest runners have preset strategies for quick testing
4. **WebSocket**: Alert system uses Socket.io on port 3001
5. **Database**: SQLite file at `prisma/dev.db` (gitignored)
6. **Chinese Search**: `StockNameCache` enables Chinese name fuzzy matching for stock search
7. **Widget Dashboard**: Dashboard widgets are registered in `WidgetRegistry` and persisted to localStorage
8. **Vocabulary**: 35 quantitative trading terms with Chinese definitions in `vocabulary.ts`

## Education System

Interactive learning pages under `/education/` with `学习模式` badge and interactive Recharts demos:

| Page | Topic | Demos |
|------|-------|-------|
| `vocabulary/page.tsx` | 词汇百科 | Search, category filter, term cards |
| `backtest-pitfalls/page.tsx` | 回测陷阱 | Overfitting, Look-Ahead Bias, Survivorship Bias |
| `factor-investing/page.tsx` | 因子投资 | Returns, IC Analysis, Correlation, Portfolio, Fama-French |
| `backtest-advanced/page.tsx` | 回测深度 | Cost Model, Slippage, Monte Carlo, Rebalance, Significance |
| `risk-management/page.tsx` | 仓位管理 | Kelly Formula, Risk Parity, Drawdown, VaR/ESG |
| `data-quality/page.tsx` | 数据质量 | Dividend Adjust, Splits, Survivorship Bias, Quality Check |
| `strategy-development/page.tsx` | 策略开发 | Signal Construction, Denoising, Event-Driven, Failure Modes |
| `market-microstructure/page.tsx` | 市场微观 | Order Types, Liquidity, Market Impact, HF vs LF |
