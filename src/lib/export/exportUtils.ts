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

export function exportBacktestPDF(data: BacktestReportData): void {
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
  const fmtNum = (v: number, decimals = 2) => v.toFixed(decimals)

  const rowsPerPage = 20
  const tradePages: string[] = []
  for (let i = 0; i < data.trades.length; i += rowsPerPage) {
    const page = data.trades.slice(i, i + rowsPerPage)
    tradePages.push(`<table class="trade-table">
  <thead><tr><th>日期</th><th>代码</th><th>类型</th><th>价格</th><th>数量</th><th>盈亏率</th></tr></thead>
  <tbody>
    ${page.map(t => `<tr>
      <td>${t.date}</td>
      <td class="symbol">${t.symbol}</td>
      <td class="${t.type === 'BUY' ? 'buy' : 'sell'}">${t.type === 'BUY' ? '买入' : '卖出'}</td>
      <td>$${fmtNum(t.price)}</td>
      <td>${t.quantity}</td>
      <td class="${t.pnl >= 0 ? 'positive' : 'negative'}">${fmtPct(t.pnl / (t.price * t.quantity) * 100)}</td>
    </tr>`).join('\n    ')}
  </tbody>
</table>`)
  }

  const metricCards = [
    { label: '总收益率', value: fmtPct(data.metrics.totalReturn), cls: data.metrics.totalReturn >= 0 ? 'positive' : 'negative' },
    { label: '夏普比率', value: fmtNum(data.metrics.sharpeRatio, 3), cls: '' },
    { label: '最大回撤', value: fmtPct(data.metrics.maxDrawdown), cls: 'negative' },
    { label: '胜率', value: `${(data.metrics.winRate * 100).toFixed(1)}%`, cls: '' },
    { label: '交易次数', value: String(data.metrics.totalTrades), cls: '' },
    { label: '平均持仓天数', value: `${fmtNum(data.metrics.avgHoldingDays, 1)}天`, cls: '' },
  ]

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${data.strategyName} 回测报告</title>
<style>
  @page { margin: 20mm 15mm; size: A4 portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; background: #fff; }
  .header { border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .header .meta { color: #666; font-size: 10px; margin-top: 4px; display: flex; gap: 16px; flex-wrap: wrap; }
  .section { margin-bottom: 24px; page-break-inside: avoid; }
  .section-title { font-size: 13px; font-weight: 700; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .metric-card { border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px 12px; }
  .metric-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
  .metric-value { font-size: 16px; font-weight: 700; line-height: 1.2; }
  .positive { color: #16a34a; }
  .negative { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; }
  tr:nth-child(even) td { background: #fafafa; }
  .symbol { font-weight: 700; }
  .buy { color: #16a34a; font-weight: 600; }
  .sell { color: #dc2626; font-weight: 600; }
  .footer { border-top: 1px solid #d1d5db; padding-top: 10px; margin-top: 20px; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
  .month-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .month-cell { padding: 4px 6px; border-radius: 3px; text-align: center; font-size: 9px; font-weight: 600; }
  .month-label { font-size: 9px; color: #666; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
  <h1>${data.strategyName}</h1>
  <div class="meta">
    <span>回测期间: ${data.backtestPeriod.start} ~ ${data.backtestPeriod.end}</span>
    <span>生成时间: ${new Date().toLocaleString('zh-CN')}</span>
    <span>FinDec 量化分析平台</span>
  </div>
</div>

<div class="section">
  <div class="section-title">核心指标</div>
  <div class="metrics-grid">
    ${metricCards.map(m => `<div class="metric-card"><div class="metric-label">${m.label}</div><div class="metric-value ${m.cls}">${m.value}</div></div>`).join('\n    ')}
  </div>
</div>

<div class="section">
  <div class="section-title">月度收益</div>
  <table>
    <thead><tr><th>月份</th><th>收益率</th><th>月份</th><th>收益率</th></tr></thead>
    <tbody>
      ${Array.from({ length: Math.ceil(data.monthlyReturns.length / 2) }, (_, i) => {
        const a = data.monthlyReturns[i * 2]
        const b = data.monthlyReturns[i * 2 + 1]
        return `<tr>
          <td>${a?.month ?? ''}</td>
          <td class="${(a?.returnPct ?? 0) >= 0 ? 'positive' : 'negative'}">${a ? fmtPct(a.returnPct) : ''}</td>
          <td>${b?.month ?? ''}</td>
          <td class="${(b?.returnPct ?? 0) >= 0 ? 'positive' : 'negative'}">${b ? fmtPct(b.returnPct) : ''}</td>
        </tr>`
      }).join('\n    ')}
    </tbody>
  </table>
</div>

${tradePages.map((table, idx) => `
<div class="section">
  <div class="section-title">交易记录 ${tradePages.length > 1 ? `(${idx + 1}/${tradePages.length})` : ''}</div>
  ${table}
</div>`).join('\n')}

<div class="footer">
  <span>由 FinDec 美股量化分析平台自动生成</span>
  <span>第 {{page}} 页 / 共 {{totalPages}} 页</span>
</div>

</body>
</html>`

  const totalPages = tradePages.length + 2
  const finalHtml = html.replace(/{{page}}/g, 'PAGE').replace(/{{totalPages}}/g, String(totalPages))

  const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank', 'width=900,height=700')
  if (win) {
    win.onload = () => {
      win.print()
    }
  }
}
