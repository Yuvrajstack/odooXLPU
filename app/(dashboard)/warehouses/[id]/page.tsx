"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  MapPin,
  Package,
  Layers,
  Plus,
  ArrowLeft,
  Eye,
  AlertCircle,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { LocationFormData, locationSchema } from "@/lib/validations/location";

interface LocationItem {
  id: string;
  warehouseId: string;
  name: string;
  code: string;
  type: string;
  active: boolean;
  productsCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseDetailData {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  active: boolean;
  totalLocations: number;
  productsStoredCount: number;
  totalUnits: number;
  locations: LocationItem[];
  createdAt: string;
  updatedAt: string;
}

export default function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [warehouse, setWarehouse] = useState<WarehouseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Location Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>({
    warehouseId: id,
    name: "",
    code: "",
    type: "RACK",
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchWarehouse = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/warehouses/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load warehouse");
      }
      setWarehouse(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWarehouse();
  }, [fetchWarehouse]);

  const handleOpenAddLocation = () => {
    setFormData({
      warehouseId: id,
      name: "",
      code: "",
      type: "RACK",
      active: true,
    });
    setFormErrors({});
    setApiError(null);
    setDialogOpen(true);
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setApiError(null);

    const parsed = locationSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/warehouses/${id}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create location");
      }

      setDialogOpen(false);
      fetchWarehouse();
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !warehouse) {
    return (
      <div className="space-y-4">
        <Link href="/warehouses">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Warehouses
          </Button>
        </Link>
        <EmptyState
          icon={Building2}
          title="Warehouse not found"
          description={error || "The requested warehouse could not be located."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/warehouses"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Warehouses
        </Link>
        <PageHeader
          title={warehouse.name}
          description={`Code: ${warehouse.code} • ${
            warehouse.city
              ? `${warehouse.city}, ${warehouse.state || ""} ${warehouse.country || ""}`
              : "No physical address specified"
          }`}
        >
          <Badge variant={warehouse.active ? "success" : "secondary"}>
            {warehouse.active ? "Active Facility" : "Inactive"}
          </Badge>
          <Button size="sm" onClick={handleOpenAddLocation} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Location
          </Button>
        </PageHeader>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Sub-Locations"
          value={warehouse.totalLocations}
          description="Racks, bins, and staging areas"
          icon={MapPin}
        />
        <StatCard
          title="Distinct SKUs Stored"
          value={warehouse.productsStoredCount}
          description="Unique catalog items"
          icon={Package}
        />
        <StatCard
          title="Total Physical Units"
          value={formatNumber(warehouse.totalUnits)}
          description="Total physical items in warehouse"
          icon={Layers}
        />
      </div>

      {/* Locations Table */}
      <div className="rounded-lg border bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Storage Locations & Zones
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specific zones within {warehouse.name} where inventory is tracked.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleOpenAddLocation} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> New Zone
          </Button>
        </div>

        {warehouse.locations.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No locations configured"
            description="Add racks, shelves, bins, or staging areas to start placing inventory into this warehouse."
            actionLabel="Add First Location"
            onAction={handleOpenAddLocation}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Location Name</th>
                  <th className="py-2.5 px-3">Location Code</th>
                  <th className="py-2.5 px-3">Zone Type</th>
                  <th className="py-2.5 px-3 text-center">Products</th>
                  <th className="py-2.5 px-3 text-right">Physical Quantity</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {warehouse.locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <Link
                        href={`/warehouses/${warehouse.id}/locations/${loc.id}`}
                        className="hover:text-blue-600"
                      >
                        {loc.name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      <Link
                        href={`/warehouses/${warehouse.id}/locations/${loc.id}`}
                        className="hover:underline"
                      >
                        {loc.code}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {loc.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {loc.productsCount} SKUs
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatNumber(loc.totalQuantity)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {loc.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link href={`/warehouses/${warehouse.id}/locations/${loc.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-900"
                          title="View Location Inventory"
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
        )}
      </div>

      {/* Add Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Location to {warehouse.name}</DialogTitle>
          </DialogHeader>

          {apiError && (
            <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleCreateLocation} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Location Code <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g. LOC-RACK-A, BIN-01"
                className="font-mono uppercase text-xs"
                disabled={submitting}
              />
              {formErrors.code && (
                <p className="text-[11px] text-rose-600">{formErrors.code}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Location Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Rack A - High Bay"
                className="text-xs"
                disabled={submitting}
              />
              {formErrors.name && (
                <p className="text-[11px] text-rose-600">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Zone / Storage Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e: any) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full h-9 px-2.5 text-xs border rounded-md bg-transparent"
                disabled={submitting}
              >
                <option value="RACK">Rack</option>
                <option value="SHELF">Shelf</option>
                <option value="BIN">Bin</option>
                <option value="PALLET">Pallet Location</option>
                <option value="FLOOR">Floor / Bulk Staging</option>
                <option value="INCOMING">Inbound Receiving Area</option>
                <option value="OUTGOING">Outbound Shipping Area</option>
                <option value="PRODUCTION">Production / Work-in-Progress</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="loc-active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="loc-active" className="text-xs text-slate-700 font-medium">
                Active zone
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Creating..." : "Create Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
