'use client'

import type { WidgetProps } from '../WidgetRegistry'

interface PortfolioOverviewWidgetProps extends WidgetProps {
  totalValue: number
  totalCost: number
  positionsCount: number
}

export function PortfolioOverviewWidget({
  totalValue,
  totalCost,
  positionsCount,
}: PortfolioOverviewWidgetProps) {
  const profitLoss = totalValue - totalCost
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0
  const isPositive = profitLoss >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="总市值"
        value={`$${totalValue.toFixed(2)}`}
      />
      <StatCard
        label="总成本"
        value={`$${totalCost.toFixed(2)}`}
      />
      <StatCard
        label="盈亏"
        value={`$${profitLoss.toFixed(2)}`}
        change={`${isPositive ? '+' : ''}${profitLossPercent.toFixed(2)}%`}
        isPositive={isPositive}
      />
      <StatCard
        label="持仓数"
        value={positionsCount.toString()}
      />
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  change?: string
  isPositive?: boolean
}

function StatCard({ label, value, change, isPositive }: StatCardProps) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {change && (
        <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </p>
      )}
    </div>
  )
}
