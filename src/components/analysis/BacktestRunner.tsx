'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CostModelPanel } from './CostModelPanel'
import { QuickStrategyCards, BacktestForm, BacktestResult } from './backtest'
import { ExportPanel } from './ExportPanel'
import { StrategyBattle } from './StrategyBattle'
import { VersionHistory } from '@/components/strategy-editor/VersionHistory'
import type { CostModelConfig } from '@/lib/backtest/cost-model'
import { DEFAULT_COST_MODEL } from '@/lib/backtest/cost-model'
import { Swords, Activity } from 'lucide-react'
import { SensitivityChart } from './SensitivityChart'
import type { SensitivityResult } from '@/lib/backtest/sensitivity-analysis'

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

interface StrategyConfig {
  strategy: string
  shortWindow: number
  longWindow: number
  rsiPeriod: number
  rsiOverbought: number
  rsiOversold: number
  macdFast: number
  macdSlow: number
  macdSignal: number
  bollingerPeriod: number
  bollingerStdDev: number
  momentumPeriod: number
  momentumThreshold: number
  meanReversionPeriod: number
  meanReversionThreshold: number
  stopLoss: number
  takeProfit: number
}

const PARAMETER_OPTIONS = [
  { value: 'shortWindow', label: '短期均线周期', min: 5, max: 50, step: 5 },
  { value: 'longWindow', label: '长期均线周期', min: 20, max: 200, step: 10 },
  { value: 'rsiPeriod', label: 'RSI周期', min: 5, max: 30, step: 1 },
  { value: 'rsiOverbought', label: 'RSI超买阈值', min: 60, max: 90, step: 5 },
  { value: 'rsiOversold', label: 'RSI超卖阈值', min: 10, max: 40, step: 5 },
  { value: 'macdFast', label: 'MACD快线', min: 8, max: 20, step: 1 },
  { value: 'macdSlow', label: 'MACD慢线', min: 20, max: 40, step: 2 },
  { value: 'macdSignal', label: 'MACD信号线', min: 5, max: 15, step: 1 },
  { value: 'bollingerPeriod', label: '布林带周期', min: 10, max: 50, step: 5 },
  { value: 'bollingerStdDev', label: '布林带标准差', min: 1, max: 4, step: 0.5 },
  { value: 'momentumPeriod', label: '动量周期', min: 5, max: 30, step: 5 },
  { value: 'momentumThreshold', label: '动量阈值', min: 1, max: 15, step: 1 },
  { value: 'meanReversionPeriod', label: '均值回归周期', min: 10, max: 60, step: 5 },
  { value: 'meanReversionThreshold', label: '均值回归阈值', min: 1, max: 10, step: 1 },
  { value: 'stopLoss', label: '止损比例', min: 0, max: 20, step: 1 },
  { value: 'takeProfit', label: '止盈比例', min: 0, max: 50, step: 5 },
]

const METRIC_OPTIONS = [
  { value: 'totalReturn', label: '总收益率' },
  { value: 'sharpeRatio', label: '夏普比率' },
  { value: 'maxDrawdown', label: '最大回撤' },
]

