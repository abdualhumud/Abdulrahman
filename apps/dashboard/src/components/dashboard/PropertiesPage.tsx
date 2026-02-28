'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Icons } from '@/lib/icons';
import { UNITS, INSURANCE_RECORDS } from '@/lib/mock-data';
import { useLang } from '@/lib/language-context';
import { useJourney } from '@/lib/journey-context';
import { useMode } from '@/lib/mode-context';
import { SAUDI_CITIES, CITY_COORDS, PROPERTY_IMAGES } from '@/lib/saudi-cities';
import {
  splLookup, getSplApiKey, setSplApiKey, clearSplApiKey,
  SplAuthError, SplNotFoundError,
} from '@/lib/spl-service';

/** Unified result from either SPL or Nominatim fallback */
type NatFillResult = {
  city: string; district: string; street: string;
  lat: number;  lng: number;
  verified: boolean;               // true = came from official SPL API
  buildingNumber?: string;
  postCode?: string;
  shortAddress?: string;
};

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
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
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

/* ── Leaflet interactive map (CDN, no npm install needed) ────────────── */
function LeafletPinMap({ lat, lng, name, onCoordsChange, lang }: {
  lat: number; lng: number; name: string;
  onCoordsChange: (lat: number, lng: number) => void;
  lang: string;
}) {
  const containerRef      = useRef<HTMLDivElement>(null);
  const mapRef            = useRef<any>(null);
  const markerRef         = useRef<any>(null);
  const initLatRef        = useRef(lat);
  const initLngRef        = useRef(lng);
  // Keep callback ref stable — prevents map from re-initialising on every form field change
  const onCoordsChangeRef = useRef(onCoordsChange);
  useEffect(() => { onCoordsChangeRef.current = onCoordsChange; }, [onCoordsChange]);

  const [coords, setCoords]           = useState({ lat, lng });
  const [pinFeedback, setPinFeedback] = useState(false);
  const [loading, setLoading]         = useState(true);

  // Stable — no deps because we use the ref instead of the prop directly
  const updatePin = useCallback((newLat: number, newLng: number) => {
    setCoords({ lat: newLat, lng: newLng });
    onCoordsChangeRef.current(newLat, newLng);
    setPinFeedback(true);
    setTimeout(() => setPinFeedback(false), 1800);
  }, []);

  const initLeafletMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Fix broken default marker icon paths (common Leaflet + bundler issue)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const initLat = initLatRef.current;
    const initLng = initLngRef.current;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([initLat, initLng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      updatePin(pos.lat, pos.lng);
    });

    map.on('click', (e: any) => {
      marker.setLatLng(e.latlng);
      updatePin(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current    = map;
    markerRef.current = marker;
    setLoading(false);
  }, [updatePin]);

  // Load Leaflet CSS + JS from CDN once per session
  useEffect(() => {
    const onLoad = () => initLeafletMap();

    if ((window as any).L) {
      initLeafletMap();
    } else {
      if (!document.getElementById('leaflet-css')) {
        const link    = document.createElement('link');
        link.id       = 'leaflet-css';
        link.rel      = 'stylesheet';
        link.href     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const existingScript = document.getElementById('leaflet-js') as HTMLScriptElement | null;
      if (!existingScript) {
        const script    = document.createElement('script');
        script.id       = 'leaflet-js';
        script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload   = onLoad;
        document.head.appendChild(script);
      } else if ((window as any).L) {
        onLoad();
      } else {
        existingScript.addEventListener('load', onLoad);
        return () => existingScript.removeEventListener('load', onLoad);
      }
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current    = null;
        markerRef.current = null;
      }
    };
  }, [initLeafletMap]);

  // Smooth pan + marker move when parent changes lat/lng (e.g., city dropdown)
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
      markerRef.current.setLatLng([lat, lng]);
      setCoords({ lat, lng });
    }
  }, [lat, lng]);

  return (
    <div>
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 220 }}>
        {/* Loading skeleton */}
        {loading && (
          <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <span className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-semibold">
                {lang === 'ar' ? 'جارٍ تحميل الخريطة…' : 'Loading map…'}
              </p>
            </div>
          </div>
        )}
        {/* Leaflet mount point */}
        <div ref={containerRef} className="w-full h-full" style={{ zIndex: 0 }} />

        {/* Pin feedback toast */}
        {pinFeedback && (
          <div className="absolute top-2 start-2 z-[500] bg-emerald-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg pointer-events-none flex items-center gap-1.5">
            <Icons.mapPin size={11} />
            {lang === 'ar' ? 'تم تحديث الدبوس' : 'Pin updated'}
          </div>
        )}

        {/* Unit label */}
        <div className="absolute bottom-2 start-2 z-[500] bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow text-xs font-bold text-slate-700 max-w-[180px] truncate pointer-events-none">
          {name}
        </div>
      </div>

      <p className="text-[11px] text-blue-600 font-semibold mt-1.5 flex items-center gap-1">
        <Icons.mapPin size={11} />
        {lang === 'ar'
          ? 'انقر على الخريطة أو اسحب الدبوس لتحديد الموقع بدقة'
          : 'Click the map or drag the pin to reposition — coordinates update instantly'}
      </p>

      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400" style={{ direction: 'ltr' }}>
        <Icons.mapPin size={11} className="text-slate-300" />
        <span className="font-mono">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
      </div>
    </div>
  );
}

