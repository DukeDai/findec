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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'

function generateKellyData() {
  const data = []
  for (let i = 1; i <= 20; i++) {
    const winRate = i * 5
    const avgWin = 10
    const avgLoss = -5
    const kelly = (winRate / 100 * avgWin - (1 - winRate / 100) * Math.abs(avgLoss)) / avgWin * 100
    data.push({
      winRate: `${winRate}%`,
      kelly: Math.max(0, Math.round(kelly * 10) / 10),
      conservativeKelly: Math.max(0, Math.round(kelly * 50) / 10),
    })
  }
  return data
}

function generatePositionSizingData() {
  return [
    { name: 'Fixed Amount', sharpe: 0.8, maxDD: 25, turnover: 5 },
    { name: 'Fixed Percent', sharpe: 1.1, maxDD: 18, turnover: 8 },
    { name: 'Fixed Fractional', sharpe: 1.4, maxDD: 22, turnover: 12 },
    { name: 'Kelly 50%', sharpe: 1.6, maxDD: 30, turnover: 15 },
    { name: 'Kelly 25%', sharpe: 1.3, maxDD: 18, turnover: 10 },
    { name: 'Volatility Target', sharpe: 1.5, maxDD: 15, turnover: 20 },
  ]
}

function generateRiskParityData() {
  return [
    { asset: '股票', weight: 30, vol: 16, contribution: 35 },
    { asset: '债券', weight: 50, vol: 5, contribution: 18 },
    { asset: '商品', weight: 10, vol: 20, contribution: 25 },
    { asset: '黄金', weight: 10, vol: 12, contribution: 22 },
  ]
}

function generateDrawdownData() {
  const data = []
  let equity = 100
  for (let i = 0; i <= 60; i++) {
    equity = equity * (1 + (Math.random() - 0.45) * 0.05)
    const peak = Math.max(equity, data.length > 0 ? data[data.length - 1].peak : 100)
    const drawdown = ((equity - peak) / peak) * 100
    data.push({
      month: i,
      equity: Math.round(equity * 100) / 100,
      peak: Math.round(peak * 100) / 100,
      drawdown: Math.round(drawdown * 10) / 10,
    })
  }
  return data
}

function generateVaRESGData() {
  return [
    { level: '99% (VaR 1%)', var: 2.5, esg: 4.2 },
    { level: '95% (VaR 5%)', var: 1.8, esg: 2.9 },
    { level: '90% (VaR 10%)', var: 1.2, esg: 1.8 },
  ]
}

