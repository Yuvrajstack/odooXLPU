"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationConfig } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { X, Boxes, LogOut } from "lucide-react";
import { CurrentUser } from "@/types";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  currentUser?: CurrentUser;
}

export function MobileNav({ open, onClose, currentUser }: MobileNavProps) {
  const pathname = usePathname();

  if (!open) return null;

  const user = currentUser ?? {
    id: "usr-demo",
    name: "Alex Vance",
    email: "alex.vance@stocksense.io",
    role: "ADMIN" as const,
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-72 max-w-[80vw] bg-surface h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        <div className="h-14 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <Boxes className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-foreground">STOCKSENSE</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {navigationConfig.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </p>
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
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User bar */}
        <div className="p-3 border-t bg-slate-50 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {user.name}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {user.role}
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            className="p-1 text-slate-500 hover:text-rose-600"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
