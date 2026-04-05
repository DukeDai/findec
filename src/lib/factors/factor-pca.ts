export interface PCAInput {
  factorHistories: Map<string, number[]>
}

export interface PCAResult {
  components: number
  explainedVariance: number[]
  cumulativeVariance: number[]
  loadings: number[][]
  factorNames: string[]
  factorGroupings: FactorGroup[]
  recommendations: string[]
}

export interface FactorGroup {
  principalComponent: number
  varianceExplained: number
  factors: { id: string; name: string; loading: number }[]
}

function dot(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

function scale(v: number[]): number[] {
  const norm = Math.sqrt(dot(v, v))
  if (norm === 0) return v
  return v.map(x => x / norm)
}

function multiply(m: number[][], v: number[]): number[] {
  return m.map(row => dot(row, v))
}

function outer(a: number[], b: number[]): number[][] {
  return a.map(ai => b.map(bj => ai * bj))
}

function toMatrix(cols: number[][]): number[][] {
  if (cols.length === 0) return []
  return cols[0].map((_, i) => cols.map(col => col[i]))
}

function covarianceMatrix(data: number[][]): number[][] {
  const n = data.length
  const m = data[0].length
  const means = Array(m).fill(0)
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < n; i++) means[j] += data[i][j]
    means[j] /= n
  }
  const centered = data.map(row => row.map((val, j) => val - means[j]))
  const cov: number[][] = Array.from({ length: m }, () => Array(m).fill(0))
  for (let i = 0; i < m; i++) {
    for (let j = i; j < m; j++) {
      let s = 0
      for (let k = 0; k < n; k++) s += centered[k][i] * centered[k][j]
      s /= n - 1
      cov[i][j] = s
      cov[j][i] = s
    }
  }
  return cov
}

function powerIteration(mat: number[][], maxIter = 100, tol = 1e-10): { eigenvalue: number; eigenvector: number[] } {
  const m = mat.length
  let v = Array(m).fill(1 / Math.sqrt(m))
  for (let iter = 0; iter < maxIter; iter++) {
    const newV = multiply(mat, v)
    const norm = Math.sqrt(dot(newV, newV))
    if (norm < 1e-15) break
    v = newV.map(x => x / norm)
    if (iter > 0 && Math.abs(dot(newV, v) / norm - 1) < tol) break
  }
  const Av = multiply(mat, v)
  const eigenvalue = dot(v, Av)
  return { eigenvalue, eigenvector: v }
}

export function performPCA(input: PCAInput): PCAResult {
  const factorNames = Array.from(input.factorHistories.keys())
  const nFactors = factorNames.length
  const nSamples = input.factorHistories.get(factorNames[0])?.length ?? 0

  if (nFactors < 2 || nSamples < 3) {
    return {
      components: 0,
      explainedVariance: [],
      cumulativeVariance: [],
      loadings: [],
      factorNames: [],
      factorGroupings: [],
      recommendations: ['数据不足，无法进行 PCA 分析（至少需要 2 个因子和 3 个样本）'],
    }
  }

  const cols: number[][] = factorNames.map(fid => input.factorHistories.get(fid) ?? [])
  const data = toMatrix(cols)

  const cov = covarianceMatrix(data)

  const eigenvalues: number[] = []
  const eigenvectors: number[][] = []
  let mat: number[][] = cov.map(row => [...row])

  for (let k = 0; k < nFactors; k++) {
    const { eigenvalue, eigenvector } = powerIteration(mat)
    if (eigenvalue <= 0) break
    eigenvalues.push(eigenvalue)
    eigenvectors.push(eigenvector)
    const scaled = outer(eigenvector, eigenvector).map(row => row.map(v => v * eigenvalue))
    mat = mat.map((row, i) => row.map((val, j) => val - scaled[i][j]))
  }

  const total = eigenvalues.reduce((a, b) => a + b, 0)
  const explainedVariance = total > 0 ? eigenvalues.map(e => e / total) : eigenvalues.map(() => 0)
  const cumulativeVariance: number[] = []
  let cum = 0
  for (const ev of explainedVariance) {
    cum += ev
    cumulativeVariance.push(cum)
  }

  const loadings = eigenvectors.map(eigenvector => {
    const norm = Math.sqrt(dot(eigenvector, eigenvector))
    const normalized = norm > 0 ? eigenvector.map(x => x / norm) : eigenvector
    return normalized.map(x => x * Math.sqrt(eigenvalues[eigenvectors.indexOf(eigenvector)] ?? 0))
  })

  const recommendations: string[] = []
  const nSignificant = explainedVariance.filter(v => v >= 0.1).length
  if (nSignificant === 1) {
    recommendations.push('第一主成分解释了大部分方差，表明这些因子高度共线，可考虑合并或剔除冗余因子')
  } else if (nSignificant >= 3) {
    recommendations.push(`建议保留 ${nSignificant} 个主成分，可解释 ${(cumulativeVariance[nSignificant - 1] * 100).toFixed(1)}% 的总方差`)
  }

  const highCorrPairs: string[] = []
  for (let i = 0; i < nFactors; i++) {
    for (let j = i + 1; j < nFactors; j++) {
      let cov_ij = 0
      const fi = cols[i], fj = cols[j]
      const mean_i = fi.reduce((a, b) => a + b, 0) / fi.length
      const mean_j = fj.reduce((a, b) => a + b, 0) / fj.length
      for (let k = 0; k < fi.length; k++) {
        cov_ij += (fi[k] - mean_i) * (fj[k] - mean_j)
      }
      cov_ij /= fi.length - 1
      const std_i = Math.sqrt(fi.map(x => (x - mean_i) ** 2).reduce((a, b) => a + b, 0) / (fi.length - 1))
      const std_j = Math.sqrt(fj.map(x => (x - mean_j) ** 2).reduce((a, b) => a + b, 0) / (fj.length - 1))
      const corr = std_i > 0 && std_j > 0 ? cov_ij / (std_i * std_j) : 0
      if (Math.abs(corr) > 0.85) {
        highCorrPairs.push(`${factorNames[i]} 与 ${factorNames[j]} 相关系数 ${corr.toFixed(2)}，建议合并`)
      }
    }
  }
  recommendations.push(...highCorrPairs.slice(0, 3))

  const factorGroupings: FactorGroup[] = []
  for (let pc = 0; pc < Math.min(3, explainedVariance.length); pc++) {
    const loading = loadings[pc]
    const absLoadings = loading.map((v, i) => ({ i, abs: Math.abs(v), v, id: factorNames[i] }))
    absLoadings.sort((a, b) => b.abs - a.abs)
    factorGroupings.push({
      principalComponent: pc + 1,
      varianceExplained: explainedVariance[pc],
      factors: absLoadings.slice(0, 5).map(l => ({ id: l.id, name: l.id, loading: l.v })),
    })
  }

  return {
    components: explainedVariance.length,
    explainedVariance,
    cumulativeVariance,
    loadings,
    factorNames,
    factorGroupings,
    recommendations,
  }
}
