"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  CandlestickSeries,
  LineSeries,
  LineData,
} from "lightweight-charts";
import { SMA, EMA, RSI, MACD } from "technicalindicators";

interface ChartContainerProps {
  symbol: string;
}

interface HistoryDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorState {
  ma5: boolean;
  ma10: boolean;
  ma20: boolean;
  ma60: boolean;
  ema5: boolean;
  ema10: boolean;
  ema20: boolean;
  rsi: boolean;
  macd: boolean;
}

const INDICATOR_COLORS = {
  ma5: "#3b82f6",
  ma10: "#8b5cf6",
  ma20: "#f97316",
  ma60: "#06b6d4",
  ema5: "#22c55e",
  ema10: "#eab308",
  ema20: "#ec4899",
  rsi: "#6366f1",
  macd: "#14b8a6",
  macdSignal: "#f97316",
  macdHistogram: "#64748b",
};

export function ChartContainer({ symbol }: ChartContainerProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [indicators, setIndicators] = useState<IndicatorState>({
    ma5: false,
    ma10: false,
    ma20: false,
    ma60: false,
    ema5: false,
    ema10: false,
    ema20: false,
    rsi: false,
    macd: false,
  });

  const [chartData, setChartData] = useState<HistoryDataPoint[]>([]);

  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line"> | ISeriesApi<"Histogram">>>(new Map());

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333333",
      },
      grid: {
        vertLines: { color: "#e0e0e0" },
        horzLines: { color: "#e0e0e0" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#cccccc",
      },
      timeScale: {
        borderColor: "#cccccc",
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      indicatorSeriesRef.current.clear();
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!candlestickSeriesRef.current || !chartRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/history?symbol=${symbol}&range=1y&interval=1d`);
        if (!response.ok) {
          throw new Error("Failed to fetch historical data");
        }

        const result = await response.json();
        const data: HistoryDataPoint[] = result.data;
        setChartData(data);

        const candleData: CandlestickData[] = data.map((item) => ({
          time: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        candlestickSeriesRef.current.setData(candleData);
        chartRef.current?.timeScale().fitContent();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const removeIndicator = useCallback((key: string) => {
    const series = indicatorSeriesRef.current.get(key);
    if (series && chartRef.current) {
      chartRef.current.removeSeries(series);
      indicatorSeriesRef.current.delete(key);
    }
  }, []);

  const addIndicator = useCallback((key: keyof IndicatorState, data: HistoryDataPoint[]) => {
    if (!chartRef.current || data.length === 0) return;

    const closes = data.map((d) => d.close);
    const dates = data.map((d) => {
      const date = new Date(d.date);
      return Math.floor(date.getTime() / 1000) as unknown as LineData['time'];
    });

    switch (key) {
      case "ma5":
      case "ma10":
      case "ma20":
      case "ma60": {
        const period = parseInt(key.replace("ma", ""));
        const maValues = SMA.calculate({ period, values: closes });
        const maData: LineData[] = maValues.map((value, i) => ({
          time: dates[i + period - 1],
          value,
        }));

        const series = chartRef.current.addSeries(LineSeries, {
          color: INDICATOR_COLORS[key],
          lineWidth: 2,
          title: `MA${period}`,
          lastValueVisible: false,
        });
        series.setData(maData);
        indicatorSeriesRef.current.set(key, series);
        break;
      }

      case "ema5":
      case "ema10":
      case "ema20": {
        const period = parseInt(key.replace("ema", ""));
        const emaValues = EMA.calculate({ period, values: closes });
        const emaData: LineData[] = emaValues.map((value, i) => ({
          time: dates[i + period - 1],
          value,
        }));

        const series = chartRef.current.addSeries(LineSeries, {
          color: INDICATOR_COLORS[key],
          lineWidth: 2,
          title: `EMA${period}`,
          lastValueVisible: false,
        });
        series.setData(emaData);
        indicatorSeriesRef.current.set(key, series);
        break;
      }

      case "rsi": {
        const rsiValues = RSI.calculate({ period: 14, values: closes });
        const rsiData: LineData[] = rsiValues
          .map((value, i) => {
            const idx = i + 14;
            if (idx >= dates.length) return null;
            return { time: dates[idx], value };
          })
          .filter((d): d is LineData => d !== null);

        const series = chartRef.current.addSeries(LineSeries, {
          color: INDICATOR_COLORS.rsi,
          lineWidth: 2,
          title: "RSI",
          priceScaleId: "rsi",
          lastValueVisible: false,
        });
        series.setData(rsiData);
        indicatorSeriesRef.current.set(key, series);

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
        });

        chartRef.current.priceScale("rsi").applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        });
        break;
      }

      case "macd": {
        const macdResult = MACD.calculate({
          values: closes,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          SimpleMAOscillator: false,
          SimpleMASignal: false,
        });

        const offset = 26 + 9 - 2;
        const macdData: LineData[] = macdResult
          .map((m, i) => {
            const idx = i + offset;
            if (idx >= dates.length) return null;
            return { time: dates[idx], value: m.MACD ?? 0 };
          })
          .filter((d): d is LineData => d !== null);
        const signalData: LineData[] = macdResult
          .map((m, i) => {
            const idx = i + offset;
            if (idx >= dates.length) return null;
            return { time: dates[idx], value: m.signal ?? 0 };
          })
          .filter((d): d is LineData => d !== null);
        const histogramData = macdResult
          .map((m, i) => {
            const idx = i + offset;
            if (idx >= dates.length) return null;
            return {
              time: dates[idx],
              value: m.histogram ?? 0,
              color: m.histogram && m.histogram >= 0 ? "#22c55e" : "#ef4444",
            };
          })
          .filter((d): d is LineData & { color: string } => d !== null);

        const macdSeries = chartRef.current.addSeries(LineSeries, {
          color: INDICATOR_COLORS.macd,
          lineWidth: 2,
          title: "MACD",
          priceScaleId: "macd",
          lastValueVisible: false,
        });
        macdSeries.setData(macdData);
        indicatorSeriesRef.current.set("macd", macdSeries);

        const signalSeries = chartRef.current.addSeries(LineSeries, {
          color: INDICATOR_COLORS.macdSignal,
          lineWidth: 2,
          title: "Signal",
          priceScaleId: "macd",
          lastValueVisible: false,
        });
        signalSeries.setData(signalData);
        indicatorSeriesRef.current.set("macdSignal", signalSeries);

        const histogramSeries = chartRef.current.addSeries(LineSeries, {
          color: INDICATOR_COLORS.macdHistogram,
          lineWidth: 1,
          title: "Histogram",
          priceScaleId: "macd",
          lastValueVisible: false,
        });
        histogramSeries.setData(histogramData);
        indicatorSeriesRef.current.set("macdHistogram", histogramSeries);

        chartRef.current.priceScale("macd").applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        });
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (chartData.length === 0) return;

    Object.entries(indicators).forEach(([key, enabled]) => {
      const existingSeries = indicatorSeriesRef.current.get(key);

      if (enabled && !existingSeries) {
        addIndicator(key as keyof IndicatorState, chartData);
      } else if (!enabled && existingSeries) {
        removeIndicator(key);
      }
    });

    if (!indicators.macd) {
      removeIndicator("macdSignal");
      removeIndicator("macdHistogram");
    }
  }, [indicators, chartData, addIndicator, removeIndicator]);

  const toggleIndicator = (key: keyof IndicatorState) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-wrap gap-2 p-3 border-b border-zinc-200 bg-zinc-50">
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.ma5}
            onChange={() => toggleIndicator("ma5")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-blue-500 focus:ring-blue-500"
          />
          <span style={{ color: INDICATOR_COLORS.ma5 }}>MA5</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.ma10}
            onChange={() => toggleIndicator("ma10")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-violet-500 focus:ring-violet-500"
          />
          <span style={{ color: INDICATOR_COLORS.ma10 }}>MA10</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.ma20}
            onChange={() => toggleIndicator("ma20")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
          />
          <span style={{ color: INDICATOR_COLORS.ma20 }}>MA20</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.ma60}
            onChange={() => toggleIndicator("ma60")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-cyan-500 focus:ring-cyan-500"
          />
          <span style={{ color: INDICATOR_COLORS.ma60 }}>MA60</span>
        </label>
        <div className="w-px h-4 bg-zinc-300 mx-1" />
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.ema5}
            onChange={() => toggleIndicator("ema5")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-green-500 focus:ring-green-500"
          />
          <span style={{ color: INDICATOR_COLORS.ema5 }}>EMA5</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.ema10}
            onChange={() => toggleIndicator("ema10")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-yellow-500 focus:ring-yellow-500"
          />
          <span style={{ color: INDICATOR_COLORS.ema10 }}>EMA10</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.ema20}
            onChange={() => toggleIndicator("ema20")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-pink-500 focus:ring-pink-500"
          />
          <span style={{ color: INDICATOR_COLORS.ema20 }}>EMA20</span>
        </label>
        <div className="w-px h-4 bg-zinc-300 mx-1" />
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.rsi}
            onChange={() => toggleIndicator("rsi")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-500 focus:ring-indigo-500"
          />
          <span style={{ color: INDICATOR_COLORS.rsi }}>RSI</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 cursor-pointer hover:text-zinc-900">
          <input
            type="checkbox"
            checked={indicators.macd}
            onChange={() => toggleIndicator("macd")}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-teal-500 focus:ring-teal-500"
          />
          <span style={{ color: INDICATOR_COLORS.macd }}>MACD</span>
        </label>
      </div>
      <div className="w-full h-full relative flex-1 min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-zinc-500">加载中...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-red-500">{error}</div>
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
