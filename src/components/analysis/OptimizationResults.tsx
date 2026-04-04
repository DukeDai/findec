"use client"

import { useState } from 'react'

interface OptimizationResult {
  params: Record<string, number>
  metrics: {
    totalReturn: number
    sharpeRatio: number
    maxDrawdown: number
  }
  rank: number
}

interface OptimizationResultsProps {
  results: OptimizationResult[]
  onSelectBest: () => void
}

export function OptimizationResults({ results, onSelectBest }: OptimizationResultsProps) {
  const [sortBy, setSortBy] = useState<'sharpeRatio' | 'totalReturn' | 'maxDrawdown'>('sharpeRatio')
  const [showTop, setShowTop] = useState(10)

  const sorted = [...results].sort((a, b) => {
    const aVal = a.metrics[sortBy]
    const bVal = b.metrics[sortBy]
    return sortBy === 'maxDrawdown' ? aVal - bVal : bVal - aVal
  }).slice(0, showTop)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">参数优化结果</h3>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="sharpeRatio">按夏普比率</option>
            <option value="totalReturn">按总收益</option>
            <option value="maxDrawdown">按最大回撤</option>
          </select>
          <select
            value={showTop}
            onChange={(e) => setShowTop(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={5}>前5</option>
            <option value={10}>前10</option>
            <option value={20}>前20</option>
            <option value={50}>前50</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">参数</th>
              <th className="px-4 py-2 text-right">收益</th>
              <th className="px-4 py-2 text-right">夏普</th>
              <th className="px-4 py-2 text-right">回撤</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((result, idx) => (
              <tr
                key={idx}
                className={`hover:bg-muted/50 cursor-pointer ${
                  idx === 0 ? 'bg-primary/5 font-medium' : ''
                }`}
                onClick={onSelectBest}
              >
                <td className="px-4 py-2">{result.rank}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {Object.entries(result.params).map(([k, v]) => `${k}:${v}`).join(', ')}
                </td>
                <td className={`px-4 py-2 text-right ${
                  result.metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {result.metrics.totalReturn.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-right">
                  {result.metrics.sharpeRatio.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right text-red-500">
                  {result.metrics.maxDrawdown.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
