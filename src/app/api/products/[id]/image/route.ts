// POST /api/products/[id]/image — upload product photo to Supabase Storage
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify product ownership
  const product = await db.product.findUnique({
    where: { id },
    include: { brand: { select: { userId: true } } },
  });
  if (!product || product.brand.userId !== userId) {
    return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file wajib diupload" }, { status: 400 });
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "format file tidak didukung" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "ukuran file maksimal 5MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filePath = `${userId}/${product.id}.${ext}`;

  try {
    // Upload via raw Supabase Storage REST API
    const uploadForm = new FormData();
    uploadForm.append("file", file);

    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/product-images/${filePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: uploadForm,
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.error("[product-image] upload failed:", res.status, errText);
      return NextResponse.json({ error: "gagal upload gambar" }, { status: 500 });
    }

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;

    // Update product with new image URL
    await db.product.update({
      where: { id },
      data: { imageUrl },
    });

    return NextResponse.json({ imageUrl });
  } catch (err: any) {
    console.error("[product-image] error:", err);
    return NextResponse.json({ error: "gagal upload gambar" }, { status: 500 });
  }
}
