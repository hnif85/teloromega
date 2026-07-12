import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { StoreClient } from "./store-client";

export const dynamic = "force-dynamic";

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

interface StoreSettings {
  checkoutEnabled: boolean;
  paymentMethods: string[];
  minOrder: number;
  shippingEnabled: boolean;
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;

  const brand = await db.brand.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      logoUrl: true,
      phone: true,
      storeSettings: true,
    },
  });

  if (!brand) notFound();

  const products = await db.product.findMany({
    where: { brandId: brand.id, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      price: true,
      promoPrice: true,
      stock: true,
      description: true,
      imageUrl: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const defaults = { checkoutEnabled: true, paymentMethods: ["transfer", "cod", "qris"], minOrder: 0, shippingEnabled: false };
  const s = (brand.storeSettings ?? defaults) as StoreSettings;

  return <StoreClient brand={brand} products={products} settings={s} />;
}
