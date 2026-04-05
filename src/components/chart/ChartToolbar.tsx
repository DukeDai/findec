'use client'

interface IndicatorState {
  ma5: boolean
  ma10: boolean
  ma20: boolean
  ma60: boolean
  ema5: boolean
  ema10: boolean
  ema20: boolean
  rsi: boolean
  macd: boolean
  vwap: boolean
}

const INDICATOR_COLORS: Record<string, string> = {
  ma5: '#3b82f6',
  ma10: '#8b5cf6',
  ma20: '#f97316',
  ma60: '#06b6d4',
  ema5: '#22c55e',
  ema10: '#eab308',
  ema20: '#ec4899',
  rsi: '#6366f1',
  macd: '#14b8a6',
  vwap: '#a855f7',
}

const INDICATOR_LABELS: [string, keyof IndicatorState][] = [
  ['MA5', 'ma5'],
  ['MA10', 'ma10'],
  ['MA20', 'ma20'],
  ['MA60', 'ma60'],
  ['EMA5', 'ema5'],
  ['EMA10', 'ema10'],
  ['EMA20', 'ema20'],
  ['RSI', 'rsi'],
  ['MACD', 'macd'],
  ['VWAP', 'vwap'],
]

interface ChartToolbarProps {
  indicators: IndicatorState
  onToggle: (key: keyof IndicatorState) => void
}

export function ChartToolbar({ indicators, onToggle }: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 p-3 border-b border-zinc-200 bg-zinc-50">
      {INDICATOR_LABELS.map(([label, key]) => (
        <label
          key={key}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900"
        >
          <input
            type="checkbox"
            checked={indicators[key]}
            onChange={() => onToggle(key)}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-500 focus:ring-blue-500"
          />
          <span style={{ color: INDICATOR_COLORS[key] }}>{label}</span>
        </label>
      ))}
    </div>
  )
}

export type { IndicatorState }
