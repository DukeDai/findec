import type { EquityPoint } from './risk-metrics'
import type { BacktestConfig } from './engine'

export interface TradeData {
  symbol: string
  date: Date
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  value: number
  reason?: string
}

export interface ReliabilityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical'
  code: string
  message: string
}

export interface ReliabilityScore {
  total: number
  sampleSize: number
  overfittingRisk: number
  dataQuality: number
  stability: number
  issues: ReliabilityIssue[]
  suggestions: string[]
}

export function calculateReliability(
  trades: TradeData[],
  equityCurve: EquityPoint[],
  config: BacktestConfig
): ReliabilityScore {
  const issues: ReliabilityIssue[] = []
  const suggestions: string[] = []

  const sampleSizeScore = calculateSampleSizeScore(trades, issues, suggestions)
  const overfittingScore = calculateOverfittingScore(config, trades, issues, suggestions)
  const dataQualityScore = calculateDataQualityScore(equityCurve, issues, suggestions)
  const stabilityScore = calculateStabilityScore(equityCurve, trades, issues, suggestions)

  const total = Math.round(
    sampleSizeScore * 0.3 +
    overfittingScore * 0.3 +
    dataQualityScore * 0.2 +
    stabilityScore * 0.2
  )

  return {
    total: Math.max(0, Math.min(100, total)),
    sampleSize: Math.max(0, Math.min(100, sampleSizeScore)),
    overfittingRisk: Math.max(0, Math.min(100, overfittingScore)),
    dataQuality: Math.max(0, Math.min(100, dataQualityScore)),
    stability: Math.max(0, Math.min(100, stabilityScore)),
    issues,
    suggestions,
  }
}

function calculateSampleSizeScore(
  trades: TradeData[],
  issues: ReliabilityIssue[],
  suggestions: string[]
): number {
  const tradeCount = trades.length
  let score = 100

  if (tradeCount < 10) {
    score -= 60
    issues.push({
      severity: 'critical',
      code: 'SAMPLE_SIZE_CRITICAL',
      message: `交易次数过少 (${tradeCount} 次)，结果可信度极低`,
    })
    suggestions.push('建议增加回测时间范围或选择交易频率更高的标的')
  } else if (tradeCount < 30) {
    score -= 40
    issues.push({
      severity: 'high',
      code: 'SAMPLE_SIZE_LOW',
      message: `交易次数较少 (${tradeCount} 次)，统计显著性不足`,
    })
    suggestions.push('建议延长回测周期以获取更多交易样本')
  } else if (tradeCount < 100) {
    score -= 20
    issues.push({
      severity: 'medium',
      code: 'SAMPLE_SIZE_MODERATE',
      message: `交易次数中等 (${tradeCount} 次)，建议更多样本验证`,
    })
  }

  if (tradeCount >= 100) {
    suggestions.push('交易样本充足，结果具有统计意义')
  }

  return Math.max(0, score)
}

function calculateOverfittingScore(
  config: BacktestConfig,
  trades: TradeData[],
  issues: ReliabilityIssue[],
  suggestions: string[]
): number {
  let score = 100

  const paramCount = countParameters(config)

  if (paramCount > 5) {
    score -= 30
    issues.push({
      severity: 'high',
      code: 'TOO_MANY_PARAMETERS',
      message: `策略参数过多 (${paramCount} 个)，存在过拟合风险`,
    })
    suggestions.push('建议减少策略参数数量，或使用 Walk-Forward 优化验证参数稳健性')
  } else if (paramCount > 3) {
    score -= 15
    issues.push({
      severity: 'medium',
      code: 'MODERATE_PARAMETERS',
      message: `策略参数较多 (${paramCount} 个)，注意过拟合风险`,
    })
  }

  const tradeCount = trades.length
  const complexityRatio = paramCount / Math.max(tradeCount, 1)

  if (complexityRatio > 0.05) {
    score -= 20
    issues.push({
      severity: 'high',
      code: 'HIGH_COMPLEXITY_RATIO',
      message: `参数与样本比例过高 (${(complexityRatio * 100).toFixed(1)}%)，过拟合风险显著`,
    })
    suggestions.push('建议降低策略复杂度或增加回测样本量')
  }

  if (score === 100) {
    suggestions.push('策略参数设置合理，过拟合风险可控')
  }

  return Math.max(0, score)
}

function countParameters(config: BacktestConfig): number {
  let count = 0

  for (const strategy of config.strategies) {
    const params = strategy.parameters
    for (const key in params) {
      if (params[key as keyof typeof params] !== undefined) {
        count++
      }
    }
  }

  if (config.rebalance !== 'none') count++
  if (config.rebalanceThreshold > 0) count++

  return count
}

