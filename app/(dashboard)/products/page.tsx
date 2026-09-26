import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products Catalog"
        description="Master inventory catalog, SKUs, units of measure, and stock thresholds."
      >
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Product
        </Button>
      </PageHeader>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Filter by product name, SKU, or code..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700">
            <option value="">All Categories</option>
            <option value="raw">Raw Materials</option>
            <option value="hardware">Hardware & Fasteners</option>
            <option value="fluids">Fluids & Lubricants</option>
          </select>
          <select className="h-8 px-2 text-xs border rounded-md bg-slate-50 text-slate-700">
            <option value="">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-medium">
            <tr>
              <th className="py-2.5 px-3">SKU</th>
              <th className="py-2.5 px-3">Product Name</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">UOM</th>
              <th className="py-2.5 px-3 text-right">Reorder Point</th>
              <th className="py-2.5 px-3 text-right">On Hand</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                SKU-STL-0012
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                Industrial Steel Rod 12mm
              </td>
              <td className="py-2.5 px-3 text-slate-600">Raw Materials</td>
              <td className="py-2.5 px-3 text-slate-500 font-mono">meters</td>
              <td className="py-2.5 px-3 text-right font-mono">50</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                320
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="IN_STOCK" />
              </td>
            </tr>
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                SKU-BRG-6204
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                Ball Bearing 6204-2RS
              </td>
              <td className="py-2.5 px-3 text-slate-600">Hardware</td>
              <td className="py-2.5 px-3 text-slate-500 font-mono">units</td>
              <td className="py-2.5 px-3 text-right font-mono">50</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-700">
                8
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="LOW_STOCK" />
              </td>
            </tr>
            <tr className="hover:bg-slate-50/70">
              <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                SKU-BLT-1050
              </td>
              <td className="py-2.5 px-3 font-semibold text-slate-900">
                Hex Bolt M10x50 Grade 8.8
              </td>
              <td className="py-2.5 px-3 text-slate-600">Hardware</td>
              <td className="py-2.5 px-3 text-slate-500 font-mono">boxes</td>
              <td className="py-2.5 px-3 text-right font-mono">200</td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-700">
                0
              </td>
              <td className="py-2.5 px-3 text-center">
                <StatusBadge status="OUT_OF_STOCK" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
