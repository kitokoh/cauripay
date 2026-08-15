import { useEffect, useState } from 'react';
import { request, setSkTest } from '../api';
import { copyText } from '../format';
import { PageHead } from '../components/Layout';
import { Spinner } from '../components/StatCard';
import { toast } from '../components/Toast';

interface KeysData {
  keys: {
    publishable_test: string;
    publishable_live: string;
    webhook_secret_test: string;
    webhook_secret_live: string;
    secret_test_present: boolean;
    secret_live_present: boolean;
  };
  live_enabled: number;
}

interface KeyRow {
  label: string;
  value: string;
  scope: 'publishable' | 'secret' | 'webhook';
  mode: 'test' | 'live';
  secret?: boolean;
}

export function KeysPage(): JSX.Element {
  const [data, setData] = useState<KeysData | null>(null);

  const load = () => request<KeysData>('/keys').then(setData).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  if (!data) return <Spinner />;

  const rows: KeyRow[] = [
    { label: 'Clé publiable (test)', value: data.keys.publishable_test, scope: 'publishable', mode: 'test' },
    { label: 'Clé secrète (test)', value: 'sk_test_•••••••••••• (une seule fois)', scope: 'secret', mode: 'test', secret: true },
    { label: 'Secret webhook (test)', value: data.keys.webhook_secret_test, scope: 'webhook', mode: 'test' },
    { label: 'Clé publiable (live)', value: data.keys.publishable_live, scope: 'publishable', mode: 'live' },
    { label: 'Clé secrète (live)', value: 'sk_live_•••••••••••• (une seule fois)', scope: 'secret', mode: 'live', secret: true },
    { label: 'Secret webhook (live)', value: data.keys.webhook_secret_live, scope: 'webhook', mode: 'live' },
  ];

  const rotate = async (r: KeyRow) => {
    if (!confirm(`Régénérer ${r.label} ? L'ancienne clé cessera d'être valide immédiatement.`)) return;
    try {
      const res = await request<{ key: string }>('/keys/rotate', { method: 'POST', body: { mode: r.mode, scope: r.scope } });
      toast('info', `${r.label} régénérée : ${res.key}`);
      // La clé secrète de test pilote le simulateur du dashboard : on la mémorise localement.
      if (r.scope === 'secret' && r.mode === 'test') setSkTest(res.key);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Erreur');
    }
  };

  const copy = (r: KeyRow) => {
    if (r.secret) return toast('info', 'Clé secrète visible une seule fois — utilisez « Régénérer » pour l’afficher.');
    copyText(r.value);
    toast('success', 'Copié dans le presse-papiers.');
  };

  return (
    <>
      <PageHead title="Clés API" sub="Authentifiez vos appels à l'API v1. Les clés secrètes (sk_) ne sont affichées qu'une seule fois, à la création ou à la rotation." />
      {!data.live_enabled && (
        <div className="note">🔒 Le mode <strong>live</strong> n'est pas encore activé sur ce compte — les paiements réels arriveront en v0.2 avec les connecteurs PSP.</div>
      )}
      <div className="keys-grid">
        {(['test', 'live'] as const).map((mode) => (
          <div key={mode} className="card">
            <h3 className="card-title">{mode === 'test' ? '🧪 Mode test' : '🔒 Mode live'}</h3>
            <p className="hint">{mode === 'test' ? 'Simulateur — aucun argent réel.' : 'Transactions réelles (v0.2).'}</p>
            {rows
              .filter((r) => r.mode === mode)
              .map((r, i) => (
                <div key={`${r.mode}-${r.scope}-${i}`} className="key-row">
                  <div className="key-label">
                    {r.label}
                    {r.secret && <span className="badge">une seule fois</span>}
                  </div>
                  <div className="key-value">
                    <code>{r.value}</code>
                    <button className="btn btn-sm" onClick={() => copy(r)}>Copier</button>
                  </div>
                  <button className="btn btn-sm btn-ghost" onClick={() => rotate(r)}>↻ Régénérer</button>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
