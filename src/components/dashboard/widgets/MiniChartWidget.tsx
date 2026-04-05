'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { WidgetProps } from '../WidgetRegistry'

interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
}

export function MiniChartWidget(_props: WidgetProps) {
  const [symbol, setSymbol] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuote = async () => {
    if (!symbol.trim()) return

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/quotes?symbol=${symbol.toUpperCase()}`)
      if (!response.ok) throw new Error('Stock not found')
      const data = await response.json()
      setQuote(data)
    } catch {
      setError('获取数据失败')
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }

  const changePercent = quote?.changePercent ?? 0

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="输入股票代码"
          onKeyDown={(e) => e.key === 'Enter' && fetchQuote()}
        />
        <Button onClick={fetchQuote} disabled={loading} size="sm">
          {loading ? '查询中...' : '查询'}
        </Button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {quote && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{quote.name}</span>
            <span className="text-xs text-muted-foreground">{quote.symbol}</span>
          </div>
          <div className="text-2xl font-bold">${quote.price.toFixed(2)}</div>
          <div className={changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
            {changePercent >= 0 ? '+' : ''}
            {quote.change.toFixed(2)} ({changePercent.toFixed(2)}%)
          </div>
          <div className="text-sm text-muted-foreground">
            成交量: {Number(quote.volume).toLocaleString()}
          </div>
        </div>
      )}

      {!quote && !error && (
        <div className="text-center text-muted-foreground py-8">
          <p>输入股票代码查看实时报价</p>
        </div>
      )}
    </div>
  )
}
