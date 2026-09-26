"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ArrowRight,
  Save,
  Loader2,
  ArrowLeftRight,
  AlertTriangle,
  Layers,
  MapPin,
} from "lucide-react";
import { createTransferSchema } from "@/lib/validations/transfer";
import { formatNumber } from "@/lib/utils";

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

interface TransferLineItem {
  id: string;
  productId: string;
  quantity: number;
  notes: string;
}

export default function NewTransferPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form State
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLineItem[]>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 1. Load Warehouses and Products
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
            setSourceWarehouseId(detailed[0].id);
            setDestinationWarehouseId(detailed[0].id);

            if (detailed[0].locations.length > 0) {
              setSourceLocationId(detailed[0].locations[0].id);
              if (detailed[0].locations.length > 1) {
                setDestinationLocationId(detailed[0].locations[1].id);
              } else {
                setDestinationLocationId(detailed[0].locations[0].id);
              }
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

  // 2. Load stock balances for source and destination warehouses
  useEffect(() => {
    if (!sourceWarehouseId && !destinationWarehouseId) return;

    async function loadInventory() {
      try {
        const whIds = Array.from(new Set([sourceWarehouseId, destinationWarehouseId].filter(Boolean)));
        const map: Record<string, number> = {};

        for (const whId of whIds) {
          const res = await fetch(`/api/inventory?warehouseId=${whId}&limit=100`);
          if (res.ok) {
            const data = await res.json();
            if (data.items) {
              data.items.forEach((item: any) => {
                const key = `${item.productId}_${item.locationId}`;
                map[key] = item.availableQuantity ?? item.quantity ?? 0;
              });
            }
          }
        }

        setInventoryMap(map);
      } catch (e) {
        console.error("Failed to load inventory balances", e);
      }
    }

    loadInventory();
  }, [sourceWarehouseId, destinationWarehouseId]);

  const activeSourceWarehouse = warehouses.find((w) => w.id === sourceWarehouseId);
  const activeDestWarehouse = warehouses.find((w) => w.id === destinationWarehouseId);

  // Helper to query balance at specific location
  function getStock(productId: string, locationId: string): number {
    return inventoryMap[`${productId}_${locationId}`] ?? 0;
  }

  function handleAddLine() {
    const defaultProduct = products[0]?.id || "";
    const newLine: TransferLineItem = {
      id: Math.random().toString(36).substring(2, 9),
      productId: defaultProduct,
      quantity: 1,
      notes: "",
    };
    setLines([...lines, newLine]);
  }

  function handleRemoveLine(index: number) {
    const updated = [...lines];
    updated.splice(index, 1);
    setLines(updated);
  }

  function handleLineChange(
    index: number,
    field: keyof TransferLineItem,
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
      sourceWarehouseId,
      destinationWarehouseId,
      sourceLocationId,
      destinationLocationId,
      notes: notes || null,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        notes: l.notes || null,
      })),
    };

    const result = createTransferSchema.safeParse(payload);
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
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create transfer order");
      }

      router.push(`/operations/transfers/${data.id}`);
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  const isSameLocation = Boolean(
    sourceLocationId &&
      destinationLocationId &&
      sourceLocationId === destinationLocationId
  );
  const totalUnits = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
    [lines]
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/operations/transfers">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Transfers
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Create Internal Stock Transfer"
        description="Transfer physical goods between warehouse locations or cross-warehouse facilities with zero net stock impact."
      />

      {apiError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-800">Submission Error</p>
            <p className="mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {isSameLocation && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Invalid Route:</strong> Source and destination storage locations cannot be the same location. Please select a different destination.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Route Card: Origin & Destination */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
              Transfer Route (Origin ➔ Destination)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin Selection */}
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                Origin (Source Location)
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Source Warehouse <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => {
                    setSourceWarehouseId(e.target.value);
                    const wh = warehouses.find((w) => w.id === e.target.value);
                    if (wh && wh.locations.length > 0) {
                      setSourceLocationId(wh.locations[0].id);
                    }
                  }}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  Source Storage Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                >
                  {activeSourceWarehouse?.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code}) [{loc.type}]
                    </option>
                  ))}
                </select>
                {formErrors.sourceLocationId && (
                  <p className="text-[11px] text-rose-600">{formErrors.sourceLocationId}</p>
                )}
              </div>
            </div>

            {/* Destination Selection */}
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                Destination (Target Location)
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Destination Warehouse <span className="text-rose-500">*</span>
                </label>
                <select
                  value={destinationWarehouseId}
                  onChange={(e) => {
                    setDestinationWarehouseId(e.target.value);
                    const wh = warehouses.find((w) => w.id === e.target.value);
                    if (wh && wh.locations.length > 0) {
                      setDestinationLocationId(wh.locations[0].id);
                    }
                  }}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  Destination Storage Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={destinationLocationId}
                  onChange={(e) => setDestinationLocationId(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                >
                  {activeDestWarehouse?.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code}) [{loc.type}]
                    </option>
                  ))}
                </select>
                {formErrors.destinationLocationId && (
                  <p className="text-[11px] text-rose-600">
                    {formErrors.destinationLocationId}
                  </p>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Transfer Notes / Reason
              </label>
              <Input
                placeholder="e.g. Replenishing picking line; relocating to production staging; inter-warehouse balancing."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Card with Live Stock Calculation */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Products & Quantities
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Displays live source available stock and destination impact preview.
              </p>
            </div>
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
                <Package className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  No products added to this transfer order yet.
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Click "Add Product Line" to specify products and transfer quantities.
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
                      <th className="py-2.5 px-3 min-w-[200px]">Product / SKU</th>
                      <th className="py-2.5 px-3 w-28 text-right">Source Available</th>
                      <th className="py-2.5 px-3 w-28 text-right">Transfer Qty</th>
                      <th className="py-2.5 px-3 w-28 text-right">Source After</th>
                      <th className="py-2.5 px-3 w-28 text-right">Dest Current</th>
                      <th className="py-2.5 px-3 w-28 text-right">Dest After</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Notes</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {lines.map((line, idx) => {
                      const srcAvail = getStock(line.productId, sourceLocationId);
                      const destCurrent = getStock(line.productId, destinationLocationId);
                      const transferQty = Number(line.quantity) || 0;
                      const srcRemaining = srcAvail - transferQty;
                      const destAfter = destCurrent + transferQty;
                      const isOverStock = transferQty > srcAvail;

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <select
                              value={line.productId}
                              onChange={(e) =>
                                handleLineChange(idx, "productId", e.target.value)
                              }
                              className="w-full text-xs h-8 rounded border border-slate-200 bg-white px-2 text-slate-800 focus:ring-1 focus:ring-blue-600"
                              required
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}) [{p.uom}]
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                            {formatNumber(srcAvail)}
                          </td>

                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              step="any"
                              min="0.01"
                              value={line.quantity}
                              onChange={(e) =>
                                handleLineChange(idx, "quantity", e.target.value)
                              }
                              className="h-8 text-right font-mono"
                              required
                            />
                          </td>

                          <td
                            className={`py-2.5 px-3 text-right font-mono font-semibold ${
                              isOverStock
                                ? "text-rose-600 bg-rose-50/50 rounded"
                                : "text-slate-800"
                            }`}
                          >
                            {isOverStock ? (
                              <span className="flex items-center justify-end gap-1 text-[11px]">
                                <AlertTriangle className="h-3 w-3 text-rose-600" />
                                {formatNumber(srcRemaining)}
                              </span>
                            ) : (
                              formatNumber(srcRemaining)
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-500">
                            {formatNumber(destCurrent)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            +{formatNumber(destAfter)}
                          </td>

                          <td className="py-2.5 px-3">
                            <Input
                              placeholder="Optional line notes"
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

            {lines.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md text-xs border">
                <span className="text-slate-600">
                  Total Items: <strong>{lines.length}</strong> lines
                </span>
                <span className="font-mono text-slate-900">
                  Total Transfer Units:{" "}
                  <strong className="text-blue-600 text-sm">
                    {formatNumber(totalUnits)}
                  </strong>{" "}
                  units (Net Balance Change: <strong>0</strong>)
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/operations/transfers">
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            className="gap-1.5"
            disabled={submitting || lines.length === 0 || isSameLocation}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Creating Transfer...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Transfer (Draft)
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
