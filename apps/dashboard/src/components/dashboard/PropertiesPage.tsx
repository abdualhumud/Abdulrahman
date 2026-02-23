'use client';

import { useState, useRef, useCallback } from 'react';
import { Icons } from '@/lib/icons';
import { UNITS, INSURANCE_RECORDS } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';
import { useJourney } from '@/lib/journey-context';
import { SAUDI_CITIES, CITY_COORDS, PROPERTY_IMAGES } from '@/lib/saudi-cities';

type Unit = typeof UNITS[number] & { nameAr?: string; channelKillSwitch?: Record<string, boolean>; uploadedPhotos?: string[] };
type InsuranceStatus = 'HELD' | 'PENDING_INSPECTION' | 'RELEASED';

const AMENITY_KEYS = ['wifi','ac','kitchen','tv','washer','parking','pool','balcony'] as const;
const CHANNEL_OPTIONS = ['Booking.com','Airbnb','Gathern','Direct'] as const;

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:      'bg-emerald-50 text-emerald-700 border border-emerald-200',
  MAINTENANCE: 'bg-amber-50 text-amber-700 border border-amber-200',
  INACTIVE:    'bg-slate-50 text-slate-500 border border-slate-200',
};

const INS_STYLE: Record<InsuranceStatus, string> = {
  HELD:               'bg-blue-50 text-blue-700 border border-blue-200',
  PENDING_INSPECTION: 'bg-amber-50 text-amber-700 border border-amber-200',
  RELEASED:           'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const CHANNEL_COLOR: Record<string, string> = {
  'Booking.com': '#003580', 'Airbnb': '#FF5A5F', 'Gathern': '#00a651', 'Direct': '#F59E0B',
};

/* ── Photo Upload Component ───────────────────────────────────────── */
function PhotoUploader({ photos, onPhotosChange, lang }: {
  photos: string[]; onPhotosChange: (p: string[]) => void; lang: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const readers: Promise<string>[] = Array.from(files).slice(0, 10 - photos.length).map(
      file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      })
    );
    Promise.all(readers).then(results => onPhotosChange([...photos, ...results]));
  };

  const removePhoto = (idx: number) => {
    onPhotosChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }}
      >
        <Icons.upload size={24} className="text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-400">
          {lang === 'ar' ? 'اسحب الصور أو انقر للرفع' : 'Drag photos or click to upload'}
        </p>
        <p className="text-xs text-slate-300 mt-1">PNG, JPG up to 10MB · Max 10 photos</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only"
          onChange={e => processFiles(e.target.files)} />
      </div>

      {/* Preview grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {photos.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Icons.x size={10} />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-bold bg-blue-600 text-white py-0.5">
                  {lang === 'ar' ? 'الصورة الرئيسية' : 'Cover'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
          <Icons.camera size={12} /> {photos.length} {lang === 'ar' ? 'صورة مرفوعة' : 'photo(s) uploaded'}
        </p>
      )}
    </div>
  );
}

/* ── Interactive OSM Map with click-to-pin ────────────────────────── */
function InteractiveMap({ lat, lng, name, onCoordsChange, lang }: {
  lat: number; lng: number; name: string;
  onCoordsChange: (lat: number, lng: number) => void;
  lang: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localLat, setLocalLat] = useState(String(lat));
  const [localLng, setLocalLng] = useState(String(lng));
  const [mapKey, setMapKey] = useState(0);
  const [pinFeedback, setPinFeedback] = useState(false);

  const applyCoords = (newLat: number, newLng: number) => {
    if (!isNaN(newLat) && !isNaN(newLng)) {
      setLocalLat(newLat.toFixed(5));
      setLocalLng(newLng.toFixed(5));
      onCoordsChange(newLat, newLng);
      setMapKey(k => k + 1);
    }
  };

  const handleManualApply = () => {
    applyCoords(parseFloat(localLat), parseFloat(localLng));
  };

  // Click-to-pin: transparent div overlay captures clicks and converts
  // pixel position → approximate geographic coordinates using bbox formula.
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    // bbox: lng ± 0.03 wide, lat ± 0.02 tall (0.06° × 0.04°)
    const lngClick = (lng - 0.03) + (relX / rect.width)  * 0.06;
    const latClick = (lat + 0.02) - (relY / rect.height) * 0.04;
    applyCoords(parseFloat(latClick.toFixed(5)), parseFloat(lngClick.toFixed(5)));
    setPinFeedback(true);
    setTimeout(() => setPinFeedback(false), 1800);
  };

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03},${lat - 0.02},${lng + 0.03},${lat + 0.02}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div>
      {/* Map iframe + click-to-pin overlay */}
      <div ref={containerRef} className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <iframe key={mapKey} src={src} title={name} width="100%" height="100%"
          style={{ border: 0, display: 'block' }} loading="lazy" referrerPolicy="no-referrer" />

        {/* Transparent overlay — captures mouse events, shows crosshair cursor */}
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: 'crosshair' }}
          onClick={handleMapClick}
          title={lang === 'ar' ? 'انقر لوضع الدبوس' : 'Click to place pin'}
        />

        {/* Pin-updated feedback toast */}
        {pinFeedback && (
          <div className="absolute top-2 start-2 z-20 bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg pointer-events-none flex items-center gap-1.5">
            <Icons.mapPin size={11} />
            {lang === 'ar' ? 'تم تثبيت الدبوس' : 'Pin updated'}
          </div>
        )}

        <div className="absolute bottom-2 start-2 z-20 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow text-xs font-bold text-slate-700 max-w-[160px] truncate pointer-events-none">
          {name}
        </div>
      </div>

      <p className="text-[11px] text-blue-600 font-semibold mt-1.5 flex items-center gap-1">
        <Icons.mapPin size={11} />
        {lang === 'ar' ? 'انقر مباشرة على الخريطة لتحريك دبوس الموقع' : 'Click directly on the map to reposition the pin'}
      </p>

      {/* Manual coordinate inputs */}
      <div className="flex items-end gap-2 mt-2">
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">
            {lang === 'ar' ? 'خط العرض' : 'Latitude'}
          </label>
          <input
            type="number" step="0.0001"
            value={localLat}
            onChange={e => setLocalLat(e.target.value)}
            className="input w-full" style={{ direction: 'ltr' }}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">
            {lang === 'ar' ? 'خط الطول' : 'Longitude'}
          </label>
          <input
            type="number" step="0.0001"
            value={localLng}
            onChange={e => setLocalLng(e.target.value)}
            className="input w-full" style={{ direction: 'ltr' }}
          />
        </div>
        <button
          onClick={handleManualApply}
          className="btn-primary px-4 py-2 flex-shrink-0 flex items-center gap-1.5 text-xs"
        >
          <Icons.mapPin size={13} />
          {lang === 'ar' ? 'تحديث' : 'Update Pin'}
        </button>
      </div>
    </div>
  );
}

