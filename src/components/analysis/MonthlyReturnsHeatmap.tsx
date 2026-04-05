'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface MonthlyReturnsHeatmapProps {
  equityCurve: { date: Date; value: number }[]
  height?: number
}

interface MonthCell {
  year: number
  month: number
  monthLabel: string
  returnPct: number | null
}

function getMonthLabel(month: number) {
  return ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'][month]
}

function getColor(value: number | null): string {
  if (value === null) return 'bg-gray-100 dark:bg-gray-800'
  if (value > 20) return 'bg-green-700'
  if (value > 10) return 'bg-green-500'
  if (value > 5) return 'bg-green-400'
  if (value > 0) return 'bg-green-200 dark:bg-green-900'
  if (value > -5) return 'bg-red-100 dark:bg-red-900'
  if (value > -10) return 'bg-red-300 dark:bg-red-700'
  if (value > -20) return 'bg-red-500 dark:bg-red-500'
  return 'bg-red-700'
}

export function MonthlyReturnsHeatmap({ equityCurve, height = 220 }: MonthlyReturnsHeatmapProps) {
  const { grid, years } = useMemo(() => {
    if (equityCurve.length === 0) return { grid: [], years: [] }

    const monthly: Map<string, { start: number; end: number }> = new Map()

    for (const point of equityCurve) {
      const d = new Date(point.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const existing = monthly.get(key)
      if (existing) {
        existing.end = point.value
      } else {
        monthly.set(key, { start: point.value, end: point.value })
      }
    }

    const cells: MonthCell[] = []
    for (const [key, vals] of monthly) {
      const [yearStr, monthStr] = key.split('-')
      const year = parseInt(yearStr)
      const month = parseInt(monthStr) - 1
      const ret = vals.start > 0 ? ((vals.end - vals.start) / vals.start) * 100 : null
      cells.push({ year, month, monthLabel: getMonthLabel(month), returnPct: ret })
    }

    const yearSet = new Set(cells.map(c => c.year))
    const sortedYears = Array.from(yearSet).sort((a, b) => a - b)

    return { grid: cells, years: sortedYears }
  }, [equityCurve])

  if (grid.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        无数据
      </div>
    )
  }

  const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  return (
    <div className="space-y-2">
      <div className="flex gap-1 pl-12">
        {monthLabels.map(m => (
          <div key={m} className="text-[10px] text-gray-400 w-8 text-center">{m}</div>
        ))}
      </div>
      {years.map(year => (
        <div key={year} className="flex items-center gap-1">
          <div className="text-[10px] text-gray-400 w-10 text-right">{year}</div>
          {Array.from({ length: 12 }, (_, month) => {
            const cell = grid.find(c => c.year === year && c.month === month)
            return (
              <div
                key={month}
                title={cell ? `${year}年${getMonthLabel(month)}: ${cell.returnPct !== null ? cell.returnPct.toFixed(2) + '%' : 'N/A'}` : `${year}年${getMonthLabel(month)}`}
                className={cn(
                  'w-8 h-6 rounded-sm cursor-default transition-opacity hover:opacity-80',
                  getColor(cell?.returnPct ?? null)
                )}
              />
            )
          })}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
        <span>-20%</span>
        <div className="flex gap-0.5">
          {['bg-red-700', 'bg-red-500', 'bg-red-300', 'bg-red-100 dark:bg-red-900', 'bg-green-200 dark:bg-green-900', 'bg-green-400', 'bg-green-500', 'bg-green-700'].map((c, i) => (
            <div key={i} className={cn('w-4 h-3 rounded-sm', c)} />
          ))}
        </div>
        <span>+20%</span>
      </div>
    </div>
  )
}
