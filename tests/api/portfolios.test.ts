import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/portfolios/route'
import type { NextRequest } from 'next/server'

const mockPortfolio = {
  id: 'portfolio-1',
  name: 'Test Portfolio',
  description: 'Test description',
  totalValue: 0,
  totalCost: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPositions = [
  { id: 'pos-1', symbol: 'AAPL', quantity: 100, avgCost: 150 },
]

vi.mock('@/lib/prisma', () => ({
  prisma: {
    portfolio: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Portfolios API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all portfolios with positions', async () => {
      vi.mocked(prisma.portfolio.findMany).mockResolvedValue([
        { ...mockPortfolio, positions: mockPositions } as unknown,
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Test Portfolio')
      expect(data[0].positions).toHaveLength(1)
      expect(prisma.portfolio.findMany).toHaveBeenCalledWith({
        include: { positions: true },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when no portfolios exist', async () => {
      vi.mocked(prisma.portfolio.findMany).mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.portfolio.findMany).mockRejectedValue(new Error('DB Error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch portfolios')
    })
  })

  describe('POST', () => {
    it('should create a portfolio with valid data', async () => {
      const requestBody = {
        name: 'New Portfolio',
        description: 'My investment portfolio',
      }

      vi.mocked(prisma.portfolio.create).mockResolvedValue({
        ...mockPortfolio,
        name: 'New Portfolio',
        description: 'My investment portfolio',
        positions: [],
      } as unknown)

      const request = new Request('http://localhost/api/portfolios', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Portfolio')
      expect(prisma.portfolio.create).toHaveBeenCalledWith({
        data: {
          name: 'New Portfolio',
          description: 'My investment portfolio',
        },
        include: { positions: true },
      })
    })

    it('should return 400 when name is missing', async () => {
      const request = new Request('http://localhost/api/portfolios', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test' }),
      })

      const response = await POST(request as unknown as NextRequest)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Name is required')
    })

    it('should create portfolio without description', async () => {
      const requestBody = { name: 'Portfolio without description' }

      vi.mocked(prisma.portfolio.create).mockResolvedValue({
        ...mockPortfolio,
        name: 'Portfolio without description',
        description: null,
        positions: [],
      } as unknown)

      const request = new Request('http://localhost/api/portfolios', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request as unknown as NextRequest)

      expect(response.status).toBe(201)
      expect(prisma.portfolio.create).toHaveBeenCalledWith({
        data: {
          name: 'Portfolio without description',
          description: undefined,
        },
        include: { positions: true },
      })
    })

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.portfolio.create).mockRejectedValue(new Error('DB Error'))

      const request = new Request('http://localhost/api/portfolios', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create portfolio')
    })
  })
})
