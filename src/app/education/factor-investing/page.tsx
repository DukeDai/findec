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
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

// ── Mock data generators ──────────────────────────────────────────────

function generateFactorReturnsData() {
  const months = 24
  const data = []
  const factors = ['Momentum', 'Value', 'Quality', 'LowVol', 'Size']

  for (let i = 0; i < months; i++) {
    const date = new Date(2023, i % 12, 1)
    const entry: Record<string, string | number> = {
      date: date.toLocaleDateString('zh-CN', { year: '2-digit', month: 'short' }),
    }
    factors.forEach(f => {
      entry[f] = Math.round((Math.random() - 0.45) * 8 * 100) / 100
    })
    data.push(entry)
  }
  return { data, factors }
}

function generateICData() {
  const periods = 36
  const data = []
  for (let i = 0; i < periods; i++) {
    const date = new Date(2022, i % 12, 1)
    data.push({
      date: date.toLocaleDateString('zh-CN', { year: '2-digit', month: 'short' }),
      IC: Math.round((Math.random() - 0.4) * 15 * 100) / 100,
      rollingIC: Math.round((Math.random() - 0.35) * 10 * 100) / 100,
    })
  }
  return data
}

function generateFactorCorrelationData() {
  const factors = ['Momentum', 'Value', 'Quality', 'LowVol', 'Size']
  const correlation: number[][] = []
  factors.forEach((f1, i) => {
    const row: number[] = []
    factors.forEach((f2, j) => {
      if (i === j) row.push(1)
      else if (j < i) row.push(correlation[j][i])
      else {
        const corr = i === 0 && j === 1 ? 0.15 : i === 0 && j === 2 ? -0.08 : Math.round((Math.random() - 0.5) * 0.6 * 100) / 100
        row.push(corr)
      }
    })
    correlation.push(row)
  })
  return { factors, correlation }
}

function generatePortfoliosData() {
  return [
    { name: '单因子 Momentum', sharpe: 0.8, return: 12, vol: 15 },
    { name: '双因子 Mom+Val', sharpe: 1.1, return: 14, vol: 12 },
    { name: '三因子 Mom+Val+Q', sharpe: 1.3, return: 15, vol: 11 },
    { name: '五因子等权', sharpe: 1.2, return: 13, vol: 10 },
    { name: '风险平价', sharpe: 1.4, return: 11, vol: 8 },
    { name: '市值加权基准', sharpe: 0.6, return: 10, vol: 16 },
  ]
}

// ── Factor Returns Demo ─────────────────────────────────────────────────

