"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("admin_user");
  const [password, setPassword] = useState("StockSense2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Exact error message mandated by requirements: "Invalid Login Id or Password"
        throw new Error(data.error || "Invalid Login Id or Password");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid Login Id or Password");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(userLoginId: string) {
    setLoginId(userLoginId);
    setPassword("StockSense2026!");
    setError(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Top App Logo Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
          <Boxes className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          StockSense
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-surface p-8 shadow-sm space-y-6">
        {/* Card Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center text-blue-600 mx-auto shadow-xs">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Login Page
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in with your registered credentials
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Fields matching mockup */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Login Id
            </label>
            <Input
              type="text"
              placeholder="Enter Login Id or Email"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-bold uppercase tracking-wider text-xs bg-blue-600 hover:bg-blue-700 shadow-sm mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing In...
              </>
            ) : (
              "SIGN IN"
            )}
          </Button>
        </form>

        {/* Footer Navigation Links: Forget Password ? | Sign Up */}
        <div className="text-center text-xs pt-3 border-t flex items-center justify-center gap-2 text-slate-600">
          <Link
            href="/forgot-password"
            className="text-blue-600 font-medium hover:underline"
          >
            Forget Password ?
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href="/signup"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign Up
          </Link>
        </div>

        {/* Quick Demo Credentials */}
        <div className="pt-2 text-[11px] text-slate-500 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p className="font-semibold text-slate-700">Quick Test Logins:</p>
          <div className="flex flex-col gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => fillDemo("admin_user")}
              className="text-left text-blue-600 hover:underline flex items-center justify-between font-mono"
            >
              <span>Login ID: <strong>admin_user</strong></span>
              <span className="font-sans text-[10px] text-slate-500 bg-slate-200/70 px-1 rounded">Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("manager123")}
              className="text-left text-blue-600 hover:underline flex items-center justify-between font-mono"
            >
              <span>Login ID: <strong>manager123</strong></span>
              <span className="font-sans text-[10px] text-slate-500 bg-slate-200/70 px-1 rounded">Manager</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("staff_123")}
              className="text-left text-blue-600 hover:underline flex items-center justify-between font-mono"
            >
              <span>Login ID: <strong>staff_123</strong></span>
              <span className="font-sans text-[10px] text-slate-500 bg-slate-200/70 px-1 rounded">Staff</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
