'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Calculator, BarChart3, Layers, Target, RotateCcw, Brain } from 'lucide-react'

export type ScoringMethod = 'weighted_sum' | 'rank_sum' | 'threshold_count'

interface ScoringMethodOption {
  id: ScoringMethod
  name: string
  description: string
  icon: React.ReactNode
}

const SCORING_METHODS: ScoringMethodOption[] = [
  {
    id: 'weighted_sum',
    name: '加权求和',
    description: '基于归一化因子值的加权求和评分。每个因子根据权重贡献到最终得分。',
    icon: <Calculator className="w-4 h-4" />,
  },
  {
    id: 'rank_sum',
    name: '分位排名',
    description: '基于百分位排名的求和评分。计算每个因子在阈值下的百分位位置并求和。',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: 'threshold_count',
    name: '阈值计数',
    description: '统计满足阈值条件的因子数量。适合筛选符合多个条件的股票。',
    icon: <Target className="w-4 h-4" />,
  },
]

interface FactorWeight {
  factorId: string
  weight: number
  label?: string
}

interface FactorScoringPanelProps {
  initialMethod?: ScoringMethod
  initialWeights?: FactorWeight[]
  onMethodChange?: (method: ScoringMethod) => void
  onWeightsChange?: (weights: FactorWeight[]) => void
  onScoringChange?: (config: { method: ScoringMethod; weights: FactorWeight[]; enableML: boolean }) => void
  onMLToggle?: (enabled: boolean) => void
  className?: string
  defaultExpanded?: boolean
}

export function FactorScoringPanel({
  initialMethod = 'weighted_sum',
  initialWeights = [],
  onMethodChange,
  onWeightsChange,
  onScoringChange,
  onMLToggle,
  className,
  defaultExpanded = true,
}: FactorScoringPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [selectedMethod, setSelectedMethod] = useState<ScoringMethod>(initialMethod)
  const [weights, setWeights] = useState<FactorWeight[]>(initialWeights)
  const [enableML, setEnableML] = useState(false)

  useEffect(() => {
    onScoringChange?.({ method: selectedMethod, weights, enableML })
  }, [selectedMethod, weights, enableML, onScoringChange])

  const handleMethodChange = useCallback((method: ScoringMethod) => {
    setSelectedMethod(method)
    onMethodChange?.(method)
  }, [onMethodChange])

  const handleWeightChange = useCallback((factorId: string, newWeight: number) => {
    const clampedWeight = Math.max(0, Math.min(1, newWeight))
    setWeights(prev => {
      const newWeights = prev.map(w =>
        w.factorId === factorId ? { ...w, weight: clampedWeight } : w
      )
      onWeightsChange?.(newWeights)
      return newWeights
    })
  }, [onWeightsChange])

  const handleMLToggle = useCallback((checked: boolean) => {
    setEnableML(checked)
    onMLToggle?.(checked)
  }, [onMLToggle])

  const normalizeWeights = useCallback(() => {
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
    if (totalWeight === 0) return

    setWeights(prev => {
      const newWeights = prev.map(w => ({
        ...w,
        weight: Number((w.weight / totalWeight).toFixed(3)),
      }))
      onWeightsChange?.(newWeights)
      return newWeights
    })
  }, [weights, onWeightsChange])

  const setEqualWeights = useCallback(() => {
    if (weights.length === 0) return

    const equalWeight = Number((1 / weights.length).toFixed(3))
    setWeights(prev => {
      const newWeights = prev.map(w => ({ ...w, weight: equalWeight }))
      onWeightsChange?.(newWeights)
      return newWeights
    })
  }, [weights.length, onWeightsChange])

  const resetWeights = useCallback(() => {
    setWeights(prev => {
      const newWeights = prev.map(w => ({ ...w, weight: 1 }))
      onWeightsChange?.(newWeights)
      return newWeights
    })
  }, [onWeightsChange])

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0)
  const selectedMethodInfo = SCORING_METHODS.find(m => m.id === selectedMethod)

  const contributions = weights.map(w => ({
    ...w,
    percentage: totalWeight > 0 ? (w.weight / totalWeight) * 100 : 0,
  })).sort((a, b) => b.percentage - a.percentage)

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">评分方式</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">选择评分方法</label>
            <div className="grid grid-cols-1 gap-2">
              {SCORING_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodChange(method.id)}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                    selectedMethod === method.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 p-1.5 rounded-md',
                      selectedMethod === method.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {method.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{method.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {method.description}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 mt-1 flex-shrink-0',
                      selectedMethod === method.id
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    )}
                  >
                    {selectedMethod === method.id && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-500" />
              <div>
                <div className="font-medium text-sm">启用 ML 预测因子</div>
                <div className="text-xs text-muted-foreground">
                  使用LSTM神经网络预测价格方向
                </div>
              </div>
            </div>
            <Switch
              checked={enableML}
              onCheckedChange={handleMLToggle}
            />
          </div>

          {selectedMethod === 'weighted_sum' && weights.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">因子权重</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={setEqualWeights}
                    className="h-6 text-xs"
                  >
                    等权重
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={normalizeWeights}
                    className="h-6 text-xs"
                  >
                    归一化
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={resetWeights}
                    className="h-6 w-6 p-0"
                    title="重置权重"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {weights.map((weight) => (
                  <div
                    key={weight.factorId}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm flex-1 min-w-0 truncate">
                      {weight.label || weight.factorId}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={weight.weight}
                        onChange={(e) =>
                          handleWeightChange(weight.factorId, parseFloat(e.target.value))
                        }
                        className="w-24 h-1.5 bg-muted-foreground/20 rounded-full appearance-none cursor-pointer accent-primary"
                      />
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={weight.weight}
                        onChange={(e) =>
                          handleWeightChange(weight.factorId, parseFloat(e.target.value) || 0)
                        }
                        className="w-16 h-7 px-2 text-sm text-center border rounded-md bg-background"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">权重总和</span>
                <span
                  className={cn(
                    'font-medium',
                    Math.abs(totalWeight - 1) < 0.01
                      ? 'text-green-600'
                      : 'text-amber-600'
                  )}
                >
                  {totalWeight.toFixed(2)}
                  {Math.abs(totalWeight - 1) < 0.01 && ' ✓'}
                </span>
              </div>

              {weights.length > 1 && (
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-sm font-medium">因子贡献占比</label>
                  <div className="space-y-1.5">
                    {contributions.map((item) => (
                      <div key={item.factorId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[120px]">
                            {item.label || item.factorId}
                          </span>
                          <span className="text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedMethod !== 'weighted_sum' && selectedMethodInfo && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <div className="font-medium mb-1">{selectedMethodInfo.name}</div>
              <div className="text-muted-foreground text-xs">
                {selectedMethodInfo.description}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
