import { useEffect, useState } from 'react';

interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

type Listener = (t: Toast) => void;
let listener: Listener | null = null;
let counter = 1;

export function toast(kind: Toast['kind'], message: string): void {
  const t = { id: counter++, kind, message };
  listener?.(t);
}

export function Toasts(): JSX.Element {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listener = (t) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 4500);
    };
    return () => {
      listener = null;
    };
  }, []);

  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span>{t.kind === 'success' ? '✅' : t.kind === 'error' ? '⚠️' : 'ℹ️'}</span>
          <div>{t.message}</div>
        </div>
      ))}
    </div>
  );
}
