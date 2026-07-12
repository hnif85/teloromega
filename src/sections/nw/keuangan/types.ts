// Shared types for the Keuangan module (frontend only)
export type PeriodKey = "month" | "quarter" | "year";

export type TxType = "income" | "expense";

export type TxCategory =
  | "penjualan_produk"
  | "jasa_layanan"
  | "pendapatan_lain"
  | "bahan_baku"
  | "sewa"
  | "listrik_internet"
  | "marketing"
  | "gaji"
  | "transportasi"
  | "operasional_lain"
  | "penjualan"     // legacy
  | "operasional"   // legacy
  | "lainnya";      // legacy

export interface TransactionRow {
  id: string;
  type: TxType;
  category: string;
  amount: number;
  costAmount: number | null;
  quantity: number | null;
  description: string | null;
  date: string;
  productId: string | null;
  customerId: string | null;
  orderId: string | null;
  product: { id: string; name: string; price: number; costPrice: number | null } | null;
  customer: { id: string; name: string; phone: string } | null;
  order: { id: string; resiNumber: string | null; status: string } | null;
}

export interface SummaryResponse {
  period: PeriodKey;
  from: string;
  to: string;
  totalIncome: number;
  totalExpense: number;
  totalHPP: number;
  grossProfit: number;
  otherExpenses: number;
  netProfit: number;
  marginPct: number;
  byCategory: { category: string; income: number; expense: number; count: number }[];
  monthlyTrend: { month: string; income: number; expense: number; profit: number }[];
  cashFlow: { inflow: number; outflow: number; net: number; warning: boolean };
  incompleteMarginCount: number;
  incompleteMarginProducts: { id: string; name: string; count: number }[];
  taxEstimate: {
    pphUmkm: number;
    ppnEstimate: number;
    total: number;
    note: string;
  };
}

export interface ReceivableRow {
  id: string;
  brandId: string;
  customerId: string | null;
  customerName: string;
  amount: number;
  dueDate: string;
  status: "outstanding" | "overdue" | "paid";
  createdAt: string;
  customer: { id: string; name: string; phone: string } | null;
}

export interface PayableRow {
  id: string;
  brandId: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  status: "outstanding" | "overdue" | "paid";
  createdAt: string;
}

export interface OperationalCostRow {
  id: string;
  brandId: string;
  category: string;
  amount: number;
  recurring: boolean;
  date: string;
  createdAt: string;
}

export interface OperationalStats {
  totalThisMonth: number;
  totalMonthlyRecurring: number;
  countThisMonth: number;
  countRecurring: number;
}

export interface KeuanganContextRow {
  id: string;
  createdAt: string;
  researchQuery: string;
  researchIntent: string | null;
  skenario: string;
  asumsiModal: number | string | null;
  marginSebelum: number | string | null;
  marginSesudah: number | string | null;
  rekomendasi: string | null;
  estimasiVolumeChange: string | number | null;
  used: boolean;
  usedCount: number;
  lastUsedAt: string | null;
}

export interface ProjectionResponse {
  projection: {
    contextId: string;
    skenario: string;
    asumsiModal: number;
    marginSebelum: number;
    marginSesudah: number;
    estimasiVolumeChange: string | number | null;
    rekomendasiContext: string | null;
    product: {
      id: string;
      name: string;
      price: number;
      costPrice: number | null;
      currentMargin: number;
      currentMarginPct: number;
    } | null;
    breakEven: {
      volume: number;
      fixedCostMonthly: number;
      marginPerUnit: number;
      note: string;
    } | null;
    narasi: string;
    rekomendasiTindakan: string;
    risiko: string[];
  };
  charged: { credits: number; balanceAfter: number };
  createdAt: string;
}

export const TX_CATEGORY_LABELS: Record<string, string> = {
  penjualan_produk: "Penjualan Produk",
  jasa_layanan: "Jasa / Layanan",
  pendapatan_lain: "Pendapatan Lainnya",
  bahan_baku: "Bahan Baku / Stok",
  sewa: "Sewa Tempat",
  listrik_internet: "Listrik, Air, Internet",
  marketing: "Marketing / Iklan",
  gaji: "Gaji Karyawan",
  transportasi: "Transportasi / Kirim",
  operasional_lain: "Operasional Lainnya",
  // legacy
  penjualan: "Penjualan",
  operasional: "Operasional",
  lainnya: "Lainnya",
};

export const INCOME_CATEGORIES = ["penjualan_produk", "jasa_layanan", "pendapatan_lain"] as const;
export const EXPENSE_CATEGORIES = ["bahan_baku", "sewa", "listrik_internet", "marketing", "gaji", "transportasi", "operasional_lain"] as const;

export function getCategoriesByType(type: TxType): readonly string[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getDefaultCategoryForType(type: TxType): string {
  return type === "income" ? "penjualan_produk" : "bahan_baku";
}

export const OP_CATEGORY_LABELS: Record<string, string> = {
  Sewa: "Sewa",
  "Listrik & Air": "Listrik & Air",
  Internet: "Internet",
  Gaji: "Gaji",
  Marketing: "Marketing",
  Transport: "Transport",
  Pajak: "Pajak",
  Pemeliharaan: "Pemeliharaan",
  Lainnya: "Lainnya",
};
