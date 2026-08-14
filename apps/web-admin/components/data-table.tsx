import type { ReactNode } from 'react';

export interface Column {
  key: string;
  label: string;
}

export interface DataTableProps {
  columns: readonly Column[];
  rows: readonly Record<string, ReactNode>[];
  emptyMessage: string;
  error?: string;
}

/**
 * Tableau de données générique (placeholder) pour les sections du back-office.
 * Affiche un avertissement quand api-core n'expose pas encore l'endpoint.
 */
export function DataTable({ columns, rows, emptyMessage, error }: DataTableProps) {
  return (
    <>
      {error ? <p className="api-warning">{error}</p> : null}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="table-empty" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.key}>{row[column.key] ?? '—'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
