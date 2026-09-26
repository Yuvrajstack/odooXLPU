"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  Package,
  MapPin,
  Save,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { createAdjustmentSchema } from "@/lib/validations/adjustment";

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  locations: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
  }>;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface AdjustmentLineItem {
  id: string;
  productId: string;
  systemQuantity: number;
  physicalQuantity: number;
  notes: string;
}

export default function NewAdjustmentPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form State
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<AdjustmentLineItem[]>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingOptions(true);
        const [whRes, prodRes] = await Promise.all([
          fetch("/api/warehouses"),
          fetch("/api/products?limit=100"),
        ]);

        const whData = await whRes.json();
        const prodData = await prodRes.json();

        if (whRes.ok && whData) {
          const detailed = await Promise.all(
            whData.map(async (wh: any) => {
              const res = await fetch(`/api/warehouses/${wh.id}`);
              return res.ok ? await res.json() : wh;
            })
          );
          setWarehouses(detailed);

          if (detailed.length > 0) {
            setWarehouseId(detailed[0].id);
            if (detailed[0].locations.length > 0) {
              setLocationId(detailed[0].locations[0].id);
            }
          }
        }

        if (prodRes.ok && prodData.items) {
          setProducts(prodData.items);
        }
      } catch (e) {
        console.error("Failed to load options", e);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadData();
  }, []);

  const activeWarehouse = warehouses.find((w) => w.id === warehouseId);

  // Fetch real current inventory balance for product at location
  async function fetchStockForProduct(prodId: string, locId: string): Promise<number> {
    if (!prodId || !locId) return 0;
    try {
      const res = await fetch(`/api/inventory?productId=${prodId}&locationId=${locId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items[0].quantity || 0;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 0;
  }

  async function handleAddLine() {
    const defaultProduct = products[0]?.id || "";
    const sysQty = await fetchStockForProduct(defaultProduct, locationId);

    const newLine: AdjustmentLineItem = {
      id: Math.random().toString(36).substring(2, 9),
      productId: defaultProduct,
      systemQuantity: sysQty,
      physicalQuantity: sysQty,
      notes: "",
    };
    setLines([...lines, newLine]);
  }

  function handleRemoveLine(index: number) {
    const updated = [...lines];
    updated.splice(index, 1);
    setLines(updated);
  }

  async function handleProductChange(index: number, newProductId: string) {
    const sysQty = await fetchStockForProduct(newProductId, locationId);
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      productId: newProductId,
      systemQuantity: sysQty,
      physicalQuantity: sysQty,
    };
    setLines(updated);
  }

  function handleLineChange(
    index: number,
    field: keyof AdjustmentLineItem,
    value: any
  ) {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErrors({});
    setApiError(null);

    const payload = {
      warehouseId,
      locationId,
      reason,
      notes: notes || null,
      items: lines.map((l) => ({
        productId: l.productId,
        systemQuantity: Number(l.systemQuantity),
        physicalQuantity: Number(l.physicalQuantity),
        notes: l.notes || null,
      })),
    };

    const result = createAdjustmentSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const path = err.path.join(".");
        fieldErrors[path] = err.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create adjustment");
      }

      router.push(`/operations/adjustments/${data.id}`);
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/operations/adjustments">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Adjustments
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Create Stock Adjustment / Count"
        description="Fix mismatches between recorded system inventory and physical counts. Requires mandatory justification."
      />

      {apiError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information Card */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Target Location & Mandatory Justification
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Warehouse Facility <span className="text-rose-500">*</span>
              </label>
              <select
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  const wh = warehouses.find((w) => w.id === e.target.value);
                  if (wh && wh.locations.length > 0) {
                    setLocationId(wh.locations[0].id);
                  }
                }}
                className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-800"
                required
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Storage Location <span className="text-rose-500">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-800"
                required
              >
                {activeWarehouse?.locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code}) [{loc.type}]
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Mandatory Reason / Justification <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Annual physical cycle count discrepancy; Damaged water pipe leak in Bin C-14."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              {formErrors.reason && (
                <p className="text-[11px] text-rose-600">{formErrors.reason}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Additional Auditor Notes
              </label>
              <Input
                placeholder="Optional inspection details or auditor reference number"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Line Items Card */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Physical Count & Quantity Reconciliation
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="gap-1.5 text-xs h-8"
              disabled={loadingOptions || products.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product Line
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {formErrors.items && (
              <p className="text-xs text-rose-600 font-medium">{formErrors.items}</p>
            )}

            {lines.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-dashed rounded-lg bg-slate-50/50">
                <SlidersHorizontal className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  No items added for reconciliation yet.
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Click "Add Product Line" above to select a product and input physical counted quantities.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="mt-3 gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add First Product
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[240px]">Product / SKU</th>
                      <th className="py-2.5 px-3 w-28 text-right">System Qty</th>
                      <th className="py-2.5 px-3 w-32 text-right">Counted / Physical Qty</th>
                      <th className="py-2.5 px-3 w-28 text-right">Difference</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Notes</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {lines.map((line, idx) => {
                      const diff = Number(line.physicalQuantity) - Number(line.systemQuantity);

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <select
                              value={line.productId}
                              onChange={(e) =>
                                handleProductChange(idx, e.target.value)
                              }
                              className="w-full text-xs h-8 rounded border border-slate-200 bg-white px-2 text-slate-800"
                              required
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}) [{p.uom}]
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-600">
                            {line.systemQuantity}
                          </td>

                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={line.physicalQuantity}
                              onChange={(e) =>
                                handleLineChange(
                                  idx,
                                  "physicalQuantity",
                                  e.target.value
                                )
                              }
                              className="h-8 text-right font-mono font-bold"
                              required
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span
                              className={
                                diff > 0
                                  ? "text-emerald-600"
                                  : diff < 0
                                  ? "text-rose-600"
                                  : "text-slate-500"
                              }
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <Input
                              placeholder="Line note"
                              value={line.notes}
                              onChange={(e) =>
                                handleLineChange(idx, "notes", e.target.value)
                              }
                              className="h-8 text-xs"
                            />
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Remove Line"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/operations/adjustments">
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            className="gap-1.5"
            disabled={submitting || lines.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Creating Adjustment...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Adjustment (Draft)
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
