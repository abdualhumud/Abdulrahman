'use client';

import { useState } from 'react';
import { useLang } from '@/lib/language-context';
import { Icons } from '@/lib/icons';
import {
  SHIPMENTS, SHIPMENT_NOTIFICATIONS,
  type Shipment, type ShipmentStatus, type ShipmentAddress,
} from '@/lib/mock-data';

// ── Status metadata ────────────────────────────────────────────
const STATUS_ORDER: ShipmentStatus[] = [
  'Created','Confirmed','AwaitingPickup','PickedUp',
  'ArrivedAtSortingFacility','DepartedSortingFacility','InTransit',
  'ArrivedAtDestinationCity','OutForDelivery','Delivered','DeliveryFailed',
];

const STATUS_COLOR: Record<ShipmentStatus, string> = {
  Created:                  'bg-slate-100 text-slate-600',
  Confirmed:                'bg-blue-100 text-blue-700',
  AwaitingPickup:           'bg-amber-100 text-amber-700',
  PickedUp:                 'bg-amber-100 text-amber-700',
  ArrivedAtSortingFacility: 'bg-indigo-100 text-indigo-700',
  DepartedSortingFacility:  'bg-indigo-100 text-indigo-700',
  InTransit:                'bg-purple-100 text-purple-700',
  ArrivedAtDestinationCity: 'bg-purple-100 text-purple-700',
  OutForDelivery:           'bg-orange-100 text-orange-700',
  Delivered:                'bg-emerald-100 text-emerald-700',
  DeliveryFailed:           'bg-red-100 text-red-700',
};

const STATUS_DOT: Record<ShipmentStatus, string> = {
  Created:                  'bg-slate-400',
  Confirmed:                'bg-blue-500',
  AwaitingPickup:           'bg-amber-500',
  PickedUp:                 'bg-amber-500',
  ArrivedAtSortingFacility: 'bg-indigo-500',
  DepartedSortingFacility:  'bg-indigo-500',
  InTransit:                'bg-purple-500',
  ArrivedAtDestinationCity: 'bg-purple-500',
  OutForDelivery:           'bg-orange-500',
  Delivered:                'bg-emerald-500',
  DeliveryFailed:           'bg-red-500',
};

// ── Add Shipment form defaults ─────────────────────────────────
const EMPTY_FORM = {
  shipmentNumber: '',
  consigneeFirstName: '', consigneeMiddleName: '', consigneeLastName: '',
  consigneeCountryCode: '+966', consigneePhone: '',
  consigneeIdentityNumber: '',
  senderFirstName: 'شركة', senderMiddleName: '', senderLastName: 'الشحن السريع',
  senderCountryCode: '+966', senderPhone: '509876543',
  expectedDeliveryDate: '', timeWindowFrom: '', timeWindowTo: '',
  preferredDeliveryTime: 'Afternoon' as 'Morning' | 'Afternoon' | 'Evening',
  status: 'Created' as ShipmentStatus,
};

