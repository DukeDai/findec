export interface BackupData {
  version: '1.0'
  exportedAt: string
  portfolios?: {
    portfolios: ExportedPortfolio[]
    positions: ExportedPosition[]
    transactions: ExportedTransaction[]
  }
  strategies?: {
    factorStrategies: ExportedFactorStrategy[]
    factorRules: ExportedFactorRule[]
  }
  alerts?: {
    alerts: ExportedAlert[]
  }
  userConfig?: {
    email: string | null
    emailAlertsEnabled: boolean
  }
}

export interface ExportedPortfolio {
  id?: string
  name: string
  cash: number
  createdAt?: string
}

export interface ExportedPosition {
  id?: string
  portfolioId?: string
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
}

export interface ExportedTransaction {
  id?: string
  portfolioId?: string
  symbol: string
  type: string
  quantity: number
  price: number
  total: number
  date: string
}

export interface ExportedFactorStrategy {
  id?: string
  name: string
  scoringMethod: string
  createdAt?: string
}

export interface ExportedFactorRule {
  id?: string
  strategyId?: string
  field: string
  operator: string
  value: number
  weight: number
}

export interface ExportedAlert {
  id?: string
  symbol: string
  condition: string
  threshold: number
  enabled: boolean
}

export interface ImportResult {
  success: boolean
  imported: {
    portfolios: number
    strategies: number
    alerts: number
  }
  errors: string[]
}

export async function exportAllData(options?: {
  includePortfolios?: boolean
  includeStrategies?: boolean
  includeAlerts?: boolean
  includeConfig?: boolean
}): Promise<BackupData> {
  const opts = {
    includePortfolios: true,
    includeStrategies: true,
    includeAlerts: true,
    includeConfig: true,
    ...options,
  }

  const backup: BackupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
  }

  if (opts.includePortfolios) {
    const [portfoliosRes, positionsRes, transactionsRes] = await Promise.all([
      fetch('/api/portfolios').then(r => r.json()).catch(() => []),
      Promise.all(
        (await fetch('/api/portfolios').then(r => r.json()).catch(() => []))
          .map((p: { id: string }) =>
            fetch(`/api/portfolios/${p.id}/positions`).then(r => r.json()).catch(() => [])
          )
      ),
      Promise.resolve([]),
    ])

    const flatPositions = (positionsRes as { symbol: string; quantity: number; avgCost: number; currentPrice: number }[][]).flat()
    backup.portfolios = {
      portfolios: (portfoliosRes as { name: string; cash: number; createdAt?: string }[]).map(p => ({
        name: p.name,
        cash: p.cash,
        createdAt: p.createdAt,
      })),
      positions: flatPositions.map(pos => ({
        symbol: pos.symbol,
        quantity: pos.quantity,
        avgCost: pos.avgCost,
        currentPrice: pos.currentPrice,
      })),
      transactions: [],
    }
  }

  if (opts.includeStrategies) {
    const strategiesRes = await fetch('/api/factors/strategies').then(r => r.json()).catch(() => [])
    backup.strategies = {
      factorStrategies: strategiesRes.map((s: { id?: string; name: string; scoringMethod: string; createdAt?: string }) => ({
        name: s.name,
        scoringMethod: s.scoringMethod ?? 'weighted_sum',
        createdAt: s.createdAt,
      })),
      factorRules: [],
    }
  }

  if (opts.includeAlerts) {
    const alertsRes = await fetch('/api/alerts').then(r => r.json()).catch(() => [])
    backup.alerts = {
      alerts: alertsRes.map((a: { id?: string; symbol: string; condition: string; threshold: number; enabled: boolean }) => ({
        symbol: a.symbol,
        condition: a.condition,
        threshold: a.threshold,
        enabled: a.enabled,
      })),
    }
  }

  return backup
}

export function downloadBackup(data: BackupData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `findec-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function validateBackup(data: unknown): data is BackupData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return d.version === '1.0' && typeof d.exportedAt === 'string'
}

export function summarizeBackup(data: BackupData): { portfolios: number; strategies: number; alerts: number } {
  return {
    portfolios: data.portfolios?.portfolios.length ?? 0,
    strategies: data.strategies?.factorStrategies.length ?? 0,
    alerts: data.alerts?.alerts.length ?? 0,
  }
}
