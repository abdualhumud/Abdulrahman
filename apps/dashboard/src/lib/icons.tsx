type IconProps = { className?: string; size?: number };
const Icon = ({ d, className = '', size = 20 }: { d: string | string[]; className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

export const Icons = {
  overview:    (p: IconProps) => <Icon size={p.size} className={p.className} d={['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10']} />,
  calendar:    (p: IconProps) => <Icon size={p.size} className={p.className} d={['M8 2v4', 'M16 2v4', 'M3 10h18', 'M21 8H3a0 0 0 0 0 0 0v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z']} />,
  bookings:    (p: IconProps) => <Icon size={p.size} className={p.className} d={['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01']} />,
  channels:    (p: IconProps) => <Icon size={p.size} className={p.className} d={['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71']} />,
  inbox:       (p: IconProps) => <Icon size={p.size} className={p.className} d={['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z']} />,
  analytics:   (p: IconProps) => <Icon size={p.size} className={p.className} d={['M18 20V10', 'M12 20V4', 'M6 20v-6']} />,
  financials:  (p: IconProps) => <Icon size={p.size} className={p.className} d={['M12 1v22', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6']} />,
  chevronLeft: (p: IconProps) => <Icon size={p.size} className={p.className} d="M15 18l-6-6 6-6" />,
  chevronRight:(p: IconProps) => <Icon size={p.size} className={p.className} d="M9 18l6-6-6-6" />,
  chevronDown: (p: IconProps) => <Icon size={p.size} className={p.className} d="M6 9l6 6 6-6" />,
  search:      (p: IconProps) => <Icon size={p.size} className={p.className} d={['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35']} />,
  plus:        (p: IconProps) => <Icon size={p.size} className={p.className} d={['M12 5v14', 'M5 12h14']} />,
  send:        (p: IconProps) => <Icon size={p.size} className={p.className} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  building:    (p: IconProps) => <Icon size={p.size} className={p.className} d={['M3 21h18', 'M3 10h18', 'M5 6l7-3 7 3', 'M4 10v11', 'M20 10v11', 'M8 14v3', 'M12 14v3', 'M16 14v3']} />,
  trendUp:     (p: IconProps) => <Icon size={p.size} className={p.className} d={['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6']} />,
  trendDown:   (p: IconProps) => <Icon size={p.size} className={p.className} d={['M23 18l-9.5-9.5-5 5L1 6', 'M17 18h6v-6']} />,
  refresh:     (p: IconProps) => <Icon size={p.size} className={p.className} d={['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15']} />,
  check:       (p: IconProps) => <Icon size={p.size} className={p.className} d="M20 6L9 17l-5-5" />,
  filter:      (p: IconProps) => <Icon size={p.size} className={p.className} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  download:    (p: IconProps) => <Icon size={p.size} className={p.className} d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']} />,
  dots:        (p: IconProps) => <Icon size={p.size} className={p.className} d={['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z','M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z','M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z']} />,
  eye:         (p: IconProps) => <Icon size={p.size} className={p.className} d={['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} />,
};
