// POST /api/products/[id]/image — upload product photo to Supabase Storage
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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

  // Parse multipart form data
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

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/avif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "format file tidak didukung (PNG, JPEG, WebP, GIF, AVIF)" }, { status: 400 });
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "ukuran file maksimal 5MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filePath = `${userId}/${product.id}.${ext}`;

  try {
    // Upload to Supabase Storage
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("[product-image] upload failed:", uploadError.message);
      return NextResponse.json({ error: "gagal upload gambar" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

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
