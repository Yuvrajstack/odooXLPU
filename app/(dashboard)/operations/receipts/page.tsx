"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import {
  Plus,
  ArrowDownLeft,
  Search,
  Building2,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";
import { OperationStatus } from "@/types";

interface ReceiptSummary {
  id: string;
  receiptNumber: string;
  supplierName: string;
  supplierContact: string | null;
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  status: OperationStatus;
  notes: string | null;
  receivedDate: string | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  validatedById: string | null;
  validatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lineItemsCount: number;
  totalExpectedQuantity: number;
  totalReceivedQuantity: number;
}

function ReceiptsListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);

  // URL-driven query state
  const search = searchParams.get("search") || "";
  const selectedStatus = searchParams.get("status") || "";
  const selectedWarehouse = searchParams.get("warehouseId") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== "page") {
      params.set("page", "1");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Load warehouses for filter dropdown
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await fetch("/api/warehouses");
        const data = await res.json();
        if (res.ok) setWarehouses(data);
      } catch (err) {
        console.error("Failed to load warehouses", err);
      }
    }
    loadWarehouses();
  }, []);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (search) params.append("search", search);
      if (selectedStatus) params.append("status", selectedStatus);
      if (selectedWarehouse) params.append("warehouseId", selectedWarehouse);

      const res = await fetch(`/api/receipts?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReceipts(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      }
    } catch (err) {
      console.error("Failed to load receipts", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedStatus, selectedWarehouse]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Receipts"
        description="Vendor purchase intake, receiving dock inspection, and automated stock increase."
      >
        <Link href="/operations/receipts/new">
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Create Receipt
          </Button>
        </Link>
      </PageHeader>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => updateQuery("search", e.target.value)}
            placeholder="Search receipt #, supplier, or notes..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Warehouse Filter */}
          <select
            value={selectedWarehouse}
            onChange={(e) => updateQuery("warehouseId", e.target.value)}
            className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => updateQuery("status", e.target.value)}
            className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="WAITING">Waiting</option>
            <option value="READY">Ready</option>
            <option value="DONE">Done</option>
            <option value="CANCELED">Canceled</option>
          </select>

          {(search || selectedWarehouse || selectedStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(pathname)}
              className="text-xs h-8 text-slate-500"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Receipts Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : receipts.length === 0 ? (
          <EmptyState
            icon={ArrowDownLeft}
            title="No receipts found"
            description={
              search || selectedStatus || selectedWarehouse
                ? "No receipts matched your active filter criteria."
                : "No receipts recorded yet. Create a new receipt to record incoming goods from suppliers."
            }
            actionLabel={
              search || selectedStatus || selectedWarehouse
                ? undefined
                : "Create Receipt"
            }
            onAction={
              search || selectedStatus || selectedWarehouse
                ? undefined
                : () => router.push("/operations/receipts/new")
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Receipt Number</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Destination Facility</th>
                    <th className="py-2.5 px-3">Inward Date</th>
                    <th className="py-2.5 px-3 text-center">Lines</th>
                    <th className="py-2.5 px-3 text-right">Inward Units</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Created By</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                        <Link
                          href={`/operations/receipts/${r.id}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <ArrowDownLeft className="h-3 w-3" />
                          {r.receiptNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {r.supplierName}
                        {r.supplierContact && (
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {r.supplierContact}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {r.warehouse?.name} ({r.warehouse?.code})
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {formatDate(r.receivedDate)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {r.lineItemsCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatNumber(
                          r.status === "DONE"
                            ? r.totalReceivedQuantity
                            : r.totalExpectedQuantity
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {r.createdBy?.name || "System"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link href={`/operations/receipts/${r.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-slate-900"
                            title="View Receipt"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={15}
                totalItems={totalItems}
                onPageChange={(p) => updateQuery("page", p.toString())}
                className="border-t"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading receipts...</div>}>
      <ReceiptsListContent />
    </Suspense>
  );
}
