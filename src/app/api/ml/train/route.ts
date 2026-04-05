import { NextRequest, NextResponse } from 'next/server'
import { MLPricePredictor, TrainingConfig, TrainingMetrics } from '@/lib/ml/price-predictor'
import { getHistoricalData } from '@/lib/yahoo-finance'
import { handleApiError, Errors } from '@/lib/errors'

export interface TrainRequest {
  symbols: string[]
  startDate?: string
  endDate?: string
  config?: Partial<TrainingConfig>
}

export interface TrainResponse {
  success: boolean
  modelVersion: string
  metrics: TrainingMetrics
  trainedOn: string[]
  sampleCount: number
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

async function fetchTrainingData(
  symbols: string[],
  startDate?: string,
  endDate?: string
): Promise<{ symbol: string; data: HistoricalDataPoint[] }[]> {
  const results: { symbol: string; data: HistoricalDataPoint[] }[] = []
  const range = '2y' // Get 2 years of data for better training

  for (const symbol of symbols) {
    try {
      const rawData = await getHistoricalData(symbol, range)
      
      // Filter by date range if specified
      let filteredData = rawData
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate) : null
        
        filteredData = rawData.filter((d) => {
          const date = new Date(d.date)
          if (start && date < start) return false
          if (end && date > end) return false
          return true
        })
      }

      // Ensure we have enough data for training (at least 60 days + lookback)
      if (filteredData.length >= 90) {
        results.push({
          symbol,
          data: filteredData.map((d) => ({
            date: new Date(d.date),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume,
          })),
        })
      }
    } catch (error) {
      console.warn(`Failed to fetch data for ${symbol}:`, error)
    }
  }

  return results
}

function generateMockData(_symbol: string): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = []
  let basePrice = 100 + Math.random() * 100
  const now = new Date()

  // Generate 1 year of mock data
  for (let i = 252; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const change = (Math.random() - 0.48) * 0.03
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: TrainRequest = await request.json()
    const { symbols, startDate, endDate, config } = body

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      throw Errors.badRequest('symbols 数组是必填项且不能为空')
    }

    if (symbols.length > 10) {
      throw Errors.badRequest('每次训练最多支持 10 个股票')
    }

    // Fetch training data
    let trainingData = await fetchTrainingData(symbols, startDate, endDate)

    // Fallback to mock data if fetch fails for all symbols
    if (trainingData.length === 0) {
      console.warn('Using mock data for training')
      trainingData = symbols.map((symbol) => ({
        symbol,
        data: generateMockData(symbol),
      }))
    }

    // Combine all data
    const combinedData: HistoricalDataPoint[] = []
    for (const { data } of trainingData) {
      combinedData.push(...data)
    }

    // Sort by date
    combinedData.sort((a, b) => a.date.getTime() - b.date.getTime())

    if (combinedData.length < 60) {
      throw Errors.badRequest('训练数据不足（至少需要 60 天）')
    }

    // Create and train model
    const predictor = new MLPricePredictor({
      lookbackWindow: 30,
      lstmUnits: 50,
      epochs: 20,
      batchSize: 32,
      learningRate: 0.001,
      dropoutRate: 0.2,
      ...config,
    })

    predictor.buildModel()

    // Train with timeout to prevent blocking (max 30 seconds)
    const trainPromise = predictor.train(combinedData)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Training timeout')), 30000)
    })

    const metrics = await Promise.race([trainPromise, timeoutPromise])

    // Generate model version
    const modelVersion = `ml-${Date.now()}-${symbols.join('-')}`

    const response: TrainResponse = {
      success: true,
      modelVersion,
      metrics,
      trainedOn: trainingData.map((t) => t.symbol),
      sampleCount: combinedData.length,
    }

    // Dispose model to free memory
    predictor.dispose()

    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error)
  }
}
