import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "缺少股票代码参数", code: "MISSING_SYMBOL" },
        { status: 400 }
      );
    }

    if (!/^[A-Za-z0-9.\-]{1,10}$/.test(symbol)) {
      return NextResponse.json(
        { error: "无效的股票代码格式", code: "INVALID_SYMBOL" },
        { status: 400 }
      );
    }

    const quoteData = {
      symbol: symbol.toUpperCase(),
      price: 150.0 + Math.random() * 50,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 10000000),
      high: 180.0 + Math.random() * 20,
      low: 140.0 + Math.random() * 20,
      open: 160.0 + Math.random() * 10,
      previousClose: 165.0 + Math.random() * 10,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(quoteData, { status: 200 });
  } catch (error) {
    console.error("Quotes API error:", error);
    return NextResponse.json(
      { error: "获取行情数据失败", code: "QUOTE_ERROR" },
      { status: 500 }
    );
  }
}
