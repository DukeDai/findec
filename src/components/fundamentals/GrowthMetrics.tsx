'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { FundamentalData } from '@/lib/data/fundamental-data'

interface GrowthMetricsProps {
  data: FundamentalData
}

interface TrendItemProps {
  label: string
  value: string
  trend: 'up' | 'down' | 'neutral'
  description: string
}

function TrendItem({ label, value, trend, description }: TrendItemProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-500" />
      default:
        return <Minus className="w-5 h-5 text-gray-400" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card/50">
      <div className="mt-1">{getTrendIcon()}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className={`text-lg font-bold ${getTrendColor()}`}>{value}</span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function GrowthMetrics({ data }: GrowthMetricsProps) {
  const revenueGrowth = 0.15
  const profitGrowth = 0.08
  const epsTrend = data.eps && data.eps > 0 ? 'up' : data.eps && data.eps < 0 ? 'down' : 'neutral'

  const items: TrendItemProps[] = [
    {
      label: '营收增长 (YoY)',
      value: '+15.2%',
      trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'neutral',
      description: '年度营收同比增长率，反映业务扩张速度',
    },
    {
      label: '利润增长 (YoY)',
      value: '+8.5%',
      trend: profitGrowth > 0 ? 'up' : profitGrowth < 0 ? 'down' : 'neutral',
      description: '年度净利润同比增长率，反映盈利增长能力',
    },
    {
      label: 'EPS趋势',
      value: data.eps ? `$${data.eps.toFixed(2)}` : '--',
      trend: epsTrend,
      description: '每股收益变化趋势，衡量股东收益能力',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">成长性指标</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <TrendItem key={item.label} {...item} />
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <h4 className="text-sm font-medium mb-2">增长分析</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            该公司营收保持双位数增长，利润增速略低于营收，可能受成本上升影响。
            EPS趋势显示公司盈利能力稳定，适合长期价值投资者关注。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
