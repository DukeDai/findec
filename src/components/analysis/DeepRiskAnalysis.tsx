'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Activity, BarChart3, ArrowDown, ArrowUp } from 'lucide-react'

interface DrawdownEvent {
  startDate: string
  endDate: string
  drawdown: number
  duration: number
  recoveryDays: number
}

interface RiskAnalysis {
  omegaRatio: number
  skewness: number
  kurtosis: number
  historicalVaR95: number
  historicalVaR99: number
  parametricVaR95: number
  parametricVaR99: number
  drawdownAnalysis: {
    maxDrawdown: number
    maxDrawdownDuration: number
    avgDrawdownDepth: number
    avgRecoveryDays: number
    drawdownCount: number
    drawdownEvents: DrawdownEvent[]
  }
}

interface DeepRiskAnalysisProps {
  analysis: RiskAnalysis
}

function VaRComparisonCard({ analysis }: { analysis: RiskAnalysis }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">VaR 对比 (日度)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-muted-foreground">历史模拟法 VaR</span>
            <div className="mt-1 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs">95%</span>
                <span className="text-sm font-mono font-medium text-red-500">-{analysis.historicalVaR95.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs">99%</span>
                <span className="text-sm font-mono font-medium text-red-500">-{analysis.historicalVaR99.toFixed(2)}%</span>
              </div>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">参数法 VaR</span>
            <div className="mt-1 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs">95%</span>
                <span className="text-sm font-mono font-medium text-amber-500">-{analysis.parametricVaR95.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs">99%</span>
                <span className="text-sm font-mono font-medium text-amber-500">-{analysis.parametricVaR99.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          历史法更准确，参数法假设正态分布通常低估风险
        </div>
      </CardContent>
    </Card>
  )
}

function AdvancedMetricsCard({ analysis }: { analysis: RiskAnalysis }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">高级风险指标</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs">Omega 比率</span>
            </div>
            <span className={`text-sm font-mono font-medium ${analysis.omegaRatio > 1 ? 'text-green-500' : 'text-red-500'}`}>
              {analysis.omegaRatio === Infinity ? '∞' : analysis.omegaRatio.toFixed(3)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs">偏度 (Skewness)</span>
            </div>
            <span className={`text-sm font-mono ${analysis.skewness > 0 ? 'text-green-400' : analysis.skewness < 0 ? 'text-red-400' : ''}`}>
              {analysis.skewness.toFixed(3)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs">峰度 (Kurtosis)</span>
            </div>
            <span className={`text-sm font-mono ${analysis.kurtosis > 3 ? 'text-red-400' : ''}`}>
              {analysis.kurtosis.toFixed(3)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DrawdownAnalysisCard({ analysis }: { analysis: RiskAnalysis }) {
  const dd = analysis.drawdownAnalysis
  const hasEvents = dd.drawdownEvents.length > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">回撤分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-md p-2">
            <div className="text-xs text-muted-foreground">最大回撤</div>
            <div className="text-lg font-mono font-bold text-red-500">-{dd.maxDrawdown.toFixed(1)}%</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <div className="text-xs text-muted-foreground">平均深度</div>
            <div className="text-lg font-mono font-bold text-amber-500">-{dd.avgDrawdownDepth.toFixed(1)}%</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <div className="text-xs text-muted-foreground">最长持续</div>
            <div className="text-lg font-mono font-bold">{dd.maxDrawdownDuration}天</div>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <div className="text-xs text-muted-foreground">平均恢复</div>
            <div className="text-lg font-mono font-bold">{dd.avgRecoveryDays > 0 ? `${dd.avgRecoveryDays}天` : '-'}</div>
          </div>
        </div>

        {hasEvents && (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground mb-1">回撤次数: {dd.drawdownCount}</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {dd.drawdownEvents.slice(-5).reverse().map((event, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-border/50 pb-1">
                  <span className="text-muted-foreground">
                    {new Date(event.startDate).toLocaleDateString('zh-CN')}
                  </span>
                  <div className="flex items-center gap-2">
                    <ArrowDown className="h-3 w-3 text-red-400" />
                    <span className="text-red-400 font-mono">-{event.drawdown.toFixed(1)}%</span>
                    <span className="text-muted-foreground">{event.duration}天</span>
                    {event.recoveryDays > 0 && (
                      <>
                        <ArrowUp className="h-3 w-3 text-green-400" />
                        <span className="text-green-400">{event.recoveryDays}天</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DeepRiskAnalysis({ analysis }: DeepRiskAnalysisProps) {
  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          暂无详细风险数据
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AdvancedMetricsCard analysis={analysis} />
      <VaRComparisonCard analysis={analysis} />
      <DrawdownAnalysisCard analysis={analysis} />
    </div>
  )
}
