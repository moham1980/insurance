'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  className?: string;
}

export function DataTable<T>({ columns, rows, keyExtractor, onRowClick, loading, className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border-default', className)}>
      <table className="w-full text-sm">
        <thead className="bg-bg-subtle">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-right text-xs font-semibold text-text-secondary"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                در حال بارگذاری...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                داده‌ای موجود نیست
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'bg-bg-raised transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-bg-subtle'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-text-primary">
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
