'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
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
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { AdminFilterBar } from '@/src/components/admin/filters';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchQuery,
  onSearchChange,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  // Custom filter function for multi-column search
  const globalFilterFn: FilterFn<any> = React.useCallback((row, columnId, filterValue) => {
    if (!filterValue) return true;
    const search = String(filterValue).toLowerCase();
    const name = String(row.getValue('name') || '').toLowerCase();
    const city = String(row.getValue('city') || '').toLowerCase();
    const slug = String(row.getValue('slug') || '').toLowerCase();
    const category = String(row.getValue('category') || '').toLowerCase();
    return name.includes(search) || city.includes(search) || slug.includes(search) || category.includes(search);
  }, []);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: globalFilterFn,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter: searchQuery || undefined,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <AdminFilterBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search destinations, cities, or slugs"
          busy={isLoading}
          className="flex-1"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="h-12 rounded-full border-slate-300 px-5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 shadow-none transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 bg-white/95 p-3 text-xs shadow-xl">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-[1.25rem] border border-slate-200/70 bg-white/80 shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/60">
        <div className="hidden max-h-[70vh] overflow-auto md:block">
          <Table className="min-w-[960px]">
            <TableHeader className="sticky top-0 z-10 bg-white/95 text-[0.68rem] uppercase tracking-[0.25em] text-slate-500 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md dark:bg-slate-950/80">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-slate-200/60">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="py-4 text-[0.68rem]">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                      <Spinner className="size-4" /> Loading
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn(
                      'border-b border-slate-200/70 text-sm text-slate-700 transition-colors dark:text-slate-100',
                      index % 2 === 0
                        ? 'bg-white/95 dark:bg-slate-900/50'
                        : 'bg-slate-50/80 dark:bg-slate-900/30',
                      'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="align-middle text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-slate-500">
                    No results
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile layout */}
        <div className="space-y-3 p-4 md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Spinner className="size-4" /> Loading
            </div>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
              >
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} className="py-1 text-sm text-slate-600 dark:text-slate-200">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-slate-500">No results</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200/70 bg-white/70 px-4 py-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {table.getFilteredRowModel().rows.length} destination(s) found
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-10 rounded-full border-slate-300 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-10 rounded-full border-slate-300 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

