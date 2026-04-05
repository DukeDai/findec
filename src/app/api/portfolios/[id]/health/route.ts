import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePortfolioHealthScore, HoldingData, PriceData } from '@/lib/portfolio/health-score'
import { getHistoricalData, getQuote } from '@/lib/yahoo-finance'

interface HistoricalPrice {
  date: Date
  close: number
  volume: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        positions: true,
      },
    })

    if (!portfolio) {
      return NextResponse.json(
        { error: '组合不存在' },
        { status: 404 }
      )
    }

    if (portfolio.positions.length === 0) {
      return NextResponse.json({
        total: 0,
        concentration: {
          score: 0,
          topHoldingWeight: 0,
          top5Weight: 0,
        },
        volatility: {
          score: 0,
          portfolioVol: 0,
        },
        correlation: {
          score: 0,
          avgCorrelation: 0,
        },
        liquidity: {
          score: 0,
          avgVolume: 0,
        },
        riskAdjustedReturn: {
          score: 0,
          sharpeRatio: 0,
        },
        breakdown: '数据不足：组合为空',
        suggestions: ['请添加持仓以计算健康度评分'],
      })
    }

    const holdings: HoldingData[] = []
    let portfolioValue = 0

    for (const position of portfolio.positions) {
      try {
        const quote = await getQuote(position.symbol)
        const currentPrice = quote.price || position.currentPrice

        const historicalPrices = await getHistoricalData(position.symbol, '1y')

        const historicalData: PriceData[] = historicalPrices.map((p) => ({
          date: p.date,
          close: p.close,
          volume: p.volume,
        }))

        holdings.push({
          symbol: position.symbol,
          quantity: position.quantity,
          currentPrice,
          historicalData,
        })

        portfolioValue += position.quantity * currentPrice
      } catch {
        holdings.push({
          symbol: position.symbol,
          quantity: position.quantity,
          currentPrice: position.currentPrice,
          historicalData: [],
        })

        portfolioValue += position.quantity * position.currentPrice
      }
    }

    const healthScore = calculatePortfolioHealthScore(holdings, portfolioValue)

    return NextResponse.json(healthScore)
  } catch (error) {
    console.error('Error calculating portfolio health:', error)
    return NextResponse.json(
      { error: '计算组合健康度失败' },
      { status: 500 }
    )
  }
}
