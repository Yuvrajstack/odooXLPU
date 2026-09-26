import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral" | "warning";
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  description,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden hover:border-slate-300 transition-colors", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {Icon && (
            <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </div>
          {change && (
            <span
              className={cn(
                "text-xs font-medium",
                changeType === "positive" && "text-emerald-600",
                changeType === "negative" && "text-rose-600",
                changeType === "warning" && "text-amber-600",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
