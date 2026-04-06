import type { FactorPerformance } from '@/lib/factors/factor-metrics'

export interface ReportConfig {
  title: string
  generatedAt: Date
  period: { start: Date; end: Date }
  factors: FactorPerformance[]
  format: 'html' | 'json'
}

export interface GeneratedReport {
  html?: string
  json?: object
  filename: string
}

export class FactorReportGenerator {
  generateReport(config: ReportConfig): GeneratedReport {
    if (config.format === 'json') {
      return this.generateJSON(config)
    }
    return this.generateHTML(config)
  }

  private generateJSON(config: ReportConfig): GeneratedReport {
    return {
      json: {
        metadata: {
          title: config.title,
          generatedAt: config.generatedAt.toISOString(),
          period: {
            start: config.period.start.toISOString(),
            end: config.period.end.toISOString(),
          },
        },
        summary: this.calculateSummary(config.factors),
        factors: config.factors,
      },
      filename: `factor-report-${this.formatDate(config.generatedAt)}.json`,
    }
  }

  private generateHTML(config: ReportConfig): GeneratedReport {
    const summary = this.calculateSummary(config.factors)

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    header { margin-bottom: 40px; }
    h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 10px; }
    .meta { color: #666; font-size: 14px; }
    .meta span { margin-right: 20px; }
    
    section { 
      background: white; 
      border-radius: 8px; 
      padding: 24px; 
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h2 { font-size: 20px; margin-bottom: 16px; color: #1a1a1a; }
    
    .summary-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 16px; 
    }
    .summary-card { 
      background: #f8f9fa; 
      padding: 16px; 
      border-radius: 6px; 
      text-align: center;
    }
    .summary-card .label { 
      font-size: 12px; 
      color: #666; 
      text-transform: uppercase; 
      margin-bottom: 8px;
    }
    .summary-card .value { 
      font-size: 28px; 
      font-weight: 600; 
      color: #1a1a1a;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 14px;
    }
    th, td { 
      padding: 12px; 
      text-left: border-bottom: 1px solid #e5e5e5;
    }
    th { 
      background: #f8f9fa; 
      font-weight: 600; 
      color: #666;
      text-transform: uppercase;
      font-size: 12px;
    }
    code { 
      background: #f0f0f0; 
      padding: 2px 6px; 
      border-radius: 4px; 
      font-family: monospace;
      font-size: 12px;
    }
    
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    
    .rating { 
      display: inline-block; 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-size: 12px; 
      font-weight: 500;
    }
    .rating.excellent { background: #dcfce7; color: #166534; }
    .rating.good { background: #dbeafe; color: #1e40af; }
    .rating.fair { background: #fef3c7; color: #92400e; }
    .rating.poor { background: #fee2e2; color: #991b1b; }
    
    .methodology-content h3 { 
      font-size: 16px; 
      margin: 16px 0 8px;
      color: #444;
    }
    .methodology-content p { 
      color: #666; 
      margin-bottom: 12px;
    }
    .methodology-content ul { 
      list-style: none; 
      padding-left: 0;
    }
    .methodology-content li { 
      margin-bottom: 8px;
    }
    
    @media print {
      body { background: white; }
      section { box-shadow: none; border: 1px solid #e5e5e5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${config.title}</h1>
      <div class="meta">
        <span>生成时间: ${config.generatedAt.toLocaleString('zh-CN')}</span>
        <span>分析周期: ${config.period.start.toLocaleDateString('zh-CN')} 至 ${config.period.end.toLocaleDateString('zh-CN')}</span>
      </div>
    </header>
    
    <section class="summary">
      <h2>因子有效性摘要</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">分析因子数</div>
          <div class="value">${summary.totalFactors}</div>
        </div>
        <div class="summary-card">
          <div class="label">有效因子数</div>
          <div class="value ${summary.effectiveFactors > 0 ? 'positive' : ''}">${summary.effectiveFactors}</div>
        </div>
        <div class="summary-card">
          <div class="label">平均IC</div>
          <div class="value ${summary.avgIC >= 0 ? 'positive' : 'negative'}">${summary.avgIC.toFixed(3)}</div>
        </div>
        <div class="summary-card">
          <div class="label">平均IC_IR</div>
          <div class="value ${summary.avgICIR >= 0.5 ? 'positive' : ''}">${summary.avgICIR.toFixed(3)}</div>
        </div>
      </div>
    </section>
    
    <section class="factors">
      <h2>因子详细分析</h2>
      <table>
        <thead>
          <tr>
            <th>因子ID</th>
            <th>IC</th>
            <th>IC均值</th>
            <th>IC_IR</th>
            <th>正IC比例</th>
            <th>半衰期</th>
            <th>有效性评级</th>
          </tr>
        </thead>
        <tbody>
          ${config.factors.map(f => this.renderFactorRow(f)).join('')}
        </tbody>
      </table>
    </section>
    
    <section class="methodology">
      <h2>方法论说明</h2>
      <div class="methodology-content">
        <h3>IC (Information Coefficient)</h3>
        <p>因子值与下期收益的相关系数，取值范围[-1, 1]。绝对值越大表示预测能力越强。</p>
        
        <h3>IC_IR (IC Information Ratio)</h3>
        <p>IC均值除以IC标准差，衡量因子稳定性。通常IC_IR > 0.5认为有效。</p>
        
        <h3>半衰期</h3>
        <p>IC衰减至初始值50%所需天数，反映因子预测能力的持续性。</p>
        
        <h3>有效性评级</h3>
        <ul>
          <li><span class="rating excellent">优秀</span>: |IC| > 0.05 且 IC_IR > 0.5</li>
          <li><span class="rating good">良好</span>: |IC| > 0.03 且 IC_IR > 0.3</li>
          <li><span class="rating fair">一般</span>: |IC| > 0.02 且 IC_IR > 0.2</li>
          <li><span class="rating poor">较弱</span>: 其他情况</li>
        </ul>
      </div>
    </section>
  </div>
</body>
</html>`

    return {
      html,
      filename: `factor-report-${this.formatDate(config.generatedAt)}.html`,
    }
  }

  private calculateSummary(factors: FactorPerformance[]) {
    const totalFactors = factors.length
    const avgIC = totalFactors > 0
      ? factors.reduce((sum, f) => sum + f.ic, 0) / totalFactors
      : 0
    const avgICIR = totalFactors > 0
      ? factors.reduce((sum, f) => sum + f.icIr, 0) / totalFactors
      : 0
    const effectiveFactors = factors.filter(f =>
      Math.abs(f.ic) > 0.03 && f.icIr > 0.3
    ).length

    return {
      totalFactors,
      effectiveFactors,
      avgIC,
      avgICIR,
    }
  }

  private renderFactorRow(factor: FactorPerformance): string {
    const rating = this.getFactorRating(factor)

    return `
      <tr>
        <td><code>${factor.factorId}</code></td>
        <td class="${factor.ic > 0 ? 'positive' : 'negative'}">${factor.ic.toFixed(4)}</td>
        <td>${factor.icMean.toFixed(4)}</td>
        <td>${factor.icIr.toFixed(4)}</td>
        <td>${(factor.positiveRatio * 100).toFixed(1)}%</td>
        <td>${factor.decayHalfLife}天</td>
        <td><span class="rating ${rating.class}">${rating.label}</span></td>
      </tr>
    `
  }

  private getFactorRating(factor: FactorPerformance) {
    const absIC = Math.abs(factor.ic)
    const icIR = factor.icIr

    if (absIC > 0.05 && icIR > 0.5) return { label: '优秀', class: 'excellent' }
    if (absIC > 0.03 && icIR > 0.3) return { label: '良好', class: 'good' }
    if (absIC > 0.02 && icIR > 0.2) return { label: '一般', class: 'fair' }
    return { label: '较弱', class: 'poor' }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }
}
