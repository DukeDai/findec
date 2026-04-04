'use client'

import { MetricCard } from '@/components/ui/metric-explanation'

interface BacktestPlan {
  id: string
  name: string
  symbols: string
  startDate: string
  endDate: string
  initialCapital: number
  totalReturn?: number
  sharpeRatio?: number
  maxDrawdown?: number
}

interface BacktestTrade {
  id: string
  symbol: string
  type: string
  quantity: number
  price: number
  date: string
}

interface EquityPoint {
  date: string
  value: number
}

interface ConceptDefinition {
  name: string
  description: string
  interpretation: string
}

interface BacktestResultProps {
  selectedPlan: BacktestPlan | null
  trades: BacktestTrade[]
  equityCurve: EquityPoint[]
  plans: BacktestPlan[]
  conceptDefinitions: Record<string, ConceptDefinition>
  onSelectPlan: (plan: BacktestPlan | null) => void
  onLoadTrades: (planId: string) => void
}

export function BacktestResult({
  selectedPlan,
  trades,
  equityCurve,
  plans,
  conceptDefinitions,
  onSelectPlan,
  onLoadTrades,
}: BacktestResultProps) {
  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const planId = e.target.value
    const plan = plans.find((p) => p.id === planId) || null
    onSelectPlan(plan)
    if (plan) {
      onLoadTrades(plan.id)
    }
  }

  return (
    <>
      {plans.length > 0 && (
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={selectedPlan?.id || ''}
          onChange={handlePlanChange}
        >
          <option value="">选择回测...</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} - {p.symbols}
            </option>
          ))}
        </select>
      )}

      {selectedPlan && (
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="总收益"
            value={selectedPlan.totalReturn || 0}
            format="percent"
            change={selectedPlan.totalReturn || 0}
            concept={{
              name: '总收益',
              description: '回测期间的总收益百分比',
              interpretation: '正数表示盈利，负数表示亏损',
            }}
          />
          <MetricCard
            label="夏普比率"
            value={selectedPlan.sharpeRatio || 0}
            format="ratio"
            concept={{
              name: conceptDefinitions['夏普比率'].name,
              description: conceptDefinitions['夏普比率'].description,
              interpretation: conceptDefinitions['夏普比率'].interpretation,
            }}
          />
          <MetricCard
            label="最大回撤"
            value={selectedPlan.maxDrawdown || 0}
            format="percent"
            concept={{
              name: conceptDefinitions['最大回撤'].name,
              description: conceptDefinitions['最大回撤'].description,
              interpretation: conceptDefinitions['最大回撤'].interpretation,
            }}
          />
          <MetricCard
            label="交易次数"
            value={trades.filter((t) => t.type === 'SELL').length}
            concept={{
              name: '交易次数',
              description: '回测期间的总卖出交易次数',
              interpretation: '次数过多可能意味着过度交易，产生更多成本',
            }}
          />
        </div>
      )}

      {equityCurve.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-3">收益曲线</h3>
          <div className="h-48 flex items-end gap-px">
            {equityCurve
              .filter((_, i) => i % Math.max(1, Math.floor(equityCurve.length / 100)) === 0)
              .map((point, i) => {
                const max = Math.max(...equityCurve.map((p) => p.value))
                const min = Math.min(...equityCurve.map((p) => p.value))
                const range = max - min || 1
                const height = ((point.value - min) / range) * 100
                const isProfit = point.value > (equityCurve[0]?.value || 0)
                return (
                  <div
                    key={i}
                    className={`flex-1 ${isProfit ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ height: `${Math.max(5, height)}%` }}
                    title={`${new Date(point.date).toLocaleDateString()}: $${point.value.toFixed(2)}`}
                  />
                )
              })}
          </div>
        </div>
      )}

      {trades.length > 0 && (
        <div className="rounded-md border max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">日期</th>
                <th className="px-3 py-2 text-left">股票</th>
                <th className="px-3 py-2 text-left">方向</th>
                <th className="px-3 py-2 text-right">数量</th>
                <th className="px-3 py-2 text-right">价格</th>
                <th className="px-3 py-2 text-right">金额</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 font-medium">{t.symbol}</td>
                  <td
                    className={`px-3 py-2 ${
                      t.type === 'BUY' ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {t.type === 'BUY' ? '买入' : '卖出'}
                  </td>
                  <td className="px-3 py-2 text-right">{t.quantity}</td>
                  <td className="px-3 py-2 text-right">${t.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    ${(t.quantity * t.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
