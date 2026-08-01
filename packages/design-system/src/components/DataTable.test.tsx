import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from './DataTable';

interface TestRow { id: string; name: string; age: number }

const columns: Column<TestRow>[] = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'age', header: 'Age', cell: (row) => String(row.age) },
];

const rows: TestRow[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
];

describe('DataTable', () => {
  it('renders headers', () => {
    render(<DataTable columns={columns} rows={rows} keyExtractor={(r) => r.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
  });

  it('renders row data', () => {
    render(<DataTable columns={columns} rows={rows} keyExtractor={(r) => r.id} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DataTable columns={columns} rows={[]} keyExtractor={(r) => r.id} loading />);
    expect(screen.getByText('در حال بارگذاری...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<DataTable columns={columns} rows={[]} keyExtractor={(r) => r.id} />);
    expect(screen.getByText('داده‌ای موجود نیست')).toBeInTheDocument();
  });

  it('fires onRowClick', () => {
    const onRowClick = jest.fn();
    render(<DataTable columns={columns} rows={rows} keyExtractor={(r) => r.id} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('applies cursor pointer when onRowClick is set', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} keyExtractor={(r) => r.id} onRowClick={jest.fn()} />
    );
    expect(container.querySelector('tbody tr')).toHaveClass('cursor-pointer');
  });
});
