import { SMA, EMA, RSI, MACD, BollingerBands, ATR, ADX, Stochastic } from 'technicalindicators'

export interface FormulaContext {
  open: number[]
  high: number[]
  low: number[]
  close: number[]
  volume: number[]
}

type FormulaFunc = (ctx: FormulaContext, ...args: (number | string)[]) => (number | null)[]

const funcs: Record<string, FormulaFunc> = {
  SMA: (ctx, period) => {
    const p = Number(period) || 20
    return SMA.calculate({ values: ctx.close, period: p })
  },
  EMA: (ctx, period) => {
    const p = Number(period) || 12
    return EMA.calculate({ values: ctx.close, period: p })
  },
  RSI: (ctx, period) => {
    const p = Number(period) || 14
    return RSI.calculate({ values: ctx.close, period: p })
  },
  MACD: (ctx, fast, slow, signal) => {
    const f = Number(fast) || 12
    const s = Number(slow) || 26
    const sig = Number(signal) || 9
    return MACD.calculate({
      values: ctx.close, fastPeriod: f, slowPeriod: s, signalPeriod: sig,
      SimpleMAOscillator: false, SimpleMASignal: false,
    }).map(r => r.histogram ?? null)
  },
  BB: (ctx, period, stdDev) => {
    const p = Number(period) || 20
    const sd = Number(stdDev) || 2
    return BollingerBands.calculate({ values: ctx.close, period: p, stdDev: sd })
      .map(r => r.middle ?? null)
  },
  ATR: (ctx, period) => {
    const p = Number(period) || 14
    return ATR.calculate({
      period: p,
      high: ctx.high, low: ctx.low, close: ctx.close,
    })
  },
  ADX: (ctx, period) => {
    const p = Number(period) || 14
    return ADX.calculate({
      period: p, high: ctx.high, low: ctx.low, close: ctx.close,
    }).map(r => r.adx ?? null)
  },
  STOCH: (ctx, k, d) => {
    const kp = Number(k) || 14
    const dp = Number(d) || 3
    return Stochastic.calculate({
      high: ctx.high, low: ctx.low, close: ctx.close,
      period: kp, signalPeriod: dp,
    }).map(r => r.k ?? null)
  },
  MAX: (...args) => {
    const vals = args.slice(0, -1) as number[]
    if (vals.length === 0) return []
    return vals.map(() => Math.max(...vals))
  },
  MIN: (...args) => {
    const vals = args.slice(0, -1) as number[]
    if (vals.length === 0) return []
    return vals.map(() => Math.min(...vals))
  },
  ABS: (...args) => {
    const vals = args.slice(0, -1) as number[]
    return vals.map(v => Math.abs(v))
  },
  LOG: (...args) => {
    const vals = args.slice(0, -1) as number[]
    return vals.map(v => (v > 0 ? Math.log(v) : null))
  },
  POW: (...args) => {
    const vals = args.slice(0, -1) as number[]
    const exp = Number(args[args.length - 1]) || 2
    return vals.map(v => Math.pow(v, exp))
  },
}

const OPERATORS = ['+', '-', '*', '/', '(', ')']

function tokenize(expr: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue }
    if (/[+\-*/()]/.test(expr[i])) {
      tokens.push(expr[i++])
      continue
    }
    if (expr[i] === ',') { tokens.push(','); i++; continue }
    if (/[a-zA-Z_]/.test(expr[i])) {
      let name = ''
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) name += expr[i++]
      if (expr[i] === '(') {
        let depth = 0, j = i + 1
        while (j < expr.length && depth >= 0) {
          if (expr[j] === '(') depth++
          if (expr[j] === ')') depth--
          j++
        }
        tokens.push(expr.slice(i, j))
        i = j
      } else {
        tokens.push(name)
      }
      continue
    }
    if (/[0-9.]/.test(expr[i])) {
      let num = ''
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++]
      tokens.push(num)
      continue
    }
    i++
  }
  return tokens
}

