import { QuickQuote } from '@/components/dashboard/quick-quote'
import { StockList } from '@/components/dashboard/stock-list'
import { PortfolioRiskPanel } from '@/components/dashboard/PortfolioRiskPanel'
import { PageHeader } from '@/components/layout/Breadcrumb'
import { prisma } from '@/lib/prisma'

async function getPortfolioData() {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        positions: true,
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })
    return portfolio
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const portfolio = await getPortfolioData()

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader />

        {portfolio ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="总市值" value={`$${portfolio.totalValue.toFixed(2)}`} />
              <StatCard label="总成本" value={`$${portfolio.totalCost.toFixed(2)}`} />
              <StatCard 
                label="盈亏" 
                value={`$${(portfolio.totalValue - portfolio.totalCost).toFixed(2)}`}
                change={((portfolio.totalValue - portfolio.totalCost) / portfolio.totalCost * 100).toFixed(2) + '%'}
              />
              <StatCard label="持仓数" value={portfolio.positions.length.toString()} />
            </div>

            {portfolio.positions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">当前持仓</h2>
                <div className="bg-card rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">股票</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">数量</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">均价</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">现价</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">市值</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">盈亏</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {portfolio.positions.map((pos) => (
                        <tr key={pos.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 font-medium">{pos.symbol}</td>
                          <td className="px-4 py-3 text-right">{pos.quantity}</td>
                          <td className="px-4 py-3 text-right">${pos.avgCost.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">${pos.currentPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            ${(pos.quantity * pos.currentPrice).toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-right ${
                            (pos.quantity * pos.currentPrice - pos.quantity * pos.avgCost) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            ${(pos.quantity * pos.currentPrice - pos.quantity * pos.avgCost).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">风险监控</h2>
              <PortfolioRiskPanel portfolioId={portfolio.id} />
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">暂无投资组合</p>
            <p className="text-sm">前往「量化分析」→「组合分析」创建组合</p>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {change && (
        <p className={`text-sm ${change.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
          {change}
        </p>
      )}
    </div>
  )
}
