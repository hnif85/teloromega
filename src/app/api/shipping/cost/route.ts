// /api/shipping/cost — proxy ke RajaOngkir domestic cost calculation
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const RAJAONGKIR_KEY = process.env.RAJAONGKIR_API_KEY || "m3odbbuR0f8db6cee9a9ac2axPXSXVfr";
const BASE_URL = "https://rajaongkir.komerce.id/api/v1";

const AVAILABLE_COURIERS = [
  "jne", "sicepat", "jnt", "ninja", "tiki", "lion", "anteraja", "pos",
  "ncs", "rex", "rpx", "sentral", "star", "wahana", "dse", "ide", "sap",
];

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { brandId, destination, weight, couriers, price } = body;

  if (!brandId || !destination || !weight) {
    return NextResponse.json({ error: "brandId, destination, dan weight wajib" }, { status: 400 });
  }

  // Get brand's origin ID
  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  if (!brand.storeOriginId) {
    return NextResponse.json({ error: "Alamat toko belum diatur. Silakan set alamat toko terlebih dahulu." }, { status: 400 });
  }

  // Build courier string
  const courierList = couriers && couriers.length > 0
    ? couriers.filter((c: string) => AVAILABLE_COURIERS.includes(c)).join(":")
    : AVAILABLE_COURIERS.join(":");

  try {
    const formData = new URLSearchParams();
    formData.append("origin", String(brand.storeOriginId));
    formData.append("destination", String(destination));
    formData.append("weight", String(weight));
    formData.append("courier", courierList);
    formData.append("price", price || "lowest");

    const res = await fetch(`${BASE_URL}/calculate/domestic-cost`, {
      method: "POST",
      headers: {
        key: RAJAONGKIR_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    const data = await res.json();

    if (data.meta?.status !== "success") {
      return NextResponse.json({ error: data.meta?.message || "Gagal hitung ongkir" }, { status: 500 });
    }

    // Group by courier and sort by cost
    const results = (data.data ?? []).map((item: any) => ({
      courier: item.name,
      code: item.code,
      service: item.service,
      description: item.description,
      cost: item.cost,
      etd: item.etd || null,
    }));

    // Sort by cost ascending
    results.sort((a: any, b: any) => a.cost - b.cost);

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
