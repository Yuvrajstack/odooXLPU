"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Package, Layers, ArrowLeft } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { StockStatus } from "@/types";

interface LocationInventoryItem {
  inventoryId: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  uom: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  status: StockStatus;
}

interface LocationDetailData {
  id: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  totalItemsCount: number;
  totalUnits: number;
  items: LocationInventoryItem[];
}

export default function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const { id: warehouseId, locationId } = use(params);
  const [location, setLocation] = useState<LocationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLocation() {
      try {
        setLoading(true);
        const res = await fetch(`/api/locations/${locationId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load location");
        }
        setLocation(data);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    loadLocation();
  }, [locationId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="space-y-4">
        <Link href={`/warehouses/${warehouseId}`}>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Warehouse
          </Button>
        </Link>
        <EmptyState
          icon={MapPin}
          title="Location not found"
          description={error || "The requested location could not be found."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/warehouses/${warehouseId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {location.warehouse?.name}
        </Link>
        <PageHeader
          title={`${location.name} (${location.code})`}
          description={`Facility: ${location.warehouse?.name} (${location.warehouse?.code}) • Type: ${location.type}`}
        >
          <Badge variant={location.active ? "success" : "secondary"}>
            {location.active ? "Active Zone" : "Inactive"}
          </Badge>
        </PageHeader>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Distinct SKUs Stored"
          value={location.totalItemsCount}
          description="Products with recorded balance at this location"
          icon={Package}
        />
        <StatCard
          title="Total Units on Hand"
          value={formatNumber(location.totalUnits)}
          description="Physical count across all items in zone"
          icon={Layers}
        />
      </div>

      {/* Current Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-slate-900">
              Current Inventory at Location
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Physical inventory count on hand and available balances.
            </p>
          </div>

          {location.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Package}
                title="Location is empty"
                description="No products currently have stock recorded at this storage location."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Physical On Hand</th>
                    <th className="py-2.5 px-3 text-right">Reserved</th>
                    <th className="py-2.5 px-3 text-right">Available</th>
                    <th className="py-2.5 px-3">UOM</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {location.items.map((item) => (
                    <tr key={item.inventoryId} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                        <Link href={`/products/${item.productId}`} className="hover:underline">
                          {item.sku}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <Link href={`/products/${item.productId}`} className="hover:text-blue-600">
                          {item.productName}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.categoryName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatNumber(item.reservedQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                        {formatNumber(item.availableQuantity)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {item.uom}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <StatusBadge status={item.status} />
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
  );
}
