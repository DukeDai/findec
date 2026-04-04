export const STRATEGY_CONCEPTS: Record<string, { title: string; description: string; example: string }> = {
  'ma_crossover': {
    title: 'MA均线交叉策略',
    description: '通过短期均线和长期均线的交叉产生买卖信号。当短期均线上穿长期均线时买入，下穿时卖出。',
    example: '20日均线突破50日均线时买入，跌破时卖出。适合趋势明显的市场。'
  },
  'dual_ma': {
    title: '双均线策略',
    description: '使用两条不同周期的均线，通过价格与均线的相对位置判断趋势。',
    example: '价格在双均线上方看多，下方看空。适合中长期趋势跟踪。'
  },
  'rsi': {
    title: 'RSI超买超卖策略',
    description: '相对强弱指标(RSI)衡量价格变动速度和幅度，判断超买超卖状态。',
    example: 'RSI < 30 超卖买入，RSI > 70 超买卖出。震荡市效果更好。'
  },
  'macd': {
    title: 'MACD策略',
    description: '移动平均收敛散度，通过快慢线和信号线的交叉产生交易信号。',
    example: 'MACD线上穿信号线买入，下穿卖出。适合捕捉趋势转折。'
  },
  'bollinger': {
    title: '布林带策略',
    description: '由中轨(均线)和上下轨(标准差)组成，价格在轨道间波动。',
    example: '触及下轨买入，触及上轨卖出。适合区间震荡行情。'
  },
  'momentum': {
    title: '动量策略',
    description: '基于价格动量(涨幅)进行交易，强者恒强。',
    example: '过去N天涨幅最大的股票买入，跌幅大的卖出。适合强势市场。'
  },
  'mean_reversion': {
    title: '均值回归策略',
    description: '假设价格会回归长期均值，偏离均值时反向操作。',
    example: '价格远高于均线时卖出，远低于时买入。适合震荡市。'
  },
  'trend_follow': {
    title: '趋势跟踪策略',
    description: '顺势而为，在确认趋势方向后跟随交易。',
    example: '趋势向上时做多，向下时做空或空仓。趋势越强收益越好。'
  }
}

export interface BacktestPlan {
  id: string
  name: string
  symbols: string[]
  allocation?: Record<string, number>
  strategies: StrategyConfig[]
  rebalance: string
  rebalanceThreshold: number | null
  initialCapital: number
  startDate: string
  endDate: string
  status: string
  metrics: {
    portfolioReturn: number | null
    portfolioSharpe: number | null
    portfolioSortino: number | null
    portfolioCalmar: number | null
    portfolioMaxDrawdown: number | null
    portfolioVolatility: number | null
    portfolioVaR95: number | null
  }
  createdAt: string
  updatedAt: string
}

export interface StrategyConfig {
  id: string
  type: string
  parameters?: Record<string, number>
}

export interface Trade {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  symbol: string
  reason?: string
  pnl?: number
}

export interface BacktestReport {
  summary: {
    portfolioReturn: number
    portfolioSharpe: number
    portfolioSortino: number
    portfolioCalmar: number
    portfolioMaxDrawdown: number
    portfolioVolatility: number
    portfolioVaR95: number
    totalTrades: number
    winRate: number
  }
  equityCurve: { date: string; value: number }[]
  trades: Trade[]
  riskMetrics: {
    sharpe: number
    sortino: number
    calmar: number
    volatility: number
    var95: number
  }
  assetBreakdown: { symbol: string; return: number; weight: number }[]
  monthlyReturns: { month: string; return: number }[]
}

export const STRATEGIES = [
  { id: 'ma_crossover', name: 'MA均线交叉', description: '短期均线上穿/下穿长期均线' },
  { id: 'dual_ma', name: '双均线策略', description: '基于两条均线的趋势跟踪' },
  { id: 'rsi', name: 'RSI超买超卖', description: 'RSI低于超卖线买入，高于超买线卖出' },
  { id: 'macd', name: 'MACD交叉', description: 'MACD线上穿/下穿信号线' },
  { id: 'bollinger', name: '布林带策略', description: '价格触及下轨买入，触及上轨卖出' },
  { id: 'momentum', name: '动量策略', description: '基于价格动量的趋势跟踪' },
  { id: 'mean_reversion', name: '均值回归', description: '价格偏离均值后回归' },
  { id: 'trend_follow', name: '趋势跟踪', description: '跟随市场趋势方向交易' },
]

export const PRESET_PORTFOLIOS = [
  {
    id: 'tech_giant',
    name: '科技巨头',
    description: '苹果、微软、谷歌、亚马逊、META',
    symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'],
  },
  {
    id: 'diversified',
    name: '分散组合',
    description: '科技、金融、消费、医疗',
    symbols: ['AAPL', 'JPM', 'JNJ', 'PG', 'XOM'],
  },
  {
    id: 'growth',
    name: '成长型',
    description: '特斯拉、英伟达、超微半导体、云软件',
    symbols: ['TSLA', 'NVDA', 'AMD', 'CRM', 'SNOW'],
  },
]

export const DEFAULT_PERIOD = { start: '2024-01-01', end: '2024-12-31' }

export interface OptimizationResult {
  params: Record<string, number>
  metrics: { totalReturn: number; sharpeRatio: number; maxDrawdown: number }
  rank: number
}

export interface WalkForwardResult {
  trainResults: { metrics: { sharpeRatio: number; totalReturn: number } }[]
  testResults: { metrics: { sharpeRatio: number; totalReturn: number } }[]
  degradation: number
}

export interface MonteCarloResult {
  finalValues: number[]
  percentiles: Record<number, number>
  probabilityOfProfit: number
  averageMaxDrawdown: number
  initialValue: number
  medianReturn: number
}

export interface ParamRange {
  min: number
  max: number
  step: number
}

export function getParamRanges(strategyType: string): Record<string, ParamRange> {
  const ranges: Record<string, Record<string, ParamRange>> = {
    ma_crossover: {
      shortWindow: { min: 5, max: 30, step: 5 },
      longWindow: { min: 20, max: 100, step: 10 },
    },
    dual_ma: {
      shortWindow: { min: 5, max: 30, step: 5 },
      longWindow: { min: 20, max: 100, step: 10 },
    },
    rsi: {
      rsiPeriod: { min: 7, max: 21, step: 2 },
      rsiOverbought: { min: 60, max: 80, step: 5 },
      rsiOversold: { min: 20, max: 40, step: 5 },
    },
    macd: {
      macdFast: { min: 8, max: 16, step: 2 },
      macdSlow: { min: 20, max: 30, step: 2 },
      macdSignal: { min: 7, max: 12, step: 1 },
    },
    bollinger: {
      bollingerPeriod: { min: 10, max: 30, step: 5 },
      bollingerStdDev: { min: 1.5, max: 3, step: 0.5 },
    },
    momentum: {
      shortWindow: { min: 10, max: 60, step: 10 },
    },
    mean_reversion: {
      shortWindow: { min: 10, max: 60, step: 10 },
    },
    trend_follow: {
      shortWindow: { min: 20, max: 100, step: 10 },
      longWindow: { min: 50, max: 200, step: 10 },
    },
  }
  return ranges[strategyType] || ranges.ma_crossover
}
