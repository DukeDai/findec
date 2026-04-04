'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Percent, BarChart3, Target, Zap } from 'lucide-react'
import { ConceptTooltip } from '@/components/ui/concept-tooltip'

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
  format: 'percent' | 'number' | 'ratio'
  invertColor?: boolean
}

const METRIC_CONCEPTS: Record<string, { name: string; description: string; interpretation: string }> = {
  'portfolioReturn': {
    name: '总收益',
    description: '策略在整个回测期间的总收益率',
    interpretation: '正数表示盈利，负数表示亏损。需结合时间跨度评估。'
  },
  'portfolioSharpe': {
    name: '夏普比率 (Sharpe Ratio)',
    description: '衡量每承担一单位风险所获得的超额收益。计算公式为 (策略收益率 - 无风险收益率) / 策略收益标准差。',
    interpretation: '夏普比率 > 1 表示较好，> 2 非常好，< 0 表示策略还不如无风险资产。'
  },
  'portfolioSortino': {
    name: '索提诺比率 (Sortino Ratio)',
    description: '类似夏普比率，但只考虑下行波动风险。计算公式为 (收益 - 目标收益) / 下行标准差。',
    interpretation: '索提诺比率越高越好，因为它更关注对投资者重要的下行风险。'
  },
  'portfolioCalmar': {
    name: '卡尔玛比率 (Calmar Ratio)',
    description: '年化收益与最大回撤的比值。衡量每单位最大回撤对应的收益。',
    interpretation: '卡尔玛比率越高越好。> 1 表示优质策略，> 2 非常优秀。'
  },
  'portfolioMaxDrawdown': {
    name: '最大回撤 (Max Drawdown)',
    description: '策略从历史最高点到最低点的最大跌幅。反映策略可能遭受的最大损失。',
    interpretation: '最大回撤越小越好。一般认为 < 20% 可接受，< 10% 优秀。'
  },
  'portfolioVolatility': {
    name: '波动率 (Volatility)',
    description: '策略收益的标准差，衡量收益的离散程度。',
    interpretation: '波动率越高，策略风险越大。一般与收益正相关。'
  },
  'portfolioVaR95': {
    name: '风险价值 (VaR)',
    description: '在给定置信水平下，策略在特定时间内可能遭受的最大损失。',
    interpretation: 'VaR 95% = -5% 表示有 95% 的概率，损失不会超过 5%。'
  },
  'winRate': {
    name: '胜率 (Win Rate)',
    description: '盈利交易次数占总交易次数的比例。',
    interpretation: '高胜率不一定盈利好，还需要看盈亏比。趋势策略胜率低但盈亏比高。'
  },
  'totalTrades': {
    name: '总交易次数',
    description: '回测期间的总交易次数（买入+卖出）。',
    interpretation: '交易次数反映策略活跃度。过多可能导致交易成本增加。'
  }
}

const METRICS: MetricItem[] = [
  {
    key: 'portfolioReturn',
    label: '总收益',
    icon: <TrendingUp className="h-4 w-4" />,
    format: 'percent',
  },
  {
    key: 'portfolioSharpe',
    label: '夏普比率',
    icon: <Activity className="h-4 w-4" />,
    format: 'ratio',
  },
  {
    key: 'portfolioSortino',
    label: '索提诺比率',
    icon: <BarChart3 className="h-4 w-4" />,
    format: 'ratio',
  },
  {
    key: 'portfolioCalmar',
    label: '卡尔玛比率',
    icon: <Zap className="h-4 w-4" />,
    format: 'ratio',
  },
  {
    key: 'portfolioMaxDrawdown',
    label: '最大回撤',
    icon: <TrendingDown className="h-4 w-4" />,
    format: 'percent',
    invertColor: true,
  },
  {
    key: 'portfolioVolatility',
    label: '波动率',
    icon: <Activity className="h-4 w-4" />,
    format: 'percent',
    invertColor: true,
  },
  {
    key: 'portfolioVaR95',
    label: 'VaR 95%',
    icon: <AlertTriangle className="h-4 w-4" />,
    format: 'percent',
    invertColor: true,
  },
  {
    key: 'winRate',
    label: '胜率',
    icon: <Target className="h-4 w-4" />,
    format: 'percent',
  },
  {
    key: 'totalTrades',
    label: '总交易次数',
    icon: <Percent className="h-4 w-4" />,
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
  return (
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
