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
  Calendar,
  Save,
  Loader2,
  Layers,
  AlertTriangle,
  Info,
} from "lucide-react";
import { createDeliverySchema } from "@/lib/validations/delivery";
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
  sellingPrice: number;
}

interface DeliveryLineItem {
  id: string;
  productId: string;
  locationId: string;
  requestedQuantity: number;
  notes: string;
}

interface InventoryItem {
  productId: string;
  locationId: string;
  quantity: number;
  availableQuantity: number;
}

export default function NewDeliveryPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DeliveryLineItem[]>([]);

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
          const detailedWarehouses = await Promise.all(
            whData.map(async (wh: any) => {
              const res = await fetch(`/api/warehouses/${wh.id}`);
              return res.ok ? await res.json() : wh;
            })
          );
          setWarehouses(detailedWarehouses);
          if (detailedWarehouses.length > 0) {
            setSelectedWarehouseId(detailedWarehouses[0].id);
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

  // 2. Load inventory stock whenever selected warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) return;

    async function loadWarehouseInventory() {
      try {
        setLoadingInventory(true);
        const res = await fetch(`/api/inventory?warehouseId=${selectedWarehouseId}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, number> = {};
          if (data.items) {
            data.items.forEach((item: any) => {
              const key = `${item.productId}_${item.locationId}`;
              map[key] = item.availableQuantity ?? item.quantity ?? 0;
            });
          }
          setInventoryMap(map);
        }
      } catch (e) {
        console.error("Failed to load inventory stock", e);
      } finally {
        setLoadingInventory(false);
      }
    }

    loadWarehouseInventory();
  }, [selectedWarehouseId]);

  const activeWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  // Helper to get available stock for product at location
  function getStock(productId: string, locationId: string): number {
    const key = `${productId}_${locationId}`;
    return inventoryMap[key] ?? 0;
  }

  // Add line item
  function handleAddLine() {
    const defaultProduct = products[0]?.id || "";
    const defaultLocation = activeWarehouse?.locations[0]?.id || "";

    const newLine: DeliveryLineItem = {
      id: Math.random().toString(36).substring(2, 9),
      productId: defaultProduct,
      locationId: defaultLocation,
      requestedQuantity: 1,
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
    field: keyof DeliveryLineItem,
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
      customerName,
      customerContact: customerContact || null,
      warehouseId: selectedWarehouseId,
      deliveryDate: deliveryDate || null,
      notes: notes || null,
      items: lines.map((l) => ({
        productId: l.productId,
        locationId: l.locationId,
        requestedQuantity: Number(l.requestedQuantity),
        notes: l.notes || null,
      })),
    };

    const result = createDeliverySchema.safeParse(payload);
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
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create delivery order");
      }

      router.push(`/operations/deliveries/${data.id}`);
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalRequestedUnits = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.requestedQuantity) || 0), 0),
    [lines]
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/operations/deliveries">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Delivery Orders
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Create Outgoing Delivery Order"
        description="Fulfill sales orders and customer shipments by picking from designated warehouse locations."
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Header Card */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Shipment & Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Customer / Consignee Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Acme Industrial Corp"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
              {formErrors.customerName && (
                <p className="text-[11px] text-rose-600">{formErrors.customerName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Customer Contact / Phone / Email
              </label>
              <Input
                placeholder="e.g. shipping@acme.com / +1-555-0199"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Fulfillment Warehouse <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value);
                  const wh = warehouses.find((w) => w.id === e.target.value);
                  if (wh && wh.locations.length > 0) {
                    const firstLoc = wh.locations[0].id;
                    setLines(lines.map((l) => ({ ...l, locationId: firstLoc })));
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
              {formErrors.warehouseId && (
                <p className="text-[11px] text-rose-600">{formErrors.warehouseId}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Scheduled Shipment Date
              </label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Shipping Notes / Handling Instructions
              </label>
              <Input
                placeholder="e.g. Fragile items; ship via Express Freight; packing slip required."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items Card with Live Stock Calculation */}
        <Card>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Delivery Line Items
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Physical stock balances are shown for context. Server enforces authoritative stock during validation.
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
                  No products added to this delivery order yet.
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Click "Add Product Line" above to select products and source locations.
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
                      <th className="py-2.5 px-3 min-w-[160px]">Source Location</th>
                      <th className="py-2.5 px-3 w-28 text-right">Available Stock</th>
                      <th className="py-2.5 px-3 w-28 text-right">Requested Qty</th>
                      <th className="py-2.5 px-3 w-28 text-right">Remaining</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Notes</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {lines.map((line, idx) => {
                      const avail = getStock(line.productId, line.locationId);
                      const requested = Number(line.requestedQuantity) || 0;
                      const remaining = avail - requested;
                      const isOverStock = requested > avail;

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

                          <td className="py-2.5 px-3">
                            <select
                              value={line.locationId}
                              onChange={(e) =>
                                handleLineChange(idx, "locationId", e.target.value)
                              }
                              className="w-full text-xs h-8 rounded border border-slate-200 bg-white px-2 text-slate-800 focus:ring-1 focus:ring-blue-600"
                              required
                            >
                              {activeWarehouse?.locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.name} ({loc.code})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                            {formatNumber(avail)}
                          </td>

                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              step="any"
                              min="0.01"
                              value={line.requestedQuantity}
                              onChange={(e) =>
                                handleLineChange(idx, "requestedQuantity", e.target.value)
                              }
                              className="h-8 text-right font-mono"
                              required
                            />
                          </td>

                          <td
                            className={`py-2.5 px-3 text-right font-mono font-semibold ${
                              isOverStock
                                ? "text-rose-600 bg-rose-50/50 rounded"
                                : "text-emerald-700"
                            }`}
                          >
                            {isOverStock ? (
                              <span className="flex items-center justify-end gap-1 text-[11px]">
                                <AlertTriangle className="h-3 w-3 text-rose-600" />
                                {formatNumber(remaining)}
                              </span>
                            ) : (
                              formatNumber(remaining)
                            )}
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
                  Total Requested Qty:{" "}
                  <strong className="text-blue-600 text-sm">
                    {formatNumber(totalRequestedUnits)}
                  </strong>{" "}
                  units
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/operations/deliveries">
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
                Creating Delivery...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Delivery Order (Draft)
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
