# Findec 平台实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建美股量化分析平台，第一阶段实现K线图查看和技术指标叠加。

**Architecture:** Next.js 14 App Router 全栈应用，API Routes 处理数据获取，Prisma + SQLite 存储历史数据，Lightweight Charts 渲染K线图，技术指标实时计算。

**Tech Stack:** Next.js 14, TypeScript, Prisma, SQLite, Lightweight Charts, Yahoo Finance API, Tailwind CSS, shadcn/ui, technicalindicators

---

## Task 1: 初始化 Next.js 项目

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`

**Step 1: 创建 Next.js 项目**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: 项目骨架创建成功，出现 `src/app` 目录

**Step 2: 安装核心依赖**

```bash
npm install prisma @prisma/client lightweight-charts technicalindicators date-fns
npm install -D @types/node
```

Expected: 依赖安装成功

**Step 3: 安装 shadcn/ui**

```bash
npx shadcn@latest init -d
```

Expected: shadcn/ui 初始化成功，出现 `src/components/ui` 目录

**Step 4: 验证项目可运行**

```bash
npm run dev
```

Expected: 开发服务器启动在 http://localhost:3000

**Step 5: 提交**

```bash
git add .
git commit -m "chore: 初始化 Next.js 项目"
```

---

## Task 2: 配置 Prisma + SQLite

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

**Step 1: 初始化 Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

Expected: 生成 `prisma/schema.prisma` 和 `.env`

**Step 2: 定义数据模型**

编辑 `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Stock {
  symbol    String   @id
  name      String?
  exchange  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  history   HistoricalData[]
}

model HistoricalData {
  id          String   @id @default(uuid())
  stockSymbol String
  stock       Stock    @relation(fields: [stockSymbol], references: [symbol])
  date        DateTime
  open        Float
  high        Float
  low         Float
  close       Float
  volume      BigInt
  createdAt   DateTime @default(now())

  @@unique([stockSymbol, date])
}

model UserConfig {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

**Step 3: 创建 Prisma Client 单例**

创建 `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 4: 生成数据库和客户端**

```bash
npx prisma db push
npx prisma generate
```

Expected: 生成 `prisma/dev.db` 文件

**Step 5: 提交**

```bash
git add .
git commit -m "feat: 配置 Prisma + SQLite 数据模型"
```

---

## Task 3: 创建 Yahoo Finance API 服务

**Files:**
- Create: `src/lib/yahoo-finance.ts`
- Create: `src/types/stock.ts`

**Step 1: 定义类型**

创建 `src/types/stock.ts`:

```typescript
export interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: number
}

export interface HistoricalPrice {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface SearchResult {
  symbol: string
  name: string
  exchange: string
}
```

**Step 2: 创建 Yahoo Finance 服务**

创建 `src/lib/yahoo-finance.ts`:

```typescript
import { Quote, HistoricalPrice, SearchResult } from '@/types/stock'

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance'

export async function getQuote(symbol: string): Promise<Quote | null> {
  try {
    const response = await fetch(`${BASE_URL}/chart/${symbol}?interval=1d&range=1d`)
    const data = await response.json()
    
    if (!data.chart?.result?.[0]) return null
    
    const result = data.chart.result[0]
    const meta = result.meta
    const quote = result.indicators?.quote?.[0]
    
    if (!meta || !quote) return null
    
    const currentPrice = meta.regularMarketPrice
    const previousClose = meta.chartPreviousClose || meta.previousClose
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100
    
    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.symbol,
      price: currentPrice,
      change,
      changePercent,
      volume: quote.volume?.slice(-1)[0] || 0,
      timestamp: meta.regularMarketTime * 1000,
    }
  } catch (error) {
    console.error('Failed to fetch quote:', error)
    return null
  }
}

