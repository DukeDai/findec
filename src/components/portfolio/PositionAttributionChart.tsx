'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AttributionSummary } from '@/lib/portfolio/attribution-calculator'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface PositionAttributionChartProps {
  attribution: AttributionSummary
  title?: string
}

export function PositionAttributionChart({
  attribution,
  title = '持仓归因分析',
}: PositionAttributionChartProps) {
  const chartData = useMemo(() => {
    return attribution.positions.map(p => ({
      symbol: p.symbol,
      contribution: p.contribution,
      return: p.return,
      allocation: p.allocation,
      attributionPct: p.attributionPct,
      category: p.category,
      fill: p.contribution > 0 ? '#22c55e' : p.contribution < 0 ? '#ef4444' : '#9ca3af',
    }))
  }, [attribution])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'outperform':
        return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'underperform':
        return <ArrowDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  if (attribution.positions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          暂无持仓数据
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">组合收益</div>
            <div className={`text-xl font-bold ${
              attribution.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {attribution.totalReturn >= 0 ? '+' : ''}{attribution.totalReturn.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">持仓数量</div>
            <div className="text-xl font-bold">{attribution.positions.length}</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">集中度风险</div>
            <div className={`text-xl font-bold ${
              attribution.concentrationRisk > 50 ? 'text-red-600' : 'text-green-600'
            }`}>
              {attribution.concentrationRisk.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground">正贡献持仓</div>
            <div className="text-xl font-bold text-green-600">
              {attribution.positions.filter(p => p.contribution > 0).length}
            </div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="symbol"
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                label={{ value: '收益贡献 (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value) => {
                  const numValue = typeof value === 'number' ? value : 0
                  return [`${numValue.toFixed(2)}%`, '收益贡献']
                }}
                labelFormatter={(label) => `标的: ${label}`}
                contentStyle={{ borderRadius: '8px' }}
              />
              <ReferenceLine y={0} stroke="#000" />
              <Bar dataKey="contribution" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium mb-3 text-green-700">最大贡献者</h4>
            <div className="space-y-2">
              {attribution.topContributors.map((p) => (
                <div key={p.symbol} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(p.category)}
                    <span className="font-medium">{p.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-700">
                      +{p.contribution.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      收益 {p.return.toFixed(1)}% · 配置 {p.allocation.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3 text-red-700">最大拖累者</h4>
            <div className="space-y-2">
              {attribution.bottomContributors.map((p) => (
                <div key={p.symbol} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(p.category)}
                    <span className="font-medium">{p.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-red-700">
                      {p.contribution.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      收益 {p.return.toFixed(1)}% · 配置 {p.allocation.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
