import { NextRequest, NextResponse } from "next/server";
import { getFundamentalData } from "@/lib/yahoo-finance";
import { FundamentalData } from "@/lib/data/fundamental-data";
import { handleApiError, Errors } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      throw Errors.badRequest("股票代码参数是必填项");
    }

    if (!/^[A-Za-z0-9.\-]{1,10}$/.test(symbol)) {
      throw Errors.badRequest("无效的股票代码格式");
    }

    const fundamentalData: FundamentalData = await getFundamentalData(symbol);

    return NextResponse.json(fundamentalData, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
