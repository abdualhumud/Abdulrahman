/**
 * units-service.ts — CRUD for property units
 *
 * Replaces all localStorage.setItem/getItem('rems-prod-units') calls.
 * Data is scoped per owner via Row Level Security on the units table.
 */

import { supabase } from '@/lib/supabase';
import type { UnitRow } from '@/lib/database.types';

/* ── Types ──────────────────────────────────────────────────── */

/** Shape used by UI components — matches the mock-data UNITS structure. */
export interface Unit {
  id:               string;
  name:             string;
  nameAr?:          string;
  type:             string;
  city:             string;
  district:         string;
  street?:          string;
  lat:              number;
  lng:              number;
  beds:             number;
  baths:            number;
  size:             number;
  floor?:           number;
  basePrice:        number;
  weekendSurge:     number;
  seasonalPeak:     number;
  cleaningFee:      number;
  securityDeposit:  number;
  minStay:          number;
  channels:         string[];
  amenities:        string[];
  status:           'ACTIVE' | 'INACTIVE';
  occupancy:        number;
  revenue:          number;
  photos:           string[];
  insuranceProvider?: string;
  color:            string;
}

/* ── Row ↔ Unit converters ──────────────────────────────────── */

function rowToUnit(row: UnitRow): Unit {
  return {
    id:               row.id,
    name:             row.name,
    nameAr:           row.name_ar ?? undefined,
    type:             row.type,
    city:             row.city,
    district:         row.district,
    street:           row.street ?? undefined,
    lat:              row.lat,
    lng:              row.lng,
    beds:             row.beds,
    baths:            row.baths,
    size:             row.size,
    floor:            row.floor ?? undefined,
    basePrice:        row.base_price,
    weekendSurge:     row.weekend_surge,
    seasonalPeak:     row.seasonal_peak,
    cleaningFee:      row.cleaning_fee,
    securityDeposit:  row.security_deposit,
    minStay:          row.min_stay,
    channels:         row.channels,
    amenities:        row.amenities,
    status:           row.status as 'ACTIVE' | 'INACTIVE',
    occupancy:        row.occupancy,
    revenue:          row.revenue,
    photos:           row.photos,
    insuranceProvider: row.insurance_provider ?? undefined,
    color:            row.color,
  };
}

function unitToInsert(
  unit: Omit<Unit, 'id'>,
  ownerId: string,
): Omit<UnitRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    owner_id:          ownerId,
    name:              unit.name,
    name_ar:           unit.nameAr ?? null,
    type:              unit.type,
    city:              unit.city,
    district:          unit.district,
    street:            unit.street ?? null,
    lat:               unit.lat,
    lng:               unit.lng,
    beds:              unit.beds,
    baths:             unit.baths,
    size:              unit.size,
    floor:             unit.floor ?? null,
    base_price:        unit.basePrice,
    weekend_surge:     unit.weekendSurge,
    seasonal_peak:     unit.seasonalPeak,
    cleaning_fee:      unit.cleaningFee,
    security_deposit:  unit.securityDeposit,
    min_stay:          unit.minStay,
    channels:          unit.channels,
    amenities:         unit.amenities,
    status:            unit.status,
    occupancy:         unit.occupancy,
    revenue:           unit.revenue,
    photos:            unit.photos,
    insurance_provider: unit.insuranceProvider ?? null,
    color:             unit.color,
  };
}

/* ── CRUD operations ────────────────────────────────────────── */

/** Fetch all units for the current owner, newest first. */
export async function getUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('[units-service] getUnits:', error.message); return []; }
  return (data ?? []).map(rowToUnit);
}

/** Add a new unit. Returns the created unit with its server-assigned ID. */
export async function addUnit(unit: Omit<Unit, 'id'>, ownerId: string): Promise<Unit | null> {
  const { data, error } = await supabase
    .from('units')
    .insert(unitToInsert(unit, ownerId))
    .select()
    .single();

  if (error) { console.error('[units-service] addUnit:', error.message); return null; }
  return data ? rowToUnit(data) : null;
}

/** Update an existing unit. */
export async function updateUnit(id: string, patch: Partial<Omit<Unit, 'id'>>): Promise<Unit | null> {
  const update: Partial<UnitRow> = {};
  if (patch.name             !== undefined) update.name              = patch.name;
  if (patch.nameAr           !== undefined) update.name_ar           = patch.nameAr ?? null;
  if (patch.type             !== undefined) update.type              = patch.type;
  if (patch.city             !== undefined) update.city              = patch.city;
  if (patch.district         !== undefined) update.district          = patch.district;
  if (patch.street           !== undefined) update.street            = patch.street ?? null;
  if (patch.lat              !== undefined) update.lat               = patch.lat;
  if (patch.lng              !== undefined) update.lng               = patch.lng;
  if (patch.beds             !== undefined) update.beds              = patch.beds;
  if (patch.baths            !== undefined) update.baths             = patch.baths;
  if (patch.size             !== undefined) update.size              = patch.size;
  if (patch.floor            !== undefined) update.floor             = patch.floor ?? null;
  if (patch.basePrice        !== undefined) update.base_price        = patch.basePrice;
  if (patch.weekendSurge     !== undefined) update.weekend_surge     = patch.weekendSurge;
  if (patch.seasonalPeak     !== undefined) update.seasonal_peak     = patch.seasonalPeak;
  if (patch.cleaningFee      !== undefined) update.cleaning_fee      = patch.cleaningFee;
  if (patch.securityDeposit  !== undefined) update.security_deposit  = patch.securityDeposit;
  if (patch.minStay          !== undefined) update.min_stay          = patch.minStay;
  if (patch.channels         !== undefined) update.channels          = patch.channels;
  if (patch.amenities        !== undefined) update.amenities         = patch.amenities;
  if (patch.status           !== undefined) update.status            = patch.status;
  if (patch.occupancy        !== undefined) update.occupancy         = patch.occupancy;
  if (patch.revenue          !== undefined) update.revenue           = patch.revenue;
  if (patch.photos           !== undefined) update.photos            = patch.photos;
  if (patch.insuranceProvider !== undefined) update.insurance_provider = patch.insuranceProvider ?? null;
  if (patch.color            !== undefined) update.color             = patch.color;

  const { data, error } = await supabase
    .from('units')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('[units-service] updateUnit:', error.message); return null; }
  return data ? rowToUnit(data) : null;
}

/** Delete a unit permanently. */
export async function deleteUnit(id: string): Promise<boolean> {
  const { error } = await supabase.from('units').delete().eq('id', id);
  if (error) { console.error('[units-service] deleteUnit:', error.message); return false; }
  return true;
}

/** Count units for the current owner — used by StagingEmptyGate. */
export async function getUnitCount(): Promise<number> {
  const { count, error } = await supabase
    .from('units')
    .select('*', { count: 'exact', head: true });

  if (error) return 0;
  return count ?? 0;
}
