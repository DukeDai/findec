'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ValuationMetrics } from './ValuationMetrics'
import { ProfitabilityMetrics } from './ProfitabilityMetrics'
import { GrowthMetrics } from './GrowthMetrics'
import { FinancialHealth } from './FinancialHealth'
import { FundamentalData } from '@/lib/data/fundamental-data'

type TabType = 'valuation' | 'profitability' | 'growth' | 'health'

interface FundamentalsPanelProps {
  symbol: string
}

export function FundamentalsPanel({ symbol }: FundamentalsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('valuation')
  const [data, setData] = useState<FundamentalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFundamentals = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/fundamentals?symbol=${symbol}`)
      if (!response.ok) {
        throw new Error('Failed to fetch fundamental data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFundamentals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  const tabs = [
    { id: 'valuation' as TabType, label: '估值' },
    { id: 'profitability' as TabType, label: '盈利' },
    { id: 'growth' as TabType, label: '成长' },
    { id: 'health' as TabType, label: '财务健康' },
  ]

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-32 bg-muted rounded animate-pulse" />
              <div className="h-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-48 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchFundamentals}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            重试
          </button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">暂无基本面数据</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{data.name} ({data.symbol})</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              股价: ${data.price.toFixed(2)} | 市值: ${(data.marketCap / 1e9).toFixed(2)}B
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex gap-1 border-b mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'valuation' && <ValuationMetrics data={data} />}
          {activeTab === 'profitability' && <ProfitabilityMetrics data={data} />}
          {activeTab === 'growth' && <GrowthMetrics data={data} />}
          {activeTab === 'health' && <FinancialHealth data={data} />}
        </div>
      </CardContent>
    </Card>
  )
}
