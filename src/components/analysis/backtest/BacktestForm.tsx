'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ParameterGuide } from '@/components/ui/parameter-guide'

interface StrategyInfo {
  id: string
  name: string
  description: string
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

interface BacktestFormProps {
  strategies: StrategyInfo[]
  showCreateForm: boolean
  showConfigForm: boolean
  running: boolean
  defaultPeriod: { start: string; end: string }
  onCreatePlan: (formData: FormData) => void
  onRunBacktest: (config: StrategyConfig) => void
  onCloseCreateForm: () => void
  onCloseConfigForm: () => void
}

const DEFAULT_FORM_DATA: FormData = {
  name: '',
  symbols: 'AAPL,MSFT,GOOGL',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  initialCapital: '100000',
}

const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
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
}

export function BacktestForm({
  strategies,
  showCreateForm,
  showConfigForm,
  running,
  defaultPeriod,
  onCreatePlan,
  onRunBacktest,
  onCloseCreateForm,
  onCloseConfigForm,
}: BacktestFormProps) {
  const [formData, setFormData] = useState<FormData>({
    ...DEFAULT_FORM_DATA,
    startDate: defaultPeriod.start,
    endDate: defaultPeriod.end,
  })

  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>(DEFAULT_STRATEGY_CONFIG)

  const handleCreate = () => {
    if (!formData.name || !formData.symbols) return
    onCreatePlan(formData)
    setFormData({
      ...DEFAULT_FORM_DATA,
      startDate: defaultPeriod.start,
      endDate: defaultPeriod.end,
    })
  }

  const handleRunBacktest = () => {
    onRunBacktest(strategyConfig)
  }

  if (!showCreateForm && !showConfigForm) {
    return null
  }

  return (
    <>
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
            <Button onClick={handleCreate}>创建</Button>
            <Button variant="outline" onClick={onCloseCreateForm}>
              取消
            </Button>
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
              onChange={(e) =>
                setStrategyConfig({ ...strategyConfig, strategy: e.target.value })
              }
            >
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.description}
                </option>
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
            <Button onClick={handleRunBacktest} disabled={running}>
              {running ? '运行中...' : '执行回测'}
            </Button>
            <Button variant="outline" onClick={onCloseConfigForm}>
              取消
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
