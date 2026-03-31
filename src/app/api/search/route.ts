import { NextRequest, NextResponse } from "next/server";

const MOCK_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", type: "Equity", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "Equity", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "Equity", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com Inc.", type: "Equity", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla Inc.", type: "Equity", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms Inc.", type: "Equity", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "Equity", exchange: "NASDAQ" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "Equity", exchange: "NYSE" },
  { symbol: "JNJ", name: "Johnson & Johnson", type: "Equity", exchange: "NYSE" },
  { symbol: "V", name: "Visa Inc.", type: "Equity", exchange: "NYSE" },
  { symbol: "WMT", name: "Walmart Inc.", type: "Equity", exchange: "NYSE" },
  { symbol: "PG", name: "Procter & Gamble Co.", type: "Equity", exchange: "NYSE" },
  { symbol: "UNH", name: "UnitedHealth Group Inc.", type: "Equity", exchange: "NYSE" },
  { symbol: "HD", name: "Home Depot Inc.", type: "Equity", exchange: "NYSE" },
  { symbol: "MA", name: "Mastercard Inc.", type: "Equity", exchange: "NYSE" },
  { symbol: "BAC", name: "Bank of America Corp.", type: "Equity", exchange: "NYSE" },
  { symbol: "DIS", name: "Walt Disney Co.", type: "Equity", exchange: "NYSE" },
  { symbol: "ADBE", name: "Adobe Inc.", type: "Equity", exchange: "NASDAQ" },
  { symbol: "CRM", name: "Salesforce Inc.", type: "Equity", exchange: "NYSE" },
  { symbol: "NFLX", name: "Netflix Inc.", type: "Equity", exchange: "NASDAQ" },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    if (query.length < 1 || query.length > 50) {
      return NextResponse.json(
        { error: "Query must be between 1 and 50 characters" },
        { status: 400 }
      );
    }

    const searchTerm = query.toLowerCase();
    const results = MOCK_STOCKS.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(searchTerm) ||
        stock.name.toLowerCase().includes(searchTerm)
    );

    return NextResponse.json({
      query,
      results,
      count: results.length,
    }, { status: 200 });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
