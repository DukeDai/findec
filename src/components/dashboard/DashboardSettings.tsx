'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Settings, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react'
import {
  WIDGET_REGISTRY,
  WidgetLayout,
  loadLayout,
  saveLayout,
  resetLayout,
  reorderWidget,
  toggleWidgetVisibility,
  DEFAULT_LAYOUT,
} from './WidgetRegistry'

interface DashboardSettingsProps {
  onLayoutChange?: (layout: WidgetLayout[]) => void
}

export function DashboardSettings({ onLayoutChange }: DashboardSettingsProps) {
  const [layout, setLayout] = useState<WidgetLayout[]>(DEFAULT_LAYOUT)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setLayout(loadLayout())
  }, [])

  const handleToggleVisibility = (widgetId: string, visible: boolean) => {
    const newLayout = toggleWidgetVisibility(layout, widgetId, visible)
    setLayout(newLayout)
    saveLayout(newLayout)
    onLayoutChange?.(newLayout)
  }

  const handleReorder = (widgetId: string, direction: 'up' | 'down') => {
    const newLayout = reorderWidget(layout, widgetId, direction)
    setLayout(newLayout)
    saveLayout(newLayout)
    onLayoutChange?.(newLayout)
  }

  const handleReset = () => {
    const defaultLayout = resetLayout()
    setLayout(defaultLayout)
    onLayoutChange?.(defaultLayout)
  }

  const visibleWidgets = layout
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>仪表盘设置</span>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              恢复默认
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">显示/隐藏组件</h4>
            <div className="space-y-2">
              {WIDGET_REGISTRY.map((widget) => {
                const layoutItem = layout.find((w) => w.id === widget.id)
                const isVisible = layoutItem?.visible ?? widget.defaultVisible

                return (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{widget.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {widget.description}
                      </p>
                    </div>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={(checked: boolean) =>
                        handleToggleVisibility(widget.id, checked)
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {visibleWidgets.length > 1 && (
            <div>
              <h4 className="text-sm font-medium mb-3">排序</h4>
              <div className="space-y-2">
                {visibleWidgets.map((item, index) => {
                  const widget = WIDGET_REGISTRY.find((w) => w.id === item.id)
                  if (!widget) return null

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">
                          {index + 1}
                        </span>
                        <span className="font-medium text-sm">
                          {widget.name}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === 0}
                          onClick={() => handleReorder(item.id, 'up')}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === visibleWidgets.length - 1}
                          onClick={() => handleReorder(item.id, 'down')}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
