import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CheckOrderClient } from "./check-order-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CekPesananPage({ params }: PageProps) {
  const { slug } = await params;

  const brand = await db.brand.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      phone: true,
    },
  });

  if (!brand) notFound();

  return <CheckOrderClient brand={brand} />;
}
