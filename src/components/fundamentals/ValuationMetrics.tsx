'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FundamentalData } from '@/lib/data/fundamental-data'

interface ValuationMetricsProps {
  data: FundamentalData
}

interface MetricItem {
  label: string
  value: number | null
  unit: string
  description: string
}

function getValuationBadge(pe: number | null): { text: string; color: string } {
  if (pe === null) return { text: '暂无数据', color: 'bg-gray-100 text-gray-600' }
  if (pe < 15) return { text: '低估', color: 'bg-green-100 text-green-700' }
  if (pe < 25) return { text: '合理', color: 'bg-blue-100 text-blue-700' }
  return { text: '偏高', color: 'bg-red-100 text-red-700' }
}

function getPBBadge(pb: number | null): { text: string; color: string } {
  if (pb === null) return { text: '暂无数据', color: 'bg-gray-100 text-gray-600' }
  if (pb < 1) return { text: '低估', color: 'bg-green-100 text-green-700' }
  if (pb < 3) return { text: '合理', color: 'bg-blue-100 text-blue-700' }
  return { text: '偏高', color: 'bg-red-100 text-red-700' }
}

function formatValue(value: number | null, decimals: number = 2): string {
  if (value === null) return '--'
  return value.toFixed(decimals)
}

export function ValuationMetrics({ data }: ValuationMetricsProps) {
  const peBadge = getValuationBadge(data.pe)
  const pbBadge = getPBBadge(data.pb)

  const metrics: MetricItem[] = [
    {
      label: '市盈率 (PE)',
      value: data.pe,
      unit: '倍',
      description: '股价除以每股收益，衡量股票估值水平',
    },
    {
      label: '市净率 (PB)',
      value: data.pb,
      unit: '倍',
      description: '股价除以每股净资产，衡量公司资产价值',
    },
    {
      label: '市销率 (PS)',
      value: null,
      unit: '倍',
      description: '市值除以营收，评估收入估值水平',
    },
    {
      label: 'EV/EBITDA',
      value: null,
      unit: '倍',
      description: '企业价值除以息税折旧前利润，衡量运营效率',
    },
    {
      label: 'PEG',
      value: data.peg,
      unit: '',
      description: '市盈率相对增长比，综合考量估值与成长性',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                市盈率 (PE)
              </CardTitle>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${peBadge.color}`}>
                {peBadge.text}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatValue(data.pe)}
              <span className="text-lg text-muted-foreground ml-1">倍</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              股价除以每股收益，衡量股票估值水平
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                市净率 (PB)
              </CardTitle>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${pbBadge.color}`}>
                {pbBadge.text}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatValue(data.pb)}
              <span className="text-lg text-muted-foreground ml-1">倍</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              股价除以每股净资产，衡量公司资产价值
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">其他估值指标</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {metrics.slice(2).map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                </div>
                <div className="text-2xl font-semibold">
                  {metric.value !== null ? (
                    <>
                      {formatValue(metric.value)}
                      <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-base">计算中</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
