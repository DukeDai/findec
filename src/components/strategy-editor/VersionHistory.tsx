'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  History,
  RotateCcw,
  GitCompare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Version {
  id: string
  version: number
  name: string
  description?: string
  note?: string
  createdAt: string
  rules?: unknown
  actions?: unknown
  config?: unknown
}

interface VersionHistoryProps {
  entityId: string
  entityType: 'strategy' | 'backtest'
  currentData: {
    name: string
    description?: string
    rules?: unknown
    actions?: unknown
    config?: unknown
  }
  onRestore?: () => void
}

export function VersionHistory({
  entityId,
  entityType,
  currentData,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [compareVersion, setCompareVersion] = useState<Version | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newVersionNote, setNewVersionNote] = useState('')
  const [newVersionName, setNewVersionName] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)

  const apiPath = entityType === 'strategy'
    ? `/api/strategies/${entityId}/versions`
    : `/api/backtests/${entityId}/versions`

  const loadVersions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPath)
      if (!res.ok) throw new Error('Failed to load versions')
      const data = await res.json()
      setVersions(data)
    } catch {
      setError('加载版本历史失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isDialogOpen) {
      loadVersions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen])

  const createVersion = async () => {
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVersionName || undefined,
          note: newVersionNote || undefined,
          config: entityType === 'backtest' ? currentData.config : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create version')
      await loadVersions()
      setIsCreateDialogOpen(false)
      setNewVersionNote('')
      setNewVersionName('')
    } catch {
      setError('创建版本失败')
    }
  }

  const restoreVersion = async (versionId: string) => {
    setIsRestoring(true)
    try {
      const res = await fetch(`${apiPath}/${versionId}?action=restore`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to restore version')
      onRestore?.()
      setIsDialogOpen(false)
    } catch {
      setError('恢复版本失败')
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderDiff = (oldObj: unknown, newObj: unknown) => {
    const oldStr = JSON.stringify(oldObj, null, 2)
    const newStr = JSON.stringify(newObj, null, 2)
    
    const oldLines = oldStr.split('\n')
    const newLines = newStr.split('\n')
    
    const maxLines = Math.max(oldLines.length, newLines.length)
    const diff: { type: 'same' | 'removed' | 'added'; content: string }[] = []
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || ''
      const newLine = newLines[i] || ''
      
      if (oldLine === newLine) {
        diff.push({ type: 'same', content: oldLine })
      } else {
        if (oldLine) diff.push({ type: 'removed', content: oldLine })
        if (newLine) diff.push({ type: 'added', content: newLine })
      }
    }
    
    return (
      <div className="font-mono text-xs overflow-x-auto">
        {diff.map((line, idx) => (
          <div
            key={idx}
            className={cn(
              'px-2 py-0.5 whitespace-pre',
              line.type === 'removed' && 'bg-red-100 text-red-800',
              line.type === 'added' && 'bg-green-100 text-green-800',
              line.type === 'same' && 'text-muted-foreground'
            )}
          >
            {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
            {line.content}
          </div>
        ))}
      </div>
    )
  }

  const VersionDetailDialog = () => {
    if (!selectedVersion) return null

    const baseData = compareVersion || currentData
    const displayData = {
      name: selectedVersion.name,
      description: selectedVersion.description,
      rules: selectedVersion.rules,
      actions: selectedVersion.actions,
      config: selectedVersion.config,
    }

    return (
      <Dialog open={!!selectedVersion} onOpenChange={() => setSelectedVersion(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>版本详情</DialogTitle>
            <DialogDescription>
              版本 {selectedVersion.version} - {formatDate(selectedVersion.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-auto max-h-[60vh]">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">对比版本</label>
                <Select
                  value={compareVersion?.id || 'current'}
                  onValueChange={(value: string | null) => {
                    if (value === 'current' || value === null) {
                      setCompareVersion(null)
                    } else {
                      setCompareVersion(versions.find(v => v.id === value) || null)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择对比版本" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">当前版本</SelectItem>
                    {versions.filter(v => v.id !== selectedVersion.id).map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        版本 {v.version} - {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedVersion.note && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm font-medium mb-1">版本说明</div>
                <div className="text-sm text-muted-foreground">{selectedVersion.note}</div>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium flex items-center gap-2">
                <GitCompare className="w-4 h-4" />
                配置差异
              </div>
              <div className="max-h-64 overflow-auto">
                {renderDiff(
                  entityType === 'strategy'
                    ? { rules: baseData.rules, actions: baseData.actions }
                    : { config: baseData.config },
                  entityType === 'strategy'
                    ? { rules: displayData.rules, actions: displayData.actions }
                    : { config: displayData.config }
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedVersion(null)}
              >
                关闭
              </Button>
              <Button
                variant="secondary"
                onClick={() => restoreVersion(selectedVersion.id)}
                disabled={isRestoring}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isRestoring ? '恢复中...' : '恢复到此版本'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const CreateVersionDialog = () => (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建新版本</DialogTitle>
          <DialogDescription>
            保存当前配置为新版本
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              版本名称
            </label>
            <Input
              value={newVersionName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVersionName(e.target.value)}
              placeholder={`版本 ${versions.length > 0 ? versions[0].version + 1 : 1}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">
              版本说明
            </label>
            <Textarea
              value={newVersionNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewVersionNote(e.target.value)}
              placeholder="描述此版本的变更内容..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={createVersion} className="flex-1">
              创建版本
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDialogOpen(true)}
        >
          <History className="w-4 h-4 mr-2" />
          版本历史
          {versions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {versions.length}
            </Badge>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          保存版本
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>版本历史</DialogTitle>
            <DialogDescription>
              查看和管理所有历史版本
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无历史版本
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>版本</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>说明</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell className="font-medium">
                        v{version.version}
                      </TableCell>
                      <TableCell>{version.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {version.note || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedVersion(version)}
                          >
                            <GitCompare className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => restoreVersion(version.id)}
                            disabled={isRestoring}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VersionDetailDialog />
      <CreateVersionDialog />
    </>
  )
}
