import { NextRequest, NextResponse } from "next/server";
import { defaultDataSource } from "@/lib/data/data-source";
import type { HistoricalRange, HistoricalInterval } from "@/types/stock";

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
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      );
    }

    if (!/^[A-Za-z0-9.\-]{1,10}$/.test(symbol)) {
      return NextResponse.json(
        { error: "Invalid symbol format" },
        { status: 400 }
      );
    }

    if (!VALID_RANGES.includes(range)) {
      return NextResponse.json(
        { error: `Invalid range. Valid values: ${VALID_RANGES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json(
        { error: `Invalid interval. Valid values: ${VALID_INTERVALS.join(", ")}` },
        { status: 400 }
      );
    }

    const normalizedSymbol = symbol.toUpperCase();

    const dataPoints = await defaultDataSource.getHistoricalData(normalizedSymbol, range);

    if (!dataPoints || dataPoints.length === 0) {
      return NextResponse.json(
        { error: "No historical data found for symbol" },
        { status: 404 }
      );
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
    console.error("History API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}
