'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface IcDecayData {
  lag: number
  ic: number
}

interface IcDecayChartProps {
  decayData: IcDecayData[]
  factorName?: string
}

export function IcDecayChart({
  decayData,
  factorName = '因子',
}: IcDecayChartProps) {
  const chartData = useMemo(() => {
    if (!decayData || decayData.length === 0) return []

    const maxIc = Math.max(...decayData.map(d => Math.abs(d.ic)), 0.001)

    return decayData.map((d) => {
      const normalizedValue = maxIc > 0 ? Math.abs(d.ic) / maxIc : 0
      return {
        lag: d.lag,
        ic: d.ic,
        absoluteIc: Math.abs(d.ic),
        relativeStrength: normalizedValue,
        label: `${d.lag}日`,
      }
    })
  }, [decayData])

  const halfLife = useMemo(() => {
    if (chartData.length === 0) return null
    const baseValue = chartData[0]?.relativeStrength ?? 1
    if (baseValue === 0) return null

    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].relativeStrength <= 0.5) {
        return chartData[i].lag
      }
    }
    return null
  }, [chartData])

  const statistics = useMemo(() => {
    if (chartData.length === 0) return null

    const ics = chartData.map(d => d.ic)
    const avgIc = ics.reduce((a, b) => a + b, 0) / ics.length
    const positiveDays = ics.filter(ic => ic > 0).length
    const consistency = ics.length > 0 ? positiveDays / ics.length : 0

    return {
      avgIc,
      consistency,
      maxIc: Math.max(...ics.map(Math.abs)),
      latestIc: ics[ics.length - 1],
    }
  }, [chartData])

  if (decayData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          暂无衰减数据
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">IC衰减分析</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {factorName} - 因子预测能力随时间衰减情况
          </p>
        </div>
        {halfLife && (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            半衰期: {halfLife}天
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">平均IC</div>
              <div className={`text-lg font-semibold ${
                statistics.avgIc > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {statistics.avgIc.toFixed(3)}
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">IC一致性</div>
              <div className="text-lg font-semibold">
                {(statistics.consistency * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">最大IC</div>
              <div className="text-lg font-semibold">
                {statistics.maxIc.toFixed(3)}
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">最新IC</div>
              <div className={`text-lg font-semibold ${
                statistics.latestIc > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {statistics.latestIc.toFixed(3)}
              </div>
            </div>
          </div>
        )}

        {/* IC Decay Line Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="lag"
                type="number"
                tickFormatter={(v) => `${v}日`}
                label={{ value: '滞后天数', position: 'bottom', offset: 0 }}
                stroke="#6b7280"
              />
              <YAxis
                tickFormatter={(v) => v.toFixed(2)}
                label={{ value: 'IC值', angle: -90, position: 'insideLeft' }}
                stroke="#6b7280"
              />
              <Tooltip
                formatter={(value) => [typeof value === 'number' ? value.toFixed(3) : value, 'IC值']}
                labelFormatter={(label) => `${label}日滞后期`}
                contentStyle={{ borderRadius: '8px' }}
              />

              {halfLife && (
                <ReferenceLine
                  x={halfLife}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{ value: '半衰期', position: 'top', fill: '#f59e0b' }}
                />
              )}

              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />

              <Line
                type="monotone"
                dataKey="ic"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Relative Strength Area Chart */}
        <div className="h-48">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            相对强度衰减曲线
          </h4>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="lag"
                type="number"
                tickFormatter={(v) => `${v}日`}
                stroke="#6b7280"
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                stroke="#6b7280"
              />
              <Tooltip
                formatter={(value) => {
                  const numValue = typeof value === 'number' ? value : 0
                  return [`${(numValue * 100).toFixed(1)}%`, '相对强度']
                }}
                labelFormatter={(label) => `${label}日滞后期`}
              />
              <ReferenceLine y={0.5} stroke="#f59e0b" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="relativeStrength"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Explanation */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <p className="font-medium mb-1">IC衰减测试说明：</p>
          <p>观察因子预测能力随时间推移的变化。半衰期表示IC衰减至初始值50%所需时间，半衰期越长说明因子持续性越好。</p>
        </div>
      </CardContent>
    </Card>
  )
}
