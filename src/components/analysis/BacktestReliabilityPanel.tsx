'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, AlertTriangle, XCircle, Lightbulb } from 'lucide-react'
import type { ReliabilityScore, ReliabilityIssue, TradeData } from '@/lib/backtest/reliability-scorer'
import type { EquityPoint } from '@/lib/backtest/risk-metrics'
import type { BacktestConfig } from '@/lib/backtest/engine'

interface BacktestReliabilityPanelProps {
  trades?: TradeData[]
  equityCurve?: EquityPoint[]
  config?: BacktestConfig
  planId?: string
}

export function BacktestReliabilityPanel({
  trades,
  equityCurve,
  config,
  planId,
}: BacktestReliabilityPanelProps) {
  const [score, setScore] = useState<ReliabilityScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReliability = async () => {
      if (!trades || !equityCurve || !config) {
        if (planId) {
          setLoading(true)
          try {
            const res = await fetch(`/api/backtests/${planId}`)
            if (!res.ok) throw new Error('获取回测数据失败')
            const data = await res.json()
            calculateAndSetScore(data.trades || [], data.equityCurve || [], data.config)
          } catch (err) {
            setError(err instanceof Error ? err.message : '加载失败')
          } finally {
            setLoading(false)
          }
        }
        return
      }

      calculateAndSetScore(trades, equityCurve, config)
    }

    const calculateAndSetScore = async (
      t: TradeData[],
      e: EquityPoint[],
      c: BacktestConfig
    ) => {
      setLoading(true)
      try {
        const res = await fetch('/api/backtests/reliability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trades: t, equityCurve: e, config: c }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || '计算失败')
        }

        const data = await res.json()
        setScore(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '计算失败')
      } finally {
        setLoading(false)
      }
    }

    fetchReliability()
  }, [trades, equityCurve, config, planId])

  const getScoreColor = (value: number): string => {
    if (value >= 80) return 'text-green-500'
    if (value >= 60) return 'text-yellow-500'
    if (value >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreBgColor = (value: number): string => {
    if (value >= 80) return 'bg-green-500'
    if (value >= 60) return 'bg-yellow-500'
    if (value >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getScoreRingColor = (value: number): string => {
    if (value >= 80) return 'stroke-green-500'
    if (value >= 60) return 'stroke-yellow-500'
    if (value >= 40) return 'stroke-orange-500'
    return 'stroke-red-500'
  }

  const getSeverityIcon = (severity: ReliabilityIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <AlertCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: ReliabilityIssue['severity']): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const getSeverityLabel = (severity: ReliabilityIssue['severity']): string => {
    switch (severity) {
      case 'critical':
        return '严重'
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">正在计算可靠性评分...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-48 text-red-500">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!score) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            暂无回测数据
          </div>
        </CardContent>
      </Card>
    )
  }

  const circumference = 2 * Math.PI * 40
  const strokeDashoffset = circumference - (score.total / 100) * circumference

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">可靠性评分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={getScoreRingColor(score.total)}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                    transition: 'stroke-dashoffset 0.5s ease',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(score.total)}`}>
                  {score.total}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <ScoreBar label="样本量" value={score.sampleSize} />
              <ScoreBar label="过拟合风险" value={score.overfittingRisk} />
              <ScoreBar label="数据质量" value={score.dataQuality} />
              <ScoreBar label="稳定性" value={score.stability} />
            </div>
          </div>
        </CardContent>
      </Card>

      {score.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              发现的问题
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {score.issues.map((issue, index) => (
                <div
                  key={`${issue.code}-${index}`}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}
                >
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getSeverityLabel(issue.severity)}
                      </Badge>
                      <span className="text-xs font-mono opacity-70">{issue.code}</span>
                    </div>
                    <p className="text-sm mt-1">{issue.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {score.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              改进建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {score.suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2 p-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-sm">{suggestion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface ScoreBarProps {
  label: string
  value: number
}

function ScoreBar({ label, value }: ScoreBarProps) {
  const getColor = (v: number): string => {
    if (v >= 80) return 'bg-green-500'
    if (v >= 60) return 'bg-yellow-500'
    if (v >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
