import type { HistoricalPrice } from '@/lib/indicators'

export interface PriceConfig {
  symbol: string
  startPrice: number
  days: number
  trend?: number
  volatility?: number
  startDate?: Date
}

export function generateMockPriceData(config: PriceConfig): HistoricalPrice[] {
  const data: HistoricalPrice[] = []
  let price = config.startPrice
  const volatility = config.volatility ?? 0.02
  const trend = config.trend ?? 0
  const startDate = config.startDate ?? new Date('2024-01-01')

  for (let i = 0; i < config.days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)

    const randomChange = (Math.random() - 0.5) * 2 * volatility
    const trendChange = trend / 252
    price = price * (1 + randomChange + trendChange)

    const dailyVolatility = price * volatility * 0.5
    const open = price * (1 + (Math.random() - 0.5) * 0.01)
    const high = Math.max(open, price) + Math.random() * dailyVolatility
    const low = Math.min(open, price) - Math.random() * dailyVolatility

    data.push({
      date,
      open,
      high,
      low,
      close: price,
      volume: Math.floor(1000000 + Math.random() * 5000000),
    })
  }

  return data
}

export function generateTrendingData(
  symbol: string,
  days: number,
  trend: 'up' | 'down' | 'sideways' = 'up'
): HistoricalPrice[] {
  const trendMap = { up: 0.15, down: -0.15, sideways: 0 }
  return generateMockPriceData({
    symbol,
    startPrice: 100,
    days,
    trend: trendMap[trend],
    volatility: 0.015,
  })
}

export function generateFactorValues(
  count: number,
  correlation: number = 0.5
): { values: number[]; returns: number[] } {
  const values: number[] = []
  const returns: number[] = []

  for (let i = 0; i < count; i++) {
    const factorValue = (Math.random() - 0.5) * 2
    const noise = (Math.random() - 0.5) * (1 - Math.abs(correlation))
    const forwardReturn = factorValue * correlation + noise

    values.push(factorValue)
    returns.push(forwardReturn)
  }

  return { values, returns }
}

export function generateFlatData(symbol: string, days: number, basePrice: number = 100): HistoricalPrice[] {
  return generateMockPriceData({
    symbol,
    startPrice: basePrice,
    days,
    trend: 0,
    volatility: 0.005,
  })
}

export function generateVolatileData(symbol: string, days: number, basePrice: number = 100): HistoricalPrice[] {
  return generateMockPriceData({
    symbol,
    startPrice: basePrice,
    days,
    trend: 0,
    volatility: 0.05,
  })
}
