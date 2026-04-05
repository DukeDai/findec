'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ConditionGroup,
  ActionConfig,
  StrategyPreview,
  StrategyRule,
  StrategyAction,
} from '@/components/strategy-editor'
import { Plus, Save, Trash2, Edit2, ChevronLeft, AlertCircle } from 'lucide-react'

interface CustomStrategy {
  id: string
  name: string
  description: string | null
  rules: StrategyRule
  actions: StrategyAction
  createdAt: string
  updatedAt: string
}

const DEFAULT_RULE: StrategyRule = {
  type: 'group',
  id: 'root',
  logic: 'AND',
  conditions: [],
}

const DEFAULT_ACTION: StrategyAction = {
  type: 'buy',
  positionSize: 0.1,
  stopLoss: 0.05,
  takeProfit: 0.1,
}

export default function StrategyEditorPage() {
  const [strategies, setStrategies] = useState<CustomStrategy[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<CustomStrategy | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rootRule, setRootRule] = useState<StrategyRule>(DEFAULT_RULE)
  const [action, setAction] = useState<StrategyAction>(DEFAULT_ACTION)

  useEffect(() => {
    loadStrategies()
  }, [])

  const loadStrategies = async () => {
    try {
      const res = await fetch('/api/strategies')
      if (!res.ok) throw new Error('Failed to load strategies')
      const data = await res.json()
      setStrategies(data)
    } catch {
      setError('加载策略列表失败')
    }
  }

  const handleNewStrategy = () => {
    setSelectedStrategy(null)
    setIsEditing(true)
    setName('')
    setDescription('')
    setRootRule(DEFAULT_RULE)
    setAction(DEFAULT_ACTION)
    setError(null)
    setSuccess(null)
  }

  const handleEditStrategy = (strategy: CustomStrategy) => {
    setSelectedStrategy(strategy)
    setIsEditing(true)
    setName(strategy.name)
    setDescription(strategy.description || '')
    setRootRule(strategy.rules)
    setAction(strategy.actions)
    setError(null)
    setSuccess(null)
  }

  const handleSaveStrategy = async () => {
    if (!name.trim()) {
      setError('请输入策略名称')
      return
    }

    if (!rootRule.conditions || rootRule.conditions.length === 0) {
      setError('请至少添加一个条件')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        rules: rootRule,
        actions: action,
      }

      if (selectedStrategy) {
        const res = await fetch(`/api/strategies/${selectedStrategy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update strategy')
        setSuccess('策略更新成功')
      } else {
        const res = await fetch('/api/strategies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create strategy')
        setSuccess('策略创建成功')
      }

      await loadStrategies()
      setIsEditing(false)
      setSelectedStrategy(null)
    } catch {
      setError(selectedStrategy ? '更新策略失败' : '创建策略失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStrategy = async (id: string) => {
    if (!confirm('确定要删除这个策略吗？')) return

    try {
      const res = await fetch(`/api/strategies/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete strategy')
      await loadStrategies()
      if (selectedStrategy?.id === id) {
        setSelectedStrategy(null)
        setIsEditing(false)
      }
      setSuccess('策略删除成功')
    } catch {
      setError('删除策略失败')
    }
  }

  const handleBackToList = () => {
    setIsEditing(false)
    setSelectedStrategy(null)
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">策略编辑器</h1>
          <p className="text-sm text-muted-foreground mt-1">
            可视化创建交易策略，无需编写代码
          </p>
        </div>

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-1 ${isEditing ? 'hidden lg:block' : ''}`}>
            <Card>
              <CardHeader>
                <CardTitle>我的策略</CardTitle>
                <CardDescription>已保存的交易策略</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleNewStrategy} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  新建策略
                </Button>

                <div className="space-y-2 mt-4">
                  {strategies.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      暂无保存的策略
                    </p>
                  ) : (
                    strategies.map((strategy) => (
                      <div
                        key={strategy.id}
                        className="p-3 rounded-lg border hover:border-primary/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => handleEditStrategy(strategy)}
                          >
                            <h4 className="font-medium text-sm">{strategy.name}</h4>
                            {strategy.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {strategy.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditStrategy(strategy)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteStrategy(strategy.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className={`lg:col-span-2 ${!isEditing ? 'hidden lg:block' : ''}`}>
            {isEditing ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToList}
                      className="lg:hidden"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <CardTitle>
                      {selectedStrategy ? '编辑策略' : '新建策略'}
                    </CardTitle>
                  </div>
                  <CardDescription>配置策略条件和执行动作</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        策略名称
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="输入策略名称"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">
                        策略描述
                      </label>
                      <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="输入策略描述（可选）"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">条件设置</h3>
                    <ConditionGroup rule={rootRule} onChange={setRootRule} />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">执行动作</h3>
                    <ActionConfig action={action} onChange={setAction} />
                  </div>

                  <StrategyPreview rootRule={rootRule} action={action} />

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleBackToList}
                      className="hidden lg:flex"
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleSaveStrategy}
                      disabled={isLoading}
                      className="flex-1 lg:flex-none"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? '保存中...' : '保存策略'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center">
                <div>
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    选择一个策略或创建新策略
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    使用可视化编辑器创建无需代码的交易策略
                  </p>
                  <Button onClick={handleNewStrategy} className="hidden lg:flex">
                    <Plus className="w-4 h-4 mr-2" />
                    新建策略
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
