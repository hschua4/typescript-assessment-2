"use client";

import type React from "react";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";

type Deployment = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
  priority: number;
  dueDate: string | null;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type DataResponse = {
  data: Deployment[];
  pagination: Pagination;
};

type UpdateDeploymentPayload = {
  id: string;
  name?: string;
  status?: "ready" | "building" | "error";
  branch?: string;
  environment?: "production" | "preview" | "development";
  commit?: string;
  author?: string;
};

function EditableCell({
  value: initialValue,
  row,
  column,
  type = "text",
  options,
  onUpdate,
}: {
  value: string;
  row: any;
  column: any;
  type?: "text" | "select" | "status";
  options?: { value: string; label: string }[];
  onUpdate: (id: string, field: string, value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    if (value !== initialValue) {
      onUpdate(row.original.id, column.id, value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (type === "status") {
    return (
      <div
        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
        onClick={() => setIsEditing(!isEditing)}
      >
        {isEditing ? (
          <Select
            value={value}
            onValueChange={(newValue) => {
              setValue(newValue);
              onUpdate(row.original.id, column.id, newValue);
              setIsEditing(false);
            }}
            open={isEditing}
            onOpenChange={setIsEditing}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  To Do
                </div>
              </SelectItem>
              <SelectItem value="doing">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  Doing
                </div>
              </SelectItem>
              <SelectItem value="done">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Done
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <>
            <div
              className={`h-2 w-2 rounded-full ${
                value === "ready"
                  ? "bg-green-500"
                  : value === "building"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            />
            <span className="capitalize text-sm">{value}</span>
          </>
        )}
      </div>
    );
  }

  if (type === "select" && options) {
    return (
      <div
        className="cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
        onClick={() => setIsEditing(!isEditing)}
      >
        {isEditing ? (
          <Select
            value={value}
            onValueChange={(newValue) => {
              setValue(newValue);
              onUpdate(row.original.id, column.id, newValue);
              setIsEditing(false);
            }}
            open={isEditing}
            onOpenChange={setIsEditing}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm capitalize">{value}</span>
        )}
      </div>
    );
  }

  return (
    <div className="cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors">
      {isEditing ? (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-8 font-mono text-sm"
          autoFocus
        />
      ) : (
        <div onClick={() => setIsEditing(true)} className="font-mono text-sm">
          {value}
        </div>
      )}
    </div>
  );
}

export function DataTable() {
  const queryClient = useQueryClient();

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 1,
    pageSize: 10,
  });

  const { data: response, isLoading } = useQuery<DataResponse>({
    queryKey: ["deployments", pagination, sorting, columnFilters, globalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: pagination.pageIndex.toString(),
        pageSize: pagination.pageSize.toString(),
        search: globalFilter,
        sortBy: sorting[0]?.id || "priority",
        sortOrder: sorting[0]?.desc ? "desc" : "asc",
      });

      console.log({ columnFilters });

      columnFilters.forEach((filter) => {
        params.append(`${filter.id}`, String(filter.value));
      });

      const headers = {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN}`,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_API_URL}/api/tasks?${params}`,
        {
          headers,
        }
      );
      if (!res.ok) {
        throw new Error("Failed to fetch deployments");
      }
      return res.json();
    },
  });

  const updateDeploymentMutation = useMutation({
    mutationFn: async (payload: UpdateDeploymentPayload) => {
      const res = await fetch(`/api/deployments/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to update deployment");
      }
      return res.json();
    },
    onMutate: async (newDeployment) => {
      await queryClient.cancelQueries({ queryKey: ["deployments"] });

      const previousData = queryClient.getQueryData<DataResponse>([
        "deployments",
        pagination,
        sorting,
        columnFilters,
        globalFilter,
      ]);

      queryClient.setQueryData<DataResponse>(
        ["deployments", pagination, sorting, columnFilters, globalFilter],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((deployment) =>
              deployment.id === newDeployment.id
                ? { ...deployment, ...newDeployment }
                : deployment
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (err, newDeployment, context) => {
      queryClient.setQueryData(
        ["deployments", pagination, sorting, columnFilters, globalFilter],
        context?.previousData
      );
      toast("Failed to update deployment. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
    onSuccess: () => {
      toast("Deployment updated successfully.");
    },
  });

  const handleUpdate = (id: string, field: string, value: string) => {
    updateDeploymentMutation.mutate({
      id,
      [field]: value,
    });
  };

  const data = response?.data || [];
  const pageCount = response?.pagination.totalPages || 0;
  const totalCount = response?.pagination.total || 0;

  const columns: ColumnDef<Deployment>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            ID
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row, column }) => (
        <EditableCell
          value={row.original.id}
          row={row}
          column={column}
          onUpdate={handleUpdate}
        />
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row, column }) => (
        <EditableCell
          value={row.original.title}
          row={row}
          column={column}
          onUpdate={handleUpdate}
        />
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row, column }) => (
        <EditableCell
          value={row.original.status}
          row={row}
          column={column}
          type="status"
          onUpdate={handleUpdate}
        />
      ),
    },
    {
      accessorKey: "priority",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Priority
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row, column }) => (
        <EditableCell
          value={row.original.priority}
          row={row}
          column={column}
          onUpdate={handleUpdate}
        />
      ),
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Due Date
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row, column }) => (
        <EditableCell
          value={row.original.dueDate}
          row={row}
          column={column}
          onUpdate={handleUpdate}
        />
      ),
    },
    {
      accessorKey: "tags",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Tags
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row, column }) => (
        <EditableCell
          value={row.original.tags}
          row={row}
          column={column}
          type="status"
          onUpdate={handleUpdate}
        />
      ),
    },
    {
      accessorKey: "version",
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-2 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Version
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-4 w-4" />
            ) : (
              <ArrowUpDown className="h-4 w-4 opacity-50" />
            )}
          </button>
        );
      },
      cell: ({ row, column }) => (
        <EditableCell
          value={row.original.version}
          row={row}
          column={column}
          type="status"
          onUpdate={handleUpdate}
        />
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deployments..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select
          value={
            (columnFilters.find((f) => f.id === "status")?.value as string) ||
            "all"
          }
          onValueChange={(value) => {
            if (value === "all") {
              setColumnFilters((prev) => prev.filter((f) => f.id !== "status"));
            } else {
              setColumnFilters((prev) => [
                ...prev.filter((f) => f.id !== "status"),
                { id: "status", value },
              ]);
            }
          }}
        >
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="doing">Doing</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={
            (columnFilters.find((f) => f.id === "environment")
              ?.value as string) || "all"
          }
          onValueChange={(value) => {
            if (value === "all") {
              setColumnFilters((prev) =>
                prev.filter((f) => f.id !== "environment")
              );
            } else {
              setColumnFilters((prev) => [
                ...prev.filter((f) => f.id !== "environment"),
                { id: "environment", value },
              ]);
            }
          }}
        >
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Filter by environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="preview">Preview</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No deployments found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
          {Math.min(
            (pagination.pageIndex + 1) * pagination.pageSize,
            totalCount
          )}{" "}
          of {totalCount} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Page</span>
            <span className="text-sm font-medium">
              {pagination.pageIndex + 1} of {pageCount}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
