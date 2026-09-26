import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus } from "lucide-react";

export default function DeliveriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Orders"
        description="Outgoing customer shipments, picking tickets, and verified stock deductions."
      >
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Create Delivery
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-medium">
            <tr>
              <th className="py-2.5 px-3">Delivery Number</th>
              <th className="py-2.5 px-3">Customer / Consignee</th>
              <th className="py-2.5 px-3">Warehouse</th>
              <th className="py-2.5 px-3">Shipment Date</th>
              <th className="py-2.5 px-3 text-right">Items</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                DEL-2026-0118
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                General Automation Systems
              </td>
              <td className="py-2.5 px-3 text-slate-600">Main WH (WH-MAIN)</td>
              <td className="py-2.5 px-3 text-slate-500">Sep 25, 2026</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                2
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="DONE" />
              </td>
            </tr>
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                DEL-2026-0119
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                Summit Fabricators LLC
              </td>
              <td className="py-2.5 px-3 text-slate-600">Main WH (WH-MAIN)</td>
              <td className="py-2.5 px-3 text-slate-500">Sep 26, 2026</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                5
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="READY" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
