"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore, type SessionUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/nw/primitives";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/constants";
import { Send, Sparkles, Plus, MessageCircle, Phone, User } from "lucide-react";
import type { InboxMessage, InboxThread } from "@/sections/nw/toko/types";

interface InboxResponse {
  messages: InboxMessage[];
  threads: InboxThread[];
}

export function InboxTab({
  brandId,
  user,
}: {
  brandId: string;
  user: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const setCredit = useAppStore((s) => s.setCredit);

  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [simOpen, setSimOpen] = useState(false);
  const [simForm, setSimForm] = useState({
    fromName: "",
    fromNumber: "",
    channel: "wa",
    messageText: "",
  });

  const { data, isLoading } = useQuery<InboxResponse>({
    queryKey: ["inbox", brandId],
    queryFn: () => api(`/api/inbox?brandId=${brandId}`),
    enabled: !!brandId,
    refetchInterval: 15_000,
  });

  const threads = data?.threads ?? [];
  const activeThread = threads.find((t) => t.key === activeNumber) ?? threads[0] ?? null;

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: (variables: { messageId: string; text: string }) =>
      api<{ message: InboxMessage; creditBalanceAfter: number; usedAi: boolean }>(
        `/api/inbox/reply`,
        { method: "POST", json: { brandId, messageId: variables.messageId, text: variables.text } }
      ),
    onSuccess: (res) => {
      setCredit(res.creditBalanceAfter);
      toast({
        title: res.usedAi ? "AI reply terkirim ✨" : "Pesan terkirim",
        description: res.usedAi
          ? "AI otomatis menyusun balasan karena text kosong."
          : undefined,
      });
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["inbox", brandId] });
    },
    onError: (e: Error) => toast({ title: "Gagal kirim", description: e.message, variant: "destructive" }),
  });

  // AI suggest (doesn't send)
  const aiSuggestMutation = useMutation({
    mutationFn: (variables: { messageText: string }) =>
      api<{ reply: string; creditBalanceAfter: number }>(`/api/inbox/ai-reply`, {
        method: "POST",
        json: { brandId, messageText: variables.messageText, fromNumber: activeThread?.key },
      }),
    onSuccess: (res) => {
      setCredit(res.creditBalanceAfter);
      setReplyText(res.reply);
      toast({ title: "Draf AI siap ✨", description: "Edit dulu sebelum kirim kalau perlu." });
    },
    onError: (e: Error) => toast({ title: "Gagal generate", description: e.message, variant: "destructive" }),
  });

  // Simulate inbound
  const simMutation = useMutation({
    mutationFn: () =>
      api(`/api/inbox`, {
        method: "POST",
        json: { brandId, ...simForm },
      }),
    onSuccess: () => {
      toast({ title: "Pesan masuk ditambahkan" });
      setSimForm({ fromName: "", fromNumber: "", channel: "wa", messageText: "" });
      setSimOpen(false);
      queryClient.invalidateQueries({ queryKey: ["inbox", brandId] });
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  // The inbound message to reply to (latest inbound in active thread)
  const lastInbound = activeThread?.messages.findLast?.((m) => m.direction === "inbound") ??
    activeThread?.messages.filter((m) => m.direction === "inbound").slice(-1)[0] ??
    activeThread?.messages[activeThread.messages.length - 1] ??
    null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* Conversation list */}
      <Card className="overflow-hidden flex flex-col max-h-[78vh]">
        <div className="flex items-center justify-between p-3 border-b border-border bg-cream-100/50">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-teal" />
            <span className="font-semibold text-sm text-ink">Conversations</span>
            <Badge variant="outline" className="text-[10px] h-4">
              {threads.length}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setSimOpen((v) => !v)}
          >
            <Plus className="size-3" /> Simulasi
          </Button>
        </div>

        {simOpen && (
          <div className="p-3 border-b border-border bg-orange-50/40 space-y-2">
            <Input
              placeholder="Nama pengirim"
              value={simForm.fromName}
              onChange={(e) => setSimForm({ ...simForm, fromName: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              placeholder="No HP (cth: 62812...)"
              value={simForm.fromNumber}
              onChange={(e) => setSimForm({ ...simForm, fromNumber: e.target.value })}
              className="h-8 text-xs"
            />
            <Select
              value={simForm.channel}
              onValueChange={(v) => setSimForm({ ...simForm, channel: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wa">WhatsApp</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Pesan masuk…"
              value={simForm.messageText}
              onChange={(e) => setSimForm({ ...simForm, messageText: e.target.value })}
              className="text-xs min-h-[60px]"
            />
            <Button
              size="sm"
              className="w-full bg-teal hover:bg-teal-600 h-8 text-xs"
              disabled={
                simMutation.isPending ||
                !simForm.fromNumber.trim() ||
                !simForm.messageText.trim()
              }
              onClick={() => simMutation.mutate()}
            >
              {simMutation.isPending ? "Menambah…" : "Tambahkan"}
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 max-h-[60vh] lg:max-h-[68vh]">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-2xl mb-2">💬</div>
              <div className="text-sm font-semibold text-ink">Belum ada chat</div>
              <p className="text-xs text-stone mt-1">
                Klik "Simulasi" untuk menambah pesan masuk demo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {threads.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const isActive = activeThread?.key === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setActiveNumber(t.key);
                      setReplyText("");
                    }}
                    className={`w-full text-left p-3 hover:bg-cream-100/50 transition-colors ${
                      isActive ? "bg-teal-50/60 border-l-2 border-teal" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="size-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {(t.fromName ?? t.fromNumber).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink truncate">
                            {t.fromName ?? t.fromNumber}
                          </span>
                          <span className="text-[10px] text-stone shrink-0">
                            {timeAgo(t.lastAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 h-3.5"
                          >
                            {t.channel === "wa" ? "WA" : "TG"}
                          </Badge>
                          <span className="text-[10px] text-stone">
                            {t.messages.length} pesan
                          </span>
                        </div>
                        <div className="text-xs text-stone truncate">
                          {last.direction === "outbound" ? "↳ " : ""}
                          {last.messageText}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Thread pane */}
      <Card className="flex flex-col max-h-[78vh] min-h-[500px]">
        {!activeThread ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <EmptyState
              icon="💬"
              title="Pilih percakapan"
              desc="Pilih salah satu percakapan di kiri, atau simulasi pesan masuk untuk mulai."
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 border-b border-border bg-cream-100/50">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {(activeThread.fromName ?? activeThread.fromNumber).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-ink truncate">
                    {activeThread.fromName ?? activeThread.fromNumber}
                  </div>
                  <div className="text-xs text-stone flex items-center gap-2">
                    <Phone className="size-3" /> {activeThread.fromNumber}
                    <Badge variant="outline" className="text-[9px] py-0 h-3.5">
                      {activeThread.channel === "wa" ? "WhatsApp" : "Telegram"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-[260px]">
              <div className="p-4 space-y-2 bg-cream-100/30">
                {activeThread.messages.map((m) => {
                  const outbound = m.direction === "outbound";
                  return (
                    <div
                      key={m.id}
                      className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          outbound
                            ? "bg-teal text-white rounded-br-md"
                            : "bg-card border border-border text-ink rounded-bl-md"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{m.messageText}</div>
                        <div
                          className={`text-[10px] mt-1 flex items-center gap-1 ${
                            outbound ? "text-teal-100" : "text-stone"
                          }`}
                        >
                          {outbound && m.repliedBy === "ai" && (
                            <Sparkles className="size-2.5" />
                          )}
                          {outbound && m.repliedBy === "ai" ? "AI" : outbound ? "Anda" : "Pembeli"}
                          · {timeAgo(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t border-border p-3 space-y-2 bg-card">
              <Textarea
                placeholder="Tulis balasan… (kosongkan + kirim untuk AI auto-reply)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[70px] text-sm resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={!lastInbound || aiSuggestMutation.isPending}
                  onClick={() => {
                    if (lastInbound) {
                      aiSuggestMutation.mutate({ messageText: lastInbound.messageText });
                    }
                  }}
                >
                  <Sparkles className="size-3.5 text-teal" />
                  {aiSuggestMutation.isPending ? "AI menyusun…" : "Sarankan AI"}
                </Button>
                <Button
                  size="sm"
                  className="bg-teal hover:bg-teal-600"
                  disabled={!lastInbound || replyMutation.isPending}
                  onClick={() => {
                    if (lastInbound) {
                      replyMutation.mutate({ messageId: lastInbound.id, text: replyText });
                    }
                  }}
                >
                  <Send className="size-3.5" />
                  {replyMutation.isPending ? "Mengirim…" : "Kirim"}
                </Button>
              </div>
              <div className="text-[10px] text-stone">
                💡 1 credit di-charge per reply (AI auto-reply jika text kosong). Credit: {user?.creditBalance ?? 0}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
