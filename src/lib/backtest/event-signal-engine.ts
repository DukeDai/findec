import type { HistoricalPrice } from '@/lib/indicators'

export type EventType = 'earnings' | 'dividend' | 'split' | 'fomc' | 'cpi' | 'earnings_preview'

export interface PriceEvent {
  symbol: string
  date: Date
  type: EventType
  value?: number
  description?: string
}

export interface EventSignal {
  type: 'BUY' | 'SELL' | 'HOLD'
  reason: string
  event: PriceEvent
  confidence: number
  expectedMove?: number
}

export interface EventImpactModel {
  type: EventType
  name: string
  description: string
  defaultImpactDays: number
  defaultUpMove?: number
  defaultDownMove?: number
}

export const EVENT_IMPACT_MODELS: Record<EventType, EventImpactModel> = {
  earnings: {
    type: 'earnings',
    name: '财报发布',
    description: '季度财报发布后的价格反应，超预期上涨/不及预期下跌',
    defaultImpactDays: 5,
    defaultUpMove: 0.05,
    defaultDownMove: -0.05,
  },
  earnings_preview: {
    type: 'earnings_preview',
    name: '财报预测',
    description: '分析师在财报前发布预测，影响市场预期',
    defaultImpactDays: 3,
    defaultUpMove: 0.02,
    defaultDownMove: -0.03,
  },
  dividend: {
    type: 'dividend',
    name: '分红除权',
    description: '除权除息导致的价格调整',
    defaultImpactDays: 1,
    defaultDownMove: -0.01,
  },
  split: {
    type: 'split',
    name: '拆股/合股',
    description: '股票拆分或合并后的价格调整',
    defaultImpactDays: 1,
  },
  fomc: {
    type: 'fomc',
    name: '美联储FOMC',
    description: '美联储利率决议，影响整体市场波动',
    defaultImpactDays: 3,
    defaultUpMove: 0.015,
    defaultDownMove: -0.015,
  },
  cpi: {
    type: 'cpi',
    name: 'CPI通胀数据',
    description: '通胀数据发布影响市场对利率的预期',
    defaultImpactDays: 2,
    defaultUpMove: 0.01,
    defaultDownMove: -0.01,
  },
}

export class EventSignalEngine {
  private events: PriceEvent[] = []
  private eventSignals: Map<string, EventSignal[]> = new Map()
  private impactDays: Record<EventType, number> = {
    earnings: 5,
    earnings_preview: 3,
    dividend: 1,
    split: 1,
    fomc: 3,
    cpi: 2,
  }

