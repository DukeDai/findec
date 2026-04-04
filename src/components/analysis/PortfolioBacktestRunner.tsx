'use client'

import { useState, useEffect } from 'react'
import { BacktestChart } from './BacktestChart'
import { RiskMetricsCard } from './RiskMetricsCard'
import { TradeLog } from './TradeLog'
import { StrategyExplorer } from './StrategyExplorer'
import { OptimizationResults } from './OptimizationResults'
import { WalkForwardChart } from './WalkForwardChart'
import { MonteCarloChart } from './MonteCarloChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'

const STRATEGY_CONCEPTS: Record<string, { title: string; description: string; example: string }> = {
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

interface BacktestPlan {
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

interface StrategyConfig {
  id: string
  type: string
  parameters?: Record<string, number>
}

interface Trade {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  symbol: string
  reason?: string
  pnl?: number
}

interface BacktestReport {
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

const STRATEGIES = [
  { id: 'ma_crossover', name: 'MA均线交叉', description: '短期均线上穿/下穿长期均线' },
  { id: 'dual_ma', name: '双均线策略', description: '基于两条均线的趋势跟踪' },
  { id: 'rsi', name: 'RSI超买超卖', description: 'RSI低于超卖线买入，高于超买线卖出' },
  { id: 'macd', name: 'MACD交叉', description: 'MACD线上穿/下穿信号线' },
  { id: 'bollinger', name: '布林带策略', description: '价格触及下轨买入，触及上轨卖出' },
  { id: 'momentum', name: '动量策略', description: '基于价格动量的趋势跟踪' },
  { id: 'mean_reversion', name: '均值回归', description: '价格偏离均值后回归' },
  { id: 'trend_follow', name: '趋势跟踪', description: '跟随市场趋势方向交易' },
]

const PRESET_PORTFOLIOS = [
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

const DEFAULT_PERIOD = { start: '2024-01-01', end: '2024-12-31' }

export function PortfolioBacktestRunner() {
  const [plans, setPlans] = useState<BacktestPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<BacktestPlan | null>(null)
  const [report, setReport] = useState<BacktestReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [executing, setExecuting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    symbols: 'AAPL,MSFT,GOOGL',
    initialCapital: '100000',
    strategy: 'ma_crossover',
    rebalance: 'monthly',
    rebalanceThreshold: '5',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  })

  const [strategyParams, setStrategyParams] = useState({
    shortWindow: 10,
    longWindow: 30,
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    bollingerPeriod: 20,
    bollingerStdDev: 2,
  })

  const [advancedTab, setAdvancedTab] = useState<'optimization' | 'walkforward' | 'montecarlo' | null>(null)
  const [optimizationResults, setOptimizationResults] = useState<{
    params: Record<string, number>
    metrics: { totalReturn: number; sharpeRatio: number; maxDrawdown: number }
    rank: number
  }[] | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationError, setOptimizationError] = useState<string | null>(null)
  const [walkforwardResult, setWalkforwardResult] = useState<{
    trainResults: { metrics: { sharpeRatio: number; totalReturn: number } }[]
    testResults: { metrics: { sharpeRatio: number; totalReturn: number } }[]
    degradation: number
  } | null>(null)
  const [walkforwardLoading, setWalkforwardLoading] = useState(false)
  const [walkforwardError, setWalkforwardError] = useState<string | null>(null)
  const [walkforwardConfig, setWalkforwardConfig] = useState({
    trainPeriod: 60,
    testPeriod: 20,
    stepDays: 10,
  })
  const [monteCarloResult, setMonteCarloResult] = useState<{
    finalValues: number[]
    percentiles: Record<number, number>
    probabilityOfProfit: number
    averageMaxDrawdown: number
    initialValue: number
    medianReturn: number
  } | null>(null)
  const [monteCarloLoading, setMonteCarloLoading] = useState(false)
  const [monteCarloError, setMonteCarloError] = useState<string | null>(null)
  const [monteCarloConfig, setMonteCarloConfig] = useState({
    simulations: 1000,
  })

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/backtests/portfolio')
      if (!res.ok) throw new Error('Failed to load plans')
      const data = await res.json()
      setPlans(data.plans || [])
    } catch (error) {
      console.error('Failed to load plans:', error)
    }
  }

  const createPlan = async () => {
    if (!formData.name || !formData.symbols) return

    const symbols = formData.symbols.split(',').map(s => s.trim())
    const strategies: StrategyConfig[] = [{
      id: 'strategy-1',
      type: formData.strategy,
      parameters: getStrategyParameters(),
    }]

    try {
      const res = await fetch('/api/backtests/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          symbols,
          initialCapital: parseFloat(formData.initialCapital),
          strategies,
          rebalance: formData.rebalance as 'daily' | 'weekly' | 'monthly' | 'none',
          rebalanceThreshold: parseFloat(formData.rebalanceThreshold) / 100,
          startDate: formData.startDate,
          endDate: formData.endDate,
        }),
      })

      if (!res.ok) throw new Error('Failed to create plan')
      const data = await res.json()
      await loadPlans()
      setShowCreateForm(false)
      setFormData({
        name: '',
        symbols: 'AAPL,MSFT,GOOGL',
        initialCapital: '100000',
        strategy: 'ma_crossover',
        rebalance: 'monthly',
        rebalanceThreshold: '5',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      })
    } catch (error) {
      console.error('Failed to create plan:', error)
    }
  }

  const getStrategyParameters = (): Record<string, number> => {
    const base = { shortWindow: 10, longWindow: 30, positionSize: 1.0 }

    switch (formData.strategy) {
      case 'rsi':
        return {
          ...base,
          rsiPeriod: strategyParams.rsiPeriod,
          rsiOverbought: strategyParams.rsiOverbought,
          rsiOversold: strategyParams.rsiOversold,
        }
      case 'macd':
        return {
          ...base,
          macdFast: strategyParams.macdFast,
          macdSlow: strategyParams.macdSlow,
          macdSignal: strategyParams.macdSignal,
        }
      case 'bollinger':
        return {
          ...base,
          bollingerPeriod: strategyParams.bollingerPeriod,
          bollingerStdDev: strategyParams.bollingerStdDev,
        }
      default:
        return base
    }
  }

  const executeBacktest = async (planId: string) => {
    setExecuting(true)
    try {
      const res = await fetch(`/api/backtests/portfolio/${planId}/execute`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to execute backtest')
      await loadReport(planId)
      await loadPlans()
    } catch (error) {
      console.error('Failed to execute backtest:', error)
    } finally {
      setExecuting(false)
    }
  }

  const runOptimization = async (searchParams: { paramName: string; start: number; end: number; step: number }[], metric: string = 'sharpeRatio') => {
    if (!selectedPlan) return
    setOptimizing(true)
    setOptimizationError(null)
    try {
      const res = await fetch(`/api/backtests/portfolio/${selectedPlan.id}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchParams, metric }),
      })
      if (!res.ok) throw new Error('优化失败')
      const data = await res.json()
      setOptimizationResults(data.results || [])
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : '优化失败')
    } finally {
      setOptimizing(false)
    }
  }

  const runWalkForward = async () => {
    if (!selectedPlan) return
    setWalkforwardLoading(true)
    setWalkforwardError(null)
    try {
      const res = await fetch(`/api/backtests/portfolio/${selectedPlan.id}/walkforward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walkforwardConfig),
      })
      if (!res.ok) throw new Error('向前验证失败')
      const data = await res.json()
      setWalkforwardResult(data)
    } catch (error) {
      setWalkforwardError(error instanceof Error ? error.message : '向前验证失败')
    } finally {
      setWalkforwardLoading(false)
    }
  }

  const runMonteCarlo = async () => {
    if (!selectedPlan) return
    setMonteCarloLoading(true)
    setMonteCarloError(null)
    try {
      const res = await fetch(`/api/backtests/portfolio/${selectedPlan.id}/montecarlo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monteCarloConfig),
      })
      if (!res.ok) throw new Error('蒙特卡洛模拟失败')
      const data = await res.json()
      setMonteCarloResult(data)
    } catch (error) {
      setMonteCarloError(error instanceof Error ? error.message : '蒙特卡洛模拟失败')
    } finally {
      setMonteCarloLoading(false)
    }
  }

  const applyBestParams = () => {
    if (optimizationResults && optimizationResults.length > 0) {
      const best = optimizationResults[0]
      setStrategyParams(prev => ({
        ...prev,
        ...best.params,
      }))
    }
  }

  const getParamRanges = (strategyType: string): Record<string, { min: number; max: number; step: number }> => {
    const ranges: Record<string, Record<string, { min: number; max: number; step: number }>> = {
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

  const loadReport = async (planId: string) => {
    try {
      const res = await fetch(`/api/backtests/portfolio/${planId}/report`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error('Failed to load report:', error)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    if (selectedPlan?.status === 'completed') {
      loadReport(selectedPlan.id)
    } else {
      setReport(null)
    }
  }, [selectedPlan])

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium">快速回测</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_PORTFOLIOS.map((portfolio) => (
            <button
              key={portfolio.id}
              onClick={() => {
                setFormData({
                  ...formData,
                  name: portfolio.name,
                  symbols: portfolio.symbols.join(','),
                })
                setShowCreateForm(true)
              }}
              className="p-4 rounded-lg border text-left hover:border-primary/50 transition-colors"
            >
              <div className="font-medium mb-1">{portfolio.name}</div>
              <div className="text-sm text-muted-foreground">{portfolio.description}</div>
              <div className="text-xs text-muted-foreground mt-2">
                {portfolio.symbols.join(', ')}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={loadPlans}>
            刷新列表
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            新建组合回测
          </Button>
        </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新建组合回测计划</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">回测名称</label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入回测名称"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">股票代码 (逗号分隔)</label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={formData.symbols}
                  onChange={(e) => setFormData({ ...formData, symbols: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">初始资金</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={formData.initialCapital}
                  onChange={(e) => setFormData({ ...formData, initialCapital: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">开始日期</label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">结束日期</label>
                <input
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  策略
                  {STRATEGY_CONCEPTS[formData.strategy] && (
                    <ConceptTooltip
                      concept={formData.strategy}
                      title={STRATEGY_CONCEPTS[formData.strategy].title}
                      description={STRATEGY_CONCEPTS[formData.strategy].description}
                      example={STRATEGY_CONCEPTS[formData.strategy].example}
                    >
                      <span></span>
                    </ConceptTooltip>
                  )}
                </label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={formData.strategy}
                  onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                >
                  {STRATEGIES.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">再平衡</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={formData.rebalance}
                  onChange={(e) => setFormData({ ...formData, rebalance: e.target.value })}
                >
                  <option value="daily">每日</option>
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                  <option value="none">不执行</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">再平衡阈值 (%)</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={formData.rebalanceThreshold}
                  onChange={(e) => setFormData({ ...formData, rebalanceThreshold: e.target.value })}
                />
              </div>
            </div>

            {formData.strategy === 'rsi' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">RSI周期</label>
                  <input
                    type="number"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                    value={strategyParams.rsiPeriod}
                    onChange={(e) => setStrategyParams({ ...strategyParams, rsiPeriod: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">超买线</label>
                  <input
                    type="number"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                    value={strategyParams.rsiOverbought}
                    onChange={(e) => setStrategyParams({ ...strategyParams, rsiOverbought: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">超卖线</label>
                  <input
                    type="number"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                    value={strategyParams.rsiOversold}
                    onChange={(e) => setStrategyParams({ ...strategyParams, rsiOversold: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={createPlan}>创建</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">回测计划</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPlan?.id === plan.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {plan.symbols.join(', ')} · {plan.startDate} 至 {plan.endDate}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        plan.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : plan.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {plan.status === 'completed' ? '已完成' : plan.status === 'running' ? '运行中' : '待执行'}
                      </span>
                      {plan.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            executeBacktest(plan.id)
                          }}
                          disabled={executing}
                        >
                          {executing ? '执行中...' : '执行'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {plan.status === 'completed' && plan.metrics.portfolioReturn !== null && (
                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground">总收益</div>
                        <div className={`font-medium ${plan.metrics.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {plan.metrics.portfolioReturn >= 0 ? '+' : ''}{plan.metrics.portfolioReturn.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">夏普比率</div>
                        <div className="font-medium">{plan.metrics.portfolioSharpe?.toFixed(2) || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">最大回撤</div>
                        <div className="font-medium text-red-600">{plan.metrics.portfolioMaxDrawdown?.toFixed(2) || '-'}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">波动率</div>
                        <div className="font-medium">{plan.metrics.portfolioVolatility?.toFixed(2) || '-'}%</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {report && selectedPlan && (
        <div className="space-y-4">
          <RiskMetricsCard
            metrics={report.summary}
            period={{ start: new Date(selectedPlan.startDate), end: new Date(selectedPlan.endDate) }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">收益曲线</CardTitle>
            </CardHeader>
            <CardContent>
              <BacktestChart
                equityCurve={report.equityCurve.map(p => ({ date: new Date(p.date), value: p.value }))}
                trades={report.trades}
                height={400}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">交易日志</CardTitle>
            </CardHeader>
            <CardContent>
              <TradeLog trades={report.trades} pageSize={50} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">高级分析</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={advancedTab === 'optimization' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdvancedTab(advancedTab === 'optimization' ? null : 'optimization')}
                  >
                    参数优化
                  </Button>
                  <Button
                    variant={advancedTab === 'walkforward' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdvancedTab(advancedTab === 'walkforward' ? null : 'walkforward')}
                  >
                    向前验证
                  </Button>
                  <Button
                    variant={advancedTab === 'montecarlo' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdvancedTab(advancedTab === 'montecarlo' ? null : 'montecarlo')}
                  >
                    蒙特卡洛
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {advancedTab === 'optimization' && (
                <div className="space-y-4">
                  {optimizationError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                      {optimizationError}
                    </div>
                  )}
                  {selectedPlan.strategies[0] && (
                    <StrategyExplorer
                      strategyType={selectedPlan.strategies[0].type}
                      defaultParams={selectedPlan.strategies[0].parameters || {}}
                      paramRanges={getParamRanges(selectedPlan.strategies[0].type)}
                      onParamsChange={(params) => console.log('Params changed:', params)}
                      onRun={(params) => {
                        const searchParams = Object.entries(getParamRanges(selectedPlan.strategies[0].type)).map(([key, range]) => ({
                          paramName: key,
                          start: range.min,
                          end: range.max,
                          step: range.step,
                        }))
                        runOptimization(searchParams)
                      }}
                    />
                  )}
                  {optimizing && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">正在优化参数...</span>
                    </div>
                  )}
                  {optimizationResults && !optimizing && (
                    <OptimizationResults
                      results={optimizationResults}
                      onSelectBest={applyBestParams}
                    />
                  )}
                </div>
              )}

              {advancedTab === 'walkforward' && (
                <div className="space-y-4">
                  {walkforwardError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                      {walkforwardError}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground">训练期 (天)</label>
                      <input
                        type="number"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                        value={walkforwardConfig.trainPeriod}
                        onChange={(e) => setWalkforwardConfig({ ...walkforwardConfig, trainPeriod: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">测试期 (天)</label>
                      <input
                        type="number"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                        value={walkforwardConfig.testPeriod}
                        onChange={(e) => setWalkforwardConfig({ ...walkforwardConfig, testPeriod: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">步长 (天)</label>
                      <input
                        type="number"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                        value={walkforwardConfig.stepDays}
                        onChange={(e) => setWalkforwardConfig({ ...walkforwardConfig, stepDays: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button onClick={runWalkForward} disabled={walkforwardLoading} className="w-full">
                    {walkforwardLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在运行...
                      </>
                    ) : (
                      '运行向前验证'
                    )}
                  </Button>
                  {walkforwardResult && !walkforwardLoading && (
                    <WalkForwardChart result={walkforwardResult} />
                  )}
                </div>
              )}

              {advancedTab === 'montecarlo' && (
                <div className="space-y-4">
                  {monteCarloError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                      {monteCarloError}
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground">模拟次数</label>
                    <input
                      type="number"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                      value={monteCarloConfig.simulations}
                      onChange={(e) => setMonteCarloConfig({ ...monteCarloConfig, simulations: parseInt(e.target.value) })}
                      min={100}
                      max={10000}
                    />
                  </div>
                  <Button onClick={runMonteCarlo} disabled={monteCarloLoading} className="w-full">
                    {monteCarloLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在运行...
                      </>
                    ) : (
                      '运行蒙特卡洛模拟'
                    )}
                  </Button>
                  {monteCarloResult && !monteCarloLoading && (
                    <MonteCarloChart result={monteCarloResult} />
                  )}
                </div>
              )}

              {!advancedTab && (
                <div className="text-center py-8 text-muted-foreground">
                  点击上方按钮选择高级分析功能
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}
