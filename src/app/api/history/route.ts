import { NextRequest, NextResponse } from "next/server";

const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];
const VALID_INTERVALS = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"];

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

    const days = range === "1d" ? 1 : range === "5d" ? 5 : range === "1mo" ? 30 : range === "3mo" ? 90 : range === "6mo" ? 180 : range === "1y" ? 365 : 365;
    const dataPoints = Math.min(days, 252);
    const historyData = [];
    let basePrice = 150;
    const now = new Date();

    for (let i = dataPoints; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.02);

      historyData.push({
        date: date.toISOString().split("T")[0],
        open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
        high: basePrice * (1 + Math.random() * 0.02),
        low: basePrice * (1 - Math.random() * 0.02),
        close: basePrice,
        volume: Math.floor(Math.random() * 10000000),
      });
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      range,
      interval,
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