function PositionSizingDemo() {
  const [method, setMethod] = useState('fixed')
  const [capital, setCapital] = useState(100000)
  const [riskPercent, setRiskPercent] = useState(2)

  const methods = {
    fixed: { position: 10000, shares: 100, label: '固定金额 1万' },
    fixedPercent: { position: capital * 0.1, shares: Math.floor(capital * 0.1 / 100), label: '10% 仓位' },
    fixedFractional: { position: capital * (riskPercent / 100) * 2, shares: Math.floor(capital * (riskPercent / 100) * 2 / 100), label: '风险敞口 2%' },
    kelly: { position: capital * 0.25, shares: Math.floor(capital * 0.25 / 100), label: 'Kelly 25%' },
  }

  const current = methods[method as keyof typeof methods] || methods.fixed

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">仓位计算器</h3>
        <p className="text-sm text-muted-foreground">
          不同仓位管理方法下的头寸大小计算。股票价格假设为 $100。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">资金规模</label>
            <p className="text-xl font-bold">${capital.toLocaleString()}</p>
          </div>
          <input
            type="range"
            min={10000}
            max={1000000}
            step={10000}
            value={capital}
            onChange={e => setCapital(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">风险百分比 (Fixed Fractional)</label>
            <p className="text-xl font-bold">{riskPercent}%</p>
          </div>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={riskPercent}
            onChange={e => setRiskPercent(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(methods).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setMethod(key)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-full border transition-colors',
              method === key ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            {val.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">头寸规模</p>
          <p className="text-xl font-bold text-blue-600">${Math.round(current.position).toLocaleString()}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">股数</p>
          <p className="text-xl font-bold text-green-600">{current.shares}</p>
        </div>
      </div>
    </div>
  )
}

function KellyFormulaDemo() {
  const data = generateKellyData()
  const [selectedWR, setSelectedWR] = useState(50)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Kelly 公式</h3>
        <p className="text-sm text-muted-foreground">
          Kelly = (p × W - (1-p) × L) / W，其中 p=胜率，W=平均盈利，L=平均亏损。表示最大化长期增长率的最优仓位。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-center font-mono text-lg mb-2">
          Kelly% = (胜率 × 盈亏比 - 败率) / 盈亏比
        </p>
        <p className="text-center text-xs text-muted-foreground">
          假设: 平均盈利 = 10%, 平均亏损 = 5%
        </p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="winRate" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="kelly" fill="#3b82f6" name="Kelly %" />
          <Bar dataKey="conservativeKelly" fill="#22c55e" name="Kelly 50% (保守)" />
        </BarChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>实际应用：</strong>Kelly 公式给出理论最优仓位，但实际建议使用 Kelly 的 25-50%，因为市场条件变化和估计误差会使全 Kelly 仓位风险过高。
        </p>
      </div>
    </div>
  )
}

function RiskParityDemo() {
  const data = generateRiskParityData()
  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444']

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">风险平价 (Risk Parity)</h3>
        <p className="text-sm text-muted-foreground">
          风险平价不是按资金分配，而是按风险贡献分配。每种资产对组合总风险的贡献相同。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">资金权重</p>
          <PieChart width={150} height={150}>
            <Pie
              data={data}
              cx={75}
              cy={75}
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
              dataKey="weight"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
          <div className="mt-2 space-y-1">
            {data.map((d, i) => (
              <div key={d.asset} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                <span>{d.asset}: {d.weight}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">风险贡献</p>
          {data.map((d, i) => (
            <div key={d.asset} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{d.asset}</span>
                <span className="font-medium">{d.contribution}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${d.contribution}%`, background: COLORS[i] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>优势：</strong>债券波动率低但权重高，股票波动率高但权重低，使得组合整体风险更均衡。2008 年金融危机后广泛应用。
        </p>
      </div>
    </div>
  )
}

function DrawdownAnalysisDemo() {
  const data = generateDrawdownData()
  const maxDD = Math.min(...data.map(d => d.drawdown))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">回撤分析</h3>
        <p className="text-sm text-muted-foreground">
          最大回撤是量化策略最重要的风险指标之一。回撤幅度决定你需要多少资金才能扛过低谷。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">最大回撤</p>
          <p className="text-xl font-bold text-red-600">{maxDD.toFixed(1)}%</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">平均回撤</p>
          <p className="text-xl font-bold text-amber-600">{(data.reduce((s, d) => s + d.drawdown, 0) / data.length).toFixed(1)}%</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">恢复时间(模拟)</p>
          <p className="text-xl font-bold text-blue-600">~{Math.round(data.length * 0.6)} 月</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} label={{ value: '月份', position: 'insideBottom', fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={[-40, 20]} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="equity" stroke="#3b82f6" name="权益" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="peak" stroke="#22c55e" name="峰值" strokeWidth={1} strokeDasharray="4 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>生存法则：</strong>如果最大回撤 30%，你需要初始资金的 1.43 倍才能回本。因此，控制回撤比追求高收益更重要。
        </p>
      </div>
    </div>
  )
}

function VaRandESGdemo() {
  const data = generateVaRESGData()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">VaR 与 Expected Shortfall</h3>
        <p className="text-sm text-muted-foreground">
          VaR (Value at Risk) 给出特定置信水平下的最大损失；ESG (Expected Shortfall) 给出极端情况下的平均损失，更反映尾部风险。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">VaR 公式:</p>
        <p className="text-xs font-mono text-muted-foreground">
          VaR(α) = -μ + σ × z_α
        </p>
        <p className="text-xs text-muted-foreground">
          其中 z_α 是标准正态分布的 α 分位数
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">VaR (年化)</p>
          {data.map(d => (
            <div key={d.level} className="flex items-center gap-2 mb-1">
              <span className="text-xs w-20">{d.level}</span>
              <div className="flex-1 h-4 bg-muted rounded">
                <div className="h-full bg-red-500 rounded" style={{ width: `${d.var * 30}%` }} />
              </div>
              <span className="text-xs font-medium w-12">{d.var}%</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">ESG (年化)</p>
          {data.map(d => (
            <div key={d.level} className="flex items-center gap-2 mb-1">
              <span className="text-xs w-20">{d.level}</span>
              <div className="flex-1 h-4 bg-muted rounded">
                <div className="h-full bg-red-700 rounded" style={{ width: `${d.esg * 20}%` }} />
              </div>
              <span className="text-xs font-medium w-12">{d.esg}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>关键区别：</strong>VaR 95% = 2% 表示&quot;有 5% 的概率损失超过 2%&quot;；但没说具体可能损失多少。ESG 考虑了尾部，比 VaR 更保守但更真实。
        </p>
      </div>
    </div>
  )
}

type Tab = 'sizing' | 'kelly' | 'parity' | 'drawdown' | 'var'

export default function RiskManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('sizing')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'sizing', label: '仓位计算' },
    { id: 'kelly', label: 'Kelly公式' },
    { id: 'parity', label: '风险平价' },
    { id: 'drawdown', label: '回撤分析' },
    { id: 'var', label: 'VaR/ESG' },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h2 className="text-xl font-bold">仓位管理与风险控制</h2>
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
        {activeTab === 'sizing' && <PositionSizingDemo />}
        {activeTab === 'kelly' && <KellyFormulaDemo />}
        {activeTab === 'parity' && <RiskParityDemo />}
        {activeTab === 'drawdown' && <DrawdownAnalysisDemo />}
        {activeTab === 'var' && <VaRandESGdemo />}
      </div>
    </div>
  )
}