interface FormData {
  name: string
  symbols: string
  startDate: string
  endDate: string
  initialCapital: string
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
  const [costModelConfig, setCostModelConfig] = useState<CostModelConfig>(DEFAULT_COST_MODEL)
  const [showStrategyBattle, setShowStrategyBattle] = useState(false)
  const [activeTab, setActiveTab] = useState<'backtest' | 'sensitivity'>('backtest')
  const [sensitivityLoading, setSensitivityLoading] = useState(false)
  const [sensitivityResult, setSensitivityResult] = useState<SensitivityResult | null>(null)
  const [sensitivityConfig, setSensitivityConfig] = useState({
    targetParam: 'shortWindow',
    targetMetric: 'totalReturn',
    paramMin: 5,
    paramMax: 50,
    stepCount: 10,
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

  const createPlan = async (formData: FormData) => {
    try {
      const res = await fetch('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          symbols: formData.symbols.split(',').map((s) => s.trim()),
          startDate: formData.startDate,
          endDate: formData.endDate,
          initialCapital: parseFloat(formData.initialCapital),
        }),
      })
      const data = await res.json()
      setPlans((prev) => [data, ...prev])
      setSelectedPlan(data)
      setShowCreateForm(false)
    } catch (error) {
      console.error('Failed to create plan:', error)
    }
  }

  const runBacktest = async (config: StrategyConfig) => {
    if (!selectedPlan) return
    setRunning(true)
    try {
      const params: Record<string, number> = {}

      if (['ma_crossover', 'dual_ma', 'trend_follow'].includes(config.strategy)) {
        params.shortWindow = config.shortWindow
        params.longWindow = config.longWindow
      }
      if (config.strategy === 'rsi') {
        params.rsiPeriod = config.rsiPeriod
        params.rsiOverbought = config.rsiOverbought
        params.rsiOversold = config.rsiOversold
      }
      if (config.strategy === 'macd') {
        params.macdFast = config.macdFast
        params.macdSlow = config.macdSlow
        params.macdSignal = config.macdSignal
      }
      if (config.strategy === 'bollinger') {
        params.bollingerPeriod = config.bollingerPeriod
        params.bollingerStdDev = config.bollingerStdDev
      }
      if (config.strategy === 'momentum') {
        params.momentumPeriod = config.momentumPeriod
        params.momentumThreshold = config.momentumThreshold
      }
      if (config.strategy === 'mean_reversion') {
        params.meanReversionPeriod = config.meanReversionPeriod
        params.meanReversionThreshold = config.meanReversionThreshold
      }
      if (config.stopLoss > 0) params.stopLoss = config.stopLoss
      if (config.takeProfit > 0) params.takeProfit = config.takeProfit

      const res = await fetch(`/api/backtests/${selectedPlan.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: config.strategy,
          parameters: params,
          costModel: costModelConfig,
        }),
      })
      const data = await res.json()
      setSelectedPlan(data)
      setTrades(data.trades || [])
      setEquityCurve(data.equityCurve || [])
      setShowConfigForm(false)

      // Create a version after successful backtest execution
      if (selectedPlan?.id) {
        try {
          await fetch(`/api/backtests/${selectedPlan.id}/versions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${data.name} - 执行完成`,
              note: `回测执行完成，总收益: ${(data.totalReturn || 0).toFixed(2)}%`,
              config: {
                strategy: config.strategy,
                parameters: params,
                costModel: costModelConfig,
                result: {
                  totalReturn: data.totalReturn,
                  sharpeRatio: data.sharpeRatio,
                  maxDrawdown: data.maxDrawdown,
                },
              },
            }),
          })
        } catch {
          console.error('Failed to create backtest version')
        }
      }
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
          costModel: costModelConfig,
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

  const generateParamRange = (min: number, max: number, count: number): number[] => {
    const range: number[] = []
    const step = (max - min) / (count - 1)
    for (let i = 0; i < count; i++) {
      const value = min + step * i
      range.push(Math.round(value * 10) / 10)
    }
    return range
  }

  const runSensitivityAnalysis = async () => {
    if (!selectedPlan) return

    const paramRange = generateParamRange(
      sensitivityConfig.paramMin,
      sensitivityConfig.paramMax,
      sensitivityConfig.stepCount
    )

    setSensitivityLoading(true)
    try {
      const strategyParams: Record<string, number> = {}
      if (['ma_crossover', 'dual_ma', 'trend_follow'].includes(sensitivityConfig.targetParam)) {
        strategyParams.shortWindow = 10
        strategyParams.longWindow = 30
      } else if (['rsiPeriod', 'rsiOverbought', 'rsiOversold'].includes(sensitivityConfig.targetParam)) {
        strategyParams.rsiPeriod = 14
        strategyParams.rsiOverbought = 70
        strategyParams.rsiOversold = 30
      } else if (['macdFast', 'macdSlow', 'macdSignal'].includes(sensitivityConfig.targetParam)) {
        strategyParams.macdFast = 12
        strategyParams.macdSlow = 26
        strategyParams.macdSignal = 9
      } else if (['bollingerPeriod', 'bollingerStdDev'].includes(sensitivityConfig.targetParam)) {
        strategyParams.bollingerPeriod = 20
        strategyParams.bollingerStdDev = 2
      } else if (['momentumPeriod', 'momentumThreshold'].includes(sensitivityConfig.targetParam)) {
        strategyParams.momentumPeriod = 10
        strategyParams.momentumThreshold = 5
      } else if (['meanReversionPeriod', 'meanReversionThreshold'].includes(sensitivityConfig.targetParam)) {
        strategyParams.meanReversionPeriod = 20
        strategyParams.meanReversionThreshold = 5
      }

      const res = await fetch('/api/backtests/sensitivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedPlan.symbols.split(',')[0] || 'AAPL',
          config: {
            initialCapital: selectedPlan.initialCapital,
            strategy: 'ma_crossover',
            parameters: strategyParams,
          },
          targetParam: sensitivityConfig.targetParam,
          paramRange,
          targetMetric: sensitivityConfig.targetMetric,
        }),
      })

      if (!res.ok) {
        throw new Error('敏感性分析失败')
      }

      const result = await res.json()
      setSensitivityResult(result)
    } catch (error) {
      console.error('Failed to run sensitivity analysis:', error)
    } finally {
      setSensitivityLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('backtest')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'backtest'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          回测运行器
        </button>
        <button
          onClick={() => setActiveTab('sensitivity')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sensitivity'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            敏感性分析
          </span>
        </button>
      </div>

      {activeTab === 'backtest' ? (
        <div className="space-y-6">
          <QuickStrategyCards
            strategies={QUICK_STRATEGIES}
            running={running}
            defaultSymbol={DEFAULT_SYMBOL}
            defaultPeriod={DEFAULT_PERIOD}
            onQuickBacktest={quickBacktest}
          />

            <div className="border-t pt-6 space-y-4">
              <div className="flex gap-2 items-center">
                <Button variant="outline" onClick={loadPlans}>
                  加载回测
                </Button>
                <Button onClick={() => setShowCreateForm(true)}>新建回测</Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowStrategyBattle(true)}
                  className="flex items-center gap-1"
                >
                  <Swords className="w-4 h-4" />
                  策略 Battle
                </Button>
                {selectedPlan && (
                  <>
                    <Button onClick={() => setShowConfigForm(true)} variant="secondary">
                      配置策略
                    </Button>
                    <div className="ml-auto">
                      <VersionHistory
                        entityId={selectedPlan.id}
                        entityType="backtest"
                        currentData={{
                          name: selectedPlan.name,
                          config: {
                            symbols: selectedPlan.symbols,
                            startDate: selectedPlan.startDate,
                            endDate: selectedPlan.endDate,
                            initialCapital: selectedPlan.initialCapital,
                            totalReturn: selectedPlan.totalReturn,
                            sharpeRatio: selectedPlan.sharpeRatio,
                            maxDrawdown: selectedPlan.maxDrawdown,
                          },
                        }}
                        onRestore={loadPlans}
                      />
                    </div>
                  </>
                )}
              </div>

            <BacktestForm
              strategies={STRATEGIES}
              showCreateForm={showCreateForm}
              showConfigForm={showConfigForm}
              running={running}
              defaultPeriod={DEFAULT_PERIOD}
              onCreatePlan={createPlan}
              onRunBacktest={runBacktest}
              onCloseCreateForm={() => setShowCreateForm(false)}
              onCloseConfigForm={() => setShowConfigForm(false)}
            />

            <CostModelPanel
              config={costModelConfig}
              onChange={setCostModelConfig}
              estimatedTradeValue={selectedPlan ? selectedPlan.initialCapital * 0.01 : 10000}
            />

            {selectedPlan && (
              <ExportPanel
                strategyName={selectedPlan.name}
                backtestData={{
                  strategyName: selectedPlan.name,
                  backtestPeriod: { start: selectedPlan.startDate, end: selectedPlan.endDate },
                  metrics: {
                    totalReturn: selectedPlan.totalReturn ?? 0,
                    sharpeRatio: selectedPlan.sharpeRatio ?? 0,
                    maxDrawdown: selectedPlan.maxDrawdown ?? 0,
                    winRate: 0,
                    totalTrades: trades.length,
                    avgHoldingDays: 0,
                  },
                  monthlyReturns: [],
                  trades: trades.map(t => ({
                    date: t.date,
                    symbol: t.symbol,
                    type: t.type,
                    price: t.price,
                    quantity: t.quantity,
                    pnl: 0,
                  })),
                }}
              />
            )}

            <BacktestResult
              selectedPlan={selectedPlan}
              trades={trades}
              equityCurve={equityCurve}
              plans={plans}
              conceptDefinitions={CONCEPT_DEFINITIONS}
              onSelectPlan={setSelectedPlan}
              onLoadTrades={loadTrades}
            />

            <StrategyBattle
              visible={showStrategyBattle}
              onClose={() => setShowStrategyBattle(false)}
              backtestPlans={plans}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-medium">参数敏感性分析</h3>
            <p className="text-sm text-muted-foreground">
              分析不同参数值对回测指标的影响，帮助找到最优参数范围。
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">目标参数</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={sensitivityConfig.targetParam}
                  onChange={(e) => setSensitivityConfig({ ...sensitivityConfig, targetParam: e.target.value })}
                >
                  {PARAMETER_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">目标指标</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={sensitivityConfig.targetMetric}
                  onChange={(e) => setSensitivityConfig({ ...sensitivityConfig, targetMetric: e.target.value as 'totalReturn' | 'sharpeRatio' | 'maxDrawdown' })}
                >
                  {METRIC_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">最小值</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={sensitivityConfig.paramMin}
                  onChange={(e) => setSensitivityConfig({ ...sensitivityConfig, paramMin: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">最大值</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1"
                  value={sensitivityConfig.paramMax}
                  onChange={(e) => setSensitivityConfig({ ...sensitivityConfig, paramMax: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">
                  步数: {sensitivityConfig.stepCount} ({generateParamRange(sensitivityConfig.paramMin, sensitivityConfig.paramMax, sensitivityConfig.stepCount).map(v => Math.round(v)).join(', ')})
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={sensitivityConfig.stepCount}
                  onChange={(e) => setSensitivityConfig({ ...sensitivityConfig, stepCount: Number(e.target.value) })}
                  className="w-full mt-2"
                />
              </div>
            </div>

            <Button
              onClick={runSensitivityAnalysis}
              disabled={sensitivityLoading || !selectedPlan}
            >
              {sensitivityLoading ? '分析中...' : '运行分析'}
            </Button>

            {!selectedPlan && (
              <p className="text-sm text-muted-foreground">
                请先创建一个回测计划
              </p>
            )}
          </div>

          {sensitivityResult && (
            <div className="rounded-lg border p-4">
              <SensitivityChart result={sensitivityResult} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
