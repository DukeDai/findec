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
  ComposedChart,
  Area,
} from 'recharts'
import { cn } from '@/lib/utils'

// ── Mock data generators ──────────────────────────────────────────────

function generateSignalFlowData() {
  const steps = ['数据采集', '因子设计', '信号生成', '回测验证', '实盘监控']
  const progress = [20, 40, 60, 80, 100]
  const quality = [95, 88, 75, 82, 70]
  return steps.map((step, i) => ({ step, progress: progress[i], quality: quality[i] }))
}

function generateDenoiseData(smoothingWindow: number) {
  const days = 60
  const data = []
  let base = 100

  for (let i = 0; i < days; i++) {
    const trend = i * 0.3
    const noise = (Math.random() - 0.5) * 8
    const cycle = Math.sin(i / 5) * 3
    const raw = base + trend + noise + cycle
    const ma = calculateMA(raw, i, smoothingWindow)
    const ema = calculateEMA(data, raw, smoothingWindow)

    const date = new Date(2023, 0, 1)
    date.setDate(date.getDate() + i)
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      raw: Math.round(raw * 100) / 100,
      ma: Math.round(ma * 100) / 100,
      ema: Math.round(ema * 100) / 100,
    })
  }
  return data
}

function calculateMA(val: number, _idx: number, _window: number): number {
  return val
}

function calculateEMA(prevData: { raw: number; ema: number }[], val: number, window: number): number {
  const k = 2 / (window + 1)
  if (prevData.length === 0) return val
  const prevEma = prevData[prevData.length - 1]?.ema ?? val
  return prevEma + k * (val - prevEma)
}

function generateEventData() {
  const data = []
  const events = [
    { day: 15, label: '财报发布', impact: 5 },
    { day: 30, label: '加息公告', impact: -4 },
    { day: 45, label: '政策利好', impact: 6 },
  ]

  for (let i = 0; i < 60; i++) {
    const trend = i * 0.2
    let eventBoost = 0
    events.forEach(e => {
      if (i >= e.day && i < e.day + 3) eventBoost += e.impact * (1 - (i - e.day) * 0.3)
    })
    const noise = (Math.random() - 0.5) * 3
    const price = 100 + trend + eventBoost + noise

    const date = new Date(2023, 0, 1)
    date.setDate(date.getDate() + i)
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      price: Math.round(price * 100) / 100,
      event: events.some(e => e.day === i) ? events.find(e => e.day === i)?.impact : null,
    })
  }
  return { data, events }
}

function generateFailureData() {
  const reasons = ['容量饱和', '市场结构变化', '竞争加剧', '流动性枯竭', '监管政策', '因子拥挤']
  const losses = [85, 72, 68, 55, 45, 38]
  const duration = [30, 45, 60, 20, 90, 15]
  return reasons.map((r, i) => ({ reason: r, lossRate: losses[i], recoveryDays: duration[i] }))
}

function generateIterationData() {
  const iterations = ['V1.0', 'V1.1', 'V1.2', 'V2.0', 'V2.1', 'V3.0']
  const returns = [3.2, 4.8, 5.1, 7.3, 8.2, 9.5]
  const sharpe = [0.8, 1.2, 1.3, 1.8, 2.1, 2.4]
  const drawdown = [-12, -9, -8, -6, -5, -4]
  return iterations.map((v, i) => ({
    version: v,
    annualReturn: returns[i],
    sharpeRatio: sharpe[i],
    maxDrawdown: drawdown[i],
  }))
}

// ── Signal Flow Demo ─────────────────────────────────────────────────

