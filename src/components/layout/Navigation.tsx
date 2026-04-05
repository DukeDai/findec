"use client"
import { useState, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ChevronDown, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon?: string
  description?: string
}

interface EducationPage {
  label: string
  href: string
  description: string
}

const mainNav: NavItem[] = [
  { label: 'K线图', href: '/', description: '查看股票K线' },
  { label: '量化分析', href: '/analysis', description: '因子选股、回测、监控' },
  { label: '策略编辑器', href: '/strategy-editor', description: '可视化策略创建' },
]

const educationPages: EducationPage[] = [
  { label: '词汇百科', href: '/education/vocabulary', description: '33+ 量化交易术语' },
  { label: '回测陷阱', href: '/education/backtest-pitfalls', description: '过拟合、前视偏差、生存者偏差' },
  { label: '因子投资', href: '/education/factor-investing', description: '因子收益、IC分析、Fama-French' },
  { label: '回测深度', href: '/education/backtest-advanced', description: '成本模型、Monte Carlo、显著性' },
  { label: '仓位管理', href: '/education/risk-management', description: 'Kelly公式、风险平价、VaR' },
  { label: '数据质量', href: '/education/data-quality', description: '股息调整、拆股处理、生存者偏差' },
  { label: '策略开发', href: '/education/strategy-development', description: '信号构建、去噪、事件驱动' },
  { label: '市场微观', href: '/education/market-microstructure', description: '订单类型、流动性、高频vs低频' },
]

// Context for learning mode (so child components can access)
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

export function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [educationDropdownOpen, setEducationDropdownOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const isEducationActive = () => {
    return pathname.startsWith('/education')
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FinDec
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

              {/* Education Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setEducationDropdownOpen(!educationDropdownOpen)}
                  onBlur={() => setTimeout(() => setEducationDropdownOpen(false), 150)}
                  className={cn(
                    "flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                    isEducationActive()
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>学习中心</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", educationDropdownOpen && "rotate-180")} />
                </button>

                {/* Dropdown Menu */}
                {educationDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-background border rounded-lg shadow-lg py-2 z-50">
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                      量化交易学习内容
                    </div>
                    {educationPages.map((page) => (
                      <Link
                        key={page.href}
                        href={page.href}
                        onClick={() => setEducationDropdownOpen(false)}
                        className={cn(
                          "flex flex-col px-3 py-2 hover:bg-muted transition-colors",
                          pathname === page.href && "bg-purple-50 dark:bg-purple-900/20"
                        )}
                      >
                        <span className="text-sm font-medium">{page.label}</span>
                        <span className="text-xs text-muted-foreground">{page.description}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/manual"
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors",
                pathname === '/manual'
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
              title="用户使用手册"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>手册</span>
            </Link>
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

              {/* Education Section Header */}
              <div className="px-4 py-2 text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2 mt-2">
                <GraduationCap className="w-4 h-4" />
                <span>学习中心</span>
              </div>

              {/* Education Pages */}
              {educationPages.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium rounded-md transition-colors",
                    pathname === page.href
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <div>{page.label}</div>
                  <div className="text-xs text-muted-foreground">{page.description}</div>
                </Link>
              ))}
              
              <div className="border-t my-2" />

              <Link
                href="/manual"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-md transition-colors",
                  pathname === '/manual'
                    ? "bg-blue-100 text-blue-700"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span>使用手册</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
