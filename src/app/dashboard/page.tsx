'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/layout/Breadcrumb'
import { DashboardSettings } from '@/components/dashboard/DashboardSettings'
import { WidgetWrapper } from '@/components/dashboard/WidgetWrapper'
import {
  WidgetLayout,
  loadLayout,
  getVisibleWidgets,
  Widget,
} from '@/components/dashboard/WidgetRegistry'
import { cn } from '@/lib/utils'

interface Portfolio {
  id: string
  totalValue: number
  totalCost: number
  positions: Position[]
}

interface Position {
  id: string
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
}

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [layout, setLayout] = useState<WidgetLayout[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setLayout(loadLayout())
    fetchPortfolioData()
  }, [])

  const fetchPortfolioData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/portfolios')
      if (!response.ok) throw new Error('Failed to fetch portfolio')
      const data = await response.json()
      if (data.length > 0) {
        const portfolioWithDetails = await fetch(`/api/portfolios/${data[0].id}`)
        if (portfolioWithDetails.ok) {
          const portfolioData = await portfolioWithDetails.json()
          setPortfolio(portfolioData)
        }
      }
    } catch {
      setPortfolio(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLayoutChange = useCallback((newLayout: WidgetLayout[]) => {
    setLayout(newLayout)
  }, [])

  const visibleWidgets = getVisibleWidgets(layout)

  const renderWidget = (widget: Widget) => {
    const Component = widget.component
    const isFullWidth = widget.id === 'portfolio-overview'
    const gridCols = isFullWidth
      ? 'col-span-full'
      : widget.minWidth && widget.minWidth >= 2
        ? 'md:col-span-2'
        : 'md:col-span-1'

    const widgetProps = {
      portfolioId: portfolio?.id,
      totalValue: portfolio?.totalValue ?? 0,
      totalCost: portfolio?.totalCost ?? 0,
      positionsCount: portfolio?.positions.length ?? 0,
    }

    return (
      <div key={widget.id} className={cn('col-span-full', gridCols)}>
        <WidgetWrapper title={widget.name} description={widget.description}>
          <Component {...widgetProps} />
        </WidgetWrapper>
      </div>
    )
  }

  if (!mounted || loading) {
    return (
      <div className="flex flex-col flex-1">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader />
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <PageHeader />
          <DashboardSettings onLayoutChange={handleLayoutChange} />
        </div>

        {portfolio ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleWidgets.map(renderWidget)}
          </div>
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
