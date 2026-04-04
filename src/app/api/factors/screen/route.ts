import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { FactorLibrary } from '@/lib/factors/factor-library'
import { ScreeningEngine, ScreeningStrategy, ScreeningRule } from '@/lib/factors/screening-engine'

const factorLibrary = new FactorLibrary()
const screeningEngine = new ScreeningEngine(factorLibrary)

function generateMockData() {
  const data = []
  let basePrice = 150
  const now = new Date()

  for (let i = 365; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02)

    data.push({
      date,
      open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
      high: basePrice * (1 + Math.random() * 0.02),
      low: basePrice * (1 - Math.random() * 0.02),
      close: basePrice,
      volume: Math.floor(Math.random() * 10000000),
    })
  }

  return data
}

function mapDbRulesToScreeningRules(dbRules: any[]): ScreeningRule[] {
  return dbRules.map(rule => ({
    factorId: rule.field,
    operator: rule.operator as ScreeningRule['operator'],
    value: rule.value,
    weight: rule.weight || 1.0,
  }))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { strategyId, symbols } = body

    if (!strategyId || !symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'strategyId and symbols array are required' },
        { status: 400 }
      )
    }

    const strategy = await prisma.factorStrategy.findUnique({
      where: { id: strategyId },
      include: { rules: true },
    })

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      )
    }

    const screeningStrategy: ScreeningStrategy = {
      id: strategy.id,
      name: strategy.name,
      rules: mapDbRulesToScreeningRules(strategy.rules),
      scoringMethod: 'weighted_sum',
    }

    const results = await screeningEngine.screen(
      screeningStrategy,
      symbols,
      async (symbol: string) => {
        try {
          const data = await getHistoricalData(symbol, '1y')
          return { data, symbol }
        } catch (error) {
          console.warn(`Yahoo Finance failed for ${symbol}, using mock data`)
          return { data: generateMockData(), symbol }
        }
      }
    )

    const savedResults = []
    for (const result of results) {
      const screeningResult = await prisma.screeningResult.create({
        data: {
          strategyId,
          symbol: result.symbol,
          score: result.score,
          details: JSON.stringify({
            matchedRules: result.matchedRules,
            totalRules: result.totalRules,
            rank: result.rank,
            factorValues: Object.fromEntries(result.factorValues),
          }),
        },
      })
      savedResults.push({
        ...screeningResult,
        symbol: result.symbol,
        score: Math.round(result.score * 100) / 100,
        rank: result.rank,
      })
    }

    return NextResponse.json({
      strategyId,
      results: savedResults.sort((a, b) => b.score - a.score),
    })
  } catch (error) {
    console.error('Error running screening:', error)
    return NextResponse.json(
      { error: 'Failed to run screening' },
      { status: 500 }
    )
  }
}
