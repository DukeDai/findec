'use client'

import { useState } from 'react'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts'
import { cn } from '@/lib/utils'

function generateMonteCarloData() {
  const days = 252
  const data: { day: number; [key: string]: number }[] = []

  for (let d = 0; d <= days; d++) {
    const entry: { day: number; [key: string]: number } = { day: d }
    entry['median'] = 100 * Math.exp(0.08 * (d / 252))
    entry['p5'] = entry['median'] * 0.85
    entry['p95'] = entry['median'] * 1.18
    entry['p10'] = entry['median'] * 0.78
    entry['p90'] = entry['median'] * 1.12
    entry['worst'] = entry['median'] * 0.65
    entry['best'] = entry['median'] * 1.25
    data.push(entry)
  }
  return data
}

function generateSlippageData() {
  const liquidityLevels = ['极高', '高', '中', '低', '极低']
  return liquidityLevels.map((level, i) => ({
    liquidity: level,
    marketImpact: (5 - i) * 0.8 + Math.random() * 0.5,
    spreadCost: (i + 1) * 0.3 + Math.random() * 0.2,
    totalSlippage: (5 - i) * 0.5 + Math.random() * 0.3,
  }))
}

function generateRebalancingData() {
  const frequencies = ['每日', '每周', '每月', '每季度', '每年']
  return frequencies.map((freq, i) => ({
    frequency: freq,
    transactionCost: (5 - i) * 0.8 + Math.random() * 0.3,
    driftRisk: (i + 1) * 3,
    optimalScore: 10 - Math.abs(i - 1.5) * 1.5,
  }))
}

// ── Cost Model Demo ─────────────────────────────────────────────────────

function CostModelDemo() {
  const [tradeSize, setTradeSize] = useState(10)
  const slippageBps = tradeSize * 5
  const commissionBps = 10 + tradeSize * 2
  const totalCostBps = slippageBps + commissionBps
  const annualCostPct = totalCostBps * 0.0001 * 252 * 2

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">交易成本模型</h3>
        <p className="text-sm text-muted-foreground">
          交易成本 = 滑点 + 佣金 + 印花税。小额交易影响不大，但高频策略成本会显著侵蚀收益。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">交易规模 (万元)</label>
          <span className="text-lg font-bold text-primary">{tradeSize}</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={tradeSize}
          onChange={e => setTradeSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">滑点 (bps)</p>
          <p className="text-xl font-bold text-red-600">{slippageBps}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">佣金 (bps)</p>
          <p className="text-xl font-bold text-amber-600">{commissionBps}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">总成本 (bps)</p>
          <p className="text-xl font-bold text-purple-600">{totalCostBps}</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          年化交易成本估算: <strong>{annualCostPct.toFixed(1)}%</strong>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={[{ name: '成本分解', 滑点: slippageBps, 佣金: commissionBps }]}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} unit=" bps" />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="滑点" fill="#ef4444" name="滑点" />
          <Bar dataKey="佣金" fill="#f59e0b" name="佣金" />
        </BarChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>高频策略每年交易 100+ 次，即使每次成本仅 10bps，年化成本也超过 20%。低成本是量化策略生存的关键。
        </p>
      </div>
    </div>
  )
}

// ── Slippage Analysis Demo ──────────────────────────────────────────────

function SlippageDemo() {
  const data = generateSlippageData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">流动性与滑点</h3>
        <p className="text-sm text-muted-foreground">
          大额订单会遇到市场冲击——订单量越大，价格冲击越大。低流动性股票的滑点可达 50bps+。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">高流动性 (SPY)</p>
          <p className="text-sm font-bold text-red-600">&lt; 1 bp</p>
          <p className="text-xs text-muted-foreground">买卖价差极小</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">低流动性 (小盘)</p>
          <p className="text-sm font-bold text-amber-600">20-50 bps</p>
          <p className="text-xs text-muted-foreground">价差显著</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" tick={{ fontSize: 10 }} unit=" bps" />
          <YAxis type="category" dataKey="liquidity" tick={{ fontSize: 10 }} width={40} />
          <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value) => {
            const numVal = typeof value === 'number' ? value : 0
            return [`${numVal.toFixed(1)} bps`, '滑点']
          }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="marketImpact" fill="#ef4444" name="市场冲击" />
          <Bar dataKey="spreadCost" fill="#f59e0b" name="价差成本" />
        </BarChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>实践建议：</strong>避免在小盘、低流动性股票上频繁交易。使用 VWAP/TWAP 算法拆单可降低市场冲击。
        </p>
      </div>
    </div>
  )
}

// ── Monte Carlo Demo ───────────────────────────────────────────────────

