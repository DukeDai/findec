import { NextRequest, NextResponse } from 'next/server'
import {
  MLPricePredictor,
  PredictionResult,
  getPricePredictor,
} from '@/lib/ml/price-predictor'
import { getHistoricalData } from '@/lib/yahoo-finance'

export interface PredictRequest {
  symbols: string[]
  modelVersion?: string
  lookbackDays?: number
}

export interface PredictResponse {
  success: boolean
  predictions: {
    symbol: string
    upProbability: number
    signal: 'BUY' | 'SELL' | 'HOLD'
    confidence: number
  }[]
  modelVersion?: string
  error?: string
}

interface HistoricalDataPoint {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function generateMockData(symbol: string, days: number): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  let basePrice = 100 + Math.random() * 100
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const change = (Math.random() - 0.48) * 0.02
    basePrice = basePrice * (1 + change)

    const volatility = basePrice * 0.02

    data.push({
      date,
      open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
      high: basePrice + volatility * Math.random(),
      low: basePrice - volatility * Math.random(),
      close: basePrice,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
    })
  }

  return data
}

async function fetchPredictionData(
  symbol: string,
  lookbackDays: number
): Promise<HistoricalDataPoint[]> {
  try {
    const range = lookbackDays <= 30 ? '1mo' : '3mo'
    const rawData = await getHistoricalData(symbol, range)

    if (rawData.length >= lookbackDays) {
      return rawData.slice(-lookbackDays).map((d) => ({
        date: new Date(d.date),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }))
    }
  } catch (error) {
    console.warn(`Failed to fetch data for ${symbol}:`, error)
  }

  return generateMockData(symbol, lookbackDays)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: PredictRequest = await request.json()
    const { symbols, modelVersion, lookbackDays = 30 } = body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'symbols array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (symbols.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 symbols allowed per prediction batch' },
        { status: 400 }
      )
    }

    const predictor = getPricePredictor()
    await predictor.loadModel()

    const predictions: PredictResponse['predictions'] = []

    for (const symbol of symbols) {
      try {
        const data = await fetchPredictionData(symbol, lookbackDays)

        if (data.length < lookbackDays) {
          predictions.push({
            symbol,
            upProbability: 0.5,
            signal: 'HOLD',
            confidence: 0,
          })
          continue
        }

        const ohlcv = data.map((d) => [d.open, d.high, d.low, d.close, d.volume])
        const result: PredictionResult = await predictor.predict(ohlcv)

        predictions.push({
          symbol,
          upProbability: result.upProbability,
          signal: result.signal,
          confidence: result.confidence,
        })
      } catch (error) {
        console.error(`Prediction error for ${symbol}:`, error)
        predictions.push({
          symbol,
          upProbability: 0.5,
          signal: 'HOLD',
          confidence: 0,
        })
      }
    }

    const response: PredictResponse = {
      success: true,
      predictions,
      modelVersion: modelVersion || 'default-mock',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json(
      {
        success: false,
        predictions: [],
        error: error instanceof Error ? error.message : 'Prediction failed',
      },
      { status: 500 }
    )
  }
}
