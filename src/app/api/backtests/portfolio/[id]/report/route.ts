import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface BacktestMetrics {
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

interface EquityPoint {
  date: string
  value: number
}

interface Trade {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  symbol: string
  reason?: string
  pnl?: number
}

interface AssetBreakdown {
  symbol: string
  return: number
  weight: number
}

interface MonthlyReturn {
  month: string
  return: number
}

interface BacktestReportResponse {
  summary: BacktestMetrics
  equityCurve: EquityPoint[]
  trades: Trade[]
  riskMetrics: {
    sharpe: number
    sortino: number
    calmar: number
    volatility: number
    var95: number
  }
  assetBreakdown: AssetBreakdown[]
  monthlyReturns: MonthlyReturn[]
}

function calculateMonthlyReturns(equityCurve: EquityPoint[]): MonthlyReturn[] {
  const monthlyData: Map<string, { start: number; end: number }> = new Map()

  for (const point of equityCurve) {
    const date = new Date(point.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const existing = monthlyData.get(monthKey)
    if (existing) {
      existing.end = point.value
    } else {
      monthlyData.set(monthKey, { start: point.value, end: point.value })
    }
  }

  return Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month,
      return: data.start > 0 ? ((data.end - data.start) / data.start) * 100 : 0,
    }))
}

function calculateAssetBreakdown(
  trades: Trade[],
  allocation: Record<string, number>
): AssetBreakdown[] {
  const symbolTrades: Map<string, { buys: Trade[]; sells: Trade[] }> = new Map()

  for (const trade of trades) {
    const data = symbolTrades.get(trade.symbol) || { buys: [], sells: [] }
    if (trade.type === 'BUY') {
      data.buys.push(trade)
    } else {
      data.sells.push(trade)
    }
    symbolTrades.set(trade.symbol, data)
  }

  return Array.from(symbolTrades.entries()).map(([symbol, data]) => {
    const totalBuyValue = data.buys.reduce((sum, t) => sum + t.price * t.quantity, 0)
    const totalSellValue = data.sells.reduce((sum, t) => sum + t.price * t.quantity, 0)
    const totalBuyQty = data.buys.reduce((sum, t) => sum + t.quantity, 0)

    let symbolReturn = 0
    if (totalBuyValue > 0 && totalBuyQty > 0) {
      const avgBuyPrice = totalBuyValue / totalBuyQty
      const remainingQty = totalBuyQty - data.sells.reduce((sum, t) => sum + t.quantity, 0)
      const unrealizedValue = remainingQty * (data.sells[data.sells.length - 1]?.price || avgBuyPrice)
      symbolReturn = ((totalSellValue + unrealizedValue - totalBuyValue) / totalBuyValue) * 100
    }

    return {
      symbol,
      return: symbolReturn,
      weight: allocation[symbol] || 0,
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const plan = await prisma.portfolioBacktestPlan.findUnique({
      where: { id },
    })

    if (!plan) {
      return NextResponse.json(
        { error: '回测计划不存在' },
        { status: 404 }
      )
    }

    if (plan.status !== 'completed') {
      return NextResponse.json(
        { error: '回测尚未完成' },
        { status: 400 }
      )
    }

    const equityCurve: EquityPoint[] = plan.equityCurve
      ? JSON.parse(plan.equityCurve)
      : []

    const trades: Trade[] = plan.tradeLog
      ? JSON.parse(plan.tradeLog)
      : []

    const riskMetrics = plan.riskMetrics
      ? JSON.parse(plan.riskMetrics)
      : {
          sharpe: plan.portfolioSharpe || 0,
          sortino: plan.portfolioSortino || 0,
          calmar: plan.portfolioCalmar || 0,
          volatility: plan.portfolioVolatility || 0,
          var95: plan.portfolioVaR95 || 0,
        }

    const allocation: Record<string, number> = plan.allocation
      ? JSON.parse(plan.allocation)
      : {}

    const sellTrades = trades.filter(t => t.type === 'SELL')
    const winningTrades = sellTrades.filter((t, i) => {
      const matchingBuy = trades
        .slice(0, trades.indexOf(t))
        .reverse()
        .find(bt => bt.type === 'BUY' && bt.symbol === t.symbol)
      return matchingBuy && t.price > matchingBuy.price
    })

    const winRate = sellTrades.length > 0
      ? (winningTrades.length / sellTrades.length) * 100
      : 0

    const summary: BacktestMetrics = {
      portfolioReturn: plan.portfolioReturn || 0,
      portfolioSharpe: plan.portfolioSharpe || 0,
      portfolioSortino: plan.portfolioSortino || 0,
      portfolioCalmar: plan.portfolioCalmar || 0,
      portfolioMaxDrawdown: plan.portfolioMaxDrawdown || 0,
      portfolioVolatility: plan.portfolioVolatility || 0,
      portfolioVaR95: plan.portfolioVaR95 || 0,
      totalTrades: trades.length,
      winRate,
    }

    const assetBreakdown = calculateAssetBreakdown(trades, allocation)
    const monthlyReturns = calculateMonthlyReturns(equityCurve)

    const response: BacktestReportResponse = {
      summary,
      equityCurve,
      trades,
      riskMetrics,
      assetBreakdown,
      monthlyReturns,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching backtest report:', error)
    return NextResponse.json(
      { error: '获取回测报告失败' },
      { status: 500 }
    )
  }
}
