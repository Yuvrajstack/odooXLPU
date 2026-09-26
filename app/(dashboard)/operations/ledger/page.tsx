import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Download, Search, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StockLedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Ledger (Audit Trail)"
        description="Append-only, immutable inventory movement ledger. Preserves complete historical audit trail."
      >
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </PageHeader>

      {/* Ledger Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-medium">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Product / SKU</th>
              <th className="py-2.5 px-3">Facility & Location</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Reference Doc</th>
              <th className="py-2.5 px-3 text-right">Before</th>
              <th className="py-2.5 px-3 text-right">Change</th>
              <th className="py-2.5 px-3 text-right">After</th>
              <th className="py-2.5 px-3">Operator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans text-xs">
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                2026-09-25 14:32:10
              </td>
              <td className="py-2.5 px-3">
                <span className="font-semibold text-slate-900 block">
                  Industrial Steel Rod 12mm
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  SKU-STL-0012
                </span>
              </td>
              <td className="py-2.5 px-3 text-slate-600">
                Main WH • Rack A-02
              </td>
              <td className="py-2.5 px-3">
                <Badge variant="success">RECEIPT</Badge>
              </td>
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                RCP-2026-0042
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                170
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                +150
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                320
              </td>
              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                Alex Vance
              </td>
            </tr>

            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                2026-09-25 11:15:45
              </td>
              <td className="py-2.5 px-3">
                <span className="font-semibold text-slate-900 block">
                  Pneumatic Valve 3/4"
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  SKU-VLV-3401
                </span>
              </td>
              <td className="py-2.5 px-3 text-slate-600">
                Main WH • Bin C-14
              </td>
              <td className="py-2.5 px-3">
                <Badge variant="destructive">DELIVERY</Badge>
              </td>
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                DEL-2026-0118
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                48
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                -20
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                28
              </td>
              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                Sarah Jenkins
              </td>
            </tr>

            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                2026-09-25 09:40:12
              </td>
              <td className="py-2.5 px-3">
                <span className="font-semibold text-slate-900 block">
                  Copper Coil Wire 2.5mm
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  SKU-CPR-2500
                </span>
              </td>
              <td className="py-2.5 px-3 text-slate-600">
                Main WH • Rack B-01
              </td>
              <td className="py-2.5 px-3">
                <Badge variant="warning">TRANSFER_OUT</Badge>
              </td>
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                TRF-2026-0009
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                120
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                -35
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                85
              </td>
              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                Alex Vance
              </td>
            </tr>

            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                2026-09-25 09:40:12
              </td>
              <td className="py-2.5 px-3">
                <span className="font-semibold text-slate-900 block">
                  Copper Coil Wire 2.5mm
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  SKU-CPR-2500
                </span>
              </td>
              <td className="py-2.5 px-3 text-slate-600">
                Prod WH • Production Area
              </td>
              <td className="py-2.5 px-3">
                <Badge variant="info">TRANSFER_IN</Badge>
              </td>
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                TRF-2026-0009
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                10
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">
                +35
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                45
              </td>
              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                Alex Vance
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
