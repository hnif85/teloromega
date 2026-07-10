// /api/brands/[id] — update
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const brand = await db.brand.findUnique({ where: { id } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }
  const body = await req.json();
  const { name, description, category, logoUrl, toneOfVoice } = body;
  const updated = await db.brand.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(toneOfVoice !== undefined ? { toneOfVoice } : {}),
    },
  });
  return NextResponse.json({ brand: updated });
}

// Soft-delete a brand (sets isActive=false).
// Refuses to delete the user's last active brand so they always have one to work with.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const brand = await db.brand.findUnique({ where: { id } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }
  // Check if this is the user's last active brand — don't allow deleting the last brand
  const activeCount = await db.brand.count({ where: { userId, isActive: true } });
  if (activeCount <= 1) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus brand terakhir. Buat brand baru dulu." },
      { status: 400 }
    );
  }
  // Soft delete
  await db.brand.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
