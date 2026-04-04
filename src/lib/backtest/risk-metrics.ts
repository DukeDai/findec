export interface EquityPoint {
  date: Date
  value: number
}

export interface TradeStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxConsecutiveLosses: number
}

export interface RiskMetrics {
  totalReturn: number
  annualizedReturn: number
  volatility: number
  annualizedVolatility: number
  maxDrawdown: number
  maxDrawdownDuration: number
  currentDrawdown: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  var95: number
  var99: number
  expectedShortfall: number
  totalTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxConsecutiveLosses: number
}

export interface BenchmarkComparison {
  alpha: number
  beta: number
  trackingError: number
  informationRatio: number
  correlation: number
  rSquared: number
}

export interface TradeForStats {
  type: 'BUY' | 'SELL'
  value: number
}

export class RiskMetricsCalculator {
  calculate(equityCurve: EquityPoint[], trades: TradeForStats[] = []): RiskMetrics {
    if (equityCurve.length < 2) {
      return this.getDefaultMetrics()
    }

    const returns = this.calculateReturns(equityCurve)
    const tradeStats = this.calculateTradeStats(trades)
    const drawdownResult = this.calculateMaxDrawdown(equityCurve)
    const volatility = this.calculateVolatility(returns)
    const annualizedReturn = this.calculateAnnualizedReturn(equityCurve)

    return {
      totalReturn: this.calculateTotalReturn(equityCurve),
      annualizedReturn,
      volatility,
      annualizedVolatility: volatility * Math.sqrt(252),
      maxDrawdown: drawdownResult.drawdown,
      maxDrawdownDuration: drawdownResult.duration,
      currentDrawdown: this.calculateCurrentDrawdown(equityCurve),
      sharpeRatio: this.calculateSharpe(returns),
      sortinoRatio: this.calculateSortino(returns),
      calmarRatio: this.calculateCalmar(annualizedReturn, drawdownResult.drawdown),
      var95: this.calculateVaR(returns, 0.95),
      var99: this.calculateVaR(returns, 0.99),
      expectedShortfall: this.calculateExpectedShortfall(returns, 0.95),
      totalTrades: tradeStats.totalTrades,
      winRate: tradeStats.winRate,
      avgWin: tradeStats.avgWin,
      avgLoss: tradeStats.avgLoss,
      profitFactor: tradeStats.profitFactor,
      maxConsecutiveLosses: tradeStats.maxConsecutiveLosses,
    }
  }

