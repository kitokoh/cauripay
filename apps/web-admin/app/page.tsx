import { redirect } from 'next/navigation';

/** Page d'accueil → dashboard (le middleware gère l'auth). */
export default function Home() {
  redirect('/dashboard');
}