// ── Timeline step component ────────────────────────────────────
function TimelineStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full flex-shrink-0 border-2 transition-all
        ${done   ? 'bg-emerald-500 border-emerald-500'
        : active ? 'bg-blue-500 border-blue-500 ring-2 ring-blue-200'
        :          'bg-white border-slate-300'}`}
      />
      <span className={`text-xs ${done ? 'text-emerald-700 font-semibold' : active ? 'text-blue-700 font-semibold' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

// ── Address card ───────────────────────────────────────────────
function AddressCard({ addr, t }: { addr: ShipmentAddress; t: Record<string, string> }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-800">{addr.addressName}</span>
        <div className="flex gap-1.5">
          {addr.isNationalAddress && (
            <span className="badge bg-emerald-100 text-emerald-700">{t.isNational}</span>
          )}
          {addr.isDefaultAddress && (
            <span className="badge bg-blue-100 text-blue-700">{t.isDefault}</span>
          )}
        </div>
      </div>
      <p className="text-slate-600 leading-relaxed">
        {addr.street}، {addr.buildingNo}، {addr.district}، {addr.city}
      </p>
      <div className="flex gap-3 text-slate-500 text-xs">
        <span>{t.shortAddr}: <span className="font-mono font-bold text-slate-700">{addr.shortAddress}</span></span>
        <span>Postal: {addr.postalCode}</span>
      </div>
      {addr.details && <p className="text-slate-400 text-xs">{addr.details}</p>}
      <p className="text-slate-400 text-xs font-mono">
        {addr.location.latitude.toFixed(4)}, {addr.location.longitude.toFixed(4)}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function ShipmentsPage() {
  const { t } = useLang();
  const ts = (t as any).shipments as Record<string, string>;

  const [shipments, setShipments] = useState<Shipment[]>(SHIPMENTS);
  const [notifications, setNotifications] = useState(SHIPMENT_NOTIFICATIONS);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'All'>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [updateStatus, setUpdateStatus] = useState<ShipmentStatus | ''>('');
  const [updateToast, setUpdateToast] = useState(false);
  const [addToast, setAddToast] = useState(false);

  // ── KPI counts ───────────────────────────────────────────────
  const totalCount    = shipments.length;
  const deliveredCount = shipments.filter(s => s.status === 'Delivered').length;
  const inTransitCount = shipments.filter(s =>
    ['InTransit','ArrivedAtDestinationCity','OutForDelivery','PickedUp','ArrivedAtSortingFacility','DepartedSortingFacility'].includes(s.status)
  ).length;
  const failedCount   = shipments.filter(s => s.status === 'DeliveryFailed').length;
  const unreadCount   = notifications.filter(n => !n.isRead).length;

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = shipments.filter(s => {
    const q = search.toLowerCase();
    const name = `${s.consigneeName.firstName} ${s.consigneeName.lastName}`.toLowerCase();
    const matchQ = !q || s.shipmentNumber.toLowerCase().includes(q) || name.includes(q);
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchQ && matchStatus;
  });

  // ── Update status ─────────────────────────────────────────────
  const handleUpdateStatus = () => {
    if (!selected || !updateStatus) return;
    setShipments(prev => prev.map(s =>
      s.shipmentNumber === selected.shipmentNumber ? { ...s, status: updateStatus as ShipmentStatus } : s
    ));
    setSelected(prev => prev ? { ...prev, status: updateStatus as ShipmentStatus } : prev);
    setUpdateToast(true);
    setTimeout(() => setUpdateToast(false), 3000);
  };

  // ── Add shipment ──────────────────────────────────────────────
  const handleAddShipment = () => {
    const newShipment: Shipment = {
      shipmentNumber: form.shipmentNumber,
      consigneePhoneNumber: { countryCode: form.consigneeCountryCode, number: form.consigneePhone },
      consigneeName: { firstName: form.consigneeFirstName, middleName: form.consigneeMiddleName || null, lastName: form.consigneeLastName },
      consigneeIdentityNumber: form.consigneeIdentityNumber,
      senderPhoneNumber: { countryCode: form.senderCountryCode, number: form.senderPhone },
      senderName: { firstName: form.senderFirstName, middleName: form.senderMiddleName || null, lastName: form.senderLastName },
      expectedDeliveryDate: form.expectedDeliveryDate ? new Date(form.expectedDeliveryDate).toISOString() : '',
      timeWindowFrom: form.timeWindowFrom ? new Date(form.timeWindowFrom).toISOString() : '',
      timeWindowTo: form.timeWindowTo ? new Date(form.timeWindowTo).toISOString() : '',
      preferredDeliveryTime: form.preferredDeliveryTime,
      status: form.status,
      address: null,
      createdAt: new Date().toISOString(),
    };
    setShipments(prev => [newShipment, ...prev]);
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setAddToast(true);
    setTimeout(() => setAddToast(false), 3000);
  };

  // ── Mark notification read ────────────────────────────────────
  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const consigneeName = (s: Shipment) =>
    [s.consigneeName.firstName, s.consigneeName.middleName, s.consigneeName.lastName].filter(Boolean).join(' ');

  const timeLabel = (key: string) => (ts as any)[`time_${key}`] ?? key;
  const statusLabel = (key: string) => (ts as any)[`status_${key}`] ?? key;

  const currentStepIndex = selected
    ? STATUS_ORDER.indexOf(selected.status)
    : -1;

  return (
    <div className="p-6 space-y-5">
      {/* ── Toast notifications ── */}
      {updateToast && (
        <div className="fixed top-4 end-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <Icons.check size={16} /> {ts.updateSuccess}
        </div>
      )}
      {addToast && (
        <div className="fixed top-4 end-4 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <Icons.check size={16} /> Shipment added & consignee notified via Tawakkalna
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <Icons.truck size={18} className="text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{ts.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{ts.subtitle}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Rased badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600">Rased API</span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Icons.plus size={15} /> {ts.addShipment}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: ts.total,     value: totalCount,     icon: Icons.truck,      color: 'text-slate-600',  bg: 'bg-slate-100' },
          { label: ts.delivered, value: deliveredCount,  icon: Icons.check,      color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: ts.inTransit, value: inTransitCount,  icon: Icons.arrowRight, color: 'text-purple-600',  bg: 'bg-purple-100' },
          { label: ts.failed,    value: failedCount,     icon: Icons.alertCircle,color: 'text-red-600',     bg: 'bg-red-100' },
        ].map(kpi => (
          <div key={kpi.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
              <kpi.icon size={18} className={kpi.color} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content: table + right panel ── */}
      <div className="flex gap-4 min-h-0">
        {/* Left: Shipments table */}
        <div className="flex-1 min-w-0 card overflow-hidden flex flex-col">
          {/* Search + filter bar */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Icons.search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={ts.searchPlaceholder}
                className="w-full ps-9 pe-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ShipmentStatus | 'All')}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700"
            >
              <option value="All">{(t as any).common?.all ?? 'All'}</option>
              {STATUS_ORDER.map(s => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1">
            <table className="data-table w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th>{ts.shipmentNo}</th>
                  <th>{ts.consignee}</th>
                  <th>{ts.status}</th>
                  <th>{ts.expectedDate}</th>
                  <th>{ts.address}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                      {(t as any).common?.noResults ?? 'No results found'}
                    </td>
                  </tr>
                ) : filtered.map(s => (
                  <tr
                    key={s.shipmentNumber}
                    onClick={() => { setSelected(s); setUpdateStatus(''); }}
                    className={`cursor-pointer transition-colors ${selected?.shipmentNumber === s.shipmentNumber ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <td>
                      <span className="font-mono text-xs font-bold text-slate-700">{s.shipmentNumber}</span>
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{consigneeName(s)}</p>
                        <p className="text-xs text-slate-400">{s.consigneePhoneNumber.countryCode} {s.consigneePhoneNumber.number}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[s.status]}`} />
                        <span className={`badge ${STATUS_COLOR[s.status]}`}>{statusLabel(s.status)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">
                        {s.expectedDeliveryDate
                          ? new Date(s.expectedDeliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </span>
                    </td>
                    <td>
                      {s.address
                        ? <span className="font-mono text-xs text-slate-600 font-bold">{s.address.shortAddress}</span>
                        : <span className="text-xs text-amber-500 font-semibold">{ts.noAddress}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel: shipment detail or webhook notifications */}
        <div className="w-[340px] flex-shrink-0 flex flex-col gap-4">
          {selected ? (
            /* ── Shipment Detail Panel ── */
            <div className="card flex flex-col overflow-hidden" style={{ maxHeight: '75vh' }}>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="font-mono text-xs text-slate-500">{selected.shipmentNumber}</p>
                  <p className="font-extrabold text-slate-900">{consigneeName(selected)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                  <Icons.x size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Status badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLOR[selected.status]}`}>
                  <div className={`w-2 h-2 rounded-full ${STATUS_DOT[selected.status]}`} />
                  {statusLabel(selected.status)}
                </div>

                {/* Status timeline */}
                <div className="space-y-1.5">
                  {STATUS_ORDER.filter(s => s !== 'DeliveryFailed').map((step, i) => (
                    <TimelineStep
                      key={step}
                      label={statusLabel(step)}
                      done={i < currentStepIndex && selected.status !== 'DeliveryFailed'}
                      active={step === selected.status}
                    />
                  ))}
                  {selected.status === 'DeliveryFailed' && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-500" />
                      <span className="text-xs text-red-600 font-bold">{statusLabel('DeliveryFailed')}</span>
                    </div>
                  )}
                </div>

                {/* Consignee */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ts.consigneeInfo}</p>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{ts.phone}</span>
                      <span className="font-mono font-semibold text-slate-800 text-xs">
                        {selected.consigneePhoneNumber.countryCode} {selected.consigneePhoneNumber.number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{ts.nationalId}</span>
                      <span className="font-mono font-semibold text-slate-800 text-xs">{selected.consigneeIdentityNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{ts.preferredTime}</span>
                      <span className="font-semibold text-slate-800 text-xs">{timeLabel(selected.preferredDeliveryTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ts.address}</p>
                  {selected.address
                    ? <AddressCard addr={selected.address} t={ts} />
                    : (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
                        <p className="font-bold mb-1">{ts.noAddress}</p>
                        <p>{ts.addressPending}</p>
                      </div>
                    )}
                </div>

                {/* Delivery window */}
                {selected.timeWindowFrom && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ts.deliveryWindow}</p>
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono">
                      {new Date(selected.timeWindowFrom).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {' → '}
                      {new Date(selected.timeWindowTo).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}

                {/* Update status */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ts.updateStatus}</p>
                  <select
                    value={updateStatus}
                    onChange={e => setUpdateStatus(e.target.value as ShipmentStatus)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">{ts.selectStatus}</option>
                    {STATUS_ORDER.map(s => (
                      <option key={s} value={s}>{statusLabel(s)}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={!updateStatus}
                    className="w-full py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {ts.updateStatus}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Webhook Notifications Panel (shown when nothing selected) ── */
            <div className="card overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
              <div className="p-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{ts.webhookTitle}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ts.webhookSubtitle}</p>
                  </div>
                  {unreadCount > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {/* Endpoint label */}
                <div className="mt-3 bg-slate-900 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">POST</span>
                  <span className="text-slate-300 font-mono text-[11px]">/address-changed</span>
                  <span className="ms-auto text-[10px] text-slate-500">HTTPS · apiKey auth</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">{ts.noWebhooks}</div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-4 transition-colors ${n.isRead ? 'bg-white' : 'bg-blue-50/60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                          <span className="font-mono text-[11px] font-bold text-slate-700">{n.shipmentNumber}</span>
                          <span className="ms-auto text-[10px] text-slate-400 flex-shrink-0">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-mono text-slate-400">{ts.webhookFrom}</span>
                          <span className="badge bg-emerald-100 text-emerald-700">{ts.webhookOk}</span>
                        </div>
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="mt-2 text-[11px] text-blue-600 font-semibold hover:underline"
                      >
                        {ts.webhookRead}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Webhook panel is always shown below detail panel if something is selected */}
          {selected && (
            <div className="card overflow-hidden flex flex-col" style={{ maxHeight: '30vh' }}>
              <div className="p-3 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
                <p className="font-bold text-slate-800 text-xs">{ts.webhookTitle}</p>
                {unreadCount > 0 && (
                  <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {notifications.map(n => (
                  <div key={n.id} className={`px-3 py-2.5 flex items-center gap-2 ${n.isRead ? '' : 'bg-blue-50/60'}`}>
                    {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] font-bold text-slate-700 truncate">{n.shipmentNumber}</p>
                      <p className="text-[10px] text-slate-400">{n.time}</p>
                    </div>
                    <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">{ts.webhookOk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Shipment Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Icons.truck size={16} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">{ts.addTitle}</p>
                  <p className="text-xs text-slate-500">Rased — AddShipment API</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.x size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Shipment number */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{ts.shipmentNo} *</label>
                <input
                  value={form.shipmentNumber}
                  onChange={e => setForm(f => ({ ...f, shipmentNumber: e.target.value }))}
                  placeholder="SHP-2026-XXXXXX"
                  className="w-full font-mono text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Consignee */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ts.consigneeInfo}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'consigneeFirstName', label: ts.firstName, placeholder: 'أحمد' },
                    { key: 'consigneeMiddleName', label: ts.middleName, placeholder: 'محمد' },
                    { key: 'consigneeLastName', label: ts.lastName, placeholder: 'العلي' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
                      <input
                        value={(form as any)[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{ts.countryCode} *</label>
                    <input
                      value={form.consigneeCountryCode}
                      onChange={e => setForm(f => ({ ...f, consigneeCountryCode: e.target.value }))}
                      className="w-full font-mono text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">{ts.phone} *</label>
                    <input
                      value={form.consigneePhone}
                      onChange={e => setForm(f => ({ ...f, consigneePhone: e.target.value }))}
                      placeholder="5XXXXXXXX"
                      className="w-full font-mono text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{ts.nationalId}</label>
                  <input
                    value={form.consigneeIdentityNumber}
                    onChange={e => setForm(f => ({ ...f, consigneeIdentityNumber: e.target.value }))}
                    placeholder="1XXXXXXXXX"
                    className="w-full font-mono text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {/* Delivery schedule */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{ts.dateInfo}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'expectedDeliveryDate', label: ts.expectedDate },
                    { key: 'timeWindowFrom',        label: 'From' },
                    { key: 'timeWindowTo',          label: 'To' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
                      <input
                        type="datetime-local"
                        value={(form as any)[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{ts.preferredTime}</label>
                    <select
                      value={form.preferredDeliveryTime}
                      onChange={e => setForm(f => ({ ...f, preferredDeliveryTime: e.target.value as typeof f.preferredDeliveryTime }))}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      {(['Morning','Afternoon','Evening'] as const).map(v => (
                        <option key={v} value={v}>{timeLabel(v)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{ts.status} *</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as ShipmentStatus }))}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      {STATUS_ORDER.map(s => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* API info box */}
              <div className="bg-slate-900 rounded-xl p-3 text-xs font-mono space-y-1">
                <p className="text-emerald-400 font-bold text-[10px] mb-2">POST /ShipmentsCommands/AddShipment</p>
                <p className="text-slate-400"><span className="text-blue-300">shipmentNumber:</span> <span className="text-amber-300">"{form.shipmentNumber || 'SHP-2026-XXXXXX'}"</span></p>
                <p className="text-slate-400"><span className="text-blue-300">consigneePhone:</span> <span className="text-amber-300">"{form.consigneeCountryCode} {form.consigneePhone}"</span></p>
                <p className="text-slate-400"><span className="text-blue-300">status:</span> <span className="text-amber-300">"{form.status}"</span></p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 p-5 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 text-sm font-bold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {ts.cancel}
              </button>
              <button
                onClick={handleAddShipment}
                disabled={!form.shipmentNumber || !form.consigneePhone || !form.consigneeFirstName || !form.consigneeLastName}
                className="flex-1 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ts.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
