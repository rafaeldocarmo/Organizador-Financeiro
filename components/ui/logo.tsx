interface LogoProps {
  size?: number;
  color?: string;
}

export default function Logo({ size = 20, color = 'var(--ink)' }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 16V9.5L12 14l5-4.5V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: size + 4, letterSpacing: '-0.02em' }}>Mira</span>
    </div>
  );
}
