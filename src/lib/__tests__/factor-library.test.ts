import { describe, it, expect } from 'vitest'
import { FactorLibrary } from '@/lib/factors/factor-library'

describe('FactorLibrary', () => {
  it('returns all factors', () => {
    const library = new FactorLibrary()
    const factors = library.getAllFactors()
    expect(factors.length).toBeGreaterThan(0)
  })

  it('returns factor by id', () => {
    const library = new FactorLibrary()
    const factor = library.getFactor('rsi_14')
    expect(factor).not.toBeNull()
    expect(factor?.id).toBe('rsi_14')
    expect(factor?.name).toBeTruthy()
  })

  it('returns null for unknown factor', () => {
    const library = new FactorLibrary()
    const factor = library.getFactor('unknown_factor_xyz')
    expect(factor).toBeNull()
  })

  it('returns factors by category', () => {
    const library = new FactorLibrary()
    const technicalFactors = library.getFactorsByCategory('technical')
    expect(technicalFactors.length).toBeGreaterThan(0)
    expect(technicalFactors.every(f => f.category === 'technical')).toBe(true)
  })

  it('factors have valid structure', () => {
    const library = new FactorLibrary()
    const factors = library.getAllFactors()
    factors.forEach(factor => {
      expect(factor.id).toBeTruthy()
      expect(factor.name).toBeTruthy()
      expect(factor.category).toBeTruthy()
      expect(factor.description).toBeTruthy()
      expect(factor.interpretation).toBeTruthy()
    })
  })

  it('factors include common technical indicators', () => {
    const library = new FactorLibrary()
    const expectedIds = ['rsi_14', 'macd_signal', 'ma20_position']
    expectedIds.forEach(id => {
      const factor = library.getFactor(id)
      expect(factor).not.toBeNull()
    })
  })

  it('calculates factors for price data', () => {
    const library = new FactorLibrary()
    const priceData = [
      { date: new Date('2024-01-01'), open: 100, high: 105, low: 98, close: 103, volume: 1000000 },
      { date: new Date('2024-01-02'), open: 103, high: 108, low: 101, close: 106, volume: 1100000 },
      { date: new Date('2024-01-03'), open: 106, high: 110, low: 104, close: 108, volume: 900000 },
      { date: new Date('2024-01-04'), open: 108, high: 112, low: 106, close: 110, volume: 950000 },
    ]
    const factors = library.calculateFactors(priceData, 'TEST', new Date('2024-01-04'))
    expect(factors.length).toBeGreaterThan(0)
  })
})
