/**
 * ML Price Predictor - TensorFlow.js LSTM Model
 * 
 * Provides price direction prediction using LSTM neural network.
 * Uses past N days of OHLCV data to predict probability of price increase.
 * Falls back to mock predictions if model fails to load.
 */

import * as tf from '@tensorflow/tfjs'

export interface PredictionResult {
  upProbability: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
}

export interface TrainingConfig {
  lookbackWindow: number
  lstmUnits: number
  epochs: number
  batchSize: number
  learningRate: number
  dropoutRate: number
}

export interface TrainingMetrics {
  loss: number
  accuracy: number
  valLoss: number
  valAccuracy: number
}

const DEFAULT_CONFIG: TrainingConfig = {
  lookbackWindow: 30,
  lstmUnits: 50,
  epochs: 50,
  batchSize: 32,
  learningRate: 0.001,
  dropoutRate: 0.2,
}

export class MLPricePredictor {
  private model: tf.LayersModel | null = null
  private config: TrainingConfig
  private isLoaded = false
  private isMockMode = false

  constructor(config: Partial<TrainingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Load pre-trained model from URL or initialize mock mode
   */
  async loadModel(modelUrl?: string): Promise<void> {
    try {
      if (modelUrl) {
        this.model = await tf.loadLayersModel(modelUrl)
        this.isLoaded = true
        this.isMockMode = false
      } else {
        // No pre-trained model available, use mock mode
        this.isMockMode = true
        this.isLoaded = true
      }
    } catch (error) {
      console.warn('Failed to load ML model, falling back to mock predictions:', error)
      this.isMockMode = true
      this.isLoaded = true
    }
  }

  /**
   * Build and compile LSTM model architecture
   */
  buildModel(): tf.LayersModel {
    const model = tf.sequential()

    // First LSTM layer with return sequences
    model.add(
      tf.layers.lstm({
        units: this.config.lstmUnits,
        returnSequences: true,
        inputShape: [this.config.lookbackWindow, 5], // [timesteps, features] - OHLCV
      })
    )

    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: this.config.dropoutRate }))

    // Second LSTM layer
    model.add(
      tf.layers.lstm({
        units: Math.floor(this.config.lstmUnits / 2),
        returnSequences: false,
      })
    )

    model.add(tf.layers.dropout({ rate: this.config.dropoutRate }))

    // Dense layers for classification
    model.add(tf.layers.dense({ units: 25, activation: 'relu' }))
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' })) // Binary classification: up/down

    // Compile with binary crossentropy for direction prediction
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    })

    this.model = model
    return model
  }

  /**
   * Normalize OHLCV data for model input
   * Uses min-max normalization per feature
   */
  private normalizeData(data: number[][]): number[][] {
    if (data.length === 0) return []

    const numFeatures = data[0].length
    const normalized: number[][] = []

    // Calculate min/max for each feature
    const mins: number[] = []
    const maxs: number[] = []

    for (let featureIdx = 0; featureIdx < numFeatures; featureIdx++) {
      const values = data.map((d) => d[featureIdx])
      mins.push(Math.min(...values))
      maxs.push(Math.max(...values))
    }

    // Normalize each data point
    for (const row of data) {
      const normalizedRow: number[] = []
      for (let i = 0; i < numFeatures; i++) {
        const range = maxs[i] - mins[i]
        if (range === 0) {
          normalizedRow.push(0)
        } else {
          normalizedRow.push((row[i] - mins[i]) / range)
        }
      }
      normalized.push(normalizedRow)
    }

    return normalized
  }

  /**
   * Prepare training data from historical OHLCV
   * X: lookbackWindow days of normalized OHLCV
   * y: 1 if next day close > current close, else 0
   */
  prepareTrainingData(
    historicalData: { open: number; high: number; low: number; close: number; volume: number }[]
  ): { xs: tf.Tensor; ys: tf.Tensor } {
    const sequences: number[][][] = []
    const labels: number[] = []

    // Convert to OHLCV array
    const ohlcv = historicalData.map((d) => [d.open, d.high, d.low, d.close, d.volume])

    // Create sequences
    for (let i = 0; i <= ohlcv.length - this.config.lookbackWindow - 1; i++) {
      const sequence = ohlcv.slice(i, i + this.config.lookbackWindow)
      const nextClose = ohlcv[i + this.config.lookbackWindow][3] // Close price
      const currentClose = ohlcv[i + this.config.lookbackWindow - 1][3]

      // Normalize the sequence
      const normalizedSequence = this.normalizeData(sequence)
      sequences.push(normalizedSequence)
      labels.push(nextClose > currentClose ? 1 : 0)
    }

    const xs = tf.tensor3d(sequences)
    const ys = tf.tensor2d(labels, [labels.length, 1])

    return { xs, ys }
  }

  /**
   * Train the model on historical data
   */
  async train(
    historicalData: { open: number; high: number; low: number; close: number; volume: number }[]
  ): Promise<TrainingMetrics> {
    if (!this.model) {
      this.buildModel()
    }

    if (!this.model) {
      throw new Error('Failed to build model')
    }

    const { xs, ys } = this.prepareTrainingData(historicalData)

    // Split into train/validation (80/20)
 const totalSamples = xs.shape[0]
    const trainSize = Math.floor(totalSamples * 0.8)

    const xTrain = xs.slice([0, 0, 0], [trainSize, this.config.lookbackWindow, 5])
    const yTrain = ys.slice([0, 0], [trainSize, 1])
    const xVal = xs.slice([trainSize, 0, 0], [totalSamples - trainSize, this.config.lookbackWindow, 5])
    const yVal = ys.slice([trainSize, 0], [totalSamples - trainSize, 1])

    // Train with early stopping callback
    const history = await this.model.fit(xTrain, yTrain, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationData: [xVal, yVal],
      callbacks: {
        onEpochEnd: (epoch: number, logs?: tf.Logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, acc=${logs?.acc?.toFixed(4)}`)
          }
        },
      },
    })

    const finalEpoch = history.epoch.length - 1
    const metrics: TrainingMetrics = {
      loss: Number(history.history.loss[finalEpoch]),
      accuracy: Number(history.history.acc[finalEpoch]),
      valLoss: Number(history.history.val_loss[finalEpoch]),
      valAccuracy: Number(history.history.val_acc[finalEpoch]),
    }

    // Cleanup tensors
    xs.dispose()
    ys.dispose()
    xTrain.dispose()
    yTrain.dispose()
    xVal.dispose()
    yVal.dispose()

    return metrics
  }

  /**
   * Predict price direction for a single sequence
   */
  async predict(
    prices: number[][] // [lookbackWindow, 5] - OHLCV data
  ): Promise<PredictionResult> {
    // Mock prediction if model not loaded or in mock mode
    if (!this.model || this.isMockMode) {
      return this.generateMockPrediction(prices)
    }

    try {
      // Normalize input
      const normalized = this.normalizeData(prices)

      // Reshape for model: [1, lookbackWindow, 5]
      const input = tf.tensor3d([normalized])

      // Predict
      const prediction = this.model.predict(input) as tf.Tensor
      const probability = (await prediction.data())[0]

      // Cleanup
      input.dispose()
      prediction.dispose()

      return this.interpretPrediction(probability)
    } catch (error) {
      console.error('Prediction error:', error)
      return this.generateMockPrediction(prices)
    }
  }

  /**
   * Batch predict for multiple symbols
   */
  async batchPredict(
    symbolData: Map<string, number[][]>
  ): Promise<Map<string, PredictionResult>> {
    const results = new Map<string, PredictionResult>()

    for (const [symbol, data] of symbolData.entries()) {
      try {
        const prediction = await this.predict(data)
        results.set(symbol, prediction)
      } catch (error) {
        console.error(`Failed to predict for ${symbol}:`, error)
        results.set(symbol, {
          upProbability: 0.5,
          signal: 'HOLD',
          confidence: 0,
        })
      }
    }

    return results
  }

  /**
   * Interpret raw probability into signal
   */
  private interpretPrediction(probability: number): PredictionResult {
    let signal: 'BUY' | 'SELL' | 'HOLD'
    let confidence: number

    if (probability > 0.6) {
      signal = 'BUY'
      confidence = (probability - 0.5) * 2 // Scale 0.5-1.0 to 0-1
    } else if (probability < 0.4) {
      signal = 'SELL'
      confidence = (0.5 - probability) * 2 // Scale 0-0.5 to 0-1
    } else {
      signal = 'HOLD'
      confidence = 1 - Math.abs(probability - 0.5) * 2 // Highest at 0.5
    }

    return {
      upProbability: probability,
      signal,
      confidence: Math.min(1, Math.max(0, confidence)),
    }
  }

  /**
   * Generate mock prediction for demo/testing
   * Uses simple momentum-based heuristic
   */
  private generateMockPrediction(prices: number[][]): PredictionResult {
    if (prices.length < 2) {
      return { upProbability: 0.5, signal: 'HOLD', confidence: 0 }
    }

    // Simple momentum-based mock
    const recent = prices.slice(-5)
    const closes = recent.map((p) => p[3])
    const avgChange =
      closes.slice(1).reduce((sum, close, i) => sum + (close - closes[i]) / closes[i], 0) /
      (closes.length - 1)

    // Convert momentum to probability (0.3 to 0.7 range)
    const probability = 0.5 + Math.max(-0.2, Math.min(0.2, avgChange * 10))

    return this.interpretPrediction(probability)
  }

  /**
   * Save model to storage
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save')
    }
    await this.model.save(`file://${path}`)
  }

  /**
   * Dispose model and free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose()
      this.model = null
      this.isLoaded = false
    }
  }

  /**
   * Get model status
   */
  getStatus(): { loaded: boolean; mockMode: boolean; config: TrainingConfig } {
    return {
      loaded: this.isLoaded,
      mockMode: this.isMockMode,
      config: this.config,
    }
  }
}

// Singleton instance for reuse
let globalPredictor: MLPricePredictor | null = null

export function getPricePredictor(): MLPricePredictor {
  if (!globalPredictor) {
    globalPredictor = new MLPricePredictor()
  }
  return globalPredictor
}

export function resetPricePredictor(): void {
  if (globalPredictor) {
    globalPredictor.dispose()
    globalPredictor = null
  }
}
