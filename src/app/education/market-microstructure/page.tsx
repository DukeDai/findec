'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'

// ── Order Types Demo ───────────────────────────────────────────────────

function generateOrderTypeData(orderSize: number, orderType: 'market' | 'limit' | 'stop') {
  const points = 50
  const data = []
  let price = 100

  for (let i = 0; i < points; i++) {
    price = price * (1 + (Math.random() - 0.49) * 0.005)
    const mid = price

    let executed = false
    let execPrice = 0
    let slippage = 0

    if (orderType === 'market') {
      if (i >= 5) {
        executed = true
        const volImpact = Math.sqrt(orderSize / 1000) * 0.1
        const spread = 0.02
        slippage = spread / 2 + volImpact
        execPrice = mid + slippage
      }
    } else if (orderType === 'limit') {
      const limitPrice = mid * 0.998
      if (price <= limitPrice && i >= 5) {
        executed = true
        execPrice = limitPrice
        slippage = limitPrice - mid
      }
    } else {
      const stopPrice = mid * 1.002
      if (price >= stopPrice && i >= 5) {
        executed = true
        const volImpact = Math.sqrt(orderSize / 1000) * 0.1
        const spread = 0.02
        slippage = spread / 2 + volImpact
        execPrice = mid + slippage
      }
    }

    const date = new Date(2023, 0, 1)
    date.setMinutes(date.getMinutes() + i * 5)
    data.push({
      time: `${String(Math.floor(i * 5 / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`,
      price: Math.round(mid * 100) / 100,
      exec: executed && i === 5 ? execPrice : 0,
      limitLine: orderType === 'limit' ? Math.round(mid * 0.998 * 100) / 100 : 0,
      stopLine: orderType === 'stop' ? Math.round(mid * 1.002 * 100) / 100 : 0,
      bid: Math.round((mid - 0.01) * 100) / 100,
      ask: Math.round((mid + 0.01) * 100) / 100,
    })
  }
  return data
}

