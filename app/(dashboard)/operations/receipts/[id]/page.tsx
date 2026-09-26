"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  ArrowDownLeft,
  CheckCircle2,
  Building2,
  Package,
  Clock,
  Layers,
  AlertTriangle,
  History,
  Check,
  XCircle,
} from "lucide-react";
import { formatNumber, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { OperationStatus } from "@/types";

interface ReceiptItemData {
  id: string;
  productId: string;
  locationId: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  notes: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    uom: string;
    costPrice: number;
  };
  location: {
    id: string;
    name: string;
    code: string;
    type: string;
    warehouseId: string;
  };
}

interface ReceiptDetailData {
  id: string;
  receiptNumber: string;
  supplierName: string;
  supplierContact: string | null;
  warehouseId: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  status: OperationStatus;
  notes: string | null;
  receivedDate: string | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  validatedById: string | null;
  validatedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lineItemsCount: number;
  totalExpectedQuantity: number;
  totalReceivedQuantity: number;
  items: ReceiptItemData[];
}

export default function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [receipt, setReceipt] = useState<ReceiptDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validation Action State
  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReceipt = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/receipts/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load receipt");
      }
      setReceipt(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReceipt();
  }, [fetchReceipt]);

  const handleValidate = async () => {
    try {
      setValidating(true);
      setActionError(null);

      const res = await fetch(`/api/receipts/${id}/validate`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Validation failed");
      }

      setSuccessMessage(
        `Receipt ${data.receipt.receiptNumber} successfully validated! Physical inventory balances have been increased and permanent entries recorded in the Stock Ledger.`
      );
      setReceipt(data.receipt);
    } catch (err: any) {
      setActionError(err.message || "An error occurred during validation.");
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
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

  if (error || !receipt) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Link href="/operations/receipts">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Receipts
          </Button>
        </Link>
        <EmptyState
          icon={AlertTriangle}
          title="Receipt not found"
          description={error || "The requested receipt record could not be found."}
        />
      </div>
    );
  }

  const isCompleted = receipt.status === "DONE";
  const isCanceled = receipt.status === "CANCELED";
  const canValidate = !isCompleted && !isCanceled;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div>
        <Link
          href="/operations/receipts"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Receipts
        </Link>
        <PageHeader
          title={`Receipt ${receipt.receiptNumber}`}
          description={`Supplier: ${receipt.supplierName} • Destination: ${receipt.warehouse.name} (${receipt.warehouse.code})`}
        >
          <StatusBadge status={receipt.status} />

          {canValidate && (
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setConfirmValidateOpen(true)}
              disabled={validating}
            >
              <Check className="h-4 w-4" />
              {validating ? "Validating..." : "Validate Receipt"}
            </Button>
          )}
        </PageHeader>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Receipt Validated Successfully</p>
              <p className="mt-0.5 text-emerald-700 leading-relaxed">{successMessage}</p>
              <div className="mt-2">
                <Link
                  href="/operations/ledger"
                  className="font-medium text-emerald-800 underline hover:text-emerald-950 flex items-center gap-1"
                >
                  <History className="h-3.5 w-3.5" /> View Stock Ledger Entry
                </Link>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Banner */}
      {actionError && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inward Quantity"
          value={formatNumber(
            isCompleted
              ? receipt.totalReceivedQuantity
              : receipt.totalExpectedQuantity
          )}
          description={isCompleted ? "Units received on hand" : "Expected units"}
          icon={Package}
        />
        <StatCard
          title="Line Items"
          value={receipt.lineItemsCount}
          description="Products in inward shipment"
          icon={Layers}
        />
        <StatCard
          title="Receiving Facility"
          value={receipt.warehouse.code}
          description={receipt.warehouse.name}
          icon={Building2}
        />
        <StatCard
          title="Status"
          value={receipt.status}
          change={isCompleted ? "Verified & Locked" : "Pending Inward"}
          changeType={isCompleted ? "positive" : "neutral"}
          description={
            receipt.validatedAt
              ? `Done on ${formatDate(receipt.validatedAt)}`
              : `Created ${formatDate(receipt.createdAt)}`
          }
          icon={Clock}
        />
      </div>

      {/* Two Column Layout: Items Table & Header Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Line Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Inward Line Items
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Products, assigned destination racks, and received quantities.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-3">Destination Location</th>
                      <th className="py-2.5 px-3 text-right">Expected Qty</th>
                      <th className="py-2.5 px-3 text-right">Received Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3">Line Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {receipt.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/products/${item.product.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-600 block"
                          >
                            {item.product.name}
                          </Link>
                          <span className="font-mono text-[10px] text-blue-600">
                            {item.product.sku}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/warehouses/${receipt.warehouseId}/locations/${item.location.id}`}
                            className="font-mono text-slate-700 hover:text-blue-600"
                          >
                            {item.location.name} ({item.location.code})
                          </Link>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {item.location.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {formatNumber(item.expectedQuantity)} {item.product.uom}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatNumber(item.receivedQuantity)} {item.product.uom}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                          {item.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Receipt Metadata & Audit Log */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Receipt Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Receipt Number</span>
                <span className="font-mono font-bold text-blue-600">
                  {receipt.receiptNumber}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-semibold text-slate-900">
                  {receipt.supplierName}
                </span>
              </div>

              {receipt.supplierContact && (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Contact / Ref</span>
                  <span className="text-slate-600 font-mono">
                    {receipt.supplierContact}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="text-slate-800 font-medium">
                  {receipt.warehouse.name} ({receipt.warehouse.code})
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Inward Date</span>
                <span className="text-slate-600 font-mono">
                  {formatDate(receipt.receivedDate)}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Created By</span>
                <span className="text-slate-700 font-medium">
                  {receipt.createdBy?.name || "System"} ({receipt.createdBy?.role})
                </span>
              </div>

              {receipt.validatedBy && (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Validated By</span>
                  <span className="text-emerald-700 font-semibold">
                    {receipt.validatedBy.name} ({receipt.validatedBy.role})
                  </span>
                </div>
              )}

              {receipt.validatedAt && (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Validated At</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    {formatDateTime(receipt.validatedAt)}
                  </span>
                </div>
              )}

              {receipt.notes && (
                <div className="pt-2 border-t text-muted-foreground">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Notes & Remarks:
                  </span>
                  <p className="text-[11px] leading-relaxed">{receipt.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Invariant Safety Badge */}
          <div className="p-3.5 rounded-lg border bg-slate-50 text-xs space-y-1.5 text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Atomic Invariant Guarantee</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Validating this receipt increases physical inventory and records immutable audit rows in the Stock Ledger inside a single PostgreSQL database transaction.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog before validation */}
      <ConfirmDialog
        open={confirmValidateOpen}
        onOpenChange={setConfirmValidateOpen}
        title={`Validate Receipt ${receipt.receiptNumber}?`}
        description="This will add the listed quantities directly into warehouse inventory and record permanent entries in the Stock Ledger. This action cannot be reversed."
        confirmLabel="Yes, Validate Receipt"
        variant="default"
        onConfirm={handleValidate}
        loading={validating}
      />
    </div>
  );
}
