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
import { Swords } from 'lucide-react'

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

  return (
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
  )
}
