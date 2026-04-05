# Education Module - FinDec

## Overview

Interactive learning content with `学习模式` badge. Each page has tabbed interactive demos using Recharts.

## Pages

| Route | File | Topic | Tabs |
|-------|------|-------|------|
| `/education/vocabulary` | `vocabulary/page.tsx` | 词汇百科 | - |
| `/education/backtest-pitfalls` | `backtest-pitfalls/page.tsx` | 回测陷阱 | 3 |
| `/education/factor-investing` | `factor-investing/page.tsx` | 因子投资 | 5 |
| `/education/backtest-advanced` | `backtest-advanced/page.tsx` | 回测深度 | 5 |
| `/education/risk-management` | `risk-management/page.tsx` | 仓位管理 | 5 |
| `/education/data-quality` | `data-quality/page.tsx` | 数据质量 | 5 |
| `/education/strategy-development` | `strategy-development/page.tsx` | 策略开发 | 5 |
| `/education/market-microstructure` | `market-microstructure/page.tsx` | 市场微观 | 5 |

## Conventions

- **File structure**: Each page is `src/app/education/[topic]/page.tsx` (Next.js App Router standard)
- **Export**: Each page exports default function component
- **Naming**: `kebab-case` directory names
- **Styling**: Tailwind only, Chinese labels, bg-amber boxes for `学习要点`
- **Charts**: Recharts with `ResponsiveContainer`
- **Interactivity**: `useState` for tabs, sliders, toggles
- **Badge**: `<span className="px-2 py-0.5 text-xs rounded-full bg-purple-100...">学习模式</span>`

## Learning Mode

Global toggle via `LearningModeProvider` in `src/app/layout.tsx`. When enabled, TermTooltips show on hover over vocabulary terms.