/* ── National Address Auto-fill ───────────────────────────────────── */
function NationalAddressField({ onAutoFill, lang }: {
  onAutoFill: (city: string, district: string, street: string, lat: number, lng: number) => void;
  lang: string;
}) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle'|'searching'|'found'|'notfound'>('idle');

  const handleSearch = useCallback(async () => {
    if (!value.trim()) return;
    setStatus('searching');

    // Try to match against known Saudi cities/districts from static data
    const lowerVal = value.toLowerCase();
    let matched = false;
    for (const [city, districts] of Object.entries(SAUDI_CITIES)) {
      if (lowerVal.includes(city.toLowerCase())) {
        const matchedDistrict = districts.find(d => lowerVal.includes(d.toLowerCase())) ?? districts[0];
        const coords = CITY_COORDS[city] ?? { lat: 24.7136, lng: 46.6753 };
        onAutoFill(city, matchedDistrict, '', coords.lat, coords.lng);
        setStatus('found');
        matched = true;
        break;
      }
      // Try district match
      const matchedDist = districts.find(d => lowerVal.includes(d.toLowerCase()));
      if (matchedDist) {
        const coords = CITY_COORDS[city] ?? { lat: 24.7136, lng: 46.6753 };
        onAutoFill(city, matchedDist, '', coords.lat, coords.lng);
        setStatus('found');
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Fallback: try Nominatim geocoding (OpenStreetMap, no API key)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value + ', Saudi Arabia')}&format=json&limit=1&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data[0]) {
          const addr = data[0].address ?? {};
          const city = addr.city || addr.state || addr.county || 'Riyadh';
          const district = addr.suburb || addr.neighbourhood || addr.quarter || '';
          const street = addr.road || '';
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          onAutoFill(city, district, street, lat, lng);
          setStatus('found');
        } else {
          setStatus('notfound');
        }
      } catch {
        setStatus('notfound');
      }
    }

    setTimeout(() => setStatus('idle'), 3000);
  }, [value, onAutoFill]);

  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-slate-500 mb-1 block">
        {lang === 'ar' ? 'العنوان الوطني (تعبئة تلقائية)' : 'Saudi National Address (Auto-fill)'}
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="input flex-1"
          placeholder={lang === 'ar' ? 'مثال: RYYY1234 أو شارع الملك فهد، الملز' : 'e.g. RYYY1234 or King Fahd Rd, Al-Malaz, Riyadh'}
        />
        <button
          onClick={handleSearch}
          disabled={status === 'searching'}
          className="btn-primary px-4 flex-shrink-0 flex items-center gap-1.5 text-xs disabled:opacity-60"
        >
          {status === 'searching' ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icons.search size={13} />
          )}
          {lang === 'ar' ? 'بحث' : 'Lookup'}
        </button>
      </div>
      {status === 'found' && (
        <p className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
          <Icons.check size={12} /> {lang === 'ar' ? 'تم تعبئة الموقع تلقائياً' : 'Location auto-filled from address'}
        </p>
      )}
      {status === 'notfound' && (
        <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1">
          <Icons.alertCircle size={12} /> {lang === 'ar' ? 'لم يتم العثور على العنوان — حدّد الموقع يدوياً' : 'Address not found — set location manually'}
        </p>
      )}
      <p className="text-[11px] text-slate-400 mt-1">
        {lang === 'ar' ? 'إدخال عنوان معروف يملأ تلقائياً المدينة والحي والإحداثيات' : 'A recognised address auto-populates city, neighbourhood & GPS coords'}
      </p>
    </div>
  );
}

