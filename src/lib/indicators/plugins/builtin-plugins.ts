import { registerIndicator, type IndicatorPlugin } from '../registry'
import type { HistoricalPrice } from '../calculator'

export const HullMovingAveragePlugin: IndicatorPlugin = {
  name: 'HMA',
  compute: (data: HistoricalPrice[]) => {
    const period = 20
    const closes = data.map(d => d.close)
    const halfLength = Math.floor(period / 2)
    const sqrtLength = Math.floor(Math.sqrt(period))

    const hmaValues: number[] = []

    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        hmaValues.push(closes[i])
        continue
      }

      let sum = 0
      for (let j = 0; j < halfLength; j++) {
        sum += closes[i - j]
      }
      const halfWma = sum / halfLength

      sum = 0
      for (let j = 0; j < period; j++) {
        sum += closes[i - j]
      }
      const fullWma = sum / period

      const rawHma = 2 * halfWma - fullWma

      sum = 0
      for (let j = 0; j < sqrtLength; j++) {
        const idx = i - halfLength + 1 + j
        if (idx >= 0 && idx < closes.length) {
          let s = 0
          for (let k = 0; k < sqrtLength; k++) {
            const sidx = idx - k
            if (sidx >= 0 && sidx < closes.length) {
              s += closes[sidx]
            }
          }
          sum += (sqrtLength - j) * (s / sqrtLength)
        }
      }

      const normalizedHma = sqrtLength > 0 ? sum / (sqrtLength * (sqrtLength + 1) / 2) : rawHma
      hmaValues.push(normalizedHma)
    }

    const values: (number | null)[] = new Array(data.length).fill(null)
    for (let i = period - 1; i < hmaValues.length && i < data.length; i++) {
      values[i] = hmaValues[i]
    }

    let latest: number | null = null
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i] !== null) {
        latest = values[i]
        break
      }
    }

    return [{
      name: `HMA${period}`,
      period,
      values,
      latest,
    }]
  },
}

export const SuperTrendPlugin: IndicatorPlugin = {
  name: 'SuperTrend',
  compute: (data: HistoricalPrice[], config?: Record<string, unknown>) => {
    const period = (config?.period as number) || 10
    const multiplier = (config?.multiplier as number) || 3

    const atrPeriod = period
    const trs: number[] = []
    const atrValues: number[] = []

    for (let i = 0; i < data.length; i++) {
      const high = data[i].high
      const low = data[i].low

      if (i === 0) {
        trs.push(high - low)
      } else {
        const hl = high - low
        const hpc = Math.abs(high - data[i - 1].close)
        const lpc = Math.abs(low - data[i - 1].close)
        trs.push(Math.max(hl, hpc, lpc))
      }
    }

    let atr = 0
    for (let i = 0; i < atrPeriod && i < trs.length; i++) {
      atr += trs[i]
    }
    atr /= atrPeriod

    for (let i = 0; i < data.length; i++) {
      if (i >= atrPeriod) {
        atr = (atr * (atrPeriod - 1) + trs[i]) / atrPeriod
      }
      atrValues.push(atr)
    }

    const upperBand: (number | null)[] = new Array(data.length).fill(null)
    const lowerBand: (number | null)[] = new Array(data.length).fill(null)
    const superTrend: (number | null)[] = new Array(data.length).fill(null)

    for (let i = 0; i < data.length; i++) {
      const hl2 = (data[i].high + data[i].low) / 2
      upperBand[i] = hl2 + multiplier * atrValues[i]
      lowerBand[i] = hl2 - multiplier * atrValues[i]
    }

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        superTrend[i] = lowerBand[i]
        continue
      }

      const currClose = data[i].close

      if (superTrend[i - 1] === null) {
        superTrend[i] = lowerBand[i]
      } else if (superTrend[i - 1] === upperBand[i - 1]) {
        if (currClose < (upperBand[i] ?? 0)) {
          superTrend[i] = upperBand[i]
        } else {
          superTrend[i] = lowerBand[i]
        }
      } else {
        if (currClose > (lowerBand[i] ?? 0)) {
          superTrend[i] = lowerBand[i]
        } else {
          superTrend[i] = upperBand[i]
        }
      }
    }

    let latest: number | null = null
    for (let i = superTrend.length - 1; i >= 0; i--) {
      if (superTrend[i] !== null) {
        latest = superTrend[i]
        break
      }
    }

    return [{
      name: `SuperTrend`,
      period,
      values: superTrend,
      latest,
    }]
  },
}

registerIndicator(HullMovingAveragePlugin)
registerIndicator(SuperTrendPlugin)