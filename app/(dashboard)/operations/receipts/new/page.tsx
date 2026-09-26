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
  Calendar,
  Save,
} from "lucide-react";
import { CreateReceiptFormData, createReceiptSchema } from "@/lib/validations/receipt";

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
  costPrice: number;
}

interface ReceiptLineItem {
  id: string; // client temporary key
  productId: string;
  locationId: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  notes: string;
}

export default function NewReceiptPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReceiptLineItem[]>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load Warehouses with locations and Products
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
          // fetch warehouse details with locations for the selected warehouses
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
      } catch (err) {
        console.error("Failed to load options", err);
      } finally {
        setLoadingOptions(false);
      }
    }
    loadData();
  }, []);

  // Available locations filtered strictly to currently selected warehouse
  const activeWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);
  const availableLocations = activeWarehouse?.locations || [];

  // Initialize first line item once products and locations are loaded
  useEffect(() => {
    if (lines.length === 0 && products.length > 0 && availableLocations.length > 0) {
      setLines([
        {
          id: Math.random().toString(),
          productId: products[0].id,
          locationId: availableLocations[0].id,
          expectedQuantity: 10,
          receivedQuantity: 10,
          unitCost: products[0].costPrice || 0,
          notes: "",
        },
      ]);
    }
  }, [products, availableLocations, lines.length]);

  const handleAddLine = () => {
    if (products.length === 0 || availableLocations.length === 0) return;
    setLines([
      ...lines,
      {
        id: Math.random().toString(),
        productId: products[0].id,
        locationId: availableLocations[0].id,
        expectedQuantity: 1,
        receivedQuantity: 1,
        unitCost: products[0].costPrice || 0,
        notes: "",
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      alert("A receipt must have at least one line item.");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof ReceiptLineItem, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-update unit cost when product changes
    if (field === "productId") {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        updated[index].unitCost = prod.costPrice || 0;
      }
    }
    // Sync received quantity when expected quantity is typed
    if (field === "expectedQuantity" && updated[index].receivedQuantity === 0) {
      updated[index].receivedQuantity = Number(value);
    }

    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setApiError(null);

    const payload: CreateReceiptFormData = {
      supplierName,
      supplierContact: supplierContact || null,
      warehouseId: selectedWarehouseId,
      notes: notes || null,
      receivedDate: receivedDate || null,
      items: lines.map((l) => ({
        productId: l.productId,
        locationId: l.locationId,
        expectedQuantity: Number(l.expectedQuantity),
        receivedQuantity: Number(l.receivedQuantity),
        unitCost: Number(l.unitCost) || 0,
        notes: l.notes || null,
      })),
    };

    const parsed = createReceiptSchema.safeParse(payload);
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
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create receipt");
      }

      // Redirect to the created receipt detail page
      router.push(`/operations/receipts/${result.id}`);
    } catch (err: any) {
      setApiError(err.message || "An unexpected error occurred while creating receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link
          href="/operations/receipts"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Receipts
        </Link>
        <PageHeader
          title="Create Inbound Receipt"
          description="Prepare incoming shipment details, assign destination warehouse racks, and record expected quantities."
        />
      </div>

      {apiError && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Receipt Header Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Receipt Header Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Supplier / Vendor Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Apex Industrial Supply Corp"
                  className="text-xs"
                  disabled={submitting}
                />
                {formErrors.supplierName && (
                  <p className="text-[11px] text-rose-600">
                    {formErrors.supplierName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Supplier Contact / Reference
                </label>
                <Input
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  placeholder="e.g. PO-8921 / dispatch@apex.com"
                  className="text-xs"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Destination Warehouse <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    const newWhId = e.target.value;
                    setSelectedWarehouseId(newWhId);
                    // Update location on lines to valid location in this warehouse
                    const newWh = warehouses.find((w) => w.id === newWhId);
                    const firstLocId = newWh?.locations[0]?.id || "";
                    setLines(
                      lines.map((l) => ({
                        ...l,
                        locationId: firstLocId,
                      }))
                    );
                  }}
                  className="w-full h-9 px-2.5 text-xs border rounded-md bg-transparent"
                  disabled={submitting}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                {formErrors.warehouseId && (
                  <p className="text-[11px] text-rose-600">
                    {formErrors.warehouseId}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Scheduled Inward Date
                </label>
                <Input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="text-xs font-mono"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Notes & Receiving Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Inspection notes, carrier name, or bill of lading number..."
                rows={2}
                className="w-full text-xs p-2.5 border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={submitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                Inbound Line Items
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select items and assign storage rack locations within{" "}
                <span className="font-semibold text-slate-900">
                  {activeWarehouse?.name || "the selected warehouse"}
                </span>
                .
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLine}
              className="gap-1.5 text-xs"
              disabled={submitting}
            >
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {formErrors.items && (
              <p className="text-xs text-rose-600 font-medium">
                {formErrors.items}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                  <tr>
                    <th className="py-2 px-2 w-64">Product / SKU</th>
                    <th className="py-2 px-2 w-52">Destination Location</th>
                    <th className="py-2 px-2 w-28 text-right">Expected Qty</th>
                    <th className="py-2 px-2 w-28 text-right">Received Qty</th>
                    <th className="py-2 px-2 w-28 text-right">Unit Cost ($)</th>
                    <th className="py-2 px-2">Line Notes</th>
                    <th className="py-2 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, index) => {
                    const currentProd = products.find((p) => p.id === line.productId);

                    return (
                      <tr key={line.id} className="align-middle">
                        {/* Product Selector */}
                        <td className="p-2">
                          <select
                            value={line.productId}
                            onChange={(e) =>
                              handleLineChange(index, "productId", e.target.value)
                            }
                            className="w-full h-8 px-2 text-xs border rounded bg-transparent"
                            disabled={submitting}
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Location Selector (filtered strictly to warehouse) */}
                        <td className="p-2">
                          <select
                            value={line.locationId}
                            onChange={(e) =>
                              handleLineChange(index, "locationId", e.target.value)
                            }
                            className="w-full h-8 px-2 text-xs border rounded bg-transparent font-mono"
                            disabled={submitting}
                          >
                            {availableLocations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.code})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Expected Quantity */}
                        <td className="p-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              min="0.01"
                              step="any"
                              value={line.expectedQuantity}
                              onChange={(e) =>
                                handleLineChange(
                                  index,
                                  "expectedQuantity",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 w-20 text-xs font-mono text-right"
                              disabled={submitting}
                            />
                            <span className="text-[10px] text-muted-foreground font-mono w-8 text-left">
                              {currentProd?.uom || "units"}
                            </span>
                          </div>
                        </td>

                        {/* Received Quantity */}
                        <td className="p-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={line.receivedQuantity}
                              onChange={(e) =>
                                handleLineChange(
                                  index,
                                  "receivedQuantity",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 w-20 text-xs font-mono text-right"
                              disabled={submitting}
                            />
                            <span className="text-[10px] text-muted-foreground font-mono w-8 text-left">
                              {currentProd?.uom || "units"}
                            </span>
                          </div>
                        </td>

                        {/* Unit Cost */}
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={(e) =>
                              handleLineChange(
                                index,
                                "unitCost",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 w-24 text-xs font-mono text-right ml-auto"
                            disabled={submitting}
                          />
                        </td>

                        {/* Line Notes */}
                        <td className="p-2">
                          <Input
                            value={line.notes}
                            onChange={(e) =>
                              handleLineChange(index, "notes", e.target.value)
                            }
                            placeholder="Optional notes"
                            className="h-8 text-xs"
                            disabled={submitting}
                          />
                        </td>

                        {/* Remove Action */}
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                            onClick={() => handleRemoveLine(index)}
                            disabled={submitting || lines.length <= 1}
                            title="Remove Line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Line Totals Summary */}
            <div className="p-3 bg-slate-50 rounded-md border flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Total Inward Expected Units:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {lines.reduce((acc, l) => acc + (Number(l.expectedQuantity) || 0), 0)} units
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/operations/receipts">
            <Button type="button" variant="outline" size="sm" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" size="sm" className="gap-1.5" disabled={submitting}>
            <Save className="h-3.5 w-3.5" />
            {submitting ? "Saving Draft..." : "Save Draft Receipt"}
          </Button>
        </div>
      </form>
    </div>
  );
}
