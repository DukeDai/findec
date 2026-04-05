'use client'

import { PortfolioRiskPanel } from '../PortfolioRiskPanel'
import type { WidgetProps } from '../WidgetRegistry'

export function RiskMetricsWidget({ portfolioId }: WidgetProps) {
  if (!portfolioId) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>暂无组合数据</p>
      </div>
    )
  }

  return <PortfolioRiskPanel portfolioId={portfolioId} />
}
