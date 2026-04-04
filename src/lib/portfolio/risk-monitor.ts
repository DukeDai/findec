import { randomUUID } from 'crypto'

export interface RiskThreshold {
  maxDrawdown: number
  maxConcentration: number
  maxVolatility: number
  maxVaR: number
  correlationWarning: number
}

export interface RiskAlert {
  id: string
  type: 'drawdown' | 'concentration' | 'volatility' | 'correlation' | 'var'
  severity: 'info' | 'warning' | 'critical'
  message: string
  current: number
  threshold: number
  recommendations: string[]
  triggeredAt: Date
}

export interface EquityPoint {
  date: Date
  value: number
}

export interface Position {
  symbol: string
  quantity: number
  currentPrice: number
  currentValue: number
}

export interface PortfolioState {
  positions: Position[]
  totalValue: number
}

export interface RiskMetrics {
  currentDrawdown: number
  maxConcentration: number
  annualizedVolatility: number
  var95: number
  avgCorrelation: number
}

export class RiskMonitor {
  private thresholds: RiskThreshold

  constructor(thresholds: RiskThreshold) {
    this.thresholds = thresholds
  }

  checkRisk(portfolio: PortfolioState, history: EquityPoint[]): RiskAlert[] {
    const alerts: RiskAlert[] = []

    const returns = this.calculateReturns(history)
    const returnsBySymbol = new Map<string, number[]>()

    for (const position of portfolio.positions) {
      returnsBySymbol.set(position.symbol, returns)
    }

    const drawdownAlert = this.checkDrawdown(history)
    if (drawdownAlert) alerts.push(drawdownAlert)

    const concentrationAlert = this.checkConcentration(portfolio.positions)
    if (concentrationAlert) alerts.push(concentrationAlert)

    const volatilityAlert = this.checkVolatility(returns)
    if (volatilityAlert) alerts.push(volatilityAlert)

    const varAlert = this.checkVaR(returns)
    if (varAlert) alerts.push(varAlert)

    const correlationAlert = this.checkCorrelation(returnsBySymbol)
    if (correlationAlert) alerts.push(correlationAlert)

    return alerts
  }

  checkDrawdown(equityCurve: EquityPoint[]): RiskAlert | null {
    if (equityCurve.length < 2) return null

    let peak = equityCurve[0].value
    let maxDrawdown = 0

    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value
      }
      const drawdown = (peak - point.value) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    if (maxDrawdown > this.thresholds.maxDrawdown) {
      const alert: RiskAlert = {
        id: randomUUID(),
        type: 'drawdown',
        severity: maxDrawdown > this.thresholds.maxDrawdown * 1.5 ? 'critical' : 'warning',
        message: `组合回撤达到 ${(maxDrawdown * 100).toFixed(2)}%，超过阈值 ${(this.thresholds.maxDrawdown * 100).toFixed(0)}%`,
        current: maxDrawdown,
        threshold: this.thresholds.maxDrawdown,
        recommendations: this.generateRecommendations({
          id: '',
          type: 'drawdown',
          severity: 'warning',
          message: '',
          current: maxDrawdown,
          threshold: this.thresholds.maxDrawdown,
          recommendations: [],
          triggeredAt: new Date(),
        }),
        triggeredAt: new Date(),
      }
      return alert
    }