export async function getHistoricalData(
  symbol: string,
  range: string = '1y',
  interval: string = '1d'
): Promise<HistoricalPrice[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/chart/${symbol}?interval=${interval}&range=${range}`
    )
    const data = await response.json()
    
    if (!data.chart?.result?.[0]) return []
    
    const result = data.chart.result[0]
    const timestamps = result.timestamp || []
    const quote = result.indicators?.quote?.[0]
    
    if (!quote) return []
    
    return timestamps
      .map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000),
        open: quote.open?.[index] ?? 0,
        high: quote.high?.[index] ?? 0,
        low: quote.low?.[index] ?? 0,
        close: quote.close?.[index] ?? 0,
        volume: quote.volume?.[index] ?? 0,
      }))
      .filter((price: HistoricalPrice) => price.close > 0)
  } catch (error) {
    console.error('Failed to fetch historical data:', error)
    return []
  }
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`
    )
    const data = await response.json()
    
    return (data.quotes || [])
      .filter((quote: { quoteType?: string }) => quote.quoteType === 'EQUITY')
      .slice(0, 10)
      .map((quote: { symbol: string; shortname?: string; exchange: string }) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.symbol,
        exchange: quote.exchange,
      }))
  } catch (error) {
    console.error('Failed to search stocks:', error)
    return []
  }
}
```

**Step 3: 验证 API 可用**

```bash
npx tsx -e "
import { getQuote, getHistoricalData } from './src/lib/yahoo-finance'
async function test() {
  const quote = await getQuote('AAPL')
  console.log('Quote:', quote)
  const history = await getHistoricalData('AAPL', '5d')
  console.log('History length:', history.length)
}
test()
"
```

Expected: 输出 AAPL 的报价和历史数据

**Step 4: 提交**

```bash
git add .
git commit -m "feat: 添加 Yahoo Finance API 服务"
```

---

## Task 4: 创建 API Routes

**Files:**
- Create: `src/app/api/quotes/route.ts`
- Create: `src/app/api/history/route.ts`
- Create: `src/app/api/search/route.ts`

**Step 1: 创建报价 API**

创建 `src/app/api/quotes/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getQuote } from '@/lib/yahoo-finance'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }
  
  const quote = await getQuote(symbol.toUpperCase())
  
  if (!quote) {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
  }
  
  return NextResponse.json(quote)
}
```

**Step 2: 创建历史数据 API**

创建 `src/app/api/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  const range = request.nextUrl.searchParams.get('range') || '1y'
  const interval = request.nextUrl.searchParams.get('interval') || '1d'
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }
  
  const data = await getHistoricalData(symbol.toUpperCase(), range, interval)
  
  return NextResponse.json({ symbol: symbol.toUpperCase(), data })
}
```

**Step 3: 创建搜索 API**

创建 `src/app/api/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchStocks } from '@/lib/yahoo-finance'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  
  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }
  
  const results = await searchStocks(query)
  
  return NextResponse.json({ results })
}
```

**Step 4: 验证 API 可访问**

```bash
# 启动开发服务器后
curl "http://localhost:3000/api/quotes?symbol=AAPL"
curl "http://localhost:3000/api/history?symbol=AAPL&range=5d"
curl "http://localhost:3000/api/search?q=apple"
```

Expected: 返回 JSON 数据

**Step 5: 提交**

```bash
git add .
git commit -m "feat: 创建 API Routes (quotes, history, search)"
```

---

## Task 5: 创建技术指标计算服务

**Files:**
- Create: `src/lib/indicators.ts`

**Step 1: 创建指标计算函数**

创建 `src/lib/indicators.ts`:

```typescript
import { SMA, EMA, RSI, MACD } from 'technicalindicators'
import { HistoricalPrice } from '@/types/stock'

export interface IndicatorResult {
  ma?: { values: number[]; periods: number[] }
  ema?: { values: number[]; periods: number[] }
  rsi?: { values: number[]; periods: number[] }
  macd?: {
    macd: number[]
    signal: number[]
    histogram: number[]
    periods: number[]
  }
}

