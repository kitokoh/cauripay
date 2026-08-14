export function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }): JSX.Element {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${accent ? 'stat-accent' : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, sub, cta }: { icon: string; title: string; sub?: string; cta?: JSX.Element }): JSX.Element {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
      {cta}
    </div>
  );
}

export function Spinner(): JSX.Element {
  return <div className="spinner" />;
}
