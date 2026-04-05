import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { FactorLibrary } from '@/lib/factors/factor-library'
import {
  ScreeningEngine,
  ScreeningStrategy,
  ScreeningRule,
  ScreeningResult,
} from '@/lib/factors/screening-engine'
import { handleApiError, Errors } from '@/lib/errors'

const factorLibrary = new FactorLibrary()
const screeningEngine = new ScreeningEngine(factorLibrary)

interface OptimizationRequest {
  strategy: ScreeningStrategy
  symbols: string[]
  scoringMethod: 'weighted_sum' | 'rank_sum' | 'threshold_count'
}

interface OptimizationResult {
  topSymbols: ScreeningResult[]
  factorContributions: {
    factorId: string
    contribution: number
    avgScore: number
  }[]
  methodComparison?: {
    weightedRankCorrelation: number
    rankThresholdCorrelation: number
  }
}

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

function calculateRankCorrelation(scoresA: number[], scoresB: number[]): number {
  const n = scoresA.length
  if (n === 0 || n !== scoresB.length) return 0

  const getRanks = (arr: number[]): number[] => {
    const sorted = arr
      .map((v, i) => ({ value: v, index: i }))
      .sort((a, b) => b.value - a.value)
    const ranks = new Array(arr.length)
    sorted.forEach((item, rank) => {
      ranks[item.index] = rank + 1
    })
    return ranks
  }

  const ranksA = getRanks(scoresA)
  const ranksB = getRanks(scoresB)

  const meanRank = (n + 1) / 2
  let numerator = 0
  let denomA = 0
  let denomB = 0

  for (let i = 0; i < n; i++) {
    const diffA = ranksA[i] - meanRank
    const diffB = ranksB[i] - meanRank
    numerator += diffA * diffB
    denomA += diffA * diffA
    denomB += diffB * diffB
  }

  if (denomA === 0 || denomB === 0) return 0

  return numerator / Math.sqrt(denomA * denomB)
}

function calculateFactorContributions(
  results: ScreeningResult[]
): { factorId: string; contribution: number; avgScore: number }[] {
  if (results.length === 0) return []

  const factorIds = new Set<string>()
  results.forEach((result) => {
    result.factorValues.forEach((_, factorId) => {
      factorIds.add(factorId)
    })
  })

  const contributions: { factorId: string; contribution: number; avgScore: number }[] = []

  factorIds.forEach((factorId) => {
    const values: number[] = []
    results.forEach((result) => {
      const value = result.factorValues.get(factorId)
      if (value !== undefined) {
        values.push(value)
      }
    })

    if (values.length > 1) {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length

      contributions.push({
        factorId,
        contribution: variance,
        avgScore: mean,
      })
    }
  })

  const totalVariance = contributions.reduce((sum, c) => sum + c.contribution, 0)
  if (totalVariance > 0) {
    contributions.forEach((c) => {
      c.contribution = (c.contribution / totalVariance) * 100
    })
  }

  return contributions.sort((a, b) => b.contribution - a.contribution)
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizationRequest = await request.json()
    const { strategy, symbols, scoringMethod } = body

    if (!strategy || !symbols || !Array.isArray(symbols) || !scoringMethod) {
      throw Errors.badRequest('strategy, symbols 数组和 scoringMethod 是必填项')
    }

    // Validate strategy structure
    if (!strategy.rules || strategy.rules.length === 0) {
      throw Errors.badRequest('策略必须至少包含一个规则')
    }

    const strategyWithMethod: ScreeningStrategy = {
      ...strategy,
      scoringMethod,
    }

    const results = await screeningEngine.screen(
      strategyWithMethod,
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

    const factorContributions = calculateFactorContributions(results)

    let methodComparison:
      | { weightedRankCorrelation: number; rankThresholdCorrelation: number }
      | undefined

    if (results.length >= 3) {
      const weightedStrategy: ScreeningStrategy = {
        ...strategy,
        scoringMethod: 'weighted_sum',
      }
      const rankStrategy: ScreeningStrategy = {
        ...strategy,
        scoringMethod: 'rank_sum',
      }
      const thresholdStrategy: ScreeningStrategy = {
        ...strategy,
        scoringMethod: 'threshold_count',
      }

      const weightedResults = await screeningEngine.screen(
        weightedStrategy,
        symbols,
        async (symbol: string) => {
          try {
            const data = await getHistoricalData(symbol, '1y')
            return { data, symbol }
          } catch (error) {
            return { data: generateMockData(), symbol }
          }
        }
      )

      const rankResults = await screeningEngine.screen(
        rankStrategy,
        symbols,
        async (symbol: string) => {
          try {
            const data = await getHistoricalData(symbol, '1y')
            return { data, symbol }
          } catch (error) {
            return { data: generateMockData(), symbol }
          }
        }
      )

      const thresholdResults = await screeningEngine.screen(
        thresholdStrategy,
        symbols,
        async (symbol: string) => {
          try {
            const data = await getHistoricalData(symbol, '1y')
            return { data, symbol }
          } catch (error) {
            return { data: generateMockData(), symbol }
          }
        }
      )

      const symbolScores = new Map<string, { weighted: number; rank: number; threshold: number }>()

      weightedResults.forEach((r) => {
        if (!symbolScores.has(r.symbol)) {
          symbolScores.set(r.symbol, { weighted: 0, rank: 0, threshold: 0 })
        }
        symbolScores.get(r.symbol)!.weighted = r.score
      })

      rankResults.forEach((r) => {
        if (!symbolScores.has(r.symbol)) {
          symbolScores.set(r.symbol, { weighted: 0, rank: 0, threshold: 0 })
        }
        symbolScores.get(r.symbol)!.rank = r.score
      })

      thresholdResults.forEach((r) => {
        if (!symbolScores.has(r.symbol)) {
          symbolScores.set(r.symbol, { weighted: 0, rank: 0, threshold: 0 })
        }
        symbolScores.get(r.symbol)!.threshold = r.score
      })

      const commonSymbols = Array.from(symbolScores.entries()).filter(
        ([_, scores]) => scores.weighted > 0 && scores.rank > 0 && scores.threshold > 0
      )

      if (commonSymbols.length >= 3) {
        const weightedScores = commonSymbols.map(([_, s]) => s.weighted)
        const rankScores = commonSymbols.map(([_, s]) => s.rank)
        const thresholdScores = commonSymbols.map(([_, s]) => s.threshold)

        methodComparison = {
          weightedRankCorrelation: calculateRankCorrelation(weightedScores, rankScores),
          rankThresholdCorrelation: calculateRankCorrelation(rankScores, thresholdScores),
        }
      }
    }

    const optimizationResult: OptimizationResult = {
      topSymbols: results.slice(0, 20),
      factorContributions,
      methodComparison,
    }

    return NextResponse.json(optimizationResult)
  } catch (error) {
    return handleApiError(error)
  }
}
