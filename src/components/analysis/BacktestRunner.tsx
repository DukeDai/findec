'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, TrendingUp, Activity, Zap } from 'lucide-react'
import { MetricCard } from '@/components/ui/metric-explanation'
import { ParameterGuide } from '@/components/ui/parameter-guide'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'

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

const CONCEPT_DEFINITIONS: Record<string, { name: string; description: string; interpretation: string }> = {
  '夏普比率': {
    name: '夏普比率 (Sharpe Ratio)',
    description: '衡量每承担一单位风险所获得的超额收益。计算公式为 (策略收益率 - 无风险收益率) / 策略收益标准差。',
    interpretation: '夏普比率 > 1 表示较好，> 2 非常好，< 0 表示策略还不如无风险资产。'
  },
  '最大回撤': {
    name: '最大回撤 (Max Drawdown)',
    description: '策略从历史最高点到最低点的最大跌幅。反映策略可能遭受的最大损失。',
    interpretation: '最大回撤越小越好。一般认为 < 20% 可接受，< 10% 优秀。'
  },
  '卡尔玛比率': {
    name: '卡尔玛比率 (Calmar Ratio)',
    description: '年化收益与最大回撤的比值。衡量每单位最大回撤对应的收益。',
    interpretation: '卡尔玛比率越高越好。> 1 表示优质策略，> 2 非常优秀。'
  },
  '索提诺比率': {
    name: '索提诺比率 (Sortino Ratio)',
    description: '类似夏普比率，但只考虑下行波动风险。计算公式为 (收益 - 目标收益) / 下行标准差。',
    interpretation: '索提诺比率越高越好，因为它更关注对投资者重要的下行风险。'
  },
  'VaR': {
    name: '风险价值 (VaR)',
    description: '在给定置信水平下，策略在特定时间内可能遭受的最大损失。',
    interpretation: 'VaR 95% = -5% 表示有 95% 的概率，损失不会超过 5%。'
  },
  '波动率': {
    name: '波动率 (Volatility)',
    description: '策略收益的标准差，衡量收益的离散程度。',
    interpretation: '波动率越高，策略风险越大。一般与收益正相关。'
  },
  '胜率': {
    name: '胜率 (Win Rate)',
    description: '盈利交易次数占总交易次数的比例。',
    interpretation: '高胜率不一定盈利好，还需要看盈亏比。趋势策略胜率低但盈亏比高。'
  }
}

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
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">快速回测</p>
          <ConceptTooltip
            concept="快速回测"
            title="快速回测"
            description="使用预设参数快速体验不同策略的效果"
            example="点击任意策略即可使用AAPL 2024年数据进行回测"
          >
            <span></span>
          </ConceptTooltip>
        </div>
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
            <div className="space-y-4">
              <ParameterGuide
                paramName="短期均线周期"
                value={strategyConfig.shortWindow}
                min={5}
                max={50}
                typicalValues={[10, 20, 30]}
                onChange={(v) => setStrategyConfig({ ...strategyConfig, shortWindow: v })}
                description="短期均线使用的天数。值越小反应越快，但也可能产生更多假信号。"
              />
              <ParameterGuide
                paramName="长期均线周期"
                value={strategyConfig.longWindow}
                min={20}
                max={200}
                typicalValues={[50, 100, 200]}
                onChange={(v) => setStrategyConfig({ ...strategyConfig, longWindow: v })}
                description="长期均线使用的天数。值越大越稳定，但信号滞后。"
              />
            </div>
          )}

          {strategyConfig.strategy === 'rsi' && (
            <div className="space-y-4">
              <ParameterGuide
                paramName="RSI周期"
                value={strategyConfig.rsiPeriod}
                min={5}
                max={30}
                typicalValues={[7, 14, 21]}
                onChange={(v) => setStrategyConfig({ ...strategyConfig, rsiPeriod: v })}
                description="RSI计算使用的周期。常用14天。"
              />
              <ParameterGuide
                paramName="超买线"
                value={strategyConfig.rsiOverbought}
                min={60}
                max={90}
                typicalValues={[70, 75, 80]}
                onChange={(v) => setStrategyConfig({ ...strategyConfig, rsiOverbought: v })}
                description="RSI高于此值视为超买，产生卖出信号。"
              />
              <ParameterGuide
                paramName="超卖线"
                value={strategyConfig.rsiOversold}
                min={10}
                max={40}
                typicalValues={[20, 25, 30]}
                onChange={(v) => setStrategyConfig({ ...strategyConfig, rsiOversold: v })}
                description="RSI低于此值视为超卖，产生买入信号。"
              />
            </div>
          )}

          {strategyConfig.strategy === 'bollinger' && (
            <div className="space-y-4">
              <ParameterGuide
                paramName="布林带周期"
                value={strategyConfig.bollingerPeriod}
                min={10}
                max={50}
                typicalValues={[14, 20, 26]}
                onChange={(v) => setStrategyConfig({ ...strategyConfig, bollingerPeriod: v })}
                description="布林带中轨的均线周期。常用20天。"
              />
              <ParameterGuide
                paramName="标准差倍数"
                value={strategyConfig.bollingerStdDev}
                min={1}
                max={4}
                step={0.5}
                typicalValues={[1.5, 2, 2.5]}
                onChange={(v) => setStrategyConfig({ ...strategyConfig, bollingerStdDev: v })}
                description="上下轨距离中轨的标准差倍数。常用2倍。"
              />
            </div>
          )}

          <div className="space-y-4">
            <ParameterGuide
              paramName="止损 % (0=不启用)"
              value={strategyConfig.stopLoss}
              min={0}
              max={20}
              step={0.5}
              typicalValues={[0, 3, 5, 8]}
              onChange={(v) => setStrategyConfig({ ...strategyConfig, stopLoss: v })}
              description="亏损超过此百分比自动卖出。0表示不启用止损。"
            />
            <ParameterGuide
              paramName="止盈 % (0=不启用)"
              value={strategyConfig.takeProfit}
              min={0}
              max={50}
              step={0.5}
              typicalValues={[0, 10, 20, 30]}
              onChange={(v) => setStrategyConfig({ ...strategyConfig, takeProfit: v })}
              description="盈利超过此百分比自动卖出。0表示不启用止盈。"
            />
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
          <MetricCard
            label="总收益"
            value={selectedPlan.totalReturn || 0}
            format="percent"
            change={selectedPlan.totalReturn || 0}
            concept={{
              name: '总收益',
              description: '回测期间的总收益百分比',
              interpretation: '正数表示盈利，负数表示亏损'
            }}
          />
          <MetricCard
            label="夏普比率"
            value={selectedPlan.sharpeRatio || 0}
            format="ratio"
            concept={{
              name: CONCEPT_DEFINITIONS['夏普比率'].name,
              description: CONCEPT_DEFINITIONS['夏普比率'].description,
              interpretation: CONCEPT_DEFINITIONS['夏普比率'].interpretation
            }}
          />
          <MetricCard
            label="最大回撤"
            value={selectedPlan.maxDrawdown || 0}
            format="percent"
            concept={{
              name: CONCEPT_DEFINITIONS['最大回撤'].name,
              description: CONCEPT_DEFINITIONS['最大回撤'].description,
              interpretation: CONCEPT_DEFINITIONS['最大回撤'].interpretation
            }}
          />
          <MetricCard
            label="交易次数"
            value={trades.filter((t) => t.type === 'SELL').length}
            concept={{
              name: '交易次数',
              description: '回测期间的总卖出交易次数',
              interpretation: '次数过多可能意味着过度交易，产生更多成本'
            }}
          />
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