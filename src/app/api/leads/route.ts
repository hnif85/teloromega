// /api/leads — list & create
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ leads: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const leads = await db.lead.findMany({
    where: { brandId },
    include: { customer: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { brandId, name, phone, sourceChannel, notes } = body as {
    brandId: string;
    name: string;
    phone: string;
    sourceChannel?: string;
    notes?: string;
  };

  if (!brandId || !name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "brandId, name, phone wajib" }, { status: 400 });
  }

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  // Try linking to existing customer (by phone per brand)
  const existing = await db.customer.findUnique({
    where: { brandId_phone: { brandId, phone: phone.trim() } },
  });

  const lead = await db.lead.create({
    data: {
      brandId,
      name: name.trim(),
      phone: phone.trim(),
      sourceChannel: sourceChannel || "wa",
      stage: "Baru",
      notes: notes?.trim() || null,
      customerId: existing?.id ?? null,
      lastContactedAt: new Date(),
    },
    include: { customer: true },
  });
  return NextResponse.json({ lead });
}
