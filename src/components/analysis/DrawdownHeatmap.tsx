'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface DrawdownHeatmapProps {
  equityCurve: { date: Date; value: number }[]
  height?: number
}

interface DrawdownPoint {
  date: Date
  value: number
  drawdown: number
  peak: number
}

export function DrawdownHeatmap({ equityCurve, height = 200 }: DrawdownHeatmapProps) {
  const { data, maxDrawdown, avgDrawdown, currentDrawdown } = useMemo((): {
    data: DrawdownPoint[]; maxDrawdown: number; avgDrawdown: number; currentDrawdown: number
  } => {
    if (equityCurve.length === 0) {
      return { data: [], maxDrawdown: 0, avgDrawdown: 0, currentDrawdown: 0 }
    }

    let peak = equityCurve[0].value
    let maxDD = 0
    const points: DrawdownPoint[] = []

    for (const point of equityCurve) {
      if (point.value > peak) peak = point.value
      const dd = peak > 0 ? ((peak - point.value) / peak) * 100 : 0
      if (dd > maxDD) maxDD = dd
      points.push({
        date: point.date,
        value: point.value,
        drawdown: dd,
        peak,
      })
    }

    const ddValues = points.map(p => p.drawdown)
    const avgDD = ddValues.reduce((a, b) => a + b, 0) / ddValues.length
    const currentDD = points[points.length - 1]?.drawdown ?? 0

    return {
      data: points.map(p => ({
        date: p.date,
        value: p.value,
        drawdown: p.drawdown,
        peak: p.peak,
      })),
      maxDrawdown: maxDD,
      avgDrawdown: avgDD,
      currentDrawdown: currentDD,
    }
  }, [equityCurve])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        无数据
      </div>
    )
  }

  const chartData = data.map((d: DrawdownPoint) => ({
    date: new Date(d.date).getTime() / 1000,
    drawdown: -d.drawdown,
    value: d.value,
  }))

  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-xs">
        <div>
          <span className="text-gray-500">当前回撤: </span>
          <span className={cn(
            'font-bold',
            currentDrawdown > 10 ? 'text-red-600' : currentDrawdown > 5 ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'
          )}>
            -{currentDrawdown.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-gray-500">最大回撤: </span>
          <span className="font-bold text-red-600">-{maxDrawdown.toFixed(2)}%</span>
        </div>
        <div>
          <span className="text-gray-500">平均回撤: </span>
          <span className="font-bold text-gray-700 dark:text-gray-300">-{avgDrawdown.toFixed(2)}%</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={v => new Date(v * 1000).toLocaleDateString('zh-CN', { month: 'short', year: '2-digit' })}
            tick={{ fontSize: 10 }}
            tickCount={6}
          />
          <YAxis
            tickFormatter={v => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11 }}
            width={50}
            orientation="right"
            domain={[Math.min(-maxDrawdown - 5, -5), 0]}
          />
          <Tooltip
            formatter={(v, name) => {
              if (name === 'drawdown' && typeof v === 'number') return [`-${v.toFixed(2)}%`, '回撤']
              if (typeof v === 'number') return [v.toFixed(4), String(name)]
              return [String(v), String(name)]
            }}
            labelFormatter={v => new Date(Number(v) * 1000).toLocaleDateString('zh-CN')}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="url(#ddGrad)"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="text-[10px] text-gray-400 text-center">
        面积越大 = 回撤越深越久
      </div>
    </div>
  )
}


