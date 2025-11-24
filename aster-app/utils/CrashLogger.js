// src/utils/CrashLogger.js

// Lightweight console gating + error capture
const pad = (n) => String(n).padStart(2, '0');
const timestamp = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(
    d.getMilliseconds()
  ).padStart(3, '0')}`;
};

// Log levels: debug < info < warn < error < silent
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

// Default to verbose logging in dev so local terminals show useful info
const defaultLevel = typeof __DEV__ !== 'undefined' && __DEV__ ? 'debug' : 'warn';
const envLevel = (process?.env?.EXPO_PUBLIC_LOG_LEVEL || '').toLowerCase();
let currentLevel = LEVELS[envLevel] ?? LEVELS[defaultLevel];
const runtimeLevel = (globalThis?.__ASTER_LOG_LEVEL__ || '').toString().toLowerCase();
if (runtimeLevel in LEVELS) {
  currentLevel = LEVELS[runtimeLevel];
}

let orig = {
  log: console.log.bind(console),
  info: console.info ? console.info.bind(console) : console.log.bind(console),
  debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const shouldLog = (level) => LEVELS[level] >= currentLevel && currentLevel < LEVELS.silent;
const levelName = () => Object.keys(LEVELS).find((key) => LEVELS[key] === currentLevel) || 'unknown';

export const setLogLevel = (lvl) => {
  if (!lvl) return;
  const key = lvl.toString().toLowerCase();
  if (key in LEVELS) currentLevel = LEVELS[key];
};

export const debug = (...args) => {
  if (shouldLog('debug')) orig.debug(`[DBG ${timestamp()}]`, ...args);
};

export const info = (...args) => {
  if (shouldLog('info')) orig.info(`[INF ${timestamp()}]`, ...args);
};

export const warn = (...args) => {
  if (shouldLog('warn')) orig.warn(`[WRN ${timestamp()}]`, ...args);
};

export const error = (...args) => {
  if (shouldLog('error')) orig.error(`[ERR ${timestamp()}]`, ...args);
};

// Back-compat short names
export const log = info;

// Patch global console to reduce noise without code-wide edits
export const initLogging = () => {
  // Only patch once
  if (console.__ASTER_LOGGER_PATCHED__) return;
  Object.defineProperty(console, '__ASTER_LOGGER_PATCHED__', { value: true, enumerable: false });

  console.log = (...args) => info(...args);
  console.info = (...args) => info(...args);
  console.debug = (...args) => debug(...args);
  // Keep warn/error as-is but with timestamp prefixes
  console.warn = (...args) => warn(...args);
  console.error = (...args) => error(...args);

  info('[Logger] Initialized at level:', levelName());
};

// Set up global error capture
export const initGlobalErrorHandler = () => {
  // JS runtime errors
  const defaultHandler = ErrorUtils.getGlobalHandler?.();
  if (ErrorUtils.setGlobalHandler) {
    ErrorUtils.setGlobalHandler((err, isFatal) => {
      error('[GlobalError]', isFatal ? 'FATAL' : 'NON-FATAL', err);
      try {
        defaultHandler?.(err, isFatal);
      } catch {}
    });
  }

  // Unhandled Promise rejections
  const _origUnhandled = globalThis.onunhandledrejection;
  globalThis.onunhandledrejection = (e) => {
    error('[UnhandledRejection]', e?.reason || e);
    if (typeof _origUnhandled === 'function') _origUnhandled(e);
  };
};
