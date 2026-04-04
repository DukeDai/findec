export interface AllocationSuggestion {
  currentWeights: Map<string, number>
  suggestedWeights: Map<string, number>
  trades: Trade[]
  reason: string
  expectedImprovement: {
    riskReduction: number
    returnImprovement: number
  }
}

export interface Trade {
  symbol: string
  action: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
}

export interface CorrelationMatrix {
  correlations: Map<string, Map<string, number>>
}

export class AllocationOptimizer {
  // Risk parity - equal risk contribution from each asset
  riskParity(volatilities: Map<string, number>): Map<string, number> {
    const symbols = Array.from(volatilities.keys())
    if (symbols.length === 0) return new Map()

    const weights = new Map<string, number>()
    let totalInverseVol = 0

    // Calculate inverse volatility weights
    for (const symbol of symbols) {
      const vol = volatilities.get(symbol) || 0
      if (vol > 0) {
        const inverseVol = 1 / vol
        weights.set(symbol, inverseVol)
        totalInverseVol += inverseVol
      } else {
        weights.set(symbol, 0)
      }
    }

    // Normalize to sum to 1
    if (totalInverseVol > 0) {
      for (const symbol of symbols) {
        const weight = weights.get(symbol) || 0
        weights.set(symbol, weight / totalInverseVol)
      }
    }

    return weights
  }

  // Minimum variance portfolio using quadratic optimization
  minVariance(
    returns: Map<string, number[]>,
    correlations: Map<string, Map<string, number>>
  ): Map<string, number> {
    const symbols = Array.from(returns.keys())
    if (symbols.length === 0) return new Map()

    // Calculate volatilities from returns
    const volatilities = new Map<string, number>()
    for (const symbol of symbols) {
      const symbolReturns = returns.get(symbol) || []
      if (symbolReturns.length >= 2) {
        const mean = symbolReturns.reduce((sum, r) => sum + r, 0) / symbolReturns.length
        const variance = symbolReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / symbolReturns.length
        volatilities.set(symbol, Math.sqrt(variance) * Math.sqrt(252))
      } else {
        volatilities.set(symbol, 0.2) // Default volatility
      }
    }

    // If only one symbol, return 100%
    if (symbols.length === 1) {
      return new Map([[symbols[0], 1]])
    }

    // Build covariance matrix
    const covMatrix: number[][] = []
    for (let i = 0; i < symbols.length; i++) {
      covMatrix[i] = []
      for (let j = 0; j < symbols.length; j++) {
        const volI = volatilities.get(symbols[i]) || 0
        const volJ = volatilities.get(symbols[j]) || 0
        const corr = correlations.get(symbols[i])?.get(symbols[j]) || (i === j ? 1 : 0)
        covMatrix[i][j] = volI * volJ * corr
      }
    }

    // Simplified minimum variance using gradient descent
    // Start with equal weights
    const weights = new Array(symbols.length).fill(1 / symbols.length)
    const learningRate = 0.01
    const iterations = 1000

    for (let iter = 0; iter < iterations; iter++) {
      const gradient = new Array(symbols.length).fill(0)

      // Calculate gradient
      for (let i = 0; i < symbols.length; i++) {
        for (let j = 0; j < symbols.length; j++) {
          gradient[i] += 2 * covMatrix[i][j] * weights[j]
        }
      }

      // Update weights
      for (let i = 0; i < symbols.length; i++) {
        weights[i] -= learningRate * gradient[i]
      }

      // Project onto simplex (sum to 1, non-negative)
      const sum = weights.reduce((s, w) => s + w, 0)
      if (sum > 0) {
        for (let i = 0; i < symbols.length; i++) {
          weights[i] = Math.max(0, weights[i] / sum)
        }
      }

      // Renormalize
      const newSum = weights.reduce((s, w) => s + w, 0)
      if (newSum > 0) {
        for (let i = 0; i < symbols.length; i++) {
          weights[i] /= newSum
        }
      }
    }

    const result = new Map<string, number>()
    for (let i = 0; i < symbols.length; i++) {
      result.set(symbols[i], weights[i])
    }

    return result
  }

