"use client"

import { useEffect, useRef } from "react"
import { createChart, IChartApi, ISeriesApi, HistogramSeries, HistogramData } from "lightweight-charts"
import { cn } from "@/lib/utils"

interface IcIrChartProps {
  data: { factorId: string; name: string; icIr: number }[]
  selectedFactorId?: string
  onSelect?: (factorId: string) => void
}

export function IcIrChart({ data, selectedFactorId, onSelect }: IcIrChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)

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
        mode: 0,
      },
      rightPriceScale: {
        borderColor: "#cccccc",
      },
      timeScale: {
        borderColor: "#cccccc",
        visible: false,
      },
      height: 250,
    })

    chartRef.current = chart

    const series = chart.addSeries(HistogramSeries, {
      color: "#3b82f6",
      priceFormat: {
        type: "price",
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

    const chartData: HistogramData[] = data.map((item, index) => ({
      time: index as unknown as string,
      value: item.icIr,
      color: item.icIr >= 0 ? "#22c55e" : "#ef4444",
    }))

    seriesRef.current.setData(chartData)
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">因子 IC/IR 对比</h4>
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs text-muted-foreground">正 IC/IR</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-xs text-muted-foreground">负 IC/IR</span>
        </div>
      </div>
      <div
        ref={chartContainerRef}
        className="w-full h-[250px]"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-4">
        {data.map((item) => (
          <button
            key={item.factorId}
            onClick={() => onSelect?.(item.factorId)}
            className={cn(
              "text-xs px-2 py-1 rounded border transition-colors text-left",
              selectedFactorId === item.factorId
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="font-medium truncate">{item.name}</div>
            <div className={cn(
              "text-[10px]",
              item.icIr >= 0 ? "text-green-600" : "text-red-600"
            )}>
              IC/IR: {item.icIr.toFixed(2)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
