import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RiskMetricsCalculator, EquityPoint, RiskMetrics } from '@/lib/backtest/risk-metrics'

interface BacktestComparisonRequest {
  backtestIds: string[]
  startDate?: string
  endDate?: string
}

interface EquityCurvePoint {
  date: string
  value: number
}

interface BacktestData {
  id: string
  name: string
  strategyName: string
  symbols: string
  startDate: Date
  endDate: Date
  initialCapital: number
  totalReturn: number | null
  sharpeRatio: number | null
  maxDrawdown: number | null
  trades: Array<{
    type: 'BUY' | 'SELL'
    value: number
    date: Date
  }>
  equityCurve: EquityCurvePoint[]
}

interface ComparisonMetrics {
  backtestId: string
  name: string
  strategyName: string
  totalReturn: number
  annualizedReturn: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  calmarRatio: number
  winRate: number
  profitFactor: number
  var95: number
  var99: number
  alpha: number
  beta: number
  equityCurve: EquityCurvePoint[]
}

interface BacktestRank {
  backtestId: string
  name: string
  totalRank: number
  rankBreakdown: {
    totalReturn: number
    sharpeRatio: number
    sortinoRatio: number
    calmarRatio: number
    maxDrawdown: number
    winRate: number
    profitFactor: number
    var95: number
    alpha: number
  }
}

interface ComparisonResponse {
  rankings: BacktestRank[]
  metrics: ComparisonMetrics[]
  commonPeriod: {
    start: string
    end: string
  }
}

// Helper to parse equity curve from various formats (reserved for future use)
function _parseEquityCurve(data: unknown): EquityCurvePoint[] {
  if (!data) return []
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }
  if (Array.isArray(data)) {
    return data as EquityCurvePoint[]
  }
  return []
}

// Calculate common date range (intersection)
function calculateCommonPeriod(
  backtests: BacktestData[],
  requestedStart?: string,
  requestedEnd?: string
): { start: Date; end: Date } {
  // Get intersection of all backtest date ranges
  let commonStart = new Date(Math.max(...backtests.map(b => b.startDate.getTime())))
  let commonEnd = new Date(Math.min(...backtests.map(b => b.endDate.getTime())))

  // Apply user requested dates if provided
  if (requestedStart) {
    const reqStart = new Date(requestedStart)
    if (reqStart > commonStart) {
      commonStart = reqStart
    }
  }
  if (requestedEnd) {
    const reqEnd = new Date(requestedEnd)
    if (reqEnd < commonEnd) {
      commonEnd = reqEnd
    }
  }

  return { start: commonStart, end: commonEnd }
}

// Filter equity curve to common period
function filterEquityCurve(
  curve: EquityCurvePoint[],
  startDate: Date,
  endDate: Date
): EquityCurvePoint[] {
  return curve.filter(point => {
    const pointDate = new Date(point.date)
    return pointDate >= startDate && pointDate <= endDate
  })
}

// Calculate win rate from trades
function calculateWinRate(trades: BacktestData['trades']): number {
  if (trades.length === 0) return 0

  const sellTrades = trades.filter(t => t.type === 'SELL')
  if (sellTrades.length === 0) return 0

  const buyTrades = trades.filter(t => t.type === 'BUY')

  const tradePairs: { buyValue: number; sellValue: number }[] = []
  let buyIndex = 0

  for (const sellTrade of sellTrades) {
    if (buyIndex < buyTrades.length) {
      tradePairs.push({
        buyValue: buyTrades[buyIndex].value,
        sellValue: sellTrade.value,
      })
      buyIndex++
    }
  }

  if (tradePairs.length === 0) return 0

  const winningTrades = tradePairs.filter(p => p.sellValue > p.buyValue)
  return (winningTrades.length / tradePairs.length) * 100
}

// Calculate profit factor from trades
function calculateProfitFactor(trades: BacktestData['trades']): number {
  if (trades.length === 0) return 0

  const sellTrades = trades.filter(t => t.type === 'SELL')
  const buyTrades = trades.filter(t => t.type === 'BUY')

  const tradePairs: { buyValue: number; sellValue: number }[] = []
  let buyIndex = 0

  for (const sellTrade of sellTrades) {
    if (buyIndex < buyTrades.length) {
      tradePairs.push({
        buyValue: buyTrades[buyIndex].value,
        sellValue: sellTrade.value,
      })
      buyIndex++
    }
  }

  const winningTrades = tradePairs.filter(p => p.sellValue > p.buyValue)
  const losingTrades = tradePairs.filter(p => p.sellValue <= p.buyValue)

  const totalWins = winningTrades.reduce((sum, p) => sum + (p.sellValue - p.buyValue), 0)
  const totalLosses = Math.abs(losingTrades.reduce((sum, p) => sum + (p.sellValue - p.buyValue), 0))

  if (totalLosses === 0) return totalWins > 0 ? Infinity : 0
  return totalWins / totalLosses
}

