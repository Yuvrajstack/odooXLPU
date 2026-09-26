"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationConfig } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Boxes,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { CurrentUser } from "@/types";

interface SidebarProps {
  currentUser?: CurrentUser;
}

export function Sidebar({ currentUser }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Fallback demo user if not logged in yet
  const user = currentUser ?? {
    id: "usr-demo",
    name: "Alex Vance",
    email: "alex.vance@stocksense.io",
    role: "ADMIN" as const,
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r bg-surface h-screen sticky top-0 transition-all duration-200 z-30 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden transition-opacity",
            collapsed && "justify-center w-full"
          )}
        >
          <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Boxes className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-foreground leading-none">
                STOCKSENSE
              </span>
              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                v1.0 • Enterprise
              </span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {navigationConfig.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed ? (
              <p className="px-2 pb-1 text-[11px] font-semibold text-slate-400 tracking-wider">
                {section.title}
              </p>
            ) : (
              <div className="w-full h-px bg-slate-200 my-2" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group relative",
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/50 dark:text-blue-400"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-slate-500 group-hover:text-slate-800 dark:text-slate-400"
                      )}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1">{item.title}</span>
                    )}

                    {item.badge && !collapsed && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded bg-slate-200/60 font-mono text-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Expand Button for Collapsed Mode */}
      {collapsed && (
        <div className="p-2 border-t flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* User Footer */}
      <div className="p-2 border-t bg-slate-50/50 dark:bg-slate-900/20">
        <div
          className={cn(
            "flex items-center gap-2.5 p-1 rounded-md",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                  {user.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block text-[10px] uppercase font-mono px-1 py-0.1 rounded bg-slate-200 text-slate-700 font-medium">
                    {user.role}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="flex items-center gap-1">
              <Link
                href="/profile"
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded"
                title="Profile Settings"
              >
                <UserIcon className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => {
                  window.location.href = "/login";
                }}
                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
