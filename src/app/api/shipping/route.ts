// /api/shipping — list orders that need shipping (barang items, status Diproses, no resi)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ orders: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Get all orders in scope (Baru/Diproses/Dikirim) with items containing barang
  const orders = await db.order.findMany({
    where: {
      brandId,
      status: { in: ["Baru", "Diproses", "Dikirim"] },
    },
    include: { customer: true, lead: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  // Filter: keep orders that have at least one barang item
  const filtered = orders.filter((o) => {
    try {
      const items = JSON.parse(o.items) as { type?: string }[];
      return items.some((i) => i.type === "barang");
    } catch {
      return false;
    }
  });

  return NextResponse.json({ orders: filtered });
}
