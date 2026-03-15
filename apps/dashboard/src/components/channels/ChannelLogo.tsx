'use client';

interface ChannelLogoProps {
  channel:  string;
  isActive?: boolean;
}

/**
 * Inline branded SVG logo for each OTA channel.
 * Uses `filter: grayscale(100%) opacity(0.4)` when inactive (kill-switch off or disconnected).
 */
export default function ChannelLogo({ channel, isActive = true }: ChannelLogoProps) {
  const inactiveStyle = !isActive ? { filter: 'grayscale(100%)', opacity: 0.4 } : {};

  if (channel === 'Booking.com') return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden select-none"
      style={{ background: '#003580', ...inactiveStyle }}>
      <svg width="44" height="38" viewBox="0 0 44 38" fill="none">
        <text x="22" y="24" textAnchor="middle" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="20">
          <tspan fill="white">B</tspan><tspan fill="#6699FF">.</tspan>
        </text>
        <text x="22" y="35" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7" fill="white" letterSpacing="1.5">BOOKING</text>
      </svg>
    </div>
  );

  if (channel === 'Airbnb') return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#FF385C', ...inactiveStyle }}>
      <svg width="22" height="26" viewBox="0 0 22 26" fill="white">
        <path d="M11 0C7.7 0 5 2.7 5 6c0 2.2 1.3 4.5 3 6.8C9.7 14.6 11 16.3 11 17.5c0 1.4-1.1 2.5-2.5 2.5S6 18.9 6 17.5c0-.9.4-1.8 1-2.5l-1.5-1.5C4.5 14.7 4 16 4 17.5 4 20 6 22 8.5 22c1.4 0 2.7-.6 3.5-1.6.8 1 2.1 1.6 3.5 1.6 2.5 0 4.5-2 4.5-4.5 0-1.5-.5-2.8-1.5-3.9l-1.5 1.5c.6.7 1 1.6 1 2.4 0 1.4-1.1 2.5-2.5 2.5S13 18.9 13 17.5c0-1.2 1.3-2.9 3-4.7 1.7-2.3 3-4.6 3-6.8C19 2.7 16.3 0 13 0h-2zm1 4.5c1.4 0 2.5 1.1 2.5 2.5S13.4 9.5 12 9.5 9.5 8.4 9.5 7 10.6 4.5 12 4.5z" />
      </svg>
    </div>
  );

  if (channel === 'Gathern') return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#00A651', ...inactiveStyle }}>
      <svg width="44" height="38" viewBox="0 0 44 38" fill="none">
        <text x="22" y="24" textAnchor="middle" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="20" fill="white">G</text>
        <text x="22" y="35" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7" fill="white" letterSpacing="1">GATHERN</text>
      </svg>
    </div>
  );

  if (channel === 'Agoda') return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#E31837', ...inactiveStyle }}>
      <svg width="44" height="38" viewBox="0 0 44 38" fill="none">
        <text x="22" y="23" textAnchor="middle" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="20" fill="white">A</text>
        <text x="22" y="35" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7" fill="white" letterSpacing="1.5">AGODA</text>
      </svg>
    </div>
  );

  if (channel === 'Expedia') return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#1C3D7D', ...inactiveStyle }}>
      <svg width="44" height="38" viewBox="0 0 44 38" fill="none">
        <text x="22" y="23" textAnchor="middle" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="20" fill="#FFC72C">E</text>
        <text x="22" y="35" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="5.5" fill="white" letterSpacing="1">EXPEDIA</text>
      </svg>
    </div>
  );

  if (channel === 'Waffy') return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
      style={{ background: '#1A6B3C', ...inactiveStyle }}>
      <svg width="44" height="38" viewBox="0 0 44 38" fill="none">
        <text x="22" y="22" textAnchor="middle" fontFamily="Arial Black,Helvetica,sans-serif" fontWeight="900" fontSize="17" fill="#FFD700">W</text>
        <text x="22" y="35" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7" fill="white" letterSpacing="1">WAFFY</text>
      </svg>
    </div>
  );

  return (
    <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0" style={inactiveStyle}>
      <span className="text-slate-600 font-extrabold text-sm">{channel.charAt(0)}</span>
    </div>
  );
}
