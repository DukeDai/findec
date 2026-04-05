import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/factors/screen/route'
import type { NextRequest } from 'next/server'

const mockStrategy = {
  id: 'strategy-1',
  name: 'Value Strategy',
  description: null,
  rules: [
    { id: 'rule-1', field: 'pe_ratio', operator: '<', value: 20, weight: 1.5 },
    { id: 'rule-2', field: 'roe', operator: '>', value: 15, weight: 1.0 },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockScreeningResult = {
  id: 'result-1',
  strategyId: 'strategy-1',
  symbol: 'AAPL',
  score: 85.5,
  details: '{"matchedRules": 2, "totalRules": 2}',
  screenedAt: new Date(),
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    factorStrategy: {
      findUnique: vi.fn(),
    },
    screeningResult: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/yahoo-finance', () => ({
  getHistoricalData: vi.fn().mockResolvedValue([
    { date: new Date(), open: 150, high: 155, low: 148, close: 152, volume: 1000000 },
  ]),
}))

vi.mock('@/lib/factors/factor-library', () => ({
  FactorLibrary: vi.fn().mockImplementation(function() {
    return {
      calculateFactors: vi.fn().mockReturnValue([
        { factorId: 'pe_ratio', value: 18, symbol: 'AAPL', date: new Date() },
        { factorId: 'roe', value: 20, symbol: 'AAPL', date: new Date() },
      ]),
    }
  }),
}))

vi.mock('@/lib/factors/screening-engine', () => ({
  ScreeningEngine: vi.fn().mockImplementation(function() {
    return {
      screen: vi.fn().mockResolvedValue([
        {
          symbol: 'AAPL',
          score: 85.5,
          matchedRules: 2,
          totalRules: 2,
          factorValues: new Map([['pe_ratio', 18], ['roe', 20]]),
          rank: 1,
        },
      ]),
    }
  }),
  ScreeningStrategy: {},
  ScreeningRule: {},
}))

import { prisma } from '@/lib/prisma'

describe('Factors Screen API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST', () => {
    it('should run screening with valid strategy and symbols', async () => {
      vi.mocked(prisma.factorStrategy.findUnique).mockResolvedValue(mockStrategy)
      vi.mocked(prisma.screeningResult.create).mockResolvedValue(mockScreeningResult)

      const requestBody = {
        strategyId: 'strategy-1',
        symbols: ['AAPL', 'MSFT'],
        scoringMethod: 'weighted_sum',
      }

      const request = new Request('http://localhost/api/factors/screen', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.strategyId).toBe('strategy-1')
      expect(data.results).toBeDefined()
      expect(Array.isArray(data.results)).toBe(true)
    })

    it('should return 400 when strategyId is missing', async () => {
      const request = new Request('http://localhost/api/factors/screen', {
        method: 'POST',
        body: JSON.stringify({ symbols: ['AAPL'] }),
      })

      const response = await POST(request as unknown as NextRequest)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('strategyId 和 symbols 数组是必填项')
    })

    it('should return 400 when symbols is not an array', async () => {
      const request = new Request('http://localhost/api/factors/screen', {
        method: 'POST',
        body: JSON.stringify({ strategyId: 'strategy-1', symbols: 'AAPL' }),
      })

      const response = await POST(request as unknown as NextRequest)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('strategyId 和 symbols 数组是必填项')
    })

    it('should return 400 when symbols is missing', async () => {
      const request = new Request('http://localhost/api/factors/screen', {
        method: 'POST',
        body: JSON.stringify({ strategyId: 'strategy-1' }),
      })

      const response = await POST(request as unknown as NextRequest)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('strategyId 和 symbols 数组是必填项')
    })

    it('should return 400 for invalid scoringMethod', async () => {
      const request = new Request('http://localhost/api/factors/screen', {
        method: 'POST',
        body: JSON.stringify({
          strategyId: 'strategy-1',
          symbols: ['AAPL'],
          scoringMethod: 'invalid_method',
        }),
      })

      const response = await POST(request as unknown as NextRequest)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('无效的 scoringMethod')
    })

    it('should return 404 when strategy not found', async () => {
      vi.mocked(prisma.factorStrategy.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost/api/factors/screen', {
        method: 'POST',
        body: JSON.stringify({
          strategyId: 'nonexistent',
          symbols: ['AAPL'],
        }),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('策略不存在')
    })

    it('should accept valid scoring methods', async () => {
      vi.mocked(prisma.factorStrategy.findUnique).mockResolvedValue(mockStrategy)
      vi.mocked(prisma.screeningResult.create).mockResolvedValue(mockScreeningResult)

      const validMethods = ['weighted_sum', 'rank_sum', 'threshold_count']

      for (const method of validMethods) {
        vi.clearAllMocks()
        vi.mocked(prisma.factorStrategy.findUnique).mockResolvedValue(mockStrategy)
        vi.mocked(prisma.screeningResult.create).mockResolvedValue(mockScreeningResult)

        const request = new Request('http://localhost/api/factors/screen', {
          method: 'POST',
          body: JSON.stringify({
            strategyId: 'strategy-1',
            symbols: ['AAPL'],
            scoringMethod: method,
          }),
        })

        const response = await POST(request as unknown as NextRequest)
        expect(response.status).toBe(200)
      }
    })

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.factorStrategy.findUnique).mockRejectedValue(new Error('DB Error'))

      const request = new Request('http://localhost/api/factors/screen', {
        method: 'POST',
        body: JSON.stringify({
          strategyId: 'strategy-1',
          symbols: ['AAPL'],
        }),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('内部服务器错误')
    })
  })
})
