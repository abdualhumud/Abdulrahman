import React, { useState } from 'react';
import { ChannelType } from '@rems/shared/types';
import { RatePushFormData } from '../../types/dashboard.types';

// ============================================================
// RATE MANAGER — Rate Parity Dashboard
// Allows owners to push dynamic pricing to all channels at once
// ============================================================

interface Unit {
  id: string;
  name: string;
  propertyName: string;
  currentRate: number;
}

interface RateManagerProps {
  units: Unit[];
  currency: string;
  onPushRates: (data: RatePushFormData) => Promise<void>;
  isLoading?: boolean;
}

const CHANNEL_OPTIONS = [
  { value: ChannelType.BOOKING_COM, label: 'Booking.com' },
  { value: ChannelType.AIRBNB, label: 'Airbnb' },
  { value: ChannelType.GATHERN, label: 'Gathern' },
];

export const RateManager: React.FC<RateManagerProps> = ({
  units,
  currency,
  onPushRates,
  isLoading = false,
}) => {
  const [form, setForm] = useState<Partial<RatePushFormData>>({
    unitIds: [],
    targetChannels: [ChannelType.BOOKING_COM, ChannelType.AIRBNB, ChannelType.GATHERN],
    minimumStay: 1,
  });
  const [successMessage, setSuccessMessage] = useState('');

  const handleChannelToggle = (channel: string) => {
    const current = form.targetChannels ?? [];
    setForm((f) => ({
      ...f,
      targetChannels: current.includes(channel as ChannelType)
        ? current.filter((c) => c !== channel)
        : [...current, channel as ChannelType],
    }));
  };

  const handleUnitToggle = (unitId: string) => {
    const current = form.unitIds ?? [];
    setForm((f) => ({
      ...f,
      unitIds: current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dateFrom || !form.dateTo || !form.price || !form.unitIds?.length) return;

    await onPushRates(form as RatePushFormData);
    setSuccessMessage(`Rates pushed to ${form.targetChannels?.length} channels successfully!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">💰</span>
        <h2 className="font-semibold text-gray-800">Rate Parity Manager</h2>
        <span className="ml-auto text-xs text-gray-400 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
          Push to all channels simultaneously
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">From Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.dateFrom ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">To Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.dateTo ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Price & Min Stay */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Nightly Rate ({currency})
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.price ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Min Stay (nights)</label>
            <input
              type="number"
              min={1}
              max={30}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.minimumStay ?? 1}
              onChange={(e) => setForm((f) => ({ ...f, minimumStay: parseInt(e.target.value, 10) }))}
            />
          </div>
        </div>

        {/* Units */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Select Units</label>
          <div className="flex flex-wrap gap-2">
            {units.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => handleUnitToggle(unit.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  form.unitIds?.includes(unit.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {unit.name}
                <span className="ml-1 opacity-60">({currency} {unit.currentRate})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Target Channels</label>
          <div className="flex gap-3">
            {CHANNEL_OPTIONS.map((ch) => (
              <label key={ch.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.targetChannels?.includes(ch.value as ChannelType) ?? false}
                  onChange={() => handleChannelToggle(ch.value)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">{ch.label}</span>
              </label>
            ))}
          </div>
        </div>

        {successMessage && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-medium">
            ✓ {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {isLoading ? 'Pushing Rates...' : `Push Rates to ${form.targetChannels?.length ?? 0} Channels`}
        </button>
      </form>
    </div>
  );
};
