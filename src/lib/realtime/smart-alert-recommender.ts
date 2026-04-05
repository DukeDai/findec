import { defaultDataSource, DataPoint } from '@/lib/data/data-source'
import { IndicatorCalculator, HistoricalPrice } from '@/lib/indicators/calculator'

export interface AlertRecommendation {
  priceChangeThreshold: number      // 建议价格变化幅度 %
  volumeSpikeThreshold: number      // 建议成交量放大倍数
  rsiOverbought: number
  rsiOversold: number
  atrMultiplier: number
  reasoning: string
}

/**
 * 计算标准差
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * 计算平均成交量
 */
function calculateAverageVolume(data: HistoricalPrice[]): number {
  if (data.length === 0) return 0
  const volumes = data.map(d => d.volume)
  return volumes.reduce((sum, v) => sum + v, 0) / volumes.length
}

/**
 * 将 DataPoint 转换为 HistoricalPrice
 */
function convertToHistoricalPrice(data: DataPoint[]): HistoricalPrice[] {
  return data.map(d => ({
    date: new Date(d.date),
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
  }))
}

/**
 * 计算日收益率
 */
function calculateReturns(data: HistoricalPrice[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < data.length; i++) {
    const dailyReturn = (data[i].close - data[i - 1].close) / data[i - 1].close
    returns.push(dailyReturn)
  }
  return returns
}

/**
 * 获取智能预警推荐参数
 * 基于过去3个月的历史波动率数据
 */
export async function getAlertRecommendations(symbol: string): Promise<AlertRecommendation> {
  // 获取3个月的历史数据
  const rawData = await defaultDataSource.getHistoricalData(symbol, '3mo')

  if (rawData.length < 20) {
    throw new Error(`数据不足，无法生成推荐。${symbol} 的历史数据仅有 ${rawData.length} 条`)
  }

  // 转换为 HistoricalPrice 格式
  const historicalData = convertToHistoricalPrice(rawData)

  // 计算日收益率
  const returns = calculateReturns(historicalData)

  // 计算波动率（收益率的标准差）
  const volatility = calculateStandardDeviation(returns)
  const volatilityPercent = volatility * 100  // 转换为百分比

  // 计算平均成交量
  const avgVolume = calculateAverageVolume(historicalData)

  // 使用指标计算器获取 ATR
  const calculator = new IndicatorCalculator()
  const indicators = calculator.calculate(historicalData, { atr: { period: 14 } })
  const latestATR = indicators.atr?.latest || 0

  // 计算 ATR 占当前价格的比例
  const currentPrice = historicalData[historicalData.length - 1]?.close || 0
  const atrPercent = currentPrice > 0 ? (latestATR / currentPrice) * 100 : 0

  // 基于波动率计算推荐阈值
  // priceChangeThreshold: max(volatility * 1.5, 2) - 至少2%的变动才值得预警
  const priceChangeThreshold = Math.max(volatilityPercent * 1.5, 2)

  // 成交量放大倍数默认为2倍
  const volumeSpikeThreshold = 2

  // RSI 超买/超卖阈值
  const rsiOverbought = 70
  const rsiOversold = 30

  // ATR 倍数用于价格区间预警
  const atrMultiplier = 1.5

  // 生成推荐理由
  const reasoning = generateReasoning(
    symbol,
    volatilityPercent,
    priceChangeThreshold,
    avgVolume,
    latestATR,
    atrPercent,
    historicalData.length
  )

  return {
    priceChangeThreshold: Math.round(priceChangeThreshold * 10) / 10,  // 保留1位小数
    volumeSpikeThreshold,
    rsiOverbought,
    rsiOversold,
    atrMultiplier,
    reasoning,
  }
}

/**
 * 生成推荐理由说明
 */
function generateReasoning(
  symbol: string,
  volatility: number,
  threshold: number,
  avgVolume: number,
  atr: number,
  atrPercent: number,
  dataPoints: number
): string {
  const volatilityLevel = volatility < 0.015 ? '低' : volatility < 0.025 ? '中等' : '高'
  const volatilityDesc = volatilityLevel === '低'
    ? '股价波动较为平稳'
    : volatilityLevel === '中等'
      ? '股价波动适中'
      : '股价波动较大'

  return `基于 ${symbol} 过去3个月（${dataPoints}个交易日）的历史数据分析：\n` +
    `• 日波动率：${(volatility * 100).toFixed(2)}%（${volatilityDesc}）\n` +
    `• 建议价格变动阈值：${threshold.toFixed(1)}%（基于波动率的1.5倍，最低2%）\n` +
    `• 平均日成交量：${formatVolume(avgVolume)}\n` +
    `• 平均真实波幅(ATR)：${atr.toFixed(2)}（占当前价格${atrPercent.toFixed(2)}%）\n` +
    `• RSI超买/超卖阈值：70/30（标准值）\n` +
    `• 建议成交量放大倍数：2倍（异常放量预警）`
}

/**
 * 格式化成交量显示
 */
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`
  }
  return volume.toString()
}
