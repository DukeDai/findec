export interface FactorPerformance {
  factorId: string
  period: string
  ic: number
  icMean: number
  icStd: number
  icIr: number
  positiveRatio: number
  decayHalfLife: number
  observations: number
}

export interface FactorMetricsPoint {
  date: Date
  value: number
  forwardReturn: number
}

export class FactorMetricsCalculator {
  calculateIC(factorValues: number[], forwardReturns: number[]): number {
    if (factorValues.length !== forwardReturns.length || factorValues.length < 2) {
      return 0
    }

    const n = factorValues.length
    const meanX = factorValues.reduce((a, b) => a + b, 0) / n
    const meanY = forwardReturns.reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let denomX = 0
    let denomY = 0

    for (let i = 0; i < n; i++) {
      const diffX = factorValues[i] - meanX
      const diffY = forwardReturns[i] - meanY
      numerator += diffX * diffY
      denomX += diffX * diffX
      denomY += diffY * diffY
    }

    if (denomX === 0 || denomY === 0) return 0

    return numerator / Math.sqrt(denomX * denomY)
  }

  calculatePerformance(
    factorId: string,
    history: FactorMetricsPoint[]
  ): FactorPerformance {
    if (history.length < 5) {
      return {
        factorId,
        period: '',
        ic: 0,
        icMean: 0,
        icStd: 0,
        icIr: 0,
        positiveRatio: 0,
        decayHalfLife: 0,
        observations: history.length,
      }
    }

    const values = history.map(h => h.value)
    const returns = history.map(h => h.forwardReturn)

    const ic = this.calculateIC(values, returns)

    const windowSize = Math.min(20, Math.floor(history.length / 5))
    const rollingICs: number[] = []

    for (let i = windowSize; i < history.length; i++) {
      const windowValues = values.slice(i - windowSize, i)
      const windowReturns = returns.slice(i - windowSize, i)
      const windowIC = this.calculateIC(windowValues, windowReturns)
      if (!isNaN(windowIC)) {
        rollingICs.push(windowIC)
      }
    }

    const icMean = rollingICs.length > 0
      ? rollingICs.reduce((a, b) => a + b, 0) / rollingICs.length
      : 0
    const icStd = rollingICs.length > 1
      ? Math.sqrt(rollingICs.reduce((sum, val) => sum + Math.pow(val - icMean, 2), 0) / (rollingICs.length - 1))
      : 0
    const icIr = icStd > 0 ? icMean / icStd : 0

    const positiveCount = rollingICs.filter(ic => ic > 0).length
    const positiveRatio = rollingICs.length > 0 ? positiveCount / rollingICs.length : 0

    const decay = this.analyzeDecay(values, returns)

    const startDate = history[0].date
    const endDate = history[history.length - 1].date
    const periodStr = `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`

    return {
      factorId,
      period: periodStr,
      ic,
      icMean,
      icStd,
      icIr,
      positiveRatio,
      decayHalfLife: decay.halfLife,
      observations: history.length,
    }
  }

  analyzeDecay(
    factorValues: number[],
    forwardReturns: number[]
  ): { decayCurve: number[]; halfLife: number } {
    const decayCurve: number[] = []
    const maxLag = Math.min(60, Math.floor(factorValues.length / 4))

    if (maxLag < 2) {
      return { decayCurve: [1], halfLife: 0 }
    }

    const baseIC = Math.abs(this.calculateIC(factorValues, forwardReturns))
    decayCurve.push(baseIC > 0 ? 1 : 0)

    for (let lag = 1; lag < maxLag; lag++) {
      const laggedReturns = forwardReturns.slice(lag)
      const laggedValues = factorValues.slice(0, factorValues.length - lag)

      if (laggedValues.length < 5) break

      const lagIC = Math.abs(this.calculateIC(laggedValues, laggedReturns))
      const relativeStrength = baseIC > 0 ? lagIC / baseIC : 0
      decayCurve.push(relativeStrength)
    }

    let halfLife = 0
    for (let i = 0; i < decayCurve.length; i++) {
      if (decayCurve[i] <= 0.5) {
        halfLife = i
        break
      }
    }

    if (halfLife === 0 && decayCurve.length > 1) {
      const firstValue = decayCurve[0]
      const lastValue = decayCurve[decayCurve.length - 1]
      if (firstValue > lastValue && lastValue > 0) {
        const ratio = lastValue / firstValue
        const days = decayCurve.length - 1
        halfLife = days * (Math.log(0.5) / Math.log(ratio))
      }
    }

    return { decayCurve, halfLife }
  }

  calculateRankIC(factorValues: number[], forwardReturns: number[]): number {
    if (factorValues.length !== forwardReturns.length || factorValues.length < 2) {
      return 0
    }

    const n = factorValues.length
    const rankX = this.getRanks(factorValues)
    const rankY = this.getRanks(forwardReturns)

    return this.calculateIC(rankX, rankY)
  }

  private getRanks(values: number[]): number[] {
    const indexed = values.map((v, i) => ({ value: v, index: i }))
    indexed.sort((a, b) => a.value - b.value)

    const ranks = new Array(values.length)
    for (let i = 0; i < indexed.length; i++) {
      ranks[indexed[i].index] = i + 1
    }

    return ranks
  }

  calculateInformationCoefficient(
    factorValues: number[],
    forwardReturns: number[]
  ): { pearson: number; spearman: number } {
    const pearson = this.calculateIC(factorValues, forwardReturns)
    const spearman = this.calculateRankIC(factorValues, forwardReturns)

    return { pearson, spearman }
  }

  calculateTurnover(
    currentFactors: Map<string, number>,
    previousFactors: Map<string, number>,
    topN: number = 50
  ): number {
    const currentSymbols = Array.from(currentFactors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([symbol]) => symbol)

    const previousSymbols = Array.from(previousFactors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([symbol]) => symbol)

    const currentSet = new Set(currentSymbols)
    const previousSet = new Set(previousSymbols)

    let common = 0
    for (const symbol of currentSet) {
      if (previousSet.has(symbol)) {
        common++
      }
    }

    return currentSymbols.length > 0 ? 1 - common / currentSymbols.length : 0
  }
}
