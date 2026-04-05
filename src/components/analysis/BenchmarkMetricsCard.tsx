'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, Activity, Target, Zap, Percent } from 'lucide-react'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'

export interface BenchmarkResult {
  benchmarkReturn: number
  benchmarkAnnualReturn: number
  alpha: number
  beta: number
  trackingError: number
  informationRatio: number
  correlation: number
  rSquared: number
  benchmarkEquityCurve: { date: string; value: number }[]
}

interface BenchmarkMetricsCardProps {
  benchmarkResult: BenchmarkResult
  benchmarkSymbol: string
}

interface MetricItem {
  key: keyof BenchmarkResult
  label: string
  icon: React.ReactNode
  format: 'percent' | 'number' | 'ratio'
  invertColor?: boolean
}

const METRIC_CONCEPTS: Record<string, { name: string; description: string; interpretation: string }> = {
  alpha: {
    name: 'Alpha (阿尔法)',
    description: '策略相对于基准的超额收益。正值表示策略跑赢基准，负值表示跑输基准。',
    interpretation: 'Alpha > 0 表示策略有超额收益，Alpha < 0 表示策略表现不如基准。'
  },
  beta: {
    name: 'Beta (贝塔)',
    description: '策略相对于基准的系统性风险。Beta = 1 表示与基准波动一致，Beta > 1 表示波动更大，Beta < 1 表示波动更小。',
    interpretation: 'Beta > 1 表示高风险高波动，Beta < 1 表示低风险低波动。'
  },
  informationRatio: {
    name: '信息比率 (Information Ratio)',
    description: '每单位跟踪误差所获得的超额收益。衡量策略主动管理能力的指标。',
    interpretation: 'IR > 0.5 表示较好，IR > 1 表示优秀。'
  },
  correlation: {
    name: '相关系数 (Correlation)',
    description: '策略与基准收益的相关程度。范围 -1 到 1，1 表示完全正相关，-1 表示完全负相关，0 表示无相关。',
    interpretation: '相关系数接近 1 表示策略与基准走势高度一致，接近 0 表示策略独立性强。'
  },
  rSquared: {
    name: '决定系数 (R²)',
    description: '基准收益能解释策略收益变动的比例。R² 越接近 1，说明策略表现越受基准影响。',
    interpretation: 'R² 越高，策略表现越依赖基准走势；R² 越低，策略表现越独立。'
  },
  trackingError: {
    name: '跟踪误差 (Tracking Error)',
    description: '策略收益与基准收益差异的标准差。衡量策略偏离基准的程度。',
    interpretation: '跟踪误差越大，策略与基准差异越大，主动管理程度越高。'
  },
  benchmarkReturn: {
    name: '基准总收益',
    description: '基准在回测期间的总收益率。',
    interpretation: '用于与策略总收益对比，评估策略是否跑赢基准。'
  },
  benchmarkAnnualReturn: {
    name: '基准年化收益',
    description: '基准的年化收益率。',
    interpretation: '用于与策略年化收益对比。'
  }
}

const METRICS: MetricItem[] = [
  {
    key: 'alpha',
    label: 'Alpha',
    icon: <TrendingUp className="h-4 w-4" />,
    format: 'percent',
  },
  {
    key: 'beta',
    label: 'Beta',
    icon: <BarChart3 className="h-4 w-4" />,
    format: 'ratio',
  },
  {
    key: 'informationRatio',
    label: '信息比率',
    icon: <Target className="h-4 w-4" />,
    format: 'ratio',
  },
  {
    key: 'correlation',
    label: '相关系数',
    icon: <Activity className="h-4 w-4" />,
    format: 'ratio',
  },
  {
    key: 'rSquared',
    label: 'R²',
    icon: <Zap className="h-4 w-4" />,
    format: 'ratio',
  },
  {
    key: 'trackingError',
    label: '跟踪误差',
    icon: <Percent className="h-4 w-4" />,
    format: 'percent',
    invertColor: true,
  },
]

function formatValue(value: number, format: 'percent' | 'number' | 'ratio'): string {
  if (format === 'percent') {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }
  if (format === 'ratio') {
    return value.toFixed(2)
  }
  return value.toLocaleString()
}

function getValueColor(value: number, invertColor?: boolean): string {
  if (invertColor) {
    return value > 0 ? 'text-red-500' : 'text-green-500'
  }
  return value >= 0 ? 'text-green-500' : 'text-red-500'
}

export function BenchmarkMetricsCard({ benchmarkResult, benchmarkSymbol }: BenchmarkMetricsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">基准对比指标 ({benchmarkSymbol})</CardTitle>
          <div className="text-xs text-muted-foreground">
            基准总收益: {formatValue(benchmarkResult.benchmarkReturn, 'percent')} | 
            年化: {formatValue(benchmarkResult.benchmarkAnnualReturn, 'percent')}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {METRICS.map((metric) => {
            const value = benchmarkResult[metric.key]
            const formattedValue = formatValue(value as number, metric.format)
            const colorClass = metric.format === 'number'
              ? 'text-foreground'
              : getValueColor(value as number, metric.invertColor)
            const concept = METRIC_CONCEPTS[metric.key]

            const metricCard = (
              <div
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-help"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  {metric.icon}
                  <span className="text-xs">{metric.label}</span>
                </div>
                <div className={`text-lg font-bold ${colorClass}`}>
                  {formattedValue}
                </div>
              </div>
            )

            return (
              <ConceptTooltip
                key={metric.key}
                concept={metric.key}
                title={concept?.name || metric.label}
                description={concept?.description || ''}
                example={concept?.interpretation}
              >
                {metricCard}
              </ConceptTooltip>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
