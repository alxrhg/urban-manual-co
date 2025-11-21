'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
  ColumnOrderState,
  ColumnSizingState,
} from '@tanstack/react-table';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Settings2,
  Download,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  Filter,
  X,
  GripVertical,
  Save,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
  onBulkDelete?: (selectedRows: TData[]) => void;
  onBulkEdit?: (selectedRows: TData[]) => void;
  onBulkExport?: (selectedRows: TData[]) => void;
  onBulkSync?: (selectedRows: TData[]) => void;
  onRowEdit?: (row: TData) => void;
  onRowDuplicate?: (row: TData) => void;
  onRowView?: (row: TData) => void;
  onRowDelete?: (row: TData) => void;
}

// Advanced filter operators
type FilterOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'notContains';

interface AdvancedFilter {
  column: string;
  operator: FilterOperator;
  value: string;
}

export function DataTableEnhanced<TData extends { slug?: string }, TValue>({
  columns,
  data,
  searchQuery,
  onSearchChange,
  isLoading = false,
  onBulkDelete,
  onBulkEdit,
  onBulkExport,
  onBulkSync,
  onRowEdit,
  onRowDuplicate,
  onRowView,
  onRowDelete,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [advancedFilters, setAdvancedFilters] = React.useState<AdvancedFilter[]>([]);
  type FilterPreset = { name: string; filters: ColumnFiltersState };
  type ColumnPreset = { name: string; visibility: VisibilityState; order: ColumnOrderState };
  
  const [filterPresets, setFilterPresets] = React.useState<FilterPreset[]>([]);
  const [columnPresets, setColumnPresets] = React.useState<ColumnPreset[]>([]);

  // Custom filter function for multi-column search
  const globalFilterFn: FilterFn<TData> = React.useCallback((row, columnId, filterValue) => {
    if (!filterValue) return true;
    const search = String(filterValue).toLowerCase();
    const name = String(row.getValue('name') || '').toLowerCase();
    const city = String(row.getValue('city') || '').toLowerCase();
    const slug = String(row.getValue('slug') || '').toLowerCase();
    const category = String(row.getValue('category') || '').toLowerCase();
    return name.includes(search) || city.includes(search) || slug.includes(search) || category.includes(search);
  }, []);

  // Add selection column
  const selectColumn: ColumnDef<TData, TValue> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const enhancedColumns = React.useMemo(() => [selectColumn, ...columns], [columns]);

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    globalFilterFn: globalFilterFn,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      columnOrder,
      columnSizing,
      globalFilter: searchQuery || undefined,
      pagination,
    },
    onPaginationChange: setPagination,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
  const hasSelectedRows = selectedRows.length > 0;

  // Save column preset
  const handleSaveColumnPreset = () => {
    const name = prompt('Enter preset name:');
    if (name) {
      setColumnPresets(prev => [...prev, {
        name,
        visibility: columnVisibility,
        order: columnOrder,
      }]);
    }
  };

  // Load column preset
  const handleLoadColumnPreset = (preset: typeof columnPresets[0]) => {
    setColumnVisibility(preset.visibility);
    setColumnOrder(preset.order);
  };

  // Save filter preset
  const handleSaveFilterPreset = () => {
    const name = prompt('Enter preset name:');
    if (name) {
      setFilterPresets(prev => [...prev, { name, filters: columnFilters }]);
    }
  };

  // Load filter preset
  const handleLoadFilterPreset = (preset: typeof filterPresets[0]) => {
    setColumnFilters(preset.filters);
  };

  // Reset columns
  const handleResetColumns = () => {
    setColumnVisibility({});
    setColumnOrder([]);
    setColumnSizing({});
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Search and Filters */}
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(showAdvancedFilters && 'bg-gray-100 dark:bg-gray-800')}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {columnFilters.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {columnFilters.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Bulk Actions */}
        {hasSelectedRows && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedRows.length} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onBulkEdit && (
                  <DropdownMenuItem onClick={() => onBulkEdit(selectedRows)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Selected
                  </DropdownMenuItem>
                )}
                {onBulkExport && (
                  <DropdownMenuItem onClick={() => onBulkExport(selectedRows)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected
                  </DropdownMenuItem>
                )}
                {onBulkSync && (
                  <DropdownMenuItem onClick={() => onBulkSync(selectedRows)}>
                    <Save className="mr-2 h-4 w-4" />
                    Sync to Sanity
                  </DropdownMenuItem>
                )}
                {onBulkDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onBulkDelete(selectedRows)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Column Management */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Column Visibility</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Presets</DropdownMenuLabel>
            {columnPresets.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Load Preset</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {columnPresets.map((preset, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={() => handleLoadColumnPreset(preset)}
                    >
                      {preset.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuItem onClick={handleSaveColumnPreset}>
              <Save className="mr-2 h-4 w-4" />
              Save Current as Preset
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleResetColumns}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Advanced Filters</h3>
            <div className="flex items-center gap-2">
              {filterPresets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Load Preset
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {filterPresets.map((preset, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        onClick={() => handleLoadFilterPreset(preset)}
                      >
                        {preset.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="outline" size="sm" onClick={handleSaveFilterPreset}>
                <Save className="h-4 w-4 mr-2" />
                Save Preset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setColumnFilters([]);
                  setAdvancedFilters([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {columnFilters.map((filter, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={filter.id}
                  onValueChange={(value) => {
                    const newFilters = [...columnFilters];
                    newFilters[idx] = { ...newFilters[idx], id: value };
                    setColumnFilters(newFilters);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    {table.getAllColumns()
                      .filter(col => col.getCanFilter())
                      .map(col => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  value={String(filter.value || '')}
                  onChange={(e) => {
                    const newFilters = [...columnFilters];
                    newFilters[idx] = { ...newFilters[idx], value: e.target.value };
                    setColumnFilters(newFilters);
                  }}
                  placeholder="Filter value..."
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setColumnFilters(columnFilters.filter((_, i) => i !== idx));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setColumnFilters([...columnFilters, { id: '', value: '' }])}
            >
              + Add Filter
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className="relative"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
                          'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600',
                          'opacity-0 hover:opacity-100 transition-opacity'
                        )}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={enhancedColumns.length}
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
                  className={cn(
                    row.getIsSelected() && 'bg-gray-50 dark:bg-gray-900/50'
                  )}
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
                  colSpan={enhancedColumns.length}
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} destination(s) found.
          {hasSelectedRows && ` ${selectedRows.length} selected.`}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                setPagination({ ...pagination, pageSize: Number(value), pageIndex: 0 });
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm text-gray-500">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

