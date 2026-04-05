'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  AlertTriangle,
  Percent,
  ChevronRight,
  Swords,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Loader2 } from 'lucide-react'

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

interface EquityPoint {
  date: string
  value: number
}

interface ComparisonMetrics {
  backtestId: string
  name: string
  strategyName: string
  totalReturn: number
  annualizedReturn: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  calmarRatio: number
  winRate: number
  profitFactor: number
  var95: number
  var99: number
  alpha: number
  beta: number
  equityCurve: EquityPoint[]
}

interface BacktestRank {
  backtestId: string
  name: string
  totalRank: number
  rankBreakdown: {
    totalReturn: number
    sharpeRatio: number
    sortinoRatio: number
    calmarRatio: number
    maxDrawdown: number
    winRate: number
    profitFactor: number
    var95: number
    alpha: number
  }
}

interface ComparisonResponse {
  rankings: BacktestRank[]
  metrics: ComparisonMetrics[]
  commonPeriod: {
    start: string
    end: string
  }
}

interface StrategyBattleProps {
  visible: boolean
  onClose: () => void
  backtestPlans: BacktestPlan[]
}

type Step = 'select' | 'confirm' | 'results' | 'detail'

const COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
]

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatRatio(value: number): string {
  return value.toFixed(2)
}

