"use client"

import { ConceptTooltip } from './concept-tooltip'
import { HelpCircle } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  format?: 'percent' | 'currency' | 'ratio'
  change?: number
  concept?: {
    name: string
    description: string
    interpretation?: string
  }
}

export function MetricCard({ label, value, format, change, concept }: MetricCardProps) {
  const formattedValue = () => {
    if (typeof value === 'string') return value
    switch (format) {
      case 'percent': return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
      case 'currency': return `$${value.toFixed(2)}`
      case 'ratio': return value.toFixed(2)
      default: return String(value)
    }
  }

  const content = (
    <div className="bg-card rounded-lg border p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {concept && <HelpCircle className="w-3 h-3" />}
      </div>
      <div className={`text-xl font-bold mt-1 ${
        change !== undefined
          ? (change >= 0 ? 'text-green-500' : 'text-red-500')
          : ''
      }`}>
        {formattedValue()}
      </div>
      {change !== undefined && (
        <div className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
        </div>
      )}
    </div>
  )

  if (concept) {
    return (
      <ConceptTooltip
        concept={concept.name}
        title={concept.name}
        description={concept.description}
        example={concept.interpretation}
      >
        {content}
      </ConceptTooltip>
    )
  }

  return content
}
