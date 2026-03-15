'use client';

/** Log severity levels used across all integration panel simulators. */
export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'lock';

export interface LogEntry {
  id:    number;
  time:  string;
  level: LogLevel;
  text:  string;
}

/** Simple log-row type used by simulator panels that don't need a severity level. */
export interface SimLogRow {
  id:    number;
  time:  string;
  text:  string;
  color: string;
}

/** Guard-step state for the overlap-guard simulator inside IntegrationMonitor. */
export type GuardStep = 'idle' | 'locking' | 'checking' | 'broadcasting' | 'confirmed' | 'blocked';

let _logCounter = 0;

/** Creates a structured LogEntry with the current wall-clock time. */
export function makeLog(level: LogLevel, text: string): LogEntry {
  const now = new Date();
  return {
    id:   ++_logCounter,
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
    level,
    text,
  };
}

/** Promise-based sleep helper. */
export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Builds a SimLogRow with the current wall-clock time. */
export function makeSimRow(id: number, text: string, color = 'text-slate-400'): SimLogRow {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  return { id, time, text, color };
}
