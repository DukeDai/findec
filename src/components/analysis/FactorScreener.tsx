'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface FactorStrategy {
  id: string
  name: string
  description: string
  rules: { field: string; operator: string; value: number }[]
}

interface ScreeningResult {
  symbol: string
  name: string
  price: number
  change: number
  matchScore: number
  factors: Record<string, number>
}

export function FactorScreener() {
  const [strategies, setStrategies] = useState<FactorStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<string>('')
  const [results, setResults] = useState<ScreeningResult[]>([])
  const [loading, setLoading] = useState(false)

  const loadStrategies = async () => {
    try {
      const res = await fetch('/api/factors/strategies')
      const data = await res.json()
      setStrategies(data)
    } catch (error) {
      console.error('Failed to load strategies:', error)
    }
  }

  const runScreen = async () => {
    if (!selectedStrategy) return
    setLoading(true)
    try {
      const res = await fetch('/api/factors/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: selectedStrategy }),
      })
      const data = await res.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Failed to run screen:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
          onFocus={loadStrategies}
        >
          <option value="">选择因子策略...</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button onClick={runScreen} disabled={!selectedStrategy || loading}>
          {loading ? '筛选中...' : '执行筛选'}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">股票</th>
                <th className="px-3 py-2 text-right">价格</th>
                <th className="px-3 py-2 text-right">涨跌幅</th>
                <th className="px-3 py-2 text-right">匹配度</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.symbol} className="border-t">
                  <td className="px-3 py-2 font-medium">{r.symbol}</td>
                  <td className="px-3 py-2 text-right">${r.price?.toFixed(2)}</td>
                  <td className={`px-3 py-2 text-right ${r.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {r.change?.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right">{r.matchScore?.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}