"use client"

import { useMemo } from 'react'

interface StrategyComparisonProps {
  strategies: {
    name: string
    color: string
    metrics: {
      totalReturn: number
      sharpeRatio: number
      maxDrawdown: number
      winRate: number
    }
    equityCurve?: number[]
  }[]
}

export function StrategyComparison({ strategies }: StrategyComparisonProps) {
  const maxReturn = useMemo(() =>
    Math.max(...strategies.map(s => s.metrics.totalReturn)),
    [strategies]
  )

  const maxDrawdown = useMemo(() =>
    Math.min(...strategies.map(s => s.metrics.maxDrawdown)),
    [strategies]
  )

  const maxSharpe = useMemo(() =>
    Math.max(...strategies.map(s => s.metrics.sharpeRatio)),
    [strategies]
  )

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">策略</th>
              <th className="px-4 py-3 text-right">总收益</th>
              <th className="px-4 py-3 text-right">夏普比率</th>
              <th className="px-4 py-3 text-right">最大回撤</th>
              <th className="px-4 py-3 text-right">胜率</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {strategies.map((strategy) => (
              <tr key={strategy.name} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: strategy.color }}
                    />
                    <span className="font-medium">{strategy.name}</span>
                  </div>
                </td>
                <td className={`px-4 py-3 text-right ${
                  strategy.metrics.totalReturn === maxReturn ? 'font-bold' : ''
                }`}>
                  <span className={strategy.metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {strategy.metrics.totalReturn.toFixed(2)}%
                  </span>
                </td>
                <td className={`px-4 py-3 text-right ${
                  strategy.metrics.sharpeRatio === maxSharpe ? 'font-bold' : ''
                }`}>
                  {strategy.metrics.sharpeRatio.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right ${
                  strategy.metrics.maxDrawdown === maxDrawdown ? 'font-bold' : ''
                }`}>
                  <span className="text-red-500">
                    {strategy.metrics.maxDrawdown.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {strategy.metrics.winRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {strategies.some(s => s.equityCurve) && (
        <div className="h-64 relative">
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            权益曲线对比图 (需要 lightweight-charts 集成)
          </div>
        </div>
      )}
    </div>
  )
}
