export interface PortfolioMetrics {
  totalValue: number
  totalCost: number
  totalReturn: number
  totalReturnPercent: number
  dailyChange: number
  dailyChangePercent: number
  positions: PositionMetrics[]
  allocation: AllocationItem[]
  topGainers: PositionMetrics[]
  topLosers: PositionMetrics[]
}

export interface PositionMetrics {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  currentValue: number
  totalCost: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  dailyChange: number
  dailyChangePercent: number
  weight: number
}

export interface AllocationItem {
  symbol: string
  value: number
  weight: number
}

export async function calculatePortfolioMetrics(
  portfolioId: string
): Promise<PortfolioMetrics | null> {
  const { prisma } = await import('@/lib/prisma')

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
    include: {
      positions: true,
    },
  })

  if (!portfolio) return null

  let totalValue = 0
  let totalCost = 0
  let dailyChange = 0
  const positionMetrics: PositionMetrics[] = []

  for (const position of portfolio.positions) {
    const response = await fetch(
      `http://localhost:3000/api/quotes?symbol=${position.symbol}`
    )

    const quote = response.ok ? await response.json() : {}
    const currentPrice = quote.price || quote.regularMarketPrice || position.avgCost
    const previousClose = quote.previousClose || currentPrice
    const dailyChangeVal = currentPrice - previousClose
    const dailyChangePct = (dailyChangeVal / previousClose) * 100

    const currentValue = position.quantity * currentPrice
    const cost = position.quantity * position.avgCost
    const unrealizedPnL = currentValue - cost
    const unrealizedPnLPct = cost > 0 ? (unrealizedPnL / cost) * 100 : 0

    totalValue += currentValue
    totalCost += cost
    dailyChange += position.quantity * dailyChangeVal

    positionMetrics.push({
      symbol: position.symbol,
      quantity: position.quantity,
      avgCost: position.avgCost,
      currentPrice,
      currentValue,
      totalCost: cost,
      unrealizedPnL,
      unrealizedPnLPercent: unrealizedPnLPct,
      dailyChange: position.quantity * dailyChangeVal,
      dailyChangePercent: dailyChangePct,
      weight: 0,
    })
  }

  const totalReturn = totalValue - totalCost
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0
  const dailyChangePercent = totalValue > 0 ? (dailyChange / (totalValue - dailyChange)) * 100 : 0

  const allocation: AllocationItem[] = positionMetrics.map(p => ({
    symbol: p.symbol,
    value: p.currentValue,
    weight: totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0,
  }))

  positionMetrics.forEach(p => {
    p.weight = totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0
  })

  const sortedByReturn = [...positionMetrics].sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent)

  return {
    totalValue,
    totalCost,
    totalReturn,
    totalReturnPercent,
    dailyChange,
    dailyChangePercent,
    positions: positionMetrics,
    allocation,
    topGainers: sortedByReturn.filter(p => p.unrealizedPnLPercent > 0).slice(0, 3),
    topLosers: sortedByReturn.filter(p => p.unrealizedPnLPercent < 0).slice(-3).reverse(),
  }
}