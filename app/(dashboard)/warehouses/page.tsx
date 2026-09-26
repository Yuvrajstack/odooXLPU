import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WarehousesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses & Facilities"
        description="Physical multi-warehouse facilities, internal zones, and location topologies."
      >
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Warehouse
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Warehouse Card 1 */}
        <div className="rounded-lg border bg-surface p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Main Distribution Center
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  WH-MAIN
                </span>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Industrial Zone 4, Chicago, IL</span>
          </div>

          <div className="pt-3 border-t grid grid-cols-3 text-center text-xs">
            <div>
              <p className="font-semibold text-slate-900">12</p>
              <p className="text-[10px] text-muted-foreground">Locations</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">840</p>
              <p className="text-[10px] text-muted-foreground">SKUs Stored</p>
            </div>
            <div>
              <p className="font-semibold text-emerald-700">98%</p>
              <p className="text-[10px] text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Warehouse Card 2 */}
        <div className="rounded-lg border bg-surface p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Production Plant Warehouse
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  WH-PROD
                </span>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Sector 9, Detroit, MI</span>
          </div>

          <div className="pt-3 border-t grid grid-cols-3 text-center text-xs">
            <div>
              <p className="font-semibold text-slate-900">8</p>
              <p className="text-[10px] text-muted-foreground">Locations</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">415</p>
              <p className="text-[10px] text-muted-foreground">SKUs Stored</p>
            </div>
            <div>
              <p className="font-semibold text-emerald-700">99%</p>
              <p className="text-[10px] text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </div>

        {/* Warehouse Card 3 */}
        <div className="rounded-lg border bg-surface p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  West Coast Depot
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  WH-WEST
                </span>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Port Blvd, Oakland, CA</span>
          </div>

          <div className="pt-3 border-t grid grid-cols-3 text-center text-xs">
            <div>
              <p className="font-semibold text-slate-900">6</p>
              <p className="text-[10px] text-muted-foreground">Locations</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">165</p>
              <p className="text-[10px] text-muted-foreground">SKUs Stored</p>
            </div>
            <div>
              <p className="font-semibold text-emerald-700">97%</p>
              <p className="text-[10px] text-muted-foreground">Accuracy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
