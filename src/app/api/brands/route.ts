// /api/brands — list, create
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { slugify, CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const brands = await db.brand.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ brands });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, description, category, logoUrl, toneOfVoice } = body as {
    name: string;
    description?: string;
    category: string;
    logoUrl?: string;
    toneOfVoice?: string;
  };

  if (!name?.trim() || !category) {
    return NextResponse.json({ error: "name & category wajib" }, { status: 400 });
  }
  if (!CATEGORIES.includes(category as typeof CATEGORIES[number])) {
    return NextResponse.json({ error: "kategori tidak valid" }, { status: 400 });
  }

  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (await db.brand.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }

  const brand = await db.brand.create({
    data: {
      userId,
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      category,
      logoUrl: logoUrl?.trim() || null,
      toneOfVoice: toneOfVoice ?? "santai_ramah",
    },
  });
  return NextResponse.json({ brand });
}
