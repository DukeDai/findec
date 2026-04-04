import { QuickQuote } from '@/components/dashboard/quick-quote'
import { StockList } from '@/components/dashboard/stock-list'
import { PortfolioRiskPanel } from '@/components/dashboard/PortfolioRiskPanel'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { prisma } from '@/lib/prisma'

async function getFirstPortfolioId(): Promise<string | null> {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      orderBy: { createdAt: 'desc' },
    })
    return portfolio?.id || null
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const portfolioId = await getFirstPortfolioId()

  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumb items={[{ label: 'Dashboard' }]} />
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <QuickQuote />
          <StockList />
        </div>

        {portfolioId && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              组合风险监控
            </h2>
            <PortfolioRiskPanel portfolioId={portfolioId} />
          </div>
        )}
      </main>
    </div>
  )
}
