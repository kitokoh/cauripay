import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Portail entreprises — GOURSI',
    template: '%s · GOURSI',
  },
  description: 'Portail entreprises CauriPay : paiements, bulk, rapports, réglages.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
