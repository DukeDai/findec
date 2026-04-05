import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalCount = await prisma.stockNameCache.count();
    const withChineseName = await prisma.stockNameCache.count({
      where: {
        nameZh: {
          not: null,
        },
      },
    });
    
    const oldestCache = await prisma.stockNameCache.findFirst({
      orderBy: {
        cachedAt: "asc",
      },
      select: {
        cachedAt: true,
      },
    });
    
    const newestCache = await prisma.stockNameCache.findFirst({
      orderBy: {
        cachedAt: "desc",
      },
      select: {
        cachedAt: true,
      },
    });

    return NextResponse.json({
      total: totalCount,
      withChineseName: withChineseName,
      oldestCache: oldestCache?.cachedAt || null,
      newestCache: newestCache?.cachedAt || null,
    }, { status: 200 });
  } catch (error) {
    console.error("Cache status error:", error);
    return NextResponse.json(
      { error: "Failed to get cache status" },
      { status: 500 }
    );
  }
}
