import Link from 'next/link';

const SECTIONS = [
  { href: '/dashboard', label: "Vue d'ensemble" },
  { href: '/dashboard/payments', label: 'Paiements' },
  { href: '/dashboard/bulk', label: 'Paiements en masse' },
  { href: '/dashboard/reports', label: 'Rapports' },
  { href: '/dashboard/settings', label: 'Réglages' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: '#0B1220', color: '#fff', padding: 16 }}>
        <h1 style={{ fontSize: 18, marginBottom: 24 }}>CauriPay Business</h1>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 6,
              }}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <a
          href="/api/auth/logout"
          style={{ color: '#f87171', display: 'block', marginTop: 32, textDecoration: 'none' }}
        >
          Déconnexion
        </a>
      </aside>
      <main style={{ flex: 1, padding: 24, background: '#F6F7F9' }}>{children}</main>
    </div>
  );
}