function calculateDataQualityScore(
  equityCurve: EquityPoint[],
  issues: ReliabilityIssue[],
  suggestions: string[]
): number {
  let score = 100

  const years = getYears(equityCurve)

  if (years < 1) {
    score -= 30
    issues.push({
      severity: 'high',
      code: 'INSUFFICIENT_DATA_PERIOD',
      message: `回测时间过短 (${years.toFixed(1)} 年)，无法覆盖不同市场周期`,
    })
    suggestions.push('建议回测至少覆盖一个完整的牛熊周期（3-5年）')
  } else if (years < 3) {
    score -= 15
    issues.push({
      severity: 'medium',
      code: 'SHORT_DATA_PERIOD',
      message: `回测时间较短 (${years.toFixed(1)} 年)，建议延长验证`,
    })
  }

  const missingData = detectMissingData(equityCurve)
  if (missingData > 0.05) {
    score -= 20
    issues.push({
      severity: 'high',
      code: 'MISSING_DATA',
      message: `数据缺失率过高 (${(missingData * 100).toFixed(1)}%)，影响结果准确性`,
    })
    suggestions.push('检查数据源，确保数据完整性')
  } else if (missingData > 0.02) {
    score -= 10
    issues.push({
      severity: 'medium',
      code: 'SOME_MISSING_DATA',
      message: `存在数据缺失 (${(missingData * 100).toFixed(1)}%)`,
    })
  }

  if (score === 100) {
    suggestions.push('数据质量良好，时间跨度充足')
  }

  return Math.max(0, score)
}

export function getYears(equityCurve: EquityPoint[]): number {
  if (equityCurve.length < 2) return 0
  const start = new Date(equityCurve[0].date)
  const end = new Date(equityCurve[equityCurve.length - 1].date)
  const msPerYear = 1000 * 60 * 60 * 24 * 365
  return (end.getTime() - start.getTime()) / msPerYear
}

export function detectMissingData(equityCurve: EquityPoint[]): number {
  if (equityCurve.length < 2) return 0

  const sorted = [...equityCurve].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const msPerDay = 1000 * 60 * 60 * 24
  let missingDays = 0
  let totalExpectedDays = 0

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date)
    const curr = new Date(sorted[i].date)
    const daysDiff = Math.floor((curr.getTime() - prev.getTime()) / msPerDay)

    if (daysDiff > 1) {
      missingDays += daysDiff - 1
    }
    totalExpectedDays += daysDiff
  }

  return totalExpectedDays > 0 ? missingDays / totalExpectedDays : 0
}

function calculateStabilityScore(
  equityCurve: EquityPoint[],
  trades: TradeData[],
  issues: ReliabilityIssue[],
  suggestions: string[]
): number {
  let score = 100

  const returns = calculateReturns(equityCurve)

  const consecutiveLosses = countConsecutiveNegative(returns)
  if (consecutiveLosses > 10) {
    score -= 20
    issues.push({
      severity: 'high',
      code: 'EXTREME_CONSECUTIVE_LOSSES',
      message: `连续亏损天数过多 (${consecutiveLosses} 天)，策略稳定性差`,
    })
    suggestions.push('建议增加止损机制或优化策略逻辑')
  } else if (consecutiveLosses > 5) {
    score -= 10
    issues.push({
      severity: 'medium',
      code: 'MODERATE_CONSECUTIVE_LOSSES',
      message: `连续亏损天数较多 (${consecutiveLosses} 天)`,
    })
  }

  const skewness = calculateSkewness(returns)
  if (Math.abs(skewness) > 1.5) {
    score -= 15
    const direction = skewness > 0 ? '正' : '负'
    issues.push({
      severity: 'medium',
      code: 'EXTREME_SKEWNESS',
      message: `收益分布偏度极端 (${direction}偏 ${Math.abs(skewness).toFixed(2)})，存在尾部风险`,
    })
    suggestions.push('策略收益分布不均，注意极端行情风险')
  }

  if (trades.length > 0) {
    const tradeReturns: number[] = []
    for (let i = 1; i < trades.length; i += 2) {
      if (trades[i - 1].type === 'BUY' && trades[i].type === 'SELL') {
        const pnl = trades[i].value - trades[i - 1].value
        const cost = trades[i - 1].value
        if (cost > 0) {
          tradeReturns.push(pnl / cost)
        }
      }
    }

    if (tradeReturns.length > 1) {
      const tradeSkewness = calculateSkewness(tradeReturns)
      if (Math.abs(tradeSkewness) > 1) {
        score -= 10
        issues.push({
          severity: 'low',
          code: 'TRADE_SKEWNESS',
          message: `单笔交易收益分布不均匀 (偏度 ${tradeSkewness.toFixed(2)})`,
        })
      }
    }
  }

  if (score === 100) {
    suggestions.push('策略表现稳定，收益分布均衡')
  }

  return Math.max(0, score)
}

export function calculateReturns(equityCurve: EquityPoint[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].value
    const curr = equityCurve[i].value
    if (prev > 0) {
      returns.push((curr - prev) / prev)
    }
  }
  return returns
}

export function countConsecutiveNegative(returns: number[]): number {
  let maxConsecutive = 0
  let currentConsecutive = 0

  for (const ret of returns) {
    if (ret < 0) {
      currentConsecutive++
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
    } else {
      currentConsecutive = 0
    }
  }

  return maxConsecutive
}

export function calculateSkewness(returns: number[]): number {
  if (returns.length < 3) return 0

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const std = Math.sqrt(variance)

  if (std === 0) return 0

  const n = returns.length
  const skewSum = returns.reduce((sum, r) => sum + Math.pow((r - mean) / std, 3), 0)
  return (n / ((n - 1) * (n - 2))) * skewSum
}
