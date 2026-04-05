'use client'

import { AlertManager } from '@/components/analysis/AlertManager'
import type { WidgetProps } from '../WidgetRegistry'

export function AlertListWidget(_props: WidgetProps) {
  return <AlertManager />
}
