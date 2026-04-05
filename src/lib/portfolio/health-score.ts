export interface PortfolioHealthScore {
  total: number
  concentration: {
    score: number
    topHoldingWeight: number
    top5Weight: number
  }
  volatility: {
    score: number
    portfolioVol: number
  }
  correlation: {
    score: number
    avgCorrelation: number
  }
  liquidity: {
    score: number
    avgVolume: number
  }
  riskAdjustedReturn: {
    score: number
    sharpeRatio: number
  }
  breakdown: string
  suggestions: string[]
}

interface PriceData {
  close: number
  volume: number
  date: Date
}

interface HoldingData {
  symbol: string
  quantity: number
  currentPrice: number
  historicalData: PriceData[]
}

const WEIGHTS = {
  concentration: 0.2,
  volatility: 0.25,
  correlation: 0.15,
  liquidity: 0.15,
  riskAdjustedReturn: 0.25,
}

const BENCHMARK_VOLATILITY = 0.15

export function calculatePortfolioHealthScore(
  holdings: HoldingData[],
  portfolioValue: number
): PortfolioHealthScore {
  if (!holdings || holdings.length === 0) {
    return createEmptyHealthScore('数据不足：组合为空')
  }

  if (holdings.length === 1) {
    return calculateSingleHoldingScore(holdings[0], portfolioValue)
  }

  const concentrationScore = calculateConcentrationScore(holdings, portfolioValue)
  const volatilityScore = calculateVolatilityScore(holdings, portfolioValue)
  const correlationScore = calculateCorrelationScore(holdings)
  const liquidityScore = calculateLiquidityScore(holdings, portfolioValue)
  const riskAdjScore = calculateRiskAdjustedReturnScore(holdings, portfolioValue)

  const total = Math.round(
    concentrationScore.score * WEIGHTS.concentration +
      volatilityScore.score * WEIGHTS.volatility +
      correlationScore.score * WEIGHTS.correlation +
      liquidityScore.score * WEIGHTS.liquidity +
      riskAdjScore.score * WEIGHTS.riskAdjustedReturn
  )

  const breakdown = generateBreakdown(total, {
    concentration: concentrationScore.score,
    volatility: volatilityScore.score,
    correlation: correlationScore.score,
    liquidity: liquidityScore.score,
    riskAdjustedReturn: riskAdjScore.score,
  })

  const suggestions = generateSuggestions({
    concentration: concentrationScore,
    volatility: volatilityScore,
    correlation: correlationScore,
    liquidity: liquidityScore,
    riskAdjustedReturn: riskAdjScore,
  })

  return {
    total,
    concentration: {
      score: concentrationScore.score,
      topHoldingWeight: concentrationScore.topHoldingWeight,
      top5Weight: concentrationScore.top5Weight,
    },
    volatility: {
      score: volatilityScore.score,
      portfolioVol: volatilityScore.portfolioVol,
    },
    correlation: {
      score: correlationScore.score,
      avgCorrelation: correlationScore.avgCorrelation,
    },
    liquidity: {
      score: liquidityScore.score,
      avgVolume: liquidityScore.avgVolume,
    },
    riskAdjustedReturn: {
      score: riskAdjScore.score,
      sharpeRatio: riskAdjScore.sharpeRatio,
    },
    breakdown,
    suggestions,
  }
}

function calculateConcentrationScore(
  holdings: HoldingData[],
  portfolioValue: number
): { score: number; topHoldingWeight: number; top5Weight: number } {
  const sortedHoldings = [...holdings]
    .map((h) => ({
      ...h,
      weight: (h.quantity * h.currentPrice) / portfolioValue,
    }))
    .sort((a, b) => b.weight - a.weight)

  const topHoldingWeight = sortedHoldings[0]?.weight ?? 0
  const top5Weight = sortedHoldings.slice(0, 5).reduce((sum, h) => sum + h.weight, 0)

  let score: number

  if (topHoldingWeight > 0.5) {
    score = 0
  } else if (topHoldingWeight > 0.3) {
    score = Math.max(0, 100 - (topHoldingWeight - 0.3) * 500)
  } else {
    const idealWeight = 1 / holdings.length
    const concentrationPenalty = Math.max(0, (topHoldingWeight - idealWeight) * 200)
    score = Math.max(60, 100 - concentrationPenalty)
  }

  return {
    score: Math.round(score),
    topHoldingWeight,
    top5Weight,
  }
}

