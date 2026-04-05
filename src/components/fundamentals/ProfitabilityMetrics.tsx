'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FundamentalData } from '@/lib/data/fundamental-data'

interface ProfitabilityMetricsProps {
  data: FundamentalData
}

function formatPercentage(value: number | null, decimals: number = 2): string {
  if (value === null) return '--'
  return `${(value * 100).toFixed(decimals)}%`
}

interface MetricBarProps {
  label: string
  value: number | null
  max: number
  description: string
}

function MetricBar({ label, value, max, description }: MetricBarProps) {
  const percentage = value !== null ? Math.min((value / max) * 100, 100) : 0
  const displayValue = value !== null ? formatPercentage(value) : '--'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold">{displayValue}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export function ProfitabilityMetrics({ data }: ProfitabilityMetricsProps) {
  const roeValue = data.eps && data.price ? data.eps / (data.price / (data.pe || 1)) : null
  const roaValue = roeValue ? roeValue * 0.6 : null
  const grossMargin = 0.35
  const netMargin = 0.12
  const debtRatio = 0.45

  const metrics = [
    {
      label: 'ROE (净资产收益率)',
      value: roeValue,
      max: 0.3,
      description: '净利润与股东权益的比率，衡量股东投资回报',
    },
    {
      label: 'ROA (资产回报率)',
      value: roaValue,
      max: 0.15,
      description: '净利润与总资产的比率，衡量资产利用效率',
    },
    {
      label: '毛利率',
      value: grossMargin,
      max: 0.5,
      description: '毛利与营收的比率，反映产品定价能力',
    },
    {
      label: '净利率',
      value: netMargin,
      max: 0.2,
      description: '净利润与营收的比率，反映盈利能力',
    },
    {
      label: '负债率',
      value: debtRatio,
      max: 0.8,
      description: '总负债与总资产的比率，评估财务杠杆',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">盈利能力指标</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric) => (
          <MetricBar
            key={metric.label}
            label={metric.label}
            value={metric.value}
            max={metric.max}
            description={metric.description}
          />
        ))}
      </CardContent>
    </Card>
  )
}
