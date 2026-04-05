'use client'

import { useState, useEffect } from 'react'
import { Search, Star, StarOff } from 'lucide-react'
import { VOCABULARY, VOCABULARY_CATEGORIES, getTermsByCategory, searchTerms, getTerm } from '@/lib/learning/vocabulary'
import { TermTooltip } from './TermTooltip'
import { cn } from '@/lib/utils'
import type { VocabCategory } from '@/lib/learning/vocabulary'

const FAVORITES_KEY = 'findec-vocab-favorites'

export function VocabularySearch() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<VocabCategory | 'all' | 'favorites'>('all')
  const [favorites, setFavorites] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY)
      if (stored) setFavorites(JSON.parse(stored))
    } catch {}
  }, [])

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id]
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  const results = query
    ? searchTerms(query)
    : activeCategory === 'favorites'
    ? Object.values(VOCABULARY).filter(v => favorites.includes(v.id))
    : activeCategory === 'all'
    ? Object.values(VOCABULARY)
    : getTermsByCategory(activeCategory)

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索术语..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn('px-2 py-1 text-xs rounded-full border transition-colors', activeCategory === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}
        >
          全部
        </button>
        <button
          onClick={() => setActiveCategory('favorites')}
          className={cn('px-2 py-1 text-xs rounded-full border transition-colors', activeCategory === 'favorites' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}
        >
          收藏 ({favorites.length})
        </button>
        {VOCABULARY_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn('px-2 py-1 text-xs rounded-full border transition-colors', activeCategory === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.length === 0 && (
          <p className="col-span-2 text-center text-muted-foreground text-sm py-8">未找到匹配的术语</p>
        )}
        {results.map(entry => (
          <div
            key={entry.id}
            className="border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{entry.term}</p>
                <span className={cn('text-xs', VOCABULARY_CATEGORIES.find(c => c.id === entry.category)?.color)}>
                  {VOCABULARY_CATEGORIES.find(c => c.id === entry.category)?.label}
                </span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); toggleFavorite(entry.id) }}
                className="text-muted-foreground hover:text-yellow-500 transition-colors"
              >
                {favorites.includes(entry.id) ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4" />}
              </button>
            </div>

            {expandedId === entry.id && (
              <div className="mt-2 space-y-2">
                {entry.formula && (
                  <code className="block text-xs bg-muted px-2 py-1 rounded font-mono">{entry.formula}</code>
                )}
                <p className="text-xs text-muted-foreground leading-relaxed">{entry.definition}</p>
                {entry.example && (
                  <p className="text-xs italic text-muted-foreground">例: {entry.example}</p>
                )}
                {entry.relatedTerms && entry.relatedTerms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.relatedTerms.map(id => {
                      const related = getTerm(id)
                      return related ? (
                        <TermTooltip key={id} termId={id}>
                          <span className="text-xs px-1.5 py-0.5 bg-muted rounded cursor-help">{related.term}</span>
                        </TermTooltip>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
