"use client"

import { useState } from 'react'
import { ChartContainer } from '@/components/chart/ChartContainer'
import { Search } from 'lucide-react'

export default function Home() {
  const [symbol, setSymbol] = useState('AAPL')
  const [inputValue, setInputValue] = useState('AAPL')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setSymbol(inputValue.trim().toUpperCase())
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">股票K线</h1>
          <p className="text-sm text-muted-foreground mt-1">
            输入股票代码查看K线和技术指标
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入股票代码，如 AAPL"
            className="flex-1 px-4 py-2 rounded-lg border bg-background"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>

        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">
            {symbol} - 股价走势
          </h2>
          <div className="h-[500px] w-full">
            <ChartContainer symbol={symbol} />
          </div>
        </div>
      </main>
    </div>
  )
}
