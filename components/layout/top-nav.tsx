"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  Building2,
  Menu,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopNavProps {
  onOpenMobileMenu: () => void;
}

export function TopNav({ onOpenMobileMenu }: TopNavProps) {
  const pathname = usePathname();

  // Simple breadcrumb segment generator
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumb =
    segments.length === 0
      ? "Dashboard"
      : segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ");

  return (
    <header className="h-14 border-b bg-surface px-4 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left side: Mobile trigger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={onOpenMobileMenu}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">StockSense</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-foreground">{breadcrumb}</span>
        </div>
      </div>

      {/* Center/Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Warehouse Switcher Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-slate-50 text-slate-700 text-xs">
          <Building2 className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-medium">Main Warehouse (WH-MAIN)</span>
        </div>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-48 lg:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search SKU, items, transfers..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-muted-foreground"
          />
        </div>

        {/* Real-time Sync Indicator */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-600 font-medium px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          <span>Synchronized</span>
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
