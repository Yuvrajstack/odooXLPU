import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="System Settings"
        description="Configure operational parameters, default units, low-stock thresholds, and security policies."
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Threshold Rules</CardTitle>
            <CardDescription>
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
                  Critical Stock Warning Level
                </label>
                <Input defaultValue="3" type="number" />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm">Save Rules</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactional Safety & Audit Policy</CardTitle>
            <CardDescription>
              Core ledger invariance settings. Strict mode prevents any uncommitted stock deductions.
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