  // Maximum Sharpe ratio portfolio (simplified version)
  maxSharpe(
    returns: Map<string, number[]>,
    volatilities: Map<string, number>
  ): Map<string, number> {
    const symbols = Array.from(returns.keys())
    if (symbols.length === 0) return new Map()

    // Calculate expected returns (annualized)
    const expectedReturns = new Map<string, number>()
    for (const symbol of symbols) {
      const symbolReturns = returns.get(symbol) || []
      if (symbolReturns.length >= 2) {
        const avgReturn = symbolReturns.reduce((sum, r) => sum + r, 0) / symbolReturns.length
        expectedReturns.set(symbol, avgReturn * 252) // Annualize
      } else {
        expectedReturns.set(symbol, 0.08) // Default 8% annual return
      }
    }

    // Risk-free rate assumption (3%)
    const riskFreeRate = 0.03

    // Calculate Sharpe ratios
    const sharpeRatios = new Map<string, number>()
    for (const symbol of symbols) {
      const expReturn = expectedReturns.get(symbol) || 0
      const vol = volatilities.get(symbol) || 0.2
      if (vol > 0) {
        sharpeRatios.set(symbol, (expReturn - riskFreeRate) / vol)
      } else {
        sharpeRatios.set(symbol, 0)
      }
    }

    // Simplified: weight proportional to Sharpe ratio
    const weights = new Map<string, number>()
    let totalSharpe = 0

    for (const symbol of symbols) {
      const sharpe = sharpeRatios.get(symbol) || 0
      const weight = Math.max(0, sharpe)
      weights.set(symbol, weight)
      totalSharpe += weight
    }

    // Normalize
    if (totalSharpe > 0) {
      for (const symbol of symbols) {
        const weight = weights.get(symbol) || 0
        weights.set(symbol, weight / totalSharpe)
      }
    } else {
      // Fallback to equal weight if all Sharpe ratios are negative
      return this.equalWeight(symbols)
    }

    return weights
  }

  // Equal weight baseline
  equalWeight(symbols: string[]): Map<string, number> {
    const weights = new Map<string, number>()
    const equalWeight = symbols.length > 0 ? 1 / symbols.length : 0

    for (const symbol of symbols) {
      weights.set(symbol, equalWeight)
    }

    return weights
  }

  // Calculate trades to rebalance
  calculateRebalanceTrades(
    current: Map<string, number>,
    target: Map<string, number>,
    prices: Map<string, number>,
    cash: number
  ): Trade[] {
    const trades: Trade[] = []
    const allSymbols = new Set([...current.keys(), ...target.keys()])

    // Calculate current values
    const currentValues = new Map<string, number>()
    let totalValue = cash

    for (const symbol of current.keys()) {
      const quantity = current.get(symbol) || 0
      const price = prices.get(symbol) || 0
      const value = quantity * price
      currentValues.set(symbol, value)
      totalValue += value
    }

    if (totalValue === 0) return trades

    // Calculate target values
    const targetValues = new Map<string, number>()
    for (const symbol of allSymbols) {
      const targetWeight = target.get(symbol) || 0
      targetValues.set(symbol, totalValue * targetWeight)
    }

    // Generate trades
    for (const symbol of allSymbols) {
      const currentValue = currentValues.get(symbol) || 0
      const targetValue = targetValues.get(symbol) || 0
      const price = prices.get(symbol) || 0

      if (price === 0) continue

      const diff = targetValue - currentValue

      if (Math.abs(diff) > 0.01) { // Minimum trade threshold
        const quantity = Math.abs(diff / price)
        const action: 'buy' | 'sell' = diff > 0 ? 'buy' : 'sell'

        trades.push({
          symbol,
          action,
          quantity: Math.round(quantity * 100) / 100,
          price,
          amount: Math.abs(diff),
        })
      }
    }

    // Sort trades by amount (largest first)
    trades.sort((a, b) => b.amount - a.amount)

    return trades
  }