/* ── Share Unit Modal (URL + QR) ──────────────────────────────────── */
function ShareUnitModal({ unit, onClose, lang }: { unit: Unit; onClose: () => void; lang: string }) {
  const shareUrl = `https://abdualhumud.github.io/Abdulrahman/unit/${unit.id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(shareUrl)}&size=200x200&margin=10`;
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Icons.share size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 leading-none">
                {lang === 'ar' ? 'مشاركة الوحدة' : 'Share Unit'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar' ? (unit.nameAr ?? unit.name) : unit.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200">
            <Icons.x size={15} />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR Code" width={160} height={160} className="rounded-xl" />
          </div>
        </div>

        {/* URL */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 border border-slate-100 flex items-center gap-2">
          <Icons.link size={14} className="text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-600 font-mono truncate flex-1" style={{ direction: 'ltr' }}>{shareUrl}</p>
        </div>

        <button onClick={copyLink}
          className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all
            ${copied ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {copied ? <Icons.check size={16} /> : <Icons.link size={16} />}
          {copied
            ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!')
            : (lang === 'ar' ? 'نسخ الرابط' : 'Copy Link')}
        </button>
      </div>
    </div>
  );
}

/* ── Inspection Checklist Modal ───────────────────────────────────── */
function InspectionModal({ bookingId, onClose, onRelease }: {
  bookingId: string; onClose: () => void; onRelease: () => void;
}) {
  const { t, lang } = useLang();
  const ins = t.insurance;
  const [checks, setChecks] = useState<Record<string, boolean>>({
    clean: false, damage: false, appl: false, keys: false, inv: false,
  });
  const allPassed = Object.values(checks).every(Boolean);

  const ITEMS = [
    { key: 'clean',  label: ins.inspCheckClean  },
    { key: 'damage', label: ins.inspCheckDamage },
    { key: 'appl',   label: ins.inspCheckAppl   },
    { key: 'keys',   label: ins.inspCheckKeys   },
    { key: 'inv',    label: ins.inspCheckInv    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Icons.shield size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">{ins.inspect}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5" style={{ direction: 'ltr' }}>{bookingId}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
            <Icons.x size={15} />
          </button>
        </div>

        <div className="bg-blue-50 rounded-2xl p-4 mb-5 border border-blue-100">
          <div className="flex items-start gap-2.5">
            <Icons.alertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">{ins.thirdPartyNote}</p>
          </div>
          <div className="flex items-center gap-3 mt-3">
            {['Daman','Wafi'].map(p => (
              <span key={p} className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-slate-600 border border-blue-100 shadow-sm">{p}</span>
            ))}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {ITEMS.map(item => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
              <div onClick={() => setChecks(c => ({ ...c, [item.key]: !c[item.key] }))}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${checks[item.key] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200 group-hover:border-slate-400'}`}>
                {checks[item.key] && <Icons.check size={13} className="text-white" />}
              </div>
              <span className={`text-sm transition-colors ${checks[item.key] ? 'text-slate-900 font-semibold line-through decoration-emerald-400' : 'text-slate-600'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{lang === 'ar' ? 'التقدم' : 'Progress'}</span>
            <span>{Object.values(checks).filter(Boolean).length}/5</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${(Object.values(checks).filter(Boolean).length / 5) * 100}%`, background: allPassed ? '#10B981' : '#3B82F6' }} />
          </div>
        </div>

        <button onClick={onRelease} disabled={!allPassed}
          className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all
            ${allPassed ? 'text-white shadow-lg shadow-emerald-500/20 hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          style={allPassed ? { background: 'linear-gradient(135deg,#10B981,#059669)' } : {}}>
          <Icons.shield size={16} /> {ins.releaseDeposit}
        </button>
        {allPassed && <p className="text-center text-xs text-emerald-600 mt-2 font-medium">{ins.autoRelease}</p>}
      </div>
    </div>
  );
}

/* ── Add/Edit Unit Modal ──────────────────────────────────────────── */
function UnitModal({ unit, onClose, onSave }: {
  unit?: Partial<Unit>; onClose: () => void; onSave: (u: Partial<Unit>) => void;
}) {
  const { t, lang } = useLang();
  const p = t.properties;

  const [form, setForm] = useState<Partial<Unit>>(unit ?? {
    name: '', nameAr: '', type: 'APARTMENT', size: 0, floor: 1, beds: 1, baths: 1,
    amenities: [], channels: [], basePrice: 800, weekendSurge: 15,
    seasonalPeak: 1.3, cleaningFee: 100, securityDeposit: 1500, minStay: 2,
    city: 'Riyadh', district: 'Al-Olaya', street: '', lat: 24.7136, lng: 46.6753,
    insuranceProvider: 'Daman', status: 'ACTIVE', photos: 0, uploadedPhotos: [],
  });

  const setF = (k: keyof Unit, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleCityChange = (city: string) => {
    const coords = CITY_COORDS[city];
    setForm(f => ({
      ...f,
      city,
      district: SAUDI_CITIES[city]?.[0] ?? '',
      lat: coords?.lat ?? f.lat,
      lng: coords?.lng ?? f.lng,
    }));
  };

  const handleNatAddressAutoFill = (city: string, district: string, street: string, lat: number, lng: number) => {
    // Snap city to our known list if possible
    const knownCity = Object.keys(SAUDI_CITIES).find(c => c.toLowerCase() === city.toLowerCase()) ?? city;
    const coords = CITY_COORDS[knownCity] ?? { lat, lng };
    setForm(f => ({
      ...f,
      city: knownCity,
      district: district || (SAUDI_CITIES[knownCity]?.[0] ?? f.district),
      street: street || f.street,
      lat: coords.lat,
      lng: coords.lng,
    }));
  };

  const toggleAmenity = (a: string) => setF('amenities', form.amenities?.includes(a) ? form.amenities.filter(x => x !== a) : [...(form.amenities ?? []), a]);
  const toggleChannel = (c: string) => setF('channels', form.channels?.includes(c) ? form.channels.filter(x => x !== c) : [...(form.channels ?? []), c]);

  const AMENITY_LABELS: Record<string, string> = {
    wifi: p.amenityWifi, ac: p.amenityAC, kitchen: p.amenityKitchen,
    tv: p.amenityTV, washer: p.amenityWasher, parking: p.amenityParking,
    pool: p.amenityPool, balcony: p.amenityBalcony,
  };
  const TYPE_LABELS: Record<string, string> = {
    STUDIO: p.unitType_studio, APARTMENT: p.unitType_apt,
    VILLA: p.unitType_villa, CHALET: p.unitType_chalet,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Icons.building size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 leading-none">{unit?.id ? p.editUnit : p.addUnitTitle}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{p.subtitle.split('—')[1]?.trim()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
            <Icons.x size={15} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <section>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{lang === 'ar' ? 'المعلومات الأساسية' : 'Basic Info'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{p.unitName} (English)</label>
                <input value={form.name ?? ''} onChange={e => setF('name', e.target.value)}
                  className="input w-full" placeholder="e.g. 3BR Deluxe — Floor 5" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{p.unitName} (عربي)</label>
                <input value={(form as any).nameAr ?? ''} onChange={e => setF('nameAr' as keyof Unit, e.target.value)}
                  className="input w-full" dir="rtl" placeholder="مثال: شقة 3 غرف فاخرة — الدور الخامس" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{p.unitType}</label>
                <select className="input w-full bg-white" value={form.type ?? 'APARTMENT'} onChange={e => setF('type', e.target.value)}>
                  {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{p.unitSize}</label>
                <input type="number" value={form.size ?? ''} onChange={e => setF('size', +e.target.value)} className="input w-full" style={{ direction: 'ltr' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{p.unitBeds}</label>
                <input type="number" min={1} max={10} value={form.beds ?? 1} onChange={e => setF('beds', +e.target.value)} className="input w-full" style={{ direction: 'ltr' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{p.unitBaths}</label>
                <input type="number" min={1} max={10} value={form.baths ?? 1} onChange={e => setF('baths', +e.target.value)} className="input w-full" style={{ direction: 'ltr' }} />
              </div>
            </div>
          </section>

          {/* Amenities */}
          <section>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{p.unitAmenities}</p>
            <div className="flex flex-wrap gap-2">
              {AMENITY_KEYS.map(a => {
                const active = form.amenities?.includes(a);
                return (
                  <button key={a} onClick={() => toggleAmenity(a)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border
                      ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                    {AMENITY_LABELS[a]}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Photo Upload */}
          <section>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{p.unitPhotos}</p>
            <PhotoUploader
              photos={(form as any).uploadedPhotos ?? []}
              onPhotosChange={urls => setForm(f => ({ ...f, uploadedPhotos: urls, photos: urls.length }))}
              lang={lang}
            />
          </section>

          {/* Location */}
          <section>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{p.location}</p>

            {/* National Address auto-fill */}
            <NationalAddressField onAutoFill={handleNatAddressAutoFill} lang={lang} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{lang === 'ar' ? 'المدينة' : 'City'}</label>
                <select className="input w-full bg-white" value={form.city ?? 'Riyadh'} onChange={e => handleCityChange(e.target.value)}>
                  {Object.keys(SAUDI_CITIES).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{lang === 'ar' ? 'الحي' : 'Neighbourhood'}</label>
                <select className="input w-full bg-white" value={form.district ?? ''} onChange={e => setF('district', e.target.value)}>
                  {(SAUDI_CITIES[form.city ?? 'Riyadh'] ?? []).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{lang === 'ar' ? 'الشارع' : 'Street'}</label>
                <input value={form.street ?? ''} onChange={e => setF('street', e.target.value)} className="input w-full" />
              </div>
            </div>

            <InteractiveMap
              lat={form.lat ?? 24.7136}
              lng={form.lng ?? 46.6753}
              name={lang === 'ar' ? ((form as any).nameAr || form.name || 'موقع الوحدة') : (form.name || 'Unit Location')}
              onCoordsChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
              lang={lang}
            />
          </section>

          {/* Pricing Engine */}
          <section>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{p.pricingEngine}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: p.basePrice,       key: 'basePrice',        prefix: 'SAR' },
                { label: p.weekendSurge,    key: 'weekendSurge',     prefix: '%'   },
                { label: p.seasonalPeak,    key: 'seasonalPeak',     prefix: '×'   },
                { label: p.cleaningFee,     key: 'cleaningFee',      prefix: 'SAR' },
                { label: p.securityDeposit, key: 'securityDeposit',  prefix: 'SAR' },
                { label: p.minStay,         key: 'minStay',          prefix: ''    },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">{f.label}</label>
                  <div className="relative">
                    {f.prefix && <span className="absolute start-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">{f.prefix}</span>}
                    <input type="number" value={(form as any)[f.key] ?? 0}
                      onChange={e => setF(f.key as keyof Unit, +e.target.value)}
                      className={`input w-full ${f.prefix ? 'ps-9' : ''}`} style={{ direction: 'ltr' }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Insurance */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Icons.shield size={15} className="text-violet-600" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{p.insuranceLabel}</p>
            </div>
            <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
              <div className="flex items-start gap-2 mb-3">
                <Icons.alertCircle size={14} className="text-violet-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-violet-700 leading-relaxed">{p.insuranceNote}</p>
              </div>
              <div className="flex gap-2">
                {['Daman','Wafi'].map(prov => (
                  <button key={prov} onClick={() => setF('insuranceProvider', prov)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all
                      ${form.insuranceProvider === prov ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'}`}>
                    {prov}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Channel connections */}
          <section>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{p.channels}</p>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map(ch => {
                const active = form.channels?.includes(ch);
                return (
                  <button key={ch} onClick={() => toggleChannel(ch)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all
                      ${active ? 'text-white' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    style={active ? { background: CHANNEL_COLOR[ch], borderColor: CHANNEL_COLOR[ch] } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ background: active ? 'rgba(255,255,255,0.6)' : CHANNEL_COLOR[ch] }} />
                    {ch}
                  </button>
                );
              })}
            </div>
            {(form.channels?.length ?? 0) > 0 && (
              <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                <Icons.refresh size={12} /> {lang === 'ar' ? 'المزامنة ثنائية الاتجاه مفعّلة' : '2-way sync enabled for all connected channels'}
              </p>
            )}
          </section>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost px-5">{p.cancel}</button>
          <button onClick={() => onSave(form)} className="btn-primary px-6">
            <Icons.check size={15} /> {p.saveUnit}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function PropertiesPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t, lang } = useLang();
  const { markDone } = useJourney();
  const p = t.properties;

  const [units, setUnits] = useState<Unit[]>(UNITS as Unit[]);
  const [showModal, setShowModal]   = useState(false);
  const [editUnit, setEditUnit]     = useState<Partial<Unit> | undefined>();
  const [inspBkg,  setInspBkg]      = useState<string | null>(null);
  const [released, setReleased]     = useState<Record<string, boolean>>({});
  const [filter, setFilter]         = useState<'ALL'|'ACTIVE'|'MAINTENANCE'>('ALL');
  const [shareUnit, setShareUnit]   = useState<Unit | null>(null);
  // Kill switch state per unit per channel
  const [killSwitches, setKillSwitches] = useState<Record<string, Record<string, boolean>>>({});

  const getKillSwitch = (unitId: string, channel: string) => {
    return killSwitches[unitId]?.[channel] !== false; // default = open (true)
  };
  const toggleKillSwitch = (unitId: string, channel: string) => {
    setKillSwitches(prev => ({
      ...prev,
      [unitId]: {
        ...(prev[unitId] ?? {}),
        [channel]: !getKillSwitch(unitId, channel),
      },
    }));
  };

  const filtered = filter === 'ALL' ? units : units.filter(u => u.status === filter);

  const openAdd  = () => { setEditUnit(undefined); setShowModal(true); };
  const openEdit = (u: Unit) => { setEditUnit(u); setShowModal(true); };
  const handleSave = (form: Partial<Unit>) => {
    if (form.id) {
      setUnits(us => us.map(u => u.id === form.id ? { ...u, ...form } as Unit : u));
    } else {
      setUnits(us => [...us, { ...form, id: 'u' + Date.now(), propertyId: 'p1', propertyName: 'New Property', occupancy: 0, revenue: 0, photos: 0, color: '#3B82F6' } as Unit]);
      markDone(2);
    }
    setShowModal(false);
  };

  const totalUnits = units.length;
  const activeUnits = units.filter(u => u.status === 'ACTIVE').length;
  const avgOcc = Math.round(units.filter(u => u.status === 'ACTIVE').reduce((s, u) => s + u.occupancy, 0) / activeUnits);
  const totalRev = units.reduce((s, u) => s + u.revenue, 0);

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{p.title}</h1>
          <p className="text-sm text-slate-400 mt-1">{p.subtitle}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Icons.plus size={15} /> {p.addUnit}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: lang === 'ar' ? 'إجمالي الوحدات' : 'Total Units',    value: totalUnits,                          icon: <Icons.building size={16} />,    accent: '#3B82F6' },
          { label: lang === 'ar' ? 'الوحدات النشطة' : 'Active Units',   value: activeUnits,                         icon: <Icons.check size={16} />,       accent: '#10B981' },
          { label: lang === 'ar' ? 'متوسط الإشغال' : 'Avg Occupancy',  value: `${avgOcc}%`,                        icon: <Icons.analytics size={16} />,   accent: '#8B5CF6' },
          { label: lang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', value: `SAR ${totalRev.toLocaleString()}`, icon: <Icons.financials size={16} />,  accent: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-snug">{s.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.accent + '15', color: s.accent }}>{s.icon}</div>
            </div>
            <p className="text-xl font-extrabold text-slate-900" style={{ direction: 'ltr' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['ALL','ACTIVE','MAINTENANCE'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border
              ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
            {f === 'ALL' ? (lang === 'ar' ? 'الكل' : 'All') : f === 'ACTIVE' ? p.active : p.maintenance}
            <span className="ms-1.5 opacity-60">
              {f === 'ALL' ? units.length : units.filter(u => u.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Units grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map(unit => {
          const ins = INSURANCE_RECORDS.find(r => r.bookingId && unit.name.includes(r.unit));
          const insStatus: InsuranceStatus = released[unit.id] ? 'RELEASED' : (ins?.status as InsuranceStatus) ?? 'HELD';
          const unitImages = PROPERTY_IMAGES[unit.type] ?? PROPERTY_IMAGES.APARTMENT;
          const unitImg = (unit as any).uploadedPhotos?.[0] ?? unitImages[units.indexOf(unit) % unitImages.length];
          const displayName = lang === 'ar' ? ((unit as any).nameAr || unit.name) : unit.name;

          return (
            <div key={unit.id} className="card overflow-hidden hover:shadow-lg transition-shadow">
              {/* Property photo */}
              <div className="relative h-36 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unitImg} alt={unit.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 start-3 flex items-center gap-1.5">
                  <span className="text-white text-xs font-bold drop-shadow">{unit.city}</span>
                  <span className="text-white/60 text-xs">·</span>
                  <span className="text-white/80 text-xs">{unit.district}</span>
                </div>
                <div className="absolute top-2 end-2 flex items-center gap-2">
                  <span className={`badge text-[10px] ${STATUS_STYLE[unit.status]}`}>
                    {unit.status === 'ACTIVE' ? p.active : unit.status === 'MAINTENANCE' ? p.maintenance : p.inactive}
                  </span>
                </div>
              </div>

              {/* Unit header */}
              <div className="px-5 pt-4 pb-4 flex items-start gap-3 border-b border-slate-50">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: unit.color + '18', color: unit.color }}>
                  <Icons.building size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-slate-900 leading-none">{displayName}</p>
                  <p className="text-xs text-slate-400 mt-1">{unit.beds}BR / {unit.baths}BA · {unit.size}m²</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Share button */}
                  <button
                    onClick={() => setShareUnit(unit)}
                    title={lang === 'ar' ? 'مشاركة' : 'Share'}
                    className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-all"
                  >
                    <Icons.share size={13} />
                  </button>
                  <button onClick={() => openEdit(unit)} className="btn-ghost text-xs py-1.5 px-3">
                    {lang === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-slate-50">
                <div>
                  <p className="text-xs text-slate-400">{p.occupancy}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-1.5 rounded-full" style={{ width: `${unit.occupancy}%`, background: unit.color }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{unit.occupancy}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{p.revenue}</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-1" style={{ direction: 'ltr' }}>
                    {unit.revenue > 0 ? `SAR ${unit.revenue.toLocaleString()}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{lang === 'ar' ? 'السعر الأساسي' : 'Base Rate'}</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-1" style={{ direction: 'ltr' }}>SAR {unit.basePrice}</p>
                </div>
              </div>

              {/* Channel Kill Switches */}
              <div className="px-5 py-3.5 border-b border-slate-50">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  {lang === 'ar' ? 'توفر القنوات' : 'Channel Availability'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {unit.channels.map(ch => {
                    const isOpen = getKillSwitch(unit.id, ch);
                    return (
                      <button
                        key={ch}
                        onClick={() => toggleKillSwitch(unit.id, ch)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all select-none
                          ${isOpen
                            ? 'text-white'
                            : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                        style={isOpen ? { background: CHANNEL_COLOR[ch], borderColor: CHANNEL_COLOR[ch] } : {}}
                        title={`${ch}: ${isOpen ? (lang === 'ar' ? 'مفتوح — انقر للإغلاق' : 'Open — click to close') : (lang === 'ar' ? 'مغلق — انقر للفتح' : 'Closed — click to open')}`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOpen ? 'bg-white/70' : 'bg-slate-300'}`} />
                        {ch}
                        <span className={`text-[9px] ms-0.5 font-bold ${isOpen ? 'opacity-75' : 'text-slate-400'}`}>
                          {isOpen ? (lang === 'ar' ? '● مفتوح' : '● ON') : (lang === 'ar' ? '○ مغلق' : '○ OFF')}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {lang === 'ar' ? 'انقر على أي قناة لفتح أو إغلاق التوفر فوراً' : 'Click any channel to instantly open/close availability'}
                </p>
              </div>

              {/* Insurance badge */}
              <div className="px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className={`badge text-[10px] flex items-center gap-1 ${INS_STYLE[insStatus] ?? INS_STYLE.HELD}`}>
                    <Icons.shield size={11} />
                    {insStatus === 'HELD' ? t.insurance.depositHeld : insStatus === 'RELEASED' ? t.insurance.depositReleased : t.insurance.depositPending}
                  </span>
                  {insStatus === 'PENDING_INSPECTION' && (
                    <button onClick={() => setInspBkg(INSURANCE_RECORDS.find(r => r.unit.includes(unit.name.split('—')[0]?.trim()))?.bookingId ?? '')}
                      className="text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors underline underline-offset-2">
                      {t.insurance.inspect}
                    </button>
                  )}
                </div>
              </div>

              {/* OSM Map (updated dynamically via lat/lng) */}
              <div className="px-5 pb-5">
                <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${unit.lng - 0.03},${unit.lat - 0.02},${unit.lng + 0.03},${unit.lat + 0.02}&layer=mapnik&marker=${unit.lat},${unit.lng}`}
                    title={unit.name}
                    width="100%" height="100%"
                    style={{ border: 0, display: 'block' }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 start-2 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow text-xs font-bold text-slate-700 pointer-events-none">
                    {unit.city} · {unit.district}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Insurance provider section */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icons.shield size={18} className="text-violet-600" />
          <p className="font-bold text-slate-900">{t.insurance.title}</p>
        </div>
        <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100 mb-4">
          <p className="text-sm text-violet-700 leading-relaxed">{t.insurance.thirdPartyNote}</p>
          <div className="flex items-center gap-3 mt-3">
            {['Daman','Wafi'].map(prov => (
              <div key={prov} className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-violet-100 shadow-sm">
                <Icons.shield size={14} className="text-violet-600" />
                <span className="text-sm font-bold text-slate-700">{prov}</span>
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  {lang === 'ar' ? 'شريك معتمد' : 'Partner'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ direction: 'ltr' }}>
          <table className="w-full data-table">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr>
                {['Booking','Guest','Unit','Provider','Deposit (SAR)','Status'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {INSURANCE_RECORDS.map(rec => {
                const st: InsuranceStatus = released[rec.bookingId] ? 'RELEASED' : rec.status as InsuranceStatus;
                return (
                  <tr key={rec.bookingId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="font-mono text-xs text-slate-400">{rec.bookingId}</td>
                    <td className="font-semibold text-slate-800">{rec.guest}</td>
                    <td className="text-slate-600">{rec.unit}</td>
                    <td><span className="badge bg-violet-50 text-violet-700 border border-violet-100 text-xs">{rec.provider}</span></td>
                    <td className="font-extrabold text-slate-900">SAR {rec.depositAmount.toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-[10px] ${INS_STYLE[st] ?? INS_STYLE.HELD}`}>
                          {st === 'HELD' ? t.insurance.depositHeld : st === 'RELEASED' ? t.insurance.depositReleased : t.insurance.depositPending}
                        </span>
                        {st === 'PENDING_INSPECTION' && (
                          <button onClick={() => setInspBkg(rec.bookingId)}
                            className="text-[10px] font-bold text-amber-600 hover:text-amber-800 underline underline-offset-1">
                            {lang === 'ar' ? 'فحص' : 'Inspect'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <UnitModal unit={editUnit} onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
      {inspBkg && (
        <InspectionModal
          bookingId={inspBkg}
          onClose={() => setInspBkg(null)}
          onRelease={() => { setReleased(r => ({ ...r, [inspBkg]: true })); setInspBkg(null); }}
        />
      )}
      {shareUnit && (
        <ShareUnitModal unit={shareUnit} onClose={() => setShareUnit(null)} lang={lang} />
      )}
    </div>
  );
}
