// /api/receivables/[id] — mark paid / update
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: "paid" | "outstanding" };

  const item = await db.receivable.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    return NextResponse.json({ error: "piutang tidak ditemukan" }, { status: 404 });
  }

  const updated = await db.receivable.update({
    where: { id },
    data: { status: status ?? "paid" },
  });

  // If marked paid, also create an income transaction (optional, default on)
  if ((status ?? "paid") === "paid") {
    await db.transaction.create({
      data: {
        userId,
        brandId: item.brandId,
        type: "income",
        category: "penjualan",
        amount: item.amount,
        description: `Pelunasan piutang: ${item.customerName}`,
        date: new Date(),
        customerId: item.customerId ?? null,
      },
    });
  }

  return NextResponse.json({ receivable: updated });
}
