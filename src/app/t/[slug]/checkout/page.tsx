import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CheckoutClient from "./checkout-client";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

interface StoreSettings {
  paymentMethods: string[];
  minOrder: number;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;

  const brand = await db.brand.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      phone: true,
      storeSettings: true,
    },
  });

  if (!brand) notFound();

  const defaults = { paymentMethods: ["transfer", "cod", "qris"], minOrder: 0 };
  const s = (brand.storeSettings ?? defaults) as StoreSettings;

  return <CheckoutClient brand={brand} settings={s} />;
}