/* ── National Address Auto-fill (SPL + Nominatim fallback) ─────────── */
function NationalAddressField({
  onAutoFill,
  lang,
}: {
  onAutoFill: (r: NatFillResult) => void;
  lang: string;
}) {
  const isAr = lang === 'ar';

  /* Search inputs */
  const [mode,       setMode]      = useState<'freetext' | 'building'>('freetext');
  const [query,      setQuery]     = useState('');
  const [buildingNo, setBldNo]     = useState('');
  const [addlNo,     setAddlNo]    = useState('');
  const [zipCode,    setZip]       = useState('');

  /* API key */
  const [apiKey,        setApiKey]     = useState<string>(() => getSplApiKey());
  const [showKeyInput,  setShowKey]    = useState(false);
  const [tempKey,       setTempKey]    = useState('');

  /* Status */
  const [status,      setStatus]    = useState<'idle' | 'loading' | 'verified' | 'fallback' | 'error'>('idle');
  const [verifiedMeta, setVerMeta]  = useState<{ building: string; postCode: string; shortAddr: string } | null>(null);
  const [errorMsg,    setErrorMsg]  = useState('');

  const hasKey = apiKey.trim().length > 0;

  const saveKey = () => {
    if (!tempKey.trim()) return;
    setSplApiKey(tempKey.trim());
    setApiKey(tempKey.trim());
    setTempKey('');
    setShowKey(false);
  };
  const disconnectKey = () => {
    clearSplApiKey();
    setApiKey('');
    setVerMeta(null);
    setStatus('idle');
  };

  /* Nominatim fallback */
  const nominatimFallback = useCallback(async (searchText: string) => {
    const lv = searchText.toLowerCase();
    for (const [city, districts] of Object.entries(SAUDI_CITIES)) {
      if (lv.includes(city.toLowerCase())) {
        const dist   = districts.find(d => lv.includes(d.toLowerCase())) ?? districts[0];
        const coords = CITY_COORDS[city] ?? { lat: 24.7136, lng: 46.6753 };
        onAutoFill({ city, district: dist, street: '', lat: coords.lat, lng: coords.lng, verified: false });
        setStatus('fallback');
        return;
      }
      const dist = districts.find(d => lv.includes(d.toLowerCase()));
      if (dist) {
        const coords = CITY_COORDS[city] ?? { lat: 24.7136, lng: 46.6753 };
        onAutoFill({ city, district: dist, street: '', lat: coords.lat, lng: coords.lng, verified: false });
        setStatus('fallback');
        return;
      }
    }
    // Try Nominatim geocoding
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText + ', Saudi Arabia')}&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data[0]) {
        const addr = data[0].address ?? {};
        onAutoFill({
          city:     addr.city || addr.state || 'Riyadh',
          district: addr.suburb || addr.neighbourhood || addr.quarter || '',
          street:   addr.road || '',
          lat:      parseFloat(data[0].lat),
          lng:      parseFloat(data[0].lon),
          verified: false,
        });
        setStatus('fallback');
      } else {
        setStatus('error');
        setErrorMsg(isAr ? 'لم يتم العثور على العنوان — حدّد الموقع يدوياً' : 'Address not found — set location manually');
      }
    } catch {
      setStatus('error');
      setErrorMsg(isAr ? 'تعذّر الاتصال — حدّد الموقع يدوياً' : 'Search failed — set location manually');
    }
  }, [isAr, onAutoFill]);

  const handleSearch = useCallback(async () => {
    const inputOk = mode === 'freetext' ? query.trim() : buildingNo.trim();
    if (!inputOk) return;
    setStatus('loading');
    setErrorMsg('');
    setVerMeta(null);

    /* ── 1. Try SPL API (only when key is present) ── */
    if (hasKey) {
      try {
        const results = mode === 'freetext'
          ? await splLookup({ mode: 'freetext', query, apiKey })
          : await splLookup({ mode: 'building', buildingNumber: buildingNo, additionalNumber: addlNo, zipCode, apiKey });

        const r = results[0];
        setStatus('verified');
        setVerMeta({ building: r.buildingNumber, postCode: r.postCode, shortAddr: r.shortAddress });
        onAutoFill({
          city: r.cityEn, district: r.districtEn, street: r.streetEn,
          lat:  r.lat,    lng:       r.lng,
          verified:       true,
          buildingNumber: r.buildingNumber,
          postCode:       r.postCode,
          shortAddress:   r.shortAddress,
        });
        return; // ← done — no fallback needed
      } catch (err: unknown) {
        if (err instanceof SplAuthError) {
          setStatus('error');
          setErrorMsg(isAr ? 'مفتاح API غير صالح — تحقق من اشتراكك في SPL' : 'Invalid SPL API key — check your subscription');
          return;
        }
        if (err instanceof SplNotFoundError) {
          setStatus('error');
          setErrorMsg(isAr ? 'العنوان غير موجود في قاعدة العنوان الوطني' : 'Address not found in the National Address database');
          return;
        }
        // Network / CORS error → fall through to Nominatim
        if (process.env.NODE_ENV !== 'production') console.warn('SPL unreachable (likely CORS), falling back to Nominatim:', (err as Error).message);
      }
    }

    /* ── 2. Fallback: static city match + Nominatim ── */
    const searchText = mode === 'freetext' ? query : `${buildingNo} ${zipCode}`;
    await nominatimFallback(searchText);
    if (hasKey) {
      // Amend the status message to mention the fallback reason
      setStatus('fallback');
    }
  }, [mode, query, buildingNo, addlNo, zipCode, apiKey, hasKey, isAr, onAutoFill, nominatimFallback]);

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 overflow-hidden bg-white">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* Saudi Post logo mark */}
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-extrabold text-[10px]"
            style={{ background: 'linear-gradient(135deg,#006633,#00a651)' }}>
            SP
          </div>
          <span className="text-xs font-bold text-slate-700">
            {isAr ? 'العنوان الوطني — SPL' : 'National Address Lookup — SPL'}
          </span>
          {hasKey && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 leading-none">
              ✓ {isAr ? 'متصل' : 'Connected'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasKey ? (
            <button onClick={disconnectKey}
              className="text-[10px] text-slate-400 hover:text-red-500 font-semibold transition-colors">
              {isAr ? 'إلغاء الربط' : 'Disconnect'}
            </button>
          ) : (
            <button onClick={() => setShowKey(v => !v)}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold transition-colors">
              {isAr ? '+ ربط مفتاح SPL' : '+ Connect SPL key'}
            </button>
          )}
        </div>
      </div>

      {/* ── API key setup panel ── */}
      {showKeyInput && !hasKey && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 space-y-2">
          <p className="text-[11px] text-blue-800 font-semibold">
            {isAr
              ? 'أدخل مفتاح API من بوابة المطورين (api.address.gov.sa) لتفعيل التحقق الرسمي.'
              : 'Enter your SPL Subscription Key from api.address.gov.sa to enable official verification.'}
          </p>
          <div className="flex gap-2">
            <input
              value={tempKey}
              onChange={e => setTempKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="flex-1 text-xs font-mono border border-blue-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              dir="ltr"
            />
            <button onClick={saveKey} disabled={!tempKey.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-blue-700">
              {isAr ? 'حفظ' : 'Save'}
            </button>
          </div>
          <p className="text-[10px] text-blue-500">
            {isAr
              ? 'يُخزَّن المفتاح محلياً في المتصفح فقط ولا يُرسل لأي خادم خارجي.'
              : 'Stored locally in your browser only — never sent to any third party.'}
          </p>
        </div>
      )}

      {/* ── Search area ── */}
      <div className="p-4 space-y-3">

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {(['freetext', 'building'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                mode === m ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {m === 'freetext'
                ? (isAr ? 'نص حر / رمز قصير' : 'Text / Short Code')
                : (isAr ? 'رقم المبنى' : 'Building Number')}
            </button>
          ))}
        </div>

        {/* Inputs */}
        {mode === 'freetext' ? (
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={isAr ? 'مثال: RYYY1234 أو شارع الملك فهد، الملز، الرياض' : 'e.g. RYYY1234  or  King Fahd Rd, Al-Malaz, Riyadh'}
              className="flex-1 input text-xs"
              dir="ltr"
            />
            <button
              onClick={handleSearch}
              disabled={status === 'loading' || !query.trim()}
              className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
            >
              {status === 'loading'
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Icons.search size={13} />}
              {isAr ? 'بحث' : 'Lookup'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">
                  {isAr ? 'رقم المبنى *' : 'Building No. *'}
                </label>
                <input value={buildingNo} onChange={e => setBldNo(e.target.value)}
                  className="input text-xs w-full font-mono" dir="ltr" placeholder="8228" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">
                  {isAr ? 'الرقم الإضافي' : 'Additional No.'}
                </label>
                <input value={addlNo} onChange={e => setAddlNo(e.target.value)}
                  className="input text-xs w-full font-mono" dir="ltr" placeholder="2121" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1 block">
                  {isAr ? 'الرمز البريدي' : 'Zip Code'}
                </label>
                <input value={zipCode} onChange={e => setZip(e.target.value)}
                  className="input text-xs w-full font-mono" dir="ltr" placeholder="12643" />
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={status === 'loading' || !buildingNo.trim()}
              className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {status === 'loading'
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Icons.search size={13} />}
              {isAr ? 'التحقق من العنوان الوطني' : 'Verify National Address'}
            </button>
          </div>
        )}

        {/* ── Status feedback ── */}

        {/* VERIFIED (SPL) */}
        {status === 'verified' && verifiedMeta && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Icons.shield size={15} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-emerald-800">
                {isAr ? '✓ موثّق من العنوان الوطني (SPL)' : '✓ Verified by National Address — SPL'}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5" style={{ direction: 'ltr' }}>
                {verifiedMeta.building  && <span className="text-[11px] text-emerald-600 font-mono">Bldg {verifiedMeta.building}</span>}
                {verifiedMeta.postCode  && <span className="text-[11px] text-emerald-600 font-mono">ZIP {verifiedMeta.postCode}</span>}
                {verifiedMeta.shortAddr && <span className="text-[11px] text-emerald-600 font-mono">{verifiedMeta.shortAddr}</span>}
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">
                {isAr
                  ? 'تم تعبئة المدينة والحي والشارع والإحداثيات من السجل الرسمي'
                  : 'City, neighbourhood, street & GPS filled from official registry'}
              </p>
            </div>
          </div>
        )}

        {/* FALLBACK (Nominatim / static) */}
        {status === 'fallback' && (
          <p className="text-xs text-blue-600 font-semibold flex items-center gap-1.5">
            <Icons.check size={12} />
            {hasKey
              ? (isAr ? 'تعبئة تقريبية (OpenStreetMap) — SPL غير متاح من المتصفح' : 'Approximate fill (OpenStreetMap) — SPL unreachable from browser')
              : (isAr ? 'تم تعبئة الموقع تقريبياً عبر OpenStreetMap' : 'Location filled via OpenStreetMap')}
          </p>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
            <Icons.alertCircle size={12} />
            {errorMsg}
          </p>
        )}

        {/* No key hint */}
        {!hasKey && status === 'idle' && (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr
              ? 'ربط مفتاح SPL يتيح التحقق الرسمي. بدونه يُستخدم OpenStreetMap كبديل.'
              : 'Connect an SPL key for official GPS-accurate verification. Without it, OpenStreetMap is used as fallback.'}
          </p>
        )}
      </div>
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
            <img src={qrSrc} alt={`QR code for unit ${unit.name}`} width={160} height={160} className="rounded-xl" loading="lazy" />
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

  // Tracks a successful SPL verification result for the badge display
  const [splVerified, setSplVerified] = useState<NatFillResult | null>(null);

  const handleCityChange = (city: string) => {
    const coords = CITY_COORDS[city];
    setSplVerified(null); // manual change overrides SPL verification
    setForm(f => ({
      ...f,
      city,
      district: SAUDI_CITIES[city]?.[0] ?? '',
      lat: coords?.lat ?? f.lat,
      lng: coords?.lng ?? f.lng,
    }));
  };

  // Re-center map when neighbourhood changes — applies a small deterministic
  // offset within the city so the flyTo effect fires (no district-level GPS data)
  const handleDistrictChange = (district: string) => {
    const districts = SAUDI_CITIES[form.city ?? 'Riyadh'] ?? [];
    const idx       = districts.indexOf(district);
    const count     = Math.max(districts.length, 1);
    const angle     = (idx / count) * 2 * Math.PI;
    const radius    = 0.012; // ~1.3 km visual offset
    const cityCoords = CITY_COORDS[form.city ?? 'Riyadh'] ?? { lat: 24.7136, lng: 46.6753 };
    setForm(f => ({
      ...f,
      district,
      lat: parseFloat((cityCoords.lat + Math.sin(angle) * radius).toFixed(5)),
      lng: parseFloat((cityCoords.lng + Math.cos(angle) * radius).toFixed(5)),
    }));
  };

  const handleNatAddressAutoFill = (r: NatFillResult) => {
    // Snap city string to our known city list (case-insensitive match)
    const knownCity = Object.keys(SAUDI_CITIES).find(c => c.toLowerCase() === r.city.toLowerCase()) ?? r.city;
    // Use exact SPL GPS when verified; fall back to city-centre coords for Nominatim results
    const coords = r.verified
      ? { lat: r.lat, lng: r.lng }
      : (CITY_COORDS[knownCity] ?? { lat: r.lat, lng: r.lng });
    if (r.verified) setSplVerified(r);
    setForm(f => ({
      ...f,
      city: knownCity,
      district:
        SAUDI_CITIES[knownCity]?.find(d => d.toLowerCase() === r.district.toLowerCase()) ??
        (r.district || (SAUDI_CITIES[knownCity]?.[0] ?? (f.district ?? ''))),
      street: r.street || f.street,
      lat:    coords.lat,
      lng:    coords.lng,
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
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{p.location}</p>
              {splVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 leading-none">
                  <Icons.shield size={10} />
                  {lang === 'ar' ? 'موثّق · SPL' : 'Verified · SPL'}
                  {splVerified.shortAddress && (
                    <span className="font-mono text-emerald-600 ms-0.5">{splVerified.shortAddress}</span>
                  )}
                </span>
              )}
            </div>

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
                <select className="input w-full bg-white" value={form.district ?? ''} onChange={e => handleDistrictChange(e.target.value)}>
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

            <LeafletPinMap
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

/* ── Unit Detail Panel (slide-in sidebar) ──────────────────────────── */
const AMENITY_ICON: Record<string, string> = {
  wifi: '📶', ac: '❄️', kitchen: '🍳', tv: '📺',
  washer: '🫧', parking: '🅿️', pool: '🏊', balcony: '🌅',
};

function UnitDetailPanel({ unit, onClose, onEdit, lang }: {
  unit: Unit; onClose: () => void; onEdit: (u: Unit) => void; lang: string;
}) {
  const { t } = useLang();
  const p = t.properties;
  const unitImages = PROPERTY_IMAGES[unit.type] ?? PROPERTY_IMAGES.APARTMENT;
  const unitImg = (unit as any).uploadedPhotos?.[0] ?? unitImages[0];
  const displayName = lang === 'ar' ? ((unit as any).nameAr || unit.name) : unit.name;

  const CHANNEL_COLOR: Record<string, string> = {
    'Booking.com': '#003580', 'Airbnb': '#FF385C', 'Gathern': '#00A651', 'Direct': '#F59E0B',
  };

  const STATUS_STYLE: Record<string, string> = {
    ACTIVE:      'bg-emerald-50 text-emerald-700 border border-emerald-200',
    MAINTENANCE: 'bg-amber-50 text-amber-700 border border-amber-200',
    INACTIVE:    'bg-slate-50 text-slate-500 border border-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="bg-white h-full w-full max-w-sm shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        {/* Header image */}
        <div className="relative h-44 flex-shrink-0 bg-slate-200 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unitImg} alt={unit.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 end-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <Icons.x size={15} />
          </button>
          <div className="absolute bottom-3 start-4 end-4">
            <p className="text-white font-extrabold text-base leading-tight truncate">{displayName}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge text-[10px] ${STATUS_STYLE[unit.status]}`}>
                {unit.status === 'ACTIVE' ? p.active : unit.status === 'MAINTENANCE' ? p.maintenance : p.inactive}
              </span>
              <span className="text-white/70 text-xs">{unit.city} · {unit.district}</span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100">
            {[
              { label: lang === 'ar' ? 'السعر الأساسي' : 'Base Rate', value: `SAR ${unit.basePrice}`, dir: 'ltr' },
              { label: lang === 'ar' ? 'الإشغال' : 'Occupancy',       value: `${unit.occupancy}%` },
              { label: lang === 'ar' ? 'الإيراد' : 'Revenue',          value: unit.revenue > 0 ? `SAR ${(unit.revenue / 1000).toFixed(0)}k` : '—', dir: 'ltr' },
            ].map(s => (
              <div key={s.label} className="text-center bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-sm font-extrabold text-slate-900" style={{ direction: (s.dir as any) ?? 'inherit' }}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {/* Unit specs */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{lang === 'ar' ? 'مواصفات الوحدة' : 'Unit Specs'}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: lang === 'ar' ? 'النوع' : 'Type',    value: unit.type },
                  { label: lang === 'ar' ? 'المساحة' : 'Area',  value: `${unit.size} m²` },
                  { label: lang === 'ar' ? 'غرف النوم' : 'Beds', value: unit.beds },
                  { label: lang === 'ar' ? 'دورات المياه' : 'Baths', value: unit.baths },
                  { label: lang === 'ar' ? 'الطابق' : 'Floor',  value: unit.floor || 'Ground' },
                  { label: lang === 'ar' ? 'الحد الأدنى للإقامة' : 'Min Stay', value: `${unit.minStay}N` },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-slate-500">{s.label}</span>
                    <span className="text-xs font-bold text-slate-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            {unit.amenities.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{p.unitAmenities}</p>
                <div className="flex flex-wrap gap-1.5">
                  {unit.amenities.map(a => (
                    <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      <span>{AMENITY_ICON[a] ?? '✓'}</span> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing breakdown */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{p.pricingEngine}</p>
              <div className="bg-slate-50 rounded-2xl divide-y divide-slate-100" style={{ direction: 'ltr' }}>
                {[
                  { label: p.basePrice,        value: `SAR ${unit.basePrice}` },
                  { label: p.weekendSurge,     value: `+${unit.weekendSurge}%` },
                  { label: p.seasonalPeak,     value: `×${unit.seasonalPeak}` },
                  { label: p.cleaningFee,      value: `SAR ${unit.cleaningFee}` },
                  { label: p.securityDeposit,  value: `SAR ${unit.securityDeposit}` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between px-3 py-2 text-xs">
                    <span className="text-slate-500">{r.label}</span>
                    <span className="font-bold text-slate-900">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{p.channels}</p>
              <div className="flex flex-wrap gap-2">
                {unit.channels.length > 0 ? unit.channels.map(ch => (
                  <span key={ch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: CHANNEL_COLOR[ch] ?? '#64748b' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60" />{ch}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400 italic">{lang === 'ar' ? 'غير مرتبط بأي قناة' : 'No channels connected'}</span>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{p.location}</p>
              <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1">
                <div className="flex gap-2"><span className="text-slate-400">{lang === 'ar' ? 'المدينة' : 'City'}:</span><span className="font-semibold text-slate-800">{unit.city}</span></div>
                <div className="flex gap-2"><span className="text-slate-400">{lang === 'ar' ? 'الحي' : 'District'}:</span><span className="font-semibold text-slate-800">{unit.district}</span></div>
                {unit.street && <div className="flex gap-2"><span className="text-slate-400">{lang === 'ar' ? 'الشارع' : 'Street'}:</span><span className="font-semibold text-slate-800">{unit.street}</span></div>}
                <div className="flex gap-2 mt-1 pt-1 border-t border-slate-100" style={{ direction: 'ltr' }}>
                  <Icons.mapPin size={11} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="font-mono text-slate-500">{unit.lat.toFixed(4)}, {unit.lng.toFixed(4)}</span>
                </div>
              </div>
              {/* Small read-only map */}
              <div className="relative h-32 rounded-2xl overflow-hidden border border-slate-200 mt-2">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${unit.lng - 0.02},${unit.lat - 0.015},${unit.lng + 0.02},${unit.lat + 0.015}&layer=mapnik&marker=${unit.lat},${unit.lng}`}
                  title={unit.name} width="100%" height="100%"
                  style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Insurance */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.insurance.title}</p>
              <div className="flex items-center gap-2 bg-violet-50 rounded-xl px-3 py-2.5 border border-violet-100">
                <Icons.shield size={14} className="text-violet-600" />
                <span className="text-xs font-bold text-violet-700">{unit.insuranceProvider}</span>
                <span className="text-xs text-violet-500 ms-auto">{lang === 'ar' ? 'شريك معتمد' : 'Verified Partner'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action footer */}
        <div className="border-t border-slate-100 p-4 flex gap-3 bg-white flex-shrink-0">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center py-2.5 text-sm">
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
          <button onClick={() => onEdit(unit)} className="btn-primary flex-1 justify-center py-2.5 text-sm">
            <Icons.settings size={14} /> {lang === 'ar' ? 'تعديل الوحدة' : 'Edit Unit'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────── */
const PROD_UNITS_KEY = 'rems-prod-units';

function loadProdUnits(): Unit[] {
  try {
    const raw = localStorage.getItem(PROD_UNITS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Unit[];
  } catch { return []; }
}

export default function PropertiesPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t, lang } = useLang();
  const { markDone } = useJourney();
  const { isDemo } = useMode();
  const p = t.properties;

  // Demo: pre-loaded mock data. Production: localStorage (starts empty).
  const [units, setUnits] = useState<Unit[]>(() =>
    isDemo ? (UNITS as Unit[]) : loadProdUnits(),
  );
  const [showModal, setShowModal]   = useState(false);
  const [editUnit, setEditUnit]     = useState<Partial<Unit> | undefined>();
  const [inspBkg,  setInspBkg]      = useState<string | null>(null);
  const [released, setReleased]     = useState<Record<string, boolean>>({});
  const [filter, setFilter]         = useState<'ALL'|'ACTIVE'|'MAINTENANCE'>('ALL');
  const [shareUnit, setShareUnit]   = useState<Unit | null>(null);
  const [detailUnit, setDetailUnit] = useState<Unit | null>(null);
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
  const openEdit = (u: Unit) => { setDetailUnit(null); setEditUnit(u); setShowModal(true); };
  const handleSave = (form: Partial<Unit>) => {
    setUnits(us => {
      let next: Unit[];
      if (form.id) {
        next = us.map(u => u.id === form.id ? { ...u, ...form } as Unit : u);
      } else {
        next = [...us, { ...form, id: 'u' + Date.now(), propertyId: 'p1', propertyName: 'New Property', occupancy: 0, revenue: 0, photos: 0, color: '#3B82F6' } as Unit];
        markDone(2);
      }
      // Persist to localStorage in production mode (demo uses mock data, no persistence needed)
      if (!isDemo) {
        try { localStorage.setItem(PROD_UNITS_KEY, JSON.stringify(next)); } catch { /* quota */ }
      }
      return next;
    });
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

      {/* Empty state — production mode with no units yet */}
      {units.length === 0 && !isDemo && (
        <div className="card p-12 flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center">
            <Icons.properties size={36} className="text-blue-400" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-800">
              {lang === 'ar' ? 'لا توجد وحدات بعد' : 'No units yet'}
            </p>
            <p className="text-sm text-slate-400 mt-2 max-w-sm">
              {lang === 'ar'
                ? 'أضف وحدتك الأولى باستخدام زر "+ إضافة وحدة" أعلاه. يمكنك البحث بالعنوان الوطني لملء التفاصيل تلقائياً.'
                : 'Add your first unit using the "+ Add Unit" button above. Use the National Address lookup to auto-fill location details.'}
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Icons.plus size={15} /> {p.addUnit}
          </button>
        </div>
      )}

      {/* Units grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map(unit => {
          const ins = INSURANCE_RECORDS.find(r => r.bookingId && unit.name.includes(r.unit));
          const insStatus: InsuranceStatus = released[unit.id] ? 'RELEASED' : (ins?.status as InsuranceStatus) ?? 'HELD';
          const unitImages = PROPERTY_IMAGES[unit.type] ?? PROPERTY_IMAGES.APARTMENT;
          const unitImg = (unit as any).uploadedPhotos?.[0] ?? unitImages[units.indexOf(unit) % unitImages.length];
          const displayName = lang === 'ar' ? ((unit as any).nameAr || unit.name) : unit.name;

          return (
            <div key={unit.id} className="card overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setDetailUnit(unit)}>
              {/* Property photo — clicking opens detail panel */}
              <div className="relative h-36 overflow-hidden bg-slate-100 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={unitImg} alt={unit.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                {/* "View details" hover hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Icons.eye size={13} /> {lang === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                  </span>
                </div>
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
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
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
              <div className="px-5 py-3.5 border-b border-slate-50" onClick={e => e.stopPropagation()}>
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
      {detailUnit && (
        <UnitDetailPanel
          unit={detailUnit}
          lang={lang}
          onClose={() => setDetailUnit(null)}
          onEdit={openEdit}
        />
      )}
    </div>
  );
}
