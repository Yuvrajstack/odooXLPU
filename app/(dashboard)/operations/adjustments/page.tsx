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
  SlidersHorizontal,
  Search,
  Building2,
  Eye,
  Calendar,
  Layers,
  AlertCircle,
} from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";
import { OperationStatus } from "@/types";

interface AdjustmentSummary {
  id: string;
  adjustmentNumber: string;
  warehouseId: string;
  warehouse: { id: string; name: string; code: string };
  locationId: string;
  location: { id: string; name: string; code: string };
  reason: string;
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
  totalDifference: number;
}

function AdjustmentsListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [adjustments, setAdjustments] = useState<AdjustmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const search = searchParams.get("search") || "";
  const selectedStatus = searchParams.get("status") || "";
  const selectedWarehouse = searchParams.get("warehouseId") || "";
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

  const fetchAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedStatus) params.set("status", selectedStatus);
      if (selectedWarehouse) params.set("warehouseId", selectedWarehouse);
      params.set("page", page.toString());
      params.set("limit", "15");

      const res = await fetch(`/api/adjustments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch adjustments", e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedWarehouse, page]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ search: searchInput });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        description="Reconcile recorded system inventory with physical stock counts with mandatory reason auditing."
      >
        <Link href="/operations/adjustments/new">
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New Adjustment
          </Button>
        </Link>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-lg border shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search adjustment number, reason, notes..."
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
            value={selectedWarehouse}
            onChange={(e) => updateFilters({ warehouseId: e.target.value })}
            className="text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>

          {(search || selectedStatus || selectedWarehouse) && (
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

      {/* Adjustments Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Adjustment Ref</th>
                <th className="py-2.5 px-3">Warehouse / Location</th>
                <th className="py-2.5 px-3">Mandatory Reason</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-right">Net Difference</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading adjustments...
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12">
                    <EmptyState
                      icon={SlidersHorizontal}
                      title="No stock adjustments found"
                      description={
                        search || selectedStatus || selectedWarehouse
                          ? "Try clearing filters to find adjustments."
                          : "Perform cycle counts or reconcile damaged goods with stock adjustments."
                      }
                      actionLabel="New Adjustment"
                      onAction={() => router.push("/operations/adjustments/new")}
                    />
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      <Link
                        href={`/operations/adjustments/${adj.id}`}
                        className="hover:underline"
                      >
                        {adj.adjustmentNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 block">
                        {adj.warehouse.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {adj.location.name} ({adj.location.code})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {adj.reason}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {formatDate(adj.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">
                      {adj.lineItemsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span
                        className={
                          adj.totalDifference > 0
                            ? "text-emerald-600"
                            : adj.totalDifference < 0
                            ? "text-rose-600"
                            : "text-slate-600"
                        }
                      >
                        {adj.totalDifference > 0
                          ? `+${formatNumber(adj.totalDifference)}`
                          : formatNumber(adj.totalDifference)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={adj.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link href={`/operations/adjustments/${adj.id}`}>
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

        {!loading && adjustments.length > 0 && (
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

export default function AdjustmentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading adjustments...</div>}>
      <AdjustmentsListContent />
    </Suspense>
  );
}
