'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ParameterSliderProps {
  label: string
  description?: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  formatValue?: (v: number) => string
}

export function ParameterSlider({
  label,
  description,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue,
}: ParameterSliderProps) {
  const displayValue = formatValue ? formatValue(value) : value.toString()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{label}</span>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <span className="text-sm font-bold text-primary tabular-nums">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

interface ParameterGroup {
  label: string
  params: { key: string; label: string; min: number; max: number; step?: number; default: number; formatValue?: (v: number) => string }[]
}

const PARAM_GROUPS: ParameterGroup[] = [
  {
    label: '移动平均线',
    params: [
      { key: 'maPeriod', label: 'MA 周期', min: 5, max: 50, step: 1, default: 20 },
    ],
  },
  {
    label: 'RSI 指标',
    params: [
      { key: 'rsiPeriod', label: 'RSI 周期', min: 7, max: 21, step: 1, default: 14 },
      { key: 'rsiOversold', label: '超卖线', min: 20, max: 40, step: 1, default: 30, formatValue: v => v.toString() },
      { key: 'rsiOverbought', label: '超买线', min: 60, max: 80, step: 1, default: 70 },
    ],
  },
]

type Params = Record<string, number>

function generatePriceData(days: number): number[] {
  const prices: number[] = [100]
  for (let i = 1; i < days; i++) {
    prices.push(prices[i - 1] * (1 + (Math.random() - 0.48) * 0.02))
  }
  return prices
}

function calculateMA(prices: number[], period: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null
    const slice = prices.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

function calculateRSI(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(period).fill(null)
  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i < period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period

  for (let i = period; i < prices.length; i++) {
    if (avgLoss === 0) {
      result.push(100)
    } else {
      result.push(100 - 100 / (1 + avgGain / avgLoss))
    }
    const change = prices[i] - prices[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change > 0 ? 0 : Math.abs(change)
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }
  return result
}

function runStrategy(prices: number[], params: Params) {
  const ma = calculateMA(prices, params.maPeriod)
  const rsi = calculateRSI(prices, params.rsiPeriod)
  const trades: { day: number; price: number; type: 'BUY' | 'SELL'; pnl: number }[] = []
  let position = 0
  let cash = 10000

  for (let i = Math.max(params.maPeriod, params.rsiPeriod); i < prices.length; i++) {
    const price = prices[i]
    const maVal = ma[i]
    const rsiVal = rsi[i]

    if (!maVal || !rsiVal) continue

    const shouldBuy = price > maVal && rsiVal < params.rsiOversold && position === 0
    const shouldSell = price < maVal && rsiVal > params.rsiOverbought && position > 0

    if (shouldBuy) {
      position = Math.floor(cash / price)
      cash -= position * price
      trades.push({ day: i, price, type: 'BUY', pnl: 0 })
    } else if (shouldSell) {
      const pnl = (price - trades[trades.length - 1].price) * position
      cash += position * price
      trades.push({ day: i, price, type: 'SELL', pnl })
      position = 0
    }
  }

  const finalValue = cash + position * prices[prices.length - 1]
  const totalReturn = (finalValue - 10000) / 10000
  const totalTrades = trades.length
  const winTrades = trades.filter(t => t.pnl > 0).length
  const winRate = totalTrades > 0 ? winTrades / (totalTrades / 2) : 0

  return { totalReturn, winRate, totalTrades, equityCurve: prices }
}

export function LiveSignalPreview({ params, className }: { params: Params; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<{ chart: unknown; series: unknown; maSeries: unknown } | null>(null)
  const [prices, setPrices] = useState<number[]>([])

  useEffect(() => {
    setPrices(generatePriceData(120))
  }, [])

  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return

    import('lightweight-charts').then(({ createChart, ColorType, LineSeries }) => {
      const container = containerRef.current!
      if (chartRef.current) {
        const existing = chartRef.current as { chart: { remove: () => void }; series: unknown; maSeries: unknown }
        existing.chart.remove()
      }

      const chart = createChart(container, {
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#6b7280' },
        grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
        width: container.clientWidth,
        height: 200,
      })

      const series = chart.addSeries(LineSeries, { color: '#6b7280', lineWidth: 1 })
      const ma = calculateMA(prices, params.maPeriod)
      const rsi = calculateRSI(prices, params.rsiPeriod)

      series.setData(prices.map((p, i) => ({ time: i as unknown as string, value: p })))

      const maSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1 })
      maSeries.setData(
        ma.map((v, i) => (v !== null ? { time: i as unknown as string, value: v } : null)).filter(Boolean) as { time: string; value: number }[]
      )

      const buySignals: { time: string; position: 'belowBar' }[] = []
      const sellSignals: { time: string; position: 'aboveBar' }[] = []
      let position = 0

      for (let i = Math.max(params.maPeriod, params.rsiPeriod); i < prices.length; i++) {
        const maVal = ma[i]
        const rsiVal = rsi[i]
        if (!maVal || !rsiVal) continue
        if (prices[i] > maVal && rsiVal < params.rsiOversold && position === 0) {
          buySignals.push({ time: i as unknown as string, position: 'belowBar' })
          position = 1
        } else if (prices[i] < maVal && rsiVal > params.rsiOverbought && position > 0) {
          sellSignals.push({ time: i as unknown as string, position: 'aboveBar' })
          position = 0
        }
      }

      chartRef.current = { chart, series, maSeries }
    })
  }, [prices, params])

  return <div ref={containerRef} className={cn('w-full rounded-lg', className)} />
}

export function QuickBacktest({ params, className }: { params: Params; className?: string }) {
  const [prices] = useState<number[]>(() => generatePriceData(120))
  const [result, setResult] = useState(() => runStrategy(prices, params))

  useEffect(() => {
    const timeout = setTimeout(() => setResult(runStrategy(prices, params)), 300)
    return () => clearTimeout(timeout)
  }, [params, prices])

  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">总收益</p>
        <p className={cn('text-lg font-bold', result.totalReturn >= 0 ? 'text-green-600' : 'text-red-600')}>
          {result.totalReturn >= 0 ? '+' : ''}{(result.totalReturn * 100).toFixed(1)}%
        </p>
      </div>
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">交易次数</p>
        <p className="text-lg font-bold text-blue-600">{result.totalTrades}</p>
      </div>
      <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">胜率</p>
        <p className="text-lg font-bold text-purple-600">{isNaN(result.winRate) ? '-' : `${(result.winRate * 100).toFixed(0)}%`}</p>
      </div>
    </div>
  )
}

export function InteractiveParams() {
  const [params, setParams] = useState<Params>(() => {
    const init: Params = {}
    PARAM_GROUPS.forEach(g => g.params.forEach(p => { init[p.key] = p.default }))
    return init
  })

  const updateParam = useCallback((key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h2 className="text-xl font-bold">交互式参数演示</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">参数调节</h3>
          {PARAM_GROUPS.map(group => (
            <div key={group.label} className="space-y-3">
              <p className="text-sm font-medium">{group.label}</p>
              {group.params.map(p => (
                <ParameterSlider
                  key={p.key}
                  label={p.label}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={params[p.key]}
                  onChange={v => updateParam(p.key, v)}
                  formatValue={p.formatValue}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">信号预览</h3>
          <LiveSignalPreview params={params} />

          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-2">快速回测结果</h3>
          <QuickBacktest params={params} />

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p><strong>策略说明：</strong>当价格高于 MA 且 RSI 低于超卖线时买入；当价格低于 MA 且 RSI 高于超买线时卖出。</p>
            <p className="mt-1">拖动上方滑块调整参数，右侧图表和回测结果会实时更新。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