function buildAST(tokens: string[]): unknown {
  let pos = 0

  function parseExpr(): unknown {
    let left = parseTerm()
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++]
      const right = parseTerm()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  function parseTerm(): unknown {
    let left = parseFactor()
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos++]
      const right = parseFactor()
      left = { type: 'binary', op, left, right }
    }
    return left
  }

  function parseFactor(): unknown {
    const tok = tokens[pos]
    if (tok === '(') {
      pos++
      const inner = parseExpr()
      if (tokens[pos] === ')') pos++
      return inner
    }
    if (/^[+\-]?[0-9.]+$/.test(tok)) {
      pos++
      return { type: 'number', value: parseFloat(tok) }
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\(.*\)$/.test(tok)) {
      pos++
      const match = tok.match(/^([A-Z_]+)\((.*)\)$/)
      if (!match) return { type: 'func', name: tok, args: [] }
      const name = match[1]
      const inner = match[2]
      const args: unknown[] = []
      if (inner.trim()) {
        const argTokens = tokenize(inner)
        let depth = 0, start = 0
        for (let i = 0; i < argTokens.length; i++) {
          if (argTokens[i] === '(') depth++
          else if (argTokens[i] === ')') depth--
          else if (argTokens[i] === ',' && depth === 0) {
            args.push(buildAST(argTokens.slice(start, i)))
            start = i + 1
          }
        }
        args.push(buildAST(argTokens.slice(start)))
      }
      return { type: 'func', name, args }
    }
    if (/^[a-zA-Z_]/.test(tok)) {
      pos++
      return { type: 'field', name: tok }
    }
    pos++
    return { type: 'number', value: 0 }
  }

  return parseExpr()
}

function evalAST(node: unknown, ctx: FormulaContext): (number | null)[] {
  if (!node) return []

  const n = node as { type: string; [key: string]: unknown }

  if (n.type === 'number') return [n.value as number]

  if (n.type === 'field') {
    const name = n.name as string
    const field = name.toLowerCase()
    if (field === 'close') return [...ctx.close]
    if (field === 'open') return [...ctx.open]
    if (field === 'high') return [...ctx.high]
    if (field === 'low') return [...ctx.low]
    if (field === 'volume') return [...ctx.volume]
    return ctx.close.map(() => null)
  }

  if (n.type === 'func') {
    const name = n.name as string
    const rawArgs = n.args as unknown[]
    const argResults = rawArgs.map(a => evalAST(a, ctx))
    const maxLen = Math.max(...argResults.map(a => a.length))
    const normalizedArgs = argResults.map(a =>
      a.length < maxLen ? [...new Array(maxLen - a.length).fill(null), ...a] : a
    )
    const fn = funcs[name]
    if (!fn) return new Array(maxLen).fill(null)
    return fn(ctx, ...normalizedArgs.map((a, i) => rawArgs[i] && (rawArgs[i] as { type: string }).type === 'number' ? a[0] ?? 0 : i === rawArgs.length - 1 ? a[0] ?? 0 : name === 'MAX' || name === 'MIN' || name === 'ABS' || name === 'LOG' || name === 'POW' ? a[0] ?? 0 : i))
  }

  if (n.type === 'binary') {
    const left = evalAST(n.left, ctx)
    const right = evalAST(n.right, ctx)
    const maxLen = Math.max(left.length, right.length)
    const align = (arr: (number | null)[]) =>
      arr.length < maxLen ? [...new Array(maxLen - arr.length).fill(null), ...arr] : arr
    const al = align(left)
    const ar = align(right)
    const result: (number | null)[] = []
    for (let i = 0; i < maxLen; i++) {
      const l = al[i]
      const r = ar[i]
      if (l === null || r === null) { result.push(null); continue }
      if (n.op === '+') result.push(l + r)
      else if (n.op === '-') result.push(l - r)
      else if (n.op === '*') result.push(l * r)
      else if (n.op === '/') result.push(r !== 0 ? l / r : null)
      else result.push(null)
    }
    return result
  }

  return []
}

export interface FormulaResult {
  formula: string
  values: (number | null)[]
  latest: number | null
  length: number
}

export function evaluateFormula(formula: string, ctx: FormulaContext): FormulaResult {
  try {
    const tokens = tokenize(formula.replace(/\s+/g, ''))
    const ast = buildAST(tokens)
    const values = evalAST(ast, ctx)
    let latest: number | null = null
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i] !== null) { latest = values[i]; break }
    }
    return { formula, values, latest, length: values.length }
  } catch {
    return { formula, values: [], latest: null, length: 0 }
  }
}

export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    const tokens = tokenize(formula.replace(/\s+/g, ''))
    buildAST(tokens)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: String(e) }
  }
}
