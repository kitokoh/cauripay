import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Paiements' };

export default function PaymentsPage() {
  return (
    <div className="card">
      <h1>Paiements</h1>
      <p className="muted">
        Historique et détail des paiements de l'entreprise (placeholder — données
        business-service, GOURSI-030+).
      </p>
    </div>
  );
}
