import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductDetailClient } from "./product-detail-client";
import type { StoreSettings } from "../../theme";

export const dynamic = "force-dynamic";

interface DetailPageProps {
  params: Promise<{ slug: string; productId: string }>;
}

export default async function ProductDetailPage({ params }: DetailPageProps) {
  const { slug, productId } = await params;

  const brand = await db.brand.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, logoUrl: true, phone: true, storeSettings: true },
  });
  if (!brand) notFound();

  const product = await db.product.findFirst({
    where: { id: productId, brandId: brand.id, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      price: true,
      promoPrice: true,
      stock: true,
      sku: true,
      description: true,
      imageUrl: true,
    },
  });
  if (!product) notFound();

  const similar = await db.product.findMany({
    where: { brandId: brand.id, isActive: true, id: { not: product.id } },
    select: { id: true, name: true, type: true, price: true, promoPrice: true, stock: true, description: true, imageUrl: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const defaults: StoreSettings = { checkoutEnabled: true, paymentMethods: ["transfer", "cod", "qris"], minOrder: 0, shippingEnabled: false };
  const settings = { ...defaults, ...((brand.storeSettings ?? {}) as Partial<StoreSettings>) };

  return <ProductDetailClient brand={brand} product={product} similar={similar} settings={settings} />;
}
