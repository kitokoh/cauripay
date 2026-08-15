import Link from 'next/link';
import { Suspense } from 'react';

const SECTIONS = [
  { href: '/dashboard', label: 'Vue d’ensemble' },
  { href: '/dashboard/users', label: 'Utilisateurs' },
  { href: '/dashboard/transactions', label: 'Transactions' },
  { href: '/dashboard/kyc', label: 'KYC' },
  { href: '/dashboard/aml', label: 'Alertes AML' },
  { href: '/dashboard/agents', label: 'Agents' },
  { href: '/dashboard/audit', label: 'Journal d’audit' },
  { href: '/dashboard/reporting', label: 'Reporting' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: '#0B1220', color: '#fff', padding: 16 }}>
        <h1 style={{ fontSize: 18, marginBottom: 24 }}>CauriPay Admin</h1>
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
      <main style={{ flex: 1, padding: 24, background: '#F6F7F9' }}>
        <Suspense fallback={<div>Chargement…</div>}>{children}</Suspense>
      </main>
    </div>
  );
}
