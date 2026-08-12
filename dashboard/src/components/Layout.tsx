import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { clearToken } from '../api';

const NAV = [
  { to: '/app', label: 'Vue d\'ensemble', icon: '📊' },
  { to: '/app/payments', label: 'Paiements', icon: '💳' },
  { to: '/app/webhooks', label: 'Webhooks', icon: '🔔' },
  { to: '/app/keys', label: 'Clés API', icon: '🔑' },
  { to: '/app/settings', label: 'Réglages', icon: '⚙️' },
];

export function Layout({ children, merchant }: { children: ReactNode; merchant: { name: string; company: string } }): JSX.Element {
  const navigate = useNavigate();
  const logout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">C</div>
          <div>
            <strong>CauriPay</strong>
            <span className="brand-sub">Paiements Afrique</span>
          </div>
        </div>
        <div className="test-badge">🧪 MODE TEST — aucun débit réel</div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/app'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="user-avatar">{(merchant.name || 'M').slice(0, 1).toUpperCase()}</div>
            <div className="user-meta">
              <strong>{merchant.name || 'Marchand'}</strong>
              <span>{merchant.company}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={logout}>Déconnexion</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }): JSX.Element {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
