/**
 * Layout du dashboard — navigation par section (RBAC), profil, déconnexion.
 * Double garde serveur : pas de session → /login ; rôle non admin → /forbidden
 * (le middleware applique déjà le RBAC par chemin).
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SESSION_COOKIE_NAME } from '../../lib/config';
import { getSession } from '../../lib/auth/session';
import { accessibleSections, hasAdminRole } from '../../lib/auth/rbac';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(cookies().get(SESSION_COOKIE_NAME)?.value);

  if (!session) redirect('/login');
  if (!hasAdminRole(session.roles)) redirect('/forbidden');

  const sections = accessibleSections(session.roles);
  const displayName = session.name ?? session.email ?? session.sub;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">GOURSI Admin</div>
        <nav aria-label="Sections du back-office">
          <Link className="nav-link" href="/dashboard">
            Vue d&apos;ensemble
          </Link>
          {sections.map((section) => (
            <Link key={section.path} className="nav-link" href={section.path}>
              {section.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="profile">
            <span className="profile-name" title={displayName}>
              {displayName}
            </span>
            <span className="profile-roles" title={session.roles.join(', ')}>
              {session.roles.join(', ')}
            </span>
          </div>
          <form method="post" action="/api/auth/logout">
            <button type="submit" className="btn btn-outline">
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
