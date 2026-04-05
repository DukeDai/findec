import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('paper-trade')

export interface PaperOrderInput {
  accountId: string
  symbol: string
  side: 'BUY' | 'SELL'
  type: 'MARKET' | 'LIMIT'
  price?: number
  quantity: number
}

export interface PaperPosition {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  marketValue: number
}

export interface PaperAccountSummary {
  id: string
  name: string
  initialCash: number
  cash: number
  totalValue: number
  totalUnrealizedPnL: number
  totalRealizedPnL: number
  positions: PaperPosition[]
}

export async function createAccount(name: string, initialCash: number) {
  return prisma.paperAccount.create({
    data: { name, initialCash, cash: initialCash },
  })
}

export async function getAccount(accountId: string): Promise<PaperAccountSummary | null> {
  const account = await prisma.paperAccount.findUnique({
    where: { id: accountId },
    include: { positions: true },
  })
  if (!account) return null

  const positions = await enrichPositions(account.positions)
  const totalValue = account.cash + positions.reduce((s, p) => s + p.marketValue, 0)
  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnL, 0)

  return {
    id: account.id,
    name: account.name,
    initialCash: account.initialCash,
    cash: account.cash,
    totalValue,
    totalUnrealizedPnL: totalUnrealized,
    totalRealizedPnL: 0,
    positions,
  }
}

export async function listAccounts(): Promise<PaperAccountSummary[]> {
  const accounts = await prisma.paperAccount.findMany({
    include: { positions: true },
    orderBy: { createdAt: 'desc' },
  })

  const summaries: PaperAccountSummary[] = []
  for (const account of accounts) {
    const positions = await enrichPositions(account.positions)
    const totalValue = account.cash + positions.reduce((s, p) => s + p.marketValue, 0)
    summaries.push({
      id: account.id,
      name: account.name,
      initialCash: account.initialCash,
      cash: account.cash,
      totalValue,
      totalUnrealizedPnL: positions.reduce((s, p) => s + p.unrealizedPnL, 0),
      totalRealizedPnL: 0,
      positions,
    })
  }
  return summaries
}

export async function placeOrder(input: PaperOrderInput) {
  return prisma.paperOrder.create({
    data: {
      accountId: input.accountId,
      symbol: input.symbol.toUpperCase(),
      side: input.side,
      type: input.type,
      price: input.price ?? null,
      quantity: input.quantity,
      status: 'PENDING',
    },
  })
}

export async function cancelOrder(orderId: string) {
  const order = await prisma.paperOrder.findUnique({ where: { id: orderId } })
  if (!order || order.status !== 'PENDING') return null

  return prisma.paperOrder.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
  })
}

export async function executePendingOrders(accountId: string, getPrice: (symbol: string) => Promise<number>) {
  const pending = await prisma.paperOrder.findMany({
    where: { accountId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })

  const account = await prisma.paperAccount.findUnique({ where: { id: accountId } })
  if (!account) return []

  let cash = account.cash
  const filled: string[] = []
  const errors: string[] = []

  for (const order of pending) {
    try {
      const price = order.type === 'LIMIT' && order.price !== null
        ? order.price
        : await getPrice(order.symbol)

      if (order.side === 'BUY') {
        const cost = price * order.quantity
        if (cost > cash) {
          errors.push(`${order.symbol}: insufficient cash (need $${cost.toFixed(2)}, have $${cash.toFixed(2)})`)
          continue
        }
        cash -= cost

        const existing = await prisma.paperPosition.findFirst({
          where: { accountId, symbol: order.symbol },
        })
        if (existing) {
          const newQty = existing.quantity + order.quantity
          const newAvgCost = (existing.avgCost * existing.quantity + price * order.quantity) / newQty
          await prisma.paperPosition.update({
            where: { id: existing.id },
            data: { quantity: newQty, avgCost: newAvgCost, currentPrice: price },
          })
        } else {
          await prisma.paperPosition.create({
            data: {
              accountId,
              symbol: order.symbol,
              quantity: order.quantity,
              avgCost: price,
              currentPrice: price,
            },
          })
        }
      } else {
        const position = await prisma.paperPosition.findFirst({
          where: { accountId, symbol: order.symbol },
        })
        if (!position || position.quantity < order.quantity) {
          errors.push(`${order.symbol}: insufficient position to sell`)
          continue
        }
        cash += price * order.quantity
        const newQty = position.quantity - order.quantity
        if (newQty <= 0) {
          await prisma.paperPosition.delete({ where: { id: position.id } })
        } else {
          await prisma.paperPosition.update({
            where: { id: position.id },
            data: { quantity: newQty },
          })
        }
      }

      await prisma.paperOrder.update({
        where: { id: order.id },
        data: { status: 'FILLED', filledAt: new Date(), filledPrice: price },
      })
      filled.push(order.id)
    } catch (e) {
      errors.push(`${order.symbol}: execution error - ${String(e)}`)
      logger.error(`Order execution failed for ${order.symbol}`, e)
    }
  }

  if (cash !== account.cash) {
    await prisma.paperAccount.update({
      where: { id: accountId },
      data: { cash },
    })
  }

  return filled.map(id => ({ id, status: 'FILLED' }))
}

async function enrichPositions(positions: { symbol: string; quantity: number; avgCost: number; currentPrice: number }[]): Promise<PaperPosition[]> {
  return positions.map(p => {
    const marketValue = p.quantity * p.currentPrice
    const cost = p.quantity * p.avgCost
    const unrealizedPnL = marketValue - cost
    const unrealizedPnLPercent = cost > 0 ? (unrealizedPnL / cost) * 100 : 0
    return {
      symbol: p.symbol,
      quantity: p.quantity,
      avgCost: p.avgCost,
      currentPrice: p.currentPrice,
      unrealizedPnL,
      unrealizedPnLPercent,
      marketValue,
    }
  })
}

export async function updatePositionPrices(accountId: string, getPrice: (symbol: string) => Promise<number>) {
  const positions = await prisma.paperPosition.findMany({ where: { accountId } })
  for (const pos of positions) {
    try {
      const price = await getPrice(pos.symbol)
      await prisma.paperPosition.update({
        where: { id: pos.id },
        data: { currentPrice: price },
      })
    } catch {
      logger.warn('Failed to update price', { symbol: pos.symbol, accountId })
    }
  }
}

export async function getOrders(accountId: string) {
  return prisma.paperOrder.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
  })
}
