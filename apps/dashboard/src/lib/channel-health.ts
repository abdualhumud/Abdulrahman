/**
 * channel-health.ts — Per-channel sync health snapshot.
 *
 * Replaces the static `CHANNEL_SYNC_STATUS` mock for non-demo environments.
 *
 * Rationale
 * ─────────
 * In demo mode the dashboard shows curated "everything is great" data so the
 * sales surface looks alive. Production and staging owners must see *real*
 * state: did the last sync succeed? when? are there pending acknowledgements?
 *
 * Storage
 * ───────
 * One JSON object per origin under localStorage['rems-channel-health']:
 *   { 'Booking.com': ChannelHealth, 'Airbnb': ChannelHealth, ... }
 *
 * Probe
 * ─────
 * `probeChannel(channelName)` runs a best-effort connectivity check. The
 * static-export build cannot perform direct CORS calls to most OTA hosts,
 * so the probe is structured around what *can* work in-browser:
 *
 *   1. navigator.onLine — short-circuits when offline.
 *   2. Lightweight HEAD/GET to a CORS-friendly endpoint per channel
 *      (the OTA's marketing/login domain when its API does not expose
 *       cross-origin headers).
 *   3. Result + timestamp persisted via setChannelHealth().
 *
 * The function returns { reachable: boolean; latencyMs: number } — the UI
 * decides what to display from the persisted snapshot, so a probe failure
 * cleanly downgrades the channel card without breaking the page.
 */

export interface ChannelHealth {
  channel:        string;
  /** True when the most recent probe / sync succeeded. */
  isConnected:    boolean;
  /** Locale-formatted timestamp of last successful sync, or '—' if never. */
  lastSync:       string;
  /** Counters surfaced on the channel card. Owner-managed; default 0. */
  bookingsToday:  number;
  pending:        number;
  failed:         number;
  /** Probe latency in milliseconds (last attempt). */
  latencyMs:      number;
}

export interface ProbeResult {
  reachable: boolean;
  latencyMs: number;
}

const HEALTH_KEY = 'rems-channel-health';

/** Endpoint each channel exposes that returns a CORS-friendly response. */
const PROBE_ENDPOINTS: Record<string, string> = {
  'Booking.com': 'https://account.booking.com/sign-in',
  'Airbnb':      'https://www.airbnb.com',
  'Gathern':     'https://gathern.co',
  'Agoda':       'https://www.agoda.com',
  'Expedia':     'https://www.expedia.com',
};

const PROBE_TIMEOUT_MS = 5000;

/* ── Storage ─────────────────────────────────────────────────────────────── */

function readAll(): Record<string, ChannelHealth> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ChannelHealth>) : {};
  } catch { return {}; }
}

function writeAll(all: Record<string, ChannelHealth>): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(HEALTH_KEY, JSON.stringify(all)); } catch { /* noop */ }
}

export function getChannelHealth(channel: string): ChannelHealth | null {
  return readAll()[channel] ?? null;
}

export function setChannelHealth(h: ChannelHealth): void {
  const all = readAll();
  all[h.channel] = h;
  writeAll(all);
}

export function getAllChannelHealth(): Record<string, ChannelHealth> {
  return readAll();
}

/** Wipe a channel's persisted health (e.g. when the owner disconnects it). */
export function clearChannelHealth(channel: string): void {
  const all = readAll();
  delete all[channel];
  writeAll(all);
}

/* ── Empty / default snapshots ───────────────────────────────────────────── */

/**
 * Returns a "never-connected" snapshot for a channel.
 * Used when the production owner has not yet run a sync — the card shows
 * accurate empty state instead of the demo's fake "12 bookings today".
 */
export function emptyHealth(channel: string): ChannelHealth {
  return {
    channel,
    isConnected:   false,
    lastSync:      '—',
    bookingsToday: 0,
    pending:       0,
    failed:        0,
    latencyMs:     0,
  };
}

/* ── Probe ───────────────────────────────────────────────────────────────── */

/**
 * Best-effort connectivity probe.
 *
 * - Returns reachable=false immediately when navigator.onLine is false.
 * - Otherwise issues a no-cors HEAD request against PROBE_ENDPOINTS[channel]
 *   with a short timeout. A no-cors request always resolves with an opaque
 *   response when the origin is reachable, so we treat any non-throw as
 *   success. A timeout / network error is recorded as unreachable.
 *
 * The result is also written to localStorage via setChannelHealth so the
 * card refreshes without an extra read.
 */
export async function probeChannel(
  channel: string,
  fetchFn: typeof fetch = fetch,
): Promise<ProbeResult> {
  const start = Date.now();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const out: ProbeResult = { reachable: false, latencyMs: 0 };
    persistProbe(channel, out);
    return out;
  }

  const url = PROBE_ENDPOINTS[channel];
  if (!url) {
    const out: ProbeResult = { reachable: false, latencyMs: 0 };
    persistProbe(channel, out);
    return out;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    await fetchFn(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
    const latencyMs = Date.now() - start;
    const out: ProbeResult = { reachable: true, latencyMs };
    persistProbe(channel, out);
    return out;
  } catch {
    const latencyMs = Date.now() - start;
    const out: ProbeResult = { reachable: false, latencyMs };
    persistProbe(channel, out);
    return out;
  } finally {
    clearTimeout(timer);
  }
}

function persistProbe(channel: string, r: ProbeResult): void {
  const existing = getChannelHealth(channel) ?? emptyHealth(channel);
  setChannelHealth({
    ...existing,
    isConnected: r.reachable,
    lastSync:    r.reachable
      ? new Date().toLocaleString('en-SA', { timeZone: 'Asia/Riyadh' })
      : existing.lastSync,
    latencyMs:   r.latencyMs,
  });
}
