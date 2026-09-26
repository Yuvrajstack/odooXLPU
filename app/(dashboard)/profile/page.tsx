import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProfilePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="User Profile"
        description="Manage your account credentials, security access, and notification preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            Assigned roles and operational identity in StockSense.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-blue-100 text-blue-700 font-bold">
                AV
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Alex Vance</h3>
              <p className="text-xs text-slate-500 font-mono">alex.vance@stocksense.io</p>
              <span className="inline-block mt-1 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                ADMIN
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Full Name</label>
              <Input defaultValue="Alex Vance" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <Input defaultValue="alex.vance@stocksense.io" disabled />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button size="sm">Save Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
