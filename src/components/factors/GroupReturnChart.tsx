'use client'

import { useEffect, useRef } from 'react'
import { createChart, IChartApi, ISeriesApi, HistogramSeries, HistogramData } from 'lightweight-charts'
import { cn } from '@/lib/utils'

interface GroupReturn {
  group: number
  return: number
}

interface GroupReturnChartProps {
  groupReturns: GroupReturn[]
}

function isMonotonic(groups: GroupReturn[]): boolean {
  if (groups.length < 2) return false

  const returns = groups.map(g => g.return)

  let ascending = true
  for (let i = 1; i < returns.length; i++) {
    if (returns[i] <= returns[i - 1]) {
      ascending = false
      break
    }
  }

  let descending = true
  for (let i = 1; i < returns.length; i++) {
    if (returns[i] >= returns[i - 1]) {
      descending = false
      break
    }
  }

  return ascending || descending
}

export function GroupReturnChart({ groupReturns }: GroupReturnChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const monotonic = isMonotonic(groupReturns)
  const avgReturn = groupReturns.length > 0
    ? groupReturns.reduce((sum, g) => sum + g.return, 0) / groupReturns.length
    : 0

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        visible: false,
      },
      height: 200,
    })

    chartRef.current = chart

    const series = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    })

    seriesRef.current = series

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || groupReturns.length === 0) return

    const chartData: HistogramData[] = groupReturns.map((item) => ({
      time: item.group as unknown as string,
      value: item.return * 100,
      color: item.return >= 0 ? '#22c55e' : '#ef4444',
    }))

    seriesRef.current.setData(chartData)
    chartRef.current?.timeScale().fitContent()
  }, [groupReturns])

  if (groupReturns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        暂无分组收益数据
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">单调性：</span>
          <span className={cn('font-medium', monotonic ? 'text-green-600' : 'text-amber-600')}>
            {monotonic ? '单调递增/递减' : '非单调'}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">平均收益：</span>
          <span className={cn('font-medium', avgReturn > 0 ? 'text-green-600' : 'text-red-600')}>
            {(avgReturn * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      <div
        className={cn(
          'p-4 rounded-lg border-2',
          monotonic ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
        )}
      >
        <div
          ref={chartContainerRef}
          className="w-full h-[200px]"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>第1组 (低因子值)</span>
          <span>第10组 (高因子值)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">最高组收益</div>
          <div className="text-lg font-semibold text-green-600">
            {(Math.max(...groupReturns.map(g => g.return)) * 100).toFixed(2)}%
          </div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">最低组收益</div>
          <div className="text-lg font-semibold text-red-600">
            {(Math.min(...groupReturns.map(g => g.return)) * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          分组回测：按因子值将股票分为10组，第1组因子值最低，第10组因子值最高。
        </p>
        <p className="mt-1">
          {monotonic
            ? '单调性良好，说明因子与收益存在较稳定的线性关系。'
            : '单调性较弱，可能需要结合其他因子使用或调整因子的计算方式。'}
        </p>
      </div>
    </div>
  )
}
