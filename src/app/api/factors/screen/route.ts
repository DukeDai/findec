import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { FactorLibrary } from '@/lib/factors/factor-library'
import { ScreeningEngine, ScreeningStrategy, ScreeningRule } from '@/lib/factors/screening-engine'
import { handleApiError, Errors } from '@/lib/errors'
import type { Prisma } from '@prisma/client'

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

function mapDbRulesToScreeningRules(dbRules: Prisma.FactorRuleGetPayload<object>[]): ScreeningRule[] {
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
    const { strategyId, symbols, scoringMethod = 'weighted_sum' } = body

    if (!strategyId || !symbols || !Array.isArray(symbols)) {
      throw Errors.badRequest('strategyId 和 symbols 数组是必填项')
    }

    if (!['weighted_sum', 'rank_sum', 'threshold_count'].includes(scoringMethod)) {
      throw Errors.badRequest('无效的 scoringMethod，必须是 weighted_sum、rank_sum 或 threshold_count')
    }

    const strategy = await prisma.factorStrategy.findUnique({
      where: { id: strategyId },
      include: { rules: true },
    })

    if (!strategy) {
      throw Errors.notFound('策略不存在')
    }

    const screeningStrategy: ScreeningStrategy = {
      id: strategy.id,
      name: strategy.name,
      rules: mapDbRulesToScreeningRules(strategy.rules),
      scoringMethod: scoringMethod as 'weighted_sum' | 'rank_sum' | 'threshold_count',
    }

    const results = await screeningEngine.screen(
      screeningStrategy,
      symbols,
      async (symbol: string) => {
        try {
          const data = await getHistoricalData(symbol, '1y')
          return { data, symbol }
        } catch {
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
    return handleApiError(error)
  }
}
