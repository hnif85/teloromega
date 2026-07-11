// /api/brands/[id] — update
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { slugify, CATEGORIES } from "@/lib/constants";

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

  // Validate category if provided
  if (category !== undefined && !CATEGORIES.includes(category as typeof CATEGORIES[number])) {
    return NextResponse.json({ error: "kategori tidak valid" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) {
      return NextResponse.json({ error: "nama brand tidak boleh kosong" }, { status: 400 });
    }
    data.name = trimmed;
    // Update slug if name changed
    if (trimmed !== brand.name) {
      const base = slugify(trimmed);
      let slug = base;
      let n = 2;
      while (true) {
        const existing = await db.brand.findUnique({ where: { slug } });
        if (!existing || existing.id === id) break;
        slug = `${base}-${n}`;
        n += 1;
      }
      data.slug = slug;
    }
  }
  if (description !== undefined) data.description = description?.trim() || null;
  if (category !== undefined) data.category = category;
  if (logoUrl !== undefined) data.logoUrl = logoUrl?.trim() || null;
  if (toneOfVoice !== undefined) data.toneOfVoice = toneOfVoice;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "tidak ada field untuk diupdate" }, { status: 400 });
  }

  const updated = await db.brand.update({
    where: { id },
    data,
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
