import { describe, it, expect } from 'vitest'
import { CostModel } from '@/lib/backtest/cost-model'

describe('CostModel', () => {
  it('calculates fixed commission', () => {
    const model = new CostModel({
      commission: { type: 'fixed', fixedPerTrade: 5, percentOfValue: 0 },
      slippage: { model: 'fixed', value: 0 },
    })
    const cost = model.calculateBuyCost(100, 10)
    expect(cost.total).toBe(5)
    expect(cost.commission).toBe(5)
    expect(cost.slippage).toBe(0)
  })

  it('calculates percentage commission', () => {
    const model = new CostModel({
      commission: { type: 'percent', fixedPerTrade: 0, percentOfValue: 0.001 },
      slippage: { model: 'fixed', value: 0 },
    })
    const cost = model.calculateBuyCost(100, 10)
    expect(cost.total).toBeCloseTo(1, 0)
    expect(cost.commission).toBeCloseTo(1, 0)
  })

  it('calculates both fixed and percentage commission', () => {
    const model = new CostModel({
      commission: { type: 'both', fixedPerTrade: 5, percentOfValue: 0.001 },
      slippage: { model: 'fixed', value: 0 },
    })
    const cost = model.calculateBuyCost(100, 10)
    expect(cost.commission).toBeCloseTo(6, 0)
  })

  it('calculates slippage for buy', () => {
    const model = new CostModel({
      commission: { type: 'fixed', fixedPerTrade: 0, percentOfValue: 0 },
      slippage: { model: 'fixed', value: 0.001 },
    })
    const cost = model.calculateBuyCost(100, 10)
    expect(cost.slippage).toBeCloseTo(1, 0)
  })

  it('calculates slippage for sell', () => {
    const model = new CostModel({
      commission: { type: 'fixed', fixedPerTrade: 0, percentOfValue: 0 },
      slippage: { model: 'fixed', value: 0.001 },
    })
    const cost = model.calculateSellCost(100, 10)
    expect(cost.slippage).toBeCloseTo(1, 0)
  })

  it('calculates total with commission and slippage', () => {
    const model = new CostModel({
      commission: { type: 'both', fixedPerTrade: 5, percentOfValue: 0.001 },
      slippage: { model: 'fixed', value: 0.001 },
    })
    const cost = model.calculateBuyCost(100, 10)
    expect(cost.total).toBeCloseTo(7, 0)
  })

  it('sell cost may differ from buy cost', () => {
    const model = new CostModel({
      commission: { type: 'fixed', fixedPerTrade: 5, percentOfValue: 0 },
      slippage: { model: 'fixed', value: 0.001 },
    })
    const buyCost = model.calculateBuyCost(100, 10)
    const sellCost = model.calculateSellCost(105, 10)
    expect(sellCost.total).not.toBe(buyCost.total)
  })
})
