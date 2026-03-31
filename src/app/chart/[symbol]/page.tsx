'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChartContainer } from '@/components/chart/ChartContainer'

export default function ChartPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params)

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <header className="bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {symbol.toUpperCase()}
            </h1>
            <p className="text-zinc-500 mt-1">K线图分析</p>
          </div>
          <nav className="flex gap-2">
            <Link href="/">
              <Button variant="outline">首页</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="h-[500px] w-full">
            <ChartContainer symbol={symbol.toUpperCase()} />
          </div>
        </div>
      </main>
    </div>
  )
}
