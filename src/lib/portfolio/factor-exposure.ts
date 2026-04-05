export interface Position {
  symbol: string
  weight: number
  shares?: number
  price?: number
  value?: number
}

export interface FactorExposure {
  factorId: string
  factorName: string
  category: string
  exposure: number
  contribution: number
}

export interface FactorReturn {
  factorId: string
  factorName: string
  dailyReturns: number[]
  avgReturn: number
  volatility: number
}

export interface BarraAnalysis {
  positions: Position[]
  factorExposures: FactorExposure[]
  totalExposure: number
  activeExposure: number
  factorContributions: Array<{ factor: string; contribution: number; pct: number }>
  riskDecomposition: Array<{ source: string; varianceContribution: number; pct: number }>
  recommendations: string[]
}

export interface StockFactorProfile {
  symbol: string
  marketBeta: number
  size: number
  value: number
  momentum: number
  quality: number
  lowVolatility: number
  dividendYield: number
  growth: number
}

const MOCK_PROFILES: Record<string, StockFactorProfile> = {
  AAPL:  { symbol: 'AAPL',  marketBeta: 1.2,  size: 0.8,  value: -0.3, momentum: 0.4,  quality: 0.9,  lowVolatility: 0.2,  dividendYield: -0.2, growth: 0.8 },
  MSFT:  { symbol: 'MSFT',  marketBeta: 1.0,  size: 0.9,  value: -0.2, momentum: 0.3,  quality: 0.95, lowVolatility: 0.3,  dividendYield: -0.1, growth: 0.7 },
  GOOGL: { symbol: 'GOOGL', marketBeta: 1.1,  size: 0.85, value: 0.1,  momentum: 0.2,  quality: 0.85, lowVolatility: 0.1,  dividendYield: 0.0,  growth: 0.9 },
  AMZN:  { symbol: 'AMZN',  marketBeta: 1.3,  size: 0.75, value: 0.2,  momentum: 0.5,  quality: 0.6,  lowVolatility: -0.2, dividendYield: 0.0,  growth: 0.95 },
  NVDA:  { symbol: 'NVDA',  marketBeta: 1.8,  size: 0.6,  value: -0.1, momentum: 0.9,  quality: 0.7,  lowVolatility: -0.4, dividendYield: -0.1, growth: 1.0 },
  META:  { symbol: 'META',  marketBeta: 1.4,  size: 0.7,  value: 0.0,  momentum: 0.6,  quality: 0.75, lowVolatility: -0.1, dividendYield: 0.0,  growth: 0.85 },
  TSLA:  { symbol: 'TSLA',  marketBeta: 2.0,  size: 0.5,  value: -0.5, momentum: 0.3,  quality: 0.3,  lowVolatility: -0.5, dividendYield: 0.0,  growth: 0.9 },
  JPM:   { symbol: 'JPM',   marketBeta: 1.1,  size: 0.95, value: 0.5,  momentum: 0.1,  quality: 0.8,  lowVolatility: 0.4,  dividendYield: 0.3,  growth: 0.2 },
  JNJ:   { symbol: 'JNJ',   marketBeta: 0.6,  size: 1.0,  value: 0.6,  momentum: 0.0,  quality: 0.9,  lowVolatility: 0.8,  dividendYield: 0.5,  growth: 0.1 },
  PG:    { symbol: 'PG',    marketBeta: 0.5,  size: 0.95, value: 0.4,  momentum: 0.0,  quality: 0.9,  lowVolatility: 0.9,  dividendYield: 0.5,  growth: 0.1 },
  XOM:   { symbol: 'XOM',   marketBeta: 0.9,  size: 0.8,  value: 0.3,  momentum: -0.1, quality: 0.6,  lowVolatility: 0.5,  dividendYield: 0.6,  growth: -0.1 },
  BRK:   { symbol: 'BRK.B', marketBeta: 0.9,  size: 1.0,  value: 0.8,  momentum: 0.0,  quality: 1.0,  lowVolatility: 0.7,  dividendYield: 0.0,  growth: 0.2 },
  V:     { symbol: 'V',     marketBeta: 1.0,  size: 0.9,  value: 0.1,  momentum: 0.2,  quality: 1.0,  lowVolatility: 0.5,  dividendYield: 0.1,  growth: 0.4 },
  UNH:   { symbol: 'UNH',   marketBeta: 0.8,  size: 0.85, value: 0.2,  momentum: 0.1,  quality: 0.85, lowVolatility: 0.4,  dividendYield: 0.1,  growth: 0.5 },
  HD:    { symbol: 'HD',    marketBeta: 1.0,  size: 0.9,  value: 0.3,  momentum: 0.1,  quality: 0.8,  lowVolatility: 0.3,  dividendYield: 0.2,  growth: 0.3 },
}

