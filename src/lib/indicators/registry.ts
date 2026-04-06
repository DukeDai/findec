import type { HistoricalPrice, IndicatorValue } from './calculator'

export interface IndicatorPlugin {
  name: string
  compute: (data: HistoricalPrice[], config?: Record<string, unknown>) => IndicatorValue[]
}

class IndicatorRegistryImpl {
  private plugins = new Map<string, IndicatorPlugin>()

  register(plugin: IndicatorPlugin): void {
    this.plugins.set(plugin.name.toLowerCase(), plugin)
  }

  get(name: string): IndicatorPlugin | undefined {
    return this.plugins.get(name.toLowerCase())
  }

  list(): string[] {
    return Array.from(this.plugins.keys())
  }

  has(name: string): boolean {
    return this.plugins.has(name.toLowerCase())
  }
}

export const indicatorRegistry = new IndicatorRegistryImpl()

export function registerIndicator(plugin: IndicatorPlugin): void {
  indicatorRegistry.register(plugin)
}

export function getCustomIndicatorResults(
  data: HistoricalPrice[],
  customIndicators: { name: string; config?: Record<string, unknown> }[]
): Map<string, IndicatorValue[]> {
  const results = new Map<string, IndicatorValue[]>()
  
  for (const { name, config } of customIndicators) {
    const plugin = indicatorRegistry.get(name)
    if (plugin) {
      results.set(name, plugin.compute(data, config))
    }
  }
  
  return results
}