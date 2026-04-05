import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { YahooFinanceSource } from "@/lib/data/sources/yahoo-finance-source";

const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "UNH", name: "UnitedHealth Group Inc." },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "BAC", name: "Bank of America Corp." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "XOM", name: "Exxon Mobil Corp." },
  { symbol: "KO", name: "Coca-Cola Co." },
  { symbol: "PFE", name: "Pfizer Inc." },
  { symbol: "INTC", name: "Intel Corp." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
];

// Check if string contains Chinese characters
function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str);
}

// Extract Chinese name from Yahoo Finance response if present
function extractChineseName(longname: string | undefined, shortname: string | undefined): string | undefined {
  if (!longname && !shortname) return undefined;
  
  const name = longname || shortname || "";
  
  if (containsChinese(name)) {
    const chineseMatch = name.match(/[\u4e00-\u9fa5]+/g);
    if (chineseMatch && chineseMatch.length > 0) {
      return chineseMatch.join("");
    }
  }
  
  return undefined;
}

export async function GET() {
  try {
    const yahooSource = new YahooFinanceSource();
    const results = {
      total: POPULAR_STOCKS.length,
      processed: 0,
      cached: 0,
      errors: 0,
      details: [] as Array<{
        symbol: string;
        status: "cached" | "error";
        name?: string;
        nameZh?: string;
        error?: string;
      }>,
    };

    for (const stock of POPULAR_STOCKS) {
      try {
        const yahooResults = await yahooSource.search(stock.symbol);
        const result = yahooResults.find((r) => r.symbol === stock.symbol);

        if (result) {
          const nameZh = extractChineseName(result.name, result.name);

          await prisma.stockNameCache.upsert({
            where: { symbol: result.symbol },
            update: {
              name: result.name,
              nameZh: nameZh || null,
              exchange: result.exchange,
              type: result.type,
              cachedAt: new Date(),
            },
            create: {
              symbol: result.symbol,
              name: result.name,
              nameZh: nameZh || null,
              exchange: result.exchange,
              type: result.type,
            },
          });

          results.cached++;
          results.details.push({
            symbol: stock.symbol,
            status: "cached",
            name: result.name,
            nameZh: nameZh,
          });
        } else {
          results.errors++;
          results.details.push({
            symbol: stock.symbol,
            status: "error",
            error: "Not found in Yahoo Finance",
          });
        }
      } catch (error) {
        results.errors++;
        results.details.push({
          symbol: stock.symbol,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      results.processed++;
      
      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Cache warming error:", error);
    return NextResponse.json(
      { error: "Failed to warm cache" },
      { status: 500 }
    );
  }
}
