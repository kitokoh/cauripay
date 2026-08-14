/**
 * Layout espace entreprise — sidebar (paiements, bulk, rapports, réglages).
 *
 * Protégé par le middleware 2FA (aucune route accessible sans session 2FA
 * validée). La session est relue ici (cookies → JWT) pour l'en-tête utilisateur
 * et le lien de déconnexion.
 */
import { cookies } from 'next/headers';
import { readSession } from '../../lib/auth/session';
import SidebarNav from './sidebar-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession(cookies().get('goursi_business_session')?.value);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">GOURSI · Entreprises</div>
        <SidebarNav />
        <div className="sidebar__footer">
          <div style={{ marginBottom: '0.5rem', wordBreak: 'break-word' }}>
            {session?.name ?? session?.email ?? 'Utilisateur'}
          </div>
          <a className="sidebar__link" href="/api/auth/logout" style={{ paddingLeft: 0 }}>
            Se déconnecter
          </a>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
