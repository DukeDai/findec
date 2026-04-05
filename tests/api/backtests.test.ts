import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/backtests/route'
import type { NextRequest } from 'next/server'

const mockBacktestPlan = {
  id: 'test-id-1',
  name: 'Test Strategy',
  symbols: 'AAPL,MSFT',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  initialCapital: 10000,
  totalReturn: null,
  sharpeRatio: null,
  maxDrawdown: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockTrades = [
  { id: 'trade-1', symbol: 'AAPL', type: 'BUY', value: 5000 },
  { id: 'trade-2', symbol: 'AAPL', type: 'SELL', value: 5500 },
]

vi.mock('@/lib/prisma', () => ({
  prisma: {
    backtestPlan: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Backtests API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all backtests with trades', async () => {
      vi.mocked(prisma.backtestPlan.findMany).mockResolvedValue([
        { ...mockBacktestPlan, trades: mockTrades } as unknown as typeof mockBacktestPlan & { trades: typeof mockTrades },
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Test Strategy')
      expect(data[0].trades).toHaveLength(2)
      expect(prisma.backtestPlan.findMany).toHaveBeenCalledWith({
        include: { trades: true },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when no backtests exist', async () => {
      vi.mocked(prisma.backtestPlan.findMany).mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.backtestPlan.findMany).mockRejectedValue(new Error('DB Error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('内部服务器错误')
    })
  })

  describe('POST', () => {
    it('should create a backtest with valid data', async () => {
      const requestBody = {
        name: 'New Strategy',
        symbols: ['AAPL', 'MSFT'],
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        initialCapital: '10000',
      }

      vi.mocked(prisma.backtestPlan.create).mockResolvedValue(mockBacktestPlan)

      const request = new Request('http://localhost/api/backtests', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Test Strategy')
      expect(prisma.backtestPlan.create).toHaveBeenCalledWith({
        data: {
          name: 'New Strategy',
          symbols: 'AAPL,MSFT',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          initialCapital: 10000,
        },
      })
    })

    it('should return 400 when required fields are missing', async () => {
      const invalidBodies = [
        {},
        { name: 'Test' },
        { name: 'Test', symbols: ['AAPL'] },
        { name: 'Test', symbols: ['AAPL'], startDate: '2024-01-01' },
      ]

      for (const body of invalidBodies) {
        const request = new Request('http://localhost/api/backtests', {
          method: 'POST',
          body: JSON.stringify(body),
        })

        const response = await POST(request as unknown as NextRequest)
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toBe('缺少必填字段')
      }
    })

    it('should handle symbols as string', async () => {
      const requestBody = {
        name: 'New Strategy',
        symbols: 'AAPL,MSFT',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        initialCapital: '10000',
      }

      vi.mocked(prisma.backtestPlan.create).mockResolvedValue(mockBacktestPlan)

      const request = new Request('http://localhost/api/backtests', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request as unknown as NextRequest)

      expect(response.status).toBe(201)
      expect(prisma.backtestPlan.create).toHaveBeenCalledWith({
        data: {
          name: 'New Strategy',
          symbols: 'AAPL,MSFT',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          initialCapital: 10000,
        },
      })
    })

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.backtestPlan.create).mockRejectedValue(new Error('DB Error'))

      const request = new Request('http://localhost/api/backtests', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          symbols: ['AAPL'],
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          initialCapital: '10000',
        }),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('内部服务器错误')
    })
  })
})
