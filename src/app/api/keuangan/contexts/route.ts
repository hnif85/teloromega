// /api/keuangan/contexts — list keuangan contexts for the projection tab
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ParsedContext {
  proyeksi_margin?: {
    skenario?: string;
    asumsi_modal?: number | string;
    margin_sebelum?: number | string;
    margin_sesudah?: number | string;
    rekomendasi?: string;
    estimasi_volume_change?: string | number;
  };
  harga_pasar?: { rata_rata?: number | string };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ contexts: [] });

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand || brand.userId !== userId) {
    return NextResponse.json({ error: "brand tidak ditemukan" }, { status: 404 });
  }

  const rows = await db.context.findMany({
    where: { brandId, targetModule: "keuangan" },
    orderBy: { createdAt: "desc" },
    include: {
      research: { select: { query: true, intent: true, createdAt: true } },
      contextUsage: { select: { id: true, usedFor: true, createdAt: true } },
    },
  });

  const contexts = rows.map((c) => {
    let parsed: ParsedContext = {};
    try {
      parsed = JSON.parse(c.contextJson) as ParsedContext;
    } catch {
      /* ignore */
    }
    const pm = parsed.proyeksi_margin ?? {};
    return {
      id: c.id,
      createdAt: c.createdAt,
      researchQuery: c.research?.query ?? "",
      researchIntent: c.research?.intent ?? null,
      skenario: pm.skenario ?? "Proyeksi Margin",
      asumsiModal: pm.asumsi_modal ?? null,
      marginSebelum: pm.margin_sebelum ?? null,
      marginSesudah: pm.margin_sesudah ?? null,
      rekomendasi: pm.rekomendasi ?? null,
      estimasiVolumeChange: pm.estimasi_volume_change ?? null,
      used: c.contextUsage.length > 0,
      usedCount: c.contextUsage.length,
      lastUsedAt: c.contextUsage[0]?.createdAt ?? null,
    };
  });

  return NextResponse.json({ contexts });
}