function MonteCarloDemo() {
  const data = generateMonteCarloData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Monte Carlo 模拟</h3>
        <p className="text-sm text-muted-foreground">
          通过 1000+ 次随机路径模拟，评估策略在不同市场情景下的表现分布。
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">中位数收益</p>
          <p className="text-lg font-bold text-green-600">+8.0%</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">5% 分位 (最差)</p>
          <p className="text-lg font-bold text-blue-600">-2.0%</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">95% 分位 (最优)</p>
          <p className="text-lg font-bold text-purple-600">+18.0%</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">最大回撤 (VaR 5%)</p>
          <p className="text-lg font-bold text-red-600">-12.0%</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} label={{ value: '交易日', position: 'insideBottom', fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={[60, 140]} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="p5" stroke="none" fill="#fee2e2" fillOpacity={0.5} name="5-95%区间" />
          <Area type="monotone" dataKey="p95" stroke="none" fill="#fee2e2" fillOpacity={0} />
          <Area type="monotone" dataKey="p10" stroke="none" fill="#fecaca" fillOpacity={0.5} name="10-90%区间" />
          <Area type="monotone" dataKey="p90" stroke="none" fill="#fecaca" fillOpacity={0} />
          <Line type="monotone" dataKey="median" stroke="#3b82f6" strokeWidth={2} dot={false} name="中位数" />
          <Line type="monotone" dataKey="worst" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="最差情景" />
          <Line type="monotone" dataKey="best" stroke="#22c55e" strokeWidth={1} strokeDasharray="4 4" dot={false} name="最优情景" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>核心价值：</strong>Monte Carlo 帮你理解策略的&quot;尾部风险&quot;。即使中位数收益为正，如果 5% 分位亏损过大，也需谨慎。
        </p>
      </div>
    </div>
  )
}

// ── Rebalancing Demo ───────────────────────────────────────────────────

function RebalancingDemo() {
  const data = generateRebalancingData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">再平衡频率</h3>
        <p className="text-sm text-muted-foreground">
          再平衡频率越高，交易成本越高但偏离目标风险越小。需找到成本与风险的平衡点。
        </p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="frequency" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="transactionCost" fill="#ef4444" name="交易成本" />
          <Bar dataKey="driftRisk" fill="#3b82f6" name="偏离风险" />
        </BarChart>
      </ResponsiveContainer>

      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
        <p className="text-sm text-green-800 dark:text-green-200">
          <strong>最优选择：</strong>对于大多数组合，每周或每月再平衡是较好的折中方案。日内频繁调仓的成本往往超过收益。
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>阈值再平衡：</strong>另一种方法是设置偏离阈值（如组合偏离目标 5% 时再平衡），可在成本和风险间取得更好平衡。
        </p>
      </div>
    </div>
  )
}

// ── Significance Test Demo ─────────────────────────────────────────────

function SignificanceDemo() {
  const [sampleSize, setSampleSize] = useState(100)

  const tStatistic = 1.5 + Math.sqrt(sampleSize / 50) * 0.3
  const pValue = Math.max(0.01, 0.15 - sampleSize * 0.001)
  const isSignificant = tStatistic > 1.96 && pValue < 0.05

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">统计显著性检验</h3>
        <p className="text-sm text-muted-foreground">
          回测结果需要统计检验。t 统计量 &gt; 1.96 且 p 值 &lt; 0.05 才算显著。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">样本量 (交易次数)</label>
          <span className="text-lg font-bold text-primary">{sampleSize}</span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          value={sampleSize}
          onChange={e => setSampleSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">t 统计量</p>
          <p className="text-xl font-bold text-blue-600">{tStatistic.toFixed(2)}</p>
          {tStatistic > 1.96 ? <p className="text-xs text-green-600">显著</p> : <p className="text-xs text-red-600">不显著</p>}
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">p 值</p>
          <p className="text-xl font-bold text-purple-600">{pValue.toFixed(3)}</p>
          {pValue < 0.05 ? <p className="text-xs text-green-600">显著</p> : <p className="text-xs text-red-600">不显著</p>}
        </div>
        <div className={cn('rounded-lg p-3', isSignificant ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30')}>
          <p className="text-xs text-muted-foreground">结论</p>
          <p className="text-lg font-bold">{isSignificant ? '策略有效' : '样本不足'}</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>实践警示：</strong>100 次交易的回测结果往往不显著。需要至少 200-300 次交易才能做可靠的统计推断。
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────

type Tab = 'cost' | 'slippage' | 'montecarlo' | 'rebalance' | 'significance'

export default function BacktestAdvanced() {
  const [activeTab, setActiveTab] = useState<Tab>('cost')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'cost', label: '成本模型' },
    { id: 'slippage', label: '滑点分析' },
    { id: 'montecarlo', label: 'Monte Carlo' },
    { id: 'rebalance', label: '再平衡' },
    { id: 'significance', label: '显著性检验' },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h2 className="text-xl font-bold">回测深度专题</h2>
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
        {activeTab === 'cost' && <CostModelDemo />}
        {activeTab === 'slippage' && <SlippageDemo />}
        {activeTab === 'montecarlo' && <MonteCarloDemo />}
        {activeTab === 'rebalance' && <RebalancingDemo />}
        {activeTab === 'significance' && <SignificanceDemo />}
      </div>
    </div>
  )
}
