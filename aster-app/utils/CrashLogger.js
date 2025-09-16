// src/utils/CrashLogger.js

// helper for timestamp
const pad = (n) => String(n).padStart(2, '0');
const ts = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,'0')}`;
};

export const log = (...args) => {
  console.log(`[LOG ${ts()}]`, ...args);
};

export const warn = (...args) => {
  console.warn(`[WARN ${ts()}]`, ...args);
};

export const error = (...args) => {
  console.error(`[ERR ${ts()}]`, ...args);
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
