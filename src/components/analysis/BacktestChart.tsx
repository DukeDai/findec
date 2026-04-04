'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, LineData, Time, LineSeries, createSeriesMarkers, SeriesMarker } from 'lightweight-charts'

interface Trade {
  date: string
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  symbol: string
  reason?: string
  pnl?: number
}

interface BacktestChartProps {
  equityCurve: { date: Date; value: number }[]
  benchmark?: { date: Date; value: number }[]
  trades?: Trade[]
  height?: number
}

export function BacktestChart({
  equityCurve,
  benchmark,
  trades,
  height = 400,
}: BacktestChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const equitySeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const benchmarkSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const markersRef = useRef<{ setMarkers: (markers: SeriesMarker<Time>[]) => void } | null>(null)

  const [maxDrawdown, setMaxDrawdown] = useState<{ start: number; end: number; value: number } | null>(null)

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
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
      },
      height,
    })

    chartRef.current = chart

    const equitySeries = chart.addSeries(LineSeries, {
      color: '#22c55e',
      lineWidth: 2,
      title: '策略净值',
    })
    equitySeriesRef.current = equitySeries

    const benchmarkSeries = chart.addSeries(LineSeries, {
      color: '#6b7280',
      lineWidth: 2,
      lineStyle: 2,
      title: '基准对比',
    })
    benchmarkSeriesRef.current = benchmarkSeries

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
    }
  }, [height])

  useEffect(() => {
    if (!equitySeriesRef.current || !chartRef.current || equityCurve.length === 0) return

    const data: LineData[] = equityCurve.map((point) => ({
      time: (new Date(point.date).getTime() / 1000) as Time,
      value: point.value,
    }))

    equitySeriesRef.current.setData(data)

    const isProfit = data[data.length - 1].value >= data[0].value
    equitySeriesRef.current.applyOptions({
      color: isProfit ? '#22c55e' : '#ef4444',
    })

    const peak = { value: data[0].value, index: 0 }
    let maxDD = 0
    let ddStart = 0
    let ddEnd = 0

    for (let i = 1; i < data.length; i++) {
      if (data[i].value > peak.value) {
        peak.value = data[i].value
        peak.index = i
      } else {
        const drawdown = (peak.value - data[i].value) / peak.value
        if (drawdown > maxDD) {
          maxDD = drawdown
          ddStart = peak.index
          ddEnd = i
        }
      }
    }

    const ddInfo = maxDD > 0 ? { start: ddStart, end: ddEnd, value: maxDD * 100 } : null
    setMaxDrawdown(ddInfo)

    chartRef.current.timeScale().fitContent()
  }, [equityCurve])

  useEffect(() => {
    if (!benchmarkSeriesRef.current || !chartRef.current || !benchmark || benchmark.length === 0) return

    const data: LineData[] = benchmark.map((point) => ({
      time: (new Date(point.date).getTime() / 1000) as Time,
      value: point.value,
    }))

    benchmarkSeriesRef.current.setData(data)
  }, [benchmark])

  useEffect(() => {
    if (!equitySeriesRef.current || !trades || trades.length === 0) return

    const markers: SeriesMarker<Time>[] = trades.map((trade) => ({
      time: (new Date(trade.date).getTime() / 1000) as Time,
      position: trade.type === 'BUY' ? 'belowBar' : 'aboveBar',
      color: trade.type === 'BUY' ? '#22c55e' : '#ef4444',
      shape: trade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: `${trade.type === 'BUY' ? '买' : '卖'} ${trade.symbol}`,
      size: 1,
    }))

    if (markersRef.current) {
      markersRef.current.setMarkers(markers)
    } else {
      markersRef.current = createSeriesMarkers(equitySeriesRef.current, markers)
    }
  }, [trades])

  return (
    <div className="relative">
      {maxDrawdown && maxDrawdown.value > 0 && (
        <div className="absolute top-2 left-2 z-10 bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-medium">
          最大回撤: {maxDrawdown.value.toFixed(2)}%
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  )
}
