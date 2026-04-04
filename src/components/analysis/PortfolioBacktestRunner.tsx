'use client'

import { useState, useEffect } from 'react'
import { BacktestChart } from './BacktestChart'
import { RiskMetricsCard } from './RiskMetricsCard'
import { TradeLog } from './TradeLog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="space-y-4">
      <div className="flex gap-2">
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
                <label className="text-sm text-muted-foreground">策略</label>
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
        </div>
      )}
    </div>
  )
}
