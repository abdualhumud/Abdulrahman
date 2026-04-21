'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/lib/icons';
import { useLang } from '@/lib/language-context';
import { useMode } from '@/lib/mode-context';
import { OWNER } from '@/lib/mock-data';
import { getCurrentAuthUser, updateProfile, logoutUser } from '@/lib/db/auth-service';
import { isSupabaseConfigured } from '@/lib/supabase';

const WA_CONFIG_KEY = 'rems-whatsapp-config';

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  webhookToken: string;
}

function loadWaConfig(): WhatsAppConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(WA_CONFIG_KEY) : null;
    if (raw) return JSON.parse(raw) as WhatsAppConfig;
  } catch { /* ignore */ }
  return { accessToken: '', phoneNumberId: '', webhookToken: '' };
}

function WhatsAppLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const PROD_ACCOUNT_KEY    = 'rems-prod-account';
const ONBOARDING_DONE_KEY = 'rems-onboarding-done';

/** Load production user's registered data from localStorage, fall back to OWNER mock. */
function loadProdProfile() {
  try {
    const raw = typeof window !== 'undefined'
      ? localStorage.getItem(PROD_ACCOUNT_KEY)
      : null;
    if (raw) {
      const saved = JSON.parse(raw) as {
        name?: string; email?: string; username?: string;
        crNumber?: string; vatNumber?: string;
        phone?: string; nationalId?: string;
      };
      return {
        crNumber:   saved.crNumber  ?? '',
        vatNumber:  saved.vatNumber ?? '',
        estNameEn:  OWNER.estNameEn,
        estNameAr:  OWNER.estNameAr,
        ownerName:  saved.name      ?? OWNER.fullName,
        ownerEmail: saved.email     ?? OWNER.email,
        ownerPhone: saved.phone     ?? '+966 50 000 0000',
        bankName:   OWNER.bankName,
        iban:       OWNER.iban,
      };
    }
  } catch { /* ignore */ }
  return {
    crNumber:   OWNER.crNumber,
    vatNumber:  OWNER.vatNumber,
    estNameEn:  OWNER.estNameEn,
    estNameAr:  OWNER.estNameAr,
    ownerName:  OWNER.fullName,
    ownerEmail: OWNER.email,
    ownerPhone: '+966 50 000 0000',
    bankName:   OWNER.bankName,
    iban:       OWNER.iban,
  };
}

/** Persist profile changes back to localStorage for production users. */
function saveProdProfile(p: ReturnType<typeof loadProdProfile>) {
  try {
    const existing = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem(PROD_ACCOUNT_KEY) ?? '{}')
      : {};
    localStorage.setItem(PROD_ACCOUNT_KEY, JSON.stringify({
      ...existing,
      name:      p.ownerName,
      email:     p.ownerEmail,
      phone:     p.ownerPhone,
      crNumber:  p.crNumber,
      vatNumber: p.vatNumber,
    }));
  } catch { /* quota */ }
}

type Tab = 'profile' | 'integrations' | 'users' | 'notifications';

/* ── Integration item ────────────────────────────────────────────── */
interface Integration {
  id: string;
  name: string;
  nameAr: string;
  category: 'insurance' | 'cleaning';
  connected: boolean;
  method: string;
  lastSync?: string;
  color: string;
  bg: string;
  logo: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: 'daman',    name: 'Daman Insurance',    nameAr: 'تأمين ضمان',         category: 'insurance', connected: true,  method: 'API',     lastSync: '2 min ago',  color: 'text-violet-700', bg: 'bg-violet-50',  logo: '🛡️' },
  { id: 'wafi',     name: 'Wafi Insurance',      nameAr: 'تأمين وافي',         category: 'insurance', connected: true,  method: 'Webhook', lastSync: '14 min ago', color: 'text-indigo-700', bg: 'bg-indigo-50',  logo: '🔐' },
  { id: 'cleanpro', name: 'Clean Pro KSA',       nameAr: 'كلين برو السعودية',  category: 'cleaning',  connected: true,  method: 'API',     lastSync: '1 hr ago',   color: 'text-blue-700',   bg: 'bg-blue-50',    logo: '🧹' },
  { id: 'sparkle',  name: 'Sparkle Services',    nameAr: 'سباركل سيرفيسز',     category: 'cleaning',  connected: false, method: 'API',     lastSync: undefined,    color: 'text-emerald-700',bg: 'bg-emerald-50', logo: '✨' },
];