// Calculate ranking for each metric (1 = best)
function calculateRankings(metrics: ComparisonMetrics[]): BacktestRank[] {
  const metricKeys: (keyof Omit<ComparisonMetrics, 'backtestId' | 'name' | 'strategyName' | 'equityCurve'>)[] = [
    'totalReturn',
    'sharpeRatio',
    'sortinoRatio',
    'calmarRatio',
    'winRate',
    'profitFactor',
    'alpha',
  ]

  const invertedMetrics: (keyof Omit<ComparisonMetrics, 'backtestId' | 'name' | 'strategyName' | 'equityCurve'>)[] = [
    'maxDrawdown',
    'var95',
  ]

  // Calculate individual rankings
  const rankings: BacktestRank[] = metrics.map(m => ({
    backtestId: m.backtestId,
    name: m.name,
    totalRank: 0,
    rankBreakdown: {
      totalReturn: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      var95: 0,
      alpha: 0,
    },
  }))

  // For each metric, rank all backtests
  for (const key of metricKeys) {
    const sorted = [...metrics].sort((a, b) => b[key] - a[key])
    sorted.forEach((m, index) => {
      const rankEntry = rankings.find(r => r.backtestId === m.backtestId)
      if (rankEntry) {
        rankEntry.rankBreakdown[key as keyof typeof rankEntry.rankBreakdown] = index + 1
      }
    })
  }

  // For inverted metrics (lower is better), reverse the sort
  for (const key of invertedMetrics) {
    const sorted = [...metrics].sort((a, b) => a[key] - b[key])
    sorted.forEach((m, index) => {
      const rankEntry = rankings.find(r => r.backtestId === m.backtestId)
      if (rankEntry) {
        rankEntry.rankBreakdown[key as keyof typeof rankEntry.rankBreakdown] = index + 1
      }
    })
  }

  // Calculate total rank (sum of all individual ranks)
  rankings.forEach(r => {
    r.totalRank = Object.values(r.rankBreakdown).reduce((sum, rank) => sum + rank, 0)
  })

  // Sort by total rank (lower is better)
  rankings.sort((a, b) => a.totalRank - b.totalRank)

  return rankings
}

