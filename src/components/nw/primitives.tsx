"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/nw/animated-number";

// Title + icon (+ subtitle) portal into the topbar's #topbar-title-slot on
// desktop, so the page title sits inline with the search/notif/credit
// cluster instead of taking its own big banner row. Mobile has no room for
// that up top, so the same title block also renders inline on the page
// there (hidden on md+). `actions` (filters, toggles, refresh buttons —
// content that's specific to the page, not just a label) stays in-page on
// every breakpoint, right-aligned in the row the title used to occupy.
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById("topbar-title-slot"));
  }, []);

  const titleBlock = (
    <div className="flex items-center gap-2.5 min-w-0">
      {icon && <span className="text-lg leading-none shrink-0">{icon}</span>}
      <div className="min-w-0 leading-tight">
        <h1 className="text-[15px] font-bold text-ink truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-stone truncate hidden lg:block">{subtitle}</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {slot && createPortal(titleBlock, slot)}
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3",
          actions ? "mb-5" : "mb-5 md:mb-0",
          className
        )}
      >
        <div className="md:hidden min-w-0">{titleBlock}</div>
        {actions && <div className="flex flex-wrap items-center gap-2 md:ml-auto">{actions}</div>}
      </div>
    </>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  accent = "teal",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  trend?: { value: string; up: boolean };
  accent?: "teal" | "orange" | "success" | "warning" | "stone";
}) {
  const accents: Record<string, string> = {
    teal: "bg-teal-100 text-teal-600",
    orange: "bg-orange-100 text-orange-600",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    stone: "bg-stone-200 text-stone-700",
  };
  // If value is a plain number, animate the count-up.
  const isNumeric = typeof value === "number";
  return (
    <div className="card-hover card-shimmer rounded-2xl bg-card border border-border p-4 hover:border-teal/30">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("size-9 rounded-lg flex items-center justify-center text-lg", accents[accent])}>
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded-md",
              trend.up ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}
          >
            {trend.up ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
      <div className="text-2xl font-extrabold text-ink tabular-nums">
        {isNumeric ? <AnimatedNumber value={value as number} /> : value}
      </div>
      <div className="text-xs text-stone mt-0.5">{label}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="fade-in rounded-2xl border border-dashed border-border bg-cream-100/60 mesh-hero p-10 text-center">
      <div className="size-16 rounded-2xl bg-cream-200 text-stone mx-auto flex items-center justify-center text-3xl mb-3 shadow-[0_4px_16px_rgba(13,148,136,0.18)]">
        {icon}
      </div>
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="text-sm text-stone mt-1 max-w-md mx-auto leading-relaxed">{desc}</p>
      {action && (
        <div className="mt-4 flex justify-center">
          <div className="rounded-lg transition-shadow duration-200 hover:shadow-[0_0_0_3px_rgba(13,148,136,0.15)]">
            {action}
          </div>
        </div>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  desc,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  desc?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("card-hover table-row-hover rounded-2xl bg-card border border-border", className)}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-border">
          <div>
            {title && <h3 className="font-bold text-ink text-sm">{title}</h3>}
            {desc && <p className="text-xs text-stone mt-0.5">{desc}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </div>
  );
}
