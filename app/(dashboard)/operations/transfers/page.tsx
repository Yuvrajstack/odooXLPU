"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Plus,
  ArrowLeftRight,
  Search,
  Building2,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";
import { OperationStatus } from "@/types";

interface TransferSummary {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouse: { id: string; name: string; code: string };
  destinationWarehouseId: string;
  destinationWarehouse: { id: string; name: string; code: string };
  sourceLocationId: string;
  sourceLocation: { id: string; name: string; code: string };
  destinationLocationId: string;
  destinationLocation: { id: string; name: string; code: string };
  status: OperationStatus;
  notes: string | null;
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  validatedById: string | null;
  validatedBy: { id: string; name: string; email: string } | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lineItemsCount: number;
  totalQuantity: number;
}

function TransfersListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [transfers, setTransfers] = useState<TransferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const search = searchParams.get("search") || "";
  const selectedStatus = searchParams.get("status") || "";
  const selectedSourceWh = searchParams.get("sourceWarehouseId") || "";
  const selectedDestWh = searchParams.get("destinationWarehouseId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await fetch("/api/warehouses");
        if (res.ok) {
          const data = await res.json();
          setWarehouses(data);
        }
      } catch (e) {
        console.error("Failed to load warehouses", e);
      }
    }
    loadWarehouses();
  }, []);

  const updateFilters = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedStatus) params.set("status", selectedStatus);
      if (selectedSourceWh) params.set("sourceWarehouseId", selectedSourceWh);
      if (selectedDestWh) params.set("destinationWarehouseId", selectedDestWh);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/transfers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch transfers", e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedSourceWh, selectedDestWh, page]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ search: searchInput });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Stock Transfers"
        description="Move inventory between warehouse storage locations. Enforces atomic source decrement, destination increment, and zero net stock balance."
      >
        <Link href="/operations/transfers/new">
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Create Transfer
          </Button>
        </Link>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-lg border shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transfer number, notes..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full text-xs h-9 pl-9 pr-3 rounded-md border border-slate-200 bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="WAITING">Waiting</option>
            <option value="READY">Ready</option>
            <option value="DONE">Done</option>
            <option value="CANCELED">Canceled</option>
          </select>

          <select
            value={selectedSourceWh}
            onChange={(e) => updateFilters({ sourceWarehouseId: e.target.value })}
            className="text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Source Warehouse (All)</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                From: {w.name} ({w.code})
              </option>
            ))}
          </select>

          <select
            value={selectedDestWh}
            onChange={(e) => updateFilters({ destinationWarehouseId: e.target.value })}
            className="text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Dest Warehouse (All)</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                To: {w.name} ({w.code})
              </option>
            ))}
          </select>

          {(search || selectedStatus || selectedSourceWh || selectedDestWh) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                router.push(pathname);
              }}
              className="text-xs h-9 text-slate-600"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Transfers Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Transfer Ref</th>
                <th className="py-2.5 px-3">Origin Location</th>
                <th className="py-2.5 px-3"></th>
                <th className="py-2.5 px-3">Destination Location</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-right">Total Units</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading internal transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12">
                    <EmptyState
                      icon={ArrowLeftRight}
                      title="No internal transfers found"
                      description={
                        search || selectedStatus || selectedSourceWh || selectedDestWh
                          ? "Try clearing filters to find transfer orders."
                          : "Create your first internal stock transfer to move inventory between locations."
                      }
                      actionLabel="Create Transfer"
                      onAction={() => router.push("/operations/transfers/new")}
                    />
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      <Link
                        href={`/operations/transfers/${transfer.id}`}
                        className="hover:underline"
                      >
                        {transfer.transferNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div>{transfer.sourceLocation.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {transfer.sourceWarehouse.name} ({transfer.sourceLocation.code})
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-400 text-center">
                      <ArrowRight className="h-3.5 w-3.5 mx-auto text-slate-400" />
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div>{transfer.destinationLocation.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {transfer.destinationWarehouse.name} ({transfer.destinationLocation.code})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">
                      {transfer.lineItemsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatNumber(transfer.totalQuantity)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {formatDate(transfer.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={transfer.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link href={`/operations/transfers/${transfer.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && transfers.length > 0 && (
          <div className="p-3 border-t bg-slate-50/50 flex items-center justify-between">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={15}
              totalItems={totalItems}
              onPageChange={(p) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", p.toString());
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransfersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading transfers...</div>}>
      <TransfersListContent />
    </Suspense>
  );
}
