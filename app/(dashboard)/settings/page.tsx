import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, ArrowRight, ShieldCheck, Warehouse, Settings2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Warehouse topology management, transactional safety policies, and reorder threshold rules."
      />

      <div className="space-y-4">
        {/* Warehouse Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-blue-600" />
              Warehouse & Topology Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Manage multi-warehouse facilities, storage zones, racks, shelves, and bin configurations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-lg bg-slate-50 border gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Multi-Warehouse Facilities & Storage Locations
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Configure active distribution centers, staging zones, racks, shelves, and bin capacities.
                </p>
              </div>
              <Link href="/warehouses">
                <Button size="sm" className="gap-1 text-xs">
                  Manage Warehouses <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Rules Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-blue-600" />
              Reordering Rules & Stock Thresholds
            </CardTitle>
            <CardDescription className="text-xs">
              Global fallbacks for low stock calculations when product-level rules are not defined.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Default Reorder Point (Units)
                </label>
                <Input defaultValue="10" type="number" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Default Minimum Safety Stock (Units)
                </label>
                <Input defaultValue="5" type="number" />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm">Save Rules</Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactional Safety Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Transactional Safety & Ledger Audit Policy
            </CardTitle>
            <CardDescription className="text-xs">
              Core ledger invariance settings. Enforces atomic inventory operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 border">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Strict Ledger Invariance
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Enforces atomic PostgreSQL transaction for every inventory mutation and ledger entry.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 border">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Negative Inventory Prevention
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Rejects deliveries and transfers if location stock is less than requested quantity.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ENFORCED
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
