import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AllocationOptimizer } from '@/lib/portfolio/allocation'
import { RiskMonitor, PortfolioState, EquityPoint } from '@/lib/portfolio/risk-monitor'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { method } = body

    if (!method || !['risk_parity', 'min_variance', 'max_sharpe', 'equal_weight'].includes(method)) {
      return NextResponse.json(
        { error: 'Valid method is required (risk_parity, min_variance, max_sharpe, equal_weight)' },
        { status: 400 }
      )
    }

    // Get portfolio with positions
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        positions: true,
      },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    // Get current prices and build data structures
    const currentPositions = new Map<string, number>()
    const prices = new Map<string, number>()
    const returns = new Map<string, number[]>()
    const volatilities = new Map<string, number>()
    const portfolioState: PortfolioState = {
      positions: [],
      totalValue: 0,
    }

    for (const position of portfolio.positions) {
      const response = await fetch(
        `http://localhost:3000/api/quotes?symbol=${position.symbol}`
      )
      const quote = response.ok ? await response.json() : {}
      const currentPrice = quote.price || quote.regularMarketPrice || position.avgCost

      currentPositions.set(position.symbol, position.quantity)
      prices.set(position.symbol, currentPrice)

      portfolioState.positions.push({
        symbol: position.symbol,
        quantity: position.quantity,
        currentPrice,
        currentValue: position.quantity * currentPrice,
      })

      portfolioState.totalValue += position.quantity * currentPrice

      // Fetch historical data for returns and volatility
      const historyResponse = await fetch(
        `http://localhost:3000/api/history?symbol=${position.symbol}&range=1y`
      )
      const history = historyResponse.ok ? await historyResponse.json() : []

      const symbolReturns: number[] = []
      if (history.length >= 2) {
        for (let i = 1; i < history.length; i++) {
          const dailyReturn = (history[i].close - history[i - 1].close) / history[i - 1].close
          symbolReturns.push(dailyReturn)
        }
      }

      returns.set(position.symbol, symbolReturns)

      // Calculate volatility
      if (symbolReturns.length >= 2) {
        const mean = symbolReturns.reduce((sum, r) => sum + r, 0) / symbolReturns.length
        const variance = symbolReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / symbolReturns.length
        volatilities.set(position.symbol, Math.sqrt(variance) * Math.sqrt(252))
      } else {
        volatilities.set(position.symbol, 0.2) // Default 20% volatility
      }
    }

    // Calculate correlations
    const optimizer = new AllocationOptimizer()
    const correlations = optimizer.calculateCorrelations(returns)

    // Generate allocation suggestion
    const suggestion = optimizer.generateSuggestion(
      method,
      currentPositions,
      prices,
      returns,
      volatilities,
      correlations
    )

    // Calculate current risk
    const history: EquityPoint[] = [] // Would fetch actual portfolio history
    const riskMonitor = new RiskMonitor({
      maxDrawdown: 0.15,
      maxConcentration: 0.30,
      maxVolatility: 0.25,
      maxVaR: 0.05,
      correlationWarning: 0.80,
    })

    const currentAlerts = riskMonitor.checkRisk(portfolioState, history)
    const currentRisk = currentAlerts.length > 0
      ? Math.max(...currentAlerts.map(a => a.current / a.threshold))
      : 0.5

    // Calculate projected risk (simplified)
    const projectedRisk = currentRisk * 0.85 // Assume 15% risk reduction
    const riskReduction = currentRisk > 0 ? (currentRisk - projectedRisk) / currentRisk : 0

    return NextResponse.json({
      suggestion: {
        currentWeights: Object.fromEntries(suggestion.currentWeights),
        suggestedWeights: Object.fromEntries(suggestion.suggestedWeights),
        trades: suggestion.trades,
        reason: suggestion.reason,
        expectedImprovement: suggestion.expectedImprovement,
      },
      currentRisk,
      projectedRisk,
      riskReduction,
    })
  } catch (error) {
    console.error('Error optimizing portfolio:', error)
    return NextResponse.json(
      { error: 'Failed to optimize portfolio' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get portfolio
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        positions: true,
      },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    // Get optimization history
    const history = await prisma.userConfig.findUnique({
      where: { key: `portfolio_optimization_history_${id}` },
    })

    const optimizationHistory = history ? JSON.parse(history.value) : []

    return NextResponse.json({
      portfolioId: id,
      availableMethods: [
        {
          id: 'risk_parity',
          name: '风险平价',
          description: '每个资产对组合风险的贡献相等',
        },
        {
          id: 'min_variance',
          name: '最小方差',
          description: '在给定收益水平下最小化组合波动率',
        },
        {
          id: 'max_sharpe',
          name: '最大夏普比率',
          description: '优化风险调整后的收益',
        },
        {
          id: 'equal_weight',
          name: '等权重',
          description: '简单分散化，每个资产权重相同',
        },
      ],
      optimizationHistory,
    })
  } catch (error) {
    console.error('Error fetching optimization options:', error)
    return NextResponse.json(
      { error: 'Failed to fetch optimization options' },
      { status: 500 }
    )
  }
}
