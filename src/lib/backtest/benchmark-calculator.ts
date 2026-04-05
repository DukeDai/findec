import { defaultDataSource, DataPoint } from '@/lib/data/data-source'

export interface BenchmarkResult {
  benchmarkReturn: number
  benchmarkAnnualReturn: number
  alpha: number
  beta: number
  trackingError: number
  informationRatio: number
  correlation: number
  rSquared: number
  benchmarkEquityCurve: { date: string; value: number }[]
}

interface EquityPoint {
  date: Date
  value: number
}

/**
 * 计算基准对比指标
 */
export async function calculateBenchmarkMetrics(
  portfolioEquityCurve: EquityPoint[],
  benchmark: 'SPY' | 'QQQ',
  initialCapital: number
): Promise<BenchmarkResult | null> {
  if (portfolioEquityCurve.length < 2) {
    return null
  }

  const startDate = portfolioEquityCurve[0].date
  const endDate = portfolioEquityCurve[portfolioEquityCurve.length - 1].date

  // Calculate days between for range parameter
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const range = days > 365 ? '5y' : days > 180 ? '1y' : '6mo'

  try {
    // Fetch benchmark data
    const benchmarkData = await defaultDataSource.getBenchmarkData(benchmark, range)

    if (benchmarkData.length === 0) {
      return null
    }

    // Filter benchmark data to match portfolio date range
    const filteredBenchmarkData = benchmarkData.filter(
      (d) => d.date >= startDate && d.date <= endDate
    )

    if (filteredBenchmarkData.length < 2) {
      return null
    }

    // Build aligned equity curves
    const { portfolioCurve, benchmarkCurve } = buildAlignedCurves(
      portfolioEquityCurve,
      filteredBenchmarkData,
      initialCapital
    )

    if (portfolioCurve.length < 2 || benchmarkCurve.length < 2) {
      return null
    }

    // Calculate daily returns
    const portfolioReturns = calculateDailyReturns(portfolioCurve)
    const benchmarkReturns = calculateDailyReturns(benchmarkCurve)

    if (portfolioReturns.length === 0 || benchmarkReturns.length === 0) {
      return null
    }

    // Align returns to same length
    const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length)
    const alignedPortfolioReturns = portfolioReturns.slice(0, minLength)
    const alignedBenchmarkReturns = benchmarkReturns.slice(0, minLength)

    // Calculate metrics
    const portfolioMean =
      alignedPortfolioReturns.reduce((sum, r) => sum + r, 0) / minLength
    const benchmarkMean =
      alignedBenchmarkReturns.reduce((sum, r) => sum + r, 0) / minLength

    const portfolioStd = Math.sqrt(
      alignedPortfolioReturns.reduce((sum, r) => sum + Math.pow(r - portfolioMean, 2), 0) / minLength
    )
    const benchmarkStd = Math.sqrt(
      alignedBenchmarkReturns.reduce((sum, r) => sum + Math.pow(r - benchmarkMean, 2), 0) / minLength
    )

    // Covariance
    const covariance =
      alignedPortfolioReturns.reduce(
        (sum, r, i) => sum + (r - portfolioMean) * (alignedBenchmarkReturns[i] - benchmarkMean),
        0
      ) / minLength

    // Beta: Cov(portfolio, benchmark) / Var(benchmark)
    const beta = benchmarkStd > 0 ? covariance / (benchmarkStd * benchmarkStd) : 1

    // Annualized returns
    const annualizedPortfolioReturn = portfolioMean * 252
    const annualizedBenchmarkReturn = benchmarkMean * 252

    // Alpha: Annualized excess return (portfolio - benchmark) adjusted for beta
    const alpha = annualizedPortfolioReturn - beta * annualizedBenchmarkReturn

    // Tracking error: Std dev of excess returns
    const excessReturns: number[] = []
    for (let i = 0; i < minLength; i++) {
      excessReturns.push(alignedPortfolioReturns[i] - alignedBenchmarkReturns[i])
    }
    const excessMean = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length
    const trackingErrorStd = Math.sqrt(
      excessReturns.reduce((sum, r) => sum + Math.pow(r - excessMean, 2), 0) / excessReturns.length
    )
    const trackingError = trackingErrorStd * Math.sqrt(252)

    // Information ratio: Alpha / Tracking Error
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0

    // Correlation: Pearson correlation
    const correlation =
      portfolioStd > 0 && benchmarkStd > 0 ? covariance / (portfolioStd * benchmarkStd) : 0

    // R-squared
    const rSquared = correlation * correlation

    // Total benchmark return
    const benchmarkStartValue = benchmarkCurve[0].value
    const benchmarkEndValue = benchmarkCurve[benchmarkCurve.length - 1].value
    const benchmarkReturn =
      benchmarkStartValue > 0 ? (benchmarkEndValue - benchmarkStartValue) / benchmarkStartValue : 0

    return {
      benchmarkReturn: benchmarkReturn * 100,
      benchmarkAnnualReturn: annualizedBenchmarkReturn * 100,
      alpha: alpha * 100,
      beta,
      trackingError: trackingError * 100,
      informationRatio,
      correlation,
      rSquared,
      benchmarkEquityCurve: benchmarkCurve.map((p) => ({
        date: p.date.toISOString().split('T')[0],
        value: p.value,
      })),
    }
  } catch (error) {
    console.error('Error calculating benchmark metrics:', error)
    return null
  }
}

/**
 * Build aligned equity curves by date
 */
function buildAlignedCurves(
  portfolioEquityCurve: EquityPoint[],
  benchmarkData: DataPoint[],
  initialCapital: number
): { portfolioCurve: EquityPoint[]; benchmarkCurve: EquityPoint[] } {
  const portfolioMap = new Map<string, EquityPoint>()
  for (const point of portfolioEquityCurve) {
    const dateKey = point.date.toISOString().split('T')[0]
    portfolioMap.set(dateKey, point)
  }

  // Calculate benchmark normalized values starting from initialCapital
  const benchmarkStartPrice = benchmarkData[0]?.close ?? 1
  const normalizedBenchmarkData: EquityPoint[] = benchmarkData.map((d) => ({
    date: d.date,
    value: (d.close / benchmarkStartPrice) * initialCapital,
  }))

  const benchmarkMap = new Map<string, EquityPoint>()
  for (const point of normalizedBenchmarkData) {
    const dateKey = point.date.toISOString().split('T')[0]
    benchmarkMap.set(dateKey, point)
  }

  // Find common dates
  const commonDates: string[] = []
  for (const dateKey of portfolioMap.keys()) {
    if (benchmarkMap.has(dateKey)) {
      commonDates.push(dateKey)
    }
  }
  commonDates.sort()

  const portfolioCurve: EquityPoint[] = []
  const benchmarkCurve: EquityPoint[] = []

  for (const dateKey of commonDates) {
    const portfolioPoint = portfolioMap.get(dateKey)
    const benchmarkPoint = benchmarkMap.get(dateKey)
    if (portfolioPoint && benchmarkPoint) {
      portfolioCurve.push(portfolioPoint)
      benchmarkCurve.push(benchmarkPoint)
    }
  }

  return { portfolioCurve, benchmarkCurve }
}

/**
 * Calculate daily returns from equity curve
 */
function calculateDailyReturns(equityCurve: EquityPoint[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < equityCurve.length; i++) {
    const current = equityCurve[i].value
    const previous = equityCurve[i - 1].value
    if (previous > 0) {
      returns.push((current - previous) / previous)
    }
  }
  return returns
}
