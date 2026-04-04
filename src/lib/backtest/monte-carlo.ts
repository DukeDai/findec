export interface MonteCarloConfig {
  simulations: number
  confidenceLevels: number[]
}

export interface MonteCarloResult {
  finalValues: number[]
  percentiles: Record<number, number>
  probabilityOfProfit: number
  averageReturn: number
  medianReturn: number
  stdDeviation: number
  var: Record<number, number>
  cvar: Record<number, number>
  maxDrawdownDistribution: number[]
  averageMaxDrawdown: number
}

export class MonteCarloSimulator {
  simulate(
    equityCurve: { date: Date; value: number }[],
    trades: { type: 'BUY' | 'SELL'; value: number }[],
    config: MonteCarloConfig = { simulations: 1000, confidenceLevels: [0.05, 0.25, 0.5, 0.75, 0.95] }
  ): MonteCarloResult {
    const returns = this.calculateDailyReturns(equityCurve)
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const stdReturn = this.calculateStdDev(returns)

    const finalValues: number[] = []
    const maxDrawdowns: number[] = []
    const initialValue = equityCurve[0].value

    for (let i = 0; i < config.simulations; i++) {
      let value = initialValue
      let peak = value
      let maxDrawdown = 0

      for (let day = 0; day < returns.length; day++) {
        const randomReturn = this.boxMullerRandom() * stdReturn + meanReturn
        value *= (1 + randomReturn)

        if (value > peak) peak = value
        const drawdown = (peak - value) / peak
        if (drawdown > maxDrawdown) maxDrawdown = drawdown
      }

      finalValues.push(value)
      maxDrawdowns.push(maxDrawdown)
    }

    finalValues.sort((a, b) => a - b)
    maxDrawdowns.sort((a, b) => a - b)

    const percentiles = this.calculatePercentiles(finalValues, config.confidenceLevels)
    const profitCount = finalValues.filter(v => v > initialValue).length

    return {
      finalValues,
      percentiles,
      probabilityOfProfit: profitCount / config.simulations,
      averageReturn: finalValues.reduce((a, b) => a + b, 0) / finalValues.length,
      medianReturn: finalValues[Math.floor(finalValues.length / 2)],
      stdDeviation: this.calculateStdDev(finalValues),
      var: this.calculateVaR(finalValues, config.confidenceLevels),
      cvar: this.calculateCVaR(finalValues, config.confidenceLevels),
      maxDrawdownDistribution: maxDrawdowns,
      averageMaxDrawdown: maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length,
    }
  }

  private calculateDailyReturns(curve: { value: number }[]): number[] {
    const returns: number[] = []
    for (let i = 1; i < curve.length; i++) {
      returns.push((curve[i].value - curve[i-1].value) / curve[i-1].value)
    }
    return returns
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const sqDiffs = values.map(v => Math.pow(v - mean, 2))
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length)
  }

  private boxMullerRandom(): number {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  private calculatePercentiles(values: number[], levels: number[]): Record<number, number> {
    const result: Record<number, number> = {}
    for (const level of levels) {
      const idx = Math.floor(values.length * level)
      result[level] = values[idx]
    }
    return result
  }

  private calculateVaR(values: number[], levels: number[]): Record<number, number> {
    return this.calculatePercentiles(values, levels)
  }

  private calculateCVaR(values: number[], levels: number[]): Record<number, number> {
    const result: Record<number, number> = {}
    for (const level of levels) {
      const idx = Math.floor(values.length * level)
      const tail = values.slice(0, idx)
      result[level] = tail.length > 0
        ? tail.reduce((a, b) => a + b, 0) / tail.length
        : values[0]
    }
    return result
  }
}
