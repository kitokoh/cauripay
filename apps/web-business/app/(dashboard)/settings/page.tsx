import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Réglages' };

export default function SettingsPage() {
  return (
    <div className="card">
      <h1>Réglages</h1>
      <p className="muted">
        Profil de l'entreprise, membres et rôles (placeholder — gestion des
        membres d'entreprise à venir, GOURSI-043b).
      </p>
    </div>
  );
}
