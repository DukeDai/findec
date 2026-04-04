'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Percent, BarChart3, Target, Zap } from 'lucide-react'

interface RiskMetrics {
  portfolioReturn: number
  portfolioSharpe: number
  portfolioSortino: number
  portfolioCalmar: number
  portfolioMaxDrawdown: number
  portfolioVolatility: number
  portfolioVaR95: number
  totalTrades: number
  winRate: number
}

interface RiskMetricsCardProps {
  metrics: RiskMetrics
  period?: { start: Date; end: Date }
}

interface MetricItem {
  key: keyof RiskMetrics
  label: string
  icon: React.ReactNode
  description: string
  format: 'percent' | 'number' | 'ratio'
  invertColor?: boolean
}

const METRICS: MetricItem[] = [
  {
    key: 'portfolioReturn',
    label: '总收益',
    icon: <TrendingUp className="h-4 w-4" />,
    description: '策略在整个回测期间的总收益率',
    format: 'percent',
  },
  {
    key: 'portfolioSharpe',
    label: '夏普比率',
    icon: <Activity className="h-4 w-4" />,
    description: '风险调整后的收益率，衡量承担单位风险所获得的超额收益',
    format: 'ratio',
  },
  {
    key: 'portfolioSortino',
    label: '索提诺比率',
    icon: <BarChart3 className="h-4 w-4" />,
    description: '改进的夏普比率，只考虑下行波动率，更关注负面风险',
    format: 'ratio',
  },
  {
    key: 'portfolioCalmar',
    label: '卡尔玛比率',
    icon: <Zap className="h-4 w-4" />,
    description: '年化收益率与最大回撤的比率，衡量收益与风险的平衡',
    format: 'ratio',
  },
  {
    key: 'portfolioMaxDrawdown',
    label: '最大回撤',
    icon: <TrendingDown className="h-4 w-4" />,
    description: '从峰值到谷底的最大亏损幅度，衡量极端风险',
    format: 'percent',
    invertColor: true,
  },
  {
    key: 'portfolioVolatility',
    label: '波动率',
    icon: <Activity className="h-4 w-4" />,
    description: '收益率的标准差，衡量收益的不确定性',
    format: 'percent',
    invertColor: true,
  },
  {
    key: 'portfolioVaR95',
    label: 'VaR 95%',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: '95%置信度下的最大预期损失，即最差的5%情况下的损失',
    format: 'percent',
    invertColor: true,
  },
  {
    key: 'winRate',
    label: '胜率',
    icon: <Target className="h-4 w-4" />,
    description: '盈利交易占总交易的百分比',
    format: 'percent',
  },
  {
    key: 'totalTrades',
    label: '总交易次数',
    icon: <Percent className="h-4 w-4" />,
    description: '回测期间的总交易次数（买入+卖出）',
    format: 'number',
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

export function RiskMetricsCard({ metrics, period }: RiskMetricsCardProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null)

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">风险指标</CardTitle>
            {period && (
              <span className="text-xs text-muted-foreground">
                {period.start.toLocaleDateString('zh-CN')} - {period.end.toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {METRICS.map((metric) => {
              const value = metrics[metric.key]
              const formattedValue = formatValue(value, metric.format)
              const colorClass = metric.format === 'number'
                ? 'text-foreground'
                : getValueColor(value, metric.invertColor)

              return (
                <Tooltip key={metric.key}>
                  <TooltipTrigger>
                    <div
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-help"
                      onMouseEnter={() => setHoveredMetric(metric.key)}
                      onMouseLeave={() => setHoveredMetric(null)}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        {metric.icon}
                        <span className="text-xs">{metric.label}</span>
                      </div>
                      <div className={`text-lg font-bold ${colorClass}`}>
                        {formattedValue}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium">{metric.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metric.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
