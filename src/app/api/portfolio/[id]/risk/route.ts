import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  RiskMonitor,
  RiskMetrics,
  getDefaultThresholds,
  EquityPoint,
  PortfolioState,
} from '@/lib/portfolio/risk-monitor'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get portfolio with positions
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        positions: true,
      },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: '组合不存在', code: 'PORTFOLIO_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get current prices
    const positions: PortfolioState['positions'] = []
    let totalValue = 0

    for (const position of portfolio.positions) {
      const response = await fetch(
        `http://localhost:3000/api/quotes?symbol=${position.symbol}`
      )
      const quote = response.ok ? await response.json() : {}
      const currentPrice = quote.price || quote.regularMarketPrice || position.avgCost
      const currentValue = position.quantity * currentPrice

      positions.push({
        symbol: position.symbol,
        quantity: position.quantity,
        currentPrice,
        currentValue,
      })

      totalValue += currentValue
    }

    const portfolioState: PortfolioState = {
      positions,
      totalValue,
    }

    // Get portfolio history (mock for now - would come from database)
    const history: EquityPoint[] = await fetchPortfolioHistory(id)

    // Get thresholds from user config or use defaults
    const thresholds = await getPortfolioThresholds(id)

    // Initialize risk monitor
    const riskMonitor = new RiskMonitor(thresholds)

    // Check for alerts
    const alerts = riskMonitor.checkRisk(portfolioState, history)

    // Calculate current metrics
    const currentMetrics = calculateCurrentMetrics(positions, history, totalValue)

    // Get risk history
    const riskHistory = await fetchRiskHistory(id)

    return NextResponse.json({
      currentMetrics,
      alerts,
      thresholds,
      history: riskHistory,
    })
  } catch (error) {
    console.error('Error fetching portfolio risk:', error)
    return NextResponse.json(
      { error: '获取组合风险失败', code: 'RISK_FETCH_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { thresholds } = body

    if (!thresholds) {
      return NextResponse.json(
        { error: '阈值参数不能为空', code: 'MISSING_THRESHOLDS' },
        { status: 400 }
      )
    }

    // Store thresholds in user config
    await prisma.userConfig.upsert({
      where: { key: `portfolio_risk_thresholds_${id}` },
      update: {
        value: JSON.stringify(thresholds),
      },
      create: {
        key: `portfolio_risk_thresholds_${id}`,
        value: JSON.stringify(thresholds),
      },
    })

    return NextResponse.json({
      message: 'Risk thresholds updated successfully',
      thresholds,
    })
  } catch (error) {
    console.error('Error updating risk thresholds:', error)
    return NextResponse.json(
      { error: '更新风险阈值失败', code: 'THRESHOLD_UPDATE_ERROR' },
      { status: 500 }
    )
  }
}

async function getPortfolioThresholds(portfolioId: string) {
  const config = await prisma.userConfig.findUnique({
    where: { key: `portfolio_risk_thresholds_${portfolioId}` },
  })

  if (config) {
    try {
      return JSON.parse(config.value)
    } catch {
      return getDefaultThresholds()
    }
  }

  return getDefaultThresholds()
}

async function fetchPortfolioHistory(portfolioId: string): Promise<EquityPoint[]> {
  // In a real implementation, this would fetch historical portfolio values
  // For now, generate mock data
  const points: EquityPoint[] = []
  const days = 90
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    // Random walk for equity curve
    const baseValue = 100000
    const randomWalk = Math.sin(i / 10) * 5000 + (Math.random() - 0.5) * 2000
    points.push({
      date,
      value: baseValue + randomWalk,
    })
  }

  return points
}

async function fetchRiskHistory(
  portfolioId: string
): Promise<{ date: string; var95: number; drawdown: number }[]> {
  // In a real implementation, fetch from RiskAlertLog or compute historical metrics
  const history: { date: string; var95: number; drawdown: number }[] = []
  const days = 30
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    history.push({
      date: date.toISOString().split('T')[0],
      var95: 0.02 + Math.random() * 0.03,
      drawdown: Math.random() * 0.1,
    })
  }

  return history
}

function calculateCurrentMetrics(
  positions: PortfolioState['positions'],
  history: EquityPoint[],
  totalValue: number
): RiskMetrics {
  // Calculate max concentration
  const maxConcentration = totalValue > 0
    ? Math.max(...positions.map(p => p.currentValue / totalValue))
    : 0

  // Calculate returns from history
  const returns = history.length >= 2
    ? history.slice(1).map((point, i) => (point.value - history[i].value) / history[i].value)
    : []

  // Calculate volatility
  let annualizedVolatility = 0
  if (returns.length >= 2) {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    annualizedVolatility = Math.sqrt(variance) * Math.sqrt(252)
  }

  // Calculate drawdown
  let currentDrawdown = 0
  if (history.length >= 2) {
    let peak = history[0].value
    for (const point of history) {
      if (point.value > peak) {
        peak = point.value
      }
      const drawdown = (peak - point.value) / peak
      if (drawdown > currentDrawdown) {
        currentDrawdown = drawdown
      }
    }
  }

  // Calculate VaR (simplified)
  let var95 = 0
  if (returns.length >= 100) {
    const sorted = [...returns].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.05)
    var95 = -sorted[index]
  }

  return {
    currentDrawdown,
    maxConcentration,
    annualizedVolatility,
    var95,
    avgCorrelation: 0, // Would require individual stock returns
  }
}
