import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GOURSI Admin',
  description: 'Back-office GOURSI — compliance, KYC, AML, audit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
