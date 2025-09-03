type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
}

function getLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || '').toLowerCase() as LogLevel
  if (env && levelOrder[env] !== undefined) return env
  // Default: debug in dev, warn in prod, silent in test
  if (process.env.NODE_ENV === 'test') return 'silent'
  return process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
}

let currentLevel = getLevel()

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[currentLevel]
}

export const logger = {
  setLevel(level: LogLevel) {
    if (levelOrder[level] !== undefined) currentLevel = level
  },
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) console.log(...args)
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) console.info(...args)
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) console.error(...args)
  },
}

export type Logger = typeof logger

