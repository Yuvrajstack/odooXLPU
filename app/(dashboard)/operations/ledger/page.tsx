"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  History,
  Search,
  Building2,
  Package,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { LedgerTransactionType } from "@/types";

interface LedgerEntryItem {
  id: string;
  productId: string;
  warehouseId: string;
  locationId: string;
  transactionType: LedgerTransactionType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  referenceType: string;
  referenceId: string;
  referenceNumber: string;
  notes: string | null;
  createdById: string;
  createdAt: string;
  product: { id: string; name: string; sku: string; uom: string };
  warehouse: { id: string; name: string; code: string };
  location: { id: string; name: string; code: string };
  createdBy: { id: string; name: string; email: string };
}

function LedgerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState<LedgerEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const search = searchParams.get("search") || "";
  const selectedType = searchParams.get("transactionType") || "";
  const selectedWarehouse = searchParams.get("warehouseId") || "";

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
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedType) params.set("transactionType", selectedType);
      if (selectedWarehouse) params.set("warehouseId", selectedWarehouse);
      params.set("limit", "100");

      const res = await fetch(`/api/ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch ledger", e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, selectedWarehouse]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilters({ search: searchInput });
  }

  function getTransactionBadge(type: LedgerTransactionType) {
    switch (type) {
      case "RECEIPT":
        return (
          <Badge variant="success" className="gap-1 font-mono text-[10px]">
            <ArrowDownLeft className="h-3 w-3" /> RECEIPT
          </Badge>
        );
      case "DELIVERY":
        return (
          <Badge variant="destructive" className="gap-1 font-mono text-[10px]">
            <ArrowUpRight className="h-3 w-3" /> DELIVERY
          </Badge>
        );
      case "TRANSFER_IN":
        return (
          <Badge variant="info" className="gap-1 font-mono text-[10px]">
            <ArrowLeftRight className="h-3 w-3" /> TRANSFER_IN
          </Badge>
        );
      case "TRANSFER_OUT":
        return (
          <Badge variant="warning" className="gap-1 font-mono text-[10px]">
            <ArrowLeftRight className="h-3 w-3" /> TRANSFER_OUT
          </Badge>
        );
      case "ADJUSTMENT":
        return (
          <Badge variant="secondary" className="gap-1 font-mono text-[10px] bg-purple-100 text-purple-800 border-purple-200">
            <SlidersHorizontal className="h-3 w-3 text-purple-600" /> ADJUSTMENT
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  }

  function getDocumentLink(entry: LedgerEntryItem) {
    switch (entry.referenceType) {
      case "RECEIPT":
        return `/operations/receipts/${entry.referenceId}`;
      case "DELIVERY":
        return `/operations/deliveries/${entry.referenceId}`;
      case "TRANSFER":
        return `/operations/transfers/${entry.referenceId}`;
      case "ADJUSTMENT":
        return `/operations/adjustments/${entry.referenceId}`;
      default:
        return "#";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Ledger (Move History)"
        description="Append-only, immutable inventory movement history. Preserves complete historical audit trail across all transactions."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLedger}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Ledger
        </Button>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-lg border shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reference, product, SKU, notes..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full text-xs h-9 pl-9 pr-3 rounded-md border border-slate-200 bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => updateFilters({ transactionType: e.target.value })}
            className="text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Movement Types</option>
            <option value="RECEIPT">Receipt (Incoming)</option>
            <option value="DELIVERY">Delivery (Outgoing)</option>
            <option value="TRANSFER_IN">Transfer In</option>
            <option value="TRANSFER_OUT">Transfer Out</option>
            <option value="ADJUSTMENT">Stock Adjustment</option>
          </select>

          <select
            value={selectedWarehouse}
            onChange={(e) => updateFilters({ warehouseId: e.target.value })}
            className="text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">All Facilities</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>

          {(search || selectedType || selectedWarehouse) && (
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

      {/* Ledger Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3 min-w-[140px]">Timestamp</th>
                <th className="py-2.5 px-3 min-w-[200px]">Product / SKU</th>
                <th className="py-2.5 px-3 min-w-[160px]">Facility & Location</th>
                <th className="py-2.5 px-3 min-w-[120px]">Movement Type</th>
                <th className="py-2.5 px-3 min-w-[130px]">Reference Doc</th>
                <th className="py-2.5 px-3 text-right">Before</th>
                <th className="py-2.5 px-3 text-right">Delta</th>
                <th className="py-2.5 px-3 text-right">After</th>
                <th className="py-2.5 px-3 min-w-[120px]">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading Stock Ledger history...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12">
                    <EmptyState
                      icon={History}
                      title="No stock movements recorded"
                      description={
                        search || selectedType || selectedWarehouse
                          ? "Try adjusting your search or filter parameters."
                          : "Stock ledger records are created automatically whenever you validate receipts, deliveries, transfers, or adjustments."
                      }
                    />
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="py-2.5 px-3">
                      <Link
                        href={`/products/${entry.product.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 block"
                      >
                        {entry.product.name}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {entry.product.sku} • {entry.product.uom}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <span className="font-semibold">{entry.warehouse.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Location: {entry.location.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {getTransactionBadge(entry.transactionType)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      <Link href={getDocumentLink(entry)} className="hover:underline">
                        {entry.referenceNumber}
                      </Link>
                      {entry.notes && (
                        <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[150px]">
                          {entry.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatNumber(entry.quantityBefore)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span
                        className={
                          entry.quantityChange > 0
                            ? "text-emerald-600"
                            : entry.quantityChange < 0
                            ? "text-rose-600"
                            : "text-slate-600"
                        }
                      >
                        {entry.quantityChange > 0
                          ? `+${formatNumber(entry.quantityChange)}`
                          : formatNumber(entry.quantityChange)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatNumber(entry.quantityAfter)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {entry.createdBy.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && entries.length > 0 && (
          <div className="p-3 border-t bg-slate-50/50 text-xs text-muted-foreground">
            Total Movements Displayed: <strong>{entries.length}</strong> immutable audit entries
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockLedgerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading ledger...</div>}>
      <LedgerContent />
    </Suspense>
  );
}
