import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/alerts/route'
import type { NextRequest } from 'next/server'

const mockAlert = {
  id: 'alert-1',
  symbol: 'AAPL',
  condition: 'above',
  targetValue: 150,
  message: 'Price alert',
  isActive: true,
  triggeredAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  type: 'price',
  metric: null,
  broadcast: false,
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    alert: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Alerts API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return all alerts ordered by createdAt desc', async () => {
      const alerts = [
        { ...mockAlert, id: 'alert-2', symbol: 'MSFT', createdAt: new Date('2024-02-01') },
        { ...mockAlert, id: 'alert-1', symbol: 'AAPL', createdAt: new Date('2024-01-01') },
      ]
      vi.mocked(prisma.alert.findMany).mockResolvedValue(alerts)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].symbol).toBe('MSFT')
      expect(data[1].symbol).toBe('AAPL')
      expect(prisma.alert.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when no alerts exist', async () => {
      vi.mocked(prisma.alert.findMany).mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.alert.findMany).mockRejectedValue(new Error('DB Error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch alerts')
    })
  })

  describe('POST', () => {
    it('should create an alert with valid data', async () => {
      const requestBody = {
        symbol: 'TSLA',
        condition: 'above',
        targetValue: '200',
        message: 'Target price reached',
      }

      vi.mocked(prisma.alert.create).mockResolvedValue({
        ...mockAlert,
        id: 'alert-new',
        symbol: 'TSLA',
        condition: 'above',
        targetValue: 200,
        message: 'Target price reached',
      })

      const request = new Request('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.symbol).toBe('TSLA')
      expect(data.targetValue).toBe(200)
      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: {
          symbol: 'TSLA',
          condition: 'above',
          targetValue: 200,
          message: 'Target price reached',
        },
      })
    })

    it('should convert symbol to uppercase', async () => {
      const requestBody = {
        symbol: 'tsla',
        condition: 'below',
      }

      vi.mocked(prisma.alert.create).mockResolvedValue({
        ...mockAlert,
        symbol: 'TSLA',
        condition: 'below',
        targetValue: null,
        message: null,
      })

      const request = new Request('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      await POST(request as unknown as NextRequest)

      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: {
          symbol: 'TSLA',
          condition: 'below',
          targetValue: null,
          message: null,
        },
      })
    })

    it('should return 400 when symbol is missing', async () => {
      const request = new Request('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ condition: 'above' }),
      })

      const response = await POST(request as unknown as NextRequest)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Symbol and condition are required')
    })

    it('should return 400 when condition is missing', async () => {
      const request = new Request('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ symbol: 'AAPL' }),
      })

      const response = await POST(request as unknown as NextRequest)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Symbol and condition are required')
    })

    it('should handle null targetValue', async () => {
      const requestBody = {
        symbol: 'AAPL',
        condition: 'change',
      }

      vi.mocked(prisma.alert.create).mockResolvedValue({
        ...mockAlert,
        targetValue: null,
        message: null,
      })

      const request = new Request('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request as unknown as NextRequest)

      expect(response.status).toBe(201)
      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: {
          symbol: 'AAPL',
          condition: 'change',
          targetValue: null,
          message: null,
        },
      })
    })

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.alert.create).mockRejectedValue(new Error('DB Error'))

      const request = new Request('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ symbol: 'AAPL', condition: 'above' }),
      })

      const response = await POST(request as unknown as NextRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create alert')
    })
  })
})
