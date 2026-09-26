"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Mail, KeyRound, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Step 1: Request OTP | Step 2: Verify OTP & Reset Password | Step 3: Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [generatedOtpHint, setGeneratedOtpHint] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Request OTP
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate reset OTP");
      }

      setGeneratedOtpHint(data.otp);
      setOtp(data.otp); // prefill for easy demo
      setStep(2);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Submit OTP & New Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message || "An error occurred during password reset");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-surface p-7 shadow-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-11 w-11 rounded-lg bg-blue-600 items-center justify-center text-white mx-auto shadow-sm">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {step === 1 && "Forgot Password"}
            {step === 2 && "Enter OTP & Reset Password"}
            {step === 3 && "Password Reset Successful"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {step === 1 && "Enter your email to receive a 6-digit OTP reset code."}
            {step === 2 && `Enter the 6-digit code sent to ${email}`}
            {step === 3 && "Your password has been securely updated."}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Request OTP */}
        {step === 1 && (
          <form className="space-y-4" onSubmit={handleRequestOtp}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Work Email</label>
              <Input
                type="email"
                placeholder="admin@stocksense.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating OTP...
                </>
              ) : (
                "Send Reset OTP"
              )}
            </Button>
          </form>
        )}

        {/* Step 2: OTP & New Password */}
        {step === 2 && (
          <form className="space-y-4" onSubmit={handleResetPassword}>
            {generatedOtpHint && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 flex items-center justify-between">
                <span>
                  Demo OTP Code: <strong className="font-mono text-sm">{generatedOtpHint}</strong>
                </span>
                <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                  Demo auto-filled
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                6-Digit OTP Code
              </label>
              <Input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                className="font-mono text-center tracking-widest text-lg"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                New Password
              </label>
              <Input
                type="password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Resetting Password...
                </>
              ) : (
                "Confirm & Update Password"
              )}
            </Button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
            >
              Change Email
            </button>
          </form>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && (
          <div className="space-y-4 text-center py-2">
            <div className="inline-flex h-12 w-12 rounded-full bg-emerald-100 items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-xs text-slate-600">
              Your password has been reset successfully. You can now use your new password to sign in.
            </p>
            <Link href="/login" className="block w-full">
              <Button className="w-full">Sign In with New Password</Button>
            </Link>
          </div>
        )}

        {step !== 3 && (
          <div className="text-center text-xs text-slate-500 pt-2 border-t">
            <Link href="/login" className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