export function calculateIndicators(
  data: HistoricalPrice[],
  options: {
    ma?: number[]
    ema?: number[]
    rsi?: number
    macd?: { fast: number; slow: number; signal: number }
  } = {}
): IndicatorResult {
  const closes = data.map(d => d.close)
  const result: IndicatorResult = {}

  // MA 计算
  if (options.ma?.length) {
    result.ma = { values: [], periods: [] }
    for (const period of options.ma) {
      const maValues = SMA.calculate({ period, values: closes })
      result.ma.values.push(...maValues)
      result.ma.periods.push(period)
    }
  }

  // EMA 计算
  if (options.ema?.length) {
    result.ema = { values: [], periods: [] }
    for (const period of options.ema) {
      const emaValues = EMA.calculate({ period, values: closes })
      result.ema.values.push(...emaValues)
      result.ema.periods.push(period)
    }
  }

  // RSI 计算
  if (options.rsi) {
    const rsiValues = RSI.calculate({ period: options.rsi, values: closes })
    result.rsi = { values: rsiValues, periods: [options.rsi] }
  }

  // MACD 计算
  if (options.macd) {
    const macdResult = MACD.calculate({
      values: closes,
      fastPeriod: options.macd.fast,
      slowPeriod: options.macd.slow,
      signalPeriod: options.macd.signal,
    })
    
    result.macd = {
      macd: macdResult.map(m => m.MACD ?? 0),
      signal: macdResult.map(m => m.signal ?? 0),
      histogram: macdResult.map(m => m.histogram ?? 0),
      periods: [options.macd.fast, options.macd.slow, options.macd.signal],
    }
  }

  return result
}
```

**Step 2: 创建指标 API**

创建 `src/app/api/indicators/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { calculateIndicators } from '@/lib/indicators'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  const indicators = request.nextUrl.searchParams.get('indicators') || 'ma20,rsi'
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }
  
  const data = await getHistoricalData(symbol.toUpperCase(), '1y')
  
  if (data.length === 0) {
    return NextResponse.json({ error: 'No data available' }, { status: 404 })
  }
  
  // 解析请求的指标
  const indicatorList = indicators.split(',')
  const options: {
    ma?: number[]
    ema?: number[]
    rsi?: number
    macd?: { fast: number; slow: number; signal: number }
  } = {}
  
  for (const ind of indicatorList) {
    if (ind.startsWith('ma')) {
      const period = parseInt(ind.replace('ma', ''))
      if (!isNaN(period)) {
        options.ma = [...(options.ma || []), period]
      }
    } else if (ind.startsWith('ema')) {
      const period = parseInt(ind.replace('ema', ''))
      if (!isNaN(period)) {
        options.ema = [...(options.ema || []), period]
      }
    } else if (ind === 'rsi') {
      options.rsi = 14
    } else if (ind === 'macd') {
      options.macd = { fast: 12, slow: 26, signal: 9 }
    }
  }
  
  const result = calculateIndicators(data, options)
  
  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    indicators: result,
  })
}
```

**Step 3: 验证指标计算**

```bash
curl "http://localhost:3000/api/indicators?symbol=AAPL&indicators=ma20,rsi,macd"
```

Expected: 返回包含 MA20、RSI、MACD 数据的 JSON

**Step 4: 提交**

```bash
git add .
git commit -m "feat: 添加技术指标计算服务"
```

---

## Task 6: 创建 K线图组件

**Files:**
- Create: `src/components/chart/stock-chart.tsx`
- Create: `src/components/chart/chart-container.tsx`

**Step 1: 创建 K线图组件**

创建 `src/components/chart/stock-chart.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi, CandlestickData } from 'lightweight-charts'
import { HistoricalPrice } from '@/types/stock'

interface StockChartProps {
  data: HistoricalPrice[]
  height?: number
}

