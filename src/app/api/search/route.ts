import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { YahooFinanceSource } from "@/lib/data/sources/yahoo-finance-source";

interface SearchResult {
  symbol: string;
  name: string;
  nameZh?: string;
  exchange: string;
  type: string;
}

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
];

// Check if string contains Chinese characters
function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str);
}

// Extract Chinese name from Yahoo Finance response if present
function extractChineseName(longname: string | undefined, shortname: string | undefined): string | undefined {
  if (!longname && !shortname) return undefined;
  
  const name = longname || shortname || "";
  
  // Check if the name contains Chinese characters
  if (containsChinese(name)) {
    // Extract Chinese portion - typically after the English name
    const chineseMatch = name.match(/[\u4e00-\u9fa5]+/g);
    if (chineseMatch && chineseMatch.length > 0) {
      return chineseMatch.join("");
    }
  }
  
  return undefined;
}

// Search stocks from Yahoo Finance and cache results
async function searchAndCacheStocks(query: string): Promise<SearchResult[]> {
  const yahooSource = new YahooFinanceSource();
  
  try {
    const yahooResults = await yahooSource.search(query);
    
    const results: SearchResult[] = [];
    
    for (const result of yahooResults) {
      // Extract Chinese name if present
      const nameZh = extractChineseName(result.name, result.name);
      
      // Cache the result
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
      
      results.push({
        symbol: result.symbol,
        name: result.name,
        nameZh: nameZh,
        exchange: result.exchange,
        type: result.type,
      });
    }
    
    return results;
  } catch (error) {
    console.error("Yahoo Finance search error:", error);
    return [];
  }
}

// Search cached stocks by Chinese name
async function searchCachedByChineseName(query: string): Promise<SearchResult[]> {
  const cached = await prisma.stockNameCache.findMany({
    where: {
      nameZh: {
        contains: query,
      },
    },
    take: 20,
  });
  
  return cached.map((item) => ({
    symbol: item.symbol,
    name: item.name,
    nameZh: item.nameZh || undefined,
    exchange: item.exchange || "",
    type: item.type || "",
  }));
}

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
    const isChineseQuery = containsChinese(query);
    
    // Results from different sources
    const results: SearchResult[] = [];
    const seenSymbols = new Set<string>();
    
    // 1. Search from Yahoo Finance (for symbol/English name matches)
    if (!isChineseQuery) {
      const yahooResults = await searchAndCacheStocks(query);
      for (const result of yahooResults) {
        if (!seenSymbols.has(result.symbol)) {
          results.push(result);
          seenSymbols.add(result.symbol);
        }
      }
    }
    
    // 2. Search from cache by Chinese name (for Chinese queries)
    if (isChineseQuery) {
      const chineseResults = await searchCachedByChineseName(query);
      for (const result of chineseResults) {
        if (!seenSymbols.has(result.symbol)) {
          results.push(result);
          seenSymbols.add(result.symbol);
        }
      }
    }
    
    // 3. Also search cache by symbol/name for partial matches
    const cachedMatches = await prisma.stockNameCache.findMany({
      where: {
        OR: [
          {
            symbol: {
              contains: searchTerm,
            },
          },
          {
            name: {
              contains: searchTerm,
            },
          },
        ],
      },
      take: 20,
    });
    
    for (const item of cachedMatches) {
      if (!seenSymbols.has(item.symbol)) {
        results.push({
          symbol: item.symbol,
          name: item.name,
          nameZh: item.nameZh || undefined,
          exchange: item.exchange || "",
          type: item.type || "",
        });
        seenSymbols.add(item.symbol);
      }
    }
    
    // 4. Fallback to mock stocks for symbol/English matches
    if (!isChineseQuery && results.length < 5) {
      const mockResults = POPULAR_STOCKS.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchTerm) ||
          stock.name.toLowerCase().includes(searchTerm)
      );
      
      for (const stock of mockResults) {
        if (!seenSymbols.has(stock.symbol)) {
          // Check if we have cached data for this symbol
          const cached = await prisma.stockNameCache.findUnique({
            where: { symbol: stock.symbol },
          });
          
          results.push({
            symbol: stock.symbol,
            name: cached?.name || stock.name,
            nameZh: cached?.nameZh || undefined,
            exchange: cached?.exchange || "NASDAQ",
            type: cached?.type || "Equity",
          });
          seenSymbols.add(stock.symbol);
        }
      }
    }

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
