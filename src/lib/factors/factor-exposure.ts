import type { FactorValue } from './factor-library'

export interface ExposurePoint {
  date: Date
  factorId: string
  symbol: string
  rawValue: number
  zScore: number
  percentile: number
}

export interface ExposureSeries {
  factorId: string
  symbol: string
  points: ExposurePoint[]
}

export interface CrossSectionSnapshot {
  date: Date
  factorId: string
  mean: number
  std: number
  exposures: {
    symbol: string
    rawValue: number
    zScore: number
    percentile: number
  }[]
}

export function computeCrossSectionExposure(
  factorValues: FactorValue[],
  windowDates?: Date[]
): CrossSectionSnapshot[] {
  if (factorValues.length === 0) return []

  const dates = windowDates || [...new Set(factorValues.map(fv => fv.date.getTime()))]
    .sort((a, b) => a - b)
    .map(t => new Date(t))

  const snapshots: CrossSectionSnapshot[] = []

  for (const date of dates) {
    const dateFactorValues = factorValues.filter(fv => fv.date.getTime() === date.getTime())
    if (dateFactorValues.length === 0) continue

    const values = dateFactorValues.map(fv => fv.value)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    const std = Math.sqrt(variance) || 1

    const sortedValues = [...values].sort((a, b) => a - b)

    const exposures = dateFactorValues.map(fv => {
      const zScore = (fv.value - mean) / std
      const rank = sortedValues.filter(v => v <= fv.value).length
      const percentile = (rank / sortedValues.length) * 100

      return {
        symbol: fv.symbol,
        rawValue: fv.value,
        zScore,
        percentile,
      }
    })

    snapshots.push({
      date,
      factorId: dateFactorValues[0].factorId,
      mean,
      std,
      exposures,
    })
  }

  return snapshots
}

export function getExposureTimeSeries(
  snapshots: CrossSectionSnapshot[],
  symbol: string
): { date: Date; zScore: number; percentile: number }[] {
  return snapshots
    .map(snapshot => {
      const exposure = snapshot.exposures.find(e => e.symbol === symbol)
      if (!exposure) return null
      return {
        date: snapshot.date,
        zScore: exposure.zScore,
        percentile: exposure.percentile,
      }
    })
    .filter((p): p is { date: Date; zScore: number; percentile: number } => p !== null)
}

export function computeFactorExposureTimeline(
  factorValues: FactorValue[],
  symbols: string[],
  windowDates?: Date[]
): Map<string, ExposureSeries[]> {
  const result = new Map<string, ExposureSeries[]>()

  const uniqueFactorIds = [...new Set(factorValues.map(fv => fv.factorId))]

  for (const factorId of uniqueFactorIds) {
    const factorIdValues = factorValues.filter(fv => fv.factorId === factorId)
    const snapshots = computeCrossSectionExposure(factorIdValues, windowDates)

    const seriesForFactor: ExposureSeries[] = symbols.map(symbol => ({
      factorId,
      symbol,
      points: snapshots
        .map(snapshot => {
          const exposure = snapshot.exposures.find(e => e.symbol === symbol)
          if (!exposure) return null
          return {
            date: snapshot.date,
            factorId,
            symbol,
            rawValue: exposure.rawValue,
            zScore: exposure.zScore,
            percentile: exposure.percentile,
          }
        })
        .filter((p): p is ExposurePoint => p !== null),
    }))

    result.set(factorId, seriesForFactor)
  }

  return result
}