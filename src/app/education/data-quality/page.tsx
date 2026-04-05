'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { cn } from '@/lib/utils'

function generateDividendAdjustData() {
  const data = []
  let price = 100
  for (let i = 0; i < 30; i++) {
    const hasDividend = i === 10 || i === 20
    const dividend = hasDividend ? 2 : 0
    price = price * (1 + (Math.random() - 0.45) * 0.02) - dividend / price
    data.push({
      day: i,
      raw: Math.round(price * 100) / 100,
      adjusted: Math.round((price + (i > 10 ? 2 / (30 - 10) : 0) + (i > 20 ? 2 / (30 - 20) : 0)) * 100) / 100,
      dividend: dividend,
    })
  }
  return data
}

function generateSplitAdjustData() {
  return [
    { period: '1:2 拆股前', price: 200, adjusted: 100 },
    { period: '1:2 拆股后', price: 100, adjusted: 100 },
    { period: '3:1 合股后', price: 300, adjusted: 100 },
    { period: '后续涨跌', price: 330, adjusted: 110 },
  ]
}

function generateSurvivorshipBiasDetailData() {
  const years = ['2018', '2019', '2020', '2021', '2022', '2023']
  return years.map((year, i) => ({
    year,
    survivorsReturn: 8 + i * 2 + (Math.random() - 0.4) * 5,
    allStocksReturn: 5 + i * 1.5 + (Math.random() - 0.5) * 4,
    failedStocksReturn: -20 + (Math.random() - 0.6) * 10,
    stockCount: 3000 - i * 50,
    survivedCount: Math.round((3000 - i * 50) * (0.85 + i * 0.02)),
  }))
}

function generateDataQualityScoreData() {
  const checks = [
    { name: '价格调整', score: 95, issues: 2 },
    { name: '拆股处理', score: 100, issues: 0 },
    { name: '股息处理', score: 88, issues: 5 },
    { name: '停牌处理', score: 92, issues: 3 },
    { name: '异常值', score: 78, issues: 12 },
    { name: '数据完整性', score: 85, issues: 8 },
  ]
  return checks
}

function DividendAdjustmentDemo() {
  const data = generateDividendAdjustData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">股息调整</h3>
        <p className="text-sm text-muted-foreground">
          股息发放会导致股价自然下跌。前复权或后复权处理确保股息再投资的收益被正确计算。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">原始价格</p>
          <p className="text-sm font-bold text-amber-600">未调整</p>
          <p className="text-xs text-muted-foreground">股息导致价格跳空</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">前复权</p>
          <p className="text-sm font-bold text-green-600">常用</p>
          <p className="text-xs text-muted-foreground">向历史延伸调整</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">后复权</p>
          <p className="text-sm font-bold text-blue-600">罕见</p>
          <p className="text-xs text-muted-foreground">向未来延伸调整</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="raw" stroke="#f59e0b" name="原始价格" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="adjusted" stroke="#22c55e" name="前复权" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>实操建议：</strong>回测应使用前复权数据，保持历史收益的连续性。检查你的数据提供商是否正确处理了股息再投资。
        </p>
      </div>
    </div>
  )
}

function SplitAdjustmentDemo() {
  const data = generateSplitAdjustData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">拆股与合股</h3>
        <p className="text-sm text-muted-foreground">
          拆股(如 1:2)会将股价减半但股份数加倍。必须调整历史价格，否则会错误计算收益。
        </p>
      </div>

      <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-200">
          <strong>常见错误：</strong>如果不做调整，1:2 拆股后会显示股价从 200 跌到 100，计算出 -50% 的&quot;损失&quot;，但实际持仓数量翻倍，总价值不变。
        </p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="price" fill="#ef4444" name="公告价格" />
          <Bar dataKey="adjusted" fill="#22c55e" name="调整后价格" />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">✓ 正确处理</p>
          <p className="text-xs text-muted-foreground mt-1">调整后价格连续，收益计算正确</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">✗ 未处理</p>
          <p className="text-xs text-muted-foreground mt-1">拆股时间点出现人为&quot;亏损&quot;</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>著名案例：</strong>2020 年苹果 AAPL 1:4 拆股、特斯拉 5:1 拆股。如果使用未调整数据，回测收益会严重失真。
        </p>
      </div>
    </div>
  )
}

