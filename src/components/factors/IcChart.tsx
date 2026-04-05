"use client"

import { useEffect, useRef } from "react"
import { createChart, IChartApi, ISeriesApi, LineSeries, LineData } from "lightweight-charts"

interface IcChartProps {
  data: { date: string; ic: number }[]
}

export function IcChart({ data }: IcChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333333",
      },
      grid: {
        vertLines: { color: "#e0e0e0" },
        horzLines: { color: "#e0e0e0" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#cccccc",
      },
      timeScale: {
        borderColor: "#cccccc",
      },
      height: 200,
    })

    chartRef.current = chart

    const series = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      title: "IC",
      lastValueVisible: true,
    })

    seriesRef.current = series

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return

    const chartData: LineData[] = data.map((item) => ({
      time: item.date,
      value: item.ic,
    }))

    seriesRef.current.setData(chartData)
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">IC 时间序列</h4>
      <div
        ref={chartContainerRef}
        className="w-full h-[200px]"
      />
    </div>
  )
}
