'use client'

import { StrategyRule } from './ConditionRow'
import { ConditionRow } from './ConditionRow'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface ConditionGroupProps {
  rule: StrategyRule
  onChange: (rule: StrategyRule) => void
  onDelete?: () => void
  level?: number
}

export function ConditionGroup({
  rule,
  onChange,
  onDelete,
  level = 0,
}: ConditionGroupProps) {
  const addCondition = () => {
    const newCondition: StrategyRule = {
      type: 'condition',
      id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      indicator: '',
      operator: '',
    }
    onChange({
      ...rule,
      conditions: [...(rule.conditions || []), newCondition],
    })
  }

  const addGroup = () => {
    const newGroup: StrategyRule = {
      type: 'group',
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      logic: 'AND',
      conditions: [],
    }
    onChange({
      ...rule,
      conditions: [...(rule.conditions || []), newGroup],
    })
  }

  const updateCondition = (index: number, updatedRule: StrategyRule) => {
    const newConditions = [...(rule.conditions || [])]
    newConditions[index] = updatedRule
    onChange({ ...rule, conditions: newConditions })
  }

  const deleteCondition = (index: number) => {
    const newConditions = [...(rule.conditions || [])]
    newConditions.splice(index, 1)
    onChange({ ...rule, conditions: newConditions })
  }

  const toggleLogic = () => {
    onChange({
      ...rule,
      logic: rule.logic === 'AND' ? 'OR' : 'AND',
    })
  }

  if (level === 0) {
    return (
      <div className="space-y-3">
        {rule.conditions?.map((condition, index) =>
          condition.type === 'group' ? (
            <ConditionGroup
              key={condition.id}
              rule={condition}
              onChange={(updated) => updateCondition(index, updated)}
              onDelete={() => deleteCondition(index)}
              level={level + 1}
            />
          ) : (
            <ConditionRow
              key={condition.id}
              rule={condition}
              onChange={(updated) => updateCondition(index, updated)}
              onDelete={() => deleteCondition(index)}
            />
          )
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="w-4 h-4 mr-1" />
            添加条件
          </Button>
          <Button variant="outline" size="sm" onClick={addGroup}>
            <Plus className="w-4 h-4 mr-1" />
            添加条件组
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            条件组
          </span>
          <button
            onClick={toggleLogic}
            className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {rule.logic}
          </button>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {rule.conditions?.map((condition, index) =>
          condition.type === 'group' ? (
            <ConditionGroup
              key={condition.id}
              rule={condition}
              onChange={(updated) => updateCondition(index, updated)}
              onDelete={() => deleteCondition(index)}
              level={level + 1}
            />
          ) : (
            <div key={condition.id} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-xs font-medium text-muted-foreground px-2">
                  {rule.logic}
                </span>
              )}
              <div className="flex-1">
                <ConditionRow
                  rule={condition}
                  onChange={(updated) => updateCondition(index, updated)}
                  onDelete={() => deleteCondition(index)}
                />
              </div>
            </div>
          )
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={addCondition}>
          <Plus className="w-4 h-4 mr-1" />
          添加条件
        </Button>
        <Button variant="outline" size="sm" onClick={addGroup}>
          <Plus className="w-4 h-4 mr-1" />
          添加条件组
        </Button>
      </div>
    </div>
  )
}