export function StockChart({ data, height = 400 }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#191919',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    const chartData: CandlestickData[] = data.map(d => ({
      time: Math.floor(d.date.getTime() / 1000) as unknown as string,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candlestickSeries.setData(chartData)

    // 添加成交量
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    const volumeData = data.map(d => ({
      time: Math.floor(d.date.getTime() / 1000) as unknown as string,
      value: d.volume,
      color: d.close >= d.open ? '#26a69a80' : '#ef535080',
    }))

    volumeSeries.setData(volumeData)

    chart.timeScale().fitContent()
    setIsLoading(false)

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, height])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        暂无数据
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          加载中...
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  )
}
```

**Step 2: 创建图表容器组件**

创建 `src/components/chart/chart-container.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { StockChart } from './stock-chart'
import { HistoricalPrice } from '@/types/stock'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ChartContainerProps {
  initialSymbol?: string
}

export function ChartContainer({ initialSymbol = 'AAPL' }: ChartContainerProps) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [inputValue, setInputValue] = useState(initialSymbol)
  const [data, setData] = useState<HistoricalPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData(symbol)
  }, [symbol])

  const fetchData = async (sym: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/history?symbol=${sym}&range=1y`)
      if (!response.ok) throw new Error('Failed to fetch data')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setSymbol(inputValue.trim().toUpperCase())
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入股票代码 (如 AAPL)"
          className="max-w-xs"
        />
        <Button type="submit" disabled={loading}>
          {loading ? '加载中...' : '查询'}
        </Button>
      </form>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-4">{symbol}</h2>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            加载中...
          </div>
        ) : (
          <StockChart data={data} />
        )}
      </div>
    </div>
  )
}
```

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 创建 K线图组件"
```

---

## Task 7: 创建主页面

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: 更新布局**

编辑 `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Findec - 美股量化分析平台',
  description: '个人美股量化分析工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 2: 创建主页面**

编辑 `src/app/page.tsx`:

```typescript
import { ChartContainer } from '@/components/chart/chart-container'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Findec</h1>
        <p className="text-muted-foreground mt-2">美股量化分析平台</p>
      </header>

      <section>
        <ChartContainer initialSymbol="AAPL" />
      </section>
    </main>
  )
}
```

**Step 3: 验证页面可访问**

```bash
npm run dev
# 访问 http://localhost:3000
```

Expected: 看到 AAPL 的 K 线图

**Step 4: 提交**

```bash
git add .
git commit -m "feat: 创建主页面"
```

---

## Task 8: 添加技术指标叠加功能

**Files:**
- Modify: `src/components/chart/stock-chart.tsx`
- Modify: `src/components/chart/chart-container.tsx`

**Step 1: 更新图表组件支持指标线**

编辑 `src/components/chart/stock-chart.tsx`，添加指标线支持：

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi, CandlestickData, LineData } from 'lightweight-charts'
import { HistoricalPrice } from '@/types/stock'

interface IndicatorLine {
  data: number[]
  color: string
  label: string
}

interface StockChartProps {
  data: HistoricalPrice[]
  height?: number
  indicators?: IndicatorLine[]
}

export function StockChart({ data, height = 400, indicators = [] }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#191919',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // K线
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    const chartData: CandlestickData[] = data.map(d => ({
      time: Math.floor(d.date.getTime() / 1000) as unknown as string,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candlestickSeries.setData(chartData)

    // 成交量
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    const volumeData = data.map(d => ({
      time: Math.floor(d.date.getTime() / 1000) as unknown as string,
      value: d.volume,
      color: d.close >= d.open ? '#26a69a80' : '#ef535080',
    }))

    volumeSeries.setData(volumeData)

    // 指标线
    const indicatorColors = ['#2196F3', '#FF9800', '#9C27B0', '#4CAF50']
    indicators.forEach((indicator, index) => {
      const lineSeries = chart.addLineSeries({
        color: indicator.color || indicatorColors[index % indicatorColors.length],
        lineWidth: 2,
        title: indicator.label,
      })

      const offset = data.length - indicator.data.length
      const lineData: LineData[] = indicator.data.map((value, i) => ({
        time: Math.floor(data[offset + i].date.getTime() / 1000) as unknown as string,
        value,
      }))

      lineSeries.setData(lineData)
    })

    chart.timeScale().fitContent()
    setIsLoading(false)

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, height, indicators])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        暂无数据
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          加载中...
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  )
}
```

**Step 2: 更新容器组件添加指标选择**

编辑 `src/components/chart/chart-container.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { StockChart } from './stock-chart'
import { HistoricalPrice } from '@/types/stock'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface ChartContainerProps {
  initialSymbol?: string
}

