import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus } from "lucide-react";

export default function AdjustmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustments"
        description="Physical inventory cycle counts and discrepancy reconciliations with mandatory reason auditing."
      >
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          New Adjustment
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-medium">
            <tr>
              <th className="py-2.5 px-3">Adjustment Ref</th>
              <th className="py-2.5 px-3">Warehouse / Location</th>
              <th className="py-2.5 px-3">Mandatory Reason</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3 text-right">Items Reconciled</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                ADJ-2026-0004
              </td>
              <td className="py-2.5 px-3 text-slate-700">
                Main WH • Bin C-14
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                Q3 Physical Cycle Count Discrepancy
              </td>
              <td className="py-2.5 px-3 text-slate-500">Sep 24, 2026</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                1
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="DONE" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