  private getDefaultMetrics(): RiskMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      annualizedVolatility: 0,
      maxDrawdown: 0,
      maxDrawdownDuration: 0,
      currentDrawdown: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      var95: 0,
      var99: 0,
      expectedShortfall: 0,
      totalTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxConsecutiveLosses: 0,
    }
  }

  private calculateReturns(equityCurve: EquityPoint[]): number[] {
    const returns: number[] = []
    for (let i = 1; i < equityCurve.length; i++) {
      const current = equityCurve[i].value
      const previous = equityCurve[i - 1].value
      if (previous > 0) {
        returns.push((current - previous) / previous)
      }
    }
    return returns
  }

  private calculateTotalReturn(equityCurve: EquityPoint[]): number {
    const start = equityCurve[0].value
    const end = equityCurve[equityCurve.length - 1].value
    if (start <= 0) return 0
    return ((end - start) / start) * 100
  }

  private calculateAnnualizedReturn(equityCurve: EquityPoint[]): number {
    const start = equityCurve[0].value
    const end = equityCurve[equityCurve.length - 1].value
    const days = this.getDaysBetween(equityCurve[0].date, equityCurve[equityCurve.length - 1].date)

    if (start <= 0 || days <= 0) return 0

    const totalReturn = (end - start) / start
    const years = days / 252
    return (Math.pow(1 + totalReturn, 1 / years) - 1) * 100
  }

  private getDaysBetween(start: Date, end: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24
    return Math.max(1, Math.floor((end.getTime() - start.getTime()) / msPerDay))
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2))
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / returns.length
    return Math.sqrt(variance) * 100
  }

  private calculateMaxDrawdown(equityCurve: EquityPoint[]): { drawdown: number; duration: number } {
    let maxDrawdown = 0
    let maxDrawdownDuration = 0
    let peak = equityCurve[0].value
    let peakIndex = 0

    for (let i = 1; i < equityCurve.length; i++) {
      const value = equityCurve[i].value

      if (value > peak) {
        peak = value
        peakIndex = i
      }

      const drawdown = (peak - value) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
        maxDrawdownDuration = this.getDaysBetween(equityCurve[peakIndex].date, equityCurve[i].date)
      }
    }

    return {
      drawdown: maxDrawdown * 100,
      duration: maxDrawdownDuration,
    }
  }

  private calculateCurrentDrawdown(equityCurve: EquityPoint[]): number {
    let peak = equityCurve[0].value

    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value
      }
    }

    const current = equityCurve[equityCurve.length - 1].value
    if (peak <= 0) return 0
    return ((peak - current) / peak) * 100
  }

  private calculateSharpe(returns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length < 2) return 0

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const annualizedReturn = avgReturn * 252

    const volatility = this.calculateVolatility(returns) / 100
    const annualizedVolatility = volatility * Math.sqrt(252)

    if (annualizedVolatility === 0) return 0

    return (annualizedReturn - riskFreeRate) / annualizedVolatility
  }

  private calculateSortino(returns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length < 2) return 0

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const annualizedReturn = avgReturn * 252

    const downsideReturns = returns.filter(r => r < 0)
    if (downsideReturns.length === 0) return annualizedReturn > 0 ? Infinity : 0

    const downsideMean = downsideReturns.reduce((sum, r) => sum + r, 0) / downsideReturns.length
    const downsideDeviation = Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + Math.pow(r - downsideMean, 2), 0) / downsideReturns.length
    )
    const annualizedDownsideDeviation = downsideDeviation * Math.sqrt(252)

    if (annualizedDownsideDeviation === 0) return 0

    return (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation
  }

  private calculateCalmar(annualizedReturn: number, maxDrawdown: number): number {
    if (maxDrawdown <= 0) return annualizedReturn > 0 ? Infinity : 0
    return annualizedReturn / maxDrawdown
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length < 2) return 0

    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor((1 - confidence) * sortedReturns.length)
    return Math.abs(sortedReturns[index] ?? 0) * 100
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    if (returns.length < 2) return 0

    const sortedReturns = [...returns].sort((a, b) => a - b)
    const cutoffIndex = Math.floor((1 - confidence) * sortedReturns.length)

    if (cutoffIndex === 0) return Math.abs(sortedReturns[0] ?? 0) * 100

    const tailReturns = sortedReturns.slice(0, cutoffIndex)
    const avgTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length
    return Math.abs(avgTailReturn) * 100
  }

  private calculateTradeStats(trades: TradeForStats[]): TradeStats {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxConsecutiveLosses: 0,
      }
    }

    const sellTrades = trades.filter(t => t.type === 'SELL')
    const buyTrades = trades.filter(t => t.type === 'BUY')

    const tradePairs: { buyValue: number; sellValue: number }[] = []
    let buyIndex = 0

    for (const sellTrade of sellTrades) {
      if (buyIndex < buyTrades.length) {
        tradePairs.push({
          buyValue: buyTrades[buyIndex].value,
          sellValue: sellTrade.value,
        })
        buyIndex++
      }
    }

    const winningTrades = tradePairs.filter(p => p.sellValue > p.buyValue)
    const losingTrades = tradePairs.filter(p => p.sellValue <= p.buyValue)

    const totalWins = winningTrades.reduce((sum, p) => sum + (p.sellValue - p.buyValue), 0)
    const totalLosses = Math.abs(losingTrades.reduce((sum, p) => sum + (p.sellValue - p.buyValue), 0))

    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0

    let consecutiveLosses = 0
    let maxConsecutiveLosses = 0
    for (const pair of tradePairs) {
      if (pair.sellValue <= pair.buyValue) {
        consecutiveLosses++
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses)
      } else {
        consecutiveLosses = 0
      }
    }

    const totalTrades = tradePairs.length
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0

    return {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      maxConsecutiveLosses,
    }
  }

  calculateBenchmarkComparison(
    portfolioReturns: number[],
    benchmarkReturns: number[],
    riskFreeRate = 0.02
  ): BenchmarkComparison {
    if (portfolioReturns.length < 2 || benchmarkReturns.length < 2) {
      return {
        alpha: 0,
        beta: 1,
        trackingError: 0,
        informationRatio: 0,
        correlation: 0,
        rSquared: 0,
      }
    }

    const n = Math.min(portfolioReturns.length, benchmarkReturns.length)
    const portfolioSlice = portfolioReturns.slice(0, n)
    const benchmarkSlice = benchmarkReturns.slice(0, n)

    const portfolioMean = portfolioSlice.reduce((sum, r) => sum + r, 0) / n
    const benchmarkMean = benchmarkSlice.reduce((sum, r) => sum + r, 0) / n

    const portfolioStd = Math.sqrt(
      portfolioSlice.reduce((sum, r) => sum + Math.pow(r - portfolioMean, 2), 0) / n
    )
    const benchmarkStd = Math.sqrt(
      benchmarkSlice.reduce((sum, r) => sum + Math.pow(r - benchmarkMean, 2), 0) / n
    )

    const covariance =
      portfolioSlice.reduce(
        (sum, r, i) => sum + (r - portfolioMean) * (benchmarkSlice[i] - benchmarkMean),
        0
      ) / n

    const beta = benchmarkStd > 0 ? covariance / (benchmarkStd * benchmarkStd) : 1

    const annualizedPortfolioReturn = portfolioMean * 252
    const annualizedBenchmarkReturn = benchmarkMean * 252
    const alpha = annualizedPortfolioReturn - riskFreeRate - beta * (annualizedBenchmarkReturn - riskFreeRate)

    const trackingErrors: number[] = []
    for (let i = 0; i < n; i++) {
      trackingErrors.push(portfolioSlice[i] - beta * benchmarkSlice[i])
    }
    const trackingError =
      Math.sqrt(trackingErrors.reduce((sum, r) => sum + r * r, 0) / n) * Math.sqrt(252) * 100

    const correlation =
      benchmarkStd > 0 && portfolioStd > 0 ? covariance / (portfolioStd * benchmarkStd) : 0

    const rSquared = correlation * correlation

    const informationRatio = trackingError > 0 ? (alpha * 100) / trackingError : 0

    return {
      alpha: alpha * 100,
      beta,
      trackingError,
      informationRatio,
      correlation,
      rSquared,
    }
  }
}
