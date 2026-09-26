"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();

  // Form inputs exactly matching mockup
  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Client-side rule validation
  function validateInputs(): boolean {
    const errors: Record<string, string> = {};

    // 1. login ID should be unique and must be in between 6-12 characters
    const trimmedLoginId = loginId.trim();
    if (trimmedLoginId.length < 6 || trimmedLoginId.length > 12) {
      errors.loginId = "Login ID must be between 6 and 12 characters.";
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedLoginId)) {
      errors.loginId = "Login ID can only contain letters, numbers, and underscores.";
    }

    // 2. Email Id validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    // 3. Password must contain small case, large case, special character and length > 8
    if (password.length <= 8) {
      errors.password = "Password length must be more than 8 characters.";
    } else if (!/[a-z]/.test(password)) {
      errors.password = "Password must contain at least one lowercase letter.";
    } else if (!/[A-Z]/.test(password)) {
      errors.password = "Password must contain at least one uppercase letter.";
    } else if (!/[!@#$%^&*(),.?":{}|<>_~`=+\-\/\\[\]]/.test(password)) {
      errors.password = "Password must contain at least one special character.";
    }

    // 4. Re-Enter Password match
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loginId.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Successful registration: redirect to login or dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create user account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Top App Logo */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
          <Boxes className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          StockSense
        </span>
      </div>

      {/* Main Sign up Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-surface p-8 shadow-sm space-y-6">
        {/* Card Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center text-blue-600 mx-auto shadow-xs">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Sign up Page
          </h1>
          <p className="text-xs text-muted-foreground">
            Create a user account in the system
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Sign up Form matching mockup */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Field 1: Enter Login Id */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Enter Login Id
            </label>
            <Input
              type="text"
              placeholder="e.g. user_manager"
              value={loginId}
              onChange={(e) => {
                setLoginId(e.target.value);
                setFieldErrors((prev) => ({ ...prev, loginId: "" }));
              }}
              className={`h-10 text-xs ${fieldErrors.loginId ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
              required
            />
            {fieldErrors.loginId ? (
              <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.loginId}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">Must be between 6-12 characters</p>
            )}
          </div>

          {/* Field 2: Enter Email Id */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Enter Email Id
            </label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              className={`h-10 text-xs ${fieldErrors.email ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
              required
            />
            {fieldErrors.email && (
              <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* Field 3: Enter Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Enter Password
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: "" }));
              }}
              className={`h-10 text-xs ${fieldErrors.password ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
              required
            />
            {fieldErrors.password ? (
              <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.password}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                &gt;8 chars with uppercase, lowercase, and special character
              </p>
            )}
          </div>

          {/* Field 4: Re-Enter Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              Re-Enter Password
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              className={`h-10 text-xs ${fieldErrors.confirmPassword ? "border-rose-500 ring-1 ring-rose-500" : ""}`}
              required
            />
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-10 font-bold uppercase tracking-wider text-xs bg-blue-600 hover:bg-blue-700 shadow-sm mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating User...
              </>
            ) : (
              "SIGN UP"
            )}
          </Button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs pt-3 border-t text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
