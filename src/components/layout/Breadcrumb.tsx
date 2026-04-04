"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PAGE_NAMES: Record<string, string> = {
  '/': 'K线图',
  '/dashboard': 'Dashboard',
  '/analysis': '量化分析',
}

export function PageHeader() {
  const pathname = usePathname()
  
  const pageName = PAGE_NAMES[pathname] || 
    (pathname.startsWith('/chart/') ? pathname.split('/')[2]?.toUpperCase() : null)
  
  if (!pageName) return null
  
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground">
        {pageName}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        {pathname === '/' && '查看股票K线和技术指标'}
        {pathname === '/dashboard' && '快速查看股票信息和实时报价'}
        {pathname === '/analysis' && '因子选股、回测系统、组合分析'}
        {pathname.startsWith('/chart/') && 'K线图分析'}
      </p>
    </div>
  )
}
