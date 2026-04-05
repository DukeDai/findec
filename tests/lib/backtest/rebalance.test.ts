import { describe, it, expect } from 'vitest'

function shouldRebalance(currentDate: Date, lastRebalanceDate: Date, frequency: string): boolean {
  const msPerDay = 1000 * 60 * 60 * 24
  const daysDiff = Math.floor((currentDate.getTime() - lastRebalanceDate.getTime()) / msPerDay)

  switch (frequency) {
    case 'daily':
      return daysDiff >= 1
    case 'weekly':
      return daysDiff >= 7
    case 'monthly':
      return daysDiff >= 30
    case 'quarterly':
      return daysDiff >= 90
    case 'none':
    default:
      return false
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

describe('shouldRebalance', () => {
  const base = new Date('2024-01-01')

  describe('quarterly', () => {
    it('triggers after 90 days', () => {
      const last = base
      const current = addDays(base, 90)
      expect(shouldRebalance(current, last, 'quarterly')).toBe(true)
    })

    it('does not trigger before 90 days', () => {
      const last = base
      const current = addDays(base, 89)
      expect(shouldRebalance(current, last, 'quarterly')).toBe(false)
    })

    it('triggers after 91 days', () => {
      const last = base
      const current = addDays(base, 91)
      expect(shouldRebalance(current, last, 'quarterly')).toBe(true)
    })

    it('triggers after 180 days (half year)', () => {
      const last = base
      const current = addDays(base, 180)
      expect(shouldRebalance(current, last, 'quarterly')).toBe(true)
    })

    it('does not trigger on same day', () => {
      expect(shouldRebalance(base, base, 'quarterly')).toBe(false)
    })

    it('triggers after exactly 3 months', () => {
      const last = new Date('2024-01-01')
      const current = new Date('2024-04-01')
      expect(shouldRebalance(current, last, 'quarterly')).toBe(true)
    })
  })

  describe('daily', () => {
    it('triggers after 1 day', () => {
      expect(shouldRebalance(addDays(base, 1), base, 'daily')).toBe(true)
    })

    it('does not trigger on same day', () => {
      expect(shouldRebalance(base, base, 'daily')).toBe(false)
    })
  })

  describe('weekly', () => {
    it('triggers after 7 days', () => {
      expect(shouldRebalance(addDays(base, 7), base, 'weekly')).toBe(true)
    })

    it('does not trigger after 6 days', () => {
      expect(shouldRebalance(addDays(base, 6), base, 'weekly')).toBe(false)
    })
  })

  describe('monthly', () => {
    it('triggers after 30 days', () => {
      expect(shouldRebalance(addDays(base, 30), base, 'monthly')).toBe(true)
    })

    it('does not trigger after 29 days', () => {
      expect(shouldRebalance(addDays(base, 29), base, 'monthly')).toBe(false)
    })
  })

  describe('none', () => {
    it('never triggers', () => {
      expect(shouldRebalance(addDays(base, 999), base, 'none')).toBe(false)
    })
  })

  describe('unknown frequency', () => {
    it('does not trigger', () => {
      expect(shouldRebalance(addDays(base, 999), base, 'unknown')).toBe(false)
    })
  })
})
