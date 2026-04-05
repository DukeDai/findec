'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { getTerm } from '@/lib/learning/vocabulary'

interface TermTooltipProps {
  termId: string
  children: React.ReactNode
  className?: string
}

export function TermTooltip({ termId, children, className }: TermTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top')
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const entry = getTerm(termId)

  const showTooltip = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const vp = window.innerWidth
    const vph = window.innerHeight

    if (rect.top > tooltipRect.height + 8 && rect.left > vp / 2) setPosition('top')
    else if (rect.bottom + tooltipRect.height + 8 < vph && rect.left > vp / 2) setPosition('bottom')
    else if (rect.left > tooltipRect.width + 8) setPosition('left')
    else setPosition('right')

    setVisible(true)
  }, [])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-foreground border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-foreground border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-foreground border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-foreground border-y-transparent border-l-transparent',
  }

  if (!entry) return <span className={className}>{children}</span>

  return (
    <span
      ref={triggerRef}
      className={cn('relative inline cursor-help border-b border-dashed border-muted-foreground/50', className)}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-50 w-72 bg-popover border rounded-lg shadow-xl p-3 text-popover-foreground',
            positionClasses[position]
          )}
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
        >
          <div
            className={cn(
              'absolute w-0 h-0 border-4 border-transparent',
              position === 'top' && 'top-full left-1/2 -translate-x-1/2 border-t-foreground',
              position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 border-b-foreground',
              position === 'left' && 'left-full top-1/2 -translate-y-1/2 border-l-foreground',
              position === 'right' && 'right-full top-1/2 -translate-y-1/2 border-r-foreground'
            )}
          />
          <p className="font-semibold text-sm mb-1">{entry.term}</p>
          {entry.formula && (
            <code className="block text-xs bg-muted px-2 py-1 rounded mb-2 font-mono">{entry.formula}</code>
          )}
          <p className="text-xs leading-relaxed">{entry.definition}</p>
          {entry.relatedTerms && entry.relatedTerms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {entry.relatedTerms.map(id => {
                const related = getTerm(id)
                return related ? (
                  <span key={id} className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                    {related.term}
                  </span>
                ) : null
              })}
            </div>
          )}
        </div>
      )}
    </span>
  )
}
