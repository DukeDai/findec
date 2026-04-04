'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineData,
  HistogramSeries,
  HistogramData,
  SeriesOptionsCommon,
} from 'lightweight-charts'
import type { CalculatedIndicators, IndicatorValue } from '@/lib/indicators'

interface IndicatorOverlayProps {
  chart: IChartApi | null
  indicators: CalculatedIndicators | null
  visibleIndicators: string[]
}

const INDICATOR_COLORS: Record<string, string> = {
  ma5: '#3b82f6',
  ma10: '#8b5cf6',
  ma20: '#f97316',
  ma50: '#06b6d4',
  ma60: '#06b6d4',
  ma200: '#ec4899',
  ema5: '#22c55e',
  ema10: '#eab308',
  ema12: '#eab308',
  ema20: '#ec4899',
  ema26: '#6366f1',
  rsi: '#6366f1',
  macd: '#14b8a6',
  macdSignal: '#f97316',
  macdHistogram: '#64748b',
  bollingerUpper: '#8b5cf6',
  bollingerMiddle: '#a855f7',
  bollingerLower: '#8b5cf6',
  atr: '#f59e0b',
  adx: '#10b981',
  stochK: '#3b82f6',
  stochD: '#f97316',
  obv: '#06b6d4',
}

export function IndicatorOverlay({
  chart,
  indicators,
  visibleIndicators,
}: IndicatorOverlayProps) {
  const seriesRef = useRef<Map<string, ISeriesApi<'Line'> | ISeriesApi<'Histogram'>>>(new Map())
  const priceScaleRef = useRef<Map<string, string>>(new Map())
  const [dates, setDates] = useState<string[]>([])

  useEffect(() => {
    if (!indicators) return

    const dateList: string[] = []
    const rsiValues = indicators.rsi?.values || []
    for (let i = 0; i < rsiValues.length; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (rsiValues.length - i))
      dateList.push(date.toISOString().split('T')[0])
    }
    setDates(dateList)
  }, [indicators])

  const removeSeries = useCallback(
    (key: string) => {
      const series = seriesRef.current.get(key)
      if (series && chart) {
        chart.removeSeries(series)
        seriesRef.current.delete(key)
      }
    },
    [chart]
  )

  const removePriceScale = useCallback(
    (scaleId: string) => {
      if (chart) {
        const scales = Array.from(priceScaleRef.current.values())
        const count = scales.filter(s => s === scaleId).length
        if (count <= 1) {
          chart.priceScale(scaleId).applyOptions({ visible: false })
        }
      }
    },
    [chart]
  )

  const createMAOverlay = useCallback(
    (ma: IndicatorValue, dates: string[]) => {
      if (!chart) return

      const key = `ma${ma.period}`
      if (!visibleIndicators.includes(key)) return

      const maData: LineData[] = []
      for (let i = 0; i < ma.values.length; i++) {
        const val = ma.values[i]
        if (val !== null && dates[i]) {
          maData.push({ time: dates[i], value: val })
        }
      }

      const series = chart.addSeries(LineSeries, {
        color: INDICATOR_COLORS[key] || '#3b82f6',
        lineWidth: 2,
        title: ma.name,
        lastValueVisible: false,
      })
      series.setData(maData)
      seriesRef.current.set(key, series)
    },
    [chart, visibleIndicators]
  )

  const createEMAOverlay = useCallback(
    (ema: IndicatorValue, dates: string[]) => {
      if (!chart) return

      const key = `ema${ema.period}`
      if (!visibleIndicators.includes(key)) return

      const emaData: LineData[] = []
      for (let i = 0; i < ema.values.length; i++) {
        const val = ema.values[i]
        if (val !== null && dates[i]) {
          emaData.push({ time: dates[i], value: val })
        }
      }

      const series = chart.addSeries(LineSeries, {
        color: INDICATOR_COLORS[key] || '#22c55e',
        lineWidth: 2,
        title: ema.name,
        lastValueVisible: false,
      })
      series.setData(emaData)
      seriesRef.current.set(key, series)
    },
    [chart, visibleIndicators]
  )

  const createBollingerOverlay = useCallback(
    (indicators: CalculatedIndicators, dates: string[]) => {
      if (!chart || !indicators.bollinger) return

      const { upper, middle, lower } = indicators.bollinger

      const createLine = (
        values: (number | null)[],
        key: string,
        color: string,
        title: string
      ) => {
        if (!visibleIndicators.includes(key)) return

        const data: LineData[] = []
        for (let i = 0; i < values.length; i++) {
          const val = values[i]
          if (val !== null && dates[i]) {
            data.push({ time: dates[i], value: val })
          }
        }

        const series = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          title,
          lastValueVisible: false,
        })
        series.setData(data)
        seriesRef.current.set(key, series)
      }

      createLine(upper, 'bollingerUpper', INDICATOR_COLORS.bollingerUpper, 'BB Upper')
      createLine(middle, 'bollingerMiddle', INDICATOR_COLORS.bollingerMiddle, 'BB Middle')
      createLine(lower, 'bollingerLower', INDICATOR_COLORS.bollingerLower, 'BB Lower')
    },
    [chart, visibleIndicators]
  )

  const createRSIPane = useCallback(
    (indicators: CalculatedIndicators, dates: string[]) => {
      if (!chart || !indicators.rsi) return

      const scaleId = 'rsi'
      if (!visibleIndicators.includes('rsi')) return

      const rsiData: LineData[] = []
      for (let i = 0; i < indicators.rsi.values.length; i++) {
        const val = indicators.rsi.values[i]
        if (val !== null && dates[i]) {
          rsiData.push({ time: dates[i], value: val })
        }
      }

      const series = chart.addSeries(LineSeries, {
        color: INDICATOR_COLORS.rsi,
        lineWidth: 2,
        title: 'RSI',
        priceScaleId: scaleId,
        lastValueVisible: false,
      })
      series.setData(rsiData)
      seriesRef.current.set('rsi', series)
      priceScaleRef.current.set('rsi', scaleId)

      series.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: 0,
            maxValue: 100,
          },
          margins: {
            above: 0,
            below: 0,
          },
        }),
      })

      chart.priceScale(scaleId).applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      })
    },
    [chart, visibleIndicators]
  )

  const createMACDPane = useCallback(
    (indicators: CalculatedIndicators, dates: string[]) => {
      if (!chart || !indicators.macd) return

      const scaleId = 'macd'
      const { macd, signal, histogram } = indicators.macd

      if (!visibleIndicators.includes('macd')) return

      const macdData: LineData[] = []
      const signalData: LineData[] = []
      const histogramData: HistogramData[] = []

      for (let i = 0; i < macd.length; i++) {
        if (dates[i]) {
          const macdVal = macd[i]
          const signalVal = signal[i]
          const histVal = histogram[i]

          if (macdVal !== null) {
            macdData.push({ time: dates[i], value: macdVal })
          }
          if (signalVal !== null) {
            signalData.push({ time: dates[i], value: signalVal })
          }
          if (histVal !== null) {
            histogramData.push({
              time: dates[i],
              value: histVal,
              color: histVal >= 0 ? '#22c55e' : '#ef4444',
            })
          }
        }
      }

      const macdSeries = chart.addSeries(LineSeries, {
        color: INDICATOR_COLORS.macd,
        lineWidth: 2,
        title: 'MACD',
        priceScaleId: scaleId,
        lastValueVisible: false,
      })
      macdSeries.setData(macdData)
      seriesRef.current.set('macd', macdSeries)
      priceScaleRef.current.set('macd', scaleId)

      const signalSeries = chart.addSeries(LineSeries, {
        color: INDICATOR_COLORS.macdSignal,
        lineWidth: 2,
        title: 'Signal',
        priceScaleId: scaleId,
        lastValueVisible: false,
      })
      signalSeries.setData(signalData)
      seriesRef.current.set('macdSignal', signalSeries)

      const histogramSeries = chart.addSeries(HistogramSeries, {
        color: INDICATOR_COLORS.macdHistogram,
        priceScaleId: scaleId,
        lastValueVisible: false,
      })
      histogramSeries.setData(histogramData)
      seriesRef.current.set('macdHistogram', histogramSeries)

      chart.priceScale(scaleId).applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      })
    },
    [chart, visibleIndicators]
  )

  const createStochasticPane = useCallback(
    (indicators: CalculatedIndicators, dates: string[]) => {
      if (!chart || !indicators.stoch) return

      const scaleId = 'stoch'
      const { k, d } = indicators.stoch

      if (!visibleIndicators.includes('stoch')) return

      const kData: LineData[] = []
      const dData: LineData[] = []

      for (let i = 0; i < k.length; i++) {
        if (dates[i]) {
          const kVal = k[i]
          const dVal = d[i]

          if (kVal !== null) {
            kData.push({ time: dates[i], value: kVal })
          }
          if (dVal !== null) {
            dData.push({ time: dates[i], value: dVal })
          }
        }
      }

      const kSeries = chart.addSeries(LineSeries, {
        color: INDICATOR_COLORS.stochK,
        lineWidth: 2,
        title: '%K',
        priceScaleId: scaleId,
        lastValueVisible: false,
      })
      kSeries.setData(kData)
      seriesRef.current.set('stochK', kSeries)
      priceScaleRef.current.set('stochK', scaleId)

      const dSeries = chart.addSeries(LineSeries, {
        color: INDICATOR_COLORS.stochD,
        lineWidth: 2,
        title: '%D',
        priceScaleId: scaleId,
        lastValueVisible: false,
      })
      dSeries.setData(dData)
      seriesRef.current.set('stochD', dSeries)

      kSeries.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: 0,
            maxValue: 100,
          },
          margins: {
            above: 0,
            below: 0,
          },
        }),
      })

      chart.priceScale(scaleId).applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      })
    },
    [chart, visibleIndicators]
  )

  useEffect(() => {
    if (!chart || !indicators || dates.length === 0) return

    seriesRef.current.forEach((_, key) => {
      if (!visibleIndicators.includes(key)) {
        removeSeries(key)
      }
    })

    indicators.ma.forEach(ma => createMAOverlay(ma, dates))
    indicators.ema.forEach(ema => createEMAOverlay(ema, dates))
    createBollingerOverlay(indicators, dates)
    createRSIPane(indicators, dates)
    createMACDPane(indicators, dates)
    createStochasticPane(indicators, dates)
  }, [
    chart,
    indicators,
    dates,
    visibleIndicators,
    createMAOverlay,
    createEMAOverlay,
    createBollingerOverlay,
    createRSIPane,
    createMACDPane,
    createStochasticPane,
    removeSeries,
  ])

  useEffect(() => {
    return () => {
      seriesRef.current.forEach((_, key) => removeSeries(key))
    }
  }, [removeSeries])

  return null
}