function SurvivorshipBiasDetailDemo() {
  const data = generateSurvivorshipBiasDetailData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">生存者偏差深度分析</h3>
        <p className="text-sm text-muted-foreground">
          即使&quot;存活&quot;的股票，每年也有 5-8% 被退市(破产/并购/私有化)。忽略这些股票会高估长期收益。
        </p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="survivorsReturn" stroke="#22c55e" name="仅存活股票" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="allStocksReturn" stroke="#6b7280" name="全部股票" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="failedStocksReturn" stroke="#ef4444" name="退市股票" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">年均偏差</p>
          <p className="text-xl font-bold text-green-600">+2.8%</p>
          <p className="text-xs text-muted-foreground">仅看存活股票高估的年化收益</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">10年累计偏差</p>
          <p className="text-xl font-bold text-red-600">+31%</p>
          <p className="text-xs text-muted-foreground">10年后累积的超额收益幻觉</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>数据来源：</strong>彭博、万得提供&quot;死亡数据&quot;(包含已退市股票)。Yahoo Finance 免费数据通常不含退市股票，这是回测偏差的重要来源。
        </p>
      </div>
    </div>
  )
}

function DataQualityCheckDemo() {
  const data = generateDataQualityScoreData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">数据质量检查清单</h3>
        <p className="text-sm text-muted-foreground">
          回测前必须验证数据质量。常见问题：异常值、缺失值、停牌期间有交易等。
        </p>
      </div>

      <div className="space-y-3">
        {data.map(d => (
          <div key={d.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{d.name}</span>
              <span className={cn(
                'font-medium',
                d.score >= 90 ? 'text-green-600' : d.score >= 80 ? 'text-amber-600' : 'text-red-600'
              )}>
                {d.score}% {d.issues > 0 && `(${d.issues} 问题)`}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  d.score >= 90 ? 'bg-green-500' : d.score >= 80 ? 'bg-amber-500' : 'bg-red-500'
                )}
                style={{ width: `${d.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>最低标准：</strong>异常值 {'>'} 1%、数据完整度 {'<'} 99% 的数据不建议用于正式回测。先做数据清洗！
        </p>
      </div>
    </div>
  )
}

function ForwardAdjustDemo() {
  const [mode, setMode] = useState<'backward' | 'forward'>('backward')

  const backwardData = [
    { date: 'Day 1', price: 100, adjusted: 90 },
    { date: 'Day 2', price: 95, adjusted: 85 },
    { date: 'Day 3', price: 90, adjusted: 80 },
    { date: 'Day 4', price: 100, adjusted: 90 },
    { date: 'Day 5', price: 110, adjusted: 100 },
  ]

  const forwardData = [
    { date: 'Day 1', price: 100, adjusted: 100 },
    { date: 'Day 2', price: 95, adjusted: 95 },
    { date: 'Day 3', price: 90, adjusted: 90 },
    { date: 'Day 4', price: 100, adjusted: 100 },
    { date: 'Day 5', price: 110, adjusted: 110 },
  ]

  const data = mode === 'backward' ? backwardData : forwardData

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">前复权 vs 后复权</h3>
        <p className="text-sm text-muted-foreground">
          两种复权方法的选择影响技术形态的视觉效果。
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode('backward')}
          className={cn(
            'px-4 py-2 text-sm rounded-full border transition-colors',
            mode === 'backward' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
          )}
        >
          前复权 (向历史调整)
        </button>
        <button
          onClick={() => setMode('forward')}
          className={cn(
            'px-4 py-2 text-sm rounded-full border transition-colors',
            mode === 'forward' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
          )}
        >
          后复权 (向未来调整)
        </button>
      </div>

      <div className={cn('rounded-lg p-3', mode === 'backward' ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-green-50 dark:bg-green-950/30')}>
        <p className="text-sm">
          {mode === 'backward'
            ? '向历史方向调整价格，保持最新价格为基准不变。技术指标(如 MA、RSI)形态最连续。'
            : '向未来方向调整价格，保持历史价格为基准不变。适合计算历史买点。'}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="price" stroke="#6b7280" name="原始" strokeWidth={1} strokeDasharray="4 4" dot={{ r: 3 }} />
          <Line type="monotone" dataKey="adjusted" stroke={mode === 'backward' ? '#3b82f6' : '#22c55e'} name="调整后" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

type Tab = 'dividend' | 'split' | 'survivorship' | 'quality' | 'adjust'

export default function DataQuality() {
  const [activeTab, setActiveTab] = useState<Tab>('dividend')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dividend', label: '股息调整' },
    { id: 'split', label: '拆股处理' },
    { id: 'survivorship', label: '生存者偏差' },
    { id: 'quality', label: '质量检查' },
    { id: 'adjust', label: '复权方式' },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h2 className="text-xl font-bold">数据质量与处理</h2>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'dividend' && <DividendAdjustmentDemo />}
        {activeTab === 'split' && <SplitAdjustmentDemo />}
        {activeTab === 'survivorship' && <SurvivorshipBiasDetailDemo />}
        {activeTab === 'quality' && <DataQualityCheckDemo />}
        {activeTab === 'adjust' && <ForwardAdjustDemo />}
      </div>
    </div>
  )
}
