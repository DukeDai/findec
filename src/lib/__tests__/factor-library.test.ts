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

  describe('strategyGroup', () => {
    it('returns value factors', () => {
      const library = new FactorLibrary()
      const valueFactors = library.getFactorsByStrategyGroup('value')
      expect(valueFactors.length).toBeGreaterThan(0)
      valueFactors.forEach(f => {
        expect(f.strategyGroup).toBe('value')
      })
      const ids = valueFactors.map(f => f.id)
      expect(ids).toContain('pe_ratio')
      expect(ids).toContain('pb_ratio')
    })

    it('returns momentum factors', () => {
      const library = new FactorLibrary()
      const momentumFactors = library.getFactorsByStrategyGroup('momentum')
      expect(momentumFactors.length).toBeGreaterThan(0)
      momentumFactors.forEach(f => {
        expect(f.strategyGroup).toBe('momentum')
      })
      const ids = momentumFactors.map(f => f.id)
      expect(ids).toContain('rsi_14')
      expect(ids).toContain('momentum_10d')
    })

    it('returns quality factors', () => {
      const library = new FactorLibrary()
      const qualityFactors = library.getFactorsByStrategyGroup('quality')
      expect(qualityFactors.length).toBeGreaterThan(0)
      qualityFactors.forEach(f => {
        expect(f.strategyGroup).toBe('quality')
      })
    })

    it('returns technical factors', () => {
      const library = new FactorLibrary()
      const technicalFactors = library.getFactorsByStrategyGroup('technical')
      expect(technicalFactors.length).toBeGreaterThan(0)
      technicalFactors.forEach(f => {
        expect(f.strategyGroup).toBe('technical')
      })
    })

    it('covers all four strategy groups', () => {
      const library = new FactorLibrary()
      const groups: Array<'value' | 'momentum' | 'quality' | 'technical'> = ['value', 'momentum', 'quality', 'technical']
      groups.forEach(group => {
        const factors = library.getFactorsByStrategyGroup(group)
        expect(factors.length).toBeGreaterThan(0)
      })
    })
  })
})