// Calculate benchmark Alpha/Beta using SPY as reference
async function calculateBenchmarkMetrics(
  equityCurve: EquityPoint[],
  startDate: Date,
  endDate: Date
): Promise<{ alpha: number; beta: number }> {
  try {
    // Fetch SPY data for the same period
    const response = await fetch(
      `http://localhost:3000/api/history?symbol=SPY&start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`
    )

    if (!response.ok) {
      return { alpha: 0, beta: 1 }
    }

    const data = await response.json()
    if (!data.data || data.data.length === 0) {
      return { alpha: 0, beta: 1 }
    }

    // Calculate benchmark equity curve (buy and hold SPY)
    const spyData = data.data
    const spyStartPrice = spyData[0].close
    const spyEquityCurve = spyData.map((d: { close: number }) => ({
      date: new Date(),
      value: (d.close / spyStartPrice) * equityCurve[0].value,
    }))

    // Calculate returns for both
    const portfolioReturns: number[] = []
    const benchmarkReturns: number[] = []

    for (let i = 1; i < equityCurve.length; i++) {
      const portfolioReturn = (equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value
      portfolioReturns.push(portfolioReturn)

      const spyIndex = Math.min(i, spyEquityCurve.length - 1)
      const benchmarkReturn = (spyEquityCurve[spyIndex].value - spyEquityCurve[spyIndex - 1].value) / spyEquityCurve[spyIndex - 1].value
      benchmarkReturns.push(benchmarkReturn)
    }

    // Calculate alpha and beta
    const n = Math.min(portfolioReturns.length, benchmarkReturns.length)
    if (n < 2) return { alpha: 0, beta: 1 }

    const portfolioSlice = portfolioReturns.slice(0, n)
    const benchmarkSlice = benchmarkReturns.slice(0, n)

    const portfolioMean = portfolioSlice.reduce((sum, r) => sum + r, 0) / n
    const benchmarkMean = benchmarkSlice.reduce((sum, r) => sum + r, 0) / n

    const _portfolioStd = Math.sqrt(
      portfolioSlice.reduce((sum, r) => sum + Math.pow(r - portfolioMean, 2), 0) / n
    )
    const benchmarkStd = Math.sqrt(
      benchmarkSlice.reduce((sum, r) => sum + Math.pow(r - benchmarkMean, 2), 0) / n
    )

    const covariance =
      portfolioSlice.reduce(
        (sum, r, i) => sum + (r - portfolioMean) * (benchmarkSlice[i] - benchmarkMean),
        0
      ) / n

    const beta = benchmarkStd > 0 ? covariance / (benchmarkStd * benchmarkStd) : 1
    const annualizedPortfolioReturn = portfolioMean * 252
    const annualizedBenchmarkReturn = benchmarkMean * 252
    const riskFreeRate = 0.02
    const alpha = annualizedPortfolioReturn - riskFreeRate - beta * (annualizedBenchmarkReturn - riskFreeRate)

    return { alpha: alpha * 100, beta }
  } catch {
    return { alpha: 0, beta: 1 }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: BacktestComparisonRequest = await request.json()
    const { backtestIds, startDate: requestedStart, endDate: requestedEnd } = body

    if (!backtestIds || backtestIds.length < 2 || backtestIds.length > 8) {
      return NextResponse.json(
        { error: '需要选择2-8个回测记录进行对比' },
        { status: 400 }
      )
    }

    // Fetch all backtest data
    const backtests = await prisma.backtestPlan.findMany({
      where: { id: { in: backtestIds } },
      include: { trades: true },
    })

    if (backtests.length < 2) {
      return NextResponse.json(
        { error: '无法找到足够的回测记录' },
        { status: 404 }
      )
    }

    // Transform backtest data
    const backtestData: BacktestData[] = backtests.map(b => ({
      id: b.id,
      name: b.name,
      strategyName: b.name.split(' - ')[0] || b.name,
      symbols: b.symbols,
      startDate: b.startDate,
      endDate: b.endDate,
      initialCapital: b.initialCapital,
      totalReturn: b.totalReturn,
      sharpeRatio: b.sharpeRatio,
      maxDrawdown: b.maxDrawdown,
      trades: b.trades.map(t => ({
        type: t.type as 'BUY' | 'SELL',
        value: t.quantity * t.price,
        date: t.date,
      })),
      equityCurve: [], // Will be populated from execution results
    }))

    // Get equity curve data from execution results
    // In a real scenario, we'd store equity curves in the database
    // For now, reconstruct from available data or use placeholder
    for (const data of backtestData) {
      // Try to get equity curve from trades
      if (data.trades.length > 0) {
        const sortedTrades = [...data.trades].sort((a, b) => a.date.getTime() - b.date.getTime())
        let equity = data.initialCapital
        const curve: EquityCurvePoint[] = [
          { date: data.startDate.toISOString(), value: equity },
        ]

        for (const trade of sortedTrades) {
          if (trade.type === 'BUY') {
            equity -= trade.value
          } else {
            equity += trade.value
          }
          curve.push({ date: trade.date.toISOString(), value: equity })
        }

        data.equityCurve = curve
      } else {
        // Minimal equity curve
        data.equityCurve = [
          { date: data.startDate.toISOString(), value: data.initialCapital },
          { date: data.endDate.toISOString(), value: data.initialCapital * (1 + (data.totalReturn || 0) / 100) },
        ]
      }
    }

    // Calculate common period
    const { start: commonStart, end: commonEnd } = calculateCommonPeriod(
      backtestData,
      requestedStart,
      requestedEnd
    )

    if (commonStart >= commonEnd) {
      return NextResponse.json(
        { error: '所选回测没有重叠的时间区间' },
        { status: 400 }
      )
    }

    // Calculate metrics for each backtest in the common period
    const metrics: ComparisonMetrics[] = []
    const calculator = new RiskMetricsCalculator()

    for (const data of backtestData) {
      const filteredCurve = filterEquityCurve(data.equityCurve, commonStart, commonEnd)

      if (filteredCurve.length < 2) {
        continue
      }

      const equityPoints: EquityPoint[] = filteredCurve.map(p => ({
        date: new Date(p.date),
        value: p.value,
      }))

      const riskMetrics: RiskMetrics = calculator.calculate(equityPoints, data.trades)
      const winRate = calculateWinRate(data.trades)
      const profitFactor = calculateProfitFactor(data.trades)
      const benchmarkMetrics = await calculateBenchmarkMetrics(equityPoints, commonStart, commonEnd)

      metrics.push({
        backtestId: data.id,
        name: data.name,
        strategyName: data.strategyName,
        totalReturn: riskMetrics.totalReturn,
        annualizedReturn: riskMetrics.annualizedReturn,
        sharpeRatio: riskMetrics.sharpeRatio,
        sortinoRatio: riskMetrics.sortinoRatio,
        maxDrawdown: riskMetrics.maxDrawdown,
        calmarRatio: riskMetrics.calmarRatio,
        winRate: winRate,
        profitFactor: profitFactor,
        var95: riskMetrics.var95,
        var99: riskMetrics.var99,
        alpha: benchmarkMetrics.alpha,
        beta: benchmarkMetrics.beta,
        equityCurve: filteredCurve,
      })
    }

    // Calculate rankings
    const rankings = calculateRankings(metrics)

    const response: ComparisonResponse = {
      rankings,
      metrics,
      commonPeriod: {
        start: commonStart.toISOString().split('T')[0],
        end: commonEnd.toISOString().split('T')[0],
      },
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error comparing backtests:', error)
    return NextResponse.json(
      { error: '对比回测时出错' },
      { status: 500 }
    )
  }
}
