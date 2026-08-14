import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GOURSI Business',
  description: 'Espace marchand GOURSI — paiements, bulk, réconciliation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
