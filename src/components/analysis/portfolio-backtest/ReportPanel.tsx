'use client'

import { useState } from 'react'
import { BacktestPlan, BacktestReport, Trade } from './types'
import { BacktestChart } from '../BacktestChart'
import { RiskMetricsCard } from '../RiskMetricsCard'
import { BenchmarkMetricsCard } from '../BenchmarkMetricsCard'
import { TradeLog } from '../TradeLog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'

interface ReportPanelProps {
  selectedPlan: BacktestPlan | null
  report: BacktestReport | null
  executing: boolean
  onExecuteBacktest: (planId: string) => void
}

export function ReportPanel({
  selectedPlan,
  report,
  executing,
  onExecuteBacktest,
}: ReportPanelProps) {
  if (!selectedPlan) {
    return null
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {selectedPlan.status === 'pending' ? (
          <div className="text-center">
            <p className="mb-2">此回测计划尚未执行</p>
            <Button onClick={() => onExecuteBacktest(selectedPlan.id)} disabled={executing}>
              {executing ? '执行中...' : '立即执行'}
            </Button>
          </div>
        ) : selectedPlan.status === 'running' ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>回测运行中，请稍候...</span>
          </div>
        ) : (
          <p>报告加载中...</p>
        )}
      </div>
    )
  }

  const equityCurveData = report.equityCurve.map((p) => ({
    date: new Date(p.date),
    value: p.value,
  }))

  const trades: Trade[] = report.trades.map((t) => ({
    ...t,
    type: t.type as 'BUY' | 'SELL',
  }))

  const benchmarkData = report.benchmarkResult
    ? report.benchmarkResult.benchmarkEquityCurve.map((p) => ({
        date: new Date(p.date),
        value: p.value,
      }))
    : undefined

  const hasBenchmark = !!report.benchmarkResult

  return (
    <div className="space-y-4">
      <RiskMetricsCard
        metrics={report.summary}
        period={{ start: new Date(selectedPlan.startDate), end: new Date(selectedPlan.endDate) }}
      />

      <Tabs defaultValue="chart">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chart">收益曲线</TabsTrigger>
          <TabsTrigger value="benchmark" disabled={!hasBenchmark}>
            基准对比 {hasBenchmark ? `(${report.benchmark || 'SPY'})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">策略收益曲线</CardTitle>
            </CardHeader>
            <CardContent>
              <BacktestChart
                equityCurve={equityCurveData}
                trades={trades}
                height={400}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmark">
          {hasBenchmark ? (
            <div className="space-y-4">
              <BenchmarkMetricsCard
                benchmarkResult={report.benchmarkResult!}
                benchmarkSymbol={report.benchmark || 'SPY'}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">基准对比曲线</CardTitle>
                </CardHeader>
                <CardContent>
                  <BacktestChart
                    equityCurve={equityCurveData}
                    benchmark={benchmarkData}
                    trades={trades}
                    height={400}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>未选择基准对比</p>
                <p className="text-sm mt-1">创建回测计划时可选择 SPY 或 QQQ 作为基准</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">交易日志</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeLog trades={trades} pageSize={50} />
        </CardContent>
      </Card>
    </div>
  )
}
