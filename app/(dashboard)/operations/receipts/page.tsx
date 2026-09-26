import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, ArrowDownLeft, Filter } from "lucide-react";

export default function ReceiptsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Receipts"
        description="Vendor purchase intake, receiving dock inspection, and automated stock increase."
      >
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Create Receipt
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-medium">
            <tr>
              <th className="py-2.5 px-3">Receipt Number</th>
              <th className="py-2.5 px-3">Supplier</th>
              <th className="py-2.5 px-3">Warehouse</th>
              <th className="py-2.5 px-3">Scheduled Date</th>
              <th className="py-2.5 px-3 text-right">Items</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                RCP-2026-0042
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                Apex Industrial Supply
              </td>
              <td className="py-2.5 px-3 text-slate-600">Main WH (WH-MAIN)</td>
              <td className="py-2.5 px-3 text-slate-500">Sep 25, 2026</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                3
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="DONE" />
              </td>
            </tr>
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                RCP-2026-0043
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                PetroChem Dynamics
              </td>
              <td className="py-2.5 px-3 text-slate-600">Main WH (WH-MAIN)</td>
              <td className="py-2.5 px-3 text-slate-500">Sep 26, 2026</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                1
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="READY" />
              </td>
            </tr>
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                RCP-2026-0044
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                Midwest Fastener Corp
              </td>
              <td className="py-2.5 px-3 text-slate-600">Prod WH (WH-PROD)</td>
              <td className="py-2.5 px-3 text-slate-500">Sep 28, 2026</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                6
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="DRAFT" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
