import { PortfolioBacktestEngine, BacktestConfig, BacktestResult } from './engine'

export interface GridSearchConfig {
  paramName: string
  start: number
  end: number
  step: number
}

export interface GridSearchResult {
  params: Record<string, number>
  metrics: {
    totalReturn: number
    sharpeRatio: number
    maxDrawdown: number
    winRate: number
  }
  rank: number
}

export class GridSearchOptimizer {
  constructor(private engine: PortfolioBacktestEngine) {}

  async optimize(
    baseConfig: BacktestConfig,
    searchParams: GridSearchConfig[],
    metricToOptimize: 'sharpeRatio' | 'totalReturn' | 'maxDrawdown' = 'sharpeRatio'
  ): Promise<{
    bestParams: Record<string, number>
    bestResult: GridSearchResult
    allResults: GridSearchResult[]
  }> {
    const combinations = this.generateCombinations(searchParams)
    const results: GridSearchResult[] = []

    for (const params of combinations) {
      const config = this.mergeConfig(baseConfig, params)
      const result = await this.engine.run(config)

      results.push({
        params,
        metrics: {
          totalReturn: result.metrics.totalReturn,
          sharpeRatio: result.metrics.sharpeRatio,
          maxDrawdown: result.metrics.maxDrawdown,
          winRate: result.metrics.winRate,
        },
        rank: 0,
      })
    }

    results.sort((a, b) => {
      const aVal = a.metrics[metricToOptimize]
      const bVal = b.metrics[metricToOptimize]
      return metricToOptimize === 'maxDrawdown'
        ? bVal - aVal
        : aVal - bVal
    })

    results.forEach((r, i) => r.rank = i + 1)

    return {
      bestParams: results[0].params,
      bestResult: results[0],
      allResults: results,
    }
  }

  private generateCombinations(params: GridSearchConfig[]): Record<string, number>[] {
    const ranges = params.map(p => {
      const values: number[] = []
      for (let v = p.start; v <= p.end; v += p.step) {
        values.push(v)
      }
      return { name: p.paramName, values }
    })

    const result: Record<string, number>[] = [{}]
    for (const range of ranges) {
      const newResult: Record<string, number>[] = []
      for (const combo of result) {
        for (const val of range.values) {
          newResult.push({ ...combo, [range.name]: val })
        }
      }
      result.length = 0
      result.push(...newResult)
    }

    return result
  }

  private mergeConfig(base: BacktestConfig, params: Record<string, number>): BacktestConfig {
    return {
      ...base,
      strategies: base.strategies.map(s => ({
        ...s,
        parameters: { ...s.parameters, ...params },
      })),
    }
  }
}
