'use client'

import React from 'react'

// Widget component types - will be lazy loaded
export interface Widget {
  id: string
  name: string
  description: string
  component: React.ComponentType<any>
  defaultVisible: boolean
  defaultOrder: number
  minWidth?: number
  minHeight?: number
  requiresPortfolio?: boolean
}

export interface WidgetProps {
  portfolioId?: string
  className?: string
}

// Layout configuration for localStorage
export interface WidgetLayout {
  id: string
  visible: boolean
  order: number
}

export interface DashboardLayout {
  widgets: WidgetLayout[]
  updatedAt: string
}

const LAYOUT_STORAGE_KEY = 'findec-dashboard-layout'

// Default layout configuration
export const DEFAULT_LAYOUT: WidgetLayout[] = [
  { id: 'portfolio-overview', visible: true, order: 0 },
  { id: 'portfolio-health', visible: true, order: 1 },
  { id: 'quick-quote', visible: true, order: 2 },
  { id: 'risk-metrics', visible: true, order: 3 },
  { id: 'alert-list', visible: false, order: 4 },
  { id: 'mini-chart', visible: false, order: 5 },
]

// Import widget components
import { PortfolioOverviewWidget } from './widgets/PortfolioOverviewWidget'
import { QuickQuoteWidget } from './widgets/QuickQuoteWidget'
import { RiskMetricsWidget } from './widgets/RiskMetricsWidget'
import { AlertListWidget } from './widgets/AlertListWidget'
import { MiniChartWidget } from './widgets/MiniChartWidget'
import { PortfolioHealthWidget } from './widgets/PortfolioHealthWidget'

// Widget registry definition
export const WIDGET_REGISTRY: Widget[] = [
  {
    id: 'portfolio-overview',
    name: '组合概览',
    description: '显示投资组合的总市值、总成本、盈亏和持仓数量等关键指标',
    component: PortfolioOverviewWidget,
    defaultVisible: true,
    defaultOrder: 0,
    minWidth: 4,
    minHeight: 1,
    requiresPortfolio: true,
  },
  {
    id: 'quick-quote',
    name: '快捷报价',
    description: '快速查询任意股票的实时报价信息',
    component: QuickQuoteWidget,
    defaultVisible: true,
    defaultOrder: 1,
    minWidth: 1,
    minHeight: 1,
    requiresPortfolio: false,
  },
  {
    id: 'risk-metrics',
    name: '风险指标',
    description: '监控组合风险指标，包括回撤、波动率、VaR等',
    component: RiskMetricsWidget,
    defaultVisible: true,
    defaultOrder: 2,
    minWidth: 2,
    minHeight: 2,
    requiresPortfolio: true,
  },
  {
    id: 'alert-list',
    name: '预警列表',
    description: '管理和查看价格预警、指标预警等',
    component: AlertListWidget,
    defaultVisible: false,
    defaultOrder: 3,
    minWidth: 2,
    minHeight: 2,
    requiresPortfolio: false,
  },
  {
    id: 'portfolio-health',
    name: '组合健康度',
    description: '0-100 综合评分，从集中度、波动率、相关性、流动性、风险收益5个维度评估组合健康状态',
    component: PortfolioHealthWidget,
    defaultVisible: true,
    defaultOrder: 1,
    minWidth: 2,
    minHeight: 2,
    requiresPortfolio: true,
  },
  {
    id: 'mini-chart',
    name: '迷你图表',
    description: '显示自选股票的迷你K线图',
    component: MiniChartWidget,
    defaultVisible: false,
    defaultOrder: 5,
    minWidth: 2,
    minHeight: 2,
    requiresPortfolio: false,
  },
]

// Load layout from localStorage
export function loadLayout(): WidgetLayout[] {
  if (typeof window === 'undefined') {
    return DEFAULT_LAYOUT
  }

  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (stored) {
      const layout: DashboardLayout = JSON.parse(stored)
      // Merge with default to ensure all widgets exist
      const merged = DEFAULT_LAYOUT.map((defaultWidget) => {
        const storedWidget = layout.widgets.find((w) => w.id === defaultWidget.id)
        return storedWidget || defaultWidget
      })
      return merged
    }
  } catch (error) {
    console.error('Failed to load dashboard layout:', error)
  }

  return DEFAULT_LAYOUT
}

// Save layout to localStorage
export function saveLayout(layout: WidgetLayout[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const dashboardLayout: DashboardLayout = {
      widgets: layout,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(dashboardLayout))
  } catch (error) {
    console.error('Failed to save dashboard layout:', error)
  }
}

// Reset layout to default
export function resetLayout(): WidgetLayout[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LAYOUT_STORAGE_KEY)
  }
  return DEFAULT_LAYOUT
}

// Get visible widgets sorted by order
export function getVisibleWidgets(layout: WidgetLayout[]): Widget[] {
  const visibleLayout = layout.filter((w) => w.visible)
  const sortedLayout = visibleLayout.sort((a, b) => a.order - b.order)

  return sortedLayout
    .map((layoutItem) => WIDGET_REGISTRY.find((w) => w.id === layoutItem.id))
    .filter((widget): widget is Widget => widget !== undefined)
}

// Reorder widget (move up or down)
export function reorderWidget(
  layout: WidgetLayout[],
  widgetId: string,
  direction: 'up' | 'down'
): WidgetLayout[] {
  const visibleWidgets = layout.filter((w) => w.visible)
  const currentIndex = visibleWidgets.findIndex((w) => w.id === widgetId)

  if (currentIndex === -1) return layout

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

  if (newIndex < 0 || newIndex >= visibleWidgets.length) return layout

  // Swap orders
  const newLayout = [...layout]
  const currentWidget = newLayout.find((w) => w.id === widgetId)
  const targetWidget = visibleWidgets[newIndex]
  const targetLayoutItem = newLayout.find((w) => w.id === targetWidget.id)

  if (currentWidget && targetLayoutItem) {
    const tempOrder = currentWidget.order
    currentWidget.order = targetLayoutItem.order
    targetLayoutItem.order = tempOrder
  }

  return newLayout
}

// Toggle widget visibility
export function toggleWidgetVisibility(
  layout: WidgetLayout[],
  widgetId: string,
  visible: boolean
): WidgetLayout[] {
  const newLayout = [...layout]
  const widget = newLayout.find((w) => w.id === widgetId)

  if (widget) {
    widget.visible = visible
    // If making visible, assign it the next available order
    if (visible) {
      const maxOrder = Math.max(...newLayout.filter((w) => w.visible).map((w) => w.order), -1)
      widget.order = maxOrder + 1
    }
  }

  return newLayout
}
