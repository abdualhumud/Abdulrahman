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
  properties:  (p: IconProps) => <Icon size={p.size} className={p.className} d={['M3 21h18','M9 21V9l3-3 3 3v12','M5 21V12L3 10','M19 21V12l2-2','M9 9h6','M12 9v3']} />,
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
  shield:      (p: IconProps) => <Icon size={p.size} className={p.className} d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4']} />,
  mapPin:      (p: IconProps) => <Icon size={p.size} className={p.className} d={['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} />,
  camera:      (p: IconProps) => <Icon size={p.size} className={p.className} d={['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z', 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']} />,
  star:        (p: IconProps) => <Icon size={p.size} className={p.className} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  x:           (p: IconProps) => <Icon size={p.size} className={p.className} d={['M18 6L6 18', 'M6 6l12 12']} />,
  upload:      (p: IconProps) => <Icon size={p.size} className={p.className} d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} />,
  user:        (p: IconProps) => <Icon size={p.size} className={p.className} d={['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']} />,
  alertCircle: (p: IconProps) => <Icon size={p.size} className={p.className} d={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 8v4', 'M12 16h.01']} />,
  clock:       (p: IconProps) => <Icon size={p.size} className={p.className} d={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2']} />,
  globe:       (p: IconProps) => <Icon size={p.size} className={p.className} d={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M2 12h20','M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z']} />,
  bank:        (p: IconProps) => <Icon size={p.size} className={p.className} d={['M3 21h18','M3 10h18','M5 6l7-3 7 3','M4 10v11','M20 10v11','M8 14v3','M12 14v3','M16 14v3']} />,
  creditCard:  (p: IconProps) => <Icon size={p.size} className={p.className} d={['M1 4h22v16H1z','M1 10h22']} />,
  cleaning:    (p: IconProps) => <Icon size={p.size} className={p.className} d={['M3 22l6.5-6.5','M15 8l1 1','M4 12l1.5-1.5','M20.5 3.5a2.121 2.121 0 0 0-3 0L6 15l3 3 11.5-11.5a2.121 2.121 0 0 0 0-3z']} />,
  sparkles:    (p: IconProps) => <Icon size={p.size} className={p.className} d={['M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z','M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z','M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75z']} />,
  truck:       (p: IconProps) => <Icon size={p.size} className={p.className} d={['M1 3h15v13H1z','M16 8h4l3 3v5h-7V8z','M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z','M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z']} />,
  userCheck:   (p: IconProps) => <Icon size={p.size} className={p.className} d={['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M16 11l2 2 4-4']} />,
  zap:         (p: IconProps) => <Icon size={p.size} className={p.className} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  arrowRight:  (p: IconProps) => <Icon size={p.size} className={p.className} d={['M5 12h14','M12 5l7 7-7 7']} />,
  flag:        (p: IconProps) => <Icon size={p.size} className={p.className} d={['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z','M4 22v-7']} />,
};
