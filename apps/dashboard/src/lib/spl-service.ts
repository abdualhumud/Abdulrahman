/**
 * SPL (Saudi Post) National Address API client
 *
 * Developer portal : https://api.address.gov.sa
 * Base URL         : https://apina.address.gov.sa/NationalAddress/v3.1
 * Auth             : api_key query parameter (from your SPL subscription dashboard)
 *
 * Endpoints used:
 *   GET /address/address-free-text  — free-text / short-code search
 *   GET /address/address-verify     — structured building-number search
 *
 * CORS note: The SPL API does not publish CORS headers for browser
 * requests. Calls may succeed or fail depending on the browser / network.
 * The UI always falls back to Nominatim (OpenStreetMap) when the SPL
 * request throws a network-level error.
 *
 * Rate limits: 1 000 req/month on the standard free tier.
 */

export const SPL_BASE        = 'https://apina.address.gov.sa/NationalAddress/v3.1';
export const SPL_KEY_STORAGE = 'rems-spl-key';

/* ── Response shape ────────────────────────────────────────────────── */

export interface SplAddress {
  buildingNumber:   string;
  additionalNumber: string;
  streetEn:         string;
  districtEn:       string;
  cityEn:           string;
  postCode:         string;
  shortAddress:     string;
  regionName:       string;
  lat:              number;
  lng:              number;
}

/* ── Errors ─────────────────────────────────────────────────────────── */

export class SplAuthError extends Error {
  constructor() {
    super('Invalid or expired SPL API key');
    this.name = 'SplAuthError';
  }
}

export class SplNotFoundError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'SplNotFoundError';
  }
}

/* ── Request types ──────────────────────────────────────────────────── */

export interface SplFreetextRequest {
  mode:  'freetext';
  query: string;       // address string, short code (RYYY1234), or building text
  apiKey: string;
}

export interface SplBuildingRequest {
  mode:              'building';
  buildingNumber:    string;    // 4-digit building number
  additionalNumber?: string;    // secondary number (unit)
  zipCode?:          string;    // postal code (5 digits)
  apiKey:            string;
}

export type SplRequest = SplFreetextRequest | SplBuildingRequest;

/* ── Internal helpers ───────────────────────────────────────────────── */

/**
 * ObjLatLng format from SPL: "objectId longitude latitude"
 * e.g. "30829 46.71670870 24.65017630"
 */
function parseCoords(raw: string): { lat: number; lng: number } {
  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 3) {
    const lng = parseFloat(parts[1]);
    const lat = parseFloat(parts[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
  }
  return { lat: 24.7136, lng: 46.6753 }; // Riyadh default
}

function parseRaw(raw: Record<string, string>): SplAddress {
  const coords = raw.ObjLatLng ? parseCoords(raw.ObjLatLng) : { lat: 24.7136, lng: 46.6753 };
  return {
    buildingNumber:   raw.BuildingNumber   ?? '',
    additionalNumber: raw.AdditionalNumber ?? '',
    streetEn:         raw.Street_NameEn ?? raw.Street ?? '',
    districtEn:       raw.DistrictName  ?? raw.District ?? '',
    cityEn:           raw.CityName      ?? raw.City     ?? '',
    postCode:         raw.PostCode      ?? '',
    shortAddress:     raw.ShortAddress  ?? '',
    regionName:       raw.RegionName    ?? '',
    lat:              coords.lat,
    lng:              coords.lng,
  };
}

/* ── Main lookup function ───────────────────────────────────────────── */

export async function splLookup(req: SplRequest): Promise<SplAddress[]> {
  let url: string;

  if (req.mode === 'freetext') {
    url =
      `${SPL_BASE}/address/address-free-text` +
      `?addressstring=${encodeURIComponent(req.query)}` +
      `&language=E&format=JSON&api_key=${encodeURIComponent(req.apiKey)}`;
  } else {
    const p = new URLSearchParams({
      BuildingNumber: req.buildingNumber,
      language:       'E',
      format:         'JSON',
      api_key:        req.apiKey,
    });
    if (req.additionalNumber) p.set('AdditionalNumber', req.additionalNumber);
    if (req.zipCode)          p.set('ZipCode',          req.zipCode);
    url = `${SPL_BASE}/address/address-verify?${p.toString()}`;
  }

  const res  = await fetch(url);
  const data = await res.json() as {
    success:            boolean;
    statusdescription:  string;
    totalSearchResults: string;
    Addresses:          Record<string, string>[];
  };

  if (!data.success) {
    const desc = data.statusdescription ?? '';
    if (
      desc.includes('INVALID_API') ||
      desc.includes('Access denied') ||
      desc.includes('Unauthorized') ||
      res.status === 401 ||
      res.status === 403
    ) {
      throw new SplAuthError();
    }
    throw new SplNotFoundError(desc || 'NOT_FOUND');
  }

  if (!Array.isArray(data.Addresses) || data.Addresses.length === 0) {
    throw new SplNotFoundError('NO_RESULTS');
  }

  return data.Addresses.map(parseRaw);
}

/* ── API key localStorage helpers ───────────────────────────────────── */

export function getSplApiKey(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(SPL_KEY_STORAGE) ?? '';
}

export function setSplApiKey(key: string): void {
  localStorage.setItem(SPL_KEY_STORAGE, key.trim());
}

export function clearSplApiKey(): void {
  localStorage.removeItem(SPL_KEY_STORAGE);
}
