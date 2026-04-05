'use client'

import { useState } from 'react'
import type { CostModelConfig } from '@/lib/backtest/cost-model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CostModelPanelProps {
  config: CostModelConfig
  onChange: (config: CostModelConfig) => void
  estimatedTradeValue?: number
}

const COMMISSION_TYPE_OPTIONS = [
  { value: 'fixed', label: '单笔固定' },
  { value: 'percent', label: '比例' },
  { value: 'both', label: '两者都有' },
] as const

const SLIPPAGE_MODEL_OPTIONS = [
  { value: 'fixed', label: '固定' },
  { value: 'percent', label: '比例' },
  { value: 'volume_based', label: '按成交量' },
] as const

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`
}

export function CostModelPanel({
  config,
  onChange,
  estimatedTradeValue = 10000,
}: CostModelPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const calculateEstimatedCost = (): { total: number; percentOfTrade: number } => {
    const value = estimatedTradeValue

    let commission = 0
    if (config.commission.type === 'fixed') {
      commission = config.commission.fixedPerTrade
    } else if (config.commission.type === 'percent') {
      commission = value * config.commission.percentOfValue
    } else if (config.commission.type === 'both') {
      commission = config.commission.fixedPerTrade + value * config.commission.percentOfValue
    }

    let slippage = 0
    if (config.slippage.model === 'fixed') {
      slippage = config.slippage.value
    } else {
      slippage = value * config.slippage.value
    }

    const stampDuty = (config.stampDuty?.enabled ?? false) ? value * (config.stampDuty?.rate ?? 0) : 0

    const total = commission + slippage + stampDuty
    const percentOfTrade = (total / value) * 100

    return { total, percentOfTrade }
  }

  const estimated = calculateEstimatedCost()

  const updateCommission = (updates: Partial<CostModelConfig['commission']>) => {
    onChange({
      ...config,
      commission: { ...config.commission, ...updates },
    })
  }

  const updateSlippage = (updates: Partial<CostModelConfig['slippage']>) => {
    onChange({
      ...config,
      slippage: { ...config.slippage, ...updates },
    })
  }

  const updateStampDuty = (updates: Partial<CostModelConfig['stampDuty']>) => {
    onChange({
      ...config,
      stampDuty: { enabled: false, rate: 0, ...config.stampDuty, ...updates },
    })
  }

  const updateDividendReinvestment = (
    updates: Partial<CostModelConfig['dividendReinvestment']>
  ) => {
    onChange({
      ...config,
      dividendReinvestment: { enabled: false, reinvestRatio: 0, ...config.dividendReinvestment, ...updates },
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <span>交易成本设置</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CardTitle>
        {!isExpanded && (
          <p className="text-xs text-muted-foreground">
            预估成本: {formatCurrency(estimated.total)} ({estimated.percentOfTrade.toFixed(2)}%)
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">佣金设置</h4>
            <div className="grid grid-cols-3 gap-2">
              {COMMISSION_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    updateCommission({ type: option.value as CostModelConfig['commission']['type'] })
                  }
                  className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    config.commission.type === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {(config.commission.type === 'fixed' || config.commission.type === 'both') && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">固定佣金 ($/笔)</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.commission.fixedPerTrade}
                    onChange={(e) =>
                      updateCommission({ fixedPerTrade: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
              </div>
            )}

            {(config.commission.type === 'percent' || config.commission.type === 'both') && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">比例佣金 (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.0001"
                    value={(config.commission.percentOfValue * 100).toFixed(4)}
                    onChange={(e) =>
                      updateCommission({ percentOfValue: parseFloat(e.target.value) / 100 || 0 })
                    }
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  />
                  <span className="text-sm">%</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-3">
            <h4 className="text-sm font-medium">滑点设置</h4>
            <div className="grid grid-cols-3 gap-2">
              {SLIPPAGE_MODEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    updateSlippage({ model: option.value as CostModelConfig['slippage']['model'] })
                  }
                  className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    config.slippage.model === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:bg-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {config.slippage.model === 'fixed' ? '固定滑点 ($)' : '滑点比例 (%)'}
              </label>
              <div className="flex items-center gap-2">
                {config.slippage.model === 'fixed' && <span className="text-sm">$</span>}
                <input
                  type="number"
                  min="0"
                  step={config.slippage.model === 'fixed' ? '0.01' : '0.0001'}
                  value={
                    config.slippage.model === 'fixed'
                      ? config.slippage.value
                      : (config.slippage.value * 100).toFixed(4)
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    updateSlippage({
                      value: config.slippage.model === 'fixed' ? val : val / 100,
                    })
                  }}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                />
                {config.slippage.model !== 'fixed' && <span className="text-sm">%</span>}
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              <span>高级设置</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">印花税</span>
                    <p className="text-xs text-muted-foreground">仅卖出时收取 (A股适用)</p>
                  </div>
                  <button
                    onClick={() => updateStampDuty({ enabled: !(config.stampDuty?.enabled ?? false) })}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      (config.stampDuty?.enabled ?? false) ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        (config.stampDuty?.enabled ?? false) ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {(config.stampDuty?.enabled ?? false) && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">印花税率 (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="0.1"
                        step="0.0001"
                        value={((config.stampDuty?.rate ?? 0) * 100).toFixed(4)}
                        onChange={(e) =>
                          updateStampDuty({ rate: parseFloat(e.target.value) / 100 || 0 })
                        }
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">分红再投资</span>
                    <p className="text-xs text-muted-foreground">自动用分红购买更多股票</p>
                  </div>
                  <button
                    onClick={() =>
                      updateDividendReinvestment({
                        enabled: !(config.dividendReinvestment?.enabled ?? false),
                      })
                    }
                    className={`relative h-5 w-9 rounded-full transition-colors ${
(config.dividendReinvestment?.enabled ?? false) ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
(config.dividendReinvestment?.enabled ?? false) ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {(config.dividendReinvestment?.enabled ?? false) && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">再投资比例</label>
                      <span className="text-xs">
                        {Math.round((config.dividendReinvestment?.reinvestRatio ?? 0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={config.dividendReinvestment?.reinvestRatio ?? 0}
                      onChange={(e) =>
                        updateDividendReinvestment({
                          reinvestRatio: parseFloat(e.target.value),
                        })
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">预估单笔交易成本</span>
              <span className="font-medium">{formatCurrency(estimated.total)}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              占总交易额 {estimated.percentOfTrade.toFixed(2)}%
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
