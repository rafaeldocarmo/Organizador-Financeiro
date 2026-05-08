import Logo from '@/components/ui/logo';

export const metadata = { title: 'Sem conexão' };

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24,
      textAlign: 'center',
    }}>
      <Logo size={32} />
      <div className="serif" style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
        Você está offline
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--muted)', maxWidth: 280 }}>
        Mira precisa de conexão para sincronizar seus dados financeiros. Conecte‑se e tente de novo.
      </div>
    </div>
  );
}
