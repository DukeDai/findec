'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface FormulaResult {
  symbol: string
  formula: string
  latest: number | null
  length: number
  sampleValues: { index: number; value: number | null }[]
}

const PRESET_FORMULAS = [
  { label: 'MACD 交叉信号', formula: 'SMA(close, 12) - SMA(close, 26)' },
  { label: '均线偏离度 (%)', formula: '(close - SMA(close, 20)) / SMA(close, 20) * 100' },
  { label: 'RSI 标准化 (0-1)', formula: 'RSI(close, 14) / 100' },
  { label: '波动率变化率', formula: 'ATR(close, 14) / SMA(close, 14)' },
  { label: '布林带偏离 (%)', formula: '(close - BB(close, 20, 2)) / BB(close, 20, 2) * 100' },
  { label: 'Stochastic 偏离', formula: 'STOCH(close, 14, 3) - STOCH(close, 28, 3)' },
]

export function FormulaCalculator() {
  const [symbol, setSymbol] = useState('AAPL')
  const [formula, setFormula] = useState('SMA(close, 20) - SMA(close, 50)')
  const [result, setResult] = useState<FormulaResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function evaluate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), formula }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Evaluation failed')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const chartData = result?.sampleValues.map((v, i) => ({
    name: String(i),
    value: v.value ?? 0,
  })) ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">股票代码</label>
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700"
            placeholder="AAPL"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">公式结果</label>
          <div className="px-3 py-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700 font-mono h-[42px] flex items-center">
            {result ? (
              <span className={cn('font-bold', result.latest !== null && result.latest >= 0 ? 'text-green-600' : 'text-red-600')}>
                {result.latest !== null ? result.latest.toFixed(4) : 'N/A'}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">自定义公式</label>
        <input
          type="text"
          value={formula}
          onChange={e => setFormula(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm font-mono dark:bg-gray-800 dark:border-gray-700"
          placeholder="SMA(close, 20) / SMA(close, 50) - 1"
          onKeyDown={e => e.key === 'Enter' && evaluate()}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_FORMULAS.map(p => (
          <button
            key={p.label}
            onClick={() => setFormula(p.formula)}
            className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        onClick={evaluate}
        disabled={loading || !symbol || !formula}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '计算中…' : '计算'}
      </button>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600">
          {error}
        </div>
      )}

      {result && chartData.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {symbol} · {result.formula} · 最新值: <strong>{result.latest?.toFixed(4)}</strong>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" tick={false} />
              <YAxis tick={{ fontSize: 11 }} width={60} />
              <Tooltip
                formatter={(v) => [typeof v === 'number' ? v.toFixed(4) : v, 'Value']}
                contentStyle={{ fontSize: 12 }}
              />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">可用函数</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
          <span>SMA(close, period)</span>
          <span>EMA(close, period)</span>
          <span>RSI(close, period)</span>
          <span>MACD(close, fast, slow, sig)</span>
          <span>BB(close, period, std)</span>
          <span>ATR(close, period)</span>
          <span>ADX(close, period)</span>
          <span>STOCH(close, k, d)</span>
          <span>MAX(a, b, ...)</span>
          <span>MIN(a, b, ...)</span>
          <span>ABS(x)</span>
          <span>LOG(x)</span>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          字段: <span className="font-mono">close</span>, <span className="font-mono">open</span>, <span className="font-mono">high</span>, <span className="font-mono">low</span>, <span className="font-mono">volume</span>
        </div>
      </div>
    </div>
  )
}
