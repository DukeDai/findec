import { FundamentalData } from '@/lib/data/fundamental-data'

export interface FundamentalFactor {
  id: string
  name: string
  description: string
  category: 'valuation' | 'growth' | 'dividend' | 'quality'
}

export const FUNDAMENTAL_FACTORS: FundamentalFactor[] = [
  { id: 'pe_ratio', name: '市盈率(P/E)', category: 'valuation', description: '股价/每股收益，越低越便宜' },
  { id: 'peg_ratio', name: 'PEG', category: 'growth', description: 'P/E/增长率，<1被低估' },
  { id: 'pb_ratio', name: '市净率(P/B)', category: 'valuation', description: '股价/每股净资产' },
  { id: 'dividend_yield', name: '股息率', category: 'dividend', description: '年股息/股价' },
  { id: 'eps_growth', name: 'EPS增长', category: 'growth', description: '每股收益增长率' },
  { id: 'beta', name: '贝塔系数', category: 'quality', description: '波动性相对于大盘' },
]

export function calculateFundamentalFactors(data: FundamentalData): Record<string, number> {
  return {
    pe_ratio: data.pe ?? 0,
    peg_ratio: data.peg ?? 0,
    pb_ratio: data.pb ?? 0,
    dividend_yield: data.dividendYield ?? 0,
    eps_growth: data.eps ?? 0,
    beta: data.beta ?? 1,
  }
}