export function StrategyBattle({
  visible,
  onClose,
  backtestPlans,
}: StrategyBattleProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null)
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)

  const selectedPlans = backtestPlans.filter((p) => selectedIds.has(p.id))

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else if (newSet.size < 8) {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const calculateCommonPeriod = () => {
    if (selectedPlans.length < 2) return null

    const startDates = selectedPlans.map((p) => new Date(p.startDate))
    const endDates = selectedPlans.map((p) => new Date(p.endDate))

    const commonStart = new Date(Math.max(...startDates.map((d) => d.getTime())))
    const commonEnd = new Date(Math.min(...endDates.map((d) => d.getTime())))

    if (commonStart >= commonEnd) return null

    return {
      start: commonStart.toISOString().split('T')[0],
      end: commonEnd.toISOString().split('T')[0],
    }
  }

  const commonPeriod = calculateCommonPeriod()

  const runComparison = async () => {
    if (selectedIds.size < 2) return
    if (!commonPeriod) {
      setError('所选回测没有重叠的时间区间')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/backtests/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backtestIds: Array.from(selectedIds),
          startDate: commonPeriod.start,
          endDate: commonPeriod.end,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '对比失败')
      }

      const data: ComparisonResponse = await res.json()
      setComparisonResult(data)
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : '对比失败')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('select')
    setSelectedIds(new Set())
    setComparisonResult(null)
    setError(null)
    setSelectedMetricId(null)
  }

  const renderSelectStep = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        选择 2-8 个回测记录进行对比竞争
      </div>

      <div className="max-h-[400px] overflow-y-auto border rounded-lg">
        {backtestPlans.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            暂无回测记录，请先创建回测
          </div>
        ) : (
          <div className="divide-y">
            {backtestPlans.map((plan) => {
              const isSelected = selectedIds.has(plan.id)
              const canSelect = isSelected || selectedIds.size < 8

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'p-3 flex items-center gap-3 cursor-pointer transition-colors',
                    isSelected && 'bg-primary/5',
                    !canSelect && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => canSelect && toggleSelection(plan.id)}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {plan.symbols} · {plan.startDate} ~ {plan.endDate}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className={cn(
                      (plan.totalReturn ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {formatPercent(plan.totalReturn ?? 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      夏普 {plan.sharpeRatio?.toFixed(2) ?? '-'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          已选择 {selectedIds.size}/8 个策略
        </span>
        {selectedIds.size >= 2 && (
          <Button onClick={() => setStep('confirm')}>
            下一步 <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        确认时间区间后运行对比
      </div>

      {commonPeriod ? (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-sm font-medium mb-2">共同时间区间</div>
            <div className="text-lg font-semibold">
              {commonPeriod.start} ~ {commonPeriod.end}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              基于 {selectedPlans.length} 个回测的日期交集
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          所选回测没有重叠的时间区间
        </div>
      )}

      <div className="border rounded-lg p-3">
        <div className="text-sm font-medium mb-2">已选策略</div>
        <div className="space-y-2">
          {selectedPlans.map((plan, index) => (
            <div key={plan.id} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="flex-1">{plan.name}</span>
              <span className="text-muted-foreground text-xs">{plan.symbols}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep('select')}>
          返回
        </Button>
        <Button
          onClick={runComparison}
          disabled={loading || !commonPeriod}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              计算中...
            </>
          ) : (
            <>
              <Swords className="w-4 h-4 mr-2" />
              开始对比
            </>
          )}
        </Button>
      </div>
    </div>
  )

  const renderResultsStep = () => {
    if (!comparisonResult) return null

    const { rankings, metrics, commonPeriod } = comparisonResult
    const winner = rankings[0]

    const radarData = [
      { metric: '总收益', max: 100 },
      { metric: '夏普比率', max: 100 },
      { metric: '索提诺', max: 100 },
      { metric: '卡尔玛', max: 100 },
      { metric: '胜率', max: 100 },
      { metric: 'Alpha', max: 100 },
    ].map((item) => {
      const dataPoint: Record<string, number | string> = { metric: item.metric }
      metrics.forEach((m, idx) => {
        const value =
          item.metric === '总收益' ? Math.max(0, m.totalReturn) :
          item.metric === '夏普比率' ? Math.max(0, m.sharpeRatio * 20) :
          item.metric === '索提诺' ? Math.max(0, m.sortinoRatio * 20) :
          item.metric === '卡尔玛' ? Math.max(0, Math.min(100, m.calmarRatio * 20)) :
          item.metric === '胜率' ? m.winRate :
          item.metric === 'Alpha' ? Math.max(0, m.alpha + 50) :
          0
        dataPoint[m.name] = Math.min(100, value)
      })
      return dataPoint
    })

    const equityData = metrics[0]?.equityCurve.map((point, idx) => {
      const dataPoint: Record<string, number | string> = {
        date: new Date(point.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      }
      metrics.forEach((m) => {
        const p = m.equityCurve[idx]
        if (p) {
          const normalizedValue = (p.value / m.equityCurve[0].value - 1) * 100
          dataPoint[m.name] = normalizedValue
        }
      })
      return dataPoint
    })

    return (
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">对比期间</div>
            <div className="font-semibold">
              {commonPeriod.start} ~ {commonPeriod.end}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              重新选择
            </Button>
          </div>
        </div>

        {winner && (
          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div>
                  <div className="text-sm text-muted-foreground">冠军策略</div>
                  <div className="text-lg font-bold">{winner.name}</div>
                  <div className="text-xs text-muted-foreground">
                    综合排名 #{winner.totalRank} · 各项指标总和最优
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              指标雷达图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  {metrics.map((m, idx) => (
                    <Radar
                      key={m.backtestId}
                      name={m.name}
                      dataKey={m.name}
                      stroke={COLORS[idx % COLORS.length]}
                      fill={COLORS[idx % COLORS.length]}
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              收益率曲线对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis unit="%" />
                  <Tooltip
                    formatter={(value: unknown) => formatPercent(value as number)}
                    labelFormatter={() => ''}
                  />
                  <Legend />
                  {metrics.map((m, idx) => (
                    <Line
                      key={m.backtestId}
                      type="monotone"
                      dataKey={m.name}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">详细排名与指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">排名</th>
                    <th className="text-left py-2 px-2">策略</th>
                    <th className="text-right py-2 px-2">总收益</th>
                    <th className="text-right py-2 px-2">年化收益</th>
                    <th className="text-right py-2 px-2">夏普</th>
                    <th className="text-right py-2 px-2">索提诺</th>
                    <th className="text-right py-2 px-2">卡尔玛</th>
                    <th className="text-right py-2 px-2">最大回撤</th>
                    <th className="text-right py-2 px-2">胜率</th>
                    <th className="text-right py-2 px-2">盈亏比</th>
                    <th className="text-right py-2 px-2">VaR95</th>
                    <th className="text-right py-2 px-2">Alpha</th>
                    <th className="text-right py-2 px-2">Beta</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((rank, idx) => {
                    const metric = metrics.find((m) => m.backtestId === rank.backtestId)
                    if (!metric) return null

                    const isTop3 = idx < 3

                    return (
                      <tr
                        key={rank.backtestId}
                        className={cn(
                          'border-b hover:bg-muted/50 cursor-pointer',
                          isTop3 && 'bg-yellow-50/50'
                        )}
                        onClick={() => setSelectedMetricId(rank.backtestId)}
                      >
                        <td className="py-2 px-2">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                              idx === 0 && 'bg-yellow-100 text-yellow-700',
                              idx === 1 && 'bg-gray-100 text-gray-700',
                              idx === 2 && 'bg-orange-100 text-orange-700',
                              idx > 2 && 'text-muted-foreground'
                            )}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium">{rank.name}</td>
                        <td className={cn(
                          'text-right py-2 px-2',
                          metric.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatPercent(metric.totalReturn)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatPercent(metric.annualizedReturn)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatRatio(metric.sharpeRatio)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatRatio(metric.sortinoRatio)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatRatio(metric.calmarRatio)}
                        </td>
                        <td className="text-right py-2 px-2 text-red-600">
                          {formatPercent(metric.maxDrawdown)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatPercent(metric.winRate)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatRatio(metric.profitFactor)}
                        </td>
                        <td className="text-right py-2 px-2 text-red-600">
                          {formatPercent(metric.var95)}
                        </td>
                        <td className={cn(
                          'text-right py-2 px-2',
                          metric.alpha >= 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {formatPercent(metric.alpha)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatRatio(metric.beta)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderDetailStep = () => {
    if (!selectedMetricId || !comparisonResult) return null

    const metric = comparisonResult.metrics.find((m) => m.backtestId === selectedMetricId)
    const rank = comparisonResult.rankings.find((r) => r.backtestId === selectedMetricId)
    if (!metric || !rank) return null

    return (
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setSelectedMetricId(null)}>
            返回对比结果
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{metric.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground">综合排名</div>
                <div className="text-2xl font-bold">#{rank.totalRank}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-sm text-muted-foreground">Beta</div>
                <div className="text-2xl font-bold">{metric.beta.toFixed(2)}</div>
              </div>
            </div>

            <div className="text-sm font-medium">各指标排名</div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(rank.rankBreakdown).map(([key, value]) => (
                <div key={key} className="p-2 rounded border text-center">
                  <div className="text-xs text-muted-foreground">
                    {key === 'totalReturn' && '总收益'}
                    {key === 'sharpeRatio' && '夏普'}
                    {key === 'sortinoRatio' && '索提诺'}
                    {key === 'calmarRatio' && '卡尔玛'}
                    {key === 'maxDrawdown' && '最大回撤'}
                    {key === 'winRate' && '胜率'}
                    {key === 'profitFactor' && '盈亏比'}
                    {key === 'var95' && 'VaR95'}
                    {key === 'alpha' && 'Alpha'}
                  </div>
                  <div className="text-lg font-semibold">#{value}</div>
                </div>
              ))}
            </div>

            <div className="text-sm font-medium">完整指标数据</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">总收益</span>
                <span className={metric.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercent(metric.totalReturn)}
                </span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">年化收益</span>
                <span>{formatPercent(metric.annualizedReturn)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">夏普比率</span>
                <span>{formatRatio(metric.sharpeRatio)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">索提诺比率</span>
                <span>{formatRatio(metric.sortinoRatio)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">卡尔玛比率</span>
                <span>{formatRatio(metric.calmarRatio)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">最大回撤</span>
                <span className="text-red-600">{formatPercent(metric.maxDrawdown)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">胜率</span>
                <span>{formatPercent(metric.winRate)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">盈亏比</span>
                <span>{formatRatio(metric.profitFactor)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">VaR 95%</span>
                <span className="text-red-600">{formatPercent(metric.var95)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">VaR 99%</span>
                <span className="text-red-600">{formatPercent(metric.var99)}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">Alpha</span>
                <span className={metric.alpha >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercent(metric.alpha)}
                </span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="text-muted-foreground">Beta</span>
                <span>{formatRatio(metric.beta)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5" />
            策略 Battle
            {step === 'results' && comparisonResult && (
              <span className="text-sm text-muted-foreground">
                （{comparisonResult.rankings.length} 个策略）
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto">
          {step === 'select' && renderSelectStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'results' && renderResultsStep()}
          {step === 'detail' && renderDetailStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
