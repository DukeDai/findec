export interface BacktestReportData {
  strategyName: string
  backtestPeriod: { start: string; end: string }
  metrics: {
    totalReturn: number
    sharpeRatio: number
    maxDrawdown: number
    winRate: number
    totalTrades: number
    avgHoldingDays: number
  }
  monthlyReturns: { month: string; returnPct: number }[]
  trades: { date: string; symbol: string; type: string; price: number; quantity: number; pnl: number }[]
}

export function exportBacktestCSV(data: BacktestReportData): void {
  const escape = (v: string | number | undefined) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines: string[] = []

  lines.push('# 策略摘要')
  lines.push(`策略名称,${escape(data.strategyName)}`)
  lines.push(`回测期间,${escape(data.backtestPeriod.start)} - ${escape(data.backtestPeriod.end)}`)
  lines.push('')

  lines.push('# 核心指标')
  lines.push(`总收益率,${data.metrics.totalReturn.toFixed(2)}%`)
  lines.push(`夏普比率,${data.metrics.sharpeRatio.toFixed(3)}`)
  lines.push(`最大回撤,${data.metrics.maxDrawdown.toFixed(2)}%`)
  lines.push(`胜率,${data.metrics.winRate.toFixed(2)}%`)
  lines.push(`交易次数,${data.metrics.totalTrades}`)
  lines.push(`平均持仓天数,${data.metrics.avgHoldingDays.toFixed(1)}`)
  lines.push('')

  lines.push('# 月度收益')
  lines.push('月份,收益率')
  data.monthlyReturns.forEach(m => {
    lines.push(`${escape(m.month)},${m.returnPct.toFixed(2)}%`)
  })
  lines.push('')

  lines.push('# 交易记录')
  lines.push('日期,股票代码,类型,价格,数量,盈亏')
  data.trades.forEach(t => {
    lines.push([t.date, t.symbol, t.type, t.price.toFixed(2), t.quantity.toString(), t.pnl.toFixed(2)].map(escape).join(','))
  })

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.strategyName.replace(/\s+/g, '_')}_回测报告_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportBacktestHTML(data: BacktestReportData): void {
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${data.strategyName} 回测报告</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
  h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 30px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .meta { color: #888; font-size: 14px; margin-bottom: 24px; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
  .metric { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
  .metric-label { font-size: 12px; color: #888; }
  .metric-value { font-size: 20px; font-weight: 700; }
  .positive { color: #16a34a; }
  .negative { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  th { background: #f9fafb; font-weight: 600; }
  tr:nth-child(even) { background: #fafafa; }
  .buy { color: #16a34a; }
  .sell { color: #dc2626; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>${data.strategyName}</h1>
<p class="meta">回测期间: ${data.backtestPeriod.start} ~ ${data.backtestPeriod.end} &nbsp;|&nbsp; 生成时间: ${new Date().toLocaleString('zh-CN')}</p>

<h2>核心指标</h2>
<div class="metrics">
  <div class="metric">
    <div class="metric-label">总收益率</div>
    <div class="metric-value ${data.metrics.totalReturn >= 0 ? 'positive' : 'negative'}">${fmtPct(data.metrics.totalReturn)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">夏普比率</div>
    <div class="metric-value">${data.metrics.sharpeRatio.toFixed(3)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">最大回撤</div>
    <div class="metric-value negative">${fmtPct(data.metrics.maxDrawdown)}</div>
  </div>
  <div class="metric">
    <div class="metric-label">胜率</div>
    <div class="metric-value">${(data.metrics.winRate * 100).toFixed(1)}%</div>
  </div>
  <div class="metric">
    <div class="metric-label">交易次数</div>
    <div class="metric-value">${data.metrics.totalTrades}</div>
  </div>
  <div class="metric">
    <div class="metric-label">平均持仓天数</div>
    <div class="metric-value">${data.metrics.avgHoldingDays.toFixed(1)}</div>
  </div>
</div>

<h2>月度收益</h2>
<table>
  <thead><tr><th>月份</th><th>收益率</th></tr></thead>
  <tbody>
    ${data.monthlyReturns.map(m => `<tr><td>${m.month}</td><td class="${m.returnPct >= 0 ? 'positive' : 'negative'}">${fmtPct(m.returnPct)}</td></tr>`).join('\n    ')}
  </tbody>
</table>

<h2>交易记录</h2>
<table>
  <thead><tr><th>日期</th><th>代码</th><th>类型</th><th>价格</th><th>数量</th><th>盈亏</th></tr></thead>
  <tbody>
    ${data.trades.map(t => `<tr>
      <td>${t.date}</td>
      <td><strong>${t.symbol}</strong></td>
      <td class="${t.type === 'BUY' ? 'buy' : 'sell'}">${t.type === 'BUY' ? '买入' : '卖出'}</td>
      <td>$${t.price.toFixed(2)}</td>
      <td>${t.quantity}</td>
      <td class="${t.pnl >= 0 ? 'positive' : 'negative'}">${fmtPct(t.pnl / (t.price * t.quantity) * 100)}</td>
    </tr>`).join('\n    ')}
  </tbody>
</table>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => { win.print() }
  }
}

export function exportStrategyCSV(strategy: {
  name: string
  rules: { field: string; operator: string; value: number; weight: number }[]
}): void {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = [`# 策略: ${strategy.name}`, '', '# 规则', '字段,操作符,阈值,权重']
  strategy.rules.forEach(r => {
    lines.push([r.field, r.operator, r.value.toString(), r.weight.toString()].map(escape).join(','))
  })

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${strategy.name.replace(/\s+/g, '_')}_策略.csv`
  a.click()
  URL.revokeObjectURL(url)
}
