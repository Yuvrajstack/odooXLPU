import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header with Quick Action Controls */}
      <PageHeader
        title="Inventory Operations Dashboard"
        description="Real-time multi-warehouse inventory status, active movements, and low stock alerts."
      >
        <Link href="/operations/receipts">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <ArrowDownLeft className="h-3.5 w-3.5" />
            New Receipt
          </Button>
        </Link>
        <Link href="/operations/deliveries">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <ArrowUpRight className="h-3.5 w-3.5" />
            New Delivery
          </Button>
        </Link>
        <Link href="/operations/transfers">
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Transfer Stock
          </Button>
        </Link>
      </PageHeader>

      {/* Top Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          title="In Stock Items"
          value="1,420"
          change="+12 today"
          changeType="positive"
          description="Active tracked SKUs"
          icon={Package}
        />
        <StatCard
          title="Low Stock"
          value="14"
          change="Action required"
          changeType="warning"
          description="Below reorder threshold"
          icon={AlertTriangle}
        />
        <StatCard
          title="Out of Stock"
          value="3"
          change="Critical"
          changeType="negative"
          description="Zero quantity at all sites"
          icon={XCircle}
        />
        <StatCard
          title="Pending Receipts"
          value="5"
          change="2 ready to validate"
          changeType="neutral"
          description="Incoming vendor orders"
          icon={ArrowDownLeft}
        />
        <StatCard
          title="Pending Deliveries"
          value="8"
          change="4 ready to ship"
          changeType="neutral"
          description="Outbound fulfillments"
          icon={ArrowUpRight}
        />
        <StatCard
          title="Transfers Active"
          value="2"
          change="In transit"
          changeType="neutral"
          description="Inter-location movement"
          icon={ArrowLeftRight}
        />
      </div>

      {/* Two Column Layout: Recent Operations & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Operational Movements */}
        <div className="lg:col-span-2 rounded-lg border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Recent Inventory Transactions
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest validated receipts, deliveries, and transfers affecting the ledger.
              </p>
            </div>
            <Link
              href="/operations/ledger"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View Full Ledger <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3">Warehouse / Location</th>
                  <th className="py-2.5 px-3 text-right">Delta</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px] sm:text-xs">
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">
                    <Link href="/operations/receipts">RCP-2026-0042</Link>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <ArrowDownLeft className="h-3.5 w-3.5" /> Receipt
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="font-semibold text-slate-900">
                      Industrial Steel Rod 12mm
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      SKU-STL-0012
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600">
                    Main WH • Rack A-02
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                    +150 units
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <StatusBadge status="DONE" />
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">
                    <Link href="/operations/deliveries">DEL-2026-0118</Link>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Delivery
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="font-semibold text-slate-900">
                      Pneumatic Valve 3/4"
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      SKU-VLV-3401
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600">
                    Main WH • Bin C-14
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                    -20 units
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <StatusBadge status="DONE" />
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">
                    <Link href="/operations/transfers">TRF-2026-0009</Link>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="inline-flex items-center gap-1 text-blue-700">
                      <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="font-semibold text-slate-900">
                      Copper Coil Wire 2.5mm
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      SKU-CPR-2500
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600">
                    Rack B-01 → Prod Area
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-blue-600">
                    ±35 units
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <StatusBadge status="DONE" />
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-blue-600">
                    <Link href="/operations/receipts">RCP-2026-0043</Link>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <ArrowDownLeft className="h-3.5 w-3.5" /> Receipt
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="font-semibold text-slate-900">
                      Hydraulic Fluid ISO 46 (20L)
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      SKU-HYD-4620
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600">
                    Chemical Storage • Staging
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-600">
                    +40 pails
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    <StatusBadge status="READY" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Low Stock Alerts & Health */}
        <div className="rounded-lg border bg-surface p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Low Stock Thresholds
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Items requiring replenishment.
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Catalog
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-md border border-amber-200 bg-amber-50/60 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Ball Bearing 6204-2RS
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  SKU-BRG-6204 • Min: 50
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs font-bold text-amber-800">
                    8 units remaining
                  </span>
                </div>
              </div>
              <StatusBadge status="LOW_STOCK" />
            </div>

            <div className="p-3 rounded-md border border-rose-200 bg-rose-50/60 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Hex Bolt M10x50 Grade 8.8
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  SKU-BLT-1050 • Min: 200
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs font-bold text-rose-800">
                    0 units (Out of stock)
                  </span>
                </div>
              </div>
              <StatusBadge status="OUT_OF_STOCK" />
            </div>

            <div className="p-3 rounded-md border border-amber-200 bg-amber-50/60 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  PTFE Sealing Tape 19mm
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  SKU-TP-PTFE • Min: 30
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xs font-bold text-amber-800">
                    12 rolls remaining
                  </span>
                </div>
              </div>
              <StatusBadge status="LOW_STOCK" />
            </div>
          </div>

          <div className="pt-2 border-t text-xs text-slate-500 flex items-center justify-between">
            <span>Automated reorder checks active</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
