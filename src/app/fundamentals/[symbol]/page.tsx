import { notFound } from 'next/navigation'
import { FundamentalsPanel } from '@/components/fundamentals/FundamentalsPanel'

interface FundamentalsPageProps {
  params: Promise<{
    symbol: string
  }>
}

export default async function FundamentalsPage({ params }: FundamentalsPageProps) {
  const { symbol } = await params

  if (!symbol || !/^[A-Z0-9]{1,5}$/i.test(symbol)) {
    notFound()
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">基本面分析</h1>
          <p className="text-sm text-muted-foreground mt-1">
            估值指标 · 盈利能力 · 成长性 · 财务健康
          </p>
        </div>

        <FundamentalsPanel symbol={symbol.toUpperCase()} />
      </main>
    </div>
  )
}