function OrderTypesDemo() {
  const [orderSize, setOrderSize] = useState(100)
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market')
  const data = generateOrderTypeData(orderSize, orderType)

  const execPoint = data.find(d => d.exec > 0)
  const slippage = execPoint ? execPoint.exec - data[5].price : 0

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">订单类型与成交 (Order Types)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          市价单以当前最优价格立即成交，但存在滑点；限价单设定价格上限；止损单在价格突破后以市价触发。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {(['market', 'limit', 'stop'] as const).map(t => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              'px-3 py-2 text-xs rounded-lg border transition-colors font-medium',
              orderType === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            )}
          >
            {t === 'market' ? '市价单' : t === 'limit' ? '限价单' : '止损单'}
          </button>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">订单数量 (股)</label>
          <span className="text-lg font-bold text-primary">{orderSize}</span>
        </div>
        <input
          type="range"
          min={10}
          max={500}
          step={10}
          value={orderSize}
          onChange={e => setOrderSize(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10股 (小额)</span>
          <span>500股 (大额)</span>
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">预估滑点</p>
        <p className="text-xl font-bold text-red-600">
          {orderType === 'limit' ? '无成交风险' : `≈ $${slippage.toFixed(3)}`}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={9} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="ask" stroke="#ef4444" fill="#ef444433" name="卖价" dot={false} />
          <Area type="monotone" dataKey="bid" stroke="#22c55e" fill="#22c55e33" name="买价" dot={false} />
          <Line type="monotone" dataKey="price" stroke="#6b7280" name="中间价" strokeWidth={1.5} dot={false} />
          {orderType === 'limit' && (
            <Line type="monotone" dataKey="limitLine" stroke="#3b82f6" name="限价" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          )}
          {orderType === 'stop' && (
            <Line type="monotone" dataKey="stopLine" stroke="#f59e0b" name="止损价" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          )}
          {execPoint && (
            <ReferenceLine x={execPoint.time} stroke="#ef4444" strokeWidth={2} label={{ value: '成交!', fontSize: 10, fill: '#ef4444' }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>大额订单滑点显著增加（~√数量关系）。高频交易中，微秒级延迟即可造成显著滑点。
        </p>
      </div>
    </div>
  )
}

// ── Liquidity & Spread Demo ───────────────────────────────────────────

function generateSpreadData(volume: number) {
  const data = []
  for (let i = 0; i < 20; i++) {
    const vol = (i + 1) * 50
    const baseSpread = 0.01
    const spread = baseSpread + 0.05 / Math.sqrt(vol / 100)
    const relSpread = (spread / ((100 + i * 0.5))) * 100
    data.push({
      vol,
      spread: Math.round(spread * 1000) / 1000,
      relSpread: Math.round(relSpread * 100) / 100,
      volume2: vol,
      spread2: Math.round((0.008 + 0.03 / Math.sqrt(vol / 50)) * 1000) / 1000,
    })
  }
  return data
}

function LiquiditySpreadDemo() {
  const [volume, setVolume] = useState(200)
  const data = generateSpreadData(volume)

  const currentSpread = (0.01 + 0.05 / Math.sqrt(volume / 100)).toFixed(3)
  const currentRelSpread = ((parseFloat(currentSpread) / 100) * 100).toFixed(3)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">流动性与价差分析 (Liquidity & Spread)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          买卖价差（Bid-Ask Spread）是流动性的核心成本。交易量越小，价差越大，市场深度越浅。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">日均成交量 (手)</label>
          <span className="text-lg font-bold text-primary">{volume}</span>
        </div>
        <input
          type="range"
          min={10}
          max={1000}
          step={10}
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>低流动性</span>
          <span>高流动性</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">绝对价差 ($)</p>
          <p className="text-xl font-bold text-red-600">${currentSpread}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">相对价差 (%)</p>
          <p className="text-xl font-bold text-orange-600">{currentRelSpread}%</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="vol" tick={{ fontSize: 10 }} label={{ value: '成交量', fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="spread" fill="#ef4444" name="买卖价差" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="vol" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="spread" stroke="#ef4444" name="低价量价差" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="spread2" stroke="#3b82f6" name="高价量价差" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>价差与交易量呈负相关（平方根关系）。小盘股价差可达大盘股的10倍以上。
        </p>
      </div>
    </div>
  )
}

// ── Market Impact Demo ─────────────────────────────────────────────────

function generateMarketImpactData(orderSize: number) {
  const data = []
  const totalVolume = 10000
  const participation = orderSize / totalVolume

  for (let i = 0; i < 30; i++) {
    const filled = Math.min(i / 29, 1)
    const basePrice = 100
    const permanentImpact = basePrice * 0.1 * participation * filled
    const tempImpact = basePrice * 0.2 * participation * Math.sin(filled * Math.PI) * Math.exp(-filled * 2)
    const totalImpact = permanentImpact + tempImpact
    const realizedPrice = basePrice + totalImpact

    data.push({
      time: `T+${i}`,
      permanent: Math.round(permanentImpact * 100) / 100,
      temporary: Math.round(tempImpact * 100) / 100,
      total: Math.round(totalImpact * 100) / 100,
      realized: Math.round(realizedPrice * 100) / 100,
    })
  }
  return data
}

function MarketImpactDemo() {
  const [orderSize, setOrderSize] = useState(500)
  const data = generateMarketImpactData(orderSize)

  const finalImpact = data[data.length - 1]?.total ?? 0
  const participationRate = ((orderSize / 10000) * 100).toFixed(1)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">市场冲击模型 (Market Impact)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          大额订单会将价格推向不利方向。临时冲击来自流动性消耗，永久冲击来自供需平衡改变。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">订单规模 (股)</label>
          <span className="text-lg font-bold text-primary">{orderSize}</span>
        </div>
        <input
          type="range"
          min={50}
          max={3000}
          step={50}
          value={orderSize}
          onChange={e => setOrderSize(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>小额单 (50股)</span>
          <span>大额单 (3000股)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">总冲击成本 ($)</p>
          <p className="text-xl font-bold text-red-600">+${finalImpact.toFixed(2)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">占日均量比</p>
          <p className="text-xl font-bold text-orange-600">{participationRate}%</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={4} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="permanent" stackId="1" stroke="#ef4444" fill="#ef444488" name="永久冲击" />
          <Area type="monotone" dataKey="temporary" stackId="1" stroke="#f59e0b" fill="#f59e0b88" name="临时冲击" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>执行大单时使用 VWAP/TWAP 算法分散冲击。大单分批执行可显著降低市场冲击成本。
        </p>
      </div>
    </div>
  )
}

// ── HF vs LF Strategy Demo ────────────────────────────────────────────

function generateHFvsLFData(hfFreq: number) {
  const data = []
  const days = 60

  for (let i = 0; i < days; i++) {
    const t = i / days
    const hfNoise = (Math.random() - 0.5) * 3
    const lfTrend = t * 0.8 + (Math.random() - 0.45) * 0.1

    const hfReturn = 0.0005 * hfFreq + hfNoise * 0.001 * hfFreq
    const lfReturn = lfTrend * 0.02

    const date = new Date(2023, 0, 1)
    date.setDate(date.getDate() + i)
    data.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      hf: Math.round((100 + i * hfReturn * 10) * 100) / 100,
      lf: Math.round(100 * Math.exp(lfReturn) * 100) / 100,
      hfVol: Math.round(hfNoise * hfNoise * hfFreq * 0.5 * 100) / 100,
    })
  }
  return data
}

function HFvsLFDemo() {
  const [hfFreq, setHfFreq] = useState(5)
  const data = generateHFvsLFData(hfFreq)

  const hfFinal = data[data.length - 1]?.hf ?? 100
  const lfFinal = data[data.length - 1]?.lf ?? 100
  const hfReturn = ((hfFinal - 100) / 100 * 100).toFixed(1)
  const lfReturn = ((lfFinal - 100) / 100 * 100).toFixed(1)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">高频 vs 低频策略 (HF vs LF)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          高频策略收益高但波动大、费用敏感；低频策略收益稳定但容量有限。选择取决于资金规模与风险承受能力。
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">高频信号频率</label>
          <span className="text-lg font-bold text-primary">1/{hfFreq}天</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={hfFreq}
          onChange={e => setHfFreq(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>极高频 (每日)</span>
          <span>低频 (20天/次)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">高频策略收益</p>
          <p className="text-xl font-bold text-blue-600">{hfReturn}%</p>
          <p className="text-xs text-muted-foreground mt-1">波动大，费用敏感</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">低频策略收益</p>
          <p className="text-xl font-bold text-green-600">{lfReturn}%</p>
          <p className="text-xs text-muted-foreground mt-1">稳定，容量大</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={10} />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="hf" stroke="#3b82f6" fill="#3b82f633" name="高频策略" />
          <Area type="monotone" dataKey="lf" stroke="#22c55e" fill="#22c55e33" name="低频策略" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>频率越高，交易成本占比越大。资金量&gt;1000万时，高频策略优势减弱，应转向中低频。
        </p>
      </div>
    </div>
  )
}

// ── Limit Order Book Demo ──────────────────────────────────────────────

function generateOrderBookData() {
  const data = []
  const midPrice = 100

  for (let i = -10; i <= 10; i++) {
    const offset = i * 0.05
    const price = Math.round((midPrice + offset) * 100) / 100
    const isBid = i < 0
    const dist = Math.abs(i)

    let volume = 0
    if (dist <= 2) volume = (11 - dist) * 50 + Math.floor(Math.random() * 20)
    else if (dist <= 5) volume = (6 - dist) * 20 + Math.floor(Math.random() * 10)
    else volume = Math.floor(Math.random() * 5) + 1

    data.push({
      price,
      bidVol: isBid ? volume : 0,
      askVol: !isBid ? volume : 0,
      totalVol: volume,
    })
  }

  data.sort((a, b) => a.price - b.price)
  return data
}

function OrderBookDemo() {
  const [side, setSide] = useState<'both' | 'bid' | 'ask'>('both')
  const data = generateOrderBookData()

  const totalBidVol = data.reduce((s, d) => s + d.bidVol, 0)
  const totalAskVol = data.reduce((s, d) => s + d.askVol, 0)
  const imbalance = totalBidVol + totalAskVol > 0
    ? ((totalBidVol - totalAskVol) / (totalBidVol + totalAskVol) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">限价订单簿 (Limit Order Book)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          订单簿显示所有未成交的限价单。买卖盘不平衡时，价格倾向于流向订单较少的方向。
        </p>
      </div>

      <div className="flex gap-2 mb-2">
        {(['both', 'bid', 'ask'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={cn(
              'px-3 py-1 text-xs rounded-full border transition-colors',
              side === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            {s === 'both' ? '买卖盘' : s === 'bid' ? '买方盘' : '卖方盘'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">买盘总量</p>
          <p className="text-xl font-bold text-green-600">{totalBidVol}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">卖盘总量</p>
          <p className="text-xl font-bold text-red-600">{totalAskVol}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">订单不平衡</p>
          <p className={cn('text-xl font-bold', parseFloat(imbalance) > 0 ? 'text-green-600' : parseFloat(imbalance) < 0 ? 'text-red-600' : 'text-blue-600')}>
            {imbalance}%
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barGap={0}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="price" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v, name) => [`${v}股`, name === 'bidVol' ? '买盘' : '卖盘']} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {(side === 'both' || side === 'bid') && (
            <Bar dataKey="bidVol" fill="#22c55e" name="买盘" radius={[2, 0, 0, 2]} />
          )}
          {(side === 'both' || side === 'ask') && (
            <Bar dataKey="askVol" fill="#ef4444" name="卖盘" radius={[0, 2, 2, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>学习要点：</strong>订单簿不平衡 &gt;5% 时，价格向订单少的一侧移动概率大增。可用于 VWAP 执行的时机选择。
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────

type Tab = 'ordertypes' | 'spread' | 'impact' | 'hfvslt' | 'orderbook'

export default function MarketMicrostructure() {
  const [activeTab, setActiveTab] = useState<Tab>('ordertypes')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ordertypes', label: '订单类型' },
    { id: 'spread', label: '流动性价差' },
    { id: 'impact', label: '市场冲击' },
    { id: 'hfvslt', label: '高频vs低频' },
    { id: 'orderbook', label: '限价订单簿' },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h2 className="text-xl font-bold">市场微观结构</h2>
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
        {activeTab === 'ordertypes' && <OrderTypesDemo />}
        {activeTab === 'spread' && <LiquiditySpreadDemo />}
        {activeTab === 'impact' && <MarketImpactDemo />}
        {activeTab === 'hfvslt' && <HFvsLFDemo />}
        {activeTab === 'orderbook' && <OrderBookDemo />}
      </div>
    </div>
  )
}
