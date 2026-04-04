'use client'

import { useState, useEffect, useCallback, useLayoutEffect } from 'react'
import { STRATEGIES, STRATEGY_CONCEPTS, PRESET_PORTFOLIOS, DEFAULT_PERIOD } from './types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'

interface CreateFormProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: FormData) => void
  initialData?: { name: string; symbols: string } | null
}

export interface FormData {
  name: string
  symbols: string
  initialCapital: string
  strategy: string
  rebalance: string
  rebalanceThreshold: string
  startDate: string
  endDate: string
  strategyParams: StrategyParams
}

export interface StrategyParams {
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
}

const defaultFormData: Omit<FormData, 'strategyParams'> = {
  name: '',
  symbols: 'AAPL,MSFT,GOOGL',
  initialCapital: '100000',
  strategy: 'ma_crossover',
  rebalance: 'monthly',
  rebalanceThreshold: '5',
  startDate: DEFAULT_PERIOD.start,
  endDate: DEFAULT_PERIOD.end,
}

const defaultStrategyParams: StrategyParams = {
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
}

export function CreateForm({ visible, onClose, onSubmit, initialData }: CreateFormProps) {
  const [formData, setFormData] = useState<Omit<FormData, 'strategyParams'>>(defaultFormData)
  const [strategyParams, setStrategyParams] = useState<StrategyParams>(defaultStrategyParams)

  useLayoutEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        startDate: DEFAULT_PERIOD.start,
        endDate: DEFAULT_PERIOD.end,
      }))
    } else {
      setFormData(defaultFormData)
    }
  }, [initialData])

  const handleSubmit = () => {
    onSubmit({ ...formData, strategyParams })
    setFormData(defaultFormData)
    setStrategyParams(defaultStrategyParams)
  }

  const handleClose = () => {
    setFormData(defaultFormData)
    setStrategyParams(defaultStrategyParams)
    onClose()
  }

  if (!visible) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">快速回测</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_PORTFOLIOS.map((portfolio) => (
            <button
              key={portfolio.id}
              onClick={() => {
                setFormData({
                  ...defaultFormData,
                  name: portfolio.name,
                  symbols: portfolio.symbols.join(','),
                })
                onSubmit({
                  ...defaultFormData,
                  name: portfolio.name,
                  symbols: portfolio.symbols.join(','),
                  strategyParams: defaultStrategyParams,
                })
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
    )
  }

  return (
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
          <Button onClick={handleSubmit}>创建</Button>
          <Button variant="outline" onClick={handleClose}>取消</Button>
        </div>
      </CardContent>
    </Card>
  )
}
