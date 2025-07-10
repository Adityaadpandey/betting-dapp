"use client";

import { cn } from "@/lib/utils"; // Optional utility for merging classNames

export function Spinner({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn("animate-spin text-muted-foreground", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
