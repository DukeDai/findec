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
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'

// ── Mock data generators ──────────────────────────────────────────────

function generateOverfittingData(paramCount: number) {
  const days = 252
  const base = 100
  const data = []

  for (let i = 0; i < days; i++) {
    const t = i / days
    const noise = (Math.random() - 0.5) * 4

    // Training: perfect curve when overfitting
    const overfitFactor = 1 - (paramCount / 30) * 0.6
    const trainReturn = base * Math.exp(t * 1.2 * overfitFactor + noise)

    // Test: degrades sharply with more params
    const testNoise = (Math.random() - 0.5) * 6
    const testReturn = base * Math.exp(t * 0.4 * overfitFactor + testNoise)

    const date = new Date(2023, 0, 1)
    date.setDate(date.getDate() + i)
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      train: Math.round(trainReturn * 100) / 100,
      test: Math.round(testReturn * 100) / 100,
    })
  }
  return data
}

function generateLookAheadData() {
  const days = 100
  const data = []
  let price = 100

  for (let i = 0; i < days; i++) {
    price = price * (1 + (Math.random() - 0.48) * 0.02)
    const date = new Date(2023, 0, 1)
    date.setDate(date.getDate() + i)
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      price: Math.round(price * 100) / 100,
      leakedSignal: Math.round((price + (Math.random() - 0.5) * 3) * 100) / 100,
      correctSignal: Math.round((price - (Math.random() - 0.5) * 2) * 100) / 100,
    })
  }
  return data
}

function generateSurvivorshipData() {
  const days = 60
  const stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'IBM']
  const failed = ['INTC', 'IBM', 'TSLA']
  const data = []

  for (let i = 0; i < days; i++) {
    const t = i / days
    const calcSurvivors = (p: number) => p * Math.exp(t * 0.8 + (Math.random() - 0.45) * 0.05)
    const calcAll = (p: number) => {
      const isFailed = failed.some(f => f === 'INTC' && i > 30 || f === 'IBM' && i > 40 || f === 'TSLA' && i > 50)
      if (isFailed) return p * 0.2 * Math.exp((Math.random() - 0.5) * 0.02)
      return p * Math.exp(t * 0.8 + (Math.random() - 0.45) * 0.05)
    }

    const date = new Date(2023, 0, 1)
    date.setDate(date.getDate() + i)
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      survivors: Math.round(stocks.slice(0, 7).reduce((s) => calcSurvivors(s) * 1, 100) / 7 * 100) / 100,
      all: Math.round(stocks.reduce((s) => calcAll(s) * 1, 100) / 10 * 100) / 100,
    })
  }
  return data
}

// ── Overfitting Demo ───────────────────────────────────────────────────

function OverfittingDemo() {
  const [paramCount, setParamCount] = useState(5)
  const data = generateOverfittingData(paramCount)

  const trainReturn = ((data[data.length - 1].train - 100) * 100 / 100).toFixed(1)
  const testReturn = ((data[data.length - 1].test - 100) * 100 / 100).toFixed(1)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">过拟合 (Overfitting)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          当策略参数过多时，策略会"记住"训练数据的噪音而非学习真正的规律。在测试集上表现会大幅下降。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">优化参数数量</label>
          <span className="text-lg font-bold text-primary">{paramCount}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={paramCount}
          onChange={e => setParamCount(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 (简单策略)</span>
          <span>20 (过度优化)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">训练集收益</p>
          <p className="text-xl font-bold text-green-600">+{trainReturn}%</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">测试集收益</p>
          <p className="text-xl font-bold text-red-600">+{testReturn}%</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={40} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="train" stroke="#22c55e" name="训练集" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="test" stroke="#ef4444" name="测试集" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>参数越多，过拟合风险越大。建议使用 Walk-Forward 分析验证策略稳健性。
        </p>
      </div>
    </div>
  )
}

// ── Look-Ahead Bias Demo ───────────────────────────────────────────────

function LookAheadBiasDemo() {
  const data = generateLookAheadData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">前视偏差 (Look-Ahead Bias)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          前视偏差指回测中无意使用了未来数据。常见原因：信号生成和数据使用的时间点不一致。
        </p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={15} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="price" stroke="#6b7280" name="真实价格" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="leakedSignal" stroke="#ef4444" name="错误信号(使用未来数据)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="correctSignal" stroke="#22c55e" name="正确信号(延迟信号)" strokeWidth={2} dot={false} />
          <ReferenceLine x="第20天" stroke="#ef4444" strokeDasharray="4 4" label={{ value: '偏差区间', fontSize: 10, fill: '#ef4444' }} />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">错误信号 (有偏差)</p>
          <p className="text-sm font-medium text-red-600">使用了未来数据</p>
          <p className="text-xs text-muted-foreground mt-1">在第20天就"看到"了第30天的价格</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">正确信号 (无偏差)</p>
          <p className="text-sm font-medium text-green-600">仅使用已知数据</p>
          <p className="text-xs text-muted-foreground mt-1">严格遵循信号生成 → 数据使用的时间顺序</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>确保因子/指标计算严格使用历史数据。因子值在 T 日只能使用 T 日及之前的数据。
        </p>
      </div>
    </div>
  )
}

// ── Survivorship Bias Demo ─────────────────────────────────────────────

function SurvivorshipBiasDemo() {
  const [view, setView] = useState<'both' | 'survivors' | 'all'>('both')
  const data = generateSurvivorshipData()

  const filteredData = data.map(d => ({
    date: d.date,
    ...(view === 'both' || view === 'survivors' ? { survivors: d.survivors } : {}),
    ...(view === 'both' || view === 'all' ? { all: d.all } : {}),
  }))

  const survivorsFinal = data[data.length - 1]?.survivors ?? 100
  const allFinal = data[data.length - 1]?.all ?? 100
  const bias = survivorsFinal - allFinal

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">生存者偏差 (Survivorship Bias)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          只看"存活"的历史股票会高估策略收益，因为退市股票(大部分亏损)被排除在外。
        </p>
      </div>

      <div className="flex gap-2">
        {(['both', 'survivors', 'all'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              view === v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            {v === 'both' ? '对比' : v === 'survivors' ? '只看存活' : '包含退市'}
          </button>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-sm">
        <p className="text-amber-800 dark:text-amber-200">
          偏差估算: <strong>+{bias.toFixed(1)}%</strong> (仅看存活股票会高估约{(bias).toFixed(1)}%的年化收益)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={10} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {view !== 'all' && <Line type="monotone" dataKey="survivors" stroke="#22c55e" name="只看存活股票" strokeWidth={2} dot={false} />}
          {view !== 'survivors' && <Line type="monotone" dataKey="all" stroke="#6b7280" name="包含退市股票" strokeWidth={2} dot={false} />}
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>回测应使用"生存者偏差-free"数据，即包含已退市股票的历史数据。可从彭博、万得等数据商获取。
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────

type Tab = 'overfitting' | 'lookahead' | 'survivorship'

export function BacktestPitfalls() {
  const [activeTab, setActiveTab] = useState<Tab>('overfitting')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overfitting', label: '过拟合' },
    { id: 'lookahead', label: '前视偏差' },
    { id: 'survivorship', label: '生存者偏差' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h2 className="text-xl font-bold">回测陷阱演示</h2>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
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
        {activeTab === 'overfitting' && <OverfittingDemo />}
        {activeTab === 'lookahead' && <LookAheadBiasDemo />}
        {activeTab === 'survivorship' && <SurvivorshipBiasDemo />}
      </div>
    </div>
  )
}
