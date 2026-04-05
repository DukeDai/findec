'use client'

import { SensitivityResult } from '@/lib/backtest/sensitivity-analysis'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface SensitivityChartProps {
  result: SensitivityResult
  height?: number
}

function getParameterLabel(param: string): string {
  const labels: Record<string, string> = {
    shortWindow: '短期均线周期',
    longWindow: '长期均线周期',
    rsiPeriod: 'RSI 周期',
    rsiOverbought: 'RSI 超买阈值',
    rsiOversold: 'RSI 超卖阈值',
    macdFast: 'MACD 快线',
    macdSlow: 'MACD 慢线',
    macdSignal: 'MACD 信号线',
    bollingerPeriod: '布林带周期',
    bollingerStdDev: '布林带标准差',
    momentumPeriod: '动量周期',
    momentumThreshold: '动量阈值',
    meanReversionPeriod: '均值回归周期',
    meanReversionThreshold: '均值回归阈值',
    stopLoss: '止损比例',
    takeProfit: '止盈比例',
    positionSize: '仓位比例',
  }
  return labels[param] ?? param
}

function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    totalReturn: '总收益率',
    sharpeRatio: '夏普比率',
    maxDrawdown: '最大回撤',
  }
  return labels[metric] ?? metric
}

export function SensitivityChart({ result, height = 300 }: SensitivityChartProps) {
  const chartData = result.values.map((value, index) => {
    const dataPoint: Record<string, number> = { value }
    result.metricValues.forEach(metric => {
      dataPoint[metric.metric] = metric.values[index]
    })
    return dataPoint
  })

  const colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6']

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">
        {getParameterLabel(result.parameter)} 敏感性分析
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="value"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => v.toFixed(0)}
            label={{
              value: getParameterLabel(result.parameter),
              position: 'insideBottom',
              offset: -2,
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            width={60}
            tickFormatter={(v: number) => {
              const metric = result.metricValues[0]?.metric
              if (metric === 'totalReturn' || metric === 'maxDrawdown') {
                return `${v.toFixed(1)}%`
              }
              return v.toFixed(2)
            }}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) => {
              const value = typeof v === 'number' ? v : 0
              const metricKey = String(name)
              const metricName = getMetricLabel(metricKey)
              if (metricKey === 'totalReturn' || metricKey === 'maxDrawdown') {
                return [`${value.toFixed(2)}%`, metricName]
              }
              return [value.toFixed(3), metricName]
            }}
            labelFormatter={(v: unknown) => `${getParameterLabel(result.parameter)}: ${v}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend
            formatter={(value: string) => getMetricLabel(value)}
            wrapperStyle={{ fontSize: 12 }}
          />
          {result.metricValues.map((metric, index) => (
            <Line
              key={metric.metric}
              type="monotone"
              dataKey={metric.metric}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[index % colors.length] }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {result.metricValues.map(metric => {
          const values = metric.values
          const max = Math.max(...values)
          const min = Math.min(...values)
          const avg = values.reduce((a, b) => a + b, 0) / values.length

          return (
            <div key={metric.metric} className="bg-muted rounded p-2">
              <div className="font-medium">{getMetricLabel(metric.metric)}</div>
              <div className="text-muted-foreground mt-1">
                最高: {metric.metric === 'totalReturn' || metric.metric === 'maxDrawdown'
                  ? `${max.toFixed(2)}%`
                  : max.toFixed(3)}
              </div>
              <div className="text-muted-foreground">
                最低: {metric.metric === 'totalReturn' || metric.metric === 'maxDrawdown'
                  ? `${min.toFixed(2)}%`
                  : min.toFixed(3)}
              </div>
              <div className="text-muted-foreground">
                平均: {metric.metric === 'totalReturn' || metric.metric === 'maxDrawdown'
                  ? `${avg.toFixed(2)}%`
                  : avg.toFixed(3)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
