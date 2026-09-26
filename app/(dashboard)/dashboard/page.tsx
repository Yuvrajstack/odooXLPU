"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Plus,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  Building2,
  Layers,
  FileText,
} from "lucide-react";
import { OperationStatus } from "@/types";

interface DashboardKPIs {
  totalProductsInStock: number;
  totalActiveSKUs: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  internalTransfersScheduled: number;
}

interface OperationItem {
  id: string;
  documentType: "RECEIPT" | "DELIVERY" | "TRANSFER" | "ADJUSTMENT";
  documentNumber: string;
  partner: string;
  warehouse: string;
  warehouseCode: string;
  status: OperationStatus;
  itemCount: number;
  primaryProduct: string;
  primarySku: string;
  primaryLocation: string;
  createdAt: string;
  href: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  locations?: Array<{ id: string; name: string; code: string }>;
}

interface CategoryOption {
  id: string;
  name: string;
  code: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Filters State
  const [filterDocType, setFilterDocType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  async function loadDashboardData() {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      if (filterDocType && filterDocType !== "ALL") queryParams.set("documentType", filterDocType);
      if (filterStatus) queryParams.set("status", filterStatus);
      if (filterWarehouse) queryParams.set("warehouseId", filterWarehouse);
      if (filterLocation) queryParams.set("locationId", filterLocation);
      if (filterCategory) queryParams.set("categoryId", filterCategory);

      const res = await fetch(`/api/dashboard?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setOperations(data.operations);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Initial lookup data (warehouses & categories)
  useEffect(() => {
    async function loadLookups() {
      try {
        const [whRes, catRes] = await Promise.all([
          fetch("/api/warehouses"),
          fetch("/api/categories"),
        ]);
        if (whRes.ok) {
          const whData = await whRes.json();
          // Fetch locations for each warehouse
          const detailed = await Promise.all(
            whData.map(async (wh: any) => {
              const r = await fetch(`/api/warehouses/${wh.id}`);
              return r.ok ? await r.json() : wh;
            })
          );
          setWarehouses(detailed);
        }
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
        }
      } catch (e) {
        console.error("Failed to load filter options", e);
      }
    }
    loadLookups();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [filterDocType, filterStatus, filterWarehouse, filterLocation, filterCategory]);

  const activeWarehouse = warehouses.find((w) => w.id === filterWarehouse);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Inventory Operations Dashboard"
        description="Real-time snapshot of warehouse inventory status, pending documents, and active movements."
      >
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadDashboardData}
            className="gap-1 text-xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/operations/receipts/new">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
              New Receipt
            </Button>
          </Link>
          <Link href="/operations/deliveries/new">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
              New Delivery
            </Button>
          </Link>
          <Link href="/operations/transfers/new">
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Transfer Stock
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Dashboard KPIs Required by Documentation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* KPI 1: Total Products in Stock */}
        <StatCard
          title="Total Products in Stock"
          value={kpis ? kpis.totalProductsInStock.toString() : "—"}
          change={`${kpis?.totalActiveSKUs ?? 0} active catalog SKUs`}
          changeType="positive"
          description="Available in warehouse inventory"
          icon={Package}
        />

        {/* KPI 2: Low Stock / Out of Stock */}
        <StatCard
          title="Low / Out of Stock"
          value={kpis ? (kpis.lowStockCount + kpis.outOfStockCount).toString() : "—"}
          change={`${kpis?.lowStockCount ?? 0} low, ${kpis?.outOfStockCount ?? 0} zero stock`}
          changeType={kpis && (kpis.lowStockCount + kpis.outOfStockCount > 0) ? "warning" : "positive"}
          description="Below reordering threshold"
          icon={AlertTriangle}
        />

        {/* KPI 3: Pending Receipts */}
        <StatCard
          title="Pending Receipts"
          value={kpis ? kpis.pendingReceipts.toString() : "—"}
          change="Incoming supplier stock"
          changeType="neutral"
          description="Draft, Waiting, or Ready"
          icon={ArrowDownLeft}
        />

        {/* KPI 4: Pending Deliveries */}
        <StatCard
          title="Pending Deliveries"
          value={kpis ? kpis.pendingDeliveries.toString() : "—"}
          change="Outgoing shipments"
          changeType="neutral"
          description="Awaiting pick/pack/validation"
          icon={ArrowUpRight}
        />

        {/* KPI 5: Internal Transfers Scheduled */}
        <StatCard
          title="Internal Transfers Scheduled"
          value={kpis ? kpis.internalTransfersScheduled.toString() : "—"}
          change="Inter-location movements"
          changeType="neutral"
          description="Active internal transfers"
          icon={ArrowLeftRight}
        />
      </div>

      {/* Dynamic Filters Section Required by Document */}
      <div className="rounded-lg border bg-surface p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Dynamic Operations Filter
            </h2>
          </div>
          {(filterDocType !== "ALL" ||
            filterStatus ||
            filterWarehouse ||
            filterLocation ||
            filterCategory) && (
            <button
              onClick={() => {
                setFilterDocType("ALL");
                setFilterStatus("");
                setFilterWarehouse("");
                setFilterLocation("");
                setFilterCategory("");
              }}
              className="text-[11px] text-blue-600 hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Document Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Document Type</label>
            <select
              value={filterDocType}
              onChange={(e) => setFilterDocType(e.target.value)}
              className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="ALL">All Documents</option>
              <option value="RECEIPT">Receipts (Incoming)</option>
              <option value="DELIVERY">Delivery Orders (Outgoing)</option>
              <option value="TRANSFER">Internal Transfers</option>
              <option value="ADJUSTMENT">Stock Adjustments</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Document Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="WAITING">Waiting</option>
              <option value="READY">Ready</option>
              <option value="DONE">Done</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>

          {/* Warehouse & Location Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Warehouse / Location</label>
            <div className="flex gap-1.5">
              <select
                value={filterWarehouse}
                onChange={(e) => {
                  setFilterWarehouse(e.target.value);
                  setFilterLocation("");
                }}
                className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>

              {activeWarehouse && activeWarehouse.locations && activeWarehouse.locations.length > 0 && (
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">All Locations</option>
                  {activeWarehouse.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Product Category Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Product Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full text-xs h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Snapshot Table: Unified Operational Documents */}
      <div className="rounded-lg border bg-surface p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Filtered Inventory Movements & Operations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live transactional view according to your active dynamic filters.
            </p>
          </div>
          <Link
            href="/operations/ledger"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Move History (Ledger) <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-3">Document</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Partner / Justification</th>
                <th className="py-2.5 px-3">Warehouse / Location</th>
                <th className="py-2.5 px-3 text-center">Lines</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading operations data...
                  </td>
                </tr>
              ) : operations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <p className="font-semibold">No operational documents match current filters.</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Try resetting filters or create a new receipt, delivery, transfer, or adjustment.
                    </p>
                  </td>
                </tr>
              ) : (
                operations.map((op) => (
                  <tr key={`${op.documentType}-${op.id}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      <Link href={op.href} className="hover:underline">
                        {op.documentNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      {op.documentType === "RECEIPT" && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" /> Receipt
                        </span>
                      )}
                      {op.documentType === "DELIVERY" && (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                          <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" /> Delivery
                        </span>
                      )}
                      {op.documentType === "TRANSFER" && (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" /> Transfer
                        </span>
                      )}
                      {op.documentType === "ADJUSTMENT" && (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-medium">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-purple-600" /> Adjustment
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {op.partner}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span>{op.warehouse}</span>
                      {op.primaryLocation && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {op.primaryLocation}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                      {op.itemCount}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={op.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link href={op.href}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-blue-600">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