  loadEvents(events: PriceEvent[]) {
    this.events = events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  addMockEarningsEvents(symbols: string[], data: HistoricalPrice[]) {
    const earningsDates: PriceEvent[] = []
    for (const symbol of symbols) {
      let quarter = 0
      const baseDate = new Date(data[0]?.date ?? new Date())
      baseDate.setMonth(baseDate.getMonth() - 12)
      for (let i = 0; i < 8; i++) {
        const eventDate = new Date(baseDate)
        eventDate.setMonth(eventDate.getMonth() + i * 3 + Math.floor(Math.random() * 2))
        if (eventDate <= new Date()) {
          const surprise = (Math.random() - 0.45) * 0.1
          earningsDates.push({
            symbol,
            date: eventDate,
            type: 'earnings',
            value: surprise,
            description: `Q${(i % 4) + 1} 财报 ${surprise > 0 ? '超预期' : '不及预期'}`,
          })
          quarter++
        }
      }
    }
    this.events.push(...earningsDates)
  }

  addMockMacroEvents(data: HistoricalPrice[]) {
    const firstDate = data[0]?.date ?? new Date()
    const lastDate = data[data.length - 1]?.date ?? new Date()
    const macroEvents: PriceEvent[] = []

    const current = new Date(firstDate)
    while (current <= lastDate) {
      if (current.getMonth() === 0 || current.getMonth() === 3 ||
          current.getMonth() === 6 || current.getMonth() === 9) {
        macroEvents.push({
          symbol: 'SPY',
          date: new Date(current),
          type: 'fomc',
          value: (Math.random() - 0.5) * 0.02,
          description: 'FOMC 利率决议',
        })
      }
      if (current.getMonth() % 3 === 0 && current.getDate() > 5 && current.getDate() < 20) {
        macroEvents.push({
          symbol: 'SPY',
          date: new Date(current),
          type: 'cpi',
          value: (Math.random() - 0.5) * 0.01,
          description: 'CPI 通胀数据',
        })
      }
      current.setMonth(current.getMonth() + 1)
    }
    this.events.push(...macroEvents)
  }

  getEventsInRange(startDate: Date, endDate: Date): PriceEvent[] {
    return this.events.filter(e =>
      e.date >= startDate && e.date <= endDate
    )
  }

  generateEventSignals(symbol: string, currentDate: Date, historicalData: HistoricalPrice[]): EventSignal | null {
    const relevantEvents = this.events.filter(e =>
      e.symbol === symbol || e.symbol === 'SPY'
    )

    for (const event of relevantEvents) {
      const daysDiff = Math.floor(
        (currentDate.getTime() - event.date.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDiff < 0) continue

      const impactDays = this.impactDays[event.type] ?? 3
      if (daysDiff > impactDays) continue

      const progress = daysDiff / impactDays
      let confidence = 1 - progress
      let expectedMove = 0
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
      let reason = ''

      if (event.type === 'earnings' && event.value !== undefined) {
        expectedMove = event.value > 0
          ? (EVENT_IMPACT_MODELS.earnings.defaultUpMove ?? 0.05) * confidence
          : (EVENT_IMPACT_MODELS.earnings.defaultDownMove ?? -0.05) * confidence

        if (event.value > 0) {
          signal = 'BUY'
          reason = `财报超预期 +${(event.value * 100).toFixed(1)}%，预计上涨 ${(expectedMove * 100).toFixed(1)}%`
        } else {
          signal = 'SELL'
          reason = `财报不及预期 ${(event.value * 100).toFixed(1)}%，预计下跌 ${(Math.abs(expectedMove) * 100).toFixed(1)}%`
        }
        confidence *= 0.8
      } else if (event.type === 'fomc' && event.value !== undefined) {
        expectedMove = (event.value ?? 0) * confidence
        if (event.value > 0) {
          signal = 'BUY'
          reason = 'FOMC 宽松预期，上涨信号'
        } else {
          signal = 'SELL'
          reason = 'FOMC 紧缩预期，下跌信号'
        }
        confidence *= 0.5
      } else if (event.type === 'cpi') {
        const cpiValue = event.value ?? 0
        if (cpiValue < -0.005) {
          signal = 'BUY'
          reason = 'CPI 低于预期，通胀缓解'
          expectedMove = 0.01 * confidence
        } else if (cpiValue > 0.005) {
          signal = 'SELL'
          reason = 'CPI 高于预期，通胀担忧'
          expectedMove = -0.01 * confidence
        } else {
          signal = 'HOLD'
          reason = 'CPI 符合预期'
        }
        confidence *= 0.4
      } else if (event.type === 'dividend') {
        signal = 'HOLD'
        reason = `除权除息日，价格调整 ${event.value ? `${(event.value * 100).toFixed(1)}%` : ''}`
        expectedMove = (event.value ?? -0.01) * confidence
        confidence *= 0.2
      }

      if (confidence < 0.1) continue

      return {
        type: signal,
        reason,
        event,
        confidence,
        expectedMove,
      }
    }

    return null
  }

  getEventCalendar(symbol: string, startDate: Date, endDate: Date): PriceEvent[] {
    return this.events.filter(e =>
      (e.symbol === symbol || e.symbol === 'SPY') &&
      e.date >= startDate &&
      e.date <= endDate
    ).sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  setImpactDays(type: EventType, days: number) {
    this.impactDays[type] = days
  }
}
