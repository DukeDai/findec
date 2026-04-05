'use client'

import { useState, useEffect } from 'react'
import { WidgetWrapper } from '../WidgetWrapper'
import { WidgetProps } from '../WidgetRegistry'
import { cn } from '@/lib/utils'

interface PortfolioHealthScore {
  total: number
  concentration: { score: number; topHoldingWeight: number; top5Weight: number }
  volatility: { score: number; portfolioVol: number }
  correlation: { score: number; avgCorrelation: number }
  liquidity: { score: number; avgVolume: number }
  riskAdjustedReturn: { score: number; sharpeRatio: number }
  breakdown: string
  suggestions: string[]
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" className="transform -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">健康度</span>
      </div>
    </div>
  )
}

interface ScoreBarProps {
  label: string
  score: number
  detail?: string
}

function ScoreBar({ label, score, detail }: ScoreBarProps) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

export function PortfolioHealthWidget({ portfolioId, className }: WidgetProps) {
  const [score, setScore] = useState<PortfolioHealthScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!portfolioId) {
      setLoading(false)
      setError('请先选择组合')
      return
    }

    const fetchScore = async () => {
      try {
        const response = await fetch(`/api/portfolios/${portfolioId}/health`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '获取健康度失败')
        }
        setScore(await response.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取健康度失败')
      } finally {
        setLoading(false)
      }
    }

    fetchScore()
  }, [portfolioId])

  return (
    <WidgetWrapper title="组合健康度" description="0-100 综合评分" className={className}>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : error || !score ? (
        <div className="text-center py-8 text-muted-foreground text-sm">{error || '数据不足'}</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <ScoreRing score={score.total} />
            <div className="flex-1 space-y-2">
              <ScoreBar
                label="集中度"
                score={score.concentration.score}
                detail={`第一大持仓 ${score.concentration.topHoldingWeight.toFixed(1)}%`}
              />
              <ScoreBar
                label="波动率"
                score={score.volatility.score}
                detail={`年化波动率 ${(score.volatility.portfolioVol * 100).toFixed(1)}%`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ScoreBar label="相关性" score={score.correlation.score} />
            <ScoreBar label="流动性" score={score.liquidity.score} />
            <ScoreBar
              label="风险收益"
              score={score.riskAdjustedReturn.score}
              detail={`夏普 ${score.riskAdjustedReturn.sharpeRatio.toFixed(2)}`}
            />
          </div>
          {score.suggestions.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-1">改善建议</p>
              <ul className="space-y-1">
                {score.suggestions.map((s, i) => (
                  <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex gap-1">
                    <span>•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </WidgetWrapper>
  )
}
