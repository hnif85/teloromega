// /api/keuangan/extract-receipt — OCR struk via AI multimodal
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { extractReceiptFromImage, setAiContext } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "image file required" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "file must be an image" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  setAiContext({ feature: "extract_receipt", userId, service: "Receipt OCR" });

  const data = await extractReceiptFromImage(base64, file.type);

  if (!data) {
    return NextResponse.json({ error: "gagal membaca struk" }, { status: 422 });
  }

  return NextResponse.json({ data });
}
