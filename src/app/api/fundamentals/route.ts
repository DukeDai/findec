import { NextRequest, NextResponse } from "next/server";
import { getFundamentalData, FundamentalData } from "@/lib/yahoo-finance";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

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

    const fundamentalData: FundamentalData = await getFundamentalData(symbol);

    return NextResponse.json(fundamentalData, { status: 200 });
  } catch (error) {
    console.error("Fundamentals API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fundamental data" },
      { status: 500 }
    );
  }
}
