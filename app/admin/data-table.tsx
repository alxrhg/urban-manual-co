'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
} from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { Input } from '@/ui/input';
import { Spinner } from '@/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table';
import { DataTablePagination } from '@/ui/data-table-pagination';
import { DataTableViewOptions } from '@/ui/data-table-view-options';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: TData[]) => void;
  pageSizeOptions?: number[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchQuery = '',
  onSearchChange,
  isLoading = false,
  searchPlaceholder = 'Search...',
  enableRowSelection = false,
  onRowSelectionChange,
  pageSizeOptions = [10, 20, 30, 40, 50],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Custom filter function for multi-column search
  const globalFilterFn: FilterFn<TData> = React.useCallback((row, columnId, filterValue) => {
    if (!filterValue) return true;
    const search = String(filterValue).toLowerCase();
    const name = String(row.getValue('name') || '').toLowerCase();
    const city = String(row.getValue('city') || '').toLowerCase();
    const slug = String(row.getValue('slug') || '').toLowerCase();
    const category = String(row.getValue('category') || '').toLowerCase();
    const email = String(row.getValue('email') || '').toLowerCase();
    return (
      name.includes(search) ||
      city.includes(search) ||
      slug.includes(search) ||
      category.includes(search) ||
      email.includes(search)
    );
  }, []);

  const table = useReactTable(
    React.useMemo(
      () => ({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        enableRowSelection,
        globalFilterFn: globalFilterFn,
        state: {
          sorting,
          columnFilters,
          columnVisibility,
          rowSelection,
          globalFilter: searchQuery || undefined,
        },
      }),
      [
        data,
        columns,
        sorting,
        columnFilters,
        columnVisibility,
        rowSelection,
        searchQuery,
        globalFilterFn,
        enableRowSelection,
      ]
    )
  );

  // Notify parent of row selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, onRowSelectionChange, table]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {onSearchChange && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>
        )}
        <DataTableViewOptions table={table} />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Spinner className="size-4" />
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        table={table}
        pageSizeOptions={pageSizeOptions}
        showSelectedCount={enableRowSelection}
      />
    </div>
  );
}