/* ── Team member ─────────────────────────────────────────────────── */
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Cleaning Staff' | 'Read-Only';
  avatar: string;
}

const INITIAL_TEAM: TeamMember[] = [
  { id: 't1', name: 'Abdulrahman Al-Rashidi', email: 'abdualhumud@elm.sa',    role: 'Owner',         avatar: 'A' },
  { id: 't2', name: 'Layla Al-Harbi',          email: 'layla@rems.sa',         role: 'Manager',       avatar: 'L' },
  { id: 't3', name: 'Saleh Al-Qahtani',         email: 'saleh@rems.sa',         role: 'Cleaning Staff',avatar: 'S' },
  { id: 't4', name: 'Nora Al-Shammari',         email: 'nora@rems.sa',          role: 'Cleaning Staff',avatar: 'N' },
];

const ROLE_COLOR: Record<string, string> = {
  'Owner':         'bg-violet-50 text-violet-700 border-violet-200',
  'Manager':       'bg-blue-50 text-blue-700 border-blue-200',
  'Cleaning Staff':'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Read-Only':     'bg-slate-50 text-slate-500 border-slate-200',
};

/* ── Notification event ──────────────────────────────────────────── */
interface NotifPref {
  event: string;
  labelEn: string;
  labelAr: string;
  sms: boolean;
  email: boolean;
  push: boolean;
}

const INITIAL_NOTIFS: NotifPref[] = [
  { event: 'booking',  labelEn: 'New Booking',        labelAr: 'حجز جديد',         sms: true,  email: true,  push: true  },
  { event: 'checkout', labelEn: 'Guest Checkout',      labelAr: 'مغادرة الضيف',     sms: false, email: true,  push: true  },
  { event: 'cleaning', labelEn: 'Cleaning Complete',   labelAr: 'اكتمال التنظيف',   sms: true,  email: false, push: true  },
  { event: 'deposit',  labelEn: 'Deposit Release',     labelAr: 'إطلاق التأمين',    sms: false, email: true,  push: false },
];