  // Generate full allocation suggestion
  generateSuggestion(
    method: 'risk_parity' | 'min_variance' | 'max_sharpe' | 'equal_weight',
    currentPositions: Map<string, number>,
    prices: Map<string, number>,
    returns: Map<string, number[]>,
    volatilities: Map<string, number>,
    correlations: Map<string, Map<string, number>>
  ): AllocationSuggestion {
    const symbols = Array.from(currentPositions.keys())
    const totalValue = symbols.reduce((sum, s) => {
      const qty = currentPositions.get(s) || 0
      const price = prices.get(s) || 0
      return sum + qty * price
    }, 0)

    // Calculate current weights
    const currentWeights = new Map<string, number>()
    if (totalValue > 0) {
      for (const symbol of symbols) {
        const qty = currentPositions.get(symbol) || 0
        const price = prices.get(symbol) || 0
        currentWeights.set(symbol, (qty * price) / totalValue)
      }
    }

    // Calculate suggested weights based on method
    let suggestedWeights: Map<string, number>
    let reason: string

    switch (method) {
      case 'risk_parity':
        suggestedWeights = this.riskParity(volatilities)
        reason = '风险平价策略：每个资产对组合风险的贡献相等'
        break
      case 'min_variance':
        suggestedWeights = this.minVariance(returns, correlations)
        reason = '最小方差策略：在给定收益水平下最小化组合波动率'
        break
      case 'max_sharpe':
        suggestedWeights = this.maxSharpe(returns, volatilities)
        reason = '最大夏普比率策略：优化风险调整后的收益'
        break
      case 'equal_weight':
        suggestedWeights = this.equalWeight(symbols)
        reason = '等权重策略：简单分散化，每个资产权重相同'
        break
      default:
        suggestedWeights = this.equalWeight(symbols)
        reason = '等权重策略：默认分散化方案'
    }

    // Calculate rebalancing trades
    const trades = this.calculateRebalanceTrades(
      currentPositions,
      suggestedWeights,
      prices,
      0
    )

    // Calculate expected improvements (simplified estimates)
    const currentVol = this.calculatePortfolioVolatility(currentWeights, volatilities, correlations)
    const targetVol = this.calculatePortfolioVolatility(suggestedWeights, volatilities, correlations)
    const riskReduction = currentVol > 0 ? (currentVol - targetVol) / currentVol : 0

    return {
      currentWeights,
      suggestedWeights,
      trades,
      reason,
      expectedImprovement: {
        riskReduction: Math.max(0, riskReduction),
        returnImprovement: 0.02, // Conservative estimate
      },
    }
  }

  // Calculate portfolio volatility
  private calculatePortfolioVolatility(
    weights: Map<string, number>,
    volatilities: Map<string, number>,
    correlations: Map<string, Map<string, number>>
  ): number {
    const symbols = Array.from(weights.keys())
    if (symbols.length === 0) return 0

    let variance = 0

    for (const i of symbols) {
      for (const j of symbols) {
        const wi = weights.get(i) || 0
        const wj = weights.get(j) || 0
        const vi = volatilities.get(i) || 0
        const vj = volatilities.get(j) || 0
        const corr = correlations.get(i)?.get(j) || (i === j ? 1 : 0)

        variance += wi * wj * vi * vj * corr
      }
    }

    return Math.sqrt(variance)
  }

  // Calculate correlations from returns
  calculateCorrelations(returns: Map<string, number[]>): Map<string, Map<string, number>> {
    const symbols = Array.from(returns.keys())
    const correlations = new Map<string, Map<string, number>>()

    for (const symbol of symbols) {
      correlations.set(symbol, new Map())
    }

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i; j < symbols.length; j++) {
        const returns1 = returns.get(symbols[i]) || []
        const returns2 = returns.get(symbols[j]) || []

        const corr = this.calculateCorrelation(returns1, returns2)
        correlations.get(symbols[i])?.set(symbols[j], corr)
        correlations.get(symbols[j])?.set(symbols[i], corr)
      }
    }

    return correlations
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    if (n < 2) return 0

    const xSlice = x.slice(0, n)
    const ySlice = y.slice(0, n)

    const meanX = xSlice.reduce((sum, v) => sum + v, 0) / n
    const meanY = ySlice.reduce((sum, v) => sum + v, 0) / n

    let numerator = 0
    let denomX = 0
    let denomY = 0

    for (let i = 0; i < n; i++) {
      const diffX = xSlice[i] - meanX
      const diffY = ySlice[i] - meanY
      numerator += diffX * diffY
      denomX += diffX * diffX
      denomY += diffY * diffY
    }

    if (denomX === 0 || denomY === 0) return 0

    return numerator / Math.sqrt(denomX * denomY)
  }
}

export function createDefaultOptimizer(): AllocationOptimizer {
  return new AllocationOptimizer()
}