function calculateVolatilityScore(
  holdings: HoldingData[],
  portfolioValue: number
): { score: number; portfolioVol: number } {
  const dailyReturns = calculatePortfolioReturns(holdings, portfolioValue)

  if (dailyReturns.length < 2) {
    return { score: 50, portfolioVol: 0 }
  }

  const dailyVol = calculateStandardDeviation(dailyReturns)
  const annualizedVol = dailyVol * Math.sqrt(252)

  let score: number
  if (annualizedVol <= 0.1) {
    score = 100
  } else if (annualizedVol >= 0.3) {
    score = 0
  } else {
    score = 100 - (annualizedVol - 0.1) / 0.002
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    portfolioVol: annualizedVol,
  }
}

function calculateCorrelationScore(
  holdings: HoldingData[]
): { score: number; avgCorrelation: number } {
  if (holdings.length < 2) {
    return { score: 100, avgCorrelation: 0 }
  }

  const correlations: number[] = []

  for (let i = 0; i < holdings.length; i++) {
    for (let j = i + 1; j < holdings.length; j++) {
      const corr = calculateCorrelation(holdings[i].historicalData, holdings[j].historicalData)
      if (!isNaN(corr)) {
        correlations.push(corr)
      }
    }
  }

  if (correlations.length === 0) {
    return { score: 50, avgCorrelation: 0 }
  }

  const avgCorrelation = correlations.reduce((sum, c) => sum + c, 0) / correlations.length
  const score = Math.max(0, 100 - avgCorrelation * 80)

  return {
    score: Math.round(score),
    avgCorrelation,
  }
}

function calculateLiquidityScore(
  holdings: HoldingData[],
  portfolioValue: number
): { score: number; avgVolume: number } {
  if (holdings.length === 0 || portfolioValue === 0) {
    return { score: 50, avgVolume: 0 }
  }

  const volumes = holdings.map((h) => {
    const avgVol =
      h.historicalData.length > 0
        ? h.historicalData.reduce((sum, d) => sum + d.volume, 0) / h.historicalData.length
        : 0
    return avgVol
  })

  const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length

  const highLiquidityThreshold = portfolioValue * 0.01
  const lowLiquidityThreshold = portfolioValue * 0.001

  let score: number
  if (avgVolume >= highLiquidityThreshold) {
    score = 100
  } else if (avgVolume <= lowLiquidityThreshold) {
    score = 30
  } else {
    score =
      30 + (avgVolume - lowLiquidityThreshold) / (highLiquidityThreshold - lowLiquidityThreshold) * 70
  }

  return {
    score: Math.round(score),
    avgVolume,
  }
}

function calculateRiskAdjustedReturnScore(
  holdings: HoldingData[],
  portfolioValue: number
): { score: number; sharpeRatio: number } {
  const dailyReturns = calculatePortfolioReturns(holdings, portfolioValue)

  if (dailyReturns.length < 30) {
    return { score: 50, sharpeRatio: 0 }
  }

  const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length
  const annualizedReturn = avgDailyReturn * 252

  const dailyVol = calculateStandardDeviation(dailyReturns)
  const annualizedVol = dailyVol * Math.sqrt(252)

  const riskFreeRate = 0.02
  const sharpeRatio =
    annualizedVol > 0 ? (annualizedReturn - riskFreeRate) / annualizedVol : 0

  let score: number
  if (sharpeRatio <= 0) {
    score = 0
  } else {
    score = Math.min(100, sharpeRatio * 40)
  }

  return {
    score: Math.round(score),
    sharpeRatio,
  }
}

