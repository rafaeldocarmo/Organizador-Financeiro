'use client';

import Link from 'next/link';
import { I } from '@/components/ui/icons';

type TabId = 'home' | 'flow' | 'add' | 'invest' | 'me';

interface TabBarProps {
  active?: TabId;
  onFab?: () => void;
}

const items = [
  { id: 'home'   as TabId, label: 'Início',   icon: I.home,   href: '/'           },
  { id: 'flow'   as TabId, label: 'Fluxo',    icon: I.flow,   href: '/spend'      },
  { id: 'add'    as TabId, label: '',          icon: I.plus,   href: null, fab: true },
  { id: 'invest' as TabId, label: 'Investir', icon: I.invest, href: '/invest'     },
  { id: 'me'     as TabId, label: 'Você',      icon: I.user,   href: '/you' },
];

export default function TabBar({ active = 'home', onFab }: TabBarProps) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
      paddingBottom: 28, paddingTop: 6,
      background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
    }}>
      <div style={{
        margin: '0 14px', height: 64, borderRadius: 22,
        background: 'oklch(0.20 0.005 95 / 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--hairline)',
        display: 'flex', alignItems: 'center',
        padding: '0 8px',
      }}>
        {items.map(it => {
          const inner = it.fab ? (
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'var(--lime)', color: '#1a1d10',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -22,
              boxShadow: '0 8px 20px oklch(0.88 0.19 128 / 0.3)',
            }}>
              <it.icon s={22} sw={2} />
            </div>
          ) : (
            <>
              <it.icon s={20} sw={1.6} />
              <span style={{ fontSize: 10, letterSpacing: '0.02em' }}>{it.label}</span>
            </>
          );

          const wrapperStyle = {
            flex: 1, display: 'flex', flexDirection: 'column' as const,
            alignItems: 'center', gap: 3,
            color: it.id === active ? 'var(--ink)' : 'var(--subtle)',
            textDecoration: 'none',
          };

          if (it.href) {
            return (
              <Link key={it.id} href={it.href} style={wrapperStyle}>
                {inner}
              </Link>
            );
          }
          return (
            <button key={it.id} onClick={onFab} style={{ ...wrapperStyle, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
