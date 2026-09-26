import React from "react";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border bg-surface p-6 shadow-sm space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-10 w-10 rounded-md bg-blue-600 items-center justify-center text-white mx-auto shadow-sm">
            <Boxes className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Sign in to StockSense
          </h1>
          <p className="text-xs text-muted-foreground">
            Enterprise Inventory & Warehouse Management
          </p>
        </div>

        {/* Login form */}
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Work Email
            </label>
            <Input
              type="email"
              placeholder="user@stocksense.io"
              defaultValue="admin@stocksense.io"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-blue-600 hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••••••"
              defaultValue="StockSense2026!"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            Sign In
          </Button>
        </form>

        {/* Demo credentials hint */}
        <div className="pt-3 border-t text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
          <p className="font-semibold text-slate-700">Default Demo Credentials:</p>
          <p>
            <span className="font-mono text-slate-600">admin@stocksense.io</span> /{" "}
            <span className="font-mono text-slate-600">StockSense2026!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
