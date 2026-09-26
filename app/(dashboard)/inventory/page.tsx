"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import {
  Boxes,
  Search,
  Building2,
  Package,
  Filter,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { StockStatus } from "@/types";

interface InventoryRow {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  categoryId: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  locationType: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  uom: string;
  reorderPoint: number;
  status: StockStatus;
  updatedAt: string;
}

function InventoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; code: string }>>([]);

  // URL Query Parameters
  const search = searchParams.get("search") || "";
  const selectedWarehouse = searchParams.get("warehouseId") || "";
  const selectedCategory = searchParams.get("categoryId") || "";
  const selectedStatus = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Helper to update URL query params
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

  // Load dropdown options
  useEffect(() => {
    async function loadFilters() {
      try {
        const [catRes, whRes] = await Promise.all([
          fetch("/api/categories?limit=100"),
          fetch("/api/warehouses"),
        ]);
        const catData = await catRes.json();
        const whData = await whRes.json();
        if (catRes.ok && catData.items) setCategories(catData.items);
        if (whRes.ok) setWarehouses(whData);
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadFilters();
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
      });
      if (search) params.append("search", search);
      if (selectedWarehouse) params.append("warehouseId", selectedWarehouse);
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (selectedStatus) params.append("status", selectedStatus);

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      }
    } catch (err) {
      console.error("Failed to load inventory", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedWarehouse, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Balances Overview"
        description="Comprehensive real-time inventory balances by product, warehouse facility, and storage location."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchInventory()}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </PageHeader>

      {/* Filter / Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-surface">
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => updateQuery("search", e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          {/* Warehouse Filter */}
          <select
            value={selectedWarehouse}
            onChange={(e) => updateQuery("warehouseId", e.target.value)}
            className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => updateQuery("categoryId", e.target.value)}
            className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => updateQuery("status", e.target.value)}
            className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          {(search || selectedWarehouse || selectedCategory || selectedStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(pathname)}
              className="text-xs h-8 text-slate-500"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory records found"
            description="No inventory matches the selected criteria. Adjust your filters or select a different warehouse."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Warehouse</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-right">Physical On Hand</th>
                    <th className="py-2.5 px-3 text-right">Reserved</th>
                    <th className="py-2.5 px-3 text-right">Available</th>
                    <th className="py-2.5 px-3">UOM</th>
                    <th className="py-2.5 px-3 text-right">Reorder Pt</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                        <Link href={`/products/${row.productId}`} className="hover:underline">
                          {row.sku}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <Link href={`/products/${row.productId}`} className="hover:text-blue-600">
                          {row.productName}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {row.categoryName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <Link
                          href={`/warehouses/${row.warehouseId}`}
                          className="hover:underline"
                        >
                          {row.warehouseName}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        <Link
                          href={`/warehouses/${row.warehouseId}/locations/${row.locationId}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {row.locationName}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatNumber(row.quantity)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatNumber(row.reservedQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                        {formatNumber(row.availableQuantity)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {row.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatNumber(row.reorderPoint)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={row.status} />
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
                pageSize={25}
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

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading inventory balances...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
