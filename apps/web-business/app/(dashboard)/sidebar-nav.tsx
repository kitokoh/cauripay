'use client';

/**
 * Navigation latérale avec état actif (usePathname).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/payments', label: 'Paiements' },
  { href: '/bulk', label: 'Paiements bulk' },
  { href: '/reports', label: 'Rapports' },
  { href: '/settings', label: 'Réglages' },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar__nav" aria-label="Navigation entreprise">
      <Link
        className="sidebar__link"
        href="/dashboard"
        style={pathname === '/dashboard' ? activeStyle : undefined}
      >
        Tableau de bord
      </Link>
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          className="sidebar__link"
          href={href}
          style={pathname === href ? activeStyle : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

const activeStyle = { background: 'var(--color-bg)', color: 'var(--color-accent)' };
