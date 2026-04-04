import { PortfolioBacktestEngine, BacktestConfig, BacktestResult } from './engine'

export interface WalkForwardConfig {
  trainPeriod: number
  testPeriod: number
  stepDays: number
}

export interface WalkForwardResult {
  trainResults: BacktestResult[]
  testResults: BacktestResult[]
  trainMetrics: {
    avgSharpe: number
    avgReturn: number
  }
  testMetrics: {
    avgSharpe: number
    avgReturn: number
    consistency: number
  }
  degradation: number
}

export class WalkForwardAnalyzer {
  constructor(private engine: PortfolioBacktestEngine) {}

  async analyze(config: BacktestConfig, wfConfig: WalkForwardConfig): Promise<WalkForwardResult> {
    if (!config.startDate || !config.endDate) {
      throw new Error('Walk-forward analysis requires startDate and endDate')
    }
    const startDate = config.startDate instanceof Date ? config.startDate : new Date(config.startDate)
    const endDate = config.endDate instanceof Date ? config.endDate : new Date(config.endDate)

    const trainResults: BacktestResult[] = []
    const testResults: BacktestResult[] = []

    let trainStart = new Date(startDate)

    while (true) {
      const trainEnd = new Date(trainStart)
      trainEnd.setDate(trainEnd.getDate() + wfConfig.trainPeriod)

      if (trainEnd > endDate) break

      const testStart = new Date(trainEnd)
      const testEnd = new Date(testStart)
      testEnd.setDate(testEnd.getDate() + wfConfig.testPeriod)

      if (testEnd > endDate) break

      const trainConfig = { ...config, startDate: trainStart, endDate: trainEnd }
      const trainResult = await this.engine.run(trainConfig)
      trainResults.push(trainResult)

      const testConfig = { ...config, startDate: testStart, endDate: testEnd }
      const testResult = await this.engine.run(testConfig)
      testResults.push(testResult)

      trainStart.setDate(trainStart.getDate() + wfConfig.stepDays)
    }

    return this.calculateMetrics(trainResults, testResults)
  }

  private calculateMetrics(train: BacktestResult[], test: BacktestResult[]): WalkForwardResult {
    const trainSharpe = train.map(r => r.metrics.sharpeRatio)
    const trainReturn = train.map(r => r.metrics.totalReturn)
    const testSharpe = test.map(r => r.metrics.sharpeRatio)
    const testReturn = test.map(r => r.metrics.totalReturn)

    const avgTrainSharpe = trainSharpe.reduce((a, b) => a + b, 0) / trainSharpe.length
    const avgTestSharpe = testSharpe.reduce((a, b) => a + b, 0) / testSharpe.length

    return {
      trainResults: train,
      testResults: test,
      trainMetrics: {
        avgSharpe: avgTrainSharpe,
        avgReturn: trainReturn.reduce((a, b) => a + b, 0) / trainReturn.length,
      },
      testMetrics: {
        avgSharpe: avgTestSharpe,
        avgReturn: testReturn.reduce((a, b) => a + b, 0) / testReturn.length,
        consistency: test.filter((_, i) =>
          test[i].metrics.sharpeRatio >= train[i].metrics.sharpeRatio
        ).length / test.length,
      },
      degradation: ((avgTrainSharpe - avgTestSharpe) / avgTrainSharpe) * 100,
    }
  }
}
