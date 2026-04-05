import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BacktestConfig } from '@/lib/backtest-engine'
import { executeBacktest } from '@/lib/backtest-engine'
import { calculateBenchmarkMetrics, BenchmarkResult } from '@/lib/backtest/benchmark-calculator'

interface Trade {
  date: Date
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  symbol: string
  reason?: string
  pnl?: number
}

interface EquityPoint {
  date: string
  value: number
}

interface ExecuteResponse {
  planId: string
  status: string
  metrics: {
    portfolioReturn: number
    portfolioSharpe: number
    portfolioSortino: number
    portfolioCalmar: number
    portfolioMaxDrawdown: number
    portfolioVolatility: number
    portfolioVaR95: number
    totalTrades: number
    winRate: number
  }
  equityCurve: EquityPoint[]
  trades: Trade[]
  benchmarkResult?: BenchmarkResult
}

function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
  if (returns.length < 2) return 0
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  if (stdDev === 0) return 0
  return (avgReturn * 252 - riskFreeRate) / (stdDev * Math.sqrt(252))
}

function calculateSortinoRatio(returns: number[], riskFreeRate: number = 0.02): number {
  if (returns.length < 2) return 0
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const downsideReturns = returns.filter(r => r < 0)
  const downsideDev = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length)
    : 0
  if (downsideDev === 0) return 0
  return (avgReturn * 252 - riskFreeRate) / (downsideDev * Math.sqrt(252))
}

function calculateMaxDrawdown(equityCurve: EquityPoint[]): number {
  let maxDrawdown = 0
  let peak = equityCurve[0]?.value || 0

  for (const point of equityCurve) {
    if (point.value > peak) {
      peak = point.value
    }
    const drawdown = (peak - point.value) / peak
    maxDrawdown = Math.max(maxDrawdown, drawdown)
  }

  return maxDrawdown
}

function calculateVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length === 0) return 0
  const sorted = [...returns].sort((a, b) => a - b)
  const index = Math.floor((1 - confidence) * sorted.length)
  return -sorted[index] || 0
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const plan = await prisma.portfolioBacktestPlan.findUnique({
      where: { id },
    })

    if (!plan) {
      return NextResponse.json(
        { error: '回测计划不存在' },
        { status: 404 }
      )
    }

    if (plan.status === 'running') {
      return NextResponse.json(
        { error: '回测正在运行中' },
        { status: 400 }
      )
    }

    await prisma.portfolioBacktestPlan.update({
      where: { id },
      data: { status: 'running' },
    })

    const benchmark: 'SPY' | 'QQQ' | undefined = body.benchmark

    const symbols: string[] = JSON.parse(plan.symbols)
    const strategies: { id: string; type: string; parameters?: Record<string, number> }[] =
      JSON.parse(plan.strategies)
    const allocation: Record<string, number> = plan.allocation
      ? JSON.parse(plan.allocation)
      : symbols.reduce((acc, s) => ({ ...acc, [s]: 1 / symbols.length }), {})

    const startDate = new Date(plan.startDate)
    const endDate = new Date(plan.endDate)

    const allTrades: Trade[] = []
    const symbolReturns: number[] = []
    const symbolEquityCurves: EquityPoint[][] = []

    for (const symbol of symbols) {
      const response = await fetch(
        `${request.nextUrl.origin}/api/history?symbol=${symbol}&start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`
      )

      if (!response.ok) {
        continue
      }

      const data = await response.json()

      if (!data.data || data.data.length === 0) {
        continue
      }

      const prices = data.data.map((d: { date: string; open: number; high: number; low: number; close: number; volume: number }) => ({
        date: new Date(d.date),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }))

      const symbolWeight = allocation[symbol] || (1 / symbols.length)
      const symbolCapital = plan.initialCapital * symbolWeight

      const config: BacktestConfig = {
        initialCapital: symbolCapital,
        strategy: (strategies[0]?.type as BacktestConfig['strategy']) || 'ma_crossover',
        parameters: strategies[0]?.parameters || {
          shortWindow: 10,
          longWindow: 30,
          positionSize: 1.0,
        },
      }

      const result = executeBacktest(prices, config)

      const symbolTrades: Trade[] = result.trades.map(trade => ({
        date: trade.date,
        type: trade.type,
        price: trade.price,
        quantity: trade.quantity,
        symbol,
        reason: config.strategy,
        pnl: trade.type === 'SELL' ? (trade.price - (result.trades.find((t: { date: Date; type: string }) => t.type === 'BUY' && t.date < trade.date)?.price || trade.price)) * trade.quantity : undefined,
      }))

      allTrades.push(...symbolTrades)

      if (result.equityCurve.length > 1) {
        for (let i = 1; i < result.equityCurve.length; i++) {
          const prevValue = result.equityCurve[i - 1].value
          const currValue = result.equityCurve[i].value
          symbolReturns.push((currValue - prevValue) / prevValue)
        }
      }

      symbolEquityCurves.push(
        result.equityCurve.map(p => ({
          date: p.date.toISOString().split('T')[0],
          value: p.value,
        }))
      )
    }

    const mergedEquityCurve: EquityPoint[] = []
    const allDates = new Set<string>()
    symbolEquityCurves.forEach(curve => {
      curve.forEach(p => allDates.add(p.date))
    })
    const sortedDates = Array.from(allDates).sort()

    for (const date of sortedDates) {
      let totalValue = 0
      let count = 0
      symbolEquityCurves.forEach(curve => {
        const point = curve.find(p => p.date === date)
        if (point) {
          totalValue += point.value
          count++
        }
      })
      if (count > 0) {
        mergedEquityCurve.push({
          date,
          value: totalValue,
        })
      }
    }

    const portfolioReturn = mergedEquityCurve.length > 1
      ? (mergedEquityCurve[mergedEquityCurve.length - 1].value - mergedEquityCurve[0].value) / mergedEquityCurve[0].value
      : 0

    const portfolioSharpe = calculateSharpeRatio(symbolReturns)
    const portfolioSortino = calculateSortinoRatio(symbolReturns)
    const portfolioMaxDrawdown = calculateMaxDrawdown(mergedEquityCurve)
    const portfolioVolatility = symbolReturns.length > 1
      ? Math.sqrt(symbolReturns.reduce((sum, r) => sum + Math.pow(r - symbolReturns.reduce((s, x) => s + x, 0) / symbolReturns.length, 2), 0) / symbolReturns.length) * Math.sqrt(252)
      : 0
    const portfolioVaR95 = calculateVaR(symbolReturns, 0.95)

    let totalReturn = 0
    let positiveReturns = 0
    for (let i = 1; i < allTrades.length; i += 2) {
      if (allTrades[i]?.type === 'SELL' && allTrades[i - 1]?.type === 'BUY') {
        const buyPrice = allTrades[i - 1].price
        const sellPrice = allTrades[i].price
        const tradeReturn = (sellPrice - buyPrice) / buyPrice
        totalReturn += tradeReturn
        if (tradeReturn > 0) positiveReturns++
      }
    }
    const winRate = allTrades.length > 0 ? positiveReturns / (allTrades.length / 2) : 0
    const portfolioCalmar = portfolioMaxDrawdown > 0
      ? (portfolioReturn * 252 / ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) / portfolioMaxDrawdown
      : 0

    allTrades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate benchmark metrics if requested
    let benchmarkResult: BenchmarkResult | null = null
    if (benchmark && mergedEquityCurve.length > 0) {
      const portfolioCurve = mergedEquityCurve.map((p) => ({
        date: new Date(p.date),
        value: p.value,
      }))
      benchmarkResult = await calculateBenchmarkMetrics(
        portfolioCurve,
        benchmark,
        plan.initialCapital
      )
    }

    await prisma.portfolioBacktestPlan.update({
      where: { id },
      data: {
        status: 'completed',
        portfolioReturn,
        portfolioSharpe,
        portfolioSortino,
        portfolioCalmar,
        portfolioMaxDrawdown,
        portfolioVolatility,
        portfolioVaR95,
        equityCurve: JSON.stringify(mergedEquityCurve),
        tradeLog: JSON.stringify(allTrades),
        riskMetrics: JSON.stringify({
          sharpe: portfolioSharpe,
          sortino: portfolioSortino,
          calmar: portfolioCalmar,
          volatility: portfolioVolatility,
          var95: portfolioVaR95,
        }),
      },
    })

    const response: ExecuteResponse = {
      planId: id,
      status: 'completed',
      metrics: {
        portfolioReturn,
        portfolioSharpe,
        portfolioSortino,
        portfolioCalmar,
        portfolioMaxDrawdown,
        portfolioVolatility,
        portfolioVaR95,
        totalTrades: allTrades.length,
        winRate,
      },
      equityCurve: mergedEquityCurve,
      trades: allTrades,
      ...(benchmarkResult && { benchmarkResult }),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error executing portfolio backtest:', error)

    const { id } = await params
    await prisma.portfolioBacktestPlan.update({
      where: { id },
      data: { status: 'failed' },
    })

    return NextResponse.json(
      { error: '执行回测失败' },
      { status: 500 }
    )
  }
}
