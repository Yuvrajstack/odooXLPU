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
  SlidersHorizontal,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { formatNumber, formatDate, formatDateTime } from "@/lib/utils";
import { OperationStatus } from "@/types";

interface AdjustmentDetailData {
  id: string;
  adjustmentNumber: string;
  warehouseId: string;
  warehouse: { id: string; name: string; code: string };
  locationId: string;
  location: { id: string; name: string; code: string; type: string };
  reason: string;
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
    systemQuantity: number;
    physicalQuantity: number;
    differenceQuantity: number;
    notes: string | null;
    product: {
      id: string;
      name: string;
      sku: string;
      uom: string;
    };
  }>;
}

export default function AdjustmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [adjustment, setAdjustment] = useState<AdjustmentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadAdjustment() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/adjustments/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load adjustment details");
      }
      setAdjustment(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdjustment();
  }, [id]);

  async function handleValidateAdjustment() {
    try {
      setActionLoading(true);
      setActionError(null);

      const res = await fetch(`/api/adjustments/${id}/validate`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate adjustment");
      }

      await loadAdjustment();
    } catch (err: any) {
      setActionError(err.message || "Failed to validate adjustment");
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

  if (error || !adjustment) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto p-4">
        <Link href="/operations/adjustments">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Adjustments
          </Button>
        </Link>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          {error || "Stock adjustment not found."}
        </div>
      </div>
    );
  }

  const isEditable = adjustment.status !== "DONE" && adjustment.status !== "CANCELED";
  const netDifference = adjustment.items.reduce(
    (acc, i) => acc + i.differenceQuantity,
    0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Workflow Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link href="/operations/adjustments">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Adjustments
          </Button>
        </Link>

        {isEditable && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleValidateAdjustment}
              disabled={actionLoading}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Reconciling Stock...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Validate & Reconcile Stock
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {adjustment.status === "DONE" && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              This stock adjustment was validated. Inventory quantities were updated to counted physical stock, and differences were appended to the <strong>Stock Ledger</strong>.
            </span>
          </div>
          <Link href="/operations/ledger">
            <Button size="sm" variant="outline" className="h-7 text-[11px] bg-white text-emerald-700">
              View in Ledger
            </Button>
          </Link>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="rounded-xl border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-slate-900">
                {adjustment.adjustmentNumber}
              </h1>
              <StatusBadge status={adjustment.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created on {formatDate(adjustment.createdAt)} by {adjustment.createdBy.name}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Net Quantity Adjustment</span>
            <span
              className={`text-lg font-mono font-bold ${
                netDifference > 0
                  ? "text-emerald-600"
                  : netDifference < 0
                  ? "text-rose-600"
                  : "text-slate-900"
              }`}
            >
              {netDifference > 0 ? `+${formatNumber(netDifference)}` : formatNumber(netDifference)} units
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block font-medium">Warehouse Facility</span>
            <span className="font-semibold text-slate-800">
              {adjustment.warehouse.name} ({adjustment.warehouse.code})
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Storage Location</span>
            <span className="font-semibold text-slate-800">
              {adjustment.location.name} ({adjustment.location.code})
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Auditor / Creator</span>
            <span className="font-semibold text-slate-800">
              {adjustment.createdBy.name}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block font-medium">Validated By</span>
            <span className="font-semibold text-slate-800">
              {adjustment.validatedBy ? `${adjustment.validatedBy.name} (${formatDate(adjustment.validatedAt!)})` : "Pending Validation"}
            </span>
          </div>
        </div>

        <div className="pt-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
          <span className="font-semibold text-slate-900 block mb-0.5">
            Mandatory Justification / Reason:
          </span>
          <p className="text-slate-700">{adjustment.reason}</p>
          {adjustment.notes && (
            <p className="text-slate-500 text-[11px] mt-1 italic">
              Auditor Notes: {adjustment.notes}
            </p>
          )}
        </div>
      </div>

      {/* Items Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span>Counted Items & Reconciliations</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Product / SKU</th>
                  <th className="py-2.5 px-4 text-right">System Recorded</th>
                  <th className="py-2.5 px-4 text-right">Physical Count</th>
                  <th className="py-2.5 px-4 text-right">Difference (+/-)</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {adjustment.items.map((item) => (
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
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                      {formatNumber(item.systemQuantity)} {item.product.uom}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatNumber(item.physicalQuantity)} {item.product.uom}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          item.differenceQuantity > 0
                            ? "text-emerald-600"
                            : item.differenceQuantity < 0
                            ? "text-rose-600"
                            : "text-slate-600"
                        }
                      >
                        {item.differenceQuantity > 0
                          ? `+${formatNumber(item.differenceQuantity)}`
                          : formatNumber(item.differenceQuantity)}{" "}
                        {item.product.uom}
                      </span>
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
    </div>
  );
}
