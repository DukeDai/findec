export interface Strategy {
  id?: string
  name: string
  type: string
  symbols: string[]
  parameters: Record<string, number>
  dateRange?: { start: string; end: string }
  createdAt?: Date
}

function calculateJaccardSimilarity(
  keysA: string[],
  keysB: string[]
): number {
  const setA = new Set(keysA)
  const setB = new Set(keysB)

  const intersection = new Set(keysA.filter(key => setB.has(key)))
  const union = new Set([...setA, ...setB])

  if (union.size === 0) return 0
  return intersection.size / union.size
}

function calculateDateOverlap(
  rangeA?: { start: string; end: string },
  rangeB?: { start: string; end: string }
): number {
  if (!rangeA || !rangeB) return 0

  const startA = new Date(rangeA.start).getTime()
  const endA = new Date(rangeA.end).getTime()
  const startB = new Date(rangeB.start).getTime()
  const endB = new Date(rangeB.end).getTime()

  const durationA = endA - startA
  const durationB = endB - startB

  if (durationA <= 0 || durationB <= 0) return 0

  const overlapStart = Math.max(startA, startB)
  const overlapEnd = Math.min(endA, endB)

  if (overlapEnd <= overlapStart) return 0

  const overlapDuration = overlapEnd - overlapStart
  const minDuration = Math.min(durationA, durationB)

  return overlapDuration / minDuration
}

export function calculateStrategySimilarity(
  a: Strategy,
  b: Strategy
): number {
  let score = 0

  if (a.type === b.type) {
    score += 0.3
  }

  if (a.symbols.length === b.symbols.length) {
    score += 0.2
  }

  const paramKeysA = Object.keys(a.parameters)
  const paramKeysB = Object.keys(b.parameters)
  const paramJaccard = calculateJaccardSimilarity(paramKeysA, paramKeysB)
  score += paramJaccard * 0.3

  const dateOverlap = calculateDateOverlap(a.dateRange, b.dateRange)
  score += dateOverlap * 0.2

  return score
}

export async function findSimilarStrategies(
  targetStrategy: Strategy,
  allStrategies: Strategy[],
  limit: number = 5
): Promise<Array<{ strategy: Strategy; similarity: number }>> {
  const filteredStrategies = allStrategies.filter(strategy => {
    if (targetStrategy.id && strategy.id) {
      return strategy.id !== targetStrategy.id
    }
    return strategy.name !== targetStrategy.name
  })

  const scoredStrategies = filteredStrategies.map(strategy => ({
    strategy,
    similarity: calculateStrategySimilarity(targetStrategy, strategy),
  }))

  scoredStrategies.sort((a, b) => b.similarity - a.similarity)

  return scoredStrategies.slice(0, limit)
}
