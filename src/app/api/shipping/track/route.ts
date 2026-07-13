// /api/shipping/track — proxy ke RajaOngkir waybill tracking
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const RAJAONGKIR_KEY = process.env.RAJAONGKIR_API_KEY || "m3odbbuR0f8db6cee9a9ac2axPXSXVfr";
const BASE_URL = "https://rajaongkir.komerce.id/api/v1";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { awb, courier } = body;

  if (!awb || !courier) {
    return NextResponse.json({ error: "awb dan courier wajib" }, { status: 400 });
  }

  try {
    const url = `${BASE_URL}/track/waybill?awb=${encodeURIComponent(awb)}&courier=${encodeURIComponent(courier)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { key: RAJAONGKIR_KEY },
    });
    const data = await res.json();

    if (data.meta?.status !== "success") {
      return NextResponse.json({
        error: data.meta?.message || "Gagal lacak paket",
        found: false,
      }, { status: data.meta?.code === 404 ? 404 : 500 });
    }

    const tracking = data.data;
    return NextResponse.json({
      found: true,
      summary: tracking?.summary ?? null,
      history: tracking?.history ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, found: false }, { status: 500 });
  }
}
