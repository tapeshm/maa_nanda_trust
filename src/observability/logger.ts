export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function shouldDebug(): boolean {
  try {
    return String((globalThis as any).process?.env?.DEBUG_AUTH ?? (globalThis as any).DEBUG_AUTH ?? '0') === '1'
  } catch {
    return false
  }
}

function log(level: LogLevel, ...args: unknown[]) {
  if (level === 'debug' && !shouldDebug()) return
  // Cloudflare Workers: console.* goes to logs; keep simple for now
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  try {
    fn(...args)
  } catch {
    // ignore logging failures
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
}

