import { NextRequest, NextResponse } from 'next/server'
import { FactorReportGenerator } from '@/lib/reporting/factor-report-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const generator = new FactorReportGenerator()

    const report = generator.generateReport({
      title: body.title || '因子有效性分析报告',
      generatedAt: new Date(),
      period: {
        start: new Date(body.period?.start || Date.now() - 365 * 24 * 60 * 60 * 1000),
        end: new Date(body.period?.end || Date.now()),
      },
      factors: body.factors || [],
      format: body.format || 'html',
    })

    if (body.format === 'json') {
      return NextResponse.json(report.json)
    }

    return new NextResponse(report.html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${report.filename}"`,
      },
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: '报告生成失败' },
      { status: 500 }
    )
  }
}
