import React from 'react';

export interface IconProps {
  s?: number;
  sw?: number;
  fill?: string;
  style?: React.CSSProperties;
}

const Icon = ({ d, s = 20, sw = 1.5, fill = 'none', children, style }: IconProps & { d?: string; children?: React.ReactNode }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d ? <path d={d} /> : children}
  </svg>
);

export const I: Record<string, React.FC<IconProps>> = {
  home:      (p) => <Icon {...p}><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></Icon>,
  list:      (p) => <Icon {...p}><path d="M4 6h16M4 12h16M4 18h10"/></Icon>,
  chart:     (p) => <Icon {...p}><path d="M4 19V5M4 19h16M8 16V11M12 16V8M16 16V13M20 16V6"/></Icon>,
  card:      (p) => <Icon {...p}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18M7 15.5h3"/></Icon>,
  wallet:    (p) => <Icon {...p}><path d="M3 7.5C3 6 4 5 5.5 5h11C18 5 19 6 19 7.5V8H5.5C4 8 3 7 3 5.5z"/><path d="M3 7v10.5C3 19 4 20 5.5 20h13c1 0 1.5-.5 1.5-1.5v-10c0-1-.5-1.5-1.5-1.5"/><circle cx="16" cy="13.5" r="1.2" fill="currentColor"/></Icon>,
  plus:      (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  search:    (p) => <Icon {...p}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></Icon>,
  filter:    (p) => <Icon {...p}><path d="M4 6h16M7 12h10M10 18h4"/></Icon>,
  arrowR:    (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>,
  arrowU:    (p) => <Icon {...p}><path d="M7 14l5-5 5 5"/></Icon>,
  arrowD:    (p) => <Icon {...p}><path d="M7 10l5 5 5-5"/></Icon>,
  chev:      (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>,
  chevD:     (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  bell:      (p) => <Icon {...p}><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2H4.5z"/><path d="M10 21h4"/></Icon>,
  more:      (p) => <Icon {...p}><circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/></Icon>,
  close:     (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18"/></Icon>,
  cal:       (p) => <Icon {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></Icon>,
  spark:     (p) => <Icon {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></Icon>,
  cup:       (p) => <Icon {...p}><path d="M5 8h12v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M17 9h2a2 2 0 0 1 2 2 3 3 0 0 1-3 3h-1"/></Icon>,
  cart:      (p) => <Icon {...p}><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.5 11h12L22 8H6"/></Icon>,
  bolt:      (p) => <Icon {...p}><path d="M13 3 4 14h7l-1 7 9-11h-7z"/></Icon>,
  film:      (p) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M3 15h18M9 4v16M15 4v16"/></Icon>,
  car:       (p) => <Icon {...p}><path d="M4 13l1.5-5A2 2 0 0 1 7.4 6.5h9.2A2 2 0 0 1 18.5 8L20 13"/><rect x="3" y="13" width="18" height="5" rx="1.5"/><circle cx="7" cy="18" r="1.4"/><circle cx="17" cy="18" r="1.4"/></Icon>,
  house:     (p) => <Icon {...p}><path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z"/></Icon>,
  heart:     (p) => <Icon {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></Icon>,
  book:      (p) => <Icon {...p}><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18h13"/></Icon>,
  pet:       (p) => <Icon {...p}><circle cx="6" cy="9" r="1.6"/><circle cx="10" cy="6" r="1.6"/><circle cx="14" cy="6" r="1.6"/><circle cx="18" cy="9" r="1.6"/><path d="M8 15c0-2.5 1.8-4 4-4s4 1.5 4 4-1 5-4 5-4-2.5-4-5z"/></Icon>,
  globe:     (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 3 2.5 14 0 17M12 3.5c-2.5 3-2.5 14 0 17"/></Icon>,
  check:     (p) => <Icon {...p}><path d="M5 12.5 10 17 19 7"/></Icon>,
  pencil:    (p) => <Icon {...p}><path d="M4 20h4l11-11-4-4L4 16z"/><path d="M14 6l4 4"/></Icon>,
  pin:       (p) => <Icon {...p}><path d="M12 21V14M8 14h8M9 4h6l1 6c-1 1.5-2 3-4 3s-3-1.5-4-3z"/></Icon>,
  invest:    (p) => <Icon {...p}><path d="M3 17l5-5 4 3 8-9"/><path d="M14 6h6v6"/></Icon>,
  tag:       (p) => <Icon {...p}><path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="8" r="1.5"/></Icon>,
  flow:      (p) => <Icon {...p}><path d="M5 5v14M19 5v14M5 9h14M5 15h14"/></Icon>,
  target:    (p) => <Icon {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/></Icon>,
  pie:       (p) => <Icon {...p}><path d="M12 3v9h9"/><path d="M21 12a9 9 0 1 1-9-9"/></Icon>,
  zap:       (p) => <Icon {...p}><path d="M11 3 5 14h6l-1 7 9-11h-7z"/></Icon>,
  user:      (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></Icon>,
  layers:    (p) => <Icon {...p}><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/></Icon>,
  clock:     (p) => <Icon {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.5"/></Icon>,
  wifi:      (p) => <Icon {...p}><path d="M2 9c5.5-5 14.5-5 20 0M5 13c3.5-3 10.5-3 14 0M8.5 17c1.5-1.5 5.5-1.5 7 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></Icon>,
  download:  (p) => <Icon {...p}><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></Icon>,
  paperclip: (p) => <Icon {...p}><path d="M20 11.5 12 19.5a4.5 4.5 0 0 1-6.4-6.4l9-9a3 3 0 0 1 4.3 4.3l-9 9a1.5 1.5 0 0 1-2.1-2.1l8-8"/></Icon>,
  trend:     (p) => <Icon {...p}><path d="M3 17l6-6 4 4 8-9"/><path d="M14 6h6v6"/></Icon>,
  trendD:    (p) => <Icon {...p}><path d="M3 7l6 6 4-4 8 9"/><path d="M14 18h6v-6"/></Icon>,
};