interface IndicatorOption {
  id: string
  label: string
  period: number
  color: string
  enabled: boolean
}

export function ChartContainer({ initialSymbol = 'AAPL' }: ChartContainerProps) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [inputValue, setInputValue] = useState(initialSymbol)
  const [data, setData] = useState<HistoricalPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [indicatorOptions, setIndicatorOptions] = useState<IndicatorOption[]>([
    { id: 'ma5', label: 'MA5', period: 5, color: '#2196F3', enabled: false },
    { id: 'ma10', label: 'MA10', period: 10, color: '#FF9800', enabled: false },
    { id: 'ma20', label: 'MA20', period: 20, color: '#9C27B0', enabled: true },
    { id: 'ma60', label: 'MA60', period: 60, color: '#4CAF50', enabled: false },
  ])
  const [indicatorData, setIndicatorData] = useState<Record<string, number[]>>({})

  useEffect(() => {
    fetchData(symbol)
  }, [symbol])

  useEffect(() => {
    if (data.length > 0) {
      fetchIndicators()
    }
  }, [data, indicatorOptions])

  const fetchData = async (sym: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/history?symbol=${sym}&range=1y`)
      if (!response.ok) throw new Error('Failed to fetch data')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchIndicators = async () => {
    const enabledIndicators = indicatorOptions.filter(opt => opt.enabled)
    if (enabledIndicators.length === 0) {
      setIndicatorData({})
      return
    }

    const indicatorParams = enabledIndicators.map(opt => opt.id).join(',')
    try {
      const response = await fetch(`/api/indicators?symbol=${symbol}&indicators=${indicatorParams}`)
      const result = await response.json()
      
      const newIndicatorData: Record<string, number[]> = {}
      for (const opt of enabledIndicators) {
        const values = result.indicators.ma?.values || []
        if (values.length > 0) {
          newIndicatorData[opt.id] = values
        }
      }
      setIndicatorData(newIndicatorData)
    } catch (err) {
      console.error('Failed to fetch indicators:', err)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setSymbol(inputValue.trim().toUpperCase())
    }
  }

  const toggleIndicator = (id: string) => {
    setIndicatorOptions(prev =>
      prev.map(opt => (opt.id === id ? { ...opt, enabled: !opt.enabled } : opt))
    )
  }

  const activeIndicators = indicatorOptions
    .filter(opt => opt.enabled && indicatorData[opt.id])
    .map(opt => ({
      data: indicatorData[opt.id],
      color: opt.color,
      label: opt.label,
    }))

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入股票代码 (如 AAPL)"
          className="max-w-xs"
        />
        <Button type="submit" disabled={loading}>
          {loading ? '加载中...' : '查询'}
        </Button>
      </form>

      <div className="flex flex-wrap gap-4">
        {indicatorOptions.map(opt => (
          <div key={opt.id} className="flex items-center space-x-2">
            <Checkbox
              id={opt.id}
              checked={opt.enabled}
              onCheckedChange={() => toggleIndicator(opt.id)}
            />
            <Label
              htmlFor={opt.id}
              className="text-sm cursor-pointer"
              style={{ color: opt.color }}
            >
              {opt.label}
            </Label>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-4">{symbol}</h2>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            加载中...
          </div>
        ) : (
          <StockChart data={data} indicators={activeIndicators} />
        )}
      </div>
    </div>
  )
}
```

**Step 3: 安装 Checkbox 和 Label 组件**

```bash
npx shadcn@latest add checkbox label
```

**Step 4: 验证指标叠加**

```bash
npm run dev
# 访问 http://localhost:3000
# 勾选 MA5, MA10, MA20 等指标
```

Expected: K 线图上显示对应的均线

**Step 5: 提交**

```bash
git add .
git commit -m "feat: 添加技术指标叠加功能"
```

---

## Task 9: 创建 Dashboard 页面

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/stock-list.tsx`
- Create: `src/components/dashboard/quick-quote.tsx`

**Step 1: 创建快速报价组件**

创建 `src/components/dashboard/quick-quote.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Quote } from '@/types/stock'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function QuickQuote() {
  const [symbol, setSymbol] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuote = async () => {
    if (!symbol.trim()) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/quotes?symbol=${symbol.toUpperCase()}`)
      if (!response.ok) throw new Error('Stock not found')
      const data = await response.json()
      setQuote(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>快速报价</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="输入股票代码"
            onKeyDown={(e) => e.key === 'Enter' && fetchQuote()}
          />
          <Button onClick={fetchQuote} disabled={loading}>
            {loading ? '查询中...' : '查询'}
          </Button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {quote && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{quote.name}</span>
              <span className="text-xs text-muted-foreground">{quote.symbol}</span>
            </div>
            <div className="text-3xl font-bold">${quote.price.toFixed(2)}</div>
            <div className={quote.change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {quote.change >= 0 ? '+' : ''}
              {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
            </div>
            <div className="text-sm text-muted-foreground">
              成交量: {Number(quote.volume).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 2: 创建股票列表组件**

创建 `src/components/dashboard/stock-list.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SearchResult } from '@/types/stock'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function StockList() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>股票搜索</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入股票名称或代码"
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={loading}>
            {loading ? '搜索中...' : '搜索'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((stock) => (
              <Link
                key={stock.symbol}
                href={`/chart/${stock.symbol}`}
                className="block p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="font-medium">{stock.symbol}</div>
                <div className="text-sm text-muted-foreground">{stock.name}</div>
                <div className="text-xs text-muted-foreground">{stock.exchange}</div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 3: 创建 Dashboard 页面**

创建 `src/app/dashboard/page.tsx`:

```typescript
import { QuickQuote } from '@/components/dashboard/quick-quote'
import { StockList } from '@/components/dashboard/stock-list'

export default function DashboardPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">快速查看股票信息</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickQuote />
        <StockList />
      </div>
    </main>
  )
}
```

**Step 4: 安装 Card 组件**

```bash
npx shadcn@latest add card
```

**Step 5: 更新主页添加导航**

编辑 `src/app/page.tsx`:

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChartContainer } from '@/components/chart/chart-container'

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Findec</h1>
          <p className="text-muted-foreground mt-2">美股量化分析平台</p>
        </div>
        <nav>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </nav>
      </header>

      <section>
        <ChartContainer initialSymbol="AAPL" />
      </section>
    </main>
  )
}
```

**Step 6: 验证 Dashboard**

```bash
npm run dev
# 访问 http://localhost:3000/dashboard
```

Expected: 看到快速报价和股票搜索功能

**Step 7: 提交**

```bash
git add .
git commit -m "feat: 创建 Dashboard 页面"
```

---

## Task 10: 创建图表详情页面

**Files:**
- Create: `src/app/chart/[symbol]/page.tsx`

**Step 1: 创建动态图表页面**

创建 `src/app/chart/[symbol]/page.tsx`:

```typescript
'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChartContainer } from '@/components/chart/chart-container'

export default function ChartPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params)

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{symbol.toUpperCase()}</h1>
          <p className="text-muted-foreground mt-2">K线图分析</p>
        </div>
        <nav className="flex gap-2">
          <Link href="/">
            <Button variant="outline">首页</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </nav>
      </header>

      <section>
        <ChartContainer initialSymbol={symbol.toUpperCase()} />
      </section>
    </main>
  )
}
```

**Step 2: 验证动态页面**

```bash
npm run dev
# 访问 http://localhost:3000/chart/TSLA
# 访问 http://localhost:3000/chart/GOOGL
```

Expected: 显示对应股票的 K 线图

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 创建动态图表详情页面"
```

