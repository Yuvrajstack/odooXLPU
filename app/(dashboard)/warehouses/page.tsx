"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Eye,
  Edit2,
  AlertCircle,
} from "lucide-react";
import { WarehouseFormData, warehouseSchema } from "@/lib/validations/warehouse";
import { formatNumber } from "@/lib/utils";

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  active: boolean;
  locationsCount: number;
  activeLocationsCount: number;
  totalProducts: number;
  totalStock: number;
  updatedAt: string;
  createdAt: string;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const res = await fetch(`/api/warehouses?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setWarehouses(data);
      }
    } catch (err) {
      console.error("Failed to load warehouses", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "",
      active: true,
    });
    setFormErrors({});
    setApiError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (wh: WarehouseItem) => {
    setEditingWarehouse(wh);
    setFormData({
      name: wh.name,
      code: wh.code,
      address: wh.address || "",
      city: wh.city || "",
      state: wh.state || "",
      country: wh.country || "",
      active: wh.active,
    });
    setFormErrors({});
    setApiError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setApiError(null);

    const parsed = warehouseSchema.safeParse(formData);
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
      const url = editingWarehouse
        ? `/api/warehouses/${editingWarehouse.id}`
        : "/api/warehouses";
      const method = editingWarehouse ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to save warehouse");
      }

      setDialogOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses & Facilities"
        description="Physical multi-warehouse facilities, internal zones, and location topologies."
      >
        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Warehouse
        </Button>
      </PageHeader>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search warehouse by name, code, or city..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Warehouses Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : warehouses.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No warehouses found"
            description={
              search
                ? "No warehouses match your search query."
                : "No warehouse facilities registered yet. Create one to organize your inventory storage locations."
            }
            actionLabel={search ? undefined : "Create Warehouse"}
            onAction={search ? undefined : handleOpenCreate}
          />
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Warehouse Name</th>
                <th className="py-2.5 px-3">Location / City</th>
                <th className="py-2.5 px-3 text-center">Locations</th>
                <th className="py-2.5 px-3 text-center">Products Stored</th>
                <th className="py-2.5 px-3 text-right">Total Units</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {warehouses.map((wh) => (
                <tr key={wh.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                    <Link href={`/warehouses/${wh.id}`} className="hover:underline">
                      {wh.code}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <Link href={`/warehouses/${wh.id}`} className="hover:text-blue-600">
                      {wh.name}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {wh.city ? `${wh.city}${wh.state ? `, ${wh.state}` : ""}` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    <span className="font-semibold text-slate-900">
                      {wh.locationsCount}
                    </span>{" "}
                    <span className="text-[10px] text-muted-foreground">zones</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    <span className="font-semibold text-slate-900">
                      {wh.totalProducts}
                    </span>{" "}
                    <span className="text-[10px] text-muted-foreground">SKUs</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatNumber(wh.totalStock)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {wh.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/warehouses/${wh.id}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-900"
                          title="View Warehouse Detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-slate-900"
                        onClick={() => handleOpenEdit(wh)}
                        title="Edit Warehouse"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Warehouse Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? "Edit Warehouse" : "Create Warehouse Facility"}
            </DialogTitle>
          </DialogHeader>

          {apiError && (
            <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Warehouse Code <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. WH-MAIN, WH-PROD"
                  className="font-mono uppercase text-xs"
                  disabled={submitting}
                />
                {formErrors.code && (
                  <p className="text-[11px] text-rose-600">{formErrors.code}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Facility Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Main Distribution Center"
                  className="text-xs"
                  disabled={submitting}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600">{formErrors.name}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Street Address
              </label>
              <Input
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="e.g. 100 Industrial Pkwy"
                className="text-xs"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">City</label>
                <Input
                  value={formData.city || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                  className="text-xs"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">State</label>
                <Input
                  value={formData.state || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="State"
                  className="text-xs"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Country</label>
                <Input
                  value={formData.country || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  placeholder="Country"
                  className="text-xs"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wh-active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="wh-active" className="text-xs text-slate-700 font-medium">
                Active facility
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
                {submitting ? "Saving..." : editingWarehouse ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
