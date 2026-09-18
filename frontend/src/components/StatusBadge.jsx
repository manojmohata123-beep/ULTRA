import React from "react";
import { statusStyle } from "@/lib/format";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status, className }) => (
  <span
    data-testid="status-badge"
    className={cn(
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
      statusStyle(status),
      className
    )}
  >
    {status}
  </span>
);
