'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ChartContainer } from '@/components/chart/ChartContainer'

export default function ChartPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params)

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回K线图
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            {symbol.toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            K线图分析
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="h-[500px] w-full">
            <ChartContainer symbol={symbol.toUpperCase()} />
          </div>
        </div>
      </main>
    </div>
  )
}
