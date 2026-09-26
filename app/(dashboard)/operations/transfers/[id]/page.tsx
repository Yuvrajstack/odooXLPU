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
  ArrowLeftRight,
  ShieldCheck,
  MapPin,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { formatNumber, formatDate, formatDateTime } from "@/lib/utils";
import { OperationStatus } from "@/types";

interface TransferDetailData {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouse: { id: string; name: string; code: string };
  destinationWarehouseId: string;
  destinationWarehouse: { id: string; name: string; code: string };
  sourceLocationId: string;
  sourceLocation: { id: string; name: string; code: string; type: string };
  destinationLocationId: string;
  destinationLocation: { id: string; name: string; code: string; type: string };
  status: OperationStatus;
  notes: string | null;
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  validatedById: string | null;
  validatedBy: { id: string; name: string; email: string } | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    notes: string | null;
    product: {
      id: string;
      name: string;
      sku: string;
      uom: string;
    };
  }>;
}

export default function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [transfer, setTransfer] = useState<TransferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  async function loadTransfer() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/transfers/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load transfer details");
      }
      setTransfer(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransfer();
  }, [id]);

  async function handleStatusChange(newStatus: string) {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/transfers/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setActionSuccess(`Status updated to ${newStatus}.`);
      await loadTransfer();
    } catch (err: any) {
      setActionError(err.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleValidateTransfer() {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/transfers/${id}/validate`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate transfer order");
      }

      setShowValidateModal(false);
      setActionSuccess(data.message || "Transfer validated and stock moved successfully.");
      await loadTransfer();
    } catch (err: any) {
      setActionError(err.message || "Failed to validate transfer order");
      setShowValidateModal(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelTransfer() {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/transfers/${id}/cancel`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel transfer order");
      }

      setShowCancelModal(false);
      setActionSuccess(data.message || "Transfer order canceled.");
      await loadTransfer();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel transfer order");
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

  if (error || !transfer) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto p-4">
        <Link href="/operations/transfers">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Transfers
          </Button>
        </Link>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          {error || "Transfer order not found."}
        </div>
      </div>
    );
  }

  const isEditable = transfer.status !== "DONE" && transfer.status !== "CANCELED";
  const totalQuantity = transfer.items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link href="/operations/transfers">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Transfers
          </Button>
        </Link>

        {isEditable && (
          <div className="flex flex-wrap items-center gap-2">
            {transfer.status === "DRAFT" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("WAITING")}
                disabled={actionLoading}
                className="text-xs"
              >
                Mark as Waiting (Staging)
              </Button>
            )}

            {(transfer.status === "DRAFT" || transfer.status === "WAITING") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("READY")}
                disabled={actionLoading}
                className="text-xs"
              >
                Mark Ready to Move
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setShowValidateModal(true)}
              disabled={actionLoading}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Validate Transfer
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

      {transfer.status === "DONE" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">
                Transfer Completed & Locked
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Physical inventory was atomically moved. Dual <strong>TRANSFER_OUT</strong> and <strong>TRANSFER_IN</strong> records were posted to the Stock Ledger.
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

      {/* Header Route Card */}
      <div className="rounded-xl border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-slate-900">
                {transfer.transferNumber}
              </h1>
              <StatusBadge status={transfer.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created on {formatDate(transfer.createdAt)} by {transfer.createdBy.name}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-muted-foreground block">Net Stock Delta</span>
            <span className="text-base font-bold font-mono text-blue-600">
              0 units (Zero-Net Balance)
            </span>
          </div>
        </div>

        {/* Origin to Destination Visual Banner */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center bg-slate-50/80 p-4 rounded-lg border">
          <div className="md:col-span-5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              Origin (Source Location)
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {transfer.sourceLocation.name}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {transfer.sourceWarehouse.name} ({transfer.sourceLocation.code}) [{transfer.sourceLocation.type}]
            </div>
          </div>

          <div className="md:col-span-1 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          <div className="md:col-span-5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              Destination (Target Location)
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {transfer.destinationLocation.name}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {transfer.destinationWarehouse.name} ({transfer.destinationLocation.code}) [{transfer.destinationLocation.type}]
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div>
            <span className="text-muted-foreground block font-medium">Transfer Scope</span>
            <span className="font-semibold text-slate-800">
              {transfer.sourceWarehouseId === transfer.destinationWarehouseId
                ? "Intra-Warehouse Movement"
                : "Cross-Warehouse Transfer"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Total Quantity</span>
            <span className="font-semibold text-slate-800 font-mono">
              {formatNumber(totalQuantity)} units
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Validated By</span>
            <span className="font-semibold text-slate-800">
              {transfer.validatedBy
                ? `${transfer.validatedBy.name} (${formatDate(transfer.validatedAt!)})`
                : "Pending Validation"}
            </span>
          </div>
        </div>

        {transfer.notes && (
          <div className="pt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
            <strong>Notes / Reason:</strong> {transfer.notes}
          </div>
        )}
      </div>

      {/* Items Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span>Transferred Products & Stock Impact</span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              Total Units: <strong>{formatNumber(totalQuantity)}</strong>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Product / SKU</th>
                  <th className="py-2.5 px-4 text-right">Transfer Quantity</th>
                  <th className="py-2.5 px-4 text-right">Source Impact</th>
                  <th className="py-2.5 px-4 text-right">Destination Impact</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {transfer.items.map((item) => (
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
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatNumber(item.quantity)} {item.product.uom}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      -{formatNumber(item.quantity)} {item.product.uom}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      +{formatNumber(item.quantity)} {item.product.uom}
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
                  Validate Transfer Order?
                </h3>
                <p className="text-xs text-slate-500">
                  Ref: {transfer.transferNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Validate this transfer?
              <br />
              This will move the selected quantities from <strong>{transfer.sourceLocation.name}</strong> to <strong>{transfer.destinationLocation.name}</strong> and permanently record both sides of the movement in the stock ledger.
            </p>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-[11px] text-blue-800 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Net Stock:</strong> Source inventory decreases by {formatNumber(totalQuantity)} and destination inventory increases by {formatNumber(totalQuantity)}. Total stock is preserved.
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
                onClick={handleValidateTransfer}
                disabled={actionLoading}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Executing Transaction...
                  </>
                ) : (
                  "Confirm & Move Stock"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <XCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Cancel Transfer Order?
                </h3>
                <p className="text-xs text-slate-500">
                  Ref: {transfer.transferNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this transfer order? Canceled orders will not move any inventory and cannot be validated.
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
                onClick={handleCancelTransfer}
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