---

## Task 11: 添加数据缓存功能

**Files:**
- Modify: `src/app/api/history/route.ts`
- Modify: `src/lib/yahoo-finance.ts`

**Step 1: 添加缓存逻辑到历史数据 API**

编辑 `src/app/api/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  const range = request.nextUrl.searchParams.get('range') || '1y'
  const interval = request.nextUrl.searchParams.get('interval') || '1d'

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  const upperSymbol = symbol.toUpperCase()

  // 检查是否需要更新（每日只更新一次）
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingStock = await prisma.stock.findUnique({
    where: { symbol: upperSymbol },
    include: {
      history: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  const shouldFetchFromAPI = !existingStock ||
    existingStock.history.length === 0 ||
    existingStock.history[0].date < today

  let data

  if (shouldFetchFromAPI) {
    // 从 API 获取数据
    data = await getHistoricalData(upperSymbol, range, interval)

    // 存储到数据库
    if (data.length > 0) {
      // 确保 stock 存在
      await prisma.stock.upsert({
        where: { symbol: upperSymbol },
        create: { symbol: upperSymbol },
        update: {},
      })

      // 批量插入历史数据
      for (const price of data) {
        await prisma.historicalData.upsert({
          where: {
            stockSymbol_date: {
              stockSymbol: upperSymbol,
              date: price.date,
            },
          },
          create: {
            stockSymbol: upperSymbol,
            date: price.date,
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume,
          },
          update: {
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume,
          },
        })
      }
    }
  } else {
    // 从数据库读取
    const cachedData = await prisma.historicalData.findMany({
      where: { stockSymbol: upperSymbol },
      orderBy: { date: 'asc' },
    })

    data = cachedData.map(d => ({
      date: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: Number(d.volume),
    }))
  }

  return NextResponse.json({ symbol: upperSymbol, data })
}
```

