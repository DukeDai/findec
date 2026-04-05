import { FactorLibrary, FactorValue } from './factor-library'
import { createLogger } from '@/lib/logger'

const logger = createLogger('screening-engine')

export interface ScreeningRule {
  factorId: string
  operator: '>' | '<' | '>=' | '<=' | '==' | 'between'
  value: number | [number, number]
  weight: number
}

export interface ScreeningStrategy {
  id?: string
  name: string
  rules: ScreeningRule[]
  scoringMethod: 'weighted_sum' | 'rank_sum' | 'threshold_count'
}

export interface ScreeningResult {
  symbol: string
  score: number
  matchedRules: number
  totalRules: number
  factorValues: Map<string, number>
  rank?: number
}

export class ScreeningEngine {
  private factorLibrary: FactorLibrary

  constructor(factorLibrary: FactorLibrary) {
    this.factorLibrary = factorLibrary
  }

  async screen(
    strategy: ScreeningStrategy,
    symbols: string[],
    getData: (symbol: string) => Promise<{ data: any[]; symbol: string }>
  ): Promise<ScreeningResult[]> {
    const results: ScreeningResult[] = []

    for (const symbol of symbols) {
      try {
        const { data } = await getData(symbol)
        if (!data || data.length === 0) continue

        const factorValues = this.calculateFactorValues(data, symbol)
        const scoredResult = this.scoreSymbol(strategy, symbol, factorValues)

        if (scoredResult) {
          results.push(scoredResult)
        }
      } catch (error) {
        logger.error(`Error screening ${symbol}`, error)
      }
    }

    results.sort((a, b) => b.score - a.score)

    results.forEach((result, index) => {
      result.rank = index + 1
    })

    return results
  }

  private calculateFactorValues(data: any[], symbol: string): Map<string, number> {
    const values = new Map<string, number>()
    const allFactors = this.factorLibrary.calculateFactors(data, symbol)

    for (const factor of allFactors) {
      values.set(factor.factorId, factor.value)
    }

    return values
  }

  private scoreSymbol(
    strategy: ScreeningStrategy,
    symbol: string,
    factorValues: Map<string, number>
  ): ScreeningResult | null {
    const score = this.calculateScore(strategy, factorValues)
    const matchedRules = this.countMatchedRules(strategy.rules, factorValues)

    return {
      symbol,
      score,
      matchedRules,
      totalRules: strategy.rules.length,
      factorValues: new Map(factorValues),
    }
  }

  private calculateScore(strategy: ScreeningStrategy, values: Map<string, number>): number {
    switch (strategy.scoringMethod) {
      case 'weighted_sum':
        return this.weightedSumScore(strategy.rules, values)
      case 'rank_sum':
        return this.rankSumScore(strategy.rules, values)
      case 'threshold_count':
        return this.thresholdCountScore(strategy.rules, values)
      default:
        return this.weightedSumScore(strategy.rules, values)
    }
  }

  private weightedSumScore(rules: ScreeningRule[], values: Map<string, number>): number {
    let totalWeight = 0
    let weightedScore = 0

    for (const rule of rules) {
      const value = values.get(rule.factorId)
      if (value === undefined) continue

      const normalizedValue = this.normalizeValue(value, rule)
      totalWeight += rule.weight
      weightedScore += normalizedValue * rule.weight
    }

    return totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0
  }

  private rankSumScore(rules: ScreeningRule[], values: Map<string, number>): number {
    let totalScore = 0
    let validRules = 0

    for (const rule of rules) {
      const value = values.get(rule.factorId)
      if (value === undefined) continue

      const percentile = this.calculatePercentile(value, rule)
      totalScore += percentile
      validRules++
    }

    return validRules > 0 ? (totalScore / validRules) * 100 : 0
  }

  private thresholdCountScore(rules: ScreeningRule[], values: Map<string, number>): number {
    let matchedCount = 0
    let validRules = 0

    for (const rule of rules) {
      const value = values.get(rule.factorId)
      if (value === undefined) continue

      validRules++
      if (this.evaluateRule(rule, value)) {
        matchedCount++
      }
    }

    return validRules > 0 ? (matchedCount / validRules) * 100 : 0
  }

  private countMatchedRules(rules: ScreeningRule[], values: Map<string, number>): number {
    let matched = 0
    for (const rule of rules) {
      const value = values.get(rule.factorId)
      if (value !== undefined && this.evaluateRule(rule, value)) {
        matched++
      }
    }
    return matched
  }

  private evaluateRule(rule: ScreeningRule, value: number): boolean {
    switch (rule.operator) {
      case '>':
        return value > (rule.value as number)
      case '<':
        return value < (rule.value as number)
      case '>=':
        return value >= (rule.value as number)
      case '<=':
        return value <= (rule.value as number)
      case '==':
        return value === (rule.value as number)
      case 'between': {
        const [min, max] = rule.value as [number, number]
        return value >= min && value <= max
      }
      default:
        return false
    }
  }

  private normalizeValue(value: number, rule: ScreeningRule): number {
    switch (rule.operator) {
      case '>':
      case '>=':
        return value >= (rule.value as number) ? 1 : Math.max(0, 1 - Math.abs(value - (rule.value as number)) / 100)
      case '<':
      case '<=':
        return value <= (rule.value as number) ? 1 : Math.max(0, 1 - Math.abs(value - (rule.value as number)) / 100)
      case '==': {
        const target = rule.value as number
        const diff = Math.abs(value - target)
        return diff < 0.01 ? 1 : Math.max(0, 1 - diff / Math.abs(target))
      }
      case 'between': {
        const [min, max] = rule.value as [number, number]
        if (value >= min && value <= max) return 1
        const center = (min + max) / 2
        const diff = Math.abs(value - center)
        const range = (max - min) / 2
        return Math.max(0, 1 - diff / (range * 2))
      }
      default:
        return 0.5
    }
  }

  private calculatePercentile(value: number, rule: ScreeningRule): number {
    const ruleValue = rule.value as number
    const diff = value - ruleValue
    const magnitude = Math.abs(diff)
    const maxExpected = Math.abs(ruleValue) * 2

    if (diff === 0) return 0.5

    switch (rule.operator) {
      case '>':
      case '>=':
        return diff > 0 ? 0.5 + Math.min(0.5, magnitude / maxExpected) : 0.5 - Math.min(0.5, magnitude / maxExpected)
      case '<':
      case '<=':
        return diff < 0 ? 0.5 + Math.min(0.5, magnitude / maxExpected) : 0.5 - Math.min(0.5, magnitude / maxExpected)
      default:
        return 0.5
    }
  }

}
