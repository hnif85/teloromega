"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ORDER_STATUS,
  formatRupiah,
  formatRupiahShort,
  timeAgo,
} from "@/lib/constants";
import {
  User,
  Phone,
  Mail,
  MessageSquare,
  X,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  CalendarDays,
  Repeat,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  Megaphone,
  FileWarning,
  AlertTriangle,
  CheckCircle2,
  MousePointerClick,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface CustomerDetailResponse {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    firstOrderAt: string | null;
    totalOrders: number;
    totalSpent: number;
    createdAt: string;
  };
  stats: {
    avgOrderValue: number;
    lastOrderAt: string | null;
    repeatRate: number;
    daysSinceFirstOrder: number;
    daysSinceLastOrder: number;
  };
  orders: {
    id: string;
    orderNumber: string;
    items: { name: string; qty: number; price: number }[];
    totalAmount: number;
    status: string;
    paymentStatus: "Lunas" | "Menunggu" | "Sebagian" | "Belum bayar";
    date: string;
  }[];
  transactions: {
    id: string;
    type: string;
    category: string;
    amount: number;
    description: string | null;
    date: string;
  }[];
  campaigns: {
    id: string;
    campaignId: string;
    name: string;
    channel: string;
    sentAt: string | null;
    status: string;
    opened: boolean;
    clicked: boolean;
  }[];
  receivables: {
    id: string;
    amount: number;
    dueDate: string;
    status: string;
  }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PAYMENT_BADGE: Record<string, string> = {
  Lunas: "bg-emerald-100 text-emerald-700 border-emerald-200 border",
  Menunggu: "bg-amber-100 text-amber-700 border-amber-200 border",
  Sebagian: "bg-stone-100 text-stone-600 border-stone-200 border",
  "Belum bayar": "bg-rose-100 text-rose-700 border-rose-200 border",
};

const RECEIVABLE_BADGE: Record<string, string> = {
  outstanding: "bg-amber-100 text-amber-700 border-amber-200 border",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200 border",
  overdue: "bg-rose-100 text-rose-700 border-rose-200 border",
};

const RECEIVABLE_LABEL: Record<string, string> = {
  outstanding: "Outstanding",
  paid: "Lunas",
  overdue: "Jatuh Tempo",
};

// ─── Component ──────────────────────────────────────────────────────────────
export function CustomerDetailDialog({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const enabled = !!customerId && open;

  const { data, isLoading, isError } = useQuery<CustomerDetailResponse>({
    queryKey: ["customer-detail", customerId],
    queryFn: () => api<CustomerDetailResponse>(`/api/customers/${customerId}`),
    enabled,
  });

  const waHref = data
    ? `https://wa.me/${data.customer.phone.replace(/\D/g, "")}`
    : "#";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-border shrink-0">
          {isLoading || !data ? (
            <CustomerHeaderSkeleton />
          ) : isError ? (
            <div className="flex items-center gap-2 text-rose-600 text-sm">
              <AlertTriangle className="size-4" /> Gagal memuat detail customer.
            </div>
          ) : (
            <CustomerHeader customer={data.customer} />
          )}
        </div>

        {/* Stats row */}
        {data && !isLoading && !isError && (
          <div className="px-5 pt-4 pb-2 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <MiniStat
                label="Total Order"
                value={data.customer.totalOrders}
                icon={<ShoppingCart className="size-3.5" />}
                accent="teal"
              />
              <MiniStat
                label="Total Belanja"
                value={formatRupiahShort(data.customer.totalSpent)}
                icon={<DollarSign className="size-3.5" />}
                accent="success"
              />
              <MiniStat
                label="Rata-rata Order"
                value={formatRupiahShort(data.stats.avgOrderValue)}
                icon={<TrendingUp className="size-3.5" />}
                accent="teal"
              />
              <MiniStat
                label="Order Terakhir"
                value={
                  data.stats.lastOrderAt ? timeAgo(data.stats.lastOrderAt) : "—"
                }
                icon={<CalendarDays className="size-3.5" />}
                accent="orange"
              />
              <MiniStat
                label="Hari Sejak Order"
                value={data.stats.daysSinceLastOrder}
                icon={<Repeat className="size-3.5" />}
                accent="warning"
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError ? (
            <div className="text-sm text-rose-600 py-6 text-center">
              Customer tidak ditemukan atau gagal dimuat.
            </div>
          ) : data ? (
            <Tabs defaultValue="orders" className="gap-3">
              <TabsList className="w-full justify-start h-auto flex-wrap">
                <TabsTrigger value="orders" className="gap-1.5">
                  <Receipt className="size-3.5" /> Riwayat Order
                  <span className="ml-1 text-[10px] bg-cream-200 text-stone px-1.5 py-0.5 rounded-full">
                    {data.orders.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="transactions" className="gap-1.5">
                  <DollarSign className="size-3.5" /> Transaksi
                  <span className="ml-1 text-[10px] bg-cream-200 text-stone px-1.5 py-0.5 rounded-full">
                    {data.transactions.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="gap-1.5">
                  <Megaphone className="size-3.5" /> Campaign
                  <span className="ml-1 text-[10px] bg-cream-200 text-stone px-1.5 py-0.5 rounded-full">
                    {data.campaigns.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="receivables" className="gap-1.5">
                  <FileWarning className="size-3.5" /> Piutang
                  <span className="ml-1 text-[10px] bg-cream-200 text-stone px-1.5 py-0.5 rounded-full">
                    {data.receivables.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* ─── Riwayat Order ─── */}
              <TabsContent value="orders">
                {data.orders.length === 0 ? (
                  <div className="text-center text-sm text-stone py-8 italic">
                    Belum ada order untuk customer ini.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Order</TableHead>
                            <TableHead className="text-xs">Items</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Bayar</TableHead>
                            <TableHead className="text-xs hidden md:table-cell">Waktu</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.orders.map((o) => {
                            const statusMeta =
                              ORDER_STATUS.find((s) => s.key === o.status) ??
                              ORDER_STATUS[0];
                            const itemsSummary = o.items
                              .map((it) => `${it.name} ×${it.qty}`)
                              .join(", ");
                            return (
                              <TableRow key={o.id}>
                                <TableCell className="text-xs font-mono text-ink align-top">
                                  {o.orderNumber}
                                </TableCell>
                                <TableCell className="text-xs text-ink align-top max-w-[260px]">
                                  <div className="line-clamp-2">{itemsSummary || "—"}</div>
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold tabular-nums align-top">
                                  {formatRupiah(o.totalAmount)}
                                </TableCell>
                                <TableCell className="align-top">
                                  <Badge className={`text-[10px] h-5 ${statusMeta.color}`}>
                                    {statusMeta.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="align-top">
                                  <Badge
                                    className={`text-[10px] h-5 ${PAYMENT_BADGE[o.paymentStatus] ?? ""}`}
                                  >
                                    {o.paymentStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-stone hidden md:table-cell align-top">
                                  {timeAgo(o.date)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Transaksi ─── */}
              <TabsContent value="transactions">
                {data.transactions.length === 0 ? (
                  <div className="text-center text-sm text-stone py-8 italic">
                    Belum ada transaksi terhubung ke customer ini.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Tipe</TableHead>
                            <TableHead className="text-xs">Kategori</TableHead>
                            <TableHead className="text-xs">Deskripsi</TableHead>
                            <TableHead className="text-xs text-right">Jumlah</TableHead>
                            <TableHead className="text-xs hidden md:table-cell">Tanggal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.transactions.map((t) => {
                            const isIncome = t.type === "income";
                            return (
                              <TableRow key={t.id}>
                                <TableCell>
                                  <Badge
                                    className={`text-[10px] h-5 ${
                                      isIncome
                                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 border"
                                        : "bg-rose-100 text-rose-700 border-rose-200 border"
                                    }`}
                                  >
                                    {isIncome ? (
                                      <ArrowDownRight className="size-2.5 mr-0.5" />
                                    ) : (
                                      <ArrowUpRight className="size-2.5 mr-0.5" />
                                    )}
                                    {isIncome ? "Masuk" : "Keluar"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-ink capitalize">
                                  {t.category}
                                </TableCell>
                                <TableCell className="text-xs text-stone max-w-[260px] truncate">
                                  {t.description ?? "—"}
                                </TableCell>
                                <TableCell
                                  className={`text-xs text-right font-semibold tabular-nums ${
                                    isIncome ? "text-emerald-700" : "text-rose-700"
                                  }`}
                                >
                                  {isIncome ? "+" : "−"}
                                  {formatRupiah(t.amount)}
                                </TableCell>
                                <TableCell className="text-xs text-stone hidden md:table-cell">
                                  {formatDate(t.date)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Campaign ─── */}
              <TabsContent value="campaigns">
                {data.campaigns.length === 0 ? (
                  <div className="text-center text-sm text-stone py-8 italic">
                    Customer belum menerima campaign apa pun.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.campaigns.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-xl border border-border bg-card p-3 flex items-start gap-3 hover:border-teal/30 transition-colors"
                      >
                        <div className="size-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <Megaphone className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink truncate">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-stone flex flex-wrap items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[9px] h-3.5 py-0 uppercase">
                              {c.channel}
                            </Badge>
                            <span>·</span>
                            <span>{c.sentAt ? timeAgo(c.sentAt) : "Belum terkirim"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {c.opened ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[9px] h-5 gap-0.5">
                              <CheckCircle2 className="size-2.5" /> Dibuka
                            </Badge>
                          ) : (
                            <Badge className="bg-stone-100 text-stone-500 border-stone-200 border text-[9px] h-5">
                              Belum dibuka
                            </Badge>
                          )}
                          {c.clicked && (
                            <Badge className="bg-teal-100 text-teal-700 border-teal-200 border text-[9px] h-5 gap-0.5">
                              <MousePointerClick className="size-2.5" /> Klik
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ─── Piutang ─── */}
              <TabsContent value="receivables">
                {data.receivables.length === 0 ? (
                  <div className="text-center text-sm text-stone py-8 italic">
                    Tidak ada piutang untuk customer ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.receivables.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 hover:border-teal/30 transition-colors"
                      >
                        <div className="size-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <FileWarning className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-ink">
                            {formatRupiah(r.amount)}
                          </div>
                          <div className="text-[11px] text-stone mt-0.5">
                            Jatuh tempo: {formatDate(r.dueDate)}
                          </div>
                        </div>
                        <Badge
                          className={`text-[10px] h-5 ${
                            RECEIVABLE_BADGE[r.status] ??
                            "bg-stone-100 text-stone-600 border-stone-200 border"
                          }`}
                        >
                          {RECEIVABLE_LABEL[r.status] ?? r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>

        {/* Footer */}
        <Separator className="bg-border" />
        <div className="p-4 pt-3 flex flex-wrap items-center justify-end gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="size-4" /> Tutup
          </Button>
          {data && (
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-teal hover:bg-teal-600 gap-1.5">
                <MessageSquare className="size-4" /> Chat WhatsApp
              </Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function CustomerHeader({ customer }: { customer: CustomerDetailResponse["customer"] }) {
  return (
    <div className="flex items-start gap-4">
      {/* Avatar */}
      <div className="size-16 rounded-full bg-gradient-to-br from-teal-100 via-cream-100 to-orange-100/40 flex items-center justify-center shrink-0 border border-teal-200">
        <span className="text-xl font-extrabold text-teal-700">
          {getInitials(customer.name)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <DialogTitle className="text-lg font-extrabold text-ink leading-tight">
          {customer.name}
        </DialogTitle>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone">
          <a
            href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-teal-700 hover:underline"
          >
            <Phone className="size-3" /> {customer.phone}
          </a>
          {customer.email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3" /> {customer.email}
            </span>
          )}
        </div>
        <DialogDescription className="text-[11px] text-stone mt-1">
          Customer sejak {formatDate(customer.createdAt)}
          {customer.firstOrderAt && ` · Order pertama ${formatDate(customer.firstOrderAt)}`}
        </DialogDescription>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  accent = "teal",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent?: "teal" | "orange" | "success" | "warning" | "stone";
}) {
  const accents: Record<string, string> = {
    teal: "bg-teal-100 text-teal-600",
    orange: "bg-orange-100 text-orange-600",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    stone: "bg-stone-200 text-stone-700",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 hover:border-teal/30 transition-colors">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`size-5 rounded-md flex items-center justify-center ${accents[accent]}`}>
          {icon}
        </div>
        <span className="text-[10px] text-stone uppercase tracking-wide leading-tight">
          {label}
        </span>
      </div>
      <div className="text-sm font-extrabold text-ink tabular-nums truncate">
        {value}
      </div>
    </div>
  );
}

function CustomerHeaderSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <Skeleton className="size-16 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
