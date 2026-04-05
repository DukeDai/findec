import { NextRequest, NextResponse } from 'next/server'
import { getHistoricalData, YahooFinanceError } from '@/lib/yahoo-finance'
import {
  IndicatorCalculator,
  IndicatorConfig,
} from '@/lib/indicators/calculator'
import { generateMockHistoricalData } from '@/lib/data/data-source'
import { handleApiError, Errors } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol')
    const indicators = request.nextUrl.searchParams.get('indicators') || 'ma20,rsi'

    if (!symbol) {
      throw Errors.badRequest('股票代码是必填项')
    }

    const normalizedSymbol = symbol.toUpperCase()
    let data

    try {
      data = await getHistoricalData(normalizedSymbol, '1y')
    } catch (error) {
      console.warn('Yahoo Finance API failed, generating mock data:', error)
      data = generateMockHistoricalData(normalizedSymbol, '1y')
    }

    if (data.length === 0) {
      throw Errors.notFound('没有可用数据')
    }

    const indicatorList = indicators.split(',')
    const config: IndicatorConfig = {}

    for (const ind of indicatorList) {
      const trimmed = ind.trim().toLowerCase()

      if (trimmed.startsWith('ma')) {
        const period = parseInt(trimmed.replace('ma', ''))
        if (!isNaN(period)) {
          config.ma = [...(config.ma || []), period]
        }
      } else if (trimmed.startsWith('ema')) {
        const period = parseInt(trimmed.replace('ema', ''))
        if (!isNaN(period)) {
          config.ema = [...(config.ema || []), period]
        }
      } else if (trimmed === 'rsi') {
        config.rsi = { period: 14 }
      } else if (trimmed.startsWith('rsi')) {
        const period = parseInt(trimmed.replace('rsi', ''))
        if (!isNaN(period)) {
          config.rsi = { period }
        }
      } else if (trimmed === 'macd') {
        config.macd = { fast: 12, slow: 26, signal: 9 }
      } else if (trimmed.startsWith('atr')) {
        const period = parseInt(trimmed.replace('atr', ''))
        config.atr = { period: !isNaN(period) ? period : 14 }
      } else if (trimmed.startsWith('adx')) {
        const period = parseInt(trimmed.replace('adx', ''))
        config.adx = { period: !isNaN(period) ? period : 14 }
      } else if (trimmed.startsWith('bollinger')) {
        const params = trimmed.replace('bollinger', '').split(',')
        const period = parseInt(params[0])
        const stdDev = parseFloat(params[1])
        config.bollinger = {
          period: !isNaN(period) ? period : 20,
          stdDev: !isNaN(stdDev) ? stdDev : 2,
        }
      } else if (trimmed.startsWith('bb')) {
        const params = trimmed.replace('bb', '').split(',')
        const period = parseInt(params[0])
        const stdDev = parseFloat(params[1])
        config.bollinger = {
          period: !isNaN(period) ? period : 20,
          stdDev: !isNaN(stdDev) ? stdDev : 2,
        }
      } else if (trimmed === 'stoch' || trimmed === 'stochastic') {
        config.stochastic = { kPeriod: 14, dPeriod: 3, smooth: 3 }
      } else if (trimmed.startsWith('stoch')) {
        const params = trimmed.replace('stoch', '').split(',')
        const kPeriod = parseInt(params[0])
        const dPeriod = parseInt(params[1])
        config.stochastic = {
          kPeriod: !isNaN(kPeriod) ? kPeriod : 14,
          dPeriod: !isNaN(dPeriod) ? dPeriod : 3,
          smooth: 3,
        }
      } else if (trimmed === 'obv') {
        config.obv = true
      }
    }

    const calculator = new IndicatorCalculator()
    const result = calculator.calculate(data, config)

    const serializedResult = {
      ma: Object.fromEntries(result.ma),
      ema: Object.fromEntries(result.ema),
      rsi: result.rsi,
      macd: result.macd,
      bollinger: result.bollinger,
      atr: result.atr,
      adx: result.adx,
      stoch: result.stoch,
      obv: result.obv,
    }

    return NextResponse.json({
      symbol: normalizedSymbol,
      indicators: serializedResult,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
