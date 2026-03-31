'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
}

export function QuickQuote() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setQuote(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        快速报价
      </h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="输入股票代码"
            onKeyDown={(e) => e.key === 'Enter' && fetchQuote()}
          />
          <Button onClick={fetchQuote} disabled={loading}>
            {loading ? '查询中...' : '查询'}
          </Button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {quote && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">{quote.name}</span>
              <span className="text-xs text-zinc-500">{quote.symbol}</span>
            </div>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              ${quote.price.toFixed(2)}
            </div>
            <div className={quote.change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {quote.change >= 0 ? '+' : ''}
              {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
            </div>
            <div className="text-sm text-zinc-500">
              成交量: {Number(quote.volume).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
