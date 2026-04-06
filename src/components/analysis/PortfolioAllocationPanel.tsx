'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'

interface Trade {
  symbol: string
  action: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
}

interface AllocationSuggestion {
  currentWeights: Record<string, number>
  suggestedWeights: Record<string, number>
  trades: Trade[]
  reason: string
  expectedImprovement?: {
    riskReduction?: number
    returnImprovement?: number
  }
}

interface PortfolioAllocationPanelProps {
  portfolioId: string
  onApplySuggestion?: (weights: Record<string, number>) => void
}

export function PortfolioAllocationPanel({
  portfolioId,
  onApplySuggestion,
}: PortfolioAllocationPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState('risk_parity')
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<AllocationSuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)

  const availableMethods = [
    { id: 'risk_parity', name: '风险平价', description: '每个资产对组合风险的贡献相等' },
    { id: 'min_variance', name: '最小方差', description: '在给定收益水平下最小化组合波动率' },
    { id: 'max_sharpe', name: '最大夏普比率', description: '优化风险调整后的收益' },
    { id: 'equal_weight', name: '等权重', description: '简单分散化，每个资产权重相同' },
  ]

  const runOptimization = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: selectedMethod }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '优化失败')
      }
      setSuggestion(data.suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化失败')
    } finally {
      setLoading(false)
    }
  }

  const chartData = suggestion
    ? Object.keys(suggestion.suggestedWeights).map(symbol => ({
        symbol,
        current: (suggestion.currentWeights[symbol] || 0) * 100,
        suggested: (suggestion.suggestedWeights[symbol] || 0) * 100,
      }))
    : []

  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1']

  if (!suggestion && !loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">组合优化</h3>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">选择优化方法</label>
          <div className="grid grid-cols-2 gap-2">
            {availableMethods.map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={cn(
                  'p-3 text-left rounded-lg border transition-colors',
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted'
                )}
              >
                <div className="font-medium text-sm">{method.name}</div>
                <div className="text-xs text-muted-foreground">{method.description}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={runOptimization}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          运行优化
        </button>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">组合优化</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (!suggestion) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">组合优化建议</h3>
        <button
          onClick={() => setSuggestion(null)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          重新选择
        </button>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-sm">{suggestion.reason}</p>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">当前权重 vs 建议权重</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="symbol" width={60} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => {
              const numValue = typeof value === 'number' ? value : 0
              return [`${numValue.toFixed(1)}%`]
            }} />
            <Legend />
            <Bar dataKey="current" name="当前" fill="#94a3b8" />
            <Bar dataKey="suggested" name="建议" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {suggestion.trades && suggestion.trades.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">调仓计划</h4>
          <div className="space-y-2">
            {suggestion.trades.map((trade, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-card rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded',
                      trade.action === 'buy'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    )}
                  >
                    {trade.action === 'buy' ? '买入' : '卖出'}
                  </span>
                  <span className="font-medium">{trade.symbol}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {trade.quantity} 股 @ ${trade.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestion.expectedImprovement && (
        <div className="grid grid-cols-2 gap-3">
          {suggestion.expectedImprovement.riskReduction !== undefined && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-xs text-muted-foreground">预计风险降低</p>
              <p className="text-xl font-bold text-green-600">
                {(suggestion.expectedImprovement.riskReduction * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {suggestion.expectedImprovement.returnImprovement !== undefined && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <p className="text-xs text-muted-foreground">预计收益提升</p>
              <p className="text-xl font-bold text-blue-600">
                {(suggestion.expectedImprovement.returnImprovement * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={runOptimization}
          className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          重新优化
        </button>
        {onApplySuggestion && (
          <button
            onClick={() => onApplySuggestion(suggestion.suggestedWeights)}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            应用建议
          </button>
        )}
      </div>
    </div>
  )
}