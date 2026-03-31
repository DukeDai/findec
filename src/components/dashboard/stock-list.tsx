'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
}

export function StockList() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        股票搜索
      </h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入股票名称或代码"
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={loading}>
            {loading ? '搜索中...' : '搜索'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((stock) => (
              <Link
                key={stock.symbol}
                href={`/chart/${stock.symbol}`}
                className="block p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {stock.symbol}
                </div>
                <div className="text-sm text-zinc-500">{stock.name}</div>
                <div className="text-xs text-zinc-500">{stock.exchange}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