    return null
  }

  checkConcentration(positions: Position[]): RiskAlert | null {
    if (positions.length === 0) return null

    const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0)
    if (totalValue === 0) return null

    let maxConcentration = 0
    let maxSymbol = ''

    for (const position of positions) {
      const concentration = position.currentValue / totalValue
      if (concentration > maxConcentration) {
        maxConcentration = concentration
        maxSymbol = position.symbol
      }
    }

    if (maxConcentration > this.thresholds.maxConcentration) {
      const alert: RiskAlert = {
        id: randomUUID(),
        type: 'concentration',
        severity: maxConcentration > this.thresholds.maxConcentration * 1.3 ? 'critical' : 'warning',
        message: `${maxSymbol} 持仓集中度为 ${(maxConcentration * 100).toFixed(2)}%，超过阈值 ${(this.thresholds.maxConcentration * 100).toFixed(0)}%`,
        current: maxConcentration,
        threshold: this.thresholds.maxConcentration,
        recommendations: this.generateRecommendations({
          id: '',
          type: 'concentration',
          severity: 'warning',
          message: '',
          current: maxConcentration,
          threshold: this.thresholds.maxConcentration,
          recommendations: [],
          triggeredAt: new Date(),
        }),
        triggeredAt: new Date(),
      }
      return alert
    }

    return null
  }

  checkVolatility(returns: number[]): RiskAlert | null {
    if (returns.length < 30) return null

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const volatility = Math.sqrt(variance) * Math.sqrt(252)

    if (volatility > this.thresholds.maxVolatility) {
      const alert: RiskAlert = {
        id: randomUUID(),
        type: 'volatility',
        severity: volatility > this.thresholds.maxVolatility * 1.2 ? 'critical' : 'warning',
        message: `组合年化波动率为 ${(volatility * 100).toFixed(2)}%，超过阈值 ${(this.thresholds.maxVolatility * 100).toFixed(0)}%`,
        current: volatility,
        threshold: this.thresholds.maxVolatility,
        recommendations: this.generateRecommendations({
          id: '',
          type: 'volatility',
          severity: 'warning',
          message: '',
          current: volatility,
          threshold: this.thresholds.maxVolatility,
          recommendations: [],
          triggeredAt: new Date(),
        }),
        triggeredAt: new Date(),
      }
      return alert
    }

    return null
  }

  checkVaR(returns: number[]): RiskAlert | null {
    if (returns.length < 100) return null

    const sorted = [...returns].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.05)
    const var95 = -sorted[index]

    if (var95 > this.thresholds.maxVaR) {
      const alert: RiskAlert = {
        id: randomUUID(),
        type: 'var',
        severity: var95 > this.thresholds.maxVaR * 1.5 ? 'critical' : 'warning',
        message: `组合95% VaR为 ${(var95 * 100).toFixed(2)}%，超过阈值 ${(this.thresholds.maxVaR * 100).toFixed(1)}%`,
        current: var95,
        threshold: this.thresholds.maxVaR,
        recommendations: this.generateRecommendations({
          id: '',
          type: 'var',
          severity: 'warning',
          message: '',
          current: var95,
          threshold: this.thresholds.maxVaR,
          recommendations: [],
          triggeredAt: new Date(),
        }),
        triggeredAt: new Date(),
      }
      return alert
    }

    return null
  }

  checkCorrelation(returns: Map<string, number[]>): RiskAlert | null {
    const symbols = Array.from(returns.keys())
    if (symbols.length < 2) return null

    let totalCorrelation = 0
    let count = 0

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const returns1 = returns.get(symbols[i]) || []
        const returns2 = returns.get(symbols[j]) || []

        if (returns1.length < 30 || returns2.length < 30) continue

        const correlation = this.calculateCorrelation(returns1, returns2)
        totalCorrelation += correlation
        count++
      }
    }

    if (count === 0) return null

    const avgCorrelation = totalCorrelation / count

    if (avgCorrelation > this.thresholds.correlationWarning) {
      const alert: RiskAlert = {
        id: randomUUID(),
        type: 'correlation',
        severity: avgCorrelation > 0.9 ? 'critical' : 'warning',
        message: `组合平均相关性为 ${(avgCorrelation * 100).toFixed(2)}%，超过阈值 ${(this.thresholds.correlationWarning * 100).toFixed(0)}%，分散化效果不足`,
        current: avgCorrelation,
        threshold: this.thresholds.correlationWarning,
        recommendations: this.generateRecommendations({
          id: '',
          type: 'correlation',
          severity: 'warning',
          message: '',
          current: avgCorrelation,
          threshold: this.thresholds.correlationWarning,
          recommendations: [],
          triggeredAt: new Date(),
        }),
        triggeredAt: new Date(),
      }
      return alert
    }

    return null
  }

  private calculateReturns(history: EquityPoint[]): number[] {
    if (history.length < 2) return []

    const returns: number[] = []
    for (let i = 1; i < history.length; i++) {
      const dailyReturn = (history[i].value - history[i - 1].value) / history[i - 1].value
      returns.push(dailyReturn)
    }
    return returns
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    if (n < 2) return 0

    const xSlice = x.slice(0, n)
    const ySlice = y.slice(0, n)

    const meanX = xSlice.reduce((sum, v) => sum + v, 0) / n
    const meanY = ySlice.reduce((sum, v) => sum + v, 0) / n

    let numerator = 0
    let denomX = 0
    let denomY = 0

    for (let i = 0; i < n; i++) {
      const diffX = xSlice[i] - meanX
      const diffY = ySlice[i] - meanY
      numerator += diffX * diffY
      denomX += diffX * diffX
      denomY += diffY * diffY
    }

    if (denomX === 0 || denomY === 0) return 0

    return numerator / Math.sqrt(denomX * denomY)
  }

  private generateRecommendations(alert: RiskAlert): string[] {
    const recommendations: string[] = []

    switch (alert.type) {
      case 'drawdown':
        recommendations.push(
          '考虑降低整体仓位，保留更多现金',
          '审视高风险持仓，适当减仓',
          '考虑增加防御性资产配置'
        )
        if (alert.current > this.thresholds.maxDrawdown * 1.5) {
          recommendations.push('回撤严重，建议暂停新增仓位')
        }
        break

      case 'concentration':
        recommendations.push(
          '分散持仓，降低单一股票占比',
          '考虑将超额部分利润兑现',
          '增加其他优质标的配置'
        )
        break

      case 'volatility':
        recommendations.push(
          '增加低波动性资产配置',
          '考虑使用期权等工具对冲风险',
          '减少高Beta股票持仓'
        )
        break

      case 'var':
        recommendations.push(
          '降低组合整体风险暴露',
          '增加现金或短债等安全资产',
          '审视并调整止损设置'
        )
        break

      case 'correlation':
        recommendations.push(
          '增加不同行业、风格的资产配置',
          '考虑配置负相关资产（如债券、黄金）',
          '避免过度集中于相似主题的股票'
        )
        break
    }

    return recommendations
  }

  getThresholds(): RiskThreshold {
    return { ...this.thresholds }
  }

  updateThresholds(thresholds: Partial<RiskThreshold>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }
}