function SignalFlowDemo() {
  const steps = generateSignalFlowData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">假设驱动的研究流程</h3>
        <p className="text-sm text-muted-foreground mb-4">
          信号构建是从想法到策略的核心过程。遵循严谨的研究流程可以提高策略开发的效率和成功率。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">研究进度</span>
          <span className="text-xs font-medium">置信度</span>
        </div>
        {steps.map((step, i) => (
          <div key={step.step} className="flex items-center gap-3 mb-3 last:mb-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
              i === 0 ? 'bg-blue-500 text-white' :
              i === steps.length - 1 ? 'bg-green-500 text-white' : 'bg-primary/20 text-primary'
            )}>
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{step.step}</span>
                <span className="text-xs text-muted-foreground">{step.quality}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${step.progress}%` }}
                />
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="absolute left-5 top-10 w-0.5 h-3 bg-border -translate-x-1/2" style={{ marginLeft: '1rem' }} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">关键环节</p>
          <p className="text-sm font-medium text-blue-600">信号生成</p>
          <p className="text-xs text-muted-foreground mt-1">将假设转化为可执行的数值信号</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">质量把控</p>
          <p className="text-sm font-medium text-green-600">回测验证</p>
          <p className="text-xs text-muted-foreground mt-1">通过历史数据验证策略有效性</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>信号构建应从明确的投资假设出发，而非数据挖掘。每一步都应有清晰的逻辑支撑。
        </p>
      </div>
    </div>
  )
}

// ── Signal Denoising Demo ─────────────────────────────────────────────

function DenoisingDemo() {
  const [smoothingWindow, setSmoothingWindow] = useState(5)
  const data = generateDenoiseData(smoothingWindow)

  const latestRaw = data[data.length - 1]?.raw ?? 0
  const latestMA = data[data.length - 1]?.ma ?? 0
  const latestEMA = data[data.length - 1]?.ema ?? 0
  const smoothness = Math.min(100, Math.round((smoothingWindow / 20) * 100))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">信号去噪与平滑</h3>
        <p className="text-sm text-muted-foreground mb-4">
          原始信号往往包含大量噪音。通过移动平均(MA)或指数移动平均(EMA)可以有效平滑信号，突出趋势。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">平滑窗口</label>
          <span className="text-lg font-bold text-primary">{smoothingWindow}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={smoothingWindow}
          onChange={e => setSmoothingWindow(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 (低平滑)</span>
          <span>20 (高平滑)</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 dark:bg-gray-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">原始信号</p>
          <p className="text-lg font-bold text-gray-600">{latestRaw.toFixed(1)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">MA平滑</p>
          <p className="text-lg font-bold text-blue-600">{latestMA.toFixed(1)}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">EMA平滑</p>
          <p className="text-lg font-bold text-green-600">{latestEMA.toFixed(1)}</p>
        </div>
      </div>

      <div className="h-6 bg-muted/50 rounded-md flex items-center px-2">
        <span className="text-xs text-muted-foreground mr-2">平滑度:</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full"
            style={{ width: `${smoothness}%` }}
          />
        </div>
        <span className="text-xs font-medium ml-2">{smoothness}%</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={10} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="raw" stroke="#9ca3af" name="原始信号" strokeWidth={1} dot={false} strokeDasharray="3 3" />
          <Line type="monotone" dataKey="ma" stroke="#3b82f6" name="MA" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ema" stroke="#22c55e" name="EMA" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>MA 对窗口内数据等权平均，EMA 更重视近期数据、响应更快。选择窗口需平衡噪音抑制与信号延迟。
        </p>
      </div>
    </div>
  )
}

// ── Event-Driven Strategy Demo ─────────────────────────────────────────

function EventDrivenDemo() {
  const { data, events } = generateEventData()

  const chartData = data.map(d => ({
    ...d,
    eventLabel: events.find(e => e.day === data.indexOf(d))?.label ?? '',
  }))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">事件驱动策略</h3>
        <p className="text-sm text-muted-foreground mb-4">
          事件驱动策略利用特定事件(财报、并购、政策)对股价的影响来获取超额收益。
        </p>
      </div>

      <div className="flex gap-2">
        {events.map(e => (
          <div key={e.day} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs">
            <span className={cn('w-2 h-2 rounded-full', e.impact > 0 ? 'bg-green-500' : 'bg-red-500')} />
            <span>{e.label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={10} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="price" fill="#3b82f6" fillOpacity={0.1} name="价格" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Bar dataKey="event" fill="#f59e0b" name="事件冲击" />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">利好事件</p>
          <p className="text-sm font-medium text-green-600">财报超预期、政策利好</p>
          <p className="text-xs text-muted-foreground mt-1">正向冲击，价格上涨</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">利空事件</p>
          <p className="text-sm font-medium text-red-600">业绩下滑、加息预期</p>
          <p className="text-xs text-muted-foreground mt-1">负向冲击，价格下跌</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>事件驱动策略需关注事件发生的时间窗口和影响持续期。警惕&quot;买预期，卖事实&quot;的反转效应。
        </p>
      </div>
    </div>
  )
}

// ── Strategy Failure Modes Demo ───────────────────────────────────────

function FailureModesDemo() {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const data = generateFailureData()
  const selected = data.find(d => d.reason === selectedReason)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">策略失效模式</h3>
        <p className="text-sm text-muted-foreground mb-4">
          即使有效的策略也可能随时间失效。了解常见失效原因有助于及时调整策略。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.map(d => (
          <button
            key={d.reason}
            onClick={() => setSelectedReason(selectedReason === d.reason ? null : d.reason)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              selectedReason === d.reason
                ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                : 'border-border hover:bg-muted'
            )}
          >
            {d.reason}
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-red-700 dark:text-red-300">{selected.reason}</span>
            <span className="text-xs text-red-600 dark:text-red-400">平均收益损失 {selected.lossRate}%</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">
            平均恢复周期: <strong>{selected.recoveryDays}天</strong>
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} />
          <YAxis type="category" dataKey="reason" tick={{ fontSize: 10 }} width={60} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="lossRate" fill="#ef4444" name="收益损失(%)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>因子拥挤是最隐蔽的失效原因。当使用同一因子的资金量过大时，超额收益会被套利消除。
        </p>
      </div>
    </div>
  )
}

// ── Strategy Iteration Demo ───────────────────────────────────────────

function IterationDemo() {
  const [showMetric, setShowMetric] = useState<'return' | 'sharpe'>('return')
  const data = generateIterationData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">策略迭代优化</h3>
        <p className="text-sm text-muted-foreground mb-4">
          策略需要持续迭代优化。通过版本对比，观察关键指标如何随优化而提升。
        </p>
      </div>

      <div className="flex gap-2">
        {([
          { id: 'return', label: '年化收益' },
          { id: 'sharpe', label: '夏普比率' },
        ] as const).map(m => (
          <button
            key={m.id}
            onClick={() => setShowMetric(m.id)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              showMetric === m.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="version" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={showMetric === 'return' ? [0, 12] : [0, 3]} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {showMetric === 'return' ? (
            <Bar dataKey="annualReturn" fill="#3b82f6" name="年化收益(%)" radius={[4, 4, 0, 0]} />
          ) : (
            <Bar dataKey="sharpeRatio" fill="#22c55e" name="夏普比率" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-3">
        {data.slice(-3).map(d => (
          <div key={d.version} className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">{d.version}</p>
            <p className="text-sm font-bold text-primary">{d.annualReturn}%</p>
            <p className="text-xs text-muted-foreground">夏普 {d.sharpeRatio}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>每次迭代应有明确的优化目标(V1.0→V2.0)。记录每次改动的假设和结果，便于回溯和复盘。
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────

type Tab = 'signalflow' | 'denoising' | 'event' | 'failure' | 'iteration'

export default function StrategyDevelopment() {
  const [activeTab, setActiveTab] = useState<Tab>('signalflow')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'signalflow', label: '信号构建流程' },
    { id: 'denoising', label: '信号去噪' },
    { id: 'event', label: '事件驱动' },
    { id: 'failure', label: '失效模式' },
    { id: 'iteration', label: '策略迭代' },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h2 className="text-xl font-bold">信号构建与策略开发</h2>
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
        {activeTab === 'signalflow' && <SignalFlowDemo />}
        {activeTab === 'denoising' && <DenoisingDemo />}
        {activeTab === 'event' && <EventDrivenDemo />}
        {activeTab === 'failure' && <FailureModesDemo />}
        {activeTab === 'iteration' && <IterationDemo />}
      </div>
    </div>
  )
}