/* ── Toggle switch component ─────────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0
        ${on ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
        ${on ? 'start-5' : 'start-0.5'}`} />
    </button>
  );
}

/* ── Main Settings Page ──────────────────────────────────────────── */
export default function SettingsPage() {
  const { t, lang } = useLang();
  const { isDemo, isStaging } = useMode();
  const s = (t as any).settings;

  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Profile state — load real registration data for production users
  const [profile, setProfile] = useState(() =>
    (isDemo || isStaging) ? {
      crNumber:   OWNER.crNumber,
      vatNumber:  OWNER.vatNumber,
      estNameEn:  OWNER.estNameEn,
      estNameAr:  OWNER.estNameAr,
      ownerName:  OWNER.fullName,
      ownerEmail: OWNER.email,
      ownerPhone: '+966 50 000 0000',
      bankName:   OWNER.bankName,
      iban:       OWNER.iban,
    } : loadProdProfile()
  );
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [crValidating, setCrValidating] = useState(false);
  const [crValid, setCrValid] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // WhatsApp gateway state
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>(loadWaConfig);
  const [waSaved, setWaSaved] = useState(false);
  const [waShowTokens, setWaShowTokens] = useState(false);
  const waConnected = !!(waConfig.accessToken && waConfig.phoneNumberId && waConfig.webhookToken);

  // On mount: pull profile from Supabase when configured (production only)
  useEffect(() => {
    if (isDemo || isStaging || !isSupabaseConfigured()) return;
    getCurrentAuthUser().then(user => {
      if (!user) return;
      setSupabaseUserId(user.id);
      setProfile(prev => ({
        ...prev,
        ownerName:  user.fullName  || prev.ownerName,
        ownerEmail: user.email     || prev.ownerEmail,
        estNameEn:  user.companyName || prev.estNameEn,
      }));
    });
  }, [isDemo, isStaging]);

  const handleSaveProfile = async () => {
    setCrValidating(true);
    await new Promise(r => setTimeout(r, 1200));
    setCrValidating(false);
    setCrValid(true);

    if (!isDemo && !isStaging) {
      // Persist to Supabase when configured
      if (isSupabaseConfigured() && supabaseUserId) {
        await updateProfile(supabaseUserId, {
          full_name:    profile.ownerName,
          company_name: profile.estNameEn,
        });
      }
      // Always mirror to localStorage as offline fallback
      saveProdProfile(profile);
    }

    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const saveWaConfig = () => {
    try { localStorage.setItem(WA_CONFIG_KEY, JSON.stringify(waConfig)); } catch { /* quota */ }
    setWaSaved(true);
    setTimeout(() => setWaSaved(false), 2500);
  };

  const clearWaConfig = () => {
    setWaConfig({ accessToken: '', phoneNumberId: '', webhookToken: '' });
    try { localStorage.removeItem(WA_CONFIG_KEY); } catch { /* ignore */ }
  };

  /** Sign Out (production only). Uses Supabase when configured. */
  const handleSignOut = async () => {
    setSigningOut(true);
    await new Promise(r => setTimeout(r, 400));
    if (isSupabaseConfigured()) {
      await logoutUser();
    }
    localStorage.removeItem(ONBOARDING_DONE_KEY);
    window.location.reload();
  };

  // Integrations state
  const [integrations, setIntegrations] = useState(INITIAL_INTEGRATIONS);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const toggleIntegration = async (id: string) => {
    setConnectingId(id);
    await new Promise(r => setTimeout(r, 1400));
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected, lastSync: i.connected ? undefined : 'just now' } : i));
    setConnectingId(null);
  };

  // Users state
  const [team, setTeam] = useState(INITIAL_TEAM);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Manager' as TeamMember['role'] });

  const addMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    setTeam(prev => [...prev, { ...newMember, id: 't' + Date.now(), avatar: newMember.name.charAt(0).toUpperCase() }]);
    setNewMember({ name: '', email: '', role: 'Manager' });
    setShowAddMember(false);
  };

  const removeMember = (id: string) => {
    setTeam(prev => prev.filter(m => m.id !== id));
  };

  const changeRole = (id: string, role: TeamMember['role']) => {
    setTeam(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  };

  // Notifications state
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const [notifSaved, setNotifSaved] = useState(false);

  const toggleNotif = (event: string, channel: 'sms' | 'email' | 'push') => {
    setNotifs(prev => prev.map(n => n.event === event ? { ...n, [channel]: !n[channel] } : n));
  };

  const saveNotifs = async () => {
    await new Promise(r => setTimeout(r, 800));
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  const TABS: { id: Tab; label: string; labelAr: string; icon: React.ReactNode }[] = [
    { id: 'profile',       label: 'Profile',             labelAr: 'الملف الشخصي',           icon: <Icons.user size={16} /> },
    { id: 'integrations',  label: 'Integrations',        labelAr: 'التكاملات',              icon: <Icons.plug size={16} /> },
    { id: 'users',         label: 'Users & Permissions', labelAr: 'المستخدمون والصلاحيات', icon: <Icons.users size={16} /> },
    { id: 'notifications', label: 'Notifications',       labelAr: 'الإشعارات',              icon: <Icons.bell size={16} /> },
  ];

  return (
    <div className="p-6 max-w-4xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {lang === 'ar' ? s.title : 'Settings'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {lang === 'ar' ? s.subtitle : 'Account, integrations & preferences'}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
              ${activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.icon}
            <span>{lang === 'ar' ? tab.labelAr : tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Profile Tab ──────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-5">
          {/* Commercial Details */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                <Icons.shield size={18} className="text-violet-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{lang === 'ar' ? s.profileTitle : 'Establishment Profile'}</h3>
                <p className="text-xs text-slate-400">{lang === 'ar' ? s.profileDesc : 'Commercial registration & tax details'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* CR Number */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.crNumber : 'Commercial Register (CR)'}
                </label>
                <div className="relative">
                  <input
                    value={profile.crNumber}
                    onChange={e => setProfile(p => ({ ...p, crNumber: e.target.value }))}
                    className="input w-full pe-10"
                    placeholder={lang === 'ar' ? s.crPlaceholder : '1010XXXXXX'}
                    style={{ direction: 'ltr' }}
                  />
                  <div className="absolute end-3 top-1/2 -translate-y-1/2">
                    {crValidating ? (
                      <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin block" />
                    ) : crValid ? (
                      <Icons.check size={14} className="text-emerald-500" />
                    ) : null}
                  </div>
                </div>
              </div>

              {/* VAT Number */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.vatNumber : 'VAT Registration Number'}
                </label>
                <input
                  value={profile.vatNumber}
                  onChange={e => setProfile(p => ({ ...p, vatNumber: e.target.value }))}
                  className="input w-full"
                  placeholder={lang === 'ar' ? s.vatPlaceholder : '3XXXXXXXXXXXXXXXXX3'}
                  style={{ direction: 'ltr' }}
                />
              </div>

              {/* Establishment names */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.estName : 'Establishment Name (EN)'}
                </label>
                <input
                  value={profile.estNameEn}
                  onChange={e => setProfile(p => ({ ...p, estNameEn: e.target.value }))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.estNameAr : 'Establishment Name (AR)'}
                </label>
                <input
                  value={profile.estNameAr}
                  onChange={e => setProfile(p => ({ ...p, estNameAr: e.target.value }))}
                  className="input w-full"
                  dir="rtl"
                />
              </div>

              {/* Owner Name */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.ownerName : 'Owner Full Name'}
                </label>
                <input
                  value={profile.ownerName}
                  onChange={e => setProfile(p => ({ ...p, ownerName: e.target.value }))}
                  className="input w-full"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.ownerEmail : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={profile.ownerEmail}
                  onChange={e => setProfile(p => ({ ...p, ownerEmail: e.target.value }))}
                  className="input w-full"
                  style={{ direction: 'ltr' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.ownerPhone : 'Mobile Number'}
                </label>
                <input
                  value={profile.ownerPhone}
                  onChange={e => setProfile(p => ({ ...p, ownerPhone: e.target.value }))}
                  className="input w-full"
                  style={{ direction: 'ltr' }}
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.bankName : 'Bank Name'}
                </label>
                <input
                  value={profile.bankName}
                  onChange={e => setProfile(p => ({ ...p, bankName: e.target.value }))}
                  className="input w-full"
                />
              </div>

              {/* IBAN */}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? s.bankIban : 'IBAN'}
                </label>
                <input
                  value={profile.iban}
                  onChange={e => setProfile(p => ({ ...p, iban: e.target.value }))}
                  className="input w-full font-mono"
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  style={{ direction: 'ltr' }}
                />
              </div>
            </div>

            {profileSaved && (
              <div className="mt-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-semibold">
                <Icons.check size={15} />
                {lang === 'ar' ? 'تم حفظ الملف الشخصي بنجاح' : 'Profile saved successfully'}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              {/* Sign Out — Production only */}
              {!isDemo && !isStaging && (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-60"
                >
                  {signingOut
                    ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <Icons.logOut size={15} />
                  }
                  {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                </button>
              )}
              <button onClick={handleSaveProfile} className="btn-primary px-6 ms-auto">
                <Icons.check size={15} />
                {lang === 'ar' ? s.saveProfile : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Integrations Tab ─────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <div className="space-y-5">
          {/* Insurance */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icons.shield size={16} className="text-violet-600" />
              <h3 className="font-bold text-slate-900">
                {lang === 'ar' ? 'تأمين الوديعة' : 'Deposit Insurance'}
              </h3>
            </div>
            <div className="space-y-3">
              {integrations.filter(i => i.category === 'insurance').map(integ => (
                <div key={integ.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${integ.connected ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-slate-50'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${integ.bg}`}>
                    {integ.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${integ.color}`}>{lang === 'ar' ? integ.nameAr : integ.name}</p>
                    {integ.connected ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        <span className="text-xs text-slate-400">{integ.method} · {lang === 'ar' ? 'آخر مزامنة' : 'Last sync'}: {integ.lastSync}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">{lang === 'ar' ? 'غير متصل' : 'Not connected'}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleIntegration(integ.id)}
                    disabled={connectingId === integ.id}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all disabled:opacity-60
                      ${integ.connected
                        ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                        : 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {connectingId === integ.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : integ.connected ? (
                      <Icons.x size={13} />
                    ) : (
                      <Icons.plug size={13} />
                    )}
                    {connectingId === integ.id
                      ? (lang === 'ar' ? 'جارٍ…' : 'Working…')
                      : integ.connected
                        ? (lang === 'ar' ? s.intDisconnect : 'Disconnect')
                        : (lang === 'ar' ? s.intConnect : 'Connect')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cleaning Providers */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icons.cleaning size={16} className="text-blue-600" />
              <h3 className="font-bold text-slate-900">
                {lang === 'ar' ? 'مزودو التنظيف' : 'Cleaning Providers Hub'}
              </h3>
            </div>
            <div className="space-y-3">
              {integrations.filter(i => i.category === 'cleaning').map(integ => (
                <div key={integ.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${integ.connected ? 'border-blue-100 bg-blue-50/30' : 'border-slate-100 bg-slate-50'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${integ.bg}`}>
                    {integ.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${integ.color}`}>{lang === 'ar' ? integ.nameAr : integ.name}</p>
                    {integ.connected ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                        <span className="text-xs text-slate-400">{integ.method} · {lang === 'ar' ? 'آخر مزامنة' : 'Last sync'}: {integ.lastSync}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">{lang === 'ar' ? 'غير متصل' : 'Not connected'}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleIntegration(integ.id)}
                    disabled={connectingId === integ.id}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all disabled:opacity-60
                      ${integ.connected
                        ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                        : 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {connectingId === integ.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : integ.connected ? (
                      <Icons.x size={13} />
                    ) : (
                      <Icons.plug size={13} />
                    )}
                    {connectingId === integ.id
                      ? (lang === 'ar' ? 'جارٍ…' : 'Working…')
                      : integ.connected
                        ? (lang === 'ar' ? s.intDisconnect : 'Disconnect')
                        : (lang === 'ar' ? s.intConnect : 'Connect')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Business API Gateway */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#dcfce7] flex items-center justify-center flex-shrink-0">
                  <WhatsAppLogo size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {lang === 'ar' ? 'بوابة واتساب للأعمال' : 'WhatsApp Business API'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'ar' ? 'Meta Business API — إشعارات الضيوف وتأكيد الحجز' : 'Meta Business API — guest notifications & booking confirmations'}
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                ${waConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${waConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                {waConnected
                  ? (lang === 'ar' ? 'متصل' : 'Connected')
                  : (lang === 'ar' ? 'غير مُفعَّل' : 'Not configured')}
              </span>
            </div>

            {/* Info notice when not connected */}
            {!waConnected && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 text-xs text-amber-800">
                {lang === 'ar'
                  ? 'واتساب في صندوق الوارد هو واجهة مرئية فقط. أضف مفاتيح Meta Business API أدناه لتفعيل الإرسال الفعلي.'
                  : 'WhatsApp in the Inbox is currently a UI preview. Add your Meta Business API credentials below to activate real messaging.'}
              </div>
            )}

            <div className="space-y-4">
              {/* Access Token */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">
                  {lang === 'ar' ? 'رمز الوصول الدائم (Access Token)' : 'Permanent Access Token'}
                </label>
                <div className="relative">
                  <input
                    type={waShowTokens ? 'text' : 'password'}
                    value={waConfig.accessToken}
                    onChange={e => setWaConfig(c => ({ ...c, accessToken: e.target.value }))}
                    className="input w-full pe-10 font-mono text-xs"
                    placeholder="EAAxxxxxx..."
                    style={{ direction: 'ltr' }}
                  />
                  <button
                    onClick={() => setWaShowTokens(v => !v)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {waShowTokens
                      ? <Icons.eye size={14} />
                      : <Icons.eyeOff size={14} />}
                  </button>
                </div>
              </div>

              {/* Phone Number ID + Webhook Token row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">
                    {lang === 'ar' ? 'معرّف رقم الهاتف (Phone Number ID)' : 'Phone Number ID'}
                  </label>
                  <input
                    type={waShowTokens ? 'text' : 'password'}
                    value={waConfig.phoneNumberId}
                    onChange={e => setWaConfig(c => ({ ...c, phoneNumberId: e.target.value }))}
                    className="input w-full font-mono text-xs"
                    placeholder="1234567890"
                    style={{ direction: 'ltr' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">
                    {lang === 'ar' ? 'رمز التحقق من الـ Webhook' : 'Webhook Verify Token'}
                  </label>
                  <input
                    type={waShowTokens ? 'text' : 'password'}
                    value={waConfig.webhookToken}
                    onChange={e => setWaConfig(c => ({ ...c, webhookToken: e.target.value }))}
                    className="input w-full font-mono text-xs"
                    placeholder="my_secret_token"
                    style={{ direction: 'ltr' }}
                  />
                </div>
              </div>

              {/* Webhook URL hint */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {lang === 'ar' ? 'رابط الـ Webhook: ' : 'Webhook URL: '}
                </span>
                <span className="font-mono" style={{ direction: 'ltr' }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/webhooks/whatsapp
                </span>
              </div>

              {waSaved && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-semibold">
                  <Icons.check size={15} />
                  {lang === 'ar' ? 'تم حفظ إعدادات واتساب بنجاح' : 'WhatsApp credentials saved successfully'}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={saveWaConfig} className="btn-primary px-6 text-sm">
                  <Icons.check size={14} />
                  {lang === 'ar' ? 'حفظ الإعدادات' : 'Save Credentials'}
                </button>
                {waConnected && (
                  <button
                    onClick={clearWaConfig}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all"
                  >
                    <Icons.x size={14} />
                    {lang === 'ar' ? 'إلغاء الاتصال' : 'Disconnect'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Users & Permissions Tab ──────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Icons.users size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{lang === 'ar' ? s.usersTitle : 'Team Members'}</h3>
                <p className="text-xs text-slate-400">{lang === 'ar' ? s.usersDesc : 'Manage staff access levels'}</p>
              </div>
            </div>
            <button onClick={() => setShowAddMember(v => !v)} className="btn-primary text-xs px-4">
              <Icons.plus size={13} /> {lang === 'ar' ? s.addMember : '+ Add Member'}
            </button>
          </div>

          {/* Add member form */}
          {showAddMember && (
            <div className="bg-blue-50 rounded-2xl p-4 mb-5 border border-blue-100 space-y-3">
              <p className="text-sm font-bold text-blue-700">{lang === 'ar' ? 'إضافة عضو جديد' : 'New Team Member'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  value={newMember.name}
                  onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
                  className="input" placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full name'}
                />
                <input
                  value={newMember.email}
                  onChange={e => setNewMember(m => ({ ...m, email: e.target.value }))}
                  className="input" placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  style={{ direction: 'ltr' }}
                />
                <select
                  value={newMember.role}
                  onChange={e => setNewMember(m => ({ ...m, role: e.target.value as TeamMember['role'] }))}
                  className="input bg-white"
                >
                  {(['Manager','Cleaning Staff','Read-Only'] as const).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addMember} className="btn-primary text-xs px-4">
                  <Icons.check size={13} /> {lang === 'ar' ? 'إضافة' : 'Add'}
                </button>
                <button onClick={() => setShowAddMember(false)} className="btn-ghost text-xs px-4">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Team table */}
          <div className="space-y-2">
            {team.map(member => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#3B82F6,#6366F1)' }}
                >
                  {member.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-none">{member.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5" style={{ direction: 'ltr' }}>{member.email}</p>
                </div>
                <select
                  value={member.role}
                  onChange={e => changeRole(member.id, e.target.value as TeamMember['role'])}
                  disabled={member.role === 'Owner'}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors disabled:cursor-default
                    ${ROLE_COLOR[member.role] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}
                >
                  {(['Owner','Manager','Cleaning Staff','Read-Only'] as const).map(r => (
                    <option key={r} value={r} disabled={r === 'Owner'}>{r}</option>
                  ))}
                </select>
                {member.role !== 'Owner' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Icons.trash size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Notifications Tab ────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Icons.bell size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{lang === 'ar' ? s.notifTitle : 'Notification Preferences'}</h3>
              <p className="text-xs text-slate-400">{lang === 'ar' ? s.notifDesc : 'Choose how you receive alerts'}</p>
            </div>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-2 mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {lang === 'ar' ? 'الحدث' : 'Event'}
            </span>
            {(['sms','email','push'] as const).map(ch => (
              <span key={ch} className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-14">
                {ch === 'sms' ? (lang === 'ar' ? 'SMS' : 'SMS') : ch === 'email' ? (lang === 'ar' ? 'بريد' : 'Email') : (lang === 'ar' ? 'إشعار' : 'Push')}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.event} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3.5 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{lang === 'ar' ? n.labelAr : n.labelEn}</p>
                </div>
                {(['sms','email','push'] as const).map(ch => (
                  <div key={ch} className="flex justify-center w-14">
                    <Toggle on={n[ch]} onChange={() => toggleNotif(n.event, ch)} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {notifSaved && (
            <div className="mt-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm font-semibold">
              <Icons.check size={15} />
              {lang === 'ar' ? 'تم حفظ تفضيلات الإشعارات' : 'Notification preferences saved'}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button onClick={saveNotifs} className="btn-primary px-6">
              <Icons.check size={15} />
              {lang === 'ar' ? s.saveNotif : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
