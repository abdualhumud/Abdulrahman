'use client';

interface ChannelLogoProps {
  channel:  string;
  isActive?: boolean;
}

/**
 * Inline branded logo for each OTA channel.
 *
 * Uses HTML <span> elements instead of SVG <text> nodes — SVG font loading is
 * unreliable across browsers and SVG rendering contexts (screenshots, PDFs, etc.).
 * HTML spans with inline fontFamily always load from the system/page font stack.
 *
 * Active/inactive state: `filter: grayscale(100%) opacity(0.4)` when inactive.
 */
export default function ChannelLogo({ channel, isActive = true }: ChannelLogoProps) {
  const inactive: React.CSSProperties = !isActive
    ? { filter: 'grayscale(100%)', opacity: 0.4 }
    : {};

  if (channel === 'Booking.com') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-md overflow-hidden select-none"
      style={{
        background: 'linear-gradient(145deg, #003580 0%, #002060 100%)',
        ...inactive,
      }}
    >
      {/* "B." on first line */}
      <div style={{ display: 'flex', alignItems: 'flex-end', lineHeight: 1 }}>
        <span style={{
          fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
          fontWeight: 900, fontSize: 23, color: '#ffffff', lineHeight: 1,
        }}>B</span>
        <span style={{
          fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
          fontWeight: 900, fontSize: 23, color: '#7AB3FF', lineHeight: 1,
        }}>.</span>
      </div>
      {/* "BOOKING" wordmark */}
      <span style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 600, fontSize: 5.5,
        letterSpacing: '1.8px',
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
        textTransform: 'uppercase' as const,
        lineHeight: 1,
      }}>BOOKING</span>
    </div>
  );

  if (channel === 'Airbnb') return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden"
      style={{ background: '#FF385C', ...inactive }}
    >
      {/* Bélo icon — SVG path, no text, renders reliably */}
      <svg width="22" height="26" viewBox="0 0 22 26" fill="white">
        <path d="M11 0C7.7 0 5 2.7 5 6c0 2.2 1.3 4.5 3 6.8C9.7 14.6 11 16.3 11 17.5c0 1.4-1.1 2.5-2.5 2.5S6 18.9 6 17.5c0-.9.4-1.8 1-2.5l-1.5-1.5C4.5 14.7 4 16 4 17.5 4 20 6 22 8.5 22c1.4 0 2.7-.6 3.5-1.6.8 1 2.1 1.6 3.5 1.6 2.5 0 4.5-2 4.5-4.5 0-1.5-.5-2.8-1.5-3.9l-1.5 1.5c.6.7 1 1.6 1 2.4 0 1.4-1.1 2.5-2.5 2.5S13 18.9 13 17.5c0-1.2 1.3-2.9 3-4.7 1.7-2.3 3-4.6 3-6.8C19 2.7 16.3 0 13 0h-2zm1 4.5c1.4 0 2.5 1.1 2.5 2.5S13.4 9.5 12 9.5 9.5 8.4 9.5 7 10.6 4.5 12 4.5z" />
      </svg>
    </div>
  );

  if (channel === 'Gathern') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-md overflow-hidden select-none"
      style={{ background: '#00A651', ...inactive }}
    >
      <span style={{
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 900, fontSize: 22, color: '#ffffff', lineHeight: 1,
      }}>G</span>
      <span style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 600, fontSize: 5.5,
        letterSpacing: '1.5px',
        color: 'rgba(255,255,255,0.80)',
        marginTop: 1,
        textTransform: 'uppercase' as const,
        lineHeight: 1,
      }}>GATHERN</span>
    </div>
  );

  if (channel === 'Agoda') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-md overflow-hidden select-none"
      style={{ background: '#E31837', ...inactive }}
    >
      <span style={{
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 900, fontSize: 22, color: '#ffffff', lineHeight: 1,
      }}>A</span>
      <span style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 600, fontSize: 5.5,
        letterSpacing: '1.8px',
        color: 'rgba(255,255,255,0.80)',
        marginTop: 1,
        textTransform: 'uppercase' as const,
        lineHeight: 1,
      }}>AGODA</span>
    </div>
  );

  if (channel === 'Expedia') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-md overflow-hidden select-none"
      style={{ background: '#1C3D7D', ...inactive }}
    >
      <span style={{
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 900, fontSize: 22, color: '#FFC72C', lineHeight: 1,
      }}>E</span>
      <span style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 600, fontSize: 5,
        letterSpacing: '1.4px',
        color: 'rgba(255,255,255,0.80)',
        marginTop: 2,
        textTransform: 'uppercase' as const,
        lineHeight: 1,
      }}>EXPEDIA</span>
    </div>
  );

  if (channel === 'Waffy') return (
    <div
      className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-md overflow-hidden select-none"
      style={{ background: '#1A6B3C', ...inactive }}
    >
      <span style={{
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 900, fontSize: 20, color: '#FFD700', lineHeight: 1,
      }}>W</span>
      <span style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 600, fontSize: 6,
        letterSpacing: '1.5px',
        color: 'rgba(255,255,255,0.80)',
        marginTop: 1,
        textTransform: 'uppercase' as const,
        lineHeight: 1,
      }}>WAFFY</span>
    </div>
  );

  // Fallback — single initial
  return (
    <div
      className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0 select-none"
      style={inactive}
    >
      <span className="text-slate-600 font-extrabold text-sm">{channel.charAt(0)}</span>
    </div>
  );
}
