// /api/payables/[id] — mark paid / update
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

  const item = await db.payable.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    return NextResponse.json({ error: "hutang tidak ditemukan" }, { status: 404 });
  }

  const updated = await db.payable.update({
    where: { id },
    data: { status: status ?? "paid" },
  });

  if ((status ?? "paid") === "paid") {
    await db.transaction.create({
      data: {
        userId,
        brandId: item.brandId,
        type: "expense",
        category: "lainnya",
        amount: item.amount,
        description: `Pelunasan hutang: ${item.supplierName}`,
        date: new Date(),
      },
    });
  }

  return NextResponse.json({ payable: updated });
}
