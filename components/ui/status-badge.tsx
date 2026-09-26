import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { OperationStatus, StockStatus } from "@/types";

interface StatusBadgeProps {
  status: OperationStatus | StockStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    // Operation Statuses
    case "DONE":
      return (
        <Badge variant="success" className={className}>
          Done
        </Badge>
      );
    case "READY":
      return (
        <Badge variant="info" className={className}>
          Ready
        </Badge>
      );
    case "WAITING":
      return (
        <Badge variant="warning" className={className}>
          Waiting
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge variant="secondary" className={className}>
          Draft
        </Badge>
      );
    case "CANCELED":
      return (
        <Badge variant="danger" className={className}>
          Canceled
        </Badge>
      );

    // Stock Statuses
    case "IN_STOCK":
      return (
        <Badge variant="success" className={className}>
          In Stock
        </Badge>
      );
    case "LOW_STOCK":
      return (
        <Badge variant="warning" className={className}>
          Low Stock
        </Badge>
      );
    case "OUT_OF_STOCK":
      return (
        <Badge variant="danger" className={className}>
          Out of Stock
        </Badge>
      );

    default:
      return (
        <Badge variant="outline" className={className}>
          {status}
        </Badge>
      );
  }
}
