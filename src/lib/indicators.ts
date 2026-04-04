export {
  IndicatorCalculator,
  calculateIndicators,
} from './indicators/calculator'

export { SignalDecorator } from './indicators/signal-decorator'

export type {
  HistoricalPrice,
  IndicatorConfig,
  IndicatorValue,
  CalculatedIndicators,
} from './indicators/calculator'

export type {
  TradeSignal,
  Annotation,
  DecoratedCandle,
  SignalConfig,
  Trade,
} from './indicators/signal-decorator'

export { SignalDecorator as SignalDecoratorClass } from './indicators/signal-decorator'

export interface IndicatorResult {
  ma?: { values: number[]; periods: number[] }
  ema?: { values: number[]; periods: number[] }
  rsi?: { values: number[]; periods: number[] }
  macd?: {
    macd: number[]
    signal: number[]
    histogram: number[]
    periods: number[]
  }
}
