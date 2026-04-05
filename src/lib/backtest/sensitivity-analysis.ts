import type { HistoricalPrice } from '@/lib/indicators'
import { executeBacktest, BacktestConfig, BacktestResult } from '@/lib/backtest-engine'

export interface SensitivityResult {
  parameter: string
  values: number[]
  metricValues: {
    metric: string
    values: number[]
  }[]
}

export async function runSensitivityAnalysis(
  data: HistoricalPrice[],
  config: BacktestConfig,
  targetParam: string,
  paramRange: number[],
  targetMetric: 'totalReturn' | 'sharpeRatio' | 'maxDrawdown'
): Promise<SensitivityResult> {
  const metricValues: number[] = []

  for (const paramValue of paramRange) {
    const testConfig: BacktestConfig = {
      ...config,
      parameters: {
        ...config.parameters,
        [targetParam]: paramValue,
      },
    }

    const result = executeBacktest(data, testConfig)

    metricValues.push(result[targetMetric])
  }

  return {
    parameter: targetParam,
    values: paramRange,
    metricValues: [
      {
        metric: targetMetric,
        values: metricValues,
      },
    ],
  }
}
