'use client'

import { useState } from 'react'
import { Download, FileText, FileType, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportBacktestCSV, exportBacktestHTML, exportBacktestPDF, exportStrategyCSV, type BacktestReportData } from '@/lib/export/exportUtils'

interface ExportPanelProps {
  strategyName?: string
  backtestData?: BacktestReportData
  strategyRules?: { field: string; operator: string; value: number; weight: number }[]
  onExportCSV?: () => void
  onExportHTML?: () => void
}

export function ExportPanel({ strategyName, backtestData, strategyRules }: ExportPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleCSV = async () => {
    if (backtestData) {
      exportBacktestCSV(backtestData)
    }
  }

  const handleHTML = async () => {
    if (backtestData) {
      exportBacktestHTML(backtestData)
    }
  }

  const handlePDF = async () => {
    if (backtestData) {
      exportBacktestPDF(backtestData)
    }
  }

  const handleStrategyCSV = () => {
    if (strategyRules && strategyName) {
      exportStrategyCSV({ name: strategyName, rules: strategyRules })
    }
  }

  const hasBacktestData = !!backtestData
  const hasStrategy = !!strategyRules && !!strategyName

  if (!hasBacktestData && !hasStrategy) return null

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Download className="h-4 w-4" />
        导出报告
      </div>

      <div className="flex flex-wrap gap-2">
        {hasBacktestData && (
          <>
            <button
              onClick={handleCSV}
              disabled={loading === 'csv'}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-muted transition-colors',
                loading === 'csv' && 'opacity-50'
              )}
            >
              <Table2 className="h-3.5 w-3.5" />
              {loading === 'csv' ? '导出中...' : '导出 CSV'}
            </button>
            <button
              onClick={handleHTML}
              disabled={loading === 'html'}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-muted transition-colors',
                loading === 'html' && 'opacity-50'
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              {loading === 'html' ? '生成中...' : '导出 HTML'}
            </button>
            <button
              onClick={handlePDF}
              disabled={loading === 'pdf'}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-muted transition-colors bg-primary text-primary-foreground hover:bg-primary/90',
                loading === 'pdf' && 'opacity-50'
              )}
            >
              <FileType className="h-3.5 w-3.5" />
              {loading === 'pdf' ? '生成中...' : '导出 PDF'}
            </button>
          </>
        )}
        {hasStrategy && (
          <button
            onClick={handleStrategyCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-md hover:bg-muted transition-colors"
          >
            <Table2 className="h-3.5 w-3.5" />
            导出策略规则
          </button>
        )}
      </div>

      {hasBacktestData && (
        <p className="text-xs text-muted-foreground">
          CSV 包含交易记录、月度收益和核心指标。PDF 按钮将生成专业分页报告，请在浏览器打印对话框中选择「另存为 PDF」。
        </p>
      )}
    </div>
  )
}
