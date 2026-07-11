// /api/analytics/cohort — Cohort retention analysis
// Groups customers by first-order month. For each cohort, checks how many
// placed another order in subsequent months (offset 0 = acquisition month,
// offset 1 = next month, etc.). Returns retention rates per cohort.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface CohortRetentionPoint {
  monthOffset: number; // 0, 1, 2, ...
  label: string; // "M0", "M1", "M2"
  activeCustomers: number;
  retentionRate: number; // activeCustomers / size
}
export interface CohortEntry {
  cohortMonth: string; // "2026-01"
  cohortLabel: string; // "Jan 2026"
  size: number;
  retention: CohortRetentionPoint[];
}
export interface CohortResponse {
  cohorts: CohortEntry[];
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date): string {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) {
    return NextResponse.json<CohortResponse>({ cohorts: [] }, { status: 200 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const months = Math.min(24, Math.max(1, Number(req.nextUrl.searchParams.get("months")) || 6));

  // ── Fetch customers with their non-cancelled orders ────────────────
  const customers = await db.customer.findMany({
    where: { brandId },
    select: {
      id: true,
      firstOrderAt: true,
      createdAt: true,
      orders: {
        where: { status: { not: "Dibatalkan" } },
        select: { id: true, createdAt: true },
      },
    },
  });

  // Only consider customers with at least one order
  const buyers = customers.filter((c) => c.orders.length > 0);
  if (buyers.length === 0) {
    return NextResponse.json<CohortResponse>({ cohorts: [] }, { status: 200 });
  }

  const now = new Date();
  // Cohort window: last N months (current month + N-1 prior)
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  // ── Group customers by first-order month ───────────────────────────
  // For each customer, firstOrder = earliest of firstOrderAt or first order's createdAt
  interface CustomerCohort {
    cohortKey: string; // "2026-01"
    cohortDate: Date; // first day of cohort month
    activeMonths: Set<string>; // set of "YYYY-MM" strings where they placed an order
  }
  const cohortMap = new Map<string, CustomerCohort[]>();

  for (const c of buyers) {
    const firstOrderDate = c.orders
      .map((o) => new Date(o.createdAt))
      .reduce((min, d) => (d < min ? d : min), new Date(c.firstOrderAt ?? c.createdAt));
    const cohortDate = new Date(firstOrderDate.getFullYear(), firstOrderDate.getMonth(), 1);
    const key = monthKey(cohortDate);
    // Skip cohorts outside the window
    if (cohortDate < windowStart) continue;

    const activeMonths = new Set<string>();
    for (const o of c.orders) {
      const od = new Date(o.createdAt);
      activeMonths.add(monthKey(new Date(od.getFullYear(), od.getMonth(), 1)));
    }
    // Also count firstOrderAt as active month if present and not already covered
    if (c.firstOrderAt) {
      const fd = new Date(c.firstOrderAt);
      activeMonths.add(monthKey(new Date(fd.getFullYear(), fd.getMonth(), 1)));
    }

    const arr = cohortMap.get(key) ?? [];
    arr.push({ cohortKey: key, cohortDate, activeMonths });
    cohortMap.set(key, arr);
  }

  // ── Build cohort entries ────────────────────────────────────────────
  const cohortEntries: CohortEntry[] = [];
  for (const [key, members] of cohortMap.entries()) {
    const cohortDate = members[0].cohortDate;
    const size = members.length;

    // Determine max offset to render — from cohort month to current month
    const monthsSinceCohort =
      (now.getFullYear() - cohortDate.getFullYear()) * 12 + (now.getMonth() - cohortDate.getMonth());
    const maxOffset = Math.min(monthsSinceCohort, months - 1);

    const retention: CohortRetentionPoint[] = [];
    for (let offset = 0; offset <= maxOffset; offset++) {
      const targetDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + offset, 1);
      const targetKey = monthKey(targetDate);
      const active = members.filter((m) => m.activeMonths.has(targetKey)).length;
      retention.push({
        monthOffset: offset,
        label: `M${offset}`,
        activeCustomers: active,
        retentionRate: size > 0 ? Math.round((active / size) * 100) : 0,
      });
    }

    cohortEntries.push({
      cohortMonth: key,
      cohortLabel: monthLabel(cohortDate),
      size,
      retention,
    });
  }

  // Sort by cohort month ascending (oldest first → newest last)
  cohortEntries.sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth));

  return NextResponse.json<CohortResponse>({ cohorts: cohortEntries });
}
