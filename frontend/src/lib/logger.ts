type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
}

function getLevel(): LogLevel {
  // Prefer explicit env var, otherwise debug in dev, warn in prod
  const envLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined)?.toLowerCase() as LogLevel | undefined
  if (envLevel && levelOrder[envLevel] !== undefined) return envLevel
  return import.meta.env.DEV ? 'debug' : 'warn'
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

