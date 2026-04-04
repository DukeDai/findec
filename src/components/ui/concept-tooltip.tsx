"use client"

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface ConceptTooltipProps {
  concept: string
  children: React.ReactNode
  title?: string
  description: string
  example?: string
}

export function ConceptTooltip({ concept, children, title, description, example }: ConceptTooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground cursor-help"
        title={`了解${concept}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-popover border rounded-lg shadow-lg text-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="font-medium">{title || concept}</span>
            <button onClick={() => setShow(false)} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-muted-foreground mb-2">{description}</p>
          {example && (
            <p className="text-xs bg-muted p-2 rounded">
              <span className="font-medium">示例:</span> {example}
            </p>
          )}
        </div>
      )}
    </span>
  )
}
