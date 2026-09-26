import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus } from "lucide-react";

export default function TransfersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Stock Transfers"
        description="Location-to-location inventory movements. Decreases source and increases destination atomically."
      >
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Create Transfer
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-medium">
            <tr>
              <th className="py-2.5 px-3">Transfer Ref</th>
              <th className="py-2.5 px-3">Source Location</th>
              <th className="py-2.5 px-3">Destination Location</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3 text-right">Items</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                TRF-2026-0009
              </td>
              <td className="py-2.5 px-3 text-slate-700">
                Main WH • Rack B-01
              </td>
              <td className="py-2.5 px-3 text-slate-700">
                Prod WH • Production Area
              </td>
              <td className="py-2.5 px-3 text-slate-500">Sep 25, 2026</td>
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
