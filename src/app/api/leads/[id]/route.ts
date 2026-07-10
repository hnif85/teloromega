// /api/leads/[id] — update stage/notes & delete
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getOwnedLead(userId: string, id: string) {
  const lead = await db.lead.findUnique({ where: { id }, include: { brand: true } });
  if (!lead || lead.brand.userId !== userId) return null;
  return lead;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const lead = await getOwnedLead(userId, id);
  if (!lead) return NextResponse.json({ error: "lead tidak ditemukan" }, { status: 404 });

  const body = await req.json();
  const { stage, notes } = body as { stage?: string; notes?: string };

  const data: Record<string, unknown> = {};
  if (stage !== undefined) data.stage = stage;
  if (notes !== undefined) data.notes = notes?.trim() || null;

  // If stage becomes "Deal": auto-create Customer if not exist (match by phone per brand)
  if (stage === "Deal" && !lead.customerId) {
    const existing = await db.customer.findUnique({
      where: { brandId_phone: { brandId: lead.brandId, phone: lead.phone } },
    });
    if (existing) {
      data.customerId = existing.id;
    } else {
      const newCustomer = await db.customer.create({
        data: {
          brandId: lead.brandId,
          name: lead.name,
          phone: lead.phone,
          firstOrderAt: null,
          totalOrders: 0,
          totalSpent: 0,
        },
      });
      data.customerId = newCustomer.id;
    }
  }

  const updated = await db.lead.update({
    where: { id },
    data,
    include: { customer: true },
  });
  return NextResponse.json({ lead: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const lead = await getOwnedLead(userId, id);
  if (!lead) return NextResponse.json({ error: "lead tidak ditemukan" }, { status: 404 });

  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
