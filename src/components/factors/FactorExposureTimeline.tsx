'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { ExposureSeries } from '@/lib/factors/factor-exposure'

interface FactorExposureTimelineProps {
  exposureSeries: ExposureSeries[]
  selectedSymbols?: string[]
}

export function FactorExposureTimeline({
  exposureSeries,
  selectedSymbols = [],
}: FactorExposureTimelineProps) {
  const [viewMode, setViewMode] = useState<'zscore' | 'percentile'>('zscore')
  const [visibleSymbols, setVisibleSymbols] = useState<Set<string>>(new Set(selectedSymbols))

  const allSymbols = [...new Set(exposureSeries.map(s => s.symbol))]

  const displaySymbols = visibleSymbols.size > 0
    ? allSymbols.filter(s => visibleSymbols.has(s))
    : allSymbols.slice(0, 5)

  const chartData = exposureSeries.length > 0
    ? exposureSeries[0].points.map((point, idx) => {
        const entry: Record<string, string | number> = {
          date: point.date instanceof Date
            ? point.date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
            : String(point.date),
        }
        displaySymbols.forEach(symbol => {
          const series = exposureSeries.find(s => s.symbol === symbol)
          if (series && series.points[idx]) {
            entry[symbol] = viewMode === 'zscore'
              ? Math.round(series.points[idx].zScore * 100) / 100
              : Math.round(series.points[idx].percentile * 100) / 100
          }
        })
        return entry
      })
    : []

  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6']

  const toggleSymbol = (symbol: string) => {
    const newVisible = new Set(visibleSymbols)
    if (newVisible.has(symbol)) {
      newVisible.delete(symbol)
    } else {
      newVisible.add(symbol)
    }
    setVisibleSymbols(newVisible)
  }

  if (exposureSeries.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">因子暴露度时间线</h3>
        <p className="text-sm text-muted-foreground">暂无暴露度数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">因子暴露度时间线</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('zscore')}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              viewMode === 'zscore'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            )}
          >
            Z-Score
          </button>
          <button
            onClick={() => setViewMode('percentile')}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              viewMode === 'percentile'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            )}
          >
            百分位
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {allSymbols.map((symbol, idx) => (
          <button
            key={symbol}
            onClick={() => toggleSymbol(symbol)}
            className={cn(
              'px-2 py-1 text-xs rounded-full border transition-colors',
              visibleSymbols.has(symbol) || (visibleSymbols.size === 0 && idx < 5)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-muted'
            )}
          >
            {symbol}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={viewMode === 'zscore' ? [-3, 3] : [0, 100]}
            tickFormatter={(v) => viewMode === 'zscore' ? v.toFixed(1) : `${v}%`}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value) => {
              const numValue = typeof value === 'number' ? value : 0
              return [
                viewMode === 'zscore' ? numValue.toFixed(2) : `${numValue.toFixed(1)}%`,
                viewMode === 'zscore' ? 'Z-Score' : 'Percentile'
              ]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {viewMode === 'zscore' && (
            <>
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <ReferenceLine y={1} stroke="#22c55e" strokeDasharray="3 3" opacity={0.5} />
              <ReferenceLine y={-1} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
            </>
          )}
          {displaySymbols.map((symbol, idx) => (
            <Line
              key={symbol}
              type="monotone"
              dataKey={symbol}
              stroke={colors[idx % colors.length]}
              strokeWidth={1.5}
              dot={false}
              name={symbol}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <h4 className="text-sm font-medium">解读指南</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• <strong>Z-Score</strong>：标准化后的因子暴露度，0 表示与群体均值相同</li>
          <li>• 正 Z-Score 表示该标的因子暴露度高于平均水平</li>
          <li>• 负 Z-Score 表示该标的因子暴露度低于平均水平</li>
          <li>• |Z-Score| &gt; 1.96 表示显著偏离群体（统计显著）</li>
          <li>• <strong>百分位</strong>：该标的暴露度在群体中的排名百分比</li>
        </ul>
      </div>
    </div>
  )
}