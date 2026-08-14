import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Rapports' };

export default function ReportsPage() {
  return (
    <div className="card">
      <h1>Rapports</h1>
      <p className="muted">
        Rapports de paiements et relevés (placeholder — export CSV/PDF à venir).
      </p>
    </div>
  );
}