export function getDefaultThresholds(): RiskThreshold {
  return {
    maxDrawdown: 0.15,
    maxConcentration: 0.30,
    maxVolatility: 0.25,
    maxVaR: 0.05,
    correlationWarning: 0.80,
  }
}

export function calculateRiskMetrics(
  portfolio: PortfolioState,
  history: EquityPoint[]
): RiskMetrics {
  const monitor = new RiskMonitor(getDefaultThresholds())
  const returns = history.length >= 2
    ? history.slice(1).map((point, i) => (point.value - history[i].value) / history[i].value)
    : []

  const drawdownAlert = monitor.checkDrawdown(history)
  const concentrationAlert = monitor.checkConcentration(portfolio.positions)
  const volatilityAlert = monitor.checkVolatility(returns)
  const varAlert = monitor.checkVaR(returns)

  const returnsBySymbol = new Map<string, number[]>()
  for (const position of portfolio.positions) {
    returnsBySymbol.set(position.symbol, returns)
  }
  const correlationAlert = monitor.checkCorrelation(returnsBySymbol)

  return {
    currentDrawdown: drawdownAlert?.current || 0,
    maxConcentration: concentrationAlert?.current || portfolio.positions.length > 0
      ? Math.max(...portfolio.positions.map(p => p.currentValue / portfolio.totalValue))
      : 0,
    annualizedVolatility: volatilityAlert?.current || 0,
    var95: varAlert?.current || 0,
    avgCorrelation: correlationAlert?.current || 0,
  }
}
