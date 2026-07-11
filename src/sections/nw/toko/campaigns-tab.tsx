"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore, type SessionUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SectionCard, EmptyState } from "@/components/nw/primitives";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah, timeAgo } from "@/lib/constants";
import {
  Megaphone,
  Plus,
  Mail,
  MessageSquare,
  Send,
  Eye,
  MousePointerClick,
  Users,
} from "lucide-react";
import type { Campaign, Customer, Lead } from "@/sections/nw/toko/types";

export function CampaignsTab({
  brandId,
  user,
}: {
  brandId: string;
  user: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const setCredit = useAppStore((s) => s.setCredit);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [form, setForm] = useState<{
    channel: "wa" | "email";
    name: string;
    subject: string;
    body: string;
    selected: Record<string, { customerId?: string; leadId?: string; contact: string }>;
  }>({
    channel: "wa",
    name: "",
    subject: "",
    body: "",
    selected: {},
  });

  const { data, isLoading } = useQuery<{ campaigns: (Campaign & {
    _count?: { recipients: number };
  })[] }>({
    queryKey: ["campaigns", brandId],
    queryFn: () => api(`/api/campaigns?brandId=${brandId}`),
    enabled: !!brandId,
  });
  const { data: contactsData } = useQuery<{ customers: Customer[]; leads: Lead[] }>({
    queryKey: ["customers", brandId],
    queryFn: () => api(`/api/customers?brandId=${brandId}`),
    enabled: !!brandId,
  });

  const campaigns = data?.campaigns ?? [];
  const customers = contactsData?.customers ?? [];
  const leads = contactsData?.leads ?? [];

  const selectedCount = Object.keys(form.selected).length;
  const cost = form.channel === "wa" ? 8 : 10;

  const createMutation = useMutation({
    mutationFn: () => {
      const recipientIds = Object.values(form.selected);
      return api<{ creditBalanceAfter: number }>(`/api/campaigns`, {
        method: "POST",
        json: {
          brandId,
          channel: form.channel,
          name: form.name,
          subject: form.subject || undefined,
          body: form.body,
          recipientIds,
        },
      });
    },
    onSuccess: (res) => {
      setCredit(res.creditBalanceAfter);
      queryClient.invalidateQueries({ queryKey: ["campaigns", brandId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", brandId] });
      toast({ title: "Campaign terkirim 📣", description: `${selectedCount} penerima · ${cost} credit di-charge` });
      setCreateOpen(false);
      setForm({ channel: "wa", name: "", subject: "", body: "", selected: {} });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  // Detail data
  const { data: detailData, isLoading: detailLoading } = useQuery<{
    campaign: Campaign & { recipients?: Array<{ id: string; contact: string; sent: boolean; deliveredAt: string | null; openedAt: string | null; clickedAt: string | null; customer?: { name: string; phone: string } | null }> };
    stats: { total: number; sentCount: number; deliveredCount: number; openedCount: number; clickedCount: number; openRate: number; clickRate: number };
  }>({
    queryKey: ["campaign", detailId],
    queryFn: () => api(`/api/campaigns/${detailId}`),
    enabled: !!detailId,
  });

  function toggleRecipient(id: string, payload: { customerId?: string; leadId?: string; contact: string }) {
    setForm((s) => {
      const next = { ...s.selected };
      if (next[id]) delete next[id];
      else next[id] = payload;
      return { ...s, selected: next };
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-stone">
          Total <span className="font-bold text-ink">{campaigns.length}</span> campaign · Sisa credit: <span className="font-bold text-ink">{user?.creditBalance ?? 0}</span>
        </div>
        <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Campaign Baru
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon="📣"
          title="Belum ada campaign"
          desc="Buat broadcast WA (8 credit) atau email (10 credit) ke customer & lead yang dipilih."
          action={
            <Button size="sm" className="bg-teal hover:bg-teal-600" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Buat Campaign
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaigns.map((c) => {
            const openRate = c.recipientCount && c.recipientCount > 0
              ? Math.round(((c.openedCount ?? 0) / c.recipientCount) * 100)
              : 0;
            const clickRate = c.recipientCount && c.recipientCount > 0
              ? Math.round(((c.clickedCount ?? 0) / c.recipientCount) * 100)
              : 0;
            return (
              <Card
                key={c.id}
                className="p-4 hover:border-teal/30 transition-colors cursor-pointer"
                onClick={() => setDetailId(c.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                        c.channel === "wa"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {c.channel === "wa" ? <MessageSquare className="size-4" /> : <Mail className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-ink truncate">{c.name}</div>
                      <div className="text-[11px] text-stone">
                        {c.channel.toUpperCase()} · {timeAgo(c.createdAt)} · {c.recipientCount ?? 0} penerima
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-[10px]">
                    {c.status}
                  </Badge>
                </div>

                {c.subject && (
                  <div className="text-xs text-stone mb-1 italic">Subject: {c.subject}</div>
                )}
                <div className="text-xs text-ink-500 line-clamp-2 mb-3">{c.body}</div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                  <div className="text-center">
                    <div className="text-xs text-stone flex items-center justify-center gap-1">
                      <Send className="size-3" /> Sent
                    </div>
                    <div className="text-sm font-bold text-ink tabular-nums">{c.sentCount ?? 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-stone flex items-center justify-center gap-1">
                      <Eye className="size-3" /> Open
                    </div>
                    <div className="text-sm font-bold text-teal-700 tabular-nums">{openRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-stone flex items-center justify-center gap-1">
                      <MousePointerClick className="size-3" /> Click
                    </div>
                    <div className="text-sm font-bold text-orange-700 tabular-nums">{clickRate}%</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create campaign dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Buat Campaign Baru</DialogTitle>
            <DialogDescription>
              Broadcast ke customer & lead terpilih. Credit di-charge: <span className="font-semibold text-teal-700">{cost}/campaign</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-3 pr-1">
            {/* Channel toggle */}
            <div>
              <Label className="text-xs text-stone mb-1.5 block">Channel</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, channel: "wa" }))}
                  className={`flex items-center gap-2 rounded-xl border p-3 transition-colors ${
                    form.channel === "wa"
                      ? "border-emerald-400 bg-emerald-50/60"
                      : "border-border bg-card hover:bg-cream-100/50"
                  }`}
                >
                  <MessageSquare className={`size-5 ${form.channel === "wa" ? "text-emerald-600" : "text-stone"}`} />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-ink">WhatsApp</div>
                    <div className="text-[10px] text-stone">8 credit</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, channel: "email" }))}
                  className={`flex items-center gap-2 rounded-xl border p-3 transition-colors ${
                    form.channel === "email"
                      ? "border-sky-400 bg-sky-50/60"
                      : "border-border bg-card hover:bg-cream-100/50"
                  }`}
                >
                  <Mail className={`size-5 ${form.channel === "email" ? "text-sky-600" : "text-stone"}`} />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-ink">Email</div>
                    <div className="text-[10px] text-stone">10 credit</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Name & subject */}
            <div>
              <Label className="text-xs text-stone">Nama Campaign</Label>
              <Input
                placeholder="Promo Lebaran 2025"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            {form.channel === "email" && (
              <div>
                <Label className="text-xs text-stone">Subject Email</Label>
                <Input
                  placeholder="Promo spesial untuk kamu! 🎉"
                  value={form.subject}
                  onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-stone">Isi Pesan</Label>
              <Textarea
                placeholder="Halo {nama}, lagi ada promo nih…"
                value={form.body}
                onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
                className="mt-1 min-h-[100px] text-sm"
              />
            </div>

            {/* Recipient picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-stone">Pilih Penerima</Label>
                <Badge variant="outline" className="text-[10px]">{selectedCount} dipilih</Badge>
              </div>
              <div className="rounded-xl border border-border bg-card max-h-[220px] overflow-y-auto">
                {customers.length === 0 && leads.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone">
                    Belum ada customer atau lead.
                  </div>
                ) : (
                  <>
                    {customers.length > 0 && (
                      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-stone font-semibold">
                        Customers ({customers.length})
                      </div>
                    )}
                    {customers.map((c) => {
                      const key = `c-${c.id}`;
                      const isSelected = !!form.selected[key];
                      const contact = form.channel === "wa" ? c.phone : c.email ?? c.phone;
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 p-2.5 hover:bg-cream-100/40 cursor-pointer border-b border-border last:border-b-0"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              toggleRecipient(key, { customerId: c.id, contact })
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{c.name}</div>
                            <div className="text-[10px] text-stone">{contact}</div>
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            {c.totalOrders} order
                          </Badge>
                        </label>
                      );
                    })}
                    {leads.length > 0 && (
                      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-stone font-semibold">
                        Leads aktif ({leads.length})
                      </div>
                    )}
                    {leads.map((l) => {
                      const key = `l-${l.id}`;
                      const isSelected = !!form.selected[key];
                      const contact = l.phone;
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 p-2.5 hover:bg-cream-100/40 cursor-pointer border-b border-border last:border-b-0"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              toggleRecipient(key, { leadId: l.id, contact })
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-ink truncate">{l.name}</div>
                            <div className="text-[10px] text-stone">{contact} · {l.stage}</div>
                          </div>
                        </label>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-teal-50/60 border border-teal/30 p-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="text-stone">Total biaya:</div>
                <div className="font-bold text-teal-700 text-lg">{cost} credit</div>
              </div>
              <div className="text-xs text-stone text-right">
                <div>Sisa credit:</div>
                <div className="font-bold text-ink">{user?.creditBalance ?? 0}</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button
              className="bg-teal hover:bg-teal-600"
              disabled={
                createMutation.isPending ||
                !form.name.trim() ||
                !form.body.trim() ||
                selectedCount === 0
              }
              onClick={() => createMutation.mutate()}
            >
              <Send className="size-4" />
              {createMutation.isPending ? "Mengirim…" : `Kirim ke ${selectedCount} penerima`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="size-4 text-teal" />
              {detailData?.campaign.name ?? "Detail Campaign"}
            </DialogTitle>
            <DialogDescription>
              {detailData?.campaign.channel.toUpperCase()} · {timeAgo(detailData?.campaign.createdAt ?? new Date().toISOString())}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="p-6 text-center text-sm text-stone">Memuat…</div>
          ) : detailData ? (
            <div className="overflow-y-auto flex-1 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatBox icon={<Send className="size-3.5" />} label="Terkirim" value={detailData.stats.sentCount} color="emerald" />
                <StatBox icon={<Users className="size-3.5" />} label="Penerima" value={detailData.stats.total} color="stone" />
                <StatBox icon={<Eye className="size-3.5" />} label="Open Rate" value={`${detailData.stats.openRate}%`} color="teal" />
                <StatBox icon={<MousePointerClick className="size-3.5" />} label="Click Rate" value={`${detailData.stats.clickRate}%`} color="orange" />
              </div>

              {/* Body */}
              <div>
                <div className="text-xs font-semibold text-stone mb-1">Isi Pesan</div>
                <div className="rounded-lg border border-border bg-cream-100/40 p-3 text-sm text-ink whitespace-pre-wrap">
                  {detailData.campaign.subject && (
                    <div className="font-semibold mb-1">Subject: {detailData.campaign.subject}</div>
                  )}
                  {detailData.campaign.body}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <div className="text-xs font-semibold text-stone mb-1">Penerima</div>
                <div className="rounded-lg border border-border max-h-[200px] overflow-y-auto">
                  {(detailData.campaign.recipients ?? []).map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 border-b border-border last:border-b-0 text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate">
                          {r.customer?.name ?? r.contact}
                        </div>
                        <div className="text-stone">{r.contact}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.sent && <Badge className="bg-emerald-100 text-emerald-700 text-[9px] h-4">Sent</Badge>}
                        {r.openedAt && <Badge className="bg-teal-100 text-teal-700 text-[9px] h-4">Open</Badge>}
                        {r.clickedAt && <Badge className="bg-orange-100 text-orange-700 text-[9px] h-4">Click</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: "teal" | "emerald" | "orange" | "stone";
}) {
  const colors: Record<string, string> = {
    teal: "bg-teal-100 text-teal-700",
    emerald: "bg-emerald-100 text-emerald-700",
    orange: "bg-orange-100 text-orange-700",
    stone: "bg-stone-200 text-stone-700",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className={`size-7 rounded-lg ${colors[color]} flex items-center justify-center mb-1`}>
        {icon}
      </div>
      <div className="text-lg font-bold text-ink tabular-nums">{value}</div>
      <div className="text-[10px] text-stone">{label}</div>
    </div>
  );
}