function FactorReturnsDemo() {
  const { data, factors } = generateFactorReturnsData()
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">因子收益时序</h3>
        <p className="text-sm text-muted-foreground">
          各因子在不同市场环境下的月度收益表现。观察因子收益的周期性特征和风格轮动。
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {factors.map((f, i) => (
            <Line
              key={f}
              type="monotone"
              dataKey={f}
              stroke={colors[i]}
              strokeWidth={1.5}
              dot={false}
              name={f === 'Momentum' ? '动量' : f === 'Value' ? '价值' : f === 'Quality' ? '质量' : f === 'LowVol' ? '低波动' : '规模'}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>学习要点：</strong>因子收益并非稳定，呈现明显的风格轮动特征。单一因子难以持续跑赢市场，多因子组合可分散风险。
        </p>
      </div>
    </div>
  )
}

// ── IC Analysis Demo ───────────────────────────────────────────────────

function ICAnalysisDemo() {
  const data = generateICData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">信息系数 (IC) 分析</h3>
        <p className="text-sm text-muted-foreground">
          IC 衡量因子预测能力（因子值与未来收益的相关性）。IC&gt;0 表示正相关，IC&lt;0 表示负相关。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">平均 IC</p>
          <p className="text-xl font-bold text-green-600">+3.2%</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">IC IR</p>
          <p className="text-xl font-bold text-amber-600">0.58</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">胜率 (IC&gt;0)</p>
          <p className="text-xl font-bold text-blue-600">62%</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={5} />
          <YAxis tick={{ fontSize: 10 }} unit="%" domain={[-15, 15]} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="IC" stroke="#3b82f6" name="月度 IC" strokeWidth={1.5} dot={{ fill: '#3b82f6', r: 2 }} />
          <Line type="monotone" dataKey="rollingIC" stroke="#22c55e" name="滚动 IC (6月)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>判断标准：</strong>IC IR &gt; 0.5 表示因子有效；IC 均值 &gt; 2% 且胜率 &gt; 55% 为良好；需持续跟踪 IC 衰减情况。
        </p>
      </div>
    </div>
  )
}

// ── Factor Correlation Demo ─────────────────────────────────────────────

function FactorCorrelationDemo() {
  const { factors, correlation } = generateFactorCorrelationData()
  const colors = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6']

  const heatmapData: { factor: string; [key: string]: number | string }[] = []
  factors.forEach((f1, i) => {
    const row: { factor: string; [key: string]: number | string } = { factor: f1 }
    factors.forEach((f2, j) => {
      row[f2] = correlation[i][j]
    })
    heatmapData.push(row)
  })

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">因子相关性热力图</h3>
        <p className="text-sm text-muted-foreground">
          低相关性因子组合可有效分散风险。相关性 &gt; 0.7 的因子应避免同时使用。
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 border bg-muted"></th>
                {factors.map((f, i) => (
                  <th key={f} className="p-2 border bg-muted font-medium">
                    {f === 'Momentum' ? '动量' : f === 'Value' ? '价值' : f === 'Quality' ? '质量' : f === 'LowVol' ? '低波' : '规模'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {factors.map((f1, i) => (
                <tr key={f1}>
                  <td className="p-2 border bg-muted font-medium">
                    {f1 === 'Momentum' ? '动量' : f1 === 'Value' ? '价值' : f1 === 'Quality' ? '质量' : f1 === 'LowVol' ? '低波' : '规模'}
                  </td>
                  {factors.map((f2, j) => {
                    const val = correlation[i][j]
                    const bg = val > 0.5 ? `rgba(239, 68, 68, ${Math.abs(val) * 0.3})` : val < -0.3 ? `rgba(34, 197, 94, ${Math.abs(val) * 0.3})` : `rgba(107, 114, 128, ${Math.abs(val) * 0.2})`
                    return (
                      <td key={f2} className="p-2 border text-center" style={{ background: bg }}>
                        <span className={cn('font-medium', Math.abs(val) > 0.5 ? 'text-red-600 dark:text-red-400' : Math.abs(val) > 0.3 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                          {val.toFixed(2)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>实践建议：</strong>动量与价值因子相关性较低，可有效组合；质量与低波动因子常呈负相关，是分散风险的好选择。
        </p>
      </div>
    </div>
  )
}

// ── Multi-Factor Portfolio Demo ───────────────────────────────────────

function MultiFactorPortfolioDemo() {
  const data = generatePortfoliosData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">多因子组合效果</h3>
        <p className="text-sm text-muted-foreground">
          因子数量与组合风险调整收益的关系。并非因子越多越好，需平衡收益与复杂度。
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="vol" name="波动率" unit="%" tick={{ fontSize: 10 }} label={{ value: '波动率 (%)', position: 'insideBottom', fontSize: 10 }} />
          <YAxis dataKey="return" name="收益" unit="%" tick={{ fontSize: 10 }} />
          <ZAxis dataKey="sharpe" range={[50, 200]} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value, name) => {
              const numVal = typeof value === 'number' ? value : 0
              return [`${numVal.toFixed(1)}${name === 'vol' || name === 'return' ? '%' : ''}`, name === 'vol' ? '波动率' : name === 'return' ? '收益' : '夏普比率']
            }}
            labelFormatter={(label) => data.find(d => d.vol === label)?.name || ''}
          />
          <Scatter name="组合" data={data} fill="#3b82f6" />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">最优风险收益比</p>
          <p className="text-sm font-bold text-green-600">风险平价组合</p>
          <p className="text-xs text-muted-foreground">夏普 1.4，波动率仅 8%</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">最高收益</p>
          <p className="text-sm font-bold text-amber-600">三因子组合</p>
          <p className="text-xs text-muted-foreground">收益 15%，夏普 1.3</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>关键洞察：</strong>因子数量从 1 → 3 个时，夏普比率显著提升；继续增加到 5 个，边际收益递减。风险平价通过权重优化实现最优夏普。
        </p>
      </div>
    </div>
  )
}

// ── Fama-French Model Demo ─────────────────────────────────────────────

function FamaFrenchDemo() {
  const [factorCount, setFactorCount] = useState(3)
  const modelData = [
    { name: 'CAPM (单因子)', alpha: 2.1, beta: 1.0 },
    { name: '三因子 (Fama-French)', alpha: 0.8, beta: 1.0 },
    { name: '五因子', alpha: 0.4, beta: 1.0 },
  ]

  const selected = modelData[factorCount - 1] || modelData[0]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Fama-French 多因子模型</h3>
        <p className="text-sm text-muted-foreground">
          多因子模型解释超额收益（Alpha）的来源，逐步剥离系统性风险。
        </p>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map(n => (
          <button
            key={n}
            onClick={() => setFactorCount(n)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              factorCount === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            {n === 1 ? 'CAPM' : n === 2 ? '三因子' : '五因子'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Alpha (超额收益)</p>
          <p className="text-xl font-bold text-blue-600">{selected.alpha}%</p>
          <p className="text-xs text-muted-foreground">年化</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Beta (市场敏感度)</p>
          <p className="text-xl font-bold text-purple-600">{selected.beta}</p>
          <p className="text-xs text-muted-foreground">市场每涨1%，组合涨 {selected.beta}%</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>模型演进：</strong>CAPM → 三因子 (加入市值、价值) → 五因子 (加入盈利、投资) → 最新还有六因子模型。每增加因子，Alpha 解释力下降，说明大部分超额收益已被因子捕获。
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────

type Tab = 'returns' | 'ic' | 'correlation' | 'portfolio' | 'ff'

export default function FactorInvesting() {
  const [activeTab, setActiveTab] = useState<Tab>('returns')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'returns', label: '因子收益' },
    { id: 'ic', label: 'IC 分析' },
    { id: 'correlation', label: '相关性' },
    { id: 'portfolio', label: '组合效果' },
    { id: 'ff', label: 'Fama-French' },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h2 className="text-xl font-bold">因子投资理论</h2>
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
        {activeTab === 'returns' && <FactorReturnsDemo />}
        {activeTab === 'ic' && <ICAnalysisDemo />}
        {activeTab === 'correlation' && <FactorCorrelationDemo />}
        {activeTab === 'portfolio' && <MultiFactorPortfolioDemo />}
        {activeTab === 'ff' && <FamaFrenchDemo />}
      </div>
    </div>
  )
}
