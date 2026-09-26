"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  MapPin,
  AlertTriangle,
  History,
  ArrowLeft,
  Calendar,
  DollarSign,
  Boxes,
} from "lucide-react";
import { formatNumber, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { StockStatus } from "@/types";

interface ProductDetailData {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
    code: string;
  };
  uom: string;
  reorderPoint: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  costPrice: number;
  sellingPrice: number;
  active: boolean;
  totalStock: number;
  stockStatus: StockStatus;
  locationsCount: number;
  createdAt: string;
  updatedAt: string;
  inventories: Array<{
    id: string;
    quantity: number;
    reservedQuantity: number;
    warehouse: {
      id: string;
      name: string;
      code: string;
    };
    location: {
      id: string;
      name: string;
      code: string;
      type: string;
    };
  }>;
  ledgerEntries: Array<{
    id: string;
    transactionType: string;
    quantityBefore: number;
    quantityChange: number;
    quantityAfter: number;
    referenceType: string;
    referenceNumber: string;
    createdAt: string;
    warehouse: { name: string; code: string };
    location: { name: string; code: string };
    createdBy: { name: string; email: string };
  }>;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load product");
        }
        setProduct(data);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <Link href="/products">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Button>
        </Link>
        <EmptyState
          icon={AlertTriangle}
          title="Product not found"
          description={error || "The requested product does not exist or may have been deleted."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Products Catalog
        </Link>
        <PageHeader
          title={`${product.name}`}
          description={`SKU: ${product.sku} • Category: ${product.category?.name}`}
        >
          <StatusBadge status={product.stockStatus} />
        </PageHeader>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Stock on Hand"
          value={`${formatNumber(product.totalStock)} ${product.uom}`}
          description="Sum of quantities across all sites"
          icon={Package}
        />
        <StatCard
          title="Storage Locations"
          value={product.locationsCount}
          description="Locations with recorded balances"
          icon={MapPin}
        />
        <StatCard
          title="Reorder Point"
          value={`${formatNumber(product.reorderPoint)} ${product.uom}`}
          description={`Min: ${product.minStockLevel || 0} • Max: ${product.maxStockLevel || "—"}`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Inventory Status"
          value={
            product.stockStatus === "IN_STOCK"
              ? "In Stock"
              : product.stockStatus === "LOW_STOCK"
              ? "Low Stock"
              : "Out of Stock"
          }
          changeType={
            product.stockStatus === "IN_STOCK"
              ? "positive"
              : product.stockStatus === "LOW_STOCK"
              ? "warning"
              : "negative"
          }
          change={
            product.totalStock <= product.reorderPoint
              ? "Action Needed"
              : "Healthy"
          }
          description="Automated rule calculation"
          icon={Boxes}
        />
      </div>

      {/* Two Column Layout: Stock by Location & Product Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Stock by Location */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Physical Stock by Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.inventories.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="No location inventory"
                  description="This product currently has zero recorded quantities across warehouse locations."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Warehouse</th>
                        <th className="py-2.5 px-3">Location Code</th>
                        <th className="py-2.5 px-3">Zone Type</th>
                        <th className="py-2.5 px-3 text-right">Physical On Hand</th>
                        <th className="py-2.5 px-3 text-right">Reserved</th>
                        <th className="py-2.5 px-3 text-right">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {product.inventories.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {inv.warehouse.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                            {inv.location.name} ({inv.location.code})
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {inv.location.type}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatNumber(inv.quantity)} {product.uom}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {formatNumber(inv.reservedQuantity)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                            {formatNumber(inv.quantity - inv.reservedQuantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Stock Movements (from StockLedger) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Recent Stock Movements (Ledger Audit)
              </CardTitle>
              <Link
                href="/operations/ledger"
                className="text-xs text-blue-600 hover:underline"
              >
                View full ledger
              </Link>
            </CardHeader>
            <CardContent>
              {product.ledgerEntries.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No stock movements recorded"
                  description="Transactions (Receipts, Deliveries, Transfers, Adjustments) for this SKU will appear here once validated."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Reference</th>
                        <th className="py-2 px-3">Location</th>
                        <th className="py-2 px-3 text-right">Delta</th>
                        <th className="py-2 px-3 text-right">Balance After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {product.ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 text-slate-500">
                            {formatDateTime(entry.createdAt)}
                          </td>
                          <td className="py-2 px-3 font-sans font-semibold text-slate-700">
                            {entry.transactionType}
                          </td>
                          <td className="py-2 px-3 text-blue-600">
                            {entry.referenceNumber}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600">
                            {entry.warehouse.code} • {entry.location.code}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-bold ${
                              entry.quantityChange >= 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {entry.quantityChange >= 0 ? "+" : ""}
                            {formatNumber(entry.quantityChange)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatNumber(entry.quantityAfter)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Product Information */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Product Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold text-slate-900">
                  {product.category?.name} ({product.category?.code})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">SKU / Code</span>
                <span className="font-mono font-bold text-blue-600">
                  {product.sku}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Unit of Measure</span>
                <span className="font-mono font-medium text-slate-900">
                  {product.uom}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Cost Price</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(product.costPrice)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Selling Price</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatCurrency(product.sellingPrice)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Catalog Status</span>
                <span>
                  {product.active ? (
                    <span className="text-emerald-700 font-semibold">Active</span>
                  ) : (
                    <span className="text-slate-400 font-semibold">Inactive</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Created</span>
                <span className="text-slate-600">{formatDate(product.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="text-slate-600">{formatDate(product.updatedAt)}</span>
              </div>

              {product.description && (
                <div className="pt-2 border-t text-muted-foreground">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Notes & Description:
                  </span>
                  <p className="text-[11px] leading-relaxed">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
