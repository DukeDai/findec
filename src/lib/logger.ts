export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  module: string
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function isEnabled(level: LogLevel): boolean {
  const envLevel = (process.env.LOG_LEVEL ?? 'info') as LogLevel
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[envLevel]
}

function formatError(error: unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { name: 'Unknown', message: String(error) }
}

function output(entry: LogEntry): void {
  const { level, module, message, timestamp, context, error } = entry
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`
  const ctxStr = context ? ` ${JSON.stringify(context)}` : ''

  switch (level) {
    case 'error':
      if (error) {
        console.error(`${prefix} ${message}${ctxStr}`, error)
      } else {
        console.error(`${prefix} ${message}${ctxStr}`)
      }
      break
    case 'warn':
      console.warn(`${prefix} ${message}${ctxStr}`)
      break
    case 'info':
      console.info(`${prefix} ${message}${ctxStr}`)
      break
    case 'debug':
      console.debug(`${prefix} ${message}${ctxStr}`)
      break
  }
}

function createEntry(
  level: LogLevel,
  module: string,
  message: string,
  context?: Record<string, unknown>,
  error?: unknown
): LogEntry {
  return {
    level,
    module,
    message,
    timestamp: new Date().toISOString(),
    context,
    ...(error ? { error: formatError(error) } : {}),
  }
}

export function createLogger(module: string) {
  return {
    debug(message: string, context?: Record<string, unknown>) {
      if (isEnabled('debug')) {
        output(createEntry('debug', module, message, context))
      }
    },
    info(message: string, context?: Record<string, unknown>) {
      if (isEnabled('info')) {
        output(createEntry('info', module, message, context))
      }
    },
    warn(message: string, context?: Record<string, unknown>) {
      if (isEnabled('warn')) {
        output(createEntry('warn', module, message, context))
      }
    },
    error(message: string, error?: unknown, context?: Record<string, unknown>) {
      if (isEnabled('error')) {
        output(createEntry('error', module, message, context, error))
      }
    },
  }
}

export const logger = createLogger('app')
