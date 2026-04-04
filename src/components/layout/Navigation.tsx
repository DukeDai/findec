"use client"
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon?: string
  description?: string
}

const mainNav: NavItem[] = [
  { label: 'K线图', href: '/', description: '查看股票K线' },
  { label: 'Dashboard', href: '/dashboard', description: '快速查看股票' },
  { label: '量化分析', href: '/analysis', description: '因子选股、回测、监控' },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [learningMode, setLearningMode] = useState(false)

  // Determine current section for active state
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Findec
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:gap-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side: Learning mode + Mobile menu */}
          <div className="flex items-center gap-2">
            {/* Learning Mode Toggle */}
            <button
              onClick={() => setLearningMode(!learningMode)}
              className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                learningMode
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
              title="学习模式：显示概念解释和参数说明"
            >
              <span>📚</span>
              <span>学习模式</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-muted"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-1">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium rounded-md transition-colors",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <div>{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  )}
                </Link>
              ))}
              
              {/* Mobile learning mode */}
              <button
                onClick={() => {
                  setLearningMode(!learningMode)
                  setMobileMenuOpen(false)
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-md transition-colors text-left",
                  learningMode
                    ? "bg-purple-100 text-purple-700"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>📚</span>
                <span>学习模式 {learningMode ? '已开启' : '已关闭'}</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

// Context for learning mode (so child components can access)
import { createContext, useContext } from 'react'

interface LearningModeContextType {
  learningMode: boolean
  setLearningMode: (value: boolean) => void
}

export const LearningModeContext = createContext<LearningModeContextType>({
  learningMode: false,
  setLearningMode: () => {},
})

export function LearningModeProvider({ children }: { children: React.ReactNode }) {
  const [learningMode, setLearningMode] = useState(false)
  
  return (
    <LearningModeContext.Provider value={{ learningMode, setLearningMode }}>
      {children}
    </LearningModeContext.Provider>
  )
}

export function useLearningMode() {
  return useContext(LearningModeContext)
}
