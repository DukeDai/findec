export interface CorrelationResult {
  matrix: number[][] // correlation[i][j]
  factors: string[] // factor names in same order as matrix
  warnings: { factorA: string; factorB: string; correlation: number }[]
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
function calculatePearsonCorrelation(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) {
    return 0
  }

  const n = a.length
  const meanA = a.reduce((sum, val) => sum + val, 0) / n
  const meanB = b.reduce((sum, val) => sum + val, 0) / n

  let numerator = 0
  let denomA = 0
  let denomB = 0

  for (let i = 0; i < n; i++) {
    const diffA = a[i] - meanA
    const diffB = b[i] - meanB
    numerator += diffA * diffB
    denomA += diffA * diffA
    denomB += diffB * diffB
  }

  if (denomA === 0 || denomB === 0) return 0

  return numerator / Math.sqrt(denomA * denomB)
}

/**
 * Calculate correlation matrix for all factor pairs
 */
export function calculateFactorCorrelation(
  factorHistories: Map<string, number[]>, // factorId -> values over time
  threshold = 0.9
): CorrelationResult {
  const factors = Array.from(factorHistories.keys())
  const n = factors.length

  // Initialize correlation matrix
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0))

  // Calculate correlation for each pair
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1 // Perfect correlation with self
      } else {
        const valuesA = factorHistories.get(factors[i])
        const valuesB = factorHistories.get(factors[j])

        if (valuesA && valuesB) {
          matrix[i][j] = calculatePearsonCorrelation(valuesA, valuesB)
        } else {
          matrix[i][j] = 0
        }
      }
    }
  }

  // Find highly correlated pairs
  const warnings: { factorA: string; factorB: string; correlation: number }[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const corr = matrix[i][j]
      if (Math.abs(corr) > threshold) {
        warnings.push({
          factorA: factors[i],
          factorB: factors[j],
          correlation: corr,
        })
      }
    }
  }

  // Sort warnings by absolute correlation (highest first)
  warnings.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))

  return {
    matrix,
    factors,
    warnings,
  }
}

/**
 * Get color for correlation value
 * r: -1 to 1
 * Blue (negative) → White (0) → Red (positive)
 */
export function getCorrelationColor(r: number): string {
  if (r >= 0) {
    const intensity = Math.min(1, r)
    const red = Math.round(255 * intensity)
    const green = Math.round(255 * (1 - intensity * 0.3))
    const blue = Math.round(255 * (1 - intensity))
    return `rgb(${red}, ${green}, ${blue})`
  } else {
    const intensity = Math.min(1, -r)
    const red = Math.round(59 + (1 - intensity) * (255 - 59))
    const green = Math.round(130 + (1 - intensity) * (255 - 130))
    const blue = Math.round(246 + (1 - intensity) * (255 - 246))
    return `rgb(${red}, ${green}, ${blue})`
  }
}

/**
 * Get text color for correlation cell (dark text for light backgrounds, light text for dark backgrounds)
 */
export function getCorrelationTextColor(r: number): string {
  return Math.abs(r) > 0.5 ? 'white' : 'black'
}

/**
 * Format correlation value for display
 */
export function formatCorrelation(value: number): string {
  return (Math.abs(value) < 0.01 ? 0 : value).toFixed(2)
}

/**
 * Get factor name by ID from factor library
 * Falls back to ID if not found
 */
export function getFactorDisplayName(factorId: string, factorLibrary?: Map<string, { name: string }>): string {
  const factor = factorLibrary?.get(factorId)
  return factor?.name || factorId
}
