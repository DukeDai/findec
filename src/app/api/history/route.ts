import { NextRequest, NextResponse } from "next/server";
import { defaultDataSource } from "@/lib/data/data-source";
import type { HistoricalRange, HistoricalInterval } from "@/types/stock";
import { handleApiError, Errors } from "@/lib/errors";

const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];
const VALID_INTERVALS = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"];

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const range = searchParams.get("range") || "1y";
    const interval = searchParams.get("interval") || "1d";

    if (!symbol) {
      throw Errors.badRequest("股票代码参数是必填项");
    }

    if (!/^[A-Za-z0-9.\-]{1,10}$/.test(symbol)) {
      throw Errors.badRequest("无效的股票代码格式");
    }

    if (!VALID_RANGES.includes(range)) {
      throw Errors.badRequest(`无效的时间范围，有效值: ${VALID_RANGES.join(", ")}`);
    }

    if (!VALID_INTERVALS.includes(interval)) {
      throw Errors.badRequest(`无效的时间间隔，有效值: ${VALID_INTERVALS.join(", ")}`);
    }

    const normalizedSymbol = symbol.toUpperCase();

    const dataPoints = await defaultDataSource.getHistoricalData(normalizedSymbol, range);

    if (!dataPoints || dataPoints.length === 0) {
      throw Errors.notFound("未找到该股票的历史数据");
    }

    const historyData: HistoricalDataPoint[] = dataPoints.map((data) => ({
      date: data.date.toISOString().split("T")[0],
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.volume,
    }));

    return NextResponse.json({
      symbol: normalizedSymbol,
      range,
      interval,
      source: dataPoints[0]?.source,
      data: historyData,
    }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