export const BARRA_FACTORS = [
  { id: 'marketBeta',     name: '市场β',       category: '市场', description: '相对于市场基准的系统性风险暴露' },
  { id: 'size',           name: '市值规模',     category: '风格', description: '小市值倾向（正值=小市值，负值=大盘股）' },
  { id: 'value',          name: '价值因子',     category: '风格', description: '账面市值比暴露，正值=价值倾向' },
  { id: 'momentum',       name: '动量因子',     category: '风格', description: '过去价格动量暴露，正值=动量策略' },
  { id: 'quality',        name: '质量因子',     category: '风格', description: '盈利能力/财务健康暴露，正值=优质公司' },
  { id: 'lowVolatility',  name: '低波动因子',   category: '风格', description: '低波动股票暴露，正值=防御性' },
  { id: 'dividendYield',  name: '股息率因子',   category: '收益', description: '高股息暴露，正值=收益导向' },
  { id: 'growth',         name: '成长因子',     category: '风格', description: '盈利增长暴露，正值=成长股' },
]

function getMockProfile(symbol: string): StockFactorProfile {
  const upper = symbol.toUpperCase().replace('.', '')
  return MOCK_PROFILES[upper] ?? {
    symbol,
    marketBeta: 1 + (Math.random() - 0.5) * 0.4,
    size: Math.random() * 1.5 - 0.25,
    value: Math.random() * 1 - 0.5,
    momentum: Math.random() * 1 - 0.5,
    quality: Math.random() * 1 - 0.25,
    lowVolatility: Math.random() * 1 - 0.5,
    dividendYield: Math.random() * 0.6 - 0.1,
    growth: Math.random() * 1 - 0.25,
  }
}

function normalizeWeights(positions: Position[]): Position[] {
  const total = positions.reduce((sum, p) => sum + p.weight, 0)
  if (total === 0) return positions.map(p => ({ ...p, weight: 1 / positions.length }))
  return positions.map(p => ({ ...p, weight: p.weight / total }))
}

export function calculatePortfolioExposure(positions: Position[]): BarraAnalysis {
  const normalized = normalizeWeights(positions)

  const exposures: FactorExposure[] = BARRA_FACTORS.map(factor => {
    let exposure = 0
    let contribution = 0

    for (const pos of normalized) {
      const profile = getMockProfile(pos.symbol)
      const factorValue = (profile as unknown as Record<string, number>)[factor.id] ?? 0
      exposure += factorValue * pos.weight
      contribution += factorValue * pos.weight * 100
    }

    return {
      factorId: factor.id,
      factorName: factor.name,
      category: factor.category,
      exposure: +exposure.toFixed(4),
      contribution: +contribution.toFixed(4),
    }
  })

  const totalExposure = exposures.reduce((sum, e) => sum + Math.abs(e.exposure), 0)

  const activeExposure = exposures
    .filter(e => e.category !== '市场')
    .reduce((sum, e) => sum + Math.abs(e.exposure), 0)

  const factorContributions = exposures
    .map(e => ({
      factor: e.factorName,
      contribution: e.contribution,
      pct: totalExposure > 0 ? (Math.abs(e.exposure) / totalExposure) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  const marketBeta = exposures.find(e => e.factorId === 'marketBeta')?.exposure ?? 1
  const riskDecomposition = [
    { source: '系统性风险 (市场β)', varianceContribution: marketBeta ** 2 * 0.04, pct: Math.min(100, (marketBeta ** 2 * 0.04) / 0.05 * 100) },
    { source: '特异性风险', varianceContribution: 0.01, pct: 20 },
    { source: '风格因子风险', varianceContribution: 0.01, pct: 20 },
  ]
  riskDecomposition[1].pct = Math.min(100, 100 - riskDecomposition[0].pct - riskDecomposition[2].pct)

  const recommendations: string[] = []
  const beta = exposures.find(e => e.factorId === 'marketBeta')?.exposure ?? 1
  if (beta > 1.3) recommendations.push('组合β值偏高（大于1.3），市场下跌时回撤风险较大，建议降低高β股票权重')
  if (beta < 0.7) recommendations.push('组合β值偏低（小于0.7），市场上涨时可能跑输基准')

  const momentum = exposures.find(e => e.factorId === 'momentum')?.exposure ?? 0
  if (momentum > 0.5) recommendations.push('动量因子暴露过高，存在动量反转风险，建议适度分散')

  const lowVol = exposures.find(e => e.factorId === 'lowVolatility')?.exposure ?? 0
  if (lowVol < -0.3) recommendations.push('低波动因子暴露为负，组合波动率可能较高，可增加防御性股票')

  const dividend = exposures.find(e => e.factorId === 'dividendYield')?.exposure ?? 0
  if (dividend > 0.4) recommendations.push('股息率因子暴露较高，组合具有收益保护特性，适合低利率环境')

  if (recommendations.length === 0) {
    recommendations.push('组合因子暴露相对均衡，未发现明显风格偏移')
  }

  return {
    positions: normalized,
    factorExposures: exposures,
    totalExposure,
    activeExposure,
    factorContributions,
    riskDecomposition,
    recommendations,
  }
}

export function getStockFactorProfile(symbol: string): StockFactorProfile {
  return getMockProfile(symbol)
}
