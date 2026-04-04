'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, TrendingUp, Activity, Zap } from 'lucide-react'

interface BacktestPlan {
  id: string
  name: string
  symbols: string
  startDate: string
  endDate: string
  initialCapital: number
  totalReturn?: number
  sharpeRatio?: number
  maxDrawdown?: number
}

interface BacktestTrade {
  id: string
  symbol: string
  type: string
  quantity: number
  price: number
  date: string
}

interface EquityPoint {
  date: string
  value: number
}

const QUICK_STRATEGIES: { id: string; name: string; params: Record<string, number> }[] = [
  { id: 'ma_crossover', name: 'MA均线交叉', params: { shortWindow: 20, longWindow: 50 } },
  { id: 'rsi', name: 'RSI超买超卖', params: { rsiPeriod: 14, rsiOverbought: 70, rsiOversold: 30 } },
  { id: 'macd', name: 'MACD交叉', params: { macdFast: 12, macdSlow: 26, macdSignal: 9 } },
  { id: 'bollinger', name: '布林带', params: { bollingerPeriod: 20, bollingerStdDev: 2 } },
]

const DEFAULT_SYMBOL = 'AAPL'
const DEFAULT_PERIOD = { start: '2024-01-01', end: '2024-12-31' }

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

export function BacktestRunner() {
  const [plans, setPlans] = useState<BacktestPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<BacktestPlan | null>(null)
  const [trades, setTrades] = useState<BacktestTrade[]>([])
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([])
  const [running, setRunning] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showConfigForm, setShowConfigForm] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    symbols: 'AAPL,MSFT,GOOGL',
    startDate: DEFAULT_PERIOD.start,
    endDate: DEFAULT_PERIOD.end,
    initialCapital: '100000',
  })

  const [strategyConfig, setStrategyConfig] = useState({
    strategy: 'ma_crossover',
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
    momentumPeriod: 10,
    momentumThreshold: 5,
    meanReversionPeriod: 20,
    meanReversionThreshold: 5,
    stopLoss: 0,
    takeProfit: 0,
  })

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/backtests')
      const data = await res.json()
      setPlans(data)
    } catch (error) {
      console.error('Failed to load plans:', error)
    }
  }

  const loadTrades = async (planId: string) => {
    try {
      const res = await fetch(`/api/backtests/${planId}`)
      const data = await res.json()
      setTrades(data.trades || [])
    } catch (error) {
      console.error('Failed to load trades:', error)
    }
  }

  const createPlan = async () => {
    if (!formData.name || !formData.symbols) return

    try {
      const res = await fetch('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          symbols: formData.symbols.split(',').map(s => s.trim()),
          startDate: formData.startDate,
          endDate: formData.endDate,
          initialCapital: parseFloat(formData.initialCapital),
        }),
      })
      const data = await res.json()
      setPlans((prev) => [data, ...prev])
      setSelectedPlan(data)
      setShowCreateForm(false)
      setFormData({
        name: '',
        symbols: 'AAPL,MSFT,GOOGL',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        initialCapital: '100000',
      })
    } catch (error) {
      console.error('Failed to create plan:', error)
    }
  }

  const runBacktest = async () => {
    if (!selectedPlan) return
    setRunning(true)
    try {
      const params: any = {}
      
      if (['ma_crossover', 'dual_ma', 'trend_follow'].includes(strategyConfig.strategy)) {
        params.shortWindow = strategyConfig.shortWindow
        params.longWindow = strategyConfig.longWindow
      }
      if (strategyConfig.strategy === 'rsi') {
        params.rsiPeriod = strategyConfig.rsiPeriod
        params.rsiOverbought = strategyConfig.rsiOverbought
        params.rsiOversold = strategyConfig.rsiOversold
      }
      if (strategyConfig.strategy === 'macd') {
        params.macdFast = strategyConfig.macdFast
        params.macdSlow = strategyConfig.macdSlow
        params.macdSignal = strategyConfig.macdSignal
      }
      if (strategyConfig.strategy === 'bollinger') {
        params.bollingerPeriod = strategyConfig.bollingerPeriod
        params.bollingerStdDev = strategyConfig.bollingerStdDev
      }
      if (strategyConfig.strategy === 'momentum') {
        params.momentumPeriod = strategyConfig.momentumPeriod
        params.momentumThreshold = strategyConfig.momentumThreshold
      }
      if (strategyConfig.strategy === 'mean_reversion') {
        params.meanReversionPeriod = strategyConfig.meanReversionPeriod
        params.meanReversionThreshold = strategyConfig.meanReversionThreshold
      }
      if (strategyConfig.stopLoss > 0) params.stopLoss = strategyConfig.stopLoss
      if (strategyConfig.takeProfit > 0) params.takeProfit = strategyConfig.takeProfit

      const res = await fetch(`/api/backtests/${selectedPlan.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: strategyConfig.strategy,
          parameters: params,
        }),
      })
      const data = await res.json()
      setSelectedPlan(data)
      setTrades(data.trades || [])
      setEquityCurve(data.equityCurve || [])
      setShowConfigForm(false)
    } catch (error) {
      console.error('Failed to run backtest:', error)
    } finally {
      setRunning(false)
    }
  }

  const quickBacktest = async (strategyId: string, params: Record<string, number>) => {
    setRunning(true)
    setSelectedPlan(null)
    setTrades([])
    setEquityCurve([])
    try {
      const res = await fetch('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${strategyId} - ${DEFAULT_SYMBOL}`,
          symbols: [DEFAULT_SYMBOL],
          startDate: DEFAULT_PERIOD.start,
          endDate: DEFAULT_PERIOD.end,
          initialCapital: 100000,
        }),
      })
      const plan = await res.json()
      
      const executeRes = await fetch(`/api/backtests/${plan.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: strategyId,
          parameters: params,
        }),
      })
      const data = await executeRes.json()
      setSelectedPlan(data)
      setTrades(data.trades || [])
      setEquityCurve(data.equityCurve || [])
    } catch (error) {
      console.error('Failed to run quick backtest:', error)
    } finally {
      setRunning(false)
    }
  }

  const selectedStrategyInfo = STRATEGIES.find(s => s.id === strategyConfig.strategy)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium">快速回测</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_STRATEGIES.map((qs) => (
            <button
              key={qs.id}
              onClick={() => quickBacktest(qs.id, qs.params)}
              disabled={running}
              className="p-3 rounded-lg border text-left hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                {qs.id === 'ma_crossover' && <TrendingUp className="w-4 h-4 text-blue-500" />}
                {qs.id === 'rsi' && <Activity className="w-4 h-4 text-green-500" />}
                {qs.id === 'macd' && <Zap className="w-4 h-4 text-purple-500" />}
                {qs.id === 'bollinger' && <Play className="w-4 h-4 text-orange-500" />}
                <span className="font-medium text-sm">{qs.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{DEFAULT_SYMBOL} 2024年</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex gap-2">
        <Button variant="outline" onClick={loadPlans}>
          加载回测
        </Button>
        <Button onClick={() => setShowCreateForm(true)}>
          新建回测
        </Button>
        {selectedPlan && (
          <Button onClick={() => setShowConfigForm(true)} variant="secondary">
            配置策略
          </Button>
        )}
      </div>

      {showCreateForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
          <h3 className="font-medium">新建回测计划</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="回测名称"
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="股票代码 (逗号分隔)"
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={formData.symbols}
              onChange={(e) => setFormData({ ...formData, symbols: e.target.value })}
            />
            <input
              type="date"
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <input
              type="date"
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            <input
              type="number"
              placeholder="初始资金"
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={formData.initialCapital}
              onChange={(e) => setFormData({ ...formData, initialCapital: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={createPlan}>创建</Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {showConfigForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
          <h3 className="font-medium">策略配置</h3>
          
          <div>
            <label className="text-sm text-muted-foreground">选择策略</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
              value={strategyConfig.strategy}
              onChange={(e) => setStrategyConfig({ ...strategyConfig, strategy: e.target.value as any })}
            >
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>{s.name} - {s.description}</option>
              ))}
            </select>
          </div>

          {['ma_crossover', 'dual_ma', 'trend_follow'].includes(strategyConfig.strategy) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">短期均线周期</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={strategyConfig.shortWindow}
                  onChange={(e) => setStrategyConfig({ ...strategyConfig, shortWindow: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">长期均线周期</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={strategyConfig.longWindow}
                  onChange={(e) => setStrategyConfig({ ...strategyConfig, longWindow: parseInt(e.target.value) })}
                />
              </div>
            </div>
          )}

          {strategyConfig.strategy === 'rsi' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">RSI周期</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={strategyConfig.rsiPeriod}
                  onChange={(e) => setStrategyConfig({ ...strategyConfig, rsiPeriod: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">超买线</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={strategyConfig.rsiOverbought}
                  onChange={(e) => setStrategyConfig({ ...strategyConfig, rsiOverbought: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">超卖线</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={strategyConfig.rsiOversold}
                  onChange={(e) => setStrategyConfig({ ...strategyConfig, rsiOversold: parseInt(e.target.value) })}
                />
              </div>
            </div>
          )}

          {strategyConfig.strategy === 'bollinger' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">周期</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={strategyConfig.bollingerPeriod}
                  onChange={(e) => setStrategyConfig({ ...strategyConfig, bollingerPeriod: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">标准差倍数</label>
                <input
                  type="number"
                  step="0.5"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={strategyConfig.bollingerStdDev}
                  onChange={(e) => setStrategyConfig({ ...strategyConfig, bollingerStdDev: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">止损 % (0=不启用)</label>
              <input
                type="number"
                step="0.5"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={strategyConfig.stopLoss}
                onChange={(e) => setStrategyConfig({ ...strategyConfig, stopLoss: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">止盈 % (0=不启用)</label>
              <input
                type="number"
                step="0.5"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                value={strategyConfig.takeProfit}
                onChange={(e) => setStrategyConfig({ ...strategyConfig, takeProfit: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={runBacktest} disabled={running}>
              {running ? '运行中...' : '执行回测'}
            </Button>
            <Button variant="outline" onClick={() => setShowConfigForm(false)}>取消</Button>
          </div>
        </div>
      )}

      {plans.length > 0 && (
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={selectedPlan?.id || ''}
          onChange={(e) => {
            const plan = plans.find((p) => p.id === e.target.value)
            setSelectedPlan(plan || null)
            if (plan) {
              loadTrades(plan.id)
            }
          }}
        >
          <option value="">选择回测...</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} - {p.symbols}
            </option>
          ))}
        </select>
      )}

      {selectedPlan && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">总收益</div>
            <div className={`text-lg font-bold ${(selectedPlan.totalReturn || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {selectedPlan.totalReturn?.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">夏普比率</div>
            <div className="text-lg font-bold">{selectedPlan.sharpeRatio?.toFixed(2)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">最大回撤</div>
            <div className="text-lg font-bold text-red-500">{selectedPlan.maxDrawdown?.toFixed(2)}%</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">交易次数</div>
            <div className="text-lg font-bold">{trades.filter((t) => t.type === 'SELL').length}</div>
          </div>
        </div>
      )}

      {equityCurve.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-3">收益曲线</h3>
          <div className="h-48 flex items-end gap-px">
            {equityCurve.filter((_, i) => i % Math.max(1, Math.floor(equityCurve.length / 100)) === 0).map((point, i) => {
              const max = Math.max(...equityCurve.map(p => p.value))
              const min = Math.min(...equityCurve.map(p => p.value))
              const range = max - min || 1
              const height = ((point.value - min) / range) * 100
              const isProfit = point.value > (equityCurve[0]?.value || 0)
              return (
                <div
                  key={i}
                  className={`flex-1 ${isProfit ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ height: `${Math.max(5, height)}%` }}
                  title={`${new Date(point.date).toLocaleDateString()}: $${point.value.toFixed(2)}`}
                />
              )
            })}
          </div>
        </div>
      )}

      {trades.length > 0 && (
        <div className="rounded-md border max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">日期</th>
                <th className="px-3 py-2 text-left">股票</th>
                <th className="px-3 py-2 text-left">方向</th>
                <th className="px-3 py-2 text-right">数量</th>
                <th className="px-3 py-2 text-right">价格</th>
                <th className="px-3 py-2 text-right">金额</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 font-medium">{t.symbol}</td>
                  <td className={`px-3 py-2 ${t.type === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                    {t.type === 'BUY' ? '买入' : '卖出'}
                  </td>
                  <td className="px-3 py-2 text-right">{t.quantity}</td>
                  <td className="px-3 py-2 text-right">${t.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">${(t.quantity * t.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}