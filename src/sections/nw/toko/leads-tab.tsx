"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { api } from "@/lib/api";
import { useAppStore, type SessionUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState, SectionCard } from "@/components/nw/primitives";
import { useToast } from "@/hooks/use-toast";
import { LEAD_STAGES, timeAgo, formatRupiah } from "@/lib/constants";
import { Plus, Phone, User, Trash2, GripVertical, ShoppingCart, MessageSquare } from "lucide-react";
import type { Lead, Product, Customer } from "@/sections/nw/toko/types";

type LeadWithCustomer = Lead & {
  customer?: Pick<Customer, "name" | "phone"> | null;
};

function LeadCard({
  lead,
  onClick,
}: {
  lead: LeadWithCustomer;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow group ${
        isDragging ? "opacity-30" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          className="mt-0.5 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{lead.name}</div>
          <div className="text-xs text-stone flex items-center gap-1 mt-0.5">
            <Phone className="size-3" /> {lead.phone}
          </div>
          {lead.notes && (
            <div className="text-[11px] text-stone mt-1 line-clamp-2 italic">"{lead.notes}"</div>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <Badge variant="outline" className="text-[9px] py-0 h-3.5">
              {lead.sourceChannel}
            </Badge>
            <span className="text-[10px] text-stone">{timeAgo(lead.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadCardOverlay({ lead }: { lead: LeadWithCustomer }) {
  return (
    <div className="rounded-xl border border-teal bg-card p-3 shadow-lg w-72 opacity-95 rotate-1">
      <div className="text-sm font-semibold text-ink truncate">{lead.name}</div>
      <div className="text-xs text-stone flex items-center gap-1 mt-0.5">
        <Phone className="size-3" /> {lead.phone}
      </div>
    </div>
  );
}

export function LeadsTab({
  brandId,
  user: _user,
}: {
  brandId: string;
  user: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeLead, setActiveLead] = useState<LeadWithCustomer | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState<LeadWithCustomer | null>(null);
  const [addForm, setAddForm] = useState({ name: "", phone: "", sourceChannel: "wa", notes: "" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data, isLoading } = useQuery<{ leads: LeadWithCustomer[] }>({
    queryKey: ["leads", brandId],
    queryFn: () => api(`/api/leads?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const { data: productsData } = useQuery<{ products: Product[] }>({
    queryKey: ["products", brandId],
    queryFn: () => api(`/api/products?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const products = (productsData?.products ?? []).filter((p) => p.isActive);

  const leads = data?.leads ?? [];

  const grouped = useMemo(() => {
    const map: Record<string, LeadWithCustomer[]> = { Baru: [], Negosiasi: [], Deal: [], Closed: [] };
    for (const l of leads) {
      if (map[l.stage]) map[l.stage].push(l);
      else map["Baru"].push(l);
    }
    return map;
  }, [leads]);

  const draggingLead = leads.find((l) => l.id === draggingId) ?? null;

  // PATCH lead stage
  const patchMutation = useMutation({
    mutationFn: (variables: { id: string; stage?: string; notes?: string }) =>
      api<{ lead: LeadWithCustomer }>(`/api/leads/${variables.id}`, {
        method: "PATCH",
        json: { stage: variables.stage, notes: variables.notes },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      toast({ title: "Lead dihapus" });
      setActiveLead(null);
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      api(`/api/leads`, {
        method: "POST",
        json: { brandId, ...addForm },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      toast({ title: "Lead ditambahkan" });
      setAddForm({ name: "", phone: "", sourceChannel: "wa", notes: "" });
      setAddOpen(false);
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const targetStage = LEAD_STAGES.find((s) => s.key === overId)?.key;
    if (!targetStage) return;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.stage === targetStage) return;
    patchMutation.mutate({ id: lead.id, stage: targetStage });
    toast({
      title: `Lead dipindah ke ${targetStage}`,
      description: targetStage === "Deal" ? "Customer otomatis dibuat jika belum ada." : undefined,
    });
  }

  // Order creation from lead
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [orderShipping, setOrderShipping] = useState<number | "">("");
  const [orderNotes, setOrderNotes] = useState("");

  const orderMutation = useMutation({
    mutationFn: () => {
      if (!orderOpen) throw new Error("lead tidak dipilih");
      const items = Object.entries(orderItems)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty }));
      return api(`/api/orders`, {
        method: "POST",
        json: {
          brandId,
          leadId: orderOpen.id,
          customerId: orderOpen.customerId,
          items,
          shippingCost: orderShipping === "" ? undefined : Number(orderShipping),
          notes: orderNotes,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", brandId] });
      queryClient.invalidateQueries({ queryKey: ["leads", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      toast({ title: "Order dibuat dari lead 🎉" });
      setOrderOpen(null);
      setOrderItems({});
      setOrderShipping("");
      setOrderNotes("");
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-stone">
          Total <span className="font-bold text-ink">{leads.length}</span> leads · Tarik kartu ke kolom lain untuk pindah stage
        </div>
        <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Lead Baru
        </Button>
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Belum ada lead"
          desc="Tambahkan lead baru, atau inbound chat dari Inbox akan otomatis membuat lead."
          action={
            <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Tambah Lead
            </Button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggingId(null)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {LEAD_STAGES.map((stage) => {
              const items = grouped[stage.key] ?? [];
              return <KanbanColumn
                key={stage.key}
                stage={stage}
                items={items}
                onCardClick={(l) => setActiveLead(l)}
              />;
            })}
          </div>
          <DragOverlay>
            {draggingLead ? <LeadCardOverlay lead={draggingLead} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Side panel */}
      <Sheet open={!!activeLead} onOpenChange={(v) => !v && setActiveLead(null)}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
          {activeLead && (
            <>
              <SheetHeader className="p-5 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <User className="size-4 text-teal" /> {activeLead.name}
                </SheetTitle>
                <SheetDescription className="text-stone">
                  Lead dari {activeLead.sourceChannel} · {timeAgo(activeLead.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <Label className="text-xs text-stone">No. HP</Label>
                  <div className="text-sm font-semibold text-ink mt-0.5 flex items-center gap-2">
                    <Phone className="size-3.5 text-stone" /> {activeLead.phone}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-stone">Stage saat ini</Label>
                  <div className="mt-1">
                    <Badge className={`${LEAD_STAGES.find((s) => s.key === activeLead.stage)?.color}`}>
                      {activeLead.stage}
                    </Badge>
                  </div>
                </div>

                {activeLead.customer && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                    <div className="text-xs font-semibold text-emerald-700 mb-1">✓ Terhubung ke Customer</div>
                    <div className="text-sm text-ink">{activeLead.customer.name}</div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-stone">Catatan</Label>
                  <Textarea
                    placeholder="Tambah catatan tentang lead ini…"
                    defaultValue={activeLead.notes ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (activeLead.notes ?? "")) {
                        patchMutation.mutate({ id: activeLead.id, notes: e.target.value });
                        toast({ title: "Catatan disimpan" });
                      }
                    }}
                    className="mt-1 text-sm min-h-[80px]"
                  />
                </div>

                <div>
                  <Label className="text-xs text-stone mb-1.5 block">Pindah Stage</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {LEAD_STAGES.map((s) => (
                      <Button
                        key={s.key}
                        size="sm"
                        variant={activeLead.stage === s.key ? "default" : "outline"}
                        className={`h-8 text-xs ${
                          activeLead.stage === s.key
                            ? "bg-teal hover:bg-teal-600"
                            : ""
                        }`}
                        onClick={() => {
                          patchMutation.mutate({ id: activeLead.id, stage: s.key });
                          setActiveLead({ ...activeLead, stage: s.key });
                        }}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <a
                  href={`https://wa.me/${activeLead.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" size="sm" className="w-full h-9 text-sm">
                    <MessageSquare className="size-4" /> Chat WhatsApp
                  </Button>
                </a>

                <Button
                  size="sm"
                  className="w-full h-10 bg-success hover:bg-success/90"
                  onClick={() => {
                    setOrderOpen(activeLead);
                    setOrderItems({});
                    setOrderShipping("");
                    setOrderNotes("");
                  }}
                >
                  <ShoppingCart className="size-4" /> Jadikan Order
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-sm text-danger border-danger/30 hover:bg-danger-100/40"
                  onClick={() => {
                    if (confirm("Hapus lead ini?")) deleteMutation.mutate(activeLead.id);
                  }}
                >
                  <Trash2 className="size-4" /> Hapus Lead
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add lead dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Lead Baru</DialogTitle>
            <DialogDescription>Lead baru otomatis masuk stage "Baru".</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-stone">Nama</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Nama calon pembeli"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-stone">No. HP</Label>
              <Input
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="62812…"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-stone">Sumber Channel</Label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-border bg-card px-2 text-sm"
                value={addForm.sourceChannel}
                onChange={(e) => setAddForm({ ...addForm, sourceChannel: e.target.value })}
              >
                <option value="wa">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-stone">Catatan</Label>
              <Textarea
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                placeholder="Catatan awal…"
                className="mt-1 min-h-[60px] text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-teal hover:bg-teal-600"
              disabled={addMutation.isPending || !addForm.name.trim() || !addForm.phone.trim()}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? "Menyimpan…" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to order dialog */}
      <Dialog open={!!orderOpen} onOpenChange={(v) => !v && setOrderOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Jadikan Order</DialogTitle>
            <DialogDescription>
              Pilih produk & qty untuk order dari {orderOpen?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {products.length === 0 ? (
              <div className="text-center py-6 text-sm text-stone">
                Belum ada produk aktif. Tambahkan produk dulu di Pengaturan.
              </div>
            ) : (
              products.map((p) => {
                const qty = orderItems[p.id] ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
                      <div className="text-xs text-stone">
                        {formatRupiah(p.price)}
                        {p.type === "barang" && p.stock != null && ` · stok ${p.stock}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() =>
                          setOrderItems((s) => ({ ...s, [p.id]: Math.max(0, qty - 1) }))
                        }
                      >
                        −
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) =>
                          setOrderItems((s) => ({ ...s, [p.id]: Math.max(0, Number(e.target.value) || 0) }))
                        }
                        className="w-14 h-7 text-center text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() => setOrderItems((s) => ({ ...s, [p.id]: qty + 1 }))}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              <div>
                <Label className="text-xs text-stone">Ongkir (opsional)</Label>
                <Input
                  type="number"
                  value={orderShipping}
                  onChange={(e) =>
                    setOrderShipping(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-stone">Catatan</Label>
                <Input
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Catatan order…"
                  className="mt-1"
                />
              </div>
            </div>
            {Object.values(orderItems).some((q) => q > 0) && (
              <div className="text-xs text-stone flex items-center justify-between bg-cream-100/60 rounded-lg p-2">
                <span>Total estimasi:</span>
                <span className="font-bold text-ink">
                  {formatRupiah(
                    Object.entries(orderItems)
                      .filter(([, qty]) => qty > 0)
                      .reduce((acc, [pid, qty]) => {
                        const p = products.find((x) => x.id === pid);
                        return acc + (p?.price ?? 0) * qty;
                      }, 0) + (orderShipping === "" ? 0 : Number(orderShipping))
                  )}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderOpen(null)}>
              Batal
            </Button>
            <Button
              className="bg-teal hover:bg-teal-600"
              disabled={
                orderMutation.isPending || !Object.values(orderItems).some((q) => q > 0)
              }
              onClick={() => orderMutation.mutate()}
            >
              {orderMutation.isPending ? "Membuat…" : "Buat Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KanbanColumn({
  stage,
  items,
  onCardClick,
}: {
  stage: (typeof LEAD_STAGES)[number];
  items: LeadWithCustomer[];
  onCardClick: (l: LeadWithCustomer) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border border-border bg-cream-100/40 p-3 min-h-[200px] transition-colors ${
        isOver ? "bg-teal-50/50 border-teal/40" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-2.5 rounded-full ${stage.color.split(" ")[0]}`} />
          <h3 className="font-bold text-sm text-ink">{stage.label}</h3>
        </div>
        <Badge variant="outline" className="text-[10px] h-5">
          {items.length}
        </Badge>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
        {items.length === 0 ? (
          <div className="text-center text-[11px] text-stone py-6 italic">
            Kosong
          </div>
        ) : (
          items.map((l) => (
            <LeadCard key={l.id} lead={l} onClick={() => onCardClick(l)} />
          ))
        )}
      </div>
    </div>
  );
}