**Step 2: 验证缓存**

```bash
# 第一次请求（从 API 获取）
curl "http://localhost:3000/api/history?symbol=AAPL" | jq '.data | length'

# 第二次请求（从缓存读取）
curl "http://localhost:3000/api/history?symbol=AAPL" | jq '.data | length'
```

Expected: 数据相同，第二次响应更快

**Step 3: 提交**

```bash
git add .
git commit -m "feat: 添加历史数据缓存功能"
```

---

## Task 12: 优化和收尾

**Files:**
- Create: `src/app/globals.css` (如果需要)
- Modify: `src/app/layout.tsx`
- Create: `.env.example`
- Create: `README.md`

**Step 1: 添加全局样式优化**

编辑 `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 2: 创建环境变量示例**

创建 `.env.example`:

```
DATABASE_URL="file:./dev.db"
```

**Step 3: 创建 README**

创建 `README.md`:

```markdown
# Findec - 美股量化分析平台

个人美股量化分析工具，提供 K 线图查看、技术指标分析等功能。

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Prisma + SQLite
- Lightweight Charts
- Yahoo Finance API
- Tailwind CSS + shadcn/ui

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push
npx prisma generate

# 启动开发服务器
npm run dev
```

## 功能

- 📊 K 线图查看
- 📈 技术指标叠加 (MA, EMA, RSI, MACD)
- 🔍 股票搜索
- 💹 快速报价
- 💾 历史数据缓存

## 许可证

MIT
```

**Step 4: 更新 .gitignore**

创建/编辑 `.gitignore`:

```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
prisma/dev.db
prisma/dev.db-journal
```

**Step 5: 最终验证**

```bash
npm run build
npm run dev
# 测试所有功能
```

Expected: 构建成功，所有页面正常工作

**Step 6: 最终提交**

```bash
git add .
git commit -m "chore: 优化和收尾"
```

---

## 执行选项

**计划完成，已保存到 `docs/plans/2026-03-29-implementation-plan.md`**

**两种执行方式:**

1. **Subagent-Driven (当前会话)** — 我逐任务派发子代理执行，任务间可审查，快速迭代

2. **Parallel Session (新会话)** — 在新会话中使用 executing-plans 技能批量执行

**选择哪种方式？**