function calculateSingleHoldingScore(
  holding: HoldingData,
  portfolioValue: number
): PortfolioHealthScore {
  const concentrationScore = 0
  const topHoldingWeight = 1

  const returns = calculateReturns(holding.historicalData)
  const dailyVol = calculateStandardDeviation(returns)
  const annualizedVol = dailyVol * Math.sqrt(252)
  let volScore: number
  if (annualizedVol <= 0.1) {
    volScore = 100
  } else if (annualizedVol >= 0.3) {
    volScore = 0
  } else {
    volScore = 100 - (annualizedVol - 0.1) / 0.002
  }

  const correlationScore = 100

  const avgVolume =
    holding.historicalData.length > 0
      ? holding.historicalData.reduce((sum, d) => sum + d.volume, 0) / holding.historicalData.length
      : 0
  const highLiquidityThreshold = portfolioValue * 0.01
  const lowLiquidityThreshold = portfolioValue * 0.001
  let liqScore: number
  if (avgVolume >= highLiquidityThreshold) {
    liqScore = 100
  } else if (avgVolume <= lowLiquidityThreshold) {
    liqScore = 30
  } else {
    liqScore =
      30 + (avgVolume - lowLiquidityThreshold) / (highLiquidityThreshold - lowLiquidityThreshold) * 70
  }

  const avgDailyReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
  const annualizedReturn = avgDailyReturn * 252
  const riskFreeRate = 0.02
  const sharpeRatio = annualizedVol > 0 ? (annualizedReturn - riskFreeRate) / annualizedVol : 0
  let riskAdjScore: number
  if (sharpeRatio <= 0) {
    riskAdjScore = 0
  } else {
    riskAdjScore = Math.min(100, sharpeRatio * 40)
  }

  const total = Math.round(
    concentrationScore * WEIGHTS.concentration +
      volScore * WEIGHTS.volatility +
      correlationScore * WEIGHTS.correlation +
      liqScore * WEIGHTS.liquidity +
      riskAdjScore * WEIGHTS.riskAdjustedReturn
  )

  return {
    total,
    concentration: {
      score: concentrationScore,
      topHoldingWeight,
      top5Weight: topHoldingWeight,
    },
    volatility: {
      score: Math.round(volScore),
      portfolioVol: annualizedVol,
    },
    correlation: {
      score: correlationScore,
      avgCorrelation: 0,
    },
    liquidity: {
      score: Math.round(liqScore),
      avgVolume,
    },
    riskAdjustedReturn: {
      score: Math.round(riskAdjScore),
      sharpeRatio,
    },
    breakdown: '单一持仓：集中度风险极高，建议分散投资',
    suggestions: ['建议分散持仓，单一股票权重不超过20%', '考虑配置多个行业和资产类别'],
  }
}

function generateBreakdown(
  total: number,
  scores: {
    concentration: number
    volatility: number
    correlation: number
    liquidity: number
    riskAdjustedReturn: number
  }
): string {
  if (total >= 80) {
    return '组合健康度优秀：各项风险指标均在可控范围内'
  } else if (total >= 60) {
    return '组合健康度良好：存在部分优化空间，建议关注低分项'
  } else if (total >= 40) {
    return '组合健康度一般：存在明显风险点，需要优化调整'
  } else {
    return '组合健康度较差：风险较高，建议重新评估投资策略'
  }
}

