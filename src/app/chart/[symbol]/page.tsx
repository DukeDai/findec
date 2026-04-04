'use client'

import { use } from 'react'
import { ChartContainer } from '@/components/chart/ChartContainer'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function ChartPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params)

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumb
          items={[
            { label: 'K线图', href: '/' },
            { label: symbol.toUpperCase() }
          ]}
        />
      </div>

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
