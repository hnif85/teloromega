// /api/shipping/search — proxy ke RajaOngkir destination search
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const RAJAONGKIR_KEY = process.env.RAJAONGKIR_API_KEY || "m3odbbuR0f8db6cee9a9ac2axPXSXVfr";
const BASE_URL = "https://rajaongkir.komerce.id/api/v1";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search");
  const limit = req.nextUrl.searchParams.get("limit") || "10";
  const offset = req.nextUrl.searchParams.get("offset") || "0";

  if (!search || search.length < 2) {
    return NextResponse.json({ error: "search minimal 2 karakter" }, { status: 400 });
  }

  try {
    const url = `${BASE_URL}/destination/domestic-destination?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { key: RAJAONGKIR_KEY },
    });
    const data = await res.json();

    if (data.meta?.status !== "success") {
      return NextResponse.json({ error: data.meta?.message || "Gagal mencari alamat" }, { status: 500 });
    }

    return NextResponse.json({ destinations: data.data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