function generateSuggestions(scores: {
  concentration: { score: number; topHoldingWeight: number }
  volatility: { score: number; portfolioVol: number }
  correlation: { score: number; avgCorrelation: number }
  liquidity: { score: number; avgVolume: number }
  riskAdjustedReturn: { score: number; sharpeRatio: number }
}): string[] {
  const suggestions: string[] = []

  if (scores.concentration.score < 60) {
    suggestions.push('建议分散持仓，单一股票权重不超过20%')
  }

  if (scores.volatility.score < 60) {
    suggestions.push('当前波动率偏高，考虑增加低波动股票')
  }

  if (scores.correlation.score < 60) {
    suggestions.push('持仓相关性偏高，考虑增加反向/低相关资产')
  }

  if (scores.liquidity.score < 60) {
    suggestions.push('注意流动性风险，大宗交易可能影响价格')
  }

  if (scores.riskAdjustedReturn.score < 60) {
    if (scores.riskAdjustedReturn.sharpeRatio < 0) {
      suggestions.push('风险调整收益为负，建议优化策略')
    } else {
      suggestions.push('风险调整收益偏低，考虑优化收益风险比')
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('组合配置合理，继续保持当前策略')
  }

  return suggestions
}

function createEmptyHealthScore(reason: string): PortfolioHealthScore {
  return {
    total: 0,
    concentration: {
      score: 0,
      topHoldingWeight: 0,
      top5Weight: 0,
    },
    volatility: {
      score: 0,
      portfolioVol: 0,
    },
    correlation: {
      score: 0,
      avgCorrelation: 0,
    },
    liquidity: {
      score: 0,
      avgVolume: 0,
    },
    riskAdjustedReturn: {
      score: 0,
      sharpeRatio: 0,
    },
    breakdown: reason,
    suggestions: ['请添加持仓以计算健康度评分'],
  }
}

function calculatePortfolioReturns(holdings: HoldingData[], portfolioValue: number): number[] {
  if (holdings.length === 0 || portfolioValue === 0) {
    return []
  }

  const dates = new Set<string>()
  holdings.forEach((h) => {
    h.historicalData.forEach((d) => {
      dates.add(d.date.toISOString().split('T')[0])
    })
  })

  const sortedDates = Array.from(dates).sort()
  if (sortedDates.length < 2) {
    return []
  }

  const dailyValues: { date: string; value: number }[] = []

  for (const dateStr of sortedDates) {
    let dayValue = 0
    for (const holding of holdings) {
      const dayData = holding.historicalData.find(
        (d) => d.date.toISOString().split('T')[0] === dateStr
      )
      if (dayData) {
        dayValue += holding.quantity * dayData.close
      } else {
        const latestData = holding.historicalData
          .filter((d) => d.date.toISOString().split('T')[0] <= dateStr)
          .sort((a, b) => b.date.getTime() - a.date.getTime())[0]
        if (latestData) {
          dayValue += holding.quantity * latestData.close
        } else {
          dayValue += holding.quantity * holding.currentPrice
        }
      }
    }
    dailyValues.push({ date: dateStr, value: dayValue })
  }

  const returns: number[] = []
  for (let i = 1; i < dailyValues.length; i++) {
    const prev = dailyValues[i - 1].value
    const curr = dailyValues[i].value
    if (prev > 0) {
      returns.push((curr - prev) / prev)
    }
  }

  return returns
}

function calculateReturns(data: PriceData[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].close
    const curr = data[i].close
    if (prev > 0) {
      returns.push((curr - prev) / prev)
    }
  }
  return returns
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0
  }
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length
  return Math.sqrt(variance)
}

function calculateCorrelation(data1: PriceData[], data2: PriceData[]): number {
  const dateMap1 = new Map(data1.map((d) => [d.date.toISOString().split('T')[0], d.close]))
  const dateMap2 = new Map(data2.map((d) => [d.date.toISOString().split('T')[0], d.close]))

  const commonDates = Array.from(dateMap1.keys()).filter((date) => dateMap2.has(date)).sort()

  if (commonDates.length < 10) {
    return 0
  }

  const prices1 = commonDates.map((date) => dateMap1.get(date)!)
  const prices2 = commonDates.map((date) => dateMap2.get(date)!)

  const returns1: number[] = []
  const returns2: number[] = []

  for (let i = 1; i < prices1.length; i++) {
    if (prices1[i - 1] > 0 && prices2[i - 1] > 0) {
      returns1.push((prices1[i] - prices1[i - 1]) / prices1[i - 1])
      returns2.push((prices2[i] - prices2[i - 1]) / prices2[i - 1])
    }
  }

  if (returns1.length < 2) {
    return 0
  }

  const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length
  const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length

  const variance1 = returns1.reduce((sum, r) => sum + Math.pow(r - mean1, 2), 0) / returns1.length
  const variance2 = returns2.reduce((sum, r) => sum + Math.pow(r - mean2, 2), 0) / returns2.length

  const std1 = Math.sqrt(variance1)
  const std2 = Math.sqrt(variance2)

  if (std1 === 0 || std2 === 0) {
    return 0
  }

  const covariance =
    returns1.reduce((sum, r, i) => sum + (r - mean1) * (returns2[i] - mean2), 0) / returns1.length

  return covariance / (std1 * std2)
}

export { calculateCorrelation, calculateStandardDeviation, calculateReturns }
export type { HoldingData, PriceData }
