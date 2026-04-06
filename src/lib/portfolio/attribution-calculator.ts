export interface AttributionPeriod {
  startDate: Date
  endDate: Date
}

export interface PositionAttribution {
  symbol: string
  allocation: number
  return: number
  contribution: number
  attributionPct: number
  category: 'outperform' | 'underperform' | 'neutral'
}

export interface AttributionSummary {
  totalReturn: number
  positions: PositionAttribution[]
  topContributors: PositionAttribution[]
  bottomContributors: PositionAttribution[]
  concentrationRisk: number
}

export interface PositionData {
  symbol: string
  quantity: number
  entryPrice: number
  currentPrice: number
}

export class AttributionCalculator {
  calculateAttribution(
    positions: PositionData[],
    period: AttributionPeriod
  ): AttributionSummary {
    const positionAttributions: PositionAttribution[] = []

    const totalValue = positions.reduce(
      (sum, p) => sum + p.quantity * p.currentPrice,
      0
    )

    for (const position of positions) {
      const currentValue = position.quantity * position.currentPrice
      const entryValue = position.quantity * position.entryPrice
      const positionReturn = entryValue > 0
        ? ((currentValue - entryValue) / entryValue) * 100
        : 0

      const allocation = totalValue > 0 ? (currentValue / totalValue) * 100 : 0
      const contribution = (positionReturn * allocation) / 100

      let category: 'outperform' | 'underperform' | 'neutral' = 'neutral'
      if (positionReturn > 5) category = 'outperform'
      else if (positionReturn < -5) category = 'underperform'

      positionAttributions.push({
        symbol: position.symbol,
        allocation,
        return: positionReturn,
        contribution,
        attributionPct: 0,
        category,
      })
    }

    const totalReturn = positionAttributions.reduce((sum, p) => sum + p.contribution, 0)

    positionAttributions.forEach(p => {
      p.attributionPct = totalReturn !== 0 ? (p.contribution / totalReturn) * 100 : 0
    })

    const sorted = [...positionAttributions].sort((a, b) => b.contribution - a.contribution)
    const topContributors = sorted.slice(0, 3)
    const bottomContributors = sorted.slice(-3).reverse()

    const hhi = positionAttributions.reduce((sum, p) => {
      const weight = p.allocation / 100
      return sum + weight * weight
    }, 0)
    const concentrationRisk = Math.min(hhi * 100, 100)

    return {
      totalReturn,
      positions: positionAttributions,
      topContributors,
      bottomContributors,
      concentrationRisk,
    }
  }
}
