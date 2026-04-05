'use client'

import { useState, useRef } from 'react'
import { Upload, Download, AlertCircle, CheckCircle2, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportAllData, downloadBackup, validateBackup, summarizeBackup, type BackupData } from '@/lib/export/backup'

export default function DataManagementPage() {
  const [exportOptions, setExportOptions] = useState({
    includePortfolios: true,
    includeStrategies: true,
    includeAlerts: true,
    includeConfig: true,
  })
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ portfolios: number; strategies: number; alerts: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setLoading(true)
    try {
      const data = await exportAllData(exportOptions)
      downloadBackup(data)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportError(null)
    setImportSuccess(null)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (!validateBackup(parsed)) {
          setImportError('无效的备份文件格式。请检查文件版本和结构。')
          return
        }
        setImportPreview(summarizeBackup(parsed))
      } catch {
        setImportError('无法解析 JSON 文件。')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importFile) return
    setLoading(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const content = await importFile.text()
      const data: BackupData = JSON.parse(content)
      if (!validateBackup(data)) {
        setImportError('备份文件验证失败。')
        return
      }

      const errors: string[] = []

      if (data.portfolios) {
        for (const portfolio of data.portfolios.portfolios) {
          try {
            await fetch('/api/portfolios', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: portfolio.name, cash: portfolio.cash }),
            })
          } catch {
            errors.push(`组合 "${portfolio.name}" 导入失败`)
          }
        }
      }

      if (data.strategies) {
        for (const strategy of data.strategies.factorStrategies) {
          try {
            await fetch('/api/factors/strategies', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: strategy.name, scoringMethod: strategy.scoringMethod }),
            })
          } catch {
            errors.push(`策略 "${strategy.name}" 导入失败`)
          }
        }
      }

      if (data.alerts) {
        for (const alert of data.alerts.alerts) {
          try {
            await fetch('/api/alerts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(alert),
            })
          } catch {
            errors.push(`预警 "${alert.symbol}" 导入失败`)
          }
        }
      }

      if (errors.length === 0) {
        const summary = summarizeBackup(data)
        setImportSuccess(`导入成功：${summary.portfolios}个组合、${summary.strategies}个策略、${summary.alerts}个预警`)
      } else {
        setImportError(`部分导入失败：${errors.join('；')}`)
      }
    } catch (err) {
      setImportError(`导入失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5" />
        <h1 className="text-2xl font-bold">数据管理</h1>
      </div>

      <div className="border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">导出数据</h2>
        <p className="text-sm text-muted-foreground">将组合、策略、预警等数据导出为 JSON 文件备份。</p>

        <div className="space-y-2">
          {[
            { key: 'includePortfolios', label: '投资组合' },
            { key: 'includeStrategies', label: '选股策略' },
            { key: 'includeAlerts', label: '预警规则' },
            { key: 'includeConfig', label: '用户配置' },
          ].map(opt => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions[opt.key as keyof typeof exportOptions]}
                onChange={e => setExportOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                className="rounded border-input"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleExport}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50',
          )}
        >
          <Download className="h-4 w-4" />
          {loading ? '导出中...' : '导出 JSON 备份'}
        </button>
      </div>

      <div className="border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">导入数据</h2>
        <p className="text-sm text-muted-foreground">从 JSON 备份文件恢复数据。重复数据将被跳过。</p>

        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {importFile ? importFile.name : '点击选择 JSON 备份文件，或拖拽文件到此处'}
          </p>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
        </div>

        {importPreview && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">预览：</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-background rounded-lg p-3">
                <p className="text-xl font-bold">{importPreview.portfolios}</p>
                <p className="text-xs text-muted-foreground">组合</p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <p className="text-xl font-bold">{importPreview.strategies}</p>
                <p className="text-xs text-muted-foreground">策略</p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <p className="text-xl font-bold">{importPreview.alerts}</p>
                <p className="text-xs text-muted-foreground">预警</p>
              </div>
            </div>
          </div>
        )}

        {importError && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{importError}</p>
          </div>
        )}

        {importSuccess && (
          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-400">{importSuccess}</p>
          </div>
        )}

        {importPreview && (
          <button
            onClick={handleImport}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50',
            )}
          >
            <Upload className="h-4 w-4" />
            {loading ? '导入中...' : '确认导入'}
          </button>
        )}
      </div>

      <div className="border rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold">版本信息</h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>备份格式版本: <span className="font-medium text-foreground">1.0</span></p>
          <p>导出时间: <span className="font-medium text-foreground">{new Date().toLocaleString('zh-CN')}</span></p>
        </div>
      </div>
    </div>
  )
}
