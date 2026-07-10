// /api/credit/packages — static package list
import { NextResponse } from "next/server";
import { CREDIT_PACKAGES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ packages: CREDIT_PACKAGES });
}
