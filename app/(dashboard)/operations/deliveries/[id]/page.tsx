"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Building2,
  Package,
  Calendar,
  User,
  AlertCircle,
  Clock,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  Edit3,
  AlertTriangle,
} from "lucide-react";
import { formatNumber, formatDate, formatDateTime } from "@/lib/utils";
import { OperationStatus } from "@/types";

interface DeliveryDetailData {
  id: string;
  deliveryNumber: string;
  customerName: string;
  customerContact: string | null;
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
    address: string | null;
    city: string | null;
  };
  status: OperationStatus;
  notes: string | null;
  deliveryDate: string | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  validatedById: string | null;
  validatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    locationId: string;
    requestedQuantity: number;
    deliveredQuantity: number;
    notes: string | null;
    product: {
      id: string;
      name: string;
      sku: string;
      uom: string;
      sellingPrice: number;
    };
    location: {
      id: string;
      name: string;
      code: string;
      type: string;
    };
  }>;
}

export default function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [delivery, setDelivery] = useState<DeliveryDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Confirmation dialog states
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  async function loadDelivery() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/deliveries/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load delivery details");
      }
      setDelivery(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDelivery();
  }, [id]);

  async function handleStatusChange(newStatus: string) {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/deliveries/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setActionSuccess(`Status updated to ${newStatus}.`);
      await loadDelivery();
    } catch (err: any) {
      setActionError(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleValidateDelivery() {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/deliveries/${id}/validate`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate delivery order");
      }

      setShowValidateModal(false);
      setActionSuccess(data.message || "Delivery validated successfully and stock deducted.");
      await loadDelivery();
    } catch (err: any) {
      setActionError(err.message || "Failed to validate delivery order");
      setShowValidateModal(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelDelivery() {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/deliveries/${id}/cancel`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel delivery order");
      }

      setShowCancelModal(false);
      setActionSuccess(data.message || "Delivery order canceled.");
      await loadDelivery();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel delivery order");
      setShowCancelModal(false);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto p-4">
        <Link href="/operations/deliveries">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Delivery Orders
          </Button>
        </Link>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          {error || "Delivery order not found."}
        </div>
      </div>
    );
  }

  const isEditable = delivery.status !== "DONE" && delivery.status !== "CANCELED";
  const totalRequested = delivery.items.reduce((acc, i) => acc + i.requestedQuantity, 0);
  const totalDelivered = delivery.items.reduce((acc, i) => acc + i.deliveredQuantity, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link href="/operations/deliveries">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Delivery Orders
          </Button>
        </Link>

        {isEditable && (
          <div className="flex flex-wrap items-center gap-2">
            {delivery.status === "DRAFT" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("WAITING")}
                disabled={actionLoading}
                className="text-xs"
              >
                Mark as Waiting (Picking)
              </Button>
            )}

            {(delivery.status === "DRAFT" || delivery.status === "WAITING") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("READY")}
                disabled={actionLoading}
                className="text-xs"
              >
                Mark Ready to Ship
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setShowValidateModal(true)}
              disabled={actionLoading}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validate Delivery
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Cancel Order
            </Button>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-800">Operation Error</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
        </div>
      )}

      {delivery.status === "DONE" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">
                Delivery Order Completed & Locked
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Physical inventory was decremented and immutable audit records were created in the Stock Ledger.
              </p>
            </div>
          </div>
          <Link href="/operations/ledger">
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white text-emerald-800 hover:bg-emerald-100">
              View Audit Ledger
            </Button>
          </Link>
        </div>
      )}

      {/* Header Info Card */}
      <div className="rounded-xl border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-slate-900">
                {delivery.deliveryNumber}
              </h1>
              <StatusBadge status={delivery.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created on {formatDate(delivery.createdAt)} by {delivery.createdBy.name}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-muted-foreground block">Customer / Consignee</span>
            <span className="text-base font-bold text-slate-900">
              {delivery.customerName}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block font-medium">Warehouse Facility</span>
            <span className="font-semibold text-slate-800">
              {delivery.warehouse.name} ({delivery.warehouse.code})
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Customer Contact</span>
            <span className="font-semibold text-slate-800">
              {delivery.customerContact || "—"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Shipment Date</span>
            <span className="font-semibold text-slate-800">
              {delivery.deliveryDate ? formatDate(delivery.deliveryDate) : "—"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Validated By</span>
            <span className="font-semibold text-slate-800">
              {delivery.validatedBy
                ? `${delivery.validatedBy.name} (${formatDate(delivery.validatedAt!)})`
                : "Pending Validation"}
            </span>
          </div>
        </div>

        {delivery.notes && (
          <div className="pt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
            <strong>Notes / Instructions:</strong> {delivery.notes}
          </div>
        )}
      </div>

      {/* Items Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span>Outbound Line Items</span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              Total Requested: <strong>{formatNumber(totalRequested)}</strong> units
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Product / SKU</th>
                  <th className="py-2.5 px-4">Source Location</th>
                  <th className="py-2.5 px-4 text-right">Requested Qty</th>
                  <th className="py-2.5 px-4 text-right">Delivered Qty</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {delivery.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <Link
                        href={`/products/${item.product.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 block"
                      >
                        {item.product.name}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.product.sku} • {item.product.uom}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold">{item.location.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Code: {item.location.code} ({item.location.type})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                      {formatNumber(item.requestedQuantity)} {item.product.uom}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {delivery.status === "DONE"
                        ? `-${formatNumber(item.deliveredQuantity)}`
                        : "0"}{" "}
                      {item.product.uom}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {item.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Validation Confirmation Dialog */}
      {showValidateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Validate Delivery Order?
                </h3>
                <p className="text-xs text-slate-500">
                  Ref: {delivery.deliveryNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Validate this delivery?
              <br />
              This will remove the listed quantities from inventory and create permanent stock ledger records.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> This operation is permanent. Stock balances will be immediately decreased and cannot be undone except via physical adjustment.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValidateModal(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleValidateDelivery}
                disabled={actionLoading}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Executing Transaction...
                  </>
                ) : (
                  "Confirm & Validate"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <XCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Cancel Delivery Order?
                </h3>
                <p className="text-xs text-slate-500">
                  Ref: {delivery.deliveryNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this delivery order? Canceled orders will not deduct any inventory and cannot be validated.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="text-xs"
              >
                Go Back
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancelDelivery}
                disabled={actionLoading}
                className="text-xs"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Canceling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
